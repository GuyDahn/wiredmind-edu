"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { badgeRef } from "./badges.js";
import { useCircuitCopy, useLessonCopy } from "./copy.js";
import type { LessonModule } from "./lesson.js";
import { groupColor } from "./module.js";
import { pathwayFor, pathwayNumbers } from "./pathway.js";
import { useViewerStore } from "./store.js";
import type { ModuleSpec } from "./types.js";

/**
 * What the pathway views show: the puff on screen (or the one the step is
 * about to send), the order its groups fire in, and how far the wave has got.
 */
export function usePathwayView() {
  const pathway = useViewerStore((state) => state.pathway);
  const preview = useViewerStore((state) => state.preview);
  const pathways = useViewerStore((state) => state.pathways);
  const wave = useViewerStore((state) => state.wave);
  const current = useViewerStore((state) => state.current);
  const paused = useViewerStore((state) => state.paused);
  const running = useViewerStore((state) =>
    Object.values(state.stimulating).some(Boolean),
  );
  return useMemo(() => {
    const shown = pathway ?? preview;
    const live = pathway !== null;
    const listed = shown
      ? pathwayFor(pathways, shown.stimulus, shown.silenced)
      : null;
    const order =
      listed?.order ?? (live ? wave : shown ? [shown.stimulus] : []);
    return {
      shown,
      live,
      listed,
      order,
      numbers: pathwayNumbers(listed?.order ?? null, live ? wave : order),
      fired: new Set(live ? wave : []),
      current: live ? current : null,
      paused,
      /** The wave has run its course and the brain is still. */
      over: live && wave.length > 0 && !running && !paused,
    };
  }, [pathway, preview, pathways, wave, current, paused, running]);
}

export type PathwayView = ReturnType<typeof usePathwayView>;

type StepState = "current" | "fired" | "waiting";

function stepState(view: PathwayView, group: string): StepState {
  if (view.current === group) return "current";
  return view.fired.has(group) ? "fired" : "waiting";
}

/** A group's number in its color, as the brain and the color key show it. */
export function NumberDot({
  number,
  color,
  state = "fired",
  className = "size-7 text-sm",
}: {
  number: number;
  color: string;
  state?: StepState;
  className?: string;
}) {
  const waiting = state === "waiting";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${className} ${waiting ? "border-2 bg-zinc-950 text-zinc-100" : "text-zinc-950"} ${state === "current" ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : ""}`}
      style={waiting ? { borderColor: color } : { backgroundColor: color }}
    >
      {number}
    </span>
  );
}

/**
 * The pathway in two dimensions: where the signal comes in, each group it
 * fires in order with one plain sentence, and where the lesson stops
 * simulating. Beside the brain on a wide screen; a strip above it on a phone,
 * with the sentence for the group the wave is at.
 */
export function PathwayDiagram({
  module,
  lesson,
  variant,
}: {
  module: ModuleSpec;
  lesson: LessonModule;
  variant: "side" | "strip";
}) {
  const t = useTranslations("viewer.pathway");
  const circuit = useCircuitCopy(module);
  const copy = useLessonCopy(lesson);
  const view = usePathwayView();
  if (!view.shown) return null;
  const { stimulus, silenced } = view.shown;
  const sentence = (group: string) =>
    copy.plain(`pathway.${stimulus}.${group}`);
  const role = (index: number) => {
    const name = view.listed?.roles[index];
    return name ? t(`roles.${name}`) : null;
  };
  const steps = view.order.map((group, index) => ({
    group,
    number: view.numbers.get(group) ?? index + 1,
    state: stepState(view, group),
    role: role(index),
  }));
  const common = {
    "aria-label": t("title"),
    "data-pathway-diagram": variant,
    "data-pathway-current": view.current ?? "",
    "data-pathway-stimulus": stimulus,
  };

  if (variant === "strip") {
    const at = steps.find((step) => step.state === "current");
    const note = at
      ? sentence(at.group)
      : view.over
        ? copy.plain("pathway.after")
        : copy.plain("pathway.before");
    return (
      <section
        {...common}
        className="pointer-events-auto flex flex-col gap-1.5 rounded-xl bg-zinc-950/80 px-2.5 py-2 text-zinc-100 backdrop-blur-sm"
      >
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
          {steps.map((step, index) => (
            <li
              key={step.group}
              data-pathway-step={step.group}
              data-state={step.state}
              aria-current={step.state === "current" ? "step" : undefined}
              className="flex items-center gap-1"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="text-zinc-400 rtl:-scale-x-100"
                >
                  {"→"}
                </span>
              ) : null}
              <span
                className={`flex items-center gap-1.5 rounded-full py-0.5 ps-0.5 pe-2 text-xs ${step.state === "current" ? "bg-white/15 font-semibold text-white" : step.state === "fired" ? "text-zinc-100" : "text-zinc-400"}`}
              >
                <NumberDot
                  number={step.number}
                  color={groupColor(module, step.group)}
                  state={step.state}
                  className="size-6 text-xs"
                />
                {circuit.plain(step.group)}
              </span>
            </li>
          ))}
        </ol>
        <p aria-live="polite" className="text-xs leading-snug text-zinc-200">
          {note}
        </p>
      </section>
    );
  }

  return (
    <section
      {...common}
      className="flex flex-col gap-3 text-zinc-100"
      data-tap-target="text"
    >
      <h2 className="text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase classroom:text-base">
        {t("title")}
      </h2>
      <ol className="flex flex-col gap-2 text-sm leading-snug classroom:text-lg">
        <Limit text={copy.plain("pathway.before")} label={t("notSimulated")} />
        {steps.map((step) => (
          <li
            key={step.group}
            data-pathway-step={step.group}
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
            className={`flex gap-2.5 rounded-xl border p-2.5 transition-colors ${step.state === "current" ? "border-white bg-white/10" : step.state === "fired" ? "border-white/25" : "border-white/10 text-zinc-400"}`}
          >
            <NumberDot
              number={step.number}
              color={groupColor(module, step.group)}
              state={step.state}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-zinc-50">
                  {circuit.plain(step.group)}
                </span>
                {step.role ? (
                  <span className="text-[0.7rem] font-semibold tracking-[0.12em] text-zinc-400 uppercase classroom:text-sm">
                    {step.role}
                  </span>
                ) : null}
              </span>
              <span className={step.state === "waiting" ? "" : "text-zinc-200"}>
                {sentence(step.group)}
              </span>
            </span>
          </li>
        ))}
        {silenced.map((group) => (
          <li
            key={group}
            data-pathway-silenced={group}
            className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/20 p-2.5 text-zinc-400"
          >
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full opacity-60"
              style={{ backgroundColor: groupColor(module, group) }}
            />
            <span className="line-through">{circuit.plain(group)}</span>
            <span className="text-xs">{t("silenced")}</span>
          </li>
        ))}
        <Limit text={copy.plain("pathway.after")} label={t("notSimulated")} />
      </ol>
    </section>
  );
}

/** Where the simulation stops: said in words, never animated. */
function Limit({ text, label }: { text: string; label: string }) {
  return (
    <li
      data-pathway-limit=""
      className="flex flex-col gap-0.5 rounded-xl border border-dashed border-white/25 p-2.5 text-zinc-300"
    >
      <span className="text-[0.7rem] font-semibold tracking-[0.12em] text-amber-200 uppercase classroom:text-sm">
        {label}
      </span>
      {text}
    </li>
  );
}

/**
 * Each group's number, on the canvas next to the group, and the light's
 * label. The scene moves them; this only says what they read.
 */
export function BadgeLayer({ module }: { module: ModuleSpec }) {
  const t = useTranslations("viewer.pathway");
  const circuit = useCircuitCopy(module);
  const view = usePathwayView();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {[...view.numbers].map(([group, number]) => {
        const state = stepState(view, group);
        return (
          <div
            key={group}
            ref={badgeRef(group)}
            data-badge={group}
            data-number={number}
            data-state={state}
            title={circuit.plain(group)}
            style={{ visibility: "hidden" }}
            className="absolute top-0 left-0 flex items-center gap-1 will-change-transform"
          >
            <NumberDot
              number={number}
              color={groupColor(module, group)}
              state={state}
              className={`size-8 text-base shadow-[0_0_0_3px_rgb(9_9_11/0.7)] ${state === "current" ? "motion-safe:animate-pulse" : ""}`}
            />
          </div>
        );
      })}
      {module.light ? (
        <>
          {/* Each label hangs off its point, so the light and its ray show. */}
          <div
            ref={badgeRef("light")}
            data-light-label=""
            style={{ visibility: "hidden" }}
            className="absolute top-0 left-0 size-0"
          >
            <span className="absolute bottom-3 left-1/2 w-max max-w-40 -translate-x-1/2 rounded-lg bg-zinc-950/80 px-2 py-1 text-center text-xs leading-tight font-semibold text-amber-100">
              {t("light")}
            </span>
          </div>
          <div
            ref={badgeRef("eye")}
            style={{ visibility: "hidden" }}
            className="absolute top-0 left-0 size-0"
          >
            <span className="absolute top-2 left-1/2 w-max -translate-x-1/2 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[0.7rem] text-zinc-200">
              {t("eye")}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Brings the active pathway back into view, from the usual side. */
export function ResetViewButton() {
  const t = useTranslations("viewer.pathway");
  return (
    <button
      type="button"
      data-reset-view=""
      aria-label={t("resetView")}
      title={t("resetView")}
      onClick={() => useViewerStore.getState().requestView()}
      className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-zinc-950/70 px-2.5 text-sm font-semibold text-zinc-100 backdrop-blur-sm hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5 fill-none stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
        <circle cx="10" cy="10" r="2.5" />
      </svg>
      <span className="hidden lg:inline">{t("resetView")}</span>
    </button>
  );
}
