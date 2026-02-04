import { describe, it, expect } from 'vitest';
import {
  evaluateExpression,
  evaluateExpressionValue,
  validateExpression,
} from './expression-parser.js';

describe('expression-parser', () => {
  describe('evaluateExpression (boolean result)', () => {
    describe('literals', () => {
      it('evaluates true literal', () => {
        expect(evaluateExpression('true', {})).toBe(true);
      });

      it('evaluates false literal', () => {
        expect(evaluateExpression('false', {})).toBe(false);
      });

      it('evaluates numeric literals as truthy/falsy', () => {
        expect(evaluateExpression('1', {})).toBe(true);
        expect(evaluateExpression('0', {})).toBe(false);
        expect(evaluateExpression('42', {})).toBe(true);
        expect(evaluateExpression('-1', {})).toBe(true);
      });

      it('evaluates string literals as truthy/falsy', () => {
        expect(evaluateExpression('"hello"', {})).toBe(true);
        expect(evaluateExpression('""', {})).toBe(false);
        expect(evaluateExpression("'world'", {})).toBe(true);
      });
    });

    describe('variable lookup', () => {
      it('looks up variable values', () => {
        expect(evaluateExpression('flag', { flag: true })).toBe(true);
        expect(evaluateExpression('flag', { flag: false })).toBe(false);
        expect(evaluateExpression('score', { score: 10 })).toBe(true);
        expect(evaluateExpression('score', { score: 0 })).toBe(false);
      });

      it('returns false for undefined variables', () => {
        expect(evaluateExpression('unknown', {})).toBe(false);
        expect(evaluateExpression('missing', { other: 1 })).toBe(false);
      });
    });

    describe('comparison operators', () => {
      it('evaluates equality (==)', () => {
        expect(evaluateExpression('x == 5', { x: 5 })).toBe(true);
        expect(evaluateExpression('x == 5', { x: 6 })).toBe(false);
        expect(evaluateExpression('x == "5"', { x: 5 })).toBe(true); // loose equality
      });

      it('evaluates strict equality (===)', () => {
        expect(evaluateExpression('x === 5', { x: 5 })).toBe(true);
        expect(evaluateExpression('x === "5"', { x: 5 })).toBe(false);
        expect(evaluateExpression('x === true', { x: true })).toBe(true);
      });

      it('evaluates inequality (!=)', () => {
        expect(evaluateExpression('x != 5', { x: 5 })).toBe(false);
        expect(evaluateExpression('x != 5', { x: 6 })).toBe(true);
      });

      it('evaluates strict inequality (!==)', () => {
        expect(evaluateExpression('x !== 5', { x: 5 })).toBe(false);
        expect(evaluateExpression('x !== "5"', { x: 5 })).toBe(true);
      });

      it('evaluates less than (<)', () => {
        expect(evaluateExpression('x < 10', { x: 5 })).toBe(true);
        expect(evaluateExpression('x < 10', { x: 10 })).toBe(false);
        expect(evaluateExpression('x < 10', { x: 15 })).toBe(false);
      });

      it('evaluates less than or equal (<=)', () => {
        expect(evaluateExpression('x <= 10', { x: 5 })).toBe(true);
        expect(evaluateExpression('x <= 10', { x: 10 })).toBe(true);
        expect(evaluateExpression('x <= 10', { x: 15 })).toBe(false);
      });

      it('evaluates greater than (>)', () => {
        expect(evaluateExpression('x > 10', { x: 15 })).toBe(true);
        expect(evaluateExpression('x > 10', { x: 10 })).toBe(false);
        expect(evaluateExpression('x > 10', { x: 5 })).toBe(false);
      });

      it('evaluates greater than or equal (>=)', () => {
        expect(evaluateExpression('x >= 10', { x: 15 })).toBe(true);
        expect(evaluateExpression('x >= 10', { x: 10 })).toBe(true);
        expect(evaluateExpression('x >= 10', { x: 5 })).toBe(false);
      });
    });

    describe('boolean logic', () => {
      it('evaluates logical AND (&&)', () => {
        expect(evaluateExpression('a && b', { a: true, b: true })).toBe(true);
        expect(evaluateExpression('a && b', { a: true, b: false })).toBe(false);
        expect(evaluateExpression('a && b', { a: false, b: true })).toBe(false);
        expect(evaluateExpression('a && b', { a: false, b: false })).toBe(false);
      });

      it('evaluates logical OR (||)', () => {
        expect(evaluateExpression('a || b', { a: true, b: true })).toBe(true);
        expect(evaluateExpression('a || b', { a: true, b: false })).toBe(true);
        expect(evaluateExpression('a || b', { a: false, b: true })).toBe(true);
        expect(evaluateExpression('a || b', { a: false, b: false })).toBe(false);
      });

      it('evaluates logical NOT (!)', () => {
        expect(evaluateExpression('!a', { a: true })).toBe(false);
        expect(evaluateExpression('!a', { a: false })).toBe(true);
        expect(evaluateExpression('!!a', { a: true })).toBe(true);
      });

      it('respects operator precedence (AND before OR)', () => {
        expect(evaluateExpression('true || false && false', {})).toBe(true);
        expect(evaluateExpression('false || true && true', {})).toBe(true);
        expect(evaluateExpression('false && true || true', {})).toBe(true);
      });
    });

    describe('arithmetic operators', () => {
      it('evaluates addition (+)', () => {
        expect(evaluateExpression('x + 5 > 10', { x: 6 })).toBe(true);
        expect(evaluateExpression('x + 5 > 10', { x: 4 })).toBe(false);
      });

      it('evaluates subtraction (-)', () => {
        expect(evaluateExpression('x - 5 < 0', { x: 3 })).toBe(true);
        expect(evaluateExpression('x - 5 < 0', { x: 10 })).toBe(false);
      });

      it('evaluates multiplication (*)', () => {
        expect(evaluateExpression('x * 2 == 10', { x: 5 })).toBe(true);
      });

      it('evaluates division (/)', () => {
        expect(evaluateExpression('x / 2 == 5', { x: 10 })).toBe(true);
      });

      it('evaluates modulo (%)', () => {
        expect(evaluateExpression('x % 3 == 1', { x: 10 })).toBe(true);
      });

      it('handles division by zero', () => {
        expect(evaluateExpression('x / 0 == 0', { x: 10 })).toBe(false); // NaN != 0
      });
    });

    describe('parentheses', () => {
      it('groups expressions correctly', () => {
        expect(evaluateExpression('(1 + 2) * 3 == 9', {})).toBe(true);
        expect(evaluateExpression('1 + 2 * 3 == 7', {})).toBe(true);
        expect(evaluateExpression('(true || false) && false', {})).toBe(false);
        expect(evaluateExpression('true || (false && false)', {})).toBe(true);
      });

      it('handles nested parentheses', () => {
        expect(evaluateExpression('((1 + 2) * (3 + 4)) == 21', {})).toBe(true);
      });
    });

    describe('complex expressions', () => {
      it('evaluates game-like conditions', () => {
        const vars = { coins: 50, hasKey: true, level: 5 };
        expect(evaluateExpression('coins >= 50 && hasKey', vars)).toBe(true);
        expect(evaluateExpression('level > 3 && (coins > 100 || hasKey)', vars)).toBe(true);
        expect(evaluateExpression('!hasKey || coins < 10', vars)).toBe(false);
      });

      it('evaluates story conditions', () => {
        expect(evaluateExpression('flag === true', { flag: true })).toBe(true);
        expect(evaluateExpression('flag === false', { flag: false })).toBe(true);
        expect(evaluateExpression('score > 10 && score < 100', { score: 50 })).toBe(true);
      });
    });

    describe('string comparisons', () => {
      it('compares strings for equality', () => {
        expect(evaluateExpression('name == "hero"', { name: 'hero' })).toBe(true);
        expect(evaluateExpression('name == "villain"', { name: 'hero' })).toBe(false);
      });

      it('concatenates strings with +', () => {
        expect(evaluateExpression('"hello" + " world" == "hello world"', {})).toBe(true);
      });
    });

    describe('error handling', () => {
      it('returns false for invalid expressions', () => {
        expect(evaluateExpression('', {})).toBe(false);
        expect(evaluateExpression('1 +', {})).toBe(false);
        expect(evaluateExpression('((1 + 2)', {})).toBe(false);
        expect(evaluateExpression('@invalid', {})).toBe(false);
      });

      it('returns false for unterminated strings', () => {
        expect(evaluateExpression('"unterminated', {})).toBe(false);
      });
    });

    describe('security', () => {
      it('does not execute arbitrary code', () => {
        // These should not execute or throw - just return false
        expect(evaluateExpression('process', {})).toBe(false);
        expect(evaluateExpression('require', {})).toBe(false);
        expect(evaluateExpression('eval', {})).toBe(false);
        expect(evaluateExpression('Function', {})).toBe(false);
      });

      it('does not allow property access', () => {
        // Property access syntax should fail to parse
        // Note: we can't actually pass objects as variables due to VariableValue type,
        // but the parser itself rejects property access syntax regardless
        expect(evaluateExpression('obj.prop', {})).toBe(false);
        expect(evaluateExpression('arr[0]', {})).toBe(false);
      });

      it('does not allow function calls', () => {
        // Function call syntax should fail to parse
        // Note: we can't actually pass functions as variables due to VariableValue type,
        // but the parser itself rejects function call syntax regardless
        expect(evaluateExpression('func()', {})).toBe(false);
        expect(evaluateExpression('Math.random()', {})).toBe(false);
      });
    });
  });

  describe('evaluateExpressionValue (raw result)', () => {
    it('returns numeric results', () => {
      expect(evaluateExpressionValue('1 + 2', {})).toBe(3);
      expect(evaluateExpressionValue('10 * 5', {})).toBe(50);
      expect(evaluateExpressionValue('x + y', { x: 3, y: 7 })).toBe(10);
    });

    it('returns string results', () => {
      expect(evaluateExpressionValue('"hello"', {})).toBe('hello');
      expect(evaluateExpressionValue('"a" + "b"', {})).toBe('ab');
    });

    it('returns boolean results', () => {
      expect(evaluateExpressionValue('true', {})).toBe(true);
      expect(evaluateExpressionValue('1 < 2', {})).toBe(true);
    });

    it('throws on invalid expressions', () => {
      expect(() => evaluateExpressionValue('1 +', {})).toThrow();
      expect(() => evaluateExpressionValue('@invalid', {})).toThrow();
    });
  });

  describe('validateExpression', () => {
    it('validates correct expressions', () => {
      expect(validateExpression('x > 5')).toEqual({ valid: true });
      expect(validateExpression('a && b || c')).toEqual({ valid: true });
      expect(validateExpression('(1 + 2) * 3')).toEqual({ valid: true });
    });

    it('reports errors for invalid expressions', () => {
      const result1 = validateExpression('1 +');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBeDefined();

      const result2 = validateExpression('@invalid');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBeDefined();

      const result3 = validateExpression('((1 + 2)');
      expect(result3.valid).toBe(false);
      expect(result3.error).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles negative numbers', () => {
      expect(evaluateExpression('-5 < 0', {})).toBe(true);
      expect(evaluateExpression('x == -10', { x: -10 })).toBe(true);
    });

    it('handles decimal numbers', () => {
      expect(evaluateExpression('3.14 > 3', {})).toBe(true);
      expect(evaluateExpression('x == 2.5', { x: 2.5 })).toBe(true);
      expect(evaluateExpression('.5 == 0.5', {})).toBe(true);
    });

    it('handles null and undefined literals', () => {
      expect(evaluateExpression('null == undefined', {})).toBe(true);
      expect(evaluateExpression('null === undefined', {})).toBe(false);
      // undefined variable compared to null (undefined == null is true in JS)
      expect(evaluateExpression('x == null', {})).toBe(true);
    });

    it('handles escaped characters in strings', () => {
      expect(evaluateExpressionValue('"line1\\nline2"', {})).toBe('line1\nline2');
      expect(evaluateExpressionValue('"tab\\there"', {})).toBe('tab\there');
      expect(evaluateExpressionValue('"quote\\"here"', {})).toBe('quote"here');
    });

    it('handles whitespace', () => {
      expect(evaluateExpression('  x   ==   5  ', { x: 5 })).toBe(true);
      expect(evaluateExpression('\t\nx\n>\t0', { x: 1 })).toBe(true);
    });

    it('handles variable names with underscores and dollars', () => {
      expect(evaluateExpression('_private == 1', { _private: 1 })).toBe(true);
      expect(evaluateExpression('$special == 2', { $special: 2 })).toBe(true);
      expect(evaluateExpression('var_name_123 == 3', { var_name_123: 3 })).toBe(true);
    });
  });
});
