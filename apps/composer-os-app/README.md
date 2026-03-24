# Composer OS App

Local web app for Composer OS — preset-driven composition generation.

## Run

```bash
# From repo root
cd apps/composer-os-app
npm install
npm run dev
```

Opens UI at http://localhost:5173 (Vite) and API at http://localhost:3001. API runs via root tsconfig for engine compatibility.

## Workflow

1. Select preset (Guitar-Bass Duo supported)
2. Select style stack (primary/secondary/colour)
3. Set seed, optional locks
4. Generate
5. View outputs and validation summary

## Build

```bash
npm run build
```

Serves static assets from `dist/`. API server can serve them when built.

## Desktop wrapper

Windows desktop packaging will be added in a later stage.
