# MORPH and Radical Performance — Future Composer OS Modules

**Status: PARKED**

Date: 2026-10-27  
Type: Development proposal only. Documentation only. No implementation in this commit.

**Park condition.** Do not schedule, design, or implement either module until *While We're Here* (WWH) recording and score preservation are complete. Until then: keep album originals byte-safe; keep MORPH method docs as method (not engines); keep Radical Performance Python writers in the album tree.

This file proposes **two separate** future Composer OS modules. They share WWH history and evaluation contracts. They are not one product.

| Module | Short name | Core idea |
|---|---|---|
| 1 | **MORPH** — Source-Preserving Radical Composition System | Recompose an authoritative piece in modes **M1 / M2 / M3** so identity survives large change |
| 2 | **Radical Performance** | Performance-language laboratory under **MODEL / TRANSFORM / INVENT**, generalising WWH song-specific Python score generators |

Nothing below is shipped. Nothing below authorises edits to WWH leadsheets, MORPH guitar-verified folders, Radical Performance V1/V2 scores, or Composer OS engines.

---

## 0. Existing vs proposed (read first)

### Already exists (do not re-invent)

| Area | What exists today | Where |
|---|---|---|
| MORPH method | Working method V0.3; not a Composer OS preset, not an automatic arranger, not a new evaluator | `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md` |
| MORPH history | V0.1 pilot principles; V0.2 strongest-version protection, MusicXML-only, guitar-solver contract | `docs/MORPH_FRAMEWORK_V0.1.md`, `docs/MORPH_FRAMEWORK_V0.2.md`, `docs/MORPH_DQA_V0.1-PILOT.md` |
| MORPH agent rule | MusicXML + Markdown only unless the user asks otherwise | `.cursor/rules/morph-musicxml-only.mdc` |
| GCE numeric | Official ten-category evaluator and hard gates | `docs/GCE_FRAMEWORK_V2.md`, `docs/GCE_LOCK_DCR_STANDARDS.md` |
| GCE qualitative / WWH labels | Evidence contract; no V3 score | `docs/GCE_FRAMEWORK_V3.md`, `docs/GCE_CANONICAL.md` |
| Guitar path / voicing | Reusable solvers used by MORPH procedure | `engines/composer-os-v2/core/performance-composer/pcFretboard.ts`, `engines/composer-os-v2/core/barry-harris/guitarVoicingFeasibility.ts` |
| Performance Composer (app / CLI) | Tritone-pair radical guitar lane; WWH Performance Composer V7.x; V8 UI surface | `engines/composer-os-v2/core/performance-composer/`, `engines/composer-os-v2/core/wwh/wwhPerformanceComposerV7.ts`, `apps/composer-os-app/src/pages/WwhPerformanceV8.tsx` |
| WPS | Performance Synthesis checker (does **not** write notes) | `engines/composer-os-v2/core/wwh/wps/`, `docs/WPS_WORKFLOW.md` |
| Dual-part transform CLI | Portable harmonic / contrapuntal / rhythmic profiles; source never modified | `engines/composer-os-v2/core/duo/wwhDualPartTransform.ts`, `docs/v4.0-dual-part-transform/WWH-DUAL-PART-TRANSFORM-CLI.md` |
| Musical evaluation / BMEF surface | Machine evidence receipts; human BMEF-100 V2.0 scorecard (no artistic total) | `engines/composer-os-v2/core/musical-evaluation/`, `docs/COMPOSER_OS_ARCHITECTURE.md` (V3.1-B / V3.1-C) |
| Radical Performance corpus (album) | Nine-song Radical Performance Editions, Guitar Language Labs, practice maps, BMEF evaluations; **song-specific Python writers** | Album repo folder `WWH-RADICAL-PERFORMANCE-EDITIONS/` (e.g. `01-Black-Aura/SOURCE-AUDIT/build_black_aura_pilot_v1.py`, `build_v2_tracks_01_02.py`, `_lib/scorelib.py`) |
| One-off Composer OS Python | Black Aura chord-melody V1.1 writer (not a general Radical Performance module) | `engines/composer-os-v2/scripts/wwhBlackAuraChordMelodyV11.py` |

### Proposed (this document only)

| Proposal | What it would add later |
|---|---|
| **MORPH module** | First-class Composer OS surface that runs the V0.3 procedure with structured inputs, MusicXML outputs, lock receipts, KEEP/DEVELOP/REWRITE selection, and optional reuse of existing guitar / dual-part tools |
| **Radical Performance module** | First-class Composer OS surface that generalises album **MODEL / TRANSFORM / INVENT** pedagogy and song-specific Python score generators into portable, locked MusicXML writers — without absorbing or overwriting the album editions |

---

## 1. Module A — MORPH (Source-Preserving Radical Composition System)

### 1.1 Purpose and existing Composer OS references

Turn the existing MORPH **method** into an optional Composer OS **module** that helps agents and musicians recompose an authoritative source so a listener can still recognise the piece, while harmony, counterpoint, rhythm, and register may change a great deal.

**Proposal-layer mode names** (this document) map onto authoritative V0.3 mode names. V0.3 remains the method authority (`docs/MORPH_FRAMEWORK_V0.3.md` §4). No mode is “better.” M3 is not a quality upgrade.

| Proposal name | V0.3 name | What stays obvious | What may change |
|---|---|---|---|
| **M1** Conservative transformation | Melody-led | Principal tune, substantially intact | Harmony and counterpoint |
| **M2** Structural recomposition | Motivic reconstruction | Characteristic cells, developed | Contour, interval, order of events around those cells |
| **M3** Radical transformation | Radical abstraction | Few signature motifs and formal anchors | Most of the surrounding music |

**Existing references (reuse, do not fork):** MORPH V0.1–V0.3 + operating procedure; `.cursor/rules/morph-musicxml-only.mdc`; `pcFretboard` / `guitarVoicingFeasibility`; optional consult of dual-part transform, motif-ops, Wyble guidance (reading ≠ running); GCE V2 / V3 / LOCK / DCR unchanged.

### 1.2 Inputs and outputs

**Inputs**

- Authoritative source MusicXML path + content hash (SHA-256).
- Ensemble / lock declaration (for WWH duo: upright bass event stream locked; bar count, metre, tempo, rehearsal marks, structural silences).
- Mode: `M1` | `M2` | `M3` (proposal names above; store V0.3 alias in receipts).
- Signature cells (3–5 when available): pitches, intervals, rhythm, bar.
- Formal anchors and recognition windows.
- Strongest existing arrangement path (when one exists) for KEEP / DEVELOP / REWRITE comparison.
- Optional: seed, premise text, named Composer OS helpers to consult (not claim as run unless executed).

**Outputs**

- New MusicXML arrangement(s) with **new filenames** (never overwrite authoritative leadsheets or historical MORPH folders).
- Markdown source report: locks, mode, cells, lineage, KEEP/DEVELOP/REWRITE decision.
- Optional comparative receipt vs strongest prior version.
- Optional guitar feasibility receipt via existing `pcFretboard` / `guitarVoicingFeasibility` (PASS / REVIEW / FAIL as computational results only).
- MusicXML + Markdown only by default (MORPH MusicXML-only rule).

### 1.3 Source-preservation and musical locks

1. Source files stay read-only.
2. Declared locks hold, or every break is written **before** notes change.
3. Strongest-version protection: do not replace a stronger page because a candidate is “more radical” or changes more notes.
4. One corrective pass; if weaker, revert and say why.
5. Method commits in `creative-engines`; score commits in the album repository.
6. Do not retitle old scores as V0.3 because the method document moved.
7. Melodic-identity guardrails from V0.3 §5 remain mandatory: signature motifs, formal anchors, recognition windows, transformational lineage, meaningful return.

### 1.4 BMEF / GCE quality criteria

- **GCE V2.0:** numeric only when the official evaluator runs on a representation it was built to score. Do not invent scores for hand-authored WWH files. Hard gates and formulas unchanged.
- **GCE V3.0:** qualitative evidence checklist (identity, development, idiom, what was verified). No V3 score.
- **WWH labels:** TECHNICAL FAIL · MUSICAL REVISE · CANDIDATE FOR AUDITION · MUSICALLY APPROVED — evidence labels only; automation never confers MUSICALLY APPROVED.
- **BMEF-100 V2.0:** human review via existing evaluation surface (`musical-evaluation/`, human review records). Machine receipts stay descriptive; no artistic total. Weights remain **[Proposed]** until calibrated.
- Guitar PASS ≠ candidate for audition ≠ musical approval.
- Listening heuristic 65% melody / 20% harmony / 40% rhythm (V0.3 / GCE V3) is **not** a note-count quota.

### 1.5 Dependencies and integration points

| Dependency | Role |
|---|---|
| `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md` | Method authority |
| `pcFretboard.ts`, `guitarVoicingFeasibility.ts` | Optional feasibility receipts |
| Dual-part transform, motif-ops, Wyble docs, Liquid Harmony / Vault / pentatonic / hexatonic | Optional helpers when function fits locks |
| GCE / LOCK / DCR docs + `musical-evaluation/` | Evaluation contracts only |
| Album MORPH guitar-verified corpus | Preservation reference (external) |

**Integration points (future):** CLI or app entry beside Performance Composer / Evaluation; shared MusicXML I/O + hash locks; **no** merge with Song Mode slices, Tritone Pair, or Radical Performance Editions.

### 1.6 Minimal implementation sequence (MORPH only)

Do not start until park status is explicitly lifted.

1. **Freeze inventory.** Hash authoritative leadsheets and MORPH guitar-verified set; record external album paths.
2. **Skeleton.** Types for mode (M1/M2/M3 + V0.3 aliases), locks, cells, KEEP/DEVELOP/REWRITE; entry that validates locks + writes a source report (no note writing).
3. **Write path.** DEVELOP-only edits behind strongest-version compare; wire guitar solvers as receipts; MusicXML + Markdown export.
4. **Evaluation hookup.** Machine evidence receipts + empty human BMEF review; GCE V2 only when representation matches evaluator.
5. **Transfer gate.** Run on three non-design pieces before calling MORPH module V1.0 (`docs/MORPH_FRAMEWORK_V0.3.md` §16).
6. **UI (last).** Optional surface — not before lock tests and preservation proofs pass.

### 1.7 What MORPH module is not

- Not a Song Mode songwriter slice.
- Not a replacement for Performance Composer Tritone Pair.
- Not a replacement for Radical Performance Editions.
- Not automatic musical approval.
- Not permission to edit WWH originals.

---

## 2. Module B — Radical Performance (MODEL / TRANSFORM / INVENT)

### 2.1 Purpose and existing Composer OS references

Propose a Composer OS module that analyses, transforms, and invents **performance language** for locked sources — producing performance editions and guitar language laboratory scores. Pedagogue triad already present in WWH Radical Performance Guitar Language Labs:

| Stage | Proposal role | Lab score behaviour (album precedent) |
|---|---|---|
| **MODEL** | Analyse musical performance language; write a clear exemplar of a cell, grip, voice, or gesture | Written model under locked bass / form |
| **TRANSFORM** | Apply performance-language transformations (inner voice, register, rhythm, hold-one-move-one, etc.) | Controlled change while identity remains audible |
| **INVENT** | Generate new performance approaches; leave space for the player | Empty or lightly cued bars; page can be shut |

Today those scores are built by **song-specific Python generators** in the album tree (`WWH-RADICAL-PERFORMANCE-EDITIONS/**/build_*.py`, shared `_lib/scorelib.py`). Composer OS already has related **but distinct** surfaces (Performance Composer V7/V8, Tritone Pair, WPS checker, dual-part transform). This proposal is a future **generalised writer / lab module**, not a claim that those surfaces already implement MODEL/TRANSFORM/INVENT.

### 2.2 Inputs and outputs

**Inputs**

- Authoritative duo leadsheet MusicXML + hash.
- Song blueprint / landmark list (cells, returns, silences) — song-specific where the music requires it; portable schema where possible.
- Mode flags: performance edition, guitar language lab, or both.
- Lab curriculum: MODEL / TRANSFORM / INVENT bar plan (or section letters).
- Locks: bass stream, metre, tempo map, form / rehearsal marks, octave-change conventions.
- Optional: seed for any generative fills that remain within locks (default preference: authored cells like current Python writers).

**Outputs**

- Radical Performance MusicXML (new names; never replace leadsheets or prior edition versions).
- Guitar Language Lab MusicXML with explicit MODEL / TRANSFORM / INVENT cues.
- Practice / performance maps (Markdown).
- Validation report: hash locks before/after; bass / metre / form receipts.
- Optional BMEF human review stub via existing evaluation dashboard path.
- Default deliverables: MusicXML + Markdown (align with MORPH MusicXML-only discipline unless user asks otherwise).

### 2.3 Source-preservation and musical locks

1. Leadsheet and prior Radical Performance versions stay byte-identical unless an explicit new edition is authorised.
2. Clone leadsheet → rewrite allowed parts only (typical WWH pattern: guitar rewrite; bass / metre / tempo / transposition / rehearsal / harmony policy as declared per edition).
3. Hash lock inventory before and after every write (album batch scripts already do this pattern).
4. Do not open or modify Composer OS engines from album Python writers; future module must not silently rewrite album originals.
5. No TAB in released music.
6. Invent bars may be empty on purpose; do not “fill invent” to satisfy a generator quota.
7. MODEL analysis receipts must cite actual source cells / grips; TRANSFORM must declare lineage; INVENT must not invent locked-bass events.

### 2.4 BMEF / GCE quality criteria

- Album BMEF evaluations under `WWH-RADICAL-PERFORMANCE-EDITIONS/BMEF-EVALUATIONS/` remain the human precedent; weights stay **[Proposed]** per BMEF-100 V2.0.
- Composer OS `evaluateScore` / compare / human review records for machine evidence + human scorecard — no artistic total from software.
- GCE V2.0 numeric only if the official evaluator is applicable to the representation; hard gates unchanged.
- GCE V3.0 evidence layers for radical reworking (identity heuristics 65/20/40 listening guide, not quotas).
- WPS may remain a **checker** for synthesis gates; it does not become the note writer for this module unless a later design explicitly merges them (not proposed here).
- Playability / grip checks are computational receipts only — not musical approval.

### 2.5 Dependencies and integration points

| Dependency | Role |
|---|---|
| Album Python generators + `_lib/scorelib.py` | Behavioural reference (redesign before production port) |
| Performance Composer fretboard / grip checks | Optional feasibility receipts |
| Dual-part transform / bass-only transform | Complementary tools (different contracts) |
| `musical-evaluation/` + BMEF human review | Evidence + human scorecard |
| WPS docs | Optional synthesis checking later |
| `docs/COMPOSER_OS_ROADMAP.md` Performance Composer radical mode note | Park / recording sequencing context |

**Integration points (future):** sandbox MusicXML writer beside Performance Composer; shared hash-lock + evaluation hooks; **no** overwrite of album `WWH-RADICAL-PERFORMANCE-EDITIONS/`; **no** merge with MORPH M1/M2/M3 arrangement logic.

### 2.6 Minimal implementation sequence (Radical Performance only)

Do not start until park status is explicitly lifted.

1. **Freeze inventory.** Hash Radical Performance V1/V2 trees and authoritative leadsheets; record external album paths.
2. **Schema.** Portable MODEL/TRANSFORM/INVENT lab plan + performance blueprint types; import one album song as a fixture without modifying album files.
3. **Writer.** Port patterns from album `_lib/scorelib.py` / `build_*.py` into Composer OS with strict lock tests; emit lab + performance to a sandbox output directory.
4. **Evaluation hookup.** Machine evidence receipts + empty human BMEF review; GCE V2 only when representation matches evaluator.
5. **Transfer gate.** At least one non-WWH duo before claiming portability.
6. **UI (last).** Optional surface beside Performance Composer / Evaluation — not before lock tests and preservation proofs pass.

### 2.7 What Radical Performance module is not

- Not MORPH M1/M2/M3 (different job: performance/lab pedagogy vs arrangement recomposition modes).
- Not Tritone Pair alone (one field grammar among many possible performance strategies).
- Not WPS (checker, not score author).
- Not permission to regenerate or overwrite the nine-song album editions during the park window.

---

## 3. How the two modules relate (and stay separate)

```text
Authoritative leadsheet (locked)
        │
        ├──────────────────────────────┐
        ▼                              ▼
   MORPH module                   Radical Performance module
   Source-Preserving Radical      MODEL / TRANSFORM / INVENT
   Composition System             performance-language lab
   M1 / M2 / M3                   analyse / transform / invent
        │                              │
        └──────────┬───────────────────┘
                   ▼
     Shared evaluation contracts only:
     GCE V2 (when applicable) · GCE V3 evidence · BMEF human review
     Source hash locks · MusicXML preservation
```

Shared infrastructure may include MusicXML I/O, hash locks, fretboard feasibility, and evaluation receipts. Shared **composition logic** is not assumed. A MORPH M3 score is not automatically a Radical Performance Edition. A Guitar Language Lab invent bar is not a MORPH rewrite.

---

## 4. Shared unpark gate and non-goals

### 4.1 Explicit non-goals while PARKED

- No Composer OS engine implementation for either module.
- No regeneration of WWH Radical Performance or MORPH score trees.
- No merging MORPH and Radical Performance into one preset.
- No invented GCE / BMEF totals.
- No audio / MIDI / TAB / ZIP packaging as part of either module’s default contract.
- No roadmap priority bump that competes with recording/preservation work.

### 4.2 Unpark criteria (all required)

1. WWH recording session complete (or explicitly cancelled / rescheduled by owner).
2. Preservation inventory of authoritative leadsheets and approved performance editions hashed and stored.
3. Written decision to unpark this document (owner ack).
4. Fresh risk note: which album files remain immutable during first implementation slices.

Until then: **PARKED**.

---

## 5. Reference index

### MORPH (creative-engines)

- `docs/MORPH_FRAMEWORK_V0.3.md`
- `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`
- `docs/MORPH_FRAMEWORK_V0.2.md`
- `docs/MORPH_FRAMEWORK_V0.1.md`
- `.cursor/rules/morph-musicxml-only.mdc`

### Evaluation

- `docs/GCE_FRAMEWORK_V2.md`
- `docs/GCE_FRAMEWORK_V3.md`
- `docs/GCE_LOCK_DCR_STANDARDS.md`
- `docs/GCE_CANONICAL.md`
- `engines/composer-os-v2/core/musical-evaluation/`

### Related Composer OS (existing, not this proposal)

- `engines/composer-os-v2/core/performance-composer/`
- `engines/composer-os-v2/core/wwh/`
- `engines/composer-os-v2/core/duo/wwhDualPartTransform.ts`
- `docs/WPS_WORKFLOW.md`
- `docs/v4.0-dual-part-transform/WWH-DUAL-PART-TRANSFORM-CLI.md`
- `docs/COMPOSER_OS_ROADMAP.md` (Performance Composer / WPS bullets)

### Album Radical Performance (external reference)

- `…/ECM-Album-Nov-2027/WWH-RADICAL-PERFORMANCE-EDITIONS/`
- Per-song `build_*_performance_v1.py`, `build_*_guitar_lab_v1.py`, `build_v2_tracks_*.py`
- `_lib/scorelib.py`
- `BMEF-EVALUATIONS/`
