'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface ConditionNodeProps {
  data: {
    label: string;
    storyNode: {
      id: string;
      type: 'condition';
      condition?: string;
      then?: string;
      else?: string;
    };
  };
  selected?: boolean;
}

const CONDITION_COLOR = '#f97316'; // orange

function ConditionNodeComponent({ data, selected }: ConditionNodeProps) {
  const { storyNode } = data;
  const condition = storyNode.condition ?? 'true';
  const truncatedCondition = condition.length > 30 ? condition.slice(0, 30) + '...' : condition;

  return (
    <div
      className="story-node"
      style={{
        backgroundColor: selected ? CONDITION_COLOR : `${CONDITION_COLOR}22`,
        borderColor: CONDITION_COLOR,
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 240,
        boxShadow: selected ? `0 0 0 2px ${CONDITION_COLOR}66` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: CONDITION_COLOR,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: selected ? 'white' : CONDITION_COLOR,
          marginBottom: 4,
        }}
      >
        condition
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4, color: selected ? 'white' : '#e2e8f0' }}>
        {storyNode.id}
      </div>

      <div
        style={{
          fontSize: 11,
          fontFamily: 'monospace',
          backgroundColor: selected ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
          padding: '4px 6px',
          borderRadius: 4,
          color: selected ? 'white' : '#fdba74',
          marginBottom: 6,
        }}
      >
        {truncatedCondition}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <div style={{ color: '#22c55e' }}>{storyNode.then && `then: ${storyNode.then}`}</div>
        <div style={{ color: '#ef4444' }}>{storyNode.else && `else: ${storyNode.else}`}</div>
      </div>

      {/* True branch handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{
          background: '#22c55e',
          width: 10,
          height: 10,
          border: '2px solid white',
          top: '40%',
        }}
      />

      {/* False branch handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{
          background: '#ef4444',
          width: 10,
          height: 10,
          border: '2px solid white',
          top: '70%',
        }}
      />
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
