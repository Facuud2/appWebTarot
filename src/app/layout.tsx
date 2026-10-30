import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { DeviceEnvironmentProvider } from "@/components/providers/device-environment-provider";
import { OsAccessibilityGuard } from "@/components/providers/os-accessibility-guard";
import { PwaInstallProvider } from "@/components/providers/pwa-install-provider";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mesa de Tarot — Agenda, lecturas y cartas",
    template: "%s · Mesa de Tarot",
  },
  description:
    "Agenda de sesiones, fichas de consultantes, historial de lecturas y catálogo de cartas y mazos.",
  appleWebApp: {
    capable: true,
    title: "Grimorio",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
  themeColor: "#0b110e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${instrumentSerif.variable}`}
    >
      <body suppressHydrationWarning>
        <DeviceEnvironmentProvider>
          <OsAccessibilityGuard />
          <AppProviders>
            <PwaInstallProvider>{children}</PwaInstallProvider>
          </AppProviders>
        </DeviceEnvironmentProvider>
      </body>
    </html>
  );
}
