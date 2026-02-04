import { describe, it, expect } from 'vitest';
import { InMemoryStoryStore } from './story-store';

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

describe('InMemoryStoryStore', () => {
  it('trims history when exceeding cap and keeps latestVersionId', () => {
    const store = new InMemoryStoryStore();
    const created = store.create(SIMPLE_STORY, 'Demo');

    let lastVersionId = created.latestVersionId;
    for (let i = 0; i < 60; i++) {
      const updated = store.save(created.id, SIMPLE_STORY + `#${i}`);
      lastVersionId = updated.latestVersionId;
    }

    const history = store.listVersions(created.id);
    expect(history.length).toBeLessThanOrEqual(50);
    expect(history.at(-1)?.versionId).toBe(lastVersionId);
    expect(history.at(-1)?.version).toBe(created.version + 60);
    expect(history[0].version).toBeGreaterThan(1);
  });

  it('finds specific versions by id', () => {
    const store = new InMemoryStoryStore();
    const created = store.create(SIMPLE_STORY, 'Demo');
    const saved = store.save(created.id, SIMPLE_STORY + '#next');

    const versions = store.listVersions(created.id);
    const target = store.getVersion(created.id, saved.latestVersionId);

    expect(target?.versionId).toBe(saved.latestVersionId);
    expect(versions.some((v) => v.versionId === saved.latestVersionId)).toBe(true);
  });

  it('rejects stale writes via expectedVersionId', () => {
    const store = new InMemoryStoryStore();
    const created = store.create(SIMPLE_STORY, 'Demo');
    expect(() => store.save(created.id, SIMPLE_STORY + '#stale', 'wrong')).toThrowError(/Version conflict/);
  });
});
