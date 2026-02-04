import type { Issue } from '@storygraph/core';

export interface StoryRecord {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  latestVersionId: string;
}

export interface StoryVersion {
  versionId: string;
  version: number;
  content: string;
  createdAt: string;
}

export interface StorySearchOptions {
  /** Search query to match against title */
  query?: string;
  /** Maximum number of results to return (default: 100) */
  limit?: number;
  /** Number of results to skip for pagination */
  offset?: number;
  /** Sort order: 'createdAt' (oldest first), '-createdAt' (newest first), 'title', '-title', 'updatedAt', '-updatedAt' */
  sort?: 'createdAt' | '-createdAt' | 'title' | '-title' | 'updatedAt' | '-updatedAt';
}

export interface StorySearchResult {
  stories: StoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface StoryStore {
  list(): StoryRecord[];
  search(options?: StorySearchOptions): StorySearchResult;
  get(id: string): StoryRecord | undefined;
  create(content: string, title?: string): StoryRecord;
  save(id: string, content: string, expectedVersionId?: string): StoryRecord;
  delete(id: string): boolean;
  listVersions(id: string): StoryVersion[];
  getVersion(id: string, versionId: string): StoryVersion | undefined;
  validate(content: string): { valid: boolean; issues: Issue[] };
  health(): { ok: boolean; reason?: string };
}
