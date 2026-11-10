"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ENDONYMS, localePath } from "../i18n/locales.js";
import { LanguageMenu } from "../site/language-menu.js";
import { SITE_NAME } from "../site/site.js";
import { prefetchCircuit } from "./circuit-files.js";
import { readClassMode, withClassMode } from "./class-mode.js";
import { LoadingBar } from "./loading-bar.js";
import { groupColor } from "./module.js";
import { findLesson, LESSONS, type LessonEntry } from "./modules.js";
import { SceneGuard } from "./scene-guard.js";
import {
  decodeReplay,
  REPLAY_PARAM,
  ReplayError,
  replayProblem,
  type Replay,
  type ReplayErrorCode,
} from "./replay.js";
import { useViewerStore } from "./store.js";
import { Story } from "./story.js";

// The story is all a lesson page shows at first, so it is all the page's own
// bundle carries. Everything behind it (the lesson panel and the simulator it
// drives, the 3D scene, the color key) loads on its own, after the story
// answers taps.
const Scene = dynamic(() => import("./scene.js"), { ssr: false });
const ModuleRunner = dynamic(
  () => import("./module-runner.js").then((mod) => mod.ModuleRunner),
  { ssr: false, loading: PanelLoading },
);
const ReplayRunner = dynamic(
  () => import("./replay-runner.js").then((mod) => mod.ReplayRunner),
  { ssr: false, loading: PanelLoading },
);
const Legend = dynamic(() => import("./legend.js").then((mod) => mod.Legend), {
  ssr: false,
});
const CompassDial = dynamic(
  () => import("./compass-dial.js").then((mod) => mod.CompassDial),
  { ssr: false },
);
const PathwayDiagram = dynamic(
  () => import("./pathway-view.js").then((mod) => mod.PathwayDiagram),
  { ssr: false },
);
const BadgeLayer = dynamic(
  () => import("./pathway-view.js").then((mod) => mod.BadgeLayer),
  { ssr: false },
);
const ResetViewButton = dynamic(
  () => import("./pathway-view.js").then((mod) => mod.ResetViewButton),
  { ssr: false },
);

/** Runs `task` once the main thread is free, or after `timeout` ms at the latest. */
function whenIdle(task: () => void, timeout: number): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(task, 200);
  return () => window.clearTimeout(handle);
}

/** A run from a ?r= link: someone's own, or the lesson's "Show me" walkthrough. */
type Shared = { entry: LessonEntry; replay: Replay; demo: boolean };

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
  const chapter = useViewerStore((state) => state.chapter);
  // A shared run plays in the brain, with no story before it.
  const story = chapter === "story" && shared === null;
  // The lesson panel, the 3D scene and the circuit are megabytes to fetch
  // and seconds to decode, and none of it may hold up the story. The
  // circuit's files start downloading once the story answers taps (this
  // effect runs after hydration) and the page has loaded, in the first idle
  // moment: network only, one file at a time. The work that takes the main
  // thread (three.js, the panel, the decode) waits for the reader's first
  // tap or key, then runs while the rest of the story is read, so the zoom
  // is ready when it ends. Leaving the story wakes it at once.
  const [awake, setAwake] = useState(false);
  useEffect(() => {
    if (awake) return;
    if (!story) {
      setAwake(true);
      return;
    }
    const wake = () => setAwake(true);
    let cancel: (() => void) | null = null;
    const afterLoad = () => {
      cancel = whenIdle(() => prefetchCircuit(entry.module), 2000);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    // A click too: a tap held before hydration comes back as one.
    const events = ["pointerdown", "keydown", "click"] as const;
    for (const name of events) {
      window.addEventListener(name, wake, { once: true, passive: true });
    }
    return () => {
      window.removeEventListener("load", afterLoad);
      cancel?.();
      for (const name of events) window.removeEventListener(name, wake);
    };
  }, [awake, story, entry.module]);

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
      // Telling a walkthrough from someone's own run takes the simulator's
      // clock, which is not in the story's bundle.
      let active = true;
      void import("./demo.js").then(({ isDemo }) => {
        if (active) {
          setShared({ entry: target, replay, demo: isDemo(replay, target) });
        }
      });
      return () => {
        active = false;
      };
    } catch (error) {
      code = error instanceof ReplayError ? error.code : "generic";
    }
    // Drop the broken link so a reload or a share does not carry it on.
    const url = new URL(window.location.href);
    url.searchParams.delete(REPLAY_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    setNotice(t("notice", { problem: t(`errors.${code}`) }));
  }, [entry.id, locale, router, t]);

  /** Takes the played link out of the address, so a reload opens the lesson itself. */
  const dropReplayParam = useCallback(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(REPLAY_PARAM)) return;
    url.searchParams.delete(REPLAY_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  function exitReplay() {
    dropReplayParam();
    setShared(null);
  }

  return (
    <div
      data-mode={classMode ? "class" : undefined}
      className="relative flex h-dvh flex-col overflow-hidden bg-canvas text-fg md:flex-row"
    >
      {story ? (
        <Story
          key={entry.id}
          entry={entry}
          menu={
            <>
              <ClassModeButton />
              {menu}
              <StageLanguageMenu path={entry.path} />
            </>
          }
          onDone={() => useViewerStore.getState().setChapter("journey")}
        />
      ) : null}
      {/* Behind the story the lesson loads, out of reach of taps and tabs. */}
      <div inert={story} className="contents">
        {!awake ? (
          <PanelLoading />
        ) : shared && !shared.demo ? (
          <ReplayRunner
            key={`${shared.entry.id}-replay`}
            entry={shared.entry}
            replay={shared.replay}
            onExit={exitReplay}
            credit={credit}
          />
        ) : (
          // A walkthrough link gets its own runner, which starts on the
          // walkthrough and stays mounted when it hands the lesson over.
          <ModuleRunner
            key={shared ? `${entry.id}-demo` : entry.id}
            entry={entry}
            notice={notice}
            credit={credit}
            autoDemo={shared !== null}
            onDemoEnd={dropReplayParam}
          />
        )}
        <Stage
          entry={entry}
          menu={menu}
          covered={story}
          awake={awake}
          replaying={shared !== null && !shared.demo}
        />
      </div>
    </div>
  );
}

function Stage({
  entry,
  menu,
  covered,
  awake,
  replaying,
}: {
  entry: LessonEntry;
  menu?: ReactNode;
  /** The story is over the stage, and carries the menus itself. */
  covered: boolean;
  /** The circuit may start loading. */
  awake: boolean;
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
  const lesson = useViewerStore((state) => state.chapter === "lesson");
  const speed = useViewerStore((state) => state.speed);
  const stepMode = useViewerStore((state) => state.stepMode);
  const paused = useViewerStore((state) => state.paused);
  const wave = useViewerStore((state) => state.wave);
  const current = useViewerStore((state) => state.current);
  const focusMode = useViewerStore((state) => state.pathway !== null);
  // The pathway sits beside the brain on a wide screen, so the canvas makes
  // room for it rather than drawing under it. Shared runs have no pathway.
  const diagram = lesson && !replaying && status === "ready";

  return (
    <div
      data-stage=""
      data-speed={speed}
      data-step-mode={stepMode ? "on" : "off"}
      data-paused={paused ? "true" : "false"}
      data-wave={wave.join(" ")}
      data-current={current ?? ""}
      data-focus-mode={focusMode ? "pathway" : "step"}
      className="relative order-1 min-h-0 flex-1 bg-zinc-950 md:order-2"
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
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
          {covered ? null : (
            <div className="flex shrink-0 items-start gap-1.5">
              {replaying ? null : <JourneyButton />}
              {replaying ? null : <IntroButton />}
              <ClassModeButton />
              {menu}
              <StageLanguageMenu path={entry.path} />
            </div>
          )}
        </div>
        {/* On a phone the pathway is a strip above the brain. */}
        {diagram ? (
          <div className="md:hidden">
            <PathwayDiagram
              module={module}
              lesson={entry.lesson}
              variant="strip"
            />
          </div>
        ) : null}
      </header>
      <p className="sr-only">{t("stage.canvasHelp")}</p>
      {/* The brain is a real fly's, so it never mirrors for right-to-left languages. */}
      {/* The box follows the page's direction, so the canvas makes room on
          the side the pathway is on; the brain inside it never mirrors. */}
      <div
        className={`absolute inset-0 touch-none ${diagram ? "md:end-[19rem]" : ""}`}
        data-intro="canvas"
      >
        <div dir="ltr" className="relative h-full w-full">
          {awake ? (
            <SceneGuard>
              <Scene
                module={module}
                journeyGroup={entry.lesson.journey.neuron}
              />
            </SceneGuard>
          ) : null}
          {diagram ? <BadgeLayer module={module} /> : null}
        </div>
      </div>
      {diagram ? (
        <aside className="absolute inset-y-0 end-0 z-10 hidden w-[19rem] overflow-y-auto border-s border-white/10 bg-zinc-950 px-4 pt-24 pb-4 md:block">
          <PathwayDiagram
            module={module}
            lesson={entry.lesson}
            variant="side"
          />
        </aside>
      ) : null}
      {/* The color key and the dial are about the circuit, not the fly around it. */}
      {lesson ? <Legend module={module} /> : null}
      {lesson && status === "ready" ? (
        <div
          className={`absolute end-3 bottom-3 z-10 flex flex-col items-end gap-2 md:bottom-4 ${diagram ? "md:end-[20rem]" : "md:end-4"}`}
        >
          <ResetViewButton />
          {module.compass ? (
            <CompassDial
              color={groupColor(module, module.compass.colorGroup)}
            />
          ) : null}
        </div>
      ) : null}
      {status === "loading" && !covered ? (
        // Out of the story before the circuit is in: the zoom and the lesson
        // wait on it, so say how far it has got rather than show a still,
        // empty stage.
        <div
          role="progressbar"
          aria-label={t("stage.loading")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent > 0 ? percent : undefined}
          data-stage-loading=""
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto flex w-[min(20rem,calc(100%-2rem))] -translate-y-1/2 flex-col gap-2 rounded-2xl bg-zinc-900/90 px-4 py-3 text-center text-sm font-semibold text-zinc-100 classroom:w-[min(32rem,calc(100%-2rem))] classroom:text-2xl"
        >
          <span>
            {percent > 0
              ? t("stage.loadingPercent", { percent })
              : t("stage.loading")}
          </span>
          <LoadingBar
            progress={progress}
            className="h-1.5 rounded-full bg-zinc-700 text-zinc-100"
          />
        </div>
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

/**
 * Where the lesson panel goes, while its code loads: the same box as the
 * panel, with a loading bar, so the page does not jump when it arrives.
 */
function PanelLoading() {
  const t = useTranslations("viewer.story");
  return (
    <section
      aria-busy="true"
      aria-label={t("loading")}
      data-panel-loading=""
      className="relative z-10 order-2 flex h-[calc(40dvh+7.5rem)] w-full shrink-0 flex-col gap-3 rounded-t-3xl border-t border-border bg-surface px-4 pt-6 md:order-1 md:h-full md:w-96 md:rounded-none md:border-t-0 md:border-e classroom:md:w-[min(36rem,45vw)]"
    >
      <p className="text-sm font-semibold text-fg-muted classroom:text-xl">
        {t("loading")}
      </p>
      <LoadingBar className="h-1 rounded-full bg-overlay-strong text-fg" />
    </section>
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
      onClick={() => {
        const store = useViewerStore.getState();
        store.setChapter("lesson");
        store.setIntro(true);
      }}
      className={`${STAGE_BUTTON} ${open ? STAGE_BUTTON_ON : STAGE_BUTTON_OFF}`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {"?"}
      </span>
    </button>
  );
}

/** Opens the zoom from the whole fly down to one neuron, at any point of the lesson. */
function JourneyButton() {
  const t = useTranslations("viewer.journey");
  const open = useViewerStore((state) => state.chapter === "journey");
  function toggle() {
    const store = useViewerStore.getState();
    if (open) {
      store.setChapter("lesson");
      return;
    }
    store.setIntro(false);
    store.setLevel(0);
    store.setChapter("journey");
  }
  return (
    <button
      type="button"
      data-journey-open=""
      aria-label={t("open")}
      title={t("open")}
      aria-pressed={open}
      onClick={toggle}
      className={`${STAGE_BUTTON} ${open ? STAGE_BUTTON_ON : STAGE_BUTTON_OFF}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5 fill-none stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="8.5" cy="8.5" r="5" />
        <path d="m12.5 12.5 4.5 4.5M6.5 8.5h4M8.5 6.5v4" />
      </svg>
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
