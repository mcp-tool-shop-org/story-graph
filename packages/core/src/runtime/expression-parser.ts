/**
 * Safe Expression Parser
 *
 * A secure AST-based expression evaluator that replaces the dangerous `new Function()` approach.
 * Supports: variables, comparisons, boolean logic, arithmetic, and parentheses.
 *
 * Grammar (simplified):
 *   Expression     -> LogicalOr
 *   LogicalOr      -> LogicalAnd ('||' LogicalAnd)*
 *   LogicalAnd     -> Equality ('&&' Equality)*
 *   Equality       -> Comparison (('==' | '===' | '!=' | '!==') Comparison)*
 *   Comparison     -> Additive (('<' | '<=' | '>' | '>=') Additive)*
 *   Additive       -> Multiplicative (('+' | '-') Multiplicative)*
 *   Multiplicative -> Unary (('*' | '/' | '%') Unary)*
 *   Unary          -> ('!' | '-')? Primary
 *   Primary        -> Number | String | Boolean | Identifier | '(' Expression ')'
 */

import type { VariableValue } from '../core/types.js';

// =============================================================================
// Token Types
// =============================================================================

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean;
  position: number;
}

// =============================================================================
// Lexer
// =============================================================================

const OPERATORS = [
  '===',
  '!==',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
  '!',
];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Skip whitespace
    if (/\s/.test(input[pos])) {
      pos++;
      continue;
    }

    // Numbers (integer and decimal)
    if (/\d/.test(input[pos]) || (input[pos] === '.' && /\d/.test(input[pos + 1] ?? ''))) {
      const start = pos;
      let hasDecimal = false;
      while (pos < input.length && (/\d/.test(input[pos]) || (input[pos] === '.' && !hasDecimal))) {
        if (input[pos] === '.') hasDecimal = true;
        pos++;
      }
      const numStr = input.slice(start, pos);
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr), position: start });
      continue;
    }

    // String literals (single or double quotes)
    if (input[pos] === '"' || input[pos] === "'") {
      const quote = input[pos];
      const start = pos;
      pos++; // Skip opening quote
      let str = '';
      while (pos < input.length && input[pos] !== quote) {
        if (input[pos] === '\\' && pos + 1 < input.length) {
          pos++;
          const escapeMap: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\' };
          str += escapeMap[input[pos]] ?? input[pos];
        } else {
          str += input[pos];
        }
        pos++;
      }
      if (input[pos] !== quote) {
        throw new ExpressionError(`Unterminated string at position ${start}`, start);
      }
      pos++; // Skip closing quote
      tokens.push({ type: 'STRING', value: str, position: start });
      continue;
    }

    // Operators (check longer ones first)
    const opMatch = OPERATORS.find((op) => input.slice(pos, pos + op.length) === op);
    if (opMatch) {
      tokens.push({ type: 'OPERATOR', value: opMatch, position: pos });
      pos += opMatch.length;
      continue;
    }

    // Parentheses
    if (input[pos] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: pos });
      pos++;
      continue;
    }
    if (input[pos] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: pos });
      pos++;
      continue;
    }

    // Boolean literals and identifiers
    if (/[a-zA-Z_$]/.test(input[pos])) {
      const start = pos;
      while (pos < input.length && /[a-zA-Z0-9_$]/.test(input[pos])) {
        pos++;
      }
      const word = input.slice(start, pos);
      if (word === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true, position: start });
      } else if (word === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false, position: start });
      } else if (word === 'null' || word === 'undefined') {
        // Treat null/undefined as identifier that will resolve to undefined
        tokens.push({ type: 'IDENTIFIER', value: word, position: start });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word, position: start });
      }
      continue;
    }

    throw new ExpressionError(`Unexpected character '${input[pos]}' at position ${pos}`, pos);
  }

  tokens.push({ type: 'EOF', value: '', position: pos });
  return tokens;
}

// =============================================================================
// Parser
// =============================================================================

export class ExpressionError extends Error {
  constructor(
    message: string,
    public position?: number
  ) {
    super(message);
    this.name = 'ExpressionError';
  }
}

type ExpressionValue = string | number | boolean | null | undefined;

class Parser {
  private tokens: Token[];
  private pos = 0;
  private variables: Record<string, VariableValue>;

  constructor(tokens: Token[], variables: Record<string, VariableValue>) {
    this.tokens = tokens;
    this.variables = variables;
  }

  parse(): ExpressionValue {
    const result = this.parseLogicalOr();
    if (this.peek().type !== 'EOF') {
      throw new ExpressionError(
        `Unexpected token '${this.peek().value}' at position ${this.peek().position}`,
        this.peek().position
      );
    }
    return result;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', position: -1 };
  }

  private advance(): Token {
    const token = this.peek();
    this.pos++;
    return token;
  }

  private parseLogicalOr(): ExpressionValue {
    let left = this.parseLogicalAnd();

    while (this.peek().type === 'OPERATOR' && this.peek().value === '||') {
      this.advance();
      const right = this.parseLogicalAnd();
      left = left || right;
    }

    return left;
  }

  private parseLogicalAnd(): ExpressionValue {
    let left = this.parseEquality();

    while (this.peek().type === 'OPERATOR' && this.peek().value === '&&') {
      this.advance();
      const right = this.parseEquality();
      left = left && right;
    }

    return left;
  }

  private parseEquality(): ExpressionValue {
    let left = this.parseComparison();

    while (
      this.peek().type === 'OPERATOR' &&
      ['==', '===', '!=', '!=='].includes(this.peek().value as string)
    ) {
      const op = this.advance().value as string;
      const right = this.parseComparison();

      switch (op) {
        case '==':
          left = left == right;
          break;
        case '===':
          left = left === right;
          break;
        case '!=':
          left = left != right;
          break;
        case '!==':
          left = left !== right;
          break;
      }
    }

    return left;
  }

  private parseComparison(): ExpressionValue {
    let left = this.parseAdditive();

    while (
      this.peek().type === 'OPERATOR' &&
      ['<', '<=', '>', '>='].includes(this.peek().value as string)
    ) {
      const op = this.advance().value as string;
      const right = this.parseAdditive();

      // Type safety: ensure we're comparing comparable types
      const leftNum = typeof left === 'number' ? left : Number(left);
      const rightNum = typeof right === 'number' ? right : Number(right);

      switch (op) {
        case '<':
          left = leftNum < rightNum;
          break;
        case '<=':
          left = leftNum <= rightNum;
          break;
        case '>':
          left = leftNum > rightNum;
          break;
        case '>=':
          left = leftNum >= rightNum;
          break;
      }
    }

    return left;
  }

  private parseAdditive(): ExpressionValue {
    let left = this.parseMultiplicative();

    while (this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value as string)) {
      const op = this.advance().value as string;
      const right = this.parseMultiplicative();

      if (op === '+') {
        // String concatenation or numeric addition
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else {
          left = Number(left) + Number(right);
        }
      } else {
        left = Number(left) - Number(right);
      }
    }

    return left;
  }

  private parseMultiplicative(): ExpressionValue {
    let left = this.parseUnary();

    while (
      this.peek().type === 'OPERATOR' &&
      ['*', '/', '%'].includes(this.peek().value as string)
    ) {
      const op = this.advance().value as string;
      const right = this.parseUnary();

      const leftNum = Number(left);
      const rightNum = Number(right);

      switch (op) {
        case '*':
          left = leftNum * rightNum;
          break;
        case '/':
          left = rightNum === 0 ? NaN : leftNum / rightNum;
          break;
        case '%':
          left = rightNum === 0 ? NaN : leftNum % rightNum;
          break;
      }
    }

    return left;
  }

  private parseUnary(): ExpressionValue {
    if (this.peek().type === 'OPERATOR' && this.peek().value === '!') {
      this.advance();
      const value = this.parseUnary();
      return !value;
    }

    if (this.peek().type === 'OPERATOR' && this.peek().value === '-') {
      this.advance();
      const value = this.parseUnary();
      return -Number(value);
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionValue {
    const token = this.peek();

    switch (token.type) {
      case 'NUMBER':
        this.advance();
        return token.value as number;

      case 'STRING':
        this.advance();
        return token.value as string;

      case 'BOOLEAN':
        this.advance();
        return token.value as boolean;

      case 'IDENTIFIER': {
        this.advance();
        const name = token.value as string;
        if (name === 'null') return null;
        if (name === 'undefined') return undefined;
        // Look up variable - return undefined if not found (safe default)
        if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
          return this.variables[name] as ExpressionValue;
        }
        return undefined;
      }

      case 'LPAREN': {
        this.advance(); // consume '('
        const expr = this.parseLogicalOr();
        if (this.peek().type !== 'RPAREN') {
          throw new ExpressionError(
            `Expected ')' at position ${this.peek().position}`,
            this.peek().position
          );
        }
        this.advance(); // consume ')'
        return expr;
      }

      default:
        throw new ExpressionError(
          `Unexpected token '${token.value}' at position ${token.position}`,
          token.position
        );
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Safely evaluate an expression string against a set of variables.
 *
 * @param expression - The expression to evaluate
 * @param variables - Variables available in the expression context
 * @returns The boolean result of the expression (truthy/falsy coerced to boolean)
 *
 * @example
 * ```ts
 * evaluateExpression('score > 10', { score: 15 }) // true
 * evaluateExpression('flag === true && coins >= 5', { flag: true, coins: 10 }) // true
 * evaluateExpression('name == "hero"', { name: 'hero' }) // true
 * ```
 */
export function evaluateExpression(
  expression: string,
  variables: Record<string, VariableValue>
): boolean {
  try {
    const tokens = tokenize(expression);
    const parser = new Parser(tokens, variables);
    const result = parser.parse();
    return !!result;
  } catch (_error) {
    // On parse errors, return false (safe default)
    // This maintains backward compatibility with the old new Function() behavior
    return false;
  }
}

/**
 * Evaluate an expression and return its raw value (not coerced to boolean).
 *
 * @param expression - The expression to evaluate
 * @param variables - Variables available in the expression context
 * @returns The result of the expression evaluation
 * @throws ExpressionError if the expression is invalid
 */
export function evaluateExpressionValue(
  expression: string,
  variables: Record<string, VariableValue>
): ExpressionValue {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, variables);
  return parser.parse();
}

/**
 * Validate an expression without evaluating it.
 *
 * @param expression - The expression to validate
 * @returns true if the expression is syntactically valid
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const tokens = tokenize(expression);
    // Parse with empty variables just to check syntax
    new Parser(tokens, {}).parse();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
