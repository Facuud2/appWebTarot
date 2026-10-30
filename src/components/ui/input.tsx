import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        spellCheck={false}
        autoCorrect="off"
        className={cn(
          "flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 py-2 text-base sm:text-sm text-ink placeholder:text-faint transition-colors disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-negative",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
