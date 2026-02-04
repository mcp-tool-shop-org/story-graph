# Contributing to StoryGraph

Thank you for your interest in contributing to StoryGraph! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- npm 10+
- Git

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/mcp-tool-shop-org/StoryGraph.git
   cd StoryGraph
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Available Scripts

| Script                 | Description                     |
| ---------------------- | ------------------------------- |
| `npm run build`        | Build core and CLI packages     |
| `npm run build:web`    | Build web application           |
| `npm test`             | Run all tests                   |
| `npm run lint`         | Run ESLint                      |
| `npm run lint:fix`     | Fix ESLint issues automatically |
| `npm run format`       | Format code with Prettier       |
| `npm run format:check` | Check code formatting           |
| `npm run typecheck`    | Run TypeScript type checking    |
| `npm run health`       | Run typecheck, tests, and build |

### Pre-commit Hooks

This project uses Husky for pre-commit hooks. When you commit:

1. **lint-staged** runs ESLint and Prettier on staged files
2. Any issues must be fixed before the commit succeeds

If you need to bypass hooks (not recommended):

```bash
git commit --no-verify
```

### Code Style

- **TypeScript**: Strict mode enabled with `exactOptionalPropertyTypes`
- **ESLint**: Rules defined in `eslint.config.js`
- **Prettier**: Configuration in `.prettierrc`
- Use `type` imports for type-only imports
- Prefix unused variables with `_`

### Testing

We use Vitest for testing. Tests are located alongside source files with `.test.ts` suffix.

**Running tests:**

```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# CLI tests
npm test -w storygraph-cli

# Watch mode (during development)
npx vitest
```

**Coverage thresholds:**

- Statements: 70%
- Branches: 65%
- Functions: 70%
- Lines: 70%

### Project Structure

```
StoryGraph/
├── packages/
│   ├── core/           # Core data model, validation, runtime
│   └── cli/            # Command-line interface
├── apps/
│   └── web/            # Next.js web application
├── scripts/            # Build and utility scripts
└── .github/            # GitHub Actions workflows
```

### Package Overview

- **@storygraph/core**: Story data model, YAML serialization, validation, runtime
- **storygraph-cli**: CLI for validate, create, stats, export, graph commands
- **storygraph-web**: Web API and future visual editor

## Making Changes

### Branching

- Create feature branches from `main`
- Use descriptive branch names: `feat/add-export-command`, `fix/validation-bug`

### Commit Messages

Follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Build/tooling changes

Examples:

```
feat(cli): add export command for HTML output
fix(runtime): handle undefined variables in conditions
test(core): add edge extraction tests
```

### Pull Requests

1. Ensure all checks pass locally:

   ```bash
   npm run health
   ```

2. Push your branch and create a PR

3. Describe your changes clearly in the PR description

4. Wait for CI checks to pass

5. Request review from maintainers

## Architecture Notes

### Core Package

The core package provides:

- **Story class**: Container for nodes, edges, metadata
- **Node types**: passage, choice, condition, variable, include, comment
- **Validator**: Structural and semantic validation
- **Serializer**: YAML parsing and generation
- **Runtime**: Story execution engine with state management

### Expression Evaluation

⚠️ Currently uses `new Function()` for conditions. This is a security concern being addressed in Phase 2.

### API Design

Web API follows REST conventions:

- `GET /api/stories` - List stories
- `POST /api/stories` - Create story
- `GET /api/stories/:id` - Get story
- `POST /api/stories/:id` - Update story
- `POST /api/stories/:id/validate` - Validate story
- `POST /api/stories/:id/play/start` - Start playthrough
- `POST /api/stories/:id/play/choose` - Make choice

## Questions?

Open an issue or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
