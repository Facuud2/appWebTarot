import "server-only";

import { randomUUID } from "node:crypto";
import { deterministicAvatarHue } from "@/lib/utils";
import { listAppointmentsForConsultant } from "@/repositories/appointments-repository";
import { mapCanonicalCardRow, type CanonicalCardRow } from "@/repositories/grimorio-repository";
import { listReadings } from "@/repositories/readings-repository";
import { getTagsForEntity, syncEntityTags } from "@/repositories/tags-repository";
import type { ConsultantFormValues } from "@/schemas/domain";
import { getDb, type AppDatabase } from "@/server/db";
import type { Consultant, ConsultantDetail } from "@/types/domain";

interface ConsultantRow {
  id: string;
  user_id: string;
  full_name: string;
  alias: string | null;
  email: string | null;
  phone: string | null;
  preferred_channel: string | null;
  context_notes: string;
  personal_notes: string;
  avatar_hue: number;
  needs_setup?: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  readings_count: number;
  upcoming_appointments_count: number;
  last_reading_at: string | null;
}

async function mapConsultantRow(
  row: ConsultantRow,
  userId: string,
  db: AppDatabase
): Promise<Consultant> {
  const displayName =
    row.alias && row.alias.trim().length > 0 ? row.alias.trim() : row.full_name;
  const tags = await getTagsForEntity(userId, "consultant", row.id, db);
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    alias: row.alias,
    displayName,
    email: row.email,
    phone: row.phone,
    preferredChannel: row.preferred_channel,
    contextNotes: row.context_notes,
    personalNotes: row.personal_notes,
    avatarHue: row.avatar_hue,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    readingsCount: Number(row.readings_count ?? 0),
    upcomingAppointmentsCount: Number(row.upcoming_appointments_count ?? 0),
    lastReadingAt: row.last_reading_at,
    needsSetup: row.needs_setup === 1,
  };
}

export interface ListConsultantsOptions {
  query?: string;
  tag?: string;
  includeArchived?: boolean;
  onlyArchived?: boolean;
}

export async function listConsultants(
  userId: string,
  options: ListConsultantsOptions = {},
  db: AppDatabase = getDb(userId)
): Promise<Consultant[]> {
  const nowIso = new Date().toISOString();
  const params: Array<string | number> = [nowIso, userId];
  const conditions: string[] = ["c.user_id = ?"];

  if (options.onlyArchived) {
    conditions.push("c.archived_at IS NOT NULL");
  } else if (!options.includeArchived) {
    conditions.push("c.archived_at IS NULL");
  }

  if (options.query && options.query.trim().length > 0) {
    const like = `%${options.query.trim()}%`;
    conditions.push(
      "(c.full_name LIKE ? OR COALESCE(c.alias, '') LIKE ? OR c.context_notes LIKE ? OR c.personal_notes LIKE ?)"
    );
    params.push(like, like, like, like);
  }

  if (options.tag && options.tag.trim().length > 0) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM entity_tags et
        JOIN tags t ON t.id = et.tag_id
        WHERE et.entity_type = 'consultant'
          AND et.entity_id = c.id
          AND t.user_id = ?
          AND t.normalized_name = ?
      )`
    );
    params.push(userId, options.tag.trim().toLowerCase());
  }

  const sql = `
    SELECT
      c.*,
      (SELECT COUNT(*) FROM readings r WHERE r.consultant_id = c.id AND r.user_id = c.user_id) AS readings_count,
      (SELECT COUNT(*) FROM appointments a WHERE a.consultant_id = c.id AND a.user_id = c.user_id AND a.status = 'scheduled' AND a.scheduled_at >= ?) AS upcoming_appointments_count,
      (SELECT MAX(r2.performed_at) FROM readings r2 WHERE r2.consultant_id = c.id AND r2.user_id = c.user_id) AS last_reading_at
    FROM consultants c
    WHERE ${conditions.join(" AND ")}
    ORDER BY COALESCE(last_reading_at, c.updated_at) DESC
  `;

  const rows = (await db.prepare(sql).all(...params)) as unknown as ConsultantRow[];
  return Promise.all(rows.map((row) => mapConsultantRow(row, userId, db)));
}

export async function getConsultantById(
  userId: string,
  consultantId: string,
  db: AppDatabase = getDb(userId)
): Promise<Consultant | null> {
  const nowIso = new Date().toISOString();
  const row = (await db
    .prepare(
      `SELECT
         c.*,
         (SELECT COUNT(*) FROM readings r WHERE r.consultant_id = c.id AND r.user_id = c.user_id) AS readings_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.consultant_id = c.id AND a.user_id = c.user_id AND a.status = 'scheduled' AND a.scheduled_at >= ?) AS upcoming_appointments_count,
         (SELECT MAX(r2.performed_at) FROM readings r2 WHERE r2.consultant_id = c.id AND r2.user_id = c.user_id) AS last_reading_at
       FROM consultants c
       WHERE c.user_id = ? AND c.id = ?`
    )
    .get(nowIso, userId, consultantId)) as ConsultantRow | undefined;

  if (!row) return null;
  return mapConsultantRow(row, userId, db);
}

export async function getConsultantDetail(
  userId: string,
  consultantId: string,
  db: AppDatabase = getDb(userId)
): Promise<ConsultantDetail | null> {
  const consultant = await getConsultantById(userId, consultantId, db);
  if (!consultant) return null;

  const readings = await listReadings(userId, { consultantId }, db);
  const appointments = await listAppointmentsForConsultant(userId, consultantId, db);

  interface FreqCardRow extends CanonicalCardRow {
    appearances_count: number;
    last_seen_at: string;
  }

  const freqRows = (await db
    .prepare(
      `SELECT
         cc.*,
         COUNT(rc.id) AS appearances_count,
         MAX(r.performed_at) AS last_seen_at
       FROM reading_cards rc
       JOIN readings r ON r.id = rc.reading_id
       JOIN cards_catalog cc ON cc.id = rc.card_id
       WHERE r.user_id = ? AND r.consultant_id = ?
       GROUP BY cc.id
       ORDER BY appearances_count DESC, last_seen_at DESC
       LIMIT 6`
    )
    .all(userId, consultantId)) as unknown as FreqCardRow[];

  return {
    consultant,
    readings,
    appointments,
    frequentCards: freqRows.map((fr) => ({
      card: mapCanonicalCardRow(fr),
      count: Number(fr.appearances_count),
      lastSeenAt: fr.last_seen_at,
    })),
  };
}

export async function createConsultant(
  userId: string,
  values: ConsultantFormValues,
  db: AppDatabase = getDb(userId),
  options?: { needsSetup?: boolean }
): Promise<Consultant> {
  const id = `cons-${randomUUID()}`;
  const nowIso = new Date().toISOString();
  const hue = deterministicAvatarHue(values.alias || values.fullName);
  const needsSetupInt = options?.needsSetup ? 1 : 0;

  await db.exec("BEGIN");
  try {
    await db.prepare(
      `INSERT INTO consultants (
        id, user_id, full_name, alias, email, phone, preferred_channel,
        context_notes, personal_notes, avatar_hue, needs_setup, archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
    ).run(
      id,
      userId,
      values.fullName.trim(),
      values.alias.trim() || null,
      values.email.trim() || null,
      values.phone.trim() || null,
      values.preferredChannel.trim() || null,
      values.contextNotes.trim(),
      values.personalNotes.trim(),
      hue,
      needsSetupInt,
      nowIso,
      nowIso
    );

    await syncEntityTags(userId, "consultant", id, values.tags, "consultant", db);
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const created = await getConsultantById(userId, id, db);
  if (!created) {
    throw new Error("No se pudo recuperar la ficha del consultante creado.");
  }
  return created;
}

export async function createQuickConsultant(
  userId: string,
  rawName: string,
  db: AppDatabase = getDb(userId)
): Promise<Consultant> {
  const cleanName = rawName.trim();
  return createConsultant(
    userId,
    {
      fullName: cleanName,
      alias: "",
      email: "",
      phone: "",
      preferredChannel: "",
      contextNotes: "Consultante registrado rápidamente al abrir una lectura.",
      personalNotes: "",
      tags: ["Pendiente de datos"],
    },
    db,
    { needsSetup: true }
  );
}

export async function updateConsultant(
  userId: string,
  consultantId: string,
  values: ConsultantFormValues,
  db: AppDatabase = getDb(userId)
): Promise<Consultant> {
  const existing = await getConsultantById(userId, consultantId, db);
  if (!existing) {
    throw new Error("El consultante solicitado no existe o no tienes acceso.");
  }

  const nowIso = new Date().toISOString();
  await db.exec("BEGIN");
  try {
    await db.prepare(
      `UPDATE consultants
       SET full_name = ?,
           alias = ?,
           email = ?,
           phone = ?,
           preferred_channel = ?,
           context_notes = ?,
           personal_notes = ?,
           needs_setup = 0,
           updated_at = ?
       WHERE user_id = ? AND id = ?`
    ).run(
      values.fullName.trim(),
      values.alias.trim() || null,
      values.email.trim() || null,
      values.phone.trim() || null,
      values.preferredChannel.trim() || null,
      values.contextNotes.trim(),
      values.personalNotes.trim(),
      nowIso,
      userId,
      consultantId
    );

    await syncEntityTags(
      userId,
      "consultant",
      consultantId,
      values.tags,
      "consultant",
      db
    );
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const updated = await getConsultantById(userId, consultantId, db);
  if (!updated) {
    throw new Error("No se pudo recuperar el consultante actualizado.");
  }
  return updated;
}

export async function setConsultantArchived(
  userId: string,
  consultantId: string,
  archived: boolean,
  db: AppDatabase = getDb(userId)
): Promise<Consultant> {
  const nowIso = new Date().toISOString();
  const res = await db
    .prepare(
      `UPDATE consultants
       SET archived_at = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(archived ? nowIso : null, nowIso, userId, consultantId);

  if (res.changes === 0) {
    throw new Error("No se encontró el consultante para actualizar su archivo.");
  }

  const updated = await getConsultantById(userId, consultantId, db);
  if (!updated) {
    throw new Error("No se pudo leer el consultante actualizado.");
  }
  return updated;
}

export async function deleteConsultant(
  userId: string,
  consultantId: string,
  db: AppDatabase = getDb(userId)
): Promise<void> {
  await db.exec("BEGIN");
  try {
    await db.prepare(
      `DELETE FROM entity_tags
       WHERE entity_type = 'consultant' AND entity_id = ?
         AND tag_id IN (SELECT id FROM tags WHERE user_id = ?)`
    ).run(consultantId, userId);

    const res = await db
      .prepare("DELETE FROM consultants WHERE user_id = ? AND id = ?")
      .run(userId, consultantId);

    if (res.changes === 0) {
      throw new Error("No se encontró el consultante para eliminar.");
    }
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
}
