# Composer OS GUI Simplification — Checkpoint

**Date:** 2026-11-13  
**Branch:** `main`  
**Pause after:** Keep Composition (shipped) + Generate Step 1 Advanced & Tools panel

## Git

| Item | Value |
|------|--------|
| Pre-commit HEAD | `bbd7dcc0` — `feat(composer-os): Keep Composition save/open round-trip` |
| Remote | `origin/main` (was up to date before this checkpoint commit) |
| This checkpoint | HomeGenerate Advanced & Tools wrap + this doc only |

**Left untouched:** `apps/composer-os-app/src/services/api.ts`, all `engines/**` dirty files, untracked `.tmp-*` / manuals / long-line practice, etc.

## Preserved completed work

1. **Keep Composition** (already on `main` @ `bbd7dcc0`)
   - Save / Open Kept Composition via Martino session IPC piggyback
   - Restores MusicXML + seed + submitted settings (`harmonicVoice`, `styleProfile`, …)
   - Omits restored `filepath` so audition does not overwrite kept XML from disk
2. **Advanced & Tools** (this commit — `HomeGenerate.tsx`)
   - Closed-by-default `<details data-testid="advanced-and-tools">`
   - Groups: LeadSheet, Mosaic, Paste, iReal, Chord Inspector, Reharm, PDF
   - Outside panel: Producer, SharedContext, core style, Generate / Try / Demo, results, Keep/Open
   - Developer diagnostics unchanged

## Electron / UI build status (as of checkpoint)

| Artifact | Status |
|----------|--------|
| UI rebuild | Done 2026-11-12 — `resources/ui` stamp `buildTimestamp` **2026-11-12T23:50:32.608Z**, `gitCommit` **bbd7dcc0** |
| Electron (`dist/main.js`) | Rebuilt same session (mtime 2026-11-12 23:50) |
| API bundle | **Preserved** — `resources/api.bundle.js` mtime **2026-10-30** (not rebuilt) |
| Desktop IPC bundle | **Preserved** — `resources/desktop-ipc.bundle.cjs` mtime **2026-10-30** (not rebuilt) |
| Live verify | Advanced closed by default + Generate visible (CDP). Keep/Open remain outside Advanced (results / `showBigReceipt` gate unchanged). |

## Next (not started)

- Further Generate simplification steps (beyond Step 1)
- No engine work in this pause

## Stop

Good point to start a new chat for the next GUI simplify phase.
