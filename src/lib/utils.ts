import { clsx, type ClassValue } from "clsx";
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge";
import { AVATAR_HUES } from "@/lib/constants";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function safeParseDate(iso: string): Date {
  // If it's a date-time string without timezone, parse as local time
  if (typeof iso === "string" && iso.length === 16 && iso.includes("T")) {
    const [datePart, timePart] = iso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [h, min] = timePart.split(":").map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d) && !Number.isNaN(h) && !Number.isNaN(min)) {
      return new Date(y, m - 1, d, h, min, 0, 0);
    }
  }
  const parsed = parseISO(iso);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(iso);
  }
  return parsed;
}

export function toIsoUtcString(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return new Date().toISOString();
  if (dateOrIso instanceof Date) return dateOrIso.toISOString();

  const trimmed = dateOrIso.trim();
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/i.exec(
      trimmed
    );
  if (!match) {
    throw new RangeError("La fecha debe ser una fecha y hora ISO 8601 válida.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction, timezone] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText ?? 0);
  const millisecond = Number((fraction ?? "").padEnd(3, "0"));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new RangeError("La fecha debe ser una fecha y hora ISO 8601 válida.");
  }

  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new RangeError("La fecha debe ser una fecha y hora ISO 8601 válida.");
  }

  if (timezone) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new RangeError("La fecha debe ser una fecha y hora ISO 8601 válida.");
    }
    return parsed.toISOString();
  }

  const localDate = new Date(year, month - 1, day, hour, minute, second, millisecond);
  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hour ||
    localDate.getMinutes() !== minute
  ) {
    throw new RangeError("La fecha y hora local seleccionada no existe.");
  }
  return localDate.toISOString();
}

export function formatSessionDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? safeParseDate(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return typeof dateInput === "string" ? dateInput : "";

  try {
    const day = d.getDate();
    const month = new Intl.DateTimeFormat("es-ES", { month: "short" })
      .format(d)
      .replace(/\./g, "");
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = d.getFullYear();
    const time = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);

    return `${day} ${capitalizedMonth} ${year} · ${time}`;
  } catch {
    return format(d, "d MMM yyyy · HH:mm", { locale: es });
  }
}

export function createReadingTitle(
  explicitTitle: string,
  spreadName: string,
  consultantName?: string | null
): string {
  const title = explicitTitle.trim();
  if (title) return title;

  const structure = spreadName
    .trim()
    .replace(/\s*\(\d+\s+cartas?\)\s*$/i, "");
  const context = [structure, consultantName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const words = (context || "Lectura personal").split(/\s+/);
  return words.length > 6 ? `${words.slice(0, 6).join(" ")}…` : words.join(" ");
}

export function formatDateLongEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateShortEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "d MMM yyyy", { locale: es });
}

export function formatDateTimeEs(iso: string): string {
  return formatSessionDateTime(iso);
}

export function formatTimeEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return format(d, "HH:mm", { locale: es });
  }
}

export function formatRelativeDayEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const timeStr = formatTimeEs(iso);
  if (isToday(d)) return `Hoy · ${timeStr}`;
  if (isTomorrow(d)) return `Mañana · ${timeStr}`;
  if (isYesterday(d)) return `Ayer · ${timeStr}`;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function toDatetimeLocalValue(iso?: string | null): string {
  const d = iso ? safeParseDate(iso) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${valid.getFullYear()}-${pad(valid.getMonth() + 1)}-${pad(valid.getDate())}T${pad(valid.getHours())}:${pad(valid.getMinutes())}`;
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "GR";
  if (parts.length === 1) {
    return (parts[0] ?? "G").slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "G";
  const last = parts[parts.length - 1]?.[0] ?? "R";
  return `${first}${last}`.toUpperCase();
}

export function deterministicAvatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_HUES[hash % AVATAR_HUES.length] ?? 168;
}

export function getAvatarSurfaceStyles(hue: number): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  return {
    backgroundColor: `hsl(${hue} 28% 92%)`,
    color: `hsl(${hue} 42% 22%)`,
    borderColor: `hsl(${hue} 22% 83%)`,
  };
}

export function parseCommaTags(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const cleaned = part.trim().replace(/\s+/g, " ");
    if (cleaned.length > 0) {
      const lower = cleaned.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(cleaned);
      }
    }
  }
  return result;
}
