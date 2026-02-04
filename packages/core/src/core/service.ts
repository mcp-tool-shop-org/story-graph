import type { Edge } from './edges.js';
import type { StoryVariables } from './story.js';
import type { Story } from './story.js';
import type {
  FormatVersion,
  NodeId,
  StoryMeta,
  VariableName,
  VariableValue,
} from './types.js';
import type { StoryNode } from './nodes.js';

export interface StorySnapshot {
  version: FormatVersion;
  meta: StoryMeta;
  variables: Record<VariableName, VariableValue>;
  nodes: StoryNode[];
  edges: Edge[];
  updatedAt: string;
}

export type ChangeSet = Change[];

export type Change =
  | { type: 'set-node'; node: StoryNode }
  | { type: 'remove-node'; id: NodeId }
  | { type: 'update-meta'; meta: Partial<StoryMeta> }
  | { type: 'set-variables'; variables: StoryVariables };

/**
 * Small service layer that wraps Story mutations and returns immutable snapshots.
 * This keeps UI/state management decoupled from the core data model.
 */
export class StoryService {
  constructor(private readonly story: Story) {}

  /**
   * Get a read-only snapshot of the current story state.
   */
  getSnapshot(): StorySnapshot {
    return this.buildSnapshot();
  }

  /**
   * Apply a batch of changes and return the updated snapshot.
   */
  applyChanges(changes: ChangeSet): StorySnapshot {
    for (const change of changes) {
      this.applyChange(change);
    }
    return this.buildSnapshot();
  }

  private applyChange(change: Change): void {
    switch (change.type) {
      case 'set-node':
        this.story.setNode(change.node);
        break;

      case 'remove-node':
        this.story.removeNode(change.id);
        break;

      case 'update-meta':
        this.story.meta = {
          ...this.story.meta,
          ...change.meta,
          modified: change.meta.modified ?? new Date().toISOString(),
        };
        break;

      case 'set-variables':
        this.story.variables = new Map(Object.entries(change.variables));
        break;
    }
  }

  private buildSnapshot(): StorySnapshot {
    const variables: Record<VariableName, VariableValue> = {};
    for (const [key, value] of this.story.variables.entries()) {
      variables[key] = value;
    }

    const nodes = this.story.getAllNodes().map((node) => clone(node));
    const edges = this.story.getEdges().map((edge) => clone(edge));

    return {
      version: this.story.version,
      meta: { ...this.story.meta },
      variables,
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
    };
  }
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
