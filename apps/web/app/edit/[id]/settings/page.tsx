'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StorySettings } from '../../../../components/StorySettings';

interface StoryData {
  id: string;
  title: string;
  content: string;
  version: number;
  latestVersionId: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch story
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

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      if (!story) return;

      // Update title in content's meta section
      // This is a simple implementation - in production, you'd want to
      // properly parse and modify the YAML
      const updatedContent = story.content.replace(
        /title:\s*["']?[^"'\n]+["']?/,
        `title: "${newTitle}"`
      );

      try {
        const response = await fetch(`/api/stories/${storyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: updatedContent,
            expectedVersionId: story.latestVersionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update title: ${response.status}`);
        }

        const data = await response.json();
        setStory(data.story);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update title');
      }
    },
    [story, storyId]
  );

  const handleDelete = useCallback(() => {
    // Navigate to home after delete
    router.push('/');
  }, [router]);

  const handleFork = useCallback(() => {
    // The StorySettings component handles navigation to the new fork
  }, []);

  if (loading) {
    return (
      <main>
        <div className="settings-page-loading">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="settings-page-error">
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
      <div className="settings-page-header">
        <div className="settings-page-header-left">
          <Link href={`/edit/${storyId}`} className="btn btn-secondary btn-small">
            ← Back to Editor
          </Link>
          <h1>Story Settings</h1>
        </div>
        <div className="settings-page-header-right">
          <span className="muted">{story.title}</span>
          <span className="editor-version">v{story.version}</span>
        </div>
      </div>

      <div className="settings-page-content">
        <StorySettings
          storyId={storyId}
          title={story.title}
          onTitleChange={handleTitleChange}
          onDelete={handleDelete}
          onFork={handleFork}
        />
      </div>
    </main>
  );
}
