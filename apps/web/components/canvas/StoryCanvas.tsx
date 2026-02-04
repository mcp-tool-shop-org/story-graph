'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type OnNodesChange,
  type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Story } from '@storygraph/core';
import { nodeTypes } from './nodes';
import { storyToFlow, type StoryFlowNode, type StoryFlowEdge } from './utils/storyToFlow';

interface StoryCanvasProps {
  story: Story | null;
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
  onPositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  readOnly?: boolean;
}

export function StoryCanvas({
  story,
  selectedNodeId,
  onNodeSelect,
  onPositionChange,
  readOnly = false,
}: StoryCanvasProps) {
  const [flowNodes, setNodes, onNodesChange] = useNodesState<StoryFlowNode>([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState<StoryFlowEdge>([]);

  // Convert story to flow on story change
  useMemo(() => {
    if (!story) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes, edges } = storyToFlow(story);
    setNodes(nodes);
    setEdges(edges);
  }, [story, setNodes, setEdges]);

  // Handle node selection
  const handleNodeClick: NodeMouseHandler<StoryFlowNode> = useCallback(
    (_event, node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Handle node drag end for position updates
  const handleNodesChange: OnNodesChange<StoryFlowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Check for position changes
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          onPositionChange?.(change.id, change.position);
        }
      }
    },
    [onNodesChange, onPositionChange]
  );

  // Sync selected state with nodes
  const nodesWithSelection = useMemo(() => {
    return flowNodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
  }, [flowNodes, selectedNodeId]);

  // MiniMap node colors
  const getNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'passageNode':
        return '#3b82f6';
      case 'choiceNode':
        return '#8b5cf6';
      case 'conditionNode':
        return '#f97316';
      case 'variableNode':
        return '#22c55e';
      case 'includeNode':
        return '#6b7280';
      case 'commentNode':
        return '#fbbf24';
      default:
        return '#64748b';
    }
  }, []);

  if (!story) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: 14,
        }}
      >
        No story loaded
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        panOnScroll
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: '#0f172a' }}
      >
        <Background variant={BackgroundVariant.Dots} color="#334155" gap={20} size={1} />
        <Controls position="bottom-left" style={{ marginBottom: 10, marginLeft: 10 }} />
        <MiniMap
          nodeColor={getNodeColor}
          maskColor="rgba(15, 23, 42, 0.8)"
          style={{ backgroundColor: '#1e293b' }}
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}
