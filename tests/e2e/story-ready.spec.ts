import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";
import { measureOverflow } from "./layout.js";
import { story } from "./lesson.js";

/**
 * The story's buttons are on screen before the page has hydrated. Until it
 * has, they must look and say that they are loading, and a tap on them must
 * not be lost: it is held and played back once they work. Leaving the story
 * before the 3D is in shows how far it has got, not a still, empty stage.
 *
 * Run on a 4× slower CPU, like a mid-range phone. The page's scripts (or its
 * circuit files) are held back behind a gate as well, so the moment before
 * hydration lasts exactly as long as a test needs it to.
 */
const LESSONS = ["smell-memory", "compass", "escape"] as const;
const PHONE = { width: 390, height: 844 };

type Messages = {
  viewer: {
    story: { next: string; loading: string };
    stage: { loading: string };
  };
};

function messages(locale: string): Messages {
  const url = new URL(
    `../../apps/web/messages/${locale}.json`,
    import.meta.url,
  );
  return JSON.parse(readFileSync(url, "utf8")) as Messages;
}

function panels(id: string): string[] {
  const url = new URL(
    `../../apps/web/content/modules/${id}.json`,
    import.meta.url,
  );
  return (
    JSON.parse(readFileSync(url, "utf8")) as { story: { panels: string[] } }
  ).story.panels;
}

async function slowCpu(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

/** Holds every request matching `pattern` until `open()` is called. */
async function gate(page: Page, pattern: string) {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  await page.route(pattern, async (route: Route) => {
    await opened;
    await route.continue();
  });
  return open;
}

const next = (page: Page) => page.locator("[data-story-next]");

for (const id of LESSONS) {
  test.describe(id, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(PHONE);
      await slowCpu(page);
    });

    test("a tap before hydration is held, then applied", async ({ page }) => {
      const copy = messages("he").viewer.story;
      const [first, second] = panels(id);
      const scripts = await gate(page, "**/_next/static/chunks/**");
      await page.goto(`/he/modules/${id}`, { waitUntil: "commit" });

      // Painted, not yet live: it says so, and does not look like a button.
      await expect(next(page)).toBeVisible();
      await expect(next(page)).toHaveAttribute("aria-busy", "true");
      await expect(next(page)).toHaveAttribute("aria-disabled", "true");
      await expect(next(page)).toHaveText(copy.loading);
      await expect(next(page).locator("[data-loading-bar]")).toBeVisible();
      await expect(page.locator("[data-story-skip]")).toHaveAttribute(
        "aria-disabled",
        "true",
      );

      // As soon as it is visible, the way an impatient student would.
      await next(page).click({ force: true });
      await expect(next(page)).toHaveAttribute("data-queued", "");
      await expect(story(page)).toHaveAttribute("data-story", first!);

      scripts();
      await expect(story(page)).toHaveAttribute("data-story", second!, {
        timeout: 30_000,
      });
      // Live now, and nothing left of the loading state.
      await expect(next(page)).not.toHaveAttribute("aria-busy");
      await expect(next(page)).not.toHaveAttribute("aria-disabled");
      await expect(next(page)).not.toHaveAttribute("data-queued");
      await expect(next(page)).toHaveText(copy.next);
      await expect(story(page).locator("[data-loading-bar]")).toHaveCount(0);
    });

    test("every early tap counts, in order", async ({ page }) => {
      const [, , third] = panels(id);
      const scripts = await gate(page, "**/_next/static/chunks/**");
      await page.goto(`/he/modules/${id}`, { waitUntil: "commit" });
      await expect(next(page)).toBeVisible();
      await next(page).click({ force: true });
      await next(page).click({ force: true });
      scripts();
      await expect(story(page)).toHaveAttribute("data-story", third!, {
        timeout: 30_000,
      });
    });

    test("Next works the moment it is visible", async ({ page }) => {
      const [, second] = panels(id);
      // No gate: just the slow CPU, and a tap as early as Playwright can.
      await page.goto(`/he/modules/${id}`, { waitUntil: "commit" });
      await expect(next(page)).toBeVisible();
      await next(page).click({ force: true });
      await expect(story(page)).toHaveAttribute("data-story", second!, {
        timeout: 30_000,
      });
    });
  });
}

test("leaving the story before the 3D is in shows its progress", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await slowCpu(page);
  const files = await gate(page, "**/data/**");
  await page.goto("/he/modules/escape");
  await expect(next(page)).not.toHaveAttribute("aria-busy", {
    timeout: 30_000,
  });
  await page.locator("[data-story-skip]").click();
  await expect(story(page)).toHaveCount(0);
  const loading = page.locator("[data-stage-loading]");
  await expect(loading).toBeVisible({ timeout: 30_000 });
  await expect(loading).toHaveAttribute("role", "progressbar");
  await expect(loading).toContainText(messages("he").viewer.stage.loading);
  await expect(loading.locator("[data-loading-bar]")).toBeVisible();

  files();
  await expect(loading).toHaveCount(0, { timeout: 120_000 });
});

test("the loading bar holds still with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await gate(page, "**/_next/static/chunks/**");
  await page.goto("/he/modules/escape", { waitUntil: "commit" });
  const sweep = next(page).locator("[data-loading-bar] > span");
  await expect(sweep).toBeVisible();
  expect(await sweep.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "none",
  );
  await context.close();
});

for (const locale of ["he", "ar"]) {
  test(`${locale}: no sideways scroll at 390 px, loading or live`, async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const scripts = await gate(page, "**/_next/static/chunks/**");
    await page.goto(`/${locale}/modules/escape`, { waitUntil: "commit" });
    await expect(next(page)).toHaveAttribute("aria-busy", "true");
    let overflow = await measureOverflow(page);
    expect(overflow.offenders, overflow.offenders.join("\n")).toEqual([]);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width);

    scripts();
    await expect(next(page)).not.toHaveAttribute("aria-busy", {
      timeout: 30_000,
    });
    overflow = await measureOverflow(page);
    expect(overflow.offenders, overflow.offenders.join("\n")).toEqual([]);

    // The stage's progress card, while the circuit loads.
    await page.locator("[data-story-skip]").click();
    await expect(story(page)).toHaveCount(0);
    overflow = await measureOverflow(page);
    expect(overflow.offenders, overflow.offenders.join("\n")).toEqual([]);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width);
  });
}
