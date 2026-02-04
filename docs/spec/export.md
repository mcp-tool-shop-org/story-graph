# StoryGraph Export Specification (Draft v0.1)

This document defines export fidelity tiers, warning codes, and guarantees for StoryGraph exporters. Normative language uses MUST/SHOULD/MAY.

## Export Fidelity Tiers

- **Tier 0 (Guaranteed Core)**: Features that MUST export with full fidelity. No degradation allowed.
- **Tier 1 (Supported with Warnings)**: Features that MAY degrade gracefully; exporters MUST emit warnings describing the degradation.
- **Tier 2 (Unsupported)**: Features not supported by the exporter; exporters MUST emit warnings and MAY omit or stub behavior.

## Warning Codes

Warning codes are stable identifiers shared across exporters. Format: `EXP###`.

- EXP001: Feature not supported by target exporter (dropped or stubbed).
- EXP002: Feature degraded with altered behavior.
- EXP003: Include node ignored or flattened.
- EXP004: Condition logic simplified or removed.
- EXP005: Variable/state changes ignored.
- EXP006: Cycle handling differs from core behavior.
- EXP007: Formatting/markup stripped.
- EXP008: Attachment or media omitted.
- EXP009: Unknown node type skipped.

Exporters MAY extend this list; new codes SHOULD be documented.

## Feature → Tier Matrix (Twine target, v0.1)

| Feature                         | Tier  | Notes |
|--------------------------------|-------|-------|
| Passage content                | 0     | Plain text preserved |
| Choices (text + target)        | 0     | Targets must exist |
| Start node                     | 0     | Required |
| Ending marker                  | 0     | Exported as terminal passage |
| Comments                       | 1     | Dropped; emit EXP001 |
| Condition nodes                | 1     | Flattened; emit EXP004 |
| Variable nodes                 | 1     | Ignored; emit EXP005 |
| Include nodes                  | 1     | Flattened; emit EXP003 |
| Tags/notes                     | 1     | Dropped; emit EXP007 |
| Rich formatting (future)       | 2     | Not supported |
| Plugins/extended node types    | 2     | Not supported |

## Guarantees

- Tier 0 features MUST produce functionally equivalent behavior in the exported artifact.
- Tier 1 features MUST emit at least one warning describing the degradation.
- Tier 2 features MUST emit warnings and MAY omit functionality entirely.

## Export Result Contract

- Exporters return `ExportResult`:
  - `files[]`: name + contents (UTF-8) for each emitted asset.
  - `warnings[]`: array of `{ code, message, nodeId?, details? }`.
- Exporters SHOULD be pure functions of `(story, options)`.
- Exporters MUST NOT mutate the source story.

## Future Work

- Add HTML exporter matrix.
- Add EPUB/Ink/Ren'Py matrices.
- Register additional warning codes for media, styles, and scripting.
