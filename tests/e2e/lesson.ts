import { expect, type Page } from "@playwright/test";

/**
 * Every lesson opens on its story, then the zoom from the fly to a neuron,
 * then the mission. These get a test past the first two, the way a returning
 * student does: one tap each.
 */
export const story = (page: Page) => page.locator("[data-story]");
export const journey = (page: Page) => page.locator("[data-journey-level]");

export async function skipStory(page: Page) {
  await expect(story(page)).toBeVisible();
  await page.locator("[data-story-skip]").click();
  await expect(story(page)).toHaveCount(0);
  await expect(journey(page)).toBeVisible();
}

export async function toMission(page: Page) {
  await skipStory(page);
  await page.locator("[data-journey-skip]").click();
  await expect(journey(page)).toHaveCount(0);
  await expect(page.locator("[data-mission-goal]")).toBeVisible();
}
