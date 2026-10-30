"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { appendVoiceTranscript } from "@/lib/voice-normalizer";
import { cn } from "@/lib/utils";

interface VoiceTextareaProps {
  id?: string;
  label: React.ReactNode;
  /** Nombre del campo para las etiquetas de accesibilidad del micrófono. */
  fieldLabel: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  labelClassName?: string;
  textareaClassName?: string;
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function VoiceLiveSurface({
  bands,
  level,
  rows,
}: {
  bands: number[];
  level: number;
  rows: number;
}) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const silent = level < 0.06;
  const minHeight = Math.max(96, rows * 22 + 28);

  return (
    <div
      role="group"
      aria-label="Dictado en curso"
      className="voice-live-surface flex w-full flex-col justify-between gap-2 rounded-lg border border-accent/45 bg-surface px-3 py-2.5 text-accent"
      style={{ minHeight }}
    >
      <div className="voice-live-bars" aria-hidden="true">
        {bands.map((band, index) => (
          <span
            key={index}
            className="voice-live-bar"
            style={{
              transform: `scaleY(${(0.05 + band * 0.95).toFixed(3)})`,
              opacity: (0.3 + band * 0.7).toFixed(3),
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <span
            className="voice-live-dot"
            data-active={silent ? "false" : "true"}
            aria-hidden="true"
          />
          <span className="truncate text-accent-ink">Escuchando…</span>
        </span>
        <span className="num-tabular shrink-0 text-faint">
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
}

export function VoiceTextarea({
  id,
  label,
  fieldLabel,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
  error: fieldError,
  className,
  labelClassName,
  textareaClassName,
}: VoiceTextareaProps) {
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);

  React.useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  /**
   * Varios resultados finales pueden llegar en el mismo evento de
   * reconocimiento. Se encadenan sobre el ref para no pisarse entre sí.
   */
  const handleTranscript = React.useCallback((chunk: string) => {
    const next = appendVoiceTranscript(valueRef.current, chunk);
    valueRef.current = next;
    onChangeRef.current(next);
  }, []);

  const {
    isSupported,
    isListening,
    error,
    platformNotice,
    audioLevel,
    audioBands,
    toggleListening,
  } = useVoiceDictation({
    onTranscript: handleTranscript,
  });

  const unavailable = !isSupported || disabled;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={id}
          className={cn("min-w-0 flex-1", labelClassName)}
        >
          {label}
        </Label>
        <button
          type="button"
          onClick={toggleListening}
          disabled={unavailable}
          aria-label={
            isListening ? "Detener dictado por voz" : "Iniciar dictado por voz"
          }
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
              ? "border-accent/60 bg-accent-soft text-accent-ink"
              : "border-border bg-ground text-muted hover:border-control hover:text-ink"
          )}
        >
          {isListening ? (
            <Square className="size-3.5 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {isListening ? (
        <VoiceLiveSurface bands={audioBands} level={audioLevel} rows={rows} />
      ) : (
        <Textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("voice-field-return", textareaClassName)}
        />
      )}

      {fieldError ? (
        <p className="text-xs text-negative">{fieldError}</p>
      ) : null}

      {error && !isListening ? (
        <p className="text-xs text-negative" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
