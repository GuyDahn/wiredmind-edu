import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * pnpm art:placeholders
 *
 * Draws the placeholder pictures for the lesson stories into
 * apps/web/public/art/story/, one SVG per panel, named
 * <lesson>-<panel>.svg. They are stand-ins: plain shapes that put the right
 * things in the right places so the layout can be judged. Commissioned art
 * replaces each file and keeps its name (docs/art-brief.md). No words go in
 * a picture; captions and speech bubbles are text on the page.
 */

const W = 800;
const H = 600;
const INK = "#1f2937";
const CUTICLE = "#b7793a";
const EYE = "#b03a24";
const WING = "#dfe6f5";

type Mood = "calm" | "alert" | "glad";
type Fly = {
  x: number;
  y: number;
  /** 1 draws the fly about 260 px long. */
  size?: number;
  /** Faces left instead of right. */
  flip?: boolean;
  /** Degrees, nose up when positive. */
  tilt?: number;
  flying?: boolean;
  mood?: Mood;
};

/** The fly, side on, in the same few shapes every time so it reads as one character. */
function fly({
  x,
  y,
  size = 1,
  flip = false,
  tilt = 0,
  flying = false,
  mood = "calm",
}: Fly): string {
  const legs = flying
    ? `<path d="M-30 30q-10 26-34 30M0 34q-4 28-26 36M28 30q6 24-10 38" />`
    : `<path d="M-34 28-58 78M-2 34l-6 46M30 28l26 50" />`;
  const pupil =
    mood === "alert"
      ? `<circle cx="84" cy="-14" r="9" fill="#fff"/><circle cx="87" cy="-14" r="4" fill="${INK}"/>`
      : mood === "glad"
        ? `<path d="M76-12q8-9 16 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`
        : `<circle cx="85" cy="-13" r="6" fill="#fff"/><circle cx="87" cy="-13" r="3" fill="${INK}"/>`;
  const blur = flying
    ? `<path d="M-70-64q40-34 96-22M-64-84q44-30 104-12" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".35"/>`
    : "";
  return `<g transform="translate(${x} ${y}) rotate(${-tilt}) scale(${flip ? -size : size} ${size})" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
  <g fill="none">${legs}</g>
  <ellipse cx="-74" cy="6" rx="64" ry="34" fill="${CUTICLE}"/>
  <path d="M-96-24v60M-70-28v68M-44-24v60" fill="none" stroke-width="4" opacity=".55"/>
  <path d="M-10-26q-70-${flying ? 96 : 40}-150-${flying ? 70 : 6}q60 34 150 ${flying ? 70 : 6}z" fill="${WING}" fill-opacity=".8"/>
  ${blur}
  <ellipse cx="10" cy="0" rx="44" ry="36" fill="${CUTICLE}"/>
  <circle cx="72" cy="-8" r="34" fill="${CUTICLE}"/>
  <ellipse cx="80" cy="-12" rx="22" ry="26" fill="${EYE}"/>
  ${pupil}
  <path d="M98-30q14-16 26-12M100-24q18-6 28 4" fill="none" stroke-width="4"/>
</g>`;
}

const room = (wall: string, floor: string, at = 470) =>
  `<rect width="${W}" height="${H}" fill="${wall}"/><rect y="${at}" width="${W}" height="${H - at}" fill="${floor}"/><path d="M0 ${at}H${W}" stroke="${INK}" stroke-width="5"/>`;

const peach = (x: number, y: number, r = 70) =>
  `<g stroke="${INK}" stroke-width="5" stroke-linejoin="round"><circle cx="${x}" cy="${y}" r="${r}" fill="#f6a35c"/><path d="M${x} ${y - r}q-14 ${r}-4 ${r * 1.9}" fill="none" opacity=".5"/><path d="M${x + 4} ${y - r}q30-34 62-18q-26 26-62 18z" fill="#6fae5a"/></g>`;

const smell = (x: number, y: number, n = 3, reach = 150) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<path d="M${x + i * 26} ${y - i * 22}q${reach / 4}-34 ${reach / 2} 0t${reach / 2} 0" fill="none" stroke="#e58a3a" stroke-width="6" stroke-linecap="round" opacity="${0.85 - i * 0.2}"/>`,
  ).join("");

const windowFrame = (x: number, y: number, w: number, h: number) =>
  `<g stroke="${INK}" stroke-width="5"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cfe8f7"/><path d="M${x + w / 2} ${y}v${h}M${x - 16} ${y + h}h${w + 32}"/></g>`;

const light = (x: number) =>
  `<path d="M${x - 14} 150h28v320h-28z" fill="#fff3b0" stroke="${INK}" stroke-width="5"/><path d="M${x} 300L${x - 420} 140M${x} 300L${x - 440} 320M${x} 300L${x - 400} 470" stroke="#fde68a" stroke-width="18" stroke-linecap="round" opacity=".6"/>`;

const wind = (x: number, y: number) =>
  `<g fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round">${[0, 34, 68].map((d) => `<path d="M${x} ${y + d}h${110 - d}q30 0 30-22"/>`).join("")}</g>`;

const swatter = (x: number, y: number, turn: number) =>
  `<g transform="translate(${x} ${y}) rotate(${turn})" stroke="${INK}" stroke-width="5" stroke-linejoin="round"><rect x="-80" y="-100" width="160" height="200" rx="18" fill="#7c93b8"/><path d="M-40-100v200M0-100v200M40-100v200M-80-50h160M-80 0h160M-80 50h160" stroke-width="3" opacity=".6"/><path d="M0 100v230" stroke-width="16" stroke-linecap="round"/></g>`;

const glass = (x: number, y: number) =>
  `<path d="M${x - 70} ${y}h140l-18 180h-104z" fill="#e2f1f8" fill-opacity=".8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;

const thought = (x: number, y: number, inner: string) =>
  `<g stroke="${INK}" stroke-width="5" fill="#fff"><circle cx="${x - 130}" cy="${y + 110}" r="9"/><circle cx="${x - 100}" cy="${y + 78}" r="15"/><ellipse cx="${x}" cy="${y}" rx="120" ry="84"/></g>${inner}`;

/** A row of cells, some lit: the brain's side of the story, for the last panel. */
const cells = (x: number, y: number, lit: string, on: number[]) =>
  Array.from(
    { length: 7 },
    (_, i) =>
      `<circle cx="${x + i * 44}" cy="${y}" r="15" fill="${on.includes(i) ? lit : "#cbd5e1"}" stroke="${INK}" stroke-width="4"/>`,
  ).join("");

const PANELS: Record<string, string> = {
  bridge: `${room("#eef2f7", "#d9e0ea", 500)}${fly({ x: 400, y: 410, size: 1.5, mood: "glad" })}<circle cx="512" cy="390" r="130" fill="none" stroke="${INK}" stroke-width="10"/><path d="M604 482l96 96" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>`,

  "smell-memory-ripe": `${room("#fbefd9", "#e8d3ae")}${windowFrame(470, 190, 260, 280)}${peach(600, 400)}${smell(300, 380)}`,
  "smell-memory-sniff": `${room("#fbefd9", "#e8d3ae")}${smell(470, 360, 3, 220)}${fly({ x: 280, y: 380, size: 1.2, flying: true, mood: "alert" })}`,
  "smell-memory-recall": `${room("#fbefd9", "#e8d3ae")}${fly({ x: 230, y: 420, mood: "calm" })}${thought(560, 300, peach(560, 304, 44))}`,
  "smell-memory-land": `${room("#fbefd9", "#e8d3ae")}${windowFrame(470, 190, 260, 280)}${peach(600, 400)}${fly({ x: 470, y: 300, size: 0.9, flying: true, tilt: -18, mood: "glad" })}`,
  "smell-memory-ending": `${room("#fbefd9", "#e8d3ae")}${peach(640, 400, 56)}${fly({ x: 250, y: 420, mood: "glad" })}${cells(270, 250, "#409eed", [1, 4])}${cells(270, 300, "#db4775", [3])}`,

  "compass-dawn": `${room("#e6ecf5", "#c9d3e2")}${light(680)}${fly({ x: 200, y: 425, mood: "calm" })}`,
  "compass-heading": `${room("#e6ecf5", "#c9d3e2")}${light(700)}${fly({ x: 300, y: 360, flying: true, mood: "calm" })}<path d="M450 356h130m-26-22 26 22-26 22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  "compass-gust": `${room("#e6ecf5", "#c9d3e2")}${light(700)}${wind(90, 250)}${fly({ x: 380, y: 380, flying: true, tilt: 34, mood: "alert" })}`,
  "compass-hold": `${room("#e6ecf5", "#c9d3e2")}${light(700)}${fly({ x: 500, y: 330, size: 0.9, flying: true, mood: "glad" })}<path d="M230 440q110-10 180-80" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round"/>`,
  "compass-ending": `${room("#e6ecf5", "#c9d3e2")}${fly({ x: 230, y: 420, mood: "glad" })}<g transform="translate(570 320)" stroke="${INK}" stroke-width="5"><circle r="100" fill="#fff"/><circle r="62" fill="#e6ecf5"/><path d="M0-100v38M0 62v38M-100 0h38M62 0h38" /><path d="M-22-98a100 100 0 0 1 60 6l-14 34a62 62 0 0 0-37-4z" fill="#34d399"/></g>`,

  "escape-rest": `${room("#e9f3ec", "#cfe0d4")}${glass(520, 290)}${fly({ x: 500, y: 250, size: 0.8, mood: "calm" })}`,
  "escape-shadow": `${room("#e9f3ec", "#cfe0d4")}<ellipse cx="500" cy="330" rx="330" ry="210" fill="#1f2937" opacity=".22"/>${glass(520, 290)}${fly({ x: 500, y: 250, size: 0.8, mood: "alert" })}`,
  "escape-leap": `${room("#e9f3ec", "#cfe0d4")}${glass(560, 290)}${swatter(600, 250, 28)}${fly({ x: 280, y: 290, flying: true, tilt: 30, flip: true, mood: "alert" })}<path d="M470 300q-60 30-110 6" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round"/>`,
  "escape-safe": `${room("#e9f3ec", "#cfe0d4")}${glass(580, 290)}${swatter(580, 330, 62)}${fly({ x: 190, y: 330, size: 0.75, flying: true, flip: true, mood: "glad" })}`,
  "escape-ending": `${room("#e9f3ec", "#cfe0d4")}${fly({ x: 240, y: 420, mood: "glad" })}${cells(420, 250, "#38bdf8", [0, 1, 2, 3, 4, 5, 6])}<path d="M552 268v130" stroke="#f87171" stroke-width="12" stroke-linecap="round"/>${cells(464, 420, "#facc15", [1, 2, 3])}`,
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "apps", "web", "public", "art", "story");
mkdirSync(out, { recursive: true });
for (const [name, body] of Object.entries(PANELS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>\n`;
  writeFileSync(path.join(out, `${name}.svg`), svg);
}
console.log(
  `Drew ${Object.keys(PANELS).length} placeholder panels into ${path.relative(root, out)}`,
);
