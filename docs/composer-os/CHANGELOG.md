# Composer OS Changelog

## Stabilisation + Bacharach visibility

- **Guitar–Bass Duo** golden-path generation is regression-tested across many seeds (default style stack and **Bacharach** primary) so **strict bar math**, **MusicXML round-trip**, and **bass metadata** gates stay green; the Generate screen lists loaded style modules by name (**Barry Harris**, **Metheny**, **Triad Pairs**, **Bacharach**) when the API returns them.
- **Bacharach** remains a first-class registered style module end-to-end (registry, `/api/style-modules`, UI selectors, receipts).

## Guitar–Bass Duo musical pass + Bacharach module

- **Guitar–Bass Duo** golden-path output is more musical: guide-tone–oriented bass lines (with staggered entries and quarter-safe rhythms), improved guitar phrasing (rests, dyad-style bars, stagger), A/B interaction via conversational downbeats, motif merge uses quarter-beat quantization for stable MusicXML bar math.
- **Bacharach** is a registered Composer OS style module (`bacharach`) with `moduleApply` / `moduleValidation`; it appears in the style-module list and Style Blend like other modules. Behaviour gates include **Bacharach conformance** when Bacharach is in the stack and **duo musical quality** checks (bass variety, guitar rest/onset spread, simultaneous downbeats).
- **Tests:** Stale `tests/styleModule.test.js` was removed so `ts-node` runs the TypeScript tests (avoids shadowing `styleModule.test.ts`).

## Output manifests (`_meta`)

- **Disk manifests** (`.manifest.json`) are stored under each preset folder’s **`_meta`** subfolder so user-facing folders (e.g. **Guitar-Bass Duos**) contain **only `.musicxml`**. Listing still reads metadata from `_meta` or from the legacy **next-to-MusicXML** path. **Open folder** unwraps `_meta` so Explorer opens the composition folder. On Windows, `_meta` is marked **hidden** (`attrib +h`) when creation succeeds.

## Automated desktop rebuild + smoke

- **Command:** `npm run desktop:rebuild-and-smoke` in `apps/composer-os-desktop` (or repo root: same name) runs: close stale `Composer-OS-Desktop-*-portable.exe` processes (Windows), `desktop:package`, resolve newest portable exe, verify `resources/ui` stamp, launch the exe, confirm the process stays up, compare UI `buildTimestamp` to the last successful run (stored in `.last-smoke-ui-timestamp.txt`). Prints **PASS** or **FAIL** with the blocking step — no fake success.

## Desktop packaging + score titles

- **Packaged folder actions:** `openFolderMain` loads **`resources/open-folder-helpers.cjs`** (esbuild bundle of `composerOsOutputPaths` + `ensureFolderForOpen`), not loose `engines/...` paths — fixes `Cannot find module ... composerOsOutputPaths.js` in the portable exe. `config.resolveOpenFolderHelpersBundlePath()` mirrors other bundled assets (`process.resourcesPath` + dev fallbacks).
- **Score titles:** Guitar–Bass Duo default work title is **Guitar-Bass Duo Study** (not “Golden Path Duo”). Optional **`title`** on generate requests flows through `runGoldenPath` → score model → MusicXML `<work-title>` → run manifest and disk manifest.
- **Try Another:** Runs a **full generation** immediately with a fresh hidden seed (same pipeline as **Generate**). Output filenames include timestamp and **seed** so rapid back-to-back runs never overwrite the previous file. After success, the **Generation receipt** and **Outputs** list update (custom `composer-os:outputs-changed` event + existing refresh trigger).

## Correctness gates (desktop, MusicXML, bass identity)

- **Desktop:** Open library / open file folder uses Electron **main** `shell.openPath` after `resolveOpenFolderTarget` (same rules as `apiOpenOutputFolder`). IPC handler is registered in `openFolderMain.ts` after the API bundle; structured result includes `openedPath` when successful.
- **Score model:** `validateStrictBarMath` (per-voice bar fill, no overlap) runs before export; golden-path guitar motif measures insert rests for leading gaps and merge sequential motif notes without overrunning the bar.
- **Export:** `validateExportedMusicXmlBarMath` re-validates measure duration sums per voice after export; generation fails if round-trip bar math does not match.
- **Guitar–Bass Duo bass:** Part/instrument name **Double Bass**, `instrument-sound` `pluck.bass.acoustic`, GM **midi-program 33** (see `guitarBassDuoExportNames.ts`).
- **Receipt:** “Passed” requires strict bar math, export round-trip, instrument metadata, and existing integrity/MX gates; `GenerateResult.validation` includes `strictBarMathPassed`, `exportRoundTripPassed`, `instrumentMetadataPassed`.
- **Performance pass:** Duration/bar structure unchanged (`performanceRules.ts`); articulation only.

## Style Blend (composer-facing controls)

- **Weights** UI replaced by **Style Blend**: primary (Strong / Medium / Light), optional secondary (Off / Light / Medium) and colour (Off / Subtle / Present) when those modules are selected. Values map to internal normalized weights in `mapStyleStack.ts` (`deriveRawWeightsFromAppStyleStack`). Legacy numeric `weights` in the API still work for tests; when both are sent, **Style Blend** wins.
- Generate uses **Try Another** (no raw seed field). Seed may still appear in manifests/diagnostics only.

## Desktop UX — outputs, bass export, variation UI

- Default output root: **`Documents\\Mike Composer Files`**, with preset subfolders (`Guitar-Bass Duos`, `Big-Band Compositions`, `ECM Chamber Compositions`). Folders are created as needed. `COMPOSER_OS_OUTPUT_DIR` overrides the root only. Listing, receipts, manifests, and **Open output folder** use the same canonical paths.
- Guitar–Bass Duo MusicXML exports **acoustic/upright bass** GM metadata (`midi-program` 33 in MusicXML; GM program 32), not vocal/choir bass.
- Main UI: no raw **Seed** field; **Try Another** re-rolls internal randomness.

## Desktop packaging (Windows exe)

- `npm run desktop:package` uses `CSC_IDENTITY_AUTO_DISCOVERY=false` and `win.signAndEditExecutable: false` so unsigned builds do not require **winCodeSign** extraction (avoids symlink privilege failures). Canonical artifact: `release/Composer-OS-Desktop-*-portable.exe`. `npm run verify:packaged-exe` fails if no portable exe exists. `desktop:self-test-install` = package → verify exe → UI + shortcut + launch.

## Desktop clean-room (IPC + new identity)

- Windows desktop product: **Composer OS Desktop**, `appId` `com.mikeb55.composeros.desktop`, portable `Composer-OS-Desktop-*-portable.exe`.
- Packaged app loads UI from disk (`loadFile`); engine access is **IPC only** via `desktop-ipc.bundle.cjs` + preload `invokeApi` — **no localhost** for the Electron shell.
- Web workflow unchanged: `startComposerOsAppApi` + HTTP for `npm run dev` in `composer-os-app`.
- `npm run desktop:clean-install` (aliases: `desktop:deploy`, `desktop:install`) packages the app, verifies the UI stamp, quarantines legacy shortcuts, refreshes **Composer OS Desktop.lnk** to the newest portable exe, and **launches the packaged app once** (summary: exe path, shortcut path, `Launched: yes`).

## Desktop shortcut deploy (Windows)

- `apps/composer-os-desktop/install/` — `desktop:clean-install` runs `desktop:package` then the TypeScript installer: verifies UI resources, scans shortcut locations, quarantines legacy Composer Studio / stale “Composer OS” / **Composer OS Desktop** `.lnk` files when the target is not the current portable exe, creates **Composer OS Desktop.lnk** on the desktop targeting the newest `release/Composer-OS-Desktop-*-portable.exe`, verifies the shortcut, and launches that exe once. Quarantined files go to `%USERPROFILE%\ComposerOsDesktop\shortcut-quarantine\`.

## Desktop UI bundle provenance

- `apps/composer-os-app` Vite build writes `composer-os-ui-stamp.json` (product id, name, shell version, timestamp, git commit, allowed page list).
- `apps/composer-os-desktop` deletes and recopies `resources/ui` on each UI build, verifies the stamp after copy, and Electron **main** refuses to load `http://127.0.0.1:…` until the on-disk stamp passes (wrong/stale bundles show a single error page with path and product id). Window title and in-app diagnostics show Composer OS identity, desktop version, and UI path.

## Desktop legacy quarantine

- `apps/composer-os-desktop` loads only `composer-os-app` UI (`copy-ui.js` → `resources/ui`) and the bundled Composer OS API. Electron `main.ts` uses one `BrowserWindow`, `setWindowOpenHandler` deny, navigation guard to non-localhost HTTP(S), `app.setName('Composer OS')`. No script runtimes or legacy app paths in Electron sources (enforced by `desktopQuarantine.test.ts`). Web shell is only Generate / Presets / Style Stack / Outputs plus Diagnostics panel — no Hybrid / Projects / Score tabs.

## Style modules (UI)

- Style modules are listed from the engine registry (`getStyleModules`, `GET /api/style-modules`); diagnostics includes the same `styleModules` list. Generate and Style Stack load from the API (no silent empty dropdowns); if the list is empty or the request fails, the UI shows: “No style modules available — check backend.” Generation passes the selected primary/secondary/colour stack into the golden path so run manifests and receipts match the request.

## Desktop product hardening

- Explicit startup state machine in Electron main (`booting` → … → `ready` / `fatal_error`, plus generation phases); renderer reads state via preload; fatal startup shows a single-window error page with clear copy.
- Central app API constants (`composerOsConfig.ts`) and `GET /api/diagnostics` (port, canonical output path, writable flag, version).
- Web UI: expandable **Diagnostics** panel; prominent **Generation receipt** after each run (paths, manifest, preset, style stack, readiness/MX, pass/fail, open folder); friendlier errors when the API or output folder fails.
- `openOutputFolder` validates folder existence/writability; `GET /api/output-directory` returns `displayPath` (Windows-friendly).
- Engine tests: multi-run generation smoke (5 runs), diagnostics payload, friendly error copy; desktop tests: packaging smoke, startup helpers.

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
