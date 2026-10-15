/**
 * The zoom journey: from the whole fly down to one neuron, in four stops.
 * Each stop's name and one-line caption are in messages, under
 * viewer.journey; the last two captions are the lesson's own, under
 * lessons.<lesson>.journey.
 */
export const JOURNEY_LEVELS = ["fly", "brain", "circuit", "neuron"] as const;
export type JourneyLevel = (typeof JOURNEY_LEVELS)[number];

/** Wall time of one camera flight between stops. */
export const FLIGHT_MS = 1400;
/** Wall time the spike takes along the neuron at the last stop. */
export const SPIKE_MS = 1800;

/**
 * What each stop shows. `body` and `shell` are opacities of the fly's body
 * and of the brain and nerve cord outlines; `lines` is whether the neurons
 * are drawn.
 */
export const JOURNEY_LAYERS: Readonly<
  Record<JourneyLevel, { body: number; shell: number; lines: boolean }>
> = {
  fly: { body: 1, shell: 0, lines: false },
  brain: { body: 0.16, shell: 0.6, lines: false },
  circuit: { body: 0, shell: 0.1, lines: true },
  neuron: { body: 0, shell: 0.04, lines: true },
};

export function clampLevel(level: number): number {
  return Math.min(Math.max(Math.round(level), 0), JOURNEY_LEVELS.length - 1);
}

/** Slow out of one stop and slow into the next. */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
