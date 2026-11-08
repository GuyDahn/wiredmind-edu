import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseGraphBin } from "../apps/web/src/sim/index.js";
import { assignGroups, type NeuronRow } from "../apps/web/src/viewer/groups.js";
import { LESSONS, type LessonEntry } from "../apps/web/src/viewer/modules.js";
import {
  pathwayFor,
  WaveTracker,
  WAVE_SHARE,
} from "../apps/web/src/viewer/pathway.js";
import {
  createViewerSession,
  type ViewerSession,
} from "../apps/web/src/viewer/session.js";
import { escapeCircuit } from "./sim-circuits.js";

/**
 * The numbers a lesson puts on its cell groups are the order the simulation
 * fires them in. The baked data is not in git, so the checks on the real
 * circuits skip until `pnpm data:fetch` has put it in apps/web/public/data.
 */

const DATA = new URL("../apps/web/public/data/", import.meta.url);
const TICK_MS = 0.1;

function groupsOf(lists: Record<string, number[]>) {
  return new Map(
    Object.entries(lists).map(([name, ids]) => [name, Uint32Array.from(ids)]),
  );
}

describe("WaveTracker", () => {
  it("counts a group once a share of its cells has spiked", () => {
    const groups = groupsOf({
      big: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
        38, 39,
      ],
      pair: [40, 41],
    });
    const wave = new WaveTracker(groups, 42);
    const spikes = new Uint8Array(42);
    spikes[0] = 1;
    assert.deepEqual(wave.observe(spikes), [], "1 of 40 is under 5%");
    // The same cell again adds nothing.
    assert.deepEqual(wave.observe(spikes), []);
    spikes[1] = 1;
    spikes[40] = 1;
    assert.deepEqual(wave.observe(spikes), ["big", "pair"]);
    assert.ok(2 / 40 >= WAVE_SHARE);
    assert.deepEqual(wave.observe(spikes), [], "each group joins once");
    wave.reset();
    assert.deepEqual(wave.order, []);
  });

  it("follows the escape fixture from its inputs to its outputs", () => {
    const circuit = escapeCircuit();
    const groups = groupsOf({
      input: circuit.inputs,
      gf: [circuit.gf],
      descending: circuit.descending,
    });
    const session = createViewerSession(circuit.graph, groups, 1);
    const wave = new WaveTracker(groups, circuit.graph.neuronCount);
    session.stimulate("input", 40, 50);
    while (session.running()) wave.observe(session.advance(1).spikes);
    assert.deepEqual(wave.order, ["input", "gf", "descending"]);
  });

  it("finds a lesson's pathway by its puff and the groups silenced", () => {
    const lesson = LESSONS.find((entry) => entry.id === "compass")!.lesson;
    assert.deepEqual(
      pathwayFor(lesson.pathways, "turn-left", [])?.order.slice(0, 2),
      ["turn-left", "compass"],
    );
    assert.equal(
      pathwayFor(lesson.pathways, "turn-left", ["ring"])?.silenced[0],
      "ring",
    );
    assert.equal(pathwayFor(lesson.pathways, "turn-left", ["nope"]), null);
  });
});

describe("lesson pathways", () => {
  for (const entry of LESSONS) {
    it(`${entry.id} lists a pathway for every puff its steps send`, () => {
      const silenced = new Set<string>();
      for (const step of entry.lesson.steps) {
        if (step.goal.type === "silence") {
          if (step.goal.on) silenced.add(step.goal.colorGroup);
          else silenced.delete(step.goal.colorGroup);
        }
        const stimulus =
          step.goal.type === "stimulate" ? step.goal.colorGroup : step.puff;
        assert.ok(stimulus, `${entry.id} ${step.id} sends no puff`);
        assert.ok(
          pathwayFor(entry.lesson.pathways, stimulus, [...silenced]),
          `${entry.id} ${step.id}: no pathway for ${stimulus} with ${[...silenced].join("+") || "nothing"} silenced`,
        );
      }
      for (const exercise of entry.lesson.exercises) {
        if (exercise.type !== "order") continue;
        assert.ok(pathwayFor(entry.lesson.pathways, exercise.stimulus, []));
      }
    });
  }
});

type Circuit = {
  entry: LessonEntry;
  neuronCount: number;
  groups: Map<string, Uint32Array>;
  session: () => ViewerSession;
};

function has(circuit: string): boolean {
  return ["graph.bin", "neurons.json"].every((part) =>
    existsSync(new URL(`${circuit}.${part}`, DATA)),
  );
}

function load(entry: LessonEntry): Circuit {
  const name = entry.module.circuit;
  const graph = parseGraphBin(readFileSync(new URL(`${name}.graph.bin`, DATA)));
  const file = JSON.parse(
    readFileSync(new URL(`${name}.neurons.json`, DATA), "utf8"),
  ) as { neurons: NeuronRow[] };
  const { groups } = assignGroups(file.neurons, entry.module.groups);
  return {
    entry,
    neuronCount: graph.neuronCount,
    groups,
    session: () => createViewerSession(graph, groups, entry.module.seed),
  };
}

/** One puff from a brain at rest, as the viewer runs it, tick by tick. */
function wave(circuit: Circuit, stimulus: string, silenced: string[]) {
  const session = circuit.session();
  for (const group of silenced) session.setSilenced(group, true);
  const tracker = new WaveTracker(circuit.groups, circuit.neuronCount);
  const at: Record<string, number> = {};
  const { stimulusHz, stimulusMs } = circuit.entry.module;
  session.stimulate(stimulus, stimulusHz, stimulusMs);
  while (session.running()) {
    for (const group of tracker.observe(session.advance(1).spikes)) {
      at[group] = session.clock * TICK_MS;
    }
  }
  return { order: [...tracker.order], at };
}

for (const entry of LESSONS) {
  const name = entry.module.circuit;
  describe(`${entry.id} on the real circuit`, { skip: !has(name) }, () => {
    const circuit = has(name) ? load(entry) : null;

    it("numbers its groups in the order the simulation fires them", () => {
      for (const pathway of entry.lesson.pathways) {
        const { order } = wave(circuit!, pathway.stimulus, pathway.silenced);
        assert.deepEqual(
          order,
          pathway.order,
          `${pathway.stimulus} with ${pathway.silenced.join("+") || "nothing"} silenced`,
        );
      }
    });

    it("holds each exercise's answer to the simulation", () => {
      for (const exercise of entry.lesson.exercises) {
        if (exercise.type === "order") {
          const { order } = wave(circuit!, exercise.stimulus, []);
          assert.deepEqual(
            order,
            pathwayFor(entry.lesson.pathways, exercise.stimulus, [])!.order,
          );
        } else if (exercise.type === "fires") {
          const { order } = wave(circuit!, exercise.stimulus, [
            exercise.silenced,
          ]);
          assert.equal(
            order.includes(exercise.watch),
            exercise.fires,
            `${exercise.id}: ${exercise.watch} with ${exercise.silenced} silenced`,
          );
        } else if (exercise.type === "timing") {
          const { at } = wave(circuit!, exercise.stimulus, []);
          const ms = at[exercise.watch];
          assert.ok(
            ms !== undefined && ms >= exercise.ms[0] && ms <= exercise.ms[1],
            `${exercise.id}: ${exercise.watch} at ${ms} ms`,
          );
        }
      }
    });
  });
}
