"use client";

import * as React from "react";
import { formatRelativeDayEs, formatSessionDateTime } from "@/lib/utils";

interface FormattedSessionDateTimeProps {
  iso: string;
  relative?: boolean;
  className?: string;
}

const subscribe = () => () => {};

export function FormattedSessionDateTime({
  iso,
  relative = false,
  className,
}: FormattedSessionDateTimeProps) {
  const getSnapshot = React.useCallback(
    () => (relative ? formatRelativeDayEs(iso) : formatSessionDateTime(iso)),
    [iso, relative]
  );
  const formatted = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {formatted}
    </time>
  );
}
