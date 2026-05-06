# Composer OS — keyboard shortcuts (codebase inventory)

This file records **every keyboard-related binding** we could find in **Composer OS** code and docs: **Electron main / preload**, **React UI** (`apps/composer-os-app`), and **documented** chord-style shortcuts in help / README. Generated from repo search (May 2026).

---

## Summary

| Area | What we found |
|------|----------------|
| **Electron `globalShortcut` / custom menu accelerators** | **None** — `apps/composer-os-desktop/electron` does not register `globalShortcut`, `Menu` with `accelerator`, or `before-input-event` handlers. |
| **App-defined React `onKeyDown` / `onKeyUp` / `addEventListener('keydown')`** | **One feature area:** Song **form** dropdown rows in `HomeGenerate.tsx` (Enter / Space to choose an option; see below). |
| **Documented “Ctrl+…” in Composer OS guides** | **Local dev only:** **Ctrl+C** in the terminal to stop Vite + API (see [Documentation](#documentation-not-app-shortcuts)). |

Standard **browser / OS** behaviour still applies (Tab focus, Enter/Space on real `<button>` elements, window chrome shortcuts). Those are **not** declared as Composer OS shortcuts in source.

---

## Electron (Composer OS Desktop)

**Global shortcuts (`globalShortcut.register`, etc.)**

- **None** in `apps/composer-os-desktop`.

**Application menu accelerators**

- **None** — main window is created in `electron/main.ts` without `Menu.setApplicationMenu`, template menus, or role-based items that would add accelerators.

**Preload**

- `electron/preload.ts` only exposes IPC helpers; **no** keyboard APIs.

**Other “shortcut” strings in the desktop package**

- Install scripts under `install/` refer to **Windows `.lnk` desktop shortcuts** (file links), not keyboard shortcuts.

---

## In-app UI (React)

Explicit **`onKeyDown`** handlers (actual code paths):

| Shortcut | Where | Function |
|----------|--------|----------|
| **Enter** | `apps/composer-os-app/src/pages/HomeGenerate.tsx` — song **form** picker dropdown (`role="button"` rows: “System default” and each form option) | Same as click: set form / bar count / related Zappa song bars, close menu. |
| **Space** | Same rows | Same as click (activation for keyboard users). |

No other files under `apps/composer-os-app/src` define `onKeyDown`, `onKeyUp`, `onKeyPress`, or `addEventListener('keydown'|'keyup')` for shortcuts.

**Pointer-only:** `ChorusArcStrip.tsx` uses pointer events for dragging tension nodes (not keyboard shortcuts).

---

## Documentation (not app shortcuts)

These appear in **Markdown** as developer workflow notes, **not** as in-app hotkeys:

| Shortcut | Document | Meaning |
|----------|----------|---------|
| **Ctrl+C** | `docs/USER_GUIDE.md` (Windows dev launcher section) | Stop the dev servers in the black console window. |
| **Ctrl+C** | `CHANGELOG.md` | Same: stop dev after `vite-dev-launcher` / `launch-composer-os.bat` usage. |

**Not keyboard shortcuts:** some docs use the word “shortcut” for **preset aliases** or **recipe shortcuts** (e.g. `docs/COMPOSER_OS_PLAYBOOK.md` — songwriter diversity presets). Those are **data / UX concepts**, not key bindings.

---

## Maintenance

When adding features:

1. Register **global** keys only in Electron main via `globalShortcut` (and document them here).
2. Put **in-app** hotkeys in shared helpers or one module so this file stays easy to refresh.
3. If you document **Ctrl/Meta/Alt** combos for users, mirror them in this file.
