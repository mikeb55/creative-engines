# Composer OS Developer Notes

## Architecture Layers

- **Conductor**: Pipeline coordinator
- **Rhythm Engine**: Feel, syncopation, subdivision
- **Section Roles**: Statement, development, contrast, return
- **Register Map**: Per-section pitch zones
- **Density**: Sparse / medium / dense
- **Motif**: Generator, tracker, validation
- **Style Modules**: Barry Harris, Metheny, Triad Pairs
- **Instrument Behaviours**: Guitar, bass planners
- **Score Integrity**: Bar math, register, chords, rehearsal
- **Behaviour Gates**: Rhythm, texture, motif, style conformance
- **Export**: MusicXML only

## Implemented Stages

1. Foundation
2. Golden Path
3. Musical Core (section roles, density, register, behaviours)
4. First Intelligence (motif tracker, Barry Harris)
5. Style System (Metheny, Triad Pairs, style stack)
6. Interaction Layer (guitar-bass coupling, register separation, interaction modes)
7. Output & Control (export hardening, lock system, performance pass)
8. **Stage 7 App Productisation** (web app, preset UI, output management) — in `apps/composer-os-app/`, engine bridge in `engines/composer-os-v2/app-api/`
9. **Stage 8 Windows Desktop Product** — in `apps/composer-os-desktop/`, Electron + electron-builder, single-click launch

**Desktop ports:** `electron/utils/portUtils.ts` resolves preferred port (default 3001), reuses Composer OS via `GET /health`, or picks next free port. API `startComposerOsAppApi.ts` uses `process.env.PORT` and registers `/health`.

**Desktop product:** One window (`main.ts` + `preload.ts`). Packaged UI is only from `composer-os-app/dist` (see `scripts/copy-ui.js`). App API routes only under `/api/*` and `/health`. Legacy stacks under `engines/composer_studio/` and similar are not imported by the desktop app; tests in `desktopQuarantine.test.ts` + `desktopUnification.test.ts` guard the Electron folder.

**Hardening:** `electron/startupState.ts` + transitions in `main.ts`; `electron/config.ts` centralises paths (bundle, UI, output, icon). Preload exposes `getStartupState`, `getDesktopMeta`, `notifyGenerationPhase`. App API: `composerOsConfig.ts`, `buildDiagnostics.ts`, `apiErrorMessages.ts`, `GET /api/diagnostics`, canonical `output-directory` + `displayPath`. Vitest: `packagingSmoke.test.ts`, `startupState.test.ts`; engine `appApi.test.ts` includes multi-run smoke and diagnostics checks.

## Next Planned Stage
- Form variability
- Additional presets (ECM, Big Band)
- Deeper motif development

## Retro Self-Test Suite

A retro self-test suite protects all implemented stages (Foundation → Style System). Run with `npm run test:retro` or as part of `npm run test`.

**Rule:** No future Composer OS stage is complete unless:
1. New subsystem tests are added
2. Retro self-tests still pass
3. Stage exit gate tests still pass
4. Commit/push only happens after passing tests

## Anti-Drift Rules

- No second pipeline
- Style modules modify context only
- All output through score model
- Validation before export
