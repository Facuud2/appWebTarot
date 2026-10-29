import { describe, expect, it } from "vitest";
import { createReadingTitle } from "@/lib/utils";

describe("createReadingTitle", () => {
  it("uses the structure and consultant when no title was entered", () => {
    expect(
      createReadingTitle("", "Pasado, Presente y Futuro (3 cartas)", "Pepe")
    ).toBe("Pasado, Presente y Futuro · Pepe");
  });

  it("keeps explicit titles and shortens long generated context", () => {
    expect(createReadingTitle("Mi título", "Otra estructura", "Pepe")).toBe(
      "Mi título"
    );
    expect(
      createReadingTitle("", "Una estructura muy larga para una lectura", "Pepe")
    ).toBe("Una estructura muy larga para una…");
  });
});
