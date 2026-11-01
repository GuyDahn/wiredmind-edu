import { useLocale, useTranslations } from "next-intl";
import compass from "../../content/comparisons/compass.json" with { type: "json" };
import escape from "../../content/comparisons/escape.json" with { type: "json" };
import smellMemory from "../../content/comparisons/smell-memory.json" with { type: "json" };
import { DEFAULT_LOCALE } from "../i18n/locales.js";

/**
 * "What happens in mammals and birds that is like the fly?": a card for the
 * end of each lesson, bridging to the animals a school course is about. Its
 * words are drafts until teachers and a neuroscientist have checked them, so
 * it stays hidden unless NEXT_PUBLIC_SHOW_COMPARISONS is "true".
 */
export const SHOW_COMPARISONS =
  process.env.NEXT_PUBLIC_SHOW_COMPARISONS === "true";

export type Comparison = {
  lesson: string;
  /** False until a reviewer has signed the text off. The card says so. */
  reviewed: boolean;
  /** A picture beside the text, once there is one. Paths are under public/. */
  illustration: { src: string; alt: Record<string, string> } | null;
  /** By locale. A language with no text of its own gets the English. */
  text: Record<string, string>;
  questions: Record<string, string[]>;
};

const COMPARISONS: Record<string, Comparison> = {
  "smell-memory": smellMemory as Comparison,
  compass: compass as Comparison,
  escape: escape as Comparison,
};

export function comparisonFor(lessonId: string): Comparison | null {
  return COMPARISONS[lessonId] ?? null;
}

/** The text in the reader's language, else in English. */
export function localized<T>(
  byLocale: Record<string, T>,
  locale: string,
): T | undefined {
  return byLocale[locale] ?? byLocale[DEFAULT_LOCALE];
}

export function ComparisonCard({ lessonId }: { lessonId: string }) {
  const t = useTranslations("viewer.comparison");
  const locale = useLocale();
  const comparison = comparisonFor(lessonId);
  if (!comparison) return null;
  const text = localized(comparison.text, locale);
  const questions = localized(comparison.questions, locale) ?? [];
  const picture = comparison.illustration;
  return (
    <section
      data-comparison={lessonId}
      className="flex flex-col gap-3 rounded-xl border border-border-strong p-3"
    >
      <h2 className="text-lg font-semibold text-fg classroom:text-2xl">
        {t("title")}
      </h2>
      {comparison.reviewed ? null : (
        <p className="self-start rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
          {t("draft")}
        </p>
      )}
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small, optional slot
        <img
          src={picture.src}
          alt={localized(picture.alt, locale) ?? ""}
          className="w-full rounded-lg"
        />
      ) : null}
      {text ? (
        <p className="text-base leading-snug text-fg-muted">{text}</p>
      ) : null}
      {questions.length > 0 ? (
        <ol className="list-decimal ps-5 text-base leading-snug text-fg-muted">
          {questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
