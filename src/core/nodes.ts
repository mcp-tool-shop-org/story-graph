/**
 * Node type definitions for StoryGraph
 *
 * Nodes are the building blocks of a story. Each node type serves
 * a specific purpose in the narrative structure.
 */

import { z } from 'zod';
import { NodeIdSchema, PositionSchema, VariableNameSchema, VariableValueSchema } from './types.js';

// =============================================================================
// Choice - A single option within a passage or choice node
// =============================================================================

/**
 * A choice that the reader can make.
 * Choices connect nodes together and can have conditions.
 */
export const ChoiceSchema = z.object({
  /** The text displayed to the reader */
  text: z.string().min(1).max(512),

  /** Target node ID when this choice is selected */
  target: NodeIdSchema,

  /** Optional condition that must be true for choice to appear */
  condition: z.string().max(256).optional(),

  /** Whether selecting this choice should be tracked (for analytics) */
  tracked: z.boolean().optional(),
});

export type Choice = z.infer<typeof ChoiceSchema>;

// =============================================================================
// Node Types
// =============================================================================

/**
 * Base properties shared by all node types.
 */
const BaseNodeSchema = z.object({
  /** Unique identifier for this node */
  id: NodeIdSchema,

  /** Position in the visual editor (optional, defaults applied on load) */
  position: PositionSchema.optional(),

  /** Author's notes (not included in exports) */
  notes: z.string().max(2048).optional(),

  /** Tags for organization and filtering */
  tags: z.array(z.string().max(64)).max(10).optional(),
});

// -----------------------------------------------------------------------------
// Passage Node - The core content node
// -----------------------------------------------------------------------------

/**
 * A passage contains narrative text and optional choices.
 * This is the most common node type.
 */
export const PassageNodeSchema = BaseNodeSchema.extend({
  type: z.literal('passage'),

  /** The narrative content shown to the reader */
  content: z.string().min(1).max(65536),

  /** Choices available after reading this passage */
  choices: z.array(ChoiceSchema).min(0).max(20).optional(),

  /** If true, this is the story's starting point */
  start: z.boolean().optional(),

  /** If true, this is an ending (no choices required) */
  ending: z.boolean().optional(),
});

export type PassageNode = z.infer<typeof PassageNodeSchema>;

// -----------------------------------------------------------------------------
// Choice Node - Standalone branching point
// -----------------------------------------------------------------------------

/**
 * A dedicated choice node for complex branching logic.
 * Useful when the same choice set appears in multiple contexts.
 */
export const ChoiceNodeSchema = BaseNodeSchema.extend({
  type: z.literal('choice'),

  /** Optional prompt text before choices */
  prompt: z.string().max(1024).optional(),

  /** The choices available */
  choices: z.array(ChoiceSchema).min(1).max(20),
});

export type ChoiceNode = z.infer<typeof ChoiceNodeSchema>;

// -----------------------------------------------------------------------------
// Condition Node - Logic gate
// -----------------------------------------------------------------------------

/**
 * A condition node routes the story based on variable state.
 * Think of it as an if/else branch.
 */
export const ConditionNodeSchema = BaseNodeSchema.extend({
  type: z.literal('condition'),

  /** The condition expression to evaluate */
  expression: z.string().min(1).max(256),

  /** Target node if condition is true */
  ifTrue: NodeIdSchema,

  /** Target node if condition is false */
  ifFalse: NodeIdSchema,
});

export type ConditionNode = z.infer<typeof ConditionNodeSchema>;

// -----------------------------------------------------------------------------
// Variable Node - Set or modify state
// -----------------------------------------------------------------------------

/**
 * A variable node modifies story state.
 * Used for tracking player choices, inventory, relationships, etc.
 */
export const VariableNodeSchema = BaseNodeSchema.extend({
  type: z.literal('variable'),

  /** Variable assignments to make */
  set: z.record(VariableNameSchema, VariableValueSchema).optional(),

  /** Variables to increment (by 1 or specified amount) */
  increment: z.record(VariableNameSchema, z.number()).optional(),

  /** Variables to decrement (by 1 or specified amount) */
  decrement: z.record(VariableNameSchema, z.number()).optional(),

  /** Target node after variable operations */
  next: NodeIdSchema,
});

export type VariableNode = z.infer<typeof VariableNodeSchema>;

// -----------------------------------------------------------------------------
// Include Node - Reference another file
// -----------------------------------------------------------------------------

/**
 * An include node references content from another story file.
 * Enables modular story organization.
 */
export const IncludeNodeSchema = BaseNodeSchema.extend({
  type: z.literal('include'),

  /** Relative path to the included story file */
  path: z.string().min(1).max(256),

  /** Optional entry point node in the included file */
  entry: NodeIdSchema.optional(),

  /** Node to continue to after the included content ends */
  return: NodeIdSchema.optional(),
});

export type IncludeNode = z.infer<typeof IncludeNodeSchema>;

// -----------------------------------------------------------------------------
// Comment Node - Author notes
// -----------------------------------------------------------------------------

/**
 * A comment node for author notes and documentation.
 * Never included in exports.
 */
export const CommentNodeSchema = BaseNodeSchema.extend({
  type: z.literal('comment'),

  /** The comment text */
  content: z.string().min(1).max(8192),
});

export type CommentNode = z.infer<typeof CommentNodeSchema>;

// =============================================================================
// Union Type - Any valid node
// =============================================================================

/**
 * Union of all valid node types.
 */
export const StoryNodeSchema = z.discriminatedUnion('type', [
  PassageNodeSchema,
  ChoiceNodeSchema,
  ConditionNodeSchema,
  VariableNodeSchema,
  IncludeNodeSchema,
  CommentNodeSchema,
]);

export type StoryNode = z.infer<typeof StoryNodeSchema>;

/**
 * Array of valid node type identifiers.
 */
export const NODE_TYPES = [
  'passage',
  'choice',
  'condition',
  'variable',
  'include',
  'comment',
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
