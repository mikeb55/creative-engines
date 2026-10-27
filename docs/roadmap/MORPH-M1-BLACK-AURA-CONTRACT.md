# MORPH M1 — Black Aura Contract

**Status:** Draft contract only. Documentation only. No implementation authorised by this file.

**Date:** 2026-10-27
**Mode:** M1 (Melody-led / Conservative transformation) per `docs/MORPH_FRAMEWORK_V0.3.md`
**Milestone context:** Locked-bass M1 DEVELOP proof — see `docs/roadmap/MORPH-RADICAL-ARCHITECTURE-RECONCILIATION.md` §6

---

## 1. Authoritative source (immutable)

| Field | Value |
|---|---|
| Filename | `01-Black-Aura-Duo-Leadsheet-V2.0.musicxml` |
| Directory | `/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/` |
| SHA-256 | `b85f7731f0232c02ae588c63f2950037a340f62af64fe42b74b03157da4fccfd` |
| Form | 39 bars |
| Ensemble | Duo leadsheet (guitar + upright bass) |

**Immutability.** Source file must not be overwritten, renamed in place, or edited in place. Any MORPH M1 work writes **new** MusicXML and Markdown under separate output paths. Byte identity of the source is verified by SHA-256 before and after any run that claims this contract.

---

## 2. Locks (must hold)

| Lock | Requirement |
|---|---|
| Bass notes | Bass pitch content locked to source |
| Bass rhythm | Bass rhythmic event stream locked to source |
| Form | 39-bar form locked (bar count and formal span) |
| Metre | Preserved from source |
| Tempo | Preserved from source |
| Rehearsal markers | Preserved from source |

**Guitar.** Guitar development is permitted **only** within the locks above. Guitar changes must not alter locked bass, form, metre, tempo, or rehearsal markers.

**Deliverable rule.** Outputs = separate MusicXML (+ Markdown reports). Never mutate the authoritative leadsheet.

---

## 3. Source identity, lineage, and human approval

Every M1 candidate under this contract must record:

1. **Source identity** — path, filename, SHA-256, mode `M1`, and declared identity profile (cells / anchors / recognition windows when declared).
2. **Lineage** — how new guitar material derives from named source cells or prior strongest arrangement (KEEP / DEVELOP / REWRITE per MORPH V0.3). Comparative baselines named when used.
3. **Human approval** — artistic review state (`ACCEPT` / `REVISE` / `REJECT` or equivalent human BMEF / audition note). Automation must not claim `MUSICALLY APPROVED` or invent a GCE number. Machine receipts and human approval stay separate evidence tiers.

---

## 4. Composer OS helper reuse (verified existing only)

Reuse **existing, verified** Composer OS helpers. Do not invent parallel lock, fret, or evaluation stacks for this contract.

**Authorised reuse targets (examples already in repo):**

| Concern | Existing helpers (reuse; do not fork) |
|---|---|
| Bass / span lock verify | `verifyLockedCopy` (`pcLane`), `compareLockedSpan` (`wwhSourceCompare`), dual-part hash / lock patterns as appropriate |
| Guitar feasibility (computational) | `solveFretPath` / `pcFretboard`, grip checks via `guitarVoicingFeasibility` |
| Dual-part / lane transforms (optional consult) | `wwhDualPartTransform` and related Performance Composer lane writers — only where locks remain enforceable |
| Evaluation receipts | Existing musical-evaluation / `evaluateScore` surfaces; GCE only on supported representations — never invent scores |
| Method authority | `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`, `.cursor/rules/morph-musicxml-only.mdc` |

**Out of scope for this contract document:** implementation, new engines, album overwrite, M2/M3, audio/MIDI/ZIP packaging, batch nine-song work.

---

## 5. Contract summary

- Source immutable; outputs written separately.
- Bass notes/rhythm and 39-bar form locked.
- Metre, tempo, and rehearsal markers preserved.
- Guitar development permitted within these locks.
- Source identity, lineage, and human approval recorded.
- Reuse verified existing Composer OS helpers only.

**This file drafts the contract only. It does not authorise code, tests, commits, or pushes.**
