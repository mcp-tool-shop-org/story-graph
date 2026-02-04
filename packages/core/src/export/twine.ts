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

  const allNodes = story.getAllNodes();

  // Build passages
  for (const node of allNodes) {
    switch (node.type) {
      case 'passage':
        passages.push(toPassage(node));
        break;
      case 'choice':
        passages.push(choiceToPassage(node));
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
  const twee = buildTwee(storyTitle, passages);

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

function toPassage(node: Extract<StoryNode, { type: 'passage' }>): PassageOut {
  const lines: string[] = [];
  lines.push(node.content);
  if (node.choices) {
    for (const choice of node.choices) {
      lines.push(`[[${choice.text}|${choice.target}]]`);
    }
  }
  return {
    name: node.id,
    text: lines.join('\n\n'),
  };
}

function choiceToPassage(node: Extract<StoryNode, { type: 'choice' }>): PassageOut {
  const lines: string[] = [];
  if (node.prompt) {
    lines.push(node.prompt);
  }
  for (const choice of node.choices) {
    lines.push(`[[${choice.text}|${choice.target}]]`);
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
