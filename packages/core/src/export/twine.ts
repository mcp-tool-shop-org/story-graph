import { addWarning, type ExportResult, type ExportWarning } from './types.js';
import { Story } from '../core/story.js';
import type { StoryNode } from '../core/nodes.js';

export interface TwineExportOptions {
  storyTitle?: string;
  tier?: 0 | 1 | 2;
}

interface PassageOut {
  name: string;
  text: string;
  tags?: string[];
}

/**
 * Export a StoryGraph story to a Twine Twee-like format.
 *
 * Tier 0 guarantees: passages, choices, start node, endings.
 * Tier 1 degradations: conditions flattened, variables ignored, includes flattened.
 */
export function exportTwine(story: Story, options: TwineExportOptions = {}): ExportResult {
  const warnings: ExportWarning[] = [];
  const passages: PassageOut[] = [];
  const tier = options.tier ?? 0;

  const allNodes = [...story.getAllNodes()].sort((a, b) => a.id.localeCompare(b.id));

  const start = story.getStartNode();
  if (!start) {
    addWarning(warnings, {
      code: 'TWN001',
      message: 'No start passage found; Twine export has no explicit entrypoint',
    });
  }

  // Build passages
  for (const node of allNodes) {
    switch (node.type) {
      case 'passage':
        passages.push(toPassage(node, warnings));
        break;
      case 'choice':
        passages.push(choiceToPassage(node, warnings));
        break;
      case 'condition':
        addWarning(warnings, {
          code: 'EXP004',
          message: `Condition '${node.id}' flattened to a note; logic not preserved`,
          nodeId: node.id,
        });
        passages.push(flattenedPassage(node));
        break;
      case 'variable':
        addWarning(warnings, {
          code: 'EXP005',
          message: `Variable node '${node.id}' ignored in Twine export`,
          nodeId: node.id,
        });
        passages.push(flattenedPassage(node));
        break;
      case 'include':
        addWarning(warnings, {
          code: 'EXP003',
          message: `Include '${node.id}' flattened; target path not preserved`,
          nodeId: node.id,
        });
        passages.push(flattenedPassage(node));
        break;
      case 'comment':
        addWarning(warnings, {
          code: 'EXP001',
          message: `Comment '${node.id}' dropped`,
          nodeId: node.id,
        });
        break;
    }
  }

  // Serialize to Twee (very small subset)
  const storyTitle = options.storyTitle ?? story.meta.title ?? 'StoryGraph Export';
  const sortedPassages = passages.sort((a, b) => a.name.localeCompare(b.name));
  const collision = findNameCollision(sortedPassages);
  if (collision) {
    addWarning(warnings, {
      code: 'TWN003',
      message: `Passage name collision after normalization: ${collision}`,
    });
  }

  const twee = buildTwee(storyTitle, sortedPassages);

  if (tier > 0 && warnings.length === 0) {
    addWarning(warnings, {
      code: 'EXP999',
      message: 'Tier > 0 requested but no warnings emitted; ensure feature coverage is correct',
    });
  }

  return {
    files: [
      {
        name: 'story.twee',
        contents: twee,
      },
    ],
    warnings,
  };
}

function toPassage(node: Extract<StoryNode, { type: 'passage' }>, warnings: ExportWarning[]): PassageOut {
  const lines: string[] = [];
  lines.push(node.content);
  if (node.choices) {
    for (const choice of node.choices) {
      const escaped = escapeLinkText(choice.text, warnings, node.id);
      lines.push(`[[${escaped}|${choice.target}]]`);
    }
  }
  return {
    name: node.id,
    text: lines.join('\n\n'),
  };
}

function choiceToPassage(node: Extract<StoryNode, { type: 'choice' }>, warnings: ExportWarning[]): PassageOut {
  const lines: string[] = [];
  if (node.prompt) {
    lines.push(node.prompt);
  }
  for (const choice of node.choices) {
    const escaped = escapeLinkText(choice.text, warnings, node.id);
    lines.push(`[[${escaped}|${choice.target}]]`);
  }
  return {
    name: node.id,
    text: lines.join('\n\n'),
  };
}

function flattenedPassage(node: StoryNode): PassageOut {
  return {
    name: node.id,
    text: `[[Continue|${findFirstChoice(node) ?? 'start'}]]`,
  };
}

function findFirstChoice(node: StoryNode): string | undefined {
  switch (node.type) {
    case 'condition':
      return node.ifTrue;
    case 'variable':
      return node.next;
    case 'include':
      return node.return;
    default:
      return undefined;
  }
}

function buildTwee(title: string, passages: PassageOut[]): string {
  const header = `:: StoryTitle
${title}
`;

  const body = passages
    .map((p) => `:: ${p.name}\n${p.text}`)
    .join('\n\n');

  return `${header}\n${body}\n`;
}

function escapeLinkText(text: string, warnings: ExportWarning[], nodeId: string): string {
  const escaped = text.replace(/([\[\]|])/g, '\\$1');
  if (escaped !== text) {
    addWarning(warnings, {
      code: 'TWN002',
      message: `Link text escaped for Twine compatibility in node '${nodeId}'`,
      nodeId,
    });
  }
  return escaped;
}

function findNameCollision(passages: PassageOut[]): string | null {
  const seen = new Set<string>();
  for (const p of passages) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return p.name;
    seen.add(key);
  }
  return null;
}
