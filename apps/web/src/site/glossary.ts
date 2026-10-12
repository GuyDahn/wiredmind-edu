import type { MessageTree } from "../i18n/messages.js";
import { LESSONS, type LessonEntry } from "../viewer/modules.js";
import {
  GENERAL_TERMS,
  LESSON_TERMS,
  TERM_IDS,
  type TermId,
} from "../viewer/terms.js";

/**
 * The glossary: one page per scientific term, so a search for "connectome"
 * or "mushroom body" can land on its explanation. The words are the same
 * ones the lessons open on a tap, in messages under terms.<id>.
 */

export const GLOSSARY_PATH = "/glossary";

/**
 * Each term's address, the same in every language, as lesson addresses are.
 * The two lesson buttons, Stimulate and Silence, are not science to look up
 * and get no page.
 */
export const TERM_SLUGS = {
  antenna: "antennae",
  receptor: "smell-receptors",
  antennallobe: "antennal-lobe",
  projection: "projection-neurons",
  mushroombody: "mushroom-body",
  kenyon: "kenyon-cells",
  output: "output-neurons",
  turn: "turn-neurons",
  compass: "compass-neurons",
  ring: "ring-neurons",
  looming: "looming-neurons",
  giantfiber: "giant-fiber",
  nervecord: "nerve-cord",
  jump: "jump-neurons",
  neuron: "neuron",
  spike: "action-potential",
  synapse: "synapse",
  transmitter: "neurotransmitter",
  excitation: "excitation",
  inhibition: "inhibition",
  acetylcholine: "acetylcholine",
  gaba: "gaba",
  circuit: "neural-circuit",
  connectome: "connectome",
  sensory: "sensory-neuron",
  motor: "motor-neuron",
  reflex: "reflex-arc",
  electricalsynapse: "electrical-synapse",
  bump: "compass-bump",
  landmark: "landmark",
  bridge: "protocerebral-bridge",
} as const satisfies Partial<Record<TermId, string>>;

export type GlossaryTerm = keyof typeof TERM_SLUGS;

export function hasPage(id: TermId): id is GlossaryTerm {
  return id in TERM_SLUGS;
}

/** Every term with a page, in the order the terms are declared. */
export const GLOSSARY_TERMS: readonly GlossaryTerm[] = TERM_IDS.filter(hasPage);

export function termPath(id: GlossaryTerm): string {
  return `${GLOSSARY_PATH}/${TERM_SLUGS[id]}`;
}

export function findTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((id) => TERM_SLUGS[id] === slug);
}

/** The lessons whose guide lists the term. None for the basics every lesson leans on. */
export function termLessons(id: GlossaryTerm): LessonEntry[] {
  return LESSONS.filter((entry) => (LESSON_TERMS[entry.id] ?? []).includes(id));
}

/** The terms listed beside this one: its lesson's, or the other basics. */
export function relatedTerms(id: GlossaryTerm): GlossaryTerm[] {
  const groups = [
    GENERAL_TERMS,
    ...LESSONS.map((entry) => LESSON_TERMS[entry.id] ?? []),
  ];
  const related = groups
    .filter((group) => group.includes(id))
    .flat()
    .filter(hasPage)
    .filter((other) => other !== id);
  return [...new Set(related)];
}

/**
 * The steps of a lesson whose words name the term, read from that lesson's
 * messages: a term is tagged with its id there, e.g. `<kenyon>`.
 */
export function termSteps(
  entry: LessonEntry,
  id: GlossaryTerm,
  messages: MessageTree,
): string[] {
  const lessons = messages.lessons;
  const lesson = typeof lessons === "object" ? lessons[entry.id] : undefined;
  const steps = typeof lesson === "object" ? lesson.steps : undefined;
  if (typeof steps !== "object") return [];
  const tag = `<${id}>`;
  return entry.lesson.steps
    .map((step) => step.id)
    .filter((stepId) => {
      const step = steps[stepId];
      if (typeof step !== "object") return false;
      return [step.text, step.result].some(
        (text) => typeof text === "string" && text.includes(tag),
      );
    });
}
