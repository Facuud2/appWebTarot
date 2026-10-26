import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mesa de Tarot — Agenda, lecturas y cartas",
    short_name: "Mesa de Tarot",
    description:
      "Agenda de sesiones, fichas de consultantes, registro de lecturas y catálogo de cartas y mazos.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1c1d1a",
    lang: "es",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
