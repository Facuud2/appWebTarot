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
  const parsed = parseISO(iso);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(iso);
  }
  return parsed;
}

export function formatDateLongEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateShortEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "yyyy-MM-dd");
}

export function formatDateTimeEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "d MMM yyyy · HH:mm", { locale: es });
}

export function formatTimeEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm", { locale: es });
}

export function formatRelativeDayEs(iso: string): string {
  const d = safeParseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (isToday(d)) return `Hoy · ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Mañana · ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Ayer · ${format(d, "HH:mm")}`;
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
