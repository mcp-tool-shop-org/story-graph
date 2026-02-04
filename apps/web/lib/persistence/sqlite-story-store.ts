import Database from 'better-sqlite3';
import { parseToStory, validateStory } from '@storygraph/core';
import type { StoryRecord, StoryStore, StoryVersion } from '../storage';
import { enforceLimits } from './limits';

type Migration = { version: number; up: string };

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        appliedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        version INTEGER NOT NULL,
        latestVersionId TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS versions (
        versionId TEXT PRIMARY KEY,
        storyId TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (storyId) REFERENCES stories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        storyId TEXT NOT NULL,
        versionId TEXT NOT NULL,
        requestHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (storyId) REFERENCES stories(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 2,
    up: `
      CREATE INDEX IF NOT EXISTS idx_versions_story ON versions(storyId, version DESC);
      CREATE INDEX IF NOT EXISTS idx_idempotency_story ON idempotency_keys(storyId, createdAt DESC);
      ALTER TABLE idempotency_keys ADD COLUMN requestId TEXT;
    `,
  },
];

export class SQLiteStoryStore implements StoryStore {
  private db: Database.Database;
  private maxVersions: number;
  private idempotencyTtlMs: number;

  constructor(filename: string, options?: { maxVersions?: number }) {
    this.db = new Database(filename);
    this.maxVersions = options?.maxVersions ?? 50;
    this.idempotencyTtlMs = Number(process.env.STORYGRAPH_IDEMPOTENCY_TTL_MS ?? 10 * 60 * 1000);
    this.configurePragmas();
    this.migrate();
  }

  private configurePragmas(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
  }

  private migrate(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL);`);
    const row = this.db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
    const current = row?.version ?? 0;
    const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
    if (pending.length === 0) return;
    const insert = this.db.prepare('INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)');
    const tx = this.db.transaction(() => {
      for (const migration of pending) {
        this.db.exec(migration.up);
        insert.run(migration.version, new Date().toISOString());
      }
    });
    tx();
  }

  list(): StoryRecord[] {
    const rows = this.db.prepare('SELECT * FROM stories ORDER BY createdAt ASC').all();
    return rows.map((r) => ({ ...r }));
  }

  get(id: string): StoryRecord | undefined {
    const row = this.db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
    return row ? { ...row } : undefined;
  }

  create(content: string, title?: string): StoryRecord {
    try {
      const story = parseToStory(content);
      enforceLimits(content, Object.keys(story.nodes).length);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const versionId = crypto.randomUUID();
      const record: StoryRecord = {
        id,
        title: title ?? story.meta.title ?? 'Untitled Story',
        content,
        createdAt: now,
        updatedAt: now,
        version: 1,
        latestVersionId: versionId,
      };

      const insertStory = this.db.prepare(`
        INSERT INTO stories (id, title, content, createdAt, updatedAt, version, latestVersionId)
        VALUES (@id, @title, @content, @createdAt, @updatedAt, @version, @latestVersionId)
      `);
      const insertVersion = this.db.prepare(`
        INSERT INTO versions (versionId, storyId, version, content, createdAt)
        VALUES (@versionId, @storyId, @version, @content, @createdAt)
      `);

      const tx = this.db.transaction(() => {
        insertStory.run(record);
        insertVersion.run({
          versionId,
          storyId: id,
          version: 1,
          content,
          createdAt: now,
        });
      });

      tx();
      return record;
    } catch (err) {
      throw this.mapSqlError(err);
    }
  }

  save(id: string, content: string, expectedVersionId?: string): StoryRecord {
    try {
      const existing = this.get(id);
      if (!existing) {
        throw new Error('Story not found');
      }
      if (expectedVersionId && existing.latestVersionId !== expectedVersionId) {
        const err = new Error('Version conflict');
        err.name = 'ConflictError';
        throw err;
      }
      const story = parseToStory(content);
      enforceLimits(content, Object.keys(story.nodes).length);
      const now = new Date().toISOString();
      const nextVersion = existing.version + 1;
      const versionId = crypto.randomUUID();

      const updateStory = this.db.prepare(`
        UPDATE stories
        SET content = @content, updatedAt = @updatedAt, version = @version, latestVersionId = @latestVersionId
        WHERE id = @id
      `);
      const insertVersion = this.db.prepare(`
        INSERT INTO versions (versionId, storyId, version, content, createdAt)
        VALUES (@versionId, @storyId, @version, @content, @createdAt)
      `);
      const trimVersions = this.db.prepare(`
        DELETE FROM versions WHERE storyId = @storyId AND versionId NOT IN (
          SELECT versionId FROM versions WHERE storyId = @storyId ORDER BY version DESC LIMIT @limit
        )
      `);

      const tx = this.db.transaction(() => {
        updateStory.run({
          id,
          content,
          updatedAt: now,
          version: nextVersion,
          latestVersionId: versionId,
        });
        insertVersion.run({
          versionId,
          storyId: id,
          version: nextVersion,
          content,
          createdAt: now,
        });
        trimVersions.run({ storyId: id, limit: this.maxVersions });
      });

      tx();
      return {
        ...existing,
        content,
        updatedAt: now,
        version: nextVersion,
        latestVersionId: versionId,
      };
    } catch (err) {
      throw this.mapSqlError(err);
    }
  }

  listVersions(id: string): StoryVersion[] {
    const rows = this.db
      .prepare('SELECT versionId, version, content, createdAt FROM versions WHERE storyId = ? ORDER BY version ASC')
      .all(id);
    return rows.map((r) => ({ ...r }));
  }

  getVersion(id: string, versionId: string): StoryVersion | undefined {
    const row = this.db
      .prepare('SELECT versionId, version, content, createdAt FROM versions WHERE storyId = ? AND versionId = ?')
      .get(id, versionId);
    return row ? { ...row } : undefined;
  }

  validate(content: string): { valid: boolean; issues: ReturnType<typeof validateStory>['issues'] } {
    const story = parseToStory(content);
    const result = validateStory(story);
    return { valid: result.valid, issues: result.issues };
  }

  health(): { ok: boolean; reason?: string } {
    try {
      this.db.prepare('SELECT 1').get();
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }

  getIdempotency(key: string): { storyId: string; versionId: string; requestHash: string; createdAt: string; requestId?: string } | undefined {
    const row = this.db
      .prepare('SELECT storyId, versionId, requestHash, createdAt, requestId FROM idempotency_keys WHERE key = ?')
      .get(key) as { storyId: string; versionId: string; requestHash: string; createdAt: string; requestId?: string } | undefined;
    if (!row) return undefined;
    const expired = Date.now() - new Date(row.createdAt).getTime() > this.idempotencyTtlMs;
    if (expired) {
      this.deleteIdempotency(key);
      return undefined;
    }
    return row;
  }

  saveIdempotency(key: string, payload: { storyId: string; versionId: string; requestHash: string; requestId?: string }): void {
    const insert = this.db.prepare(
      `INSERT INTO idempotency_keys (key, storyId, versionId, requestHash, createdAt, requestId)
       VALUES (@key, @storyId, @versionId, @requestHash, @createdAt, @requestId)
       ON CONFLICT(key) DO UPDATE SET storyId = excluded.storyId, versionId = excluded.versionId, requestHash = excluded.requestHash, createdAt = excluded.createdAt, requestId = excluded.requestId`
    );
    const tx = this.db.transaction(() => {
      insert.run({ key, createdAt: new Date().toISOString(), ...payload });
      this.pruneIdempotency();
    });
    tx();
  }

  private pruneIdempotency(): void {
    const cutoff = new Date(Date.now() - this.idempotencyTtlMs).toISOString();
    this.db.prepare('DELETE FROM idempotency_keys WHERE createdAt < ?').run(cutoff);
  }

  private deleteIdempotency(key: string): void {
    this.db.prepare('DELETE FROM idempotency_keys WHERE key = ?').run(key);
  }

  private mapSqlError(err: unknown): Error {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code?: string }).code;
      if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
        const e = new Error('Database unavailable');
        e.name = 'DatabaseUnavailableError';
        return e;
      }
    }
    return err as Error;
  }
}
