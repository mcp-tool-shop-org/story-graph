import { describe, it, expect } from 'vitest';
import { parseToStory, validateStory } from './index.js';

function randomStory(seed: number): string {
  const nodes: string[] = [];
  const count = 5 + (seed % 5);
  for (let i = 0; i < count; i++) {
    const id = i === 0 ? 'start' : `n${seed}-${i}`;
    const next = i < count - 1 ? `n${seed}-${i + 1}` : undefined;
    nodes.push(
      [
        `  ${id}:`,
        '    type: passage',
        `    id: ${id}`,
        i === 0 ? '    start: true' : null,
        `    content: Node ${id}`,
        next ? '    choices:' : null,
        next ? `      - text: next ${i}` : null,
        next ? `        target: ${next}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return `version: "1.0"
meta:
  title: Fuzz ${seed}
nodes:
${nodes.join('\n')}`;
}

describe('fuzzer-lite', () => {
  it('parses and validates randomly generated stories without crashing', () => {
    for (let seed = 0; seed < 25; seed++) {
      const yaml = randomStory(seed);
      const story = parseToStory(yaml);
      const result = validateStory(story);
      expect(result.issues).toBeInstanceOf(Array);
    }
  });
});
