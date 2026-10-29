"use client";

import * as React from "react";
import {
  formatRelativeDayEs,
  formatSessionDateTime,
  formatTimeEs,
} from "@/lib/utils";

interface FormattedSessionDateTimeProps {
  iso: string;
  relative?: boolean;
  timeOnly?: boolean;
  className?: string;
}

const subscribe = () => () => {};
const getServerSnapshot = () => "";

export function FormattedSessionDateTime({
  iso,
  relative = false,
  timeOnly = false,
  className,
}: FormattedSessionDateTimeProps) {
  const getSnapshot = React.useCallback(
    () =>
      timeOnly
        ? formatTimeEs(iso)
        : relative
          ? formatRelativeDayEs(iso)
          : formatSessionDateTime(iso),
    [iso, relative, timeOnly]
  );
  const formatted = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {formatted}
    </time>
  );
}
