"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          duration: 4000,
          className:
            "!bg-ground !text-ink !border !border-border !shadow-lg !rounded-xl",
        }}
      />
    </ThemeProvider>
  );
}
