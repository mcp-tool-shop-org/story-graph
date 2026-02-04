'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  loadRuntimeFromContent,
  start,
  choose,
  snapshot,
  hydrate,
  type RuntimeFrame,
  type RuntimeSnapshot,
} from '@storygraph/core';
import { VariablePanel } from '../../../components/VariablePanel';
import { EventLog } from '../../../components/EventLog';
import { DEMO_STORY_YAML } from '../../../lib/demo-story';

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
}

export default function DemoPlayPage() {
  const [runtime, setRuntime] = useState<ReturnType<typeof loadRuntimeFromContent> | null>(null);
  const [frame, setFrame] = useState<RuntimeFrame | null>(null);
  const [state, setState] = useState<RuntimeSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<RuntimeEvent[]>([]);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Load saved games from localStorage
  useEffect(() => {
    const key = 'storygraph-demo-saves';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setSavedGames(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const addEvent = useCallback((type: string, nodeId?: string, data?: Record<string, unknown>) => {
    setEventLog((prev) => [...prev, { type, nodeId, data, timestamp: Date.now() }]);
  }, []);

  const startGame = useCallback(() => {
    setLoading(true);
    setError(null);
    setEventLog([]);

    try {
      const rt = loadRuntimeFromContent(DEMO_STORY_YAML);
      const result = start(rt);

      if (result.error || !result.frame) {
        throw new Error(result.error?.message ?? 'Failed to start');
      }

      setRuntime(rt);
      setFrame(result.frame);
      setState(snapshot(rt));
      addEvent('game_start');
      addEvent('node_enter', result.frame.nodeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }, [addEvent]);

  const makeChoice = useCallback(
    (choiceIndex: number) => {
      if (!runtime || !frame) return;

      setLoading(true);
      setError(null);

      try {
        const choice = frame.choices[choiceIndex];
        if (!choice) {
          throw new Error('Invalid choice');
        }

        addEvent('choice_made', frame.nodeId, { choiceIndex, choiceText: choice.text });

        const result = choose(runtime, choice.target);

        if (result.error || !result.frame) {
          throw new Error(result.error?.message ?? 'Invalid choice');
        }

        setFrame(result.frame);
        setState(snapshot(runtime));

        if (result.frame.ending) {
          addEvent('story_end', result.frame.nodeId);
        } else {
          addEvent('node_enter', result.frame.nodeId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to make choice');
      } finally {
        setLoading(false);
      }
    },
    [runtime, frame, addEvent]
  );

  const handleSaveGame = useCallback(() => {
    if (!state) return;

    const newSave: SavedGame = {
      id: crypto.randomUUID(),
      name: saveName || `Save ${new Date().toLocaleString()}`,
      savedAt: new Date().toISOString(),
      state,
    };

    const newSaves = [...savedGames, newSave];
    setSavedGames(newSaves);
    localStorage.setItem('storygraph-demo-saves', JSON.stringify(newSaves));

    setShowSaveModal(false);
    setSaveName('');
    addEvent('game_saved', undefined, { saveName: newSave.name });
  }, [state, savedGames, saveName, addEvent]);

  const handleLoadGame = useCallback(
    (save: SavedGame) => {
      try {
        // Hydrate creates a new runtime from story + snapshot
        const baseRt = loadRuntimeFromContent(DEMO_STORY_YAML);
        const rt = hydrate(baseRt.story, save.state);

        // Navigate to the saved node to get the current frame
        const result = start(rt, save.state.currentNodeId ?? undefined);

        if (result.error || !result.frame) {
          throw new Error('Failed to restore game state');
        }

        setRuntime(rt);
        setFrame(result.frame);
        setState(snapshot(rt));
        setShowLoadModal(false);
        addEvent('game_loaded', undefined, { saveName: save.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load save');
      }
    },
    [addEvent]
  );

  const handleDeleteSave = useCallback(
    (saveId: string) => {
      const newSaves = savedGames.filter((s) => s.id !== saveId);
      setSavedGames(newSaves);
      localStorage.setItem('storygraph-demo-saves', JSON.stringify(newSaves));
    },
    [savedGames]
  );

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // Format variables for display
  const variables: Record<string, string | number | boolean> = {};
  if (state?.variables) {
    for (const [key, value] of Object.entries(state.variables)) {
      variables[key] = value as string | number | boolean;
    }
  }

  return (
    <main className="play-page">
      <header className="play-header">
        <div className="play-header-left">
          <Link href="/" className="btn btn-secondary btn-small">
            ← Back
          </Link>
          <h1 className="play-title">The Enchanted Forest</h1>
          <span className="play-version">Demo Story</span>
        </div>
        <div className="play-header-right">
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
          {!frame && !loading && (
            <div className="play-start panel">
              <h2>The Enchanted Forest</h2>
              <p className="muted" style={{ margin: '16px 0' }}>
                A demo story showcasing StoryGraph features: branching paths, variables, conditions,
                and multiple endings.
              </p>
              <p className="text-subtle text-sm" style={{ margin: '16px 0' }}>
                Your choices shape the story. Will you find courage, wisdom, or perhaps both on your
                journey?
              </p>
              <button onClick={startGame} className="btn btn-primary btn-large">
                Begin Your Adventure
              </button>
            </div>
          )}

          {frame && (
            <div className="play-frame panel">
              <div className="play-text">{frame.text}</div>

              {frame.ending ? (
                <div className="play-ending">
                  <p className="play-ending-text">— The End —</p>
                  <div className="play-actions">
                    <button onClick={restartGame} className="btn btn-primary">
                      Play Again
                    </button>
                    <Link href="/" className="btn btn-secondary">
                      Back to Stories
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="play-choices">
                  {frame.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => makeChoice(idx)}
                      disabled={loading}
                      className="play-choice"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {frame && !frame.ending && (
            <div className="play-actions">
              <button
                onClick={() => setShowSaveModal(true)}
                className="btn btn-secondary"
                disabled={!state}
              >
                Save Game
              </button>
              <button
                onClick={() => setShowLoadModal(true)}
                className="btn btn-secondary"
                disabled={savedGames.length === 0}
              >
                Load Game
              </button>
              <button onClick={restartGame} className="btn btn-secondary">
                Restart
              </button>
            </div>
          )}
        </div>

        <div className="play-sidebar">
          <VariablePanel variables={variables} />
          <EventLog events={eventLog} />
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Save Game</h2>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Save name (optional)"
                className="settings-input"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveGame} className="btn btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Load Game</h2>
            </div>
            <div className="modal-body">
              {savedGames.length === 0 ? (
                <p className="muted">No saved games found.</p>
              ) : (
                <ul className="save-list">
                  {savedGames.map((save) => (
                    <li key={save.id} className="save-item">
                      <div className="save-info">
                        <span className="save-name">{save.name}</span>
                        <span className="save-date">{new Date(save.savedAt).toLocaleString()}</span>
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
                          className="btn btn-danger btn-small"
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
