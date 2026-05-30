# Composer OS — v1.6.0 Handoff

## Codebase
`C:\Dev\composer-os\`  
**Version:** v1.6.0  
**Branch:** main  
**Tag:** v1.6.0

## What shipped (V106p1–V106p3 + docs)

### Population Composer (V106p1)
- `buildMusicContextFromPopulation()` — ecology selection across **tritonic** · **monk** · **wayne_shorter** · **vault** · **big_band**
- Dramatic arc phases: **build** · **suspend** · **fracture** · **cadence** · **restart**
- Three selection layers: dramatic fitness · contrast · inheritance pressure (+ mutation underrepresentation)
- Receipt `population_composer_realisation_complete`

### Zappa Solo (V106p2)
- `buildMusicContextFromZappaSolo()` — melodic dramatist over **supplied** harmony (never authors chords)
- Solo arc: **claim** · **agitation** · **fracture** · **crooked_landing**
- Population participation: **primary** · **secondary** · **tertiary**
- Pitch-language metrics + wraps `generateZappaSolo`
- Receipt `zappa_solo_realisation_complete`

### Sonic Youth Tuning (V106p3)
- `buildMusicContextFromSYTuning()` — separate from `alternateGuitarTunings.ts` catalog
- **5** tuning presets · **3** dual-guitar archetypes (`mass_mass` · `mass_knife` · `drone_shard`)
- Shape-resonance harmony (Wyble anchors → tuning-native fret shapes)
- SY-specific lower-guitar role resolver; receipt `sy_tuning_realisation_complete` (7 diagnostics)

### Documentation
- **`docs/COMPOSER_HANDBOOK.md`** / **`.docx`** — four v1.6 producer chapters + 36 scenarios
- **`docs/COMPOSER_OS_V16_NEW_FEATURES.docx`** — standalone features guide

## Goal of next session (v1.7 — TBD)

**Section editor UI** — per-bar engine / texture / meter overrides with receipt trail · **MusicXML import stress suite** (Real Book fixtures, repeat / volta truth) · **Producer lane backend** (lane selection drives default preset + section-engine pairing) · **BB / SQ LOCK producers** on full golden-path handoff where still adapter-only · **V66 backlog** (FZ_* receipt stubs · fretboard view depth · ContrapuntalLineEngine follow-up).

## Test state

| Suite | Baseline (v1.6.0) |
|-------|---------------------|
| Jest node (`engines/composer-os-v2`) | **491/491** PASS (**61** suites) |
| Jest total (node + UI) | **495/495** PASS (**62** suites) |
| `tests/musicContext.test.ts` | **111/111** PASS |
| Composer smoke (full) | **489/0** PASS (**94** suites) — re-run after allowlist edits |
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
| Wyble × Tritonic | `wyble_tritonic` | `buildMusicContextFromWybleTritonic` |
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
| Monk | `monk` | `buildMusicContextFromMonk` / `buildMusicContextFromMonkHarmony` |
| String Quartet | `string_quartet` | `buildMusicContextFromStringQuartet` |
| Practice layer | `practice_layer` | `buildPracticeLayerFromMusicContext` |
| Composition depth | `composition_depth` | `buildCompositionDepthFromMusicContext` |
| Population Composer | `population_composer` | `buildMusicContextFromPopulation` |
| Zappa Solo | `zappa_solo` | `buildMusicContextFromZappaSolo` |
| Sonic Youth Tuning | `sy_tuning` | `buildMusicContextFromSYTuning` |

## Active MusicContext consumers (flag-gated)

| Consumer | Flag |
|----------|------|
| Slonimsky | `SLONIMSKY_MUSIC_CONTEXT` |
| Wyble | `WYBLE_MUSIC_CONTEXT` |
| Martino | `MARTINO_MUSIC_CONTEXT` |

## Musical Model Decisions

### Why Population uses ecology, not selection

Sequential “pick one engine per section” hard-codes dramaturgy before the bar speaks. **Population Composer** runs five producers in parallel every bar — each proposes harmonic cells; **survivalScore** combines (1) fitness to the current **dramatic phase**, (2) **contrast** with recent winners, and (3) **inheritance pressure** so underused voices return. Zappa Solo can participate as a **melodic** agent (`primary` / `secondary` / `tertiary`) without joining the harmony proposal pool. Same seed + arc → same checksum-locked timeline.

### Why Zappa is melodic specialist, not harmony engine

Zappa’s job is **solo dramaturgy** over a chart you already trust. **`harmonyBars`** are supplied and **`source: locked`** — the producer normalises symbols for checksum only, never rewrites progressions. Pitch language layers (modal field · pentatonic reduction · near-neighbour foreign tones) and elastic rhythm packets live on the **motif / solo** strand. **claim → agitation → fracture → crooked_landing** arc steers density and closure refusal independently of how many chords you pasted.

### Why SY tuning uses shape-resonance, not chord symbols

Sonic Youth material is **open-string physics first**. The **`sy_tuning`** producer maps Wyble abstract anchors into **fret shapes native to each tuning grid** — export symbols may be sus/clusters with high **`tertianNormalizationPenalty`** by design. **`alternateGuitarTunings.ts`** remains the general Song Mode catalog; SY’s five presets + three archetypes live in **`syTuningPresetCatalog.ts`** and feed the existing Duo lower-guitar role resolver with SY-specific weights. Chord names describe the shape plan; they are not the generative source.

### Why Tritonic is bias-based, not rule-based (v1.4 carry-forward)

Hard rules fight songwriter slices and Vault LOCK. Nine **behaviour biases** (0–1) rerank candidates; Wayne layer applies first; biases soft-tilt. Same chart + seed stays reproducible.

### Duo dual-guitar roles (v1.5 carry-forward)

Lower guitar is **not** a second melody by default. **`instrumentTopology`** + per-bar **role resolver** (`guide_tone_lane` · `counterline` · `pedal` · `sparse_comp_answer` · `rest`); **supportive** vs **conversational** intent.

### String Quartet four-layer stack (v1.5 carry-forward)

Role assignment · texture archetype · voice-leading solver · optional Tritonic colour on Vn1 + inner voice.

## Known Musical Artifacts

| Artifact | Cause | Mitigation |
|----------|-------|------------|
| Population bar feels “wrong engine” | High `contrastWeight` or `mutationRate` overrode phase fitness | Lower contrast; narrow producer pool; read `perBarWinners` in receipt |
| Zappa solo sparse on tertiary | **tertiary** participation is colour-only | Use **primary** for full solo line |
| SY export symbols not maj7/min7 | Shape-resonance path by design | Use **`wybleAnchorBars`** for sus anchors; expect high `tertianNormalizationPenalty` |
| SY lower guitar mostly pedal | **drone_melody** + **drone_shard** archetype | Switch to **mass_knife** for counterline friction |
| Singer line feels “safe” / flat | `singerSafeMotif` leap cap | Lower `motifSingability` (Tritonic) |
| Bridge never cadences | ECM / Tritonic delayed resolution | Lower `cadenceAvoidance` on outro |
| Wayne / Monk startup delay | Python subprocess cold start | Accept on first generate |
| Lower guitar doubles bass root | `guide_tone_lane` on strong beats | **dual_guitar_bass** + **conversational** intent |
| Producer lane mismatch | UI lane still cosmetic for some presets | Pick producer explicitly in API / preset |

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

## Files to read at next session start

- `docs/COMPOSER_OS_V16_HANDOFF.md` (this file)
- `docs/COMPOSER_OS_V15_HANDOFF.md` — v1.5 baseline context
- `docs/COMPOSER_HANDBOOK.md` — § Population Composer · § Zappa Solo · § Sonic Youth Tuning · § Dual-Guitar Lower Voice
- `docs/COMPOSER_OS_V16_NEW_FEATURES.md` / **`.docx`**
- `docs/CHANGELOG.md` — `[1.6.0]` entry
- `engines/composer-os-v2/core/population-composer/populationComposerProducer.ts`
- `engines/composer-os-v2/core/zappa-solo/zappaSoloMusicContextProducer.ts`
- `engines/composer-os-v2/core/sy-tuning/syTuningProducer.ts`
- `engines/composer-os-v2/core/duo/duoLowerGuitarRoleResolver.ts`
- `docs/COMPOSER_OS_ROADMAP.md`

## Exact commands to confirm baseline

```bash
# Jest (composer-os-v2 node project)
cd engines/composer-os-v2
npx jest --config jest.config.cjs --selectProjects node --passWithNoTests
# expect: Tests: 491 passed, 491 total

# Jest (full — node + UI)
npx jest --config jest.config.cjs --passWithNoTests
# expect: Tests: 495 passed, 495 total

# MusicContext producer harness
npx jest --config jest.config.cjs tests/musicContext.test.ts
# expect: Tests: 111 passed, 111 total

# Composer smoke (full tier)
cd ../..
npm run test:composer-smoke
# expect: Passed: 489 rows (94 suites), Failed: 0

# Martino pytest
py -m pytest martino/tests/ -q
# expect: 76 passed

# Desktop dist (release closeout only — not mid-feature)
cd apps/composer-os-desktop
npm run dist
npm run desktop:install-icon
```
