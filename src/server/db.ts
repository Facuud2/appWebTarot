import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  BUILTIN_DECKS,
  BUILTIN_SPREAD_TEMPLATES,
  CANONICAL_TAROT_CARDS,
} from "@/lib/tarot-catalog";
import { hashPassword } from "@/server/crypto-auth";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  preferences_json TEXT NOT NULL DEFAULT '{"defaultDeckId":null,"defaultSpreadId":null,"compactTables":false,"autosaveReadings":true}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS cards_catalog (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  arcana TEXT NOT NULL,
  suit TEXT,
  rank_number INTEGER NOT NULL,
  roman_numeral TEXT,
  canonical_name TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  deck_tradition TEXT NOT NULL DEFAULT 'rws',
  search_keywords_json TEXT NOT NULL DEFAULT '[]',
  traditional_upright TEXT NOT NULL,
  traditional_reversed TEXT NOT NULL,
  traditional_keywords_json TEXT NOT NULL,
  archetype_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spread_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  positions_json TEXT NOT NULL,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spread_templates_user ON spread_templates(user_id);

CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tradition TEXT NOT NULL,
  author TEXT,
  card_count INTEGER NOT NULL DEFAULT 78,
  description TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  needs_setup INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);

CREATE TABLE IF NOT EXISTS consultants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  alias TEXT,
  email TEXT,
  phone TEXT,
  preferred_channel TEXT,
  context_notes TEXT NOT NULL DEFAULT '',
  personal_notes TEXT NOT NULL DEFAULT '',
  avatar_hue INTEGER NOT NULL DEFAULT 168,
  needs_setup INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consultants_user ON consultants(user_id);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id TEXT NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER,
  modality TEXT NOT NULL CHECK (modality IN ('in_person', 'video', 'audio', 'written')),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  intention TEXT NOT NULL DEFAULT '',
  prep_notes TEXT NOT NULL DEFAULT '',
  linked_reading_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_consultant ON appointments(consultant_id);

CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id TEXT REFERENCES consultants(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  deck_id TEXT REFERENCES decks(id) ON DELETE SET NULL,
  deck_ids_json TEXT NOT NULL DEFAULT '[]',
  spread_template_id TEXT REFERENCES spread_templates(id) ON DELETE SET NULL,
  spread_name TEXT NOT NULL,
  custom_positions_json TEXT NOT NULL DEFAULT '[]',
  title TEXT NOT NULL,
  question_intention TEXT NOT NULL DEFAULT '',
  session_context TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'completed')),
  performed_at TEXT NOT NULL,
  general_observations TEXT NOT NULL DEFAULT '',
  session_synthesis TEXT NOT NULL DEFAULT '',
  closing_reflections TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readings_user_date ON readings(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_consultant ON readings(consultant_id);

CREATE TABLE IF NOT EXISTS reading_cards (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
  position_index INTEGER NOT NULL,
  position_title TEXT NOT NULL,
  position_prompt TEXT NOT NULL DEFAULT '',
  card_id TEXT NOT NULL REFERENCES cards_catalog(id),
  orientation TEXT NOT NULL CHECK (orientation IN ('upright', 'reversed')),
  observation_notes TEXT NOT NULL DEFAULT '',
  contextual_interpretation TEXT NOT NULL DEFAULT '',
  personal_takeaway TEXT NOT NULL DEFAULT '',
  synced_to_grimorio INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reading_cards_reading ON reading_cards(reading_id);
CREATE INDEX IF NOT EXISTS idx_reading_cards_card ON reading_cards(card_id);

CREATE TABLE IF NOT EXISTS deck_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_id TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES cards_catalog(id),
  occurred_phase TEXT NOT NULL CHECK (occurred_phase IN ('shuffling', 'cutting', 'dealing', 'base_of_deck', 'closing', 'other')),
  phenomenon_type TEXT NOT NULL CHECK (phenomenon_type IN ('jumped', 'fell_to_floor', 'base_card', 'cut_reveal', 'partially_hidden', 'spontaneous_turn', 'out_of_order', 'other')),
  custom_phenomenon_label TEXT,
  linked_position_index INTEGER,
  observation_description TEXT NOT NULL,
  personal_interpretation TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deck_events_user ON deck_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_deck_events_reading ON deck_events(reading_id);
CREATE INDEX IF NOT EXISTS idx_deck_events_card ON deck_events(card_id);

CREATE TABLE IF NOT EXISTS card_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards_catalog(id),
  deck_id TEXT REFERENCES decks(id) ON DELETE SET NULL,
  custom_image_url TEXT,
  personal_meaning TEXT NOT NULL DEFAULT '',
  reversed_meaning TEXT NOT NULL DEFAULT '',
  symbols_associations TEXT NOT NULL DEFAULT '',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  reflections TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, card_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_card_entries_user_card ON card_entries(user_id, card_id);

CREATE TABLE IF NOT EXISTS card_interpretation_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards_catalog(id),
  deck_id TEXT REFERENCES decks(id) ON DELETE SET NULL,
  reading_id TEXT REFERENCES readings(id) ON DELETE SET NULL,
  note_title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_logs_user_card ON card_interpretation_logs(user_id, card_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'phenomenon', 'theme', 'consultant')),
  created_at TEXT NOT NULL,
  UNIQUE(user_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS entity_tags (
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('consultant', 'reading', 'deck_event', 'card_entry')),
  entity_id TEXT NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_lookup ON entity_tags(entity_type, entity_id);
`;

export const DEMO_USER_EMAIL = "clara@grimorio.local";
export const DEMO_USER_ID = "user-demo-clara";

function syncCanonicalCatalog(db: DatabaseSync): void {
  const upsertCard = db.prepare(`
    INSERT INTO cards_catalog (
      id, slug, arcana, suit, rank_number, roman_numeral,
      canonical_name, name_en, deck_tradition, search_keywords_json,
      traditional_upright, traditional_reversed,
      traditional_keywords_json, archetype_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      arcana = excluded.arcana,
      suit = excluded.suit,
      rank_number = excluded.rank_number,
      roman_numeral = excluded.roman_numeral,
      canonical_name = excluded.canonical_name,
      name_en = excluded.name_en,
      deck_tradition = excluded.deck_tradition,
      search_keywords_json = excluded.search_keywords_json,
      traditional_upright = excluded.traditional_upright,
      traditional_reversed = excluded.traditional_reversed,
      traditional_keywords_json = excluded.traditional_keywords_json,
      archetype_note = excluded.archetype_note
  `);

  const upsertSpread = db.prepare(`
    INSERT INTO spread_templates (
      id, user_id, name, category, description, positions_json, is_builtin, created_at
    ) VALUES (?, NULL, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      description = excluded.description,
      positions_json = excluded.positions_json
  `);

  db.exec("BEGIN");
  try {
    for (const card of CANONICAL_TAROT_CARDS) {
      upsertCard.run(
        card.id,
        card.slug,
        card.arcana,
        card.suit,
        card.rankNumber,
        card.romanNumeral,
        card.canonicalName,
        card.nameEn,
        card.deckTradition,
        JSON.stringify(card.searchKeywords),
        card.traditionalUpright,
        card.traditionalReversed,
        JSON.stringify(card.traditionalKeywords),
        card.archetypeNote
      );
    }

    db
      .prepare(
        "DELETE FROM spread_templates WHERE id = 'spread-open-table' AND is_builtin = 1"
      )
      .run();

    const baseDate = "2026-01-01T00:00:00.000Z";
    for (const spread of BUILTIN_SPREAD_TEMPLATES) {
      upsertSpread.run(
        spread.id,
        spread.name,
        spread.category,
        spread.description,
        JSON.stringify(spread.positions),
        baseDate
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function migrateDatabaseSchema(db: DatabaseSync): void {
  const decksSqlRow = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'decks'"
    )
    .get() as { sql?: string } | undefined;

  if (
    decksSqlRow?.sql &&
    (decksSqlRow.sql.includes("CHECK (tradition IN") ||
      !decksSqlRow.sql.includes("needs_setup"))
  ) {
    const hasNeedsSetup = decksSqlRow.sql.includes("needs_setup");
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN");
    try {
      db.exec(`
        CREATE TABLE decks_v2 (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          tradition TEXT NOT NULL,
          author TEXT,
          card_count INTEGER NOT NULL DEFAULT 78,
          description TEXT NOT NULL DEFAULT '',
          is_default INTEGER NOT NULL DEFAULT 0,
          needs_setup INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);
      if (hasNeedsSetup) {
        db.exec(`
          INSERT INTO decks_v2 (id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at)
          SELECT id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at FROM decks;
        `);
      } else {
        db.exec(`
          INSERT INTO decks_v2 (id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at)
          SELECT id, user_id, name, tradition, author, card_count, description, is_default, 0, created_at FROM decks;
        `);
      }
      db.exec("DROP TABLE decks;");
      db.exec("ALTER TABLE decks_v2 RENAME TO decks;");
      db.exec("CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);");
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }

  const apptSqlRow = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'appointments'"
    )
    .get() as { sql?: string } | undefined;

  if (
    apptSqlRow?.sql &&
    apptSqlRow.sql.includes("duration_minutes INTEGER NOT NULL")
  ) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN");
    try {
      db.exec(`
        CREATE TABLE appointments_v2 (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          consultant_id TEXT NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          scheduled_at TEXT NOT NULL,
          duration_minutes INTEGER,
          modality TEXT NOT NULL CHECK (modality IN ('in_person', 'video', 'audio', 'written')),
          status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
          intention TEXT NOT NULL DEFAULT '',
          prep_notes TEXT NOT NULL DEFAULT '',
          linked_reading_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO appointments_v2 (
          id, user_id, consultant_id, title, scheduled_at, duration_minutes,
          modality, status, intention, prep_notes, linked_reading_id, created_at, updated_at
        )
        SELECT
          id, user_id, consultant_id, title, scheduled_at, duration_minutes,
          modality, status, intention, prep_notes, linked_reading_id, created_at, updated_at
        FROM appointments;
        DROP TABLE appointments;
        ALTER TABLE appointments_v2 RENAME TO appointments;
        CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, scheduled_at);
        CREATE INDEX IF NOT EXISTS idx_appointments_consultant ON appointments(consultant_id);
      `);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }

  const readingCols = db
    .prepare("PRAGMA table_info(readings)")
    .all() as Array<{ name: string }>;
  const colNames = new Set(readingCols.map((c) => c.name));

  if (!colNames.has("deck_ids_json")) {
    db.exec(
      "ALTER TABLE readings ADD COLUMN deck_ids_json TEXT NOT NULL DEFAULT '[]';"
    );
    db.exec(
      "UPDATE readings SET deck_ids_json = json_array(deck_id) WHERE deck_id IS NOT NULL AND deck_ids_json = '[]';"
    );
  } else {
    db.exec(
      "UPDATE readings SET deck_ids_json = json_array(deck_id) WHERE deck_id IS NOT NULL AND deck_ids_json = '[]';"
    );
  }

  if (!colNames.has("custom_positions_json")) {
    db.exec(
      "ALTER TABLE readings ADD COLUMN custom_positions_json TEXT NOT NULL DEFAULT '[]';"
    );
  }

  const consultantCols = db
    .prepare("PRAGMA table_info(consultants)")
    .all() as Array<{ name: string }>;
  const consultantColNames = new Set(consultantCols.map((c) => c.name));
  if (!consultantColNames.has("needs_setup")) {
    db.exec(
      "ALTER TABLE consultants ADD COLUMN needs_setup INTEGER NOT NULL DEFAULT 0;"
    );
  }

  const cardsSqlRow = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'cards_catalog'"
    )
    .get() as { sql?: string } | undefined;

  if (
    cardsSqlRow?.sql &&
    (!cardsSqlRow.sql.includes("name_en") ||
      cardsSqlRow.sql.includes("CHECK (arcana IN ('major', 'minor'))"))
  ) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN;");
    try {
      db.exec(`
        CREATE TABLE cards_catalog_v2 (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          arcana TEXT NOT NULL,
          suit TEXT,
          rank_number INTEGER NOT NULL,
          roman_numeral TEXT,
          canonical_name TEXT NOT NULL,
          name_en TEXT NOT NULL DEFAULT '',
          deck_tradition TEXT NOT NULL DEFAULT 'rws',
          search_keywords_json TEXT NOT NULL DEFAULT '[]',
          traditional_upright TEXT NOT NULL,
          traditional_reversed TEXT NOT NULL,
          traditional_keywords_json TEXT NOT NULL,
          archetype_note TEXT NOT NULL
        );
        INSERT INTO cards_catalog_v2 (
          id, slug, arcana, suit, rank_number, roman_numeral,
          canonical_name, name_en, deck_tradition, search_keywords_json,
          traditional_upright, traditional_reversed,
          traditional_keywords_json, archetype_note
        )
        SELECT
          id, slug, arcana, suit, rank_number, roman_numeral,
          canonical_name, '', 'rws', '[]',
          traditional_upright, traditional_reversed,
          traditional_keywords_json, archetype_note
        FROM cards_catalog;
        DROP TABLE cards_catalog;
        ALTER TABLE cards_catalog_v2 RENAME TO cards_catalog;
      `);
      db.exec("COMMIT;");
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }
}

export function cleanupDemoDataFromDatabase(db: DatabaseSync): void {
  try {
    db.exec(`
      DELETE FROM entity_tags WHERE entity_type = 'consultant' AND entity_id IN (SELECT id FROM consultants WHERE user_id = '${DEMO_USER_ID}');
      DELETE FROM entity_tags WHERE entity_type = 'reading' AND entity_id IN (SELECT id FROM readings WHERE user_id = '${DEMO_USER_ID}');
      DELETE FROM entity_tags WHERE entity_type = 'deck_event' AND entity_id IN (SELECT id FROM deck_events WHERE user_id = '${DEMO_USER_ID}');
      DELETE FROM entity_tags WHERE entity_type = 'card_entry' AND entity_id IN (SELECT id FROM card_entries WHERE user_id = '${DEMO_USER_ID}');
      DELETE FROM reading_cards WHERE reading_id IN (SELECT id FROM readings WHERE user_id = '${DEMO_USER_ID}');
      DELETE FROM card_interpretation_logs WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM card_entries WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM deck_events WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM appointments WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM readings WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM consultants WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM decks WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM tags WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM sessions WHERE user_id = '${DEMO_USER_ID}';
      DELETE FROM users WHERE is_demo = 1 OR id = '${DEMO_USER_ID}';
    `);
  } catch {
    // ignore
  }
}

function syncBuiltinDecks(db: DatabaseSync): void {
  const users = db.prepare("SELECT id FROM users").all() as Array<{ id: string }>;
  const nowIso = "2026-01-01T00:00:00.000Z";

  const checkDeck = db.prepare(
    "SELECT id FROM decks WHERE user_id = ? AND tradition = ?"
  );
  const insertDeck = db.prepare(`
    INSERT INTO decks (
      id, user_id, name, tradition, author, card_count, description, is_default, needs_setup, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const user of users) {
      for (const deck of BUILTIN_DECKS) {
        const existing = checkDeck.get(user.id, deck.tradition) as { id: string } | undefined;
        if (!existing) {
          const deckId = `${deck.id}-${user.id}`;
          insertDeck.run(
            deckId,
            user.id,
            deck.name,
            deck.tradition,
            deck.author,
            deck.cardCount,
            deck.description,
            deck.isDefault ? 1 : 0,
            nowIso
          );
        }
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function seedDemoWorkspaceIfMissing(db: DatabaseSync): void {
  const existingUser = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(DEMO_USER_ID) as { id: string } | undefined;
  if (existingUser) {
    return;
  }

  const now = new Date();
  const isoOffset = (daysDelta: number, hour = 11, minute = 0): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysDelta);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO users (id, email, name, workspace_name, password_hash, is_demo, preferences_json, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      DEMO_USER_ID,
      DEMO_USER_EMAIL,
      "Clara Valdés",
      "Mesa de Estudio Sur",
      hashPassword("grimorio-demo-2026"),
      JSON.stringify({
        defaultDeckId: "deck-rws-centennial",
        defaultSpreadId: "spread-simple-cross",
        compactTables: false,
        autosaveReadings: true,
        onboarding: {
          completed: true,
          currentStep: 6,
          experienceLevel: "professional",
          usagePurposes: [
            "client_sessions",
            "comparative_study",
            "phenomena_tracking",
          ],
          selectedDeckId: "deck-rws-centennial",
          customDeckCreatedId: null,
          skippedAppointmentDemo: false,
          createdAppointmentId: "appt-hoy-mariana",
          skippedReadingDemo: false,
          createdReadingId: "read-mariana-estudio",
          readingTargetType: "consultant",
          targetConsultantId: "cons-mariana",
          completedAt: isoOffset(-59, 10, 0),
          updatedAt: isoOffset(-59, 10, 0),
        },
      }),
      isoOffset(-60, 9, 0)
    );

    // Decks
    const insertDeck = db.prepare(
      `INSERT INTO decks (id, user_id, name, tradition, author, card_count, description, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertDeck.run(
      "deck-rws-centennial",
      DEMO_USER_ID,
      "Rider-Waite-Smith Edición Centenario",
      "rws",
      "Pamela Colman Smith & A. E. Waite",
      78,
      "Mazo principal de mesa. Cartulina mate ligeramente desgastada en los cantos tras cuatro años de sesiones presenciales; mezcla suave que tiende a marcar cortes netos.",
      1,
      isoOffset(-58, 10, 0)
    );
    insertDeck.run(
      "deck-marsella-camoin",
      DEMO_USER_ID,
      "Tarot de Marsella Restaurado",
      "marseille",
      "Tradición Nicolás Conver (1760)",
      78,
      "Reservado para lecturas centradas en los 22 Arcanos Mayores o cruces de orientación vocacional. Miradas laterales muy expresivas en la mesa.",
      0,
      isoOffset(-45, 10, 0)
    );
    insertDeck.run(
      "deck-botanico-estudio",
      DEMO_USER_ID,
      "Baraja de Grabados del Taller",
      "other",
      "Edición independiente numerada",
      78,
      "Cartón grueso de 350 g; requiere barajado lento sobre paño de lino.",
      0,
      isoOffset(-20, 10, 0)
    );

    // Tags
    const tagSeeds: Array<[string, string, "general" | "phenomenon" | "theme" | "consultant"]> = [
      ["tag-vocacion", "Transición laboral", "theme"],
      ["tag-duelo", "Cierre de ciclo", "theme"],
      ["tag-mensual", "Seguimiento trimestral", "consultant"],
      ["tag-salto-limpio", "Salto limpio en mezcla", "phenomenon"],
      ["tag-base-espejo", "Carta de base recurrente", "phenomenon"],
      ["tag-corte-pesado", "Corte denso a mitad de mazo", "phenomenon"],
      ["tag-vincular", "Vínculos y acuerdos", "theme"],
    ];
    const insertTag = db.prepare(
      `INSERT INTO tags (id, user_id, name, normalized_name, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const [id, name, cat] of tagSeeds) {
      insertTag.run(
        id,
        DEMO_USER_ID,
        name,
        name.toLowerCase(),
        cat,
        isoOffset(-40, 12, 0)
      );
    }

    const linkTag = db.prepare(
      `INSERT INTO entity_tags (tag_id, entity_type, entity_id) VALUES (?, ?, ?)`
    );

    // Consultants
    const insertConsultant = db.prepare(
      `INSERT INTO consultants (
        id, user_id, full_name, alias, email, phone, preferred_channel,
        context_notes, personal_notes, avatar_hue, archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertConsultant.run(
      "cons-mariana",
      DEMO_USER_ID,
      "Mariana Echeverría",
      "Mariana E.",
      "mariana.echeverria@ejemplo.org",
      "+54 11 4890-2214",
      "Presencial en estudio",
      "Arquitecta independiente en proceso de reorganizar su estudio tras cerrar una sociedad de ocho años.",
      "Prefiere sesiones pausadas de 60 minutos sin prisa en el cierre; suele traer su propio cuaderno para anotar preguntas concretas.",
      168,
      null,
      isoOffset(-42, 11, 0),
      isoOffset(-3, 18, 30)
    );
    linkTag.run("tag-vocacion", "consultant", "cons-mariana");
    linkTag.run("tag-mensual", "consultant", "cons-mariana");

    insertConsultant.run(
      "cons-bitacora-norte",
      DEMO_USER_ID,
      "Alias: Caminante del Río",
      "Caminante del Río",
      null,
      null,
      "Videollamada sin cámara grabada",
      "Consulta bajo alias por resguardo de privacidad profesional. Explora procesos de escritura y mudanza geográfica.",
      "Mantener registro estrictamente con alias. Muy receptivo a lecturas con Tarot de Marsella.",
      28,
      null,
      isoOffset(-30, 15, 0),
      isoOffset(-7, 16, 0)
    );
    linkTag.run("tag-duelo", "consultant", "cons-bitacora-norte");

    insertConsultant.run(
      "cons-julian",
      DEMO_USER_ID,
      "Julián Santamaría",
      null,
      "julian.s@ejemplo.org",
      null,
      "Presencial en mesa",
      "Docente universitario evaluando año sabático e investigación de archivo.",
      "Agradece que se distinga con nitidez entre la descripción de las figuras del mazo y la síntesis interpretativa.",
      212,
      null,
      isoOffset(-18, 10, 30),
      isoOffset(-1, 14, 0)
    );
    linkTag.run("tag-vocacion", "consultant", "cons-julian");

    // Readings
    const insertReading = db.prepare(
      `INSERT INTO readings (
        id, user_id, consultant_id, appointment_id, deck_id, deck_ids_json, spread_template_id,
        spread_name, title, question_intention, session_context, status,
        performed_at, general_observations, session_synthesis, closing_reflections,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertReading.run(
      "read-mariana-estudio",
      DEMO_USER_ID,
      "cons-mariana",
      null,
      "deck-rws-centennial",
      JSON.stringify(["deck-rws-centennial"]),
      "spread-simple-cross",
      "Cruz de cinco cartas",
      "Reapertura del taller propio tras disolución societaria",
      "¿Qué criterio práctico conviene priorizar al firmar los primeros encargos en solitario durante este trimestre?",
      "Sesión presencial de tarde lluviosa. Mariana llega aliviada tras firmar el cierre contable de su antigua sociedad, pero inquieta por sostener sola la estructura.",
      "completed",
      isoOffset(-12, 17, 0),
      "Durante el tercer barajado, antes del corte, XVI La Torre se desprendió limpiamente hacia el centro de la mesa cara arriba. Al recoger al final, XVII La Estrella permanecía en la base del mazo.",
      "La lectura confirma que la ruptura estructural ya ocurrió en los hechos y no necesita seguir defendiéndose de ella. El eje pasa por seleccionar pocos encargos bien delimitados (El Emperador en centro) apoyándose en oficio paciente (Ocho de Oros).",
      "Notable diálogo visual entre El Ermitaño mirando hacia la izquierda y el Ocho de Oros: trabajar sin ruido externo durante los primeros noventa días.",
      isoOffset(-12, 17, 0),
      isoOffset(-12, 18, 15)
    );
    linkTag.run("tag-vocacion", "reading", "read-mariana-estudio");
    linkTag.run("tag-duelo", "reading", "read-mariana-estudio");

    insertReading.run(
      "read-caminante-mudanza",
      DEMO_USER_ID,
      "cons-bitacora-norte",
      null,
      "deck-marsella-camoin",
      JSON.stringify(["deck-marsella-camoin"]),
      "spread-triad-observation",
      "Pasado, Presente y Futuro (3 cartas)",
      "Decisión entre renovar alquiler urbano o trasladarse a la costa",
      "¿Qué está pidiendo realmente este cierre de etapa respecto al lugar cotidiano de trabajo y escritura?",
      "Consulta por audio. El consultante tiene dos contratos sobre el escritorio con vencimiento a fin de mes.",
      "completed",
      isoOffset(-6, 19, 0),
      "Corte muy neto exactamente por la mitad del mazo revelando El Ermitaño antes de desplegar las tres cartas.",
      "El Ocho de Copas central muestra que afectivamente el ciclo en la ciudad actual ya dio su fruto completo; no se trata de huir sino de partir con gratitud hacia un ritmo más sobrio.",
      "Revisar en un mes cómo evolucionó la mudanza; El Ermitaño vuelve a aparecer vinculado a escritura.",
      isoOffset(-6, 19, 0),
      isoOffset(-6, 19, 50)
    );
    linkTag.run("tag-duelo", "reading", "read-caminante-mudanza");

    insertReading.run(
      "read-julian-borrador",
      DEMO_USER_ID,
      "cons-julian",
      null,
      "deck-rws-centennial",
      JSON.stringify(["deck-rws-centennial"]),
      "spread-triad-observation",
      "Pasado, Presente y Futuro (3 cartas)",
      "Ordenamiento de archivo personal y solicitud de licencia",
      "¿Cómo equilibrar las obligaciones de cátedra actuales con el proyecto de libro sin caer en agotamiento?",
      "Lectura iniciada al cierre de la tarde; quedaron registradas las cartas y el evento de mezcla, pendiente redactar la síntesis final.",
      "draft",
      isoOffset(-1, 18, 30),
      "El Diez de Bastos quedó parcialmente cubierto por el Dos de Oros al extender el abanico sobre la mesa.",
      "",
      "",
      isoOffset(-1, 18, 30),
      isoOffset(-1, 18, 55)
    );
    linkTag.run("tag-vocacion", "reading", "read-julian-borrador");

    // Reading cards
    const insertReadingCard = db.prepare(
      `INSERT INTO reading_cards (
        id, reading_id, position_index, position_title, position_prompt,
        card_id, orientation, observation_notes, contextual_interpretation,
        personal_takeaway, synced_to_grimorio, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertReadingCard.run(
      "rc-1",
      "read-mariana-estudio",
      1,
      "A favor / Aliado",
      "Recurso disponible o corriente que acompaña.",
      "pentacles-08",
      "upright",
      "Dispuesta derecha en el extremo izquierdo; los pentáculos labrados alinean visualmente con el centro.",
      "Su oficio técnico intacto y el gusto por el detalle constructivo son el verdadero respaldo económico y anímico ahora.",
      "El Ocho de Oros junto a cartas de ruptura actúa como ancla somática: volver a las manos y a la tarea diaria.",
      1,
      isoOffset(-12, 17, 15)
    );
    insertReadingCard.run(
      "rc-2",
      "read-mariana-estudio",
      2,
      "Fricción / Límite",
      "Obstáculo real, punto ciego o resistencia.",
      "wands-10",
      "reversed",
      "Apareció invertida al girar sobre su eje horizontal tal como se acordó en mesa.",
      "Hábito residual de cargar con tareas administrativas que antes cubría por dos personas; riesgo de replicar la sobrecarga.",
      "Diez de Bastos invertido como alivio concreto cuando se renuncia a sostener encargos mal presupuestados.",
      1,
      isoOffset(-12, 17, 20)
    );
    insertReadingCard.run(
      "rc-3",
      "read-mariana-estudio",
      3,
      "Horizonte consciente",
      "Lo que se busca comprender o alcanzar.",
      "major-09",
      "upright",
      "Derecha en la parte superior de la cruz.",
      "Deseo legítimo de autonomía silenciosa y selección cuidadosa de clientes afines.",
      "El Ermitaño en posición de horizonte no pide aislarse del oficio, sino elegir con quién conversar.",
      1,
      isoOffset(-12, 17, 24)
    );
    insertReadingCard.run(
      "rc-4",
      "read-mariana-estudio",
      4,
      "Base o suelo",
      "Sustento profundo o condición previa.",
      "major-16",
      "upright",
      "Se integró en posición 4 tras haber saltado durante la mezcla previa.",
      "La disolución societaria ya despejó lo insostenible; los cimientos actuales están limpios aunque todavía se sientan desnudos.",
      "Cuando La Torre salta en mezcla y luego ocupa la base, el terremoto pertenece al pasado reciente y funciona como suelo despejado.",
      1,
      isoOffset(-12, 17, 28)
    );
    insertReadingCard.run(
      "rc-5",
      "read-mariana-estudio",
      5,
      "Centro / Síntesis",
      "Eje integrador de la lectura en mesa.",
      "major-04",
      "upright",
      "Derecha en el cruce exacto de la mesa.",
      "Establecer honorarios claros, horarios acotados y contratos propios desde el primer día.",
      "El Emperador tras La Torre: reconstruir con menos muros pero más firmes.",
      1,
      isoOffset(-12, 17, 32)
    );

    // Reading 2 cards
    insertReadingCard.run(
      "rc-6",
      "read-caminante-mudanza",
      1,
      "Antecedente o raíz",
      "De dónde proviene la tensión o pregunta actual.",
      "cups-04",
      "upright",
      "Derecha a la izquierda del paño.",
      "Saturación sensorial del entorno urbano tras años de rutina idéntica.",
      "Cuatro de Copas como señal de fatiga acústica y espacial, no de ingratitud.",
      0,
      isoOffset(-6, 19, 10)
    );
    insertReadingCard.run(
      "rc-7",
      "read-caminante-mudanza",
      2,
      "Estado presente",
      "Qué está operando ahora mismo en la experiencia real.",
      "cups-08",
      "upright",
      "Derecha en el centro; las ocho copas ordenadas dejan ver el hueco central.",
      "Las copas están llenas y en pie, pero ya no hay vitalidad en quedarse; la partida está madura.",
      "El hueco entre las copas del Ocho funciona como puerta estrecha pero transitable.",
      1,
      isoOffset(-6, 19, 16)
    );
    insertReadingCard.run(
      "rc-8",
      "read-caminante-mudanza",
      3,
      "Cauce o apertura",
      "Hacia dónde tiende el movimiento o qué gesto pide.",
      "major-17",
      "upright",
      "Derecha cerrando la tríada.",
      "Simplificación material y confianza tranquila al instalar la mesa de escritura cerca del agua.",
      "La Estrella como literalidad geográfica (agua abierta) además de calma psíquica.",
      1,
      isoOffset(-6, 19, 22)
    );

    // Reading 3 (draft) cards
    insertReadingCard.run(
      "rc-9",
      "read-julian-borrador",
      1,
      "Antecedente o raíz",
      "De dónde proviene la tensión o pregunta actual.",
      "wands-10",
      "upright",
      "Quedó medio centímetro solapada bajo la segunda carta al abrir el abanico.",
      "Acumulación de comisiones académicas aceptadas por compromiso.",
      "",
      0,
      isoOffset(-1, 18, 40)
    );
    insertReadingCard.run(
      "rc-10",
      "read-julian-borrador",
      2,
      "Estado presente",
      "Qué está operando ahora mismo en la experiencia real.",
      "pentacles-02",
      "upright",
      "Derecha en el centro de la mesa.",
      "Equilibrio precario pero todavía ágil entre docencia e investigación.",
      "",
      0,
      isoOffset(-1, 18, 43)
    );

    // Deck Physical Events
    const insertEvent = db.prepare(
      `INSERT INTO deck_events (
        id, user_id, reading_id, card_id, occurred_phase, phenomenon_type,
        custom_phenomenon_label, linked_position_index, observation_description,
        personal_interpretation, occurred_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertEvent.run(
      "evt-torre-salto",
      DEMO_USER_ID,
      "read-mariana-estudio",
      "major-16",
      "shuffling",
      "jumped",
      null,
      4,
      "En la tercera mezcla sobre el paño, XVI La Torre salió proyectada unos diez centímetros hacia adelante y cayó cara arriba sin arrastrar otras cartas.",
      "En esta consulta señaló un hecho consumado (la ruptura societaria ya firmada) que pedía ser reconocido como punto de partida en lugar de temido como amenaza futura.",
      isoOffset(-12, 17, 5),
      isoOffset(-12, 17, 6)
    );
    linkTag.run("tag-salto-limpio", "deck_event", "evt-torre-salto");

    insertEvent.run(
      "evt-estrella-base",
      DEMO_USER_ID,
      "read-mariana-estudio",
      "major-17",
      "base_of_deck",
      "base_card",
      null,
      null,
      "Al apoyar el mazo restante tras desplegar la cruz, XVII La Estrella quedó visible en la base durante toda la conversación.",
      "Clima de serenidad subyacente una vez despejado el ruido administrativo.",
      isoOffset(-12, 17, 12),
      isoOffset(-12, 17, 12)
    );
    linkTag.run("tag-base-espejo", "deck_event", "evt-estrella-base");

    insertEvent.run(
      "evt-ermitano-corte",
      DEMO_USER_ID,
      "read-caminante-mudanza",
      "major-09",
      "cutting",
      "cut_reveal",
      null,
      null,
      "Al cortar con la mano izquierda, el mazo se abrió exactamente en un bloque denso mostrando IX El Ermitaño en el corte.",
      "Confirmó el tono de retiro creativo y sobriedad antes siquiera de tender la tríada.",
      isoOffset(-6, 19, 4),
      isoOffset(-6, 19, 5)
    );
    linkTag.run("tag-corte-pesado", "deck_event", "evt-ermitano-corte");

    insertEvent.run(
      "evt-bastos-oculta",
      DEMO_USER_ID,
      "read-julian-borrador",
      "wands-10",
      "dealing",
      "partially_hidden",
      null,
      1,
      "Al deslizar las cartas hacia el centro, el Diez de Bastos quedó parcialmente tapado por el canto del Dos de Oros.",
      "Posible normalización del cansancio detrás de la habilidad para hacer malabares con la agenda.",
      isoOffset(-1, 18, 38),
      isoOffset(-1, 18, 39)
    );

    // Appointments
    const insertAppointment = db.prepare(
      `INSERT INTO appointments (
        id, user_id, consultant_id, title, scheduled_at, duration_minutes,
        modality, status, intention, prep_notes, linked_reading_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertAppointment.run(
      "appt-hoy-mariana",
      DEMO_USER_ID,
      "cons-mariana",
      "Revisión de primeros contratos y ritmo del taller",
      isoOffset(0, 16, 30),
      60,
      "in_person",
      "scheduled",
      "Contrastar la evolución de los primeros dos proyectos autónomos tras la lectura en cruz del mes pasado.",
      "Tener a mano las notas sobre El Emperador y Ocho de Oros de su sesión anterior.",
      null,
      isoOffset(-5, 11, 0),
      isoOffset(-2, 10, 0)
    );

    insertAppointment.run(
      "appt-manana-caminante",
      DEMO_USER_ID,
      "cons-bitacora-norte",
      "Lectura de instalación en nueva casa",
      isoOffset(1, 18, 0),
      45,
      "audio",
      "scheduled",
      "Explorar la disposición del espacio de escritura tras concretar el traslado.",
      "Preparar el Tarot de Marsella Restaurado.",
      null,
      isoOffset(-3, 12, 0),
      isoOffset(-3, 12, 0)
    );

    insertAppointment.run(
      "appt-proxima-semana-julian",
      DEMO_USER_ID,
      "cons-julian",
      "Cierre de lectura sobre licencia sabática",
      isoOffset(4, 11, 0),
      60,
      "in_person",
      "scheduled",
      "Retomar las conclusiones abiertas del borrador reciente y revisar plazos institucionales.",
      "Completar síntesis del borrador previo antes del encuentro.",
      "read-julian-borrador",
      isoOffset(-1, 19, 0),
      isoOffset(-1, 19, 0)
    );

    insertAppointment.run(
      "appt-pasada-mariana",
      DEMO_USER_ID,
      "cons-mariana",
      "Sesión tras disolución societaria",
      isoOffset(-12, 17, 0),
      60,
      "in_person",
      "completed",
      "Definir prioridades para abrir taller propio.",
      "",
      "read-mariana-estudio",
      isoOffset(-16, 10, 0),
      isoOffset(-12, 18, 20)
    );

    // Personal Grimorio entries & evolution history
    const insertCardEntry = db.prepare(
      `INSERT INTO card_entries (
        id, user_id, card_id, deck_id, custom_image_url, personal_meaning,
        reversed_meaning, symbols_associations, keywords_json, reflections, updated_at
      ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`
    );

    insertCardEntry.run(
      "ce-ermitano",
      DEMO_USER_ID,
      "major-09",
      "Decantación deliberada y criterio autónomo. En mi práctica rara vez anuncia soledad involuntaria; casi siempre señala la necesidad de bajar el volumen de opiniones externas para escuchar el propio oficio.",
      "Cuando aparece invertido o bloqueado en el corte, suele mostrar rumiación en círculos o temor a mostrar un trabajo que ya está maduro.",
      "La linterna hexagonal como foco acotado al paso presente; el bastón que tantea la piedra antes de apoyar el peso.",
      JSON.stringify(["sobriedad", "oficio silencioso", "foco cercano", "autonomía"]),
      "En el Marsella la mirada hacia atrás invita a dialogar con la experiencia acumulada antes de girar.",
      isoOffset(-6, 19, 30)
    );
    linkTag.run("tag-vocacion", "card_entry", "ce-ermitano");

    insertCardEntry.run(
      "ce-torre",
      DEMO_USER_ID,
      "major-16",
      "Desarme de una estructura que había quedado pequeña o rígida. Observo con frecuencia que cuando salta durante la mezcla habla de un alivio tras decir una verdad postergada.",
      "Resistir una mudanza necesaria o sostener una fachada agotadora por costumbre.",
      "La corona desplazada: caída de una autoimagen exigente más que pérdida real de sustento.",
      JSON.stringify(["desarme", "alivio veraz", "suelo limpio", "descompresión"]),
      "Evitar lenguaje catastrofista en mesa; preguntar siempre qué carga dejó de ser necesaria.",
      isoOffset(-12, 18, 10)
    );
    linkTag.run("tag-salto-limpio", "card_entry", "ce-torre");

    insertCardEntry.run(
      "ce-estrella",
      DEMO_USER_ID,
      "major-17",
      "Reconciliación con el ritmo natural después de una exigencia intensa. Hidratar tanto la tierra práctica (una jarra en el suelo) como la sensibilidad (una jarra en el estanque).",
      "Exigir certezas cerradas demasiado pronto tras una sacudida.",
      "Las dos jarras sin reserva: confianza en que el caudal se renueva al dar curso a la vocación.",
      JSON.stringify(["calma tras ruptura", "orientación", "sencillez", "agua viva"]),
      "Muy frecuente como carta de base del mazo al cerrar lecturas de duelo o mudanza.",
      isoOffset(-6, 19, 45)
    );
    linkTag.run("tag-base-espejo", "card_entry", "ce-estrella");

    insertCardEntry.run(
      "ce-ocho-oros",
      DEMO_USER_ID,
      "pentacles-08",
      "Arraigo a través de la práctica diaria y la repetición atenta. Remedio directo frente a la ansiedad especulativa.",
      "Perfeccionismo que posterga la entrega o trabajo mecánico desconectado del propósito.",
      "El banco de carpintero apartado del poblado: distancia justa para concentrarse sin aislarse.",
      JSON.stringify(["artesanía", "ritmo diario", "ancla corporal", "paciencia"]),
      "Excelente aliada cuando acompaña a Arcanos de reestructuración.",
      isoOffset(-12, 18, 0)
    );

    const insertLog = db.prepare(
      `INSERT INTO card_interpretation_logs (
        id, user_id, card_id, deck_id, reading_id, note_title, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertLog.run(
      "log-torre-1",
      DEMO_USER_ID,
      "major-16",
      "deck-rws-centennial",
      null,
      "Primer apunte de cuaderno: revisión del cliché de catástrofe",
      "Al iniciar este registro decidí observar cuándo La Torre describe crisis externas frente a alivios internos. En la mayoría de mis mesas señala el momento exacto en que cae una exigencia artificial.",
      isoOffset(-50, 11, 0)
    );
    insertLog.run(
      "log-torre-2",
      DEMO_USER_ID,
      "major-16",
      "deck-rws-centennial",
      "read-mariana-estudio",
      "Aprendizaje en mesa: salto limpio y posición de base",
      "Cuando La Torre salta en la mezcla y luego ocupa la base de la cruz, el derrumbe ya sucedió antes de la sesión y opera como terreno despejado para construir.",
      isoOffset(-12, 18, 10)
    );
    insertLog.run(
      "log-ermitano-1",
      DEMO_USER_ID,
      "major-09",
      "deck-marsella-camoin",
      "read-caminante-mudanza",
      "Aparición en el corte antes de mudanza creativa",
      "En Marsella el corte en El Ermitaño marcó la necesidad de resguardar horas de silencio matinal como criterio principal para elegir vivienda.",
      isoOffset(-6, 19, 30)
    );

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function resolveDatabasePath(): string {
  const envPath =
    process.env.GRIMORIO_DB_PATH?.trim() ||
    process.env.DATABASE_PATH?.trim();

  if (envPath) return envPath;

  // En Vercel / AWS Lambda o entornos serverless:
  // /var/task es de solo lectura. El único directorio con permisos de escritura es os.tmpdir() (/tmp).
  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION
  ) {
    return path.join(os.tmpdir(), "grimorio.db");
  }

  return "./data/grimorio.db";
}

export function createDatabaseInstance(
  targetPath: string,
  options?: { seedDemo?: boolean }
): DatabaseSync {
  let finalPath = targetPath;

  if (finalPath !== ":memory:") {
    const resolved = path.resolve(/*turbopackIgnore: true*/ finalPath);
    const dir = path.dirname(resolved);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      // Fallback a /tmp si el directorio es de solo lectura (como en Vercel Serverless)
      const tmpPath = path.join(os.tmpdir(), "grimorio.db");
      console.warn(
        `Aviso: No se pudo crear o acceder al directorio ${dir}. Usando fallback en ${tmpPath}.`,
        err
      );
      finalPath = tmpPath;
      const tmpDir = path.dirname(path.resolve(/*turbopackIgnore: true*/ tmpPath));
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    }
  }

  const db = new DatabaseSync(finalPath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (finalPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
  }

  db.exec(SCHEMA_SQL);
  migrateDatabaseSchema(db);
  syncCanonicalCatalog(db);
  syncBuiltinDecks(db);

  if (options?.seedDemo === true) {
    seedDemoWorkspaceIfMissing(db);
  } else if (finalPath !== ":memory:") {
    cleanupDemoDataFromDatabase(db);
  }

  return db;
}

const globalForDb = globalThis as unknown as {
  __grimorioDb?: DatabaseSync;
  __grimorioDbPath?: string;
  __grimorioDemoDb?: DatabaseSync;
};

export function getDemoDb(): DatabaseSync {
  if (!globalForDb.__grimorioDemoDb) {
    globalForDb.__grimorioDemoDb = createDatabaseInstance(":memory:", {
      seedDemo: true,
    });
  }
  return globalForDb.__grimorioDemoDb;
}

export function resetDemoDb(): void {
  if (globalForDb.__grimorioDemoDb) {
    try {
      globalForDb.__grimorioDemoDb.close();
    } catch {
      // ignore
    }
  }
  globalForDb.__grimorioDemoDb = createDatabaseInstance(":memory:", {
    seedDemo: true,
  });
}

export function getDb(userId?: string): DatabaseSync {
  if (userId === DEMO_USER_ID) {
    return getDemoDb();
  }

  const configuredPath = resolveDatabasePath();
  if (
    globalForDb.__grimorioDb &&
    globalForDb.__grimorioDbPath === configuredPath
  ) {
    return globalForDb.__grimorioDb;
  }

  const db = createDatabaseInstance(configuredPath, { seedDemo: false });
  globalForDb.__grimorioDb = db;
  globalForDb.__grimorioDbPath = configuredPath;
  return db;
}

export function getEnvironmentStatus(): {
  databasePath: string;
  hasCustomSessionSecret: boolean;
} {
  const databasePath = resolveDatabasePath();
  const secret =
    process.env.GRIMORIO_SESSION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "";
  return {
    databasePath,
    hasCustomSessionSecret:
      secret.length >= 32 &&
      secret !== "reemplazar-por-clave-secreta-de-al-menos-32-caracteres-en-produccion",
  };
}
