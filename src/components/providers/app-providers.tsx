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
        duration={2000}
        richColors
        toastOptions={{
          duration: 2000,
          className: "!rounded-xl !shadow-md !font-sans",
        }}
      />
    </ThemeProvider>
  );
}
