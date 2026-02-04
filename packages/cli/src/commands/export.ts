/**
 * Export command - exports a story to various formats
 */

import * as fs from 'node:fs';
import { parseToStory, type Story, type StoryNode } from '@storygraph/core';

export type ExportFormat = 'json' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  output?: string | undefined;
}

/**
 * Export a story to the specified format.
 */
export function exportStory(
  filePath: string,
  options: ExportOptions
): {
  content: string;
  outputPath: string | null;
} {
  // Read and parse
  const content = fs.readFileSync(filePath, 'utf-8');
  const story = parseToStory(content);

  let exported: string;
  switch (options.format) {
    case 'json':
      exported = exportToJson(story);
      break;
    case 'html':
      exported = exportToHtml(story);
      break;
    default:
      throw new Error(`Unknown format: ${options.format}`);
  }

  // Write if output path specified
  let outputPath: string | null = null;
  if (options.output) {
    fs.writeFileSync(options.output, exported, 'utf-8');
    outputPath = options.output;
  }

  return { content: exported, outputPath };
}

/**
 * Export story to JSON format.
 */
function exportToJson(story: Story): string {
  const data = {
    version: story.version,
    meta: story.meta,
    variables: Object.fromEntries(story.variables),
    nodes: story.getAllNodes().map((node) => ({
      ...node,
      position: undefined, // Strip position data for cleaner export
    })),
    edges: story.getEdges(),
    stats: {
      nodeCount: story.nodeCount,
      wordCount: story.getWordCount(),
      characterCount: story.getCharacterCount(),
      choiceCount: story.getChoiceCount(),
      endingCount: story.getEndingNodes().length,
    },
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Export story to HTML outline format.
 */
function exportToHtml(story: Story): string {
  const title = story.meta.title ?? 'Untitled Story';
  const author = story.meta.author ?? 'Unknown';
  const nodes = story.getAllNodes();
  const startNode = story.getStartNode();

  const nodeHtml = nodes
    .map((node) => {
      const isStart = node.id === startNode?.id;
      const isEnding = node.type === 'passage' && 'ending' in node && node.ending;
      const badges = [
        isStart ? '<span class="badge start">START</span>' : '',
        isEnding ? '<span class="badge ending">END</span>' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return `
    <div class="node ${node.type}" id="node-${node.id}">
      <h3>${escapeHtml(node.id)} ${badges}</h3>
      <p class="type">Type: ${node.type}</p>
      ${getNodeContent(node)}
      ${getNodeChoices(node)}
    </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Story Outline</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #1a1a2e; color: #eee; }
    h1 { color: #10b981; }
    h2 { color: #6ee7b7; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    h3 { color: #f0fdf4; margin-bottom: 0.5rem; }
    .meta { color: #94a3b8; margin-bottom: 2rem; }
    .node { background: #1e293b; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; border-left: 4px solid #334155; }
    .node.passage { border-left-color: #10b981; }
    .node.choice { border-left-color: #3b82f6; }
    .node.condition { border-left-color: #f59e0b; }
    .node.variable { border-left-color: #8b5cf6; }
    .type { color: #64748b; font-size: 0.875rem; margin: 0.25rem 0; }
    .content { background: #0f172a; padding: 1rem; border-radius: 0.25rem; margin: 0.5rem 0; white-space: pre-wrap; }
    .choices { margin-top: 0.5rem; }
    .choices li { margin: 0.25rem 0; }
    .choices a { color: #60a5fa; text-decoration: none; }
    .choices a:hover { text-decoration: underline; }
    .badge { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 0.25rem; }
    .badge.start { background: #10b981; color: #000; }
    .badge.ending { background: #ef4444; color: #fff; }
    .stats { background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-top: 2rem; }
    .stats dt { color: #94a3b8; }
    .stats dd { color: #10b981; font-weight: bold; margin-left: 0; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">By ${escapeHtml(author)}</p>

  <h2>Story Nodes (${nodes.length})</h2>
  ${nodeHtml}

  <h2>Statistics</h2>
  <dl class="stats">
    <dt>Total Nodes</dt><dd>${story.nodeCount}</dd>
    <dt>Word Count</dt><dd>${story.getWordCount().toLocaleString()}</dd>
    <dt>Character Count</dt><dd>${story.getCharacterCount().toLocaleString()}</dd>
    <dt>Choices</dt><dd>${story.getChoiceCount()}</dd>
    <dt>Endings</dt><dd>${story.getEndingNodes().length}</dd>
  </dl>

  <footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #334155; color: #64748b; font-size: 0.875rem;">
    Generated by <a href="https://github.com/mcp-tool-shop-org/StoryGraph" style="color: #10b981;">StoryGraph CLI</a>
  </footer>
</body>
</html>`;
}

function getNodeContent(node: StoryNode): string {
  if (node.type === 'passage' && 'content' in node && node.content) {
    return `<div class="content">${escapeHtml(node.content)}</div>`;
  }
  if (node.type === 'condition' && 'condition' in node && typeof node.condition === 'string') {
    return `<div class="content">if (${escapeHtml(node.condition)})</div>`;
  }
  return '';
}

function getNodeChoices(node: StoryNode): string {
  if (node.type !== 'passage' || !('choices' in node) || !node.choices?.length) {
    return '';
  }
  const items = node.choices
    .map((c) => `<li><a href="#node-${c.target}">${escapeHtml(c.text)}</a></li>`)
    .join('');
  return `<ul class="choices">${items}</ul>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
