"use client";

import * as React from "react";
import { useDeviceEnvironment } from "@/components/providers/device-environment-provider";
import { installDesktopZoomShield } from "@/lib/platform-bridge";

const FIELD_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);
const FOCUS_SETTLE_MS = 50;

function isField(element: Element | null): boolean {
  return Boolean(element && FIELD_TAGS.has(element.tagName));
}

function normalizeHorizontalViewport() {
  if (typeof window === "undefined") return;

  const offsetLeft = window.visualViewport?.offsetLeft ?? 0;
  const scrolledX = window.scrollX;
  if (Math.abs(offsetLeft) < 1 && Math.abs(scrolledX) < 1) return;

  // Solo corrige la deriva lateral: el desplazamiento vertical del documento
  // se conserva para no saltar al inicio de la página.
  window.scrollTo({
    left: 0,
    top: window.scrollY,
    behavior: "instant" as ScrollBehavior,
  });
}

/**
 * Guardián del viewport visual y del perímetro de gestos del sistema.
 *
 * - Tras cerrar el teclado virtual, corrige cualquier deriva lateral que WebKit
 *   deje en `visualViewport.offsetLeft` (la vista quedaba "encuadrada" a un
 *   costado y sin forma de volver).
 * - Bloquea `gesturestart/change/end` de iOS para sostener la escala 1.0 sin
 *   interferir con el scroll vertical ni con el arrastre de cartas.
 * - Instala el escudo de zoom de `platform-bridge` (Electron, PWA y tapete).
 */
export function OsAccessibilityGuard() {
  const { profile } = useDeviceEnvironment();
  const isTouchOS =
    profile.os === "ios" ||
    profile.os === "ipados" ||
    profile.os === "android";

  React.useEffect(() => installDesktopZoomShield(), []);

  React.useEffect(() => {
    if (!isTouchOS) return;

    let settleTimer: number | null = null;
    let frame = 0;

    const scheduleNormalize = () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settleTimer = null;
        if (isField(document.activeElement)) return;
        normalizeHorizontalViewport();
      }, FOCUS_SETTLE_MS);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isField(event.target as Element | null)) return;
      // Espera a que el teclado termine de animarse y a que el foco haya
      // pasado (o no) al siguiente campo.
      window.requestAnimationFrame(scheduleNormalize);
    };

    const handleViewportScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (isField(document.activeElement)) return;
        normalizeHorizontalViewport();
      });
    };

    const blockGesture = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("focusout", handleFocusOut);
    window.visualViewport?.addEventListener("scroll", handleViewportScroll);
    document.addEventListener("gesturestart", blockGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", blockGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", blockGesture, {
      passive: false,
    });

    return () => {
      document.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener(
        "scroll",
        handleViewportScroll
      );
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isTouchOS]);

  return null;
}
