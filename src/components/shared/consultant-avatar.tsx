"use client";

import * as React from "react";
import { getAvatarSurfaceStyles, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ConsultantAvatarProps {
  name: string;
  hue: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConsultantAvatar({
  name,
  hue,
  size = "md",
  className,
}: ConsultantAvatarProps) {
  const styles = getAvatarSurfaceStyles(hue);
  return (
    <span
      aria-hidden="true"
      style={styles}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-medium select-none",
        size === "sm" && "size-7 text-xs",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-12 text-sm",
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
