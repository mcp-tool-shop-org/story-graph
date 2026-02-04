/**
 * Story container for StoryGraph
 *
 * The Story class is the top-level container for a complete narrative.
 * It holds metadata, nodes, and provides methods for manipulation.
 */

import { z } from 'zod';
import {
  StoryMetaSchema,
  FormatVersionSchema,
  CURRENT_FORMAT_VERSION,
  type StoryMeta,
  type FormatVersion,
  type NodeId,
  type VariableName,
  type VariableValue,
} from './types.js';
import { StoryNodeSchema, type StoryNode, type PassageNode } from './nodes.js';
import { extractAllEdges, type Edge } from './edges.js';

// =============================================================================
// Story Variables Schema
// =============================================================================

/**
 * Initial variable values for the story.
 */
export const StoryVariablesSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/),
  z.union([z.string(), z.number(), z.boolean()])
);

export type StoryVariables = z.infer<typeof StoryVariablesSchema>;

// =============================================================================
// Story Document Schema (File Format)
// =============================================================================

/**
 * The complete story document as stored in a .story file.
 */
export const StoryDocumentSchema = z.object({
  /** File format version for compatibility */
  version: FormatVersionSchema,

  /** Story metadata */
  meta: StoryMetaSchema,

  /** Initial variable values */
  variables: StoryVariablesSchema.optional(),

  /** All nodes in the story, keyed by ID */
  nodes: z.record(z.string(), StoryNodeSchema),
});

export type StoryDocument = z.infer<typeof StoryDocumentSchema>;

// =============================================================================
// Story Class
// =============================================================================

/**
 * In-memory representation of a story.
 * Provides methods for querying and manipulating the narrative.
 */
export class Story {
  /** File format version */
  readonly version: FormatVersion;

  /** Story metadata */
  meta: StoryMeta;

  /** Initial variable values */
  variables: Map<VariableName, VariableValue>;

  /** All nodes, keyed by ID */
  private nodes: Map<NodeId, StoryNode>;

  /** Cached edges (invalidated on node changes) */
  private edgeCache: Edge[] | null = null;

  /** Cached outgoing edges by node ID */
  private outgoingCache: Map<NodeId, Edge[]> | null = null;

  /** Cached incoming edges by node ID */
  private incomingCache: Map<NodeId, Edge[]> | null = null;

  constructor(document: StoryDocument) {
    this.version = document.version;
    this.meta = { ...document.meta };
    this.variables = new Map(Object.entries(document.variables ?? {}));
    this.nodes = new Map(
      Object.entries(document.nodes).map(([id, node]) => [id, { ...node, id }])
    );
  }

  // ---------------------------------------------------------------------------
  // Factory Methods
  // ---------------------------------------------------------------------------

  /**
   * Create an empty story with the given title.
   */
  static create(title: string, author?: string): Story {
    const now = new Date().toISOString();
    return new Story({
      version: CURRENT_FORMAT_VERSION,
      meta: {
        title,
        author,
        created: now,
        modified: now,
      },
      nodes: {},
    });
  }

  /**
   * Create a story from a parsed document.
   */
  static fromDocument(document: StoryDocument): Story {
    return new Story(document);
  }

  // ---------------------------------------------------------------------------
  // Node Access
  // ---------------------------------------------------------------------------

  /**
   * Get a node by ID.
   */
  getNode(id: NodeId): StoryNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Check if a node exists.
   */
  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  /**
   * Get all nodes.
   */
  getAllNodes(): StoryNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all node IDs.
   */
  getAllNodeIds(): NodeId[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get the number of nodes.
   */
  get nodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get nodes by type.
   */
  getNodesByType<T extends StoryNode['type']>(
    type: T
  ): Extract<StoryNode, { type: T }>[] {
    return this.getAllNodes().filter(
      (node): node is Extract<StoryNode, { type: T }> => node.type === type
    );
  }

  // ---------------------------------------------------------------------------
  // Special Node Access
  // ---------------------------------------------------------------------------

  /**
   * Get the starting node (passage with start: true).
   * Returns the first one found if multiple exist.
   */
  getStartNode(): PassageNode | undefined {
    const passages = this.getNodesByType('passage');
    return passages.find((p) => p.start === true);
  }

  /**
   * Get all ending nodes (passages with ending: true or no choices).
   */
  getEndingNodes(): PassageNode[] {
    const passages = this.getNodesByType('passage');
    return passages.filter(
      (p) => p.ending === true || (!p.choices || p.choices.length === 0)
    );
  }

  // ---------------------------------------------------------------------------
  // Edge Access
  // ---------------------------------------------------------------------------

  /**
   * Get all edges in the story.
   * Results are cached for performance.
   */
  getEdges(): Edge[] {
    this.ensureEdgeCache();
    return this.edgeCache ?? [];
  }

  /**
   * Get edges originating from a specific node.
   */
  getOutgoingEdges(nodeId: NodeId): Edge[] {
    this.ensureEdgeCache();
    return this.outgoingCache?.get(nodeId) ?? [];
  }

  /**
   * Get edges targeting a specific node.
   */
  getIncomingEdges(nodeId: NodeId): Edge[] {
    this.ensureEdgeCache();
    return this.incomingCache?.get(nodeId) ?? [];
  }

  // ---------------------------------------------------------------------------
  // Node Mutation
  // ---------------------------------------------------------------------------

  /**
   * Add or update a node.
   */
  setNode(node: StoryNode): void {
    this.nodes.set(node.id, node);
    this.invalidateCache();
  }

  /**
   * Remove a node.
   */
  removeNode(id: NodeId): boolean {
    const removed = this.nodes.delete(id);
    if (removed) {
      this.invalidateCache();
    }
    return removed;
  }

  /**
   * Invalidate cached data (call after mutations).
   */
  private invalidateCache(): void {
    this.edgeCache = null;
    this.outgoingCache = null;
    this.incomingCache = null;
  }

  /**
   * Ensure edge caches are populated.
   */
  private ensureEdgeCache(): void {
    if (this.edgeCache && this.outgoingCache && this.incomingCache) {
      return;
    }

    const edges = extractAllEdges(this.nodes);
    const outgoing = new Map<NodeId, Edge[]>();
    const incoming = new Map<NodeId, Edge[]>();

    for (const edge of edges) {
      let fromList = outgoing.get(edge.source);
      if (!fromList) {
        fromList = [];
        outgoing.set(edge.source, fromList);
      }
      fromList.push(edge);

      let toList = incoming.get(edge.target);
      if (!toList) {
        toList = [];
        incoming.set(edge.target, toList);
      }
      toList.push(edge);
    }

    this.edgeCache = edges;
    this.outgoingCache = outgoing;
    this.incomingCache = incoming;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Convert to a document for serialization.
   */
  toDocument(): StoryDocument {
    const variables: Record<string, VariableValue> = {};
    for (const key of Array.from(this.variables.keys()).sort()) {
      const value = this.variables.get(key);
      if (value !== undefined) {
        variables[key] = value;
      }
    }

    const nodes: Record<string, StoryNode> = {};
    for (const id of Array.from(this.nodes.keys()).sort()) {
      const node = this.nodes.get(id);
      if (node) {
        nodes[id] = node;
      }
    }

    return {
      version: this.version,
      meta: {
        ...this.meta,
        modified: this.meta.modified ?? this.meta.created,
      },
      variables: Object.keys(variables).length > 0 ? variables : undefined,
      nodes,
    };
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get word count across all passage content.
   */
  getWordCount(): number {
    const passages = this.getNodesByType('passage');
    let count = 0;
    for (const passage of passages) {
      count += passage.content.split(/\s+/).filter((w) => w.length > 0).length;
    }
    return count;
  }

  /**
   * Get character count across all passage content.
   */
  getCharacterCount(): number {
    const passages = this.getNodesByType('passage');
    let count = 0;
    for (const passage of passages) {
      count += passage.content.length;
    }
    return count;
  }

  /**
   * Get total choice count.
   */
  getChoiceCount(): number {
    let count = 0;
    for (const node of this.nodes.values()) {
      if (node.type === 'passage' && node.choices) {
        count += node.choices.length;
      } else if (node.type === 'choice') {
        count += node.choices.length;
      }
    }
    return count;
  }
}
