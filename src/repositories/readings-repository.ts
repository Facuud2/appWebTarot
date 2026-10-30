import "server-only";

import { randomUUID } from "node:crypto";
import { listAppointments } from "@/repositories/appointments-repository";
import {
  createQuickConsultant,
  listConsultants,
} from "@/repositories/consultants-repository";
import {
  createQuickDeck,
  ensureUserBuiltinDecks,
  listAvailableDecks,
  listDecks,
  mapCanonicalCardRow,
  type CanonicalCardRow,
} from "@/repositories/grimorio-repository";
import { BUILTIN_DECKS, CANONICAL_TAROT_CARDS } from "@/lib/tarot-catalog";
import { toIsoUtcString } from "@/lib/utils";
import { getTagsForEntity, syncEntityTags } from "@/repositories/tags-repository";
import type {
  CreateReadingValues,
  DeckEventFormValues,
  UpdateReadingSessionValues,
} from "@/schemas/domain";
import { getDb, type AppDatabase } from "@/server/db";
import type {
  CardInterpretationLog,
  CardOrientation,
  DashboardSnapshot,
  DeckEvent,
  DeckEventWithContext,
  DeckPhase,
  DeckTradition,
  GlobalSearchResult,
  PhenomenonType,
  ReadingCardEntry,
  ReadingDetail,
  ReadingSearchFilters,
  ReadingStatus,
  ReadingSummary,
  SpreadPositionDefinition,
} from "@/types/domain";

function parseDeckIdsJson(
  raw: string | null | undefined,
  fallbackDeckId: string | null
): string[] {
  const result: string[] = [];
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string" && item.trim().length > 0) {
            const clean = item.trim();
            if (!result.includes(clean)) {
              result.push(clean);
            }
          }
        }
      }
    } catch {
      // ignore malformed json
    }
  }
  if (result.length === 0 && fallbackDeckId && fallbackDeckId.trim().length > 0) {
    result.push(fallbackDeckId.trim());
  }
  return result;
}

async function resolvePersistedDeckIds(
  userId: string,
  requestedDeckIds: string[],
  db: AppDatabase
): Promise<string[]> {
  const normalizedIds = Array.from(
    new Set(requestedDeckIds.map((id) => id.trim()).filter(Boolean))
  );
  const requestedBuiltins = BUILTIN_DECKS.filter((deck) =>
    normalizedIds.includes(deck.id)
  );

  if (requestedBuiltins.length > 0) {
    await ensureUserBuiltinDecks(userId, db);
  }

  const persistedDecks = await listDecks(userId, db);
  const persistedIds = new Set(persistedDecks.map((deck) => deck.id));
  const resolvedIds = normalizedIds.flatMap((id) => {
    if (persistedIds.has(id)) return [id];
    const builtin = requestedBuiltins.find((deck) => deck.id === id);
    const persistedBuiltinId = builtin
      ? `deck-${builtin.tradition}-${userId}`
      : null;
    return persistedBuiltinId && persistedIds.has(persistedBuiltinId)
      ? [persistedBuiltinId]
      : [];
  });

  return Array.from(new Set(resolvedIds));
}

function parsePositionsJson(
  raw: string | null | undefined
): SpreadPositionDefinition[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .map((p, idx) => ({
        positionIndex:
          typeof p.positionIndex === "number" ? p.positionIndex : idx + 1,
        title:
          typeof p.title === "string" && p.title.trim().length > 0
            ? p.title.trim()
            : `Carta ${idx + 1}`,
        prompt: typeof p.prompt === "string" ? p.prompt : "",
        coordX: typeof p.coordX === "number" ? p.coordX : 50,
        coordY: typeof p.coordY === "number" ? p.coordY : 50,
      }));
  } catch {
    return [];
  }
}

function positionsMatch(
  a: SpreadPositionDefinition[],
  b: SpreadPositionDefinition[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((position, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      position.positionIndex === other.positionIndex &&
      position.title === other.title &&
      position.prompt === other.prompt &&
      Math.abs(position.coordX - other.coordX) < 0.01 &&
      Math.abs(position.coordY - other.coordY) < 0.01
    );
  });
}

/**
 * Registra la estructura personalizada de una lectura como plantilla
 * reutilizable, igual que las cartas y los mazos creados al vuelo. Si ya
 * existe una estructura del usuario con las mismas posiciones se reutiliza
 * (y se renombra si hace falta) para no llenar el grimorio de duplicados.
 */
async function ensureCustomSpreadTemplate(
  userId: string,
  rawName: string,
  positions: SpreadPositionDefinition[],
  db: AppDatabase
): Promise<string | null> {
  if (positions.length === 0) return null;

  const requestedName = rawName.trim();
  const fallbackName = `Personalizada · ${positions.length} ${
    positions.length === 1 ? "carta" : "cartas"
  }`;
  const name = requestedName.length >= 2 ? requestedName : fallbackName;

  const rows = (await db
    .prepare(
      `SELECT id, name, positions_json FROM spread_templates
       WHERE user_id = ? AND is_builtin = 0
       ORDER BY created_at ASC`
    )
    .all(userId)) as Array<{
    id: string;
    name: string;
    positions_json: string;
  }>;

  const existing = rows.find((row) =>
    positionsMatch(parsePositionsJson(row.positions_json), positions)
  );

  if (existing) {
    if (requestedName.length >= 2 && existing.name !== name) {
      await db
        .prepare("UPDATE spread_templates SET name = ? WHERE id = ? AND user_id = ?")
        .run(name, existing.id, userId);
    }
    return existing.id;
  }

  const id = `spread-${randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO spread_templates (
        id, user_id, name, category, description, positions_json, is_builtin, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      id,
      userId,
      name,
      "Personalizada",
      "Estructura guardada automáticamente desde una lectura.",
      JSON.stringify(positions),
      new Date().toISOString()
    );
  return id;
}


interface ReadingSummaryRow {
  id: string;
  user_id: string;
  consultant_id: string | null;
  consultant_full_name: string | null;
  consultant_alias: string | null;
  consultant_hue: number | null;
  appointment_id: string | null;
  deck_id: string | null;
  deck_ids_json: string;
  deck_name: string | null;
  spread_template_id: string | null;
  spread_name: string;
  title: string;
  question_intention: string;
  status: ReadingStatus;
  performed_at: string;
  updated_at: string;
  cards_count: number;
  events_count: number;
}

export async function listReadings(
  userId: string,
  filters: ReadingSearchFilters = {},
  db: AppDatabase = getDb(userId)
): Promise<ReadingSummary[]> {
  const conditions: string[] = ["r.user_id = ?"];
  const params: Array<string | number> = [userId];

  if (filters.status && filters.status !== "all") {
    conditions.push("r.status = ?");
    params.push(filters.status);
  }
  if (filters.consultantId) {
    conditions.push("r.consultant_id = ?");
    params.push(filters.consultantId);
  }
  if (filters.deckId) {
    conditions.push(
      `(
        r.deck_id = ? OR EXISTS (
          SELECT 1 FROM json_each(r.deck_ids_json) WHERE value = ?
        )
      )`
    );
    params.push(filters.deckId, filters.deckId);
  }
  if (filters.cardId) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM reading_cards rc
        WHERE rc.reading_id = r.id AND rc.card_id = ?
      )`
    );
    params.push(filters.cardId);
  }
  if (filters.phenomenonType) {
    if (filters.phenomenonType === "any_event") {
      conditions.push(
        "EXISTS (SELECT 1 FROM deck_events de WHERE de.reading_id = r.id)"
      );
    } else {
      conditions.push(
        "EXISTS (SELECT 1 FROM deck_events de WHERE de.reading_id = r.id AND de.phenomenon_type = ?)"
      );
      params.push(filters.phenomenonType);
    }
  }
  if (filters.tag && filters.tag.trim().length > 0) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM entity_tags et
        JOIN tags t ON t.id = et.tag_id
        WHERE et.entity_type = 'reading'
          AND et.entity_id = r.id
          AND t.user_id = ?
          AND t.normalized_name = ?
      )`
    );
    params.push(userId, filters.tag.trim().toLowerCase());
  }
  if (filters.dateFrom) {
    conditions.push("r.performed_at >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("r.performed_at <= ?");
    params.push(`${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.query && filters.query.trim().length > 0) {
    const like = `%${filters.query.trim()}%`;
    conditions.push(
      `(
        r.title LIKE ? OR
        r.question_intention LIKE ? OR
        r.session_context LIKE ? OR
        r.general_observations LIKE ? OR
        r.session_synthesis LIKE ? OR
        r.closing_reflections LIKE ? OR
        EXISTS (
          SELECT 1 FROM reading_cards rcq
          JOIN cards_catalog ccq ON ccq.id = rcq.card_id
          WHERE rcq.reading_id = r.id
            AND (
              ccq.canonical_name LIKE ? OR
              rcq.contextual_interpretation LIKE ? OR
              rcq.observation_notes LIKE ? OR
              rcq.personal_takeaway LIKE ?
            )
        )
      )`
    );
    params.push(
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like
    );
  }

  const rows = (await db
    .prepare(
      `SELECT
         r.id,
         r.user_id,
         r.consultant_id,
         c.full_name AS consultant_full_name,
         c.alias AS consultant_alias,
         c.avatar_hue AS consultant_hue,
         r.appointment_id,
         r.deck_id,
         r.deck_ids_json,
         d.name AS deck_name,
         r.spread_template_id,
         r.spread_name,
         r.title,
         r.question_intention,
         r.status,
         r.performed_at,
         r.updated_at,
         (SELECT COUNT(*) FROM reading_cards rc WHERE rc.reading_id = r.id) AS cards_count,
         (SELECT COUNT(*) FROM deck_events de WHERE de.reading_id = r.id) AS events_count
       FROM readings r
       LEFT JOIN consultants c ON c.id = r.consultant_id
       LEFT JOIN decks d ON d.id = r.deck_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.performed_at DESC`
    )
    .all(...params)) as unknown as ReadingSummaryRow[];

  const availableDecks = await listAvailableDecks(userId, db);
  const userDecksMap = new Map(availableDecks.map((d) => [d.id, d]));

  const featuredCardsStmt = db.prepare(
    `SELECT
       rc.card_id,
       cc.canonical_name,
       cc.roman_numeral,
       rc.orientation
     FROM reading_cards rc
     JOIN cards_catalog cc ON cc.id = rc.card_id
     WHERE rc.reading_id = ?
     ORDER BY rc.position_index ASC
     LIMIT 4`
  );

  interface FeaturedCardRow {
    card_id: string;
    canonical_name: string;
    roman_numeral: string | null;
    orientation: CardOrientation;
  }

  return Promise.all(
    rows.map(async (row): Promise<ReadingSummary> => {
      const featuredRows = (await featuredCardsStmt.all(
        row.id
      )) as unknown as FeaturedCardRow[];

      const consultantDisplayName = row.consultant_alias?.trim()
        ? row.consultant_alias.trim()
        : row.consultant_full_name;

      const deckIds = parseDeckIdsJson(row.deck_ids_json, row.deck_id);
      const resolvedDeckNames = deckIds
        .map((id) => userDecksMap.get(id)?.name)
        .filter((name): name is string => Boolean(name));
      if (resolvedDeckNames.length === 0 && row.deck_name) {
        resolvedDeckNames.push(row.deck_name);
      }

      const tags = await getTagsForEntity(userId, "reading", row.id, db);

      return {
        id: row.id,
        userId: row.user_id,
        consultantId: row.consultant_id,
        consultantDisplayName,
        consultantHue: row.consultant_hue,
        appointmentId: row.appointment_id,
        deckId: row.deck_id,
        deckName: resolvedDeckNames[0] ?? row.deck_name,
        deckNames: resolvedDeckNames,
        spreadTemplateId: row.spread_template_id,
        spreadName: row.spread_name,
        title: row.title,
        questionIntention: row.question_intention,
        status: row.status,
        performedAt: row.performed_at,
        updatedAt: row.updated_at,
        cardsCount: Number(row.cards_count ?? 0),
        eventsCount: Number(row.events_count ?? 0),
        featuredCards: featuredRows.map((fc) => ({
          cardId: fc.card_id,
          canonicalName: fc.canonical_name,
          romanNumeral: fc.roman_numeral,
          orientation: fc.orientation,
        })),
        tags,
      };
    })
  );
}

export async function getReadingDetail(
  userId: string,
  readingId: string,
  db: AppDatabase = getDb(userId)
): Promise<ReadingDetail | null> {
  interface ReadingDetailRow {
    id: string;
    user_id: string;
    consultant_id: string | null;
    c_full_name: string | null;
    c_alias: string | null;
    c_hue: number | null;
    appointment_id: string | null;
    deck_id: string | null;
    deck_ids_json: string;
    d_name: string | null;
    d_tradition: DeckTradition | null;
    spread_template_id: string | null;
    spread_name: string;
    custom_positions_json: string;
    title: string;
    question_intention: string;
    session_context: string;
    status: ReadingStatus;
    performed_at: string;
    general_observations: string;
    session_synthesis: string;
    closing_reflections: string;
    created_at: string;
    updated_at: string;
  }

  const row = (await db
    .prepare(
      `SELECT
         r.*,
         c.full_name AS c_full_name,
         c.alias AS c_alias,
         c.avatar_hue AS c_hue,
         d.name AS d_name,
         d.tradition AS d_tradition
       FROM readings r
       LEFT JOIN consultants c ON c.id = r.consultant_id
       LEFT JOIN decks d ON d.id = r.deck_id
       WHERE r.user_id = ? AND r.id = ?`
    )
    .get(userId, readingId)) as ReadingDetailRow | undefined;

  if (!row) return null;

  const deckIds = parseDeckIdsJson(row.deck_ids_json, row.deck_id);
  const availableDecks = await listAvailableDecks(userId, db);
  const userDecksMap = new Map(availableDecks.map((d) => [d.id, d]));
  const hydratedDecks = deckIds
    .map((id) => userDecksMap.get(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({
      id: d.id,
      name: d.name,
      tradition: d.tradition,
    }));

  if (
    hydratedDecks.length === 0 &&
    row.deck_id &&
    row.d_name &&
    row.d_tradition
  ) {
    hydratedDecks.push({
      id: row.deck_id,
      name: row.d_name,
      tradition: row.d_tradition,
    });
  }

  let customPositions = parsePositionsJson(row.custom_positions_json);
  if (customPositions.length === 0 && row.spread_template_id) {
    const tplRow = (await db
      .prepare("SELECT positions_json FROM spread_templates WHERE id = ?")
      .get(row.spread_template_id)) as { positions_json: string } | undefined;
    if (tplRow) {
      customPositions = parsePositionsJson(tplRow.positions_json);
    }
  }

  interface ReadingCardJoinRow extends CanonicalCardRow {
    rc_id: string;
    rc_reading_id: string;
    rc_position_index: number;
    rc_position_title: string;
    rc_position_prompt: string;
    rc_orientation: CardOrientation;
    rc_observation_notes: string;
    rc_contextual_interpretation: string;
    rc_personal_takeaway: string;
    rc_synced_to_grimorio: number;
    rc_created_at: string;
  }

  const cardRows = (await db
    .prepare(
      `SELECT
         cc.*,
         rc.id AS rc_id,
         rc.reading_id AS rc_reading_id,
         rc.position_index AS rc_position_index,
         rc.position_title AS rc_position_title,
         rc.position_prompt AS rc_position_prompt,
         rc.orientation AS rc_orientation,
         rc.observation_notes AS rc_observation_notes,
         rc.contextual_interpretation AS rc_contextual_interpretation,
         rc.personal_takeaway AS rc_personal_takeaway,
         rc.synced_to_grimorio AS rc_synced_to_grimorio,
         rc.created_at AS rc_created_at
       FROM reading_cards rc
       JOIN cards_catalog cc ON cc.id = rc.card_id
       WHERE rc.reading_id = ?
       ORDER BY rc.position_index ASC`
    )
    .all(readingId)) as unknown as ReadingCardJoinRow[];

  const events = await listDeckEventsForReading(userId, readingId, db);
  const tags = await getTagsForEntity(userId, "reading", readingId, db);

  return {
    id: row.id,
    userId: row.user_id,
    consultantId: row.consultant_id,
    consultant:
      row.consultant_id && row.c_full_name
        ? {
            id: row.consultant_id,
            displayName: row.c_alias?.trim()
              ? row.c_alias.trim()
              : row.c_full_name,
            alias: row.c_alias,
            avatarHue: row.c_hue ?? 168,
          }
        : null,
    appointmentId: row.appointment_id,
    deckId: hydratedDecks[0]?.id ?? row.deck_id,
    deckIds: hydratedDecks.map((d) => d.id),
    deck: hydratedDecks[0] ?? null,
    decks: hydratedDecks,
    spreadTemplateId: row.spread_template_id,
    spreadName: row.spread_name,
    customPositions,
    title: row.title,
    questionIntention: row.question_intention,
    sessionContext: row.session_context,
    status: row.status,
    performedAt: row.performed_at,
    generalObservations: row.general_observations,
    sessionSynthesis: row.session_synthesis,
    closingReflections: row.closing_reflections,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cards: cardRows.map(
      (cr): ReadingCardEntry => ({
        id: cr.rc_id,
        readingId: cr.rc_reading_id,
        positionIndex: Number(cr.rc_position_index),
        positionTitle: cr.rc_position_title,
        positionPrompt: cr.rc_position_prompt,
        cardId: cr.id,
        card: mapCanonicalCardRow(cr),
        orientation: cr.rc_orientation,
        observationNotes: cr.rc_observation_notes,
        contextualInterpretation: cr.rc_contextual_interpretation,
        personalTakeaway: cr.rc_personal_takeaway,
        syncedToGrimorio: cr.rc_synced_to_grimorio === 1,
        createdAt: cr.rc_created_at,
      })
    ),
    events,
    tags,
  };
}

export async function createReadingDraft(
  userId: string,
  values: CreateReadingValues,
  db: AppDatabase = getDb(userId)
): Promise<ReadingDetail> {
  const id = `read-${randomUUID()}`;
  const nowIso = new Date().toISOString();
  const performedIso = toIsoUtcString(values.performedAt);

  let consultantId = values.consultantId.trim() || null;
  const appointmentId = values.appointmentId.trim() || null;

  if (values.quickNewConsultant && values.quickNewConsultant.trim().length > 0) {
    const createdConsultant = await createQuickConsultant(
      userId,
      values.quickNewConsultant.trim(),
      db
    );
    consultantId = createdConsultant.id;
  } else if (consultantId === "__new__") {
    consultantId = null;
  }

  if (consultantId) {
    const check = (await db
      .prepare("SELECT id FROM consultants WHERE user_id = ? AND id = ?")
      .get(userId, consultantId)) as { id: string } | undefined;
    if (!check) {
      throw new Error("El consultante elegido no pertenece a tu espacio.");
    }
  }

  const selectedExistingDeckIds = await resolvePersistedDeckIds(
    userId,
    values.deckIds,
    db
  );

  let spreadTemplateId: string | null = null;
  let resolvedSpreadName = values.spreadName.trim() || "Estructura personalizada";
  let resolvedCustomPositions: SpreadPositionDefinition[] = [];

  if (values.spreadMode === "custom") {
    spreadTemplateId = null;
    resolvedSpreadName =
      values.spreadName.trim() ||
      `Personalizada (${values.customPositions.length} ${
        values.customPositions.length === 1 ? "carta" : "cartas"
      })`;
    resolvedCustomPositions = values.customPositions.map((p, idx) => ({
      positionIndex: idx + 1,
      title: p.title.trim() || `Carta ${idx + 1}`,
      prompt: p.prompt.trim(),
      coordX: p.coordX,
      coordY: p.coordY,
    }));
  } else {
    const candidateSpreadId = values.spreadTemplateId.trim() || null;
    if (candidateSpreadId) {
      const spreadRow = (await db
        .prepare(
          "SELECT id, name, positions_json FROM spread_templates WHERE id = ? AND (is_builtin = 1 OR user_id = ?)"
        )
        .get(candidateSpreadId, userId)) as
        | { id: string; name: string; positions_json: string }
        | undefined;
      if (spreadRow) {
        spreadTemplateId = spreadRow.id;
        resolvedSpreadName = spreadRow.name;
        resolvedCustomPositions = parsePositionsJson(spreadRow.positions_json);
      }
    }
  }

  const autoTitle =
    values.title.trim() ||
    (values.questionIntention.trim()
      ? values.questionIntention.trim().slice(0, 72)
      : `Sesión de lectura · ${performedIso.slice(0, 10)}`);

  await db.exec("BEGIN");
  try {
    const createdQuickIds: string[] = [];
    for (const rawDeckName of values.quickNewDecks) {
      const cleanName = rawDeckName.trim();
      if (!cleanName) continue;
      const createdDeck = await createQuickDeck(userId, cleanName, db);
      createdQuickIds.push(createdDeck.id);
    }

    // Una estructura personalizada se guarda como plantilla reutilizable en
    // cuanto se usa, igual que las cartas y los mazos creados al vuelo.
    if (values.spreadMode === "custom") {
      spreadTemplateId = await ensureCustomSpreadTemplate(
        userId,
        resolvedSpreadName,
        resolvedCustomPositions,
        db
      );
    }

    const allDeckIds = Array.from(
      new Set([...selectedExistingDeckIds, ...createdQuickIds])
    );
    const primaryDeckId = allDeckIds[0] ?? null;

    await db.prepare(
      `INSERT INTO readings (
        id, user_id, consultant_id, appointment_id, deck_id, deck_ids_json,
        spread_template_id, spread_name, custom_positions_json, title,
        question_intention, session_context, status, performed_at,
        general_observations, session_synthesis, closing_reflections,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, '', '', '', ?, ?)`
    ).run(
      id,
      userId,
      consultantId,
      appointmentId,
      primaryDeckId,
      JSON.stringify(allDeckIds),
      spreadTemplateId,
      resolvedSpreadName,
      JSON.stringify(resolvedCustomPositions),
      autoTitle,
      values.questionIntention.trim(),
      values.sessionContext.trim(),
      performedIso,
      nowIso,
      nowIso
    );

    if (appointmentId) {
      await db.prepare(
        `UPDATE appointments
         SET linked_reading_id = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`
      ).run(id, nowIso, userId, appointmentId);
    }

    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const created = await getReadingDetail(userId, id, db);
  if (!created) {
    throw new Error("No se pudo abrir la mesa de lectura.");
  }
  return created;
}

export async function updateReadingSession(
  userId: string,
  values: UpdateReadingSessionValues,
  db: AppDatabase = getDb(userId)
): Promise<ReadingDetail> {
  const existing = await getReadingDetail(userId, values.readingId, db);
  if (!existing) {
    throw new Error("La lectura solicitada no existe o no tienes acceso.");
  }

  const nowIso = new Date().toISOString();
  const performedIso = values.performedAt
    ? toIsoUtcString(values.performedAt)
    : existing.performedAt;

  // El formulario de alta envía el marcador `__new__` mientras el consultante
  // todavía no existe. Al guardar la sesión ese marcador no es un id válido y
  // rompía la FK de `readings.consultant_id`. Si la lectura ya fue creada, el
  // consultante real vive en la fila existente; si no, se deja sin consultante.
  let consultantId = values.consultantId.trim() || null;
  if (consultantId === "__new__") {
    consultantId = existing.consultantId;
  } else if (consultantId) {
    const ownedConsultant = (await db
      .prepare("SELECT id FROM consultants WHERE user_id = ? AND id = ?")
      .get(userId, consultantId)) as { id: string } | undefined;
    if (!ownedConsultant) {
      throw new Error("El consultante elegido no pertenece a tu espacio.");
    }
  }

  const allDeckIds = await resolvePersistedDeckIds(
    userId,
    values.deckIds,
    db
  );
  const primaryDeckId = allDeckIds[0] ?? null;
  let spreadTemplateId = values.spreadTemplateId.trim() || null;
  if (spreadTemplateId) {
    const ownedSpread = (await db
      .prepare(
        "SELECT id FROM spread_templates WHERE id = ? AND (is_builtin = 1 OR user_id = ?)"
      )
      .get(spreadTemplateId, userId)) as { id: string } | undefined;
    if (!ownedSpread) {
      // Una plantilla borrada o de otro espacio no debe impedir guardar la
      // lectura: se conserva la estructura personalizada ya normalizada.
      spreadTemplateId = null;
    }
  }
  const normalizedPositions: SpreadPositionDefinition[] =
    values.customPositions.map((p, idx) => ({
      positionIndex: idx + 1,
      title: p.title.trim() || `Carta ${idx + 1}`,
      prompt: p.prompt.trim(),
      coordX: p.coordX,
      coordY: p.coordY,
    }));

  await db.exec("BEGIN");
  try {
    // Lectura con estructura propia: se guarda como plantilla reutilizable.
    if (!spreadTemplateId && normalizedPositions.length > 0) {
      spreadTemplateId = await ensureCustomSpreadTemplate(
        userId,
        values.spreadName.trim(),
        normalizedPositions,
        db
      );
    }

    await db.prepare(
      `UPDATE readings
       SET consultant_id = ?,
           deck_id = ?,
           deck_ids_json = ?,
           spread_template_id = ?,
           spread_name = ?,
           custom_positions_json = ?,
           title = ?,
           question_intention = ?,
           session_context = ?,
           status = ?,
           performed_at = ?,
           general_observations = ?,
           session_synthesis = ?,
           closing_reflections = ?,
           updated_at = ?
       WHERE user_id = ? AND id = ?`
    ).run(
      consultantId,
      primaryDeckId,
      JSON.stringify(allDeckIds),
      spreadTemplateId,
      values.spreadName.trim(),
      JSON.stringify(normalizedPositions),
      values.title.trim(),
      values.questionIntention.trim(),
      values.sessionContext.trim(),
      values.status,
      performedIso,
      values.generalObservations.trim(),
      values.sessionSynthesis.trim(),
      values.closingReflections.trim(),
      nowIso,
      userId,
      values.readingId
    );

    if (values.status === "completed" && existing.appointmentId) {
      await db.prepare(
        `UPDATE appointments
         SET status = 'completed', updated_at = ?
         WHERE user_id = ? AND id = ? AND status = 'scheduled'`
      ).run(nowIso, userId, existing.appointmentId);
    }

    await syncEntityTags(
      userId,
      "reading",
      values.readingId,
      values.tags,
      "theme",
      db
    );

    // Replace reading_cards cleanly while preserving previously synced library flags
    const previousSynced = new Set(
      existing.cards
        .filter((c) => c.syncedToGrimorio)
        .map((c) => `${c.positionIndex}:${c.cardId}:${c.personalTakeaway.trim()}`)
    );

    await db.prepare("DELETE FROM reading_cards WHERE reading_id = ?").run(
      values.readingId
    );

    const insertCard = db.prepare(
      `INSERT INTO reading_cards (
        id, reading_id, position_index, position_title, position_prompt,
        card_id, orientation, observation_notes, contextual_interpretation,
        personal_takeaway, synced_to_grimorio, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertGrimorioLog = db.prepare(
      `INSERT INTO card_interpretation_logs (
        id, user_id, card_id, deck_id, reading_id, note_title, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const card of values.cards) {
      const takeawayClean = card.personalTakeaway.trim();
      const syncKey = `${card.positionIndex}:${card.cardId}:${takeawayClean}`;
      const alreadySynced = previousSynced.has(syncKey);
      const shouldSyncNow =
        card.syncToGrimorio && takeawayClean.length > 0 && !alreadySynced;

      await insertCard.run(
        `rc-${randomUUID()}`,
        values.readingId,
        card.positionIndex,
        card.positionTitle.trim(),
        card.positionPrompt.trim(),
        card.cardId,
        card.orientation,
        card.observationNotes.trim(),
        card.contextualInterpretation.trim(),
        takeawayClean,
        alreadySynced || shouldSyncNow ? 1 : 0,
        nowIso
      );

      if (shouldSyncNow) {
        await insertGrimorioLog.run(
          `log-${randomUUID()}`,
          userId,
          card.cardId,
          primaryDeckId,
          values.readingId,
          `Nota en posición «${card.positionTitle.trim()}»`,
          takeawayClean,
          nowIso
        );
      }
    }

    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const updated = await getReadingDetail(userId, values.readingId, db);
  if (!updated) {
    throw new Error("No se pudo recuperar la lectura tras guardar.");
  }
  return updated;
}

export async function deleteReading(
  userId: string,
  readingId: string,
  db: AppDatabase = getDb(userId)
): Promise<void> {
  await db.exec("BEGIN");
  try {
    await db.prepare(
      `DELETE FROM entity_tags
       WHERE entity_type = 'reading' AND entity_id = ?
         AND tag_id IN (SELECT id FROM tags WHERE user_id = ?)`
    ).run(readingId, userId);

    const res = await db
      .prepare("DELETE FROM readings WHERE user_id = ? AND id = ?")
      .run(userId, readingId);

    if (res.changes === 0) {
      throw new Error("No se encontró la lectura para eliminar.");
    }
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
}

// Physical Deck Events
interface DeckEventJoinRow {
  id: string;
  user_id: string;
  reading_id: string;
  card_id: string | null;
  occurred_phase: DeckPhase;
  phenomenon_type: PhenomenonType;
  custom_phenomenon_label: string | null;
  linked_position_index: number | null;
  observation_description: string;
  personal_interpretation: string;
  occurred_at: string;
  created_at: string;
  reading_title: string;
  reading_performed_at: string;
  consultant_id: string | null;
  consultant_full_name: string | null;
  consultant_alias: string | null;
  deck_name: string | null;
}

function hydrateCardIfPresent(
  cardId: string | null
): ReturnType<typeof mapCanonicalCardRow> | null {
  if (!cardId) return null;
  const found = CANONICAL_TAROT_CARDS.find((c) => c.id === cardId);
  return found ?? null;
}

export async function listDeckEventsForReading(
  userId: string,
  readingId: string,
  db: AppDatabase = getDb(userId)
): Promise<DeckEvent[]> {
  const rows = (await db
    .prepare(
      `SELECT * FROM deck_events
       WHERE user_id = ? AND reading_id = ?
       ORDER BY occurred_at ASC, created_at ASC`
    )
    .all(userId, readingId)) as unknown as Array<
    Omit<
      DeckEventJoinRow,
      | "reading_title"
      | "reading_performed_at"
      | "consultant_id"
      | "consultant_full_name"
      | "consultant_alias"
      | "deck_name"
    >
  >;

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      userId: row.user_id,
      readingId: row.reading_id,
      cardId: row.card_id,
      card: hydrateCardIfPresent(row.card_id),
      occurredPhase: row.occurred_phase,
      phenomenonType: row.phenomenon_type,
      customPhenomenonLabel: row.custom_phenomenon_label,
      linkedPositionIndex:
        row.linked_position_index === null
          ? null
          : Number(row.linked_position_index),
      observationDescription: row.observation_description,
      personalInterpretation: row.personal_interpretation,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
      tags: await getTagsForEntity(userId, "deck_event", row.id, db),
    }))
  );
}

export interface ListDeckEventsFilter {
  cardId?: string;
  phenomenonType?: PhenomenonType | "all";
  phase?: DeckPhase | "all";
  tag?: string;
  query?: string;
}

export async function listDeckEventsWithContext(
  userId: string,
  filters: ListDeckEventsFilter = {},
  db: AppDatabase = getDb(userId)
): Promise<DeckEventWithContext[]> {
  const conditions: string[] = ["de.user_id = ?"];
  const params: Array<string | number> = [userId];

  if (filters.cardId) {
    conditions.push("de.card_id = ?");
    params.push(filters.cardId);
  }
  if (filters.phenomenonType && filters.phenomenonType !== "all") {
    conditions.push("de.phenomenon_type = ?");
    params.push(filters.phenomenonType);
  }
  if (filters.phase && filters.phase !== "all") {
    conditions.push("de.occurred_phase = ?");
    params.push(filters.phase);
  }
  if (filters.tag && filters.tag.trim().length > 0) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM entity_tags et
        JOIN tags t ON t.id = et.tag_id
        WHERE et.entity_type = 'deck_event'
          AND et.entity_id = de.id
          AND t.user_id = ?
          AND t.normalized_name = ?
      )`
    );
    params.push(userId, filters.tag.trim().toLowerCase());
  }
  if (filters.query && filters.query.trim().length > 0) {
    const like = `%${filters.query.trim()}%`;
    conditions.push(
      "(de.observation_description LIKE ? OR de.personal_interpretation LIKE ? OR COALESCE(de.custom_phenomenon_label, '') LIKE ?)"
    );
    params.push(like, like, like);
  }

  const rows = (await db
    .prepare(
      `SELECT
         de.*,
         r.title AS reading_title,
         r.performed_at AS reading_performed_at,
         r.consultant_id,
         c.full_name AS consultant_full_name,
         c.alias AS consultant_alias,
         d.name AS deck_name
       FROM deck_events de
       JOIN readings r ON r.id = de.reading_id
       LEFT JOIN consultants c ON c.id = r.consultant_id
       LEFT JOIN decks d ON d.id = r.deck_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY de.occurred_at DESC`
    )
    .all(...params)) as unknown as DeckEventJoinRow[];

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      userId: row.user_id,
      readingId: row.reading_id,
      cardId: row.card_id,
      card: hydrateCardIfPresent(row.card_id),
      occurredPhase: row.occurred_phase,
      phenomenonType: row.phenomenon_type,
      customPhenomenonLabel: row.custom_phenomenon_label,
      linkedPositionIndex:
        row.linked_position_index === null
          ? null
          : Number(row.linked_position_index),
      observationDescription: row.observation_description,
      personalInterpretation: row.personal_interpretation,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
      tags: await getTagsForEntity(userId, "deck_event", row.id, db),
      readingTitle: row.reading_title,
      readingPerformedAt: row.reading_performed_at,
      consultantId: row.consultant_id,
      consultantDisplayName: row.consultant_alias?.trim()
        ? row.consultant_alias.trim()
        : row.consultant_full_name,
      deckName: row.deck_name,
    }))
  );
}

export async function createDeckEvent(
  userId: string,
  values: DeckEventFormValues,
  db: AppDatabase = getDb(userId)
): Promise<DeckEvent> {
  const readingCheck = (await db
    .prepare("SELECT id FROM readings WHERE user_id = ? AND id = ?")
    .get(userId, values.readingId)) as { id: string } | undefined;

  if (!readingCheck) {
    throw new Error("La lectura asociada no pertenece a tu espacio.");
  }

  const id = `evt-${randomUUID()}`;
  const nowIso = new Date().toISOString();
  const parsedDate = new Date(values.occurredAt);
  const occurredIso = Number.isNaN(parsedDate.getTime())
    ? nowIso
    : parsedDate.toISOString();
  const cardId = values.cardId.trim() || null;

  await db.exec("BEGIN");
  try {
    await db.prepare(
      `INSERT INTO deck_events (
        id, user_id, reading_id, card_id, occurred_phase, phenomenon_type,
        custom_phenomenon_label, linked_position_index, observation_description,
        personal_interpretation, occurred_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      values.readingId,
      cardId,
      values.occurredPhase,
      values.phenomenonType,
      values.customPhenomenonLabel.trim() || null,
      values.linkedPositionIndex,
      values.observationDescription.trim(),
      values.personalInterpretation.trim(),
      occurredIso,
      nowIso
    );

    await db.prepare("UPDATE readings SET updated_at = ? WHERE id = ?").run(
      nowIso,
      values.readingId
    );

    await syncEntityTags(userId, "deck_event", id, values.tags, "phenomenon", db);
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const events = await listDeckEventsForReading(userId, values.readingId, db);
  const created = events.find((e) => e.id === id);
  if (!created) {
    throw new Error("No se pudo recuperar el evento del mazo registrado.");
  }
  return created;
}

export async function deleteDeckEvent(
  userId: string,
  eventId: string,
  db: AppDatabase = getDb(userId)
): Promise<void> {
  await db.exec("BEGIN");
  try {
    await db.prepare(
      `DELETE FROM entity_tags
       WHERE entity_type = 'deck_event' AND entity_id = ?
         AND tag_id IN (SELECT id FROM tags WHERE user_id = ?)`
    ).run(eventId, userId);

    const res = await db
      .prepare("DELETE FROM deck_events WHERE user_id = ? AND id = ?")
      .run(userId, eventId);

    if (res.changes === 0) {
      throw new Error("No se encontró el evento del mazo para eliminar.");
    }
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
}

export async function getDashboardSnapshot(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<DashboardSnapshot> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const upcomingAppointments = await listAppointments(
    userId,
    {
      status: "scheduled",
      fromIso: startOfToday.toISOString(),
      ascending: true,
    },
    db
  );

  const todayAppointments = upcomingAppointments.filter(
    (a) => a.scheduledAt <= endOfToday.toISOString()
  );

  const allReadings = await listReadings(userId, {}, db);
  const draftReadings = allReadings.filter((r) => r.status === "draft");
  const completedReadings = allReadings.filter((r) => r.status === "completed");
  const activeConsultants = await listConsultants(userId, {}, db);
  const allDecks = await listDecks(userId, db);
  const incompleteDecks = allDecks.filter((d) => d.needsSetup);
  const incompleteConsultants = activeConsultants.filter((c) => c.needsSetup);

  const annotatedRow = (await db
    .prepare(
      `SELECT COUNT(DISTINCT card_id) AS cnt
       FROM card_entries
       WHERE user_id = ?
         AND (
           LENGTH(TRIM(personal_meaning)) > 0 OR
           LENGTH(TRIM(reversed_meaning)) > 0 OR
           LENGTH(TRIM(symbols_associations)) > 0 OR
           LENGTH(TRIM(reflections)) > 0
         )`
    )
    .get(userId)) as { cnt: number } | undefined;

  const phenomenaCountRow = (await db
    .prepare("SELECT COUNT(*) AS cnt FROM deck_events WHERE user_id = ?")
    .get(userId)) as { cnt: number } | undefined;

  const allPhenomena = await listDeckEventsWithContext(userId, {}, db);
  const recentPhenomena = allPhenomena.slice(0, 4);

  interface RecentLogRow {
    id: string;
    user_id: string;
    card_id: string;
    deck_id: string | null;
    deck_name: string | null;
    reading_id: string | null;
    reading_title: string | null;
    note_title: string;
    content: string;
    created_at: string;
  }

  const recentLogsRows = (await db
    .prepare(
      `SELECT
         l.*,
         d.name AS deck_name,
         r.title AS reading_title
       FROM card_interpretation_logs l
       LEFT JOIN decks d ON d.id = l.deck_id
       LEFT JOIN readings r ON r.id = l.reading_id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC
       LIMIT 4`
    )
    .all(userId)) as unknown as RecentLogRow[];

  return {
    counts: {
      upcomingAppointments: upcomingAppointments.length,
      completedReadings: completedReadings.length,
      draftReadings: draftReadings.length,
      annotatedCards: Number(annotatedRow?.cnt ?? 0),
      activeConsultants: activeConsultants.length,
      recordedPhenomena: Number(phenomenaCountRow?.cnt ?? 0),
    },
    incompleteDecks,
    incompleteConsultants,
    todayAppointments,
    upcomingAppointments: upcomingAppointments.slice(0, 5),
    draftReadings: draftReadings.slice(0, 4),
    recentReadings: completedReadings.slice(0, 5),
    recentPhenomena,
    recentLogs: recentLogsRows.map(
      (lr): CardInterpretationLog => ({
        id: lr.id,
        userId: lr.user_id,
        cardId: lr.card_id,
        deckId: lr.deck_id,
        deckName: lr.deck_name,
        readingId: lr.reading_id,
        readingTitle: lr.reading_title,
        noteTitle: lr.note_title,
        content: lr.content,
        createdAt: lr.created_at,
      })
    ),
    recentConsultants: activeConsultants.slice(0, 4),
  };
}

export async function executeGlobalSearch(
  userId: string,
  query: string,
  db: AppDatabase = getDb(userId)
): Promise<GlobalSearchResult> {
  const q = query.trim();
  const like = `%${q}%`;

  const cardRows = (await db
    .prepare(
      `SELECT id, slug, canonical_name, roman_numeral, archetype_note
       FROM cards_catalog
       WHERE canonical_name LIKE ? OR COALESCE(roman_numeral, '') LIKE ? OR traditional_keywords_json LIKE ?
       LIMIT 8`
    )
    .all(like, like, like)) as unknown as Array<{
    id: string;
    slug: string;
    canonical_name: string;
    roman_numeral: string | null;
    archetype_note: string;
  }>;

  const consultants = (await listConsultants(userId, { query: q }, db)).slice(0, 6);
  const readings = (await listReadings(userId, { query: q }, db)).slice(0, 6);

  return {
    cards: cardRows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.canonical_name,
      subtitle: c.archetype_note,
    })),
    consultants: consultants.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      subtitle: `${c.readingsCount} lecturas registradas`,
    })),
    readings: readings.map((r) => ({
      id: r.id,
      title: r.title,
      performedAt: r.performedAt,
      status: r.status,
      consultantName: r.consultantDisplayName,
    })),
  };
}
