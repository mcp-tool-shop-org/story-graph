"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Story,
  parseToStory,
  validateStory,
  type Issue,
  type StoryNode,
} from '@storygraph/core';

const SAMPLE_STORY = `version: "1.0"
meta:
  title: "Web Editor Demo"
nodes:
  start:
    type: passage
    start: true
    content: |
      This is the live YAML editor. Edit and see validation update.
    choices:
      - text: "Go next"
        target: next
  next:
    type: passage
    content: |
      End here.
    ending: true
`;

type ParsedStory = {
  story: Story | null;
  issues: Issue[];
  parseError?: string;
};

export default function Page(): JSX.Element {
  const [yaml, setYaml] = useState(SAMPLE_STORY);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedStory>({ story: null, issues: [] });

  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        const story = parseToStory(yaml);
        const validation = validateStory(story);
        setParsed({ story, issues: validation.issues });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setParsed({ story: null, issues: [], parseError: message });
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [yaml]);

  const nodes = useMemo(() => parsed.story?.getAllNodes() ?? [], [parsed.story]);
  const mapLayout = useMemo(() => buildMapLayout(parsed.story), [parsed.story]);

  return (
    <main>
      <div className="badge">
        <span>Phase 3</span>
        <span>YAML-first editor + live validation</span>
      </div>
      <h1>StoryGraph Web</h1>

      <div className="layout">
        <section className="panel">
          <header>
            <h2>YAML Editor</h2>
            <span className="muted">Live-validated against core schemas</span>
          </header>
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            spellCheck={false}
            className="editor"
          />
        </section>

        <section className="panel">
          <header>
            <h2>Validation</h2>
            <span className="muted">Parse + structural checks</span>
          </header>
          {parsed.parseError ? (
            <div className="alert error">{parsed.parseError}</div>
          ) : parsed.issues.length === 0 ? (
            <div className="alert success">No issues found.</div>
          ) : (
            <ul className="issues">
              {parsed.issues.map((issue) => (
                <li key={`${issue.code}-${issue.nodeId ?? 'global'}`}>
                  <span className={`pill ${issue.severity}`}>{issue.severity}</span>
                  <strong>{issue.code}</strong> {issue.message}
                  {issue.nodeId ? <span className="muted"> [{issue.nodeId}]</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="layout">
        <section className="panel">
          <header>
            <h2>Nodes</h2>
            <span className="muted">Filter and jump</span>
          </header>
          <NodeList
            nodes={nodes}
            selectedId={selectedNodeId}
            onSelect={setSelectedNodeId}
          />
        </section>

        <section className="panel">
          <header>
            <h2>Graph Map</h2>
            <span className="muted">Read-only layout from start</span>
          </header>
          <GraphMap layout={mapLayout} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
        </section>
      </div>
    </main>
  );
}

function useFilteredNodes(nodes: StoryNode[], selectedId: string | null): StoryNode[] {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('all');

  const filtered = useMemo(() => {
    return nodes.filter((node) => {
      const matchesQuery = query.length === 0 || node.id.toLowerCase().includes(query.toLowerCase());
      const matchesType = type === 'all' || node.type === type;
      return matchesQuery && matchesType;
    });
  }, [nodes, query, type]);

  return Object.assign(filtered, { query, setQuery, type, setType, selectedId });
}

function NodeList({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: StoryNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const filtered = useMemo(() => {
    return nodes.filter((node) => {
      const matchesQuery = query.length === 0 || node.id.toLowerCase().includes(query.toLowerCase());
      const matchesType = type === 'all' || node.type === type;
      return matchesQuery && matchesType;
    });
  }, [nodes, query, type]);

  return (
    <div className="node-list">
      <div className="node-filters">
        <input
          placeholder="Search by id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="passage">passage</option>
          <option value="choice">choice</option>
          <option value="condition">condition</option>
          <option value="variable">variable</option>
          <option value="include">include</option>
          <option value="comment">comment</option>
        </select>
      </div>
      <ul>
        {filtered.map((node) => (
          <li
            key={node.id}
            className={node.id === selectedId ? 'selected' : ''}
            onClick={() => onSelect(node.id)}
          >
            <span className={`pill subtle`}>{node.type}</span>
            <span>{node.id}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type MapLayout = {
  nodes: Array<{ id: string; type: string; x: number; y: number }>;
  edges: Array<{ from: string; to: string }>;
};

function buildMapLayout(story: Story | null): MapLayout {
  if (!story) return { nodes: [], edges: [] };
  const start = story.getStartNode();
  const startId = start?.id ?? story.getAllNodeIds()[0];
  const levels = new Map<string, number>();
  const queue: string[] = startId ? [startId] : [];
  let idx = 0;

  while (idx < queue.length) {
    const current = queue[idx++];
    const level = levels.get(current) ?? 0;
    const outgoing = story.getOutgoingEdges(current);
    for (const edge of outgoing) {
      if (!levels.has(edge.target)) {
        levels.set(edge.target, level + 1);
        queue.push(edge.target);
      }
    }
  }

  const positioned = story.getAllNodes().map((node, idx) => {
    const yLevel = levels.get(node.id) ?? 0;
    const offset = hashOffset(node.id + idx.toString());
    return { id: node.id, type: node.type, x: yLevel * 220, y: yLevel * 80 + offset };
  });

  const edges = story.getEdges().map((e) => ({ from: e.source, to: e.target }));
  return { nodes: positioned, edges };
}

function hashOffset(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 30);
}

function GraphMap({
  layout,
  selectedId,
  onSelect,
}: {
  layout: MapLayout;
  selectedId: string | null;
  onSelect: (id: string) => void;
}): JSX.Element {
  if (layout.nodes.length === 0) {
    return <div className="muted">No nodes to display.</div>;
  }

  return (
    <div className="map">
      <svg width="100%" height="280" viewBox="0 0 800 280">
        {layout.edges.map((edge) => {
          const from = layout.nodes.find((n) => n.id === edge.from);
          const to = layout.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x + 40}
              y1={from.y + 20}
              x2={to.x + 40}
              y2={to.y + 20}
              stroke="rgba(148,163,184,0.5)"
              strokeWidth={2}
            />
          );
        })}
        {layout.nodes.map((node) => (
          <g key={node.id} onClick={() => onSelect(node.id)}>
            <rect
              x={node.x}
              y={node.y}
              rx={8}
              ry={8}
              width={80}
              height={40}
              fill={node.id === selectedId ? '#34d399' : '#1f2937'}
              stroke="rgba(148,163,184,0.6)"
              strokeWidth={1.5}
            />
            <text x={node.x + 40} y={node.y + 23} textAnchor="middle" fill="#e2e8f0" fontSize="11">
              {node.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
