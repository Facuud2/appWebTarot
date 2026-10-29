"use client";

import * as React from "react";
import { Popover as RadixPopover } from "radix-ui";
import { useMobileBackClose } from "@/hooks/use-mobile-back-close";
import { cn } from "@/lib/utils";

type PopoverRootProps = React.ComponentProps<typeof RadixPopover.Root>;

export function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  ...props
}: PopoverRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open]
  );

  useMobileBackClose(isOpen, () => handleOpenChange(false));

  return (
    <RadixPopover.Root
      {...props}
      open={isOpen}
      onOpenChange={handleOpenChange}
    />
  );
}

export const PopoverTrigger = RadixPopover.Trigger;

export const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "t-dropdown z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-ground p-2 text-ink shadow-xl outline-none", // taste-skill-ignore: dropdown elevation separates it from page content
        className
      )}
      {...props}
    />
  </RadixPopover.Portal>
));
PopoverContent.displayName = "PopoverContent";
