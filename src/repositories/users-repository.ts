import "server-only";

import { randomUUID } from "node:crypto";
import { listAppointments } from "@/repositories/appointments-repository";
import { listConsultants } from "@/repositories/consultants-repository";
import {
  listDecks,
  listGrimorioCards,
} from "@/repositories/grimorio-repository";
import { getReadingDetail, listReadings } from "@/repositories/readings-repository";
import { syncEntityTags } from "@/repositories/tags-repository";
import type {
  LoginInput,
  RegisterInput,
  WorkspaceProfileValues,
} from "@/schemas/domain";
import { workspaceBackupSchema } from "@/schemas/domain";
import { hashPassword, verifyPassword } from "@/server/crypto-auth";
import { DEMO_USER_ID, getDb, getDemoDb, seedDemoWorkspaceIfMissing, type AppDatabase } from "@/server/db";
import { defaultOnboardingState, mapUserRow, parseUserPreferences } from "@/server/session";
import type { User, UserOnboardingState, UserPreferences, WorkspaceBackupPayload } from "@/types/domain";

interface AuthUserRow {
  id: string;
  email: string;
  name: string;
  workspace_name: string;
  password_hash: string;
  is_demo: number;
  preferences_json: string;
  created_at: string;
}

export async function authenticateUser(
  input: LoginInput,
  db: AppDatabase = getDb()
): Promise<User | null> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const row = (await db
    .prepare("SELECT * FROM users WHERE LOWER(email) = ?")
    .get(normalizedEmail)) as AuthUserRow | undefined;

  if (!row) return null;
  if (!verifyPassword(input.password, row.password_hash)) {
    return null;
  }

  return mapUserRow(row);
}

export async function getDemoUser(db: AppDatabase = getDemoDb()): Promise<User> {
  let row = (await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(DEMO_USER_ID)) as AuthUserRow | undefined;

  if (!row) {
    await seedDemoWorkspaceIfMissing(db);
    row = (await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(DEMO_USER_ID)) as AuthUserRow | undefined;
  }

  if (!row) {
    throw new Error("El espacio de demostración no está inicializado.");
  }
  return mapUserRow(row);
}

export async function registerNewUser(
  input: RegisterInput,
  db: AppDatabase = getDb()
): Promise<User> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = (await db
    .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
    .get(normalizedEmail)) as { id: string } | undefined;

  if (existing) {
    throw new Error("Ya existe una cuenta registrada con ese correo electrónico.");
  }

  const userId = `user-${randomUUID()}`;
  const nowIso = new Date().toISOString();
  const rawWorkspace = input.workspaceName?.trim();
  const resolvedWorkspaceName =
    rawWorkspace && rawWorkspace.length > 0
      ? rawWorkspace
      : `Mesa de ${input.name.trim()}`;

  const prefs: UserPreferences = {
    defaultDeckId: null,
    defaultSpreadId: "spread-triad-observation",
    compactTables: false,
    autosaveReadings: true,
    onboarding: defaultOnboardingState(false),
  };

  await db.exec("BEGIN");
  try {
    await db.prepare(
      `INSERT INTO users (id, email, name, workspace_name, password_hash, is_demo, preferences_json, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      userId,
      normalizedEmail,
      input.name.trim(),
      resolvedWorkspaceName,
      hashPassword(input.password),
      JSON.stringify(prefs),
      nowIso
    );

    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const row = (await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId)) as AuthUserRow | undefined;

  if (!row) {
    throw new Error("No se pudo recuperar el usuario recién creado.");
  }
  return mapUserRow(row);
}

export async function updateUserWorkspaceProfile(
  userId: string,
  values: WorkspaceProfileValues,
  db: AppDatabase = getDb(userId)
): Promise<User> {
  const prefs = {
    defaultDeckId: values.defaultDeckId.trim() || null,
    defaultSpreadId: values.defaultSpreadId.trim() || null,
    compactTables: values.compactTables,
    autosaveReadings: values.autosaveReadings,
  };

  const res = await db
    .prepare(
      `UPDATE users
       SET name = ?, workspace_name = ?, preferences_json = ?
       WHERE id = ?`
    )
    .run(
      values.name.trim(),
      values.workspaceName.trim(),
      JSON.stringify(prefs),
      userId
    );

  if (res.changes === 0) {
    throw new Error("No se encontró el perfil de usuario.");
  }

  const row = (await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId)) as AuthUserRow | undefined;
  if (!row) {
    throw new Error("No se pudo leer el perfil actualizado.");
  }
  return mapUserRow(row);
}

export async function saveUserOnboardingProgress(
  userId: string,
  progress: Partial<UserOnboardingState>,
  db: AppDatabase = getDb(userId)
): Promise<User> {
  const row = (await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId)) as AuthUserRow | undefined;

  if (!row) {
    throw new Error("No se encontró el usuario para guardar el progreso.");
  }

  const isDemo = row.is_demo === 1;
  const currentPrefs = parseUserPreferences(row.preferences_json, isDemo);
  const currentOnboarding =
    currentPrefs.onboarding ?? defaultOnboardingState(isDemo);

  const updatedOnboarding: UserOnboardingState = {
    ...currentOnboarding,
    ...progress,
    updatedAt: new Date().toISOString(),
  };

  const updatedPrefs: UserPreferences = {
    ...currentPrefs,
    onboarding: updatedOnboarding,
  };

  if (progress.selectedDeckId !== undefined) {
    updatedPrefs.defaultDeckId = progress.selectedDeckId;
  }

  await db.prepare(
    "UPDATE users SET preferences_json = ? WHERE id = ?"
  ).run(JSON.stringify(updatedPrefs), userId);

  const updatedRow = (await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId)) as AuthUserRow | undefined;

  if (!updatedRow) {
    throw new Error("No se pudo leer el usuario actualizado.");
  }

  return mapUserRow(updatedRow);
}

export async function completeUserOnboarding(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<User> {
  return saveUserOnboardingProgress(
    userId,
    {
      completed: true,
      currentStep: 6,
      completedAt: new Date().toISOString(),
    },
    db
  );
}

export async function resetUserOnboarding(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<User> {
  return saveUserOnboardingProgress(
    userId,
    {
      completed: false,
      currentStep: 1,
      completedAt: null,
    },
    db
  );
}

export async function exportWorkspaceBackup(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<WorkspaceBackupPayload> {
  const userRow = (await db
    .prepare("SELECT workspace_name FROM users WHERE id = ?")
    .get(userId)) as { workspace_name: string } | undefined;

  const consultants = await listConsultants(
    userId,
    { includeArchived: true },
    db
  );
  const decks = await listDecks(userId, db);
  const grimorio = await listGrimorioCards(
    userId,
    { onlyAnnotated: true },
    db
  );
  const readingSummaries = await listReadings(userId, {}, db);
  const appointments = await listAppointments(userId, {}, db);

  const detailedReadings = (
    await Promise.all(
      readingSummaries.map((summary) => getReadingDetail(userId, summary.id, db))
    )
  ).filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspaceName: userRow?.workspace_name ?? "Mesa de Tarot",
    consultants: consultants.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      alias: c.alias,
      email: c.email,
      phone: c.phone,
      preferredChannel: c.preferredChannel,
      contextNotes: c.contextNotes,
      personalNotes: c.personalNotes,
      avatarHue: c.avatarHue,
      archivedAt: c.archivedAt,
      tags: c.tags.map((t) => t.name),
    })),
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      tradition: d.tradition,
      author: d.author,
      cardCount: d.cardCount,
      description: d.description,
      isDefault: d.isDefault,
    })),
    cardEntries: grimorio
      .filter((g) => g.personalEntry !== null)
      .map((g) => {
        const pe = g.personalEntry!;
        return {
          cardId: pe.cardId,
          deckId: pe.deckId,
          customImageUrl: pe.customImageUrl,
          personalMeaning: pe.personalMeaning,
          reversedMeaning: pe.reversedMeaning,
          symbolsAssociations: pe.symbolsAssociations,
          keywords: pe.keywords,
          reflections: pe.reflections,
          tags: pe.tags.map((t) => t.name),
        };
      }),
    readings: detailedReadings.map((r) => ({
      id: r.id,
      consultantId: r.consultantId,
      deckId: r.deckId,
      deckIds: r.deckIds,
      spreadTemplateId: r.spreadTemplateId,
      spreadName: r.spreadName,
      customPositions: r.customPositions,
      title: r.title,
      questionIntention: r.questionIntention,
      sessionContext: r.sessionContext,
      status: r.status,
      performedAt: r.performedAt,
      generalObservations: r.generalObservations,
      sessionSynthesis: r.sessionSynthesis,
      closingReflections: r.closingReflections,
      tags: r.tags.map((t) => t.name),
      cards: r.cards.map((c) => ({
        positionIndex: c.positionIndex,
        positionTitle: c.positionTitle,
        positionPrompt: c.positionPrompt,
        cardId: c.cardId,
        orientation: c.orientation,
        observationNotes: c.observationNotes,
        contextualInterpretation: c.contextualInterpretation,
        personalTakeaway: c.personalTakeaway,
      })),
      events: r.events.map((e) => ({
        cardId: e.cardId,
        occurredPhase: e.occurredPhase,
        phenomenonType: e.phenomenonType,
        customPhenomenonLabel: e.customPhenomenonLabel,
        linkedPositionIndex: e.linkedPositionIndex,
        observationDescription: e.observationDescription,
        personalInterpretation: e.personalInterpretation,
        occurredAt: e.occurredAt,
        tags: e.tags.map((t) => t.name),
      })),
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      consultantId: a.consultantId,
      title: a.title,
      scheduledAt: a.scheduledAt,
      durationMinutes: a.durationMinutes,
      modality: a.modality,
      status: a.status,
      intention: a.intention,
      prepNotes: a.prepNotes,
    })),
  };
}

export async function importWorkspaceBackup(
  userId: string,
  rawJson: unknown,
  db: AppDatabase = getDb(userId)
): Promise<{ importedReadings: number; importedConsultants: number }> {
  const parsed = workspaceBackupSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new Error(
      "El archivo de respaldo no tiene un formato válido."
    );
  }
  const payload = parsed.data;
  const nowIso = new Date().toISOString();

  const consultantIdMap = new Map<string, string>();
  const deckIdMap = new Map<string, string>();

  await db.exec("BEGIN");
  try {
    for (const d of payload.decks) {
      const newDeckId = `deck-${randomUUID()}`;
      deckIdMap.set(d.id, newDeckId);
      await db.prepare(
        `INSERT INTO decks (
          id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
      ).run(
        newDeckId,
        userId,
        d.name,
        d.tradition,
        d.author,
        d.cardCount,
        d.description,
        nowIso
      );
    }

    for (const c of payload.consultants) {
      const newConsId = `cons-${randomUUID()}`;
      consultantIdMap.set(c.id, newConsId);
      await db.prepare(
        `INSERT INTO consultants (
          id, user_id, full_name, alias, email, phone, preferred_channel,
          context_notes, personal_notes, avatar_hue, archived_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newConsId,
        userId,
        c.fullName,
        c.alias,
        c.email,
        c.phone,
        c.preferredChannel,
        c.contextNotes,
        c.personalNotes,
        c.avatarHue,
        c.archivedAt,
        nowIso,
        nowIso
      );
      await syncEntityTags(userId, "consultant", newConsId, c.tags, "consultant", db);
    }

    for (const ce of payload.cardEntries) {
      const mappedDeckId = ce.deckId ? (deckIdMap.get(ce.deckId) ?? null) : null;
      const ceId = `ce-${randomUUID()}`;
      await db.prepare(
        `INSERT OR REPLACE INTO card_entries (
          id, user_id, card_id, deck_id, custom_image_url, personal_meaning,
          reversed_meaning, symbols_associations, keywords_json, reflections, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        ceId,
        userId,
        ce.cardId,
        mappedDeckId,
        ce.customImageUrl,
        ce.personalMeaning,
        ce.reversedMeaning,
        ce.symbolsAssociations,
        JSON.stringify(ce.keywords),
        ce.reflections,
        nowIso
      );
      await syncEntityTags(userId, "card_entry", ceId, ce.tags, "general", db);
    }

    for (const r of payload.readings) {
      const newReadingId = `read-${randomUUID()}`;
      const mappedCons = r.consultantId
        ? (consultantIdMap.get(r.consultantId) ?? null)
        : null;
      const sourceDeckIds =
        r.deckIds && r.deckIds.length > 0
          ? r.deckIds
          : r.deckId
            ? [r.deckId]
            : [];
      const mappedDeckIds = sourceDeckIds
        .map((id) => deckIdMap.get(id))
        .filter((id): id is string => Boolean(id));
      const mappedDeck = mappedDeckIds[0] ?? null;

      await db.prepare(
        `INSERT INTO readings (
          id, user_id, consultant_id, appointment_id, deck_id, deck_ids_json,
          spread_template_id, spread_name, custom_positions_json, title,
          question_intention, session_context, status, performed_at,
          general_observations, session_synthesis, closing_reflections,
          created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newReadingId,
        userId,
        mappedCons,
        mappedDeck,
        JSON.stringify(mappedDeckIds),
        r.spreadName,
        JSON.stringify(r.customPositions ?? []),
        r.title,
        r.questionIntention,
        r.sessionContext,
        r.status,
        r.performedAt,
        r.generalObservations,
        r.sessionSynthesis,
        r.closingReflections,
        nowIso,
        nowIso
      );
      await syncEntityTags(userId, "reading", newReadingId, r.tags, "theme", db);

      for (const rc of r.cards) {
        await db.prepare(
          `INSERT INTO reading_cards (
            id, reading_id, position_index, position_title, position_prompt,
            card_id, orientation, observation_notes, contextual_interpretation,
            personal_takeaway, synced_to_grimorio, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        ).run(
          `rc-${randomUUID()}`,
          newReadingId,
          rc.positionIndex,
          rc.positionTitle,
          rc.positionPrompt,
          rc.cardId,
          rc.orientation,
          rc.observationNotes,
          rc.contextualInterpretation,
          rc.personalTakeaway,
          nowIso
        );
      }

      for (const ev of r.events) {
        const evId = `evt-${randomUUID()}`;
        await db.prepare(
          `INSERT INTO deck_events (
            id, user_id, reading_id, card_id, occurred_phase, phenomenon_type,
            custom_phenomenon_label, linked_position_index, observation_description,
            personal_interpretation, occurred_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          evId,
          userId,
          newReadingId,
          ev.cardId,
          ev.occurredPhase,
          ev.phenomenonType,
          ev.customPhenomenonLabel,
          ev.linkedPositionIndex,
          ev.observationDescription,
          ev.personalInterpretation,
          ev.occurredAt,
          nowIso
        );
        await syncEntityTags(userId, "deck_event", evId, ev.tags, "phenomenon", db);
      }
    }

    for (const a of payload.appointments) {
      const mappedCons = consultantIdMap.get(a.consultantId);
      if (!mappedCons) continue;
      await db.prepare(
        `INSERT INTO appointments (
          id, user_id, consultant_id, title, scheduled_at, duration_minutes,
          modality, status, intention, prep_notes, linked_reading_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      ).run(
        `appt-${randomUUID()}`,
        userId,
        mappedCons,
        a.title,
        a.scheduledAt,
        a.durationMinutes,
        a.modality,
        a.status,
        a.intention,
        a.prepNotes,
        nowIso,
        nowIso
      );
    }

    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  return {
    importedReadings: payload.readings.length,
    importedConsultants: payload.consultants.length,
  };
}
