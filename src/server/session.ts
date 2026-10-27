import "server-only";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSignedPayloadToken,
  hashSessionToken,
  verifySignedPayloadToken,
  verifySignedSessionToken,
} from "@/server/crypto-auth";
import { DEMO_USER_ID, getDb, getDemoDb } from "@/server/db";
import { BUILTIN_DECKS } from "@/lib/tarot-catalog";
import type { User, UserOnboardingState, UserPreferences } from "@/types/domain";

export const SESSION_COOKIE_NAME = "grimorio_session";
const SESSION_DURATION_DAYS = 30;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  workspaceName: string;
  isDemo: boolean;
  preferences: UserPreferences;
  createdAt: string;
  exp: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  workspace_name: string;
  is_demo: number;
  preferences_json: string;
  created_at: string;
}

export function defaultOnboardingState(completed = false): UserOnboardingState {
  return {
    completed,
    currentStep: 1,
    experienceLevel: null,
    usagePurposes: [],
    selectedDeckId: null,
    customDeckCreatedId: null,
    skippedAppointmentDemo: false,
    createdAppointmentId: null,
    skippedReadingDemo: false,
    createdReadingId: null,
    readingTargetType: null,
    targetConsultantId: null,
    completedAt: completed ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
}

export function parseOnboardingState(
  raw: unknown,
  isDemo = false
): UserOnboardingState {
  if (typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>;
    return {
      completed: typeof r.completed === "boolean" ? r.completed : isDemo,
      currentStep:
        typeof r.currentStep === "number" &&
        r.currentStep >= 1 &&
        r.currentStep <= 6
          ? r.currentStep
          : 1,
      experienceLevel:
        r.experienceLevel === "novice" ||
        r.experienceLevel === "intermediate" ||
        r.experienceLevel === "professional"
          ? r.experienceLevel
          : null,
      usagePurposes: Array.isArray(r.usagePurposes)
        ? r.usagePurposes.filter(
            (item): item is string => typeof item === "string"
          )
        : [],
      selectedDeckId:
        typeof r.selectedDeckId === "string" ? r.selectedDeckId : null,
      customDeckCreatedId:
        typeof r.customDeckCreatedId === "string"
          ? r.customDeckCreatedId
          : null,
      skippedAppointmentDemo: Boolean(r.skippedAppointmentDemo),
      createdAppointmentId:
        typeof r.createdAppointmentId === "string"
          ? r.createdAppointmentId
          : null,
      skippedReadingDemo: Boolean(r.skippedReadingDemo),
      createdReadingId:
        typeof r.createdReadingId === "string" ? r.createdReadingId : null,
      readingTargetType:
        r.readingTargetType === "for_me" ||
        r.readingTargetType === "no_consultant" ||
        r.readingTargetType === "consultant"
          ? r.readingTargetType
          : null,
      targetConsultantId:
        typeof r.targetConsultantId === "string"
          ? r.targetConsultantId
          : null,
      completedAt: typeof r.completedAt === "string" ? r.completedAt : null,
      updatedAt:
        typeof r.updatedAt === "string"
          ? r.updatedAt
          : new Date().toISOString(),
    };
  }
  return defaultOnboardingState(isDemo);
}

export function parseUserPreferences(json: string, isDemo = false): UserPreferences {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) {
      const rec = parsed as Record<string, unknown>;
      return {
        defaultDeckId:
          typeof rec.defaultDeckId === "string" ? rec.defaultDeckId : null,
        defaultSpreadId:
          typeof rec.defaultSpreadId === "string" ? rec.defaultSpreadId : null,
        compactTables: Boolean(rec.compactTables),
        autosaveReadings:
          typeof rec.autosaveReadings === "boolean"
            ? rec.autosaveReadings
            : true,
        onboarding: parseOnboardingState(rec.onboarding, isDemo),
      };
    }
  } catch {
    // Fallback to safe defaults if preferences JSON is malformed
  }
  return {
    defaultDeckId: null,
    defaultSpreadId: null,
    compactTables: false,
    autosaveReadings: true,
    onboarding: defaultOnboardingState(isDemo),
  };
}

export function mapUserRow(row: UserRow): User {
  const isDemo = row.is_demo === 1;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    workspaceName: row.workspace_name,
    isDemo,
    preferences: parseUserPreferences(row.preferences_json, isDemo),
    createdAt: row.created_at,
  };
}

export interface SessionCreationResult {
  signedToken: string;
  expiresAt: Date;
  cookieOptions: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    expires: Date;
    maxAge: number;
  };
}

export function extractSessionTokenFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getUserFromToken(signed: string): Promise<User | null> {
  // 1. Verificar token autocontenido con payload HMAC (resistente entre lambdas efímeras de Vercel)
  const payload = verifySignedPayloadToken<SessionPayload>(signed);
  if (payload && payload.userId) {
    if (typeof payload.exp === "number" && payload.exp < Date.now()) {
      return null;
    }

    const user: User = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      workspaceName: payload.workspaceName,
      isDemo: Boolean(payload.isDemo),
      preferences: payload.preferences || {
        defaultDeckId: null,
        defaultSpreadId: null,
        compactTables: false,
        autosaveReadings: true,
      },
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    // Para usuarios de demostración, usar la base en memoria y nunca tocar la base física
    if (user.isDemo || user.id === DEMO_USER_ID) {
      try {
        const demoDb = getDemoDb();
        const existing = (await demoDb
          .prepare("SELECT * FROM users WHERE id = ?")
          .get(DEMO_USER_ID)) as UserRow | undefined;
        if (existing) {
          return mapUserRow(existing);
        }
        return user;
      } catch {
        return user;
      }
    }

    // Asegurar que el usuario exista en la instancia SQLite local o Turso y leer sus datos vigentes
    try {
      const db = getDb();
      const existing = (await db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(payload.userId)) as UserRow | undefined;

      if (existing) {
        return mapUserRow(existing);
      }

      await db.prepare(`
        INSERT INTO users (id, email, name, workspace_name, password_hash, is_demo, preferences_json, created_at)
        VALUES (?, ?, ?, ?, '', ?, ?, ?)
      `).run(
        user.id,
        user.email,
        user.name,
        user.workspaceName,
        user.isDemo ? 1 : 0,
        JSON.stringify(user.preferences),
        user.createdAt
      );

      // Si no tiene mazos registrados en esta instancia, asegurar mazos base
      const checkDeck = db.prepare("SELECT id FROM decks WHERE user_id = ? LIMIT 1");
      if (!(await checkDeck.get(user.id))) {
        for (const deck of BUILTIN_DECKS) {
          await db.prepare(`
            INSERT OR IGNORE INTO decks (
              id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).run(
            `${deck.id}-${user.id}`,
            user.id,
            deck.name,
            deck.tradition,
            deck.author,
            deck.cardCount,
            deck.description,
            deck.isDefault ? 1 : 0,
            user.createdAt
          );
        }
      }
    } catch {
      // Ignorar fallos de sincronización si la BD local está restringida
    }

    return user;
  }

  // 2. Fallback de compatibilidad hacia atrás: token raw consultado en tabla sessions
  const raw = verifySignedSessionToken(signed);
  if (raw) {
    try {
      const db = getDb();
      const tokenHash = hashSessionToken(raw);
      const nowIso = new Date().toISOString();

      const row = (await db
        .prepare(
          `SELECT u.id, u.email, u.name, u.workspace_name, u.is_demo, u.preferences_json, u.created_at
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ? AND s.expires_at > ?`
        )
        .get(tokenHash, nowIso)) as UserRow | undefined;

      if (row) return mapUserRow(row);
    } catch {
      // ignore
    }
  }

  return null;
}

export async function createUserSession(
  userOrId: User | string,
  request?: Request
): Promise<SessionCreationResult> {
  const isDemo =
    (typeof userOrId === "object" && userOrId !== null && userOrId.isDemo) ||
    userOrId === DEMO_USER_ID;
  const db = isDemo ? getDemoDb() : getDb();
  let user: User;

  if (typeof userOrId === "string") {
    const row = (await db
      .prepare(
        `SELECT id, email, name, workspace_name, is_demo, preferences_json, created_at
         FROM users WHERE id = ?`
      )
      .get(userOrId)) as UserRow | undefined;
    if (!row) {
      throw new Error("No se encontró el usuario para crear la sesión.");
    }
    user = mapUserRow(row);
  } else {
    user = userOrId;
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    workspaceName: user.workspaceName,
    isDemo: user.isDemo,
    preferences: user.preferences,
    createdAt: user.createdAt,
    exp: expiresAt.getTime(),
  };

  const signedToken = createSignedPayloadToken<SessionPayload>(payload);

  // Registro auxiliar opcional en tabla sessions si está disponible
  try {
    const tokenHash = hashSessionToken(user.id + ":" + now.getTime());
    await db.prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      user.id,
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString()
    );
  } catch {
    // Non-fatal en serverless efímero
  }

  let isHttps = false;
  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    isHttps =
      forwardedProto === "https" ||
      request.url.startsWith("https:") ||
      process.env.FORCE_SECURE_COOKIE === "true";
  } else {
    try {
      const hdrs = await headers();
      const forwardedProto = hdrs.get("x-forwarded-proto");
      isHttps =
        forwardedProto === "https" ||
        process.env.FORCE_SECURE_COOKIE === "true";
    } catch {
      isHttps = process.env.NODE_ENV === "production";
    }
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  };

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signedToken, cookieOptions);
  } catch {
    // Si cookies() no está disponible fuera del ciclo de SSR/Server Action, se gestiona vía response.cookies
  }

  return { signedToken, expiresAt, cookieOptions };
}

export async function destroyCurrentSession(request?: Request): Promise<void> {
  let signed: string | null | undefined;
  if (request) {
    signed = extractSessionTokenFromCookieHeader(request.headers.get("cookie"));
  }

  try {
    const cookieStore = await cookies();
    if (!signed) {
      signed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Si cookies() no está disponible fuera de ciclo, se limpia en response.cookies
  }

  if (signed) {
    const raw = verifySignedSessionToken(signed);
    if (raw) {
      const db = getDb();
      await db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        hashSessionToken(raw)
      );
    }
  }
}

export async function getCurrentUser(request?: Request): Promise<User | null> {
  // 1. Intentar desde el header Cookie de la petición HTTP (ideal para Route Handlers)
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    const token = extractSessionTokenFromCookieHeader(cookieHeader);
    if (token) {
      const user = await getUserFromToken(token);
      if (user) return user;
    }
  }

  // 2. Intentar desde next/headers cookies() (Server Components y Server Actions)
  try {
    const cookieStore = await cookies();
    const signed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (signed) {
      return await getUserFromToken(signed);
    }
  } catch {
    // Ignorar si no está dentro del request scope de Server Components
  }

  return null;
}

export async function requireUser(request?: Request): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    redirect("/acceso");
  }
  return user;
}
