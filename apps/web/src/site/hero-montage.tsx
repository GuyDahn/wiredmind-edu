"use client";

import { useEffect, useRef, useState } from "react";

export type MontageClip = {
  id: string;
  src: string;
  poster: string;
  /** Seconds on screen. */
  duration: number;
  /** In the reader's language, or null for a clip that has none. */
  caption: string | null;
  /** "Clip: …", already filled in. */
  credit: string;
  creditUrl: string;
  /** The credit leaves the site, so it opens a new tab and says so. */
  external: boolean;
};

const FADE_MS = 450;

/**
 * Short muted clips, one after another, each fading into the next, with its
 * credit over it. It plays only while it is on screen, can always be paused,
 * and for readers who ask for reduced motion it is a still picture until
 * they press play themselves.
 */
export function HeroMontage({
  clips,
  copy,
}: {
  clips: MontageClip[];
  copy: { label: string; pause: string; play: string; newTab: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [at, setAt] = useState(0);
  const [wanted, setWanted] = useState(false);
  const [inView, setInView] = useState(false);
  /** The page has finished loading, so the videos may start to. Stills until then. */
  const [settled, setSettled] = useState(false);
  /** Clips whose video could not play here; their still stands in. */
  const [broken, setBroken] = useState<Record<string, true>>({});
  const playing = wanted && inView && settled;
  const clip = clips[at] ?? clips[0];

  // It starts by itself, unless the reader asked for less motion.
  useEffect(() => {
    setWanted(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.35 },
    );
    observer.observe(el);
    // Video comes once the page itself has loaded, so it never competes with
    // it. Not later: browsers count a clip's first moving frame as the page's
    // main paint, so a clip held back is a page that looks slow to load.
    const settle = () => setSettled(true);
    if (document.readyState === "complete") settle();
    else window.addEventListener("load", settle, { once: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("load", settle);
    };
  }, []);

  useEffect(() => {
    videos.current.forEach((video, index) => {
      if (!video) return;
      if (index === at && playing) {
        video.currentTime = 0;
        // A browser that will not play it leaves the still up.
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
    if (!playing || !clip || clips.length < 2) return;
    const timer = setTimeout(
      () => setAt((value) => (value + 1) % clips.length),
      clip.duration * 1000,
    );
    return () => clearTimeout(timer);
  }, [at, playing, clip, clips.length]);

  if (!clip) return null;
  return (
    <div
      ref={box}
      role="group"
      aria-label={copy.label}
      data-montage={playing ? "playing" : "still"}
      data-montage-clip={clip.id}
      className="relative overflow-hidden rounded-3xl border border-border bg-zinc-950"
    >
      {/* Clips are pictures of a real fly, which never mirror for right-to-left languages. */}
      <div className="relative aspect-[4/3]" dir="ltr">
        {clips.map((item, index) => {
          // Every clip shows its still from the first paint, the hidden ones
          // invisibly, and only the clip on screen fetches its video.
          // Browsers count the first visible paint of an element as a
          // candidate for the page's main paint; drawn first while hidden,
          // the clips after the first never are, so a montage that keeps
          // moving does not make the page look slow to load.
          const current = index === at;
          return (
            <div
              key={item.id}
              aria-hidden={index !== at}
              className="absolute inset-0 transition-opacity ease-linear motion-reduce:transition-none"
              style={{
                opacity: index === at ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
              }}
            >
              {/* One element per clip: its still is the video's poster, so
                  the still is the first thing painted and the clip that
                  follows is the same picture moving, not a new one on top. */}
              <video
                ref={(el) => {
                  videos.current[index] = el;
                }}
                poster={item.poster}
                src={
                  broken[item.id] || !(wanted && settled && current)
                    ? undefined
                    : item.src
                }
                width={640}
                height={480}
                muted
                playsInline
                loop
                preload={wanted && settled && current ? "auto" : "none"}
                disablePictureInPicture
                tabIndex={-1}
                onError={() =>
                  setBroken((value) => ({ ...value, [item.id]: true }))
                }
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10">
        <p className="min-w-0 text-start text-zinc-100">
          {clip.caption ? (
            <span
              data-montage-caption=""
              className="block text-base leading-snug font-semibold"
            >
              {clip.caption}
            </span>
          ) : null}
          <a
            data-montage-credit=""
            href={clip.creditUrl}
            {...(clip.external ? { target: "_blank", rel: "noopener" } : {})}
            className="pointer-events-auto inline-flex min-h-11 items-center text-xs text-zinc-300 underline decoration-zinc-400/60 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span dir="auto">{clip.credit}</span>
            {clip.external ? (
              <span className="sr-only"> {copy.newTab}</span>
            ) : null}
          </a>
        </p>
        <button
          type="button"
          data-montage-toggle=""
          aria-pressed={!wanted}
          aria-label={wanted ? copy.pause : copy.play}
          title={wanted ? copy.pause : copy.play}
          onClick={() => setWanted((value) => !value)}
          className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-950/70 text-zinc-100 backdrop-blur-sm hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4 fill-current"
          >
            {wanted ? (
              <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
            ) : (
              <path d="M4 2.5v11l9-5.5z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
