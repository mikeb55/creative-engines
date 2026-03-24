# Composer OS Desktop

Windows desktop application for Composer OS — packaged executable with no Python or .bat workflow.

## Run (Dev)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

Builds API bundle, UI, and Electron main; launches the desktop app.

## Package (Windows)

```bash
cd apps/composer-os-desktop
npm run desktop:package
```

Produces:
- `release/Composer-OS-1.0.0-portable.exe` — portable
- `release/Composer OS Setup 1.0.0.exe` — NSIS installer with desktop shortcut

## End User Flow

1. Double-click the executable (portable or installed).
2. API starts automatically.
3. UI opens in a desktop window.
4. Generate, browse outputs, open folder — same as web app.
5. Close window to exit.

No manual server start. No Python. No .bat files.

## Output Location

- **Dev:** `outputs/composer-os-v2/` (repo root)
- **Packaged:** `%APPDATA%/composer-os-desktop/outputs/composer-os-v2/`

## Icon

Placeholder: `resources/icon.png` (256×256). Replace with a production icon for release.
