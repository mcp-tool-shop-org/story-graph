'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface IncludeNodeProps {
  data: {
    label: string;
    storyNode: {
      id: string;
      type: 'include';
      include?: string;
      next?: string;
    };
  };
  selected?: boolean;
}

const INCLUDE_COLOR = '#6b7280'; // gray

function IncludeNodeComponent({ data, selected }: IncludeNodeProps) {
  const { storyNode } = data;

  return (
    <div
      className="story-node"
      style={{
        backgroundColor: selected ? INCLUDE_COLOR : `${INCLUDE_COLOR}22`,
        borderColor: INCLUDE_COLOR,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 240,
        boxShadow: selected ? `0 0 0 2px ${INCLUDE_COLOR}66` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: INCLUDE_COLOR,
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
          color: selected ? 'white' : INCLUDE_COLOR,
          marginBottom: 4,
        }}
      >
        include
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4, color: selected ? 'white' : '#e2e8f0' }}>
        {storyNode.id}
      </div>

      {storyNode.include && (
        <div
          style={{
            fontSize: 11,
            color: selected ? 'rgba(255,255,255,0.9)' : '#94a3b8',
            fontFamily: 'monospace',
            backgroundColor: selected ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
            padding: '4px 6px',
            borderRadius: 4,
          }}
        >
          {storyNode.include}
        </div>
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
          background: INCLUDE_COLOR,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
    </div>
  );
}

export const IncludeNode = memo(IncludeNodeComponent);
