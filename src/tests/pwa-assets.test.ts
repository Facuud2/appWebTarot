import { describe, expect, it } from "vitest";
import sharp from "sharp";
import manifest from "@/app/manifest";

describe("PWA assets", () => {
  it("defines standalone metadata and PNG icons for installable platforms", () => {
    const appManifest = manifest();

    expect(appManifest).toMatchObject({
      name: "Grimorio Tarot — Mesa de Trabajo",
      short_name: "Grimorio",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0b110e",
      theme_color: "#0b110e",
    });

    for (const [src, sizes, purpose] of [
      ["/icon-192.png", "192x192", "any"],
      ["/icon-192.png", "192x192", "maskable"],
      ["/icon-512.png", "512x512", "any"],
      ["/icon-512.png", "512x512", "maskable"],
      ["/apple-touch-icon.png", "180x180", undefined],
    ] as const) {
      expect(appManifest.icons).toContainEqual({
        src,
        sizes,
        type: "image/png",
        ...(purpose ? { purpose } : {}),
      });
    }
  });

  it.each([
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ])("provides an opaque %s icon at %s pixels", async (file, size) => {
    const icon = sharp(`public/${file}`);
    const metadata = await icon.metadata();
    const { data } = await icon
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(metadata).toMatchObject({
      format: "png",
      width: size,
      height: size,
    });
    expect([...data]).toEqual([11, 17, 14, 255]);
  });
});
