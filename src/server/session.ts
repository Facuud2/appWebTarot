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

export async function createUserSession(userId: string): Promise<void> {
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

  const hdrs = await headers();
  const forwardedProto = hdrs.get("x-forwarded-proto");
  const isHttps =
    forwardedProto === "https" || process.env.FORCE_SECURE_COOKIE === "true";

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (signed) {
    const raw = verifySignedSessionToken(signed);
    if (raw) {
      const db = getDb();
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        hashSessionToken(raw)
      );
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!signed) return null;

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

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/acceso");
  }
  return user;
}
