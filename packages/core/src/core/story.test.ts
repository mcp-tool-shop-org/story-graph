/**
 * Tests for Story class and serialization
 */

import { describe, it, expect } from 'vitest';
import { Story } from './story.js';
import { parseToStory, serializeStoryInstance } from './serializer.js';

describe('Story', () => {
  describe('create', () => {
    it('creates an empty story with title', () => {
      const story = Story.create('Test Story');
      expect(story.meta.title).toBe('Test Story');
      expect(story.nodeCount).toBe(0);
    });

    it('creates a story with author', () => {
      const story = Story.create('Test Story', 'Jane Doe');
      expect(story.meta.author).toBe('Jane Doe');
    });
  });

  describe('node operations', () => {
    it('adds and retrieves nodes', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'start',
        type: 'passage',
        start: true,
        content: 'Hello world',
      });

      expect(story.nodeCount).toBe(1);
      expect(story.hasNode('start')).toBe(true);

      const node = story.getNode('start');
      expect(node?.type).toBe('passage');
    });

    it('removes nodes', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'temp',
        type: 'passage',
        content: 'Temporary',
      });

      expect(story.hasNode('temp')).toBe(true);
      story.removeNode('temp');
      expect(story.hasNode('temp')).toBe(false);
    });

    it('gets nodes by type', () => {
      const story = Story.create('Test');

      story.setNode({ id: 'p1', type: 'passage', content: 'One' });
      story.setNode({ id: 'p2', type: 'passage', content: 'Two' });
      story.setNode({ id: 'c1', type: 'comment', content: 'Note' });

      const passages = story.getNodesByType('passage');
      expect(passages.length).toBe(2);

      const comments = story.getNodesByType('comment');
      expect(comments.length).toBe(1);
    });
  });

  describe('special nodes', () => {
    it('finds start node', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'not_start',
        type: 'passage',
        content: 'Not the start',
      });

      story.setNode({
        id: 'start',
        type: 'passage',
        start: true,
        content: 'The beginning',
      });

      const startNode = story.getStartNode();
      expect(startNode?.id).toBe('start');
    });

    it('finds ending nodes', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'middle',
        type: 'passage',
        content: 'Middle',
        choices: [{ text: 'Next', target: 'end' }],
      });

      story.setNode({
        id: 'end',
        type: 'passage',
        ending: true,
        content: 'The End',
      });

      story.setNode({
        id: 'dead_end',
        type: 'passage',
        content: 'No choices here',
      });

      const endings = story.getEndingNodes();
      expect(endings.length).toBe(2);
    });
  });

  describe('statistics', () => {
    it('counts words', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'p1',
        type: 'passage',
        content: 'One two three',
      });

      story.setNode({
        id: 'p2',
        type: 'passage',
        content: 'Four five',
      });

      expect(story.getWordCount()).toBe(5);
    });

    it('counts characters', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'p1',
        type: 'passage',
        content: 'Hello',
      });

      expect(story.getCharacterCount()).toBe(5);
    });

    it('counts choices', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'p1',
        type: 'passage',
        content: 'Content',
        choices: [
          { text: 'A', target: 'a' },
          { text: 'B', target: 'b' },
        ],
      });

      story.setNode({
        id: 'c1',
        type: 'choice',
        choices: [
          { text: 'C', target: 'c' },
        ],
      });

      expect(story.getChoiceCount()).toBe(3);
    });
  });

  describe('edges', () => {
    it('extracts edges from choices', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'start',
        type: 'passage',
        content: 'Start',
        choices: [
          { text: 'Go A', target: 'a' },
          { text: 'Go B', target: 'b' },
        ],
      });

      const edges = story.getEdges();
      expect(edges.length).toBe(2);
      expect(edges[0].source).toBe('start');
      expect(edges[0].type).toBe('choice');
    });

    it('extracts edges from conditions', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'check',
        type: 'condition',
        expression: 'has_key',
        ifTrue: 'open',
        ifFalse: 'locked',
      });

      const edges = story.getEdges();
      expect(edges.length).toBe(2);
      expect(edges.find(e => e.branch === 'true')?.target).toBe('open');
      expect(edges.find(e => e.branch === 'false')?.target).toBe('locked');
    });

    it('caches edges', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'p',
        type: 'passage',
        content: 'Content',
        choices: [{ text: 'Next', target: 'next' }],
      });

      const edges1 = story.getEdges();
      const edges2 = story.getEdges();

      // Same reference means caching works
      expect(edges1).toBe(edges2);
    });

    it('invalidates cache on mutation', () => {
      const story = Story.create('Test');

      story.setNode({
        id: 'p',
        type: 'passage',
        content: 'Content',
      });

      const edges1 = story.getEdges();

      story.setNode({
        id: 'p2',
        type: 'passage',
        content: 'More',
        choices: [{ text: 'Go', target: 'p' }],
      });

      const edges2 = story.getEdges();
      expect(edges1).not.toBe(edges2);
      expect(edges2.length).toBe(1);
    });
  });
});

describe('Serialization roundtrip', () => {
  it('preserves story through serialize/parse cycle', () => {
    const original = Story.create('Roundtrip Test', 'Test Author');

    original.setNode({
      id: 'start',
      type: 'passage',
      start: true,
      content: 'Beginning of the story.',
      choices: [
        { text: 'Continue', target: 'next' },
      ],
    });

    original.setNode({
      id: 'next',
      type: 'passage',
      ending: true,
      content: 'The end.',
    });

    // Serialize
    const yaml = serializeStoryInstance(original);

    // Parse back
    const restored = parseToStory(yaml);

    // Verify
    expect(restored.meta.title).toBe('Roundtrip Test');
    expect(restored.nodeCount).toBe(2);
    expect(restored.getStartNode()?.id).toBe('start');
    expect(restored.getEndingNodes().length).toBe(1);
  });
});
