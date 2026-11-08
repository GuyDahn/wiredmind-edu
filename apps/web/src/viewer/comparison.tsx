import { useLocale, useTranslations } from "next-intl";
import {
  comparisonCourseLessons,
  COURSE,
  courseLessonTitle,
  inLocale,
} from "../site/course.js";
import {
  comparisonFor,
  comparisonsShown,
  WHY_FLY,
  type CardBase,
} from "./comparisons.js";

const SECTIONS = ["fly", "mammals", "birds", "shared"] as const;

/** The card at the end of a lesson. Renders nothing while the flag is off. */
export function ComparisonCard({ lessonId }: { lessonId: string }) {
  const t = useTranslations("viewer.comparison");
  const locale = useLocale();
  const comparison = comparisonFor(lessonId);
  if (!comparisonsShown() || !comparison) return null;
  return (
    <section
      data-comparison={lessonId}
      className="flex flex-col gap-3 rounded-xl border border-border-strong p-3"
    >
      <h2 className="text-lg font-semibold text-fg classroom:text-2xl">
        {t("title")}
      </h2>
      <CardMeta
        reviewed={comparison.reviewed}
        lessons={comparisonCourseLessons(lessonId)}
      />
      <Picture card={comparison} locale={locale} />
      <dl className="flex flex-col gap-2 text-base leading-snug">
        {SECTIONS.map((section) => (
          <div key={section}>
            <dt className="font-semibold text-fg">{t(section)}</dt>
            <dd className="text-fg-muted">
              {inLocale(comparison[section], locale)}
            </dd>
          </div>
        ))}
        <div>
          <dt className="font-semibold text-fg">{t("question")}</dt>
          <dd className="text-fg-muted">
            {inLocale(comparison.question, locale)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** "Why learn from a fly at all?", on the lessons page. Renders nothing while the flag is off. */
export function WhyFlyCard() {
  const locale = useLocale();
  if (!comparisonsShown()) return null;
  return (
    <section
      data-comparison="why-fly"
      aria-labelledby="why-fly-title"
      className="mt-10 flex flex-col gap-3 rounded-2xl border border-border-strong p-5"
    >
      <h3 id="why-fly-title" className="text-xl font-semibold text-fg">
        {inLocale(WHY_FLY.title, locale)}
      </h3>
      <CardMeta
        reviewed={WHY_FLY.reviewed}
        lessons={[COURSE.evolutionLesson]}
      />
      <Picture card={WHY_FLY} locale={locale} />
      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-base leading-snug text-fg-muted">
        {(locale === "he" ? WHY_FLY.points.he : WHY_FLY.points.en).map(
          (point) => (
            <li key={point}>{point}</li>
          ),
        )}
      </ul>
    </section>
  );
}

/** The draft badge, and the course lessons the card points to. */
function CardMeta({
  reviewed,
  lessons,
}: {
  reviewed: boolean;
  lessons: number[];
}) {
  const t = useTranslations("viewer.comparison");
  const locale = useLocale();
  return (
    <>
      {reviewed ? null : (
        <p className="self-start rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
          {t("draft")}
        </p>
      )}
      <p
        data-course-lessons={lessons.join(" ")}
        className="text-sm text-fg-subtle"
      >
        <span className="font-semibold">{t("course")}</span>{" "}
        {lessons
          .map((number) => `${number} (${courseLessonTitle(number, locale)})`)
          .join(" · ")}
      </p>
    </>
  );
}

function Picture({ card, locale }: { card: CardBase; locale: string }) {
  if (!card.illustration) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small, optional slot
    <img
      src={card.illustration.src}
      alt={inLocale(card.illustration.alt, locale)}
      className="w-full rounded-lg"
    />
  );
}
