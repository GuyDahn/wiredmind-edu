"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useCircuitCopy } from "./copy.js";
import { useViewerStore } from "./store.js";
import type { ModuleSpec } from "./types.js";

/** From this width the lesson is a side panel and the canvas has room for the key. */
const WIDE = "(min-width: 768px)";

/**
 * The color key, on the canvas: each group's dot, its name in plain words,
 * and its scientific name. Open on a wide screen and folded to one button on
 * a phone, where the canvas is small. Class mode and the intro's color screen
 * hold it open.
 */
export function Legend({ module }: { module: ModuleSpec }) {
  const t = useTranslations("viewer.legend");
  const circuit = useCircuitCopy(module);
  const classMode = useViewerStore((state) => state.classMode);
  const pointedAt = useViewerStore((state) => state.spotlight === "legend");
  // Null until the reader or the screen size has decided: CSS shows the
  // right thing before then, so the server render never jumps.
  const [picked, setPicked] = useState<boolean | null>(null);
  const listId = useId();
  const held = classMode || pointedAt;
  const open = held || picked;

  useEffect(() => {
    setPicked((value) => value ?? window.matchMedia(WIDE).matches);
  }, []);

  return (
    <div
      data-intro="legend"
      className={`absolute start-3 bottom-3 z-10 rounded-xl bg-zinc-950/75 text-zinc-100 backdrop-blur-sm md:start-4 md:bottom-4 ${module.compass ? "max-w-[calc(100%-9.5rem)]" : "max-w-[calc(100%-1.5rem)]"}`}
    >
      <button
        type="button"
        aria-expanded={open === true}
        aria-controls={listId}
        disabled={held}
        onClick={() => setPicked(open !== true)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-start text-xs font-semibold tracking-[0.14em] text-zinc-200 uppercase hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default classroom:md:text-base"
      >
        <span
          aria-hidden="true"
          className="flex -space-x-1 rtl:space-x-reverse"
        >
          {module.groups.map((group) => (
            <span
              key={group.colorGroup}
              className="size-2.5 rounded-full ring-1 ring-zinc-950"
              style={{ backgroundColor: group.color }}
            />
          ))}
        </span>
        <span className="flex-1">{t("title")}</span>
        {held ? null : (
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={`size-3 shrink-0 fill-none stroke-current transition-transform ${open === true ? "" : "rotate-180"} ${open === null ? "max-md:rotate-180 md:rotate-0" : ""}`}
            strokeWidth="1.8"
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" />
          </svg>
        )}
      </button>
      <ul
        id={listId}
        className={`flex-col gap-1.5 px-3 pb-3 text-sm leading-snug classroom:md:gap-2.5 classroom:md:text-xl ${open === null ? "hidden md:flex" : open ? "flex" : "hidden"}`}
      >
        {module.groups.map((group) => (
          <li key={group.colorGroup} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 translate-y-px rounded-full classroom:md:size-3.5"
              style={{ backgroundColor: group.color }}
            />
            <span>
              <span className="font-semibold text-zinc-50">
                {circuit.plain(group.colorGroup)}
              </span>{" "}
              <span className="text-zinc-300">
                · {circuit.name(group.colorGroup)}
              </span>
            </span>
          </li>
        ))}
        <li className="flex items-baseline gap-2 border-t border-white/15 pt-1.5 text-zinc-200">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 translate-y-px rounded-full bg-white shadow-[0_0_6px_2px_rgb(255_255_255/0.85)] classroom:md:size-3.5"
          />
          {t("glow")}
        </li>
      </ul>
    </div>
  );
}
