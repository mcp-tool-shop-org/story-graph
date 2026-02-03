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

    if (cycles.length > 0) {
      this.addIssue({
        code: 'CYCLE_DETECTED',
        severity: 'info',
        category: 'structure',
        message: `Story contains ${cycles.length} cycle(s). This is often intentional.`,
        details: { cycles: cycles.slice(0, 5) }, // Limit to first 5
      });
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

    while (queue.length > 0) {
      const current = queue.shift()!;
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
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const node = this.story.getNode(nodeId);
      if (node) {
        const targets = getNodeTargets(node);
        for (const target of targets) {
          if (!visited.has(target)) {
            dfs(target);
          } else if (recStack.has(target)) {
            // Found a cycle
            const cycleStart = path.indexOf(target);
            cycles.push([...path.slice(cycleStart), target]);
          }
        }
      }

      path.pop();
      recStack.delete(nodeId);
    };

    for (const id of this.story.getAllNodeIds()) {
      if (!visited.has(id)) {
        dfs(id);
      }
    }

    return cycles;
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
