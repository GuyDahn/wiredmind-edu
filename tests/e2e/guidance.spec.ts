import { expect, test, type Page } from "@playwright/test";
import { measureOverflow } from "./layout.js";

/**
 * What a teacher with no training leans on: the "How to read this brain"
 * intro, the color key, the term explanations, the "Show me" walkthrough,
 * and class mode. And the promise on the about page: none of it sets a
 * cookie or writes to storage.
 */
const LESSONS = ["smell-memory", "compass", "escape"];
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

const intro = (page: Page) => page.locator("[data-intro-screen]");
const skip = (page: Page) => page.locator("[data-intro-skip]");

/** The lesson, past its intro, with the circuit loaded. */
async function openLesson(page: Page, path: string) {
  await page.goto(path);
  await expect(intro(page)).toBeVisible();
  await skip(page).click();
  await expect(intro(page)).toHaveCount(0);
  await expect(page.locator("[data-cue]").first()).toBeEnabled({
    timeout: 60_000,
  });
}

async function stored(page: Page) {
  return page.evaluate(() => ({
    cookie: document.cookie,
    local: localStorage.length,
    session: sessionStorage.length,
  }));
}

const NOTHING = { cookie: "", local: 0, session: 0 };

test.describe("how to read this brain", () => {
  for (const lesson of LESSONS) {
    test(`opens on ${lesson}, skips in one tap, and reopens from "?"`, async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(`/he/modules/${lesson}`);
      await expect(intro(page)).toHaveAttribute("data-intro-screen", "lines");
      await expect(page.locator('[data-spotlight="canvas"]')).toBeVisible();
      await skip(page).click();
      await expect(intro(page)).toHaveCount(0);
      await expect(page.locator("[data-spotlight]")).toHaveCount(0);

      await page.locator("[data-intro-open]").click();
      await expect(intro(page)).toHaveAttribute("data-intro-screen", "lines");
      // Next walks the screens, each pointing at its own part of the page.
      const next = page.locator("[data-intro-next]");
      await next.click();
      await expect(intro(page)).toHaveAttribute("data-intro-screen", "colors");
      await expect(page.locator('[data-spotlight="legend"]')).toBeVisible();
      await next.click();
      await expect(page.locator('[data-spotlight="buttons"]')).toBeVisible();
      await next.click();
      await expect(intro(page)).toHaveAttribute("data-intro-screen", "time");
      await next.click();
      await expect(intro(page)).toHaveCount(0);
      // It shows again the next time the lesson starts: nothing remembers it.
      await page.reload();
      await expect(intro(page)).toBeVisible();
      expect(await stored(page)).toEqual(NOTHING);
    });
  }

  test("closes on Escape", async ({ page }) => {
    await page.goto("/en/modules/escape");
    await expect(intro(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(intro(page)).toHaveCount(0);
  });
});

test.describe("color key", () => {
  for (const lesson of LESSONS) {
    test(`is open on a desktop on ${lesson}, one row per group`, async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(`/he/modules/${lesson}`);
      const rows = page.locator('[data-intro="legend"] li');
      await expect(rows.first()).toBeVisible();
      // Every group, and the row that says what a glow means.
      expect(await rows.count()).toBeGreaterThanOrEqual(4);
      await expect(rows.last()).toBeVisible();
    });
  }

  test("folds to one button on a phone and opens on a tap", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await openLesson(page, "/he/modules/escape");
    const key = page.locator('[data-intro="legend"]');
    const toggle = key.locator("button");
    await expect(key.locator("li").first()).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(key.locator("li").first()).toBeVisible();
  });
});

test.describe("term explanations", () => {
  for (const lesson of LESSONS) {
    test(`open and close from the keyboard on ${lesson}`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openLesson(page, `/he/modules/${lesson}`);
      const term = page.locator("[data-term]").first();
      await expect(term).toHaveAttribute("role", "button");
      await term.focus();
      await expect(term).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(term).toHaveAttribute("aria-expanded", "true");
      const tip = page.locator("[data-term-tip]");
      await expect(tip).toBeVisible();
      // In a live region, so a screen reader says it as it opens.
      await expect(page.locator('[role="status"]', { has: tip })).toHaveCount(
        1,
      );
      expect((await tip.innerText()).trim().length).toBeGreaterThan(20);
      await page.keyboard.press("Escape");
      await expect(tip).toHaveCount(0);
      await expect(term).toBeFocused();
      await page.keyboard.press("Space");
      await expect(tip).toBeVisible();
      await page.keyboard.press("Space");
      await expect(tip).toHaveCount(0);
    });
  }
});

test.describe("show me how it works", () => {
  for (const lesson of LESSONS) {
    test(`plays ${lesson} to its question, text in step`, async ({ page }) => {
      test.setTimeout(420_000);
      await page.setViewportSize(DESKTOP);
      await openLesson(page, `/en/modules/${lesson}`);
      await page.locator("[data-demo-start]").click();
      await expect(page.locator('[data-demo="playing"]')).toBeVisible();
      await expect(page.locator("[data-demo-stop]")).toBeVisible();
      // No cue to tap while it plays: the walkthrough presses for the reader.
      await expect(page.locator("[data-cue]")).toHaveCount(0);
      // The step counter moves on by itself.
      await expect(page.getByText("Step 2 of", { exact: false })).toBeVisible({
        timeout: 120_000,
      });
      // It ends on the check question and hands the lesson back.
      await expect(page.getByRole("group", { name: "Answers" })).toBeVisible({
        timeout: 360_000,
      });
      await expect(page.locator('[data-demo="playing"]')).toHaveCount(0);
      expect(await stored(page)).toEqual(NOTHING);
    });
  }

  test("stops on request and leaves the step to the reader", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(DESKTOP);
    await openLesson(page, "/en/modules/escape");
    await page.locator("[data-demo-start]").click();
    await expect(page.locator('[data-demo="playing"]')).toBeVisible();
    await page.locator("[data-demo-stop]").click();
    await expect(page.locator('[data-demo="playing"]')).toHaveCount(0);
    await expect(page.locator("[data-cue]").first()).toBeEnabled();
  });

  test("opens from a teacher guide's link, in class mode, with no intro", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(DESKTOP);
    await page.goto("/he/teachers/escape");
    const link = page.locator('main a[href*="?r="]').first();
    const href = await link.getAttribute("href");
    expect(href).toContain("mode=class");
    await link.click();
    await expect(page.locator('[data-demo="playing"]')).toBeVisible({
      timeout: 60_000,
    });
    await expect(intro(page)).toHaveCount(0);
    await expect(page.locator('[data-mode="class"]')).toHaveCount(1);
    // Stopping drops the played link from the address; class mode stays.
    await page.locator("[data-demo-stop]").click();
    await expect(page).toHaveURL(/\/he\/modules\/escape\?mode=class$/);
  });
});

test.describe("class mode", () => {
  test("comes from the address: big text, key held open, lesson only", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await openLesson(page, "/he/modules/smell-memory?mode=class");
    await expect(page.locator('[data-mode="class"]')).toHaveCount(1);
    const size = await page
      .locator("[data-term]")
      .first()
      .evaluate((el) =>
        parseFloat(getComputedStyle(el.parentElement!).fontSize),
      );
    expect(size).toBeGreaterThanOrEqual(28);
    const cue = await page.locator("[data-cue]").first().boundingBox();
    expect(cue!.height).toBeGreaterThanOrEqual(72);
    const key = page.locator('[data-intro="legend"]');
    await expect(key.locator("li").first()).toBeVisible();
    await expect(key.locator("button")).toBeDisabled();
    // The panel is simplified: no lesson switcher, no Share.
    await expect(page.locator('[aria-controls="lesson-list"]')).toHaveCount(0);
  });

  test("toggles from the lesson header and lives only in the address", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await openLesson(page, "/he/modules/escape");
    const toggle = page.locator("[data-class-mode]");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\?mode=class$/);
    expect(await stored(page)).toEqual(NOTHING);
    await page.reload();
    await expect(page.locator('[data-mode="class"]')).toHaveCount(1);
    await page.locator("[data-intro-skip]").click();
    await page.locator("[data-class-mode]").click();
    await expect(page).not.toHaveURL(/mode=class/);
    await expect(page.locator('[data-mode="class"]')).toHaveCount(0);
    expect(await stored(page)).toEqual(NOTHING);
  });
});

test("none of it sets a cookie or a storage key", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(DESKTOP);
  await page.goto("/he/modules/escape");
  expect(await stored(page)).toEqual(NOTHING);
  await page.locator("[data-intro-next]").click();
  await skip(page).click();
  await page.locator("[data-intro-open]").click();
  await skip(page).click();
  await page.locator('[data-intro="legend"] button').click();
  await page.locator("[data-class-mode]").click();
  await expect(page.locator("[data-cue]").first()).toBeEnabled({
    timeout: 60_000,
  });
  const term = page.locator("[data-term]").first();
  await term.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.locator("[data-demo-start]").click();
  await expect(page.locator('[data-demo="playing"]')).toBeVisible();
  await page.locator("[data-demo-stop]").click();
  await page.goto("/he/teachers/escape");
  await page.goto("/he/teachers/escape/worksheet");
  expect(await stored(page)).toEqual(NOTHING);
  expect(await page.context().cookies()).toEqual([]);
});

test.describe("no sideways scroll at 390 px, right to left", () => {
  for (const locale of ["he", "ar"]) {
    for (const lesson of LESSONS) {
      test(`${locale} ${lesson}: intro, color key, and class mode`, async ({
        page,
      }) => {
        await page.setViewportSize(PHONE);
        await page.goto(`/${locale}/modules/${lesson}?mode=class`);
        await expect(page.locator('[data-mode="class"]')).toHaveCount(1);
        const check = async (what: string) => {
          const { scrollWidth, width, offenders } = await measureOverflow(page);
          expect(offenders, `${what}\n${offenders.join("\n")}`).toEqual([]);
          expect(scrollWidth, what).toBeLessThanOrEqual(width);
        };
        // Every intro screen, the key held open by class mode throughout.
        const next = page.locator("[data-intro-next]");
        for (const screen of ["lines", "colors", "buttons", "time"]) {
          await expect(intro(page)).toHaveAttribute(
            "data-intro-screen",
            screen,
          );
          await expect(
            page.locator('[data-intro="legend"] li').first(),
          ).toBeVisible();
          await check(`intro: ${screen}`);
          await next.click();
        }
        await expect(intro(page)).toHaveCount(0);
        await check("step 1 in class mode");
        // And with a term's explanation open.
        const term = page.locator("[data-term]").first();
        await term.click();
        await expect(page.locator("[data-term-tip]")).toBeVisible();
        await check("term explanation");
        // Outside class mode too, with the key opened by hand.
        await page.locator("[data-class-mode]").click();
        await page.locator('[data-intro="legend"] button').click();
        await check("color key open, class mode off");
      });
    }
  }
});
