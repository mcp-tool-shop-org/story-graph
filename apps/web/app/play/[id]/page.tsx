"use client";

import { useEffect, useState } from 'react';
import type { RuntimeFrame, RuntimeSnapshot } from '@storygraph/core';

type PlayResponse = { frame: RuntimeFrame; state: RuntimeSnapshot; versionId: string };

export default function PlayPage({ params }: { params: { id: string } }): JSX.Element {
  const [frame, setFrame] = useState<RuntimeFrame | null>(null);
  const [state, setState] = useState<RuntimeSnapshot | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${params.id}/play/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as PlayResponse & { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed to start');
      setFrame(data.frame);
      setState(data.state);
      setVersionId(data.versionId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function makeChoice(target: string) {
    if (!state) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${params.id}/play/choose`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target, state, versionId }),
      });
      const data = (await res.json()) as PlayResponse & { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Failed to choose');
      setFrame(data.frame);
      setState(data.state);
      setVersionId(data.versionId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="play-view">
      <header>
        <h1>StoryGraph Player</h1>
        <div className="status">
          <span>ID: {params.id}</span>
          {versionId ? <span>version: {versionId.slice(0, 8)}</span> : null}
          {loading ? <span>Loading…</span> : null}
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {frame ? (
        <section className="frame">
          <p className="text">{frame.text}</p>
          <div className="choices">
            {frame.choices.length === 0 ? <span className="muted">No choices</span> : null}
            {frame.choices.map((choice) => (
              <button key={choice.id} onClick={() => makeChoice(choice.target)} disabled={loading}>
                {choice.text}
              </button>
            ))}
          </div>
          <div className="debug">
            <h3>State</h3>
            <pre>{JSON.stringify(frame.variables, null, 2)}</pre>
            <h3>Events</h3>
            <pre>{JSON.stringify(frame.events, null, 2)}</pre>
          </div>
        </section>
      ) : (
        <p className="muted">Press start to begin.</p>
      )}

      <div className="actions">
        <button onClick={startGame} disabled={loading}>
          Restart
        </button>
      </div>
    </main>
  );
}
