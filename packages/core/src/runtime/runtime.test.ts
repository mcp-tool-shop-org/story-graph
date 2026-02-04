import { describe, it, expect } from 'vitest';
import { parseToStory } from '../core/serializer.js';
import {
  createRuntime,
  start,
  choose,
  saveGame,
  loadGame,
  serializeSaveData,
  deserializeSaveData,
} from './runtime.js';

const BASE_STORY = `version: "1.0"
meta:
  title: Demo
variables:
  coins: 1
nodes:
  start:
    type: passage
    id: start
    start: true
    content: You wake up.
    choices:
      - text: Take path A
        target: a
      - text: Take path B
        target: b
  a:
    type: passage
    id: a
    content: A path
    ending: true
  b:
    type: passage
    id: b
    content: B path
    ending: true
`;

describe('runtime basic traversal', () => {
  it('starts at entry and surfaces choices', () => {
    const rt = createRuntime(parseToStory(BASE_STORY));
    const result = start(rt);
    expect(result.error).toBeUndefined();
    const frame = result.frame!;
    expect(frame.nodeId).toBe('start');
    expect(frame.choices.length).toBe(2);
    expect(frame.variables.coins).toBe(1);
  });

  it('advances via choose', () => {
    const rt = createRuntime(parseToStory(BASE_STORY));
    const startFrame = start(rt).frame!;
    const next = choose(rt, startFrame.choices[0].target);
    expect(next.frame?.nodeId).toBe('a');
    expect(next.frame?.ending).toBe(true);
  });
});

const CONDITIONS_STORY = `version: "1.0"
meta:
  title: Conditional
variables:
  flag: true
nodes:
  start:
    type: passage
    id: start
    start: true
    content: Root
    choices:
      - text: Visible when flag
        target: end
        condition: flag === true
      - text: Hidden when not flag
        target: end
        condition: flag === false
  end:
    type: passage
    id: end
    content: End
    ending: true
`;

describe('runtime choice gating', () => {
  it('hides choices when condition false', () => {
    const rt = createRuntime(parseToStory(CONDITIONS_STORY));
    const frame = start(rt).frame!;
    expect(frame.choices.length).toBe(1);
    expect(frame.choices[0].text).toMatch(/Visible/);
  });
});

const VARIABLE_STORY = `version: "1.0"
meta:
  title: Vars
variables:
  score: 0
nodes:
  start:
    type: passage
    id: start
    start: true
    content: Starting
    choices:
      - text: Go
        target: set_vars
  set_vars:
    type: variable
    id: set_vars
    set:
      score: 1
    increment:
      score: 2
    next: pass
  pass:
    type: passage
    id: pass
    content: Done
    ending: true
`;

describe('runtime variable operations', () => {
  it('applies set/increment order', () => {
    const rt = createRuntime(parseToStory(VARIABLE_STORY));
    start(rt);
    const frame = choose(rt, 'set_vars').frame!;
    expect(frame.variables.score).toBe(3);
    expect(frame.nodeId).toBe('pass');
  });
});

const LOOP_STORY = `version: "1.0"
meta:
  title: Loop
nodes:
  start:
    type: passage
    id: start
    start: true
    content: loop
    choices:
      - text: loop
        target: start
`;

describe('runtime safety', () => {
  it('halts on repeat limit', () => {
    const rt = createRuntime(parseToStory(LOOP_STORY), { maxRepeats: 3 });
    start(rt);
    // After start(), visited[start] = 1
    // First choose -> visited[start] = 2
    // Second choose -> visited[start] = 3
    // Third choose -> visited[start] = 4 > maxRepeats, should error
    choose(rt, 'start'); // visit 2
    choose(rt, 'start'); // visit 3
    const res = choose(rt, 'start'); // visit 4 - should exceed limit
    expect(res.error?.code).toBe('RT010_STEP_LIMIT');
  });
});

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function randomStory(seed: number, nodes = 12): string {
  const rand = makeRng(seed);
  const parts = ['version: "1.0"', 'meta:', '  title: Fuzz', 'nodes:'];
  for (let i = 0; i < nodes; i++) {
    const id = `n${i}`;
    const ending = i === nodes - 1 || rand() < 0.2;
    const targets: string[] = [];
    if (!ending) {
      const fanout = rand() < 0.3 ? 2 : 1;
      for (let c = 0; c < fanout; c++) {
        const targetIndex = Math.min(
          nodes - 1,
          i + 1 + Math.floor(rand() * Math.max(1, nodes - i - 1))
        );
        targets.push(`n${targetIndex}`);
      }
    }
    parts.push(`  ${id}:`);
    parts.push('    type: passage');
    parts.push(`    id: ${id}`);
    if (i === 0) parts.push('    start: true');
    parts.push('    content: lorem');
    if (ending) {
      parts.push('    ending: true');
    } else {
      parts.push('    choices:');
      targets.forEach((t, idx) => {
        parts.push(`      - text: go-${idx}`);
        parts.push(`        target: ${t}`);
      });
    }
  }
  return parts.join('\n');
}

describe('runtime fuzz traversal', () => {
  it('does not error on random forward graphs', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const story = randomStory(seed, 8);
      const rt = createRuntime(parseToStory(story), { maxAutoSteps: 200 });
      const startFrame = start(rt).frame!;
      let frame = startFrame;
      for (let i = 0; i < 50 && !frame.ending; i++) {
        const choice = frame.choices.at(0);
        expect(choice).toBeDefined();
        const next = choose(rt, choice!.target);
        expect(next.error).toBeUndefined();
        frame = next.frame!;
      }
      expect(frame).toBeDefined();
    }
  });
});

// =============================================================================
// Save/Load Game Tests
// =============================================================================

const SAVE_STORY = `version: "1.0"
meta:
  title: Save Test Story
variables:
  health: 100
  inventory: 0
nodes:
  start:
    type: passage
    id: start
    start: true
    content: You are in a dark room.
    choices:
      - text: Go north
        target: north
      - text: Go south
        target: south
  north:
    type: passage
    id: north
    content: You found a treasure!
    choices:
      - text: Take it
        target: take_treasure
      - text: Leave it
        target: ending
  south:
    type: passage
    id: south
    content: A dead end.
    choices:
      - text: Go back
        target: start
  take_treasure:
    type: variable
    id: take_treasure
    increment:
      inventory: 1
    next: ending
  ending:
    type: passage
    id: ending
    content: The end.
    ending: true
`;

describe('runtime save/load game', () => {
  it('saves game state to JSON-serializable format', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story, { storyId: 'test-story' });
    start(rt);
    choose(rt, 'north');

    const saveData = saveGame(rt, { saveName: 'Test Save', playTimeMs: 5000 });

    expect(saveData.version).toBe('1.0');
    expect(saveData.storyId).toBe('test-story');
    expect(saveData.saveName).toBe('Test Save');
    expect(saveData.savedAt).toBeDefined();
    expect(saveData.snapshot.currentNodeId).toBe('north');
    expect(saveData.snapshot.variables.health).toBe(100);
    expect(saveData.metadata?.storyTitle).toBe('Save Test Story');
    expect(saveData.metadata?.playTimeMs).toBe(5000);
  });

  it('loads game state from save data', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story, { storyId: 'test-story' });
    start(rt);
    choose(rt, 'north');

    const saveData = saveGame(rt);
    const result = loadGame(story, saveData, { storyId: 'test-story' });

    expect(result.error).toBeUndefined();
    expect(result.state).toBeDefined();
    expect(result.state!.currentNodeId).toBe('north');
    expect(result.state!.variables.health).toBe(100);
  });

  it('round-trips through JSON serialization', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story);
    start(rt);
    choose(rt, 'north');
    choose(rt, 'take_treasure');

    const saveData = saveGame(rt);
    const json = serializeSaveData(saveData);
    const loadedSaveData = deserializeSaveData(json);
    const result = loadGame(story, loadedSaveData);

    expect(result.error).toBeUndefined();
    expect(result.state!.currentNodeId).toBe('ending');
    expect(result.state!.variables.inventory).toBe(1);
    expect(result.state!.visited['north']).toBe(1);
    expect(result.state!.visited['take_treasure']).toBe(1);
  });

  it('rejects save with invalid version', () => {
    const story = parseToStory(SAVE_STORY);
    const invalidSaveData = {
      version: '2.0' as const,
      savedAt: new Date().toISOString(),
      snapshot: {
        currentNodeId: 'start',
        stack: [],
        variables: {},
        visited: {},
        includeDepth: 0,
        limits: { maxAutoSteps: 500, maxIncludeDepth: 8, maxRepeats: 200 },
      },
    };

    // @ts-expect-error - intentionally passing invalid version
    const result = loadGame(story, invalidSaveData);
    expect(result.error?.code).toBe('RT020_INVALID_SAVE');
  });

  it('rejects save with mismatched story ID', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story, { storyId: 'story-a' });
    start(rt);

    const saveData = saveGame(rt);
    const result = loadGame(story, saveData, { storyId: 'story-b' });

    expect(result.error?.code).toBe('RT021_STORY_MISMATCH');
  });

  it('rejects save with missing node', () => {
    const story = parseToStory(SAVE_STORY);
    const saveData = {
      version: '1.0' as const,
      savedAt: new Date().toISOString(),
      snapshot: {
        currentNodeId: 'nonexistent_node',
        stack: [],
        variables: {},
        visited: {},
        includeDepth: 0,
        limits: { maxAutoSteps: 500, maxIncludeDepth: 8, maxRepeats: 200 },
      },
    };

    const result = loadGame(story, saveData);
    expect(result.error?.code).toBe('RT022_MISSING_NODE');
  });

  it('allows continuing game after load', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story);
    start(rt);
    choose(rt, 'north');

    // Save at "north" node
    const saveData = saveGame(rt);

    // Load into new runtime
    const result = loadGame(story, saveData);
    expect(result.state).toBeDefined();

    // Continue from where we left off - choose "Take it"
    const frame = choose(result.state!, 'take_treasure').frame!;
    expect(frame.nodeId).toBe('ending');
    expect(frame.variables.inventory).toBe(1);
    expect(frame.ending).toBe(true);
  });

  it('preserves visited count through save/load', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story);
    start(rt);
    choose(rt, 'south'); // visit south
    choose(rt, 'start'); // back to start (visit 2)
    choose(rt, 'south'); // visit south again (visit 2)

    const saveData = saveGame(rt);
    const result = loadGame(story, saveData);

    expect(result.state!.visited['start']).toBe(2);
    expect(result.state!.visited['south']).toBe(2);
  });
});

describe('save data serialization', () => {
  it('deserializeSaveData validates structure', () => {
    expect(() => deserializeSaveData('null')).toThrow('not an object');
    expect(() => deserializeSaveData('{}')).toThrow('missing required fields');
    expect(() => deserializeSaveData('{"version":"1.0"}')).toThrow('missing required fields');
  });

  it('serializeSaveData produces valid JSON', () => {
    const story = parseToStory(SAVE_STORY);
    const rt = createRuntime(story);
    start(rt);

    const saveData = saveGame(rt);
    const json = serializeSaveData(saveData);

    // Should be valid JSON
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
  });
});
