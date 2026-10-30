"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = "Escribe una etiqueta y pulsa Enter…",
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/\s+/g, " ");
    if (!cleaned) return;
    const exists = value.some(
      (item) => item.toLowerCase() === cleaned.toLowerCase()
    );
    if (!exists && value.length < 15) {
      onChange([...value, cleaned]);
    }
    setDraft("");
  };

  const removeTag = (target: string) => {
    onChange(value.filter((t) => t !== target));
  };

  const unusedSuggestions = suggestions
    .filter(
      (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
    )
    .slice(0, 6);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoCapitalize="none"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (
              e.key === "Backspace" &&
              draft.length === 0 &&
              value.length > 0
            ) {
              removeTag(value[value.length - 1] ?? "");
            }
          }}
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={draft.trim().length === 0}
          aria-label="Añadir etiqueta"
          className="inline-flex h-11 sm:h-10 shrink-0 items-center gap-1.5 rounded-lg border border-control bg-raised px-3 text-sm font-medium text-ink hover:bg-surface disabled:opacity-45"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Añadir</span>
        </button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Etiquetas seleccionadas">
          {value.map((tag) => (
            <span
              key={tag}
              role="listitem"
              className="inline-flex flex-none items-center gap-1 rounded-md bg-active px-2.5 py-1 text-xs font-medium text-ink"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Quitar etiqueta ${tag}`}
                className="rounded p-0.5 text-muted hover:text-ink"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs text-muted">Frecuentes:</span>
          {unusedSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => addTag(sug)}
              className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted hover:border-control hover:text-ink"
            >
              + {sug}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
