import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteStoryStore } from './sqlite-story-store';
import Database from 'better-sqlite3';

const SIMPLE_STORY = `version: "1.0"
meta:
  title: Demo
nodes:
  start:
    type: passage
    id: start
    start: true
    content: Hello
`;

function withStore(testFn: (store: SQLiteStoryStore, dir: string) => void, options?: { busyTimeout?: number }): void {
  const dir = mkdtempSync(join(tmpdir(), 'storygraph-sqlite-'));
  const file = join(dir, 'store.db');
  const store = new SQLiteStoryStore(file, { maxVersions: 5, busyTimeout: options?.busyTimeout ?? 5000 });
  try {
    testFn(store, dir);
  } finally {
    store.close();
    // Small delay on Windows to ensure file handles are released
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in tests
    }
  }
}

describe('SQLiteStoryStore', () => {
  it('persists and retrieves records with version history', () => {
    withStore((store) => {
      const created = store.create(SIMPLE_STORY, 'Demo');
      expect(created.version).toBe(1);

      const loaded = store.get(created.id);
      expect(loaded?.title).toBe('Demo');
      expect(store.list().length).toBe(1);

      const updated = store.save(created.id, SIMPLE_STORY + '\n#next', created.latestVersionId);
      expect(updated.version).toBe(2);
      expect(updated.latestVersionId).not.toBe(created.latestVersionId);

      const versions = store.listVersions(created.id);
      expect(versions).toHaveLength(2);
      const v2 = store.getVersion(created.id, updated.latestVersionId);
      expect(v2?.version).toBe(2);
    });
  });

  it('enforces optimistic concurrency', () => {
    withStore((store) => {
      const created = store.create(SIMPLE_STORY, 'Demo');
      expect(() => store.save(created.id, SIMPLE_STORY + '\n# changed', 'wrong-version')).toThrowError(/Version conflict/);
    });
  });

  it('caps history to configured maxVersions', () => {
    withStore((store) => {
      const created = store.create(SIMPLE_STORY, 'Demo');
      let lastVersionId = created.latestVersionId;
      for (let i = 0; i < 12; i++) {
        const updated = store.save(created.id, SIMPLE_STORY + `\n# iteration ${i}`, lastVersionId);
        lastVersionId = updated.latestVersionId;
      }
      const history = store.listVersions(created.id);
      expect(history.length).toBeLessThanOrEqual(5);
      expect(history.at(-1)?.versionId).toBe(lastVersionId);
    });
  });

  it('surfaces database locked errors as service unavailable', () => {
    withStore((store, dir) => {
      const created = store.create(SIMPLE_STORY, 'Demo');
      const dbPath = join(dir, 'store.db');
      const other = new Database(dbPath, { timeout: 50 });
      try {
        other.prepare('BEGIN EXCLUSIVE').run();
        expect(() => store.save(created.id, SIMPLE_STORY + '\n# locked', created.latestVersionId)).toThrowError(/Database unavailable/);
        other.prepare('COMMIT').run();
      } finally {
        other.close();
      }
    }, { busyTimeout: 100 }); // Short timeout so test doesn't hang waiting for lock
  });

  it('persists idempotency keys and prunes expired entries', () => {
    const prev = process.env.STORYGRAPH_IDEMPOTENCY_TTL_MS;
    process.env.STORYGRAPH_IDEMPOTENCY_TTL_MS = '1';
    withStore((store) => {
      // Create a real story first so FK constraint is satisfied
      const story = store.create(SIMPLE_STORY, 'Demo');
      store.saveIdempotency('k1', { storyId: story.id, versionId: story.latestVersionId, requestHash: 'hash', requestId: 'req-1' });
      const hit = store.getIdempotency('k1');
      expect(hit?.requestHash).toBe('hash');
      // expire and ensure pruning removes record
      (store as any).db.prepare('UPDATE idempotency_keys SET createdAt = ? WHERE key = ?').run('2000-01-01T00:00:00.000Z', 'k1');
      const expired = store.getIdempotency('k1');
      expect(expired).toBeUndefined();
    });
    process.env.STORYGRAPH_IDEMPOTENCY_TTL_MS = prev;
  });
});
