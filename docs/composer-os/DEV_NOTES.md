# Composer OS Developer Notes

## Architecture Layers

- **Easy wins + workflow power pack:** **`core/presets-plus/`** — named preset aliases (10 ids incl. `songwriter_modern`, `chamber_development`) + optional `densityBias` metadata. **`core/sessions/`** — JSON sessions v1/v2/v3 + optional project memory fields + **reference import** fields. **`core/candidates/`** — multi-seed ranking. **`core/diagnostics/`** — `buildDiagnosticsBundle`. **`core/lead-sheet/`** — `UniversalLeadSheet` from Duo/ECM context, Song contract, or **Big Band / String Quartet** planning (`buildUniversalLeadSheetFromPlanningForm`). **`core/chord-input/`**, **`core/motif-plus/`**, **`core/continuation/`**, **`core/regeneration/`**, **`core/style-stack-presets/`**, **`core/performance-plus/`** — additive workflow helpers (no new generation cores).
- **Reference / import intelligence (Prompt A/3):** **`core/reference-import/`** — parse external **MusicXML** / **MIDI** / lead-sheet text or map **`CompositionContext`** to **`ReferencePiece`**; **`ReferenceBehaviourProfile`** is behavioural statistics only; **`applyReferenceInfluence`** returns hints for Song/ECM/Duo/Big Band/Quartet targets without copying notes. Run ledger and sessions can record reference metadata for UI continuity.
- **Big Band planning + realisation (Prompt 5/7; 5.6/7; C/3)**: `core/big-band/` — `runBigBandMode` loads **`data/BigBandResearch.md`** (or **`COMPOSER_OS_RESEARCH_DIR`/`BigBandResearch.md`**), research rules with **priority**, orchestration. **`runBigBandRealisation`** adds **`planBigBandVoicing`** → **`buildBigBandScoreModel`** → **`runEnsembleExportPipeline`** (shared MusicXML exporter + integrity gates). Output is **behavioural ensemble scoring** (section stacks, harmonic rhythm), not finished arranging.
- **Dual style pairing (Prompt 1/2 intelligence):** **`core/style-pairing/`** — optional **songwriter vs arranger** lanes (`resolveStylePairing`); **does not** merge or override Phase B songwriter resolution; **`runSongMode`** / **`runBigBandMode`** accept optional pairing for metadata + light contrast / diagnostics.
- **Variation + creative controls (Prompt 2/2 UX):** **`core/variation/`** — deterministic **`variationIdToSeed`**; **`core/creative-controls/`** — **`resolveEffectiveSeed`** / **`generateComposition`**; **`stable`** tier = no change when only legacy **`seed`** is sent. **Big band ensemble** — **`bigBandEnsembleConfigTypes`**, **`applyBigBandEnsembleMask`**, **`ensembleMask`** on **`assembleBigBandOrchestrationPlan`**. **Sessions v4** — optional **`variationId`**, **`stylePairingSnapshot`**, **`bigBandEnsembleConfigId`**, **`lastOutputPath`**.
- **String Quartet planning + realisation (Prompt 6/7; C/3)**: `core/string-quartet/` — `runStringQuartetMode` for planning; **`runQuartetRealisation`** builds a four-part **ScoreModel** and exports via **`runEnsembleExportPipeline`**. Contrapuntal polish remains future work.
- **Shared orchestration (Prompt 4/7)**: `core/orchestration/` — planning-only register/texture/density ownership, ensemble family profiles, validation, duo + ECM chamber proof builders (`buildDuoOrchestrationPlan`, `buildChamberOrchestrationPlan`). Compatibility helpers map ECM texture strings and Song Mode section kinds to orchestration intents without changing golden path, ECM output, or Song Mode runtime. **`orchestrationLayerMetadata.ts`** documents handoff alignment; String Quartet **full score** generation remains future work.
- **Conductor alignment (Prompt 2/7)**: `core/conductor-alignment/` — metadata-only mapping of Composer OS stages to conductor roles (`conductorRoleMap.ts`, `handoffMap.ts`). Does not replace or reroute the runtime conductor; no musical changes.
- **Module invocation**: `core/module-invocation/` — static registry + optional module capabilities; `song_mode_scaffold` entry for future Song Mode wiring (not connected to golden path).
- **Song Mode (Prompt 3/7; Prompt 6.5/7 research rules; Prompt B/3 lead melody + prosody; Prompt 7/7 app wiring)**: `runSongMode.ts` loads **`data/Songwriting.md`** (or `COMPOSER_OS_SONGWRITING_RESEARCH`), parses ENGINE RULES, merges **`songwriterRuleRegistry`**, resolves **songwriter style(s)** (default **`beatles`**) and optional **author** / **classical** overlays, runs **hook / chorus / melody behaviour** planners, then **`planLeadMelody`** → **singer-range validation** → **prosody placeholders** (syllable slots + stress; author alignment when Pattison / Webb / Perricone overlay), **`applySongwritingRules`** → `compiledSong.songwriting` + lead-sheet **`songwritingHints`**, **`prosodySlots`**, **top-line melody events**. `song_mode_compile` in module registry. **App generate** writes structural JSON — not golden-path MusicXML. See `SONG_MODE_INTEGRATION_NOTES.md`.
- **Song Mode scaffold**: `core/song-mode/` + `presets/songModePreset.ts` — extended planner `planExtendedPopStructure()` (V/PC/C/…/bridge/chorus); default remains verse/chorus/verse/chorus for simple runs.
- **Conductor**: Pipeline coordinator
- **Rhythm Engine**: Feel, syncopation, subdivision
- **Section Roles**: Statement, development, contrast, return
- **Register Map**: Per-section pitch zones
- **Density**: Sparse / medium / dense
- **Motif**: Generator, tracker, validation
- **Style Modules**: Barry Harris, Metheny, Triad Pairs, Bacharach (`core/style-modules/bacharach/`) — listed in app API/UI; multi-seed correctness tests cover default stack + Bacharach primary against strict bar math and export round-trip
- **Instrument Behaviours**: Guitar, bass planners
- **Score Integrity**: Bar math, register, chords, rehearsal; **strict bar math** (`strictBarMath.ts`) per voice before export; **post-export** `validateExportedMusicXmlBarMath` for MusicXML round-trip bar fills
- **Behaviour Gates**: Rhythm, texture, motif, style conformance; duo **musical quality** (`duoMusicalQuality.ts`); Bacharach module validation when selected
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

**Web UX (Prompt 5/5):** **`apps/composer-os-app/src/utils/generateUiCopy.ts`** — **`MODE_UX`** copy for each top-level mode; **`describeOutputKind`** for honest **planning** vs **lead-sheet-ready** vs **full MusicXML** labels in the **Result summary** panel on **Generate**. Experimental / confidence lines use API metadata only; no engine changes.

**Desktop version bump:** `desktop:package` runs `tsx install/bumpDesktopVersionCli.ts` before `electron-builder` so `package.json` patch increments for **in-app** semver (`app.getVersion()`, UI header). **Artifact filenames are stable:** `release/Composer-OS.exe` (portable) and `release/Composer-OS-Setup.exe` (NSIS)—no version in the exe name, so shortcuts can point at `Composer-OS.exe` permanently. **`tsx install/logReleaseArtifactsCli.ts`** runs immediately after electron-builder and prints absolute paths (portable, installer, shortcut target). `tsx install/pruneOldPortableExesCli.ts` removes legacy versioned `Composer-OS-Desktop-*-portable.exe` / `*-Setup.exe` files from `release/` when present. `tsx install/verifyStableBuildOutputCli.ts` verifies the portable exists and (Windows) smoke-launches it. **`installRules.STABLE_PORTABLE_FILE_NAME`** / **`STABLE_SETUP_FILE_NAME`** match `package.json` `build.portable` / `build.nsis` `artifactName` (see **`buildOutputContract.test.ts`**).

**Desktop ports:** `electron/utils/portUtils.ts` resolves preferred port (default 3001), reuses Composer OS via `GET /health`, or picks next free port. API `startComposerOsAppApi.ts` uses `process.env.PORT` and registers `/health`.

**Desktop product:** One window (`main.ts` + `preload.ts`). Packaged UI is only from `composer-os-app/dist` (see `scripts/copy-ui.js`; full directory replace + `verify:ui-resources` after copy). Each UI build emits `composer-os-ui-stamp.json`; `electron/uiBundleVerify.ts` enforces product id/name and blocks Hybrid/Projects/Score in the stamp before any UI URL load. Preload exposes `getUiProvenance` for diagnostics. App API routes only under `/api/*` and `/health`. Legacy stacks under `engines/composer_studio/` and similar are not imported by the desktop app; tests in `desktopQuarantine.test.ts` + `desktopUnification.test.ts` guard the Electron folder; `launcherPaths.test.ts` ensures desktop npm scripts do not reference repo `launchers/`.

**Open output folder (IPC):** `electron/openFolderMain.ts` registers `composer-os-api:open-output-folder` after the bundle loads; uses `resolveOpenFolderTarget` + `ensureFolderForOpen` + `shell.openPath` from **`resources/open-folder-helpers.cjs`** (built by `npm run build:open-folder-helpers`), resolved via `config.resolveOpenFolderHelpersBundlePath()` so packaged apps never `require()` missing `engines/...` files. The bundled `ipcEntry` does not register this channel (avoids duplicate handlers).

**Desktop shortcut deploy (Windows):** `npm run desktop:clean-install` (aliases `desktop:deploy`, `desktop:install`) runs `desktop:package`, then `install/installComposerOsDesktop.ts` (UI verification inside the install script, legacy shortcut quarantine, **Composer OS Desktop.lnk** → newest portable exe, auto-launch packaged exe once). Quarantine rules: `install/installRules.ts`; launcher: `install/launchInstalledDesktopApp.ts`. **Automated rebuild verification:** `npm run desktop:rebuild-and-smoke` → `install/rebuildAndSmoke.ts` (close stale portable PIDs, package, verify exe + UI stamp, launch, PID smoke check, timestamp vs `.last-smoke-ui-timestamp.txt`).

**Clean-room runtime:** Electron `main.ts` uses `loadFile` on `resources/ui`, registers IPC from `resources/desktop-ipc.bundle.cjs` (see `scripts/build-desktop-ipc-bundle.js`, `electron/ipcEntry.ts` excluded from `tsc`, esbuild-only). Shared API logic: `engines/composer-os-v2/app-api/composerOsApiCore.ts` (used by HTTP server and IPC).

**Hardening:** `electron/startupState.ts` + transitions in `main.ts`; `electron/config.ts` centralises paths (bundle, UI, output, icon). Preload exposes `getStartupState`, `getDesktopMeta`, `notifyGenerationPhase`. App API: `composerOsConfig.ts`, `buildDiagnostics.ts`, `apiErrorMessages.ts`, `GET /api/diagnostics`, canonical `output-directory` + `displayPath`. Vitest: `packagingSmoke.test.ts`, `startupState.test.ts`; engine `appApi.test.ts` includes multi-run smoke and diagnostics checks.

**Try Another (web + desktop UI):** `HomeGenerate` calls the same `api.generate` as **Generate**; **Try Another** passes a new `seed` via `generate(next)` after `setVariationSeed(next)` so React state ordering cannot skip the run. `generateComposition` names files `composer_os_<preset>_<iso-ts-safe>_<seed>.musicxml` to avoid same-second overwrites. After a run, `App` dispatches `composer-os:outputs-changed`; `Outputs` listens and refetches so the list stays in sync without a manual refresh.

**Generate UI (V3 mode-driven rewrite):** `apps/composer-os-app/src/pages/HomeGenerate.tsx` — no Style Stack / Style Blend / module pickers on the main form. Duo and ECM requests send **`DEFAULT_SCORE_STYLE_STACK`** (Barry Harris + strong primary blend) through the existing `api.generate` contract. **Song Mode** and **Big Band** expose pairing controls; Big Band uses **BIG_BAND_DEFAULT_SONGWRITER_STYLE** for the required `stylePairing.songwriterStyle` field when the UI only shows arranger+era. The **Style Stack** nav tab was removed; `StyleStack.tsx` remains in the tree as legacy reference only.

**System check (V3 app wiring):** `engines/composer-os-v2/app-api/systemCheck.ts` — runs `npm run test` and `npm run test:retro` scoped to `engines/composer-os-v2`, plus `npm run test` for `apps/composer-os-app`, from the repo root (`resolveComposerOsRepoRoot`, overridable via `COMPOSER_OS_REPO_ROOT`). Exposed as `apiSystemCheck` in `composerOsApiCore.ts`, HTTP `POST /api/system-check`, and desktop IPC `composer-os-api:run-system-check`. Electron `main.ts` sets `COMPOSER_OS_REPO_ROOT` when unset. Packaged installs without a checkout return a clear failure summary instead of raw npm noise. Disable with `COMPOSER_OS_DISABLE_SYSTEM_CHECK=1`.

**Output paths:** `engines/composer-os-v2/app-api/composerOsOutputPaths.ts` is the single source of truth for `Mike Composer Files` root, preset subfolders, and `ensureOutputDirectoryForPreset`. **`manifestPathForMusicXml`** / **`legacyManifestPathForMusicXml`** centralize disk manifest locations: new writes go to **`<preset>/_meta/<basename>.manifest.json`**; `listOutputs` falls back to the old next-to-MusicXML path for existing libraries. **`normalizeLibraryFolderOpenTarget`** + **`resolveOpenFolderTarget`** prevent “open folder” from landing in `_meta`. HTTP API and desktop IPC both use **`composerOsApiCore.ts`** only — **do not** add a hand-maintained `composerOsApiCore.js` (Node would load it first and drift from `runAppGeneration`). Plain `node scripts/startComposerOsAppApi.js` registers `ts-node` and requires `composerOsApiCore.ts` explicitly. Other `app-api/*.js` mirrors (e.g. `getPresets.js`) should stay in sync with `.ts` if present, or rely on ts-node + `.ts` only.

**Style Blend:** App requests send `styleBlend` on `AppStyleStack` (see `appApiTypes.ts`). `mapStyleStack.ts` converts blend steps to engine `StyleStack` weights (normalized). `openOutputFolder.ts` (HTTP / non-Electron) still uses `explorer.exe` / `open` / `xdg-open`; `resolveOpenFolderTarget` + `ensureFolderForOpen` are shared with Electron main. `apiOpenOutputFolder` restricts opens to paths under the composer library root.

**Central correctness:** `core/correctness/composerOsCorrectness.ts` re-exports path resolution, bar validators, bass export names, and performance-pass duration rules.

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
