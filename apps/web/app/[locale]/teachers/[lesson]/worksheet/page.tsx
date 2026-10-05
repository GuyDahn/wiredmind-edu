import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { localePath } from "@/src/i18n/locales";
import { pageLocale, type LocaleParams } from "@/src/i18n/server";
import { shareCard } from "@/src/og/share-card";
import { SiteHeader } from "@/src/site/header";
import { LESSON_TEXT } from "@/src/site/lesson-text";
import { pageMetadata, shareImagePath } from "@/src/site/page-meta";
import { PrintButton } from "@/src/site/print-button";
import { SITE_NAME, SITE_URL } from "@/src/site/site";
import {
  guidePath,
  WORKSHEET_QUESTIONS,
  worksheetPath,
} from "@/src/site/teachers";
import { findLesson, LESSONS } from "@/src/viewer/modules";

type Params = LocaleParams & { lesson: string };

const ACTION =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong px-4 text-base font-semibold text-fg transition-colors hover:bg-overlay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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
  return {
    ...pageMetadata({
      locale,
      path: worksheetPath(entry),
      title: t("teachers.meta.worksheetTitle", { title }),
      shareTitle: t("teachers.meta.worksheetTitle", { title }),
      description: t("teachers.meta.worksheetDescription", { title }),
      image: shareImagePath(locale, `lesson-${entry.id}`, card.version),
      imageAlt: card.alt,
    }),
    // A sheet of blank lines is for printing, not for search results.
    robots: { index: false, follow: true },
  };
}

export default async function WorksheetPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const entry = findLesson((await params).lesson);
  if (!entry) notFound();
  const g = await getTranslations({ locale, namespace: "teachers.guide" });
  const w = await getTranslations({ locale, namespace: "teachers.worksheet" });
  const own = await getTranslations({
    locale,
    namespace: `teachers.lessons.${entry.id}.worksheet`,
  });
  const lesson = await getTranslations({
    locale,
    namespace: `lessons.${entry.id}`,
  });
  const lessonUrl = `${SITE_URL}${localePath(locale, entry.path)}`;
  return (
    <>
      <div className="print:hidden">
        <SiteHeader locale={locale} path={worksheetPath(entry)} />
      </div>
      <main
        id="main"
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 print:max-w-none print:p-0 print:text-[11pt]"
      >
        <div className="mb-8 flex flex-wrap gap-2 print:hidden">
          <PrintButton label={g("print")} className={ACTION} />
          <Link href={localePath(locale, guidePath(entry))} className={ACTION}>
            {g("eyebrow", { number: entry.number })}
          </Link>
        </div>
        <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
          {SITE_NAME} · {w("eyebrow", { number: entry.number })}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg print:mt-1 print:text-xl">
          {lesson("title")}
        </h1>
        <dl className="mt-5 grid print:mt-3 grid-cols-[2fr_1fr_1fr] gap-4 text-base text-fg">
          {(["name", "class", "date"] as const).map((field) => (
            <div key={field} className="flex items-end gap-2">
              <dt className="shrink-0 font-semibold">
                {w(field)}
                {":"}
              </dt>
              <dd className="h-7 flex-1 border-b border-fg/50" />
            </div>
          ))}
        </dl>
        <p className="mt-4 text-base text-fg-muted print:mt-2 print:text-[10.5pt]">
          {w("address")}
          {": "}
          <span dir="ltr" className="font-semibold break-all text-fg">
            {lessonUrl.replace(/^https:\/\//, "")}
          </span>
        </p>

        <Part number={1} title={w("predict")} hint={w("predictHint")}>
          {WORKSHEET_QUESTIONS.map((id) => (
            <Question key={id} lines={2}>
              {own(`predict.${id}`)}
            </Question>
          ))}
        </Part>

        <Part number={2} title={w("try")}>
          <p>{w("tryText")}</p>
        </Part>

        <Part number={3} title={w("observe")} hint={w("observeHint")}>
          {entry.lesson.steps.map((step, index) => (
            <div
              key={step.id}
              className="grid break-inside-avoid grid-cols-[4.5rem_1fr] items-end gap-x-3"
            >
              <span className="font-semibold text-fg">
                {w("step", { number: index + 1 })}
              </span>
              <Lines count={1} />
            </div>
          ))}
        </Part>

        <Part number={4} title={w("explain")}>
          <Question lines={2}>
            <span className="font-semibold text-fg">
              {w("question")}
              {":"}
            </span>{" "}
            {lesson.rich("check.question", LESSON_TEXT)}
          </Question>
          {WORKSHEET_QUESTIONS.map((id) => (
            <Question key={id} lines={3}>
              {own(`explain.${id}`)}
            </Question>
          ))}
        </Part>
      </main>
    </>
  );
}

/** One of the four parts: predict, try, observe, explain. */
function Part({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 print:mt-3">
      <h2 className="flex break-after-avoid items-baseline gap-2 text-xl font-semibold text-fg print:text-[13pt]">
        <span className="flex size-7 shrink-0 items-center justify-center self-center rounded-full border border-fg text-sm tabular-nums">
          {number}
        </span>
        {title}
        {hint ? (
          <span className="text-sm font-normal text-fg-muted">{hint}</span>
        ) : null}
      </h2>
      <div className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-fg-muted print:mt-1 print:gap-1.5 print:text-[10.5pt] print:leading-snug">
        {children}
      </div>
    </section>
  );
}

function Question({ lines, children }: { lines: number; children: ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <p className="text-fg">{children}</p>
      <Lines count={lines} />
    </div>
  );
}

/** Ruled lines to write on. */
function Lines({ count }: { count: number }) {
  return (
    <div aria-hidden="true" className="flex-1">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-8 border-b border-fg/50 print:h-[7.5mm]"
        />
      ))}
    </div>
  );
}
