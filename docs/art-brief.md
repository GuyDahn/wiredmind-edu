# Art brief: the fly's stories

WiredMind's three lessons each open with a short comic about one fly. The panel component, the layout, and the words are built. The pictures in place now are placeholders (`pnpm art:placeholders`). This brief is what an illustrator, or an image model, needs to replace them with consistent art.

**Everything here is original to WiredMind and must stay that way.** Do not base the character, the panels, or the layout on any existing comic, course, or textbook figure. In particular, do not reference the moth comic of the Tel Aviv University brain course on Campus IL: that is their copyrighted work. We share a teaching idea with it (a story first, then the brain), nothing else.

## How art gets into the site

Replace a file, keep its name. Nothing else changes.

- Folder: `apps/web/public/art/story/`
- Name: `<lesson>-<panel>.svg`, plus `bridge.svg`. The 16 names are in the table below.
- Format: SVG preferred (it stays sharp on a projector). If the art is raster, deliver WebP at 1600 × 1200 and change the extension in `storyArt()` and `BRIDGE_ART` in `apps/web/src/viewer/story.tsx`.
- Size: **4:3, drawn on an 800 × 600 canvas.** It is shown as small as 358 px wide on a phone and as large as about 900 px on a projector.
- Weight: under 60 KB per SVG, under 120 KB per WebP.
- **No words, letters, or numbers in the picture.** Captions and speech bubbles are text on the page, in 18 languages, two of them right to left.
- **Keep the top quarter calm.** The speech bubble sits over the top of the picture, on the left in left-to-right languages and on the right in Hebrew and Arabic. No faces or key props above y = 150; sky, wall, or soft background only.
- The fly never needs to face a particular way for the text: panels are not mirrored for right-to-left languages.
- No speech-bubble tails in the art. The page draws the bubble.

## The character

**Name:** placeholder "Ziv" (זיו). The name is one line per language in `apps/web/messages/*.json` (`character.name`) and appears nowhere in the art.

**Who he is:** an adult male fruit fly, _Drosophila melanogaster_. Curious, a little dry, unbothered. He is the same fly in all three stories. He is a fly, not a person in a fly costume: no clothes, no hands, no eyebrows, no teeth.

**Look (stay close to the real animal):**

- Proportions: head about a quarter of the body length, thorax a third, abdomen the rest. Body about 2.5 times as long as it is tall. Slightly larger head and eyes than life is fine; no more than 20%.
- Eyes: large, oval, **brick red**, covering most of the side of the head. One small highlight. The eyes carry the expression.
- Body: warm amber-tan cuticle. Abdomen with 4 to 5 darker bands; the last two segments darker and rounded (he is male).
- Wings: two, clear with a faint blue-grey tint and a few veins, folded flat over the abdomen at rest, a blur when flying.
- Antennae: short, three-part, with a feathery bristle (the arista). They matter in the smell story: show them clearly.
- Legs: six, thin, jointed. The **middle pair** does the jumping in the escape story.
- Bristles: a few on the thorax and head. Do not make him furry.

**Colors:**

| Part          | Color                          |
| ------------- | ------------------------------ |
| Outline, ink  | `#1f2937`                      |
| Cuticle       | `#b7793a`, shadow `#8f5a26`    |
| Eyes          | `#b03a24`, highlight `#ffffff` |
| Wings         | `#dfe6f5` at about 80% opacity |
| Abdomen bands | `#6b4420`                      |

Backgrounds are quiet and flat, one hue per lesson: smell `#fbefd9` (warm kitchen light), compass `#e6ecf5` (early morning), escape `#e9f3ec` (cool daylight). The lesson's own cell colors may appear in the ending panels only: smell: blue `#409eed` and pink `#db4775`; compass: green `#34d399`; escape: blue `#38bdf8`, red `#f87171`, yellow `#facc15`. They match the colors the same cells have in the lesson.

**Expressions (three are enough):**

1. **Calm**: eye relaxed, antennae level, wings folded.
2. **Alert**: eye wide with a visible pupil highlight, antennae up, body tensed, legs set.
3. **Pleased**: eye a soft upward arc, antennae relaxed, a slight lean back.

No mouth expressions: a fly's mouth is a proboscis, and it stays tucked.

## Style

- **Friendly, scientific, not childish.** The readers are 16 to 18. Think of a good popular-science book or a museum panel, not a picture book and not a mascot.
- Clean line with flat color and one level of soft shadow. Even line weight, about 5 px at 800 × 600.
- Real anatomy, simplified, never cute-ified: six legs, two wings, three body parts, in the right places.
- Real scale cues: a peach, a glass, a window latch should make him look 3 mm long.
- Calm compositions. One idea per panel. No speed lines beyond a wing blur and one dashed flight path, no impact stars, no sweat drops, no exclamation marks.
- No humans in full. A hand or a swatter entering the frame is enough.
- The swatter is a threat, not a horror: no squashing, nothing gory.
- The same fly, the same palette, the same line in all 16 pictures.

## The panels

One line each. The caption and bubble are given for context (English; the Hebrew is in `apps/web/messages/he.json`). Do not draw the words.

### Shared

| File         | Picture                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bridge.svg` | The fly, pleased, three-quarter view, looking at the reader; a magnifying glass over his head, as if we are about to look inside. Background neutral grey-blue `#eef2f7`. Used as the last screen of all three stories ("Now let's see what happened inside his brain."). |

### Lesson 1, smell and memory (`smell-memory-…`)

| File                      | Picture                                                                                                                                                                                            | Caption / bubble                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `smell-memory-ripe.svg`   | A ripe peach on a kitchen windowsill, window open, smell drifting out as soft wavy lines. The fly small, far left, or not yet in frame.                                                            | A peach has ripened on the windowsill all day… / "Something smells good."                                         |
| `smell-memory-sniff.svg`  | Close on the fly in flight, alert, antennae forward; the smell lines reach the antennae.                                                                                                           | His antennae catch a few molecules of it… / "I know this smell!"                                                  |
| `smell-memory-recall.svg` | The fly at rest, calm; beside him a soft-edged memory picture of the same peach (a thought cloud without a tail toward the bubble area), paler than the real one.                                  | Last week this same smell led him to food… / "Peach means dinner."                                                |
| `smell-memory-land.svg`   | The fly, pleased, flying the last stretch upwind to the peach on the sill. A dashed path behind him.                                                                                               | He turns into the wind and follows the smell… / "Found it. Again."                                                |
| `smell-memory-ending.svg` | The fly, pleased, beside the peach. Above him, a simple diagram: a row of round cells with a few lit **blue**, and below it one lit **pink** cell. This is the only panel that hints at the brain. | The smell lit a few sorter cells. The memory readers knew what that pattern meant. / "So that is how I remember!" |

### Lesson 2, the compass (`compass-…`)

| File                  | Picture                                                                                                                                                      | Caption / bubble                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `compass-dawn.svg`    | A dim room at dawn. A bright vertical gap between shutters at the right, light fanning in. The fly at rest on a surface at the left, calm, facing the light. | Morning. Light pours in through a gap in the shutters… / "That way."                                                  |
| `compass-heading.svg` | The fly flying level toward the gap. A small straight arrow ahead of him shows his heading.                                                                  | He sets off toward the light. Inside his brain, a compass marks the way he is facing. / "Light ahead. Hold it there." |
| `compass-gust.svg`    | A draft (three soft wind lines from the left) has turned him: body tilted, alert, the light now off to one side of his heading.                              | A draft pushes him sideways. The light slides off to one side. / "Whoa. I have turned."                               |
| `compass-hold.svg`    | The fly, pleased, back on a straight line to the gap, nearly through it. A dashed path shows the correction.                                                 | He sees where the light is now and steers back… / "Back on course."                                                   |
| `compass-ending.svg`  | The fly, pleased, at rest. Beside him a ring of cells with one bright wedge in **green**: the compass, with its bump.                                        | Turning signals push the compass around. What he sees pins it in place. / "My very own compass!"                      |

### Lesson 3, the escape (`escape-…`)

| File                | Picture                                                                                                                                                                                          | Caption / bubble                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `escape-rest.svg`   | The fly on the rim of a drinking glass, calm, a hind leg raised to clean a wing. A quiet kitchen surface.                                                                                        | He is cleaning his wings on the rim of a glass. The kitchen is quiet. / "Nice and calm." |
| `escape-shadow.svg` | The same view. A large soft shadow falls across the glass and the fly. He is alert: eye wide, legs set.                                                                                          | A shadow grows fast in his eyes. Something big is coming straight at him. / "Uh-oh."     |
| `escape-leap.svg`   | The swatter coming down at the glass from the upper right. The fly already in the air to the left, **middle legs** just extended from the kick, wings opening. A short dashed path from the rim. | His middle legs kick before the swatter lands… about 30 milliseconds. / "Jump!"          |
| `escape-safe.svg`   | The swatter flat on the empty glass. The fly small, pleased, flying away at the far left.                                                                                                        | The swatter hits an empty glass. He is already across the room. / "Missed me."           |
| `escape-ending.svg` | The fly, pleased, at rest. Beside him a simple diagram: a row of **blue** cells at the top, one thick **red** line running down from them, a few **yellow** cells at the bottom.                 | One thick wire carried the alarm from his eyes to his legs… / "Thank you, giant fiber."  |

## If the art is generated

Use one character reference for every picture: generate the character sheet first (side view, three-quarter view, the three expressions, on a plain background), then pass it as the reference for each panel. Give the model the look, palette, and style sections above word for word, then the one-line picture description. Ask for "no text, no letters, no speech bubbles" every time, and check the count of legs (six) and wings (two) on every result before accepting it. Check that the tool's terms allow use in a free, MIT-licensed educational site, and record the tool and date in [ATTRIBUTION.md](../ATTRIBUTION.md).

## Sign-off checklist

- [ ] 16 files, named as above, 4:3.
- [ ] Same fly in every one: red eyes, amber body, six legs, two wings.
- [ ] No words in any picture; top quarter calm.
- [ ] Reads at 358 px wide (phone) and at 900 px (projector).
- [ ] Nothing resembles another publisher's character or panels.
- [ ] Credit and license for the art added to `ATTRIBUTION.md`.
