## V70–V75 — Martino Linear Engine (Martino GCE arc)

### V70 — Phrase planner, DCR, direction, interval DNA
- Activity role system (A1=opening through A5=climactic)
- 4-bar phrase planner, DCR A/B/C variants
- Directional persistence arcs, interval DNA anti-loop
- 8-dimension Martino GCE subsystem

### V71 — Anti-bebop positive scoring, refinement pass, GCE gate
- _stepwise_reward blended into anti_bebop scorer
- Contour-tightening refinement pass in _apply_dcr_refinement
- gate_failed field on MartinoGceResult

### V72 — Gate retry, LFV jump guard, anti-bebop debug
- Real gate retry loop (max 3 attempts, best-result fallback)
- LFV positional jump: length guard + cross-bar boundary only
- Named penalty buckets + _last_anti_bebop_debug

### V73 — ii–V conditional penalty, LFV bridge threshold
- 0.35 ii–V penalty gated on enclosure + non-stepwise only
- LFV bridge fires only if jump > 14 semitones
- 4 new tests

### V74 — Gate threshold, penalty breakdown
- anti_bebop gate threshold: 0.75 → 0.15
- Named penalty components surfaced in provenance
- gce_gate_attempts = 0 on clean run

### V75 — Whole-step cap, ii–V cap, reward rebalance
- Whole-step spam: >60% fraction only, hard cap 0.15
- ii–V penalty: hard cap 0.20
- Stepwise reward weight: 0.30 → 0.45
- Live result: anti_bebop 0.567, overall 0.820, gate clean

## [2026-04-28] Radiohead (OK Computer / Kid A era) full-slice songwriter profile

- **Chord pools:** `SONGWRITER_CHORD_POOLS.radiohead` in `songModeBuilder.ts` (triads, maj7/m7, modal borrow colours, `Dbmaj7` / `Eb6`, borrowed **iv**; pools avoid dominant-jazz extensions).
- **Style profile:** `radiohead` in `SONGWRITER_STYLE_PROFILES` only — low form regularity / phrase regularity, high harmonic ambiguity, low syncopation, slow harmonic rhythm, `intervalPreference: stepwise`, `guitarModalPreference: phrygian_aeolian`.
- **Slice:** `engines/composer-os-v2/core/song-mode/radioheadSlice.ts` — five devices (`rh:device1`–`rh:device5`); `precomputeRadioheadEffectiveHarmonyBars` + `radioheadEffectiveHarmonyBars` wired through `getChordForBar` (`harmonyResolution.ts`), export/truth (`runGoldenPath.ts`, `customLockedHarmonyRouting.ts`, `pipelineTruthGates.ts`, `composerOsAppGeneration.ts`) same pattern as Stevie Wonder.
- **Metadata / manifests:** `radioheadDiagnostics`, `radioheadSliceReceipt`, `radioheadEffectiveHarmonyBars`, `radioheadDeviceReceipts` on `GenerationMetadata` + `OutputEntry`.
- **Golden path:** `generateGoldenPathDuoScore.ts` — `isSongwriterRadiohead && isDuoGoldenPath` precompute, per-bar accumulate, finalize (no extra guitar pass). Re-export: `core/goldenPath/radioheadSlice.ts`.
- **Smoke:** `radioheadSliceSmoke.test.ts` (seed **50100**); **`test:smoke`** 36 passed / 0 failed.
- **Eval:** `npm run eval:radiohead` → `scripts/runRadioheadSongModeEval.ts` (root + `engines/composer-os-v2/package.json`).

## [2026-04-28] Stevie Wonder (1972?1976) full-slice songwriter profile

- **Chord pools:** `SONGWRITER_CHORD_POOLS.stevie_wonder` in `songModeBuilder.ts` (m7/maj7/7sus4, 9/13, altered dominants, sus colours).
- **Style profile:** `stevie_wonder` in `SONGWRITER_STYLE_PROFILES` ? high syncopation, Dorian/Mixolydian guitar modal hint, irregular phrases, pentatonic interval preference.
- **Slice:** `engines/composer-os-v2/core/song-mode/stevieWonderSlice.ts` ? five devices (`sw:device1` Dorian vamp, `sw:device2` vi?II?V7sus4?I phrase turns, `sw:device3` chromatic bridge chain, `sw:device4` chorus bII chromatic pivot, `sw:device5` pentatonic voice-1 bias on non-cadence bars); `precomputeStevieWonderEffectiveHarmonyBars` + `stevieWonderEffectiveHarmonyBars` wired through `getChordForBar` (`harmonyResolution.ts`), export/truth (`runGoldenPath.ts`, `customLockedHarmonyRouting.ts`, `pipelineTruthGates.ts`, `composerOsAppGeneration.ts`) same pattern as Brian Wilson locked harmony.
- **Metadata / manifests:** `stevieWonderDiagnostics`, `stevieWonderSliceReceipt`, `stevieWonderEffectiveHarmonyBars`, `stevieWonderDeviceReceipts` on `GenerationMetadata` + `OutputEntry`.
- **Smoke:** `stevieWonderSliceSmoke.test.ts` (seed **50100**); **`test:smoke`** includes Stevie + Radiohead smokes (**36** passed / 0 failed).
- **Eval:** `npm run eval:stevie_wonder` ? `scripts/runStevieWonderSongModeEval.ts` (mirrors Brian Wilson eval harness).

## [2026-04-22] Lead-sheet MusicXML ? MuseScore `.mxl` + imported performance shaping

- **Compressed `.mxl`:** MuseScore-style packages unpack safely in the UI and tests (`fflate`; `engines/composer-os-v2/core/lead-sheet/musicXmlScoreInput.ts`): ZIP + `META-INF/container.xml` ? embedded score XML.
- **Validation:** clearer errors for corrupt ZIPs, missing container/rootfile paths, malformed XML, and **`score-partwise`** vs **`score-timewise`** mismatches at import.
- **Imported performance shaping:** dynamics, per-note `<velocity>`, and basic articulations influence imported melody **note lengths** and **velocity** hints (`leadSheetPerformanceRendering.ts`; melody events carry `velocityMidi`, `articulationKind` on `LeadSheet`).
- **Song Mode:** after import, shaping feeds locked harmony + per-bar melody anchors (including optional bar **velocity hints**); golden-path duo generation can apply **gentle guitar velocity nudges** from those hints when LeadSheet input is active.
- **API:** optional `leadSheetPerformanceBlend` on requests (0?1; default ~0.55 when omitted) controls blend toward imported expression; echoed as `songModeLeadSheetPerformanceBlend` in metadata when anchors apply.
- **UX:** Generate ? Song Mode LeadSheet **file picker** accepts `.musicxml`, `.xml`, and `.mxl` (`.mxl` is unpacked **before** the generate request). **Paste** still expects **uncompressed MusicXML text** only.
- **Tests:** `leadSheetMusicXmlImport.test.ts`, `leadSheetPerformanceRendering.test.ts`, `musicXmlMxlSampleFolder.test.ts` (sample `.mxl` files under `Sample MIDI 2 Musicxml tracks/`).
- **Not implemented yet:** tempo maps, ritardando / accelerando, fermatas, swing/rubato reconstruction ? beyond a single BPM hint where present.

## [2026-04-22] LeadSheet user input workflow - Phase 1 (Song Mode UI slice)

- Added a minimal user-facing LeadSheet MusicXML input block in `apps/composer-os-app/src/pages/HomeGenerate.tsx` for Song Mode.
- Users can now either:
  - paste MusicXML directly into a textarea, or
  - load a local `.musicxml` / `.xml` file into that textarea.
- The UI path is explicitly bounded to Phase 1 Song Mode writer routes only:
  - `presetId === "song_mode"` with primary songwriter `donald_fagen` or `barry_harris`.
- Request wiring now threads UI input into `songModeLeadSheetMusicXml` only for those supported routes; empty input does nothing.
- Added minimal guardrails:
  - unsupported songwriter routes show an honest "input ignored" message
  - basic client-side root-element check (`<score-partwise>`) before request
  - backend/import errors surface as user-facing LeadSheet import failure messages.
- Added focused app tests in `apps/composer-os-app/tests/homeGenerateUi.test.ts` for UI presence, route gating, and payload field threading.
- Explicitly deferred in this slice: Big Band, ECM, other Song Mode writers, and universal LeadSheet UI rollout.

## [2026-04-22] LeadSheet -> Song Mode (Donald Fagen + Barry Harris) experimental Phase 1

- Added optional Song Mode LeadSheet MusicXML input plumbing (`songModeLeadSheetMusicXml`) for bounded Phase 1 Song Mode writer routes: `presetId === "song_mode"` with primary songwriter `donald_fagen` or `barry_harris`.
- Added a narrow adapter at `engines/composer-os-v2/core/song-mode/songModeLeadSheetAdapter.ts`:
  - LeadSheet chord events -> deterministic locked harmony bars
  - LeadSheet melody events -> compact bar-level melody anchors
- Wired Donald Fagen + Barry Harris Song Mode routes to:
  - parse/import the provided LeadSheet MusicXML
  - use LeadSheet-derived locked harmony as primary harmonic input
  - apply bounded melody-start anchor guidance
- Added deterministic tests in `engines/composer-os-v2/tests/songModeLeadSheetInput.test.ts` and wired into `tests/runAllTests.ts`.
- Scope is intentionally narrow and explicit: Big Band, ECM, other Song Mode writers, and universal LeadSheet rollout are deferred.

## [2026-04-22] Lead-sheet MusicXML Import � Phase 1 vertical slice

- Added a minimal shared `LeadSheet` model for import/handoff foundations at `engines/composer-os-v2/core/lead-sheet/leadSheetTypes.ts`.
- Added bounded `score-partwise` MusicXML importer at `engines/composer-os-v2/core/lead-sheet/leadSheetMusicXmlImport.ts`:
  - imports title/composer/tempo, first time signature and key signature
  - imports harmony annotations as chord events (bar + beat offset)
  - imports single-line melody events from first part / voice 1
  - captures rehearsal sections and simple repeat/ending markers when present
  - emits deterministic sorted output with explicit warnings for unsupported complexity
- Added deterministic parser tests in `engines/composer-os-v2/tests/leadSheetMusicXmlImport.test.ts` and wired suite into `tests/runAllTests.ts`.
- Scope is intentionally narrow: this is import foundation only (no String Quartet/Big Band realization integration in this slice).

## [2026-04-22] Docs: Motif Development Phase 1 release snapshot

- Added/updated documentation for **Motif Development Phase 1**:
  - explicit `motifAuthorityLevel` (`off` / `soft` / `strong`) for the bounded pilot routes:
    - Song Mode pilot writers: `wayne_shorter`, `barry_harris`, `donald_fagen`, `bacharach`
    - hybrid pilot: Wayne Shorter melody identity + Barry Harris harmony stack
    - ensemble pilot: `ecm_chamber`
  - pilot-only motif summaries and coherence fields on receipts / `_meta` / run manifest surfaces
  - deterministic tests and tight whitelist gating for pilot activation
  - honest `off` semantics (no motif-development guarantee; minimal summary only)
  - hybrid `motifLedPrimaryIdentity` claim requires minimal recurrence/coherence evidence

## [2026-04-18] Composer OS � Bacharach Song Mode CLI (`workflow:bacharach`, `eval:bacharach`, `mine:bacharach`)

- Developer automation: same-seed Bacharach vs neutral Song Mode batch, receipt/`_meta` checks, GCE-style diagnostic eval (not a gate), optional desktop rebuild. See **`docs/CHANGELOG.md`** and **`docs/USER_GUIDE.md`**.

## [2026-04-17] BPM passthrough + Sibelius tempo export fix
- buildGenerateRequestBody.ts always sends bpm
- runGoldenPath forwards bpm to generateGoldenPathDuoScore
- generateGoldenPathDuoScore uses opts.bpm ?? 120
- lead_sheet_exporter.py emits full metronome direction block

## [2026-04-17] Vocal Lead Sheet � chord extensions, key signature, tempo

### What was fixed
- Full chord extensions working via buildHarmonyXmlLine
  (maj7, alt, #11, 13, m9 all rendering correctly)
- Key signature now reads from ScoreModel.keySignature
  instead of hardcoded C major
- Tempo now reads from ScoreModel.tempo instead of
  hardcoded 90 BPM

### Known issue
- ScoreModel.tempo is hardcoded to 120 in
  generateGoldenPathDuoScore.ts � req.bpm from UI
  never reaches the score model. Fix pending.

## [2026-04-17] Vocal Lead Sheet � chord extensions fully working

### What was fixed
- Replaced Python chord parser (_parse_chord) with TypeScript
  buildHarmonyXmlLine from chordSemantics.ts
- TypeScript now pre-renders full MusicXML <harmony> XML
  and passes it as harmonyXml in the payload
- Python lead_sheet_exporter.py now inserts harmony XML
  verbatim � zero chord parsing on Python side
- chord_symbol_extractor.py updated to forward harmonyXml
- Fixed chord_symbol_extractor.py stripping extensions
  by using raw chord string instead of rebuilding from
  root + quality

### Result
Full jazz chord extensions now render correctly in Sibelius:
- maj7, maj7#11, m7, m9, 13, alt, 7alt, #11
- Donald Fagen and Wayne Shorter styles confirmed working

### Root cause
Python was rebuilding chord strings from integer root +
quality enum, discarding all extensions. TypeScript
buildHarmonyXmlLine already had correct MusicXML harmony
generation � the fix was to use it as the single source
of truth and treat Python as a dumb assembler.

## Roadmap � Guitar/Harmony Module Assessment

### Executive recommendation
- Treat these repos as supporting modules, not core generation engines.
- Pull low-risk UX/practice value now from the stable guitar-voicing tools.
- Defer direct generation/export integration until output reliability meets Composer OS baseline.
- Keep Composer OS focused on high-confidence MusicXML and deterministic pipeline quality.

### Repo-by-repo assessment
- `mikeb55/triadgen`
  - What it is: lightweight triad/triad-pair explorer utility.
  - Maturity: usable as a small standalone helper; limited production scope.
  - Relevance: medium for educational overlays and idea prompts, low for core generation.
  - Risk: low technical risk, low strategic impact.
  - Status: Mine for ideas.

- `mikeb55/gml-triadgen`
  - What it is: guitar voicing/fretboard/practice-oriented module family.
  - Maturity: launches and is practically useful in manual testing.
  - Relevance: high for a Guitar Lab / voicing assistant add-on; not a core composition engine.
  - Risk: moderate integration scope if UI/dependency coupling is heavy.
  - Status: Integrate (as optional utility module).

- `mikeb55/gml-triadgen` `Quartal_Atlas`
  - What it is: quartal voicing atlas/module.
  - Maturity: launches, but current MusicXML output is corrupt.
  - Relevance: potentially high for harmony pedagogy once stable.
  - Risk: high if integrated before export integrity is fixed.
  - Status: Repair first.

### Now / Next / Later
- Now
  - Position `gml-triadgen` as optional Guitar Lab utility (reference/open-launch workflow only).
  - Reuse concepts/UX from `triadgen` for in-app voicing prompts and practice hints.

- Next
  - Define minimal adapter spec for external guitar modules (inputs, outputs, no core coupling).
  - Triage `Quartal_Atlas` MusicXML corruption with a strict pass/fail fixture before any integration.

- Later
  - Consider deeper embedding (preset-aware voicing assistant, contextual chord-shape suggestions).
  - Evaluate cross-module unification only after export fidelity and maintenance cost are proven.

### Do Not Do Yet
- Do not wire any of these as primary generation engines.
- Do not rely on `Quartal_Atlas` MusicXML in production until corruption is resolved.
- Do not expand roadmap scope into broad refactors to support these tools prematurely.
- Do not dilute current Composer OS stabilization priorities (lead-sheet fidelity, deterministic export).

## [2026-04-16] Vocal Lead Sheet � feature complete (v1)

### What was fixed
- Pipeline wired end-to-end from Song Mode to Python bridge
- Script path fixed for packaged Electron app (resourcesPath)
- Replaced leadMelodyPlan placeholder (one chord tone per bar)
  with real melody from gp.score guitar part
- Filtered to voice 1 only � bass voice polyphony removed
- Debug prints removed from cli_export_lead_sheet.py stdout

### Known issues (next session)
- Some residual polyphony in voice 1 (chordal guitar notes)
- Chord extensions stripped (Dmaj7#11 renders as D major)
- Rehearsal marks not yet on vocal lead sheet
- Voice type selector not yet in UI (hardcoded male_tenor)
- leadMelodyPlan is now dead code � needs cleanup

### Status
Vocal lead sheet generates alongside main score on every
Song Mode generation. Single staff, treble clef, chord
symbols, varied rhythm. Opens cleanly in Sibelius.

## [2026-04-16] Vocal lead sheet � full pipeline fix

### Changes
- composerOsAppGeneration.ts: AuthorRuleId type cast fixed
- composerOsAppGeneration.ts: bridge script path now uses
  process.resourcesPath when packaged, __dirname fallback
  for dev
- apps/composer-os-desktop/package.json: songwriting_bridge
  added to extraResources so cli_export_lead_sheet.py
  is available in packaged app

### Status
Vocal lead sheet should now generate in packaged app.
Test: tick Include vocal lead sheet in Song Mode,
check output folder for *_vocal_lead_sheet.musicxml

## [2026-04-16] Fix: vocal lead sheet flag now reaches engine

### Change (composerOsApiCore.ts)
- includeVocalLeadSheet: body.includeVocalLeadSheet === true
  ? true : undefined
  added to req_ in apiGenerate
- Flag was previously silently dropped, meaning the
  vocal lead sheet bridge never ran despite checkbox
  being ticked in the UI
- IPC path was already correct (passes full body through)

### Status
Vocal lead sheet pipeline: flag now reaches runSongStructure.
Python bridge path and packaged build verification still
needed � test by ticking checkbox and checking output folder.

## [2026-04-15] End of day summary � all items verified working

### Verified today
- Song Mode: Wayne Shorter + Post-Bop generating cleanly
  Upper-extension chords (minor-ninth, major-seventh)
  confirmed via MusicXML analysis
- Song Mode style exposure: Pattern slider, Secondary
  Songwriter, Author Overlay all in UI (below Era dropdown)
- Big Band Blues 12: 42-bar form generating correctly
- Big Band Double Bass: part name correct in export
- Guitar-Bass Duo: counterpoint scoring active,
  unisons reduced 70%, parallel octaves reduced 75%
- Wyble single-line parity: 10/10 test:duo passing

### Roadmap status
Completed today:
- Wyble single-line parity
- Phase 19.1 long forms (BB/SQ up to 64 bars)
- Wayne Shorter coherence fix
- Big Band / String Quartet polish
- Song Mode style exposure
- Counterpoint Phase 1 (shared module) + Phase 2 (Duo wiring)
- Monk engine v1.0
- Charlie Parker engine improvements

Remaining:
- Vocal lead sheet pipeline closure
- Bass/duo regression expansion
- Counterpoint Phase 3 (SQ + ECM + UI slider)

## [2026-04-15] Song Mode style exposure � three new controls

### UI additions (HomeGenerate.tsx)
- Pattern slider: intent.pattern now user-controlled
  (was hardcoded 0.5); range 0-1 alongside other
  intent sliders
- Secondary Songwriter dropdown: optional blend at
  ~35% with primary; uses same SONGWRITER_OPTIONS
- Lyric Author Influence dropdown: jimmy_webb,
  pat_pattison, jack_perricone � optional overlay

### API pipeline (appApiTypes.ts, composerOsApiCore.ts,
  composerOsAppGeneration.ts, runSongMode.ts)
- secondarySongwriterStyle and authorOverlay added
  to GenerateRequest type
- Fields passed through API ? runSongStructure ?
  runSongMode ? buildCompiledSong ?
  resolveSongwritingStyles
- Empty strings stripped before blending so None
  selection has no effect

## [2026-04-15] Big Band polish � complete

### All items done
- Double Bass part name correct in MusicXML export
- big_band_blues12 form: 42 bars, correct rehearsal marks
- Blues 12 form selector on Big Band card in UI
- 42 added to allowed bar counts in API validation
- bigband-verify.ts: 14/14 checks passing
- String Quartet honestNote corrected in releaseMetadata.ts

## [2026-04-15] Fix: Big Band bass part name in MusicXML export

### Change (musicxmlExporter.ts)
- partDisplayNameForExport now context-aware for
  acoustic_upright_bass identity:
  - Big Band (p.name === 'Double Bass'): uses p.name
  - Guitar-Bass Duo: keeps GUITAR_BASS_DUO_BASS_PART_NAME
    ('Upright Bass') unchanged
- Fixes Big Band MusicXML showing 'Upright Bass'
  instead of 'Double Bass'

## [2026-04-15] Fix: Big Band Blues 12 bar count validation

### Change (composerOsApiCore.ts)
- Added 42 to allowed totalBars for Big Band and
  String Quartet: [16, 24, 32, 40, 42, 48, 64]
- Required for big_band_blues12 form (42-bar chart)
- Error message updated to include 42

## [2026-04-15] Big Band and String Quartet polish

### Fixes
- releaseMetadata.ts: String Quartet honestNote corrected
  to "4-part string ensemble with piano chord reduction"
- bigBandScoreBuilder.ts: bass part renamed from
  "Rhythm Section" to "Double Bass" in PART_META

### New: Big Band Blues 12 form preset (big_band_blues12)
- 42-bar chart: Intro(2) + Head(12) + Solo(12) +
  Shout(12) + Rideout(4)
- Wired in: bigBandFormPlanner.ts, runBigBandMode.ts,
  composerOsAppGeneration.ts, formOptions.ts,
  HomeGenerate.tsx
- Distinct from duo/song blues12 (12-bar) to avoid
  id collision

### bigband-verify.ts improvements
- All parts share same measure count
- Every non-piano part has at least one sounding note
- At least one harmony element present
- At least one rehearsal mark present
- Drum percussion clef check made reliable
  (scans whole part, not measure 1 only)
- Dead helper removed
- 14/14 checks passing

## [2026-04-15] Counterpoint Phase 2 � voiceLeadingScorer wired into Guitar-Bass Duo

### Changes (guitarVoice2WybleLayer.ts)
- Voice2PitchPickContext182B3: added bassMidi, prevV1Midi,
  prevV2Midi, prevBassMidi optional fields
- buildVoice2PitchPickContext182B3: populates bass MIDI
  from bass part at current beat; prev pitches from
  previous beat or last bar
- refineVoice2Pitch182B3 scoring loop: Bizzi/Tymoczko
  bonus applied after guide tone scoring:
  s -= scoreThreeVoices(...) * 0.8
  Falls back to vertical-only (Bizzi) when bass
  pitch unavailable

### Also fixed
- generateGoldenPathDuoScore.ts: restored HookBarNoteIdentity
  type import removed during hook bar guard fix

### Test result
- npm run test:duo: 10/10 PASS

### Status
Phase 2 complete. Voice 2 candidates now scored by:
- Bizzi vertical consonance (triple counterpoint validity)
- Tymoczko horizontal smoothness (voice leading distance)
- Species-lite penalties (parallel 5ths/8ths, lockstep)
Combined weight: 0.8 bonus subtracted from candidate score.

Phase 3 (String Quartet + ECM + UI slider) deferred
per roadmap until after other priorities.

## [2026-04-15] Fix: Song Mode hook bar guard false positive

### Problem
assertHookBarIdentityUnchanged was firing incorrectly
when STYLE_SHORTER_POST_BOP / wayne_shorter activated
shorterMode chord-tone policy. The mid-pipeline snapshot
was taken before style-aware passes (overlay, melodic,
phrase repair) ran, then compared after � legitimately
different when shorterMode changes chord tone selection.

### Fix (generateGoldenPathDuoScore.ts)
Removed mid-pipeline snapshot + assert block.
Post-finalizeAndSealDuoScoreBarMath guard on bars 1
and 25 retained � still catches unintended mutations
after the score is sealed.

### No snapshot regeneration required
No stored hook snapshot files exist to refresh.

## [2026-04-15] Wayne Shorter � quick coherence fix

### Changes
- harmonyChordTonePolicy.ts: STYLE_SHORTER_POST_BOP now
  triggers shorterMode (upper-extension chord tone bias)
  alongside wayne_shorter, andrew_hill, STYLE_MODERN_JAZZ
- songModeStyleEngine.ts: comment added clarifying that
  velocity shaping + shorterMode chord policy together
  form the complete Post-Bop style surface
- songwriterStyleProfiles.ts: wayne_shorter description
  added � post-bop harmonic language, upper-structure
  emphasis, activates shorterMode chord-tone policy

### Effect
Song Mode with Post-Bop style now correctly applies
upper-extension (9/11/13) chord tone bias in addition
to the existing velocity shaping. Previously these
two mechanisms were disconnected.

### Not done (deferred)
- Full Wayne Shorter presetId on Generate page
- Python engine bridge to TS pipeline
- Unified Shorter mode knob across all mechanisms

## [2026-04-15] Phase 19.1 - Long forms >32 bars for Big Band and String Quartet

### UI changes (HomeGenerate.tsx)
- Big Band and String Quartet dropdown now offers:
  16 / 24 / 32 / 40 / 48 / 64 bars
- State normalization updated to accept all six values
- Guitar-Bass Duo and Song Mode unchanged at 8/16/24/32

### API validation (composerOsApiCore.ts)
- New validation block for big_band and string_quartet:
  accepts 16, 24, 32, 40, 48, 64
- Existing guitar_bass_duo / song_mode cap (8/16/24/32)
  unchanged

### Engine status
- runBigBandMode: no upper bar cap - engine-ready
- runStringQuartetMode: no upper bar cap - engine-ready
- Guitar-Bass Duo / Song Mode: golden path still capped
  at 32 - engine extension deferred to future phase

## [2026-04-15] Counterpoint scoring module � Phase 1 complete

### New file: engines/composer-os-v2/core/counterpoint/voiceLeadingScorer.ts
Shared three-voice counterpoint scorer based on:
- Bizzi (1982) triple counterpoint / macchina rules
- Tymoczko (2011) efficient voice leading geometry
- Species counterpoint lite (parallel 5ths/8ths, lockstep)

Exports:
- scoreBizziVertical(pc1, pc2, pcBass, keyRoot) -> 0-1
- scoreTymoczkoHorizontal(prev/curr x3 MIDI) -> 0-1
- scoreSpeciesLitePenalties(prev/curr x3 MIDI) -> 0-1
- scoreThreeVoices(params) -> 0-1 combined weighted score

Default weights: Bizzi 0.4, Tymoczko 0.35, Species 0.25

### New test infrastructure
- engines/composer-os-v2/jest.config.cjs (ts-jest)
- engines/composer-os-v2/tsconfig.jest.json
- engines/composer-os-v2/core/counterpoint/voiceLeadingScorer.test.ts
- 10/10 tests passing

### Status
Phase 1 complete. Not yet wired into any module.
Phase 2 (Guitar-Bass Duo wiring) deferred until after:
- Phase 19.1 long forms
- Wayne Shorter TS integration

## [2026-04-15] Wyble single-line parity + type fixes + Bizzi prep

### Wyble single-line parity (guitarVoice2WybleLayer.ts, generateGoldenPathDuoScore.ts)
- injectGuitarVoice2WybleLayer: gated to isGuitarBassDuoFamily (was guitar_bass_duo only)
- stabiliseGuitarVoice2Wyble18_2B_1/_2/_3: gated to isGuitarBassDuoFamily
- generateGoldenPathDuoScore: Voice 2 probe now runs for guitar_bass_duo_single_line
- normalizeRealizedVoice2PostInjection182B3: logic unchanged, comment added explaining
  intentional exclusion of standard duo from this normalization path
- getChordTones: replaced missing symbol with chordTonesForChordSymbol utility
- createNote: fixed object-style calls to positional signature

### GenerationMetadata type fixes (compositionContext.ts)
- Added missing Fagen style fields: fagenMuChordBias, fagenLydianMajorBias,
  fagenAlteredDominantBias, fagenRootAvoidanceMelody, fagenSlashChordDensity
- Added missing Bacharach style fields: bacharachDeceptiveCadenceRate,
  bacharachChromaticVoiceLeading, bacharachModalMixtureLevel,
  bacharachCadentialAmbiguity, bacharachPedalUsage
- Restored fagenMuChordBias assignment in runGoldenPath.ts

### Test result
- npm run test:duo: 10/10 seeds PASS

## [2026-04-15] Composer OS ? Roadmap Snapshot & Recent Completions

### Shipped today
- **Thelonious Monk Engine v1.0** ? blues/custom form, GCE melody (temp=0.9),
  Monk-specific prompt + RAG from 5 transcriptions, 12 validators including
  density cap, rhythm variety, breathing. See engines/monk-engine/.
- **Generate UI: Songwriter for Big Band and String Quartet** ? previously
  locked to Donald Fagen silently; now exposes Songwriter dropdown for BB
  and Songwriter + Arranger + Era for SQ. Uses same SONGWRITER_OPTIONS as
  Song Mode. primarySongwriterStyle now sent for song_mode, big_band,
  string_quartet.

### Recently completed (from roadmap snapshot)
- Guitar-bass duo Voice 2 counterpoint (Wyble rules, pre-planned goals,
  clash/repeated-pitch prevention, range C2-A3)
- Wyble Voice 2 inject extended to guitar_bass_duo_single_line
- Phase 19: Song Form UI, formId ? engine, rehearsal marks, bar cap ?32
- Big Band: seven-part ensemble MusicXML, chords on piano, piano naming
- String Quartet: strings + piano reduction, section markers, Song Form +
  16/24/32 bars on Generate
- Song Mode: compile/realise pipeline, D1+D2+C1-C7 delivered
- V9.0 chord baseline: unified parsing/normalization, Sibelius-safe rhythm

### In flight / gaps
- Vocal lead sheet: bridge wired, download path not closed
- Wyble single-line parity: stabilisers and guards incomplete
- Song Mode style controls: thinner than core surface
- Big Band / SQ polish: copy, host smoke tests ongoing

### Priority queue (next up)
1. Wyble single-line parity
2. Phase 19.1 ? forms longer than 32 bars
3. Wayne Shorter TS integration
4. Big Band / String Quartet polish
5. Song Mode style exposure
6. Vocal lead sheet pipeline closure
7. Bass/duo regression expansion

## [2026-04-15] Thelonious Monk Engine ? v1.0

### Status: Shipped

### Architecture
- 12-bar blues and custom form support
- GCE-powered melody generation (Claude API, temp=0.9)
- Monk-specific system prompt: space, quarters/halves,
  tritone leaps, b9 dominants, obsessive repetition
- RAG: 6 abstract Monk templates + concrete phrases
  from 5 transcriptions (Blue Monk, Epistrophy,
  Round Midnight, Straight No Chaser, Well You Needn't)

### Validators (in order)
1. _patch_unison_runs
2. _cap_unison_frequency
3. _enforce_opening_rest
4. _enforce_syncopation
5. _enforce_midphrase_quarter
6. _enforce_cadence_half
7. _enforce_long_note_consonance
8. _enforce_downbeat_consonance
9. _enforce_monk_density (max 6 pitched notes/bar)
10. _enforce_monk_rhythm_variety (no pure eighth bars)
11. _enforce_monk_breathing (rest if >5 notes, no rests)
12. _fit_sixteen_divisions

### Key metrics (Blue Monk, 12 bars)
- Avg notes/bar: 5.0 (target 4-5)
- Eighths: 78.3%
- Quarters: 10.0%
- Halves: 11.7%
- Bar length errors: 0
- Rests: 11.8%

### Key files
- monk_phrase_engine.py
- monk_section_compiler.py
- monk_vocabulary.py
- monk_musicxml_exporter.py
- monk_engine_cli.py

## [2026-04-14] Thelonious Monk Engine ? Initial Build

### Architecture
- New engine: engines/monk-engine/
- Copied from Charlie Parker engine, fully renamed
- Monk-specific GCE prompt: space, b9s, tritone leaps,
  obsessive repetition, angular shapes, quarter/half dominance
- Monk rhythm skeleton: quarter-based, not eighth-based
- Validators: cadence half-note enforcer, monk density cap
  (max 5 notes/bar), chord contradictions disabled
- RAG: 6 abstract Monk templates + concrete phrases from
  5 transcriptions (Blue Monk, Epistrophy, Round Midnight,
  Straight No Chaser, Well You Needn't)
- Vocabulary: 1,732 notes, top patterns from real Monk solos
- Key stat: 32% leaps ?5st (vs 13% Parker),
  25% quarters (vs 5% Parker)

### Files
- monk_phrase_engine.py
- monk_section_compiler.py
- monk_vocabulary.py
- monk_musicxml_exporter.py
- monk_rhythm_engine.py
- monk_engine_cli.py

## [2026-04-14] Charlie Parker: downbeat consonance ? syncopation rest

### Change
- _enforce_downbeat_consonance now prepends an eighth rest
  when the first pitched note of a bar is not a strict chord
  tone, instead of shifting the pitch.
- This converts dissonant downbeats into syncopated offbeat
  entries ? fixing consonance AND increasing syncopation
  simultaneously.
- Every third bar (bar_index % 3 == 0): pitch-nudge fallback
  retained for variety.

### Result
- Dissonance reduced from 31.7% to 24.1% (previous build)
- Syncopation expected to recover above 45%
- Zero regressions on previously-measured problem bars

## [2026-04-14] Charlie Parker Engine ? Best Build

### Architecture
- 8-bar section generation: GCE now sees full 8-bar phrase arc per call (A1/A2/B/A3)
- Global chorus planner: section labels, function tags, rhythm skeletons passed per section
- Parker RAG templates: 10 abstract phrase templates tagged by function/role/contour
- Concrete Bird phrases: real note sequences extracted from 8 transcriptions (Ko-Ko, Anthropology, Donna Lee, Now's The Time, Billie's Bounce, Ornithology, Confirmation, Lou Donaldson/Birdland) injected into GCE prompt

### GCE Prompt
- System prompt: "You are Charlie Parker's fingers on the alto saxophone"
- Temperature: 1.2
- Full Bird/bebop prompt rewrite: anticipation, offbeat starts, 3rd/7th landings, leap+compensation, turnaround chains, upper extensions
- Concrete phrase injection: 2 real Bird phrases per 8-bar section, transposition-aware

### Post-generation Validators
- _patch_unison_runs: eliminates clusters of 3+ identical consecutive pitches
- _cap_unison_frequency: caps unisons at 5% of all intervals
- _enforce_opening_rest: all section openings (bars 1/9/17/25) start on rest
- _enforce_syncopation: 40%+ of interior bars start on offbeat
- _enforce_cadence_quarter: every 4th bar has quarter note or longer
- _fit_sixteen_divisions: bar length integrity

### Results (Confirmation AABA, 32 bars)
- Syncopation: 53.6% of interior bars (target ~40%) ?
- Leaps =5 semitones: 13.3% ?
- Rests: 13.2% (target 12-15%) ?
- Unison clusters: 0 ?
- Opening rests: 4/4 sections ?
- Cadence quarters: 8/8 bars ?

### Vocabulary
- parker_vocabulary.py: updated from 2,099 notes across 5 transcriptions
- TOP_PATTERNS: 10 four-gram interval patterns from real Bird solos
- RHYTHM_WEIGHTS: derived from transcription analysis

# Changelog

## V4.6

### Fixed

* Corrected day structure (removed Day 2 starting after Day 1 lunch)
* Repositioned breaks to align with cognitive load
* Ensured 2?20 min breaks and 1? lunch per day

### Changed

* Improved pacing across both days
* Balanced Day 2 morning cognitive load
* Refined Emily and Michael sequencing for clarity

### Added

* Video integration at 3 precise teaching points:

  * Neurodiversity (after Ousmane)
  * Dissociation (around Emily)
  * Suicide / risk (before Michael)

### Design

* Break and lunch slides updated with image-based format
* Text formatting standardised (Arial, large, bold, raised vertically)

---

## V4.5

* Stable full presentation build
* Case studies upgraded to V4 (400?500 words, decision-focused)
* ACE framework embedded

---











