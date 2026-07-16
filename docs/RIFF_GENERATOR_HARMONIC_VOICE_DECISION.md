# Riff Generator: harmonicVoice vs riffVrbId — Design Decision (2026-07-08)

## Decision
Keep harmonicVoice and riffVrbId as separate fields and separate UI controls. They represent different musical axes: harmonicVoice controls harmonic/chordal color across the broader style catalogue (~80 styles), while riffVrbId controls rhythmic/idiomatic riff pattern selection for the smaller set of styles that actually have riffProfile content (16 styles). Do not unify them into one picker.

## Contract
- riffVrbId is the sole authority for riff pattern / idiom on the Riff Generator preset (`parseRiffVrbId -> riffProfile`), unless the user explicitly enables the soft-link toggle.
- harmonicVoice does not drive riff pattern selection on this preset by default.
- Optional soft link only, never silent: UI toggle **Also use HV as riff pattern?** (`riffSoftLinkHvAsPattern`, default OFF) copies `harmonicVoice` into `riffVrbId` when the id is in `RIFF_GENERATOR_VRB_IDS`. **COMPLETE 2026-07-16.**
- If no riff bundle exists for a selected harmonic style, the riff control remains whatever the user explicitly chose in the Riff pattern dropdown. Show "No dedicated riff library for [style]" only if the user attempted the explicit link.
- Never silently fall back to the primary style's riff bundle.
- Never generate a generic riff while labeling it as a specific artist's riff style.
- Phase B chord colour (separate axis): toggle **Use HV for riff pattern too?** (`riffUseHvForPattern`) applies HV colour under the riff via `colourRiffChordsWithHv` — does **not** change pattern selection. **COMPLETE 2026-07-16.**

## Why
Comparable systems typically separate harmonic content from rhythmic/pattern selection rather than forcing both into a single style control:
- Band-in-a-Box separates chord/harmonic input from style-based accompaniment behavior.
- Logic Pro separates chordal/harmonic context from groove/performance agents.
- Scaler separates chord suggestion/harmonic tools from performance phrases.
- Kontakt phrase libraries commonly separate source harmony from phrase or articulation selection.
- Arranger-keyboard workflows typically separate accompaniment/style engine choice from the specific harmonic input being fed into it.

A unified picker works best only when there is a complete 1:1 catalogue between harmonic styles and riff-pattern libraries. This system is asymmetric: the harmonic catalogue is broad (~80 styles), while riff-pattern coverage is much smaller (16 styles with riffProfile content). Unifying the controls would therefore create a misleading UX: either silent fallbacks, or a large style list with many effectively dead entries for riff generation.

## Phase A honesty ship (2026-07-15) — COMPLETE

Locked choices: **A)** honesty-only (no soft-link toggle at ship time) · **B)** this doc is sufficient (no authority-table-in-code) · **C)** grey out HV with short note (not hide).

Shipped:
- [x] UI: On `riff_generator`, Harmonic Voice control is **visible but greyed out** with short copy that pattern authority is **riffVrbId** (`SlonimskyUniversalPanel` `harmonicVoiceReadOnly`).
- [x] Payload: Generate does **not** forward `harmonicVoice` on `riff_generator` when colour toggle OFF.
- [x] Engine: `parseRiffVrbId` still reads `riffVrbId` only (unchanged pattern behaviour).
- [x] Receipt: `harmonicVoiceIgnoredOnRiffPreset: true` on `GenerateResult`, `runManifest`, and output `_meta` manifest.

## Phase B (Iter 1–3) — COMPLETE (2026-07-16)

Chord colour under the riff, gated by `riffUseHvForPattern` (UI label: **Use HV for riff pattern too?**). Pattern authority remains `riffVrbId` unless soft-link is also on.

- [x] **Iter 1** — toggle + read-only HV wire (`hvChordColourReadOnly` / `riffHvChordColourReadOnly`); OFF = Phase A identity.
- [x] **Iter 2** — `colourRiffChordsWithHv` applies mosaic `getDispatchEntry` colour to chord symbols; profile still from uncoloured loop.
- [x] **Iter 3** — full smoke ×2: **772**/141 · known **5** · unexpected **0**; OFF identity; ON colour (`bill_evans` Dm7→Cmaj9); mosaic non-riff HV 4/4.

## Soft-link HV → riffVrbId — COMPLETE (2026-07-16)

Explicit pattern copy, separate from Phase B chord colour.

- [x] UI toggle **Also use HV as riff pattern?** (`riffSoftLinkHvAsPattern`, default OFF).
- [x] `resolveRiffSoftLinkHv` — copy when HV ∈ `RIFF_GENERATOR_VRB_IDS`; mismatch note otherwise.
- [x] Full validation smoke ×2: **772**/141 · known **5** · unexpected **0**; ON sample `nile_rodgers`→`jamerson` pattern swap; Phase B colour still PASS.

## Pre-implementation checklist
- [x] Soft link UI / HV → `riffVrbId` copy when id in `RIFF_GENERATOR_VRB_IDS` (**COMPLETE 2026-07-16**).
- [ ] Authority table in code (optional; doc is enough).
- [x] Phase B Iter 1–3 chord colour + smoke (**COMPLETE 2026-07-16**).
- [x] GCE / LOCK independent: pattern still `riffVrbId` by default; colour gated; main composer HV pipeline untouched.
- [x] Receipts / API honesty / tests as Phase A + Phase B + soft-link.

## Status (session close-out 2026-07-16)

| Track | Status |
|-------|--------|
| Phase A honesty | **COMPLETE 2026-07-15** |
| Phase B Iter 1–3 (HV chord colour) | **COMPLETE 2026-07-16** — shipped + smoke-validated |
| Soft-link (HV → riffVrbId) | **COMPLETE 2026-07-16** — shipped + smoke-validated |
| Riff Generator HV / pattern axes | **FULLY COMPLETE** |

Decided **2026-07-08**. Close-out **2026-07-16**.
