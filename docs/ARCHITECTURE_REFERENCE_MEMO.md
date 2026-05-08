# Composer OS — Architecture Reference Memo

**Adopt / Fork / Study / Build Yourself**

───────────────────────────────────────────────────────────────────

## PURPOSE

───────────────────────────────────────────────────────────────────

Single reference for all external tools, repos, and research surfaced during GCE 9.0 planning. Every item is labelled:

- **ADOPT** — drop in with minimal change
- **FORK** — port or adapt into creative-engines
- **STUDY** — read before writing the relevant phase prompt
- **BUILD** — no usable prior art; build from scratch

───────────────────────────────────────────────────────────────────

## MUSICXML / SCORE I/O

───────────────────────────────────────────────────────────────────

**ADOPT** `musicxml-interfaces` (npm, TS)  
<https://www.npmjs.com/package/musicxml-interfaces>  
Best JS/TS MusicXML parser/serializer for Electron stack. Use for all MusicXML I/O alongside native exporter.

**ADOPT** `stringsync/musicxml` (GitHub, TS)  
<https://github.com/stringsync/musicxml>  
XSD-conformant MusicXML validator in TypeScript. Add to CI pipeline as Sibelius pre-flight gate. Supplement with xmllint + official MusicXML XSD for element-ordering regression (catches step/voice errors).

**STUDY** xmllint + MusicXML XSD workflow  
<https://blog.karimratib.me/2020/11/17/validate-musicxml.html>  
CLI validation gate. Use as CI step alongside stringsync.

───────────────────────────────────────────────────────────────────

## VOICE-LEADING / HARMONY ENGINE

───────────────────────────────────────────────────────────────────

**FORK** gml-harmonic-engine (your repo, MIT)  
Barry Harris voice-leading + ReasonCodes. Seed for VoiceRuleBundle schema (Phase 2). Rewrite in TypeScript — do not import directly.

**FORK** optimal-voice-leading (GitHub, Python)  
<https://github.com/willdickerson/optimal-voice-leading>  
Dijkstra graph-search cost minimisation for voice movement. Template for Phase 3b voice-leading solver cost function. Adapt: add jazz forbidden-parallel rules + MusicXML output.

**STUDY** romanyh (GitHub, Python)  
<https://github.com/napulen/romanyh>  
4-part SATB harmonization → MusicXML via music21. Read before Phase 3b. Shows constraint + export pipeline. Too tonal/classical to adopt directly.

**STUDY** Diatony (GitHub, C++/Gecode)  
<https://github.com/sprockeelsd/Diatony>  
Formal constraint programming model for harmony. Read for Phase 3b architecture only — not jazz-ready.

**STUDY** Contrapunk (GitHub)  
<https://github.com/contrapunk-audio/contrapunk>  
Named Barry Harris harmony mode in open-source tool. Read before finalising voicingPolicy in VoiceRuleBundle. Not MusicXML — reference for movement rules only.

───────────────────────────────────────────────────────────────────

## TENSION / HARMONIC SCENE

───────────────────────────────────────────────────────────────────

**STUDY** musical-tension-model (GitHub, Python)  
<https://github.com/mfarbood/musical-tension-model>  
Farbood tension model — section-level feature estimation. Use as fitness evaluator in Phase 5, not as a planner. Read before writing Phase 5 prompt.

**STUDY** midi-miner (GitHub, Python)  
<https://github.com/ruiguo-bio/midi-miner>  
Spiral-array tonal tension from MIDI. Backup tension signal service if Farbood model insufficient.

**BUILD** Harmonic Scene Engine (Phase 3b)  
No open-source planner found that drives note/chord choices toward a pre-specified tension target. Stub scaffolded in Phase 2+3a. Wire in Phase 3b.

**BUILD** Tension Arc Scheduler (Phase 5)  
Plan dissonance curve per section before composing. Use Farbood model as post-generation evaluator/fitness only.

───────────────────────────────────────────────────────────────────

## COMPOSER VOICE PROFILES

───────────────────────────────────────────────────────────────────

**STUDY** Wayne Shorter harmonic analysis thesis (ECU, 2018)  
<https://ro.ecu.edu.au/cgi/viewcontent.cgi?article=2520&context=theses_hons>  
Formally identifies: non-functional neighbour chords, minor-dominant usage, stepwise bass, movement in thirds, "wrong structure over right root." READ BEFORE Phase 3b — directly validates Shorter ruleset.

**STUDY** Henry Threadgill interval-set analysis (MTO, May 2025)  
<https://www.mtosmt.org/issues/mto.25.31.2/mto.25.31.2.capuzzo.html>  
Formal analysis of interval-pool constraints driving melody, harmony, counterpoint, and form. READ BEFORE Phase 3b — directly validates IntervalSetSystem.

**STUDY** Maria Schneider's Forms (UCI paper)  
<https://music.arts.uci.edu/abauer/3.1/notes/Geyer_On_Maria_Schneider.pdf>  
Solo-Recapitulation trajectory + formal space division. READ BEFORE Phase 6 — validates section-role architecture for large ensemble form.

**BUILD** All 7 deep voice profiles (Phase 2 — in progress)  
Evans, Schneider, Coltrane, Shorter, Metheny, Threadgill, Mingus. No open-source composer-rule systems found at required depth. VoiceRuleBundle is the build target.

───────────────────────────────────────────────────────────────────

## REHARMONISATION

───────────────────────────────────────────────────────────────────

**FORK** autoharmonizer (GitHub, Python)  
<https://github.com/sander-wood/autoharmonizer>  
Melody-to-chords with MusicXML dataset training. Starting point for reharmonisation agent (Phase 8). Replace chord language with explicit jazz vocabulary.

**BUILD** Jazz reharmonisation agent (Phase 8)  
Tritone subs, chromatic mediants, parallel motion — no open-source named-vocabulary jazz reharmonizer found.

───────────────────────────────────────────────────────────────────

## MOTIF / THEMATIC DEVELOPMENT

───────────────────────────────────────────────────────────────────

**STUDY** musicntwrk (GitHub, Python)  
<https://github.com/marcobn/musicntwrk>  
Pitch-class network distances + voice-leading spaces. Use for similarity scoring validation alongside existing motifSimilarityScorer.ts (S=0.35I+0.30R+0.20C+0.15G).

**STUDY** music21-mcp-server (GitHub, Python, Jun 2025)  
<https://github.com/brightlikethelight/music21-mcp-server>  
music21 wrapped as MCP API with pattern recognition. Potential Python sidecar for post-generation analysis.

**BUILD** Motif development + mutation engine (Phase 8)  
Deliberate below-threshold mutation for improv departure. Long-range thematic planning and call-and-response. No open-source integrated solution found.

───────────────────────────────────────────────────────────────────

## GUITAR / FRETBOARD

───────────────────────────────────────────────────────────────────

**ADOPT** gml-fretboard-projection (your repo, MIT)  
MIDI voicing → string/fret placement. Direct port into Phase 7. Rewrite in TypeScript.

**ADOPT** gml-fretboard-ui (your repo, MIT)  
Renders projection JSON as fretboard view. Use as Phase 7 UI component directly.

**FORK** optimal-voice-leading (guitar range defaults)  
Guitar-register voicing search already built in. Adapt for 6-string span + idiomatic fingering constraints.

**BUILD** Guitar etude / pedagogical constraint layer (Phase 7)  
Range, interval difficulty, fingering idiom. No mature open-source solution found.

───────────────────────────────────────────────────────────────────

## STRING ENSEMBLE

───────────────────────────────────────────────────────────────────

**STUDY** gml-quintet-composer (your repo)  
Guitar + string quartet combiner — ideas only. MusicXML has known Sibelius step errors. Do not port exporter directly — rebuild clean.

**STUDY** gml-riffgen (your repo)  
Quartet XML builder — element order diverges from Composer OS standard. Reference architecture only.

**BUILD** String ensemble instrument group (Phase 6)  
Register awareness, bowing, doubling rules, idiom. No open-source idiomatic string writing engine found. Schneider forms paper is best structural reference.

───────────────────────────────────────────────────────────────────

## JAZZ IMPROVISATION AGENT

───────────────────────────────────────────────────────────────────

**BUILD** Jazz improv / solo agent (Phase 8)  
LSTM projects found are generic scale-fitters — not motif-development agents for Shorter/Coltrane harmony. infinite-riff-machine (your repo, MIT) provides riff schema shell only. Build: skeleton pass → improv mutation pass → controlled stochastic render layer.

───────────────────────────────────────────────────────────────────

## JAZZ FORM SCHEDULER

───────────────────────────────────────────────────────────────────

**BUILD** Jazz form / song-form scheduler (Phase 5)  
AABA, suite, blues, head-development-shout-outro. No open-source jazz-specific form planner found. Molecular Music Generator (reference only — not jazz-aware).

───────────────────────────────────────────────────────────────────

## BIG BAND ORCHESTRATION

───────────────────────────────────────────────────────────────────

**BUILD** Big band section writing engine (Phase 6)  
Soli, backgrounds, shout chorus construction. No open-source big-band orchestration tool found. Schneider forms paper is primary structural reference.

───────────────────────────────────────────────────────────────────

## SYMBOLIC ANALYSIS INFRASTRUCTURE

───────────────────────────────────────────────────────────────────

**ADOPT** music21 (Python, BSD)  
<https://music21.org>  
MusicXML I/O + harmonic analysis + voice-leading utilities. Use as validation/correction sidecar — not for generation. Nothing found that supersedes it for symbolic analysis.

**ADOPT** partitura (GitHub, Python)  
<https://github.com/cpjku/partitura>  
Modern symbolic score infrastructure beyond music21. Use for score-aware transformations if music21 insufficient.

───────────────────────────────────────────────────────────────────

## GCE SCORING

───────────────────────────────────────────────────────────────────

**NOTE** grand-criteria-of-excellence-jazz (your repo)  
Pedagogy / method book / PDF content only. NOT the same as GCE_FRAMEWORK_V2.md automation. Do not conflate the two. Keep concepts separate. OpenTriad Python component — loose Phase 8 reference only.

───────────────────────────────────────────────────────────────────

## PHASE → RESOURCE QUICK MAP

───────────────────────────────────────────────────────────────────

```
Phase 2+3a  VoiceRuleBundle      gml-harmonic-engine (FORK)
                                  gml-composer-engines (STUDY)
                                  Contrapunk (STUDY)

Phase 3b    VL solver +          optimal-voice-leading (FORK)
            Harmonic scene        Shorter thesis (STUDY)
                                  Threadgill MTO (STUDY)
                                  romanyh (STUDY)
                                  musical-tension-model (STUDY)

Phase 4     RhythmDNA → motif    BUILD

Phase 5     Form + tension arc   musical-tension-model (STUDY)
                                  Schneider forms paper (STUDY)
                                  BUILD

Phase 6     String + big band    gml-quintet-composer (STUDY)
                                  Schneider forms paper (STUDY)
                                  BUILD

Phase 7     Guitar + étude       gml-fretboard-projection (ADOPT)
                                  gml-fretboard-ui (ADOPT)
                                  optimal-voice-leading (FORK)
                                  BUILD (pedagogy layer)

Phase 8     Improv agent         autoharmonizer (FORK)
                                  infinite-riff-machine (STUDY)
                                  musicntwrk (STUDY)
                                  BUILD

CI now      Validation           stringsync/musicxml (ADOPT)
                                  xmllint + XSD (ADOPT)
                                  music21 (ADOPT)
                                  partitura (ADOPT)
```

───────────────────────────────────────────────────────────────────

**END OF MEMO**

───────────────────────────────────────────────────────────────────
