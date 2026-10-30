import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        spellCheck={true}
        className={cn(
          "flex min-h-[96px] w-full rounded-lg border border-control bg-raised px-3 py-2.5 text-base sm:text-sm leading-relaxed text-ink placeholder:text-faint transition-colors disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-negative",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
