# Cursor Engine Snapshot

Read-only report (no code changes, no build, no scripts). Generated from repository reads and `glob_file_search` / `grep` / `read_file` only.

---

## SECTION 1: SYSTEM OVERVIEW

### a) Full name and stated purpose

- **Repository:** **Creative Engines — Platform & Infrastructure** (`README.md`). Described as a **universal composition engine framework** for Cursor music projects: style-agnostic, instrumentation-agnostic; includes runtime, palettes, rules, templates, shared documentation.
- **Sibling concept:** `creative-rule-engines` is referenced for named engines (Monk, Barry Harris, Bartók, Slonimsky, etc.); engine definitions are expected to live there, not in this repo’s engine tree.
- **Rule:** Root README states **GCE ≥ 9.0** before MusicXML output (platform framing).
- **Primary product pipeline in-repo:** **Composer OS V2** under `engines/composer-os-v2/`: a **unified generative composition system** with a single pipeline, validation gates, and readiness before export is **shareable** (`engines/composer-os-v2/README.md`).
- **Apps:** Web `apps/composer-os-app`; desktop `apps/composer-os-desktop`.

### b) Musical styles, genres, or grammars (named)

**Composer OS style modules (style stack):** `barry_harris`, `metheny`, `triad_pairs`, `bacharach` (`engines/composer-os-v2/core/style-modules/`, each with README).

**Song Mode — Style Engine profiles** (`songModeStyleProfile.ts`): `STYLE_ECM`, `STYLE_SHORTER_POST_BOP`, `STYLE_BEBOP_LITE`, `STYLE_MODERN_JAZZ`, `STYLE_BEBOP_POST_BOP`, `STYLE_SOPHISTICATED_POP`, `STYLE_GROOVE_SOUL`, `STYLE_INDIE_ART_POP`, `STYLE_FOLK_GUITAR_NARRATIVE`, `STYLE_CLASSICAL_INFLUENCE`.

**Songwriting:** Large songwriter profile library; **Wayne Shorter** enables `shorterMode` in chord-tone policy (`harmonyChordTonePolicy.ts`, `chordSymbolAnalysis.ts`).

**ECM:** `ecm_chamber` preset; modes such as `ECM_METHENY_QUARTET` (see app types / README).

**Big Band research:** Era (e.g. `post_bop`), composer styles (`ellington`, `basie`, `thad`, `schneider`) per engine README.

**Wyble:** Jimmy Wyble–style line / etude (`wyble_etude`, `jimmy-wyble-engine`, golden path layers).

**Other engine packages** under `engines/` (arranger-assist, big-band-architecture, Ellington, selective big-band, contemporary counterpoint, conductor, shared `engines/core` chord helpers): separate generators / exporters (see Section 6).

### c) Ensemble types or instrument combinations

**App preset ids** (`composerOsAppGeneration.ts` `SUPPORTED_APP_PRESET_IDS`): `guitar_bass_duo`, `guitar_bass_duo_single_line`, `ecm_chamber`, `riff_generator`, `song_mode`, `big_band`, `string_quartet`, `wyble_etude`.

**Capabilities** (`releaseMetadata.ts`): MusicXML generation for duo, ECM, riff, song mode, Wyble etude; **planning-only** JSON for big band and string quartet (honest notes in file).

### d) Highest-level entry point for generation

- **App boundary:** `runAppGeneration` in `engines/composer-os-v2/app-api/composerOsAppGeneration.ts` routes presets to `generateComposition`, `runSongMode`, big-band / quartet planning, Wyble, riff, etc. HTTP + Electron use `composerOsApiCore.ts`.
- **Typical MusicXML path:** `generateComposition` in `engines/composer-os-v2/app-api/generateComposition.ts` calls `runGoldenPath` after `resolveEffectiveGenerationSeed`.
- **Core orchestration:** `runGoldenPath` in `engines/composer-os-v2/core/goldenPath/runGoldenPath.ts`.

### e) What one complete generation run produces

- **Primary:** **MusicXML** (string + optional file write), **JSON run manifest**, validation / readiness / receipt fields (`generateComposition`, `writeOutputManifest`).
- **Song Mode / planning:** Structural JSON, lead-sheet contracts; big band / quartet: planning JSON per README.
- **Audio / MIDI:** Not primary Composer OS products; reference-import can parse MIDI for behaviour hints.

### f) Mood, feel, style preset, creative mode

- **Feel / rhythm:** Rhythm engine + Song Mode **C1–C7** stack (`docs/COMPOSER_OS_ARCHITECTURE.md`).
- **Creative controls:** `creativeControlLevel`: `stable` | `balanced` | `surprise`; optional `variationId` → seed (`core/creative-controls/`, `core/variation/`).
- **D1 intent:** `GenerateRequest.intent` (groove, space, expression, surprise).
- **Style:** Style stack / Song Mode style profile; presets-plus named aliases.

---

## SECTION 2: ARCHITECTURE MAP

### a) Pipeline order (Composer OS golden path)

High-level order from `runGoldenPath.ts`: preset → section roles → density → register maps → rhythmic constraints → motif → style stack → interaction → instrument behaviours → score build (`generateGoldenPathDuoScore` etc.) → performance pass → score integrity → behaviour gates → MusicXML export → MX / Sibelius checks → readiness → run manifest.

Major areas: `core/goldenPath/`, `core/harmony/`, `core/score-integrity/`, `core/export/`, `core/readiness/`, `core/song-mode/`, `core/form/`, `core/modulation/`, `app-api/`.

### b) Harmony system

- **Grammar:** Jazz **lead-sheet chord symbols** with unified parsing (`chordProgressionParser.ts`, `chordSymbolAnalysis.ts`, `chordPipeline.ts`, `harmonyChordTonePolicy.ts`, `keyInference.ts`).
- **Chord selection:** Built-in progressions, custom pasted lines, Song Mode compiled harmony, Wyble-resolved bars (`runGoldenPath`, `harmonyResolution.ts`, `customLockedHarmonyRouting.ts`).
- **Voice-leading:** Embedded in phrase generators, style modules (Barry Harris, triad pairs), bass/guitar planners, Voice 2 layer — not a separate classical VL engine.

### c) Rhythm system

- **Rhythm engine:** `core/rhythm-engine/rhythmEngine.ts` (returns constraints; header notes stub-level depth).
- **Song Mode 32-bar:** C1–C7 overlays (`songModeRhythmOverlayC1`, funk overlay, ostinato C4/C5, expression C6, space C7) per architecture doc.
- **D1:** `rhythmIntentResolve.ts` / `rhythmIntentTypes.ts`.

### d) Form system

- Default **8-bar** duo; optional **32-bar** long-form with modulation planning (`longFormRouteResolver.ts`, `buildLongFormFromDuoSections.ts`).
- Song Mode: compiled sections (`runSongMode`, `songModeBuilder.ts`).
- UI: `HomeGenerate.tsx` + `buildGenerateRequestBody.ts` map to API.

### e) Melody / line system

Motif + phrase engines (`motifGenerator`, `songModePhraseEngineV1.ts`, Wyble / duo pipelines), duo LOCK gates (`duoLockQuality.ts`, `duoMelodyIdentityV3.ts`, `phraseAuthorityValidation.ts`), style conformance validators.

### f) Validation gates (representative list)

| Validator / gate | File | Role |
|------------------|------|------|
| `runScoreIntegrityGate` | `score-integrity/scoreIntegrityGate.ts` | Bar math, register, chords, rehearsal marks |
| `validateBarMath`, `validateRegister`, `validateChordSymbols`, `validateRehearsalMarks` | `barMathValidation.ts`, `registerValidation.ts`, `chordSymbolValidation.ts`, `rehearsalMarkValidation.ts` | Structural checks |
| `validateStrictBarMath` | `strictBarMath.ts` | Strict bar filling |
| `validateNotationSafeRhythm` | `notationSafeRhythm.ts` | Notation-safe rhythm |
| `validateScoreDuoAttackGrid` | `duoEighthBeatGrid.ts` | Duo grid |
| Pipeline truth | `pipelineTruthGates.ts` | Locked harmony truth |
| `runBehaviourGates` | `behaviourGates.ts` | Rhythm, guitar/bass behaviour, section contrast, motif, style modules, ECM anti-loop, duo LOCK suite, interaction, jazz duo behaviour |
| `validateInteractionIntegrity`, `validateRegisterSeparation` | `interaction/interactionValidation.ts` | Spacing / separation |
| `validateScoreModel` | `score-model/scoreModelValidation.ts` | Score model |
| Song / prosody | `song-mode/songModeValidation.ts`, `prosodyValidation.ts` | Song compile / prosody |
| Export / XML | `export/musicxmlValidation.ts`, `validateMusicXmlBarMath.ts`, `validateMusicXmlWrittenStrict.ts`, `exportHardening.ts`, `validateLockedHarmonyMusicXml.ts`, `validateBassIdentityInMusicXml.ts` | Export integrity |

### g) Export pipeline files (`engines/composer-os-v2/core/export/`)

`musicxmlExporter.ts`, `musicXmlNoteFragment.ts`, `musicXmlTickEncoding.ts`, `chordSymbolMusicXml.ts`, `exportTypes.ts`, `exportMeasureStructureAssert.ts`, `exportHardening.ts`, `ensembleExport.ts`, `polyphonyDiagnosticExport.ts`, `validateLockedHarmonyMusicXml.ts`, `validateMusicXmlBarMath.ts`, `validateMusicXmlWrittenStrict.ts`, `validateBassIdentityInMusicXml.ts`, `musicxmlValidation.ts`, `sibeliusSafeProfile.ts`.

Shared: `engines/core/chordSymbolMusicXml.ts`, `chordSemantics.ts`, `canonicalChord.ts`, `chordExportDiagnostics.ts`, etc.

---

## SECTION 3: MUSICAL QUALITY ASSESSMENT DATA

### a) Readiness scoring

- **Release score:** `computeReleaseReadiness` (`readinessScorer.ts`) — stub: driven largely by `validationPassed` / `exportValid`; categories must pass **`RRG_THRESHOLD` = 0.85** (`readinessTypes.ts`). Phrase warnings apply penalty in `releaseReadinessGate.ts`.
- **MX readiness:** `computeMxReadiness` (`mxReadinessScorer.ts`) — stub; threshold **`MX_READINESS_THRESHOLD` = 0.85`.
- **Shareable:** `runReleaseReadinessGate`: requires `release` and `mx` passed, overall ≥ 0.85 each, and `exportRoundTrip !== false`.

### b) Markers (TODO / FIXME / HACK / stub / not yet / placeholder / future / improve)

`grep` over `engines/composer-os-v2/**/*.ts` found **no** `TODO`, `FIXME`, or `HACK` matches. Representative hits for other patterns:

| Location | Note |
|----------|------|
| `readinessScorer.ts:17` | Stub: score release readiness |
| `mxReadinessScorer.ts:40`, `:57` | Stub MX readiness; placeholder when unknown |
| `rhythmEngine.ts:11` | Stub: typed constraints |
| `musicxmlValidation.ts`, `sibeliusSafeProfile.ts` | Stub checks |
| `musicxmlExporter.ts:400` | Legacy stub delegate |
| `conductor.ts` | Stub pipeline |
| `modulationPlanner.ts:13` | Compatibility stub |
| `songModeOstinatoC5.ts:41` | not yet read from CompositionContext |
| `tests/songModeMusicXml.test.ts:53,60` | "Not yet" log strings |
| Song-mode / lead-sheet | `placeholder` in prosody/lyric slot types |
| `guitarVoice2WybleLayer.ts` | "future bar" / phrase planning comments |

### c) Permanently enforced constraints

Score integrity + behaviour gates + export checks + readiness thresholds before **shareable**; instrument profile assumptions (clean electric guitar, upright bass); undotted / Sibelius-safe export rules per docs.

### d) Seeding / determinism

`seed` + optional `variationId` → `variationIdToSeed`; `creativeControlLevel` mutates seed unless `stable` (`creativeControlResolver.ts`).

---

## SECTION 4: STYLE AND GRAMMAR DETAIL

*(Composer OS modules — see `core/style-modules/*/README.md`.)*

- **Barry Harris:** Guide tones, stepwise motion, diminished passing; `validateBarryHarrisConformance`.
- **Metheny:** Lyrical / intervallic, lower density; `validateMethenyConformance` (skipped for `ecm_chamber` when Metheny in stack per `behaviourGates.ts`).
- **Triad pairs:** Bergonzi/Klemons cells; `validateTriadPairConformance`.
- **Bacharach:** Melody-first bias, chromatic steps, anchor bars; `validateBacharachConformance`.

---

## SECTION 5: CURRENT ROADMAP STATE

### a) Root `CHANGELOG.md` (full content)

```markdown
## [Phase 18.2B.5] — 2026-04-05

### Guitar Polyphony — Wyble-style Voice 2 (Composer OS V9.x)

**Fixed:** Intermittent validation failure — `guitar sustained wall-to-wall activity exceeds two bars`

**Root cause confirmed from MusicXML analysis:**
Consecutive full-bar sustained Voice 2 notes in adjacent bars caused
the Duo Interaction V3.1 validator to fail. Planning-layer shape
labels had no effect on realized output. Tick-level barline clamping
was insufficient because notes were not tied across barlines —
each bar contained its own independent whole note.

**Fix implemented in `guitarVoice2WybleLayer.ts`:**
- Added `breakConsecutiveV2Sustains()`: detects adjacent full-bar
  sustained V2 notes (duration >= 1680 ticks) and converts the
  second in any consecutive pair to a half note + rest
- Pitch is preserved exactly — no new pitch content generated
- Prevents voice-leading jump regression
- Clamp step also added for tied-note bleed edge cases
- Both passes run post-injection, pre-validation
- All existing logic (run-length, breathing, coverage, guide-tone)
  remains intact

**Validation results on passing runs:**
- Coverage: 0.44–0.53
- Longest active run: 3
- Release score: 0.9
- MX readiness: 1
- Status: Shareable ✓

**What was NOT changed:**
- Export / MusicXML pipeline
- Bar math core
- Validation systems
- Voice2LineGenerator.ts / Voice2PhrasePlanner.ts

---

### V9.0 – Phase 18.2B.2 (Voice 2 Rhythm Footprint)

- Replaced event-level Voice 2 rhythm behaviour with bar-level planning
- Introduced explicit bar shapes:
  - sustained bar
  - two slabs
  - offbeat hold
- Added coverage targeting (~35–50%) and enforced gap limits (≤ 3 bars)
- Implemented fallback chain for safe rhythm injection
- Removed fragment-heavy conversational rhythm passes for Voice 2

Outcome:
Voice 2 now has clear time presence and sustained visibility across the form.

---

### V9.0 – Phase 18.2B.1 (Voice 2 Diagnostics)

- Added Voice 2 diagnostic system for Guitar/Bass Duo mode
- Metrics include:
  - bar coverage
  - note density
  - rest gaps
  - activity runs
  - strong-beat vs offbeat entries
- Diagnostics available in:
  - console logs
  - Generation Receipt (UI surfacing)
- No changes to:
  - generation behaviour
  - bar math
  - export pipeline

Purpose:
Enable measurable evaluation of second-voice behaviour before applying rhythm and pitch improvements.

---

## V9.x - Phase 18.2B COMPLETE

### Added

- Span-based Voice-2 continuity system
- Directional motion model (asc/desc/hold)
- Improved overlap and sustain logic

### Improved

- Polyphonic realism in guitar voice-leading
- Reduced fragmented Voice-2 behaviour

### Known Issue

- Validator still rejects musically valid output
- Identity + leap rules too strict for new model

### Next

- Phase 18.2C - Validator Alignment

---

## V9.x - Phase 18.2B Polyphony Behaviour Progress

### Added

- Voice-2 continuity layer
- multi-bar Voice-2 persistence
- internal motion within sustained spans

### Improved

- perceptual clarity of dual-voice guitar polyphony
- overlap between melody and inner voice
- phrase-to-phrase Voice-2 presence

### Fixed

- earlier fragmentation / over-sparsity of Voice 2
- static single-event inner voice behaviour

### Notes

- export remains locked and unchanged
- next work is phrase intention / directional refinement

---

## V9.x – Phase 18.2B Polyphony Stabilization

### Added

- Dual-voice guitar polyphony (Voice 1 + Voice 2)
- Voice-2 continuity across phrases
- Internal motion within sustained inner-voice spans

### Fixed

- Sibelius MusicXML import error (element scope issue)
- note ordering and serialization consistency

### Improved

- Guide-tone targeting (3rd/7th priority)
- Overlap behaviour between voices
- Phrase-level sustain instead of fragmented Voice 2

### Notes

- Voice 2 is now structurally stable and musically present
- Further work will focus on phrase intention and directional shaping

---

## [V9.x] - Phase 18.2 milestone (Guitar Polyphony)

### Summary
- Guitar Voice 2 continuity model added (phrase-level behaviour).
- ENTER / CONTINUE / RESOLVE state behaviour introduced for the inner voice.
- Sustained overlap improved; dual-voice perceptual clarity improved.
- Export layer unchanged and locked.
- Remaining work is musical refinement (target-driven phrase continuity / direction), not export stability.

---

## [V9.x] - Phase 18.2B.3 Voice-2 Continuity Layer

### Added
- Phrase-level continuity model for Guitar Voice 2 (ENTER → CONTINUE → RESOLVE)
- Multi-bar persistence logic (2–4 bar continuity windows)
- State-based Voice-2 behaviour (no longer purely local decisions)

### Improved
- Sustained overlap between voices
- Perceptual clarity of inner contrapuntal line
- Reduction of isolated Voice-2 events

### Fixed
- Voice-2 fragmentation across bars
- Over-localised decision making in polyphony layer

### Notes
- Export layer remains unchanged and locked
- No MusicXML or serialization modifications in this phase
```

### b) `docs/CHANGELOG.md` (full content)

```markdown
# Composer OS — Changelog

**Update:** Phase 18.2B.2 (Voice 2 bar-level rhythm footprint for Guitar/Bass Duo) and Phase 18.2B.1 (Voice 2 diagnostics — engine + receipt UI) are documented in the repo root [CHANGELOG.md](../CHANGELOG.md).

## V9.x - Phase 18.2B Polyphony Behaviour Progress

Checkpoint: continuity + internal motion documented in repo [CHANGELOG.md](../CHANGELOG.md); phrase-level refinement still open.

### Added

- Voice-2 continuity layer; multi-bar Voice-2 persistence; internal motion within sustained spans

### Improved / fixed

- dual-voice clarity, melody/inner overlap, phrase-to-phrase presence; reduced fragmentation and static inner-voice behaviour

### Notes

- Export layer unchanged; next focus is phrase intention and directional shaping

---

## V9.0 milestone

### V9.0 Summary

- Core pipeline stable  
- Harmony and parsing stable  
- MusicXML export stable (Sibelius-safe)  
- System ready for robustness expansion  

### Chord System (V9.0)

- **Chord normalization layer implemented** — Stacked extensions written with a slash (e.g. `6/9`) are normalized before parsing so they are not mistaken for slash-bass notation; true slash-bass chords (bass letter after `/`) are preserved.
- **Parser and validator unified** — One shared chord-shape contract across progression parsing, chord-input helpers, and harmony parsing used downstream.
- **Supported chord examples (illustrative):**
  - `C6/9` (normalized to `C69`)
  - `Cmaj9`, `Cmaj7(#11)`
  - `G13`, `G13sus`
  - `A7alt`
  - Slash chords (e.g. `Cmaj7/E`)
- **System guarantee:** All standard jazz chord symbols are accepted without failure (non-parsable input uses a safe fallback with a diagnostic warning rather than failing the run).

### MusicXML Export (Stability)

- **Sibelius-safe rhythm encoding** — Export avoids fragile duration encodings that break or mis-read in Sibelius and similar hosts.
- **No dotted-beat duration tokens** — Raw fractional beat multipliers such as `1.5` or `0.75` are not relied on; an **undotted decomposition** system expresses durations so bar math stays importer-friendly.
- **Clean multi-voice export maintained** — Multi-voice guitar/bass (and related) layouts remain coherent through export.

### Roadmap / status

| Item | Status |
|------|--------|
| **#19 Unified Chord Semantics** | **DONE** |
| **#16 Chord Handling Robustness** | **DONE** — MusicXML export stabilised; GP8 is primary detailed chord-validation target; Sibelius accepted as simplification-prone fallback. |
| **#17 Diagnostics / Receipt Clarity** | **DONE** — Generation receipt now surfaces chord export diagnostics including parsed chord count, fallback count, Sibelius simplification flags, and slash-bass preservation. See [generation-receipts-and-diagnostics.md](./generation-receipts-and-diagnostics.md). |

---

## Unified Chord Semantics — Full Bar Chord Export Achieved

- Unified chord pipeline across parser, validator/repair, and MusicXML export
- Full per-bar chord coverage restored (one chord symbol per measure)
- Exact bar-to-chord mapping preserved from user input
- Slash chords preserved in display text and export
- Extensions and altered chord text preserved
- Removed collapsed/fallback harmony behaviour in Wyble export path

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

```

### c) `engines/composer-os-v2/README.md` (full content)

````markdown
# V2.0 - Composer OS

**Composer OS** is a unified generative composition system — not a collection of isolated engines. It provides a single, disciplined pipeline through which all musical output flows, with validation gates and readiness scoring before any export is marked shareable.

**V9.0 (milestone):** Unified chord semantics (**#19** — done), stable Sibelius-safe MusicXML export (including undotted rhythm decomposition; no dotted-beat duration tokens such as `1.5` / `0.75`), and documented next focus **#16 Chord Handling Robustness**. See **[CHANGELOG — V9.0 milestone](../../docs/CHANGELOG.md)** and the **Composer OS** section in the [repo README](../../README.md).

**Docs:** [Architecture](../../docs/COMPOSER_OS_ARCHITECTURE.md) | [Changelog](../../docs/CHANGELOG.md) | [User guide](../../docs/USER_GUIDE.md) | [Testing](../../docs/TESTING.md) | [DEV_NOTES (archived)](../../docs/archive/composer-os/DEV_NOTES.md)  
**Style modules:** [Barry Harris](core/style-modules/barry-harris/README.md) | [Metheny](core/style-modules/metheny/README.md) | [Triad Pairs](core/style-modules/triad-pairs/README.md) | [Bacharach](core/style-modules/bacharach/README.md)  
**Songwriter → harmony:** Primary `songwriterStyleId` on `generationMetadata`; **Wayne Shorter** enables `ChordTonesOptions.shorterMode` in `harmonyChordTonePolicy.ts` / `chordSymbolAnalysis.ts` (see architecture doc).

---

## Implemented Stages

- **Foundation** — Conductor, rhythm engine, primitives, score integrity, MusicXML export
- **Golden Path** — 8-bar guitar-bass duo end-to-end (LOCK: motif-first `duoLock`, `duoLockQuality` GCE ≥ 8.5 + rhythm anti-loop, interaction `bassForward` in B); **V4 Prompt 1/8** adds optional **32-bar** duo (`totalBars === 32`, `longFormRouteResolver` → `duo32`) with modulation **planning**, long-form motif/interaction/quality layers — **8-bar remains default and reference**
- **V3.4** — **Key signature inference** (`core/harmony/keyInference.ts`): MusicXML `<key>` from chord roots; **auto / override / none** via API; ambiguous harmony suppresses misleading signatures; chord generation unchanged
- **Stage 2** — Musical core (section roles, density, register maps, instrument behaviours)
- **Stage 3** — Motif tracker, Barry Harris module
- **Stage 4** — Style system: Metheny, Triad Pairs, weighted style stack
- **Stage 5** — Interaction layer: guitar-bass coupling, register separation
- **Stage 6** — Output & Control: export hardening, locks, performance pass

**Demo stack:** primary barry-harris, secondary metheny, colour triad-pairs. **Interaction:** A support, B call_response.

**Prompt 2/7 (V3 track):** Declarative **conductor alignment** metadata (`core/conductor-alignment/`), **module invocation** capabilities + `song_mode_scaffold` registry entry, and **Song Mode** scaffold (section kinds + metadata; no new musical runtime). ECM behaviour unchanged. See [CHANGELOG](../../docs/CHANGELOG.md) / [historical](../../docs/archive/composer-os/CHANGELOG_HISTORICAL.md).

**Prompt 3/7 (V3 track):** **Song Mode** structural pipeline — `runSongMode` → compiled song + lead-sheet contract + validation; registry id `song_mode_compile`. No golden-path or ECM changes; no full lead-sheet MusicXML export yet. See [SONG_MODE_INTEGRATION_NOTES](../../docs/archive/composer-os/SONG_MODE_INTEGRATION_NOTES.md).

**Prompt 6.5/7 (V3 track):** **Songwriting research → rules** — bundled `core/song-mode/data/Songwriting.md` (override with **`COMPOSER_OS_SONGWRITING_RESEARCH`**), `songwritingResearchParser.ts`, `songwriterRuleRegistry.ts`, `songwriterStyleProfiles` + `songwriterStyleResolver.ts`, `authorOverlayResolver.ts`, `hookPlanner.ts`, `chorusPlanner.ts`, `melodyBehaviourPlanner.ts`, `applySongwritingRules.ts`. `runSongMode` accepts optional **primary/secondary songwriter style**, **author** overlay (Webb / Pattison / Perricone), **classical** overlay (Schubert / Schumann / Fauré); default primary style **`beatles`**. Output adds `songwriting` on `CompiledSong` and optional `songwritingHints` on `LeadSheetContract`.

**Prompt B/3 (V3 track):** **Song Mode — lead melody + singer range + prosody** — `leadMelodyPlanner` / contour + phrase planners emit a **sparse top-line plan** (anchor notes per bar, cadences, hook return, chorus lift within singer limits). **`singerRangeProfiles`** + **`validateMelodyAgainstSingerRange`**; **`prosodyPlanner`** + **`lyricPlaceholderPlanner`** for syllable slots and stress placeholders (author-aware when overlay matches Pattison / Webb / Perricone). **No final lyrics** — structure slots only. **`LeadSheetContract`** carries melody events, **prosodySlots**, **voiceMetadata**.

**Prompt 4/7 (V3 track):** **Shared orchestration layer** — `core/orchestration/` (types, planners, ensemble family profiles, validation, duo/chamber plan builders, ECM + Song Mode compatibility mappers). Declarative metadata in `orchestrationLayerMetadata.ts` and handoff map; no runtime rerouting.

**Prompt C/3 (V3 track):** **Ensemble realisation** — `core/voicing/` (spread/cluster vs density); **`runBigBandRealisation`** / **`runQuartetRealisation`** produce **ScoreModel** + MusicXML via **`runEnsembleExportPipeline`** (same exporter and bar-math gates as duo). Registry: **`big_band_realise`**, **`string_quartet_realise`**. Behavioural scoring only — not full professional arranging or contrapuntal engines.

**Prompt 5/7 (V3 track):** **Big Band planning module** — `core/big-band/` (`runBigBandMode`, form/section/density planners, `buildBigBandOrchestrationPlan` on shared orchestration), preset `big_band` with planning metadata, registry `big_band_plan`. **Prompt C/3** adds **`runBigBandRealisation`** + `big_band_realise`. See [BIG_BAND_INTEGRATION_NOTES](../../docs/archive/composer-os/BIG_BAND_INTEGRATION_NOTES.md).

**Prompt 5.6/7 (V3 track):** **Big Band research → rules** — bundled `core/big-band/data/BigBandResearch.md` (override with `COMPOSER_OS_BIG_BAND_RESEARCH` or folder **`COMPOSER_OS_RESEARCH_DIR`** + `BigBandResearch.md`), `bigBandResearchParser.ts`, `bigBandRuleRegistry.ts`, `bigBandEraResolver.ts`, `bebopLinePlanner.ts` (line behaviour metadata), `applyBigBandRules.ts`, `bigBandResearchDrivenValidation.ts`. Preset defaults: **era** `post_bop`, optional **composer** style (`ellington` | `basie` | `thad` | `schneider`). `runBigBandMode` flow: form → sections → density → parse research → resolve era/composer → apply rules → orchestration → validation. Still **no full score**; planning JSON includes `enhancedPlanning` + `bebopLineMetadata` when relevant.

**Prompt 1/2 (V3 track intelligence):** **`core/style-pairing/`** — optional **songwriter ↔ arranger** pairing (`songwriterStyle`, `arrangerStyle`, optional `era`): **confidence** + **experimental** flag; **never blocks**. **`runSongMode`** / **`buildCompiledSong`** attach **`stylePairingResolution`** on `compiledSong.songwriting`; **`runBigBandMode`** can take the same pairing input and returns **`stylePairingResolution`** + non-fatal validation warnings. Big Band rules in the registry include **`priority`** (1–100).

**Prompt 2/2 (V3 track control / UX):** **`core/variation/`** — **`variationId` → seed** for user-facing labels; **`core/creative-controls/`** — **stable** / **balanced** / **surprise** (seed-only mutations; form unchanged). **`GenerateRequest`** optional **`variationId`** + **`creativeControlLevel`**; **`runBigBandMode`** optional **`ensembleConfigId`** (`full_band` … `custom`) + ensemble apply + orchestration **part weights**; sessions **v4** + named preset optional defaults. **Stable default:** omitting new fields matches previous runs.

**Prompt 6/7 (V3 track):** **String Quartet planning module** — `core/string-quartet/` (`runStringQuartetMode`, form/texture/density planners, `buildQuartetOrchestrationPlan` on shared orchestration), preset `string_quartet`, registry `string_quartet_plan`. **Prompt C/3** adds **`runQuartetRealisation`** + `string_quartet_realise`. See [STRING_QUARTET_INTEGRATION_NOTES](../../docs/archive/composer-os/STRING_QUARTET_INTEGRATION_NOTES.md).

**Prompt 7/7 (V3 track — V1 product baseline):** **Web app + app/API boundary** — UI talks to `app-api/composerOsApiCore.ts` only; `composerOsAppGeneration.ts` maps presets to `generateComposition`, `runSongMode`, or planning-only JSON for big band / string quartet. **V1 capabilities** (see `releaseMetadata.ts` and `/api/diagnostics`): Guitar–Bass Duo and ECM Chamber = MusicXML generation; Song Mode = structural JSON + lead-sheet contract (no MusicXML lead sheet in this build); Big Band and String Quartet = planning JSON only. **Desktop:** `apps/composer-os-desktop` (Electron). See [CHANGELOG](../../docs/CHANGELOG.md) and [apps/composer-os-app README](../../apps/composer-os-app/README.md).

**Easy wins + workflow power pack (usability):** **`core/presets-plus/`** — named aliases (incl. `songwriter_modern`, `chamber_development`, plus earlier eight) over existing base presets + optional `densityBias` hints + merge helpers. **`core/sessions/`** — JSON session save/load (`sessionStore.ts`), format **v1/v2/v3** with optional project memory (candidates, continuation ref) + **reference/import** metadata when used. **`core/candidates/`** — lightweight multi-seed `generateComposition` candidates + rank (best / second). **`core/diagnostics/`** — `buildDiagnosticsBundle` for short UI messages. **`core/lead-sheet/`** — `UniversalLeadSheet` + builders; `generateComposition` adds optional `universalLeadSheet`; `runSongMode` returns `universalLeadSheet`; **`runBigBandMode`** / **`runStringQuartetMode`** attach planning-level universal lead sheets (`N.C.` placeholders per section). **`core/chord-input/`** — forgiving text → `ChordSymbolPlan` scaffold. **`core/motif-plus/`** — extract / library / reuse suggestions. **`core/continuation/`** — validated continuation metadata. **`core/regeneration/`** — section regen gates + lock awareness. **`core/style-stack-presets/`** — reusable stacks (separate from named mode presets). **`core/performance-plus/`** — density bias + humanisation **metadata only** (no pitch edits).

**Reference / import intelligence (V3 Prompt A/3):** **`core/reference-import/`** — shared **`ReferencePiece`** contract; light **MusicXML** + **MIDI** + **lead-sheet text** parsers; **`referencePieceFromCompositionContext`** for internal outputs; **`extractReferenceBehaviour`** → **`ReferenceBehaviourProfile`**; **`applyReferenceInfluence`** produces **behavioural guidance only** (no note cloning). Optional fields on **sessions** and **run manifests** for reference source + influence summary.

---

## What Composer OS Is

Composer OS is the core architecture for generative composition in the creative-engines project. It coordinates:

- **Form** → **Feel** (Rhythm Engine) → **Harmony** → **Instrument behaviour** → **Counterpoint / texture** → **Score integrity** → **MusicXML export** → **MX validation** → **Readiness scoring** → **Release gate**

Every composition passes through this pipeline. Style modules and future musical modules plug in as **modifiers** to the shared `CompositionContext`, not as independent generators.

---

## Architectural Principles

### Modular Monolith

Composer OS is implemented as a **modular monolith**. Hard separation of concerns:

| Component | Responsibility |
|-----------|----------------|
| **Conductor** | Pipeline coordinator only |
| **Rhythm Engine** | Feel, syncopation, subdivision logic — returns constraints, not notes |
| **Primitives** | Shared data model only (motif, phrase, harmony, register, density) |
| **Style Modules** | Modifiers only — no independent generation pipelines |
| **Instrument Profiles** | Register, texture, MIDI identity, behaviour constraints |
| **Score Integrity** | Pre-export structural checks (release-blocking) |
| **Export** | MusicXML output only |
| **Readiness** | Scoring + release gating |
| **Run Ledger** | Manifest for replay/debug |

**No duplicated mini-pipelines.** One pipeline, many modifiers.

### Why Modules Are Modifiers, Not Engines

Style modules (e.g. future Metheny, Bacharach, Barry Harris, Triad Pairs) do **not** run their own pipelines. They receive a `CompositionContext` and return a modified context. The Conductor owns the pipeline; modules influence it. This prevents architectural drift and ensures validation and integrity gates always run.

### Why Score Integrity and Validation Come First

Nothing is exported or marked shareable until:

1. **Score Integrity Gate** passes (bar math, register, chord symbols, rehearsal marks)
2. **MusicXML validation** passes
3. **Readiness thresholds** pass (Release Readiness Gate + MX Readiness Score)

Validation gates are **release-blocking**. Musical expansion happens only within a valid, gated pipeline.

---

## Pipeline Overview

```
form
  → feel (Rhythm Engine)
  → harmony
  → instrument behaviour
  → counterpoint / texture
  → score integrity
  → MusicXML export
  → MX validation
  → readiness scoring
  → release gate
```

The **golden path** implements: preset → feel → section roles → density curve → register map → motif → style modules → interaction planning → instrument behaviours → score construction → **performance pass** → export → integrity gate → behaviour gates → MusicXML export → MX validation → run manifest.

### Stage 2 — Musical Core

Adds section roles (statement, development, contrast, return), section-aware register maps, density curves, guitar/bass behaviour planners, and deepened rhythm engine (offbeat tendency, sustain tendency, attack density). New behaviour validation gates: rhythm identity, guitar texture integrity, bass harmonic integrity, section contrast.

### Stage 3 — First Intelligence

Adds motif tracker (generate, vary, place across A/B) and first style module (Barry Harris). Motif-driven melody; bass echoes motif fragments. Barry Harris: movement over static chords, guide-tone emphasis, stepwise voice-leading. Validation: motif integrity, style conformance.

### Stage 4 — Style System

Adds Metheny (lyrical, intervallic, longer arcs, reduced density) and Triad Pairs (Bergonzi/Klemons guitar-aware triad cells). Style stack: primary, secondary, colour with normalized weights. Validation: style blend integrity, triad pair integrity, Metheny conformance.

---

## CompositionContext

Every core system and future style module uses the shared **CompositionContext** type. It includes:

- `systemVersion`, `presetId`, `seed`
- `form`, `feel`, `harmony`, `motif`, `phrase`, `register`, `density`
- `instrumentProfiles`, `chordSymbolPlan`, `rehearsalMarkPlan`
- `generationMetadata`, `validation`, `readiness`

This is the **non-negotiable shared contract**. No module may bypass it.

---

## Instrument Profiles

Default assumptions:

- **Guitar** = Clean Electric Guitar (never acoustic guitar)
- **Bass** = Acoustic / Upright Bass (never vocal bass)

Profiles define hard ranges, preferred zones, danger zones, texture requirements (guitar), and harmonic anchor requirements (bass). Validation fails if tessitura drifts outside acceptable zones or required behaviour is missing.

---

## Presets

First-pass presets:

1. **guitarBassDuoPreset** — Clean Electric Guitar + Acoustic/Upright Bass, chord symbols and rehearsal marks enabled
2. **ecmChamberPreset** — ECM-style chamber configuration
3. **bigBandPreset** — Big band placeholder (minimal instrument set)

---

## Golden Path Demo

The **first golden path** proves that Composer OS can generate one correct score end-to-end through the full pipeline.

### What It Does

- Generates an 8-bar guitar-bass duo score (Clean Electric Guitar + Acoustic/Upright Bass)
- Sections A (bars 1–4) and B (bars 5–8) with rehearsal marks at bars 1 and 5
- Chord symbols: Dmin9, G13, Cmaj9, A7alt (2 bars each)
- Sparse guitar melody/dyads in mid register; walking-style bass in upright bass register
- Passes Score Integrity Gate, MusicXML validation, and Sibelius-safe checks
- Produces a valid MusicXML file and run manifest

### Why It Is Intentionally Simple

This is a **correctness-first pass**, not a high-art composition pass. The goal is to prove the system can:

1. Build a real score from the score model
2. Validate it through the integrity gate
3. Export to MusicXML
4. Pass MX validation and readiness thresholds

### What It Proves

- The score model is the single source of truth for export
- No direct-to-MusicXML hacks; everything flows through the core pipeline
- Instrument identities, register discipline, and measure math are enforced
- Chord symbols and rehearsal marks are structurally complete

### What Remains to Be Built Next

- Additional style modules (Bacharach, etc.)
- Deeper music generation (phrase, counterpoint from context)
- Launcher integration
- Full big band instrumentation

### Running the Golden Path Demo

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/runGoldenPathDemo.ts
```

Output is written to `outputs/composer-os-v2/golden_path_demo.musicxml`.

---

## What Is Intentionally Not Built Yet

- UI/launcher integration
- Full big band instrumentation
- Orchestration modules

The golden path proves the core system works; future modules plug in cleanly without architectural drift.

---

## Running Tests

```bash
npm run test --prefix engines/composer-os-v2
```

Retro self-test suite (stage regression + negative tests):

```bash
npm run test:retro --prefix engines/composer-os-v2
```

Or from the repo root:

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/tests/runAllTests.ts
```

**Rule:** No future stage is complete unless new tests are added, retro tests pass, and stage exit gates pass before commit/push.

---

## Directory Structure

```
engines/composer-os-v2/
  README.md
  package.json

  core/
    conductor/           # Pipeline coordinator
    rhythm-engine/       # Feel, syncopation, subdivision
    motif/               # Motif generator, tracker, validation
    section-roles/       # Section role planner and validation
    register-map/        # Section-aware register planning
    density/             # Density curve planner
    instrument-behaviours/ # Guitar/bass behaviour planners
    primitives/          # Shared data model
    instrument-profiles/ # Guitar, bass profiles
    style-modules/       # Registry; barry-harris, metheny, triad-pairs
    interaction/         # Interaction planner, validation
    control/             # Lock system
    performance/         # Performance pass (articulation, no pitch change)
    score-model/         # Score types, event builder, validation
    score-integrity/     # Pre-export gates, behaviour gates
    export/              # MusicXML exporter, validation, Sibelius-safe
    readiness/           # RRG + MX readiness scoring
    run-ledger/          # Run manifest for replay/debug
    goldenPath/          # Golden path generator and runner

  presets/               # guitarBassDuo, ecmChamber, bigBand
  tests/                 # Conductor, rhythm, instruments, integrity, readiness, export, scoreModel, goldenPath
```

````

### d) Phases (selected, status where stated in docs)

| Phase / item | Status in docs |
|--------------|----------------|
| V9.0 milestone | Core / harmony / export stable |
| #19 Unified chord semantics | Done |
| #16 Chord robustness | Done (docs/architecture); incremental UX possible |
| #17 Diagnostics | Done |
| Phase 18.2A | Complete (README / architecture) |
| Phase 18.2B.x | Complete (root CHANGELOG) |
| Phase 18.2C | Next — validator alignment |
| D1 rhythm intent | Complete (architecture) |
| D2 UI sliders | In progress |
| D3 | Upcoming / undefined |
| C1–C7 | Done (architecture) |

---

## SECTION 6: RAW FILE LIST

**Inventory:** `glob_file_search` reports **621** `.ts` files under `engines/` (excluding `node_modules` from search paths). **Non–Composer-OS** packages sum to **98** files (`engines/core` 14 + other engine folders 84). **`engines/composer-os-v2`:** **523** `.ts` files (358 under `core/`, 19 `app-api/`, 10 `scripts/`, 6 `presets/`, 130 `tests/`).

**Skipped (cannot read as UTF-8 text in tool):** `docs/songwriting_engine/User_Guide.docx` — **encoding issue — skipped** (binary `.docx`).

### 6.1 `engines/core/*.ts` (14 files)

- `engines/core/chordExportDiagnostics.ts` — Chord export diagnostics for receipts
- `engines/core/chordSemantics.ts` — Chord semantic helpers
- `engines/core/chordSymbolMusicXmlCore.ts` — MusicXML chord core
- `engines/core/chordSymbolMusicXml.ts` — MusicXML chord emission
- `engines/core/wybleHarmonyExport.ts` — Wyble harmony export bridge
- `engines/core/canonicalChord.ts` — Canonical chord model
- `engines/core/chordSymbolRegistry.ts` — Chord symbol registry
- `engines/core/leadSheetChordNormalize.ts` — Lead-sheet normalization
- `engines/core/scoreToMusicXML.ts` — Score → MusicXML utilities
- `engines/core/wybleBarMathFinalize.ts` — Wyble bar math finalize
- `engines/core/timing.ts` — Timing utilities
- `engines/core/wybleVoiceIndependencePass.ts` — Wyble voice independence
- `engines/core/paths.ts` — Path helpers
- `engines/core/measureBuilder.ts` — Measure building utilities

### 6.2 Other engine packages (84 `.ts` files total)

**`engines/arranger-assist-engine/` (5):** `arrangerAssistDesktopGenerate.ts`, `arrangerAssistGenerator.ts`, `arrangerAssistTemplates.ts`, `arrangerAssistTypes.ts`, `arrangerAssistValidation.ts`

**`engines/big-band-architecture-engine/` (11):** `architectureDesktopGenerate.ts`, `architectureGenerator.ts`, `architectureTemplates.ts`, `architectureTypes.ts`, `architectureValidation.ts`, `scoreDesktopGenerate.ts`, `export/musicXMLScoreBuilder.ts`, `export/scoreExportValidation.ts`, `export/scoreLayout.ts`, `export/scoreSkeletonExporter.ts`, `export/scoreTypes.ts`

**`engines/conductor-engine/` (5):** `conductorDesktopGenerate.ts`, `conductorGenerator.ts`, `conductorRealWorldTest.ts`, `conductorTypes.ts`, `conductorValidation.ts`

**`engines/contemporary-counterpoint-engine/` (9):** `counterpointAcceptanceGenerate.ts`, `counterpointCleanGenerate.ts`, `counterpointDesktopGenerate.ts`, `counterpointEngine.ts`, `counterpointGenerator.ts`, `counterpointMeasureGenerator.ts`, `counterpointMusicXML.ts`, `counterpointTypes.ts`, `counterpointAutoTest.ts`

**`engines/ellington-orchestration-engine/` (21):** `ellingtonAcceptanceGenerate.ts`, `ellingtonAutoTest.ts`, `ellingtonCleanGenerate.ts`, `ellingtonDesktopGenerate.ts`, `ellingtonEngine.ts`, `ellingtonGenerator.ts`, `ellingtonMeasureGenerator.ts`, `ellingtonMusicXMLExporter.ts`, `ellingtonProgressions.ts`, `ellingtonRangeValidation.ts`, `ellingtonRealWorldTest.ts`, `ellingtonScoreExporter.ts`, `ellingtonTypes.ts`, `ellingtonValidation.ts`, `ellingtonVoicings.ts`, `instrumentRanges.ts`, `runEllingtonExample.ts`, `templates/templateLibrary.ts`, `templates/templateTypes.ts`, `tests/ellingtonEngine.test.ts`, `ellingtonVerificationTest.ts`

**`engines/jimmy-wyble-engine/` (27):** `exportWybleExample.ts`, `generateWybleBatch.ts`, `import/musicxmlTypes.ts`, `import/musicxmlValidation.ts`, `import/parseMusicXMLToProgression.ts`, `import/testMusicXMLImport.ts`, `import/testMusicXMLToWybleIntegration.ts`, `import/testMusicXMLValidation.ts`, `jazzBehaviourGate.ts`, `runWybleEtudeExample.ts`, `runWybleExample.ts`, `templates/templateLibrary.ts`, `templates/templateTypes.ts`, `testTemplateIntegration.ts`, `wybleAcceptanceGenerate.ts`, `wybleAutoTest.ts`, `wybleCleanGenerate.ts`, `wybleDesktopGenerate.ts`, `wybleEngine.ts`, `wybleEtudeGenerator.ts`, `wybleGenerator.ts`, `wybleGuitarTest.ts`, `wybleImportedExport.ts`, `wybleMeasureGenerator.ts`, `wybleMusicXMLExporter.ts`, `wybleScoreEvaluator.ts`, `wybleTypes.ts`

**`engines/selective-big-band-generation-engine/` (6):** `selectiveGenerationDesktopGenerate.ts`, `selectiveGenerationGenerator.ts`, `selectiveGenerationTemplates.ts`, `selectiveGenerationTypes.ts`, `selectiveGenerationValidation.ts`, `selectiveMaterialMusicXML.ts`

### 6.3 `engines/composer-os-v2/` (523 `.ts` files)

**`app-api/` (19):** `apiErrorMessages.ts`, `appApiTypes.ts`, `buildDiagnostics.ts`, `composerOsApiCore.ts`, `composerOsAppGeneration.ts`, `composerOsConfig.ts`, `composerOsOutputPaths.ts`, `desktopTruthDump.ts`, `generateComposition.ts`, `getPresets.ts`, `getStyleModules.ts`, `listOutputs.ts`, `mapStyleStack.ts`, `openOutputFolder.ts`, `releaseMetadata.ts`, `riffGeneratorApp.ts`, `scoreTitleDefaults.ts`, `systemCheck.ts`, `writeOutputManifest.ts`

**`scripts/` (10):** `d1Selftest.ts`, `diagFailures.ts`, `diagSeeds.ts`, `diagSlash.ts`, `inspectBassBar1Trace.ts`, `polyphonyDiagnosticExportCli.ts`, `runGoldenPathDemo.ts`, `runRetroSelfTests.ts`, `sibeliusDiagnosticVariants.ts`, `traceDuoBarMusicXml.ts`

**`presets/` (6):** `bigBandPreset.ts`, `ecmChamberPreset.ts`, `guitarBassDuoPreset.ts`, `presetTypes.ts`, `songModePreset.ts`, `stringQuartetPreset.ts`

**`core/` root files (3):** `compositionContext.ts`, `rhythmIntentResolve.ts`, `rhythmIntentTypes.ts`

**`core/presets/` (1):** `guitarBassDuoPresetIds.ts`

**`core/goldenPath/` (39):** `activityScore.ts`, `bassLineFingerprints.ts`, `bassMelodicLines.ts`, `customLockedHarmonyRouting.ts`, `duoFormIdentity.ts`, `duoNarrativeMoments.ts`, `duoOrchestrationPass.ts`, `duoPitchVariationPass.ts`, `duoSingleLineGateAlign.ts`, `duoSingleLineMonophony.ts`, `duoSingleLinePhraseFirstPipeline.ts`, `duoSwingPhrasing.ts`, `ecmShapingPass.ts`, `expressiveDuoFeel.ts`, `generateGoldenPathDuoScore.ts`, `guitarBassDuoHarmony.ts`, `guitarPhraseAuthority.ts`, `guitarVoice2PolyphonyDiagnostics.ts`, `guitarVoice2WybleLayer.ts`, `identityCell.ts`, `jamesBrownFunkOverlay.ts`, `lateClosingSectionDuo.ts`, `phaseAGuitarPolyphonyProbe.ts`, `resolveWybleChordBars.ts`, `runGoldenPath.ts`, `songModeControlC5.ts`, `songModeExpressionC6.ts`, `songModeGuitarDensityFloor.ts`, `songModeHookIdentity.ts`, `songModeMelodicContinuity.ts`, `songModeOstinatoC4.ts`, `songModeOstinatoC5.ts`, `songModePhraseEngineV1.ts`, `songModeRhythmOverlayC1.ts`, `songModeSpaceC7.ts`, `Voice2LineGenerator.ts`, `Voice2PhrasePlanner.ts`, `wybleBypassGenerator.ts`, `wyblePairGenerator.ts`

**`core/score-integrity/` (22):** `barMathValidation.ts`, `bassBeatNotationGrouping.ts`, `bassIdentityValidation.ts`, `behaviourGates.ts`, `chordSymbolValidation.ts`, `duoBarMathFinalize.ts`, `duoEighthBeatGrid.ts`, `duoLockQuality.ts`, `duoMelodyIdentityV3.ts`, `duoMusicalQuality.ts`, `guitarVoiceMelody.ts`, `identityLock.ts`, `jazzDuoBehaviourValidation.ts`, `notationSafeRhythm.ts`, `phraseAuthorityValidation.ts`, `pipelineTruthGates.ts`, `protectedHookBarInvariant.ts`, `registerValidation.ts`, `rehearsalMarkValidation.ts`, `scoreIntegrityGate.ts`, `scoreIntegrityTypes.ts`, `strictBarMath.ts`

**`core/song-mode/` (35):** `applySongwritingRules.ts`, `authorOverlayResolver.ts`, `chorusPlanner.ts`, `hookPlanner.ts`, `leadMelodyPlanner.ts`, `leadMelodyTypes.ts`, `leadSheetContract.ts`, `lyricPlaceholderPlanner.ts`, `lyricProsodyTypes.ts`, `melodyBehaviourPlanner.ts`, `melodyContourPlanner.ts`, `melodyPhrasePlanner.ts`, `melodyValidation.ts`, `prosodyPlanner.ts`, `prosodyValidation.ts`, `runSongMode.ts`, `singerRangeProfiles.ts`, `singerRangeTypes.ts`, `singerRangeValidation.ts`, `songCompilationTypes.ts`, `songHookTypes.ts`, `songModeBuilder.ts`, `songModeDuoIdentityBehaviourRules.ts`, `songModePhraseBehaviourRules.ts`, `songModeStyleEngine.ts`, `songModeStyleProfile.ts`, `songModeTypes.ts`, `songModeValidation.ts`, `songSectionPlanner.ts`, `songStructureTypes.ts`, `songwriterRuleRegistry.ts`, `songwriterStyleProfiles.ts`, `songwriterStyleResolver.ts`, `songwritingResearchParser.ts`, `songwritingResearchTypes.ts`

**`core/harmony/` (11):** `chordPipeline.ts`, `chordProgressionParser.ts`, `chordSymbolAnalysis.ts`, `harmonyBarContract.ts`, `harmonyChordTonePolicy.ts`, `harmonyResolution.ts`, `keyInference.ts`, `keyInferenceTypes.ts`, `keyInferenceValidation.ts`, `lockedChordSemantics.ts`, `songFormBarCounts.ts`

**`core/export/` (15):** `chordSymbolMusicXml.ts`, `ensembleExport.ts`, `exportHardening.ts`, `exportMeasureStructureAssert.ts`, `exportTypes.ts`, `musicxmlExporter.ts`, `musicxmlValidation.ts`, `musicXmlNoteFragment.ts`, `musicXmlTickEncoding.ts`, `polyphonyDiagnosticExport.ts`, `sibeliusSafeProfile.ts`, `validateBassIdentityInMusicXml.ts`, `validateLockedHarmonyMusicXml.ts`, `validateMusicXmlBarMath.ts`, `validateMusicXmlWrittenStrict.ts`

**`core/motif/` (9):** `longFormMotifPlanner.ts`, `motifEngineTypes.ts`, `motifGenerator.ts`, `motifShape.ts`, `motifTracker.ts`, `motifTypes.ts`, `motifValidation.ts`, `songModeMotifEngine.ts`, `songModeMotifEngineV2.ts`

**`core/big-band/` (22):** `applyBigBandRules.ts`, `bebopLinePlanner.ts`, `bigBandDensityPlanner.ts`, `bigBandEnsembleApply.ts`, `bigBandEnsembleConfigTypes.ts`, `bigBandEraResolver.ts`, `bigBandFormPlanner.ts`, `bigBandPlanTypes.ts`, `bigBandResearchDrivenValidation.ts`, `bigBandResearchParser.ts`, `bigBandResearchTypes.ts`, `bigBandRoleMapping.ts`, `bigBandRuleRegistry.ts`, `bigBandScoreBuilder.ts`, `bigBandSectionPlanner.ts`, `bigBandSectionTypes.ts`, `bigBandTypes.ts`, `bigBandValidation.ts`, `bigBandVoicingPlanner.ts`, `buildBigBandOrchestrationPlan.ts`, `runBigBandMode.ts`, `runBigBandRealisation.ts`

**`core/ecm/` (4):** `buildEcmChamberContext.ts`, `ecmChamberScoring.ts`, `ecmChamberTypes.ts`, `ecmTextureEngine.ts`

**`core/orchestration/` (13):** `buildChamberOrchestrationPlan.ts`, `buildDuoOrchestrationPlan.ts`, `densityOwnershipPlanner.ts`, `ensembleFamilyProfiles.ts`, `ensembleFamilyTypes.ts`, `orchestrationCompatibility.ts`, `orchestrationPlanner.ts`, `orchestrationPlanTypes.ts`, `orchestrationRoleTypes.ts`, `orchestrationTypes.ts`, `orchestrationValidation.ts`, `registerOwnershipPlanner.ts`, `textureOwnershipPlanner.ts`

**`core/string-quartet/` (13):** `buildQuartetOrchestrationPlan.ts`, `quartetDensityPlanner.ts`, `quartetFormPlanner.ts`, `quartetPlanTypes.ts`, `quartetRoleMapping.ts`, `quartetRoleTypes.ts`, `quartetScoreBuilder.ts`, `quartetTexturePlanner.ts`, `quartetTypes.ts`, `quartetValidation.ts`, `quartetVoicingPlanner.ts`, `runQuartetRealisation.ts`, `runStringQuartetMode.ts`

**`core/voicing/` (5):** `ensembleHarmonyUtils.ts`, `voicingPlanner.ts`, `voicingProfiles.ts`, `voicingTypes.ts`, `voicingValidation.ts`

**`core/rhythm-engine/` (4):** `rhythmBehaviourValidation.ts`, `rhythmEngine.ts`, `rhythmTypes.ts`, `rhythmValidation.ts`

**`core/style-modules/` (15):** `styleModuleRegistry.ts`, `styleModuleTypes.ts`, `barry-harris/moduleApply.ts`, `barry-harris/moduleTypes.ts`, `barry-harris/moduleValidation.ts`, `bacharach/bacharachSignal.ts`, `bacharach/moduleApply.ts`, `bacharach/moduleTypes.ts`, `bacharach/moduleValidation.ts`, `metheny/moduleApply.ts`, `metheny/moduleTypes.ts`, `metheny/moduleValidation.ts`, `triad-pairs/moduleApply.ts`, `triad-pairs/moduleTypes.ts`, `triad-pairs/moduleValidation.ts`

**`core/interaction/` (4):** `duoLongFormInteractionMap.ts`, `interactionPlanner.ts`, `interactionTypes.ts`, `interactionValidation.ts`

**`core/score-model/` (3):** `scoreEventBuilder.ts`, `scoreModelTypes.ts`, `scoreModelValidation.ts`

**`core/form/` (4):** `buildLongFormFromDuoSections.ts`, `duoLongFormPlanner.ts`, `longFormRouteResolver.ts`, `longFormRouteTypes.ts`

**`core/modulation/` (5):** `modulationPlanner.ts`, `modulationPlanTypes.ts`, `modulationTransitions.ts`, `modulationTypes.ts`, `modulationValidation.ts`

**`core/readiness/` (4):** `mxReadinessScorer.ts`, `readinessScorer.ts`, `readinessTypes.ts`, `releaseReadinessGate.ts`

**`core/run-ledger/` (2):** `createRunManifest.ts`, `runLedgerTypes.ts`

**`core/section-roles/` (3):** `sectionRolePlanner.ts`, `sectionRoleTypes.ts`, `sectionRoleValidation.ts`

**`core/register-map/` (3):** `registerMapPlanner.ts`, `registerMapTypes.ts`, `registerMapValidation.ts`

**`core/density/` (3):** `densityCurvePlanner.ts`, `densityCurveTypes.ts`, `densityCurveValidation.ts`

**`core/instrument-behaviours/` (4):** `behaviourTypes.ts`, `behaviourValidation.ts`, `guitarBehaviour.ts`, `uprightBassBehaviour.ts`

**`core/primitives/` (7):** `densityTypes.ts`, `harmonyTypes.ts`, `index.ts`, `motifTypes.ts`, `phraseTypes.ts`, `primitiveTypes.ts`, `registerTypes.ts`

**`core/instrument-profiles/` (5):** `guitarBassDuoExportNames.ts`, `guitarProfile.ts`, `instrumentProfileTypes.ts`, `instrumentValidation.ts`, `uprightBassProfile.ts`

**`core/conductor/` (3):** `conductor.ts`, `conductorTypes.ts`, `conductorValidation.ts`

**`core/control/` (3):** `lockManager.ts`, `lockTypes.ts`, `lockValidation.ts`

**`core/performance/` (4):** `performancePass.ts`, `performanceRules.ts`, `performanceTypes.ts`, `performanceValidation.ts`

**`core/chord-input/` (4):** `chordInputAdapter.ts`, `chordInputParser.ts`, `chordInputTypes.ts`, `chordInputValidation.ts`

**`core/counterpoint/` (2):** `wybleCounterpointRules.ts`, `wybleParameterDefaults.ts`

**`core/quality/` (2):** `duoLongFormQuality.ts`, `goldenComposerEvaluation.ts`

**`core/reference-import/` (16):** `applyReferenceInfluence.ts`, `behaviourExtractionTypes.ts`, `extractReferenceBehaviour.ts`, `importSourceTypes.ts`, `internalReferenceAdapter.ts`, `leadSheetReferenceParser.ts`, `midiReferenceParser.ts`, `musicXmlReferenceParser.ts`, `referenceDensityExtractor.ts`, `referenceFormExtractor.ts`, `referenceImportTypes.ts`, `referenceImportValidation.ts`, `referenceMotifExtractor.ts`, `referencePieceTypes.ts`, `referenceRegisterExtractor.ts`, `referenceReuseTypes.ts`

**`core/candidates/` (4):** `candidateCompare.ts`, `candidateGenerator.ts`, `candidateRanker.ts`, `candidateTypes.ts`

**`core/sessions/` (3):** `sessionStore.ts`, `sessionTypes.ts`, `sessionValidation.ts`

**`core/diagnostics/` (2):** `diagnosticsBuilder.ts`, `diagnosticsTypes.ts`

**`core/continuation/` (3):** `continuationPlanner.ts`, `continuationTypes.ts`, `continuationValidation.ts`

**`core/regeneration/` (3):** `regenerationTypes.ts`, `regenerationValidation.ts`, `sectionRegenerator.ts`

**`core/variation/` (2):** `variationAdapter.ts`, `variationTypes.ts`

**`core/creative-controls/` (4):** `creativeControlResolver.ts`, `creativeControlTypes.ts`, `experimentalEvaluator.ts`, `mutationEngine.ts`

**`core/module-invocation/` (3):** `invokeModule.ts`, `moduleRegistry.ts`, `moduleTypes.ts`

**`core/presets-plus/` (3):** `namedPresetLibrary.ts`, `namedPresetTypes.ts`, `namedPresetValidation.ts`

**`core/performance-plus/` (3):** `densityControlAdapter.ts`, `densityControlTypes.ts`, `humanisationToggle.ts`

**`core/motif-plus/` (4):** `motifAssetTypes.ts`, `motifExtractor.ts`, `motifLibrary.ts`, `motifReusePlanner.ts`

**`core/lead-sheet/` (2):** `universalLeadSheetBuilder.ts`, `universalLeadSheetTypes.ts`

**`core/conductor-alignment/` (6):** `conductorCompatibility.ts`, `conductorRoleMap.ts`, `conductorRoleTypes.ts`, `handoffMap.ts`, `handoffTypes.ts`, `orchestrationLayerMetadata.ts`

**`core/style-pairing/` (3):** `stylePairingResolver.ts`, `stylePairingTypes.ts`, `stylePairingValidation.ts`

**`core/style-stack-presets/` (2):** `styleStackPresetLibrary.ts`, `styleStackPresetTypes.ts`

**`tests/` (130 files):** Regression and unit tests under `engines/composer-os-v2/tests/` (including `retro/`). **Individual filenames omitted here for length**; glob reports **130** `.ts` files.

### 6.4 Apps — TypeScript with generation API / contract (9 files)

- `apps/composer-os-app/src/pages/HomeGenerate.tsx` — Generate UI
- `apps/composer-os-app/src/services/api.ts` — HTTP / IPC client (`/generate`)
- `apps/composer-os-app/src/utils/buildGenerateRequestBody.ts` — UI → `GenerateRequest` JSON
- `apps/composer-os-app/tests/api.test.ts` — Imports `generateComposition`
- `apps/composer-os-app/tests/appShell.test.ts` — App shell routes
- `apps/composer-os-app/tests/generateRequestMap.test.ts` — Request field contract
- `apps/composer-os-app/tests/generateUiCopy.test.ts` — UI copy tests
- `apps/composer-os-desktop/electron/ipcEntry.ts` — IPC → Composer OS API
- `apps/composer-os-desktop/tests/desktopUnification.test.ts` — Desktop product tests

### 6.5 `docs/` (markdown and other)

Markdown / text (27 paths from glob): `CHANGELOG.md`, `COMPOSER_OS_ARCHITECTURE.md`, `EXPORT_PIPELINE_FIX.md`, `PIPELINE_INTEGRITY.md`, `TESTING.md`, `USER_GUIDE.md`, `WYBLE_ETUDE_MODE.md`, `Wyble_User_Guide.md`, `consolidation_report.md`, `engine_acceptance_specs.md`, `engine_consolidation.md`, `engine_master_palette.md`, `engine_rotation_examples.md`, `generation-receipts-and-diagnostics.md`, `musicxml-harmony-export.md`, `patches/swing-countermelody-integration.md`, `repo_roles.md`, `wyble-etude.md`, `archive/Composer_prompt_29_March_2029_ARCHIVED.md`, `archive/README.md`, `archive/composer-os/BIG_BAND_INTEGRATION_NOTES.md`, `archive/composer-os/CHANGELOG_HISTORICAL.md`, `archive/composer-os/DEV_NOTES.md`, `archive/composer-os/SONG_MODE_INTEGRATION_NOTES.md`, `archive/composer-os/STRING_QUARTET_INTEGRATION_NOTES.md`, `archive/composer-os/USER_GUIDE_LEGACY.md`, `songwriting_engine/User_Guide.md`

**Binary:** `docs/songwriting_engine/User_Guide.docx` — **encoding issue — skipped** (binary).
