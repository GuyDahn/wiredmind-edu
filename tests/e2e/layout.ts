import type { Page } from "@playwright/test";

/** Lifts the safety net, then names every element that reaches past either edge. */
export async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    for (const el of [document.documentElement, document.body]) {
      el.style.overflowX = "visible";
    }
    const width = window.innerWidth;
    // An element inside its own scroller can't widen the page, and can
    // still be reached. One cut off by an `overflow: hidden` parent can't,
    // so that still counts.
    const scrolled = (el: Element) => {
      for (
        let node = el.parentElement;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const { overflowX } = getComputedStyle(node);
        if (overflowX === "auto" || overflowX === "scroll") return true;
      }
      return false;
    };
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return false;
        return (box.right > width + 1 || box.left < -1) && !scrolled(el);
      })
      .map((el) => {
        const box = el.getBoundingClientRect();
        const name = el.id ? `#${el.id}` : "";
        const text = (el.textContent ?? "").trim().slice(0, 40);
        return `${el.tagName.toLowerCase()}${name} [${Math.round(box.left)}, ${Math.round(box.right)}] "${text}"`;
      });
    const scrollWidth = document.documentElement.scrollWidth;
    for (const el of [document.documentElement, document.body]) {
      el.style.overflowX = "";
    }
    return { scrollWidth, width, offenders };
  });
}
