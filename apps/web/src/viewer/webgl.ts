/** A canvas, as far as asking it for a 3D context goes. */
type Probe = { getContext(kind: string): unknown };

/**
 * Whether this browser can draw the 3D scene. A browser with hardware
 * acceleration switched off, or a graphics driver it does not trust, hands
 * back no WebGL context (or throws), and three.js cannot start without one.
 */
export function hasWebgl(
  createCanvas: () => Probe = () => document.createElement("canvas"),
): boolean {
  try {
    const canvas = createCanvas();
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
