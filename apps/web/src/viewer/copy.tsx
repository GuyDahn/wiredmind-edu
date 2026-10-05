import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { LessonModule } from "./lesson.js";
import { Term } from "./term.js";
import { TERM_IDS } from "./terms.js";
import type { ModuleSpec } from "./types.js";

/** Names, plain names, and button descriptions for a circuit's groups, from circuits.<circuit>. */
export function useCircuitCopy(module: ModuleSpec) {
  const t = useTranslations(`circuits.${module.circuit}`);
  return {
    name: (colorGroup: string) => t(`groups.${colorGroup}`),
    /** The group's everyday nickname, the one lesson glosses use. */
    plain: (colorGroup: string) => t(`plain.${colorGroup}`),
    stimulate: (colorGroup: string) => t(`stimulate.${colorGroup}`),
    silence: (colorGroup: string) => t(`silence.${colorGroup}`),
  };
}

/**
 * Each jargon term in bold, its gloss as a quiet aside. A term tagged with its
 * id opens its explanation; the paragraph it sits in needs TERM_ANCHOR.
 */
const GLOSS = {
  term: (chunks: ReactNode) => (
    <strong className="font-semibold text-fg">{chunks}</strong>
  ),
  gloss: (chunks: ReactNode) => (
    <span className="text-fg-subtle">{chunks}</span>
  ),
  ...Object.fromEntries(
    TERM_IDS.map((id) => [
      id,
      (chunks: ReactNode) => <Term id={id}>{chunks}</Term>,
    ]),
  ),
};

/** For a paragraph of lesson text: its terms open their explanations under it. */
export const TERM_ANCHOR = "relative";

/** A lesson's words, from lessons.<id>, with its term and <gloss> markup drawn. */
export function useLessonCopy(lesson: LessonModule) {
  const t = useTranslations(`lessons.${lesson.id}`);
  return {
    plain: (key: string) => t(key),
    rich: (key: string) => t.rich(key, GLOSS),
  };
}
