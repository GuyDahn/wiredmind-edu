import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localePath } from "@/src/i18n/locales";
import { pageLocale, type LocaleParams } from "@/src/i18n/server";
import { shareCard } from "@/src/og/share-card";
import { SiteFooter } from "@/src/site/footer";
import { SiteHeader } from "@/src/site/header";
import { jsonLdScript, pageJsonLd } from "@/src/site/json-ld";
import { pageMetadata, shareImagePath } from "@/src/site/page-meta";
import { LINK_CLASS } from "@/src/site/rich-text";
import { SITE_NAME } from "@/src/site/site";
import {
  demoHref,
  guidePath,
  TEACHERS_PATH,
  worksheetPath,
} from "@/src/site/teachers";
import { LESSONS } from "@/src/viewer/modules";
import { GENERAL_TERMS, LESSON_TERMS } from "@/src/viewer/terms";

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale });
  const card = await shareCard(locale, "home");
  return pageMetadata({
    locale,
    path: TEACHERS_PATH,
    title: t("teachers.meta.indexTitle"),
    shareTitle: t("teachers.index.title"),
    description: t("teachers.meta.indexDescription"),
    image: shareImagePath(locale, "home", card.version),
    imageAlt: card.alt,
  });
}

export default async function TeachersPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const link = `${LINK_CLASS} inline-flex min-h-11 items-center`;
  return (
    <>
      <SiteHeader locale={locale} path={TEACHERS_PATH} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {t("teachers.index.title")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-fg-muted">
          {t("teachers.index.lead")}
        </p>
        <ol className="mt-10 flex flex-col gap-5">
          {LESSONS.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-border bg-overlay p-5"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                {t("teachers.index.lesson", { number: entry.number })}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-fg">
                {t(`lessons.${entry.id}.title`)}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-fg-muted">
                {t(`teachers.lessons.${entry.id}.goal`)}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-6 text-base text-fg-muted">
                <Link
                  href={localePath(locale, guidePath(entry))}
                  className={`${link} font-semibold text-fg`}
                >
                  {t("teachers.index.guide")}
                </Link>
                <Link
                  href={localePath(locale, worksheetPath(entry))}
                  className={link}
                >
                  {t("teachers.index.worksheet")}
                </Link>
                <Link href={demoHref(locale, entry)} className={link}>
                  {t("teachers.index.demo")}
                </Link>
              </p>
            </li>
          ))}
        </ol>

        {/* Every term the lessons use, in one place, so a teacher can read
            them all before class. The same explanations open on a tap inside
            the lessons. */}
        <section aria-labelledby="terms-title" className="mt-14">
          <h2
            id="terms-title"
            className="text-2xl font-semibold tracking-tight text-fg"
          >
            {t("teachers.guide.termsTitle")}
          </h2>
          <div className="mt-6">
            <h3 className="text-base font-semibold text-fg-subtle">
              {t("teachers.index.generalTerms")}
            </h3>
            <dl className="mt-2 flex flex-col gap-3 text-base leading-relaxed text-fg-muted">
              {GENERAL_TERMS.map((id) => (
                <div key={id} data-term-entry={id}>
                  <dt className="font-semibold text-fg">
                    {t(`terms.${id}.name`)}
                  </dt>
                  <dd>{t(`terms.${id}.text`)}</dd>
                </div>
              ))}
            </dl>
          </div>
          {LESSONS.map((entry) => (
            <div key={entry.id} className="mt-6">
              <h3 className="text-base font-semibold text-fg-subtle">
                {t("teachers.index.lesson", { number: entry.number })}
                {" · "}
                {t(`lessons.${entry.id}.title`)}
              </h3>
              <dl className="mt-2 flex flex-col gap-3 text-base leading-relaxed text-fg-muted">
                {(LESSON_TERMS[entry.id] ?? []).map((id) => (
                  <div key={id} data-term-entry={id}>
                    <dt className="font-semibold text-fg">
                      {t(`terms.${id}.name`)}
                    </dt>
                    <dd>{t(`terms.${id}.text`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            pageJsonLd(locale, [
              { name: SITE_NAME, path: "/" },
              { name: t("teachers.index.title"), path: TEACHERS_PATH },
            ]),
          ),
        }}
      />
    </>
  );
}
