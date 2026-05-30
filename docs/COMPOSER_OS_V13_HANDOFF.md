# Composer OS — v1.3.0 Handoff

## Codebase
`C:\Dev\composer-os\`  
**Version:** v1.3.0  
**Branch:** main  
**Tag:** v1.3.0

## What shipped (V95–V104)

### V95 — Wyble etude preset producer
- `buildMusicContextFromWyblePreset` + `resolveWybleEtudePreset` / `wybleEtudePresetProgressions`
- Pattern types: pentatonic · chromatic · whole_tone × easy/medium/hard
- Always-on (no feature flag); UI etude preset panel on `HomeGenerate.tsx`

### V96b — Standalone etude preset
- `buildStandaloneEtudePreset()` — engine-agnostic `StandaloneEtudePreset` → `MusicContext`
- `sourceEngineId: 'etude_preset'`

### V97–V99 — Tritonic dictionary + behaviour
- `tritonicCell.ts` — five families (quartal, cluster, suspended, shorter_floating, bergonzi)
- `tritonicVoiceLeading.ts` — ≤6 semitone voice-leading candidates
- `tritonicBehaviourLayer.ts` — `oddityScore`, `delayedResolution`, `melodyPriority` stub

### V100a/b — Duo LOCK producer
- `buildMusicContextFromDuo`, `buildMusicContextFromLockedDuo`
- `duoLockedMusicContextFromGoldenPath` in app generation handoff

### V101 — ECM chamber producer
- `buildMusicContextFromEcm` — texture (sparse/resonant/suspended) × voicing (close/open/mixed)
- `sourceEngineId: 'ecm'`, always-on, no DuoLock

### V102 — Tritonic realisation
- `realiseTritonic()` + `realisationToMusicContext()` — BB/SQ/ECM phrase plans, Wayne behaviour
- `sourceEngineId: 'tritonic'`

### V103a/b — Song Mode producer + LOCK handoff
- `buildMusicContextFromSongModeTruth`, `lockSongMode`, `buildMusicContextFromLockedSongMode`
- `composerOsAppGeneration.ts` `runSongStructure` wires LOCK when `chordPlan` non-empty
- `sourceEngineId: 'song_mode'`

### V104 — Tritonic BB Cookbook + v1.3.0 dist
- `docs/TRITONIC_BB_COOKBOOK.md` + `.docx` — 60 scenario recipes
- Root `package.json` v1.3.0 + `ts-node` devDep
- `musicContextAdapters.ts` Martino type fixes (V103b)

## Test state
| Suite | Baseline |
|-------|----------|
| MusicContext producers | **34/34** PASS |
| Composer smoke (full) | **527/0** PASS |
| pytest martino/tests/ | **76/76** PASS |

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
| Tritonic | `tritonic` | `realisationToMusicContext` |

## Active MusicContext consumers (flag-gated)
| Consumer | Flag |
|----------|------|
| Slonimsky | `SLONIMSKY_MUSIC_CONTEXT` |
| Wyble | `WYBLE_MUSIC_CONTEXT` |
| Martino | `MARTINO_MUSIC_CONTEXT` |

## Key constraints (carry forward)
- `normalizeChordSymbol` is canonical — checksum after normalisation
- Never publish Martino `.reduction` to `harmony.bars`
- pytest `martino/tests/` must stay at **76** passing
- ECM mode forces `delayedResolution: true` on tritonic realisation
- BB tritonic mode enforces `oddityScore` floor ≥ 0.65
- Song Mode LOCK: duplicate `sectionId` hard-fails at assembly
- Hop limit: warn at 2, block at 3 MusicContext hops
- Do not run `npm run dist` mid-feature — commit docs first, then dist + tag

## v1.4 roadmap
- **Vault × Tritonic integration** — vault riff harmony as tritonic cell pool input; shared checksum LOCK between vault export and tritonic realisation
- BB / SQ / Zappa solo ensemble pipeline producers (golden-path)
- Monk Python + Wayne Shorter Python engine MusicContext adapters
- V88 practice layer · V89 composition depth

## Docs added v1.3.0
- `docs/TRITONIC_BB_COOKBOOK.md` — 60 scenarios (blues, ii–V–I, Wayne/ECM, Bacharach, BB, cinematic, polymodal, counterpoint, Messiaen, atonal, world/folk, minimalist)
- `docs/TRITONIC_BB_COOKBOOK.docx` — Word export (regenerate: `node scripts/generateTritonicBbCookbookDocx.mjs`)

## Rules for continuation
- Every version ends with commit + push + tag
- Ship discipline: CHANGELOG + architecture/roadmap in same commit as feature
- Regenerate `.docx` whenever cookbook `.md` changes
