'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { RuntimeFrame, RuntimeSnapshot } from '@storygraph/core';
import { VariablePanel } from '../../../components/VariablePanel';
import { EventLog } from '../../../components/EventLog';

type PlayResponse = { frame: RuntimeFrame; state: RuntimeSnapshot; versionId: string };

interface RuntimeEvent {
  type: string;
  nodeId?: string | undefined;
  timestamp?: number | undefined;
  data?: Record<string, unknown> | undefined;
}

interface SavedGame {
  id: string;
  name: string;
  savedAt: string;
  state: RuntimeSnapshot;
  versionId: string;
}

export default function PlayPage() {
  const params = useParams();
  const storyId = params.id as string;

  const [frame, setFrame] = useState<RuntimeFrame | null>(null);
  const [state, setState] = useState<RuntimeSnapshot | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState<string>('Story');
  const [eventLog, setEventLog] = useState<RuntimeEvent[]>([]);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Load saved games from localStorage
  useEffect(() => {
    const key = `storygraph-saves-${storyId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setSavedGames(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, [storyId]);

  // Fetch story title
  useEffect(() => {
    fetch(`/api/stories/${storyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.story?.title) {
          setStoryTitle(data.story.title);
        }
      })
      .catch(() => {
        // Ignore errors
      });
  }, [storyId]);

  const addEvent = useCallback((type: string, nodeId?: string, data?: Record<string, unknown>) => {
    setEventLog((prev) => [
      ...prev,
      {
        type,
        nodeId,
        data,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const startGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEventLog([]);

    try {
      const res = await fetch(`/api/stories/${storyId}/play/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as PlayResponse & { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed to start');

      setFrame(data.frame);
      setState(data.state);
      setVersionId(data.versionId);

      addEvent('game_start');
      if (data.frame.nodeId) {
        addEvent('node_enter', data.frame.nodeId);
      }
    } catch (err) {
      setError((err as Error).message);
      addEvent('error', undefined, { message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [storyId, addEvent]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const makeChoice = async (target: string, choiceText: string) => {
    if (!state) return;
    setLoading(true);
    setError(null);

    addEvent('choice_made', frame?.nodeId, { target, text: choiceText });

    try {
      const res = await fetch(`/api/stories/${storyId}/play/choose`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target, state, versionId }),
      });
      const data = (await res.json()) as PlayResponse & { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed to choose');

      setFrame(data.frame);
      setState(data.state);
      setVersionId(data.versionId);

      addEvent('node_enter', data.frame.nodeId);

      if (data.frame.choices.length === 0) {
        addEvent('story_end', data.frame.nodeId);
      }
    } catch (err) {
      setError((err as Error).message);
      addEvent('error', undefined, { message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGame = () => {
    if (!state || !versionId || !saveName.trim()) return;

    const newSave: SavedGame = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      savedAt: new Date().toISOString(),
      state,
      versionId,
    };

    const updated = [...savedGames, newSave];
    setSavedGames(updated);
    localStorage.setItem(`storygraph-saves-${storyId}`, JSON.stringify(updated));

    addEvent('game_saved', undefined, { name: saveName.trim() });
    setShowSaveModal(false);
    setSaveName('');
  };

  const handleLoadGame = async (save: SavedGame) => {
    setLoading(true);
    setError(null);

    try {
      // Resume from saved state
      const res = await fetch(`/api/stories/${storyId}/play/choose`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: save.state.currentNodeId,
          state: save.state,
          versionId: save.versionId,
        }),
      });
      const data = (await res.json()) as PlayResponse & { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed to load');

      setFrame(data.frame);
      setState(data.state);
      setVersionId(data.versionId);

      addEvent('game_loaded', undefined, { name: save.name });
      setShowLoadModal(false);
    } catch (err) {
      setError((err as Error).message);
      addEvent('error', undefined, { message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSave = (saveId: string) => {
    const updated = savedGames.filter((s) => s.id !== saveId);
    setSavedGames(updated);
    localStorage.setItem(`storygraph-saves-${storyId}`, JSON.stringify(updated));
  };

  const formatSaveDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <main className="play-page">
      <header className="play-header">
        <div className="play-header-left">
          <Link href="/" className="btn btn-secondary btn-small">
            ← Back
          </Link>
          <h1 className="play-title">{storyTitle}</h1>
        </div>
        <div className="play-header-right">
          {versionId && <span className="play-version">v{versionId.slice(0, 8)}</span>}
          {loading && <span className="play-loading">Loading...</span>}
        </div>
      </header>

      {error && (
        <div className="alert error play-error">
          {error}
          <button onClick={() => setError(null)} className="btn btn-small btn-secondary">
            Dismiss
          </button>
        </div>
      )}

      <div className="play-layout">
        <div className="play-main">
          {frame ? (
            <section className="play-frame">
              <div className="play-text">{frame.text}</div>

              {frame.choices.length === 0 ? (
                <div className="play-ending">
                  <p className="play-ending-text">The End</p>
                  <button onClick={startGame} className="btn btn-primary">
                    Play Again
                  </button>
                </div>
              ) : (
                <div className="play-choices">
                  {frame.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => makeChoice(choice.target, choice.text)}
                      disabled={loading}
                      className="play-choice"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="play-start">
              <p className="muted">Loading story...</p>
            </div>
          )}

          <div className="play-actions">
            <button onClick={startGame} disabled={loading} className="btn btn-secondary">
              Restart
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={loading || !state}
              className="btn btn-secondary"
            >
              Save Game
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              disabled={loading || savedGames.length === 0}
              className="btn btn-secondary"
            >
              Load Game
            </button>
            <Link href={`/edit/${storyId}`} className="btn btn-secondary">
              Edit Story
            </Link>
          </div>
        </div>

        <aside className="play-sidebar">
          <VariablePanel variables={frame?.variables ?? {}} />
          <EventLog events={eventLog} maxEvents={100} />
        </aside>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Save Game</h2>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter save name..."
                className="settings-input"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveGame}
                disabled={!saveName.trim()}
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2 className="modal-title">Load Game</h2>
            </div>
            <div className="modal-body">
              {savedGames.length === 0 ? (
                <p className="muted">No saved games</p>
              ) : (
                <ul className="save-list">
                  {savedGames.map((save) => (
                    <li key={save.id} className="save-item">
                      <div className="save-info">
                        <span className="save-name">{save.name}</span>
                        <span className="save-date">{formatSaveDate(save.savedAt)}</span>
                      </div>
                      <div className="save-actions">
                        <button
                          onClick={() => handleLoadGame(save)}
                          className="btn btn-primary btn-small"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteSave(save.id)}
                          className="btn btn-secondary btn-small"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowLoadModal(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
