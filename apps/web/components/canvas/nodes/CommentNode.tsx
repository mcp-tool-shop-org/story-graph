'use client';

import { memo } from 'react';

interface CommentNodeProps {
  data: {
    label: string;
    storyNode: {
      id: string;
      type: 'comment';
      comment?: string;
    };
  };
  selected?: boolean;
}

const COMMENT_COLOR = '#fbbf24'; // yellow

function CommentNodeComponent({ data, selected }: CommentNodeProps) {
  const { storyNode } = data;
  const comment = storyNode.comment ?? '';
  const truncated = comment.length > 80 ? comment.slice(0, 80) + '...' : comment;

  return (
    <div
      className="story-node"
      style={{
        backgroundColor: selected ? COMMENT_COLOR : `${COMMENT_COLOR}22`,
        borderColor: COMMENT_COLOR,
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 240,
        opacity: 0.7,
        boxShadow: selected ? `0 0 0 2px ${COMMENT_COLOR}66` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: selected ? 'white' : COMMENT_COLOR,
          marginBottom: 4,
        }}
      >
        comment
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4, color: selected ? 'white' : '#e2e8f0' }}>
        {storyNode.id}
      </div>

      {truncated && (
        <div
          style={{
            fontSize: 11,
            fontStyle: 'italic',
            color: selected ? 'rgba(255,255,255,0.9)' : '#fcd34d',
            lineHeight: 1.4,
          }}
        >
          {truncated}
        </div>
      )}
    </div>
  );
}

export const CommentNode = memo(CommentNodeComponent);
