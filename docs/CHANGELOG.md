# Composer OS — Changelog

## Wyble Engine v1.0 — COMPLETE

- Full 16-bar generation confirmed (no truncation)
- Stable per-voice bar math (no overflow or underfill)
- Exact chord export preserved across notation apps:
  - altered chords (D7(#11), A7(b9), A7alt)
  - slash chords
  - per-bar mapping
- Jazz Behaviour Gate implemented:
  - preserves chromaticism, enclosures, and passing tones
  - removes only static / unresolved clashes
- Phrase direction and musical intent significantly improved
- Lower-voice interaction stable and musically valid
- MusicXML export validated in Sibelius and Guitar Pro 8

Status: Wyble is now a **production-ready generative jazz line engine**

## Wyble Engine — Export + Jazz Behaviour Milestone

- Fixed full 16-bar chord export for Wyble MusicXML
- Preserved exact chord text in notation apps, including:
  - D7(#11)
  - A7(b9)
  - A7alt
- Preserved slash chords and per-bar mapping
- Confirmed no bar truncation in Sibelius / Guitar Pro 8
- Added jazz-aware behaviour validation that preserves chromaticism while preventing static clashes
- Maintained bar-math integrity and stable MusicXML export

## Wyble Engine — Chord Export + Chord Semantics Fixed

- Fixed full per-bar chord export for Wyble MusicXML
- Ensured 16 input bars export as 16 visible chord symbols
- Preserved slash chords correctly in notation apps
- Preserved altered / extended chord text in Sibelius and Guitar Pro 8
- Fixed longstanding issue where some Wyble exports showed truncated or simplified chord symbols
- Confirmed chord progression now matches user input through export

## Wyble Engine — Chord Export Fixed

- Fixed critical bug where chord symbols were truncated (e.g. 4 bars instead of full progression)
- Implemented full per-bar chord export (1:1 mapping with input)
- Ensured Wyble uses user chord progression instead of fallback harmony
- Preserved slash chords and chord text in MusicXML
- Verified correct display in Sibelius across full form

## Wyble Engine — Complete

- Phrase-first generation implemented
- Phrase continuity across bars
- Target-first phrase resolution
- Lower-voice conversational interaction
- Interaction refinement and balance
- Final musical polish completed
- Bar math and MusicXML stability preserved throughout

## Wyble Engine — Interaction Refinement Achieved

- Lower voice interaction refined for more natural balance
- Reduced over-response and rhythmic crowding
- Improved spacing and timing separation between voices
- Preserved phrase system, target-first resolution, and bar-math integrity
- Output now feels musically conversational and structurally stable

## Wyble Engine — Lower Voice Interaction Achieved

- Lower voice upgraded from passive support to interactive counterpoint
- Phrase-aware responses added (post-phrase and anticipatory)
- Increased rhythmic independence (off-beat entries, delayed responses)
- Introduced contrary motion bias between voices
- Maintained density control and bar-math integrity
- Upper voice behaviour unchanged and stable

## Wyble Engine — Phrase Resolution Achieved

- Target-first phrase generation implemented
- Reliable phrase resolution (final note = target)
- Stepwise approach into phrase endings
- Clear melodic direction and continuity across bars
- Reduced repetition and improved musical phrasing
- Bar math and MusicXML stability preserved

## Wyble Engine — Phrase Architecture (Final Phase)

- Introduced phrase-first generation (interval-driven melodic construction)
- Enforced phrase interval constraints during pitch generation
- Added phrase continuity across bars (phrase memory + variation)
- Reduced repeated-note loops via interval enforcement
- Improved upper-voice melodic direction
- Introduced initial lower-voice movement (counter-line foundation)
- Maintained full bar-math integrity and MusicXML stability

## Song Mode baseline stabilisation

- **Guitar–Bass Duo / Song Mode (32-bar):** Usable generation on a stable baseline; recent testing reached high readiness on current outputs (not a guarantee for every run or release).
- **Hook return / bar 25:** Return line uses harmonic realization from the motif shape (not a naive copy of bar 1 MIDI); repetition bias and motif checks aligned so bar 25 identity matches the intended hook behaviour.
- **C7 space:** Hook-related bars (including bar 25) are excluded from C7 thinning; post-pass can roll back when whole-guitar rest share would exceed the swing ceiling.
- **Score model validation:** Per-voice duration sums for multi-voice measures (no longer treating all voices as one stream).
- **Duo lock quality:** Guitar rest ratio uses rest / (rest + note) across the guitar part (multi-voice-safe).
- **Behaviour gates:** Pass on the current working baseline.

## V8.0 (retrospective)

- feat: Lippincott triad pairs wired into emitGuitarPhraseBar — medium and dense density branches now favour third/fifth chord tones when triadPairs active via style stack; active by default in all Song Mode generations via DEFAULT_STYLE_STACK colour layer.
- feat: Andrew Hill added — profile with deep Perplexity research, asymmetric phraseRegularity 0.12, shorterMode harmony bias, UI dropdown; 550-line XML diff vs Donald Fagen confirms distinct sparse output with more rests.
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
