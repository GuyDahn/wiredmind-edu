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
import { questionPath, QUESTIONS, QUESTIONS_PATH } from "@/src/site/questions";
import { LINK_CLASS } from "@/src/site/rich-text";
import { SITE_NAME } from "@/src/site/site";

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
    path: QUESTIONS_PATH,
    title: t("questions.metaTitle"),
    shareTitle: t("questions.title"),
    description: t("questions.metaDescription"),
    image: shareImagePath(locale, "home", card.version),
    imageAlt: card.alt,
  });
}

export default async function QuestionsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const locale = await pageLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return (
    <>
      <SiteHeader locale={locale} path={QUESTIONS_PATH} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {t("questions.title")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-fg-muted">
          {t("questions.lead")}
        </p>
        <ul className="mt-10 flex flex-col gap-5">
          {QUESTIONS.map((question) => (
            <li
              key={question.id}
              data-question={question.id}
              className="rounded-2xl border border-border bg-overlay p-5"
            >
              <h2 className="text-xl font-semibold text-fg">
                <Link
                  href={localePath(locale, questionPath(question))}
                  className={`${LINK_CLASS} inline-flex min-h-11 items-center`}
                >
                  {t(`questions.items.${question.id}.title`)}
                </Link>
              </h2>
              <p className="mt-1 text-base leading-relaxed text-fg-muted">
                {t(`questions.items.${question.id}.short`)}
              </p>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            pageJsonLd(locale, [
              { name: SITE_NAME, path: "/" },
              { name: t("questions.title"), path: QUESTIONS_PATH },
            ]),
          ),
        }}
      />
    </>
  );
}
