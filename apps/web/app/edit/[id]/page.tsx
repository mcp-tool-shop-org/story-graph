'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { parseToStory, validateStory, type Issue } from '@storygraph/core';
import { YamlEditor } from '../../../components/YamlEditor';
import { ValidationPanel } from '../../../components/ValidationPanel';
import { ValidationStatusBadge } from '../../../components/ValidationStatusBadge';
import { WhatsNext } from '../../../components/WhatsNext';

interface StoryData {
  id: string;
  title: string;
  content: string;
  version: number;
  latestVersionId: string;
  createdAt: string;
  updatedAt: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export default function EditStoryPage() {
  const params = useParams();
  const storyId = params.id as string;

  const [story, setStory] = useState<StoryData | null>(null);
  const [content, setContent] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [parseError, setParseError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  const validationRunRef = useRef(0);
  const latestVersionIdRef = useRef<string | null>(null);
  const validationPanelRef = useRef<HTMLDivElement>(null);

  // Scroll to validation panel when clicking status badge
  const scrollToValidation = useCallback(() => {
    validationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Fetch story on mount
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

        const data = (await response.json()) as { story: StoryData };
        setStory(data.story);
        setContent(data.story.content);
        latestVersionIdRef.current = data.story.latestVersionId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    }

    fetchStory();
  }, [storyId]);

  // Validate content with debounce
  useEffect(() => {
    const runId = ++validationRunRef.current;

    const timeout = setTimeout(() => {
      if (runId !== validationRunRef.current) return;

      try {
        const parsed = parseToStory(content);
        const result = validateStory(parsed);
        setIssues(result.issues);
        setParseError(undefined);
      } catch (err) {
        setIssues([]);
        setParseError(err instanceof Error ? err.message : String(err));
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [content]);

  // Track changes
  useEffect(() => {
    if (story) {
      setHasChanges(content !== story.content);
    }
  }, [content, story]);

  // Save story
  const handleSave = useCallback(async () => {
    if (!story || !hasChanges) return;

    setSaveStatus('saving');

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          expectedVersionId: latestVersionIdRef.current,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setSaveStatus('conflict');
          return;
        }
        throw new Error(`Save failed: ${response.status}`);
      }

      const data = (await response.json()) as { story: StoryData };
      setStory(data.story);
      latestVersionIdRef.current = data.story.latestVersionId;
      setHasChanges(false);
      setSaveStatus('saved');

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  }, [story, storyId, content, hasChanges]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (loading) {
    return (
      <main>
        <div className="editor-loading">
          <div className="spinner" />
          <span>Loading story...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="editor-error">
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
      <div className="editor-header">
        <div className="editor-header-left">
          <Link href="/" className="btn btn-secondary btn-small">
            ← Back
          </Link>
          <h1 className="editor-title">{story.title}</h1>
          <span className="editor-version">v{story.version}</span>
        </div>
        <div className="editor-header-right">
          <ValidationStatusBadge
            issues={issues}
            parseError={parseError}
            onClick={scrollToValidation}
          />
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && '✓ All saved!'}
            {saveStatus === 'error' && '✗ Could not save'}
            {saveStatus === 'conflict' && '⚠ Someone else edited this'}
            {saveStatus === 'idle' && hasChanges && 'You have unsaved changes'}
          </span>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="btn btn-primary"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <Link href={`/play/${storyId}`} className="btn btn-secondary">
            Play
          </Link>
        </div>
      </div>

      {saveStatus === 'conflict' && (
        <div className="alert error editor-conflict-alert">
          <strong>Heads up!</strong> Someone else edited this story while you were working. Refresh
          to see their changes, then you can re-apply yours.
          <button onClick={() => window.location.reload()} className="btn btn-secondary btn-small">
            Refresh Now
          </button>
        </div>
      )}

      <div className="editor-layout">
        <section className="editor-main">
          <div className="panel">
            <header>
              <h2>YAML Editor</h2>
              <span className="muted">Press Ctrl+S to save your work</span>
            </header>
            <YamlEditor value={content} onChange={setContent} />
          </div>
        </section>

        <aside className="editor-sidebar">
          <div className="panel" ref={validationPanelRef}>
            <header>
              <h2>Validation</h2>
            </header>
            <ValidationPanel issues={issues} parseError={parseError} />
          </div>

          <div className="panel">
            <header>
              <h2>Actions</h2>
            </header>
            <div className="editor-actions">
              <Link href={`/edit/${storyId}/versions`} className="btn btn-secondary btn-full">
                View Version History
              </Link>
              <Link href={`/edit/${storyId}/settings`} className="btn btn-secondary btn-full">
                Story Settings
              </Link>
            </div>
          </div>

          <WhatsNext
            context="editor"
            storyId={storyId}
            hasChanges={hasChanges}
            onAction={(action) => {
              if (action === 'save') handleSave();
            }}
          />
        </aside>
      </div>
    </main>
  );
}
