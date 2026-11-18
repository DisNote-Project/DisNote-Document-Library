# ADR 0002: DOCX conversion uses canonical snapshots and semantic fallback

- Status: Accepted
- Date: 2026-11-15

## Context

DOCX can represent layout and Word-specific features that Markdown and the
DisNote schema do not represent identically. Direct DOCX ↔ Markdown conversion
would silently lose custom DisNote blocks, IDs, properties and metadata.

## Decision

Export semantic WordprocessingML plus a checksummed canonical DisNote snapshot.
On import, restore that snapshot only when WordprocessingML is unchanged and the
snapshot validates. Otherwise parse WordprocessingML semantically and emit
diagnostics. Domain blocks extend conversion through safe text codecs.

## Consequences

- Unedited DisNote DOCX files round-trip exactly.
- Edited and third-party Word files remain interoperable but may be lossy.
- Loss is visible through diagnostics.
- The library has no Microsoft Word/Pandoc runtime dependency.
- Full Word visual fidelity and every OOXML feature remain compatibility work,
  not implied by canonical round-trip success.
