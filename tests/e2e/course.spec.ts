import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Each teacher guide says where its lesson fits the Campus IL brain course,
 * from content/course-mapping.json, in Hebrew and in English.
 */
type Bilingual = { he: string; en: string };
const mapping = JSON.parse(
  readFileSync(
    new URL("../../apps/web/content/course-mapping.json", import.meta.url),
    "utf8",
  ),
) as {
  aligned: Bilingual;
  boxTitle: Bilingual;
  spikes: Bilingual;
  courseLessons: Record<string, Bilingual>;
  lessons: Record<string, { courseLessons: number[]; when: Bilingual }>;
};

for (const locale of ["he", "en"] as const) {
  for (const [id, lesson] of Object.entries(mapping.lessons)) {
    test(`the ${id} guide shows its course box in ${locale}`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/teachers/${id}`);
      const box = page.locator(`[data-course-box="${id}"]`);
      await expect(box).toBeVisible();
      await expect(box.locator("h2")).toHaveText(mapping.boxTitle[locale]);
      await expect(box).toContainText(mapping.aligned[locale]);
      await expect(box).toContainText(lesson.when[locale]);
      await expect(box).toContainText(mapping.spikes[locale]);
      const items = box.locator("[data-course-lesson]");
      await expect(items).toHaveCount(lesson.courseLessons.length);
      for (const [index, number] of lesson.courseLessons.entries()) {
        await expect(items.nth(index)).toHaveAttribute(
          "data-course-lesson",
          String(number),
        );
        await expect(items.nth(index)).toContainText(
          mapping.courseLessons[String(number)]![locale],
        );
      }
    });
  }
}
