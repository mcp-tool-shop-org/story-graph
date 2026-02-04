# StoryGraph Semantics v0.1 (Draft)

This document defines the core semantics for StoryGraph stories. It uses normative language (MUST, SHOULD, MAY) to describe required and optional behavior.

## Scope

- This spec covers the *core subset* of StoryGraph: deterministic traversal, node/edge structure, variables, and entrypoints.
- Extended features (rich formatting, plugins, advanced exporters) are out-of-scope for v0.1 and will be defined in later revisions.

## Terminology

- **Node**: A typed story element (`passage`, `choice`, `condition`, `variable`, `include`, `comment`).
- **Edge**: A directed connection between two nodes derived from node fields (choices, conditions, next/return, etc.).
- **Entrypoint**: The unique passage node marked `start: true`. Traversal MUST begin here.
- **Traversal**: A deterministic walk over nodes following edges produced from the current node.
- **State**: The map of variable names to values in scope during traversal.
- **Side effect**: Any mutation of State (e.g., `set`, `increment`, `decrement` on variable nodes).

## Core Subset (v0.1)

The core subset is the portion of the model that all “Tier 0” exporters and validators MUST support without degradation:

- Node types: `passage`, `choice`, `condition`, `variable`, `include`, `comment` (comments MAY be ignored by exporters).
- Edges: choice targets, condition branches, variable `next`, include `return` (if present).
- State: scalar values (string | number | boolean) with deterministic updates.
- Entrypoint: exactly one `start: true` passage.
- Determinism: given the same story and initial State, traversal MUST be deterministic.

## Extended Features (placeholder)

Future revisions MAY define extended features such as:

- Rich text / formatting hints
- Timers or non-deterministic events
- Plugin-provided node/edge types
- Branch weighting / probabilistic choice

These are not part of v0.1 and exporters MAY refuse or degrade them.

## Invariants (high level)

- Exactly one entrypoint MUST exist.
- All referenced targets MUST resolve to existing nodes.
- Non-comment nodes SHOULD be reachable from the entrypoint.
- Passages without choices SHOULD be marked `ending: true` unless intentionally looping.
- Choice nodes MUST contain at least one choice.
- Include nodes SHOULD specify `return` if traversal is expected to continue after include.
- Cycles are permitted; cycles with no exit edge MUST raise a warning and MAY be treated as errors by exporters.
- Cycles with exits SHOULD be reported as informational findings.

## Determinism

- Node evaluation MUST NOT depend on external mutable state or time for the core subset.
- Variable mutations MUST be applied in declaration order within a `variable` node (`set`, then `increment`, then `decrement`).
- Condition expressions SHOULD be side-effect free; validators MAY warn if they appear effectful.

## State and Side Effects (v0.1)

- State is a map of variable name → scalar (string | number | boolean).
- `variable` nodes MAY mutate state using `set`, `increment`, and `decrement` fields. These operations MUST be applied in that order.
- `condition` expressions MUST be pure (no mutation). Apparent mutations (e.g., assignments or function calls) SHOULD raise warnings.
- Exporters MUST assume deterministic evaluation: given the same input state, the same path is taken.
- Variable nodes with no mutations SHOULD be treated as no-ops and reported as warnings.

### Normative vs heuristic checks

- Normative (MUST/SHOULD): entrypoint existence, reference integrity, determinism expectations, ordered state mutations, reachability checks.
- Heuristic (MAY warn): effectful-looking conditions, variable nodes that perform no state changes, include-without-return, cycles without exits. These are guidance, not hard errors, and exporters MAY choose stricter handling.

## Future Work (tracked)

- Formal cycle validity rules (see graph invariants document).
- State transition model per exporter (HTML, etc.).
- Warning/error code registry.
- Exporter tier mapping reference.
