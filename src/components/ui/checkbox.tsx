"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof RadixCheckbox.Root>,
  React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>
>(({ className, ...props }, ref) => (
  <RadixCheckbox.Root
    ref={ref}
    className={cn(
      "peer size-5 sm:size-4 shrink-0 rounded border border-control bg-raised transition-all duration-150 ease-out active:scale-90 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-on-primary disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <RadixCheckbox.Indicator className="flex items-center justify-center text-current transition-transform duration-150 data-[state=checked]:scale-100 data-[state=unchecked]:scale-0">
      <Check className="size-3.5" aria-hidden="true" />
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
));
Checkbox.displayName = "Checkbox";
