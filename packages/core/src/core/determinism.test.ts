import { describe, it, expect } from 'vitest';
import { parseToStory, serializeStoryInstance, validateStory, type Issue } from './index.js';

function validatorOrderComparator(a: Issue, b: Issue): number {
  const rank: Record<Issue['severity'], number> = { error: 0, warning: 1, info: 2 };
  const severityDelta = rank[a.severity] - rank[b.severity];
  if (severityDelta !== 0) return severityDelta;
  const codeDelta = a.code.localeCompare(b.code);
  if (codeDelta !== 0) return codeDelta;
  const nodeDelta = (a.nodeId ?? '').localeCompare(b.nodeId ?? '');
  if (nodeDelta !== 0) return nodeDelta;
  return a.message.localeCompare(b.message);
}

describe('determinism', () => {
  it('sorts validation issues deterministically', () => {
    const yaml = `version: "1.0"
meta:
  title: Demo
nodes:
  a:
    type: passage
    id: a
    content: A
    choices:
      - text: to missing
        target: missing
  c:
    type: passage
    id: c
    content: C
  b:
    type: passage
    id: b
    content: B
`;

    const story = parseToStory(yaml);
    const first = validateStory(story).issues;
    const second = validateStory(story).issues;

    const sorted = [...first].sort(validatorOrderComparator);
    expect(first).toEqual(sorted);
    expect(second).toEqual(sorted);
  });

  it('serializes nodes and edges in stable order', () => {
    const yaml = `version: "1.0"
meta:
  title: Demo
nodes:
  beta:
    type: passage
    id: beta
    content: B
    choices:
      - text: go alpha
        target: alpha
  alpha:
    type: passage
    id: alpha
    start: true
    content: A
`;

    const story = parseToStory(yaml);
    const first = serializeStoryInstance(story, { includeComments: true });
    const second = serializeStoryInstance(story, { includeComments: true });

    expect(first).toBe(second);
    expect(first.indexOf('alpha:')).toBeLessThan(first.indexOf('beta:'));
  });

  it('keeps validation output stable across runs', () => {
    const yaml = `version: "1.0"
meta:
  title: Demo
nodes:
  start:
    type: passage
    id: start
    start: true
    content: Start
    choices:
      - text: go
        target: mid
  mid:
    type: passage
    id: mid
    content: Middle
    choices:
      - text: end
        target: end
  end:
    type: passage
    id: end
    ending: true
    content: End
`;
    const story = parseToStory(yaml);
    const runOne = validateStory(story);
    const runTwo = validateStory(story);

    expect(runOne.valid).toBe(runTwo.valid);
    expect(runOne.counts).toEqual(runTwo.counts);
    expect(runOne.issues).toEqual(runTwo.issues);
  });

  it('handles a large story within a soft budget', () => {
    const nodes: string[] = [];
    for (let i = 0; i < 600; i++) {
      const id = i === 0 ? 'start' : `node_${i}`;
      const next = i === 599 ? undefined : `node_${i + 1}`;
      const lines = [
        `  ${id}:`,
        '    type: passage',
        `    id: ${id}`,
        i === 0 ? '    start: true' : null,
        `    content: Node ${i}`,
        next ? '    choices:' : null,
        next ? '      - text: next' : null,
        next ? `        target: ${next}` : null,
      ].filter(Boolean);
      nodes.push(lines.join('\n'));
    }

    const yaml = `version: "1.0"
meta:
  title: Large
nodes:
${nodes.join('\n')}`;

    const story = parseToStory(yaml);
    const start = performance.now();
    const result = validateStory(story);
    const duration = performance.now() - start;

    expect(result.valid).toBe(true);
    expect(duration).toBeLessThan(1200);
  });

  it('parses and validates medium stories within budget', () => {
    const nodes: string[] = [];
    for (let i = 0; i < 200; i++) {
      const id = i === 0 ? 'start' : `n${i}`;
      const next = i === 199 ? undefined : `n${i + 1}`;
      nodes.push(
        [
          `  ${id}:`,
          '    type: passage',
          `    id: ${id}`,
          i === 0 ? '    start: true' : null,
          `    content: Node ${i}`,
          next ? '    choices:' : null,
          next ? '      - text: next' : null,
          next ? `        target: ${next}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      );
    }

    const yaml = `version: "1.0"
meta:
  title: Budget
nodes:
${nodes.join('\n')}`;

    const start = performance.now();
    const story = parseToStory(yaml);
    const result = validateStory(story);
    const duration = performance.now() - start;

    expect(result.valid).toBe(true);
    expect(duration).toBeLessThan(400);
  });
});
