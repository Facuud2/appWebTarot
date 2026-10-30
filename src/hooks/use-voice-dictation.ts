"use client";

import * as React from "react";
import { useDeviceEnvironment } from "@/components/providers/device-environment-provider";
import {
  normalizeTarotSpeech,
  removeRepeatedVoicePrefix,
} from "@/lib/voice-normalizer";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseVoiceDictationOptions {
  onTranscript?: (normalizedChunk: string) => void;
}

interface UseVoiceDictationResult {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

let activeRecognition: SpeechRecognitionLike | null = null;
let activeOwner: symbol | null = null;
let activeShouldKeepListeningRef: { current: boolean } | null = null;
/** Limpia el estado local del componente dueño de la sesión activa. */
let activeResetState: (() => void) | null = null;

/**
 * Arranque en espera. Si otro campo está dictando, la sesión nueva no puede
 * llamar a `start()` hasta que la anterior emita `end`: Chrome y WebKit lanzan
 * `InvalidStateError` si se solapan dos sesiones y el micrófono queda muerto
 * hasta recargar la página.
 */
let pendingStart: { owner: symbol; run: () => void } | null = null;
let pendingStartTimer: number | null = null;

function clearPendingStart() {
  if (pendingStartTimer !== null) {
    window.clearTimeout(pendingStartTimer);
    pendingStartTimer = null;
  }
  pendingStart = null;
}

function runPendingStart() {
  const pending = pendingStart;
  if (!pending) return;
  clearPendingStart();
  pending.run();
}

function subscribeToVoiceSupport(): () => void {
  return () => {};
}

function getVoiceSupportSnapshot(): boolean {
  return getRecognitionConstructor() !== null;
}

function getServerVoiceSupportSnapshot(): boolean {
  return false;
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function getRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "El navegador no tiene permiso para usar el micrófono.";
    case "audio-capture":
      return "No se encontró un micrófono disponible.";
    case "no-speech":
      return "No se detectó voz. Puedes volver a intentarlo.";
    case "language-not-supported":
      return "Este navegador no admite el idioma de dictado configurado.";
    default:
      return "El dictado se interrumpió. Puedes volver a intentarlo.";
  }
}

export function useVoiceDictation({
  onTranscript,
}: UseVoiceDictationOptions = {}): UseVoiceDictationResult {
  const { profile } = useDeviceEnvironment();
  const ownerRef = React.useRef<symbol>(Symbol("voice-dictation"));
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = React.useRef(onTranscript);
  const shouldKeepListeningRef = React.useRef(false);
  const lastAndroidFinalRef = React.useRef("");
  const startRecognitionRef = React.useRef<(language?: string) => void>(() => {});
  const [isListening, setIsListening] = React.useState(false);
  const isSupported = React.useSyncExternalStore(
    subscribeToVoiceSupport,
    getVoiceSupportSnapshot,
    getServerVoiceSupportSnapshot
  );
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const resetOwnerState = React.useCallback(() => {
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const stopListening = React.useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (pendingStart?.owner === ownerRef.current) clearPendingStart();
    const recognition = recognitionRef.current;
    if (!recognition || activeOwner !== ownerRef.current) {
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    try {
      recognition.stop();
    } catch {
      setError("No se pudo detener el dictado. Inténtalo de nuevo.");
    }
    activeRecognition = null;
    activeOwner = null;
    activeShouldKeepListeningRef = null;
    activeResetState = null;
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startRecognition = React.useCallback((language = "es-AR") => {
    const beginSession = () => {
      if (!shouldKeepListeningRef.current) return;
      const Recognition = getRecognitionConstructor();
      if (!Recognition) {
        shouldKeepListeningRef.current = false;
        setError("Dictado por voz no disponible en este navegador.");
        return;
      }

      setError(null);
      setInterimTranscript("");
      let recognition: SpeechRecognitionLike;
      try {
        recognition = new Recognition();
      } catch (creationError) {
        setError(
          creationError instanceof Error
            ? creationError.message
            : "No se pudo iniciar el reconocimiento de voz."
        );
        shouldKeepListeningRef.current = false;
        return;
      }

      const isAndroid = profile.os === "android";
      recognition.lang = language;
      recognition.continuous = !isAndroid;
      recognition.interimResults = true;
      recognitionRef.current = recognition;
      activeRecognition = recognition;
      activeOwner = ownerRef.current;
      activeShouldKeepListeningRef = shouldKeepListeningRef;
      activeResetState = resetOwnerState;

      recognition.onresult = (event) => {
        let interim = "";
        const startIndex = isAndroid
          ? Math.max(0, event.results.length - 1)
          : event.resultIndex;
        for (let index = startIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript ?? "";
          if (result?.isFinal) {
            const uniqueTranscript = isAndroid
              ? removeRepeatedVoicePrefix(
                  lastAndroidFinalRef.current,
                  transcript
                )
              : transcript;
            const normalized = normalizeTarotSpeech(uniqueTranscript);
            if (normalized) {
              onTranscriptRef.current?.(normalized);
              if (isAndroid) {
                lastAndroidFinalRef.current = transcript.trim();
              }
            }
          } else {
            interim += transcript;
          }
        }
        setInterimTranscript(normalizeTarotSpeech(interim));
      };

      let fallbackLanguage: string | null = null;
      recognition.onerror = (event) => {
        if (event.error === "language-not-supported" && language === "es-AR") {
          fallbackLanguage =
            typeof navigator !== "undefined"
              ? navigator.language || "es-ES"
              : "es-ES";
          setError(null);
          return;
        }
        if (event.error === "aborted") {
          // Cierre intencional al cambiar de campo o al desmontar: no es un
          // error para la persona que dicta.
          setInterimTranscript("");
          setIsListening(false);
          if (activeRecognition === recognition) {
            activeRecognition = null;
            activeOwner = null;
            activeShouldKeepListeningRef = null;
            activeResetState = null;
            recognitionRef.current = null;
          }
          if (activeRecognition === null) runPendingStart();
          return;
        }
        if (isAndroid && event.error === "no-speech") {
          setInterimTranscript("");
          return;
        }
        shouldKeepListeningRef.current = false;
        setError(getRecognitionErrorMessage(event.error));
        setIsListening(false);
        setInterimTranscript("");
        if (activeRecognition === recognition) {
          activeRecognition = null;
          activeOwner = null;
          activeShouldKeepListeningRef = null;
          activeResetState = null;
          recognitionRef.current = null;
        }
        if (activeRecognition === null) runPendingStart();
      };

      recognition.onend = () => {
        setInterimTranscript("");
        if (activeRecognition === recognition) {
          activeRecognition = null;
          activeOwner = null;
          activeShouldKeepListeningRef = null;
          activeResetState = null;
          recognitionRef.current = null;
        }
        // Si otro campo quedó esperando turno, arranca ahora que el canal está
        // libre.
        if (activeRecognition === null) runPendingStart();
        if (fallbackLanguage && shouldKeepListeningRef.current) {
          const fallback = fallbackLanguage;
          fallbackLanguage = null;
          startRecognitionRef.current(fallback);
          return;
        }
        if (isAndroid && shouldKeepListeningRef.current) {
          window.setTimeout(() => {
            if (
              !shouldKeepListeningRef.current ||
              activeOwner !== null ||
              recognitionRef.current !== null
            ) {
              return;
            }
            startRecognitionRef.current(language);
          }, 150);
          return;
        }
        setIsListening(false);
      };

      try {
        recognition.start();
        setIsListening(true);
      } catch (startError) {
        if (activeRecognition === recognition) {
          activeRecognition = null;
          activeOwner = null;
          activeShouldKeepListeningRef = null;
          activeResetState = null;
        }
        recognitionRef.current = null;
        setIsListening(false);
        // El canal todavía estaba ocupado: reintenta una vez en vez de dejar
        // el micrófono inservible.
        if (
          startError instanceof DOMException &&
          startError.name === "InvalidStateError" &&
          shouldKeepListeningRef.current
        ) {
          window.setTimeout(() => {
            if (shouldKeepListeningRef.current) {
              startRecognitionRef.current(language);
            }
          }, 250);
          return;
        }
        shouldKeepListeningRef.current = false;
        setError("No se pudo iniciar el dictado. Vuelve a intentarlo.");
      }
    };

    if (activeRecognition) {
      // Este campo ya está dictando: no hay nada que hacer.
      if (activeOwner === ownerRef.current) return;
      // Ya hay un arranque encolado para este campo.
      if (pendingStart?.owner === ownerRef.current) return;

      if (activeShouldKeepListeningRef) {
        activeShouldKeepListeningRef.current = false;
      }
      // El campo anterior deja de mostrarse como «escuchando» en cuanto cede
      // el turno, aunque su `end` tarde en llegar.
      activeResetState?.();
      const previous = activeRecognition;
      pendingStart = { owner: ownerRef.current, run: beginSession };
      if (pendingStartTimer !== null) window.clearTimeout(pendingStartTimer);
      // Red de seguridad: si el navegador nunca emite `end` después de
      // `stop()`, liberamos el canal y arrancamos la sesión pendiente.
      pendingStartTimer = window.setTimeout(() => {
        pendingStartTimer = null;
        if (activeRecognition === previous) {
          try {
            previous.abort();
          } catch {
            // La sesión ya estaba cerrada: nada que abortar.
          }
          activeRecognition = null;
          activeOwner = null;
          activeShouldKeepListeningRef = null;
          activeResetState = null;
        }
        if (activeRecognition === null) runPendingStart();
      }, 800);

      let stopFailed = false;
      try {
        previous.stop();
      } catch {
        stopFailed = true;
        try {
          previous.abort();
        } catch {
          // La sesión ya estaba cerrada: nada que abortar.
        }
      }

      if (stopFailed) {
        if (activeRecognition === previous) {
          activeRecognition = null;
          activeOwner = null;
          activeShouldKeepListeningRef = null;
          activeResetState = null;
        }
        if (activeRecognition === null) runPendingStart();
      }
      return;
    }

    beginSession();
  }, [profile.os, resetOwnerState]);

  const startListening = React.useCallback(() => {
    shouldKeepListeningRef.current = true;
    lastAndroidFinalRef.current = "";
    startRecognitionRef.current("es-AR");
  }, []);

  React.useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const toggleListening = React.useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  React.useEffect(
    () => () => {
      shouldKeepListeningRef.current = false;
      if (pendingStart?.owner === ownerRef.current) clearPendingStart();
      if (activeOwner === ownerRef.current) {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        activeRecognition = null;
        activeOwner = null;
        activeShouldKeepListeningRef = null;
        activeResetState = null;
        try {
          recognition?.abort();
        } catch {
          // La sesión ya estaba cerrada.
        }
        if (activeRecognition === null) runPendingStart();
      }
    },
    []
  );

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
