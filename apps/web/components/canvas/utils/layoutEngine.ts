import type { Story } from '@storygraph/core';

export interface Position {
  x: number;
  y: number;
}

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalSpacing: 280,
  verticalSpacing: 120,
};

/**
 * Calculate positions for all nodes using BFS-based layered layout.
 * Nodes are arranged in columns based on their distance from the start node.
 */
export function calculateLayout(story: Story, options: LayoutOptions = {}): Map<string, Position> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const positions = new Map<string, Position>();

  const startNode = story.getStartNode();
  if (!startNode) {
    // No start node, fall back to simple grid
    const allNodes = story.getAllNodes();
    allNodes.forEach((node, index) => {
      const col = Math.floor(index / 5);
      const row = index % 5;
      positions.set(node.id, {
        x: col * opts.horizontalSpacing,
        y: row * opts.verticalSpacing,
      });
    });
    return positions;
  }

  // BFS to assign levels (distance from start)
  const levels = new Map<string, number>();
  const queue: string[] = [startNode.id];
  levels.set(startNode.id, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current)!;
    const outgoing = story.getOutgoingEdges(current);

    for (const edge of outgoing) {
      if (!levels.has(edge.target)) {
        levels.set(edge.target, currentLevel + 1);
        queue.push(edge.target);
      }
    }
  }

  // Handle unreachable nodes
  const allNodes = story.getAllNodes();
  let maxLevel = Math.max(...Array.from(levels.values()), 0);
  for (const node of allNodes) {
    if (!levels.has(node.id)) {
      maxLevel++;
      levels.set(node.id, maxLevel);
    }
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  for (const [nodeId, level] of levels) {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  }

  // Assign positions
  for (const [level, nodeIds] of nodesByLevel) {
    const x = level * opts.horizontalSpacing;
    nodeIds.forEach((nodeId, index) => {
      const y = index * opts.verticalSpacing;
      positions.set(nodeId, { x, y });
    });
  }

  return positions;
}

/**
 * Merge existing positions with calculated layout.
 * Nodes with existing positions keep them, others get auto-layout.
 */
export function mergeWithExistingPositions(
  story: Story,
  calculatedPositions: Map<string, Position>
): Map<string, Position> {
  const merged = new Map<string, Position>();

  for (const node of story.getAllNodes()) {
    if (node.position) {
      // Use existing position
      merged.set(node.id, { x: node.position.x, y: node.position.y });
    } else if (calculatedPositions.has(node.id)) {
      // Use calculated position
      merged.set(node.id, calculatedPositions.get(node.id)!);
    } else {
      // Fallback
      merged.set(node.id, { x: 0, y: 0 });
    }
  }

  return merged;
}
