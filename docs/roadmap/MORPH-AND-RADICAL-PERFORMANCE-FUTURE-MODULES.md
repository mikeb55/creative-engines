# MORPH and Radical Performance — Future Composer OS Modules

**Status: PARKED**

Date: 2026-10-27  
Type: Development proposal only. Documentation only. No implementation in this commit.

**Park condition.** Do not schedule, design, or implement either module until *While We're Here* (WWH) recording and score preservation are complete. Until then, keep album originals byte-safe, keep MORPH method docs as method (not engines), and keep Radical Performance Python writers in the album tree.

This file proposes **two separate** future Composer OS modules. They share WWH history and evaluation contracts. They are not one product.

| Module | Short name | Core idea |
|---|---|---|
| 1 | **MORPH** | Recompose an authoritative piece in modes **M1 / M2 / M3** so identity survives large change |
| 2 | **Radical Performance** | Performance and laboratory scores under **MODEL / TRANSFORM / INVENT**, generalising WWH song-specific Python score generators |

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

Nothing below is shipped. Nothing below authorises edits to WWH leadsheets, MORPH guitar-verified folders, Radical Performance V1/V2 scores, or Composer OS engines.

---

## 1. Module A — MORPH (M1 / M2 / M3 recomposition)

### 1.1 Purpose

Turn the existing MORPH **method** into an optional Composer OS **module** that helps agents and musicians recompose an authoritative source so a listener can still recognise the piece, while harmony, counterpoint, rhythm, and register may change a great deal.

Authority for modes and locks remains V0.3:

| Mode | Name | What stays obvious | What may change |
|---|---|---|---|
| **M1** | Melody-led | Principal tune, substantially intact | Harmony and counterpoint |
| **M2** | Motivic reconstruction | Characteristic cells, developed | Contour, interval, order of events around those cells |
| **M3** | Radical abstraction | Few signature motifs and formal anchors | Most of the surrounding music |

No mode is “better.” M3 is not a quality upgrade (`docs/MORPH_FRAMEWORK_V0.3.md` §4).

### 1.2 Proposed inputs

- Authoritative source MusicXML path + content hash (SHA-256).
- Ensemble / lock declaration (for WWH duo: upright bass event stream locked; bar count, metre, tempo, rehearsal marks, structural silences).
- Mode: `M1` | `M2` | `M3`.
- Signature cells (3–5 when available): pitches, intervals, rhythm, bar.
- Formal anchors and recognition windows.
- Strongest existing arrangement path (when one exists) for KEEP / DEVELOP / REWRITE comparison.
- Optional: seed, premise text, named Composer OS helpers to consult (not claim as run unless executed).

### 1.3 Proposed outputs

- New MusicXML arrangement(s) with **new filenames** (never overwrite authoritative leadsheets or historical MORPH folders).
- Markdown source report: locks, mode, cells, lineage, KEEP/DEVELOP/REWRITE decision.
- Optional comparative receipt vs strongest prior version.
- Optional guitar feasibility receipt via existing `pcFretboard` / `guitarVoicingFeasibility` (PASS / REVIEW / FAIL as computational results only).
- MusicXML + Markdown only by default (MORPH MusicXML-only rule).

### 1.4 Preservation rules (carry forward)

1. Source files stay read-only.
2. Declared locks hold, or every break is written **before** notes change.
3. Strongest-version protection: do not replace a stronger page because a candidate is “more radical” or changes more notes.
4. One corrective pass; if weaker, revert and say why.
5. Method commits in `creative-engines`; score commits in the album repository.
6. Do not retitle old scores as V0.3 because the method document moved.

### 1.5 BMEF / GCE evaluation (proposed use of existing tools)

- **GCE V2.0:** numeric only when the official evaluator runs on a representation it was built to score. Do not invent scores for hand-authored WWH files.
- **GCE V3.0:** qualitative evidence checklist (identity, development, idiom, what was verified). No V3 score.
- **WWH labels:** TECHNICAL FAIL · MUSICAL REVISE · CANDIDATE FOR AUDITION · MUSICALLY APPROVED — evidence labels only; automation never confers MUSICALLY APPROVED.
- **BMEF-100 V2.0:** human review via existing evaluation surface (`musical-evaluation/`, human review records). Machine receipts stay descriptive; no artistic total.
- Guitar PASS ≠ candidate for audition ≠ musical approval.

### 1.6 Dependencies (existing)

- `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`
- Guitar solvers: `pcFretboard.ts`, `guitarVoicingFeasibility.ts`
- Optional helpers (consult only when function fits locks): dual-part transform, motif-ops, Wyble guidance docs, Liquid Harmony / Vault / pentatonic / hexatonic — **reading ≠ running**
- GCE / LOCK / DCR docs unchanged by MORPH module work
- Album MORPH guitar-verified corpus (outside this repo): preservation reference only

### 1.7 What MORPH module is not

- Not a Song Mode songwriter slice.
- Not a replacement for Performance Composer Tritone Pair.
- Not a replacement for Radical Performance Editions.
- Not automatic musical approval.
- Not permission to edit WWH originals.

---

## 2. Module B — Radical Performance (MODEL / TRANSFORM / INVENT)

### 2.1 Purpose

Propose a Composer OS module that can produce **performance editions** and **guitar language laboratory** scores for locked duo (and later other) sources, using the pedagogical triad already present in WWH Radical Performance Guitar Language Labs:

| Stage | Role |
|---|---|
| **MODEL** | Written exemplar of a cell, grip, voice, or gesture under locked bass / form |
| **TRANSFORM** | Controlled change (inner voice, register, rhythm, hold-one-move-one, etc.) while identity remains audible |
| **INVENT** | Empty or lightly cued bars; player supplies the next event; page can be shut |

Today those scores are built by **song-specific Python generators** in the album tree (`WWH-RADICAL-PERFORMANCE-EDITIONS/**/build_*.py`, shared `_lib/scorelib.py`). Composer OS already has related **but distinct** surfaces (Performance Composer V7/V8, Tritone Pair, WPS checker, dual-part transform). This proposal is a future **generalised writer / lab module**, not a claim that those surfaces already implement MODEL/TRANSFORM/INVENT.

### 2.2 Proposed inputs

- Authoritative duo leadsheet MusicXML + hash.
- Song blueprint / landmark list (cells, returns, silences) — song-specific where the music requires it; portable schema where possible.
- Mode flags: performance edition, guitar language lab, or both.
- Lab curriculum: MODEL / TRANSFORM / INVENT bar plan (or section letters).
- Locks: bass stream, metre, tempo map, form / rehearsal marks, octave-change conventions.
- Optional: seed for any generative fills that remain within locks (default preference: authored cells like current Python writers).

### 2.3 Proposed outputs

- Radical Performance MusicXML (new names; never replace leadsheets or prior edition versions).
- Guitar Language Lab MusicXML with explicit MODEL / TRANSFORM / INVENT cues.
- Practice / performance maps (Markdown).
- Validation report: hash locks before/after; bass / metre / form receipts.
- Optional BMEF human review stub via existing evaluation dashboard path.
- Default deliverables: MusicXML + Markdown (align with MORPH MusicXML-only discipline unless user asks otherwise).

### 2.4 Preservation rules (carry forward from album practice)

1. Leadsheet and prior Radical Performance versions stay byte-identical unless an explicit new edition is authorised.
2. Clone leadsheet → rewrite allowed parts only (typical WWH pattern: guitar rewrite; bass / metre / tempo / transposition / rehearsal / harmony policy as declared per edition).
3. Hash lock inventory before and after every write (album batch scripts already do this pattern).
4. Do not open or modify Composer OS engines from album Python writers; future module must not silently rewrite album originals.
5. No TAB in released music.
6. Invent bars may be empty on purpose; do not “fill invent” to satisfy a generator quota.

### 2.5 BMEF / GCE evaluation (proposed use of existing tools)

- Album BMEF evaluations under `WWH-RADICAL-PERFORMANCE-EDITIONS/BMEF-EVALUATIONS/` remain the human precedent; weights stay **[Proposed]** per BMEF-100 V2.0.
- Composer OS `evaluateScore` / compare / human review records for machine evidence + human scorecard — no artistic total from software.
- GCE V2.0 numeric only if the official evaluator is applicable to the representation.
- GCE V3.0 evidence layers for radical reworking (identity heuristics 65/20/40 listening guide, not quotas).
- WPS may remain a **checker** for synthesis gates; it does not become the note writer for this module unless a later design explicitly merges them (not proposed here).

### 2.6 Dependencies (existing)

- Album Python generators and `_lib/scorelib.py` as behavioural reference (not to be copied wholesale into production without redesign).
- Performance Composer fretboard / grip checks for optional feasibility receipts.
- Dual-part transform / bass-only transform as optional complementary tools (different contracts).
- Musical evaluation service + BMEF human review.
- WPS docs if synthesis checking is requested later.
- Roadmap context: Performance Composer radical mode parked relative to recording (`docs/COMPOSER_OS_ROADMAP.md` Performance Composer radical mode note).

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
   M1 / M2 / M3                   MODEL / TRANSFORM / INVENT
   arrangement recomposition      performance + language lab
        │                              │
        └──────────┬───────────────────┘
                   ▼
     Shared evaluation contracts only:
     GCE V2 (when applicable) · GCE V3 evidence · BMEF human review
     Source hash locks · MusicXML preservation
```

Shared infrastructure may include MusicXML I/O, hash locks, fretboard feasibility, and evaluation receipts. Shared **composition logic** is not assumed. A MORPH M3 score is not automatically a Radical Performance Edition. A Guitar Language Lab invent bar is not a MORPH rewrite.

---

## 4. Minimal future implementation sequence (after unpark)

Do not start until WWH recording and preservation are done and this park status is explicitly lifted.

1. **Freeze inventory.** Hash authoritative leadsheets, MORPH guitar-verified set, and Radical Performance V1/V2 trees. Record paths outside `creative-engines` as external sources.
2. **MORPH module skeleton.** Types for mode, locks, cells, KEEP/DEVELOP/REWRITE; CLI or app entry that only validates locks + writes a source report (no note writing yet).
3. **MORPH write path.** DEVELOP-only edits behind strongest-version compare; wire existing guitar solvers as receipts; MusicXML+Markdown export.
4. **Radical Performance schema.** Portable MODEL/TRANSFORM/INVENT lab plan + performance blueprint types; import one album song as a fixture without modifying album files.
5. **Radical Performance writer.** Port patterns from album `_lib/scorelib.py` / `build_*.py` into Composer OS with strict lock tests; emit lab + performance to a sandbox output directory.
6. **Evaluation hookup.** `evaluateScore` receipts + empty human BMEF review; GCE V2 only when representation matches evaluator.
7. **One non-WWH transfer each.** MORPH on three non-design pieces before calling MORPH V1.0 (`docs/MORPH_FRAMEWORK_V0.3.md` §16). Radical Performance on at least one non-WWH duo before claiming portability.
8. **UI (last).** Optional surfaces beside Performance Composer / Evaluation — not before lock tests and preservation proofs pass.

Stop after each step with evidence. No infinite refine loops. No album overwrite as a convenience.

---

## 5. Explicit non-goals while PARKED

- No Composer OS engine implementation for either module.
- No regeneration of WWH Radical Performance or MORPH score trees.
- No merging MORPH and Radical Performance into one preset.
- No invented GCE / BMEF totals.
- No audio / MIDI / TAB / ZIP packaging as part of either module’s default contract.
- No roadmap priority bump that competes with recording/preservation work.

---

## 6. Unpark criteria (all required)

1. WWH recording session complete (or explicitly cancelled / rescheduled by owner).
2. Preservation inventory of authoritative leadsheets and approved performance editions hashed and stored.
3. Written decision to unpark this document (owner ack).
4. Fresh risk note: which album files remain immutable during first implementation slices.

Until then: **PARKED**.

---

## 7. Reference index

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
