"use client";

import * as React from "react";
import { useDeviceEnvironment } from "@/components/providers/device-environment-provider";
import {
  getPlatformVoiceNotice,
  hasLocalTranscriptionBridge,
  isElectronRuntime,
} from "@/lib/platform-bridge";
import {
  createEmptyVoiceFrame,
  createVoiceAudioMeter,
  type VoiceAudioFrame,
  type VoiceAudioMeter,
} from "@/lib/voice-audio-meter";
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
  platformNotice: string | null;
  /** Nivel real del micrófono, de 0 (silencio) a 1 (voz fuerte). */
  audioLevel: number;
  /** Bandas de frecuencia reales para dibujar la onda. */
  audioBands: number[];
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

let micPrimed = false;
let micPriming: Promise<void> | null = null;

/**
 * Algunos navegadores móviles no toleran una segunda captura del micrófono en
 * paralelo al reconocimiento. Si eso ocurre, el dictado sigue funcionando sin
 * medidor antes que romperlo.
 */
let meterBlocked = false;

/**
 * Pide el permiso del micrófono antes de iniciar el reconocimiento. Si el
 * aviso aparece durante `recognition.start()`, Chrome deja la primera sesión
 * sin captar audio hasta recargar la página.
 */
function primeMicrophone(): Promise<void> {
  if (micPrimed) return Promise.resolve();
  if (micPriming) return micPriming;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    micPrimed = true;
    return Promise.resolve();
  }
  micPriming = navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      micPrimed = true;
    })
    .catch(() => {
      // Si se deniega, el reconocimiento informará el error habitual.
    })
    .finally(() => {
      micPriming = null;
    });
  return micPriming;
}

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

function getServerPlatformVoiceNotice(): string | null {
  return null;
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function getRecognitionErrorMessage(
  error: string,
  electronWithoutBridge = false
): string {
  if (
    electronWithoutBridge &&
    (error === "network" || error === "service-not-allowed")
  ) {
    return "El dictado en la nube no está disponible dentro de la app de escritorio. Escribe la nota o conecta un motor local de transcripción.";
  }
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "El navegador no tiene permiso para usar el micrófono.";
    case "network":
      return "El servicio de dictado no está disponible en este entorno. Puedes escribir la nota.";
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
  /**
   * La sesión sigue viva hasta que el navegador emite `end`. Mientras se está
   * cerrando, un segundo toque no debe crear otra instancia en paralelo:
   * Chrome/WebKit lanzan `InvalidStateError` y el micrófono queda muerto.
   */
  const stoppingRef = React.useRef(false);
  const stopReleaseTimerRef = React.useRef<number | null>(null);
  const lastAndroidFinalRef = React.useRef("");
  const startRecognitionRef = React.useRef<(language?: string) => void>(() => {});
  /** Distingue un `abort()` nuestro de una interrupción externa del navegador. */
  const intentionalStopRef = React.useRef(false);
  const lastStartAttemptRef = React.useRef(0);
  const meterRef = React.useRef<VoiceAudioMeter | null>(null);
  const meterStreamRef = React.useRef<MediaStream | null>(null);
  const meterGenerationRef = React.useRef(0);
  const wantsMeterRef = React.useRef(false);
  const [audioFrame, setAudioFrame] =
    React.useState<VoiceAudioFrame>(createEmptyVoiceFrame);
  const [isListening, setIsListening] = React.useState(false);
  const isSupported = React.useSyncExternalStore(
    subscribeToVoiceSupport,
    getVoiceSupportSnapshot,
    getServerVoiceSupportSnapshot
  );
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const platformNotice = React.useSyncExternalStore(
    subscribeToVoiceSupport,
    getPlatformVoiceNotice,
    getServerPlatformVoiceNotice
  );

  React.useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const resetOwnerState = React.useCallback(() => {
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  /**
   * Cierra el analizador y el stream del micrófono. Se llama en cada final de
   * sesión para que el navegador no deje el micrófono tomado (ni el indicador
   * de grabación encendido) mientras no se dicta.
   */
  const stopAudioMeter = React.useCallback(() => {
    wantsMeterRef.current = false;
    meterGenerationRef.current += 1;
    meterRef.current?.stop();
    meterRef.current = null;
    meterStreamRef.current?.getTracks().forEach((track) => track.stop());
    meterStreamRef.current = null;
    setAudioFrame(createEmptyVoiceFrame());
  }, []);

  /**
   * Abre un stream propio para medir el nivel real. Espera un instante para que
   * el reconocimiento tome el audio primero: pedir el micrófono en paralelo
   * antes de `start()` deja sesiones sin captura en algunos móviles.
   */
  const startAudioMeter = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    wantsMeterRef.current = true;
    // El reconocimiento se reinicia solo en móviles: reutilizamos el medidor
    // vivo en lugar de abrir un stream nuevo en cada reinicio.
    if (meterRef.current || meterBlocked) return;
    const generation = meterGenerationRef.current + 1;
    meterGenerationRef.current = generation;

    await new Promise((resolve) => window.setTimeout(resolve, 120));
    if (!wantsMeterRef.current || generation !== meterGenerationRef.current) {
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      // Sin permiso o sin micrófono: el reconocimiento informará el error y las
      // barras quedan en el piso. No inventamos movimiento.
      return;
    }

    if (!wantsMeterRef.current || generation !== meterGenerationRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    meterStreamRef.current = stream;
    meterRef.current = createVoiceAudioMeter(stream, setAudioFrame);
    if (!meterRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      meterStreamRef.current = null;
    }
  }, []);

  const stopListening = React.useCallback(() => {
    shouldKeepListeningRef.current = false;
    stoppingRef.current = true;
    intentionalStopRef.current = true;
    if (pendingStart?.owner === ownerRef.current) clearPendingStart();
    setIsListening(false);
    setInterimTranscript("");
    stopAudioMeter();

    const recognition = recognitionRef.current;
    if (!recognition || activeOwner !== ownerRef.current) {
      stoppingRef.current = false;
      return;
    }

    const release = () => {
      if (activeRecognition === recognition) {
        activeRecognition = null;
        activeOwner = null;
        activeShouldKeepListeningRef = null;
        activeResetState = null;
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      stoppingRef.current = false;
      if (stopReleaseTimerRef.current !== null) {
        window.clearTimeout(stopReleaseTimerRef.current);
        stopReleaseTimerRef.current = null;
      }
      if (activeRecognition === null) runPendingStart();
    };

    try {
      recognition.stop();
    } catch {
      // Si ya estaba cerrada, liberamos el canal de inmediato.
      try {
        recognition.abort();
      } catch {
        // La sesión ya estaba cerrada: nada que abortar.
      }
      release();
      return;
    }

    // Red de seguridad: algunos navegadores no emiten `end` tras `stop()`.
    // Sin esto, la siguiente pulsación quedaría encolada para siempre.
    if (stopReleaseTimerRef.current !== null) {
      window.clearTimeout(stopReleaseTimerRef.current);
    }
    stopReleaseTimerRef.current = window.setTimeout(() => {
      stopReleaseTimerRef.current = null;
      if (activeRecognition === recognition) {
        try {
          recognition.abort();
        } catch {
          // La sesión ya estaba cerrada.
        }
        release();
      }
    }, 800);
  }, [stopAudioMeter]);

  const startRecognition = React.useCallback((language = "es-AR") => {
    const beginSession = () => {
      if (!shouldKeepListeningRef.current) return;
      stoppingRef.current = false;
      intentionalStopRef.current = false;
      lastStartAttemptRef.current = Date.now();
      if (stopReleaseTimerRef.current !== null) {
        window.clearTimeout(stopReleaseTimerRef.current);
        stopReleaseTimerRef.current = null;
      }
      const platformBlock = getPlatformVoiceNotice();
      if (platformBlock) {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript("");
        setError(platformBlock);
        stopAudioMeter();
        return;
      }
      const Recognition = getRecognitionConstructor();
      if (!Recognition) {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript("");
        setError("Dictado por voz no disponible en este navegador.");
        stopAudioMeter();
        return;
      }

      setError(null);
      setInterimTranscript("");
      const electronVoiceBlocked =
        isElectronRuntime() && !hasLocalTranscriptionBridge();
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
        setIsListening(false);
        setInterimTranscript("");
        stopAudioMeter();
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

      const scheduleRestart = (delay: number) => {
        window.setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;
          if (activeOwner !== null || recognitionRef.current !== null) return;
          startRecognitionRef.current(language);
        }, delay);
      };

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
          // `abort()` propio (cambio de campo o desmontaje) o interrupción
          // externa del navegador. En el segundo caso la persona sigue con el
          // micrófono activo: reabrimos la sesión en vez de dejarla muerta.
          const intentional = intentionalStopRef.current;
          intentionalStopRef.current = false;
          setInterimTranscript("");
          stoppingRef.current = false;
          if (stopReleaseTimerRef.current !== null) {
            window.clearTimeout(stopReleaseTimerRef.current);
            stopReleaseTimerRef.current = null;
          }
          if (activeRecognition === recognition) {
            activeRecognition = null;
            activeOwner = null;
            activeShouldKeepListeningRef = null;
            activeResetState = null;
            recognitionRef.current = null;
          }
          if (activeRecognition === null) runPendingStart();
          if (!intentional && shouldKeepListeningRef.current) {
            scheduleRestart(isAndroid ? 200 : 300);
            return;
          }
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          stopAudioMeter();
          return;
        }
        if (event.error === "no-speech") {
          // Una pausa no debe cerrar el dictado: el `end` posterior reabre la
          // escucha si la persona sigue con el micrófono activo.
          setInterimTranscript("");
          return;
        }
        shouldKeepListeningRef.current = false;
        stoppingRef.current = false;
        if (event.error === "audio-capture" && meterRef.current) {
          meterBlocked = true;
        }
        setError(getRecognitionErrorMessage(event.error, electronVoiceBlocked));
        setIsListening(false);
        setInterimTranscript("");
        stopAudioMeter();
        if (activeRecognition === recognition) {
          activeRecognition = null;
          activeOwner = null;
          activeShouldKeepListeningRef = null;
          activeResetState = null;
          recognitionRef.current = null;
        }
        if (stopReleaseTimerRef.current !== null) {
          window.clearTimeout(stopReleaseTimerRef.current);
          stopReleaseTimerRef.current = null;
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
        stoppingRef.current = false;
        if (stopReleaseTimerRef.current !== null) {
          window.clearTimeout(stopReleaseTimerRef.current);
          stopReleaseTimerRef.current = null;
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
        // Safari/WebKit también corta la sesión tras una pausa aunque
        // `continuous` esté activo. Si la persona no detuvo el dictado,
        // reabrimos la escucha en cualquier plataforma para que el micrófono
        // no quede inservible hasta recargar la página.
        if (shouldKeepListeningRef.current && activeRecognition === null) {
          scheduleRestart(isAndroid ? 150 : 250);
          return;
        }
        // Un arranque encolado pudo crear una sesión nueva dentro de este
        // mismo `end`; en ese caso no apagamos su indicador.
        if (activeRecognition === null) {
          setIsListening(false);
          stopAudioMeter();
        }
      };

      try {
        recognition.start();
        setIsListening(true);
        void startAudioMeter();
      } catch (startError) {
        stoppingRef.current = false;
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
          scheduleRestart(250);
          return;
        }
        shouldKeepListeningRef.current = false;
        setError("No se pudo iniciar el dictado. Vuelve a intentarlo.");
        stopAudioMeter();
      }
    };

    if (activeRecognition) {
      // Este campo ya está dictando de forma activa: no hay nada que hacer.
      // Si está cerrándose, encolamos una sesión nueva en lugar de crear otra
      // instancia en paralelo.
      if (activeOwner === ownerRef.current && !stoppingRef.current) return;
      // Ya hay un arranque encolado para este campo.
      if (pendingStart?.owner === ownerRef.current) return;

      // Si es otro campo el que toma el turno, apagamos su intención de
      // escucha y su indicador. Si es el mismo campo reiniciándose tras un
      // stop, conservamos la intención nueva para que el arranque encolado
      // no se cancele a sí mismo.
      const sameOwner = activeOwner === ownerRef.current;
      if (activeShouldKeepListeningRef && !sameOwner) {
        activeShouldKeepListeningRef.current = false;
        activeResetState?.();
      }
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

    const canPrime =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    if (micPrimed || !canPrime) {
      beginSession();
    } else {
      void primeMicrophone().then(() => {
        if (!activeRecognition) beginSession();
      });
    }
  }, [profile.os, resetOwnerState, startAudioMeter, stopAudioMeter]);

  const startListening = React.useCallback(() => {
    shouldKeepListeningRef.current = true;
    lastAndroidFinalRef.current = "";
    intentionalStopRef.current = false;
    lastStartAttemptRef.current = Date.now();
    setError(null);
    // Respuesta inmediata: la superficie de ondas toma el lugar del campo
    // mientras se resuelve el permiso o el arranque del reconocimiento.
    setIsListening(true);
    startRecognitionRef.current("es-AR");
  }, []);

  React.useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const toggleListening = React.useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  /**
   * Perro guardián: si la intención de escucha sigue viva pero no hay sesión
   * activa (un `end` perdido, la app en segundo plano, un cambio de pestaña),
   * reabrimos el micrófono sin obligar a recargar la página.
   */
  React.useEffect(() => {
    if (!isListening) return;
    const id = window.setInterval(() => {
      if (!shouldKeepListeningRef.current) return;
      if (activeRecognition !== null || recognitionRef.current !== null) return;
      if (pendingStart !== null || stoppingRef.current) return;
      if (Date.now() - lastStartAttemptRef.current < 1200) return;
      startRecognitionRef.current("es-AR");
    }, 1000);
    return () => window.clearInterval(id);
  }, [isListening]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!shouldKeepListeningRef.current) return;
      if (activeRecognition !== null || recognitionRef.current !== null) return;
      if (Date.now() - lastStartAttemptRef.current < 600) return;
      startRecognitionRef.current("es-AR");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  React.useEffect(
    () => () => {
      shouldKeepListeningRef.current = false;
      stoppingRef.current = false;
      stopAudioMeter();
      if (stopReleaseTimerRef.current !== null) {
        window.clearTimeout(stopReleaseTimerRef.current);
        stopReleaseTimerRef.current = null;
      }
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
    [stopAudioMeter]
  );

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    platformNotice,
    audioLevel: audioFrame.level,
    audioBands: audioFrame.bands,
    startListening,
    stopListening,
    toggleListening,
  };
}
