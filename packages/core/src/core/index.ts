/**
 * Core module exports for StoryGraph
 */

// Types
export {
  NodeIdSchema,
  VariableNameSchema,
  VariableValueSchema,
  StoryMetaSchema,
  PositionSchema,
  FormatVersionSchema,
  CURRENT_FORMAT_VERSION,
  type NodeId,
  type VariableName,
  type VariableValue,
  type StoryMeta,
  type Position,
  type FormatVersion,
} from './types.js';

// Nodes
export {
  ChoiceSchema,
  PassageNodeSchema,
  ChoiceNodeSchema,
  ConditionNodeSchema,
  VariableNodeSchema,
  IncludeNodeSchema,
  CommentNodeSchema,
  StoryNodeSchema,
  NODE_TYPES,
  type Choice,
  type PassageNode,
  type ChoiceNode,
  type ConditionNode,
  type VariableNode,
  type IncludeNode,
  type CommentNode,
  type StoryNode,
  type NodeType,
} from './nodes.js';

// Edges
export {
  EdgeTypeSchema,
  EdgeSchema,
  extractEdgesFromNode,
  extractAllEdges,
  getNodeTargets,
  type EdgeType,
  type Edge,
} from './edges.js';

// Story
export {
  StoryVariablesSchema,
  StoryDocumentSchema,
  Story,
  type StoryVariables,
  type StoryDocument,
} from './story.js';

// Services
export {
  StoryService,
  type StorySnapshot,
  type Change,
  type ChangeSet,
} from './service.js';

// Serializer
export {
  ParseError,
  ValidationError,
  parseStory,
  parseToStory,
  serializeStory,
  serializeStoryInstance,
  serializeWithHeader,
  generateHeader,
  type ValidationIssue,
  type SerializeOptions,
} from './serializer.js';

// Validator
export {
  Validator,
  validateStory,
  type Severity,
  type IssueCategory,
  type Issue,
  type ValidationResult,
} from './validator.js';
