import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = "./data/grimorio.db";
const outputPath = "./turso-schema.sql";

if (!fs.existsSync(dbPath)) {
  console.error("Error: no se encontró la base de datos en", dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

function escapeSqlString(str) {
  if (str === null || str === undefined) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const lines = [];

lines.push("-- ============================================================================");
lines.push("-- GRIMORIO TAROT - ESQUEMA Y SEMILLAS CANÓNICAS PARA TURSO (LIBSQL)");
lines.push("-- Generado automáticamente para despliegue en la nube");
lines.push("-- ============================================================================");
lines.push("");
lines.push("PRAGMA foreign_keys = ON;");
lines.push("");

// 1. Export tables
const tables = db
  .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all();

lines.push("-- ----------------------------------------------------------------------------");
lines.push("-- 1. TABLAS DEL SISTEMA");
lines.push("-- ----------------------------------------------------------------------------");

for (const t of tables) {
  lines.push(`-- Tabla: ${t.name}`);
  // Ensure CREATE TABLE IF NOT EXISTS
  let sql = t.sql.trim();
  if (!sql.includes("IF NOT EXISTS")) {
    sql = sql.replace(/^CREATE TABLE\s+/i, "CREATE TABLE IF NOT EXISTS ");
  }
  lines.push(`${sql};`);
  lines.push("");
}

// 2. Export indexes
const indexes = db
  .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY name")
  .all();

lines.push("-- ----------------------------------------------------------------------------");
lines.push("-- 2. ÍNDICES DE RENDIMIENTO");
lines.push("-- ----------------------------------------------------------------------------");

for (const idx of indexes) {
  let sql = idx.sql.trim();
  if (!sql.includes("IF NOT EXISTS")) {
    sql = sql.replace(/^CREATE INDEX\s+/i, "CREATE INDEX IF NOT EXISTS ");
  }
  lines.push(`${sql};`);
}
lines.push("");

// 3. Export canonical tarot cards catalog
lines.push("-- ----------------------------------------------------------------------------");
lines.push("-- 3. CATÁLOGO CANÓNICO DE CARTAS (318 CARTAS MULTI-TRADICIÓN)");
lines.push("-- ----------------------------------------------------------------------------");

const cards = db.prepare("SELECT * FROM cards_catalog ORDER BY deck_tradition, rank_number, slug").all();

for (const c of cards) {
  lines.push(
    `INSERT OR IGNORE INTO cards_catalog (` +
      `id, slug, arcana, suit, rank_number, roman_numeral, canonical_name, name_en, ` +
      `deck_tradition, search_keywords_json, traditional_upright, traditional_reversed, ` +
      `traditional_keywords_json, archetype_note` +
    `) VALUES (` +
      [
        escapeSqlString(c.id),
        escapeSqlString(c.slug),
        escapeSqlString(c.arcana),
        escapeSqlString(c.suit),
        c.rank_number,
        escapeSqlString(c.roman_numeral),
        escapeSqlString(c.canonical_name),
        escapeSqlString(c.name_en),
        escapeSqlString(c.deck_tradition),
        escapeSqlString(c.search_keywords_json),
        escapeSqlString(c.traditional_upright),
        escapeSqlString(c.traditional_reversed),
        escapeSqlString(c.traditional_keywords_json),
        escapeSqlString(c.archetype_note),
      ].join(", ") +
    `);`
  );
}
lines.push("");

// 4. Export builtin spreads
lines.push("-- ----------------------------------------------------------------------------");
lines.push("-- 4. ESTRUCTURAS Y TIRADAS CANÓNICAS INCORPORADAS");
lines.push("-- ----------------------------------------------------------------------------");

const spreads = db.prepare("SELECT * FROM spread_templates WHERE is_builtin = 1 ORDER BY name").all();

for (const s of spreads) {
  lines.push(
    `INSERT OR IGNORE INTO spread_templates (` +
      `id, user_id, name, category, description, positions_json, is_builtin, created_at` +
    `) VALUES (` +
      [
        escapeSqlString(s.id),
        escapeSqlString(s.user_id),
        escapeSqlString(s.name),
        escapeSqlString(s.category),
        escapeSqlString(s.description),
        escapeSqlString(s.positions_json),
        s.is_builtin ? 1 : 0,
        escapeSqlString(s.created_at),
      ].join(", ") +
    `);`
  );
}
lines.push("");

fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
console.log(`Esquema exportado exitosamente a ${outputPath} (${lines.length} líneas)`);
