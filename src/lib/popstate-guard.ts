"use client";

/**
 * Early popstate guard.
 *
 * The App Router registers its own `popstate` listener from a `useEffect` at the
 * root of the tree. A `popstate` event targets `window`, so every listener on
 * `window` runs in registration order regardless of the capture flag: a guard
 * registered later (for example, from an effect that depends on form state) can
 * no longer stop the router from navigating away.
 *
 * Registering the listener at module evaluation time guarantees it runs before
 * the router's listener, so it can veto an in-flight traversal while a form with
 * unsaved changes is open.
 */
type PopstateGuard = (event: PopStateEvent) => boolean;

let activeGuard: PopstateGuard | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "popstate",
    (event) => {
      const guard = activeGuard;
      if (guard && guard(event)) {
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

/** Returns a cleanup that only unsets the guard if it is still the active one. */
export function setPopstateGuard(guard: PopstateGuard): () => void {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
}
