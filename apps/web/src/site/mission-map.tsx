"use client";

import Link from "next/link";
import { useProgress } from "../viewer/progress.js";

export type MissionStop = {
  id: string;
  /** "Mission 1" */
  label: string;
  title: string;
  href: string;
};

/**
 * The three missions as stops on one line, each marked once it is finished.
 * What is finished is held in memory for this visit only (see progress.ts),
 * so the map starts empty on every load and the note under it says so.
 */
export function MissionMap({
  stops,
  copy,
}: {
  stops: MissionStop[];
  copy: { label: string; done: string; todo: string; note: string };
}) {
  const done = useProgress((state) => state.done);
  return (
    <nav aria-label={copy.label} data-mission-map="" className="mt-8">
      <ol className="grid grid-cols-3">
        {stops.map((stop, index) => {
          const finished = done[stop.id] === true;
          return (
            <li
              key={stop.id}
              data-mission={stop.id}
              data-done={finished ? "true" : "false"}
              className="relative flex min-w-0 flex-col items-center gap-2 px-1 text-center"
            >
              {/* The line to the next stop, drawn from this one's middle. */}
              {index < stops.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute start-1/2 top-5 h-0.5 w-full ${finished ? "bg-emerald-500" : "bg-border-strong"}`}
                />
              ) : null}
              <Link
                href={stop.href}
                className="relative flex min-h-11 flex-col items-center gap-2 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-10 items-center justify-center rounded-full border-2 text-base font-semibold ${finished ? "border-emerald-500 bg-emerald-500 text-white" : "border-border-strong bg-canvas text-fg"}`}
                >
                  {finished ? (
                    <svg
                      viewBox="0 0 16 16"
                      className="size-4 fill-none stroke-current"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-xs font-semibold tracking-[0.1em] text-fg-subtle uppercase">
                  {stop.label}
                </span>
                <span className="text-sm leading-snug font-semibold text-balance text-fg">
                  {stop.title}
                </span>
              </Link>
              <span className="text-xs text-fg-subtle">
                {finished ? copy.done : copy.todo}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-xs text-fg-subtle">{copy.note}</p>
    </nav>
  );
}
