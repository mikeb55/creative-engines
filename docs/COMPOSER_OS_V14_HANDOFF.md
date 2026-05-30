# Composer OS — v1.4.0 Handoff

## Codebase
`C:\Dev\composer-os\`  
**Version:** v1.4.0  
**Branch:** main  
**Tag:** v1.4.0

## What shipped (V104p4–V104p7)

### Vault × Tritonic
- `buildMusicContextFromVaultTritonic()` — Vault harmony stays anchor; Tritonic cells float above with checksum LOCK
- `tritonicStrands.ts` — three strands: `voicingTop`, `projectedStrand`, `singerSafeMotif`
- `tritonicMelody.ts` — Melodic Trace export (`tritonic_melody_complete`)

### Tritonic behaviour + diagnostics
- `tritonicBehaviourBiases.ts` — nine dials (0–1, default 0.5 neutral)
- `tritonicStateMachine.ts` + `tritonicDiagnostics.ts` — phrase memory, unresolved-tone / contour / cadence receipts

### Ensemble producers
- `buildMusicContextFromBigBand()` — `sourceEngineId: 'big_band'`
- `buildMusicContextFromNewOrleans()` — `sourceEngineId: 'new_orleans'`

### Song Mode per-section engines
- `songModeSectionEngineRouter.ts` — routes verse / chorus / bridge through different producers
- `SongSectionPlan.sectionEngine` — `song_mode` · `ecm_chamber` · `big_band` · `tritonic_vault` · `wayne_shorter`

### Wayne Shorter Python bridge
- `engines/wayne-shorter-engine/wayne_shorter_bridge.py` — stdin JSON → compile → stdout harmony bars
- `wayneShorterEngineBridge.ts` + `buildMusicContextFromWayneShorter()` — always-on pipeline adapter

## Goal of next session (v1.5)

**String Quartet MusicContext producer + Generate UI** — SQ golden-path export truth → LOCK → `buildMusicContextFromStringQuartet()`; surface SQ producer + section pairing in **`HomeGenerate.tsx`** (mirror Big Band / ECM section-engine pattern).

## Test state

| Suite | Baseline (v1.4.0) |
|-------|---------------------|
| Jest (`engines/composer-os-v2`) | **402/402** PASS (**50** suites) |
| `tests/musicContext.test.ts` | **111/111** PASS |
| Composer smoke (full) | **527/0** PASS (**98** suites) |
| pytest `martino/tests/` | **76/76** PASS |

## Active MusicContext producers

| Producer | sourceEngineId | Adapter / entry |
|----------|----------------|-----------------|
| Riff | `riff` | `buildRiffGeneratorMusicContext` |
| iReal Pro | `ireal` | `buildMusicContextFromIReal` |
| Slonimsky | `slonimsky` | `buildMusicContextFromSlonimsky` |
| Tonality Vault | `vault` | `buildMusicContextFromVaultOutput` |
| Wyble (chord bars) | `wyble` | `buildMusicContextFromWyble` |
| Wyble etude preset | `wyble` | `buildMusicContextFromWyblePreset` |
| Standalone etude | `etude_preset` | `buildStandaloneEtudePreset` |
| Martino Linear | `martino` | `buildMusicContextFromMartino` |
| Comping | `comping` | `compingGenerator` (inline) |
| ECM chamber | `ecm` | `buildMusicContextFromEcm` |
| Duo | `duo` | `buildMusicContextFromDuo` / `buildMusicContextFromLockedDuo` |
| Song Mode | `song_mode` | `buildMusicContextFromSongModeTruth` / `buildMusicContextFromLockedSongMode` |
| Song Mode (harmony shell) | `song_mode` / `ecm` / `big_band` | `buildMusicContextFromHarmonyBars` (section router) |
| Tritonic (standalone) | `tritonic` | `realisationToMusicContext` |
| Tritonic (Vault anchor) | `tritonic` | `buildMusicContextFromVaultTritonic` |
| Tritonic (melody trace) | `tritonic` | `buildMusicContextFromTritonicMelody` |
| Big Band | `big_band` | `buildMusicContextFromBigBand` |
| New Orleans / funk | `new_orleans` | `buildMusicContextFromNewOrleans` |
| Wayne Shorter | `wayne_shorter` | `buildMusicContextFromWayneShorter` / `buildMusicContextFromWayneShorterHarmony` |

## Active MusicContext consumers (flag-gated)

| Consumer | Flag |
|----------|------|
| Slonimsky | `SLONIMSKY_MUSIC_CONTEXT` |
| Wyble | `WYBLE_MUSIC_CONTEXT` |
| Martino | `MARTINO_MUSIC_CONTEXT` |

## Musical Model Decisions

### Why Tritonic is bias-based, not rule-based

Hard rules (“always use cluster on bar 4”) fight songwriter slices and Vault LOCK. The nine **behaviour biases** (0–1, neutral 0.5) **rerank** voice-leading candidates and nudge timeline density — they steer probability, not replace generative logic. Wayne layer (`oddityScore`, `delayedResolution`) still applies first; biases soft-tilt the outcome. Result: same chart + seed stays reproducible, but composers dial **feel** without forking the engine.

### Why three strands exist

One MIDI line cannot serve all export roles:

- **`voicingTop`** — harmonic float; top note of each cell voicing at timeline onset (comping / upper structure)
- **`projectedStrand`** — voice-led continuity through the cell chain (analytic + BB/SQ realisation spine)
- **`singerSafeMotif`** — filtered for stepwise bias, narrow tessitura (G3–C5), ≤4 semitone leaps (vocal / lead sheet)

Harmonic Float mode prioritises voicing + projected strand; Melodic Trace exports **`singerSafeMotif`** as top-line material while Vault anchors stay in **`harmony.bars`**.

### How Song Mode differentiates sections

Each **`SongSectionPlan`** may set **`sectionEngine`**. Router defaults: verse → ECM (`sparse`), chorus → Big Band (`brass_punch`), bridge → Vault × Tritonic (`ecm` mode). Assembly concatenates per-section MusicContexts, re-normalises symbols, emits **`masterChecksum`** + per-section **`sectionEngines`** receipt. Continuity = shared chord plan + phrase memory where engines share Tritonic state; contrast = engine family + dial profile + strand priority at boundary.

## Known Musical Artifacts

| Artifact | Cause | Mitigation |
|----------|-------|------------|
| Singer line feels “safe” / flat | `singerSafeMotif` leap cap + register window | Raise `motifSingability` dial down; use `projectedStrand` for instrumental lead |
| Bridge never cadences | ECM / Tritonic `delayedResolution` + high `cadenceAvoidance` | Lower `resolutionDelay` / `cadenceAvoidance` on outro; switch engine to `song_mode` |
| Shout chorus uniformly spiky | BB mode + `oddityScore` floor ≥ 0.65 | Lower `tension` dial; try `shell_voicing` comping style |
| Hard cut at section boundary | No crossfade between engine families | Plan transition bars; keep harmony roots + rhythm across boundary |
| Wayne section startup delay | Python subprocess cold start | Accept on first generate; cache not yet shipped |
| `melodyPriority` stub | Wayne behaviour layer placeholder until v1.5+ depth | Use Tritonic Melodic Trace + `motifSingability` instead |

## Hard rules (carry forward — all 11)

1. **`normalizeChordSymbol` is canonical** — checksum after normalisation
2. **Never publish Martino `.reduction` to `harmony.bars`**
3. **pytest `martino/tests/` must stay at 76 passing**
4. **ECM mode forces `delayedResolution: true`** on tritonic realisation
5. **BB tritonic mode enforces `oddityScore` floor ≥ 0.65**
6. **Song Mode LOCK: duplicate `sectionId` hard-fails** at assembly
7. **Hop limit: warn at 2, block at 3** MusicContext hops
8. **Do not run `npm run dist` mid-feature** — commit docs first, then dist + tag
9. **Every version ends with commit + push + tag**
10. **Ship discipline:** CHANGELOG + architecture/roadmap in same commit as feature
11. **Regenerate `.docx`** whenever cookbook / handbook `.md` changes

## v1.5 roadmap

- **String Quartet MusicContext producer** — export truth from SQ golden path → LOCK → `buildMusicContextFromStringQuartet()`
- **Generate UI** — SQ preset section-engine dropdown (verse / chorus / bridge pairing); receipts on manifest
- **Monk Python bridge** — MusicContext adapter (mirror Wayne pattern)
- **BB / SQ / Zappa solo ensemble pipeline producers** (golden-path) — deferred from v1.4
- **V88 practice layer · V89 composition depth**

## Files to read at next session start

- `docs/COMPOSER_OS_V14_HANDOFF.md` (this file)
- `docs/COMPOSER_HANDBOOK.md` — § Song Mode per-section engines
- `docs/CHANGELOG.md` — `[1.4.0]` entry
- `engines/composer-os-v2/core/song-mode/songModeSectionEngineRouter.ts`
- `engines/composer-os-v2/core/song-mode/songModeSectionEngineTypes.ts`
- `engines/composer-os-v2/core/tritonic/tritonicStrands.ts`
- `engines/composer-os-v2/core/tritonic/tritonicRealisation.ts`
- `engines/composer-os-v2/core/wayne-shorter/wayneShorterEngineBridge.ts`
- `engines/composer-os-v2/core/big-band/bigBandMusicContextProducer.ts`
- `engines/composer-os-v2/core/new-orleans/newOrleansMusicContextProducer.ts`
- `docs/COMPOSER_OS_ROADMAP.md`

## Exact commands to confirm baseline

```bash
# Jest (composer-os-v2)
cd engines/composer-os-v2
npx jest --config jest.config.cjs --passWithNoTests
# expect: Tests: 402 passed, 402 total

# MusicContext producer harness
npx jest --config jest.config.cjs tests/musicContext.test.ts
# expect: Tests: 111 passed, 111 total

# Composer smoke (full tier)
cd ../..
npm run test:composer-smoke
# expect: Passed: 527 rows (98 suites), Failed: 0

# Martino pytest
py -m pytest martino/tests/ -q
# expect: 76 passed
```
