import { parseToStory, validateStory, type Issue } from '@storygraph/core';

export interface StoryRecord {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StoryVersion {
  version: number;
  content: string;
  createdAt: string;
}

class StoryStore {
  private stories = new Map<string, StoryRecord>();
  private versions = new Map<string, StoryVersion[]>();

  list(): StoryRecord[] {
    return Array.from(this.stories.values());
  }

  get(id: string): StoryRecord | undefined {
    return this.stories.get(id);
  }

  create(content: string, title?: string): StoryRecord {
    const story = parseToStory(content);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: StoryRecord = {
      id,
      title: title ?? story.meta.title ?? 'Untitled Story',
      content,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.stories.set(id, record);
    this.versions.set(id, [{ version: 1, content, createdAt: now }]);
    return record;
  }

  save(id: string, content: string): StoryRecord {
    const existing = this.stories.get(id);
    if (!existing) {
      throw new Error('Story not found');
    }
    parseToStory(content); // validates structure
    const now = new Date().toISOString();
    const nextVersion = existing.version + 1;
    const updated: StoryRecord = {
      ...existing,
      content,
      updatedAt: now,
      version: nextVersion,
    };
    this.stories.set(id, updated);
    const history = this.versions.get(id) ?? [];
    history.push({ version: nextVersion, content, createdAt: now });
    this.versions.set(id, history);
    return updated;
  }

  validate(content: string): { valid: boolean; issues: Issue[] } {
    const story = parseToStory(content);
    const result = validateStory(story);
    return { valid: result.valid, issues: result.issues };
  }
}

export const storyStore = new StoryStore();
