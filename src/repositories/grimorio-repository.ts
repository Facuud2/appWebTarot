import "server-only";

import { randomUUID } from "node:crypto";
import { getTagsForEntity, syncEntityTags } from "@/repositories/tags-repository";
import type {
  DeckFormValues,
  PersonalCardEntryValues,
  SpreadTemplateFormValues,
} from "@/schemas/domain";
import { getDb, type AppDatabase } from "@/server/db";
import type {
  ArcanaType,
  CanonicalCard,
  CardInterpretationLog,
  CardOrientation,
  CardReadingAppearance,
  Deck,
  DeckTradition,
  GrimorioCardDetail,
  GrimorioCardSummary,
  PersonalCardEntry,
  ReadingStatus,
  SpreadPositionDefinition,
  SpreadTemplate,
  TarotSuit,
} from "@/types/domain";
import { listDeckEventsWithContext } from "@/repositories/readings-repository";
import { BUILTIN_DECKS, CANONICAL_TAROT_CARDS } from "@/lib/tarot-catalog";

export interface CanonicalCardRow {
  id: string;
  slug: string;
  arcana: ArcanaType | string;
  suit: TarotSuit | string | null;
  rank_number: number;
  roman_numeral: string | null;
  canonical_name: string;
  name_en: string | null;
  deck_tradition: string | null;
  search_keywords_json: string | null;
  traditional_upright: string;
  traditional_reversed: string;
  traditional_keywords_json: string;
  archetype_note: string;
}

function safeParseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // ignore malformed json
  }
  return [];
}

export function mapCanonicalCardRow(row: CanonicalCardRow): CanonicalCard {
  return {
    id: row.id,
    slug: row.slug,
    arcana: row.arcana,
    suit: row.suit,
    rankNumber: Number(row.rank_number),
    romanNumeral: row.roman_numeral,
    canonicalName: row.canonical_name,
    nameEn: row.name_en ?? "",
    deckTradition: (row.deck_tradition ?? "rws") as DeckTradition,
    searchKeywords: safeParseStringArray(row.search_keywords_json ?? "[]"),
    traditionalUpright: row.traditional_upright,
    traditionalReversed: row.traditional_reversed,
    traditionalKeywords: safeParseStringArray(row.traditional_keywords_json),
    archetypeNote: row.archetype_note,
  };
}

interface PersonalCardEntryRow {
  id: string;
  user_id: string;
  card_id: string;
  deck_id: string | null;
  custom_image_url: string | null;
  personal_meaning: string;
  reversed_meaning: string;
  symbols_associations: string;
  keywords_json: string;
  reflections: string;
  updated_at: string;
}

async function mapPersonalEntryRow(
  row: PersonalCardEntryRow,
  userId: string,
  db: AppDatabase
): Promise<PersonalCardEntry> {
  const tags = await getTagsForEntity(userId, "card_entry", row.id, db);
  return {
    id: row.id,
    userId: row.user_id,
    cardId: row.card_id,
    deckId: row.deck_id,
    customImageUrl: row.custom_image_url,
    personalMeaning: row.personal_meaning,
    reversedMeaning: row.reversed_meaning,
    symbolsAssociations: row.symbols_associations,
    keywords: safeParseStringArray(row.keywords_json),
    reflections: row.reflections,
    tags,
    updatedAt: row.updated_at,
  };
}

export function listCanonicalCards(
  optionsOrDb?:
    | { tradition?: DeckTradition | string; traditionIn?: string[] }
    | AppDatabase,
  _maybeDb?: AppDatabase
): CanonicalCard[] {
  let options:
    | { tradition?: DeckTradition | string; traditionIn?: string[] }
    | undefined;

  if (optionsOrDb && !("tradition" in optionsOrDb || "traditionIn" in optionsOrDb)) {
    options = undefined;
  } else {
    options = optionsOrDb as { tradition?: DeckTradition | string; traditionIn?: string[] } | undefined;
  }

  let cards = CANONICAL_TAROT_CARDS;
  if (options?.tradition) {
    cards = cards.filter((c) => c.deckTradition === options.tradition);
  } else if (options?.traditionIn && options.traditionIn.length > 0) {
    cards = cards.filter((c) => options.traditionIn!.includes(c.deckTradition));
  }
  return cards;
}

export async function listAllCardsIncludingCustom(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<CanonicalCard[]> {
  try {
    const rows = (await db
      .prepare("SELECT * FROM cards_catalog ORDER BY rank_number ASC")
      .all()) as unknown as CanonicalCardRow[];
    if (rows && rows.length > 0) {
      const dbCards = rows.map(mapCanonicalCardRow);
      const dbCardIds = new Set(dbCards.map((c) => c.id));
      const missingCanonical = CANONICAL_TAROT_CARDS.filter(
        (c) => !dbCardIds.has(c.id)
      );
      return [...dbCards, ...missingCanonical];
    }
  } catch {
    // fallback if table query fails
  }
  return CANONICAL_TAROT_CARDS;
}

export async function registerCustomDeckCard(
  userId: string,
  deckId: string,
  name: string,
  db: AppDatabase = getDb(userId)
): Promise<CanonicalCard> {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("El nombre de la carta no puede estar vacío.");
  }
  const id = `card-custom-${randomUUID()}`;
  const slug = `custom-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${id.slice(-6)}`;

  const countRow = (await db
    .prepare("SELECT COUNT(*) AS c FROM cards_catalog WHERE deck_tradition = ?")
    .get(deckId)) as { c: number } | undefined;
  const rank = (countRow?.c ?? 0) + 1;

  await db.prepare(`
    INSERT INTO cards_catalog (
      id, slug, arcana, suit, rank_number, roman_numeral,
      canonical_name, name_en, deck_tradition, search_keywords_json,
      traditional_upright, traditional_reversed, traditional_keywords_json, archetype_note
    ) VALUES (
      ?, ?, 'custom', NULL, ?, NULL,
      ?, ?, ?, '[]',
      'Significado en desarrollo.', 'Significado invertido en desarrollo.', '[]', ''
    )
  `).run(id, slug, rank, cleanName, cleanName, deckId);

  const cardRow = (await db
    .prepare("SELECT * FROM cards_catalog WHERE id = ?")
    .get(id)) as CanonicalCardRow;
  return mapCanonicalCardRow(cardRow);
}

export interface ListGrimorioOptions {
  query?: string;
  arcana?: ArcanaType | "all";
  suit?: TarotSuit | "all";
  onlyAnnotated?: boolean;
  onlyWithPhenomena?: boolean;
  tag?: string;
}

export async function listGrimorioCards(
  userId: string,
  options: ListGrimorioOptions = {},
  db: AppDatabase = getDb(userId)
): Promise<GrimorioCardSummary[]> {
  interface SummaryJoinRow extends CanonicalCardRow {
    ce_id: string | null;
    ce_user_id: string | null;
    ce_deck_id: string | null;
    ce_custom_image_url: string | null;
    ce_personal_meaning: string | null;
    ce_reversed_meaning: string | null;
    ce_symbols_associations: string | null;
    ce_keywords_json: string | null;
    ce_reflections: string | null;
    ce_updated_at: string | null;
    appearances_count: number;
    phenomena_count: number;
    last_appeared_at: string | null;
  }

  const rows = (await db
    .prepare(
      `SELECT
         cc.*,
         ce.id AS ce_id,
         ce.user_id AS ce_user_id,
         ce.deck_id AS ce_deck_id,
         ce.custom_image_url AS ce_custom_image_url,
         ce.personal_meaning AS ce_personal_meaning,
         ce.reversed_meaning AS ce_reversed_meaning,
         ce.symbols_associations AS ce_symbols_associations,
         ce.keywords_json AS ce_keywords_json,
         ce.reflections AS ce_reflections,
         ce.updated_at AS ce_updated_at,
         (
           SELECT COUNT(*) FROM reading_cards rc
           JOIN readings r ON r.id = rc.reading_id
           WHERE r.user_id = ? AND rc.card_id = cc.id
         ) AS appearances_count,
         (
           SELECT COUNT(*) FROM deck_events de
           WHERE de.user_id = ? AND de.card_id = cc.id
         ) AS phenomena_count,
         (
           SELECT MAX(r2.performed_at) FROM reading_cards rc2
           JOIN readings r2 ON r2.id = rc2.reading_id
           WHERE r2.user_id = ? AND rc2.card_id = cc.id
         ) AS last_appeared_at
       FROM cards_catalog cc
       LEFT JOIN card_entries ce
         ON ce.card_id = cc.id AND ce.user_id = ? AND ce.deck_id IS NULL
       ORDER BY CASE WHEN cc.arcana = 'major' THEN 0 ELSE 1 END ASC,
                CASE cc.suit
                  WHEN 'wands' THEN 1
                  WHEN 'cups' THEN 2
                  WHEN 'swords' THEN 3
                  WHEN 'pentacles' THEN 4
                  ELSE 0
                END ASC,
                cc.rank_number ASC`
    )
    .all(userId, userId, userId, userId)) as unknown as SummaryJoinRow[];

  const normalizedQuery = options.query?.trim().toLowerCase() ?? "";
  const normalizedTag = options.tag?.trim().toLowerCase() ?? "";

  const summaries: GrimorioCardSummary[] = [];

  for (const row of rows) {
    if (options.arcana && options.arcana !== "all" && row.arcana !== options.arcana) {
      continue;
    }
    if (options.suit && options.suit !== "all" && row.suit !== options.suit) {
      continue;
    }

    const card = mapCanonicalCardRow(row);
    const personalEntry: PersonalCardEntry | null =
      row.ce_id && row.ce_user_id
        ? await mapPersonalEntryRow(
            {
              id: row.ce_id,
              user_id: row.ce_user_id,
              card_id: row.id,
              deck_id: row.ce_deck_id,
              custom_image_url: row.ce_custom_image_url,
              personal_meaning: row.ce_personal_meaning ?? "",
              reversed_meaning: row.ce_reversed_meaning ?? "",
              symbols_associations: row.ce_symbols_associations ?? "",
              keywords_json: row.ce_keywords_json ?? "[]",
              reflections: row.ce_reflections ?? "",
              updated_at: row.ce_updated_at ?? "",
            },
            userId,
            db
          )
        : null;

    const hasPersonalNotes = Boolean(
      personalEntry &&
        (personalEntry.personalMeaning.trim().length > 0 ||
          personalEntry.reversedMeaning.trim().length > 0 ||
          personalEntry.symbolsAssociations.trim().length > 0 ||
          personalEntry.reflections.trim().length > 0 ||
          personalEntry.keywords.length > 0)
    );

    if (options.onlyAnnotated && !hasPersonalNotes) {
      continue;
    }
    if (options.onlyWithPhenomena && Number(row.phenomena_count) === 0) {
      continue;
    }
    if (normalizedTag) {
      const matchesTag = personalEntry?.tags.some(
        (t) => t.name.toLowerCase() === normalizedTag
      );
      if (!matchesTag) continue;
    }
    if (normalizedQuery) {
      const haystack = [
        card.canonicalName,
        card.romanNumeral ?? "",
        card.traditionalUpright,
        ...card.traditionalKeywords,
        personalEntry?.personalMeaning ?? "",
        personalEntry?.symbolsAssociations ?? "",
        personalEntry?.reflections ?? "",
        ...(personalEntry?.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        continue;
      }
    }

    summaries.push({
      card,
      personalEntry,
      appearancesCount: Number(row.appearances_count ?? 0),
      phenomenaCount: Number(row.phenomena_count ?? 0),
      lastAppearedAt: row.last_appeared_at,
    });
  }

  return summaries;
}

export async function getGrimorioCardBySlug(
  userId: string,
  slug: string,
  db: AppDatabase = getDb(userId)
): Promise<GrimorioCardDetail | null> {
  const cardRow = (await db
    .prepare("SELECT * FROM cards_catalog WHERE slug = ?")
    .get(slug)) as CanonicalCardRow | undefined;

  if (!cardRow) return null;
  const card = mapCanonicalCardRow(cardRow);

  const personalRows = (await db
    .prepare(
      `SELECT * FROM card_entries
       WHERE user_id = ? AND card_id = ?
       ORDER BY CASE WHEN deck_id IS NULL THEN 0 ELSE 1 END ASC, updated_at DESC`
    )
    .all(userId, card.id)) as unknown as PersonalCardEntryRow[];

  interface LogJoinRow {
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

  const logRows = (await db
    .prepare(
      `SELECT
         l.*,
         d.name AS deck_name,
         r.title AS reading_title
       FROM card_interpretation_logs l
       LEFT JOIN decks d ON d.id = l.deck_id
       LEFT JOIN readings r ON r.id = l.reading_id
       WHERE l.user_id = ? AND l.card_id = ?
       ORDER BY l.created_at DESC`
    )
    .all(userId, card.id)) as unknown as LogJoinRow[];

  interface AppearanceRow {
    reading_card_id: string;
    reading_id: string;
    reading_title: string;
    performed_at: string;
    status: ReadingStatus;
    consultant_id: string | null;
    consultant_full_name: string | null;
    consultant_alias: string | null;
    deck_name: string | null;
    position_index: number;
    position_title: string;
    orientation: CardOrientation;
    observation_notes: string;
    contextual_interpretation: string;
    personal_takeaway: string;
  }

  const appearanceRows = (await db
    .prepare(
      `SELECT
         rc.id AS reading_card_id,
         r.id AS reading_id,
         r.title AS reading_title,
         r.performed_at,
         r.status,
         r.consultant_id,
         c.full_name AS consultant_full_name,
         c.alias AS consultant_alias,
         d.name AS deck_name,
         rc.position_index,
         rc.position_title,
         rc.orientation,
         rc.observation_notes,
         rc.contextual_interpretation,
         rc.personal_takeaway
       FROM reading_cards rc
       JOIN readings r ON r.id = rc.reading_id
       LEFT JOIN consultants c ON c.id = r.consultant_id
       LEFT JOIN decks d ON d.id = r.deck_id
       WHERE r.user_id = ? AND rc.card_id = ?
       ORDER BY r.performed_at DESC`
    )
    .all(userId, card.id)) as unknown as AppearanceRow[];

  const phenomena = await listDeckEventsWithContext(
    userId,
    { cardId: card.id },
    db
  );

  const personalEntries = await Promise.all(
    personalRows.map((pr) => mapPersonalEntryRow(pr, userId, db))
  );

  return {
    card,
    personalEntries,
    evolutionLog: logRows.map(
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
    appearances: appearanceRows.map(
      (ar): CardReadingAppearance => ({
        readingCardId: ar.reading_card_id,
        readingId: ar.reading_id,
        readingTitle: ar.reading_title,
        performedAt: ar.performed_at,
        status: ar.status,
        consultantId: ar.consultant_id,
        consultantDisplayName: ar.consultant_alias?.trim()
          ? ar.consultant_alias.trim()
          : ar.consultant_full_name,
        deckName: ar.deck_name,
        positionIndex: Number(ar.position_index),
        positionTitle: ar.position_title,
        orientation: ar.orientation,
        observationNotes: ar.observation_notes,
        contextualInterpretation: ar.contextual_interpretation,
        personalTakeaway: ar.personal_takeaway,
      })
    ),
    phenomena,
  };
}

export async function upsertPersonalCardEntry(
  userId: string,
  values: PersonalCardEntryValues,
  db: AppDatabase = getDb(userId)
): Promise<PersonalCardEntry> {
  const cardExists = (await db
    .prepare("SELECT id FROM cards_catalog WHERE id = ?")
    .get(values.cardId)) as { id: string } | undefined;

  if (!cardExists) {
    throw new Error("La carta seleccionada no existe en el catálogo.");
  }

  const normalizedDeckId = values.deckId.trim() ? values.deckId.trim() : null;
  if (normalizedDeckId) {
    const deckCheck = (await db
      .prepare("SELECT id FROM decks WHERE user_id = ? AND id = ?")
      .get(userId, normalizedDeckId)) as { id: string } | undefined;
    if (!deckCheck) {
      throw new Error("El mazo seleccionado no pertenece a tu espacio.");
    }
  }

  const nowIso = new Date().toISOString();
  let entryId = "";

  await db.exec("BEGIN");
  try {
    const existing = normalizedDeckId
      ? ((await db
          .prepare(
            "SELECT id FROM card_entries WHERE user_id = ? AND card_id = ? AND deck_id = ?"
          )
          .get(userId, values.cardId, normalizedDeckId)) as
          | { id: string }
          | undefined)
      : ((await db
          .prepare(
            "SELECT id FROM card_entries WHERE user_id = ? AND card_id = ? AND deck_id IS NULL"
          )
          .get(userId, values.cardId)) as { id: string } | undefined);

    if (existing) {
      entryId = existing.id;
      await db.prepare(
        `UPDATE card_entries
         SET custom_image_url = ?,
             personal_meaning = ?,
             reversed_meaning = ?,
             symbols_associations = ?,
             keywords_json = ?,
             reflections = ?,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      ).run(
        values.customImageUrl.trim() || null,
        values.personalMeaning.trim(),
        values.reversedMeaning.trim(),
        values.symbolsAssociations.trim(),
        JSON.stringify(values.keywords),
        values.reflections.trim(),
        nowIso,
        entryId,
        userId
      );
    } else {
      entryId = `ce-${randomUUID()}`;
      await db.prepare(
        `INSERT INTO card_entries (
          id, user_id, card_id, deck_id, custom_image_url, personal_meaning,
          reversed_meaning, symbols_associations, keywords_json, reflections, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entryId,
        userId,
        values.cardId,
        normalizedDeckId,
        values.customImageUrl.trim() || null,
        values.personalMeaning.trim(),
        values.reversedMeaning.trim(),
        values.symbolsAssociations.trim(),
        JSON.stringify(values.keywords),
        values.reflections.trim(),
        nowIso
      );
    }

    await syncEntityTags(userId, "card_entry", entryId, values.tags, "general", db);

    if (values.logEvolutionEntry && values.personalMeaning.trim().length > 0) {
      await db.prepare(
        `INSERT INTO card_interpretation_logs (
          id, user_id, card_id, deck_id, reading_id, note_title, content, created_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`
      ).run(
        `log-${randomUUID()}`,
        userId,
        values.cardId,
        normalizedDeckId,
        values.evolutionNoteTitle.trim() || "Revisión de significado personal",
        values.personalMeaning.trim(),
        nowIso
      );
    }

    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const savedRow = (await db
    .prepare("SELECT * FROM card_entries WHERE id = ? AND user_id = ?")
    .get(entryId, userId)) as PersonalCardEntryRow | undefined;

  if (!savedRow) {
    throw new Error("No se pudo recuperar la ficha personal de la carta.");
  }
  return mapPersonalEntryRow(savedRow, userId, db);
}

// Decks CRUD
interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  tradition: DeckTradition;
  author: string | null;
  card_count: number;
  description: string;
  is_default: number;
  needs_setup: number;
  created_at: string;
  readings_count: number;
}

function mapDeckRow(row: DeckRow): Deck {
  const isBuiltin = row.id === `deck-${row.tradition}-${row.user_id}`;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    tradition: row.tradition,
    author: row.author,
    cardCount: Number(row.card_count),
    description: row.description,
    isDefault: row.is_default === 1,
    needsSetup: row.needs_setup === 1,
    isBuiltin,
    createdAt: row.created_at,
    readingsCount: Number(row.readings_count ?? 0),
  };
}

export function getBuiltinDecks(): Deck[] {
  return BUILTIN_DECKS.map((b) => ({
    id: b.id,
    userId: null,
    name: b.name,
    tradition: b.tradition,
    author: b.author,
    cardCount: b.cardCount,
    description: b.description,
    isDefault: b.isDefault,
    needsSetup: false,
    isBuiltin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    readingsCount: 0,
  }));
}

export async function listAvailableDecks(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<Deck[]> {
  const userDecks = await listDecks(userId, db);
  const builtinDecks = getBuiltinDecks();

  const userDeckIds = new Set(userDecks.map((d) => d.id));
  const userDeckNames = new Set(
    userDecks.map((d) => d.name.toLowerCase().trim())
  );
  const userBuiltinTraditions = new Set(
    userDecks
      .filter((d) =>
        BUILTIN_DECKS.some(
          (b) =>
            b.tradition === d.tradition &&
            b.name.toLowerCase().trim() === d.name.toLowerCase().trim()
        )
      )
      .map((d) => d.tradition)
  );

  const activeBuiltins = builtinDecks.filter((b) => {
    if (userDeckIds.has(b.id)) return false;
    if (userDeckNames.has(b.name.toLowerCase().trim())) return false;
    if (userBuiltinTraditions.has(b.tradition)) return false;
    if (
      userDecks.some(
        (d) =>
          d.id === `${b.id}-${userId}` ||
          d.id === `deck-${b.tradition}-${userId}`
      )
    ) {
      return false;
    }
    return true;
  });

  const combined = [...userDecks, ...activeBuiltins];
  const seenKeys = new Set<string>();
  const uniqueDecks: Deck[] = [];

  for (const deck of combined) {
    const key = `${deck.tradition || "other"}:${deck.name.toLowerCase().trim()}`;
    if (!seenKeys.has(key) && !seenKeys.has(deck.id)) {
      seenKeys.add(key);
      seenKeys.add(deck.id);
      uniqueDecks.push(deck);
    }
  }

  return uniqueDecks;
}

export async function ensureUserBuiltinDecks(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<void> {
  const checkDeck = db.prepare(
    "SELECT id, is_default FROM decks WHERE user_id = ? AND id = ?"
  );
  const setDefaultDeck = db.prepare(
    "UPDATE decks SET is_default = 1 WHERE user_id = ? AND id = ?"
  );
  const hasDefaultDeckQuery = db.prepare(
    "SELECT id FROM decks WHERE user_id = ? AND is_default = 1 LIMIT 1"
  );
  const insertDeck = db.prepare(`
    INSERT INTO decks (
      id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  const nowIso = new Date().toISOString();
  let hasDefaultDeck = Boolean(await hasDefaultDeckQuery.get(userId));
  for (const deck of BUILTIN_DECKS) {
    const deckId = `deck-${deck.tradition}-${userId}`;
    const existing = (await checkDeck.get(userId, deckId)) as
      | { id: string; is_default: number }
      | undefined;
    if (existing) {
      if (!hasDefaultDeck && deck.isDefault) {
        await setDefaultDeck.run(userId, deckId);
        hasDefaultDeck = true;
      }
      continue;
    }

    const isDefault = !hasDefaultDeck && deck.isDefault;
    await insertDeck.run(
        deckId,
        userId,
        deck.name,
        deck.tradition,
        deck.author,
        deck.cardCount,
        deck.description,
        isDefault ? 1 : 0,
        nowIso
      );
    if (isDefault) hasDefaultDeck = true;
  }
}

export async function listDecks(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<Deck[]> {
  const rows = (await db
    .prepare(
      `SELECT
         d.*,
         (
           SELECT COUNT(*) FROM readings r
           WHERE r.user_id = d.user_id
             AND (
               r.deck_id = d.id
               OR EXISTS (
                 SELECT 1 FROM json_each(r.deck_ids_json) WHERE value = d.id
               )
             )
         ) AS readings_count
       FROM decks d
       WHERE d.user_id = ?
       ORDER BY d.needs_setup DESC, d.is_default DESC, d.name COLLATE NOCASE ASC`
    )
    .all(userId)) as unknown as DeckRow[];

  return rows.map(mapDeckRow);
}

export async function createDeck(
  userId: string,
  values: DeckFormValues,
  db: AppDatabase = getDb(userId)
): Promise<Deck> {
  const id = `deck-${randomUUID()}`;
  const nowIso = new Date().toISOString();

  await db.exec("BEGIN");
  try {
    if (values.isDefault) {
      await db.prepare("UPDATE decks SET is_default = 0 WHERE user_id = ?").run(
        userId
      );
    }
    await db.prepare(
      `INSERT INTO decks (
        id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      id,
      userId,
      values.name.trim(),
      values.tradition,
      values.author.trim() || null,
      values.cardCount,
      values.description.trim(),
      values.isDefault ? 1 : 0,
      nowIso
    );
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const decks = await listDecks(userId, db);
  const created = decks.find((d) => d.id === id);
  if (!created) throw new Error("No se pudo recuperar el mazo creado.");
  return created;
}

export async function createQuickDeck(
  userId: string,
  name: string,
  db: AppDatabase = getDb(userId)
): Promise<Deck> {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Indica un nombre para registrar el mazo.");
  }

  const id = `deck-${randomUUID()}`;
  const nowIso = new Date().toISOString();

  await db.prepare(
    `INSERT INTO decks (
      id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at
    ) VALUES (?, ?, ?, 'other', NULL, 78, '', 0, 1, ?)`
  ).run(id, userId, cleanName, nowIso);

  const decks = await listDecks(userId, db);
  const created = decks.find((d) => d.id === id);
  if (!created) throw new Error("No se pudo recuperar el mazo registrado.");
  return created;
}

export async function updateDeck(
  userId: string,
  deckId: string,
  values: DeckFormValues,
  db: AppDatabase = getDb(userId)
): Promise<Deck> {
  const existing = (await db
    .prepare("SELECT id FROM decks WHERE user_id = ? AND id = ?")
    .get(userId, deckId)) as { id: string } | undefined;

  if (!existing) {
    throw new Error("No se encontró el mazo para actualizar.");
  }

  await db.exec("BEGIN");
  try {
    if (values.isDefault) {
      await db.prepare("UPDATE decks SET is_default = 0 WHERE user_id = ?").run(
        userId
      );
    }

    await db.prepare(
      `UPDATE decks
       SET name = ?,
           tradition = ?,
           author = ?,
           card_count = ?,
           description = ?,
           is_default = ?,
           needs_setup = 0
       WHERE user_id = ? AND id = ?`
    ).run(
      values.name.trim(),
      values.tradition,
      values.author.trim() || null,
      values.cardCount,
      values.description.trim(),
      values.isDefault ? 1 : 0,
      userId,
      deckId
    );
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const decks = await listDecks(userId, db);
  const updated = decks.find((d) => d.id === deckId);
  if (!updated) throw new Error("No se pudo recuperar el mazo actualizado.");
  return updated;
}

export async function deleteDeck(
  userId: string,
  deckId: string,
  db: AppDatabase = getDb(userId)
): Promise<void> {
  const res = await db
    .prepare("DELETE FROM decks WHERE user_id = ? AND id = ?")
    .run(userId, deckId);
  if (res.changes === 0) {
    throw new Error("No se encontró el mazo para eliminar.");
  }
}

// Spread Templates CRUD
interface SpreadRow {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  description: string;
  positions_json: string;
  is_builtin: number;
  created_at: string;
}

function mapSpreadRow(row: SpreadRow): SpreadTemplate {
  let positions: SpreadPositionDefinition[] = [];
  try {
    const parsed: unknown = JSON.parse(row.positions_json);
    if (Array.isArray(parsed)) {
      positions = parsed
        .filter(
          (p): p is Record<string, unknown> =>
            typeof p === "object" && p !== null
        )
        .map((p, idx) => ({
          positionIndex:
            typeof p.positionIndex === "number" ? p.positionIndex : idx + 1,
          title: typeof p.title === "string" ? p.title : `Posición ${idx + 1}`,
          prompt: typeof p.prompt === "string" ? p.prompt : "",
          coordX: typeof p.coordX === "number" ? p.coordX : 50,
          coordY: typeof p.coordY === "number" ? p.coordY : 50,
        }));
    }
  } catch {
    positions = [];
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    description: row.description,
    positions,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
  };
}

export async function listSpreadTemplates(
  userId: string,
  db: AppDatabase = getDb(userId)
): Promise<SpreadTemplate[]> {
  const rows = (await db
    .prepare(
      `SELECT * FROM spread_templates
       WHERE is_builtin = 1 OR user_id = ?
       ORDER BY is_builtin DESC, name COLLATE NOCASE ASC`
    )
    .all(userId)) as unknown as SpreadRow[];

  return rows.map(mapSpreadRow);
}

export async function createSpreadTemplate(
  userId: string,
  values: SpreadTemplateFormValues,
  db: AppDatabase = getDb(userId)
): Promise<SpreadTemplate> {
  const id = `spread-${randomUUID()}`;
  const nowIso = new Date().toISOString();

  await db.prepare(
    `INSERT INTO spread_templates (
      id, user_id, name, category, description, positions_json, is_builtin, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    userId,
    values.name.trim(),
    values.category.trim(),
    values.description.trim(),
    JSON.stringify(values.positions),
    nowIso
  );

  const row = (await db
    .prepare("SELECT * FROM spread_templates WHERE id = ? AND user_id = ?")
    .get(id, userId)) as SpreadRow | undefined;

  if (!row) throw new Error("No se pudo recuperar la plantilla creada.");
  return mapSpreadRow(row);
}

export async function deleteSpreadTemplate(
  userId: string,
  spreadId: string,
  db: AppDatabase = getDb(userId)
): Promise<void> {
  const res = await db
    .prepare(
      "DELETE FROM spread_templates WHERE user_id = ? AND id = ? AND is_builtin = 0"
    )
    .run(userId, spreadId);

  if (res.changes === 0) {
    throw new Error("Solo puedes eliminar plantillas personalizadas propias.");
  }
}
