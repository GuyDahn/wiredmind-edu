import { LESSONS, type LessonEntry } from "../viewer/modules.js";
import type { GlossaryTerm } from "./glossary.js";

/**
 * Questions people type into a search box, each answered on its own page
 * and tied to the lesson that shows the answer. The words are in messages,
 * under questions.items.<id>.
 */

export const QUESTIONS_PATH = "/questions";

export type Question = {
  id: string;
  /** The page's address, the same in every language. */
  slug: string;
  /** The lesson that shows it. Null for a question about the whole brain. */
  lesson: string | null;
  /** Glossary terms the answer leans on. */
  terms: readonly GlossaryTerm[];
};

export const QUESTIONS: readonly Question[] = [
  {
    id: "smell",
    slug: "how-do-flies-smell",
    lesson: "smell-memory",
    terms: ["antenna", "receptor", "antennallobe", "projection"],
  },
  {
    id: "memory",
    slug: "do-flies-have-memories",
    lesson: "smell-memory",
    terms: ["mushroombody", "kenyon", "output", "synapse"],
  },
  {
    id: "direction",
    slug: "how-do-flies-know-which-way-they-face",
    lesson: "compass",
    terms: ["compass", "bump", "turn", "ring", "landmark"],
  },
  {
    id: "swat",
    slug: "why-are-flies-hard-to-swat",
    lesson: "escape",
    terms: ["looming", "giantfiber", "jump", "reflex"],
  },
  {
    id: "reaction",
    slug: "fly-reaction-time",
    lesson: "escape",
    terms: ["giantfiber", "electricalsynapse", "motor", "spike"],
  },
  {
    id: "neurons",
    slug: "how-many-neurons-in-a-fruit-fly-brain",
    lesson: null,
    terms: ["neuron", "synapse", "connectome", "circuit"],
  },
];

/** The paragraphs of every answer, after its one-sentence short answer. */
export const ANSWER_PARTS = ["a", "b"] as const;

export function questionPath(question: Question): string {
  return `${QUESTIONS_PATH}/${question.slug}`;
}

export function findQuestion(slug: string): Question | undefined {
  return QUESTIONS.find((question) => question.slug === slug);
}

/** The lessons that show a question's answer: its own, or all of them. */
export function questionLessons(question: Question): readonly LessonEntry[] {
  return question.lesson === null
    ? LESSONS
    : LESSONS.filter((entry) => entry.id === question.lesson);
}

/** The questions a lesson answers. */
export function lessonQuestions(entry: LessonEntry): Question[] {
  return QUESTIONS.filter((question) => question.lesson === entry.id);
}
