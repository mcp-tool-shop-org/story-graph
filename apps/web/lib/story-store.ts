import { parseToStory, validateStory } from '@storygraph/core';
import type {
  StoryStore,
  StoryRecord,
  StoryVersion,
  StorySearchOptions,
  StorySearchResult,
} from './storage';
import { SQLiteStoryStore } from './persistence/sqlite-story-store';
import { enforceLimits } from './persistence/limits';

const MAX_VERSIONS = 50;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

class InMemoryStoryStore implements StoryStore {
  private stories = new Map<string, StoryRecord>();
  private versions = new Map<string, StoryVersion[]>();

  list(): StoryRecord[] {
    return Array.from(this.stories.values());
  }

  search(options: StorySearchOptions = {}): StorySearchResult {
    let results = Array.from(this.stories.values());

    // Filter by query (title search, case-insensitive)
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter((s) => s.title.toLowerCase().includes(query));
    }

    // Sort
    const sort = options.sort ?? '-updatedAt';
    results.sort((a, b) => {
      switch (sort) {
        case 'createdAt':
          return a.createdAt.localeCompare(b.createdAt);
        case '-createdAt':
          return b.createdAt.localeCompare(a.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case '-title':
          return b.title.localeCompare(a.title);
        case 'updatedAt':
          return a.updatedAt.localeCompare(b.updatedAt);
        case '-updatedAt':
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

    const total = results.length;
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = options.offset ?? 0;

    // Paginate
    results = results.slice(offset, offset + limit);

    return { stories: results, total, limit, offset };
  }

  get(id: string): StoryRecord | undefined {
    return this.stories.get(id);
  }

  create(content: string, title?: string): StoryRecord {
    const story = parseToStory(content);
    enforceLimits(content, story.nodeCount);
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
    this.stories.set(id, record);
    this.versions.set(id, [{ version: 1, versionId, content, createdAt: now }]);
    return record;
  }

  save(id: string, content: string, expectedVersionId?: string): StoryRecord {
    const existing = this.stories.get(id);
    if (!existing) {
      throw new Error('Story not found');
    }
    if (expectedVersionId && existing.latestVersionId !== expectedVersionId) {
      const err = new Error('Version conflict');
      err.name = 'ConflictError';
      throw err;
    }
    const parsed = parseToStory(content); // validates structure
    enforceLimits(content, parsed.nodeCount);
    const now = new Date().toISOString();
    const nextVersion = existing.version + 1;
    const versionId = crypto.randomUUID();
    const updated: StoryRecord = {
      ...existing,
      content,
      updatedAt: now,
      version: nextVersion,
      latestVersionId: versionId,
    };
    this.stories.set(id, updated);
    const history = this.versions.get(id) ?? [];
    history.push({ version: nextVersion, versionId, content, createdAt: now });
    if (history.length > MAX_VERSIONS) {
      history.splice(0, history.length - MAX_VERSIONS);
    }
    this.versions.set(id, history);
    return updated;
  }

  delete(id: string): boolean {
    const existed = this.stories.has(id);
    if (existed) {
      this.stories.delete(id);
      this.versions.delete(id);
    }
    return existed;
  }

  listVersions(id: string): StoryVersion[] {
    return this.versions.get(id) ?? [];
  }

  getVersion(id: string, versionId: string): StoryVersion | undefined {
    return (this.versions.get(id) ?? []).find((v) => v.versionId === versionId);
  }

  validate(content: string): {
    valid: boolean;
    issues: ReturnType<typeof validateStory>['issues'];
  } {
    const story = parseToStory(content);
    const result = validateStory(story);
    return { valid: result.valid, issues: result.issues };
  }

  health(): { ok: boolean; reason?: string } {
    return { ok: true };
  }
}

export const storyStore = new InMemoryStoryStore();
export { InMemoryStoryStore };

export function createStoryStore(): StoryStore {
  if (process.env.STORYGRAPH_STORE === 'sqlite') {
    const dbPath = process.env.STORYGRAPH_SQLITE_PATH ?? ':memory:';
    return new SQLiteStoryStore(dbPath, { maxVersions: MAX_VERSIONS });
  }
  return new InMemoryStoryStore();
}

export const activeStoryStore = createStoryStore();
