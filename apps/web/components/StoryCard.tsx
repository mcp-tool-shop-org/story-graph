'use client';

import Link from 'next/link';

export interface StoryCardData {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  version: number;
  latestVersionId: string;
}

interface StoryCardProps {
  story: StoryCardData;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function StoryCard({ story }: StoryCardProps) {
  return (
    <div className="story-card">
      <div className="story-card-header">
        <h3 className="story-card-title">{story.title}</h3>
        <span className="story-card-version">v{story.version}</span>
      </div>
      <div className="story-card-meta">
        <span className="muted">Updated {formatRelativeTime(story.updatedAt)}</span>
      </div>
      <div className="story-card-actions">
        <Link href={`/edit/${story.id}`} className="btn btn-primary">
          Edit
        </Link>
        <Link href={`/play/${story.id}`} className="btn btn-secondary">
          Play
        </Link>
      </div>
    </div>
  );
}
