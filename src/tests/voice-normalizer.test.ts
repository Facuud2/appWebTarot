import { describe, expect, it } from "vitest";
import {
  appendVoiceTranscript,
  normalizeTarotSpeech,
  removeRepeatedVoicePrefix,
} from "@/lib/voice-normalizer";

describe("normalizeTarotSpeech", () => {
  it("normalizes tarot vocabulary and title casing", () => {
    expect(
      normalizeTarotSpeech(
        "el giro fante y la sacerdotisa en el tarot de tot"
      )
    ).toBe("El Hierofante y La Sacerdotisa en el Tarot de Thoth");
  });

  it("normalizes traditions, arcana, and spoken punctuation", () => {
    expect(
      normalizeTarotSpeech(
        "rider white y le norman coma cabala punto y aparte living will"
      )
    ).toBe("Rider-Waite y Lenormand, Cábala.\nThe Living Wheel");
  });

  it("appends dictation without replacing existing notes", () => {
    expect(
      appendVoiceTranscript(
        "Inicio de sesión.",
        normalizeTarotSpeech("salio el giro fante en el tarot de tot")
      )
    ).toBe("Inicio de sesión. Salió El Hierofante en el Tarot de Thoth");
  });

  it("does not add whitespace before a chunk when the existing text already ends with it", () => {
    expect(appendVoiceTranscript("Nota previa\n", "Nueva frase")).toBe(
      "Nota previa\nNueva frase"
    );
  });

  it("starts a new dictated sentence after an unpunctuated phrase", () => {
    expect(
      appendVoiceTranscript(
        "Y bueno que te voy a hacer yo",
        "Qué le voy a hacer che"
      )
    ).toBe("Y bueno que te voy a hacer yo. Qué le voy a hacer che");
  });

  it("removes a cumulative recognition prefix before normalizing the next phrase", () => {
    expect(removeRepeatedVoicePrefix("hola", "hola, buenos días")).toBe(
      "buenos días"
    );
    expect(removeRepeatedVoicePrefix("hola", "hola")).toBe("");
    expect(removeRepeatedVoicePrefix("hola", "hoy salió El Mago")).toBe(
      "hoy salió El Mago"
    );
  });
});
