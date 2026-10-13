# Hero montage: sources and permissions

Internal working document. The home page opens on a montage of short clips (1.5 to 2 seconds each). Today every clip is our own, recorded from the lessons with `pnpm hero:clips`. The idea is to add clips from other projects built on the same fly connectomes: simulated flies walking, grooming, flying, seeing.

**Those clips belong to the people who made them.** Nothing from this list is downloaded, embedded, or re-encoded until its owner has said yes in writing, or the clip itself carries a license that allows it. A code license on a repository does not cover the videos on its website, and an open-access paper's license covers the paper's figures and supplementary videos, not the lab's other footage. When in doubt, ask.

## How a licensed clip goes in

1. Get permission (email below) or confirm the license on the exact file. Save the reply, or the license text and URL, under `docs/permissions/`.
2. Cut 1.5 to 2 seconds, muted, 4:3, about 960 × 720, WebM (and a WebP still of one frame, 640 × 480). Put both in `apps/web/public/hero/`.
3. Add an entry to `apps/web/content/hero-clips.json`:

   ```json
   {
     "id": "neuromechfly-walk",
     "src": "/hero/neuromechfly-walk.webm",
     "poster": "/hero/neuromechfly-walk.webp",
     "duration": 1.8,
     "credit": "NeuroMechFly v2 · Ramdya Lab, EPFL · CC BY 4.0",
     "creditUrl": "https://neuromechfly.org/"
   }
   ```

   `credit` is shown over the clip for as long as it plays, in every language, exactly as written, and links to `creditUrl`. Use the wording the owner asks for. A clip without a credit does not load: `readHeroClips` refuses it.

4. Add the clip, its owner, its license or permission, and the date to [ATTRIBUTION.md](../ATTRIBUTION.md).

## Candidates

Licenses in the "Code" column were read from each repository on 13 October 2026. Paper licenses are from Crossref on the same day. **"Video" is the column that matters, and for every row it still has to be confirmed with the owner.**

| #   | Project                                                             | Owner                                                     | What a clip would show                                                                                          | Link                                                                                                                  | Code license | Paper                                                                                                                                                                 | Video                                                                                                                                                                  |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **NeuroMechFly v2 / FlyGym**                                        | Ramdya Lab (Neuroengineering Laboratory), EPFL            | A simulated fly walking over rough ground, following an odor, tracking another fly                              | [neuromechfly.org](https://neuromechfly.org/), [github.com/NeLy-EPFL/flygym](https://github.com/NeLy-EPFL/flygym)     | Apache-2.0   | Wang-Chen et al., _Nature Methods_ 2024, [doi:10.1038/s41592-024-02497-y](https://doi.org/10.1038/s41592-024-02497-y). License not confirmed: check the article page. | Not stated. Ask. We already use their body model, so this is the natural first request.                                                                                |
| 2   | **flybody**                                                         | Turaga Lab, HHMI Janelia, with Google DeepMind            | A physics-simulated fly walking and flying, trained by reinforcement learning                                   | [github.com/TuragaLab/flybody](https://github.com/TuragaLab/flybody)                                                  | Apache-2.0   | Vaxenburg et al., _Nature_ 2025, [doi:10.1038/s41586-025-09029-4](https://doi.org/10.1038/s41586-025-09029-4), CC BY 4.0                                              | Paper's supplementary videos are likely under the paper's CC BY 4.0; confirm on the article page. Repository and talk videos: ask.                                     |
| 3   | **Whole-brain model of the fly** (the model our simulation follows) | Philip Shiu and colleagues (UC Berkeley; now Eon Systems) | Activity spreading through the FlyWire brain after sugar or touch neurons fire                                  | [github.com/philshiu/Drosophila_brain_model](https://github.com/philshiu/Drosophila_brain_model)                      | MIT          | Shiu et al., _Nature_ 2024, [doi:10.1038/s41586-024-07763-9](https://doi.org/10.1038/s41586-024-07763-9), CC BY 4.0                                                   | There is little video; a rendering would be ours, made with their model (MIT) on FlyWire data. Check the FlyWire data terms before rendering FlyWire neurons.          |
| 4   | **Embodied fly brain emulation**                                    | Eon Systems PBC                                           | A simulated fly walking, feeding, and grooming, driven by a connectome-based brain model in a NeuroMechFly body | [eon.systems](https://eon.systems/), [github.com/eonsystemspbc/fly-brain](https://github.com/eonsystemspbc/fly-brain) | GPL-2.0      | None peer-reviewed for the embodiment demo that we found                                                                                                              | Company demo video, all rights reserved unless they say otherwise. Ask. Their claims about the demo are their own; a credit is not an endorsement.                     |
| 5   | **flyvis** (connectome-constrained model of the fly visual system)  | Turaga Lab, HHMI Janelia, with the Macke Lab, Tübingen    | Moving edges and the responses of model visual neurons                                                          | [github.com/TuragaLab/flyvis](https://github.com/TuragaLab/flyvis)                                                    | MIT          | Lappalainen et al., _Nature_ 2024, [doi:10.1038/s41586-024-07939-3](https://doi.org/10.1038/s41586-024-07939-3), CC BY 4.0                                            | Ask, or render our own with their code (MIT).                                                                                                                          |
| 6   | **FlyWire** whole-brain renderings                                  | FlyWire Consortium (Murthy and Seung labs, Princeton)     | The 139,000-neuron brain turning, neuron classes lighting up                                                    | [flywire.ai](https://flywire.ai/), [codex.flywire.ai](https://codex.flywire.ai/)                                      | n/a          | Dorkenwald et al. and Schlegel et al., _Nature_ 2024                                                                                                                  | FlyWire's press renderings have named artists and their own terms. Ask FlyWire, and credit the artist they name. Do not assume the data license covers the renderings. |
| 7   | **MaleCNS** release videos                                          | FlyEM Project Team, HHMI Janelia                          | The male nervous system we already use, rendered whole                                                          | [male-cns.janelia.org](https://male-cns.janelia.org/)                                                                 | n/a          | Berg et al. 2026 (see [DATA_LICENSE.md](../DATA_LICENSE.md))                                                                                                          | The data is CC BY 4.0, so our own renderings are fine with credit. Janelia's own videos: ask.                                                                          |
| 8   | **flyputer**                                                        | Community project (github.com/migkapa)                    | A language model steering a FlyWire-based simulation                                                            | [github.com/migkapa/flyputer](https://github.com/migkapa/flyputer)                                                    | MIT          | n/a                                                                                                                                                                   | Hobby project: a short, friendly email is enough. Lower priority; check quality first.                                                                                 |

Not on the list on purpose: news-site and YouTube re-uploads of any of the above (the uploader is rarely the owner), and anything whose owner we cannot identify.

## What to ask for first

1. **NeuroMechFly (row 1)** and **flybody (row 2)**: the walking fly is the picture the montage is missing, and both groups publish openly.
2. **Eon Systems (row 4)**: the most striking footage, and a company, so expect conditions on wording.
3. The rest as they fit.

## Permission request (draft)

Subject: Permission to show a 2-second clip of [PROJECT] on WiredMind, a free classroom site

> Dear [NAME],
>
> I build WiredMind (https://wiredmind.app), a free, open-source website where secondary-school students stimulate and silence neurons in a real fruit fly connectome (MaleCNS v1.0) in the browser. It has no ads, no accounts, and no paid tier. The code is at https://github.com/GuyDahn/wiredmind-edu.
>
> I would like to show a short clip from [PROJECT] on the home page, in a looping montage of work built on fly connectomes: **[WHICH VIDEO, WITH LINK AND TIMESTAMP]**, cut to about 2 seconds, muted, at about 960 × 720.
>
> It would carry a visible credit over the clip for as long as it plays, linking to your page. I would use whatever wording you prefer, for example: "[PROJECT] · [LAB / ORGANIZATION] · [LICENSE OR ©]". You would also be listed on the site's attribution page.
>
> Could you tell me:
>
> 1. whether I may use it this way, on the site and in its public repository,
> 2. the exact credit line and link you would like, and
> 3. whether there is a version of the file you would rather I use?
>
> If the answer is no, or you would rather I link to your video instead of showing it, that is no problem at all. I will remove the clip at any time if you ask.
>
> Thank you for making this work public. It is why a site like this can exist.
>
> Guy Dahan
> https://wiredmind.app
