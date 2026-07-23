# Riff Generator — Technical Summary (for external research)

**Date:** 2026-07-19  
**Audience:** Feature planning / Perplexity research  
**Scope:** Current Composer OS `riff_generator` preset as implemented. Read-only inventory; no proposals.

**Related:** `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md` (HV vs `riffVrbId` contract, Phase B + soft-link).

---

## 1. End-to-end pipeline

```text
UI (HomeGenerate + RiffGen tab #/riffgen GenerateIsland + RiffGeneratorPanel)
  → GenerateRequest { presetId: 'riff_generator', riffVrbId, riff*, optional harmonicVoice }
  → composerOsAppGeneration (case riff_generator)
  → runRiffGeneratorApp
       parseRiffVrbId(req)              // pattern authority
       resolveRiffHvChordColourReadOnly // Phase B gate
  → runRiffGenerator
       normalizeChordLoopWithDisclosure // Phase 1 trust → chordLoopDisclosure
       resolveRiffGeneratorProfile      // from uncoloured chords
       colourRiffChordsWithHv?          // Phase B apply
       buildRiffScoreModel (candidate loop)
       scoreRiffGce ≥ 9.0
       exportScoreModelToMusicXml
  → write <libraryRoot>/Riffs/V1-Riff-….musicxml + _meta manifest
  → UI banner when disclosure has substitutions / unsupported tokens
```

Soft-link (`riffSoftLinkHvAsPattern`) runs **in the UI only** before generate: it may copy HV into `riffVrbId`. The engine never reads a soft-link flag.

**RiffGen tab (Phase 1.5, real surface):** `#/riffgen` — corpus QA + phrase browser + GenerateIsland (same `presetId: riff_generator`). Phrases are **display-only**; not wired into melody/motif. Desktop hash routes + `did-fail-load` keep reload safe on `file://`.

---

## 2. Core files (by concern)

Paths under `engines/composer-os-v2/` unless noted.

### 2.1 Pattern engine (rhythm / notes / score)

| File | What it does | Inputs | Outputs |
|------|--------------|--------|---------|
| `core/riff-generator/runRiffGenerator.ts` | Main DCR loop: build candidates, gate on composite ≥ 9.0, export MusicXML, pick best by musicality | Seed + `RiffGeneratorParams` (bars, density, grid, style, `vrbId`, chords, optional `hvChordColourReadOnly`) | `RiffGeneratorResult`: MusicXML string, `ScoreModel`, GCE, musicality, carry-forward, optional musicContext |
| `core/riff-generator/buildRiffScoreModel.ts` | Assembles multi-part score from rhythm + melody + optional bass/horns/solo | Resolved `RiffGeneratorParams` + `RiffProfile` | `ScoreModel`, per-bar rhythm, core motif, generation metadata |
| `core/riff-generator/riffRhythm.ts` | Plans attack/rest grids per bar (style-biased fill, call/response on longer loops) | RNG, grid (8th/16th), density, style, bar count, profile accents | `RiffRhythmSegment[][]` |
| `core/riff-generator/riffMelody.ts` | Assigns pitches to rhythm slots; hook + loop closure; when pitch field has `preferredIntervals`, multiplies PC weights by directed interval-class match vs previous note before weighted pick (unmatched = ×1.0); near-prev-PC snap **0.65** → **0.12** when intervals present | Rhythm, chord symbols, pitch field, profile | Guitar (and related) note events |
| `core/riff-generator/riffBass.ts` | Bass line + guitar interlock when bass enabled | Rhythm, chords, profile, guitar events | Bass note events |
| `core/riff-generator/riffPitchField.ts` | Legal pitch set / voicing class for a bar; maps `RiffProfile.intervalWeights` → `preferredIntervals` (`m2`/`M2`/`m3`/`M3`/`P4`/`tritone`/`P5`/`M6`) on guitar **and** bass fields | Chord symbol, style, `RiffProfile`, `vrbId` | Pitch field for melody/bass |
| `core/riff-generator/riffTypes.ts` | Shared contracts | — | `RiffGeneratorParams`, result types, density/grid/style enums |

**Candidate loop knobs:** up to 40 rounds × 7 candidates; rejects on bar-math / notation-safe / identity / optional bass-harmonic failures; requires internal `scoreRiffGce` ≥ 9.0 (not duo/Song Mode GCE).

### 2.2 Chord loop + Phase B HV colour

| File | What it does | Inputs | Outputs |
|------|--------------|--------|---------|
| `core/riff-generator/riffChordLoop.ts` | Parses pipe-delimited progression; tiles to bar count; **Phase 1** `normalizeChordLoopWithDisclosure` | Chord text, bar count | One chord symbol per bar (default vamp `Am7`); optional `chordLoopDisclosure` (typed→used + bars) when null→Am7 or spelling rewrite |
| `core/riff-generator/riffHvChordColour.ts` | Phase B: colour locked symbols via mosaic HV dispatch | Chord bars, HV id, seed | Coloured symbols, or **identity** if no `getDispatchEntry` / failure |
| `app-api/riffGeneratorApp.ts` → `resolveRiffHvChordColourReadOnly` | Gates HV id when `riffUseHvForPattern === true` | `GenerateRequest` | Normalized HV id or `undefined` |

**Important:** Profile resolution uses **uncoloured** chords; colour changes symbols fed into score build only. Does **not** change `riffVrbId` / pattern selection.

UI toggle label **"Use HV for riff pattern too?"** maps to `riffUseHvForPattern` and means **chord colour**, not pattern soft-link.

### 2.3 Soft-link (HV → pattern id)

| File | What it does | Inputs | Outputs |
|------|--------------|--------|---------|
| `core/riff-generator/riffSoftLinkHv.ts` | Pure helper: map HV id → riff VRB + family if registry hit | `harmonicVoice` string | `{ ok, vrbId, family }` or `{ mismatch }` message |
| `apps/composer-os-app/src/pages/HomeGenerate.tsx` | Toggle **Also use HV as riff pattern?** (`riffSoftLinkHvAsPattern`); copies into `riffVrbId` + family when OK | UI state | Updated `riffVrbId` before generate; mismatch note if HV not in registry |

### 2.4 VRB / profile resolution

| File | What it does | Inputs | Outputs |
|------|--------------|--------|---------|
| `core/riff-generator/riffVrbRegistry.ts` | Canonical list of 16 riff VRB ids + family map + completeness checks | VRB id | Family tag; `isRiffGeneratorVrbId` |
| `core/riff-generator/resolveRiffGeneratorProfile.ts` | Resolve declarative `RiffProfile` from VRB or neutral fallback; density + odd-meter overlays | `vrbId`, style, grid, density, odd-meter preset | `RiffProfile` (`source: 'vrb' \| 'neutral_fallback'`) |
| `core/composer/riffProfileTypes.ts` | Schema for riff posture (meter, subdivision, accents, silence, repetition, horns, solo, etc.) | — | Type definitions |
| `core/composer/riffVrbStubs.ts` (+ entries in `voiceRuleBundles.ts` / priority bundles) | Authoring source of `VoiceRuleBundle.riffProfile` content | — | Bundles with `riffProfile` |
| `core/riff-generator/riffReceiptCompiler.ts` | Merges research receipts into profile patches | Profile + receipts | Patched `RiffProfile` |
| `core/riff-generator/riffDensityPolicy.ts` | Maps UI density → silence styleClass tags | Density | Profile silence tweak |
| `app-api/riffGeneratorApp.ts` → `parseRiffVrbId` | Accepts request `riffVrbId` only if bundle has `riffProfile` | `GenerateRequest` | Valid voice id or `undefined` |

### 2.5 Quality, variation, multi-voice

| File | Role (brief) |
|------|----------------|
| `riffGce.ts` | Internal 0–10 composite for riff candidate gate (not duo GCE) |
| `riffMusicalityGate.ts` | Style-aware 8-rule gate + neutral default profile |
| `riffQualityRules.ts` | Structural supplement rules; compact for manifest |
| `riffCarryForward.ts` / `riffVariationApply.ts` | Per-bar lock, regen, mutate from prior snapshots |
| `riffHornStabBuilder.ts`, `riffCallResponseEngine.ts`, `riffFxMarkerBuilder.ts`, `riffSoloBuilder.ts`, `riffSoloZappaAdapter.ts` | Optional horns / call-response / FX markers (metadata) / solo lane |
| `riffIdentityValidation.ts`, `riffBassHarmonicGate.ts`, `riffMusicXmlSanity.ts`, `riffFinalizeBarMath.ts` | Gates and bar-math finalization |

### 2.6 App export path

| File | What it does | Inputs | Outputs |
|------|--------------|--------|---------|
| `app-api/riffGeneratorApp.ts` | Parses request, runs engine, writes file + manifest | `GenerateRequest`, preset output dir (`…/Riffs`) | `.musicxml` on disk, `GenerateResult`, receipts |
| `app-api/composerOsOutputPaths.ts` | Maps `riff_generator` → folder name **`Riffs`** | preset id | Relative library folder |
| `core/export/musicxmlExporter.ts` | Serializes `ScoreModel` → MusicXML | `ScoreModel` | `{ success, xml }` |
| `app-api/writeOutputManifest.ts` | Sidecar `_meta` next to MusicXML | Paths + riff receipts | Manifest JSON |

**Filename pattern:** `V1-Riff-${slug}-seed${seed}-${vrbId|style}-${bars}b.musicxml`

### 2.7 UI surfaces

| File | Role |
|------|------|
| `apps/composer-os-app/src/pages/HomeGenerate.tsx` | Preset wiring, Phase B + soft-link toggles, generate payload, **Phase 1** chord-loop disclosure banner |
| `apps/composer-os-app/src/components/riffgen/RiffChordLoopDisclosureBanner.tsx` | Post-gen “N substitutions / M unsupported” list |
| `ui/components/RiffGeneratorPanel.tsx` | Family, VRB picker, bars, meter, density, grid, line mode, bass/solo, locks, regen/mutate, Zappa advanced |
| `ui/riffGeneratorUi.ts` | UI catalog of VRB options, odd-meter presets, labels |
| `apps/composer-os-app/src/pages/RiffGenPage.tsx` | **Phase 1.5** — `#/riffgen` corpus QA + phrase browser + **S3 GenerateIsland** (Variation / Open-folder; `useRiffGenGenerateState` + `RiffGeneratorPanel`; `presetId: riff_generator`). Phrases still not wired into engine. **S4 backlog:** curation flags for dim-line chunk leftovers / mid-run splits; per-window meter for files with mid-chart meter changes (`mvoldsu-003.gpx`) |
| `apps/composer-os-app/src/router/appRouter.ts` | Hash routes (`#/riffgen`, …) for desktop `file://` reload |
| `core/riff-generator/riffPhraseCorpusLoad.ts` | Resolve + load derived `phrases.jsonl` / `audit.csv` (repo / packaged `extraResources`) |
| `core/riff-generator/riffPhraseLibrary*.ts` | Ingest / schema / validate / fixtures (Phase 1 library; melody path OFF) |

### 2.8 Phrase corpus (inspect-only)

| Fact | Value (2026-07-19) |
|------|---------------------|
| Schema categories | **11** (`RIFF_PHRASE_CATEGORIES`); target total **112** |
| Populated on disk (QA ingest) | **8** — `sax_inspired`, `diminished_lines`, `jazz_rock`, `white_rock_funk`, `black_soul_funk`, `bebop_jazz_blues`, `blues_rock`, `southern_rock` |
| Empty stubs | `modern_rock`, `progressive_blues`, `virtuoso_technique` |
| Kind note | `virtuoso_technique` = cross-genre technique showcase (Scott Allen *50 Rock Virtuoso Licks*), not genre-authentic style |
| Road-test QA totals | **120** files / **251** phrases |
| Engine wiring | **OFF** — no imports into `riffMelody` / `riffPitchField` / `buildRiffScoreModel` / `runRiffGenerator` |
| Pitch PR status | **PR A/B/C** shipped — pick path · `enforceHook` gate · leap-peak motif-blend skip |

---

## 3. Output format(s)

| Format | Status for `riff_generator` |
|--------|------------------------------|
| **MusicXML** | **Only score export.** Produced inside `runRiffGenerator` via `exportScoreModelToMusicXml`, then written by `runRiffGeneratorApp` under the library **Riffs** folder. |
| MIDI (`.mid`) | **Not** written on the riff path (`riffGeneratorApp` has no MIDI export). Desktop “Export MIDI” is for other presets (e.g. guitar–bass duo), not riff. |
| FX / horns metadata | Carried in generation metadata / manifest; FX markers are **metadata-only** (no FX MIDI). |

**Where MusicXML is generated:** after a candidate passes GCE + validation gates in `runRiffGenerator.ts`, calling `exportScoreModelToMusicXml(score)` from `core/export/musicxmlExporter.ts`.

Typical parts: guitar (GM clean electric), optional bass, optional horns, optional solo (overdriven).

---

## 4. What “pattern” means

In this system, **pattern** = the rhythmic/idiomatic behaviour selected by **`riffVrbId`**, not the chord symbols and not Harmonic Voice (unless soft-link copies HV into `riffVrbId`).

| Layer | Meaning |
|-------|---------|
| **`riffVrbId`** | Request field; sole pattern authority for the preset (`parseRiffVrbId` never reads `harmonicVoice`). |
| **`VoiceRuleBundle.riffProfile`** | Declarative idiom blob on a voice bundle: meter policy, subdivision 8/16, accent topology, silence/rest probabilities, repetition/variation operators, register, ornaments, horns, solo generator, rock/funk/odd-meter presets. |
| **`resolveRiffGeneratorProfile`** | Loads complete `riffProfile` from the VRB, or falls back to a **neutral** generator profile (`silencePolicy.styleClass` like `riff_generator:neutral`). |
| **`RiffStyleId`** | Coarse engine style (`funk` / `metheny` / `scofield` / `neutral`), often derived from VRB family (fusion→metheny, art_rock→scofield). |
| **UI controls** | Density, grid, line mode, odd-meter overlay (fusion/art_rock families), bass/solo — modulate the resolved profile / build without replacing the VRB identity. |

**Composer-style vs generic:**

- **Composer-style:** id is in `RIFF_GENERATOR_VRB_IDS` and has a complete `riffProfile` → `source: 'vrb'`.
- **Generic/neutral:** missing or incomplete profile → `defaultRiffProfileForGenerator` / `isNeutralRiffGeneratorFallback`.

Rhythm is planned procedurally from the profile + seed (not a fixed MIDI phrase library). Pitch follows chord symbols (optionally HV-coloured) + pitch field rules.

---

## 5. Genre / style coverage

### 5.1 Riff libraries (have `riffProfile` — 16 ids)

From `RIFF_GENERATOR_VRB_IDS` / `RIFF_VRB_EXPECTED_FAMILY`:

| Family | Composer / style ids |
|--------|----------------------|
| **funk** | `james_brown`, `nile_rodgers`, `larry_carlton`, `sly_stone`, `jamerson` |
| **rock** | `iommi`, `david_gilmour`, `hendrix`, `led_zeppelin`, `eddie_van_halen`, `frank_zappa` |
| **fusion** | `weather_report`, `mahavishnu` |
| **art_rock** | `verlaine`, `morello`, `fripp` |

Odd-meter overlay UI is intended for **fusion** and **art_rock** families.

**UI catalog note:** `riffGeneratorUi.ts` `RIFF_VRB_CATALOG` currently lists **14** rows for the family dropdown — it omits **`jamerson`** and **`eddie_van_halen`**. Those two still exist in the engine registry and can be selected via soft-link / API if the id is supplied.

### 5.2 Harmonic Voice catalogue (broader, ~80 styles)

Many HV ids (e.g. **`bill_evans`**) have Song Mode / mosaic **chord-colour** slices but **no** `riffProfile`.

| Behaviour | Example |
|-----------|---------|
| Soft-link ON + HV = `bill_evans` | Mismatch: *"No dedicated riff library for bill_evans"*; user `riffVrbId` unchanged |
| Phase B colour ON + HV = `bill_evans` | Chords can still be coloured (e.g. `Dm7` → `Cmaj9`) under whatever pattern `riffVrbId` selected |
| Soft-link ON + HV = `jamerson` | Copies `jamerson` into `riffVrbId` (registry hit) |

This asymmetry is intentional: harmonic colour catalogue ≫ riff-pattern libraries.

---

## 6. Two HV-related toggles (do not confuse)

| UI label | State / request field | Effect |
|----------|----------------------|--------|
| **Use HV for riff pattern too?** | `riffUseHvForPattern` | Phase B: forward HV and **colour chords** under the riff |
| **Also use HV as riff pattern?** | `riffSoftLinkHvAsPattern` (UI-only) | Soft-link: **copy HV → `riffVrbId`** when id ∈ registry |

Default for both: **OFF**.

---

## 7. Validation snapshot

- Smoke-fast wrap-up (2026-07-19): **599** rows / **127** suites · known **5** · unexpected **0**
- Prior full smoke close-out (Phase B + soft-link): **772** / **141** · known **5** · unexpected **0**
- Chord-loop trust Phase 1 + hash-route reload verified manually (slash chords → MusicXML as typed; Ctrl+R / Ctrl+Shift+R stable across tabs including RiffGen)

---

## 8. Gaps relevant to feature research (facts only)

1. **MusicXML-only** export on this preset — no riff MIDI sidecar today.  
2. **16** authored riff profiles vs **~80** HV styles — most HV ids cannot soft-link to a riff library.  
3. UI VRB picker lists **14** of **16** registry ids (`jamerson`, `eddie_van_halen` absent from catalog).  
4. Pattern is **procedural profile + seed**; phrase corpus exists for QA but is **not** yet a generation bank.  
5. Soft-link and chord colour are **orthogonal**; either can be on without the other.  
6. Chord-loop trust **Phase 2/3** (inline badges / ack gating) and phrase→engine **Phase 2/3** still gated; **S4** curation (dim-line leftovers, meter-mismatch quarantine) backlog.

---

*End of summary.*