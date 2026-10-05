import { expect, test, type Page } from "@playwright/test";

/**
 * The teacher guides and worksheets print on A4: no site header, footer, or
 * canvas, black on white whatever the theme, and right to left in Hebrew.
 * Each is also held to a picture of its printed self.
 */
// A4 at 96 dpi, less the page margins the stylesheet sets.
const SHEET = { width: 680, height: 960 };

const PAGES = [
  { name: "guide", path: "/teachers/escape" },
  { name: "worksheet", path: "/teachers/escape/worksheet" },
];

async function openPrinted(page: Page, path: string, dark: boolean) {
  await page.setViewportSize(SHEET);
  await page.emulateMedia({
    media: "print",
    colorScheme: dark ? "dark" : "light",
  });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

for (const locale of ["he", "en"]) {
  for (const { name, path } of PAGES) {
    test.describe(`${locale} ${name} on paper`, () => {
      test("prints black on white without the site around it", async ({
        page,
      }) => {
        await openPrinted(page, `/${locale}${path}`, true);
        await expect(page.locator("header").first()).toBeHidden();
        await expect(page.locator("footer")).toBeHidden();
        await expect(page.locator("canvas")).toHaveCount(0);
        await expect(page.locator("main button")).toBeHidden();
        const paper = await page.evaluate(() => {
          const ink = new Set<string>();
          for (const el of document.querySelectorAll("main *")) {
            const box = el.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) continue;
            if ((el.textContent ?? "").trim() === "") continue;
            ink.add(getComputedStyle(el).color);
          }
          return {
            page: getComputedStyle(document.documentElement).backgroundColor,
            body: getComputedStyle(document.body).backgroundColor,
            ink: [...ink],
            dir: getComputedStyle(document.querySelector("main")!).direction,
          };
        });
        expect(paper.page).toBe("rgb(255, 255, 255)");
        expect(paper.body).toBe("rgb(255, 255, 255)");
        expect(paper.ink).toEqual(["rgb(0, 0, 0)"]);
        expect(paper.dir).toBe(locale === "he" ? "rtl" : "ltr");
        // Nothing wider than the sheet.
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(SHEET.width);
      });

      test("matches its printed page", async ({ page }) => {
        await openPrinted(page, `/${locale}${path}`, false);
        await expect(page).toHaveScreenshot(`${name}-escape-${locale}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });
    });
  }
}

test("the worksheet fits one A4 sheet", async ({ page }) => {
  for (const locale of ["he", "en"]) {
    await page.goto(`/${locale}/teachers/smell-memory/worksheet`);
    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length, locale).toBe(1);
  }
});
