import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseToStory, validateStory, Story } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../../../examples', name), 'utf-8');
}

describe('integration: golden stories', () => {
  it('parses, validates, and re-validates demo.story', () => {
    const yaml = loadFixture('demo.story');
    const story = parseToStory(yaml);
    const result = validateStory(story);
    expect(result.valid).toBe(true);
    const serialized = story.toDocument();
    const roundTrip = validateStory(Story.fromDocument(serialized));
    expect(roundTrip.valid).toBe(true);
  });
});
