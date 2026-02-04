'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { VersionHistory } from '../../../../components/VersionHistory';

interface StoryData {
  id: string;
  title: string;
  version: number;
  latestVersionId: string;
}

export default function VersionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);

  // Fetch story metadata
  useEffect(() => {
    async function fetchStory() {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Story not found');
          } else {
            setError(`Failed to load story: ${response.status}`);
          }
          return;
        }

        const data = await response.json();
        setStory(data.story);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    }

    fetchStory();
  }, [storyId]);

  // Handle revert to previous version
  const handleRevert = useCallback(
    async (_versionId: string, content: string) => {
      if (!story) return;

      const confirmed = window.confirm(
        'Are you sure you want to revert to this version? This will create a new version with the old content.'
      );

      if (!confirmed) return;

      setReverting(true);

      try {
        const response = await fetch(`/api/stories/${storyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            expectedVersionId: story.latestVersionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to revert: ${response.status}`);
        }

        // Navigate back to editor
        router.push(`/edit/${storyId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revert');
        setReverting(false);
      }
    },
    [story, storyId, router]
  );

  if (loading) {
    return (
      <main>
        <div className="version-page-loading">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="version-page-error">
          <h2>Error</h2>
          <p>{error}</p>
          <Link href="/" className="btn btn-secondary">
            Back to Stories
          </Link>
        </div>
      </main>
    );
  }

  if (!story) {
    return null;
  }

  return (
    <main>
      <div className="version-page-header">
        <div className="version-page-header-left">
          <Link href={`/edit/${storyId}`} className="btn btn-secondary btn-small">
            ← Back to Editor
          </Link>
          <h1>Version History</h1>
        </div>
        <div className="version-page-header-right">
          <span className="muted">{story.title}</span>
          <span className="editor-version">v{story.version}</span>
        </div>
      </div>

      {reverting && (
        <div className="alert info">
          <div className="spinner-small" />
          <span>Reverting...</span>
        </div>
      )}

      <div className="version-page-content">
        <VersionHistory
          storyId={storyId}
          currentVersionId={story.latestVersionId}
          onRevert={handleRevert}
        />
      </div>
    </main>
  );
}
