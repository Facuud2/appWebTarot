"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Check } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, formatSessionDateTime } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  suppressHydrationWarning?: boolean;
}

const COMMON_TIMES = ["09:00", "11:00", "15:00", "17:00", "18:00", "20:00"];
function parseValueToDate(val: string | undefined): Date | null {
  if (!val || !val.trim()) return null;
  if (val.length === 16 && val.includes("T")) {
    const [datePart, timePart] = val.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [h, min] = timePart.split(":").map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d) && !Number.isNaN(h) && !Number.isNaN(min)) {
      const local = new Date(y, m - 1, d, h, min, 0, 0);
      if (isValid(local)) return local;
    }
  }
  const d = new Date(val);
  return isValid(d) ? d : null;
}

function formatLocalDateTimeToIso(date: Date, hours: number, minutes: number): string {
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );
  return localDate.toISOString();
}

export function DateTimePicker({
  value,
  onChange,
  id,
  placeholder = "Seleccionar fecha y hora…",
  disabled = false,
  className,
  "aria-label": ariaLabel,
  suppressHydrationWarning = true,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const popoverContentRef = React.useRef<HTMLDivElement | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      activeElement.blur();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        popoverContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    });
  };

  const parsedDate = React.useMemo(() => parseValueToDate(value), [value]);
  const activeDay = parsedDate ?? undefined;
  const activeHour = parsedDate ? parsedDate.getHours() : 18;
  const activeMinute = parsedDate ? parsedDate.getMinutes() : 0;

  const displayLabel = React.useMemo(() => {
    if (!parsedDate) return placeholder;
    return formatSessionDateTime(parsedDate) || placeholder;
  }, [parsedDate, placeholder]);

  const handleSelectDay = (day: Date | undefined) => {
    if (!day) return;
    const formatted = formatLocalDateTimeToIso(day, activeHour, activeMinute);
    onChange(formatted);
  };

  const handleApplyTime = (hour: number, minute: number) => {
    const baseDay = activeDay || new Date();
    const formatted = formatLocalDateTimeToIso(baseDay, hour, minute);
    onChange(formatted);
  };

  const handleQuickTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    if (typeof h === "number" && typeof m === "number") {
      handleApplyTime(h, m);
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    onChange(now.toISOString());
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-flex items-center w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel || displayLabel}
            aria-haspopup="dialog"
            aria-expanded={open}
            suppressHydrationWarning={suppressHydrationWarning}
            className={cn(
              "flex h-11 sm:h-10 w-full items-center justify-between rounded-lg border border-control bg-raised px-3 text-left text-sm transition-colors",
              "hover:border-ink/60 focus-visible:outline-none focus-visible:border-ink",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !parsedDate && "text-muted",
              parsedDate && "text-ink font-medium"
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
          ref={popoverContentRef}
          className="w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] space-y-4 overflow-y-auto overscroll-contain rounded-xl border border-border bg-ground p-2 sm:p-4 z-50"
          align="start"
          sideOffset={6}
          style={{
            maxHeight: "min(85dvh, var(--radix-popper-available-height))",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Calendar Picker (react-day-picker v9) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-accent" aria-hidden="true" />
              <span>Selecciona la fecha</span>
            </p>
            <Calendar
              mode="single"
              selected={activeDay}
              onSelect={handleSelectDay}
            />
          </div>

          {/* Time Picker Controls */}
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Clock className="size-3.5 text-accent" aria-hidden="true" />
                <span>Hora de la sesión</span>
              </p>
              <button
                type="button"
                onClick={handleSetNow}
                className="text-[11px] font-medium text-accent hover:underline"
              >
                Ahora
              </button>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TIMES.map((timeStr) => {
                const [h, m] = timeStr.split(":").map(Number);
                const isSelected = activeHour === h && activeMinute === m;
                return (
                  <button
                    key={timeStr}
                    type="button"
                    onClick={() => handleQuickTime(timeStr)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs num-tabular transition-colors",
                      isSelected
                        ? "bg-ink text-ground font-medium shadow-xs"
                        : "bg-surface border border-border text-ink hover:border-ink/60"
                    )}
                  >
                    {timeStr}
                  </button>
                );
              })}
            </div>

            {/* Manual hours & minutes dropdowns (No typing) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label
                  htmlFor={id ? `${id}-hour` : "dt-hour"}
                  className="text-[11px] text-muted block"
                >
                  Hora
                </label>
                <select
                  id={id ? `${id}-hour` : "dt-hour"}
                  value={activeHour}
                  onChange={(e) =>
                    handleApplyTime(Number(e.target.value), activeMinute)
                  }
                  className="h-9 w-full rounded-md border border-control bg-raised px-2 text-xs font-medium text-ink num-tabular"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")} hs
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={id ? `${id}-minute` : "dt-minute"}
                  className="text-[11px] text-muted block"
                >
                  Minuto
                </label>
                <select
                  id={id ? `${id}-minute` : "dt-minute"}
                  value={activeMinute}
                  onChange={(e) =>
                    handleApplyTime(activeHour, Number(e.target.value))
                  }
                  className="h-9 w-full rounded-md border border-control bg-raised px-2 text-xs font-medium text-ink num-tabular"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      :{String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer action */}
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted num-tabular">
              {activeDay
                ? format(activeDay, "dd/MM/yyyy", { locale: es })
                : "Sin fecha"}{" "}
              · {String(activeHour).padStart(2, "0")}:
              {String(activeMinute).padStart(2, "0")}
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs px-3"
            >
              <Check className="size-3 text-ground" aria-hidden="true" />
              <span>Aceptar</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
