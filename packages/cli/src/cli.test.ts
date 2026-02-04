import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = join(__dirname, '../dist/index.js');
const FIXTURES_PATH = join(__dirname, 'fixtures');

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI_PATH}" ${args.map((a) => `"${a}"`).join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

describe('CLI', () => {
  describe('help', () => {
    it('shows usage when called with no arguments', () => {
      const result = runCli([]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('StoryGraph CLI');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Commands:');
    });

    it('shows usage with --help flag', () => {
      const result = runCli(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('StoryGraph CLI');
    });

    it('shows usage with help command', () => {
      const result = runCli(['help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('StoryGraph CLI');
    });
  });

  describe('validate', () => {
    it('validates a valid story successfully', () => {
      const result = runCli(['validate', join(FIXTURES_PATH, 'valid-story.yaml')]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Story is valid');
    });

    it('reports errors for invalid story', () => {
      const result = runCli(['validate', join(FIXTURES_PATH, 'invalid-story.yaml')]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('Story has errors');
    });

    it('handles malformed YAML', () => {
      const result = runCli(['validate', join(FIXTURES_PATH, 'malformed.yaml')]);
      expect(result.exitCode).toBe(1);
      // Should show parse error or validation error
      expect(result.stdout + result.stderr).toMatch(/error/i);
    });

    it('handles missing file', () => {
      const result = runCli(['validate', 'nonexistent-file.yaml']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('Cannot read file');
    });

    it('shows error when file path is missing', () => {
      const result = runCli(['validate']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('Missing file path');
    });
  });

  describe('stats', () => {
    it('shows statistics for a valid story', () => {
      const result = runCli(['stats', join(FIXTURES_PATH, 'valid-story.yaml')]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Statistics for');
      expect(result.stdout).toContain('Nodes:');
      expect(result.stdout).toContain('Words:');
      expect(result.stdout).toContain('Choices:');
    });

    it('shows error when file path is missing', () => {
      const result = runCli(['stats']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('Missing file path');
    });
  });

  describe('create', () => {
    const outputPath = join(FIXTURES_PATH, 'test-output.yaml');

    afterEach(() => {
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    });

    it('creates a new story file', () => {
      const result = runCli(['create', 'My Test Story', outputPath]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Created:');
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('My Test Story');
      expect(content).toContain('start');
    });

    it('shows error when arguments are missing', () => {
      const result = runCli(['create', 'Title Only']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('Missing');
    });
  });

  describe('unknown command', () => {
    it('shows error for unknown commands', () => {
      const result = runCli(['foobar']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('Unknown command');
    });
  });
});
