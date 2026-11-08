/**
 * The way a signal travels through a lesson's circuit: which cell groups fire
 * after a puff, and in what order. Each lesson lists the order its own
 * simulation produces (tests hold the list to the simulation), and the viewer
 * follows the live run with a WaveTracker, so the numbers on screen are the
 * order the cells really fired in.
 */

/**
 * A group has fired once this share of its cells has spiked since the puff
 * began: 1 in 20. A single stray spike in a big group does not count, and a
 * two-cell group counts as soon as one of its cells fires.
 */
export const WAVE_SHARE = 0.05;

/** Where a group sits on the way through: where the signal comes in, is worked on, leaves, or loops back. */
export type PathwayRole = "input" | "processing" | "output" | "feedback";

export const PATHWAY_ROLES: readonly PathwayRole[] = [
  "input",
  "processing",
  "output",
  "feedback",
];

/** The order one puff fires the circuit in, with some groups silenced. */
export type Pathway = {
  stimulus: string;
  /** Groups silenced when the puff is sent, sorted. */
  silenced: string[];
  /** Groups in the order they fire. The first is the stimulus. */
  order: string[];
};

/** The pathway a lesson lists for this puff, or null if it lists none. */
export function pathwayFor<T extends Pathway>(
  pathways: readonly T[],
  stimulus: string,
  silenced: readonly string[],
): T | null {
  const key = [...silenced].sort().join(",");
  return (
    pathways.find(
      (item) => item.stimulus === stimulus && item.silenced.join(",") === key,
    ) ?? null
  );
}

/**
 * Follows one puff's wave: which groups have fired, in order. Feed it the
 * spikes of each tick (or a running union of them) and it reports each group
 * once, as it crosses WAVE_SHARE.
 */
export class WaveTracker {
  readonly order: string[] = [];
  private readonly seen: Uint8Array;
  private readonly counts = new Map<string, number>();

  constructor(
    private readonly groups: ReadonlyMap<string, Uint32Array>,
    neuronCount: number,
  ) {
    this.seen = new Uint8Array(neuronCount);
  }

  /** Forgets the last wave, for a new puff or a cleared brain. */
  reset() {
    this.order.length = 0;
    this.seen.fill(0);
    this.counts.clear();
  }

  /** Takes in a tick's spikes. Returns the groups that fired for the first time. */
  observe(spikes: Uint8Array): string[] {
    const joined: string[] = [];
    for (const [name, ids] of this.groups) {
      if (ids.length === 0 || this.order.includes(name)) continue;
      let count = this.counts.get(name) ?? 0;
      for (let index = 0; index < ids.length; index++) {
        const id = ids[index] ?? 0;
        if (!spikes[id] || this.seen[id]) continue;
        this.seen[id] = 1;
        count += 1;
      }
      this.counts.set(name, count);
      if (count >= Math.max(1, Math.ceil(ids.length * WAVE_SHARE))) {
        joined.push(name);
      }
    }
    // Groups that cross on the same tick go in the order the module lists them.
    this.order.push(...joined);
    return joined;
  }
}

/**
 * The number each group wears: its place in the pathway the lesson lists,
 * or, for a puff it lists none for, its place in the live wave.
 */
export function pathwayNumbers(
  listed: readonly string[] | null,
  wave: readonly string[],
): Map<string, number> {
  return new Map((listed ?? wave).map((name, index) => [name, index + 1]));
}
