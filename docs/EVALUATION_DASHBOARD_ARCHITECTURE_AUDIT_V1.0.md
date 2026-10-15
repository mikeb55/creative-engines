# Evaluation Dashboard Architecture Audit V1.0

Audit date: 2026-10-15.  
Git baseline: `7df4c1f47c93f7c85f24dc4ef5ea835471debd9b` (`main` = `origin/main`).  
Mode: read-only source audit. No production code was changed.

This document maps the research brief *Composer OS V3.1 — Musical Evaluation Dashboard* onto code that exists. It does not add a dashboard, a metric, or an artistic-quality score.

## 1. Sources consulted

| Document | Location | In this repository? |
|---|---|---|
| Composer OS V3.1 — Musical Evaluation Dashboard Research Brief | `/Users/user/Downloads/Composer OS V3.1 — Musical Evaluation Dashboard Research Brief.md` | No |
| BMEF-100 V2.0 — Bryant Musical Evaluation Framework | `/Users/user/Downloads/BMEF-100 V2.0 — Bryant Musical Evaluation Framework.md` and `ECM-Album-Nov-2027/WWH-RADICAL-PERFORMANCE-EDITIONS/BMEF-EVALUATIONS/` | No |

The brief was read in full. Its five views and metric ids T1–T7, H1–H8, M1–M5, R1–R7, I1–I5, P1–P2, C1–C6 are used below as the research map. Nothing in that brief was invented for this audit.

BMEF-100 V2.0 was read through its gates, 70-point core, 30-point specialist modules, evidence levels, confidence caps, and decision table. All criteria, weights, thresholds, and rubric wording in that document are marked **[Proposed]** by its author. This audit does not add gates or thresholds that the document does not state.

## 2. Git and source safety

Local `main` and `origin/main` both pointed at `7df4c1f47c93f7c85f24dc4ef5ea835471debd9b` before this document was written.

Unrelated dirty and untracked files were present and were left untouched:

- Modified: `BHL-BATCH-D-VERIFIED-FEATURES.md`, `engines/composer-os-v2/tests/bhl/bhlBatchD.test.ts`
- Untracked: `.DS_Store`, `.cursor/rules/bhl-musescore-workflow.mdc`, `.tmp-bhl-engrave/`, `.tmp-bhl-manuals/`, `.tmp-hexatonic-h3/`, `.tmp-hexatonic-h4/`, `.tmp-hexatonic-h5a/`, `.tmp-pentatonic-phase2e/`, `BHL-DEVELOPMENT-CHECKPOINT-2026-10-13.md`, `docs/MORPH_DQA_V0.1-PILOT.md`, `docs/WPS_V1.5_CAPABILITY_GAP_AUDIT.md`, `engines/composer-os-v2/scripts/bhlBatchDClosureExamples.ts`, `engines/composer-os-v2/scripts/wwhEV2Liquid.ts`, `reference-materials/`

The nine While We're Here duo leadsheets named in `engines/composer-os-v2/tests/pentatonicDev6a.test.ts` were hashed and matched the recorded SHA-256 values. Those files live outside this repository, under `ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS`. They were not opened for writing.

| File | Recorded SHA-256 | Result |
|---|---|---|
| 01-Black-Aura-Duo-Leadsheet-V1.1.musicxml | `b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb` | match |
| 02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml | `a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56` | match |
| 03-The-Mirror-Duo-Leadsheet-V1.0.musicxml | `0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940` | match |
| 04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml | `9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1` | match |
| 05-Orbit-Duo-Leadsheet-V2.1.musicxml | `911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db` | match |
| 06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml | `c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777` | match |
| 07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml | `315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4` | match |
| 08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml | `23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d` | match |
| 09-After-Everything-Duo-Leadsheet-V1.0.musicxml | `6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0` | match |

Frozen WPS V1.1 under `engines/composer-os-v2/core/wwh/wps/baseline/v1.1/` was not edited.

## 3. Status vocabulary

| Status | Meaning in this audit |
|---|---|
| Implemented | A production function computes the named musical fact, and a test exercises it. |
| Partially implemented | A related function exists. It does not compute the research metric, or it covers only part of it. |
| Documented only | Described in docs or in the research brief. No production function. |
| Not implemented | No production function and no in-repo specification beyond the external brief. |

Similarly named functions are not treated as the same analysis. The distinctions that matter are called out in section 4.

## 4. Source-code inventory

### 4.1 BHL candidate comparison and refinement — implemented

| Item | Detail |
|---|---|
| File | `engines/composer-os-v2/core/bhl/bhlCandidates.ts` |
| API | `generateBhlCandidateSet`, `composeBhlCandidate`, `compareBhlCandidateXml`, `refineBhlCandidate`, `summariseBhlEvidence` |
| Computes | Three stored guitar candidates from one locked phrase plan. Candidate 2 advances the rhythm mode. Candidate 3 advances the phrase arc. Core-b riffs vary an existing cell transform (`displace`, `fragment`, `rest`, `continue`). Comparison re-reads stored MusicXML through `readBhlEvidence` and returns attack counts, whole-bar silence counts, motion-kind counts, and notable-dissonance counts. Refinement composes a child candidate with `parentId` set. `musicalQualityScore` is copied through as `null`. |
| Tests | `tests/bhl/bhlCoreBCandidates.test.ts`, `tests/bhl/bhlGenerationRefine.test.ts`, `tests/bhl/bhlBatchB.test.ts`, `tests/bhl/bhlGuiWorkflow.test.ts` |
| GUI | Yes. `#/bhl` (`BhlComposerPage`) calls `apiBhlCandidates`, `apiBhlCompare`, and `apiBhlRefine` in `app-api/bhlApp.ts`. |
| Limits | Comparison is a count delta, not a note-level diff. The notice on `BhlEvidenceComparison` says the numbers are differences, not a ranking. Candidates are generator variants, not arbitrary imported scores. |

### 4.2 BHL evidence and validation receipts — implemented, with a narrow receipt

| Item | Detail |
|---|---|
| File | `engines/composer-os-v2/core/bhl/bhlEvidence.ts` |
| API | `readBhlEvidence`, `compareBhlEvidence`, `formatBhlEvidenceReport` |
| Computes | A rational-time timeline of notes, rests, and ties. From that timeline: contrary / oblique / parallel / similar motion when both voices are covered between attacks; vertical intervals; entries; register crossings; silence kinds including whole-bar rests; a short opening-cell motif search (exact, transposition, augmentation, diminution, rhythmic displacement, fragmentation, return); interval questions for interval classes 1, 2, 6, 10, and 11; per-bar attack counts and sounding coverage; guitar/bass activity overlap. `musicalQualityScore` is the constant `null`. `awaitingComposerVerification` is the constant `true`. |
| Related receipts | `bhlVerify.ts` `verifyBhlLocks` and `verifyRecordedSourceSha`. `bhlIngest.ts` `sha256File` / `ingestBhlSource`. Candidate objects store `xmlSha256` plus `evidenceSummary`. |
| Tests | `tests/bhl/bhlEvidence.test.ts` asserts `musicalQualityScore === null`. `tests/bhl/bhlSourceLock.test.ts`. `tests/bhl/bhlIntentAudit.test.ts`. |
| GUI | Partial. `apps/composer-os-app/src/bhl/BhlEvidencePanel.tsx` shows events, motions, entries, crossings, silences, metre, and questions, plus human marks Accept / Revise / Intentionally retain / Not relevant. The panel type omits motifs, intervals, tensions, density, and activity. |
| Limits | Motif search is a window over one voice's interval string. It is not SIATEC, not COSIATEC, and not a perceptual motif. "Tension" here is a named dissonance question, not Farbood, spiral-array, or tonal-pitch-space tension. Receipts are candidate summaries and lock reports, not a versioned metric registry. |

`bhlIntentAudit.ts` `auditBhlIntentions` checks whether a composed region matches its declared intention. Status values are `VERIFIED`, `NOT OBSERVED`, and `INDETERMINATE`. That is a generation audit, not a BMEF rating.

### 4.3 Pentatonic collection distance — implemented

| Item | Detail |
|---|---|
| File | `engines/composer-os-v2/core/pentatonic/fieldDistance.ts` |
| API | `measureFieldDistance`, `minimumAssignment`, `fieldFromResource`, `fieldFromPitchClasses`, `registeredFieldsAround` |
| Version | `pentatonic-field-distance-7a` |
| Computes | Shared pitch classes, pitch classes present on only one side, minimum pitch-class assignment cost, mean chromatic displacement, centre relationship (`SAME_CENTRE`, `SHARED_CENTRE_TONE`, `DIFFERENT_CENTRE`, `UNKNOWN`), continuity potential, and a five-note distance class: `IDENTICAL`, `NEAR`, `RELATED`, `OUTSIDE`, `REMOTE`. If register MIDI values are supplied, voice motion is labelled `REGISTER`; otherwise `PITCH_CLASS_PROXIMITY`. |
| Tests | `tests/pentatonicDev7.test.ts` |
| GUI | The distance function is called from `apps/pentatonic-options-v2/src/advisoryPresentation.ts`. The Composer OS `#/pentatonic` workflow does not display this function's raw report. |
| Limits | Cutoffs assume five-note collections (`sharedCount >= 5` is identical). Do not reuse this classifier on hexatonic sets. |

### 4.4 Hexatonic harmonic relationships — implemented

| Item | Detail |
|---|---|
| Files | `core/hexatonic/relations.ts`, `collections.ts`, `triadPairs.ts`, `phraseGeneration.ts`, `evidence.ts` |
| API | `measureHexatonicDistance`, `classifyHexatonicDistance`, `placementAgainstHome`, `returnHomePath`, `exchangeTriads`, `nearestTone`, `transposeRegisteredScalar`, `listHexatonicWpsPairs`, `generateHexatonicPhrase` |
| Computes | The same shared-tone and minimum-assignment idea as pentatonic distance, with cutoffs offset from the live cardinality. A six-note set does not inherit the five-note cutoffs. Also: inside/outside subset test, a three-step inside → outside → return path, triad exchange (shared tones and moving voices), nearest tone, symmetry landings for whole-tone and augmented collections, and WPS resolution/tension pairs taken from `wpsTonalityVaultRecord.ts`. |
| Tests | `tests/hexatonicH1Regression.test.ts`, `tests/hexatonicH2.test.ts`, `tests/hexatonicH3.test.ts`, `apps/composer-os-app/tests/hexatonicPanel.test.ts` |
| GUI | Yes, as a phrase workspace. `#/hexatonic` (`HexatonicEnginePage`) generates a phrase, shows selection and preview text, and can save a project and export MusicXML. It is not a harmonic-analysis dashboard. |
| Limits | `HEXATONIC_EVIDENCE_STATUS` is `'fixture'`. `HEXATONIC_ARTISTIC_APPROVAL` is `false`. `HexatonicBmef` is a descriptive bundle on a generated six-bar phrase. It is not BMEF-100 V2.0. |

### 4.5 Inside / outside / return — partially implemented, three different meanings

| Mechanism | File | What it actually is |
|---|---|---|
| Pentatonic distance class | `fieldDistance.ts` `DistanceClass` | `OUTSIDE` and `REMOTE` are classification bands on shared-tone count and mean motion. |
| Pentatonic path role | `pathIntelligence.ts` | `OUTSIDE`, `HOME_OUTSIDE_HOME`, and `DEFAULT_OUTSIDE_BUDGET` plan whether a colour path may leave home and must return. `assessGrounding` is a planning gate. |
| Pentatonic compare slot | `productionCompare.ts` | `OUTSIDE_RETURN` is one compare-candidate kind when the plan operator is `SLIP`. |
| Colour registry labels | `colourRegistry.ts` | `INSIDE` / `OUTSIDE` are colour-resource tags, not a measurement of a score. |
| Hexatonic placement | `relations.ts` `placementAgainstHome` | `inside` means every candidate pitch class is in the home set. Anything else is `outside`. |
| Hexatonic phrase roles | `phraseTypes.ts` `HexatonicPhraseRole` | Generated bars are labelled `inside`, `outside`, or `return`. Return chooses `M-DEG` when collections share pitch classes and `M-NEAR` when they do not (`docs/HEXATONIC_PHASE_H3.md`). |

Tests: `pentatonicDev5a.test.ts`, `pentatonicDev7.test.ts`, `hexatonicH3.test.ts`.  
GUI: pentatonic workflow and hexatonic phrase page show the labels that those generators emit. There is no score-wide inside/outside/return diagnostic that accepts an arbitrary duo MusicXML and reports bar-linked membership against a declared field.

### 4.6 M-DEG and M-NEAR — implemented as motif maps, not as distance classes

| Item | Detail |
|---|---|
| File | `engines/composer-os-v2/core/pentatonic/motifTransform.ts` |
| API | `mapMotifPitches` with `MotifMapMethod = 'M-DEG' \| 'M-NEAR'` |
| Computes | Structural notes and ornaments are separated. Landings that already belong to the target may be retained. Repeats may hold. **M-DEG** places a structural note on the same scale degree in the target collection and refuses to substitute another collection if that degree is missing. **M-NEAR** chooses the nearest allowed target member, with a contour penalty. Chromatic ornaments may be preserved. Guitar range is `CLEAN_ELECTRIC_GUITAR.hardRange`. |
| Callers | Pentatonic phrase operators, BHL motif resolution (`bhlResources.ts` can request `M-NEAR`), hexatonic return (`phraseGeneration.ts`). |
| Tests | `tests/pentatonicColourPath.test.ts`, `tests/pentatonicDev4b.test.ts`, `tests/wwhBlackAuraV8a.test.ts`, `tests/hexatonicH3.test.ts` |
| GUI | `#/pentatonic` Transform Motif uses these methods. Hexatonic generation uses them internally. |
| Limits | This is a pitch-mapping operator for a known motif. It does not discover motifs, and it is not the pentatonic `NEAR` distance class. |

### 4.7 Motif recurrence and transformation — partially implemented

| Mechanism | What it computes | What it does not compute |
|---|---|---|
| `bhlEvidence.ts` `analyseMotifs` (private, reached by `readBhlEvidence`) | Opening cell of a monophonic line; later windows tagged exact, transposition, augmentation, diminution, displacement, fragmentation, or return. | SIA / SIATEC / COSIATEC. Inversion as a discovered transform. Perceptual salience. |
| `motifTransform.ts` | Maps a supplied motif by degree or nearest tone. | Discovery. |
| `bhlRiffRhythm.ts` `transformBhlRiffCell` | Deterministic cell edits: the core-b variant list used by candidate generation. | Analysis of an imported score. |
| `bhlPhraseBinder.ts` `bindBhlPhrase` | Relationship labels on loaded events: `cell-recurrence`, `true-counterpoint`, `bass-reinterpretation`, `sustain-release`, `rhythmic-dialogue`. | A general motif map. |
| `hexatonic/phraseGeneration.ts` | Records whether the generated return restates the cell's rhythm and pitch classes. | Analysis of music the hexatonic generator did not write. |
| `pentatonic/formDuoIntelligence.ts` | Form spans can use motif recurrence as one boundary signal inside pentatonic analysis. | A transformation lexicon. |

GUI: binder and hexatonic recurrence are not a selectable finding list tied to engraved notes. BHL evidence motifs are computed and then dropped by `BhlEvidencePanel`.

### 4.8 Rhythm, density, and silence — partially implemented

| Mechanism | File | Computes |
|---|---|---|
| BHL density and silence | `bhlEvidence.ts` | Per voice, per bar: attack count, sounding duration, rest duration, whole-bar silence. Activity flags: guitar during bass rest, bass during guitar rest, simultaneous, alternating. |
| BHL onset planning | `bhlRhythm.ts` | `planBarOnsets`, `planPhraseOnsets`, `detectMechanicalOnsets`, `legalAnswerSlots`. These plan a guitar answer. They do not measure an existing score's syncopation. |
| Pentatonic form/duo | `formDuoIntelligence.ts` `assessPentatonicFormDuo` | Phrase, section, and local spans from rehearsal marks, rests, motif recurrence, and density-plus-register changes. Roles include lead, response, counterpoint, support, space. |
| Hexatonic phrase bundle | `phraseGeneration.ts` | `noteDensityPerBar`, `restCount`, `restBeats` on the generated phrase only. |
| WPS Bryant density | `wpsBryantDensity.ts` | Eighth streams, sixteenth bursts, scale-run findings, used by Bryant gates on a finished WPS edition. |
| BHL GUI "rhythmic density" | `BhlComposerPage.tsx` | A generation control (`dyad`, `single`, and the other `BhlDensity` values). It is an intention, not a measurement. |

Not implemented: Longuet-Higgins & Lee syncopation, WNBD, inter-onset-interval entropy, bar-to-bar onset Hamming distance, LBDM, self-similarity matrices, novelty curves.

Tests: `bhlEvidence.test.ts`, `pentatonicDev6a.test.ts`, `hexatonicH3.test.ts`, WPS baseline and Bryant tests under `engines/composer-os-v2/tests/`.

### 4.9 Guitar / bass interaction — partially implemented

`readBhlEvidence` is the fullest production description: motion kind, vertical interval, entry, crossing, and the activity flags in section 4.8.

`formDuoIntelligence.ts` adds `classifyRegister` (`clear` / `close` / `colliding` in that module's terms) and `assessCommonTone` (a common tone counts only when it has a continuity job). Pitch-class overlap is explicitly not treated as voice-leading there.

`bhlPhraseBinder.ts` labels dialogue relationships on a loaded span. Phase 5b checks are fixture checks for Palace Gates and Wrong Turning, not a general interaction metric.

Not implemented: onset-interlock percentages, imitation lag, a role timeline, or a relative-motion share that is independent of the BHL evidence walker.

GUI: motion, entry, crossing, and silence rows in `BhlEvidencePanel`. Register class and common-tone jobs stay in the pentatonic engine and its workflow text, not in a bar-linked interaction view.

### 4.10 Guitar playability and fretboard feasibility — partially implemented

| Mechanism | File | Computes |
|---|---|---|
| `assessGuitarFeasibility` | `core/barry-harris/guitarVoicingFeasibility.ts` | Standard-tuning open strings E2–E4. At most four distinct pitches. One note per string. Fret span preference 4, stretch span 5, fret ceiling 22. Returns `feasible`, `fretSpan`, `lowestFret`, `stretch`. |
| `guitarFeasibility` | `core/bhl/bhlRealise.ts` | Maps that check onto BHL guitar events. |
| `guitarFretSpan` | `core/hexatonic/phraseGeneration.ts` | Span check used while generating a hexatonic phrase. The phrase bundle records `maxFretSpan`, `maxSimultaneous`, `sixNoteChords`, and `inRange`. `humanPlayability` stays `'NOT VERIFIED'`. |
| Tritone-pair solver | `core/performance-composer/pcTritonePair.ts` | Fingers generated events and rejects jumps over five frets inside a beat. A generator constraint, not an analyser for imported MusicXML. |

Not implemented: dynamic-programming fingering cost (P1), upright-bass shift load (P2), tempo-dependent cost, or reading `<technical><string>/<fret>` as an analysis input.

GUI: BHL composition can refuse an infeasible grip during realisation. There is no playability-outlier panel on an imported score.

### 4.11 Source and bass locks — implemented

| API | File | Computes |
|---|---|---|
| `ingestBhlSource`, `extractBhlSnapshot` | `bhlIngest.ts` | SHA-256 of the source file. Snapshot of bass events, protected guitar bars, metre, tempo, rehearsal and structural text, sounding bass. |
| `verifyBhlLocks`, `verifyRecordedSourceSha` | `bhlVerify.ts` | Event diff of pitch, onset, duration, ties, and rests for bass and protected guitar, plus metre, tempo, text, and sounding bass. Reimport check via `loadScore`. |
| `outsideSpanIdentical` | `bhlWrite.ts` | Material outside the edited span stays identical. |
| `compareLockedSpan` | `core/wwh/wwhSourceCompare.ts` | Semantic compare of notes, pitches, onsets, durations, rests, ties, harmony, metre, divisions, key, clef, tempo, and navigation. Measure numbers may differ. |
| `runWps` | `core/wwh/wps/wpsAssess.ts` | Spec-level LOCK. A changed bass is not strict LOCK PASS. Does not generate notes. Does not run `evaluateGce`. |

Tests: `bhlSourceLock.test.ts`, `wpsBaseline.test.ts`, performance-composer lock tests.  
GUI: BHL inspect/compose reports lock failure through the BHL API. WPS is a CLI (`npm run wps` inside `engines/composer-os-v2`). It has no dashboard page.

### 4.12 MusicXML validation and event-level comparison — partially implemented

| API | File | Computes |
|---|---|---|
| `validateMusicXmlFile` | `tests/outputValidation/musicXmlOutputValidator.ts` | DOM checks plus MusicXML 4.0 XSD through `xmllint` when that tool and `schemas/musicxml-4.0` are present. `requireXsd` controls whether an XSD miss fails the run. This file lives under tests. It is not an application service. |
| `validateMusicXmlSchema` | `core/export/musicxmlValidation.ts` | String checks: `score-partwise` root, harmony-offset scope, direction-type scope, plus `validateMusicXml`. |
| `reParseMusicXml` | same file | Stub. A file with `<score-partwise` and one `<measure` reports `measureCount: 1`. It does not diff events. |
| `verifyBhlLocks` / `compareLockedSpan` | see 4.11 | The real event diffs. They compare a source span with a candidate or copy. They do not implement research metric T7 as a general export round-trip. |
| `readHexatonicScore`, `hexatonicScoreMatchesPhrase` | `hexatonic/phraseExport.ts` | Confirms a hexatonic export still matches the phrase that produced it. |

Not implemented: partwise and timewise dual parse as a product check; a general added/removed/altered note diff with stable note identities; pickup and cadenza exception declarations.

### 4.13 WPS and Tonality Vault harmonic analysis — partially implemented

WPS V1.5 (`wpsAssess.ts` `runWps`) checks a song spec and a finished score: blueprint, MCI, 65/20/40 as a listening heuristic, A–H inventory, bass LOCK, guitar-role spans, duration, Bryant gates, and V1.5 harmonic-notation reading. The command states that it does not generate notes, does not call `evaluateGce`, and does not run `runDcrProtocol`.

`wpsVaultHarmony.ts` proposes candidate events (`liquidHarmonyCandidates`, `shellAndTriadCandidates`, `resolutionTensionCandidates`, `reduceShellVersusTriad`, `proposeWpsVaultPassage`). The checker does not call them. `wpsTonalityVaultRecord.ts` is a 16-row spelled catalogue. `TONALITY_VAULT_DATABASE` is a separate store and is not replaced by WPS.

`wpsHarmonicNotation.ts` `assessHarmonicNotation` counts sonority words on an integrated study and separates field labels from voicing annotations. That is a notation audit, not set-class or DFT analysis.

`bhlResources.ts` can preview liquid harmony and list vault choices for a BHL field (`bhlLiquidPreview`, `bhlVaultChoices`). Those feed composition.

GUI: none for WPS. Vault material appears inside BHL and hexatonic generation, not as an analysis view of an arbitrary score.

### 4.14 Official GCE — implemented elsewhere, out of scope for this dashboard

`evaluateGce` scores a Composer OS `ScoreModel`. WPS and the GCE V3 document already state that a hand-authored WWH MusicXML file is not that object. The research brief forbids a machine BMEF total. This audit does not route the dashboard through `evaluateGce` or `runDcrProtocol`.

## 5. Research-metric coverage

Evidence grades in the brief are research grades. They are not implementation grades. The status column is implementation.

| ID | Research metric | Status | Nearest production code | Gap |
|---|---|---|---|---|
| T1 | Schema and parse validity | Partial | `validateMusicXmlFile` (XSD when xmllint exists); `validateMusicXmlSchema` | Not an app service. No timewise parse. `reParseMusicXml` is a stub. |
| T2 | Measure-duration integrity | Partial | `readBhlEvidence` records bar metre and cursor | No general pass/fail that durations sum to the time signature, with pickup exceptions. |
| T3 | Source-lock integrity | Implemented | `verifyBhlLocks`, `compareLockedSpan`, `verifyRecordedSourceSha` | Scoped to BHL locks and WWH copy compare, not every future candidate type. |
| T4 | Sounding-range compliance | Partial | Guitar range inside `mapMotifPitches` and hexatonic `inRange` | No configurable written-versus-sounding range check for guitar and bass on an imported score. |
| T5 | Guitar simultaneity | Partial | `assessGuitarFeasibility` | Fixed 4-fret / 5-fret policy. Ignores notated string and fret. No tempo. |
| T6 | Notation completeness | Not implemented | — | No inventory of dynamics, articulations, chord symbols, tempo, and expression text as an evidence report. |
| T7 | Export round-trip | Partial | `hexatonicScoreMatchesPhrase`; BHL reimport inside `verifyBhlLocks` | No general re-parse and event diff of an export. |
| H1 | Pitch-class set class per window | Not implemented | Pitch-class sets exist inside field and hexatonic distance | No prime form, no interval-class vector, no beat or phrase window. |
| H2 | Colour-field membership | Partial | Hexatonic `collectionMembership`; pentatonic path and registry | Exact for generated hexatonic bars. Not a duration-weighted membership report for an arbitrary region. |
| H3 | DFT profile | Not implemented | — | No pitch-class Fourier magnitudes. |
| H4 | Voice-leading distance and common tones | Partial | `minimumAssignment` inside both distance functions; `exchangeTriads`; BHL motion kinds | Pitch-class assignment cost, not registered taxicab voice-leading between successive duo sonorities, kept separate from common-tone retention. |
| H5 | Harmonic rhythm | Not implemented | — | No pitch-class-set change rate after a passing-tone filter. |
| H6 | Spiral-array tension | Not implemented | — | No MorpheuS port. BHL "tension" is a dissonance question. |
| H7 | Roughness and interval profile | Partial | `readBhlEvidence` intervals and notable dissonances | Interval names at onsets. No Hutchinson–Knopoff roughness. |
| H8 | Centre clarity | Not implemented | Pentatonic `centreIdentity.ts` / `inferHome.ts` choose HOME or report `HOME_AMBIGUOUS` / `HOME_INSUFFICIENT` | That is a pentatonic centre decision, not a Krumhansl–Schmuckler correlation or a top-2 ambiguity margin. |
| M1 | Melodic profile | Not implemented | Hexatonic phrase stores a register span | No interval histogram, step/leap ratio, contour reversals, or tessitura per part. |
| M2 | IDyOM | Not implemented | — | No sidecar. |
| M3 | Motif map | Partial | `analyseMotifs`; `mapMotifPitches`; hexatonic return evidence | Discovery is a short cell window. Mapping is M-DEG / M-NEAR only. |
| M4 | Pitch-class entropy | Not implemented | — | |
| M5 | Identity similarity | Not implemented | Lock diffs detect unintended change | No phrase-level melodic edit distance or cardinality score. |
| R1 | Event density | Partial | BHL per-bar attack counts and sounding coverage | Not yet a reusable metric with a receipt. GUI generation "density" is a different control. |
| R2 | Syncopation | Not implemented | — | |
| R3 | Rhythmic diversity | Not implemented | — | |
| R4 | Silence profile | Partial | BHL silence observations, including whole-bar and gap fill | No joint-silence classification against phrase boundaries. |
| R5 | Phrase segmentation | Partial | `assessPentatonicFormDuo` | Rest, rehearsal, motif, and density cues inside the pentatonic reader. Not LBDM or IDyOM boundaries. |
| R6 | Form map | Not implemented | — | No self-similarity matrix. |
| R7 | Macro pacing arc | Not implemented | — | |
| I1 | Onset interlock | Partial | BHL activity flags per bar | Boolean overlap, not shared-versus-exclusive onset rates. |
| I2 | Relative motion | Partial | BHL motion observations | Counts of four motion kinds. No share, no parallel-perfect flag as its own finding type. |
| I3 | Register relationship | Partial | BHL crossings; `classifyRegister` | Two separate implementations. Neither is a pitch-gap series. |
| I4 | Imitation lag | Not implemented | Binder can label rhythmic dialogue | No cross-part pattern match with a time lag. |
| I5 | Role timeline | Partial | Pentatonic duo roles on analysed regions | Advisory roles, not a per-bar lead timeline for any score. |
| P1 | Guitar fingering cost | Partial | `assessGuitarFeasibility`, `guitarFretSpan` | Feasibility and span. No cost curve and no outlier list. |
| P2 | Bass shift load | Not implemented | — | |
| C1 | Aligned score diff | Partial | `verifyBhlLocks`, `compareLockedSpan` | Lock and copy diffs. Not a colour-coded added/removed/altered note view. |
| C2 | Metric delta table | Partial | `compareBhlEvidence` | Four aggregate deltas. Not a per-metric, per-section table. |
| C3 | Small-multiple curves | Not implemented | — | |
| C4 | Complexity-inflation flag | Not implemented | — | BMEF describes the flag as a human listening prompt. No code raises it. |
| C5 | Identity-preservation panel | Partial | Lock status plus BHL comparison | No M5. |
| C6 | Copy check | Not implemented | — | |

## 6. BMEF specification status

BMEF-100 V2.0 is a human assessment framework. It is not implemented as software.

Preserved structure, quoted from that document and not extended here:

- Layer A gates, pass/fail, no points: G1 intent brief filed before scoring; G2 feasibility; G3 notational integrity; G4 identity preservation on revisions only.
- Layer B universal core, 70 points: U1 Identity and character 15; U2 Expressive impact 15; U3 Coherence, form and pacing 15; U4 Effective originality 10; U5 Economy and necessity 10; U6 Sonic realisation 5.
- Layer C specialist module, 30 points, chosen before scoring. Module J (chamber-jazz duo) is J1 Harmonic language 8, J2 Line and voice-leading 7, J3 Interaction and space 7, J4 Idiomatic writing and expressive playability 4, J5 Improvisational affordance 4.
- Reports show Core /70 and Module /30 separately.
- Ratings are human 1–10 scores, converted by `(rating / 10) × weight`, with half-points allowed. Each rating needs a bar or time reference.
- Evidence levels in the document: E1 score analysis, E2 audition, E3 performance, and A assumption.
- Confidence caps are proposed in its section 6.2. U2 cannot exceed Low confidence on score analysis alone.
- Decisions: ACCEPT, REFINE, REJECT, FORK. The document's interim rule is that total delta is advisory until calibration. A provisional advisory marker of Total Δ ≥ +5 decides nothing. The SDC formula is stated as a later calibrated rule, not as a number this repository may apply.
- Section 6.5: automated analysis may produce a diff log, a complexity audit, and feasibility checks. It must not produce final U2 or U4 ratings, or a final decision.

`HexatonicBmef` and `musicalQualityScore: null` already follow the "no machine total" rule for their own objects. They do not implement the scorecard.

E1, E2, and E3 in the research brief match the BMEF evidence levels: symbolic score, rendered or recorded audio, physical performance. No E2 or E3 pipeline exists in Composer OS for this dashboard. Audio analysis is out of this phase.

## 7. Proposed architecture

One TypeScript evaluation core. Metrics are pure functions over one score representation. Humans record judgements in a separate record. Nothing in the core emits a composite artistic-quality score.

```
MusicXML
  → ingest and identity (SHA-256, part map, transpose declaration)
  → CanonicalEvaluationScore
  → findings (bar, onset, part, voice, event ids)
  → metric functions
  → evidence receipt
  → five views
  → human evaluation record (separate file)
```

### 7.1 Canonical score

Build `CanonicalEvaluationScore` by generalising the BHL evidence walk, not by forcing hand-authored WWH MusicXML through `ScoreModel`.

Required contents:

- Rational onsets and durations, taken from the `q`, `qAdd`, `qCmp` pattern in `bhlEvidence.ts`.
- Sounding events with spelled pitch and MIDI pitch. Guitar and bass octave transposition recorded explicitly once the part's `<transpose>` is read.
- Chord symbols from `<harmony>` kept off the sounding timeline.
- Optional string and fret, dynamics, and articulations when the file contains them. Absence stays absence.
- Written order kept distinct from any repeat expansion. Repeat expansion can wait until a score actually needs it.

`wwhDuoImport.ts` and `pentatonic/musicXmlScore.ts` already parse duo MusicXML for other jobs. V3.1-B should pick one ingest path and adapt the others to it, instead of a fourth parser.

### 7.2 Findings

Every metric result that refers to music carries finding ids:

- score hash
- part id, voice, bar number
- onset as a rational
- event ids of the notes involved

A view can select a finding and resolve those ids back to notes. Aggregates without event ids are not sufficient for the dashboard.

### 7.3 Instrument views

Guitar and bass are separate lines. Composite sonorities are a third, labelled view. Syncopation, density, and silence follow the brief: per part first, ensemble second. Pentatonic five-note distance and hexatonic cardinality-offset distance stay separate functions. A shared helper may compute the assignment; the classifiers must not be merged.

### 7.4 Intent briefs

Store the BMEF G1 brief as data: purpose, intended affect or tension shape, target players and tempo, module id, and any declared departure from identity. Metrics may display the brief beside a measurement. They do not score the brief.

### 7.5 Candidate comparison

Reuse `compareBhlCandidateXml` only as a count summary. The dashboard comparison should call the lock diff (`verifyBhlLocks` / `compareLockedSpan` semantics) for C1, then attach metric deltas that cite findings. No ranking field.

### 7.6 Receipts

JSON beside the score, not inside the MusicXML:

- input SHA-256
- canonical-score version
- metric id, version, parameters
- findings
- `musicalQualityScore` absent, not zero

`null` on BHL reports stays the pattern. A missing sidecar later yields "not computed".

### 7.7 Human records

A second JSON document matching the machine-readable scorecard already printed in BMEF V2.0 section 7. The application stores what a person typed. It does not fill U2, U4, or the decision.

### 7.8 Visualisations

Charts read findings. The score view highlights the same event ids. Metrics must not depend on the renderer.

### 7.9 What stays in TypeScript

All of V3.1-B and V3.1-C: ingest, T1–T7 as far as section 5 marks them buildable without new libraries, descriptive H1/H2/H4/H5/H7, M1/M3/M4/M5, R1/R4/R5, I1–I3, P1 as span-and-range, C1/C2/C5, and the human form.

Optional later, not in these stages: music21 or partitura for set-class cross-checks, IDyOM for M2, MorpheuS for H6, incon for H7 roughness, Essentia for audio. Each would be an offline sidecar behind an explicit "not computed" state. No package install in the audit phase, and none is recommended inside V3.1-B.

## 8. GUI plan

No components are added in this audit. The workspace is five views on one selected score, plus an optional second score for comparison. The shared interaction is: select a finding, show its bars, onsets, parts, and note ids.

Reusable controls already on screen:

- `BhlComposerPage` and `BhlEvidencePanel` for evidence lists and the four human marks.
- `PentatonicWorkflowPanel` for analyse / plan / transform / compare / export, capped at three unranked candidates.
- `HexatonicEnginePage` for collection choice, phrase preview, project save, and MusicXML export.
- App router entries `#/bhl`, `#/pentatonic`, `#/hexatonic`.

Missing everywhere: a score renderer with bar and note hit targets, chart components, a finding inspector, a BMEF form, and blind listening controls. OpenSheetMusicDisplay and Verovio appear in the research brief only. They are not dependencies of this repository.

### View 1 — Technical validation

| | |
|---|---|
| Data | Canonical score, source hash, lock spec, validation errors as findings. |
| Reuse | Lock error strings from `verifyBhlLocks`. XSD path from `validateMusicXmlFile` once it is called from the service rather than only from tests. |
| Missing | T6 inventory, a real T2 duration check, T7 event diff, configurable ranges. |
| Evidence | E1 facts. Pass/fail is file integrity, not musical quality. |
| Human | Read the finding. Do not rate it. |
| Export | Receipt JSON plus a plain-text error list. |

### View 2 — Harmonic and melodic analysis

| | |
|---|---|
| Data | Sounding pitch classes, declared colour field when the project has one, monophonic line per part. |
| Reuse | `measureFieldDistance` and `measureHexatonicDistance` as separate cards. `mapMotifPitches` only when a motif is already identified. BHL interval and motif findings once the panel actually receives them. |
| Missing | H1 prime form, H3 DFT, H5, H6, H8 key profiles, M1 histogram, M2, M4, M5. |
| Evidence | E1 description. Out-of-field notes and ambiguous centres are shown, not penalised. |
| Human | Declare the field and the centre, or leave them unknown. |
| Export | Per-bar finding list. |

### View 3 — Rhythm, form, and instrumental interaction

| | |
|---|---|
| Data | Per-part onsets, rests, register, motion observations. |
| Reuse | BHL density, silence, motion, crossing, and activity rows. Pentatonic form/duo roles where the pentatonic reader already ran. |
| Missing | R2, R3, R6, R7, I4, I5 as specified, P1 cost curve, P2. |
| Evidence | E1. Playability outliers are prompts for E3, matching `humanPlayability: 'NOT VERIFIED'` on hexatonic phrases. |
| Human | Mark a silence or a crossing as intentional or not, using the existing BHL marks. |
| Export | Finding list with bar numbers. |

### View 4 — Candidate comparison

| | |
|---|---|
| Data | Two or three canonical scores, shared source hash, intent brief. |
| Reuse | `compareBhlCandidateXml` count card. `generateBhlCandidateSet` when the scores are BHL candidates. Pentatonic compare cap of three, unranked. |
| Missing | C1 note colouring, C3 curves, C4 flag, C6 copy check. |
| Evidence | E1 deltas. No sort by quality. |
| Human | Choose which candidate stays open. The view does not choose. |
| Export | Side-by-side finding diff. MusicXML of each candidate stays in its own file. |

### View 5 — BMEF-assisted human evaluation

| | |
|---|---|
| Data | Intent brief, Core and Module criterion list copied from BMEF V2.0, linked findings, rater id. |
| Reuse | None. The hexatonic object named BMEF must not be reused as this form. |
| Missing | The whole form, blind A/B labels, confidence fields, agreement statistics, decision record. |
| Evidence | The person sets E1, E2, or E3 per criterion. The machine may attach E1 finding links. It may not write the rating. |
| Human | Gates, ratings, comments, ACCEPT / REFINE / REJECT / FORK. Solo-mode timing rules in BMEF section 5.6 stay human procedure. |
| Export | The scorecard JSON already specified in BMEF V2.0 section 7. |

## 9. Three-stage development plan

Each checkpoint is one commit on `main` after its tests pass. Unrelated dirty files stay unstaged. No Windows packaging and no WWH source edits belong in these commits.

### V3.1-B — Evaluation engine

Canonical score, technical checks, descriptive metrics that section 5 already has a basis for, and receipts.

| Checkpoint | Contents | Test that can fail alone |
|---|---|---|
| B1 | `CanonicalEvaluationScore` from the BHL rational walk, including part ids and event ids. No GUI. | Round-trip a fixture duo: event count, onsets, and pitches match `readBhlEvidence` on the same file. |
| B2 | T3 lock diff and T1 parse report as receipt fields. Wire `validateMusicXmlFile` or an equivalent into the engine without moving the XSD. | Known-bad duration and a changed bass note produce findings with bar numbers. The nine WWH hashes stay unchanged. |
| B3 | Descriptive metrics with findings: R1 and R4 from BHL density and silence; I2 from BHL motion; H4 assignment kept as pitch-class motion and labelled as such; H2 membership only when a field is declared. | Fixture assertions on counts and on event ids. `musicalQualityScore` key is absent. |
| B4 | Receipt writer and reader. Metric version strings. | Same input hash and parameters reproduce the same receipt bytes. |

Do not add DFT, entropy-as-quality, syncopation models, or fingering-cost optimisation in B.

### V3.1-C — Evaluation dashboard

Five views, comparison, score-linked evidence, human BMEF record.

| Checkpoint | Contents | Test that can fail alone |
|---|---|---|
| C1 | View 1 and a finding inspector that lists measure and event ids. Renderer choice is a separate decision (section 10). | UI test: selecting a lock finding exposes its bar and event id. |
| C2 | Views 2 and 3 bound to B3 metrics. Pentatonic and hexatonic distance cards stay labelled with their own versions. | UI test: a declared-field out-of-collection note is selectable. |
| C3 | View 4 for two stored scores, using lock diff plus BHL count comparison. No rank control. | UI test: three candidates do not acquire a quality order. |
| C4 | View 5 form matching the BMEF scorecard. Save and reload the human JSON. Ratings start empty. | UI test: export contains no machine-written U2, U4, or decision. |

### V3.1-D — Testing and release

| Checkpoint | Contents | Test that can fail alone |
|---|---|---|
| D1 | Regression suite on the B1–B4 fixtures, plus one WWH case study that only reads a leadsheet and writes a receipt outside the album tree. | Hash gate on the nine leadsheets. Receipt has findings. |
| D2 | Documentation: this audit's status column updated, changelog, roadmap current line. | Docs cite only functions that still exist. |
| D3 | Desktop bundle only if C4 is on a route the desktop shell already ships. No installer rebuild unless that route is included. | Existing desktop smoke for the touched route. |

## 10. Risks and unresolved decisions

1. **Name collision.** `HexatonicBmef`, BHL `musicalQualityScore`, and BMEF-100 V2.0 are three different things. The dashboard copy should say "BMEF-100 V2.0" when it means the human framework.
2. **Distance classifiers.** Pentatonic `measureFieldDistance` and hexatonic `measureHexatonicDistance` must stay separate. Sharing the assignment helper is safe. Sharing the cutoff table is not.
3. **M-DEG / M-NEAR versus NEAR.** The motif map and the distance class answer different questions.
4. **Evidence panel gap.** Motif, density, interval, and tension findings are computed and then omitted from `BhlEvidencePanel`. A dashboard that only wraps that panel will hide the best current E1 data.
5. **Parser count.** BHL, WWH duo import, and pentatonic MusicXML readers can disagree on ties, chords, and tuplets. B1 has to choose one and test the other two against it.
6. **`reParseMusicXml`.** Calling it from the dashboard would report false confidence. T7 needs a new diff, not this stub.
7. **XSD dependency.** `validateMusicXmlFile` needs `xmllint` and the schema directory. A machine without `xmllint` must record "not computed", not "valid".
8. **Score renderer.** OSMD and Verovio are not installed. C1 can ship a finding list with bar and event ids before a notation view exists. A notation view is still required before the workspace matches the brief.
9. **GCE.** Routing this dashboard through `evaluateGce` would score the wrong object and would invent a numeric quality result the brief rejects.
10. **WPS.** `runWps` should remain a checker. The dashboard may link to its LOCK result later. It should not call vault candidate generators during analysis.
11. **Human thresholds.** SDC, the +5 advisory marker, and the 20% complexity-inflation test in BMEF section 4.2 are proposed human rules. They are not engine constants until a calibration study says so.
12. **Research brief storage.** The brief and BMEF V2.0 are outside the repository. A later docs commit may copy them in only if Mike asks. This audit cites the paths it read.
13. **Dirty tree.** Implementation commits must not stage the files listed in section 2.

## 11. Verification performed for this audit

- `git rev-parse` for `HEAD`, `main`, and `origin/main` agreed.
- Working tree inspected. No reset, clean, stash, or stage of unrelated files.
- Nine leadsheet SHA-256 values matched `pentatonicDev6a.test.ts`.
- Production functions named in section 4 were read in source. Tests named there exist.
- No Composer OS build, install, smoke suite, or GUI session was run. This audit does not claim runtime passage of those suites.
