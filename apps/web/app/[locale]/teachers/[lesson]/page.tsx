import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { localePath } from "@/src/i18n/locales";
import { pageLocale, type LocaleParams } from "@/src/i18n/server";
import { shareCard } from "@/src/og/share-card";
import { SiteFooter } from "@/src/site/footer";
import { SiteHeader } from "@/src/site/header";
import { jsonLdScript, pageJsonLd } from "@/src/site/json-ld";
import { LESSON_TEXT } from "@/src/site/lesson-text";
import { pageMetadata, shareImagePath } from "@/src/site/page-meta";
import { PrintButton } from "@/src/site/print-button";
import { LINK_CLASS } from "@/src/site/rich-text";
import { SITE_NAME, SITE_URL } from "@/src/site/site";
import {
  demoHref,
  DISCUSSION,
  guidePath,
  LESSON_REAL,
  LESSON_SIMPLIFIED,
  LESSON_TOPICS,
  MISCONCEPTIONS,
  PLAN,
  TEACHERS_PATH,
  worksheetPath,
} from "@/src/site/teachers";
import { findLesson, LESSONS } from "@/src/viewer/modules";
import { LESSON_TERMS } from "@/src/viewer/terms";

type Params = LocaleParams & { lesson: string };

const ACTION =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function generateStaticParams(): { lesson: string }[] {
  return LESSONS.map((entry) => ({ lesson: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await pageLocale(params);
  const entry = findLesson((await params).lesson);
  if (!entry) return {};
  const t = await getTranslations({ locale });
  const card = await shareCard(locale, `lesson-${entry.id}`);
  const title = t(`lessons.${entry.id}.title`);
  return pageMetadata({
    locale,
    path: guidePath(entry),
    title: t("teachers.meta.guideTitle", { title }),
    shareTitle: t("teachers.meta.guideTitle", { title }),
    description: t("teachers.meta.guideDescription", { title }),
    image: shareImagePath(locale, `lesson-${entry.id}`, card.version),
    imageAlt: card.alt,
  });
}

export default async function TeacherGuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const entry = findLesson((await params).lesson);
  if (!entry) notFound();
  const t = await getTranslations({ locale });
  const g = await getTranslations({ locale, namespace: "teachers.guide" });
  const own = await getTranslations({
    locale,
    namespace: `teachers.lessons.${entry.id}`,
  });
  const lesson = await getTranslations({
    locale,
    namespace: `lessons.${entry.id}`,
  });
  const title = lesson("title");
  const right = entry.lesson.check.choices.find((choice) => choice.correct)!;
  const lessonUrl = `${SITE_URL}${localePath(locale, entry.path)}`;
  return (
    <>
      <div className="print:hidden">
        <SiteHeader locale={locale} path={guidePath(entry)} />
      </div>
      <main
        id="main"
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 print:max-w-none print:p-0 print:text-[11pt]"
      >
        <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
          {g("eyebrow", { number: entry.number })}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl print:text-2xl">
          {title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-fg-muted print:text-base">
          {lesson("summary")}
        </p>
        <p className="mt-3 text-sm text-fg-muted">
          {g("address")}
          {": "}
          <span dir="ltr" className="font-semibold break-all text-fg">
            {lessonUrl.replace(/^https:\/\//, "")}
          </span>
        </p>
        <div className="mt-6 flex flex-wrap gap-2 print:hidden">
          <Link
            href={demoHref(locale, entry)}
            className={`${ACTION} bg-accent text-accent-fg hover:bg-accent-hover`}
          >
            {g("demo")}
          </Link>
          <Link
            href={localePath(locale, entry.path)}
            className={`${ACTION} border border-border-strong text-fg hover:bg-overlay`}
          >
            {g("lesson")}
          </Link>
          <Link
            href={localePath(locale, worksheetPath(entry))}
            className={`${ACTION} border border-border-strong text-fg hover:bg-overlay`}
          >
            {g("worksheet")}
          </Link>
          <PrintButton
            label={g("print")}
            className={`${ACTION} border border-border-strong text-fg hover:bg-overlay`}
          />
        </div>

        <Section title={g("goalTitle")}>
          <p className="text-lg leading-relaxed text-fg print:text-base">
            {own("goal")}
          </p>
        </Section>

        <Section title={g("setupTitle")}>
          <p>{g("setup")}</p>
        </Section>

        <Section title={g("topicsTitle")}>
          <dl className="flex flex-col gap-3">
            {(LESSON_TOPICS[entry.id] ?? []).map((topic) => (
              <div key={topic} className="break-inside-avoid">
                <dt className="font-semibold text-fg">
                  {t(`teachers.topics.${topic}`)}
                </dt>
                <dd>{own(`topics.${topic}`)}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title={g("planTitle")}>
          <ol className="flex flex-col gap-3">
            {PLAN.map(({ phase, minutes }) => (
              <li
                key={phase}
                className="grid break-inside-avoid grid-cols-[4.5rem_1fr] gap-x-4 border-t border-border pt-3"
              >
                <span className="font-semibold text-fg tabular-nums">
                  {g("minutes", { minutes })}
                </span>
                <div>
                  <h3 className="font-semibold text-fg">
                    {g(`phases.${phase}`)}
                  </h3>
                  <p>
                    {phase === "opening" ? own("opening") : g(`plan.${phase}`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={g("noticeTitle")}>
          <ol className="flex flex-col gap-3">
            {entry.lesson.steps.map((step, index) => (
              <li
                key={step.id}
                className="grid break-inside-avoid grid-cols-[4.5rem_1fr] gap-x-4 border-t border-border pt-3"
              >
                <span className="font-semibold text-fg">
                  {g("step", { number: index + 1 })}
                </span>
                <div>
                  <p className="text-fg-subtle">
                    {lesson.rich(`steps.${step.id}.text`, LESSON_TEXT)}
                  </p>
                  <p className="mt-1 text-fg">{own(`notice.${step.id}`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={g("answerTitle")}>
          <p className="font-semibold text-fg">
            {lesson.rich("check.question", LESSON_TEXT)}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-fg">
              {g("rightChoice")}
              {":"}
            </span>{" "}
            {lesson(`check.choices.${right.id}.text`)}
          </p>
          <p className="mt-2">{own("answer")}</p>
        </Section>

        <Section title={g("discussTitle")}>
          <ol className="flex list-decimal flex-col gap-2 ps-5">
            {DISCUSSION.map((id) => (
              <li key={id} className="break-inside-avoid">
                {own(`discuss.${id}`)}
              </li>
            ))}
          </ol>
        </Section>

        <Section title={g("misconceptionsTitle")}>
          <ul className="flex flex-col gap-3">
            {MISCONCEPTIONS.map((id) => (
              <li
                key={id}
                className="break-inside-avoid border-s-2 border-border-strong ps-4"
              >
                <p>
                  <span className="font-semibold text-fg">{g("claim")}</span>{" "}
                  {own(`misconceptions.${id}.claim`)}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-fg">{g("fix")}</span>{" "}
                  {own(`misconceptions.${id}.fix`)}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={g("realTitle")}>
          <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            <div className="break-inside-avoid">
              <h3 className="font-semibold text-fg">{g("real")}</h3>
              <ul className="mt-2 flex list-disc flex-col gap-2 ps-5">
                <li>{g("realShared")}</li>
                {(LESSON_REAL[entry.id] ?? []).map((id) => (
                  <li key={id}>{own(`real.${id}`)}</li>
                ))}
              </ul>
            </div>
            <div className="break-inside-avoid">
              <h3 className="font-semibold text-fg">{g("simplified")}</h3>
              <ul className="mt-2 flex list-disc flex-col gap-2 ps-5">
                <li>{g("simplifiedShared")}</li>
                {(LESSON_SIMPLIFIED[entry.id] ?? []).map((id) => (
                  <li key={id}>{own(`simplified.${id}`)}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 print:hidden">
            <Link
              href={`${localePath(locale, "/about")}#real-and-simplified`}
              className={`${LINK_CLASS} inline-flex min-h-11 items-center`}
            >
              {g("realMore")}
            </Link>
          </p>
        </Section>

        <Section title={g("termsTitle")}>
          <dl className="flex flex-col gap-2">
            {(LESSON_TERMS[entry.id] ?? []).map((id) => (
              <div key={id} className="break-inside-avoid">
                <dt className="inline font-semibold text-fg">
                  {t(`terms.${id}.name`)}
                  {"."}
                </dt>{" "}
                <dd className="inline">{t(`terms.${id}.text`)}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title={g("curriculumTitle")}>
          {/* TODO: confirm with the biology instructors. No official curriculum
              codes or unit names go here until they have. The same note is
              written into the page as an HTML comment, below. */}
          <div
            hidden
            dangerouslySetInnerHTML={{
              __html: "<!-- TODO: confirm with the biology instructors -->",
            }}
          />
          <p
            data-todo="curriculum"
            className="rounded-xl border border-dashed border-border-strong p-4"
          >
            {g("curriculumPending")}
          </p>
        </Section>

        <p className="mt-10 print:hidden">
          <Link
            href={localePath(locale, TEACHERS_PATH)}
            className={`${LINK_CLASS} inline-flex min-h-11 items-center`}
          >
            {g("all")}
          </Link>
        </p>
      </main>
      <div className="print:hidden">
        <SiteFooter locale={locale} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            pageJsonLd(locale, [
              { name: SITE_NAME, path: "/" },
              { name: t("teachers.index.title"), path: TEACHERS_PATH },
              { name: title, path: guidePath(entry) },
            ]),
          ),
        }}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 print:mt-5">
      <h2 className="break-after-avoid text-xl font-semibold tracking-tight text-fg print:text-[13pt]">
        {title}
      </h2>
      <div className="mt-3 text-base leading-relaxed text-fg-muted print:mt-1.5 print:text-[11pt] print:leading-snug">
        {children}
      </div>
    </section>
  );
}
