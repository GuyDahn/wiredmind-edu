import { useSyncExternalStore } from "react";

const never = () => () => undefined;

/**
 * False while the server's HTML is all there is (and during hydration), true
 * from the first render after it, and true at once on a page reached by a
 * client-side navigation, where nothing needs hydrating.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}
