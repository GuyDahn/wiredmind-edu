import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_PACE,
  DEMO_PUFF_GAP_MS,
  DEMO_READ_MS,
  DEMO_RESULT_MS,
  demoParam,
  demoRun,
  isDemo,
} from "../apps/web/src/viewer/demo.js";
import { LESSONS } from "../apps/web/src/viewer/modules.js";
import { Playback } from "../apps/web/src/viewer/playback.js";
import {
  decodeReplay,
  replayProblem,
  type ReplayCommand,
} from "../apps/web/src/viewer/replay.js";
import {
  SETTLE_MS,
  ticksIn,
  type StepResult,
} from "../apps/web/src/viewer/session.js";

describe("show me walkthrough", () => {
  for (const entry of LESSONS) {
    it(`${entry.id}: presses each step's goal and its puff, as a share link`, () => {
      const run = demoRun(entry);
      const expected: ReplayCommand[] = entry.lesson.steps.flatMap((step) => [
        step.goal,
        ...(step.puff
          ? [{ type: "stimulate" as const, colorGroup: step.puff }]
          : []),
      ]);
      assert.deepEqual(
        run.replay.actions.map((action) => action.command),
        expected,
      );
      assert.equal(run.replay.seed, entry.module.seed);
      assert.equal(replayProblem(run.replay, entry.module), null);
      // It survives the trip through a ?r= link exactly, and is told apart
      // from a run someone made themselves.
      const decoded = decodeReplay(demoParam(entry));
      assert.deepEqual(decoded, run.replay);
      assert.ok(isDemo(decoded, entry));
      assert.ok(
        !isDemo(
          { ...run.replay, actions: run.replay.actions.slice(0, 1) },
          entry,
        ),
      );
    });

    it(`${entry.id}: presses only once the last puff has settled, with time to read`, () => {
      const run = demoRun(entry);
      const puffTicks = ticksIn(entry.module.stimulusMs) + ticksIn(SETTLE_MS);
      let tick = 0;
      let wallMs = 0;
      run.replay.actions.forEach((action, index) => {
        const first = run.stepOf[index - 1] !== run.stepOf[index];
        wallMs += !first
          ? DEMO_PUFF_GAP_MS
          : index === 0
            ? DEMO_READ_MS
            : DEMO_RESULT_MS + DEMO_READ_MS;
        assert.equal(action.tick, tick, `press ${index}`);
        assert.equal(action.wallMs, wallMs, `press ${index}`);
        if (action.command.type === "stimulate") tick += puffTicks;
      });
      assert.deepEqual(run.stepOf.length, run.replay.actions.length);
      assert.equal(run.end.length, entry.lesson.steps.length);
      assert.equal(run.end.at(-1), run.replay.actions.length);
    });
  }

  it("counts reading time from the moment the brain goes quiet, however long it ran", () => {
    const stepper = {
      clock: 0,
      advance(ticks: number): StepResult {
        this.clock += ticks;
        return { spikes: new Uint8Array(0), finished: [] };
      },
    };
    const playback = new Playback(
      {
        lessonId: "escape",
        seed: 1,
        actions: [
          {
            tick: 0,
            wallMs: 6000,
            command: { type: "stimulate", colorGroup: "looming" },
          },
          {
            tick: 100,
            wallMs: 17000,
            command: { type: "stimulate", colorGroup: "looming" },
          },
        ],
      },
      DEMO_PACE,
    );
    let quiet = true;
    const pressed: number[] = [];
    const frame = (now: number) =>
      playback.frame(
        stepper,
        50,
        now,
        () => quiet,
        () => pressed.push(now),
      );
    // The first press waits its whole reading time, not the shared runs' 0.7 s.
    frame(0);
    frame(5999);
    assert.deepEqual(pressed, []);
    frame(6000);
    assert.deepEqual(pressed, [6000]);
    // The brain runs for as long as the device needs. No press lands on it,
    // and it keeps its frame budget meanwhile.
    quiet = false;
    frame(6016);
    assert.equal(frame(6032).left, 50);
    assert.equal(frame(30000).left, 50);
    assert.deepEqual(pressed, [6000]);
    // Quiet at last: the full 11 s pause starts now.
    quiet = true;
    frame(40000);
    frame(50999);
    assert.deepEqual(pressed, [6000]);
    frame(51000);
    assert.deepEqual(pressed, [6000, 51000]);
    assert.ok(playback.finished);
  });
});
