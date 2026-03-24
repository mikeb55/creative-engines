# Composer OS Changelog

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
