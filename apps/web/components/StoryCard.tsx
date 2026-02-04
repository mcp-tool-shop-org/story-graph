'use client';

import Link from 'next/link';

export interface StoryCardData {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  version: number;
  latestVersionId: string;
  content?: string; // For preview text extraction
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
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString();
}

// Extract a preview from the story content
function extractPreview(content?: string): string | null {
  if (!content) return null;

  // Try to find first passage content
  const contentMatch = content.match(/content:\s*\|?\s*\n?\s*([\s\S]*?)(?=\n\s*\w+:|$)/);
  if (contentMatch) {
    const text = contentMatch[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('-'))
      .join(' ')
      .slice(0, 120);
    return text ? text + (text.length >= 120 ? '...' : '') : null;
  }
  return null;
}

export function StoryCard({ story }: StoryCardProps) {
  const preview = extractPreview(story.content);

  return (
    <article className="story-card">
      <div className="story-card-header">
        <h3 className="story-card-title">{story.title}</h3>
        <span className="story-card-version">v{story.version}</span>
      </div>

      {preview && <p className="story-card-preview">{preview}</p>}

      <div className="story-card-meta">
        <div className="story-card-meta-row">
          <span className="story-card-meta-item">
            <span className="story-card-meta-icon">📝</span>
            {formatRelativeTime(story.updatedAt)}
          </span>
          <span className="story-card-meta-divider">•</span>
          <span className="story-card-meta-item">
            <span className="story-card-meta-icon">🔄</span>
            {story.version} revision{story.version > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="story-card-actions">
        <Link href={`/edit/${story.id}`} className="btn btn-primary btn-card">
          Edit
        </Link>
        <Link href={`/play/${story.id}`} className="btn btn-secondary btn-card">
          Play
        </Link>
      </div>
    </article>
  );
}

// Skeleton card for loading states
export function StoryCardSkeleton() {
  return (
    <article className="story-card-skeleton">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-preview" />
      <div className="skeleton-line skeleton-preview-short" />
      <div className="skeleton-meta">
        <div className="skeleton-line skeleton-meta-item" />
        <div className="skeleton-line skeleton-meta-item" />
      </div>
      <div className="skeleton-actions">
        <div className="skeleton-line skeleton-btn" />
        <div className="skeleton-line skeleton-btn" />
      </div>
    </article>
  );
}
