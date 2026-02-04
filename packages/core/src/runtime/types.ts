import type { VariableValue } from '../core/types.js';

export type RuntimeChoice = {
  id: string;
  text: string;
  target: string;
};

export type RuntimeEvent = {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  nodeId?: string;
  data?: Record<string, unknown>;
};

export type RuntimeError = {
  code: string;
  message: string;
  nodeId?: string;
  data?: Record<string, unknown>;
};

export type RuntimeFrame = {
  nodeId: string;
  text: string;
  choices: RuntimeChoice[];
  ending: boolean;
  variables: Record<string, VariableValue>;
  events: RuntimeEvent[];
};

export type RuntimeLimits = {
  maxAutoSteps: number;
  maxIncludeDepth: number;
  maxRepeats: number;
};

export type RuntimeState = {
  storyId?: string;
  story: import('../core/story.js').Story;
  currentNodeId: string | null;
  stack: Array<{ returnTo?: string; includeId: string }>;
  variables: Record<string, VariableValue>;
  visited: Record<string, number>;
  includeDepth: number;
  limits: RuntimeLimits;
  events: RuntimeEvent[];
};
