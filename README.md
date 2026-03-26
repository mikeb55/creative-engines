# Creative Engines — Platform & Infrastructure

**Version 1.0**  
**Style-agnostic, instrumentation-agnostic**

---

## Repository Roles

**creative-engines**

Platform infrastructure including:
- runtime
- palettes
- rules
- templates
- shared documentation

**creative-rule-engines**

Composer engine definitions including:
- Monk engine
- Barry Harris engine
- Bartok engine
- Slonimsky engine
- other composition engines

Engine definition files must exist only in creative-rule-engines.

---

## Purpose

Universal composition engine framework for all Cursor music projects. Works across any instrumentation, genre, or style. Enforces mandatory GCE ≥ 9.0 before MusicXML output.

---

## Composer OS (V1 product path)

**Composer OS** (under `engines/composer-os-v2/`) is the unified generative pipeline for this repo’s jazz/chamber tooling. **Web UI:** `apps/composer-os-app` (`npm run dev`). **Windows desktop:** `apps/composer-os-desktop` — packaged portable is always **`release/Composer-OS.exe`** (stable path; version is in-app only, so shortcuts do not need relinking each build). **Docs:** `docs/composer-os/` (CHANGELOG, DEV_NOTES, USER_GUIDE). Supported modes and limitations for V1 are summarized in `engines/composer-os-v2/app-api/releaseMetadata.ts` and the Composer OS README — no Python or `.bat` is required for normal app use.

**V3 app wiring:** The web/desktop app includes a **Run system check** action (Diagnostics) that runs Composer OS–scoped tests without using the terminal; the **Outputs** panel is mode- and type-aware; **Open library folder** / **Open this file’s folder** use normalized Windows paths; unknown presets are rejected by the API before generation. See `docs/composer-os/CHANGELOG.md`.

**V3 Generate UI:** The **Generate** screen is mode-driven (no user-facing style module/stack controls on the main form); duo/ECM use fixed internal defaults. The **Style Stack** sidebar tab was removed; see `docs/composer-os/CHANGELOG.md`.

**V4 (Composer OS track — Prompt 1/8):** Guitar–Bass Duo can request **32 bars** (`totalBars: 32`) for an opt-in **A / A′ / B / A″** long-form route with a **modulation planning** layer; the default **8-bar** golden path is unchanged. See `docs/composer-os/CHANGELOG.md`.

**V3.4 (Composer OS):** MusicXML **key signatures** are **inferred from harmony** (optional **`keySignatureMode`** / tonal centre override); ambiguous or chromatic progressions avoid a misleading default signature. See `docs/composer-os/CHANGELOG.md`.

---

## Structure

```
creative-engines/
├── engines/          # Composer engines, hybrid, orchestration, songwriting, studio
│   ├── composer_studio/    # Unified workflow: presets, batch, export
│   ├── orchestration_bridge/ # Ensemble arrangements (string quartet, jazz, etc.)
│   ├── songwriting_bridge/  # Lead sheets, vocal melody, chord symbols
│   ├── hybrid_engine/      # Counterpoint-capable hybrid compositions
│   └── ... (wayne_shorter, barry_harris, frisell_atmosphere, etc.)
├── launchers/        # composer_studio_launcher.bat, etc.
├── docs/             # Documentation
├── palettes/         # Tonality Vault, interval cycles
├── rules/            # GCE, anti-monotony, ensemble
├── runtime/          # Run scripts
├── templates/        # Composition request, revision loop
└── README.md
```

## Composer Studio

One integrated workflow: input → engine/hybrid → generate → rank → export (composition, orchestration, lead sheet).

```python
from composer_studio import run_composer_studio
result = run_composer_studio("My Tune", "wheeler_lyric", seed=0)
```

Or double-click `launchers/composer_studio_launcher.bat`.

---

## Universal Rules

1. **GCE Iteration** — No MusicXML until GCE ≥ 9.0
2. **Anti Monotony** — No cell > 4 bars × 2 without transformation
3. **Density Arc** — low → development → peak → release
4. **Ensemble Awareness** — Idiomatic parts
5. **Section Clarity** — Boxed rehearsal letters
6. **Harmonic Depth** — Use palettes (Tonality Vault, etc.)
7. **Engraving Quality** — Correct MusicXML

---

## Optional Integration

**gml-harmonic-engine:** If available, integrate for voice-leading and chord voicing logic. The creative-engines framework does not depend on it; it enhances harmonic decision support when present.

---

## Project-Independent

This framework works in any Cursor project, any repository, any musical style. Reference from your project; do not duplicate.
