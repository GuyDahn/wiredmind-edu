"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LessonEntry } from "./modules.js";
import { FOCUS_RING } from "./panel.js";

/** Pictures are drawn at this size. See docs/art-brief.md. */
const ART = { width: 800, height: 600 };
const BUTTON = `min-h-12 rounded-xl px-5 text-base font-semibold transition-colors classroom:min-h-16 classroom:text-2xl ${FOCUS_RING}`;

/** Where a panel's picture lives. New art replaces the file and keeps the name. */
export function storyArt(lessonId: string, panel: string): string {
  return `/art/story/${lessonId}-${panel}.svg`;
}

/** The picture every story's last screen shares: the fly, looking at the reader. */
export const BRIDGE_ART = "/art/story/bridge.svg";

/** Every picture a lesson's story shows, the win screen's ending included. */
export function storyPictures(entry: LessonEntry): string[] {
  return [
    ...entry.lesson.story.panels.map((panel) => storyArt(entry.id, panel)),
    BRIDGE_ART,
    storyArt(entry.id, "ending"),
  ];
}

/**
 * Fetches the rest of the story while the first panel is being read, so a
 * tap on Next shows the next picture at once instead of waiting a round trip
 * for it. It starts once the page itself has loaded, so it never competes
 * with the first panel.
 */
function usePreloadedStory(entry: LessonEntry) {
  useEffect(() => {
    const held: HTMLImageElement[] = [];
    const preload = () => {
      for (const src of storyPictures(entry)) {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        held.push(image);
      }
    };
    if (document.readyState === "complete") preload();
    else window.addEventListener("load", preload, { once: true });
    return () => window.removeEventListener("load", preload);
  }, [entry]);
}

/**
 * One comic panel: the picture, what the fly says in a speech bubble over
 * it, and the line of story under it. The words are text, not part of the
 * picture, so they translate and a screen reader gets them.
 */
export function StoryPanel({
  art,
  caption,
  bubble,
  name,
  eager = false,
}: {
  art: string;
  caption: string;
  bubble?: string;
  /** The fly's name, said before the bubble for screen readers. */
  name: string;
  eager?: boolean;
}) {
  const t = useTranslations("viewer.story");
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#1f2937] bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element -- a placeholder SVG the size it is drawn at; nothing for the image optimizer to do */}
        <img
          src={art}
          alt=""
          width={ART.width}
          height={ART.height}
          loading="eager"
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className="block h-auto w-full"
        />
        {bubble ? (
          <p
            data-story-bubble=""
            className="absolute start-3 top-3 max-w-[72%] rounded-2xl rounded-es-sm border-2 border-[#1f2937] bg-white px-3 py-1.5 text-base leading-snug font-semibold text-[#111827] shadow-sm sm:text-lg classroom:text-3xl"
          >
            <span className="sr-only">{t("says", { name })} </span>
            {bubble}
          </p>
        ) : null}
      </div>
      <figcaption
        data-story-caption=""
        className="text-lg leading-snug text-pretty text-fg sm:text-xl classroom:text-3xl"
      >
        {caption}
      </figcaption>
    </figure>
  );
}

/**
 * The fly's story, before the brain: a few panels, one at a time, then the
 * sentence that leads into the zoom. It covers the lesson while the circuit
 * loads behind it. Skip is always one tap away.
 */
export function Story({
  entry,
  menu,
  onDone,
}: {
  entry: LessonEntry;
  /** Class mode and the site and language menus, which the story covers on the stage. */
  menu?: ReactNode;
  /** The story is over, or was skipped. */
  onDone: () => void;
}) {
  const t = useTranslations("viewer.story");
  const mission = useTranslations("viewer.mission");
  const copy = useTranslations(`lessons.${entry.id}`);
  const name = useTranslations("character")("name");
  const panels = entry.lesson.story.panels;
  const [at, setAt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  usePreloadedStory(entry);
  const bridge = at >= panels.length;
  const panel = panels[at];

  // Each new panel is read out from its top.
  useEffect(() => {
    if (at > 0) heading.current?.focus();
  }, [at]);

  return (
    <div
      data-story={bridge ? "bridge" : panel}
      className="absolute inset-0 z-40 overflow-y-auto bg-canvas"
    >
      <section
        aria-label={t("label")}
        className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] classroom:max-w-4xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase classroom:text-lg">
              {mission("label", { number: entry.number })} · {t("label")}
            </p>
            {/* An h2: the lesson's own h1 is under the overlay, and a page
                has one main heading. */}
            <h2
              ref={heading}
              tabIndex={-1}
              className="text-xl font-semibold tracking-tight text-fg outline-none sm:text-2xl classroom:text-4xl"
            >
              {copy("title")}
            </h2>
          </div>
          <div className="flex shrink-0 items-start gap-1.5">
            <button
              type="button"
              data-story-skip=""
              onClick={onDone}
              className={`min-h-11 rounded-xl border border-border-strong px-3.5 text-sm font-semibold text-fg-muted hover:bg-overlay classroom:text-xl ${FOCUS_RING}`}
            >
              {t("skip")}
            </button>
            {menu}
          </div>
        </header>
        <div aria-live="polite" className="flex flex-1 flex-col justify-center">
          {bridge || !panel ? (
            <StoryPanel
              art={BRIDGE_ART}
              caption={t("bridge", { name })}
              name={name}
            />
          ) : (
            <StoryPanel
              key={panel}
              art={storyArt(entry.id, panel)}
              caption={copy(`story.panels.${panel}.caption`, { name })}
              bubble={copy(`story.panels.${panel}.bubble`, { name })}
              name={name}
              eager={at === 0}
            />
          )}
        </div>
        <footer className="flex flex-col gap-3">
          <p
            role="img"
            className="flex items-center justify-center gap-1.5"
            aria-label={t("progress", {
              number: at + 1,
              total: panels.length + 1,
            })}
          >
            {Array.from({ length: panels.length + 1 }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1.5 w-6 rounded-full ${index === at ? "bg-fg" : index < at ? "bg-fg-subtle" : "bg-overlay-strong"}`}
              />
            ))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-story-back=""
              disabled={at === 0}
              onClick={() => setAt((value) => Math.max(0, value - 1))}
              className={`${BUTTON} flex-1 border border-border-strong text-fg-muted hover:bg-overlay disabled:opacity-40`}
            >
              {t("back")}
            </button>
            <button
              type="button"
              data-story-next=""
              onClick={bridge ? onDone : () => setAt((value) => value + 1)}
              className={`${BUTTON} flex-[2] bg-accent text-accent-fg hover:bg-accent-hover`}
            >
              {bridge ? t("zoom") : t("next")}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
