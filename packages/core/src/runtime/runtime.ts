import { Story } from '../core/story.js';
import { parseToStory } from '../core/serializer.js';
import type { StoryNode, Choice } from '../core/nodes.js';
import type { VariableName, VariableValue } from '../core/types.js';
import type { RuntimeChoice, RuntimeEvent, RuntimeError, RuntimeFrame, RuntimeLimits, RuntimeState } from './types.js';

const DEFAULT_LIMITS: RuntimeLimits = {
  maxAutoSteps: 500,
  maxIncludeDepth: 8,
  maxRepeats: 200,
};

export type RuntimeOptions = Partial<RuntimeLimits> & { storyId?: string | undefined };

export function createRuntime(story: Story, options?: RuntimeOptions): RuntimeState {
  return {
    storyId: options?.storyId,
    story,
    currentNodeId: null,
    stack: [],
    variables: Object.fromEntries(story.variables.entries()),
    visited: {},
    includeDepth: 0,
    limits: { ...DEFAULT_LIMITS, ...(options ?? {}) },
    events: [],
  };
}

export function loadRuntimeFromContent(content: string, options?: RuntimeOptions): RuntimeState {
  const story = parseToStory(content);
  return createRuntime(story, options);
}

export function start(state: RuntimeState, entryId?: string): RuntimeResult {
  const startNode =
    entryId ??
    state.story.getAllNodes().find((n) => (n as any).start === true)?.id ??
    state.story.getStartNode()?.id;
  if (!startNode) {
    return { error: runtimeError('RT000_NO_START', 'No start node found') };
  }
  state.currentNodeId = startNode;
  return advance(state);
}

export function choose(state: RuntimeState, targetNodeId: string): RuntimeResult {
  if (!state.story.hasNode(targetNodeId)) {
    return { error: runtimeError('RT004_INVALID_CHOICE', `Target node ${targetNodeId} not found`) };
  }
  state.currentNodeId = targetNodeId;
  return advance(state);
}

export type RuntimeResult = { frame?: RuntimeFrame; error?: RuntimeError };
export type RuntimeSnapshot = {
  currentNodeId: string | null;
  stack: Array<{ returnTo?: string | undefined; includeId: string }>;
  variables: Record<string, VariableValue>;
  visited: Record<string, number>;
  includeDepth: number;
  limits: RuntimeLimits;
};

export function snapshot(state: RuntimeState): RuntimeSnapshot {
  return {
    currentNodeId: state.currentNodeId,
    stack: state.stack.map((f) => ({ ...f })),
    variables: { ...state.variables },
    visited: { ...state.visited },
    includeDepth: state.includeDepth,
    limits: { ...state.limits },
  };
}

export function hydrate(story: Story, snap: RuntimeSnapshot, options?: RuntimeOptions): RuntimeState {
  return {
    story,
    storyId: options?.storyId,
    currentNodeId: snap.currentNodeId,
    stack: snap.stack.map((f) => ({ ...f })),
    variables: { ...snap.variables },
    visited: { ...snap.visited },
    includeDepth: snap.includeDepth,
    limits: { ...DEFAULT_LIMITS, ...(options ?? {}), ...(snap.limits ?? {}) },
    events: [],
  };
}

function advance(state: RuntimeState): RuntimeResult {
  let steps = 0;
  const max = state.limits.maxAutoSteps;
  state.events = [];

  while (steps++ < max) {
    const node = state.currentNodeId ? state.story.getNode(state.currentNodeId) : undefined;
    if (!node) return { error: runtimeError('RT001_MISSING_NODE', 'Node not found', state.currentNodeId ?? undefined) };

    const visits = (state.visited[node.id] ?? 0) + 1;
    state.visited[node.id] = visits;
    if (visits > state.limits.maxRepeats) {
      return { error: runtimeError('RT010_STEP_LIMIT', 'Exceeded repeat limit', node.id) };
    }

    switch (node.type) {
      case 'passage': {
        const frame = buildPassageFrame(state, node);
        return { frame };
      }
      case 'choice': {
        const frame = buildChoiceFrame(state, node);
        return { frame };
      }
      case 'condition': {
        const branch = evaluateExpression(node.expression, state.variables);
        state.events.push({ code: 'ev_condition', message: `condition ${node.expression} -> ${branch}`, severity: 'info', nodeId: node.id });
        state.currentNodeId = branch ? node.ifTrue : node.ifFalse;
        continue;
      }
      case 'variable': {
        applyVariableMutations(node, state.variables);
        state.events.push({ code: 'ev_variables', message: 'variables updated', severity: 'info', nodeId: node.id });
        state.currentNodeId = node.next;
        continue;
      }
      case 'include': {
        if (state.includeDepth >= state.limits.maxIncludeDepth) {
          return { error: runtimeError('RT001_INCLUDE_DEPTH', 'Include depth exceeded', node.id) };
        }
        state.includeDepth += 1;
        state.stack.push({ returnTo: node.return, includeId: node.id });
        const entry = node.entry ?? state.story.getStartNode()?.id;
        if (!entry) return { error: runtimeError('RT000_NO_START', 'Include missing entry', node.id) };
        state.currentNodeId = entry;
        continue;
      }
      case 'comment': {
        state.events.push({ code: 'ev_comment', message: 'comment skipped', severity: 'info', nodeId: node.id });
        const next = state.story.getOutgoingEdges(node.id)[0]?.target;
        if (!next) return { error: runtimeError('RT005_COMMENT_DEADEND', 'Comment has no outgoing edge', node.id) };
        state.currentNodeId = next;
        continue;
      }
      default: {
        // Exhaustiveness check - node.type should be `never` here
        const _exhaustive: never = node;
        return { error: runtimeError('RT999_UNKNOWN', `Unknown node type: ${(_exhaustive as StoryNode).type}`) };
      }
    }
  }

  return { error: runtimeError('RT010_STEP_LIMIT', 'Exceeded auto-step limit') };
}

function buildPassageFrame(state: RuntimeState, node: Extract<StoryNode, { type: 'passage' }>): RuntimeFrame {
  const choices = (node.choices ?? [])
    .map((choice, idx) => ({ choice, idx }))
    .filter(({ choice }) => isChoiceVisible(choice, state.variables, state.events, node.id))
    .map(({ choice, idx }) => runtimeChoice(choice, idx));

  const ending = (choices.length === 0) || node.ending === true;
  if (ending && state.stack.length > 0) {
    const frame = popReturn(state);
    if (frame) return frame;
  }

  return {
    nodeId: node.id,
    text: node.content,
    choices,
    ending,
    variables: { ...state.variables },
    events: [...state.events],
  };
}

function buildChoiceFrame(state: RuntimeState, node: Extract<StoryNode, { type: 'choice' }>): RuntimeFrame {
  const choices = node.choices.map((choice, idx) => runtimeChoice(choice, idx));
  return {
    nodeId: node.id,
    text: node.prompt ?? '',
    choices,
    ending: choices.length === 0,
    variables: { ...state.variables },
    events: [...state.events],
  };
}

function runtimeChoice(choice: Choice, idx: number): RuntimeChoice {
  return {
    id: `${idx}:${choice.target}`,
    text: choice.text,
    target: choice.target,
  };
}

function isChoiceVisible(choice: Choice, vars: Record<string, VariableValue>, events: RuntimeEvent[], nodeId: string): boolean {
  if (!choice.condition) return true;
  const ok = evaluateExpression(choice.condition, vars);
  events.push({ code: 'ev_choice_condition', message: `choice condition ${choice.condition} -> ${ok}`, severity: 'info', nodeId });
  return ok;
}

function evaluateExpression(expr: string, vars: Record<string, VariableValue>): boolean {
  try {
    const keys = Object.keys(vars);
    const args = keys.join(',');
    const fn = new Function('vars', `"use strict"; const { ${args} } = vars; return (${expr});`);
    return !!fn(vars);
  } catch (err) {
    return false;
  }
}

function applyVariableMutations(
  node: Extract<StoryNode, { type: 'variable' }>,
  vars: Record<string, VariableValue>
): void {
  if (node.set) {
    for (const [key, value] of Object.entries(node.set)) {
      vars[key as VariableName] = value as VariableValue;
    }
  }
  if (node.increment) {
    for (const [key, delta] of Object.entries(node.increment)) {
      const current = Number(vars[key as VariableName] ?? 0);
      vars[key as VariableName] = current + Number(delta);
    }
  }
  if (node.decrement) {
    for (const [key, delta] of Object.entries(node.decrement)) {
      const current = Number(vars[key as VariableName] ?? 0);
      vars[key as VariableName] = current - Number(delta);
    }
  }
}

function popReturn(state: RuntimeState): RuntimeFrame | null {
  const frame = state.stack.pop();
  state.includeDepth = Math.max(0, state.includeDepth - 1);
  if (!frame) return null;
  if (!frame.returnTo) {
    return {
      nodeId: frame.includeId,
      text: '',
      choices: [],
      ending: true,
      variables: { ...state.variables },
      events: [...state.events, { code: 'ev_include_return', message: 'include completed', severity: 'info', nodeId: frame.includeId }],
    };
  }
  state.currentNodeId = frame.returnTo;
  return null;
}

function runtimeError(code: string, message: string, nodeId?: string): RuntimeError {
  return { code, message, nodeId };
}
