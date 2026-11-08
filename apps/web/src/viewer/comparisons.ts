import compass from "../../content/comparisons/compass.json" with { type: "json" };
import escape from "../../content/comparisons/escape.json" with { type: "json" };
import smellMemory from "../../content/comparisons/smell-memory.json" with { type: "json" };
import whyFly from "../../content/comparisons/why-fly.json" with { type: "json" };
import type { Bilingual } from "../site/course.js";

/**
 * "What happens in mammals and birds that is like the fly?": a card for the
 * end of each lesson, and "Why learn from a fly at all?" on the lessons
 * page, bridging to the animals the school course is about. Their text is
 * Guy's draft (docs/comparisons-draft.md) until teachers and a
 * neuroscientist have checked it, so they stay hidden unless
 * NEXT_PUBLIC_SHOW_COMPARISONS is "true".
 */
export function comparisonsShown(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_COMPARISONS === "true";
}

/** A source the draft cites, and whether its title, authors, journal and year checked out. */
export type ComparisonSource = {
  citation: string;
  status: "verified" | "partly" | "unverified";
  note: string;
};

export type CardBase = {
  /** False until a reviewer has signed the text off. The card says so. */
  reviewed: boolean;
  /** A picture beside the text, once there is one. Paths are under public/. */
  illustration: { src: string; alt: Bilingual } | null;
  sources: ComparisonSource[];
};

export type LessonComparison = CardBase & {
  lesson: string;
  fly: Bilingual;
  mammals: Bilingual;
  birds: Bilingual;
  shared: Bilingual;
  /** A question for the class, also on the worksheet. */
  question: Bilingual;
};

export type GeneralComparison = CardBase & {
  title: Bilingual;
  points: { he: string[]; en: string[] };
};

const COMPARISONS: Record<string, LessonComparison> = {
  "smell-memory": smellMemory as LessonComparison,
  compass: compass as LessonComparison,
  escape: escape as LessonComparison,
};

export const WHY_FLY = whyFly as GeneralComparison;

export function comparisonFor(lessonId: string): LessonComparison | null {
  return COMPARISONS[lessonId] ?? null;
}
