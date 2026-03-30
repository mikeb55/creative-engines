# Composer OS — Changelog

## V8.0 (retrospective)

### Added

- **D1 — Rhythm intent control (engine)** — Optional `RhythmIntentControl` on the generation request; resolution into per-phrase records before Song Mode rhythm overlays; effective phrase strength combines **surprise scale** with **groove vs space** layer margin so intent matters when surprise is fixed.
- **D1 self-test harness** — `engines/composer-os-v2/scripts/d1Selftest.ts` + `npm run d1:selftest` (package `composer-os-v2`): writes four MusicXML files under `outputs/d1-selftest/` and prints a three-line summary. See [TESTING.md](./TESTING.md).
- **Canonical documentation** — This file plus [COMPOSER_OS_ARCHITECTURE.md](./COMPOSER_OS_ARCHITECTURE.md), [USER_GUIDE.md](./USER_GUIDE.md), [TESTING.md](./TESTING.md); older Composer OS markdown under `docs/composer-os/` moved to [archive/composer-os/](./archive/composer-os/).

### Changed

- **App API** — `intent` forwarded through `apiGenerate` → `runAppGeneration` / `generateComposition` → `runGoldenPath` when provided.

### Fixed

- **Groove vs space** — Previously, with identical **surprise**, only `surprise_scale` drove effective strength; groove/space had little effect. Resolution now nudges strength using normalized **groove − space** when intent is non-legacy.

### Notes

- feat: wired c4Strength (Hook Rhythm Strength) and blendStrength (Blend Strength) end-to-end through Song Mode into runGoldenPath and generationMetadata. Both controls now affect generation.
- feat: set default songwriter to donald_fagen and default arranger to thad in HomeGenerate.tsx.
- known: bar 25 hook identity error (literal repetition / contour mismatch) is a pre-existing upstream issue — parked for dedicated fix session.
- known: phrase quality warnings in songModePhraseEngineV1.ts are excessive for chromatic jazz progressions — parked for tuning session.

---

## Earlier releases

Detailed **pre-V8.0** Composer OS history (V2 foundation through V3.x prompts) is preserved in **[archive/composer-os/CHANGELOG_HISTORICAL.md](./archive/composer-os/CHANGELOG_HISTORICAL.md)** to avoid duplicating hundreds of lines here.

The engine README (`engines/composer-os-v2/README.md`) still describes implemented stages and links to these docs.
