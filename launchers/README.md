# Desktop Launchers

Node.js launchers for each engine. No .bat files.

## Create Shortcuts

From repo root:

```bash
node launchers/create_shortcuts.js
```

Creates 4 shortcuts on Desktop:
- Wyble Etude Generator
- Ellington Orchestration
- Big Band Architecture
- Contemporary Counterpoint

## Launcher Scripts

| Engine | Launcher |
|--------|----------|
| Wyble Etude Generator | `launchers/launch_wyble.js` |
| Ellington Orchestration | `launchers/launch_ellington.js` |
| Big Band Architecture | `launchers/launch_big_band.js` |
| Contemporary Counterpoint | `launchers/launch_counterpoint.js` |

Shortcuts target `node.exe` with the launcher path as argument. Handles paths with spaces.

## Prerequisites

- Node.js and npm installed
- Run `npm install` from repo root
- ts-node available (via npx)
