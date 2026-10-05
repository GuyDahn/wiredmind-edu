/**
 * Every scientific term a lesson can explain. Lesson copy wraps a term in a
 * tag named after its id, e.g. `<kenyon>Kenyon cells</kenyon>`, and its name
 * and one-sentence explanation are in messages, under terms.<id>. A tag
 * rather than the words themselves, so each language can inflect the term
 * and still open the right explanation.
 *
 * Lowercase letters only: the message checks read tags as `<[a-z]+>`.
 */
export const TERM_IDS = [
  "antenna",
  "receptor",
  "antennallobe",
  "projection",
  "mushroombody",
  "kenyon",
  "output",
  "turn",
  "compass",
  "ring",
  "looming",
  "giantfiber",
  "nervecord",
  "jump",
  // Terms a teacher needs but no lesson step tags: the guides and the
  // teachers page list them.
  "neuron",
  "spike",
  "synapse",
  "transmitter",
  "excitation",
  "inhibition",
  "acetylcholine",
  "gaba",
  "circuit",
  "connectome",
  "stimulate",
  "silence",
  "sensory",
  "motor",
  "reflex",
  "electricalsynapse",
  "bump",
  "landmark",
  "bridge",
] as const;

export type TermId = (typeof TERM_IDS)[number];

export function isTermId(value: string): value is TermId {
  return (TERM_IDS as readonly string[]).includes(value);
}

/** The terms each lesson's teacher guide lists, in the order the lesson meets them. */
export const LESSON_TERMS: Readonly<Record<string, readonly TermId[]>> = {
  "smell-memory": [
    "antenna",
    "receptor",
    "antennallobe",
    "projection",
    "mushroombody",
    "kenyon",
    "output",
  ],
  compass: ["turn", "compass", "bump", "ring", "landmark", "bridge"],
  escape: [
    "looming",
    "giantfiber",
    "nervecord",
    "jump",
    "reflex",
    "sensory",
    "motor",
    "electricalsynapse",
  ],
};

/** The neuroscience every lesson leans on, in the order a class would meet it. */
export const GENERAL_TERMS: readonly TermId[] = [
  "neuron",
  "spike",
  "synapse",
  "transmitter",
  "excitation",
  "inhibition",
  "acetylcholine",
  "gaba",
  "circuit",
  "connectome",
  "stimulate",
  "silence",
];
