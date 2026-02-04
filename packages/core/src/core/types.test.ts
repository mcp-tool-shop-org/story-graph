/**
 * Tests for core types
 */

import { describe, it, expect } from 'vitest';
import {
  NodeIdSchema,
  VariableNameSchema,
  StoryMetaSchema,
  PositionSchema,
} from './types.js';

describe('NodeIdSchema', () => {
  it('accepts valid node IDs', () => {
    expect(NodeIdSchema.safeParse('start').success).toBe(true);
    expect(NodeIdSchema.safeParse('my_node').success).toBe(true);
    expect(NodeIdSchema.safeParse('node123').success).toBe(true);
    expect(NodeIdSchema.safeParse('a').success).toBe(true);
  });

  it('rejects invalid node IDs', () => {
    expect(NodeIdSchema.safeParse('').success).toBe(false);
    expect(NodeIdSchema.safeParse('123start').success).toBe(false);
    expect(NodeIdSchema.safeParse('_underscore').success).toBe(false);
    expect(NodeIdSchema.safeParse('UPPERCASE').success).toBe(false);
    expect(NodeIdSchema.safeParse('has-dash').success).toBe(false);
    expect(NodeIdSchema.safeParse('has space').success).toBe(false);
  });

  it('enforces max length', () => {
    const longId = 'a'.repeat(64);
    expect(NodeIdSchema.safeParse(longId).success).toBe(true);

    const tooLong = 'a'.repeat(65);
    expect(NodeIdSchema.safeParse(tooLong).success).toBe(false);
  });
});

describe('VariableNameSchema', () => {
  it('accepts valid variable names', () => {
    expect(VariableNameSchema.safeParse('score').success).toBe(true);
    expect(VariableNameSchema.safeParse('has_key').success).toBe(true);
    expect(VariableNameSchema.safeParse('item1').success).toBe(true);
  });

  it('rejects invalid variable names', () => {
    expect(VariableNameSchema.safeParse('').success).toBe(false);
    expect(VariableNameSchema.safeParse('1var').success).toBe(false);
    expect(VariableNameSchema.safeParse('VAR').success).toBe(false);
  });
});

describe('StoryMetaSchema', () => {
  it('accepts valid metadata', () => {
    const result = StoryMetaSchema.safeParse({
      title: 'My Story',
      author: 'Jane Doe',
    });
    expect(result.success).toBe(true);
  });

  it('requires title', () => {
    const result = StoryMetaSchema.safeParse({
      author: 'Jane Doe',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = StoryMetaSchema.safeParse({
      title: 'Complete Story',
      author: 'Jane Doe',
      version: '1.0.0',
      description: 'A complete story with all metadata',
      created: '2026-02-02T00:00:00.000Z',
      modified: '2026-02-02T12:00:00.000Z',
      rating: 'teen',
      language: 'en-US',
      tags: ['adventure', 'mystery'],
    });
    expect(result.success).toBe(true);
  });

  it('validates rating enum', () => {
    expect(StoryMetaSchema.safeParse({ title: 'T', rating: 'everyone' }).success).toBe(true);
    expect(StoryMetaSchema.safeParse({ title: 'T', rating: 'invalid' }).success).toBe(false);
  });

  it('validates language format', () => {
    expect(StoryMetaSchema.safeParse({ title: 'T', language: 'en' }).success).toBe(true);
    expect(StoryMetaSchema.safeParse({ title: 'T', language: 'en-US' }).success).toBe(true);
    expect(StoryMetaSchema.safeParse({ title: 'T', language: 'english' }).success).toBe(false);
  });
});

describe('PositionSchema', () => {
  it('accepts valid positions', () => {
    expect(PositionSchema.safeParse({ x: 0, y: 0 }).success).toBe(true);
    expect(PositionSchema.safeParse({ x: 100, y: -50 }).success).toBe(true);
    expect(PositionSchema.safeParse({ x: 1.5, y: 2.5 }).success).toBe(true);
  });

  it('rejects invalid positions', () => {
    expect(PositionSchema.safeParse({ x: 'a', y: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({ x: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({ x: Infinity, y: 0 }).success).toBe(false);
  });
});
