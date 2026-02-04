'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface PassageNodeProps {
  data: {
    label: string;
    storyNode: {
      id: string;
      type: 'passage';
      content?: string;
      start?: boolean;
      ending?: boolean;
      choices?: Array<{ text: string; target: string }>;
    };
  };
  selected?: boolean;
}

const PASSAGE_COLOR = '#3b82f6'; // blue

function PassageNodeComponent({ data, selected }: PassageNodeProps) {
  const { storyNode } = data;
  const content = storyNode.content ?? '';
  const truncated = content.length > 60 ? content.slice(0, 60) + '...' : content;
  const choiceCount = storyNode.choices?.length ?? 0;

  return (
    <div
      className="story-node"
      style={{
        backgroundColor: selected ? PASSAGE_COLOR : `${PASSAGE_COLOR}22`,
        borderColor: PASSAGE_COLOR,
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 240,
        boxShadow: selected ? `0 0 0 2px ${PASSAGE_COLOR}66` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {!storyNode.start && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: PASSAGE_COLOR,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />
      )}

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: selected ? 'white' : PASSAGE_COLOR,
          marginBottom: 4,
        }}
      >
        passage
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4, color: selected ? 'white' : '#e2e8f0' }}>
        {storyNode.id}
        {storyNode.start && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 9,
              padding: '1px 4px',
              background: '#22c55e',
              borderRadius: 4,
              color: 'white',
            }}
          >
            START
          </span>
        )}
        {storyNode.ending && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 9,
              padding: '1px 4px',
              background: '#ef4444',
              borderRadius: 4,
              color: 'white',
            }}
          >
            END
          </span>
        )}
      </div>

      {truncated && (
        <div
          style={{
            fontSize: 11,
            color: selected ? 'rgba(255,255,255,0.9)' : '#94a3b8',
            lineHeight: 1.4,
            marginBottom: choiceCount > 0 ? 6 : 0,
          }}
        >
          {truncated}
        </div>
      )}

      {choiceCount > 0 && (
        <div
          style={{
            fontSize: 10,
            color: selected ? 'rgba(255,255,255,0.8)' : '#64748b',
          }}
        >
          {choiceCount} choice{choiceCount !== 1 ? 's' : ''}
        </div>
      )}

      {!storyNode.ending && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: PASSAGE_COLOR,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />
      )}
    </div>
  );
}

export const PassageNode = memo(PassageNodeComponent);
