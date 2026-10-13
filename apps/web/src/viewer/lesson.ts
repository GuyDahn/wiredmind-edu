import { TERM_IDS } from "./terms.js";
import type {
  ControlAction,
  ControlKind,
  ControlState,
  ModuleSpec,
} from "./types.js";

export const MAX_STEP_WORDS = 40;
export const MAX_GLOSS_WORDS = 3;
/** Longest a story panel may run, caption and speech bubble together. */
export const MAX_PANEL_WORDS = 25;
export const MIN_STORY_PANELS = 4;
export const MAX_STORY_PANELS = 6;

export type LessonGoal =
  | { type: "stimulate"; colorGroup: string }
  | { type: "silence"; colorGroup: string; on: boolean };

/**
 * One step of a lesson. Its words are in messages, under
 * lessons.<lesson>.steps.<step>: `text` says what to do and shows as soon as
 * the step opens, `result` says what just happened once the puff is over.
 */
export type LessonStep = {
  id: string;
  /** Color groups drawn at full brightness. Everything else dims. */
  focus: string[];
  /** Controls unlocked before the goal is met. */
  controls: { stimulate: string[]; silence: string[] };
  goal: LessonGoal;
  /** Stimulus group the runner sends for the learner right after the goal. */
  puff: string | null;
  /**
   * "Predict before you tap": the learner picks what will happen before the
   * step's control opens. Its question and answers are in messages, under
   * steps.<step>.predict. No answer is punished; the brain shows who was right.
   */
  predict: { choices: LessonChoice[] } | null;
};

/** An answer to the check question. Its text and feedback are in messages. */
export type LessonChoice = {
  id: string;
  correct: boolean;
};

/** A lesson's structure. Everything it says lives in messages, under lessons.<id>. */
export type LessonModule = {
  id: string;
  circuit: string;
  /**
   * English terms that need a short gloss in parentheses on first use. The
   * English copy tags each one (see terms.ts), and tests hold it to this list.
   */
  jargon: string[];
  steps: LessonStep[];
  check: { focus: string[]; choices: LessonChoice[] };
  /**
   * The fly's story, told in comic panels before the brain and closed on the
   * win screen. Each panel's caption and speech bubble are in messages, under
   * story.panels.<panel>; its picture is public/art/story/<lesson>-<panel>.svg.
   */
  story: { panels: string[] };
  /** The zoom from the whole fly down to one cell of this group, the last level. */
  journey: { neuron: string };
};

export type LessonPhase =
  | {
      kind: "step";
      index: number;
      done: boolean;
      /** The prediction picked on a step that asks for one. */
      guess?: number;
    }
  | { kind: "check"; picked: number | null }
  | { kind: "win" }
  | { kind: "free" };

/** A step that asks for a prediction keeps its controls shut until one is picked. */
export function awaitsGuess(lesson: LessonModule, phase: LessonPhase): boolean {
  if (phase.kind !== "step" || phase.done) return false;
  return (
    lesson.steps[phase.index]?.predict != null && phase.guess === undefined
  );
}

export function readLesson(value: unknown, module: ModuleSpec): LessonModule {
  const record = object(value, "lesson");
  const circuit = text(record.circuit, "circuit");
  if (circuit !== module.circuit) {
    throw new Error(`lesson is for ${circuit}, not ${module.circuit}`);
  }
  const groups = new Set(module.groups.map((group) => group.colorGroup));
  const stimuli = new Set(module.stimuli.map((item) => item.colorGroup));
  const silence = new Set(module.silence.map((item) => item.colorGroup));
  const steps = list(record.steps, "steps").map((item, index) =>
    readStep(item, `steps[${index}]`, { groups, stimuli, silence }),
  );
  if (steps.length === 0) throw new Error("lesson needs at least one step");
  const check = object(record.check, "check");
  const choices = readChoices(check.choices, "check.choices");
  const story = object(record.story, "story");
  const panels = list(story.panels, "story.panels").map((item, index) =>
    text(item, `story.panels[${index}]`),
  );
  if (panels.length < MIN_STORY_PANELS || panels.length > MAX_STORY_PANELS) {
    throw new Error(
      `lesson story needs ${MIN_STORY_PANELS} to ${MAX_STORY_PANELS} panels`,
    );
  }
  unique(panels, "story panels");
  const journey = object(record.journey, "journey");
  const neuron = text(journey.neuron, "journey.neuron");
  if (!groups.has(neuron)) {
    throw new Error(`lesson journey names unknown group ${neuron}`);
  }
  unique(
    steps.map((step) => step.id),
    "step ids",
  );
  unique(
    choices.map((choice) => choice.id),
    "choice ids",
  );
  return {
    id: text(record.id, "id"),
    circuit,
    jargon: list(record.jargon, "jargon").map((item, index) =>
      text(item, `jargon[${index}]`),
    ),
    steps,
    check: {
      focus: groupList(check.focus, "check.focus", groups),
      choices,
    },
    story: { panels },
    journey: { neuron },
  };
}

/** Answers to pick from, exactly one of them right. */
function readChoices(value: unknown, field: string): LessonChoice[] {
  const choices = list(value, field).map((item, index) => {
    const row = object(item, `${field}[${index}]`);
    if (typeof row.correct !== "boolean") {
      throw new Error(
        `lesson ${field}[${index}].correct must be true or false`,
      );
    }
    return { id: text(row.id, `${field}[${index}].id`), correct: row.correct };
  });
  if (choices.filter((choice) => choice.correct).length !== 1) {
    throw new Error(`lesson ${field} needs exactly one correct choice`);
  }
  unique(
    choices.map((choice) => choice.id),
    `${field} ids`,
  );
  return choices;
}

function unique(ids: string[], what: string) {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`lesson repeats ${what}`);
  }
}

/** How a control looks right now: open, open and pointed at, or locked. */
export function controlState(
  lesson: LessonModule,
  phase: LessonPhase,
  kind: ControlKind,
  colorGroup = "",
): ControlState {
  if (phase.kind === "free" || phase.kind === "win") return "open";
  if (kind === "reset") return "locked";
  if (awaitsGuess(lesson, phase)) return "locked";
  if (phase.kind === "check") return kind === "stimulate" ? "open" : "locked";
  const step = lesson.steps[phase.index];
  if (!step) return "locked";
  const isGoal = step.goal.type === kind && step.goal.colorGroup === colorGroup;
  if (!phase.done) {
    if (isGoal) return "cue";
    return step.controls[kind].includes(colorGroup) ? "open" : "locked";
  }
  // After the goal, any puff may be replayed, but the silence the step asked
  // for stays put so the next step starts from the state it expects.
  if (kind === "stimulate") return "open";
  if (isGoal) return "locked";
  return step.controls.silence.includes(colorGroup) ? "open" : "locked";
}

export function meetsGoal(goal: LessonGoal, action: ControlAction): boolean {
  if (action.type === "reset" || action.type !== goal.type) return false;
  if (action.colorGroup !== goal.colorGroup) return false;
  if (goal.type === "silence" && action.type === "silence") {
    return action.on === goal.on;
  }
  return true;
}

export function focusFor(lesson: LessonModule, phase: LessonPhase): string[] {
  if (phase.kind === "step") return lesson.steps[phase.index]?.focus ?? [];
  if (phase.kind === "check") return lesson.check.focus;
  return [];
}

export function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Jargon terms whose first use in `value` is not followed by a short gloss,
 * e.g. "Kenyon cells (the smell sorters)".
 */
export function unglossed(value: string, jargon: readonly string[]): string[] {
  const missing: string[] = [];
  for (const term of jargon) {
    const pattern = new RegExp(`\\b${escape(term)}\\b`, "i");
    const found = pattern.exec(value);
    if (!found) continue;
    const after = value.slice(found.index + found[0].length);
    const gloss = /^ \(([^)]+)\)/.exec(after);
    const words = gloss ? wordCount(gloss[1] ?? "") : 0;
    if (words < 1 || words > MAX_GLOSS_WORDS) missing.push(term);
  }
  return missing;
}

export type GlossPart = { kind: "text" | "term" | "gloss"; value: string };

/** A term is tagged with its id from terms.ts (`<kenyon>`), or `<term>` if it has no explanation. */
const MARKUP = new RegExp(
  `<(${["term", "gloss", ...TERM_IDS].join("|")})>([^<]*)</\\1>`,
  "g",
);

/** Lesson copy without its term and <gloss> tags, as a reader sees it. */
export function plainText(markup: string): string {
  return markup.replace(MARKUP, "$2");
}

/**
 * The parts a lesson string marks up: every term in bold, every <gloss>
 * as an aside. Matches what glossParts finds in the plain English text.
 */
export function markupParts(markup: string): GlossPart[] {
  const parts: GlossPart[] = [];
  let at = 0;
  for (const found of markup.matchAll(MARKUP)) {
    const index = found.index ?? 0;
    if (index > at)
      parts.push({ kind: "text", value: markup.slice(at, index) });
    parts.push({
      kind: found[1] === "gloss" ? "gloss" : "term",
      value: found[2] ?? "",
    });
    at = index + found[0].length;
  }
  if (at < markup.length) parts.push({ kind: "text", value: markup.slice(at) });
  return parts;
}

/**
 * Splits copy into plain text, jargon terms, and the short glosses that follow
 * them, so a gloss can read as an aside rather than as another thing.
 */
export function glossParts(
  value: string,
  jargon: readonly string[],
): GlossPart[] {
  const terms = [...jargon].sort((a, b) => b.length - a.length).map(escape);
  if (terms.length === 0) return [{ kind: "text", value }];
  const pattern = new RegExp(`\\b(${terms.join("|")})\\b( \\([^)]+\\))?`, "gi");
  const parts: GlossPart[] = [];
  let at = 0;
  for (const found of value.matchAll(pattern)) {
    const index = found.index ?? 0;
    if (index > at) parts.push({ kind: "text", value: value.slice(at, index) });
    parts.push({ kind: "term", value: found[1] ?? "" });
    if (found[2]) {
      parts.push({ kind: "text", value: " " });
      parts.push({ kind: "gloss", value: found[2].trim() });
    }
    at = index + found[0].length;
  }
  if (at < value.length) parts.push({ kind: "text", value: value.slice(at) });
  return parts;
}

function readStep(
  value: unknown,
  field: string,
  known: {
    groups: ReadonlySet<string>;
    stimuli: ReadonlySet<string>;
    silence: ReadonlySet<string>;
  },
): LessonStep {
  const row = object(value, field);
  const controls = object(row.controls, `${field}.controls`);
  const goalRow = object(row.goal, `${field}.goal`);
  const goalGroup = text(goalRow.colorGroup, `${field}.goal.colorGroup`);
  let goal: LessonGoal;
  if (goalRow.type === "stimulate") {
    if (!known.stimuli.has(goalGroup)) {
      throw new Error(`lesson ${field} cannot stimulate ${goalGroup}`);
    }
    goal = { type: "stimulate", colorGroup: goalGroup };
  } else if (goalRow.type === "silence") {
    if (!known.silence.has(goalGroup)) {
      throw new Error(`lesson ${field} cannot silence ${goalGroup}`);
    }
    if (typeof goalRow.on !== "boolean") {
      throw new Error(`lesson ${field}.goal.on must be true or false`);
    }
    goal = { type: "silence", colorGroup: goalGroup, on: goalRow.on };
  } else {
    throw new Error(`lesson ${field}.goal.type must be stimulate or silence`);
  }
  const step: LessonStep = {
    id: text(row.id, `${field}.id`),
    focus: groupList(row.focus, `${field}.focus`, known.groups),
    controls: {
      stimulate: groupList(
        controls.stimulate,
        `${field}.controls.stimulate`,
        known.stimuli,
      ),
      silence: groupList(
        controls.silence,
        `${field}.controls.silence`,
        known.silence,
      ),
    },
    goal,
    puff: null,
    predict:
      row.predict === undefined
        ? null
        : {
            choices: readChoices(
              object(row.predict, `${field}.predict`).choices,
              `${field}.predict.choices`,
            ),
          },
  };
  if (!step.controls[goal.type].includes(goal.colorGroup)) {
    throw new Error(`lesson ${field} locks the control its goal needs`);
  }
  if (row.puff !== undefined) {
    const puff = text(row.puff, `${field}.puff`);
    if (!known.stimuli.has(puff)) {
      throw new Error(`lesson ${field} cannot puff ${puff}`);
    }
    step.puff = puff;
  }
  return step;
}

function groupList(
  value: unknown,
  field: string,
  known: ReadonlySet<string>,
): string[] {
  return list(value, field).map((item, index) => {
    const group = text(item, `${field}[${index}]`);
    if (!known.has(group)) {
      throw new Error(`lesson ${field} names unknown group ${group}`);
    }
    return group;
  });
}

function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`lesson ${field} must be a list`);
  return value;
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`lesson ${field} is not an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`lesson is missing ${field}`);
  }
  return value.trim();
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
