"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useCircuitCopy } from "./copy.js";
import { INTRO_SCREENS } from "./intro-screens.js";
import { groupColor } from "./module.js";
import { FOCUS_RING } from "./panel.js";
import { useViewerStore, type SpotlightTarget } from "./store.js";
import type { ModuleSpec } from "./types.js";

const ACTION = `min-h-14 rounded-xl px-4 text-lg font-semibold transition-colors classroom:min-h-16 classroom:text-2xl ${FOCUS_RING}`;

/** One intro screen, in the lesson panel, where the lesson card will be. */
export function IntroCard({
  module,
  screen,
}: {
  module: ModuleSpec;
  screen: number;
}) {
  const t = useTranslations("viewer.intro");
  const controls = useTranslations("viewer.controls");
  const circuit = useCircuitCopy(module);
  const current = INTRO_SCREENS[screen] ?? INTRO_SCREENS[0]!;
  const stimulus = module.stimuli[0]?.colorGroup;
  const silence = module.silence[0]?.colorGroup;

  useEffect(() => {
    useViewerStore.getState().setSpotlight(current.target);
  }, [current.target]);

  return (
    <section
      aria-label={t("label")}
      data-intro-screen={current.id}
      className="flex flex-col gap-4 rounded-2xl bg-overlay-strong p-4"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase classroom:text-base">
        {t("label")} ·{" "}
        {t("progress", { number: screen + 1, total: INTRO_SCREENS.length })}
      </p>
      <div aria-live="polite" className="flex flex-col gap-3">
        <h2 className="text-xl leading-snug font-semibold text-fg classroom:text-3xl">
          {t(`screens.${current.id}.title`)}
        </h2>
        <p className="text-lg leading-snug text-fg-muted classroom:text-3xl">
          {t(`screens.${current.id}.text`)}
        </p>
        {current.id === "colors" ? (
          <ul className="flex flex-col gap-1.5 text-base text-fg classroom:text-2xl">
            {module.groups.map((group) => (
              <li key={group.colorGroup} className="flex items-baseline gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span>
                  <span className="font-semibold">
                    {circuit.plain(group.colorGroup)}
                  </span>{" "}
                  <span className="text-fg-subtle">
                    · {circuit.name(group.colorGroup)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {current.id === "buttons" ? (
          // A picture of the two kinds of button, not buttons: the real ones
          // open with step 1.
          <div
            aria-hidden="true"
            data-intro="buttons"
            className="flex flex-wrap gap-2 self-start rounded-xl p-1 text-base font-semibold classroom:text-2xl"
          >
            {stimulus ? (
              <span
                className="rounded-xl px-3 py-2 text-zinc-950"
                style={{ backgroundColor: groupColor(module, stimulus) }}
              >
                {controls("stimulate")}
              </span>
            ) : null}
            {silence ? (
              <span className="flex items-center gap-2 rounded-xl border border-border-strong bg-overlay px-3 py-2 text-fg">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: groupColor(module, silence) }}
                />
                {controls("silence")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <Spotlight target={current.target} />
    </section>
  );
}

/** Skip and Next, where the lesson's own next button will be. */
export function IntroActions({
  screen,
  onNext,
  onClose,
}: {
  screen: number;
  onNext: () => void;
  /** Skip, or Start the lesson from the last screen. */
  onClose: () => void;
}) {
  const t = useTranslations("viewer.intro");
  const last = screen >= INTRO_SCREENS.length - 1;
  return (
    <div className="flex gap-2">
      <button
        type="button"
        data-intro-skip=""
        onClick={onClose}
        className={`${ACTION} flex-1 border border-border-strong text-fg-muted hover:bg-overlay`}
      >
        {t("skip")}
      </button>
      <button
        type="button"
        data-intro-next=""
        onClick={last ? onClose : onNext}
        className={`${ACTION} flex-[2] bg-accent text-accent-fg hover:bg-accent-hover`}
      >
        {last ? t("start") : t("next")}
      </button>
    </div>
  );
}

/** How far the outline sits from its target's edge. The canvas fills the screen's edge, so its outline goes inside. */
const INSET: Record<SpotlightTarget, number> = {
  canvas: 6,
  legend: -5,
  buttons: -3,
};

/** An outline around the part of the page the screen is about. It follows the part as the page moves. */
function Spotlight({ target }: { target: SpotlightTarget }) {
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-intro="${target}"]`);
    if (!el) {
      setBox(null);
      return;
    }
    const read = () => setBox(el.getBoundingClientRect());
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    observer.observe(document.documentElement);
    window.addEventListener("resize", read);
    // Capture, so a scroll inside the lesson panel counts too.
    window.addEventListener("scroll", read, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
      window.removeEventListener("scroll", read, true);
    };
  }, [target]);

  if (!box || box.width === 0) return null;
  const inset = INSET[target];
  return (
    <div
      aria-hidden="true"
      data-spotlight={target}
      className="pointer-events-none fixed z-30 rounded-2xl border-4 border-amber-300 shadow-[0_0_0_2px_rgb(0_0_0/0.55),0_0_22px_4px_rgb(252_211_77/0.55)] motion-safe:animate-pulse"
      style={{
        top: box.top + inset,
        left: box.left + inset,
        width: box.width - inset * 2,
        height: box.height - inset * 2,
      }}
    />
  );
}
