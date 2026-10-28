"use client";

import * as React from "react";
import { normalizeTarotSpeech } from "@/lib/voice-normalizer";

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
  const ownerRef = React.useRef<symbol>(Symbol("voice-dictation"));
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = React.useRef(onTranscript);
  const startListeningRef = React.useRef<(language?: string) => void>(() => {});
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
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = React.useCallback((language = "es-AR") => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setError("Dictado por voz no disponible en este navegador.");
      return;
    }

    if (activeRecognition && activeOwner !== ownerRef.current) {
      try {
        activeRecognition.stop();
      } catch {
        activeRecognition.abort();
      }
      activeRecognition = null;
      activeOwner = null;
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
      return;
    }

    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    activeRecognition = recognition;
    activeOwner = ownerRef.current;

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          const normalized = normalizeTarotSpeech(transcript);
          if (normalized) onTranscriptRef.current?.(normalized);
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
      setError(getRecognitionErrorMessage(event.error));
      setIsListening(false);
      setInterimTranscript("");
      if (activeRecognition === recognition) {
        activeRecognition = null;
        activeOwner = null;
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
      if (fallbackLanguage) {
        const fallback = fallbackLanguage;
        fallbackLanguage = null;
        startListeningRef.current(fallback);
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
      }
      recognitionRef.current = null;
      setIsListening(false);
      setError(
        startError instanceof Error
          ? startError.message
          : "No se pudo iniciar el dictado."
      );
    }
  }, []);

  React.useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

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
