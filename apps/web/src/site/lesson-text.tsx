import type { ReactNode } from "react";
import { TERM_IDS } from "../viewer/terms.js";

/**
 * Renderers for a lesson string on a page that is read or printed, not
 * played: each term in bold, each gloss as an aside, nothing to tap.
 */
export const LESSON_TEXT: Record<string, (chunks: ReactNode) => ReactNode> = {
  term: (chunks) => <strong className="font-semibold">{chunks}</strong>,
  gloss: (chunks) => <span>{chunks}</span>,
  ...Object.fromEntries(
    TERM_IDS.map((id) => [
      id,
      (chunks: ReactNode) => (
        <strong className="font-semibold">{chunks}</strong>
      ),
    ]),
  ),
};
