export type TarotVoiceRule = Readonly<{
  pattern: RegExp;
  replacement: string;
}>;

export const TAROT_VOICE_DICTIONARY: ReadonlyArray<TarotVoiceRule> = [
  { pattern: /(?:tarot de )?(?:tot|todd|thot|toth)\b/gi, replacement: "Tarot de Thoth" },
  { pattern: /\b(?:petit le norman|le norman|lenorman)\b/gi, replacement: "Lenormand" },
  { pattern: /\b(?:rider|raider) (?:waite|white|weit)\b/gi, replacement: "Rider-Waite" },
  { pattern: /\b(?:living will|living uil|la rueda viviente)\b/gi, replacement: "The Living Wheel" },
  { pattern: /\btarot de marsella\b/gi, replacement: "Tarot de Marsella" },
  { pattern: /\b(?:el )?(?:giro fante|jerofante|ierofante|hierofante)\b/gi, replacement: "El Hierofante" },
  { pattern: /\b(?:la )?sacerdotisa\b/gi, replacement: "La Sacerdotisa" },
  { pattern: /\b(?:la )?emperatriz\b/gi, replacement: "La Emperatriz" },
  { pattern: /\b(?:el )?emperador\b/gi, replacement: "El Emperador" },
  { pattern: /\b(?:el )?ermitaño\b/gi, replacement: "El Ermitaño" },
  { pattern: /\b(?:el )?colgado\b/gi, replacement: "El Colgado" },
  { pattern: /\b(?:el )?eón\b/gi, replacement: "El Eón" },
  { pattern: /\b(?:el )?ajuste\b/gi, replacement: "El Ajuste" },
  { pattern: /\b(?:el )?loco\b/gi, replacement: "El Loco" },
  { pattern: /\b(?:el )?mago\b/gi, replacement: "El Mago" },
  { pattern: /\barcanos? mayores?\b/gi, replacement: "Arcanos Mayores" },
  { pattern: /\barcanos? menores?\b/gi, replacement: "Arcanos Menores" },
  { pattern: /\b(?:de )?bastos\b/gi, replacement: "Bastos" },
  { pattern: /\b(?:de )?copas\b/gi, replacement: "Copas" },
  { pattern: /\b(?:de )?espadas\b/gi, replacement: "Espadas" },
  { pattern: /\b(?:de )?oros\b/gi, replacement: "Oros" },
  { pattern: /\b(?:de )?discos\b/gi, replacement: "Discos" },
  { pattern: /\bcabala\b/gi, replacement: "Cábala" },
  { pattern: /\bcruz celta\b/gi, replacement: "Cruz Celta" },
  { pattern: /\baspectos?\b/gi, replacement: "aspectos" },
  { pattern: /\bsincronicidades?\b/gi, replacement: "sincronicidades" },
  { pattern: /\barquetipos?\b/gi, replacement: "arquetipos" },
  { pattern: /\bsalio\b/gi, replacement: "salió" },
] as const;

export function normalizeTarotSpeech(rawText: string): string {
  let normalized = rawText.trim();

  for (const { pattern, replacement } of TAROT_VOICE_DICTIONARY) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/\s+punto y aparte\b/gi, ".\n")
    .replace(/\s+punto seguido\b/gi, ". ")
    .replace(/\s+coma\b/gi, ",")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/(^|[.!?]\s+)([\p{L}])/gu, (_, boundary: string, letter: string) =>
      `${boundary}${letter.toLocaleUpperCase("es-AR")}`
    )
    .replace(/[ \t]+([,.!?])/g, "$1")
    .replace(/([,.!?])([^\s\n])/g, "$1 $2");

  return normalized.trim();
}

export function appendVoiceTranscript(
  existingText: string,
  normalizedChunk: string
): string {
  const chunk = normalizedChunk.trim();
  if (!chunk) return existingText;
  if (!existingText || /\s$/.test(existingText)) return `${existingText}${chunk}`;
  return `${existingText} ${chunk}`;
}
