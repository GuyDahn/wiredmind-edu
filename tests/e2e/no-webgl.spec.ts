import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { story } from "./lesson.js";

/**
 * A browser with WebGL switched off (hardware acceleration disabled, or a
 * graphics driver it does not trust) cannot draw the brain. The lesson page
 * must say so and keep its words and menus, not crash to the error page.
 */
const LESSONS = ["smell-memory", "compass", "escape"] as const;

function copy(locale: string) {
  const url = new URL(
    `../../apps/web/messages/${locale}.json`,
    import.meta.url,
  );
  return JSON.parse(readFileSync(url, "utf8")) as {
    viewer: { load: { noWebgl: string } };
    errors: { error: { title: string } };
  };
}

for (const lesson of LESSONS) {
  test(`${lesson} explains a missing WebGL instead of crashing`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        kind: string,
        ...rest: unknown[]
      ) {
        if (/webgl/i.test(kind)) return null;
        return (original as (...args: unknown[]) => unknown).call(
          this,
          kind,
          ...rest,
        );
      } as typeof original;
    });
    const en = copy("en");
    await page.goto(`/en/modules/${lesson}`);
    await page.locator("[data-story-skip]").click();
    await expect(story(page)).toHaveCount(0);
    await expect(page.locator("[data-stage] [role=alert]")).toHaveText(
      en.viewer.load.noWebgl,
    );
    await expect(page.getByText(en.errors.error.title)).toHaveCount(0);
    await expect(page.locator("[data-stage] h1")).toBeVisible();
  });
}
