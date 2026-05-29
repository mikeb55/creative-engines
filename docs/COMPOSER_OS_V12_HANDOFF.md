# Composer OS — v1.2.0 Handoff

## Codebase
C:\Dev\composer-os\
Version: v1.2.0
Branch: main, clean, pushed to origin
Tag: v1.2.0

## What shipped (V90b–V93)

### V90b — Foundation + producers
- normalizeChordSymbol canonical in chordSymbolAnalysis.ts
- Immutable receipts, provenance block
- Producers: iReal, Slonimsky, Vault
- Riff key.root bug fixed

### V90c — Wyble + tuning + safety
- Wyble as MusicContext producer
- Tuning field on MusicContext (DADGAD, open-E, custom MIDI array)
- Stale context warning (provenance.capturedAt)
- Hop limit: warn at 2, block at 3

### V90d — Martino producer
- buildMusicContextFromMartino from phrasePlan[].chord
- Minor-root guard: .reduction never published to harmony.bars
- Wired: bridge → appGeneration → HomeGenerate

### V91 — Analytical mode
- runAnalyticalMode: scale degrees, functional hints, tension map
- apiAnalyse endpoint
- Chord Inspector: Analyse button + inline results table

### V92 — Export
- PDF export via MuseScore CLI
- Guitar Pro export via MuseScore CLI
- apiExportPdf + apiExportGuitarPro

### V93 — Comping
- runCompingGenerator: Freddie Green / shell / full chord
- Beat patterns: 2+4, 1+3, all beats, offbeats
- Voicing density: sparse / medium / dense
- Comping mode in HomeGenerate Riff panel

## Test state
Jest musicContext + analytical + comping: 126 passed
pytest martino/tests/: 76 passed

## Active MusicContext producers
| Producer | sourceEngineId | Adapter function |
|---|---|---|
| Riff | riff | buildRiffGeneratorMusicContext |
| iReal | ireal | buildMusicContextFromIReal |
| Slonimsky | slonimsky | buildMusicContextFromSlonimsky |
| Vault | vault | buildMusicContextFromVaultOutput |
| Wyble | wyble | buildMusicContextFromWyble |
| Martino | martino | buildMusicContextFromMartino |
| Comping | comping | (inline in compingGenerator) |

## Active MusicContext consumers (flag-gated)
| Consumer | Flag |
|---|---|
| Slonimsky | SLONIMSKY_MUSIC_CONTEXT |
| Wyble | WYBLE_MUSIC_CONTEXT |
| Martino | MARTINO_MUSIC_CONTEXT |

## Deferred to v1.3
- Duo golden-path producer (LOCK-sensitive)
- ECM chamber producer
- Song Mode producer (after Duo proven)
- BB, SQ, Zappa solo (ensemble pipelines)
- Monk Python, Wayne Shorter Python engines
- V88 practice layer
- V89 composition depth
- Golden-path engine producers

## Rules for continuation
- pytest martino/tests/ must stay at 76 passing
- Fix riff key.root before any new producer
- Never publish .reduction to harmony.bars
- Do not start Duo producer until standalone test suite exists
- Do not run npm run dist without explicit instruction
- Every version ends with commit + push + tag
