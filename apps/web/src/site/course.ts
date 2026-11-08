import mapping from "../../content/course-mapping.json" with { type: "json" };

/**
 * How WiredMind's lessons line up with the syllabus of the Campus IL course
 * "המוח – המכונה המופלאה מכולן". One file, content/course-mapping.json, in
 * Hebrew and English; every other language reads the English. Aligned with
 * the syllabus only: nothing here claims a partnership or an endorsement.
 */

/** Text in Hebrew and English. */
export type Bilingual = { he: string; en: string };

type Mapping = {
  boxTitle: Bilingual;
  aligned: Bilingual;
  lessonLabel: Bilingual;
  whenLabel: Bilingual;
  spikes: Bilingual;
  courseLessons: Record<string, Bilingual>;
  /** The course lesson on brain evolution, which every comparison draws on. */
  evolutionLesson: number;
  lessons: Record<string, { courseLessons: number[]; when: Bilingual }>;
};

export const COURSE = mapping as Mapping;

/** Hebrew in Hebrew, English everywhere else. */
export function inLocale(text: Bilingual, locale: string): string {
  return locale === "he" ? text.he : text.en;
}

/** A course lesson's title, e.g. "Plasticity, learning and memory". */
export function courseLessonTitle(number: number, locale: string): string {
  const lesson = COURSE.courseLessons[String(number)];
  if (!lesson) throw new Error(`The course has no lesson ${number}`);
  return inLocale(lesson, locale);
}

/** The course lessons a WiredMind lesson fits, in order. */
export function courseLessonsFor(lessonId: string): number[] {
  const lesson = COURSE.lessons[lessonId];
  if (!lesson) throw new Error(`No course mapping for ${lessonId}`);
  return lesson.courseLessons;
}

/** The course lessons a lesson's comparison card points to: brain evolution, then the lesson's own. */
export function comparisonCourseLessons(lessonId: string): number[] {
  return [
    ...new Set([COURSE.evolutionLesson, ...courseLessonsFor(lessonId)]),
  ].sort((a, b) => a - b);
}
