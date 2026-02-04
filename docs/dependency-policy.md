# Dependency Policy

- **Runtime**: Node `22.21.1` (see `.nvmrc` and `engines`); CI uses `npm ci`.
- **Lockfile**: npm (`package-lock.json`) is the supported installer/lock. Avoid committing yarn/pnpm lockfiles unless tooling is updated to support them.
- **Overrides**: `esbuild@0.27.2` is pinned via `overrides` to address GHSA-67mh-4wv8-2f99 in transitive Vite/Vitest. Remove the override once upstream Vite/Vitest ship with a patched esbuild and npm audit stays clean without it.
- **Automation**: Dependabot monitors Vite/Vitest/esbuild weekly to keep the stack current.
