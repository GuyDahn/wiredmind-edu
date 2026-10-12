import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localePath, type Locale } from "../i18n/locales.js";
import type { LessonEntry } from "../viewer/modules.js";
import { LESSON_TERMS } from "../viewer/terms.js";
import { hasPage, termPath } from "./glossary.js";
import { LESSON_TEXT } from "./lesson-text.js";
import { lessonQuestions, questionPath } from "./questions.js";
import { LINK_CLASS } from "./rich-text.js";
import { guidePath, worksheetPath } from "./teachers.js";

/** Where the lesson panel's link to this section points. */
export const LESSON_ABOUT_ID = "about-lesson";

/**
 * The lesson in words, under the viewer: what happens at each step, the
 * questions it answers, and its terms. The viewer itself draws to a canvas,
 * which neither a search engine nor a screen reader's page outline can read.
 */
export async function LessonAbout({
  locale,
  entry,
}: {
  locale: Locale;
  entry: LessonEntry;
}) {
  const t = await getTranslations({ locale });
  const lesson = await getTranslations({
    locale,
    namespace: `lessons.${entry.id}`,
  });
  const link = `${LINK_CLASS} inline-flex min-h-11 items-center`;
  const heading = "text-xl font-semibold tracking-tight text-fg";
  const questions = lessonQuestions(entry);
  const terms = (LESSON_TERMS[entry.id] ?? []).filter(hasPage);
  return (
    <section
      id={LESSON_ABOUT_ID}
      aria-labelledby="about-lesson-title"
      data-lesson-about
      className="border-t border-border bg-canvas text-fg"
    >
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h2
          id="about-lesson-title"
          className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl"
        >
          {t("questions.about")}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-fg-muted">
          {lesson("description")}
        </p>

        <h3 className={`mt-10 ${heading}`}>{t("questions.steps")}</h3>
        <ol className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-fg-muted">
          {entry.lesson.steps.map((step, index) => (
            <li
              key={step.id}
              className="grid grid-cols-[2rem_1fr] gap-x-2 border-t border-border pt-4"
            >
              <span className="font-semibold text-fg tabular-nums">
                {index + 1}
              </span>
              <div>
                <p>{lesson.rich(`steps.${step.id}.text`, LESSON_TEXT)}</p>
                <p className="mt-1 text-fg">
                  {lesson.rich(`steps.${step.id}.result`, LESSON_TEXT)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {questions.length > 0 ? (
          <>
            <h3 className={`mt-10 ${heading}`}>{t("questions.answered")}</h3>
            <dl className="mt-1 flex flex-col gap-3 text-base leading-relaxed text-fg-muted">
              {questions.map((question) => (
                <div key={question.id}>
                  <dt className="font-semibold text-fg">
                    <Link
                      href={localePath(locale, questionPath(question))}
                      className={link}
                    >
                      {t(`questions.items.${question.id}.title`)}
                    </Link>
                  </dt>
                  <dd>{t(`questions.items.${question.id}.short`)}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        <h3 className={`mt-10 ${heading}`}>{t("teachers.guide.termsTitle")}</h3>
        <ul className="mt-1 flex flex-wrap gap-x-5 text-base text-fg-muted">
          {terms.map((id) => (
            <li key={id}>
              <Link href={localePath(locale, termPath(id))} className={link}>
                {t(`terms.${id}.name`)}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 flex flex-wrap gap-x-6 text-base text-fg-muted">
          <Link href={localePath(locale, guidePath(entry))} className={link}>
            {t("teachers.index.guide")}
          </Link>
          <Link
            href={localePath(locale, worksheetPath(entry))}
            className={link}
          >
            {t("teachers.index.worksheet")}
          </Link>
        </p>
      </div>
    </section>
  );
}
