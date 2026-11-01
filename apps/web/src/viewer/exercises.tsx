import { useFormatter, useTranslations } from "next-intl";
import { useCircuitCopy, useLessonCopy } from "./copy.js";
import type { LessonExercise } from "./lesson.js";
import type { LessonEntry } from "./modules.js";
import { pathwayFor } from "./pathway.js";
import { FOCUS_RING } from "./ui.js";

/** What an exercise's words are made from: copy lookups and a list formatter. */
export type ExerciseLookups = {
  /** viewer.exercises.<key> */
  viewer: (key: string, values: Record<string, string | number>) => string;
  /** lessons.<id>.<key> */
  lesson: (key: string) => string;
  /** circuits.<circuit>.plain.<group> */
  plain: (group: string) => string;
  list: (items: string[]) => string;
};

/**
 * The words of one exercise. An "order" exercise is built from the lesson's
 * pathway, so it always matches what the simulation fires; the rest are in
 * messages, under lessons.<id>.exercises.<exercise>.
 */
export function exerciseWords(
  entry: LessonEntry,
  exercise: LessonExercise,
  words: ExerciseLookups,
): { question: string; answer: string } {
  if (exercise.type === "order") {
    const order =
      pathwayFor(entry.lesson.pathways, exercise.stimulus, [])?.order ?? [];
    const names = order.map((group) => words.plain(group));
    return {
      // Backwards, so the list to put in order is not the answer already.
      question: words.viewer("orderQuestion", {
        stimulus: words.plain(exercise.stimulus),
        names: words.list([...names].reverse()),
      }),
      answer: words.viewer("orderAnswer", {
        order: words.list(
          names.map((name, index) =>
            words.viewer("numbered", { number: index + 1, name }),
          ),
        ),
      }),
    };
  }
  return {
    question: words.lesson(`exercises.${exercise.id}.question`),
    answer: words.lesson(`exercises.${exercise.id}.answer`),
  };
}

export function useExerciseCopy(entry: LessonEntry) {
  const t = useTranslations("viewer.exercises");
  const format = useFormatter();
  const circuit = useCircuitCopy(entry.module);
  const copy = useLessonCopy(entry.lesson);
  const words: ExerciseLookups = {
    viewer: (key, values) => t(key, values),
    lesson: (key) => copy.plain(key),
    plain: (group) => circuit.plain(group),
    list: (items) => format.list(items, { type: "unit" }),
  };
  return (exercise: LessonExercise) => exerciseWords(entry, exercise, words);
}

/** A few questions about the circuit, for the end of the lesson. Each answer opens on a tap. */
export function Exercises({ entry }: { entry: LessonEntry }) {
  const t = useTranslations("viewer.exercises");
  const words = useExerciseCopy(entry);
  return (
    <section data-exercises="" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-fg classroom:text-2xl">
        {t("title")}
      </h2>
      <ol className="flex flex-col gap-3">
        {entry.lesson.exercises.map((exercise, index) => {
          const { question, answer } = words(exercise);
          return (
            <li
              key={exercise.id}
              data-exercise={exercise.id}
              className="flex flex-col gap-1.5 rounded-xl border border-border-strong p-3"
            >
              <p className="text-base leading-snug text-fg classroom:text-2xl">
                <span className="font-semibold">
                  {t("number", { number: index + 1 })}
                </span>{" "}
                {question}
              </p>
              <details className="group">
                <summary
                  className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-fg-muted hover:text-fg ${FOCUS_RING}`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="size-3 shrink-0 fill-none stroke-current transition-transform group-open:rotate-90 rtl:-scale-x-100"
                    strokeWidth="1.8"
                  >
                    <path d="M4.5 2.5 8 6l-3.5 3.5" />
                  </svg>
                  {t("showAnswer")}
                </summary>
                <p className="ps-5 text-base leading-snug text-fg-muted classroom:text-xl">
                  {answer}
                </p>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
