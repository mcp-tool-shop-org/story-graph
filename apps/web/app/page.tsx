import { Story, StoryService } from '@storygraph/core';

function createDemoSnapshot() {
  const story = Story.create('Demo StoryGraph Snapshot');
  story.setNode({
    id: 'start',
    type: 'passage',
    start: true,
    content: 'This is a placeholder node rendered from the core package.',
    choices: [{ text: 'Continue', target: 'end' }],
  });
  story.setNode({
    id: 'end',
    type: 'passage',
    ending: true,
    content: 'Future editor UI will render here.',
  });

  const service = new StoryService(story);
  return service.getSnapshot();
}

export default function Page(): JSX.Element {
  const snapshot = createDemoSnapshot();

  return (
    <main>
      <div className="badge">
        <span>Phase 2 scaffold</span>
        <span>Next.js 16 + React 19 (canary)</span>
      </div>
      <h1>StoryGraph Web</h1>
      <p>
        This minimal shell proves the web app can consume the core workspace package. The
        next step is wiring dynamic data, validation, and editor views.
      </p>

      <div className="grid">
        <div className="card">
          <strong>Story</strong>
          <div>Title: {snapshot.meta.title}</div>
          <div>Version: {snapshot.version}</div>
          <div>Nodes: {snapshot.nodes.length}</div>
          <div>Edges: {snapshot.edges.length}</div>
        </div>
        <div className="card">
          <strong>Next steps</strong>
          <ul>
            <li>Hook API routes for story CRUD + validation</li>
            <li>Add YAML editor + live validation panels</li>
            <li>Layer graph view as an optional map</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
