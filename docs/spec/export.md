# StoryGraph Export Specification (Draft v0.1)

This document defines export fidelity tiers, warning codes, and guarantees for StoryGraph exporters. Normative language uses MUST/SHOULD/MAY. No exporter is currently bundled; this spec remains for future exporters.

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

- Add exporter matrices (HTML, Twine, EPUB, Ink, Ren'Py) when a built-in exporter is introduced.
- Register additional warning codes for media, styles, and scripting as exporters land.
