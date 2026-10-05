"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FOCUS_RING } from "./panel.js";
import type { TermId } from "./terms.js";

/**
 * A scientific term in lesson text. A tap, Enter, or Space opens its
 * one-sentence explanation right under the line it sits on; Escape, a second
 * tap, or a tap anywhere else closes it. The explanation fills a live region,
 * so a screen reader says it as it opens.
 *
 * The paragraph around it must be positioned (`relative`): the explanation
 * takes that paragraph's width, so it never reaches past a phone's edge.
 */
export function Term({ id, children }: { id: TermId; children: ReactNode }) {
  const t = useTranslations("terms");
  const ui = useTranslations("viewer.terms");
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const wrap = useRef<HTMLSpanElement>(null);
  const term = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const name = t(`${id}.name`);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      term.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const el = term.current;
    const parent = el?.offsetParent;
    if (el && parent) {
      // A term can wrap, so measure from the last line it reaches.
      const lines = el.getClientRects();
      const last = lines[lines.length - 1] ?? el.getBoundingClientRect();
      setTop(last.bottom - parent.getBoundingClientRect().top);
    }
    setOpen((value) => !value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  }

  return (
    <span ref={wrap} data-tap-target="text">
      {/* A span, not a <button>: a button never wraps, and a long term on a
          phone has to. */}
      <span
        ref={term}
        role="button"
        tabIndex={0}
        data-term={id}
        aria-expanded={open}
        aria-controls={tipId}
        aria-label={ui("hint", { term: name })}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`cursor-help rounded-sm font-semibold text-fg underline decoration-fg-subtle decoration-dotted underline-offset-4 hover:decoration-fg ${FOCUS_RING}`}
      >
        {children}
      </span>
      <span id={tipId} role="status">
        {open ? (
          <span
            data-term-tip={id}
            style={{ top }}
            className="absolute inset-x-0 z-20 mt-2 flex flex-col gap-1 rounded-xl border border-border-strong bg-surface p-3 text-start text-base leading-snug font-normal text-fg-muted shadow-lg classroom:text-xl"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="pt-2 text-sm font-semibold text-fg classroom:text-lg">
                {name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  term.current?.focus();
                }}
                className={`-my-1 -me-1 flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm text-fg-subtle hover:text-fg ${FOCUS_RING}`}
              >
                {ui("close")}
              </button>
            </span>
            <span>{t(`${id}.text`)}</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}
