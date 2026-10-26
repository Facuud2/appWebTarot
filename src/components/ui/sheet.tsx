"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { cn } from "@/lib/utils";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  side?: "left" | "right" | "bottom";
}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
    <RadixDialog.Content
      ref={ref}
      data-side={side}
      className={cn(
        "t-panel-slide fixed z-50 flex flex-col bg-ground border-border shadow-xl p-5 overflow-y-auto",
        side === "left" &&
          "inset-y-0 left-0 h-full w-[280px] max-w-[85vw] border-r",
        side === "right" &&
          "inset-y-0 right-0 h-full w-full max-w-md border-l",
        side === "bottom" &&
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t",
        className
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close
        aria-label="Cerrar panel"
        className="absolute right-4 top-4 rounded-md p-2 text-muted hover:bg-surface hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1 pr-8 pb-4 text-left", className)}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn("text-base font-semibold text-ink", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("text-sm text-muted", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
