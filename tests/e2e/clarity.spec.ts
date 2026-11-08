import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { toMission } from "./lesson.js";

/**
 * The clarity pass: a wave that can be slowed and stepped through group by
 * group, numbers that follow the order the cells fire in, the pathway in
 * focus and drawn in two dimensions, one primary button per guided step, a
 * camera that can be put back, and comparison cards that stay hidden until
 * their flag is on.
 */
const LESSONS = ["smell-memory", "compass", "escape"] as const;
const DESKTOP = { width: 1280, height: 800 };

type LessonFile = {
  steps: {
    id: string;
    predict?: { choices: { id: string; correct: boolean }[] };
  }[];
  check: { choices: { id: string; correct: boolean }[] };
  pathways: { stimulus: string; silenced: string[]; order: string[] }[];
};

function lessonFile(id: string): LessonFile {
  const url = new URL(
    `../../apps/web/content/modules/${id}.json`,
    import.meta.url,
  );
  return JSON.parse(readFileSync(url, "utf8")) as LessonFile;
}

/** The order a puff of `stimulus` fires in, with nothing silenced. */
function order(lesson: LessonFile, stimulus: string): string[] {
  return lesson.pathways.find(
    (item) => item.stimulus === stimulus && item.silenced.length === 0,
  )!.order;
}

const stage = (page: Page) => page.locator("[data-stage]");

/** Waits for step mode to stop the wave on `group`, then checks every view of it. */
async function stoppedAt(page: Page, group: string, number: number) {
  await expect(stage(page)).toHaveAttribute("data-paused", "true", {
    timeout: 120_000,
  });
  await expect(stage(page)).toHaveAttribute("data-current", group);
  // The number on the brain, in the color key, and in the diagram agree.
  await expect(page.locator(`[data-badge="${group}"]`)).toHaveAttribute(
    "data-number",
    String(number),
  );
  await expect(page.locator(`[data-badge="${group}"]`)).toHaveAttribute(
    "data-state",
    "current",
  );
  await expect(page.locator(`[data-legend-group="${group}"]`)).toHaveAttribute(
    "data-number",
    String(number),
  );
  const diagram = page.locator('[data-pathway-diagram="side"]');
  await expect(diagram).toHaveAttribute("data-pathway-current", group);
  await expect(
    diagram.locator(`[data-pathway-step="${group}"]`),
  ).toHaveAttribute("data-state", "current");
  await expect(diagram.locator('[data-state="current"]')).toHaveCount(1);
}

/** Steps a wave through `expected`, one "Next" at a time. */
async function stepThrough(page: Page, expected: string[]) {
  for (const [index, group] of expected.entries()) {
    await stoppedAt(page, group, index + 1);
    // Focus mode: the pathway in full, everything else at a tenth.
    await expect(stage(page)).toHaveAttribute("data-focus-mode", "pathway");
    await expect(stage(page)).toHaveAttribute("data-dim-level", "0.012");
    const focused = (await stage(page).getAttribute("data-focus-groups"))!
      .split(" ")
      .sort();
    expect(focused).toEqual([...expected].sort());
    // A held wave holds still: nothing else fires while it waits.
    const wave = await stage(page).getAttribute("data-wave");
    await page.waitForTimeout(600);
    await expect(stage(page)).toHaveAttribute("data-wave", wave!);
    await page.locator("[data-next-group]").click();
  }
  await expect(stage(page)).toHaveAttribute("data-paused", "false");
}

/** Plays the guided steps and the question, then opens free play. */
async function toFreePlay(page: Page, lesson: LessonFile) {
  for (const step of lesson.steps) {
    if (step.predict) {
      const pick = step.predict.choices.find((choice) => choice.correct)!;
      await page.locator(`[data-predict-choice="${pick.id}"]`).click();
    }
    await expect(page.locator("[data-cue]")).toBeEnabled({ timeout: 60_000 });
    await page.locator("[data-cue]").click();
    await expect(page.locator("[data-step-result]")).toBeVisible({
      timeout: 150_000,
    });
    await page.locator("[data-step-next]").click();
  }
  const right = lesson.check.choices.find((choice) => choice.correct)!;
  await page.locator(`[data-check-choice="${right.id}"]`).click();
  await page.locator("[data-mission-finish]").click();
  await expect(page.locator("[data-mission-win]")).toBeVisible();
  // The comparison card is built, but its flag is off.
  await expect(page.locator("[data-comparison]")).toHaveCount(0);
  await expect(page.locator("[data-exercises]")).toBeVisible();
  await page.locator("[data-free-play]").click();
}

for (const id of LESSONS) {
  test.describe(id, () => {
    test("a guided step has one primary button, steps group by group, and numbers the wave as it fires", async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const lesson = lessonFile(id);
      const first = lesson.steps[0]!;
      await page.setViewportSize(DESKTOP);
      await page.goto(`/he/modules/${id}`);
      await toMission(page);
      await expect(page.locator("[data-cue]")).toBeEnabled({
        timeout: 60_000,
      });

      // Guided: one big "Next", the step counter, and nothing else to press
      // but the step-mode switch.
      await expect(page.locator("[data-primary]")).toHaveCount(1);
      await expect(page.locator("[data-step-counter]")).toContainText(
        String(lesson.steps.length + 1),
      );
      await expect(page.locator("[data-stimulate]")).toHaveCount(0);
      await expect(page.locator("[data-speed-control]")).toHaveCount(0);
      await expect(page.locator('[aria-controls="lesson-list"]')).toHaveCount(
        0,
      );
      await expect(stage(page)).toHaveAttribute("data-speed", "0.5");

      // Before the puff the diagram already shows the way, with the numbers
      // the simulation fires in.
      const stimulus = (first as { goal?: { colorGroup: string } }).goal
        ?.colorGroup;
      const expected = order(lesson, stimulus ?? lesson.pathways[0]!.stimulus);
      for (const [index, group] of expected.entries()) {
        await expect(page.locator(`[data-badge="${group}"]`)).toHaveAttribute(
          "data-number",
          String(index + 1),
        );
      }

      await page.locator("[data-step-toggle]").click();
      await expect(stage(page)).toHaveAttribute("data-step-mode", "on");
      await page.locator("[data-cue]").click();
      await stepThrough(page, expected);
      await expect(page.locator("[data-step-result]")).toBeVisible({
        timeout: 150_000,
      });
      // From a brain at rest, the live wave fired in exactly that order.
      await expect(stage(page)).toHaveAttribute(
        "data-wave",
        expected.join(" "),
      );
      await expect(page.locator("[data-primary]")).toHaveCount(1);
    });

    test("at 0.25× in step mode, free play's wave advances group by group", async ({
      page,
    }) => {
      test.setTimeout(900_000);
      const lesson = lessonFile(id);
      await page.setViewportSize(DESKTOP);
      await page.goto(`/he/modules/${id}`);
      await toMission(page);
      await toFreePlay(page, lesson);

      // Free play: every control, and the speed the learner picks.
      await expect(stage(page)).toHaveAttribute("data-speed", "1");
      await page.locator('[data-speed-control] [data-speed="0.25"]').click();
      await expect(stage(page)).toHaveAttribute("data-speed", "0.25");
      await expect(
        page.locator('[data-speed-control] [data-speed="0.25"]'),
      ).toHaveAttribute("aria-checked", "true");
      await page.locator("[data-step-toggle]").click();
      const stimulus = lesson.pathways[0]!.stimulus;
      await page.locator("[data-stimulate]").first().click();
      await stepThrough(page, order(lesson, stimulus));
      // Nothing about the speed or the steps was written down.
      expect(
        await page.evaluate(() => [
          document.cookie,
          localStorage.length,
          sessionStorage.length,
        ]),
      ).toEqual(["", 0, 0]);
    });
  });
}

test("reset view frames the pathway again after the learner turns the brain", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize(DESKTOP);
  await page.goto("/he/modules/escape");
  await toMission(page);
  await expect(page.locator("[data-cue]")).toBeEnabled({ timeout: 60_000 });
  // Let the step's own framing settle.
  await page.waitForTimeout(1200);
  const framed = await stage(page).getAttribute("data-view");
  expect(framed).toBeTruthy();
  const canvas = await page.locator("canvas").boundingBox();
  const x = canvas!.x + canvas!.width / 2;
  const y = canvas!.y + canvas!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 180, y + 60, { steps: 12 });
  await page.mouse.up();
  await expect(stage(page)).not.toHaveAttribute("data-view", framed!);
  await page.locator("[data-reset-view]").click();
  await expect(stage(page)).toHaveAttribute("data-view", framed!, {
    timeout: 5_000,
  });
  const button = await page.locator("[data-reset-view]").boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(44);
  expect(button!.width).toBeGreaterThanOrEqual(44);
});

test("lesson 2 shows where light would come in, and says it is not simulated", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize(DESKTOP);
  await page.goto("/he/modules/compass");
  await toMission(page);
  // The anchor is a point; its label hangs off it.
  await expect(page.locator("[data-light-label] span")).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.locator('[data-pathway-diagram="side"] [data-pathway-limit]'),
  ).toHaveCount(2);
});

/** A message key path as next-intl prints one when a string is missing. */
const KEY_PATH =
  /\b(viewer|lessons|circuits|teachers|terms|character|language|translate)\.[\w-]+\.[\w.-]+/;

for (const locale of ["de", "ar"]) {
  test(`lesson 2 in ${locale} shows English for copy not yet translated, never a key or a blank`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const missing: string[] = [];
    page.on("console", (message) => {
      if (/MISSING_MESSAGE|INSUFFICIENT_PATH/.test(message.text())) {
        missing.push(message.text());
      }
    });
    await page.setViewportSize(DESKTOP);
    await page.goto(`/${locale}/modules/compass`);
    await toMission(page);
    await expect(page.locator("[data-cue]")).toBeEnabled({ timeout: 60_000 });
    // The new pieces: the pathway, the step counter, step mode, the light.
    await expect(page.locator('[data-pathway-diagram="side"]')).toBeVisible();
    await page.locator("[data-step-toggle]").click();
    await page.locator("[data-cue]").click();
    await expect(stage(page)).toHaveAttribute("data-paused", "true", {
      timeout: 120_000,
    });
    // The text a student sees, labels included.
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toMatch(KEY_PATH);
    const blanks = await page.evaluate(() =>
      [...document.querySelectorAll("button, a, [role=radio], [role=switch]")]
        .filter((el) => {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0 || el.closest("[inert]")) {
            return false;
          }
          const name =
            el.getAttribute("aria-label") ??
            el.getAttribute("title") ??
            (el as HTMLElement).innerText;
          return name.trim() === "";
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    );
    expect(blanks).toEqual([]);
    // The English fallback shows, so the copy is really there.
    await expect(page.locator("[data-next-group]")).toContainText("Next");
    expect(missing).toEqual([]);
  });
}
