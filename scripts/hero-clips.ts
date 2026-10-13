import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";

/**
 * pnpm hero:clips [base URL]
 *
 * Records the home page montage from the lessons themselves: for each clip
 * it opens a lesson, sets up the moment, and records the brain's own canvas
 * (no page chrome) for a little under two seconds, plus one still, which is
 * the first thing the home page paints and so is kept small. Output
 * goes to apps/web/public/hero/, which content/hero-clips.json points at.
 *
 * It needs the site running (default http://localhost:3000, with the data
 * fetched) and a Playwright Chromium. The clips are WebM: this script has
 * no encoder but the browser's.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const CLIP_MS = 1900;
/** The stage canvas at this window size is 960 × 720, the montage's 4:3. */
const VIEWPORT = { width: 1344, height: 720 };

type Clip = {
  id: string;
  lesson: string;
  /** Brings the page to the frame before the action. */
  setup: (page: Page) => Promise<void>;
  /** Selector of the control whose tap is the clip. */
  tap: string;
  /** When the still is taken, in ms after the tap. */
  stillAt: number;
};

async function toMission(page: Page) {
  await page.locator("[data-story-skip]").click();
  await page.locator("[data-journey-skip]").click();
  await page
    .locator("[data-cue]:not([disabled])")
    .first()
    .waitFor({ timeout: 90_000 });
}

/** Plays one step through, so the next tap shows what the step after it highlights. */
async function playStep(page: Page) {
  await page.locator("[data-cue]").first().click();
  await page.locator("[data-step-result]").waitFor({ timeout: 60_000 });
  await page.locator("[data-step-next]").click();
  await page.locator("[data-cue]:not([disabled])").first().waitFor();
}

const CLIPS: Clip[] = [
  {
    id: "escape",
    lesson: "escape",
    setup: async (page) => {
      await toMission(page);
      await playStep(page);
    },
    tap: "[data-cue]",
    stillAt: 700,
  },
  {
    id: "compass",
    lesson: "compass",
    setup: toMission,
    tap: "[data-cue]",
    stillAt: 1200,
  },
  {
    id: "smell",
    lesson: "smell-memory",
    setup: async (page) => {
      await toMission(page);
      await playStep(page);
    },
    tap: "[data-cue]",
    stillAt: 900,
  },
  {
    id: "zoom",
    lesson: "escape",
    setup: async (page) => {
      // Through the mission and back, so the circuit is in before the flight.
      await toMission(page);
      await page.locator("[data-journey-open]").click();
      await page
        .locator('[data-journey-level="fly"][data-journey-flying="false"]')
        .waitFor();
      await page.waitForTimeout(600);
    },
    tap: '[data-journey-jump="circuit"]',
    stillAt: 0,
  },
];

/** A screenshot as a WebP at the size the montage shows it on a phone at 2x. */
async function still(page: Page, png: Buffer): Promise<Buffer> {
  const base64 = await page.evaluate(async (source) => {
    // Decoded by hand: the site's own policy does not let a page fetch data: URLs.
    const png = Uint8Array.from(atob(source), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(
      new Blob([png], { type: "image/png" }),
    );
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, 640, 480);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((made) => resolve(made!), "image/webp", 0.7),
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }, png.toString("base64"));
  return Buffer.from(base64, "base64");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "apps", "web", "public", "hero");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  // The GPU, where the machine has one: the software renderer drops frames.
  args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"],
});
try {
  for (const clip of CLIPS) {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    await page.goto(`${BASE}/en/modules/${clip.lesson}`);
    await clip.setup(page);
    // The still is a screenshot, so the title, the color key, and the dial
    // over the canvas come off first: the video has none of them.
    await page.addStyleTag({
      content:
        '[data-intro="canvas"] ~ *, header:has(~ [data-intro="canvas"]) { visibility: hidden !important; }',
    });
    const canvas = page.locator("canvas").first();
    // Start the recorder, tap, and take the still while it runs.
    await page.evaluate(() => {
      const el = document.querySelector("canvas")!;
      const recorder = new MediaRecorder(el.captureStream(30), {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 1_600_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const done = new Promise<string>((resolve) => {
        recorder.onstop = async () => {
          const bytes = new Uint8Array(
            await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
          );
          let binary = "";
          for (const byte of bytes) binary += String.fromCharCode(byte);
          resolve(btoa(binary));
        };
      });
      Object.assign(window, { heroRecorder: recorder, heroDone: done });
      recorder.start();
    });
    if (clip.stillAt === 0) {
      writeFileSync(
        path.join(out, `${clip.id}.webp`),
        await still(page, await canvas.screenshot({ type: "png" })),
      );
    }
    await page.locator(clip.tap).first().click();
    const started = Date.now();
    if (clip.stillAt > 0) {
      await page.waitForTimeout(clip.stillAt);
      writeFileSync(
        path.join(out, `${clip.id}.webp`),
        await still(page, await canvas.screenshot({ type: "png" })),
      );
    }
    await page.waitForTimeout(Math.max(0, CLIP_MS - (Date.now() - started)));
    const base64 = await page.evaluate(async () => {
      const held = window as unknown as {
        heroRecorder: MediaRecorder;
        heroDone: Promise<string>;
      };
      held.heroRecorder.stop();
      return held.heroDone;
    });
    const file = path.join(out, `${clip.id}.webm`);
    writeFileSync(file, Buffer.from(base64, "base64"));
    console.log(`Recorded ${path.relative(root, file)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
