import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localePath } from "@/src/i18n/locales";
import { pageLocale, type LocaleParams } from "@/src/i18n/server";
import { shareCard } from "@/src/og/share-card";
import { SiteFooter } from "@/src/site/footer";
import { termPath } from "@/src/site/glossary";
import { SiteHeader } from "@/src/site/header";
import { answerJsonLd, jsonLdScript, pageJsonLd } from "@/src/site/json-ld";
import { pageMetadata, shareImagePath } from "@/src/site/page-meta";
import {
  ANSWER_PARTS,
  findQuestion,
  questionLessons,
  questionPath,
  QUESTIONS,
  QUESTIONS_PATH,
} from "@/src/site/questions";
import { ForwardArrow, LINK_CLASS } from "@/src/site/rich-text";
import { SITE_NAME } from "@/src/site/site";

type Params = LocaleParams & { question: string };

export function generateStaticParams(): { question: string }[] {
  return QUESTIONS.map((question) => ({ question: question.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await pageLocale(params);
  const question = findQuestion((await params).question);
  if (!question) return {};
  const t = await getTranslations({ locale });
  // A lesson's question shares that lesson's card; the rest share the home card.
  const page = question.lesson
    ? (`lesson-${question.lesson}` as const)
    : "home";
  const card = await shareCard(locale, page);
  const title = t(`questions.items.${question.id}.title`);
  return pageMetadata({
    locale,
    path: questionPath(question),
    title,
    shareTitle: title,
    description: t(`questions.items.${question.id}.short`),
    image: shareImagePath(locale, page, card.version),
    imageAlt: card.alt,
  });
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const question = findQuestion((await params).question);
  if (!question) notFound();
  const t = await getTranslations({ locale });
  const own = await getTranslations({
    locale,
    namespace: `questions.items.${question.id}`,
  });
  const title = own("title");
  const link = `${LINK_CLASS} inline-flex min-h-11 items-center`;
  const others = QUESTIONS.filter((other) => other.id !== question.id);
  return (
    <>
      <SiteHeader locale={locale} path={questionPath(question)} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
          <Link
            href={localePath(locale, QUESTIONS_PATH)}
            className={`${link} tracking-[0.14em]`}
          >
            {t("questions.nav")}
          </Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        <p
          data-answer-short
          className="mt-4 text-lg leading-relaxed font-semibold text-fg"
        >
          {own("short")}
        </p>
        <div className="mt-6 flex flex-col gap-4 text-lg leading-relaxed text-fg-muted">
          {ANSWER_PARTS.map((part) => (
            <p key={part}>{own(part)}</p>
          ))}
        </div>

        <section aria-labelledby="in-lessons" className="mt-12">
          <h2
            id="in-lessons"
            className="text-xl font-semibold tracking-tight text-fg"
          >
            {t("glossary.inLessons")}
          </h2>
          <ul className="mt-4 flex flex-col gap-5">
            {questionLessons(question).map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-border bg-overlay p-5"
              >
                <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                  {t("teachers.index.lesson", { number: entry.number })}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-fg">
                  {t(`lessons.${entry.id}.title`)}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-fg-muted">
                  {t(`lessons.${entry.id}.summary`)}
                </p>
                <p className="mt-3">
                  <Link
                    href={localePath(locale, entry.path)}
                    className={`${link} gap-1.5 font-semibold text-fg`}
                  >
                    {t("teachers.guide.lesson")}
                    <ForwardArrow />
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="terms" className="mt-12">
          <h2
            id="terms"
            className="text-xl font-semibold tracking-tight text-fg"
          >
            {t("teachers.guide.termsTitle")}
          </h2>
          <dl className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-fg-muted">
            {question.terms.map((id) => (
              <div key={id} data-term-entry={id}>
                <dt className="font-semibold text-fg">
                  <Link
                    href={localePath(locale, termPath(id))}
                    className={link}
                  >
                    {t(`terms.${id}.name`)}
                  </Link>
                </dt>
                <dd>{t(`terms.${id}.text`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="more" className="mt-12">
          <h2
            id="more"
            className="text-xl font-semibold tracking-tight text-fg"
          >
            {t("questions.more")}
          </h2>
          <ul className="mt-2 flex flex-col text-base text-fg-muted">
            {others.map((other) => (
              <li key={other.id}>
                <Link
                  href={localePath(locale, questionPath(other))}
                  className={link}
                >
                  {t(`questions.items.${other.id}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            pageJsonLd(
              locale,
              [
                { name: SITE_NAME, path: "/" },
                { name: t("questions.title"), path: QUESTIONS_PATH },
                { name: title, path: questionPath(question) },
              ],
              answerJsonLd({
                locale,
                path: questionPath(question),
                headline: title,
                description: own("short"),
              }),
            ),
          ),
        }}
      />
    </>
  );
}
