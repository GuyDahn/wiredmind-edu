import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CLIP_CAPTIONS,
  MAX_CLIP_SECONDS,
  MIN_CLIP_SECONDS,
  readHeroClips,
} from "../apps/web/src/site/hero-clips.js";

const WEB = new URL("../apps/web/", import.meta.url);
const file = JSON.parse(
  readFileSync(new URL("content/hero-clips.json", WEB), "utf8"),
) as { clips: Record<string, unknown>[] };

describe("home page montage", () => {
  const clips = readHeroClips(file);

  it("runs each clip for 1.5 to 2 seconds, with a credit and a link", () => {
    assert.ok(clips.length >= 4);
    for (const clip of clips) {
      assert.ok(clip.duration >= MIN_CLIP_SECONDS, clip.id);
      assert.ok(clip.duration <= MAX_CLIP_SECONDS, clip.id);
      assert.ok(clip.credit.length > 0, clip.id);
      assert.match(clip.creditUrl, /^(\/|https:\/\/)/, clip.id);
    }
  });

  it("ships the video and the still of every clip of ours", () => {
    for (const clip of clips) {
      if (!clip.src.startsWith("/")) continue;
      for (const path of [clip.src, clip.poster]) {
        assert.ok(
          existsSync(new URL(`public${path}`, WEB)),
          `${path} is missing: pnpm hero:clips`,
        );
      }
    }
  });

  it("has words, in every language, for each caption it names", () => {
    const en = JSON.parse(
      readFileSync(new URL("messages/en.json", WEB), "utf8"),
    ) as { landing: { montage: { clips: Record<string, string> } } };
    assert.deepEqual(
      Object.keys(en.landing.montage.clips).sort(),
      [...CLIP_CAPTIONS].sort(),
    );
  });

  it("refuses a clip with no credit, or one that runs long", () => {
    const [first] = file.clips;
    assert.throws(
      () => readHeroClips({ clips: [{ ...first, credit: "" }] }),
      /missing credit/,
    );
    assert.throws(
      () => readHeroClips({ clips: [{ ...first, duration: 8 }] }),
      /1\.5 to 2 seconds/,
    );
    assert.throws(
      () => readHeroClips({ clips: [{ ...first, src: "http://x/y.webm" }] }),
      /must start with/,
    );
  });

  it("takes a third-party clip with no caption of ours", () => {
    const [clip] = readHeroClips({
      clips: [
        {
          id: "theirs",
          src: "https://example.org/walk.webm",
          poster: "https://example.org/walk.jpg",
          duration: 1.8,
          credit: "Someone's lab · CC BY 4.0",
          creditUrl: "https://example.org/",
        },
      ],
    });
    assert.equal(clip?.caption, null);
  });
});

describe("story pictures", () => {
  it("has a picture for every panel of every story, and the shared last one", () => {
    const names = ["bridge"];
    for (const lesson of ["smell-memory", "compass", "escape"]) {
      const story = (
        JSON.parse(
          readFileSync(new URL(`content/modules/${lesson}.json`, WEB), "utf8"),
        ) as { story: { panels: string[] } }
      ).story;
      for (const panel of [...story.panels, "ending"]) {
        names.push(`${lesson}-${panel}`);
      }
    }
    for (const name of names) {
      const url = new URL(`public/art/story/${name}.svg`, WEB);
      assert.ok(existsSync(url), `${name}.svg is missing`);
      // Words are text on the page, in 18 languages, never in a picture.
      assert.doesNotMatch(readFileSync(url, "utf8"), /<text\b/, name);
    }
  });
});
