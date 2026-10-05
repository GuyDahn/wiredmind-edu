"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { ENDONYMS, localePath } from "../i18n/locales.js";
import { LanguageMenu } from "../site/language-menu.js";
import { SITE_NAME } from "../site/site.js";
import { readClassMode, withClassMode } from "./class-mode.js";
import { CompassDial } from "./compass-dial.js";
import { Legend } from "./legend.js";
import { groupColor } from "./module.js";
import { findLesson, LESSONS, type LessonEntry } from "./modules.js";
import { ModuleRunner } from "./module-runner.js";
import {
  decodeReplay,
  REPLAY_PARAM,
  ReplayError,
  replayProblem,
  type Replay,
  type ReplayErrorCode,
} from "./replay.js";
import { ReplayRunner } from "./replay-runner.js";
import { useViewerStore } from "./store.js";

const Scene = dynamic(() => import("./scene.js"), { ssr: false });

type Shared = { entry: LessonEntry; replay: Replay };

export function Viewer({
  lessonId,
  credit,
  menu,
}: {
  lessonId: string;
  /** Who made the site, shown at the end of the lesson panel. */
  credit?: ReactNode;
  /** The site menu, which replaces the language menu on phones. */
  menu?: ReactNode;
}) {
  const entry = findLesson(lessonId) ?? LESSONS[0]!;
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("viewer.replay");
  const [shared, setShared] = useState<Shared | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const classMode = useViewerStore((state) => state.classMode);

  // Class mode is whatever the address says, on every lesson page.
  useEffect(() => {
    useViewerStore
      .getState()
      .setClassMode(readClassMode(window.location.search));
  }, [entry.id]);

  // A share link names its own lesson. If that is not this page's lesson,
  // go to its page, which carries that lesson's words.
  useEffect(() => {
    const search = window.location.search;
    const raw = new URLSearchParams(search).get(REPLAY_PARAM);
    if (raw === null) return;
    let code: ReplayErrorCode | "generic";
    try {
      const replay = decodeReplay(raw);
      const target = findLesson(replay.lessonId);
      if (!target) throw new ReplayError("unknownLesson");
      const problem = replayProblem(replay, target.module);
      if (problem) throw new ReplayError(problem);
      if (target.id !== entry.id) {
        router.replace(`${localePath(locale, target.path)}${search}`);
        return;
      }
      setShared({ entry: target, replay });
      return;
    } catch (error) {
      code = error instanceof ReplayError ? error.code : "generic";
    }
    // Drop the broken link so a reload or a share does not carry it on.
    const url = new URL(window.location.href);
    url.searchParams.delete(REPLAY_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    setNotice(t("notice", { problem: t(`errors.${code}`) }));
  }, [entry.id, locale, router, t]);

  function exitReplay() {
    const url = new URL(window.location.href);
    url.searchParams.delete(REPLAY_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    setShared(null);
  }

  return (
    <div
      data-mode={classMode ? "class" : undefined}
      className="flex h-dvh flex-col overflow-hidden bg-canvas text-fg md:flex-row"
    >
      {shared ? (
        <ReplayRunner
          key={`${shared.entry.id}-replay`}
          entry={shared.entry}
          replay={shared.replay}
          onExit={exitReplay}
          credit={credit}
        />
      ) : (
        <ModuleRunner
          key={entry.id}
          entry={entry}
          notice={notice}
          credit={credit}
        />
      )}
      <Stage entry={entry} menu={menu} replaying={shared !== null} />
    </div>
  );
}

function Stage({
  entry,
  menu,
  replaying,
}: {
  entry: LessonEntry;
  menu?: ReactNode;
  /** A shared run is playing, which has no intro to reopen. */
  replaying: boolean;
}) {
  const status = useViewerStore((state) => state.status);
  const error = useViewerStore((state) => state.error);
  const progress = useViewerStore((state) => state.progress);
  const locale = useLocale();
  const t = useTranslations("viewer");
  const lessonCopy = useTranslations(`lessons.${entry.id}`);
  const percent = Math.round(progress * 100);
  const { module } = entry;

  return (
    <div className="relative order-1 min-h-0 flex-1 bg-zinc-950 md:order-2">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold tracking-[0.16em] text-zinc-400 uppercase"
            data-tap-target="text"
          >
            <Link
              href={localePath(locale, "/")}
              lang="en"
              translate="no"
              className="pointer-events-auto rounded-sm hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {SITE_NAME}
            </Link>{" "}
            · {t("stage.lesson", { number: entry.number })}
          </p>
          <h1 className="max-w-md text-xl font-semibold tracking-tight text-zinc-50 md:text-3xl classroom:md:max-w-2xl classroom:md:text-4xl">
            {lessonCopy("title")}
          </h1>
          <p className="mt-1 hidden max-w-sm text-sm leading-snug text-zinc-300 md:block">
            {lessonCopy("summary")}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          {replaying ? null : <IntroButton />}
          <ClassModeButton />
          {menu}
          <StageLanguageMenu path={entry.path} />
        </div>
      </header>
      <p className="sr-only">{t("stage.canvasHelp")}</p>
      {/* The brain is a real fly's, so it never mirrors for right-to-left languages. */}
      <div
        className="absolute inset-0 touch-none"
        dir="ltr"
        data-intro="canvas"
      >
        <Scene module={module} />
      </div>
      <Legend module={module} />
      {module.compass && status === "ready" ? (
        <div className="absolute end-3 bottom-3 z-10 md:end-4 md:bottom-4">
          <CompassDial color={groupColor(module, module.compass.colorGroup)} />
        </div>
      ) : null}
      {status === "loading" ? (
        <p className="pointer-events-none absolute inset-x-4 bottom-16 text-center text-sm text-zinc-300 md:bottom-3">
          {percent > 0
            ? t("stage.loadingPercent", { percent })
            : t("stage.loading")}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="absolute inset-x-4 bottom-16 z-20 rounded-xl bg-red-950/90 px-3 py-2 text-sm text-red-100"
        >
          {t(`load.${error}`)}
        </p>
      ) : null}
    </div>
  );
}

/** A control on the dark canvas, the size of the phone menu's button. */
const STAGE_BUTTON =
  "pointer-events-auto flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-semibold backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const STAGE_BUTTON_OFF = "bg-zinc-950/60 text-zinc-200 hover:text-white";
const STAGE_BUTTON_ON = "bg-zinc-100 text-zinc-950";

/** "?": opens the "How to read this brain" intro again, at any point of the lesson. */
function IntroButton() {
  const t = useTranslations("viewer.intro");
  const open = useViewerStore((state) => state.intro);
  return (
    <button
      type="button"
      data-intro-open=""
      aria-label={t("label")}
      title={t("label")}
      aria-pressed={open}
      onClick={() => useViewerStore.getState().setIntro(true)}
      className={`${STAGE_BUTTON} ${open ? STAGE_BUTTON_ON : STAGE_BUTTON_OFF}`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ?
      </span>
    </button>
  );
}

/** Turns class mode on or off and writes it to the address, so the page can be bookmarked that way. */
function ClassModeButton() {
  const t = useTranslations("viewer.classMode");
  const on = useViewerStore((state) => state.classMode);
  function toggle() {
    const next = !on;
    window.history.replaceState(
      null,
      "",
      withClassMode(window.location.href, next),
    );
    useViewerStore.getState().setClassMode(next);
  }
  return (
    <button
      type="button"
      data-class-mode=""
      aria-pressed={on}
      aria-label={t("hint")}
      title={t("hint")}
      onClick={toggle}
      className={`${STAGE_BUTTON} ${on ? STAGE_BUTTON_ON : STAGE_BUTTON_OFF}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5 fill-none stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" />
        <path d="M10 13.5v3M6.5 16.5h7" />
      </svg>
      <span className="hidden lg:inline">{t("label")}</span>
    </button>
  );
}

function StageLanguageMenu({ path }: { path: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  return (
    <LanguageMenu
      current={locale}
      path={path}
      label={t("button", { language: ENDONYMS[locale] })}
      menuLabel={t("menu")}
      className="pointer-events-auto -me-1.5 hidden rounded-lg bg-zinc-950/60 text-sm backdrop-blur-sm md:block"
    />
  );
}
