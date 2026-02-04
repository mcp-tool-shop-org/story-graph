import type { NodeTypes } from '@xyflow/react';
import { PassageNode } from './PassageNode';
import { ChoiceNode } from './ChoiceNode';
import { ConditionNode } from './ConditionNode';
import { VariableNode } from './VariableNode';
import { IncludeNode } from './IncludeNode';
import { CommentNode } from './CommentNode';

/**
 * Custom node types for React Flow.
 * These map to the nodeTypes prop of ReactFlow.
 */
export const nodeTypes: NodeTypes = {
  passageNode: PassageNode,
  choiceNode: ChoiceNode,
  conditionNode: ConditionNode,
  variableNode: VariableNode,
  includeNode: IncludeNode,
  commentNode: CommentNode,
};

export { PassageNode, ChoiceNode, ConditionNode, VariableNode, IncludeNode, CommentNode };
