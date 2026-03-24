# Composer OS Changelog

## V2.0 Foundation

- Core architecture: conductor, rhythm engine, primitives, instrument profiles
- Score integrity gate, MusicXML export, readiness scoring, run ledger
- Presets: guitar-bass duo, ECM chamber, big band

## Golden Path

- First end-to-end generation: 8-bar guitar-bass duo
- Score model, chord symbols, rehearsal marks
- Full pipeline: preset → feel → harmony → integrity → export → manifest

## Stage 2 Musical Core

- Section roles (statement, development, contrast, return)
- Section-aware register maps and density curves
- Guitar/bass behaviour planners
- Rhythm engine deepening
- Behaviour gates: rhythm, texture, harmonic integrity, section contrast

## Stage 3 First Intelligence

- Motif tracker: generate, vary, place across A/B
- Barry Harris style module
- Motif-driven melody, bass motif echoes

## Stage 4 Style System

- Metheny style module
- Triad Pairs module
- Style stack: primary, secondary, colour
- Style blend and triad-pair validation gates

## Stage 6 Output & Control

- Export hardening: stricter MusicXML validation (divisions, structure, chord symbols)
- Lock system: melody, bass, harmony, rhythm, sections locks
- Performance pass: articulation (staccato/tenuto), no pitch changes
- Export Integrity, Lock Integrity, Performance Integrity gates

## Stage 5 Interaction Layer

- Interaction modes: support, call_response, overlap, independent
- Golden path default: A support, B light call_response
- Register separation: guitar floor 60, bass ceiling 52
- Behaviour coupling: bass simplifies, guitar reduces attack in call_response
- Interaction Integrity and Register Separation gates

## Stage 7 App Productisation

- Local web app: React + TypeScript + Vite
- App API bridge: presets, style modules, generate, outputs, open-output-folder
- Preset-driven UI: Guitar-Bass Duo, ECM Chamber, Big Band (latter two coming soon)
- Style stack: primary / secondary / colour (Barry Harris, Metheny, Triad Pairs)
- Generation controls: seed, lock toggles (melody, bass, harmony, rhythm, section A/B)
- Output management: list outputs, validation summary, open folder
- Packaging-ready structure for future Windows desktop wrapper
- No Python or .bat dependency for user workflow

## Desktop bugfix / unification

- Single Electron window; single-instance lock; no second window for errors (inline loading/error pages)
- No `openExternal` / browser auto-open; `setWindowOpenHandler` denies popups
- `GET /api/output-directory` for UI; `openOutputFolder` uses `spawn(explorer)` with `windowsHide` (no visible cmd)
- Generate panel shows full path, manifest fields, gates, and open-folder actions
- `launchers/COMPOSER_OS.md` clarifies Composer OS vs legacy Composer Studio

## Desktop port handling

- Automatic port resolution: prefer 3001, reuse Composer OS via `GET /health`, or fall back to next free port
- API exposes `GET /health` with `{ status, app: "composer-os" }`

## Stage 8 Windows Desktop Product

- Electron desktop wrapper around Composer OS
- Packaged executable (portable + NSIS installer)
- Desktop shortcut and icon support
- Single-click launch: API auto-starts, UI opens
- Outputs: dev uses repo `outputs/`, packaged uses `%APPDATA%`
- electron-builder for Windows distribution
- No Python, no .bat for end user

## Retro Self-Test / Hardening Pass

- Retro test suite for Foundation, Golden Path, Musical Core, First Intelligence, Style System
- Regression fixtures (bar count, event counts, pitch ranges, style metadata)
- Stage exit gate tests per implemented stage
- Negative tests proving gates catch failures (rehearsal marks, chord symbols, register, motif, style stack)
- `npm run test:retro` to run retro suite only
