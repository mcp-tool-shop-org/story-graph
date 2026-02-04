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

export interface StoryStore {
  list(): StoryRecord[];
  get(id: string): StoryRecord | undefined;
  create(content: string, title?: string): StoryRecord;
  save(id: string, content: string, expectedVersionId?: string): StoryRecord;
  delete(id: string): boolean;
  listVersions(id: string): StoryVersion[];
  getVersion(id: string, versionId: string): StoryVersion | undefined;
  validate(content: string): { valid: boolean; issues: Issue[] };
  health(): { ok: boolean; reason?: string };
}
