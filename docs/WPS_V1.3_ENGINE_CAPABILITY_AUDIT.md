# WPS V1.3 — Composer OS engine capability audit

**Date:** 2026-10-12  
**Status:** read-only audit. No WPS V1.3 implementation. No performance-score edits.  
**Scope:** engines that could supply guitar or upright-bass material for While We're Here performance synthesis. A module is a note generator only when an exported function returns pitches, frets, or MusicXML events.

WPS V1.2 still does not generate notes. It checks a finished score. This audit asks which existing engines can offer candidates a composer then selects.

## Executive summary

The melodic surplus is real, and it is not because Composer OS lacks chordal code. The performance editions are mostly single-line guitar. The engines that already build guitar dyads and triads were not used as the accompaniment source.

Tonality Vault’s database is a chord-type table: left-hand shell degrees, a melodic triad, and one primary tension. Seventeen types. `planLiquidHarmony` splits that set into one melody pitch class and the remaining pitch classes. `generateVaultRiff` then plays **one note per eighth**. Styles named `dyad-seesaw` and `triad-pair-pendulum` still emit a monophonic line. Calling the vault riff generator for “more harmony” would add the texture WPS already has too much of.

The chordal tools that do exist:

- `realizeTriadPair` places parent triads on the guitar, keeps common tones, and moves the other voices. Fret span is checked.
- `buildGuitarGripLibrary` enumerates dyads, triads, and four-note grips inside a four-fret span.
- `composeTritonePair` writes guitar lines, dyads, grips, and ending stacks into a plan that can become MusicXML.
- `runCompingGenerator` stacks shell or full chords on a beat grid. The grid is Freddie Green / shell / full-chord, not a sustained duo texture.

Keyboard four-note voicings (`buildTopDownVoicing`) are semitone offsets from a root, bass near MIDI 48 and upper notes near MIDI 60. Nothing in that function reduces them to a guitar dyad. The grip library already builds the guitar reduction from the same triad and tension pitch classes, without passing through the keyboard voicing.

Smallest useful V1.3: a guitar-role plan on the blueprint, then **one** selected passage written by hand from triad-pair or grip candidates. WPS keeps checking. It does not gain a composition engine.

## How the classes are used

| Class | Meaning here |
| --- | --- |
| **READY** | Exported function already returns guitar pitches or fretted voicings a composer can choose from. |
| **ADAPTABLE** | Real musical output, wrong grain for this job: monophonic, symbolic, keyboard, whole-piece, or the wrong ensemble. |
| **ANALYTICAL** | Pitch classes, legality, roles, or a pass/fail fret check. No passage. |
| **NOT RELEVANT** | Fixed pattern, empty rule object, metadata, or an instrument WPS does not write. |

Integration complexity is the cost of using the output inside a locked-bass WWH MusicXML file. Low means select and copy a few events. High means the function wants to author the piece.

## Engine capability matrix

Thirty-five modules were opened far enough to see the export and the return value. Tests named below exist in the repo. They were not re-run for this audit.

| Engine | Path | Main export | Actual output | Kind | Needs | Score / XML | Tests | Guitar + bass | Fit | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tonality Vault rows | `core/harmony/tonalityVaultDatabase.ts` | `TONALITY_VAULT_DATABASE` | 17 chord types. Shell degrees, triad quality, tension degree. | Description | none | no | via vault tests | data only | — | ANALYTICAL |
| Quadratonic selector | `core/harmony/quadratonicMelodySelector.ts` | `selectQuadratonicMelodySpec` | Three triad tones + one tension, pitch classes from the root. | Pitch-class set | chord type id | no | vault smoke | source set for grips | low, as input | ANALYTICAL |
| Top-down voicing | `core/harmony/topDownVoicingBuilder.ts` | `buildTopDownVoicing` | Four semitone offsets, low to high. Shell under the triad. | Keyboard voicing | chord type id | no | vault smoke | not fretted | medium reduction | ADAPTABLE |
| Liquid harmony plan | `core/harmony/liquidHarmonyPlanner.ts` | `planLiquidHarmony` | One melody pitch class, remaining voicing pitch classes, beat offset 0 or 0.5. | Split of the quadratonic | chord type, root, `TensionState` | no | vault tests | no rhythm, no frets | low, as a label | ANALYTICAL |
| Layer state machine | `core/harmony/layerStateMachine.ts` | `LayerStateMachine.advance` | State name: primary, tension, chaos, recover, resolve. | Analysis | beat strength | no | vault tests | none | — | ANALYTICAL |
| Beat legality | `core/harmony/beatContextLegalityMap.ts` | `buildBeatContextLegalityMap` | Pitch class → layer / beat tag. | Analysis | chord type, root | no | vault tests | filters later grips | — | ANALYTICAL |
| Vault chord rules | `core/harmony/vaultChordRuleSet.ts` | `buildAllVaultChordRuleSets` | Template **names** (`dyad-bounce`, `liquid-resolution`, …), grip counts, reharm strategy ids. | Labels | chord type | no | vault tests | does not play the template | — | ANALYTICAL |
| Lead-sheet enrichment | `core/tonalityVault/tonalityVaultLeadSheetHarmonyEnrichment.ts` | `enrichHarmonyWithTonalityVault` | Chord annotations on a lead sheet. | Analysis | raw symbols | no | `tonalityVaultLeadSheetHarmonyEnrichment.test.ts` | none | — | ANALYTICAL |
| Guitar grip library | `core/guitar/guitarGripLibrary.ts` | `buildGuitarGripLibrary` | Dyads, triads, quadratonic grips, span ≤ 4 frets, string and fret. | Voicings | chord type, root, tuning | `FretboardRealization`, not a score | vault smoke | yes, standard or alt tuning | low | **READY** |
| Vault riff | `core/guitar/vaultRiffGenerator.ts` | `generateVaultRiff` | One `ScoreNote` per eighth. All five styles are monophonic. | Notes | chord type, root, bars, style | `ScoreNote[]`, not WWH XML | `vaultQuality.smoke.test.ts`, chorus tests | frets stored; constant eighths | medium, and the wrong texture | ADAPTABLE |
| Chart → vault riff | `core/irealpro/irealVaultPipeline.ts` | `generateVaultFromParsedChart` | Repeats `generateVaultRiff` across a chart. Melody mode uses `quadratonic`. | Notes | parsed chart | vault output, not WWH XML | `vaultChorusQuality.test.ts` | guitar line over the chart’s own harmony | high | ADAPTABLE |
| “Triad pair” solo bar | `core/vault/vaultSoloMonophonic.ts` | `generateVaultTriadPairMonophonicBar` | Upward **single-note** arpeggio. | Notes | chord type, root | `SoloExportNote[]` | vault tests | solo register, not a chord | — | ADAPTABLE |
| Triad-pair realisation | `core/wwh/wwhTriadPair.ts` | `realizeTriadPair` | Successive guitar voicings, held tones, moved voices, fret and spelling checks. | Voicings + voice-leading | two parent triads, slots, seed | WWH atoms via the caller | liquid-response test | guitar, span-limited | low | **READY** |
| Liquid Response | `core/wwh/wwhOperatorLiquidResponse.ts` | `buildLiquidResponse` | Writes one triad-pair realisation into rests and long holds. Can return `no-space`. | Notes in MusicXML | source XML, one triad, range | WWH MusicXML | `wwhOperatorLiquidResponse.test.ts` | locks melody and bass on that pass | low if the range is one passage | **READY** |
| Reharm | `core/harmony/reharmCandidateEngine.ts`, `reharmSequenceRanker.ts`, `reharmController.ts` | `generateReharmCandidates`, `generateReharmSequence`, `executeReharm` | Substitute chord types and alternate progressions. | Harmonic proposals | chord type or a progression | symbols | reharm tests | no frets | medium | ADAPTABLE |
| Comping generator | `core/comping/compingGenerator.ts` | `runCompingGenerator` | MIDI stacks on beats 2+4, 1+3, every beat, or offbeats. Freddie dyad, shell, or four-note. | Rhythmic voicings | chord symbols, `CompingOptions` | `MusicContext` + MIDI list | `compingGenerator.test.ts` | not fret-solved; big-band grid | medium | ADAPTABLE |
| Guitar voicing engine | `core/composer/guitarVoicingEngine.ts` | `buildGuitarVoicingCandidates`, `pickBestGuitarVoicing` | Fret diagrams from pitch classes, span and parallel-fifth filters. | Voicings | chord id, pitch classes | not a score | guitar tests | standard tuning | low, as a filter | ADAPTABLE |
| Tritone-pair writer | `core/performance-composer/pcTritonePair.ts`, `pcTritonePairWrite.ts` | `composeTritonePair`, `writeTritonePair` | Guitar events: line, inner voice, grip, quartal dyad, mirror dyad, ending stack. | Notes | source MusicXML, seed | MusicXML | `performanceComposerTritonePair.test.ts` | fret slices; bass read, not rewritten by the plan itself | medium | **READY** |
| Respond | `core/performance-composer/pcRespond.ts` | `composeRespond` | Counterline or sparse answers in gaps. Characters are only `counterline` and `space`. | Notes | source XML, bar range, character, seed | lane events; session can write XML | `performanceComposerRespond.test.ts` | `assessGuitarFeasibility` on dyads | low for a short answer | **READY** |
| Pentatonic phrase (Dev 4–5) | `core/pentatonic/phraseOperators.ts`, Dev 4 sparse files | `realisePentatonicPhrase` | Motif pitches on a carried rhythm. Silence is an explicit operator. | Melodic notes | collection, motif, operator | pitches, not WWH XML | `pentatonicDev4*.test.ts`, `pentatonicDev5*.test.ts` | no fingering model | medium | ADAPTABLE |
| Quartal comp (Dev 5C) | `core/pentatonic/quartalField.ts` | `realiseQuartalComp` | Two or three MIDI pitches from one pentatonic field. File states it is not a guitar fingering model. | Voicing snapshot | pitch classes | MIDI list | `pentatonicDev5c.test.ts` | register only | medium | ADAPTABLE |
| Pentatonic path, form, Dev 6–7 | `core/pentatonic/recommendPath.ts`, `formDuoIntelligence.ts`, Dev 6–7 modules | `recommendPentatonicPath`, `assessDuoForm` | Regions, roles, common-tone jobs, field distance, graded-out choice. Dev 6A does not write notes. | Analysis | a passage or MusicXML | reads XML; does not write the piece | `pentatonicDev6*.test.ts`, `pentatonicDev7.test.ts` | role names match the duo | low, as a reading | ANALYTICAL |
| Jimmy Wyble etude | `engines/jimmy-wyble-engine/wybleGenerator.ts`, `wybleMeasureGenerator.ts` | `generateWybleEtude`, `generateWybleScore`, `generateLowerVoice` | Two guitar voices over a supplied progression. MusicXML export exists. | Counterpoint | chords, seed, ratios | own score model + XML | engine tests; Composer OS consumption tests | guitar etude, not locked WWH bass | high | ADAPTABLE |
| Wyble etude inside Composer OS | `core/goldenPath/wybleBypassGenerator.ts` | `generateWybleEtudeXml` | Etude MusicXML from canonical chords. | Counterpoint | chord list | MusicXML | `wybleEtudePitchOffset.test.ts` and duo/band consumption tests | same limit as the etude | high | ADAPTABLE |
| Wyble pair stub | `core/goldenPath/wyblePairGenerator.ts` | `generateWyblePair` | Two notes, each held to the end of a 4-beat bar, optional rest before the attack. | Fixed pattern | two pitches, two starts | neither | pair tests if any | not counterpoint | — | NOT RELEVANT |
| Wyble rule text | `core/counterpoint/wybleCounterpointRules.ts` | `wybleCounterpointRules` | Empty object. The rules are comments. They forbid falling back into a chord grip plus bass root. | Text | none | no | none as a generator | advice only | — | NOT RELEVANT |
| Wyble inner-line helper | `core/wyble/wybleInnerLineMotion.ts` | `nearestOctaveToPrevious` | Nearest octave of a pitch class. | Register choice | previous MIDI | no | inner-line tests | keeps a voice near the last one | low | ANALYTICAL |
| Duo lower guitar | `core/duo/duoRealisation.ts` | `realiseDuoLowerGuitar` | Role labels for a **second guitar**. On `guitar_bass` the lower guitar is empty rests. | Metadata | `DuoExportTruth` | no notes | `duoVaultHarmony.smoke.test.ts` | not this duo | — | NOT RELEVANT |
| Song Mode and golden-path duo | `core/song-mode/songModeBuilder.ts`, `core/goldenPath/generateGoldenPathDuoScore.ts` | slice precompute + `generateGoldenPathDuoScore` | A full duo score from a request. Harmony slices rewrite chords. | Whole piece | `GenerateRequest` | `ScoreModel` → MusicXML | composer smoke | would replace the locked bass | high | ADAPTABLE |
| Contrapuntal lines | `core/counterpoint/ContrapuntalLineEngine.ts` | `ContrapuntalLineEngine.generate` | Abstract SATB strands, later routed to quartet or big band. | Lines | line-first context | `AbstractLineSet` | counterpoint smokes | not fretted guitar | high | ADAPTABLE |
| Riff generator | `core/riff-generator/runRiffGenerator.ts` | `runRiffGenerator` | Short monophonic riffs. | Notes | riff request | `ScoreModel` | riff tests | guitar/bass riff preset, own harmony | high | ADAPTABLE |
| Motif layers | `core/arrangement/motifTransformer.ts` | `transformMotifThroughLayers` | Motif pitches pushed through tension layers. | Melodic notes | motif, layer | notes inside the vault melody path | vault chorus tests | more line, not chords | medium | ADAPTABLE |
| Fret solver | `core/performance-composer/pcFretboard.ts`, `core/barry-harris/guitarVoicingFeasibility.ts` | `solveFretPath`, `assessGuitarFeasibility` | Feasible or not, at a fret span. WPS already calls these. | Analysis | sounding guitar pitches | no | WPS and performance-composer tests | gate, not a composer | — | ANALYTICAL |
| Comping templates | `core/music-context/compingHarmonyTemplates.ts` | `barsFromHarmonyTemplate` | Chord-symbol bars. | Symbols | template id | no | music-context tests | big-band / New Orleans shells | — | NOT RELEVANT |
| Fagen keys comp | `core/goldenPath/fagenKeysCompMusical.ts` | keys-comp augment | Split-hand **keyboard** comp. | Keyboard notes | Fagen song context | Song Mode score | Fagen tests | piano | — | NOT RELEVANT |

Respond’s session also offers mixture, replace, insert, and keep (`pcRespondSession.ts`). Those rewrite or extend a score file. They are not candidates for a locked-bass passage. Leave them unused in V1.3.

`engines/composer-os-v2/scripts/wwhEV2Liquid.ts` is a song-list writer around `realizeTriadPair`. It is not a second engine. E-V2.0 is not the WPS E source. E-V3.0 is.

Songwriter slices and `VoiceRuleBundle` fingerprints apply style labels and harmonic devices inside Song Mode. They do not, by themselves, emit a guitar accompaniment for an existing WWH leadsheet.

## Tonality Vault

### What the table actually stores

Each of the 17 rows has:

- `leftHandShell`: scale-degree numbers, usually `[1, 3, 7]`, sometimes `[1, 4, 7]`, `[1, 4, 9]`, `[1, 3, 6]`, or a four-note diminished shell.
- `melodicTriadRoot`: a label such as `T3`, `T4`, or `T7`.
- `melodicTriadQuality`: major, minor, or diminished.
- `primaryTensionNote` and `tensionHierarchy`.

Types present: `Maj7#5`, `sus-b9`, `minMaj13#11#9`, `Maj7#11#9`, `sus9`, `min9`, `Maj7`, `Maj6`, `dim7b13`, `13#11#9`, `Maj7#11`, `minMaj9`, `min7b5`, `7#9#5`, `13b9`, `Maj9`, `min11`.

`selectQuadratonicMelodySpec` turns degrees into pitch classes. The “melodic triad” is often the **upper** structure (for major-seventh types, degrees 3, 5, and 7), not a root-position triad in the bass. That is the left-hand / right-hand split, stored as degrees. It is not a piano rendering and not a guitar rendering.

### Claim versus function

| Idea | What exists | Usable guitar accompaniment? |
| --- | --- | --- |
| Upper-structure triads | Melodic triad on the row, then `buildTopDownVoicing` puts that triad above one shell tone. | The triad pitch classes, yes, once the grip library frets them. The four-note keyboard stack, no. |
| Shell plus melodic triad | Same function. Bass anchor MIDI 48, upper anchor MIDI 60. | Description of a keyboard voicing. Drop the shell tone or one triad tone and the grip library’s dyads are the guitar form. |
| Common-tone transformation | No catalogue of transforms. `realizeTriadPair` records which fretted notes hold and which move between two parent triads. | Yes, when two triads are named and slots are given. |
| Liquid voice-leading | `planLiquidHarmony` names pitch classes and a 0.5-beat resolution offset. It does not move a voice across bars. | No. The moving voices are in `realizeTriadPair`. |
| Incomplete guitar voicings | Grip library builds every pair from the triad, and every triad-tone-plus-tension pair, span ≤ 4. | Yes. These are the dyads. |
| Moving inner voices | Triad-pair realisation moves one voice and holds another. `nearestOctaveToPrevious` only picks an octave. | Yes for two named triads. No as a general inner-voice engine. |
| Harmonically unrelated triads | `analyzeTriadPair` will accept two parent triads, including a pair with no shared pitch class. It does not invent the second triad. Tritone-pair chooses a mirror field from the guitar that is already in the file. | The realisation can play an unrelated pair. Nothing proposes the pair from the vault table alone. |
| Quadratonic chordal fields | The four pitch classes are real. `generateVaultRiff` style `quadratonic` arpeggiates them as eighth notes. Grip role `primaryQuadratonic` can fret all four inside span 4, which often yields nothing playable, and that is the correct guitar result. | Chordal use is the dyad and triad subsets, not the four-note grip and not the eighth-note riff. |

### Keyboard four-note voicing to a guitar dyad

Path that already exists, with no new engine:

1. Take the quadratonic from `selectQuadratonicMelodySpec` for a chosen vault type and a root that fits the **locked** bass pitch class.
2. Ask `buildGuitarGripLibrary` for `triad` and `tensionQuadratonic` grips of length 2, span ≤ 4.
3. Prefer a pair that keeps one pitch class from the previous dyad (`realizeTriadPair` already scores holds and moves when the slots are a passage).
4. Reject `generateVaultRiff`, `generateVaultTriadPairMonophonicBar`, and the vault phrase-template names. They do not comp.

`buildTopDownVoicing` can be read as a check that the guitar dyad is a subset of the keyboard stack. It should not be voiced as written.

`runCompingGenerator` is the other chordal stack, and it ignores this table. It parses a chord symbol into root, third, seventh, and sometimes fifth, then repeats that stack on a jazz beat pattern. Useful only if a passage is deliberately a shell-voicing bar. It is a poor default for these three pieces.

## Guitar role architecture

Plan roles as spans that already exist in the song’s narrative. A span keeps **one** texture. Inside the span, one voice may move and another may hold. That is development. A new technique every two bars is a different piece.

Do not assign percentages. Do not require a comping chorus.

| Role | What the guitar does | Where the notes should come from | What to leave alone |
| --- | --- | --- | --- |
| Melodic lead | One line. The fingerprints live here. | The leadsheet cell, or a selected `realisePentatonicPhrase` / Respond counterline only where the blueprint already asks for a new line. | Vault eighth-note riffs. |
| Chordal accompaniment | Dyads or a triad, same position family, for a whole narrative span. | `realizeTriadPair` or grip dyads. Change one voice. Keep a common tone. | Freddie Green beat patterns, unless one bar is explicitly a shell. |
| Chord-melody | The line thickens to a dyad on a few attacks, then returns to the line. | A grip dyad under a note that is already in the line. | A separate chorus of block chords. |
| Independent counterpoint | A second guitar voice for a few bars, then it stops. | `composeRespond` with `counterline`, or a short Wyble lower voice **rewritten** onto the existing bass. The etude’s own bass is not imported. | A full Wyble etude. The comment-only Wyble rules reject grip-plus-root as the normal texture; use Wyble for a line, not for the chordal span. |
| Bass-led dialogue | Guitar rests or answers late. The bass event stream stays the leadsheet. | Silence, then one answer. Respond’s `space` character is the same idea. | Any engine that regenerates the bass. Song Mode, the riff generator, and the vault chart pipeline do that. |
| Strategic silence | Whole-bar guitar rest, already listed in the spec. | Nothing. | Filling those bars with Liquid Response. `buildLiquidResponse` treats rests as space it may occupy. |

Texture change belongs at a seam the blueprint already names. The role span is longer than a measure. Impossible Metaphysics bars 34–43 are the existing example: dyads continue, and the upper or lower note changes, without a new technique each bar.

## Rehearsal directions

Keep every rehearsal letter that is already in the file. The Mirror’s A–L and Impossible Metaphysics’ A–F stay. Wrong Turning has none; do not invent a letter series.

Keep the printed structural words that name the form: Mirror’s M1, M1 colour, M2, Eb arrival, Afterglow; Wrong Turning’s five instructions; Impossible Metaphysics’ stage titles and motif tags. Those are landmarks, not clutter.

Add a direction only when the guitar’s job changes: line into a dyad field, dyad field back to a line, bass alone, or the return of the cell. One short playing instruction. Examples of the right weight: “dyads, same position”, “bass alone”, “line returns”. No engine name, no vault type id, no “liquid”, no new letter, no mark on every bar that uses the same texture.

`let ring` on Impossible Metaphysics is already doing this job on the chordal bars. More words on those bars would hide the landmarks.

## Proposed WPS V1.3

V1.3 is a writing rule plus one trial passage. It is not a new module.

1. **Guitar-role blueprint.** Optional list on the song spec: bar span, role from the table above, texture in one clause, and the seam where it changes. WPS prints it. Empty list stays valid so V1.2 specs still pass. No new FAIL.
2. **Candidates, then a person chooses.** For one span marked chordal accompaniment, generate options from `realizeTriadPair` and `buildGuitarGripLibrary` only. Keep a handful. Discard the rest. The compositional agent writes the chosen notes into MusicXML. WPS does not splice them.
3. **Vault material enters as dyads.** Root and chord type must sit on the locked bass pitch class of that span. Four-note keyboard voicings are a subset check. Quadratonic eighths stay out.
4. **Selection over concatenation.** One texture family for the span. A–H files stay inventory. Liquid Response is not run on the whole file, because it fills rests, including protected silence.
5. **Existing safeguards.** Bass event stream, metre, rehearsal marks, and protected guitar rests stay on the V1.2 lock. Fret solver after the passage exists. One DCR pass, on that passage only. No official numeric GCE. No second refinement without a named defect.

Out of scope: a role engine, a comping chorus, Song Mode regeneration, Wyble etude import, Respond replace/insert, new rehearsal letters, audio.

### Implementation size

Small. A printed spec field, a written ban on monophonic vault styles as accompaniment, and one hand-written passage. No change to `wpsAssess` failure rules until a later version asks for them.

### First musical test

**The Mirror, bars 30–33**, in a new edition after approval. Not in V1.1.

Those bars sit after the A-major colour at 25 and before the written G6 at 34. The guitar there is a line. The test is one dyad texture, common tone held, one voice moving, position stable, ending before the G6. Bars 9–11 and 51 stay the mirror-colour triads. Rests at 12, 15, 40, and 62 stay empty. Bass stays the leadsheet. If the passage needs a word, one direction at bar 30. No new letter.

Do not use `generateVaultRiff` for the test.

## Retrospective

Files read, not heard. Attack counts are guitar onsets. A chordal attack has two or more pitches. Solver output is not a player’s approval. No official GCE number is implied.

| Piece | File | Guitar attacks | Chordal | Chordal bars | Verdict |
| --- | --- | --- | --- | --- | --- |
| The Mirror V1.1 | `PERFORMANCE-EDITIONS/03-The-Mirror/03-The-Mirror-Performance-Edition-V1.1.musicxml` | 132 | 27 | 9–11, 13, 21, 25, 29, 37–39, 44–45, 51–52, 55, 59–60, 68 | **TARGETED ENHANCEMENT** |
| Wrong Turning V1.1 | `PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Performance-Edition-V1.1.musicxml` | 90 | 6 | 4, 9, 18, 24, 28, 32 | **TARGETED ENHANCEMENT** |
| Impossible Metaphysics V1.3 | `PERFORMANCE-EDITIONS/07-Impossible-Metaphysics/07-Impossible-Metaphysics-Performance-Edition-V1.3.musicxml` | 172 | 42 | 3–6, 8, 22, 27, 30–31, 34–43, 48–49, 55, 62, 67, 72 | **RETAIN** |

**The Mirror benefits most.** Sixty-eight bars, and the chords are mostly frozen triads for a half or a whole note (bars 9–10, 21, 25, 37–39, 44, 51). Bars 9–10 already move G under Eb/A, E/A, Eb/Bb, then the idea stops. Long stretches are a single line: the opening, M2, the climb through bar 33, M6, and the afterglow into bars 64–65. A moving-voice dyad passage has somewhere to live without replacing the fingerprints. Do not recompose the piece. V1.1 remains the checked score.

**Wrong Turning** is the sparsest chordally: six chordal attacks, each a punctuation (Bb/D, C/Eb, the Db triad, D/F/Ab, the final E/Bb). That sparsity is the piece. A comping chorus would fight “crooked, dry, physical” and the bass lead. The useful change, later and smaller than the Mirror test, is to let one of those punctuations **continue** as the same dyad for the E/Bb hold at bars 21–24, instead of adding a new chord family. Not a recompose. Not the first test.

**Impossible Metaphysics V1.3 already has the chordal passage.** Bars 34–43 are successive dyads: a lower note holds or steps while the upper note moves, with `let ring` on several of them. Bars 3–6 and 48 add triads. The one recorded refinement is the bar 67 rest. Another chordal layer would be a second refinement and would crowd the return at 65–72. Leave the file.

## Gaps

- WPS cannot ask an engine for a passage. The compositional agent has to call the function and copy pitches.
- Vault “dyad” and “triad pair” styles in `generateVaultRiff` are single-note lines.
- Phrase templates on `VaultChordRuleSet` are strings.
- No function takes `buildTopDownVoicing` and returns a bar of guitar dyads.
- Nothing proposes an unrelated second triad from the bass alone. A person names both triads, or the tritone-pair reader derives a mirror from guitar already written.
- Liquid Response fills silence. Protected rests have to be excluded by the caller.
- Comping output is a jazz beat grid without a fret check.
- Wyble’s implemented etude is counterpoint over **its** chord list. The three-voice rule file does not run.
- Song Mode and the golden-path duo replace harmony and bass. They fail strict bass LOCK if used as the performance score.
- Duo vault’s lower guitar does not exist on a guitar-and-bass topology.

## Counts

- Engines examined: **35**
- READY: **5** (grip library, triad-pair realisation, Liquid Response, tritone-pair writer, Respond)
- ADAPTABLE: **15**
- ANALYTICAL: **10**
- NOT RELEVANT: **5**
