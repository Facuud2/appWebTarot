"use client";

import * as React from "react";
import { Label as RadixLabel } from "radix-ui";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof RadixLabel.Root> {
  requiredIndicator?: boolean;
}

export const Label = React.forwardRef<
  React.ComponentRef<typeof RadixLabel.Root>,
  LabelProps
>(({ className, children, requiredIndicator, ...props }, ref) => (
  <RadixLabel.Root
    ref={ref}
    className={cn(
      "block text-sm font-medium text-ink leading-snug select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
      className
    )}
    {...props}
  >
    {children}
    {requiredIndicator ? (
      <span className="ml-1 text-negative" aria-hidden="true">
        *
      </span>
    ) : null}
  </RadixLabel.Root>
));
Label.displayName = "Label";
