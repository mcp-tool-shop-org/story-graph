import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseToStory, validateStory, Story } from './index.js';
import { exportTwine } from '../export/twine.js';

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

  it('exports Tier 0 Twine without warnings for core subset', () => {
    const story = Story.create('Twine Export Test');
    story.setNode({
      id: 'start',
      type: 'passage',
      start: true,
      content: 'Hello',
      choices: [{ text: 'Next', target: 'end' }],
    });
    story.setNode({
      id: 'end',
      type: 'passage',
      ending: true,
      content: 'Done',
    });

    const result = exportTwine(story, { tier: 0 });
    expect(result.files[0]?.name).toBe('story.twee');
    expect(result.files[0]?.contents).toContain(':: start');
    expect(result.warnings.length).toBe(0);
  });
});
