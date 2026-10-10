import type { SpotlightTarget } from "./store.js";

/**
 * "How to read this brain": what a first-time reader needs before step 1,
 * one idea per screen, each pointing at the part of the page it is about.
 * Their words are in messages, under viewer.intro.screens.<id>.
 */
export const INTRO_SCREENS: readonly { id: string; target: SpotlightTarget }[] =
  [
    { id: "lines", target: "canvas" },
    { id: "colors", target: "legend" },
    { id: "buttons", target: "buttons" },
    { id: "time", target: "canvas" },
  ];

/** Longest an intro screen may run, so it reads in one glance at a projector. */
export const MAX_INTRO_WORDS = 30;
