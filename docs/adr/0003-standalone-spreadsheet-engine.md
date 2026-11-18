# ADR 0003: Spreadsheet is a standalone sibling platform

## Status

Accepted - 2026-11-15.

## Context

DisNote needs Excel/Sheets-style workbooks that external products can integrate
without adopting the document editor. Reusing document table blocks would couple
cell addressing, formulas, large sparse grids and XLSX fidelity to the document
schema and editor lifecycle.

## Decision

Create `@disnote/sheets` as an independently publishable, headless package. It
owns its workbook schema, safe formula engine, import/export adapters, plugin
boundary and repository contracts. It does not import the document package or a
grid/database vendor.

## Consequences

- Consumers pay only for spreadsheet capabilities they install.
- Document and Spreadsheet evolve and version independently.
- A host may reference workbook IDs from documents, but must not persist a full
  workbook as a document block.
- Grid UI, collaboration and host authorization remain replaceable adapters.
- Cross-platform composition needs explicit host-level permissions and lifecycle
  policy rather than hidden coupling between the two cores.

## Alternatives rejected

- A document table block cannot model large sparse grids or Excel semantics.
- Embedding a specific grid vendor in core would make persistence and UI upgrades
  vendor-dependent.
- Reusing the Notion-style database domain would conflate typed records/views
  with coordinate-based spreadsheet calculation.
