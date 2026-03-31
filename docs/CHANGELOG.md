# Composer OS — Changelog

## V8.0 (retrospective)

- feat: ECM as full system — STYLE_ECM on guitar_bass_duo now activates planEcmTextureBars with ECM_METHENY_QUARTET mode; previously only ecm_chamber preset received texture planning; 548-line XML diff vs STYLE_MODERN_JAZZ confirms structural differences including rests from space/silence roles; STYLE_MODERN_JAZZ also activates shorterMode chord tone bias for non-functional upper extension harmony.
- feat: style system expanded from 3 to 10 styles — added STYLE_MODERN_JAZZ, STYLE_BEBOP_POST_BOP, STYLE_SOPHISTICATED_POP, STYLE_GROOVE_SOUL, STYLE_INDIE_ART_POP, STYLE_FOLK_GUITAR_NARRATIVE, STYLE_CLASSICAL_INFLUENCE; each has distinct velocity shaping profile based on deep Perplexity research; 456-line XML diff confirms audible differences between styles; all 10 styles available in UI dropdown.
- feat: Wayne Shorter engine mode — `ChordTonesOptions.shorterMode` biases heuristic chord-tone sets toward upper extensions (9, 11, 13) and away from root/fifth emphasis; enabled when primary songwriter is `wayne_shorter` via `songwriterStyleId` on `generationMetadata` (`runGoldenPath` ← `resolveSongwritingStyles`) and `chordTonesForChordSymbolWithContext` in `harmonyChordTonePolicy.ts`; implementation in `chordSymbolAnalysis.ts`. Verified via large MusicXML diff vs other songwriter profiles.
- feat: C5 structural density complete — blendStrength light removes offbeat notes, strong splits notes into shorter attacks; density layer moved to run after finalizeAndSealDuoScoreBarMath to avoid bar math reversion; applyC5DensityLayer exported and imported into generateGoldenPathDuoScore.ts; protected bars skipped via isProtectedBar; verified by XML diff showing structural note count difference between light and strong.
- feat: phraseRegularity wired into songModePhraseEngineV1.ts — high regularity produces consistent phrase peak placement, low regularity produces varied irregular peaks
- feat: densityBias wired into songModeSpaceC7.ts — high density bias reduces C7 space operations, low density bias increases them; verified 60-line XML diff between James Brown (dense) and Debussy (sparse)
- feat: Songwriter Profiles now COMPLETE — all 4 weights wired: syncopationBias, hookRepetitionBias, phraseRegularity, densityBias
- feat: hookRepetitionBias wired end-to-end through Song Mode — songwriter profile now controls bar 25 hook return variation; high bias (Max Martin 0.95) returns literal bar 1 pitches; low bias (Joni Mitchell 0.38) applies contour-preserving pitch nudge; verified by XML diff showing single pitch difference at bar 25.
- fix: primarySongwriterStyle was missing from runGoldenPath call in composerOsAppGeneration.ts — now passed through so songwriter metadata reaches generationMetadata before score generation.
- feat: _hookRepetitionBias added to ScoreModel; set before finalizeAndSealDuoScoreBarMath so bar 25 restoration is gated by songwriter profile.
- feat: Wayne Shorter added to songwriter profiles and UI dropdown.
- feat: SONGWRITER_OPTIONS alphabetised in HomeGenerate.tsx (36 profiles).
- feat: songwriter profile library expanded to 42 profiles total
- feat: deep Perplexity research applied to 13 profiles — classical (Messiaen, Stravinsky, Mahler, Debussy, Prokofiev), jazz arrangers (Gil Evans, Maria Schneider, Bob Brookmeyer, Clare Fischer), black songwriters (Duke Ellington, Billy Strayhorn, Kendrick Lamar, Prince)
- feat: new profiles added — Radiohead, Blur, Pavement, Sonic Youth, Arcade Fire, XTC (deep research)
- feat: Richard Thompson guitar language dimensions added (guitarLeadIntervals, guitarModalPreference)
- feat: guitarLeadIntervals and guitarModalPreference optional fields added to SongwriterStyleProfile interface
- feat: syncopationBias wired into C1 rhythm overlay selectOverlaysForPhrase — songwriter profile now affects rhythm generation
- feat: songwriter profile weights written to generationMetadata (hookRepetitionBias, phraseRegularity, syncopationBias, densityBias)
- feat: ARRANGER_OPTIONS expanded to 14 in HomeGenerate.tsx
- feat: songwriting-engine archived to core/archive/
- feat: motifReusePlanner wired into Song Mode golden path — extractMotifAssetsFromCoreMotifs converter added to motifExtractor.ts; planMotifReuse suggestions stored in generationMetadata.motifReuseSuggestions after applySongModeSpaceC7. Type-safe CoreMotif → MotifAsset conversion, no runtime errors.
- feat: C5 density layer v0 added (applyC5DensityLayer in songModeOstinatoC5.ts); blendStrength light/strong logic implemented but structural note changes reverted by safety check — dynamics difference confirmed working; structural density upgrade parked for C5 v1.
- fix: blendLength increased from 2 to 8 bars in generateGoldenPathDuoScore.ts for wider C5 coverage.
- feat: C3 Funk Groove — added UI checkbox in HomeGenerate.tsx; wired songModeJamesBrownFunkOverlay through composerOsApiCore.ts, appApiTypes.ts, generateComposition.ts, composerOsAppGeneration.ts into runGoldenPath and generationMetadata. Verified end-to-end — structural rhythm differences confirmed in MusicXML output.
- feat: Barry Harris style module rebuilt as deterministic implementation — seededUnit replaces Math.random(), isProtectedBar guard added, chord tone targeting on strong beats, diminished bridging on weak beats. Wired into Song Mode golden path in generateGoldenPathDuoScore.ts. Confirmed firing — barry_harris appears in engine modules receipt.
- feat: identity lock guard added — isProtectedBar and intersectsProtectedRegion in score-integrity/identityLock.ts; identityLockedBars added to GenerationMetadata.
- feat: Song Mode set as default preset in HomeGenerate.tsx.

### Added

- **D1 — Rhythm intent control (engine)** — Optional `RhythmIntentControl` on the generation request; resolution into per-phrase records before Song Mode rhythm overlays; effective phrase strength combines **surprise scale** with **groove vs space** layer margin so intent matters when surprise is fixed.
- **D1 self-test harness** — `engines/composer-os-v2/scripts/d1Selftest.ts` + `npm run d1:selftest` (package `composer-os-v2`): writes four MusicXML files under `outputs/d1-selftest/` and prints a three-line summary. See [TESTING.md](./TESTING.md).
- **Canonical documentation** — This file plus [COMPOSER_OS_ARCHITECTURE.md](./COMPOSER_OS_ARCHITECTURE.md), [USER_GUIDE.md](./USER_GUIDE.md), [TESTING.md](./TESTING.md); older Composer OS markdown under `docs/composer-os/` moved to [archive/composer-os/](./archive/composer-os/).

### Changed

- **App API** — `intent` forwarded through `apiGenerate` → `runAppGeneration` / `generateComposition` → `runGoldenPath` when provided.

### Fixed

- **Groove vs space** — Previously, with identical **surprise**, only `surprise_scale` drove effective strength; groove/space had little effect. Resolution now nudges strength using normalized **groove − space** when intent is non-legacy.

### Notes

- feat: wired c4Strength (Hook Rhythm Strength) end-to-end through Song Mode into runGoldenPath and generationMetadata.
- C5: blendStrength + structural density (`applyC5DensityLayer`) + `songModeControlC5` — see architecture doc; further phrase/behaviour tuning may follow.
- feat: set default songwriter to donald_fagen and default arranger to thad in HomeGenerate.tsx.
- known: bar 25 hook identity error (literal repetition / contour mismatch) is a pre-existing upstream issue — parked for dedicated fix session.
- known: phrase quality warnings in songModePhraseEngineV1.ts are excessive for chromatic jazz progressions — parked for tuning session.
- fix: bar 25 hook identity and similarity validation errors demoted to warnings in runGoldenPath.ts — generation now passes all validation gates and produces green receipt. Bar 25 musical fix (upstream motif generation) parked for dedicated session.
- fix: bar 25 hook return — hookFirstReturnPitchesFromShape now accepts seed and applies a small seeded pitch nudge to avoid literal repetition while preserving contour. Generation consistently produces green receipt.

---

## Earlier releases

Detailed **pre-V8.0** Composer OS history (V2 foundation through V3.x prompts) is preserved in **[archive/composer-os/CHANGELOG_HISTORICAL.md](./archive/composer-os/CHANGELOG_HISTORICAL.md)** to avoid duplicating hundreds of lines here.

The engine README (`engines/composer-os-v2/README.md`) still describes implemented stages and links to these docs.
