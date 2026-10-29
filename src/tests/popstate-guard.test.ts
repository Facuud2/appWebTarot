import { afterEach, describe, expect, it, vi } from "vitest";
import { setPopstateGuard } from "@/lib/popstate-guard";

// The guard module registers its listener at import time, exactly as it does in
// the app bundle: before React commits and the App Router attaches its own
// popstate listener.
describe("popstate guard", () => {
  afterEach(() => {
    setPopstateGuard(() => false);
  });

  it("blocks listeners registered after it (the App Router listener)", () => {
    const routerHandler = vi.fn();
    window.addEventListener("popstate", routerHandler);

    const cleanup = setPopstateGuard(() => true);
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(routerHandler).not.toHaveBeenCalled();
    window.removeEventListener("popstate", routerHandler);
    cleanup();
  });

  it("lets the event through when no guard is active", () => {
    const routerHandler = vi.fn();
    window.addEventListener("popstate", routerHandler);

    const cleanup = setPopstateGuard(() => false);
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(routerHandler).toHaveBeenCalledOnce();
    window.removeEventListener("popstate", routerHandler);
    cleanup();
  });

  it("only clears the guard it installed", () => {
    const first = setPopstateGuard(() => true);
    const second = setPopstateGuard(() => false);
    first();

    const routerHandler = vi.fn();
    window.addEventListener("popstate", routerHandler);
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(routerHandler).toHaveBeenCalledOnce();
    window.removeEventListener("popstate", routerHandler);
    second();
  });
});
