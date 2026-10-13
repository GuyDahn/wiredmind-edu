"use client";

import { useTranslations } from "next-intl";
import { clampLevel, JOURNEY_LEVELS } from "./journey.js";
import type { LessonEntry } from "./modules.js";
import { FOCUS_RING } from "./panel.js";
import { useViewerStore } from "./store.js";

const ACTION = `min-h-14 rounded-xl px-4 text-lg font-semibold transition-colors classroom:min-h-16 classroom:text-2xl ${FOCUS_RING}`;

/**
 * The zoom journey, in the lesson panel: where you are between the whole fly
 * and one neuron, one line about what you are looking at, and a way to jump
 * straight to any stop.
 */
export function JourneyCard({ entry }: { entry: LessonEntry }) {
  const t = useTranslations("viewer.journey");
  const copy = useTranslations(`lessons.${entry.id}.journey`);
  const level = useViewerStore((state) => clampLevel(state.level));
  const flying = useViewerStore((state) => state.flying);
  const name = JOURNEY_LEVELS[level] ?? "fly";
  const caption =
    name === "circuit" || name === "neuron"
      ? copy(name)
      : t(`captions.${name}`);
  return (
    <section
      aria-label={t("label")}
      data-journey-level={name}
      data-journey-flying={flying ? "true" : "false"}
      className="flex flex-col gap-4 rounded-2xl bg-overlay-strong p-4"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase classroom:text-base">
        {t("label")} ·{" "}
        {t("progress", { number: level + 1, total: JOURNEY_LEVELS.length })}
      </p>
      <ol aria-label={t("levels.label")} className="grid grid-cols-4 gap-1.5">
        {JOURNEY_LEVELS.map((item, index) => {
          const current = index === level;
          return (
            <li key={item} className="min-w-0">
              <button
                type="button"
                data-journey-jump={item}
                aria-current={current ? "step" : undefined}
                onClick={() => useViewerStore.getState().setLevel(index)}
                className={`flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-sm font-semibold classroom:min-h-14 classroom:text-xl ${FOCUS_RING} ${current ? "bg-accent text-accent-fg" : index < level ? "bg-overlay-strong text-fg" : "bg-overlay text-fg-muted hover:bg-overlay-strong"}`}
              >
                <span className="max-w-full truncate">
                  {t(`levels.${item}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p
        aria-live="polite"
        data-journey-caption=""
        className="text-lg leading-snug text-fg classroom:text-3xl"
      >
        {caption}
      </p>
    </section>
  );
}

/** Zoom out and zoom in, where the lesson's own next button will be. */
export function JourneyActions({
  resume,
  onDone,
}: {
  /** The mission is already under way, and this was a look back. */
  resume: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("viewer.journey");
  const level = useViewerStore((state) => clampLevel(state.level));
  const last = level >= JOURNEY_LEVELS.length - 1;
  const move = (step: number) =>
    useViewerStore.getState().setLevel(clampLevel(level + step));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          data-journey-out=""
          disabled={level === 0}
          onClick={() => move(-1)}
          className={`${ACTION} flex-1 border border-border-strong text-fg-muted hover:bg-overlay disabled:opacity-40`}
        >
          {t("out")}
        </button>
        <button
          type="button"
          data-journey-next=""
          onClick={last ? onDone : () => move(1)}
          className={`${ACTION} flex-[2] bg-accent text-accent-fg hover:bg-accent-hover`}
        >
          {last ? (resume ? t("resume") : t("start")) : t("in")}
        </button>
      </div>
      {last ? null : (
        <button
          type="button"
          data-journey-skip=""
          onClick={onDone}
          className={`min-h-11 self-center rounded-lg px-3 text-sm text-fg-subtle underline underline-offset-4 hover:text-fg-muted classroom:text-lg ${FOCUS_RING}`}
        >
          {resume ? t("resume") : t("skip")}
        </button>
      )}
    </div>
  );
}
