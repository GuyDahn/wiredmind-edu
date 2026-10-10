import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localePath } from "@/src/i18n/locales";
import { pageLocale, type LocaleParams } from "@/src/i18n/server";
import { shareCard } from "@/src/og/share-card";
import { SiteFooter } from "@/src/site/footer";
import {
  GLOSSARY_PATH,
  GLOSSARY_TERMS,
  hasPage,
  termPath,
} from "@/src/site/glossary";
import { SiteHeader } from "@/src/site/header";
import { glossaryJsonLd, jsonLdScript, pageJsonLd } from "@/src/site/json-ld";
import { pageMetadata, shareImagePath } from "@/src/site/page-meta";
import { LINK_CLASS } from "@/src/site/rich-text";
import { SITE_NAME } from "@/src/site/site";
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
    path: GLOSSARY_PATH,
    title: t("glossary.metaTitle"),
    shareTitle: t("glossary.title"),
    description: t("glossary.metaDescription"),
    image: shareImagePath(locale, "home", card.version),
    imageAlt: card.alt,
  });
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const groups = [
    {
      id: "general",
      title: t("teachers.index.generalTerms"),
      path: null,
      terms: GENERAL_TERMS,
    },
    ...LESSONS.map((entry) => ({
      id: entry.id,
      title: t(`lessons.${entry.id}.title`),
      path: entry.path,
      terms: LESSON_TERMS[entry.id] ?? [],
    })),
  ];
  return (
    <>
      <SiteHeader locale={locale} path={GLOSSARY_PATH} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {t("glossary.title")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-fg-muted">
          {t("glossary.lead")}
        </p>
        {groups.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`terms-${group.id}`}
            className="mt-10"
          >
            <h2
              id={`terms-${group.id}`}
              className="text-xl font-semibold tracking-tight text-fg"
            >
              {group.path ? (
                <Link
                  href={localePath(locale, group.path)}
                  className={`${LINK_CLASS} inline-flex min-h-11 items-center`}
                >
                  {group.title}
                </Link>
              ) : (
                group.title
              )}
            </h2>
            <dl className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-fg-muted">
              {group.terms.filter(hasPage).map((id) => (
                <div key={id} data-term-entry={id}>
                  <dt className="font-semibold text-fg">
                    <Link
                      href={localePath(locale, termPath(id))}
                      className={`${LINK_CLASS} inline-flex min-h-11 items-center`}
                    >
                      {t(`terms.${id}.name`)}
                    </Link>
                  </dt>
                  <dd>{t(`terms.${id}.text`)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
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
              ],
              glossaryJsonLd({
                locale,
                path: GLOSSARY_PATH,
                name: t("glossary.title"),
                description: t("glossary.metaDescription"),
                terms: GLOSSARY_TERMS.map((id) => ({
                  name: t(`terms.${id}.name`),
                  path: termPath(id),
                })),
              }),
            ),
          ),
        }}
      />
    </>
  );
}
