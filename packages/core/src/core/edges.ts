/**
 * Edge/Connection model for StoryGraph
 *
 * Edges represent the connections between nodes. They are derived
 * from the node definitions (choices, conditions, etc.) but are
 * also tracked explicitly for the visual editor.
 */

import { z } from 'zod';
import { NodeIdSchema } from './types.js';
import type { StoryNode, Choice } from './nodes.js';

// =============================================================================
// Edge Types
// =============================================================================

/**
 * The type of connection between nodes.
 */
export const EdgeTypeSchema = z.enum([
  'choice',      // From a choice selection
  'condition',   // From a condition branch (true/false)
  'next',        // Direct continuation (variable node, etc.)
  'return',      // Return from include
]);

export type EdgeType = z.infer<typeof EdgeTypeSchema>;

// =============================================================================
// Edge Definition
// =============================================================================

/**
 * An edge represents a connection from one node to another.
 */
export const EdgeSchema = z.object({
  /** Source node ID */
  source: NodeIdSchema,

  /** Target node ID */
  target: NodeIdSchema,

  /** Type of connection */
  type: EdgeTypeSchema,

  /** For choice edges, the choice text */
  label: z.string().max(256).optional(),

  /** For condition edges, whether this is the true or false branch */
  branch: z.enum(['true', 'false']).optional(),

  /** For choice edges, the condition (if any) */
  condition: z.string().max(256).optional(),
});

export type Edge = z.infer<typeof EdgeSchema>;

// =============================================================================
// Edge Extraction
// =============================================================================

/**
 * Extract all edges from a single node.
 *
 * @param node - The node to extract edges from
 * @returns Array of edges originating from this node
 */
export function extractEdgesFromNode(node: StoryNode): Edge[] {
  const edges: Edge[] = [];

  switch (node.type) {
    case 'passage':
      // Passage nodes have edges from their choices
      if (node.choices) {
        for (const choice of node.choices) {
          edges.push(createChoiceEdge(node.id, choice));
        }
      }
      break;

    case 'choice':
      // Choice nodes have edges from their choices
      for (const choice of node.choices) {
        edges.push(createChoiceEdge(node.id, choice));
      }
      break;

    case 'condition':
      // Condition nodes have two edges: true and false
      edges.push({
        source: node.id,
        target: node.ifTrue,
        type: 'condition',
        branch: 'true',
      });
      edges.push({
        source: node.id,
        target: node.ifFalse,
        type: 'condition',
        branch: 'false',
      });
      break;

    case 'variable':
      // Variable nodes have a single next edge
      edges.push({
        source: node.id,
        target: node.next,
        type: 'next',
      });
      break;

    case 'include':
      // Include nodes may have a return edge
      if (node.return) {
        edges.push({
          source: node.id,
          target: node.return,
          type: 'return',
        });
      }
      break;

    case 'comment':
      // Comment nodes have no edges
      break;
  }

  return edges;
}

/**
 * Create an edge from a choice.
 */
function createChoiceEdge(sourceId: string, choice: Choice): Edge {
  return {
    source: sourceId,
    target: choice.target,
    type: 'choice',
    label: choice.text,
    condition: choice.condition,
  };
}

/**
 * Extract all edges from a collection of nodes.
 *
 * @param nodes - Map of node ID to node
 * @returns Array of all edges in the story
 */
export function extractAllEdges(nodes: Map<string, StoryNode>): Edge[] {
  const edges: Edge[] = [];

  for (const node of nodes.values()) {
    edges.push(...extractEdgesFromNode(node));
  }

  return edges.sort((a, b) => {
    const sourceDelta = a.source.localeCompare(b.source);
    if (sourceDelta !== 0) return sourceDelta;
    const targetDelta = a.target.localeCompare(b.target);
    if (targetDelta !== 0) return targetDelta;
    const typeDelta = a.type.localeCompare(b.type);
    if (typeDelta !== 0) return typeDelta;
    const labelDelta = (a.label ?? '').localeCompare(b.label ?? '');
    if (labelDelta !== 0) return labelDelta;
    return (a.branch ?? '').localeCompare(b.branch ?? '');
  });
}

/**
 * Get all target node IDs from a node.
 * Useful for graph traversal.
 *
 * @param node - The node to get targets from
 * @returns Array of target node IDs
 */
export function getNodeTargets(node: StoryNode): string[] {
  const targets: string[] = [];

  switch (node.type) {
    case 'passage':
      if (node.choices) {
        targets.push(...node.choices.map((c) => c.target));
      }
      break;

    case 'choice':
      targets.push(...node.choices.map((c) => c.target));
      break;

    case 'condition':
      targets.push(node.ifTrue, node.ifFalse);
      break;

    case 'variable':
      targets.push(node.next);
      break;

    case 'include':
      if (node.return) {
        targets.push(node.return);
      }
      break;

    case 'comment':
      // No targets
      break;
  }

  return targets;
}
