import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { journey, skipStory, story, toMission } from "./lesson.js";

/**
 * A lesson as a student meets it: the fly's story, the zoom from the whole
 * fly down to one neuron, then the mission, with a prediction to make before
 * the step that tests it and a win screen at the end. And the promise the
 * About page makes: none of it sets a cookie or writes to storage.
 */
const LESSONS = ["smell-memory", "compass", "escape"] as const;
const LEVELS = ["fly", "brain", "circuit", "neuron"] as const;
const DESKTOP = { width: 1280, height: 800 };

type LessonFile = {
  story: { panels: string[] };
  steps: {
    id: string;
    predict?: { choices: { id: string; correct: boolean }[] };
  }[];
  check: { choices: { id: string; correct: boolean }[] };
};

function lessonFile(id: string): LessonFile {
  const url = new URL(
    `../../apps/web/content/modules/${id}.json`,
    import.meta.url,
  );
  return JSON.parse(readFileSync(url, "utf8")) as LessonFile;
}

const level = (page: Page, name: string) =>
  expect(journey(page)).toHaveAttribute("data-journey-level", name);
/** The camera has landed, so the next tap starts from a level, not from mid-air. */
const landed = (page: Page) =>
  expect(journey(page)).toHaveAttribute("data-journey-flying", "false", {
    timeout: 10_000,
  });

async function stored(page: Page) {
  return page.evaluate(() => ({
    cookie: document.cookie,
    local: localStorage.length,
    session: sessionStorage.length,
  }));
}
const NOTHING = { cookie: "", local: 0, session: 0 };

/** Reads the story to its last screen and takes the zoom it leads into. */
async function readStory(page: Page, lesson: LessonFile) {
  const next = page.locator("[data-story-next]");
  const back = page.locator("[data-story-back]");
  await expect(back).toBeDisabled();
  for (const panel of lesson.story.panels) {
    await expect(story(page)).toHaveAttribute("data-story", panel);
    await expect(page.locator("[data-story-caption]")).not.toBeEmpty();
    await expect(page.locator("[data-story-bubble]")).not.toBeEmpty();
    await next.click();
  }
  await expect(story(page)).toHaveAttribute("data-story", "bridge");
  // Back is always there, and the story is where it was left.
  await back.click();
  await expect(story(page)).toHaveAttribute(
    "data-story",
    lesson.story.panels.at(-1)!,
  );
  await next.click();
  await next.click();
  await expect(story(page)).toHaveCount(0);
}

/** Plays the mission's steps, predicting where a step asks, up to its question. */
async function playSteps(page: Page, lesson: LessonFile, guessRight: boolean) {
  const cue = page.locator("[data-cue]");
  for (const step of lesson.steps) {
    if (step.predict) {
      // No button, and no result, until a prediction is in.
      await expect(page.locator('[data-predict="open"]')).toBeVisible();
      await expect(cue).toHaveCount(0);
      await expect(page.locator("[data-predict-first]")).toBeVisible();
      await expect(page.locator("[data-step-result]")).toHaveCount(0);
      const pick = step.predict.choices.find(
        (choice) => choice.correct === guessRight,
      )!;
      await page.locator(`[data-predict-choice="${pick.id}"]`).click();
      await expect(page.locator('[data-predict="picked"]')).toBeVisible();
    }
    await expect(cue.first()).toBeEnabled({ timeout: 60_000 });
    await cue.first().click();
    // A puff runs in slow motion, and slower still on a machine with no GPU.
    await expect(page.locator("[data-step-result]")).toBeVisible({
      timeout: 150_000,
    });
    if (step.predict) {
      // Right or wrong, the same next step: a guess costs nothing.
      await expect(page.locator("[data-predict-outcome]")).toHaveAttribute(
        "data-predict-outcome",
        guessRight ? "held" : "surprise",
      );
    }
    await page.locator("[data-step-next]").click();
  }
}

for (const id of LESSONS) {
  test(`${id}: the story, then the zoom, then the mission to its win screen`, async ({
    page,
  }) => {
    test.setTimeout(480_000);
    const lesson = lessonFile(id);
    await page.setViewportSize(DESKTOP);
    await page.goto(`/he/modules/${id}`);
    // The story comes first, over everything else.
    await expect(story(page)).toBeVisible();
    await expect(journey(page)).toHaveCount(0);
    // The lesson loads behind it, out of reach of taps and tabs.
    await expect(page.locator("[inert] [data-mission-goal]")).toHaveCount(1);
    await readStory(page, lesson);

    // The zoom: four levels in order, a caption at each.
    const next = page.locator("[data-journey-next]");
    const out = page.locator("[data-journey-out]");
    await level(page, "fly");
    await expect(out).toBeDisabled();
    const captions = new Set<string>();
    for (const name of LEVELS) {
      await level(page, name);
      await landed(page);
      const caption = await page.locator("[data-journey-caption]").innerText();
      expect(caption.trim().length).toBeGreaterThan(10);
      captions.add(caption);
      if (name !== "neuron") await next.click();
    }
    expect(captions.size).toBe(LEVELS.length);
    // Back out one level at a time, or jump straight to any of them.
    await out.click();
    await level(page, "circuit");
    await page.locator('[data-journey-jump="fly"]').click();
    await level(page, "fly");
    await landed(page);
    await page.locator('[data-journey-jump="neuron"]').click();
    await level(page, "neuron");
    await landed(page);
    await page.locator('[data-journey-jump="brain"]').click();
    await level(page, "brain");
    await landed(page);
    await page.locator('[data-journey-jump="neuron"]').click();
    await next.click();
    await expect(journey(page)).toHaveCount(0);

    // The mission, its goal in one line.
    await expect(page.locator("[data-mission-goal]")).toBeVisible();
    await playSteps(page, lesson, id !== "compass");
    const right = lesson.check.choices.find((choice) => choice.correct)!;
    await page.locator(`[data-check-choice="${right.id}"]`).click();
    await page.locator("[data-mission-finish]").click();
    const win = page.locator("[data-mission-win]");
    await expect(win).toBeVisible();
    // The story comes back to close the mission.
    await expect(win.locator("[data-story-caption]")).not.toBeEmpty();
    await expect(win.locator("[data-story-bubble]")).not.toBeEmpty();
    await expect(page.locator("[data-free-play]")).toBeVisible();
    expect(await stored(page)).toEqual(NOTHING);
    expect(await page.context().cookies()).toEqual([]);
  });
}

test("the zoom can be reopened mid-mission, and the mission is where it was", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize(DESKTOP);
  await page.goto("/he/modules/escape");
  await toMission(page);
  const cue = page.locator("[data-cue]");
  await expect(cue.first()).toBeEnabled({ timeout: 60_000 });
  await cue.first().click();
  await expect(page.locator("[data-step-result]")).toBeVisible({
    timeout: 60_000,
  });
  await page.locator("[data-journey-open]").click();
  await level(page, "fly");
  await page.locator('[data-journey-jump="circuit"]').click();
  await level(page, "circuit");
  await page.locator("[data-journey-skip]").click();
  await expect(journey(page)).toHaveCount(0);
  await expect(page.locator("[data-step-result]")).toBeVisible();
});

test("with reduced motion the zoom cuts between levels instead of flying", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(DESKTOP);
  await page.goto("/he/modules/escape");
  await skipStory(page);
  // Wait for the brain, so a level change has a camera to move.
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForLoadState("networkidle");
  for (const name of ["brain", "circuit", "neuron", "fly"]) {
    await page.locator(`[data-journey-jump="${name}"]`).click();
    await level(page, name);
    // Never in flight, not even for a frame the test could catch.
    for (let look = 0; look < 5; look++) {
      await expect(journey(page)).toHaveAttribute(
        "data-journey-flying",
        "false",
      );
      await page.waitForTimeout(60);
    }
  }
  await page.locator("[data-journey-skip]").click();
  await expect(page.locator("[data-mission-goal]")).toBeVisible();
});

test("without reduced motion a level change is a flight", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(DESKTOP);
  await page.goto("/he/modules/escape");
  await skipStory(page);
  // The circuit has to be in before the camera has anywhere to fly.
  await page.locator("[data-journey-skip]").click();
  await expect(page.locator("[data-cue]").first()).toBeEnabled({
    timeout: 60_000,
  });
  await page.locator("[data-journey-open]").click();
  await level(page, "fly");
  await landed(page);
  await page.locator('[data-journey-jump="circuit"]').click();
  await expect(journey(page)).toHaveAttribute("data-journey-flying", "true");
  await landed(page);
});

test("the mission map marks a finished mission until the page reloads", async ({
  page,
}) => {
  test.setTimeout(480_000);
  const lesson = lessonFile("escape");
  await page.setViewportSize(DESKTOP);
  await page.goto("/he");
  const stop = page.locator('[data-mission-map] [data-mission="escape"]');
  await expect(stop).toHaveAttribute("data-done", "false");
  // Through the site's own links, the way a student moves: no reload.
  await stop.locator("a").click();
  await toMission(page);
  await playSteps(page, lesson, true);
  const right = lesson.check.choices.find((choice) => choice.correct)!;
  await page.locator(`[data-check-choice="${right.id}"]`).click();
  await page.locator("[data-mission-finish]").click();
  await page.locator("[data-mission-onward]").click();
  await expect(stop).toHaveAttribute("data-done", "true");
  await expect(
    page.locator('[data-mission-map] [data-mission="compass"]'),
  ).toHaveAttribute("data-done", "false");
  expect(await stored(page)).toEqual(NOTHING);
  // In memory only: a reload starts the map empty.
  await page.reload();
  await expect(stop).toHaveAttribute("data-done", "false");
});

test.describe("no sideways scroll at 390 px, right to left", () => {
  for (const locale of ["he", "ar"]) {
    test(`${locale}: mission goal, prediction, and win screen`, async ({
      page,
    }) => {
      test.setTimeout(480_000);
      const lesson = lessonFile("escape");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/modules/escape`);
      const { measureOverflow } = await import("./layout.js");
      const check = async (what: string) => {
        const { scrollWidth, width, offenders } = await measureOverflow(page);
        expect(offenders, `${what}\n${offenders.join("\n")}`).toEqual([]);
        expect(scrollWidth, what).toBeLessThanOrEqual(width);
      };
      await toMission(page);
      await check("mission goal");
      const cue = page.locator("[data-cue]");
      for (const step of lesson.steps) {
        if (step.predict) {
          await expect(page.locator('[data-predict="open"]')).toBeVisible();
          await check("prediction");
          await page
            .locator(`[data-predict-choice="${step.predict.choices[0]!.id}"]`)
            .click();
        }
        await expect(cue.first()).toBeEnabled({ timeout: 60_000 });
        await cue.first().click();
        await expect(page.locator("[data-step-result]")).toBeVisible({
          timeout: 150_000,
        });
        await page.locator("[data-step-next]").click();
      }
      const right = lesson.check.choices.find((choice) => choice.correct)!;
      await page.locator(`[data-check-choice="${right.id}"]`).click();
      await page.locator("[data-mission-finish]").click();
      await expect(page.locator("[data-mission-win]")).toBeVisible();
      await check("win screen");
    });
  }
});
