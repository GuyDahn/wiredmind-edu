"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { useViewerStore } from "./store.js";
import { hasWebgl } from "./webgl.js";

/**
 * Keeps a 3D scene that cannot start from taking the whole page down. The
 * story, the lesson's words and the menus do not need WebGL, so they stay,
 * and the stage says why the brain is missing.
 */
export function SceneGuard({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    const ok = hasWebgl();
    setSupported(ok);
    if (!ok) useViewerStore.getState().setStatus("error", "noWebgl");
  }, []);
  if (!supported) return null;
  return <SceneBoundary>{children}</SceneBoundary>;
}

/** Catches a scene that crashed after the check passed, such as a lost context at start. */
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error(error);
    useViewerStore
      .getState()
      .setStatus("error", hasWebgl() ? "failed" : "noWebgl");
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
