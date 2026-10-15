/**
 * The home page montage: short muted clips, crossfaded. It is data
 * (content/hero-clips.json), so a clip can be added without touching code.
 *
 * Every clip carries a credit, shown over it while it plays. Ours are
 * recorded from the lessons (pnpm hero:clips). A clip from someone else's
 * project goes in only with a license or written permission that allows it,
 * and with the credit its owner asked for: docs/hero-montage-sources.md.
 */
export type HeroClip = {
  id: string;
  /** A video file under public/, or an absolute https URL. */
  src: string;
  /** The still shown before the video loads, and instead of it with reduced motion. */
  poster: string;
  /** Seconds on screen. */
  duration: number;
  /** Key under landing.montage.clips, for clips that have a translated caption. */
  caption: string | null;
  /** Who made the clip and under what license. Shown as written, in every language. */
  credit: string;
  /** Where the credit links: a page of this site (starts with /) or the owner's own. */
  creditUrl: string;
};

/** A clip is a glance, not a film. */
export const MIN_CLIP_SECONDS = 1.5;
export const MAX_CLIP_SECONDS = 2;
/** Captions the site has words for, under landing.montage.clips. */
export const CLIP_CAPTIONS = ["escape", "compass", "smell", "zoom"] as const;

const LOCATION = /^(\/[^/]|https:\/\/)/;

export function readHeroClips(value: unknown): HeroClip[] {
  const clips = (value as { clips?: unknown } | null)?.clips;
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error("hero-clips.json needs a list of clips");
  }
  const seen = new Set<string>();
  return clips.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const at = `hero-clips.json clips[${index}]`;
    const text = (field: string) => {
      const found = row[field];
      if (typeof found !== "string" || found.trim() === "") {
        throw new Error(`${at} is missing ${field}`);
      }
      return found.trim();
    };
    const id = text("id");
    if (seen.has(id)) throw new Error(`${at} repeats the id ${id}`);
    seen.add(id);
    const duration = row.duration;
    if (
      typeof duration !== "number" ||
      duration < MIN_CLIP_SECONDS ||
      duration > MAX_CLIP_SECONDS
    ) {
      throw new Error(
        `${at} must run ${MIN_CLIP_SECONDS} to ${MAX_CLIP_SECONDS} seconds`,
      );
    }
    for (const field of ["src", "poster", "creditUrl"]) {
      if (!LOCATION.test(text(field))) {
        throw new Error(`${at}.${field} must start with / or https://`);
      }
    }
    const caption = row.caption === undefined ? null : text("caption");
    if (caption !== null && !CLIP_CAPTIONS.some((known) => known === caption)) {
      throw new Error(`${at} has no caption called ${caption}`);
    }
    return {
      id,
      src: text("src"),
      poster: text("poster"),
      duration,
      caption,
      // No clip plays without saying whose it is.
      credit: text("credit"),
      creditUrl: text("creditUrl"),
    };
  });
}
