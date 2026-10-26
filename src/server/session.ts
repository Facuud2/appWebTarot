import "server-only";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createRawSessionToken,
  hashSessionToken,
  verifySignedSessionToken,
} from "@/server/crypto-auth";
import { getDb } from "@/server/db";
import type { User, UserPreferences } from "@/types/domain";

export const SESSION_COOKIE_NAME = "grimorio_session";
const SESSION_DURATION_DAYS = 30;

interface UserRow {
  id: string;
  email: string;
  name: string;
  workspace_name: string;
  is_demo: number;
  preferences_json: string;
  created_at: string;
}

function parseUserPreferences(json: string): UserPreferences {
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
  };
}

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    workspaceName: row.workspace_name,
    isDemo: row.is_demo === 1,
    preferences: parseUserPreferences(row.preferences_json),
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

export function getUserFromToken(signed: string): User | null {
  const raw = verifySignedSessionToken(signed);
  if (!raw) return null;

  const db = getDb();
  const tokenHash = hashSessionToken(raw);
  const nowIso = new Date().toISOString();

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.workspace_name, u.is_demo, u.preferences_json, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(tokenHash, nowIso) as UserRow | undefined;

  if (!row) return null;
  return mapUserRow(row);
}

export async function createUserSession(
  userId: string,
  request?: Request
): Promise<SessionCreationResult> {
  const db = getDb();
  const signedToken = createRawSessionToken();
  const rawToken = verifySignedSessionToken(signedToken);
  if (!rawToken) {
    throw new Error("No fue posible generar la sesión segura.");
  }

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    userId,
    tokenHash,
    expiresAt.toISOString(),
    now.toISOString()
  );

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
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
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
      const user = getUserFromToken(token);
      if (user) return user;
    }
  }

  // 2. Intentar desde next/headers cookies() (Server Components y Server Actions)
  try {
    const cookieStore = await cookies();
    const signed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (signed) {
      return getUserFromToken(signed);
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
