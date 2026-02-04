'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface VariableNodeProps {
  data: {
    label: string;
    storyNode: {
      id: string;
      type: 'variable';
      set?: Record<string, unknown>;
      next?: string;
    };
  };
  selected?: boolean;
}

const VARIABLE_COLOR = '#22c55e'; // green

function VariableNodeComponent({ data, selected }: VariableNodeProps) {
  const { storyNode } = data;
  const variables = storyNode.set ?? {};
  const entries = Object.entries(variables);

  return (
    <div
      className="story-node"
      style={{
        backgroundColor: selected ? VARIABLE_COLOR : `${VARIABLE_COLOR}22`,
        borderColor: VARIABLE_COLOR,
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 240,
        boxShadow: selected ? `0 0 0 2px ${VARIABLE_COLOR}66` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: VARIABLE_COLOR,
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
          color: selected ? 'white' : VARIABLE_COLOR,
          marginBottom: 4,
        }}
      >
        variable
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4, color: selected ? 'white' : '#e2e8f0' }}>
        {storyNode.id}
      </div>

      {entries.length > 0 ? (
        <div style={{ fontSize: 11, fontFamily: 'monospace' }}>
          {entries.slice(0, 3).map(([key, value], idx) => (
            <div
              key={idx}
              style={{
                color: selected ? 'rgba(255,255,255,0.9)' : '#86efac',
                padding: '1px 0',
              }}
            >
              {key} = {JSON.stringify(value)}
            </div>
          ))}
          {entries.length > 3 && (
            <div style={{ color: '#64748b', fontSize: 10 }}>+{entries.length - 3} more</div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: '#64748b' }}>No variables set</div>
      )}

      {storyNode.next && (
        <div
          style={{
            fontSize: 10,
            color: selected ? 'rgba(255,255,255,0.7)' : '#64748b',
            marginTop: 4,
          }}
        >
          next: {storyNode.next}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: VARIABLE_COLOR,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
    </div>
  );
}

export const VariableNode = memo(VariableNodeComponent);
