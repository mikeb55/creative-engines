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
- **Score Integrity**: Bar math, register, chords, rehearsal; **strict bar math** (`strictBarMath.ts`) per voice before export; **post-export** `validateExportedMusicXmlBarMath` for MusicXML round-trip bar fills
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

**Desktop product:** One window (`main.ts` + `preload.ts`). Packaged UI is only from `composer-os-app/dist` (see `scripts/copy-ui.js`; full directory replace + `verify:ui-resources` after copy). Each UI build emits `composer-os-ui-stamp.json`; `electron/uiBundleVerify.ts` enforces product id/name and blocks Hybrid/Projects/Score in the stamp before any UI URL load. Preload exposes `getUiProvenance` for diagnostics. App API routes only under `/api/*` and `/health`. Legacy stacks under `engines/composer_studio/` and similar are not imported by the desktop app; tests in `desktopQuarantine.test.ts` + `desktopUnification.test.ts` guard the Electron folder; `launcherPaths.test.ts` ensures desktop npm scripts do not reference repo `launchers/`.

**Open output folder (IPC):** `electron/openFolderMain.ts` registers `composer-os-api:open-output-folder` after the bundle loads; uses `resolveOpenFolderTarget` + `ensureFolderForOpen` + `shell.openPath` from **`resources/open-folder-helpers.cjs`** (built by `npm run build:open-folder-helpers`), resolved via `config.resolveOpenFolderHelpersBundlePath()` so packaged apps never `require()` missing `engines/...` files. The bundled `ipcEntry` does not register this channel (avoids duplicate handlers).

**Desktop shortcut deploy (Windows):** `npm run desktop:clean-install` (aliases `desktop:deploy`, `desktop:install`) runs `desktop:package`, then `install/installComposerOsDesktop.ts` (UI verification inside the install script, legacy shortcut quarantine, **Composer OS Desktop.lnk** → newest portable exe, auto-launch packaged exe once). Quarantine rules: `install/installRules.ts`; launcher: `install/launchInstalledDesktopApp.ts`. **Clean-room runtime:** Electron `main.ts` uses `loadFile` on `resources/ui`, registers IPC from `resources/desktop-ipc.bundle.cjs` (see `scripts/build-desktop-ipc-bundle.js`, `electron/ipcEntry.ts` excluded from `tsc`, esbuild-only). Shared API logic: `engines/composer-os-v2/app-api/composerOsApiCore.ts` (used by HTTP server and IPC).

**Hardening:** `electron/startupState.ts` + transitions in `main.ts`; `electron/config.ts` centralises paths (bundle, UI, output, icon). Preload exposes `getStartupState`, `getDesktopMeta`, `notifyGenerationPhase`. App API: `composerOsConfig.ts`, `buildDiagnostics.ts`, `apiErrorMessages.ts`, `GET /api/diagnostics`, canonical `output-directory` + `displayPath`. Vitest: `packagingSmoke.test.ts`, `startupState.test.ts`; engine `appApi.test.ts` includes multi-run smoke and diagnostics checks.

**Output paths:** `engines/composer-os-v2/app-api/composerOsOutputPaths.ts` is the single source of truth for `Mike Composer Files` root, preset subfolders, and `ensureOutputDirectoryForPreset`. HTTP API and desktop IPC both use `composerOsApiCore.ts`. If you edit `app-api/*.ts` or `core/export/musicxmlExporter.ts`, keep the matching **`.js`** copies in sync when present (Node/ts-node may resolve `.js` first), or remove duplicate `.js` so only TypeScript is used.

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
