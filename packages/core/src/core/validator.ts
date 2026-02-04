/**
 * Story Validation for StoryGraph
 *
 * Validates story structure beyond schema validation:
 * - Graph connectivity (unreachable nodes, dead ends)
 * - Reference integrity (all targets exist)
 * - Cycle detection (infinite loops)
 * - Best practices (naming, content)
 */

import { Story } from './story.js';
import { getNodeTargets } from './edges.js';
import type { StoryNode, PassageNode } from './nodes.js';

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Severity levels for validation issues.
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * Categories of validation issues.
 */
export type IssueCategory =
  | 'structure'    // Graph structure issues
  | 'reference'    // Broken references
  | 'content'      // Content quality
  | 'accessibility' // Accessibility concerns
  | 'best-practice'; // Style recommendations

/**
 * A single validation issue.
 */
export interface Issue {
  /** Unique code for this issue type */
  code: string;

  /** Severity level */
  severity: Severity;

  /** Issue category */
  category: IssueCategory;

  /** Human-readable message */
  message: string;

  /** Node ID where issue was found (if applicable) */
  nodeId?: string;

  /** Additional context */
  details?: Record<string, unknown>;
}

/**
 * Complete validation result.
 */
export interface ValidationResult {
  /** Whether the story is valid (no errors) */
  valid: boolean;

  /** All issues found */
  issues: Issue[];

  /** Count by severity */
  counts: {
    error: number;
    warning: number;
    info: number;
  };

  /** Validation duration in milliseconds */
  durationMs: number;
}

// =============================================================================
// Validator Class
// =============================================================================

/**
 * Story validator with configurable rules.
 */
export class Validator {
  private issues: Issue[] = [];

  constructor(private story: Story) {}

  /**
   * Run all validation checks.
   */
  validate(): ValidationResult {
    const start = performance.now();
    this.issues = [];

    // Run all checks
    this.checkStartNode();
    this.checkBrokenReferences();
    this.checkUnreachableNodes();
    this.checkDeadEnds();
    this.checkDuplicateIds();
    this.checkEmptyContent();
    this.checkCycles();
    this.checkChoiceConditions();
    this.checkStateAndSideEffects();

    const end = performance.now();

    const counts = {
      error: this.issues.filter((i) => i.severity === 'error').length,
      warning: this.issues.filter((i) => i.severity === 'warning').length,
      info: this.issues.filter((i) => i.severity === 'info').length,
    };

    return {
      valid: counts.error === 0,
      issues: [...this.issues],
      counts,
      durationMs: end - start,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation Checks
  // ---------------------------------------------------------------------------

  /**
   * Check that exactly one start node exists.
   */
  private checkStartNode(): void {
    const startNodes = this.story
      .getNodesByType('passage')
      .filter((p) => p.start === true);

    if (startNodes.length === 0) {
      this.addIssue({
        code: 'NO_START_NODE',
        severity: 'error',
        category: 'structure',
        message: 'No start node defined. Add start: true to a passage.',
      });
    } else if (startNodes.length > 1) {
      this.addIssue({
        code: 'MULTIPLE_START_NODES',
        severity: 'error',
        category: 'structure',
        message: `Multiple start nodes found: ${startNodes.map((n) => n.id).join(', ')}`,
        details: { nodeIds: startNodes.map((n) => n.id) },
      });
    }
  }

  /**
   * Check that all referenced node IDs exist.
   */
  private checkBrokenReferences(): void {
    for (const node of this.story.getAllNodes()) {
      const targets = getNodeTargets(node);

      for (const target of targets) {
        if (!this.story.hasNode(target)) {
          this.addIssue({
            code: 'BROKEN_REFERENCE',
            severity: 'error',
            category: 'reference',
            message: `Node '${node.id}' references non-existent node '${target}'`,
            nodeId: node.id,
            details: { target },
          });
        }
      }
    }
  }

  /**
   * Check for nodes that cannot be reached from the start.
   */
  private checkUnreachableNodes(): void {
    const startNode = this.story.getStartNode();
    if (!startNode) return; // Already reported in checkStartNode

    const reachable = this.getReachableNodes(startNode.id);
    const allIds = new Set(this.story.getAllNodeIds());

    for (const id of allIds) {
      const node = this.story.getNode(id);
      // Skip comment nodes - they're not meant to be reachable
      if (node?.type === 'comment') continue;

      if (!reachable.has(id)) {
        this.addIssue({
          code: 'UNREACHABLE_NODE',
          severity: 'warning',
          category: 'structure',
          message: `Node '${id}' cannot be reached from the start`,
          nodeId: id,
        });
      }
    }
  }

  /**
   * Check for passages that are dead ends (no choices, not marked as ending).
   */
  private checkDeadEnds(): void {
    const passages = this.story.getNodesByType('passage');
    const choices = this.story.getNodesByType('choice');
    const includes = this.story.getNodesByType('include');

    for (const passage of passages) {
      const hasChoices = passage.choices && passage.choices.length > 0;
      const isEnding = passage.ending === true;

      if (!hasChoices && !isEnding) {
        this.addIssue({
          code: 'UNMARKED_DEAD_END',
          severity: 'warning',
          category: 'structure',
          message: `Passage '${passage.id}' has no choices and is not marked as ending`,
          nodeId: passage.id,
        });
      }
    }

    for (const choice of choices) {
      const hasChoices = choice.choices && choice.choices.length > 0;
      if (!hasChoices) {
        this.addIssue({
          code: 'CHOICE_WITHOUT_OPTIONS',
          severity: 'error',
          category: 'structure',
          message: `Choice node '${choice.id}' has no options`,
          nodeId: choice.id,
        });
      }
    }

    for (const include of includes) {
      const hasReturn = Boolean(include.return);
      if (!hasReturn) {
        this.addIssue({
          code: 'INCLUDE_NO_RETURN',
          severity: 'warning',
          category: 'structure',
          message: `Include node '${include.id}' has no return target and may dead-end`,
          nodeId: include.id,
        });
      }
    }
  }

  /**
   * Check for duplicate node IDs (shouldn't happen with Map, but check anyway).
   */
  private checkDuplicateIds(): void {
    // This is handled by the Map structure, but we check the original document
    // if it was parsed from YAML with duplicate keys
    // For now, this is a no-op but reserved for future use
  }

  /**
   * Check for empty content in passages.
   */
  private checkEmptyContent(): void {
    const passages = this.story.getNodesByType('passage');

    for (const passage of passages) {
      const trimmed = passage.content.trim();
      if (trimmed.length === 0) {
        this.addIssue({
          code: 'EMPTY_CONTENT',
          severity: 'warning',
          category: 'content',
          message: `Passage '${passage.id}' has empty content`,
          nodeId: passage.id,
        });
      } else if (trimmed.length < 10) {
        this.addIssue({
          code: 'SHORT_CONTENT',
          severity: 'info',
          category: 'content',
          message: `Passage '${passage.id}' has very short content (${trimmed.length} chars)`,
          nodeId: passage.id,
        });
      }
    }
  }

  /**
   * Check for cycles that could cause infinite loops.
   * Note: Cycles are often intentional in interactive fiction,
   * so this is informational only.
   */
  private checkCycles(): void {
    const cycles = this.detectCycles();

    for (const cycle of cycles) {
      const classification = this.classifyCycle(cycle);

      if (!classification.hasExit) {
        this.addIssue({
          code: 'NON_TERMINATING_CYCLE',
          severity: 'warning',
          category: 'structure',
          message: `Cycle has no exit and may never terminate: ${cycle.join(' -> ')}`,
          details: { cycle },
        });
      } else {
        this.addIssue({
          code: 'CYCLE_DETECTED',
          severity: 'info',
          category: 'structure',
          message: `Cycle detected with exit edges: ${cycle.join(' -> ')}`,
          details: { cycle },
        });
      }
    }
  }

  /**
   * Check that choice conditions are syntactically valid.
   */
  private checkChoiceConditions(): void {
    for (const node of this.story.getAllNodes()) {
      if (node.type === 'passage' && node.choices) {
        for (const choice of node.choices) {
          if (choice.condition) {
            if (!this.isValidCondition(choice.condition)) {
              this.addIssue({
                code: 'INVALID_CONDITION',
                severity: 'warning',
                category: 'reference',
                message: `Choice condition in '${node.id}' may be invalid: ${choice.condition}`,
                nodeId: node.id,
                details: { condition: choice.condition, choiceText: choice.text },
              });
            }
          }
        }
      }

      if (node.type === 'choice') {
        for (const choice of node.choices) {
          if (choice.condition && !this.isValidCondition(choice.condition)) {
            this.addIssue({
              code: 'INVALID_CONDITION',
              severity: 'warning',
              category: 'reference',
              message: `Choice condition in '${node.id}' may be invalid: ${choice.condition}`,
              nodeId: node.id,
              details: { condition: choice.condition, choiceText: choice.text },
            });
          }
        }
      }
    }
  }

  /**
   * Check for state-related issues and side effects.
   */
  private checkStateAndSideEffects(): void {
    const variableNodes = this.story.getNodesByType('variable');

    for (const variable of variableNodes) {
      const hasSet = variable.set && Object.keys(variable.set).length > 0;
      const hasInc = variable.increment && Object.keys(variable.increment).length > 0;
      const hasDec = variable.decrement && Object.keys(variable.decrement).length > 0;

      if (!hasSet && !hasInc && !hasDec) {
        this.addIssue({
          code: 'NO_STATE_CHANGE',
          severity: 'warning',
          category: 'best-practice',
          message: `Variable node '${variable.id}' performs no state changes`,
          nodeId: variable.id,
        });
      }

      if (!variable.next) {
        this.addIssue({
          code: 'VARIABLE_NO_NEXT',
          severity: 'warning',
          category: 'structure',
          message: `Variable node '${variable.id}' has no next target`,
          nodeId: variable.id,
        });
      }
    }

    // Flag suspicious (potentially effectful) condition expressions
    for (const node of this.story.getAllNodes()) {
      if (node.type === 'condition') {
        if (this.looksEffectful(node.expression)) {
          this.addIssue({
            code: 'EFFECTFUL_CONDITION',
            severity: 'warning',
            category: 'best-practice',
            message: `Condition '${node.id}' appears to have side effects: ${node.expression}`,
            nodeId: node.id,
            details: { expression: node.expression },
          });
        }
      }
    }
  }

  private looksEffectful(expression: string): boolean {
    const trimmed = expression.trim();
    if (trimmed.length === 0) return false;

    // Heuristics: assignments, increment/decrement, function calls with parentheses and no operators
    const assignmentPattern = /(^|[^=!<>])=([^=]|$)/;
    const incDecPattern = /\+\+|--/;
    const funcCallPattern = /[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)/;

    return assignmentPattern.test(trimmed) || incDecPattern.test(trimmed) || funcCallPattern.test(trimmed);
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  /**
   * Add an issue to the list.
   */
  private addIssue(issue: Issue): void {
    this.issues.push(issue);
  }

  /**
   * Get all nodes reachable from a starting node.
   */
  private getReachableNodes(startId: string): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [startId];
    let cursor = 0;

    while (cursor < queue.length) {
      const current = queue[cursor++];
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.story.getNode(current);
      if (!node) continue;

      const targets = getNodeTargets(node);
      for (const target of targets) {
        if (!visited.has(target)) {
          queue.push(target);
        }
      }
    }

    return visited;
  }

  /**
   * Detect cycles in the story graph.
   * Returns an array of cycle descriptions.
   */
  private detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const onStack = new Set<string>();

    for (const startId of this.story.getAllNodeIds()) {
      if (visited.has(startId)) continue;

      const stack: Array<{ id: string; targets: string[]; index: number }> = [];
      const startNode = this.story.getNode(startId);
      const startTargets = startNode ? getNodeTargets(startNode) : [];
      stack.push({ id: startId, targets: startTargets, index: 0 });

      while (stack.length > 0) {
        const frame = stack[stack.length - 1];

        if (!visited.has(frame.id)) {
          visited.add(frame.id);
        }

        onStack.add(frame.id);

        if (frame.index >= frame.targets.length) {
          onStack.delete(frame.id);
          stack.pop();
          continue;
        }

        const targetId = frame.targets[frame.index++];

        if (!visited.has(targetId)) {
          const targetNode = this.story.getNode(targetId);
          const nextTargets = targetNode ? getNodeTargets(targetNode) : [];
          stack.push({ id: targetId, targets: nextTargets, index: 0 });
          continue;
        }

        if (onStack.has(targetId)) {
          const cycleStart = stack.findIndex((item) => item.id === targetId);
          if (cycleStart !== -1) {
            const cyclePath = stack.slice(cycleStart).map((item) => item.id);
            cycles.push([...cyclePath, targetId]);
          }
        }
      }
    }

    return cycles;
  }

  /**
   * Classify a cycle to determine whether it has an exit edge.
   */
  private classifyCycle(cycle: string[]): { hasExit: boolean } {
    const cycleSet = new Set(cycle);

    for (const nodeId of cycleSet) {
      const outgoing = this.story.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        if (!cycleSet.has(edge.target)) {
          return { hasExit: true };
        }
      }
    }

    return { hasExit: false };
  }

  /**
   * Basic validation of condition syntax.
   * Full expression parsing would require a dedicated parser.
   */
  private isValidCondition(condition: string): boolean {
    // Basic checks - a real implementation would parse the expression
    const trimmed = condition.trim();
    if (trimmed.length === 0) return false;

    // Check for balanced parentheses
    let depth = 0;
    for (const char of trimmed) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) return false;
    }
    if (depth !== 0) return false;

    // Check for common patterns
    const validPattern = /^[a-z_][a-z0-9_]*(\s*(==|!=|>=|<=|>|<|&&|\|\|)\s*(\d+|true|false|"[^"]*"|'[^']*'|[a-z_][a-z0-9_]*))*$/i;
    return validPattern.test(trimmed) || /^[a-z_][a-z0-9_]*$/i.test(trimmed);
  }
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Validate a story and return the result.
 */
export function validateStory(story: Story): ValidationResult {
  const validator = new Validator(story);
  return validator.validate();
}
