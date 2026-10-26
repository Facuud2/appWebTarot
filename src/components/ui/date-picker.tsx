"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  allowClear?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  className,
  id,
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    try {
      const parsed = parseISO(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }, [value]);

  const displayLabel = React.useMemo(() => {
    if (!selectedDate) return placeholder;
    return format(selectedDate, "d 'de' MMMM, yyyy", { locale: es });
  }, [selectedDate, placeholder]);

  const handleSelectDay = (day: Date | undefined) => {
    if (!day) {
      onChange("");
      return;
    }
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-flex items-center w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "flex h-11 sm:h-10 w-full items-center justify-between rounded-lg border border-control bg-raised px-3 text-left text-sm transition-colors",
              "hover:border-ink/60 focus-visible:outline-none focus-visible:border-ink",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !value && "text-muted",
              value && "text-ink font-medium"
            )}
          >
            <span className="truncate pr-2">{displayLabel}</span>
            <CalendarIcon
              className="size-4 shrink-0 text-muted"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-3 bg-ground border border-border shadow-lg rounded-xl z-50"
          align="start"
          sideOffset={6}
        >
          <div className="space-y-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDay}
            />

            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <button
                type="button"
                onClick={() => handleSelectDay(new Date())}
                className="text-xs font-medium text-accent hover:underline"
              >
                Hoy
              </button>
              {allowClear && value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-xs text-muted hover:text-negative"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {allowClear && value && !disabled ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          aria-label="Borrar fecha"
          className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink rounded"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
