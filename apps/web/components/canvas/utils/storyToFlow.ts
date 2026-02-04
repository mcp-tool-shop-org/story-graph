import type { Node, Edge } from '@xyflow/react';
import type { Story, StoryNode } from '@storygraph/core';
import { calculateLayout, mergeWithExistingPositions } from './layoutEngine';

export interface StoryFlowNode extends Node {
  data: {
    storyNode: StoryNode;
    label: string;
  };
}

export interface StoryFlowEdge extends Edge {
  data?: {
    label?: string | undefined;
    edgeType?: string | undefined;
  };
}

/**
 * Convert a Story object to React Flow nodes and edges.
 */
export function storyToFlow(story: Story): {
  nodes: StoryFlowNode[];
  edges: StoryFlowEdge[];
} {
  // Calculate layout for nodes without positions
  const calculatedLayout = calculateLayout(story);
  const positions = mergeWithExistingPositions(story, calculatedLayout);

  // Convert nodes
  const nodes: StoryFlowNode[] = story.getAllNodes().map((node) => {
    const position = positions.get(node.id) ?? { x: 0, y: 0 };

    return {
      id: node.id,
      type: mapNodeType(node.type),
      position,
      data: {
        storyNode: node,
        label: node.id,
      },
    };
  });

  // Convert edges
  const edges: StoryFlowEdge[] = story.getEdges().map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.label === 'condition',
    label: edge.label !== 'next' ? edge.label : undefined,
    data: {
      label: edge.label,
      edgeType: edge.label,
    },
    style: getEdgeStyle(edge.label),
  }));

  return { nodes, edges };
}

/**
 * Map StoryGraph node type to React Flow custom node type.
 */
function mapNodeType(type: string): string {
  switch (type) {
    case 'passage':
      return 'passageNode';
    case 'choice':
      return 'choiceNode';
    case 'condition':
      return 'conditionNode';
    case 'variable':
      return 'variableNode';
    case 'include':
      return 'includeNode';
    case 'comment':
      return 'commentNode';
    default:
      return 'passageNode';
  }
}

/**
 * Get edge styling based on edge type.
 */
function getEdgeStyle(label?: string): React.CSSProperties {
  switch (label) {
    case 'choice':
      return { stroke: '#8b5cf6', strokeWidth: 2 };
    case 'condition':
      return { stroke: '#f97316', strokeWidth: 2, strokeDasharray: '5,5' };
    case 'return':
      return { stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '2,2' };
    default:
      return { stroke: '#94a3b8', strokeWidth: 1.5 };
  }
}

/**
 * Extract position updates from React Flow nodes back to Story format.
 */
export function extractPositionUpdates(flowNodes: Node[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  for (const node of flowNodes) {
    positions.set(node.id, {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    });
  }

  return positions;
}
