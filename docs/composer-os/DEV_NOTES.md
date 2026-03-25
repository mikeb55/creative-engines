# Composer OS Developer Notes

## Architecture Layers

- **Big Band planning (Prompt 5/7)**: `core/big-band/` — `runBigBandMode` (form → section → density → shared orchestration), `big_band` preset + `big_band_plan` registry entry; no full big-band MusicXML or voicing engine yet. See `BIG_BAND_INTEGRATION_NOTES.md`.
- **String Quartet planning (Prompt 6/7)**: `core/string-quartet/` — `runStringQuartetMode` (form → texture → density → shared orchestration), `string_quartet` preset + `string_quartet_plan` registry entry; no quartet MusicXML or contrapuntal engine yet. See `STRING_QUARTET_INTEGRATION_NOTES.md`.
- **Shared orchestration (Prompt 4/7)**: `core/orchestration/` — planning-only register/texture/density ownership, ensemble family profiles, validation, duo + ECM chamber proof builders (`buildDuoOrchestrationPlan`, `buildChamberOrchestrationPlan`). Compatibility helpers map ECM texture strings and Song Mode section kinds to orchestration intents without changing golden path, ECM output, or Song Mode runtime. **`orchestrationLayerMetadata.ts`** documents handoff alignment; String Quartet **full score** generation remains future work.
- **Conductor alignment (Prompt 2/7)**: `core/conductor-alignment/` — metadata-only mapping of Composer OS stages to conductor roles (`conductorRoleMap.ts`, `handoffMap.ts`). Does not replace or reroute the runtime conductor; no musical changes.
- **Module invocation**: `core/module-invocation/` — static registry + optional module capabilities; `song_mode_scaffold` entry for future Song Mode wiring (not connected to golden path).
- **Song Mode (Prompt 3/7; Prompt 7/7 app wiring)**: `runSongMode.ts` produces `CompiledSong` + `LeadSheetContract` + validation; `song_mode_compile` in module registry. **App generate** (`apiGenerate` → `runAppGeneration`) runs Song Mode for preset `song_mode` and writes JSON under the Song Mode output folder — not golden-path MusicXML. See `SONG_MODE_INTEGRATION_NOTES.md`.
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

**Desktop version bump:** `desktop:package` runs `tsx install/bumpDesktopVersionCli.ts` before `electron-builder` so every packaged portable exe uses a new semver patch and a new `Composer-OS-Desktop-x.y.z-portable.exe` path (reduces antivirus / file-lock stalls on Windows). `tsx install/pruneOldPortableExesCli.ts` afterward keeps the three newest portables in `release/`. `app.getVersion()` and the UI header read the same `package.json` version.

**Desktop ports:** `electron/utils/portUtils.ts` resolves preferred port (default 3001), reuses Composer OS via `GET /health`, or picks next free port. API `startComposerOsAppApi.ts` uses `process.env.PORT` and registers `/health`.

**Desktop product:** One window (`main.ts` + `preload.ts`). Packaged UI is only from `composer-os-app/dist` (see `scripts/copy-ui.js`; full directory replace + `verify:ui-resources` after copy). Each UI build emits `composer-os-ui-stamp.json`; `electron/uiBundleVerify.ts` enforces product id/name and blocks Hybrid/Projects/Score in the stamp before any UI URL load. Preload exposes `getUiProvenance` for diagnostics. App API routes only under `/api/*` and `/health`. Legacy stacks under `engines/composer_studio/` and similar are not imported by the desktop app; tests in `desktopQuarantine.test.ts` + `desktopUnification.test.ts` guard the Electron folder; `launcherPaths.test.ts` ensures desktop npm scripts do not reference repo `launchers/`.

**Open output folder (IPC):** `electron/openFolderMain.ts` registers `composer-os-api:open-output-folder` after the bundle loads; uses `resolveOpenFolderTarget` + `ensureFolderForOpen` + `shell.openPath` from **`resources/open-folder-helpers.cjs`** (built by `npm run build:open-folder-helpers`), resolved via `config.resolveOpenFolderHelpersBundlePath()` so packaged apps never `require()` missing `engines/...` files. The bundled `ipcEntry` does not register this channel (avoids duplicate handlers).

**Desktop shortcut deploy (Windows):** `npm run desktop:clean-install` (aliases `desktop:deploy`, `desktop:install`) runs `desktop:package`, then `install/installComposerOsDesktop.ts` (UI verification inside the install script, legacy shortcut quarantine, **Composer OS Desktop.lnk** → newest portable exe, auto-launch packaged exe once). Quarantine rules: `install/installRules.ts`; launcher: `install/launchInstalledDesktopApp.ts`. **Automated rebuild verification:** `npm run desktop:rebuild-and-smoke` → `install/rebuildAndSmoke.ts` (close stale portable PIDs, package, verify exe + UI stamp, launch, PID smoke check, timestamp vs `.last-smoke-ui-timestamp.txt`).

**Clean-room runtime:** Electron `main.ts` uses `loadFile` on `resources/ui`, registers IPC from `resources/desktop-ipc.bundle.cjs` (see `scripts/build-desktop-ipc-bundle.js`, `electron/ipcEntry.ts` excluded from `tsc`, esbuild-only). Shared API logic: `engines/composer-os-v2/app-api/composerOsApiCore.ts` (used by HTTP server and IPC).

**Hardening:** `electron/startupState.ts` + transitions in `main.ts`; `electron/config.ts` centralises paths (bundle, UI, output, icon). Preload exposes `getStartupState`, `getDesktopMeta`, `notifyGenerationPhase`. App API: `composerOsConfig.ts`, `buildDiagnostics.ts`, `apiErrorMessages.ts`, `GET /api/diagnostics`, canonical `output-directory` + `displayPath`. Vitest: `packagingSmoke.test.ts`, `startupState.test.ts`; engine `appApi.test.ts` includes multi-run smoke and diagnostics checks.

**Try Another (web + desktop UI):** `HomeGenerate` calls the same `api.generate` as **Generate**; **Try Another** passes a new `seed` via `generate(next)` after `setVariationSeed(next)` so React state ordering cannot skip the run. `generateComposition` names files `composer_os_<preset>_<iso-ts-safe>_<seed>.musicxml` to avoid same-second overwrites. After a run, `App` dispatches `composer-os:outputs-changed`; `Outputs` listens and refetches so the list stays in sync without a manual refresh.

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
