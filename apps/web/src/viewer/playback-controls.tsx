"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCircuitCopy } from "./copy.js";
import { usePathwayView } from "./pathway-view.js";
import { SPEEDS, useViewerStore, type Speed } from "./store.js";
import type { ModuleSpec } from "./types.js";
import { FOCUS_RING } from "./ui.js";

/** 1×, 0.5×, 0.25×: how fast the fly's time runs, against the usual slow motion. */
export function SpeedControl() {
  const t = useTranslations("viewer.playback");
  const format = useFormatter();
  const speed = useViewerStore((state) => state.speed);
  return (
    <div className="flex flex-col gap-2">
      <p
        id="speed-label"
        className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase"
      >
        {t("speed")}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="speed-label"
        data-speed-control=""
        className="grid grid-cols-3 gap-1 rounded-xl bg-overlay p-1"
      >
        {SPEEDS.map((value: Speed) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={speed === value}
            data-speed={value}
            onClick={() => useViewerStore.getState().setSpeed(value, true)}
            className={`min-h-11 rounded-lg text-base font-semibold tabular-nums ${FOCUS_RING} ${speed === value ? "bg-fg text-canvas" : "text-fg-muted hover:bg-overlay-strong"}`}
          >
            {t("speedValue", { speed: format.number(value) })}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Step mode: the wave stops after each group fires and waits for "Next". */
export function StepModeToggle() {
  const t = useTranslations("viewer.playback");
  const on = useViewerStore((state) => state.stepMode);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-step-toggle=""
      onClick={() => useViewerStore.getState().setStepMode(!on)}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border border-border-strong px-3 py-2 text-start ${FOCUS_RING}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? "justify-end bg-accent" : "justify-start bg-overlay-strong"}`}
      >
        {/* Flex ends follow the reading direction: on is at the end in RTL too. */}
        <span className="size-5 rounded-full bg-white shadow" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-fg">{t("stepMode")}</span>
        <span className="text-xs text-fg-subtle">{t("stepModeHint")}</span>
      </span>
    </button>
  );
}

/** While step mode holds the wave: which group it stopped on. */
export function PausedNote({ module }: { module: ModuleSpec }) {
  const t = useTranslations("viewer.playback");
  const circuit = useCircuitCopy(module);
  const view = usePathwayView();
  if (!view.paused || !view.current) return null;
  return (
    <p
      data-paused-at={view.current}
      className="text-base font-semibold text-fg classroom:text-2xl"
    >
      {t("pausedAt", {
        number: view.numbers.get(view.current) ?? 0,
        name: circuit.plain(view.current),
      })}
    </p>
  );
}

/** Lets a stopped wave go on to the next group. */
export function resumeWave() {
  useViewerStore.getState().setPaused(false);
}
