import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { localePath } from "@/src/i18n/locales";
import type { MessageTree } from "@/src/i18n/messages";
import { pageLocale, type LocaleParams } from "@/src/i18n/server";
import { shareCard } from "@/src/og/share-card";
import { SiteFooter } from "@/src/site/footer";
import {
  findTerm,
  GLOSSARY_PATH,
  GLOSSARY_TERMS,
  relatedTerms,
  termLessons,
  termPath,
  termSteps,
  TERM_SLUGS,
} from "@/src/site/glossary";
import { SiteHeader } from "@/src/site/header";
import { jsonLdScript, pageJsonLd, termJsonLd } from "@/src/site/json-ld";
import { LESSON_TEXT } from "@/src/site/lesson-text";
import { pageMetadata, shareImagePath } from "@/src/site/page-meta";
import { ForwardArrow, LINK_CLASS } from "@/src/site/rich-text";
import { SITE_NAME } from "@/src/site/site";
import { LESSONS } from "@/src/viewer/modules";

type Params = LocaleParams & { term: string };

export function generateStaticParams(): { term: string }[] {
  return GLOSSARY_TERMS.map((id) => ({ term: TERM_SLUGS[id] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await pageLocale(params);
  const id = findTerm((await params).term);
  if (!id) return {};
  const t = await getTranslations({ locale });
  const card = await shareCard(locale, "home");
  const name = t(`terms.${id}.name`);
  return pageMetadata({
    locale,
    path: termPath(id),
    title: t("glossary.termTitle", { term: name }),
    shareTitle: name,
    description: t(`terms.${id}.text`),
    image: shareImagePath(locale, "home", card.version),
    imageAlt: card.alt,
  });
}

export default async function TermPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const id = findTerm((await params).term);
  if (!id) notFound();
  const t = await getTranslations({ locale });
  const messages = (await getMessages({ locale })) as MessageTree;
  const name = t(`terms.${id}.name`);
  // A term from one lesson shows where that lesson uses it. The basics
  // belong to every lesson, so they point at all three.
  const own = termLessons(id);
  const lessons = own.length > 0 ? own : LESSONS;
  const related = relatedTerms(id);
  const link = `${LINK_CLASS} inline-flex min-h-11 items-center`;
  return (
    <>
      <SiteHeader locale={locale} path={termPath(id)} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
          <Link
            href={localePath(locale, GLOSSARY_PATH)}
            className={`${link} tracking-[0.14em]`}
          >
            {t("glossary.nav")}
          </Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {name}
        </h1>
        <p
          data-term-definition
          className="mt-4 text-lg leading-relaxed text-fg"
        >
          {t(`terms.${id}.text`)}
        </p>

        <section aria-labelledby="in-lessons" className="mt-12">
          <h2
            id="in-lessons"
            className="text-xl font-semibold tracking-tight text-fg"
          >
            {t("glossary.inLessons")}
          </h2>
          <ul className="mt-4 flex flex-col gap-5">
            {lessons.map((entry) => {
              const steps =
                own.length > 0 ? termSteps(entry, id, messages) : [];
              return (
                <li
                  key={entry.id}
                  data-term-lesson={entry.id}
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
                  {steps.length > 0 ? (
                    <>
                      <h4 className="mt-4 text-sm font-semibold text-fg-subtle">
                        {t("glossary.steps")}
                      </h4>
                      <ol className="mt-2 flex flex-col gap-3 text-base leading-relaxed text-fg-muted">
                        {steps.map((step) => (
                          <li
                            key={step}
                            className="border-s-2 border-border-strong ps-4"
                          >
                            <p>
                              {t.rich(
                                `lessons.${entry.id}.steps.${step}.text`,
                                LESSON_TEXT,
                              )}
                            </p>
                            <p className="mt-1 text-fg">
                              {t.rich(
                                `lessons.${entry.id}.steps.${step}.result`,
                                LESSON_TEXT,
                              )}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
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
              );
            })}
          </ul>
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="related" className="mt-12">
            <h2
              id="related"
              className="text-xl font-semibold tracking-tight text-fg"
            >
              {t("glossary.related")}
            </h2>
            <dl className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-fg-muted">
              {related.map((other) => (
                <div key={other} data-term-entry={other}>
                  <dt className="font-semibold text-fg">
                    <Link
                      href={localePath(locale, termPath(other))}
                      className={link}
                    >
                      {t(`terms.${other}.name`)}
                    </Link>
                  </dt>
                  <dd>{t(`terms.${other}.text`)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <p className="mt-10">
          <Link href={localePath(locale, GLOSSARY_PATH)} className={link}>
            {t("glossary.all")}
          </Link>
        </p>
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
                { name: t("glossary.title"), path: GLOSSARY_PATH },
                { name, path: termPath(id) },
              ],
              termJsonLd({
                locale,
                path: termPath(id),
                glossaryPath: GLOSSARY_PATH,
                name,
                description: t(`terms.${id}.text`),
              }),
            ),
          ),
        }}
      />
    </>
  );
}
