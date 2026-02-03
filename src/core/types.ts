/**
 * Core type definitions for StoryGraph
 *
 * This file defines the fundamental types that represent a story.
 * All types are defined both as Zod schemas (for validation) and
 * TypeScript types (for static typing).
 */

import { z } from 'zod';

// =============================================================================
// Primitive Types
// =============================================================================

/**
 * Node ID - a unique identifier for a node within a story.
 * Must be lowercase alphanumeric with underscores, starting with a letter.
 */
export const NodeIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Node ID must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
  })
  .min(1)
  .max(64);

export type NodeId = z.infer<typeof NodeIdSchema>;

/**
 * Variable name - used for story state.
 * Same constraints as NodeId for consistency.
 */
export const VariableNameSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Variable name must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
  })
  .min(1)
  .max(64);

export type VariableName = z.infer<typeof VariableNameSchema>;

/**
 * Variable value - the possible values a variable can hold.
 */
export const VariableValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export type VariableValue = z.infer<typeof VariableValueSchema>;

// =============================================================================
// Story Metadata
// =============================================================================

/**
 * Story metadata - information about the story itself.
 */
export const StoryMetaSchema = z.object({
  /** Title of the story */
  title: z.string().min(1).max(256),

  /** Author name(s) */
  author: z.string().min(1).max(256).optional(),

  /** Story version (semantic versioning recommended) */
  version: z.string().max(32).optional(),

  /** Brief description or tagline */
  description: z.string().max(1024).optional(),

  /** ISO 8601 date when story was created */
  created: z.string().datetime().optional(),

  /** ISO 8601 date when story was last modified */
  modified: z.string().datetime().optional(),

  /** Target audience or content rating */
  rating: z.enum(['everyone', 'teen', 'mature']).optional(),

  /** Primary language (BCP 47 tag) */
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),

  /** Tags for categorization */
  tags: z.array(z.string().max(64)).max(20).optional(),
});

export type StoryMeta = z.infer<typeof StoryMetaSchema>;

// =============================================================================
// Position (for visual editor)
// =============================================================================

/**
 * 2D position for node placement in the visual editor.
 * Stored in the file format for layout persistence.
 */
export const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export type Position = z.infer<typeof PositionSchema>;

// =============================================================================
// File Format Version
// =============================================================================

/**
 * Supported file format versions.
 * Used for forward/backward compatibility.
 */
export const FormatVersionSchema = z.enum(['1.0']);

export type FormatVersion = z.infer<typeof FormatVersionSchema>;

/**
 * Current format version
 */
export const CURRENT_FORMAT_VERSION: FormatVersion = '1.0';
