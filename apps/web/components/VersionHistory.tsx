'use client';

import { useState, useEffect } from 'react';

interface Version {
  versionId: string;
  version: number;
  createdAt: string;
  content?: string;
}

interface VersionHistoryProps {
  storyId: string;
  currentVersionId: string;
  onRevert?: (versionId: string, content: string) => void;
}

/**
 * Displays version history for a story with ability to view and revert.
 */
export function VersionHistory({ storyId, currentVersionId, onRevert }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch version list
  useEffect(() => {
    async function fetchVersions() {
      try {
        const response = await fetch(`/api/stories/${storyId}/versions`);
        if (!response.ok) {
          throw new Error(`Failed to load versions: ${response.status}`);
        }
        const data = await response.json();
        // Sort by version descending (newest first)
        const sorted = (data.versions as Version[]).sort((a, b) => b.version - a.version);
        setVersions(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions');
      } finally {
        setLoading(false);
      }
    }

    fetchVersions();
  }, [storyId]);

  // Fetch version content when selected
  const handleSelectVersion = async (version: Version) => {
    if (selectedVersion?.versionId === version.versionId) {
      setSelectedVersion(null);
      return;
    }

    // If we already have content, just select
    if (version.content) {
      setSelectedVersion(version);
      return;
    }

    // Fetch content
    setLoadingContent(true);
    try {
      const response = await fetch(`/api/stories/${storyId}/versions/${version.versionId}`);
      if (!response.ok) {
        throw new Error(`Failed to load version content: ${response.status}`);
      }
      const data = await response.json();
      const versionWithContent = { ...version, content: data.version.content };

      // Update in list
      setVersions((prev) =>
        prev.map((v) => (v.versionId === version.versionId ? versionWithContent : v))
      );
      setSelectedVersion(versionWithContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version content');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleRevert = () => {
    if (selectedVersion?.content && onRevert) {
      onRevert(selectedVersion.versionId, selectedVersion.content);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="version-history-loading">
        <div className="spinner" />
        <span>Loading version history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="version-history-error">
        <span className="alert error">{error}</span>
      </div>
    );
  }

  return (
    <div className="version-history">
      <div className="version-list">
        {versions.map((version) => {
          const isCurrent = version.versionId === currentVersionId;
          const isSelected = selectedVersion?.versionId === version.versionId;

          return (
            <div
              key={version.versionId}
              className={`version-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => handleSelectVersion(version)}
            >
              <div className="version-item-header">
                <span className="version-number">v{version.version}</span>
                {isCurrent && <span className="version-badge current">Current</span>}
              </div>
              <div className="version-item-meta">
                <span className="version-time" title={formatDate(version.createdAt)}>
                  {formatRelativeTime(version.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVersion && (
        <div className="version-preview">
          <div className="version-preview-header">
            <h3>Version {selectedVersion.version}</h3>
            <span className="muted">{formatDate(selectedVersion.createdAt)}</span>
          </div>

          {loadingContent ? (
            <div className="version-preview-loading">
              <div className="spinner-small" />
              <span>Loading content...</span>
            </div>
          ) : (
            <>
              <pre className="version-preview-content">{selectedVersion.content}</pre>

              {selectedVersion.versionId !== currentVersionId && onRevert && (
                <div className="version-preview-actions">
                  <button onClick={handleRevert} className="btn btn-primary">
                    Revert to this version
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {versions.length === 0 && (
        <div className="version-history-empty">
          <span className="muted">No version history available.</span>
        </div>
      )}
    </div>
  );
}
