'use client';

import { useState, useCallback } from 'react';
import { ConfirmModal } from './ConfirmModal';

interface StorySettingsProps {
  storyId: string;
  title: string;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onFork: () => void;
}

/**
 * Story settings panel for editing title, deleting, and forking.
 */
export function StorySettings({
  storyId,
  title,
  onTitleChange,
  onDelete,
  onFork,
}: StorySettingsProps) {
  const [editedTitle, setEditedTitle] = useState(title);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = editedTitle !== title;

  const handleSaveTitle = useCallback(async () => {
    if (!hasChanges) return;
    setError(null);

    try {
      // Note: Title updates go through the content's meta section
      // For now, just call the callback - parent will handle the update
      onTitleChange(editedTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update title');
    }
  }, [editedTitle, hasChanges, onTitleChange]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete story: ${response.status}`);
      }

      setShowDeleteModal(false);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete story');
      setIsDeleting(false);
    }
  }, [storyId, onDelete]);

  const handleFork = useCallback(async () => {
    setIsForking(true);
    setError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to fork story: ${response.status}`);
      }

      const data = await response.json();
      onFork();

      // Navigate to the new forked story
      window.location.href = `/edit/${data.story.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fork story');
      setIsForking(false);
    }
  }, [storyId, onFork]);

  return (
    <div className="story-settings">
      {error && (
        <div className="alert error settings-error">
          {error}
          <button onClick={() => setError(null)} className="btn btn-small btn-secondary">
            Dismiss
          </button>
        </div>
      )}

      <section className="settings-section">
        <h3>Story Title</h3>
        <div className="settings-field">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Enter story title"
            className="settings-input"
          />
          <button
            onClick={handleSaveTitle}
            disabled={!hasChanges}
            className="btn btn-primary btn-small"
          >
            Update Title
          </button>
        </div>
        <p className="settings-hint">
          The title is also stored in the YAML meta section. Changing it here will update both.
        </p>
      </section>

      <section className="settings-section">
        <h3>Fork Story</h3>
        <p className="settings-description">
          Create a copy of this story with a new ID. The forked story will start fresh with version
          1 and its own version history.
        </p>
        <button onClick={handleFork} disabled={isForking} className="btn btn-secondary">
          {isForking ? 'Creating fork...' : 'Fork Story'}
        </button>
      </section>

      <section className="settings-section settings-danger">
        <h3>Danger Zone</h3>
        <p className="settings-description">
          Once you delete a story, there is no going back. Please be certain.
        </p>
        <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
          Delete Story
        </button>
      </section>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Story"
        message={`Are you sure you want to delete "${title}"? This action cannot be undone and all version history will be lost.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
