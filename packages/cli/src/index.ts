#!/usr/bin/env node
/**
 * StoryGraph CLI
 *
 * Command-line interface for validating and working with .story files.
 */

import * as fs from 'node:fs';
import {
  parseToStory,
  validateStory,
  serializeWithHeader,
  Story,
  ParseError,
  ValidationError,
  type Issue,
} from '@storygraph/core';

// =============================================================================
// CLI Colors (ANSI)
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function color(text: string, ...codes: string[]): string {
  if (!process.stdout.isTTY) return text;
  return codes.join('') + text + colors.reset;
}

// =============================================================================
// Commands
// =============================================================================

/**
 * Validate a story file.
 */
async function validate(filePath: string): Promise<number> {
  console.log(color(`\nValidating: ${filePath}\n`, colors.cyan));

  // Read file
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (_error) {
    console.error(color(`Error: Cannot read file: ${filePath}`, colors.red));
    return 1;
  }

  // Parse
  let story: Story;
  try {
    story = parseToStory(content);
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(color(`Parse Error: ${error.message}`, colors.red));
      if (error.line !== undefined) {
        console.error(color(`  at line ${error.line + 1}`, colors.dim));
      }
    } else if (error instanceof ValidationError) {
      console.error(color(`Validation Error: ${error.message}`, colors.red));
      for (const issue of error.issues) {
        console.error(color(`  - ${issue.path}: ${issue.message}`, colors.dim));
      }
    } else {
      throw error;
    }
    return 1;
  }

  // Validate
  const result = validateStory(story);

  // Print results
  printValidationResult(result.issues, story);

  console.log(color(`\nValidation complete in ${result.durationMs.toFixed(2)}ms`, colors.dim));
  console.log(
    `  ${color(result.counts.error.toString(), colors.red)} errors, ` +
    `${color(result.counts.warning.toString(), colors.yellow)} warnings, ` +
    `${color(result.counts.info.toString(), colors.blue)} info`
  );

  if (result.valid) {
    console.log(color('\n✓ Story is valid!\n', colors.green, colors.bold));
    return 0;
  } else {
    console.log(color('\n✗ Story has errors.\n', colors.red, colors.bold));
    return 1;
  }
}

/**
 * Print validation issues grouped by severity.
 */
function printValidationResult(issues: Issue[], story: Story): void {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  if (errors.length > 0) {
    console.log(color('Errors:', colors.red, colors.bold));
    for (const issue of errors) {
      printIssue(issue);
    }
    console.log();
  }

  if (warnings.length > 0) {
    console.log(color('Warnings:', colors.yellow, colors.bold));
    for (const issue of warnings) {
      printIssue(issue);
    }
    console.log();
  }

  if (infos.length > 0) {
    console.log(color('Info:', colors.blue, colors.bold));
    for (const issue of infos) {
      printIssue(issue);
    }
    console.log();
  }

  // Print stats
  console.log(color('Statistics:', colors.cyan, colors.bold));
  console.log(`  Nodes: ${story.nodeCount}`);
  console.log(`  Words: ${story.getWordCount()}`);
  console.log(`  Choices: ${story.getChoiceCount()}`);
}

/**
 * Print a single issue.
 */
function printIssue(issue: Issue): void {
  const nodeRef = issue.nodeId ? color(` [${issue.nodeId}]`, colors.dim) : '';
  console.log(`  ${issue.code}${nodeRef}: ${issue.message}`);
}

/**
 * Create a new story file.
 */
async function create(title: string, outputPath: string): Promise<number> {
  console.log(color(`\nCreating new story: ${title}\n`, colors.cyan));

  // Create story
  const story = Story.create(title);

  // Add a sample start node
  story.setNode({
    id: 'start',
    type: 'passage',
    start: true,
    content: 'Your story begins here.\n\nEdit this passage to start writing your narrative.',
    choices: [
      { text: 'Continue...', target: 'next' },
    ],
  });

  story.setNode({
    id: 'next',
    type: 'passage',
    content: 'The next part of your story.',
    choices: [
      { text: 'Go back', target: 'start' },
      { text: 'End the story', target: 'ending' },
    ],
  });

  story.setNode({
    id: 'ending',
    type: 'passage',
    ending: true,
    content: 'The End.\n\nThank you for reading!',
  });

  // Serialize
  const yaml = serializeWithHeader(story);

  // Write file
  try {
    fs.writeFileSync(outputPath, yaml, 'utf-8');
  } catch (_error) {
    console.error(color(`Error: Cannot write file: ${outputPath}`, colors.red));
    return 1;
  }

  console.log(color(`✓ Created: ${outputPath}`, colors.green));
  console.log(color('\nNext steps:', colors.cyan));
  console.log('  1. Edit the file to add your story content');
  console.log('  2. Run: storygraph validate ' + outputPath);
  console.log();

  return 0;
}

/**
 * Show statistics for a story file.
 */
async function stats(filePath: string): Promise<number> {
  // Read and parse
  let story: Story;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    story = parseToStory(content);
  } catch (error) {
    console.error(color(`Error: ${error instanceof Error ? error.message : error}`, colors.red));
    return 1;
  }

  console.log(color(`\nStatistics for: ${story.meta.title}\n`, colors.cyan, colors.bold));
  console.log(`  Author: ${story.meta.author ?? '(not set)'}`);
  console.log(`  Nodes: ${story.nodeCount}`);
  console.log(`  Words: ${story.getWordCount().toLocaleString()}`);
  console.log(`  Characters: ${story.getCharacterCount().toLocaleString()}`);
  console.log(`  Choices: ${story.getChoiceCount()}`);
  console.log(`  Edges: ${story.getEdges().length}`);
  console.log(`  Endings: ${story.getEndingNodes().length}`);
  console.log();

  // Node type breakdown
  console.log(color('Node types:', colors.cyan));
  const passages = story.getNodesByType('passage').length;
  const choices = story.getNodesByType('choice').length;
  const conditions = story.getNodesByType('condition').length;
  const variables = story.getNodesByType('variable').length;
  const includes = story.getNodesByType('include').length;
  const comments = story.getNodesByType('comment').length;

  console.log(`  Passages: ${passages}`);
  if (choices > 0) console.log(`  Choices: ${choices}`);
  if (conditions > 0) console.log(`  Conditions: ${conditions}`);
  if (variables > 0) console.log(`  Variables: ${variables}`);
  if (includes > 0) console.log(`  Includes: ${includes}`);
  if (comments > 0) console.log(`  Comments: ${comments}`);
  console.log();

  return 0;
}

/**
 * Print usage information.
 */
function usage(): void {
  console.log(`
${color('StoryGraph CLI', colors.cyan, colors.bold)}
Visual narrative editor for interactive fiction writers

${color('Usage:', colors.bold)}
  storygraph <command> [options]

${color('Commands:', colors.bold)}
  validate <file>         Validate a .story file
  create <title> <file>   Create a new story file
  stats <file>            Show statistics for a story

${color('Examples:', colors.bold)}
  storygraph validate story.yaml
  storygraph create "My Story" my-story.yaml
  storygraph stats story.yaml

${color('More info:', colors.dim)}
  https://github.com/mcp-tool-shop-org/storygraph
`);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    usage();
    process.exit(0);
  }

  const command = args[0];

  let exitCode = 0;

  switch (command) {
    case 'validate':
      if (args.length < 2) {
        console.error(color('Error: Missing file path', colors.red));
        usage();
        exitCode = 1;
      } else {
        exitCode = await validate(args[1]);
      }
      break;

    case 'create':
      if (args.length < 3) {
        console.error(color('Error: Missing title or file path', colors.red));
        usage();
        exitCode = 1;
      } else {
        exitCode = await create(args[1], args[2]);
      }
      break;

    case 'stats':
      if (args.length < 2) {
        console.error(color('Error: Missing file path', colors.red));
        usage();
        exitCode = 1;
      } else {
        exitCode = await stats(args[1]);
      }
      break;

    case 'help':
    case '--help':
    case '-h':
      usage();
      break;

    default:
      console.error(color(`Unknown command: ${command}`, colors.red));
      usage();
      exitCode = 1;
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(color('Unexpected error:', colors.red));
  console.error(error);
  process.exit(1);
});
