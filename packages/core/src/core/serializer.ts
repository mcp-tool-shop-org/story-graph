/**
 * YAML Serializer/Parser for StoryGraph
 *
 * Handles reading and writing .story files in YAML format.
 * The format is designed to be human-readable and Git-friendly.
 */

import * as yaml from 'js-yaml';
import { StoryDocumentSchema, type StoryDocument } from './story.js';
import { Story } from './story.js';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when parsing fails.
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * A single validation issue.
 */
export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse a YAML string into a StoryDocument.
 *
 * @param content - The YAML content to parse
 * @returns The parsed and validated StoryDocument
 * @throws ParseError if YAML syntax is invalid
 * @throws ValidationError if document doesn't match schema
 */
export function parseStory(content: string): StoryDocument {
  // Parse YAML
  let data: unknown;
  try {
    data = yaml.load(content, {
      schema: yaml.JSON_SCHEMA,
      onWarning: (warning) => {
        console.warn('YAML warning:', warning.message);
      },
    });
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new ParseError(
        `YAML syntax error: ${error.message}`,
        error.mark?.line,
        error.mark?.column
      );
    }
    throw error;
  }

  // Validate against schema
  const result = StoryDocumentSchema.safeParse(data);

  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    throw new ValidationError(
      `Invalid story document: ${issues.length} validation error(s)`,
      issues
    );
  }

  return result.data;
}

/**
 * Parse a YAML string directly into a Story instance.
 *
 * @param content - The YAML content to parse
 * @returns A Story instance
 */
export function parseToStory(content: string): Story {
  const document = parseStory(content);
  return Story.fromDocument(document);
}

// =============================================================================
// Serializer
// =============================================================================

/**
 * Serialization options.
 */
export interface SerializeOptions {
  /** Line width before wrapping (default: 80) */
  lineWidth?: number;

  /** Indentation spaces (default: 2) */
  indent?: number;

  /** Sort object keys for consistent output (default: true) */
  sortKeys?: boolean;

  /** Include comments in output (default: true) */
  includeComments?: boolean;
}

const DEFAULT_OPTIONS: Required<SerializeOptions> = {
  lineWidth: 80,
  indent: 2,
  sortKeys: true,
  includeComments: true,
};

/**
 * Serialize a StoryDocument to YAML.
 *
 * @param document - The document to serialize
 * @param options - Serialization options
 * @returns YAML string
 */
export function serializeStory(
  document: StoryDocument,
  options: SerializeOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter out comment nodes if requested
  let processedDocument = document;
  if (!opts.includeComments) {
    const filteredNodes: Record<string, (typeof document.nodes)[string]> = {};
    for (const [id, node] of Object.entries(document.nodes)) {
      if (node.type !== 'comment') {
        filteredNodes[id] = node;
      }
    }
    processedDocument = { ...document, nodes: filteredNodes };
  }

  // Custom key sorter for consistent output
  const sortKeys = opts.sortKeys
    ? (a: string, b: string) => {
        // Priority order for top-level keys
        const priority: Record<string, number> = {
          version: 0,
          meta: 1,
          variables: 2,
          nodes: 3,
        };
        const pa = priority[a] ?? 100;
        const pb = priority[b] ?? 100;
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b);
      }
    : undefined;

  return yaml.dump(processedDocument, {
    indent: opts.indent,
    lineWidth: opts.lineWidth,
    sortKeys,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Serialize a Story instance to YAML.
 *
 * @param story - The story to serialize
 * @param options - Serialization options
 * @returns YAML string
 */
export function serializeStoryInstance(
  story: Story,
  options: SerializeOptions = {}
): string {
  return serializeStory(story.toDocument(), options);
}

// =============================================================================
// File Header
// =============================================================================

/**
 * Generate the standard file header comment.
 */
export function generateHeader(title: string): string {
  return `# StoryGraph Story File
# Title: ${title}
# Generated: ${new Date().toISOString()}
# Format: https://github.com/mcp-tool-shop-org/storygraph

`;
}

/**
 * Serialize with header.
 */
export function serializeWithHeader(
  story: Story,
  options: SerializeOptions = {}
): string {
  const header = generateHeader(story.meta.title);
  const body = serializeStoryInstance(story, options);
  return header + body;
}
