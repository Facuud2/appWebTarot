"use client";

import * as React from "react";
import { es } from "date-fns/locale/es";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("w-full max-w-full p-1.5 sm:p-2 select-none", className)}
      classNames={{
        root: "rdp-root text-ink",
        months: "flex w-full max-w-full flex-col gap-4",
        month: "w-full min-w-0 space-y-3",
        month_caption: "flex items-center justify-between pt-1 relative px-1",
        caption_label: "text-sm font-semibold capitalize text-ink",
        nav: "flex items-center gap-1",
        button_previous:
          "h-7 w-7 rounded-lg border border-border bg-raised p-0 text-muted hover:text-ink flex items-center justify-center transition-colors hover:bg-surface",
        button_next:
          "h-7 w-7 rounded-lg border border-border bg-raised p-0 text-muted hover:text-ink flex items-center justify-center transition-colors hover:bg-surface",
        month_grid: "block w-full border-collapse space-y-1",
        weekdays: "grid grid-cols-7 text-muted text-[11px] font-medium pb-1",
        weekday: "min-w-0 text-center capitalize",
        week: "grid w-full grid-cols-7 mt-1",
        day: "relative flex h-8 min-w-0 items-center justify-center rounded-lg p-0 text-center text-xs",
        day_button:
          "h-8 w-full min-w-0 rounded-lg p-0 font-normal transition-colors flex items-center justify-center text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected:
          "!bg-accent !text-on-primary font-medium hover:!bg-accent focus:!bg-accent rounded-lg",
        today: "border border-accent/60 font-semibold text-accent",
        outside: "text-muted/40 opacity-40 hover:opacity-100",
        disabled: "text-muted/30 opacity-30 cursor-not-allowed hover:bg-transparent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";
