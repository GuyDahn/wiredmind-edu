# Attribution

WiredMind's own code is MIT ([LICENSE](LICENSE)). It shows other people's work, listed here with the license each came under. Neuron data has its own page: [DATA_LICENSE.md](DATA_LICENSE.md).

## The fly body in the zoom journey

|            |                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What       | The 3D fly a lesson's zoom starts from: head, thorax, abdomen, legs, wings, eyes, antennae.                                                                                                                                                                                                                                    |
| Source     | **NeuroMechFly v2**, the body model of [FlyGym](https://github.com/NeLy-EPFL/flygym), from the Neuroengineering Laboratory at EPFL. It was built from a micro-CT scan of an adult female _Drosophila melanogaster_. Site: [neuromechfly.org](https://neuromechfly.org/).                                                       |
| Files used | The 40 meshes in `src/flygym/assets/model/neuromechfly/meshes/simplified_max2000faces/`, placed with the model's own rigging and neutral pose.                                                                                                                                                                                 |
| Version    | Commit [`38c8ec6`](https://github.com/NeLy-EPFL/flygym/tree/38c8ec61034cd59bc5ba0de20688d4a3c0000d60) (38c8ec61034cd59bc5ba0de20688d4a3c0000d60).                                                                                                                                                                              |
| License    | **Apache License 2.0.** The repository's [LICENSE](https://github.com/NeLy-EPFL/flygym/blob/38c8ec61034cd59bc5ba0de20688d4a3c0000d60/LICENSE) covers the whole repository, meshes included; no file in it sets other terms for the model assets, and there is no NOTICE file. Copyright 2023-2026 The NeuroMechFly v2 Authors. |
| Checked    | 13 October 2026, against the repository at that commit and GitHub's license metadata.                                                                                                                                                                                                                                          |
| Changes    | Each segment is simplified further (the tarsi most), right-side segments are mirrored as the model does, all segments are merged into four meshes (body, head, eyes, wings), moved into MaleCNS coordinates, and Draco-compressed. Colors are ours. See [`tools/data/scripts/bake_body.py`](tools/data/scripts/bake_body.py).  |

Please cite:

> Wang-Chen, S., Stimpfling, V. A., Lam, T. K. C., Özdil, P. G., Genoud, L., Hurtak, F., & Ramdya, P. (2024). NeuroMechFly v2: simulating embodied sensorimotor control in adult _Drosophila_. _Nature Methods_ 21, 2353–2362. https://doi.org/10.1038/s41592-024-02497-y

The other candidate, [flybody](https://github.com/TuragaLab/flybody) (HHMI Janelia and Google DeepMind; Apache-2.0 at the repository level, checked the same day), is more detailed. NeuroMechFly was chosen because it ships meshes already simplified to a size a phone can load. flybody is not used.

## The brain and nerve cord outlines inside it

|         |                                                                                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What    | The translucent brain in the fly's head and the nerve cord in its thorax.                                                                                             |
| Source  | The **MaleCNS v1.0** shell meshes `rois/brain-shell-v2.2` and `rois/vnc-shell-v2` in the public bucket `gs://flyem-male-cns`, the same release the neurons come from. |
| License | **CC BY 4.0**, as for all MaleCNS data. Credit and citation: [DATA_LICENSE.md](DATA_LICENSE.md).                                                                      |
| Changes | Simplified from about 3 million triangles each to 9,000 and 4,000, and Draco-compressed. Not moved: they stay in MaleCNS coordinates.                                 |

## How the two fit together, and what that does not mean

The body and the brain are **two different animals**: a female fly scanned at EPFL and a male fly imaged at Janelia. Both are shown at their true size. The body is rotated and shifted, as one rigid piece, to where the most of the brain outline sits inside the head and the most of the nerve cord outline sits inside the thorax; with that placement 99.9% of each outline is inside its part of the body (`bake_body.py --check`). This is a placement for teaching, not an anatomical registration: nothing was warped, and no claim is made about where a given neuron lies relative to the cuticle. The lesson says in words that the brain was mapped from another fly.

Both end up in one file, `body.glb` (about 80 KB), published with the other baked assets as a GitHub Release and pinned in `data.lock.json`.

## The story pictures

The comic panels in `apps/web/public/art/story/` are original placeholders drawn by `scripts/story-art.ts` for this project (MIT, like the code). The fly character, its name, and every word of the stories are original to WiredMind. Nothing in them is taken from any other course or publication. The brief for the art that will replace them is [docs/art-brief.md](docs/art-brief.md).

## The home page clips

The clips in `apps/web/public/hero/` are recorded from WiredMind's own lessons by `scripts/hero-clips.ts`. They show MaleCNS neurons (CC BY 4.0) and, in the zoom clip, the NeuroMechFly body (Apache-2.0), and each carries that credit on screen. No one else's video is used. Clips from other projects may be added only with a license or written permission that allows it: [docs/hero-montage-sources.md](docs/hero-montage-sources.md).
