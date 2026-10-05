import { localePath } from "../i18n/locales.js";
import { MODE_PARAM, CLASS_MODE } from "../viewer/class-mode.js";
import { demoParam } from "../viewer/demo.js";
import type { LessonEntry } from "../viewer/modules.js";
import { REPLAY_PARAM } from "../viewer/replay.js";

/**
 * The teacher guides: one page and one printable worksheet per lesson. Their
 * words are in messages, under teachers; this file holds what is the same in
 * every language.
 */

export const TEACHERS_PATH = "/teachers";

export function guidePath(entry: LessonEntry): string {
  return `${TEACHERS_PATH}/${entry.id}`;
}

export function worksheetPath(entry: LessonEntry): string {
  return `${guidePath(entry)}/worksheet`;
}

/** The lesson, opened on its "Show me" walkthrough in class mode, ready to project. */
export function demoHref(locale: string, entry: LessonEntry): string {
  const params = new URLSearchParams({
    [REPLAY_PARAM]: demoParam(entry),
    [MODE_PARAM]: CLASS_MODE,
  });
  return `${localePath(locale, entry.path)}?${params.toString()}`;
}

export const TOPICS = [
  "excitation",
  "synapses",
  "reflex",
  "structure",
] as const;
export type Topic = (typeof TOPICS)[number];

/** Which of the four topics each lesson connects to, strongest first. */
export const LESSON_TOPICS: Readonly<Record<string, readonly Topic[]>> = {
  "smell-memory": ["synapses", "structure", "excitation"],
  compass: ["excitation", "synapses", "structure"],
  escape: ["reflex", "structure", "synapses"],
};

/** One class period: 45 minutes. */
export const PLAN = [
  { phase: "opening", minutes: 5 },
  { phase: "demo", minutes: 10 },
  { phase: "explore", minutes: 20 },
  { phase: "discuss", minutes: 10 },
] as const;

/** Each lesson's discussion questions, misconceptions, and real-versus-simplified points. */
export const DISCUSSION = ["a", "b", "c"] as const;
export const MISCONCEPTIONS = ["a", "b", "c"] as const;
export const LESSON_REAL: Readonly<Record<string, readonly string[]>> = {
  "smell-memory": ["a"],
  compass: ["a"],
  escape: ["a"],
};
export const LESSON_SIMPLIFIED: Readonly<Record<string, readonly string[]>> = {
  "smell-memory": ["a", "b"],
  compass: ["a", "b"],
  escape: ["a", "b"],
};
export const WORKSHEET_QUESTIONS = ["a", "b"] as const;
