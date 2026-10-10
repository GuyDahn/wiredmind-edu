import type { LessonEntry } from "./modules.js";
import type { Pace } from "./playback.js";
import { encodeReplay, type Replay, type ReplayAction } from "./replay.js";
import { SETTLE_MS, ticksIn } from "./session.js";

/**
 * "Show me how it works": the lesson's ideal run, played for the reader. It
 * is an ordinary share replay (one press per step goal, plus the puff the
 * lesson sends after a silence), so the same engine plays it and a plain
 * ?r= link opens it. The lesson's own words follow each press.
 */

/** Wall time a step's instruction stays up before its press. */
export const DEMO_READ_MS = 6000;
/** Wall time a step's result stays up before the next step. */
export const DEMO_RESULT_MS = 5000;
/** Wall time between a silence and the puff that shows what it did, as in the lesson. */
export const DEMO_PUFF_GAP_MS = 500;

/**
 * A walkthrough keeps every pause it was written with, counted from the
 * moment the brain goes quiet, so the reading time is the same on a slow
 * laptop and a fast one.
 */
export const DEMO_PACE: Pace = {
  firstPauseMs: Infinity,
  maxPauseMs: Infinity,
  fromQuiet: true,
};

export type DemoRun = {
  replay: Replay;
  /** Lesson step of each press. */
  stepOf: number[];
  /** Presses landed once each step is through. */
  end: number[];
};

export function demoRun(entry: LessonEntry): DemoRun {
  const { module, lesson } = entry;
  // One puff, then the settle the session runs before it holds still.
  const puffTicks = ticksIn(module.stimulusMs) + ticksIn(SETTLE_MS);
  const actions: ReplayAction[] = [];
  const stepOf: number[] = [];
  const end: number[] = [];
  let tick = 0;
  let wallMs = 0;
  lesson.steps.forEach((step, index) => {
    wallMs += index === 0 ? DEMO_READ_MS : DEMO_RESULT_MS + DEMO_READ_MS;
    actions.push({
      tick,
      wallMs,
      command:
        step.goal.type === "stimulate"
          ? { type: "stimulate", colorGroup: step.goal.colorGroup }
          : {
              type: "silence",
              colorGroup: step.goal.colorGroup,
              on: step.goal.on,
            },
    });
    stepOf.push(index);
    if (step.goal.type === "stimulate") tick += puffTicks;
    if (step.puff) {
      wallMs += DEMO_PUFF_GAP_MS;
      actions.push({
        tick,
        wallMs,
        command: { type: "stimulate", colorGroup: step.puff },
      });
      stepOf.push(index);
      tick += puffTicks;
    }
    end.push(actions.length);
  });
  return {
    replay: { lessonId: lesson.id, seed: module.seed, actions },
    stepOf,
    end,
  };
}

/** The `r` value of a link that opens the lesson on its walkthrough. */
export function demoParam(entry: LessonEntry): string {
  return encodeReplay(demoRun(entry).replay);
}

/** Whether a share link is this lesson's walkthrough rather than someone's own run. */
export function isDemo(replay: Replay, entry: LessonEntry): boolean {
  return (
    replay.lessonId === entry.id && encodeReplay(replay) === demoParam(entry)
  );
}
