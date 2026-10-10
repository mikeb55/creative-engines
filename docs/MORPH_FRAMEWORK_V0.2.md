# MORPH Framework V0.2

**Musical Originality, Recognition & Phrase-Heritage**

Status: V0.2 working method, 10 October 2026. Not a validated transferable system. Not a listening result.

V0.1 remains the pilot record: `docs/MORPH_FRAMEWORK_V0.1.md`. V0.2 adds safeguards after the Black Aura comparison. It does not replace GCE. The later method document is `docs/MORPH_FRAMEWORK_V0.3.md`. This file stays the V0.2 record. WWH scores selected under V0.2 stay labelled V0.2.

Numeric authority stays in `docs/GCE_FRAMEWORK_V2.md`. Qualitative evidence and the ban on invented scores stay in `docs/GCE_FRAMEWORK_V3.md`.

## 1. What changed from V0.1

The Black Aura pilot showed that a rewrite can be more radical and still be a weaker piece. Pentatonic Collision MORPH V0.1 dropped V2.1's broader development. Changed-bar counts did not rank the music.

V0.2 therefore starts from the strongest existing version and edits only a demonstrated weakness.

## 2. Principles carried forward

From V0.1, still in force:

1. Identity. Signature cells, formal anchors, and a real return, judged on pitches and rhythms.
2. Transformation. Harmony, melody, rhythm, and counterpoint may change. Decoration of the leadsheet is not the aim.
3. Development. New material comes from the source and changes across the form.
4. Instrumental intelligence. Electric guitar and upright bass. A legal MIDI pitch is not a playable grip.
5. Excellence. GCE V3.0 is the evidence contract. Do not weaken V2.0 hard gates.

The 65% / 20% / 40% listening sketch is still not a quota. 65% melodic identity is not 65% compulsory exact-note retention.

Levels M1, M2, and M3 are unchanged. No level outranks the others.

Source locks are unchanged: bass pitches, rhythms, rests, ties, and onsets; bar count; metre; tempo; rehearsal marks; structural silence. If an idea needs to break a lock, write the conflict down. Do not override the lock quietly.

## 3. Safeguards added in V0.2

### A. Strongest-existing-version protection

Before a rewrite, name the strongest passages already on the page. Protect successful motifs, counterlines, harmonic transformations, silence, and formal returns.

Never replace an arrangement because the new version is more radical or has more changed notes.

A revision must improve at least one significant musical weakness without damaging source recognition, phrase coherence, guitar idiom, or an existing strength. If that improvement cannot be shown, keep the previous version.

### B. Minimum meaningful development

The central idea has to operate across the composition.

A few isolated rewritten bars are not a full-form transformation unless a sparse or episodic idea makes those events structurally sufficient.

### C. Source identity without excessive conservatism

Keep recognisable motifs and formal anchors.

Melodic notes, rhythm, harmony, and register may still change substantially.

### D. Counterpoint quality

Judge the line: horizontal independence, melodic shape, contrary and oblique motion, voice exchange, register, breathing space, and whether a guitarist can hold it.

More notes are not better counterpoint.

Jimmy Wyble's three-voice rules are a reference for this judgement: independent melodies, limited parallel motion, dissonance on weak beats, phrases that do not end on the same degree. Consulting those rules is not the same thing as running the Wyble engine.

### E. Comparative quality

Every new score is compared with the strongest existing version. Record:

- Musical improvement.
- Musical regression, if any.
- Identity retention.
- Phrase-development improvement.
- Technical and practical concerns.
- Evidence for the selection.

### F. No false approval

| Evidence | What it may claim |
|---|---|
| MusicXML integrity | The file parses and the locks that were checked still match. |
| Notation assessment | Someone read the notes and tied a musical judgement to bar numbers. |
| Rendering | Audio was produced. It was not heard unless a person says they heard it. |
| GCE numeric | Only if the real evaluator ran on a representation it was built to score. |
| Listening superiority | Only with an actual listening comparison. |
| Guitar approval | Only after the guitar is played. |

Do not manufacture a GCE number. Do not call a rendered file heard.

## 4. Outcomes

KEEP, DEVELOP, and REWRITE still mean what they meant in V0.1. They are notation judgements until someone listens and plays.

KEEP: copy the file. Do not recompose it. Say that it is a copy.

DEVELOP: change the named weak bars. Leave the rest.

REWRITE: write a blueprint from the source cells first, then the new notes. Keep the anchors.

One corrective pass is allowed. If the new version is weaker, revert and say why.

## 5. MusicXML only

MORPH produces MusicXML scores and Markdown documentation only.

Do not generate WAV, MP3, MIDI, audio-rendering packages, or ZIP archives unless the user explicitly asks for that file.

Do not treat audio rendering as a requirement for a musical judgement. MusicXML is the authoritative deliverable. Sibelius is the intended place for the user to look and listen.

A score has been heard only if someone heard it. It has been played only if a guitarist played it. It is musically approved only with that evidence. Notation validation is not listening and not approval.

## 6. Guitar fretboard check

Future guitar MORPH scores go through the Composer OS fretboard functions before a version is kept. Do not add a second rule set.

Call these. Do not re-implement them:

- `fingeringOptions` and `solveFretPath` in `engines/composer-os-v2/core/performance-composer/pcFretboard.ts`. Standard tuning, sounding pitch. Open strings E4 B3 G3 D3 A2 E2. Search stops at fret 15. Fretted span stops at 4. At most four pitches. A held pitch keeps its string and fret. A shift of more than five frets in under a beat is reported.
- `assessGuitarFeasibility` and `isGuitarVoicingFeasible` in `engines/composer-os-v2/core/barry-harris/guitarVoicingFeasibility.ts`. Same tuning. Search stops at fret 22. Normal span 4. Stretch span 5. At most four pitches. Use this when the fret-15 path fails, to separate a high but playable note from a note the first solver cannot see.

MusicXML has to be turned into timed sounding pitches first. Honour `octave-change`. Keep the upright bass out of the guitar calculation. A grip the fret-15 solver misses can still be playable: fret 16–22, a five-fret stretch, or more than four notes that still sit on six strings. Those stay REVIEW unless a real pitch is outside fret 22. Do not treat an engine limit as proof that the chord is impossible. Do not claim a 24-fret test unless that search was actually run.

Jimmy Wyble's guitar notes (`engines/jimmy-wyble-engine/WYBLE_ENGINE_GUITAR_CONSTRAINTS_REPORT.md`) are counterpoint guidance: vertical span, position, string jumps. They do not replace the two functions above.

This check is not guitar approval. Approval still requires someone playing the part.

## 7. Where the files live

- This method: `creative-engines/docs/MORPH_FRAMEWORK_V0.2.md`
- Cursor rule: `.cursor/rules/morph-musicxml-only.mdc`
- WWH scores and the comparison report: the album project, `WWH-PRACTICE/WWH-PLAY/MORPH-V0.2/` and `WWH-PRACTICE/95-REPORTS/MORPH-V0.2/`
- Sibelius selection from the playability pass: `WWH-PRACTICE/WWH-PLAY/MORPH-V0.2-SIBELIUS/`. It does not replace the V0.2 folder.
- Guitar-verified copies and corrections: `WWH-PRACTICE/WWH-PLAY/MORPH-V0.2-GUITAR-VERIFIED/`. Report: `WWH-PRACTICE/95-REPORTS/MORPH-V0.2/MORPH-GUITAR-FEASIBILITY-REPORT.md`. Neither replaces the Sibelius folder.
- Do not edit authoritative leadsheets, V2.0, V2.1, MORPH V0.1, production engines, or GCE evaluator code as part of this pass.
