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

  const stopListening = React.useCallback(() => {
    shouldKeepListeningRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition || activeOwner !== ownerRef.current) {
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    try {
      recognition.stop();
    } catch (stopError) {
      setError(
        stopError instanceof Error
          ? stopError.message
          : "No se pudo detener el dictado."
      );
    }
    activeRecognition = null;
    activeOwner = null;
    activeShouldKeepListeningRef = null;
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startRecognition = React.useCallback((language = "es-AR") => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      shouldKeepListeningRef.current = false;
      setError("Dictado por voz no disponible en este navegador.");
      return;
    }

    if (activeRecognition && activeOwner !== ownerRef.current) {
      if (activeShouldKeepListeningRef) {
        activeShouldKeepListeningRef.current = false;
      }
      try {
        activeRecognition.stop();
      } catch (stopError) {
        if (!(stopError instanceof Error)) {
          setError("No se pudo detener el dictado anterior.");
        }
        activeRecognition.abort();
      }
      activeRecognition = null;
      activeOwner = null;
      activeShouldKeepListeningRef = null;
    }

    if (activeRecognition && activeOwner === ownerRef.current) {
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
          typeof navigator !== "undefined" ? navigator.language || "es-ES" : "es-ES";
        setError(null);
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
        recognitionRef.current = null;
      }
    };

    recognition.onend = () => {
      setInterimTranscript("");
      if (activeRecognition === recognition) {
        activeRecognition = null;
        activeOwner = null;
        recognitionRef.current = null;
      }
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
      }
      recognitionRef.current = null;
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setError(
        startError instanceof Error
          ? startError.message
          : "No se pudo iniciar el dictado."
      );
    }
  }, [profile.os]);

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
      if (activeOwner === ownerRef.current) {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        activeRecognition = null;
        activeOwner = null;
        activeShouldKeepListeningRef = null;
        shouldKeepListeningRef.current = false;
        recognition?.abort();
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
