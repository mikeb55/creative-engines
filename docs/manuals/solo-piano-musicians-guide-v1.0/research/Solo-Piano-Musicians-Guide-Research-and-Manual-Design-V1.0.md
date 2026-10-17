# Solo Piano Musician’s Guide: Research and Manual Design V1.0

Research for **COMPOSER OS / SOLO PIANO COMPOSER / MUSICIAN’S GUIDE V1.0**. This is a capability audit and publication design, not the final user manual, an implementation instruction, a release certificate or musical approval.

## Executive capability verdict

**Publish an honest guide to two fixed piano studies, not a general-purpose piano composer.** At the inspected commit, the dedicated page offers an eight-bar fixture and the fixed 24-bar Coffee Run variation, with a seed input and an inner-voice checkbox; general harmony, key, length, tempo, composer-style and arbitrary film-brief controls are absent from that page ([Solo Piano page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)).

**G1 and G2 remain unverified local work.** The complete committed file tree and relevant source searches did not reveal a General Piano writer or its GUI integration, while the committed API still restricts requests to eight or 24 bars at quarter-note = 64; the user’s report of uncommitted G1 is not contradicted by its absence on GitHub ([piano API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)).

The strongest present uses are comparative listening, motif/hand-interaction study, an inner-voice A/B experiment, a fixed 90-second cue, and source material for manual notation or DAW development. Exported note timing can be checked technically, but those checks do not establish compelling composition, convincing piano performance, installed-app acceptance or automatic piano-to-orchestra conversion.

### Repository identity and evidence boundary

| Item | Finding |
|---|---|
| Repository | `mikeb55/creative-engines`, branch `main`. |
| Exact inspected HEAD | `824d99b241df3db9a72d47f91f659e1aa312aa1c`, matching the user’s last reported commit ([commit](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Commit description | `feat(composer-os): integrate Solo Piano GUI and Coffee Run with MIDI parity repair`; committer timestamp `2026-10-17T21:18:53Z` ([commit](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Acquisition | Authenticated GitHub API plus an isolated, shallow source checkout; public web crawling could not read the repository pages, so source inspection used authenticated access. |
| Work performed | Read-only source audit, targeted existing tests and an external audit harness writing only scratch outputs. No tracked repository file was changed, and nothing was committed, pushed, built for installation or installed. |
| Not inspected | The user’s uncommitted Mac work, installed/running app, live Solo Piano GUI, Sibelius session, Cubase session or heard playback. |
| Citation convention | GitHub links pin the inspected snapshot; exact paths, functions and relevant line ranges below identify the evidence within it. Fresh sandbox observations are explicitly distinguished from repository-authored claims. |

### Fresh verification, not a full release test

The following runs used Node 20.20.2 and an isolated audit dependency environment, not the repository’s complete locked installation. They support the bounded findings below and must not be relabelled as full CI, browser, Electron, DAW or musical acceptance.

| Check | Fresh result and boundary |
|---|---|
| `pianoCompositionV1.test.ts` | **40/40 passed**, including disabled-by-default behaviour, event/XML parity, seed difference, fixed motif return, tied LH attacks, MIDI parity and deliberately failing invalid-hand examples; this is a targeted test file, not the whole suite ([tested snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| `coffeeRunVariation.test.ts` | **25/26 passed**; the original-cue comparison failed because its external original MusicXML was unavailable, so no claim is made that this run independently compared the variation with that original ([tested snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Persistence suite | `pianoCompositionPersist.test.ts` was attempted but did not complete because the larger application import chain required additional dependencies, ending at missing `@napi-rs/canvas`; do not count its assertions as executed. |
| Focused persistence/HTTP harness | Twelve generation-and-save cases succeeded, covering both paths, seeds `76018/76019/76020`, and inner voice on/off; a real local HTTP route returned successful generation and structured rejection of tempo 72, 12 bars and fractional seed 1.5 ([persistence and request path](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionPersist.ts)). |
| Export comparison | All twelve cases had matching exported MusicXML/MIDI pitch, onset and duration tuples after tie-aware XML interpretation; this does not test engraving, timbre, expressive playback or imported DAW behaviour ([export path](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Import probes | Both piano exports produced Pentatonic missing-guitar/missing-bass warnings and BHL `no bass part`; generic melody import returned material but not an exact primary-RH event sequence ([import implementations](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |

## Source-grounded feature inventory

The classification describes the implemented surface, not an installed-release certificate. In particular, **A** means a committed GUI route is wired to an implemented operation; it does not imply that this audit clicked the running application.

- **A: IMPLEMENTED AND GUI-ACCESSIBLE.** Source wiring exists; runtime evidence is stated separately.
- **B: IMPLEMENTED AND TESTED, LIBRARY-ONLY.** Relevant code/tests exist without a Solo Piano control; fresh execution is specified where available.
- **C: IMPLEMENTED BUT NOT VERIFIED.** Reported implementation or a particular runtime leg lacks sufficient verification.
- **D: PARTIAL OR RESTRICTED.** A real capability exists but has material limits.
- **E: NOT IMPLEMENTED.** No implementation was found on the inspected path/snapshot; this does not assert absence from uncommitted local work.

Paths below use `core/` and `app-api/` as shorthand for `engines/composer-os-v2/core/` and `engines/composer-os-v2/app-api/`; renderer paths are under `apps/composer-os-app/src/`, and desktop `electron/` paths under `apps/composer-os-desktop/`. In this audit, a negative result means “not established on the inspected piano path”, not “impossible anywhere in Composer OS”.

| Feature | Class | Exact evidence and consequence |
|---|---|---|
| Solo Piano navigation | A | `apps/composer-os-app/src/router/appRouter.ts`, `routeFromLocation`/`routeFromPathname`/`hashForRoute`, route `solo-piano`; `App.tsx` mounts `SoloPianoPage`; `components/Shell.tsx` supplies the navigation entry ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Dedicated controls | A / D | `apps/composer-os-app/src/pages/SoloPianoPage.tsx`, `SoloPianoPage`, lines 80–185: Piece, Seed, `RH inner voice`, Generate, Regenerate and Open output folder; MusicXML/MIDI paths are displayed text, with no separate file-open, playback or notation-preview buttons ([page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)). |
| Request contract | A / D | `app-api/pianoCompositionApp.ts`, `apiComposePianoV1`, lines 21–69: opt-in flag, seed, bars, tempo, innerVoice, lockedEvents and filmCue; runtime checks restrict bars to eight for the fixture or 24 for Coffee Run, with tempo fixed at 64 and no title input ([API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)). |
| Eight-bar writer | A / D | `core/piano/pianoWriter.ts`, `composePianoV1`, `rootMotif`, `fillVoice`, `placeEvents`: prescribed RH, LH and optional inner-voice placements combined with real motif operations; not a general harmony-conditioned writer ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Coffee Run | A / D | `core/piano/coffeeRunVariation.ts`, `composeCoffeeRunVariation`, `coffeeRunBarSummary`, `coffeeRunStartTime`, `coffeeRunMarkerText`: fixed 24-bar A-minor-labelled cue at 64 BPM, motif-derived events placed in a prescribed RH/LH design ([writer](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)). |
| General Piano G1 | C: reported only; E in this snapshot | No G1 writer was found; the committed API still selects only fixture or Coffee Run, so local implementation/testing must be recovered rather than assumed ([API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)). |
| General Piano G2 | C: unverified; E in this snapshot | No General Piano option or associated controls are in the committed `SoloPianoPage`; a future manual must inspect the actual G2 diff and live controls ([page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)). |
| Piano types | B / D | `core/piano/pianoTypes.ts`, `PianoVoiceLane`, `PianoLockedEvent`, `PianoCompositionV1Request`, `pianoGrandStaffConfig`; `pianoWriter.ts` defines `PianoCompositionPlan` and `PianoLockSnapshot` as generated-plan/evidence types, not arbitrary-plan GUI inputs ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Editable harmony | E in Solo Piano | Eight-bar harmony and Coffee Run’s 24-symbol sequence are embedded in their writers; the API has no supported progression input ([API and dispatch](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)). |
| Harmony parsing | B / D | `core/harmony/chordProgressionParser.ts`, `buildHarmonyPlanFromBars`/`buildChordSymbolPlanFromBars`, plus `chordSymbolAnalysis.ts`, `chordTonesForChordSymbol`; both writers validate/build plans from embedded harmony while placing their own fixed event design, so parsing is not user-driven harmonic recomposition ([Coffee Run implementation](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)). |
| Seeds | A / D | `pianoWriter.ts` uses seed parity for bounded LH/inner-note differences; Coffee Run stores seed identity but its written pitches/rhythms do not vary with seed in the tested cases ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Inner voice | A / D | The checkbox removes/adds one sustained RH-inner event in fixture bar 7, or two events in Coffee Run bars 17–18; it is not a continuous texture/density control ([page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx), [Coffee Run writer](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)). |
| Motif transformations | B; fixed results exposed through A | `core/motif-ops/operators.ts`, `applyOperator`, and `core/motif-ops/developmentChain.ts`, `buildChain`; piano writers invoke fixed chains, not user-selected transformations ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Form and density | D | Fixture form is 4+4 bars; Coffee Run supplies section lengths 2+3+5+2+4+2+2+3+1 to `resolveFormPrecedence`, then calls `planSectionRoles` and `planDensityCurve`; none is an arbitrary-form GUI control ([Coffee Run writer](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)). |
| Voice-leading / independence | B / D | `core/piano/pianoValidation.ts`, `validatePianoPlayability`, `validatePianoIndependence`, `validateLhDevelopment`: range/span, relocation, hand-independence and repeated-LH checks; this is not proof of a general voice-leading optimiser or human playability ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Source locking | B / D | `PianoLockedEvent`, `validateLockedEventPlayable` and `validateLockedEventsPresent` require already-matching events and reject incompatible locks; the GUI does not import a pianist’s score and generate around it ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| MusicXML | A; fresh core verification | `core/export/musicxmlExporter.ts`, `exportScoreModelToMusicXml`; `core/export/pianoGrandStaffXml.ts`, `pianoGrandStaffEventsToXml`/`pianoPedalDirectionXml`; one piano part, two staves, RH voices 1/2 and LH voice 3, with dedicated backup handling ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| MIDI | A; fresh core verification | `core/piano/pianoMidi.ts`, `writePianoScoreMidi`/`pianoMidiNotes`, and `core/export/midiScoreWriter.ts`, `writeScoreModelMidiFile`; tie-aware sounding-note export, including Coffee Run pedal controllers, is exercised by the targeted tests ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Export oracle | B; freshly tested | `core/piano/pianoXmlOracle.ts`, `parsePianoXmlAtoms`/`comparePianoScoreToXml`, compares score events with interpreted XML including ties; it does not listen or inspect Sibelius engraving ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Save operation | A; freshly exercised | `app-api/pianoCompositionPersist.ts`, `persistPianoComposition`/`pieceSlug`, writes `.musicxml` and `.mid` using deterministic filenames; the separate `engines/composer-os-v2/scripts/exportCoffeeRunVariation.ts` writes a Markdown bar summary, not an extra GUI `.summary.json` ([persistence](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionPersist.ts)). |
| Browser API / Electron IPC | A wiring; C installed execution | `services/api.ts`, `composePiano`; `scripts/pianoComposeRoute.ts`, `attachPianoComposeRoute`; desktop `preload.ts` and `ipcEntry.ts`, channel `piano:compose`; focused HTTP was run, installed IPC was not ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Errors | A / D | `apiComposePianoV1` rejects disabled flag, non-integer seed, unsupported film cue, wrong fixed length/tempo and malformed locks; `SoloPianoPage.compose` displays generation errors, and `openFolder` displays failed folder-open messages ([API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts), [page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)). |
| Help/manual architecture | D | `pages/UserGuide.tsx`, `UserGuide`, points to `docs/USER_GUIDE.md` and still enumerates older mode coverage; `docs/manuals/v3.2/build.py`/`capabilities.yaml` and `docs/bhl-composer/manuals/source/manual_engine.py` supply separate publication precedents, not a current Solo Piano guide ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |

### Parameter truth and musician-facing explanation

| Input | What actually happens now | Safe manual wording |
|---|---|---|
| Piece | Selects one of two different fixed writers. | “Choose a short study or the fixed Coffee Run cue.” |
| Seed | Fixture: bounded even/odd variation; Coffee Run: identity/replay metadata, no demonstrated note change. | “Compare 76018 with 76019 in the study. Do not expect a new Coffee Run composition from a new seed.” |
| RH inner voice | Changes the specific sustained events described above. | “Add or remove a small extra right-hand layer.” |
| Tempo / length | Fixed by the selected path; not GUI controls. | “The study is eight bars at 64; Coffee Run is 24 bars at 64.” |
| Title | Generated by the writer; not an accepted title control on this API/page. | Do not instruct the reader to enter a title here. |
| Harmony / key / composer style / target duration | Not supported piano request parameters. | Do not borrow similarly named controls from Song Mode or describe them as piano controls. |

These distinctions follow the current page, request dispatcher and fixed writers; a fresh probe also found that adding unknown `harmony`, `key`, `composerStyle` and `targetDuration` fields left the fixture XML unchanged, so an accepted-looking request is not evidence of parameter consumption ([page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx), [API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)).

### Actual musical observations

| Case | Observed sounding behaviour |
|---|---|
| Fixture, 76018, inner on | 45 sounding attacks; 8 bars, 64 BPM, 30-second notated span. |
| Fixture, 76019, inner on | 45 attacks; different events from 76018, within the same fixed design. |
| Fixture, 76020, inner on | Same musical-event hash as 76018, not a third composition. |
| Fixture, inner off | 44 attacks; the one additional inner event is removed. |
| Coffee Run, 76018/76019/76020, inner on | All three share the same musical-event hash: 110 attacks and 44 pedal CC events. |
| Coffee Run, inner off | 108 attacks, with 44 pedal CC events retained. |
| Duration boundary | Coffee Run’s final MIDI note-off is 90 seconds; the fixture’s last note-off is 28.125 seconds within its 30-second bar grid. |

These are fresh scratch-run observations from the pinned writers and exporters, not listening judgements; MIDI final note-off does not bound a piano sample’s release tail or reverberation ([inspected generation/export code](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).

The fixture’s fixed harmony is `Dm9 | Dm9 | Cmaj7 | Dm9 | Fmaj7 | Cmaj7 | Dm9 | Dm9`, with an opening RH cell D–E–B–A–G and a D–E head reused in the LH at bar 6; it should not be introduced as a selectable C-major composition ([`PIANO_V1_HARMONY` and `composePianoV1`](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). Coffee Run distinguishes `COFFEE_RUN_REFERENCE_HARMONY` from the actually written `COFFEE_RUN_HARMONY`, differing at bars 6, 8, 10, 16, 20 and 22; the guide must illustrate the written score rather than copy reference progression labels as if they were the output ([Coffee Run constants](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)).

For constant quarter-note tempo in 4/4, notated duration is \(T = 60 \times 4 \times B / q\): eight bars at 64 give 30 seconds, and 24 give 90 seconds. This arithmetic explains the existing pieces; it is not evidence of an editable duration control.

### Output folders and preservation

`persistPianoComposition` writes beneath a `Solo Piano` subfolder of the application’s resolved output directory; representative names are `piano-v1-fixture-seed76018-inner.musicxml` and `coffee-run-variation-seed76018-no-inner.mid` ([persistence](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionPersist.ts)). Repeating the same path/seed/inner combination writes the same path, so the manual must tell musicians to copy or rename files before editing or preserving an earlier take ([persistence](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionPersist.ts)).

Desktop DEV defaults to `~/Documents/Composer OS DEV Exports`, with the piano subfolder beneath it, while the web API defaults to its configured Composer OS output root and may use an environment override; neither should be replaced in the manual by a guessed universal path (`electron/main.ts`, `releaseIdentity.ts`, `scripts/startComposerOsAppApi.ts`, `app-api/composerOsOutputPaths.ts`) ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). Teach “read the path displayed after Generate, then use Open output folder or open that file from the external application”; there are no dedicated Open MusicXML/Open MIDI buttons on this page ([page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)).

## Cross-module workflow matrix

**No direct piano-to-other-module generation workflow earns WORKING NOW in this audit.** There are real generic import facilities and orchestration code, but the piano-specific path, preserved identity and end-to-end proof are not established; the fresh importer probes identify concrete reasons not to promote them ([inspected snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).

In the matrix, “GUI” refers to a relevant receiving surface, not a dedicated Solo Piano send button. “Locks” means preservation of the original piano material, not merely retaining an input file or storing a hash.

| Connection | Genuine route / real notes | Melody and locks | GUI / piano-specific E2E | Classification |
|---|---|---|---|---|
| Song Mode | Generic MusicXML/MIDI import produces a melody timeline; `musicXmlToImportTimeline` and `composerOsAppGeneration.ts` consume imported material. | Import selects a voice/skyline and can split tied events; whole-piano identity is not preserved. No piano lock proof. | Generic import/Arranger UI exists; piano E2E not run. | PARTIAL / UNVERIFIED ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| BHL worlds | `app-api/bhlApp.ts`, `apiBhlInspect`, uses `core/bhl/bhlIngest.ts`, `ingestBhlSource`/`extractBhlSnapshot`; both piano files fail `no bass part`. | BHL expects named bass/guitar sources; a piano LH staff is not a bass part. No successful piano lock establishment. | BHL source inspection exists, but current piano input fails the core probe. | PARTIAL / UNVERIFIED; direct route blocked ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Pentatonic | `pentatonic/PentatonicWorkflowPanel.tsx`, `onFile` and its analysis call → `core/pentatonic/dev4cWorkflow.ts`, `analysePentatonicMusicXml`; `core/pentatonic/musicXmlScore.ts`, `importPentatonicScoreFromMusicXml`, reads Piano as role `other`. | Both probe files have empty guitar/bass evidence; opening XML is not successful piano analysis or transformation. | Generic MusicXML file input exists; no successful piano musical E2E. | PARTIAL / UNVERIFIED ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Hexatonic | `HexatonicEnginePage.tsx` operates on collections/candidates and exports its own examples; no Solo Piano event-import route was found. | No piano event consumption or locks established. | No piano import/handoff found; no E2E. | FUTURE ONLY for automatic handoff ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Riff Generator | No dedicated Solo Piano score-to-riff route found; Riff generation remains separate. | No piano identity/lock contract. | No direct piano handoff; no E2E. | FUTURE ONLY for automatic handoff ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| String Quartet | Arranger lists `string_quartet`; backend accepts lead-sheet XML through `ensembleLeadSheetMusicXml`. | Imported melody/harmony are reduced inputs, not preservation of both piano hands; no piano lock proof. | Generic Arranger option exists; no tested piano-to-quartet sequence. | PARTIAL / UNVERIFIED ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Big Band | Arranger lists `big_band`; backend consumes lead-sheet XML/imported material. | No proof that piano RH, LH, ties, inner voice and pedal survive arrangement. | Generic UI exists; piano-specific E2E absent. | PARTIAL / UNVERIFIED ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| ECM Chamber | Separate generation exists, but no dedicated piano-score handoff was traced; it is not among the three `ARRANGER_PRESET_IDS` in `arrangerHelpers.ts`. | No verified piano event-preservation contract. | No established piano workflow; no E2E. | FUTURE ONLY for an advertised piano workflow ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Composer Profiles | Generic Arranger/profile facilities exist; `apiComposePianoV1` does not accept a profile and does not dispatch through them. | A profile name cannot transform these fixed piano events through the piano endpoint. | No piano profile control; no E2E. | FUTURE ONLY inside Solo Piano; generic import route remains PARTIAL ([API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)). |
| Stage C orchestration | `app-api/orchestrateApp.ts`, `apiOrchestrate`, and `core/orchestrate/orchestrate.ts`, `orchestrate`/`readSource`/`monophonic`, consume XML; parts are ranked by mean pitch, then the chosen melody part is reduced to non-overlapping notes with high-note preference. | One piano part does not supply a separately identified bass part; extraction can mix hand/voice material, and `preserveMelody` is not whole-piano preservation. | No dedicated Solo Piano GUI handoff found; piano E2E unverified. | PARTIAL / UNVERIFIED, not piano-to-orchestra ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Stage D blending | `core/song-mode/composerProfileHarmonyBlend.ts`, `installComposerProfileHarmonyBlend`/`colourSecondaryBlendGuitarPhrase`, serves Song Mode; no call from the fixed piano writers was found. | No piano-note transformation or piano lock contract. | No Solo Piano blend control; no piano E2E. | FUTURE ONLY for Solo Piano ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |

### Manual external routes that can be taught

- **Sibelius score development: MANUAL EXTERNAL WORKFLOW.** Generated MusicXML is available and Sibelius documents opening MusicXML as a new score or importing it into an existing score; the actual piano file still needs staff/voice/tie/pedal inspection in the installed Sibelius version ([persistence](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionPersist.ts), [Avid import documentation](https://resources.avid.com/SupportFiles/Sibelius/2020.6/Whats_New_in_Sibelius.pdf)).
- **Cubase arrangement: MANUAL EXTERNAL WORKFLOW.** Generated MIDI carries verified note timings and Coffee Run pedal events; Cubase’s import choices can retain or ignore tempo and convert controller data, so settings must be explicit rather than assumed ([export snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c), [Cubase import options](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/importing_audio_and_midi/importing_audio_and_midi_import_options_for_midi_files_r.html)).
- **Manual arrangement alongside other modules: MANUAL EXTERNAL WORKFLOW.** A musician may retain the piano export as a reference and manually assign copied notes to instruments in a notation/DAW project; this is editorial work outside Composer OS, not an automatic BHL, Quartet, Big Band or orchestration feature.

### Import hazards worth documenting

The fixture’s imported melody timeline contained 26 entries versus 25 primary-RH score notes, including a 2.5-beat note split into 2 + 0.5; therefore event identity cannot be assumed merely because the imported line appears recognisable (`musicXmlToImportTimeline`, `parseNotesFromPart`, `skylineMonophonic`) ([snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). The Coffee Run generic timeline reported C minor despite the writer’s zero-accidental minor key signature, so key/centre metadata needs explicit review before downstream generation; this is an observed importer result, not a judgement that the cue sounds in C minor ([Coffee Run writer](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)).

Do not work around these issues by silently renaming a piano part “guitar” or “bass”, changing analysis rules, or claiming preservation from a source hash alone. A future handoff needs explicit staff/voice mapping, tie handling, key interpretation and a piano-specific before/after event comparison.

## Six strongest unusual applications supported now

These are ranked recommendations for demonstrated source material, not claims of six independent generative modes. Each uses only current controls or a clearly labelled external musician action.

| Rank / application | Exact reproducible setup | Musical value and honest boundary |
|---|---|---|
| 1. Hear how little needs to change | Fixture; seeds `76018` and `76019`; inner voice on. | Compare a stable RH phrase against small LH/inner changes, rather than pretending the seeds generate unrelated pieces; fresh event hashes differ ([writer snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| 2. Remove one layer, not the melody | Fixture `76018`, inner on/off; optionally Coffee Run `76018`, inner on/off. | Study whether one held voice changes focus or clutter; exact attack counts are 45/44 and 110/108 respectively ([piano snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| 3. Trace a motif from one hand to the other | Fixture `76018`, inner off; inspect RH bar 1 and LH bar 6. | The writer takes the two-note motif head and transposes it down 12 semitones for the LH response; this is a concrete dialogue study, not a “counterpoint amount” control ([writer snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| 4. Compare statement, slowed fragment and return | Fixture `76018`, inner off; inspect bars 1–2, bar 5 and bars 7–8. | The fixed augmented two-note head in bar 5 and return in bar 7 let a musician examine recognisability and pacing without buying into an automatic coherence score ([writer snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| 5. Score a fixed miniature against a clock | Coffee Run `76018`, inner on; 24 bars, 4/4, 64 BPM. | Compare marker placement with a 90-second timeline, then decide manually whether the musical stress supports a chosen scene; no arbitrary hit-point solver is exposed here ([Coffee Run writer](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)). |
| 6. Turn an ending into a silence experiment | Fixture `76018`, inner off; inspect the ending and preserve a separate edit in Sibelius/Cubase. | Compare the 30-second bar grid with final note-off at 28.125 seconds, then make a clearly labelled manual alternative; the app has no silence-length dial ([export snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |

## Reproducible musical recipes

The eight CURRENT recipes below are supported by committed generation/export and the bounded checks described above. GUI labels are source-confirmed but need final click-through on the exact build; external steps are not claimed as already performed on the user’s Mac.

### Shared current GUI procedure

Open **Solo Piano** (`#/solo-piano`), choose **Piece**, enter **Seed**, set **RH inner voice**, and press **Generate**; the exact options are `Piano V1 fixture — 8 bars` and `Coffee Run — Variation — 24 bars`, and after success the page shows file paths and validation/duration information ([actual controls](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)). Below, “fixture” and “Coffee Run” mean those exact choices; use **Open output folder** or the displayed path to open the intended file externally, and make a separate copy before editing because repeat generation reuses its filename ([save behaviour](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionPersist.ts)).

### CURRENT: Three seed labels, two musical outcomes

- **Objective:** Learn the actual extent of seed variation without confusing filenames with compositions.
- **Required feature / inputs:** `Eight-bar fixture`; seeds `76018`, `76019`, `76020`; inner voice on.
- **Steps:** Generate each in turn using the shared procedure. Open the three MusicXML files in a notation application; compare the same bars at the same playback tempo.
- **Expected behaviour:** 76018 and 76020 have identical musical events, while 76019 differs; all have 45 attacks and the same fixed RH/form design ([writer and tests](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).
- **Listen for:** Can the changed supporting notes alter attention even when the melody remains stable?
- **Limits:** This is not “same harmony, three independent compositions”; different metadata does not count as a musical difference.

### CURRENT: One extra voice, two readings

- **Objective:** Assess whether an extra sustained line clarifies or distracts.
- **Required feature / inputs:** `Eight-bar fixture`; seed `76018`; first inner voice on, then off.
- **Steps:** Generate both files. Compare bar 7 in notation and audition the final two bars, using the same instrument and level.
- **Expected behaviour:** One sustained event is removed, giving 45 versus 44 attacks; the main phrase remains the prescribed fixture ([writer and tests](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).
- **Listen for:** Does the held note help the return or obscure it?
- **Limits:** “Inner voice” names an implementation lane, not a guarantee that it always lies below every melody pitch; do not describe it as automatic contrapuntal enrichment.

### CURRENT: Pass an idea to the left hand

- **Objective:** Study response rather than perpetual accompaniment.
- **Required feature / inputs:** `Eight-bar fixture`; seed `76018`; inner voice off.
- **Steps:** Generate; inspect the opening RH D–E in bar 1 and the LH D–E an octave lower in bar 6. Annotate the relationship on a copy, and play or audition the passage.
- **Expected behaviour:** The LH response uses the two-note head transposed down 12 semitones; the fixed part also includes sustained and broken-chord behaviour ([`composePianoV1`](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).
- **Listen for:** Is the response heard as a related voice, rather than bass support alone?
- **Limits:** The GUI cannot choose the response interval, location or hand-role policy.

### CURRENT: Make a motif-recognition study

- **Objective:** Compare repetition with duration change and return.
- **Required feature / inputs:** `Eight-bar fixture`; seed `76018`; inner voice off.
- **Steps:** Generate; mark bars 1–2 as statement, bar 5 as the augmented two-note head, bar 6 as LH response/RH continuation, and bars 7–8 as return/ending. Audition in order, then compare the excerpts separately.
- **Expected behaviour:** The fixed writer uses an augmentation step and restores the opening RH cell at the return ([motif plan and tests](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).
- **Listen for:** Does the return feel prepared, merely repetitive, or too brief?
- **Limits:** These are listening questions, not outcomes asserted by the test; no user-selectable motif-development menu exists in Solo Piano.

### CURRENT: A 90-second film timing laboratory

- **Objective:** Evaluate the relationship between musical spans and visual timing.
- **Required feature / inputs:** `Coffee Run variation`; seed `76018`; inner voice on.
- **Steps:** Generate; open MusicXML for marker text and MIDI in a new external DAW project using 64 BPM. Place a 90-second picture or timeline reference alongside it without changing the imported timing.
- **Expected behaviour:** 24 bars in 4/4 span 90 seconds; bar starts for 5/9/13/17/21 occur at 15/30/45/60/75 seconds, and the final MIDI note-off is 90 seconds ([Coffee Run writer and timing tests](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)).
- **Listen for:** Which musical change supports the picture, and which feels misplaced?
- **Limits:** This is the fixed cue, not a newly composed response to the picture; MIDI marker-track export was not found in `midiScoreWriter`, so add picture markers manually rather than expecting the MusicXML words to appear as DAW markers ([export implementation](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).

### CURRENT: Develop a sketch in Sibelius

- **Objective:** Turn a generated study into a consciously edited score.
- **Required feature / inputs:** `Eight-bar fixture`; seed `76018`; inner voice off; generated MusicXML.
- **Steps:** Generate and copy the file outside the generated-output location. Open it as a new Sibelius score, or use an existing piano score’s File → Import → Browse workflow; inspect the preview and staff mapping, then save a separate `.sib` working copy ([Avid’s documented import workflow](https://resources.avid.com/SupportFiles/Sibelius/2020.6/Whats_New_in_Sibelius.pdf)).
- **Expected behaviour:** The source is a one-part piano grand staff with distinct hand/voice allocation; validate that allocation, ties and rests after import before editing ([piano export contract](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).
- **Listen for:** Does one deliberate change to the ending improve the phrase in its intended context?
- **Limits:** Sibelius import/rendering was not executed here; editing is manual, and changes do not feed back into Solo Piano automatically.

### CURRENT: Develop a piano performance in Cubase

- **Objective:** Separate composition from performance shaping and arrangement.
- **Required feature / inputs:** `Coffee Run variation`; seed `76018`; inner voice on; generated MIDI.
- **Steps:** Generate and preserve the original MIDI. Import into a new Cubase project, assign a piano instrument, verify 64 BPM, inspect notes and CC64, then save a separate Cubase project; if importing into an existing project, review whether master-track/tempo events will be ignored ([Cubase import options](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/importing_audio_and_midi/importing_audio_and_midi_import_options_for_midi_files_r.html)).
- **Expected behaviour:** Source MIDI contains 110 note events and 44 pedal events with tested timing parity; it is a combined piano performance, not promised separate RH/LH instrument tracks ([piano MIDI implementation](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).
- **Listen for:** Do sound, voicing emphasis and pedal suit the material without changing its notes?
- **Limits:** This audit did not import into Cubase, verify instrument assignment or hear the result; sample tails may continue beyond the final note-off.

### CURRENT: Contrast the short study with the fixed cue

- **Objective:** Compare a compact study’s pacing with a longer prescribed film form.
- **Required feature / inputs:** Both examples; seed `76018`; inner voice off for both.
- **Steps:** Generate both; compare openings, response passages, register changes and endings in notation or a DAW. Keep the tempo unchanged at 64.
- **Expected behaviour:** The fixture spans 30 seconds and Coffee Run 90; they are separate fixed writers, not shorter/longer versions of one general algorithm ([piano API](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)).
- **Listen for:** How does the amount and placement of return material affect perceived continuity?
- **Limits:** Do not call the fixture a separately generated general composition, or describe this as the requested Coffee Run-versus-General Piano comparison.

### AFTER G2: Candidate recipes, not current instructions

These inputs are proposed acceptance fixtures, not supported request objects or verified control labels. Each recipe requires G1 consumption and G2 live-GUI proof first; if the actual supported model differs, revise the recipe rather than invent a matching control.

| Proposed exercise | Exact proposed inputs | Required feature / future steps | Expected testable behaviour, listening question and limitation |
|---|---|---|---|
| Same harmony, three compositions | 16 bars, 4/4, 80 BPM; `Cmaj7 \| Am7 \| Dm7 \| G7` repeated four times; seeds `76018`, `76019`, `76020`; otherwise identical settings. | General writer must consume the progression and seed; use only verified G2 controls once present. | Require genuinely distinct event plans, stable harmony and reproducibility; ask whether the alternatives develop different phrases, not just randomise details. Current fixture does not supply three such outputs ([current API restriction](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fapp-api%2FpianoCompositionApp.ts)). |
| Same seed, two progressions | 16 bars, 80 BPM, seed `76018`; progression A `Cmaj7 \| Am7 \| Dm7 \| G7` ×4; B `Am7 \| Fmaj7 \| Dm7 \| E7` ×4. | Verified progression entry, parsing and note-generation influence. | Require actual note changes, not symbol-only changes; ask how phrase shape responds. Same seed does not guarantee the same melody unless that is separately supported. |
| A new 90-second miniature | 24 bars, 4/4, 64 BPM, seed `76018`; `Am \| F \| Dm \| E7` ×6; General Piano, not Coffee Run. | Verified arbitrary supported length, tempo and progression; generate through confirmed G2 labels. | Grid duration should be 90 seconds; separately test final note-off and silence. This does not promise hit-point alignment or a cinematic emotional result. |
| C-major versus A-minor treatment | 16 bars, 80 BPM, seed `76018`; C treatment `C \| F \| Dm \| G` ×4; A treatment `Am \| Dm \| F \| E7` ×4; explicit tonal centre only if genuinely supported. | Verified harmonic input and, if claimed, consumed key/centre setting. | Compare notes, ending and tonal emphasis, not key labels; ask which treatment suits the brief. Changing both progression and centre is a treatment comparison, not an isolated key-control experiment. |
| Length at fixed tempo | 8, 16 and 24 bars in 4/4 at 80 BPM; seed `76018`; `C \| Am \| F \| G` repeated 2/4/6 times. | Length-sensitive form and closure, not merely truncation. | Grid durations 24/48/72 seconds; ask whether each ending feels earned. Every length must be supported and validated before publication. |
| Coffee Run versus new piano composition | Fixed Coffee Run `76018`, inner off; General Piano at 24 bars/64 BPM/seed `76018`, using the new-miniature progression above. | Both paths visible and verified; clearly label the different harmonic plans. | Compare form and development without attributing differences to one parameter; no general result is currently available to describe. |

No step-by-step G2 screenshots, expected pitches or emotional outcomes should be drafted until the real implementation is available. Composer profiles, BHL-world selection and piano-to-orchestra generation remain FUTURE unless separately evidenced; G2 itself is not a blanket integration approval.

## Proposed manual structure and complete table of contents

**Recommendation: a 14-page current-capability edition, with conditional replacement pages after G2.** The publication should use musician language in the body and keep technical evidence/build details in a compact colophon or companion verification ledger.

The six main recipe cards should be the six ranked applications above, with the Sibelius and Cubase chapters providing the two additional reproducible workflows. This avoids inflating the guide with repeated generation instructions.

| Page | Complete proposed contents | Reader objective / key content | Musical example / illustration |
|---|---|---|---|
| 1 | **Cover; Read this first** | Establish title, tested build and the distinction between fixed studies and general composition. | Real piano score crop; no invented UI. |
| 2 | **Quick Start: your first piano study** | Find Solo Piano, set the three real controls, generate, locate and preserve files. | Actual page screenshot with four numbered callouts. |
| 3 | **The piano paths: what is available** | Eight-bar study; Coffee Run; General Piano status box only. | Two current-path cards and a clearly unavailable/unverified third-path note. |
| 4 | **Two hands, several musical jobs** | Explain melody, sustained support, broken chords, response and optional RH layer. | Fixture bars 1–4 plus bar 6, with hand-role annotations. |
| 5 | **Motif: statement, change, return** | Show relation between a cell, response, augmentation and return. | Fixture bars 1–2, augmented head in 5, LH response in 6, and return/ending in 7–8, with matching cells highlighted. |
| 6 | **Seeds, inner voices and repeatable versions** | Explain the bounded seed behaviour, on/off layer and overwrite safety. | 76018/76019 note comparison; small 76018/76020 equality panel. |
| 7 | **Creative recipes: subtle variation and one extra voice** | Recipe cards 1–2 from the ranked list. | Aligned two-version excerpts of the exact changed bars. |
| 8 | **Creative recipes: hand dialogue and motif recognition** | Recipe cards 3–4. | RH statement beside LH response; statement versus augmentation. |
| 9 | **Creative recipes: timing and silence** | Recipe cards 5–6. | 90-second cue strip and the fixture’s final rest/sustain. |
| 10 | **Coffee Run and film-cue timing** | Explain fixed 24-bar form, marker positions, pedal, 64 BPM and limits. | Actual marker-bearing score excerpt plus a calculated timeline; regular 15-second ruler divisions must not be called the musical sections. |
| 11 | **Develop the score in Sibelius** | Preserve the original, import, check voices/ties/pedal, edit and save separately. | Real import preview and verified piano grand staff. |
| 12 | **Develop the performance in Cubase** | Import MIDI, verify tempo/CC64, assign a sound, develop an independent arrangement. | Real imported piano-roll/controller view. |
| 13 | **Working alongside Composer OS; current limits and future options** | Teach manual external work only; name unverified internal routes and General Piano status. | Simple labelled workflow diagram: real export → external editor; no fake module handoffs. |
| 14 | **Troubleshooting; musical evaluation checklist; build/evidence note** | Resolve wrong build, file opening, repeated seeds, missing duration and unsupported expectations. | Compact problem/action table and human listening/playing checklist. |

**After verified G2:** Replace page 3’s status box with the actual general workflow; replace page 6 with harmony/seed parameter truth; swap selected recipe cards for the newly reproducible general exercises. Use pages 15–16 only if the evidence-backed new material needs them; do not pad a limited fixed-study guide to appear more capable.

### Main-manual vocabulary

Use “study”, “cue”, “version”, “right-hand line”, “left-hand response”, “held note”, “harmonic progression”, “return”, “saved score” and “separate working copy”. Avoid “fixture”, “API”, “event hash”, “voice 3”, “request schema” and “IPC” except in the evidence ledger; quote the actual `Piano V1 fixture — 8 bars` label once so the reader can find it.

Do not use “the composer understands your brief”, “unlimited variations”, “intelligent orchestration”, “stylistically authentic” or “performance-ready” without independent supporting evidence. Questions such as “Does the bass answer the melody?” are appropriate; untested claims such as “the bass creates a compelling conversation” are not.

## Illustration and example capture plan

No application screenshot or notation plate has been fabricated for this report. The following is a production specification: “available” means source functionality/material exists, not that a matching live screenshot was captured here.

| Visual | Exact source/settings | Capture status and acceptance |
|---|---|---|
| Solo Piano overview | Matching build; fixture, seed 76018, inner on. | Available after launching the actual GUI; show Piece, Seed, RH inner voice, Generate, Regenerate and Open output folder ([page](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/apps%2Fcomposer-os-app%2Fsrc%2Fpages%2FSoloPianoPage.tsx)). |
| Generated result | Same setup after Generate. | Capture real displayed duration and paths; crop/redact irrelevant personal path details, not control labels. |
| Annotated grand staff | Fixture 76018, inner off, bars 1–4. | Actual generated MusicXML available; render/import in Sibelius, then inspect voice/tie/spacing before annotation. |
| RH/LH independence | Fixture bars 1–4 plus the LH response in bar 6, same setup. | Highlight attacks and sustained notes; do not illustrate a hand split inferred from pitch alone. |
| Seed comparison | Fixture 76018 versus 76019, inner on; LH bar 4 and inner bar 7. | Use actual changed notes; include a note that 76020 repeats 76018’s musical events ([writer snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). |
| Motif statement and return | Fixture 76018, inner off; bars 1–2 and 7–8. | Use source-derived excerpts with the same horizontal scale and exact bar numbers. |
| Inner-layer A/B | Fixture bar 7 or Coffee Run bars 17–18, 76018 on/off. | Show only the actual added/removed sustained line; do not suggest accompaniment regeneration. |
| Harmony illustration | Coffee Run’s actual fixed chord-labelled bars. | Available as a fixed-score example; editable-harmony A/B is AFTER G2, not a current screenshot ([writer](https://github.com/mikeb55/creative-engines/blob/824d99b241df3db9a72d47f91f659e1aa312aa1c/engines%2Fcomposer-os-v2%2Fcore%2Fpiano%2FcoffeeRunVariation.ts)). |
| Film timeline | Coffee Run 76018, inner on; word-bearing markers at bars 1/3/11/12/17/19/21/24. | A calculated diagram is acceptable if labelled as an explanation, not an app screenshot; align with actual marker words, not invented four-bar sections. |
| MusicXML handoff | Real result path, Sibelius import/open screen and imported score. | Requires local Sibelius verification; do not substitute another app’s screen. |
| MIDI handoff | Coffee Run MIDI in Cubase with tempo and CC64 visible. | Requires local Cubase capture; confirm imported timing and pedal, not just a file-open dialog. |
| General Piano controls | Actual verified G2 only. | Unavailable at this snapshot; no mockup presented as a real control. |

For notation plates, retain the unannotated source image and an annotated derivative. Record commit, path, seed, inner setting, exact bar range, renderer/application version and any manual engraving adjustment; never redraw notes for visual convenience without identifying the change.

## Accuracy risks, unresolved questions and acceptance gates

| Risk | Publication decision / required evidence |
|---|---|
| Local G1/G2 may be ahead of GitHub | Obtain `git status`, exact diff, local test commands/output and actual GUI demonstration; preserve uncommitted work and do not reset or overwrite it. |
| A controls screenshot mistaken for capability proof | Trace every documented input to consumed generation behaviour and compare notes, harmony and timing, not just manifest text. |
| Seed overclaim | Publish the tested parity limitation and Coffee Run’s unchanged events; promote broader variability only after new proof. |
| Fixed writer mistaken for parameterised composition | Keep fixed paths separate from General Piano in headings, captions and recipe tags. |
| Harmony label mistaken for harmonic recomposition | Inspect actual sounding notes for progression changes; the current hardcoded writer is not such evidence. |
| XML pass mistaken for notation quality | Open and inspect every published example in Sibelius; check ties, backup/voice alignment, pedal, dynamics, stems, spacing and page turns. |
| MIDI pass mistaken for expressive playback | Inspect imported notes, tempo and CC64 in Cubase, then listen; do not infer audible dynamics/articulation fidelity from pitch/timing parity. |
| Duration ambiguity | Distinguish bar-grid end, final note-off, pedal release and audio/reverb tail; the fixture already demonstrates different grid and note-off endpoints. |
| Source locks overclaimed | Reject “import any piano sketch and preserve it”; current piano locks check matching material and are not a GUI arrangement facility. |
| Import reductions/key interpretation | Keep current piano-to-module instructions out of the guide until the observed role, tie and key issues are resolved and retested. |
| Overwriting generated work | State deterministic naming clearly; preserve originals and manual edits outside the generated filename. |
| File/folder opening misunderstood | Verify Open output folder and its error message on the target OS; the page displays file paths, not individual file-open buttons, so teach opening from Finder or the destination application. |
| Missing original Coffee Run source | Do not claim a fresh source-versus-variation comparison; retrieve the original before publishing that specific comparison. |
| General help is stale | Do not use older generic help text to infer Solo Piano controls or current output paths. |
| Musical quality inferred from tests | Keep automated checks separate from listener, pianist and composer decisions; no automatic quality score or approval. |

These risks derive from the bounded code/test audit above; publication should retain unresolved items rather than turn them into reassuring prose ([inspected snapshot](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)).

### Questions to resolve before final production

- **G1/G2 identity:** What exact files, commit or uncommitted diff implement General Piano, and which inputs genuinely affect notes?
- **Running build:** Which bundle/build is actually being demonstrated, and does it contain the audited source?
- **Supported general ranges:** Which keys, chord spellings, lengths, metres and tempos are accepted, rejected or normalised?
- **Form behaviour:** Does changing length recompute development and closure, or simply repeat/truncate material?
- **Musical ownership:** Does a key/profile/secondary profile alter notes, only harmony symbols, or metadata alone?
- **Delivery:** Do file actions open the intended files in the installed Sibelius/Cubase versions, with the expected output root?
- **Acceptance:** Which examples has Mike heard or played, and which are only technically generated?

### Musician’s evaluation checklist for the guide

- **Melody:** Is there a memorable idea, and can its returns be recognised?
- **Left hand:** Does it support, answer or interrupt with a clear musical purpose?
- **Harmony:** Do the written notes make the intended colour audible, rather than merely displaying chord names?
- **Register:** Are the hands balanced and playable at the intended tempo?
- **Space:** Do rests and held notes contribute to pacing?
- **Form:** Does development lead somewhere, and does the ending suit the brief?
- **Film use:** Does the cue support the picture without relying on coincidental bar markers?
- **Performance:** Are fingering, voicing, pedal and dynamics convincing in practice?
- **Authorship:** Which decisions should the composer retain, alter or reject?

## Recommended production method for PDF and editable DOCX

Use a **verified example pack and one editable DOCX master**, with PDF exported from that same master. This keeps notation, captions, page numbering and wording aligned across both deliverables instead of maintaining two independent layouts.

Recommended sequence:

1. Freeze the capability ledger against the actual source and running build; exclude unresolved G2 recipes.
2. Generate the agreed examples through the real GUI, preserve their MusicXML/MIDI, and record exact inputs and checksums.
3. Open in Sibelius, inspect notation and export clean score plates; capture real Solo Piano and Cubase screens separately.
4. Draft the concise 14-page text from this approved structure, using existing Composer OS manual visual conventions where appropriate.
5. Build an editable DOCX with named paragraph/table/caption styles, restrained typography, an updating table of contents and embedded figure descriptions.
6. Export that DOCX to PDF using one recorded Word/LibreOffice version; inspect every page of both rendered outputs for clipping, illegible notation and changed pagination.
7. Deliver DOCX, PDF and an example/evidence manifest; include a short technical verification record distinct from musical sign-off.

The existing `docs/manuals/v3.2/build.py` uses ReportLab and imports the BHL manual engine; it is useful as a style/content precedent but is not evidence of an editable-DOCX pipeline ([existing publication architecture](https://github.com/mikeb55/creative-engines/commit/824d99b241df3db9a72d47f91f659e1aa312aa1c)). Do not make reverse-conversion of a PDF into DOCX the primary workflow.

## Copy-ready Cursor prompt: final production only after verification

This is a proposed future prompt, not an instruction executed by this audit. It deliberately stops at unresolved capability evidence rather than asking Cursor to implement G1/G2 or fabricate a manual.

```text
CURSOR PROMPT — SOLO PIANO MUSICIAN’S GUIDE V1.0
VERIFY FIRST; DOCUMENTATION ONLY; NO APPLICATION CODE CHANGES

Repository: /Users/user/Documents/DEVS/creative-engines
Research baseline: 824d99b241df3db9a72d47f91f659e1aa312aa1c
Input: Solo Piano Musician’s Guide: Research and Manual Design V1.0

Produce the final illustrated musician’s guide ONLY AFTER the relevant
GUI capabilities and example files have been verified.

SAFETY AND SCOPE
- Read CLAUDE.md, .cursor/rules/ and docs/GCE_CANONICAL.md.
- Record current branch, exact HEAD and git status. Inspect any local G1/G2
  diff without resetting, stashing, deleting, committing or overwriting it.
- Review the active Cursor result before taking another development step.
- Do not implement or repair G1/G2, any composer engine, exporter, importer
  or GUI. Do not install/replace an app or run a delete-first installer.
- Preserve source music, existing applications, user data and exports.
- Write documentation outputs only to a clearly named new guide folder.
- No Git commit/push unless separately authorised.

CAPABILITY GATE
1. Identify the actual running source/build. A source label or package
   version is not installed-app proof.
2. Verify the two fixed paths through the real Solo Piano GUI:
   Piece choices "Piano V1 fixture — 8 bars" and
   "Coffee Run — Variation — 24 bars", with Seed and RH inner voice.
3. If General Piano G1/G2 is present, trace every proposed manual control
   to code that consumes it. Exercise the live GUI, not just an API.
4. Compare exported note events, harmony, duration and metadata separately
   for seed, progression, key, length, tempo and inner-voice changes.
5. Prove identical-input replay and record exact normalisation/rejection.
6. If a capability needed by a planned chapter is unavailable or cannot
   be verified, STOP before final publication and return a concise blocker
   report. Do not implement the missing feature or invent its controls.
   An explicitly approved current-only edition may omit General Piano.

MANDATORY CURRENT REGRESSIONS
- Fixture seeds 76018/76019/76020, inner on and off.
- Record whether 76018 and 76020 still have identical events and whether
  76019 differs. Do not promise unlimited or three independent versions.
- Coffee Run with those seeds and both inner settings; establish whether
  seeds change notes or only metadata.
- Baseline expected counts, if unchanged:
  fixture 45/44 attacks; Coffee Run 110/108 attacks and 44 pedal CC events.
- Verify MusicXML/MIDI pitch, onset and duration parity including ties.
- Distinguish 30-second fixture bar grid from its final note-off, and
  Coffee Run’s 90-second final note-off from audible release/reverb tails.
- Confirm actual output folder and deterministic filename overwrite
  behaviour. Preserve an untouched copy before any edit.
- Check Generate, Regenerate and Open output folder on the target OS.
  The baseline page displays MusicXML/MIDI paths but has no individual
  file-open buttons; open the files from Finder or the destination app.
  Verify any genuinely new controls before documenting them.

GENERAL PIANO GATE, ONLY IF PRESENT
- Use the AFTER G2 fixtures from the research report only if their
  parameters are genuinely supported; otherwise document the restriction.
- Verify same-harmony/different-seed and same-seed/different-harmony
  sounding-event changes.
- Verify 8/16/24 bars at 80 BPM if supported, and a distinct General Piano
  24-bar/64-BPM composition. Do not relabel Coffee Run as general generation.
- Verify C-major/A-minor treatment without inferring musical effect from
  a key label alone.
- Do not assume composer profiles, BHL worlds, Stage D blending or Stage C
  orchestration are connected to Solo Piano.

CROSS-MODULE RULE
Do not advertise piano-to-orchestra or any other internal handoff unless
the actual GUI route succeeds with a generated piano file and its note,
voice, tie, key and source-preservation behaviour is checked end-to-end.
Known audit warnings: Pentatonic did not identify piano guitar/bass roles;
BHL rejected the piano export for no bass part; generic melody import was
not event-identical and Coffee Run key interpretation required review.
Do not work around this by silently renaming parts or changing solvers.
Otherwise include only clearly labelled manual external workflows.

EXAMPLES, SCREENSHOTS AND MUSICAL REVIEW
- Generate every published example from recorded exact GUI inputs.
- Preserve MusicXML, MIDI, screenshots and an evidence manifest.
- Capture actual Solo Piano screens. No mockups passed off as controls.
- Open the chosen MusicXML examples in Sibelius; check grand staff,
  hand/voice allocation, ties, rests, dynamics, pedal and readable layout.
- Import chosen MIDI into Cubase; verify tempo, note timings and CC64.
- Record software versions and actual observed behaviour.
- If access to Sibelius/Cubase or the real GUI is unavailable, report the
  precise blocker rather than substituting a screenshot or claiming it.
- Separate automated tests, notation inspection, heard playback,
  physical piano playing and Mike’s artistic judgement.
- Do not claim musical excellence or approval from passing tests.

MANUAL
Title:
COMPOSER OS
SOLO PIANO COMPOSER
MUSICIAN’S GUIDE V1.0

Use the research report’s proposed 14-page structure; allow 12–16 pages
only when the verified material justifies it. Main text is for musicians,
not developers. Explain hands, harmony, motif, seeds, form, duration,
file preservation, listening questions and external score/DAW development.
Separate fixed studies from General Piano on every relevant page.
Include six strong creative applications and at least eight reproducible
exercises across recipe cards and external-workflow chapters.
If only the fixed paths are approved, use the eight CURRENT recipes.
Keep AFTER G2/FUTURE material in a short clearly labelled appendix, not
current step-by-step instructions.

PRODUCTION AND QA
- Reuse suitable Composer OS manual visual conventions; avoid invented
  branding and repetitive filler.
- Create one styled, editable DOCX master, then export the final PDF from
  that same document.
- Use real, inspected score plates and real application captures.
- Include a complete table of contents, figure captions, page numbers,
  tested build/date, limitations and musical evaluation checklist.
- Keep file/function evidence in a companion capability ledger, with
  exact commit URLs and recorded run results.
- Inspect every rendered page for clipping, tiny notation, broken links,
  missing symbols and disagreement between DOCX/PDF.

DELIVERABLES
1. Composer-OS-Solo-Piano-Musicians-Guide-V1.0.docx
2. Composer-OS-Solo-Piano-Musicians-Guide-V1.0.pdf
3. Example pack with source MusicXML/MIDI and actual captured illustrations.
4. Capability/accuracy ledger with exact inputs, build identity, filenames,
   checksums, test receipts, manual checks and unresolved limitations.
5. Brief completion report separating technically verified, manually
   observed, musically reviewed and still unverified items.

Do not call the guide complete if a published workflow has not passed its
stated acceptance gate. Stop and report missing evidence instead.
```

- **AIMS:** Document the app musicians can actually use; make each recipe reproducible.
- **AIMS:** Preserve source material and build safety; keep future integrations out of current instructions.
- **AIMS:** Deliver matching editable and printable guides only after the relevant GUI, notation and DAW checks.
