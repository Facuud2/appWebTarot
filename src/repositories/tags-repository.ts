import "server-only";

import { randomUUID } from "node:crypto";
import { getDb, type AppDatabase } from "@/server/db";
import type { Tag, TagCategory, TaggableEntityType } from "@/types/domain";

interface TagRow {
  id: string;
  user_id: string;
  name: string;
  category: TagCategory;
  created_at: string;
}

export function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function listUserTags(
  userId: string,
  category?: TagCategory,
  db: AppDatabase = getDb(userId)
): Promise<Tag[]> {
  const rows = category
    ? ((await db
        .prepare(
          `SELECT id, user_id, name, category, created_at
           FROM tags
           WHERE user_id = ? AND category = ?
           ORDER BY name COLLATE NOCASE ASC`
        )
        .all(userId, category)) as unknown as TagRow[])
    : ((await db
        .prepare(
          `SELECT id, user_id, name, category, created_at
           FROM tags
           WHERE user_id = ?
           ORDER BY name COLLATE NOCASE ASC`
        )
        .all(userId)) as unknown as TagRow[]);

  return rows.map(mapTagRow);
}

export async function getTagsForEntity(
  userId: string,
  entityType: TaggableEntityType,
  entityId: string,
  db: AppDatabase = getDb(userId)
): Promise<Tag[]> {
  const rows = (await db
    .prepare(
      `SELECT t.id, t.user_id, t.name, t.category, t.created_at
       FROM entity_tags et
       JOIN tags t ON t.id = et.tag_id
       WHERE t.user_id = ? AND et.entity_type = ? AND et.entity_id = ?
       ORDER BY t.name COLLATE NOCASE ASC`
    )
    .all(userId, entityType, entityId)) as unknown as TagRow[];

  return rows.map(mapTagRow);
}

export async function syncEntityTags(
  userId: string,
  entityType: TaggableEntityType,
  entityId: string,
  tagNames: string[],
  defaultCategory: TagCategory,
  db: AppDatabase = getDb(userId)
): Promise<Tag[]> {
  await db.prepare(
    `DELETE FROM entity_tags
     WHERE entity_type = ? AND entity_id = ?
       AND tag_id IN (SELECT id FROM tags WHERE user_id = ?)`
  ).run(entityType, entityId, userId);

  const uniqueCleaned = Array.from(
    new Map(
      tagNames
        .map((n) => n.trim().replace(/\s+/g, " "))
        .filter((n) => n.length > 0)
        .map((n) => [n.toLowerCase(), n])
    ).entries()
  );

  const nowIso = new Date().toISOString();
  const findTag = db.prepare(
    `SELECT id, user_id, name, category, created_at
     FROM tags WHERE user_id = ? AND normalized_name = ?`
  );
  const insertTag = db.prepare(
    `INSERT INTO tags (id, user_id, name, normalized_name, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertLink = db.prepare(
    `INSERT OR IGNORE INTO entity_tags (tag_id, entity_type, entity_id)
     VALUES (?, ?, ?)`
  );

  const result: Tag[] = [];
  for (const [normalized, display] of uniqueCleaned) {
    let existing = (await findTag.get(userId, normalized)) as TagRow | undefined;
    if (!existing) {
      const id = `tag-${randomUUID()}`;
      await insertTag.run(id, userId, display, normalized, defaultCategory, nowIso);
      existing = {
        id,
        user_id: userId,
        name: display,
        category: defaultCategory,
        created_at: nowIso,
      };
    }
    await insertLink.run(existing.id, entityType, entityId);
    result.push(mapTagRow(existing));
  }

  return result;
}
