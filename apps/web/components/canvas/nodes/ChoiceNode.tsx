'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface ChoiceNodeProps {
  data: {
    label: string;
    storyNode: {
      id: string;
      type: 'choice';
      choices?: Array<{ text: string; target: string; condition?: string }>;
    };
  };
  selected?: boolean;
}

const CHOICE_COLOR = '#8b5cf6'; // purple

function ChoiceNodeComponent({ data, selected }: ChoiceNodeProps) {
  const { storyNode } = data;
  const choices = storyNode.choices ?? [];

  return (
    <div
      className="story-node"
      style={{
        backgroundColor: selected ? CHOICE_COLOR : `${CHOICE_COLOR}22`,
        borderColor: CHOICE_COLOR,
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 240,
        boxShadow: selected ? `0 0 0 2px ${CHOICE_COLOR}66` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: CHOICE_COLOR,
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
          color: selected ? 'white' : CHOICE_COLOR,
          marginBottom: 4,
        }}
      >
        choice
      </div>

      <div style={{ fontWeight: 600, marginBottom: 6, color: selected ? 'white' : '#e2e8f0' }}>
        {storyNode.id}
      </div>

      {choices.length > 0 ? (
        <div style={{ fontSize: 11 }}>
          {choices.slice(0, 3).map((choice, idx) => (
            <div
              key={idx}
              style={{
                padding: '2px 0',
                color: selected ? 'rgba(255,255,255,0.9)' : '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {idx + 1}. {choice.text.length > 25 ? choice.text.slice(0, 25) + '...' : choice.text}
            </div>
          ))}
          {choices.length > 3 && (
            <div style={{ color: selected ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: 10 }}>
              +{choices.length - 3} more
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: '#64748b' }}>No choices defined</div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: CHOICE_COLOR,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
    </div>
  );
}

export const ChoiceNode = memo(ChoiceNodeComponent);
