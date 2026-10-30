"use client";

import { Mic, MicOff } from "lucide-react";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { cn } from "@/lib/utils";

interface VoiceMicButtonProps {
  onTranscript: (normalizedChunk: string) => void;
  disabled?: boolean;
  fieldLabel?: string;
  className?: string;
}

export function VoiceMicButton({
  onTranscript,
  disabled = false,
  fieldLabel = "este campo",
  className,
}: VoiceMicButtonProps) {
  const {
    isSupported,
    isListening,
    interimTranscript,
    error,
    platformNotice,
    toggleListening,
  } = useVoiceDictation({ onTranscript });

  const unavailable = !isSupported || disabled;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={unavailable}
        aria-label={isListening ? "Detener dictado por voz" : "Iniciar dictado por voz"}
        aria-pressed={isListening}
        data-voice-platform={platformNotice ? "restricted" : "native"}
        title={
          platformNotice && !isListening
            ? platformNotice
            : isSupported
              ? isListening
                ? `Detener dictado en ${fieldLabel}`
                : `Dictar en ${fieldLabel}`
              : "Dictado por voz no disponible en este navegador"
        }
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-45",
          isListening
            ? "border-positive/60 bg-positive/10 text-positive"
            : "border-border bg-ground text-muted hover:border-control hover:text-ink"
        )}
      >
        {isListening ? (
          <MicOff className="size-4" aria-hidden="true" />
        ) : (
          <Mic className="size-4" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0 text-xs" aria-live="polite">
        {isListening ? (
          <>
            <p className="flex items-center gap-1.5 font-medium text-positive">
              <span className="voice-listening-indicator size-1.5 rounded-full bg-positive" />
              Escuchando…
            </p>
            {interimTranscript ? (
              <p className="max-w-48 truncate text-muted">
                {interimTranscript}
              </p>
            ) : null}
          </>
        ) : error ? (
          <p className="max-w-48 text-negative">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
