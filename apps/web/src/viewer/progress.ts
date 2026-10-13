import { create } from "zustand";

/**
 * Which missions this visit has finished, for the map on the lessons page.
 * It lives in memory and nowhere else: no cookie, no storage, so it is gone
 * on a reload. That is the promise the About page makes.
 */
type ProgressState = {
  done: Readonly<Record<string, true>>;
  finish: (lessonId: string) => void;
};

export const useProgress = create<ProgressState>((set) => ({
  done: {},
  finish: (lessonId) =>
    set((state) =>
      state.done[lessonId]
        ? state
        : { done: { ...state.done, [lessonId]: true } },
    ),
}));
