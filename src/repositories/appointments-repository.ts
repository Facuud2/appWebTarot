import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { AppointmentFormValues } from "@/schemas/domain";
import { createQuickConsultant } from "@/repositories/consultants-repository";
import { getDb } from "@/server/db";
import type {
  Appointment,
  AppointmentModality,
  AppointmentStatus,
} from "@/types/domain";

interface AppointmentRow {
  id: string;
  user_id: string;
  consultant_id: string;
  consultant_full_name: string;
  consultant_alias: string | null;
  consultant_hue: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  modality: AppointmentModality;
  status: AppointmentStatus;
  intention: string;
  prep_notes: string;
  linked_reading_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapAppointmentRow(row: AppointmentRow): Appointment {
  const displayName =
    row.consultant_alias && row.consultant_alias.trim().length > 0
      ? row.consultant_alias.trim()
      : row.consultant_full_name;

  return {
    id: row.id,
    userId: row.user_id,
    consultantId: row.consultant_id,
    consultantDisplayName: displayName,
    consultantHue: row.consultant_hue,
    title: row.title,
    scheduledAt: row.scheduled_at,
    durationMinutes:
      row.duration_minutes === null || row.duration_minutes === undefined
        ? null
        : Number(row.duration_minutes),
    modality: row.modality,
    status: row.status,
    intention: row.intention,
    prepNotes: row.prep_notes,
    linkedReadingId: row.linked_reading_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ListAppointmentsOptions {
  status?: AppointmentStatus | "all";
  consultantId?: string;
  fromIso?: string;
  toIso?: string;
  ascending?: boolean;
}

export function listAppointments(
  userId: string,
  options: ListAppointmentsOptions = {},
  db: DatabaseSync = getDb(userId)
): Appointment[] {
  const conditions: string[] = ["a.user_id = ?"];
  const params: Array<string | number> = [userId];

  if (options.status && options.status !== "all") {
    conditions.push("a.status = ?");
    params.push(options.status);
  }
  if (options.consultantId) {
    conditions.push("a.consultant_id = ?");
    params.push(options.consultantId);
  }
  if (options.fromIso) {
    conditions.push("a.scheduled_at >= ?");
    params.push(options.fromIso);
  }
  if (options.toIso) {
    conditions.push("a.scheduled_at <= ?");
    params.push(options.toIso);
  }

  const orderDir = options.ascending === false ? "DESC" : "ASC";
  const rows = db
    .prepare(
      `SELECT
         a.*,
         c.full_name AS consultant_full_name,
         c.alias AS consultant_alias,
         c.avatar_hue AS consultant_hue
       FROM appointments a
       JOIN consultants c ON c.id = a.consultant_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.scheduled_at ${orderDir}`
    )
    .all(...params) as unknown as AppointmentRow[];

  return rows.map(mapAppointmentRow);
}

export function listAppointmentsForConsultant(
  userId: string,
  consultantId: string,
  db: DatabaseSync = getDb(userId)
): Appointment[] {
  return listAppointments(
    userId,
    { consultantId, ascending: false },
    db
  );
}

export function getAppointmentById(
  userId: string,
  appointmentId: string,
  db: DatabaseSync = getDb(userId)
): Appointment | null {
  const row = db
    .prepare(
      `SELECT
         a.*,
         c.full_name AS consultant_full_name,
         c.alias AS consultant_alias,
         c.avatar_hue AS consultant_hue
       FROM appointments a
       JOIN consultants c ON c.id = a.consultant_id
       WHERE a.user_id = ? AND a.id = ?`
    )
    .get(userId, appointmentId) as AppointmentRow | undefined;

  return row ? mapAppointmentRow(row) : null;
}

export function createAppointment(
  userId: string,
  values: AppointmentFormValues,
  db: DatabaseSync = getDb(userId)
): Appointment {
  let consultantId = values.consultantId.trim();

  if (values.quickNewConsultant && values.quickNewConsultant.trim().length > 0) {
    const created = createQuickConsultant(
      userId,
      values.quickNewConsultant.trim(),
      db
    );
    consultantId = created.id;
  }

  const consultantCheck = db
    .prepare("SELECT id FROM consultants WHERE user_id = ? AND id = ?")
    .get(userId, consultantId) as { id: string } | undefined;

  if (!consultantCheck) {
    throw new Error("El consultante seleccionado no pertenece a tu agenda.");
  }

  const id = `appt-${randomUUID()}`;
  const nowIso = new Date().toISOString();
  const scheduledDate = new Date(values.scheduledAt);
  const scheduledIso = Number.isNaN(scheduledDate.getTime())
    ? values.scheduledAt
    : scheduledDate.toISOString();
  const resolvedDuration = values.hasSpecificDuration
    ? values.durationMinutes
    : null;

  db.prepare(
    `INSERT INTO appointments (
      id, user_id, consultant_id, title, scheduled_at, duration_minutes,
      modality, status, intention, prep_notes, linked_reading_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
  ).run(
    id,
    userId,
    consultantId,
    values.title.trim(),
    scheduledIso,
    resolvedDuration,
    values.modality,
    values.status,
    values.intention.trim(),
    values.prepNotes.trim(),
    nowIso,
    nowIso
  );

  const created = getAppointmentById(userId, id, db);
  if (!created) {
    throw new Error("No se pudo recuperar la cita creada.");
  }
  return created;
}

export function updateAppointment(
  userId: string,
  appointmentId: string,
  values: AppointmentFormValues,
  db: DatabaseSync = getDb(userId)
): Appointment {
  const consultantCheck = db
    .prepare("SELECT id FROM consultants WHERE user_id = ? AND id = ?")
    .get(userId, values.consultantId) as { id: string } | undefined;

  if (!consultantCheck) {
    throw new Error("El consultante seleccionado no pertenece a tu agenda.");
  }

  const nowIso = new Date().toISOString();
  const scheduledDate = new Date(values.scheduledAt);
  const scheduledIso = Number.isNaN(scheduledDate.getTime())
    ? values.scheduledAt
    : scheduledDate.toISOString();
  const resolvedDuration = values.hasSpecificDuration
    ? values.durationMinutes
    : null;

  const res = db
    .prepare(
      `UPDATE appointments
       SET consultant_id = ?,
           title = ?,
           scheduled_at = ?,
           duration_minutes = ?,
           modality = ?,
           status = ?,
           intention = ?,
           prep_notes = ?,
           updated_at = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(
      values.consultantId,
      values.title.trim(),
      scheduledIso,
      resolvedDuration,
      values.modality,
      values.status,
      values.intention.trim(),
      values.prepNotes.trim(),
      nowIso,
      userId,
      appointmentId
    );

  if (res.changes === 0) {
    throw new Error("No se encontró la cita solicitada.");
  }

  const updated = getAppointmentById(userId, appointmentId, db);
  if (!updated) {
    throw new Error("No se pudo recuperar la cita actualizada.");
  }
  return updated;
}

export function updateAppointmentStatus(
  userId: string,
  appointmentId: string,
  status: AppointmentStatus,
  db: DatabaseSync = getDb(userId)
): Appointment {
  const nowIso = new Date().toISOString();
  const res = db
    .prepare(
      "UPDATE appointments SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?"
    )
    .run(status, nowIso, userId, appointmentId);

  if (res.changes === 0) {
    throw new Error("No se encontró la cita para actualizar estado.");
  }

  const updated = getAppointmentById(userId, appointmentId, db);
  if (!updated) {
    throw new Error("No se pudo recuperar la cita.");
  }
  return updated;
}

export function deleteAppointment(
  userId: string,
  appointmentId: string,
  db: DatabaseSync = getDb(userId)
): void {
  const res = db
    .prepare("DELETE FROM appointments WHERE user_id = ? AND id = ?")
    .run(userId, appointmentId);

  if (res.changes === 0) {
    throw new Error("No se encontró la cita para eliminar.");
  }
}
