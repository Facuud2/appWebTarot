"use client";

import * as React from "react";
import { useDeviceEnvironment } from "@/components/providers/device-environment-provider";

interface OverlayEntry {
  token: symbol;
  onClose: () => void;
}

const HISTORY_MARKER = "__grimorioMobileOverlay";
const openOverlays: OverlayEntry[] = [];
const staleHistoryMarkers = new Set<string>();
let hasHistoryMarker = false;
let activeHistoryMarkerId: string | null = null;
let nextHistoryMarkerId = 0;
let pendingHistoryCleanup: number | null = null;
let pendingOverlayBacks = 0;
let listeningForPopState = false;

export function shouldIgnoreUnsavedPopstate(): boolean {
  return openOverlays.length > 0 || pendingOverlayBacks > 0;
}

function pushOverlayHistoryEntry(): void {
  const markerId = String(++nextHistoryMarkerId);
  window.history.pushState(
    {
      ...(typeof window.history.state === "object" && window.history.state
        ? window.history.state
        : {}),
      [HISTORY_MARKER]: markerId,
    },
    "",
    window.location.href
  );
  hasHistoryMarker = true;
  activeHistoryMarkerId = markerId;
}

function getHistoryMarkerId(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  const marker = (state as Record<string, unknown>)[HISTORY_MARKER];
  return typeof marker === "string" ? marker : null;
}

function handleOverlayPopState(event: PopStateEvent): void {
  if (pendingOverlayBacks > 0) {
    pendingOverlayBacks -= 1;
    event.stopImmediatePropagation();
    return;
  }

  if (!hasHistoryMarker) {
    const staleMarkerId = getHistoryMarkerId(event.state);
    if (staleMarkerId && staleHistoryMarkers.delete(staleMarkerId)) {
      event.stopImmediatePropagation();
      pendingOverlayBacks += 1;
      window.history.back();
    }
    return;
  }

  event.stopImmediatePropagation();
  hasHistoryMarker = false;
  activeHistoryMarkerId = null;
  const topOverlay = openOverlays.pop();

  if (openOverlays.length > 0) {
    pushOverlayHistoryEntry();
  }

  topOverlay?.onClose();
}

function registerOverlay(entry: OverlayEntry): () => void {
  if (pendingHistoryCleanup !== null) {
    window.clearTimeout(pendingHistoryCleanup);
    pendingHistoryCleanup = null;
  }

  if (!listeningForPopState) {
    window.addEventListener("popstate", handleOverlayPopState);
    listeningForPopState = true;
  }

  openOverlays.push(entry);
  if (
    hasHistoryMarker &&
    activeHistoryMarkerId !== getHistoryMarkerId(window.history.state)
  ) {
    if (activeHistoryMarkerId) {
      staleHistoryMarkers.add(activeHistoryMarkerId);
    }
    hasHistoryMarker = false;
    activeHistoryMarkerId = null;
  }
  if (!hasHistoryMarker) {
    pushOverlayHistoryEntry();
  }

  return () => {
    const index = openOverlays.findIndex(
      (overlay) => overlay.token === entry.token
    );
    if (index >= 0) openOverlays.splice(index, 1);
    if (openOverlays.length > 0 || !hasHistoryMarker) return;

    pendingHistoryCleanup = window.setTimeout(() => {
      pendingHistoryCleanup = null;
      if (openOverlays.length > 0 || !hasHistoryMarker) return;

      const markerId = activeHistoryMarkerId;
      if (!markerId) return;
      if (getHistoryMarkerId(window.history.state) !== markerId) {
        staleHistoryMarkers.add(markerId);
        hasHistoryMarker = false;
        activeHistoryMarkerId = null;
        return;
      }

      hasHistoryMarker = false;
      activeHistoryMarkerId = null;
      pendingOverlayBacks += 1;
      window.history.back();
    }, 0);
  };
}

export function useMobileBackClose(
  isOpen: boolean,
  onClose: () => void
): void {
  const { profile } = useDeviceEnvironment();
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen || !profile.isMobileOrTablet) {
      return undefined;
    }

    return registerOverlay({
      token: Symbol("mobile-overlay"),
      onClose: () => onCloseRef.current(),
    });
  }, [isOpen, profile.isMobileOrTablet]);
}
