import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { toMission } from "./lesson.js";

/**
 * The comparison cards are built but hidden: with NEXT_PUBLIC_SHOW_COMPARISONS
 * off (the default) none renders anywhere. With it on, each lesson ends on
 * its card and the lessons page carries "Why learn from a fly at all?", in
 * Hebrew and English. The flag is baked into the build, so the "on" half
 * runs only against a build made with it:
 *
 *   NEXT_PUBLIC_SHOW_COMPARISONS=true pnpm build
 *   COMPARISONS=on pnpm test:e2e tests/e2e/comparisons.spec.ts
 */
const ON = process.env.COMPARISONS === "on";
const LESSONS = ["smell-memory", "compass", "escape"] as const;
const DESKTOP = { width: 1280, height: 800 };

type LessonFile = {
  steps: { predict?: { choices: { id: string; correct: boolean }[] } }[];
  check: { choices: { id: string; correct: boolean }[] };
};

function lessonFile(id: string): LessonFile {
  const url = new URL(
    `../../apps/web/content/modules/${id}.json`,
    import.meta.url,
  );
  return JSON.parse(readFileSync(url, "utf8")) as LessonFile;
}

/** The course lessons a card points to: brain evolution (3), then the lesson's own. */
function courseLessons(id: string): string {
  const url = new URL(
    "../../apps/web/content/course-mapping.json",
    import.meta.url,
  );
  const mapping = JSON.parse(readFileSync(url, "utf8")) as {
    evolutionLesson: number;
    lessons: Record<string, { courseLessons: number[] }>;
  };
  return [
    ...new Set([
      mapping.evolutionLesson,
      ...mapping.lessons[id]!.courseLessons,
    ]),
  ]
    .sort((a, b) => a - b)
    .join(" ");
}

/** Plays every step and the question, to the win screen. */
async function playToWin(page: Page, id: string) {
  const lesson = lessonFile(id);
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
}

test.describe("comparison cards with the flag off", () => {
  test.skip(ON, "this build has the flag on");

  for (const locale of ["he", "en"]) {
    test(`render nowhere in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("#lessons")).toBeVisible();
      await expect(page.locator("[data-comparison]")).toHaveCount(0);
      for (const id of LESSONS) {
        await page.goto(`/${locale}/teachers/${id}/worksheet`);
        await expect(page.locator('[data-part="5"]')).toBeVisible();
        await expect(page.locator("[data-comparison]")).toHaveCount(0);
      }
    });
  }
});

test.describe("comparison cards with the flag on", () => {
  test.skip(!ON, "needs a build with NEXT_PUBLIC_SHOW_COMPARISONS=true");

  for (const locale of ["he", "en"]) {
    test(`the lessons page explains why to learn from a fly, in ${locale}`, async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const card = page.locator('[data-comparison="why-fly"]');
      await expect(card).toBeVisible();
      await expect(card.locator("[data-course-lessons]")).toHaveAttribute(
        "data-course-lessons",
        "3",
      );
      await expect(card.locator("li")).toHaveCount(3);
    });

    for (const id of LESSONS) {
      test(`${id} ends on its card in ${locale}`, async ({ page }) => {
        test.setTimeout(600_000);
        await page.setViewportSize(DESKTOP);
        await page.goto(`/${locale}/modules/${id}`);
        await toMission(page);
        await playToWin(page, id);
        const card = page.locator(`[data-comparison="${id}"]`);
        await expect(card).toBeVisible();
        await expect(card.locator("[data-course-lessons]")).toHaveAttribute(
          "data-course-lessons",
          courseLessons(id),
        );
        // The fly, mammals, birds, what they share, and a question.
        await expect(card.locator("dd")).toHaveCount(5);
        for (const text of await card.locator("dd").allInnerTexts()) {
          expect(text.trim()).not.toBe("");
        }
      });
    }
  }
});
