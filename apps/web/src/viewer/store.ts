import { create } from "zustand";
import type { CompassReadout } from "./compass.js";
import type { LoadErrorCode } from "./load-circuit.js";
import type { LessonPathway } from "./lesson.js";
import type { Pathway } from "./pathway.js";

export type ViewerStatus = "loading" | "ready" | "error";

/** The puff that is running now, in fly time. */
export type PuffClock = {
  colorGroup: string;
  elapsedMs: number;
  totalMs: number;
};

/** Parts of the lesson page the intro can outline. Each carries data-intro="<name>". */
export type SpotlightTarget = "canvas" | "legend" | "buttons";

/**
 * Where a lesson page is: the fly's story, the zoom from the fly down to one
 * neuron, or the mission itself.
 */
export type Chapter = "story" | "journey" | "lesson";

/** How fast fly time runs against the current slow motion. 1 is the old pace. */
export type Speed = 1 | 0.5 | 0.25;

export const SPEEDS: readonly Speed[] = [1, 0.5, 0.25];
/** Guided steps run at half the old pace, so the wave can be followed. */
export const GUIDED_SPEED: Speed = 0.5;

/** The puff whose wave is on screen: what was puffed, and what was silenced then. */
export type ActivePathway = Pick<Pathway, "stimulus" | "silenced">;

export type PlaybackState = {
  applied: number;
  total: number;
  /** Every press has landed and the brain has gone quiet. */
  done: boolean;
};

type ViewerState = {
  status: ViewerStatus;
  /** Why the circuit did not load. The stage says it in the reader's language. */
  error: LoadErrorCode | null;
  progress: number;
  stimulating: Record<string, boolean>;
  silenced: Record<string, boolean>;
  activity: Record<string, number>;
  /** Color groups drawn at full brightness. Empty means all of them. */
  focus: string[];
  puff: PuffClock | null;
  playback: PlaybackState | null;
  /** Live heading readout of the loaded circuit, if it has a compass. */
  compass: CompassReadout | null;
  /**
   * Module id of the circuit the scene is running, or null while one loads.
   * Lessons and replays wait for their own circuit before sending commands,
   * so the circuit a learner just left never takes them.
   */
  circuit: string | null;
  /** Class mode, for a projector. Lives in the URL (?mode=class), never in storage. */
  classMode: boolean;
  /** The "How to read this brain" intro is showing. Open whenever a lesson starts. */
  intro: boolean;
  /** The part of the page the intro is pointing at, if any. */
  spotlight: SpotlightTarget | null;
  /** Every lesson opens on its story. Nothing remembers that it was read. */
  chapter: Chapter;
  /** Zoom level of the journey, an index into JOURNEY_LEVELS. */
  level: number;
  /** The journey's camera is between two levels. Never true with reduced motion. */
  flying: boolean;
  /** Free play's speed, kept for the visit only. Guided steps use GUIDED_SPEED. */
  freeSpeed: Speed;
  /** The speed the scene runs at now. */
  speed: Speed;
  /** Step mode: the wave stops after each cell group fires, until "next group". */
  stepMode: boolean;
  /** In step mode, the wave is stopped and waiting for "next group". */
  paused: boolean;
  /** The lesson's pathways, so the scene can number and step through a wave. */
  pathways: readonly LessonPathway[];
  /** The puff whose wave is shown, or null between steps. Its pathway is in focus. */
  pathway: ActivePathway | null;
  /** The puff the current step will send, shown before it is sent. */
  preview: ActivePathway | null;
  /** Groups of the live wave that have fired, in order. */
  wave: string[];
  /** The group the wave is at now: the one that just fired, or the one step mode stopped on. */
  current: string | null;
  /** Bumped to ask the scene to frame the active pathway again. */
  viewRequest: number;
  setStatus: (status: ViewerStatus, error?: LoadErrorCode | null) => void;
  setProgress: (progress: number) => void;
  setStimulating: (colorGroup: string, on: boolean) => void;
  setSilenced: (colorGroup: string, on: boolean) => void;
  setActivity: (activity: Record<string, number>) => void;
  setFocus: (focus: string[]) => void;
  setPuff: (puff: PuffClock | null) => void;
  setPlayback: (playback: PlaybackState | null) => void;
  setCompass: (compass: CompassReadout | null) => void;
  setCircuit: (circuit: string | null) => void;
  setClassMode: (classMode: boolean) => void;
  setIntro: (intro: boolean) => void;
  setSpotlight: (spotlight: SpotlightTarget | null) => void;
  setChapter: (chapter: Chapter) => void;
  setLevel: (level: number) => void;
  setFlying: (flying: boolean) => void;
  setSpeed: (speed: Speed, free?: boolean) => void;
  setStepMode: (stepMode: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPathways: (pathways: readonly LessonPathway[]) => void;
  setPathway: (pathway: ActivePathway | null) => void;
  setPreview: (preview: ActivePathway | null) => void;
  setWave: (wave: string[], current: string | null) => void;
  requestView: () => void;
  resetControls: () => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  status: "loading",
  error: null,
  progress: 0,
  stimulating: {},
  silenced: {},
  activity: {},
  focus: [],
  puff: null,
  playback: null,
  compass: null,
  circuit: null,
  classMode: false,
  // Opens from the "?" button. The story and the zoom come first now.
  intro: false,
  spotlight: null,
  // The story from the first paint, so the server renders it and not a
  // lesson card that the story then covers.
  chapter: "story",
  level: 0,
  flying: false,
  freeSpeed: 1,
  speed: GUIDED_SPEED,
  stepMode: false,
  paused: false,
  pathways: [],
  pathway: null,
  preview: null,
  wave: [],
  current: null,
  viewRequest: 0,
  setStatus: (status, error = null) => set({ status, error }),
  setProgress: (progress) => set({ progress }),
  setStimulating: (colorGroup, on) =>
    set((state) =>
      state.stimulating[colorGroup] === on
        ? state
        : { stimulating: { ...state.stimulating, [colorGroup]: on } },
    ),
  setSilenced: (colorGroup, on) =>
    set((state) =>
      (state.silenced[colorGroup] === true) === on
        ? state
        : { silenced: { ...state.silenced, [colorGroup]: on } },
    ),
  setActivity: (activity) => set({ activity }),
  setFocus: (focus) => set({ focus }),
  setPuff: (puff) => set({ puff }),
  setPlayback: (playback) => set({ playback }),
  setCompass: (compass) => set({ compass }),
  setCircuit: (circuit) => set({ circuit }),
  setClassMode: (classMode) => set({ classMode }),
  setIntro: (intro) => set(intro ? { intro } : { intro, spotlight: null }),
  setSpotlight: (spotlight) => set({ spotlight }),
  setChapter: (chapter) => set({ chapter }),
  setLevel: (level) => set({ level }),
  setFlying: (flying) =>
    set((state) => (state.flying === flying ? state : { flying })),
  setSpeed: (speed, free = false) =>
    set(free ? { speed, freeSpeed: speed } : { speed }),
  setStepMode: (stepMode) =>
    set(stepMode ? { stepMode } : { stepMode, paused: false }),
  setPaused: (paused) => set({ paused }),
  setPathways: (pathways) => set({ pathways }),
  setPathway: (pathway) => set({ pathway }),
  setPreview: (preview) => set({ preview }),
  setWave: (wave, current) => set({ wave, current }),
  requestView: () => set((state) => ({ viewRequest: state.viewRequest + 1 })),
  resetControls: () =>
    set({
      stimulating: {},
      silenced: {},
      activity: {},
      puff: null,
      paused: false,
      pathway: null,
      wave: [],
      current: null,
    }),
}));
