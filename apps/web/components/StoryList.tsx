'use client';

import { useState, useEffect, useCallback } from 'react';
import { StoryCard, StoryCardSkeleton, type StoryCardData } from './StoryCard';

interface StoryListProps {
  initialStories?: StoryCardData[];
  onCreateStory?: () => void;
  onOpenDemo?: () => void;
}

interface StoryListResponse {
  stories: StoryCardData[];
  total: number;
  limit: number;
  offset: number;
}

export function StoryList({ initialStories, onCreateStory, onOpenDemo }: StoryListProps) {
  const [stories, setStories] = useState<StoryCardData[]>(initialStories ?? []);
  const [loading, setLoading] = useState(!initialStories);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('-updatedAt');
  const [total, setTotal] = useState(initialStories?.length ?? 0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchStories = useCallback(async (query: string, sort: string, page: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('sort', sort);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const response = await fetch(`/api/stories?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch stories: ${response.status}`);
      }

      const data: StoryListResponse = await response.json();
      setStories(data.stories);
      setTotal(data.total);
      setOffset(data.offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stories when search, sort, or page changes
  useEffect(() => {
    fetchStories(searchQuery, sortOrder, Math.floor(offset / limit));
  }, [searchQuery, sortOrder, fetchStories, offset]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOffset(0);
    fetchStories(searchQuery, sortOrder, 0);
  };

  const handleRefresh = () => {
    fetchStories(searchQuery, sortOrder, Math.floor(offset / limit));
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="story-list-container">
      <div className="story-list-header">
        <h2>My Stories</h2>
        <button onClick={handleRefresh} className="btn btn-secondary" disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <form onSubmit={handleSearch} className="story-list-filters">
        <input
          type="search"
          placeholder="Search stories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            setOffset(0);
          }}
          className="sort-select"
        >
          <option value="-updatedAt">Recently Updated</option>
          <option value="-createdAt">Recently Created</option>
          <option value="title">Title A-Z</option>
          <option value="-title">Title Z-A</option>
          <option value="updatedAt">Oldest Updated</option>
          <option value="createdAt">Oldest Created</option>
        </select>
      </form>

      {error && (
        <div className="alert error">
          {error}
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            style={{ marginLeft: '8px' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && stories.length === 0 && (
        <div className="story-list-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <StoryCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && stories.length === 0 && (
        <div className="story-list-empty">
          {searchQuery ? (
            <p className="muted">No stories found matching "{searchQuery}"</p>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📖</div>
              <h3 className="empty-state-title">Start Your First Story</h3>
              <p className="empty-state-description">
                Stories in StoryGraph are written in YAML and validated in real time.
                <br />
                Create branching narratives with choices, variables, and conditions.
              </p>
              <div className="empty-state-actions">
                <button onClick={onCreateStory} className="btn btn-primary btn-large">
                  Create Your First Story
                </button>
                <button onClick={onOpenDemo} className="btn btn-secondary btn-large">
                  Explore Demo Story
                </button>
              </div>
              <p className="empty-state-hint">
                Or press <kbd>Ctrl</kbd>+<kbd>N</kbd> to create a new story anytime
              </p>
            </div>
          )}
        </div>
      )}

      {stories.length > 0 && (
        <>
          <div className="story-list-grid">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="story-list-pagination">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages} ({total} stories)
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total || loading}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
