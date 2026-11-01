# Fly ↔ mammal and bird comparisons — DRAFT FOR REVIEW

> **טיוטה לבדיקה.** המסמך הזה לא מוצג באתר. הוא מיועד למורות הקורס ולחוקר/ת מדעי המוח, כדי לבדוק אותו לפני שכרטיסי ההשוואה ("מה קורה אצל יונקים ועופות שדומה לזבוב?") נפתחים לתלמידים.

**Status:** draft, not reviewed. Nothing here is shown on the site. The comparison cards at the end of each lesson are built but hidden behind `NEXT_PUBLIC_SHOW_COMPARISONS` (off by default), and their text in `apps/web/content/comparisons/<lesson>.json` is still a placeholder marked `reviewed: false`.

**How to review:** each claim below is deliberately cautious and has one source. Please check (1) that the claim is true and not overstated for students aged 15–17, (2) that the source says what we say it says (citations were written from memory and must be verified against the papers), and (3) whether a better or more recent source should replace it. Mark each claim ✅ keep, ✏️ reword, or ❌ drop. Once approved, the text goes into the JSON files and `reviewed` becomes `true`.

**Ground rules we tried to follow:** say "similar job" rather than "same circuit"; never imply the fly circuit is an ancestor of the mammal or bird one; say plainly where the comparison breaks down; and keep to what the lesson's simulation actually shows (see "What the fly lesson really simulates" under each lesson).

---

## Lesson 1 — smell (smell receptors → projection neurons → Kenyon cells → output neurons)

**What the fly lesson really simulates:** all smell receptor neurons are switched on together; the signal passes to projection neurons, then Kenyon cells, then mushroom body output neurons. No learning (synapse change) is simulated, and the circuit stops at the output neurons.

| # | Draft claim (for students) | Source to verify |
|---|---|---|
| 1.1 | In mice, as in flies, smell receptor neurons that carry the same receptor send their axons to the same small knot of synapses (a glomerulus). | Mombaerts P. et al. (1996). Visualizing an olfactory sensory map. *Cell* 87:675–686. (Fly: Vosshall L.B., Wong A.M., Axel R. (2000). An olfactory sensory map in the fly brain. *Cell* 102:147–159.) |
| 1.2 | This "receptor → glomerulus" layout is found in many animals, including insects and mammals, which is why scientists study it in flies. | Ache B.W., Young J.M. (2005). Olfaction: diverse species, conserved principles. *Neuron* 48:417–430. |
| 1.3 | In the fly, each Kenyon cell collects input from a seemingly random handful of projection neurons. In the mouse piriform cortex (a smell area), each odor activates a scattered set of neurons with no obvious map. Both look like ways of turning a smell into a pattern. | Caron S.J.C. et al. (2013). Random convergence of olfactory inputs in the *Drosophila* mushroom body. *Nature* 497:113–117. Stettler D.D., Axel R. (2009). Representations of odor in the piriform cortex. *Neuron* 63:854–864. |
| 1.4 | In the fly, learning that a smell means sugar or danger changes the strength of the links from Kenyon cells to output neurons. *(Not simulated in the lesson.)* | Hige T. et al. (2015). Heterosynaptic plasticity underlies aversive olfactory learning in *Drosophila*. *Neuron* 88:985–998. |
| 1.5 | **Where it breaks down:** the mushroom body is an insect structure; mammals and birds have no mushroom body, and their smell memories involve several brain areas. | Same as 1.2 — reviewer, please suggest a better source. |
| 1.6 | **Birds:** we did not find a source we are confident in for a short, student-level bird comparison. Reviewer, please advise or drop. | — |

---

## Lesson 2 — compass (turning cells → compass cells → ring neurons)

**What the fly lesson really simulates:** the left or right turning cells (P-EN2) are switched on directly; the compass cells (E-PG) fire and the bump moves; the ring neurons fire *after* the compass cells, fed from inside the circuit. **No light or eye input is simulated,** and the circuit stops at the compass cells (nothing reaches the motor neurons).

| # | Draft claim (for students) | Source to verify |
|---|---|---|
| 2.1 | Rats have "head-direction cells": each fires most when the head points one particular way, like a needle on a compass. | Taube J.S., Muller R.U., Ranck J.B. Jr. (1990). Head-direction cells recorded from the postsubiculum in freely moving rats. I. *J. Neurosci.* 10:420–435. |
| 2.2 | In rats, rotating a large visual landmark (a card on the wall) rotates the head-direction cells' preferred directions with it: landmarks anchor the compass. | Taube J.S., Muller R.U., Ranck J.B. Jr. (1990). … II. Effects of environmental manipulations. *J. Neurosci.* 10:436–447. |
| 2.3 | The fly's compass cells (E-PG) carry a single "bump" of activity that moves as the fly turns and is anchored to what the fly sees. | Seelig J.D., Jayaraman V. (2015). Neural dynamics for landmark orientation and angular path integration. *Nature* 521:186–191. |
| 2.4 | In the fly, turning cells (P-EN) push the bump around the ring when the fly turns. | Green J. et al. (2017). A neural circuit architecture for angular integration in *Drosophila*. *Nature* 546:101–106. Turner-Evans D. et al. (2017). Angular velocity integration in a fly heading circuit. *eLife* 6:e23496. |
| 2.5 | In the fly, ring neurons bring visual information to the compass, and what the fly sees can re-tune how that input maps onto heading. *(The lesson does not simulate this input.)* | Fisher Y.E. et al. (2019). Sensorimotor experience remaps visual input to a heading-direction network. *Nature* 576:121–125. Kim S.S. et al. (2019). Generation of stable heading representations in diverse visual scenes. *Nature* 576:126–131. |
| 2.6 | Birds (quails) also have head-direction cells, in their hippocampal formation. | Ben-Yishay E. et al. (2021). Directional tuning in the hippocampal formation of birds. *Curr. Biol.* 31:2592–2602. |
| 2.7 | **Where it breaks down:** the fly's compass sits in the central complex, a structure mammals and birds do not have. The similarity is in the job (keeping track of heading using turning and landmarks), not in the anatomy. | Kim S.S., Rouault H., Druckmann S., Jayaraman V. (2017). Ring attractor dynamics in the *Drosophila* central brain. *Science* 356:849–853 (for the fly side). Reviewer, please suggest a review that compares species. |

---

## Lesson 3 — escape (looming detectors → giant fiber → jump motor neurons)

**What the fly lesson really simulates:** the looming detector cells (LC4, LPLC2) are switched on directly (no shadow or eye is simulated); the giant fiber fires about 4 ms later and the jump motor neurons about 13 ms after the start. The legs and the jump itself are not simulated.

| # | Draft claim (for students) | Source to verify |
|---|---|---|
| 3.1 | In the fly, the giant fiber drives a very fast escape take-off, and its spike timing helps decide between a fast and a slower, more controlled take-off. | von Reyn C.R. et al. (2014). A spike-timing mechanism for action selection. *Nat. Neurosci.* 17:962–970. |
| 3.2 | Mice also react to a dark shape growing overhead (a "looming" stimulus), usually by freezing or running to shelter within a fraction of a second. | Yilmaz M., Meister M. (2013). Rapid innate defensive responses of mice to looming visual stimuli. *Curr. Biol.* 23:2011–2015. |
| 3.3 | In mice, a pathway from the superior colliculus (a visual area in the midbrain) can trigger these defensive responses. | Shang C. et al. (2015). A parvalbumin-positive excitatory visual pathway to trigger fear responses in mice. *Science* 348:1472–1477. |
| 3.4 | In pigeons, some visual neurons respond to objects on a collision course and signal how soon they will hit. | Sun H., Frost B.J. (1998). Computation of different optical variables of looming objects in pigeon nucleus rotundus neurons. *Nat. Neurosci.* 1:296–303. |
| 3.5 | **Where it breaks down:** mammals and birds have no single "giant fiber" like the fly's; their escape responses run through many neurons and brain areas. | Reviewer, please suggest a source or reword. |

---

## Draft comparison questions (behind the same flag)

These would appear on the end screen and the printed worksheet only when the flag is on, and only after review.

1. *(Smell)* Flies and mice both sort smells in glomeruli. Why might a "one receptor type → one glomerulus" layout be useful? (Claims 1.1–1.2)
2. *(Compass)* A rat's head-direction cells and a fly's compass cells both rotate with a landmark. What would you expect to happen to each if the room went dark? (Claims 2.2–2.3; reviewer: please check the expected answer.)
3. *(Escape)* A fly, a mouse and a pigeon all respond to looming shapes. What does a looming shape usually mean for an animal, and why does speed matter? (Claims 3.1–3.4)

---

## Places the lessons claim more than the simulation does

Found while deriving each lesson's firing order from the circuit data (`pnpm test`, `tests/pathway.test.ts`). The new pathway diagram says each of these in plain words; the existing step text was not changed and may need a teacher's review.

- **Lesson 1:** "send a smell in" — the simulation switches on *all* smell receptor types at once, not one smell. "The blue cells turn each smell into its own pattern" and "the fly can read its smell memory again" — no second smell and no learning are simulated. The olfactory circuit keeps firing after the puff ends; the viewer freezes it 150 ms later, so a later puff can start with output neurons still active.
- **Lesson 2:** "They bring in what the fly sees" / "Without landmarks, the compass drifts" — no visual input is simulated; the ring neurons fire *after* the compass cells, fed from inside the circuit. Silencing them does make the bump drift in the simulation, but not because landmarks are lost. The story's "steers back" is not simulated (no motor output). Driving the circuit's MeTu visual cells *does* reach the ring neurons (~71 ms) but not the compass cells — a possible future "light" step.
- **Lesson 3:** "they kick the middle legs, and the fly leaps away" / "from the eyes … down to the legs" — the simulation starts at the looming detector cells, not the eye, and ends at the jump motor neurons; legs and the jump are not simulated.
