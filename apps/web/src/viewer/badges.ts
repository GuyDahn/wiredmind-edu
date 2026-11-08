import { requestViewerFrame } from "./commands.js";

/**
 * Labels that sit on the canvas next to a point in the brain: each cell
 * group's number, and the light. The labels are plain HTML over the canvas;
 * the scene moves them to their points every frame it draws.
 */
const elements = new Map<string, HTMLElement>();

/** A ref callback for the label of `anchor`, a group's color name or "light". */
export function badgeRef(anchor: string) {
  return (element: HTMLElement | null) => {
    if (element) elements.set(anchor, element);
    else elements.delete(anchor);
    // A new label has no place until the scene draws again.
    requestViewerFrame();
  };
}

/** Where an anchor is on screen, in CSS pixels from the canvas's top left, or null if behind the camera. */
export type Projector = (anchor: string) => { x: number; y: number } | null;

/** Labels closer than this, in CSS pixels, are nudged apart so each number reads. */
const GAP = 34;

export function placeBadges(project: Projector) {
  const placed: { x: number; y: number }[] = [];
  for (const [anchor, element] of elements) {
    const at = project(anchor);
    if (!at) {
      element.style.visibility = "hidden";
      continue;
    }
    // Groups that sit close together would stack their numbers: step each
    // later one down until it is clear of the ones already placed.
    let { x, y } = at;
    for (let tries = 0; tries < 6; tries++) {
      const hit = placed.find(
        (other) => Math.abs(other.x - x) < GAP && Math.abs(other.y - y) < GAP,
      );
      if (!hit) break;
      y = hit.y + GAP;
      x = hit.x + (x >= hit.x ? GAP * 0.4 : -GAP * 0.4);
    }
    placed.push({ x, y });
    element.style.visibility = "";
    element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
  }
}
