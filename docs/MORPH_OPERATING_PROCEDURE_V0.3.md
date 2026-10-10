# MORPH Operating Procedure V0.3

Status: 10 October 2026. Procedure for applying `docs/MORPH_FRAMEWORK_V0.3.md` to a new composition.

This procedure is written so it can be used beyond *While We're Here* and beyond guitar and bass. Guitar checks in step 9 apply only when the instrument is guitar in standard tuning. Other instruments need their own feasibility notes. Do not borrow the WWH fretboard result as a verdict on a different part.

The method has been exercised on the WWH duo corpus only. That is not validation on unrelated compositions. Do not claim a transfer that has not been done.

MORPH produces MusicXML and Markdown only, unless the user explicitly asks for another file. Do not generate WAV, MP3, MIDI, TAB, or ZIP as part of this procedure. Sibelius is where the user reviews the score. Do not invent a numerical GCE score.

## 1. Import and understand the original

Name the authoritative source file. Record its path and a content hash.

Read the actual notes. Record:

- Title, bar count, metre, tempo, rehearsal marks.
- Which parts are locked, and which may change.
- Structural silences.
- The ensemble. If it is not guitar and bass, say so at the start and skip guitar-only tools later.

Do not treat a practice reduction, an older arrangement, or a higher version number as the source unless the source report says it is authoritative.

## 2. Identify the melodic DNA

Name 3–5 signature cells when the music has them: pitches, intervals, rhythm, bar.

Name the formal anchors: opening, important returns, final destination.

Write the recognition windows: the spans where the piece would stop being itself if the cell vanished.

This list is the identity contract for every later mode.

## 3. Establish immutable source locks

Write the lock list before composing:

- Locked pitches, rhythms, rests, ties, and onsets (for WWH, the upright bass).
- Bar count, metre, tempo, tempo changes.
- Rehearsal marks and form.
- Structural silences.
- Any further lock in the source report.

Chord symbols may change when the new harmony makes the old symbol false.

If a musical idea needs to break a lock, stop and write the conflict. Do not override the lock inside the file and mention it afterwards.

## 4. Choose M1, M2, or M3

State one mode:

| Mode | Choose it when |
|---|---|
| M1 Melody-led | The tune should stay substantially intact and the new idea is harmony or counterpoint. |
| M2 Motivic reconstruction | Characteristic cells should stay audible while contour, interval, and order change around them. |
| M3 Radical abstraction | Only a few motifs and the formal anchors should stay obvious. |

No mode is the better mode. M3 is not a quality upgrade. Pick the mode that matches the arrangement's idea. If several arrangements of one piece are being made, give each a distinct premise.

## 5. Generate source-derived transformations

Start from the strongest existing version of this arrangement, not from a blank page, when one exists. Name the passages that already work and leave them alone.

New events need a lineage a musician can hear: inversion, fragmentation, augmentation, interval expansion, rhythmic displacement, sequence, register transfer, or counterpoint derived from a named cell.

Allowed changes are listed in the framework §6. Changed-bar counts are diagnostics, not a score. Do not replace a stronger page because the new page changes more notes.

For WWH, Composer OS modules may be consulted when their function fits the metre, the locked bass, and the premise. Reading a module is not running it. The Jimmy Wyble engine is counterpoint guidance unless it is actually executed. Do not claim it composed a bar it did not compose.

## 6. Develop phrases, voice-leading, and instrumental interaction

The premise has to operate across the form: statement, variation, contrast, return, ending.

Check:

- The return is recognisable and sits at a structural point.
- Counterpoint is a line, with independence, shape, and air. More notes are not better.
- Parts talk. Rests and handoffs count.
- Arrangements of the same source do not collapse into one texture.

A sparse idea may live in a few events if those events are structurally enough. Say that explicitly when it is the case.

## 7. Compare candidates with the strongest previous version

For each candidate, record:

- Musical improvement, tied to bar numbers.
- Musical regression, if any.
- Identity retention against the cells and anchors.
- Phrase-development change.
- Practical concerns.
- Why this file was kept.

Outcomes:

- **KEEP** — copy the previous file. Say that it is a copy. Do not recompose it.
- **DEVELOP** — edit only the named weak bars.
- **REWRITE** — blueprint from the cells first, then the new notes. Keep the anchors.

One corrective pass. If the new version is weaker, revert and say why.

## 8. Verify structural and source integrity

Against the authoritative source, check the locks from step 3 on the finished MusicXML, not on the map's claims.

Also check measure durations, ties, and that a protected rest is still a rest.

A matching note count is not an event comparison. Read the stream.

Separate the report into technical integrity and composition review. Do not collapse them into one word.

## 9. Guitar feasibility, when the part is guitar

Skip this step for instruments that are not guitar. Say that it was skipped and why.

When the part is guitar in standard tuning, call the existing functions. Do not re-implement them.

1. Convert the part to timed **sounding** pitches. Apply `octave-change`. Written octave is not sounding pitch.
2. Leave non-guitar parts out of the calculation. On WWH, the upright bass stays out.
3. Run `fingeringOptions` and `solveFretPath` from `engines/composer-os-v2/core/performance-composer/pcFretboard.ts`.
4. Where that path fails, run `assessGuitarFeasibility` from `engines/composer-os-v2/core/barry-harris/guitarVoicingFeasibility.ts` with and without stretch.

Record the result with the guitar words, which are not the musical words from step 7:

| Word | Meaning |
|---|---|
| PASS | `solveFretPath` fingered every guitar attack. |
| REVIEW | The path failed, and a string assignment still exists within fret 22 and fretted span 5, or the only refusal is the four-note cap. Unverified as physical playing. |
| FAIL | No assignment within fret 22 and fretted span 5. |

Current solver limits, to record accurately:

- `pcFretboard`: fret 15, fretted span 4, at most four pitches, highest pitch forced onto the highest string, open strings excluded from the span, held notes keep string and fret. A shift of more than five frets in under one quarter is a hard shift.
- `guitarVoicingFeasibility`: fret 22, span 4, stretch span 5, at most four pitches, any string order, open strings included in the span.
- Neither model includes barre, thumb, harmonics, capo, alternate tuning, or slide-as-shift.
- No 24-fret path search unless that search was actually run.

Do not treat an engine limit as an impossible chord. Do not rewrite a five-fret stretch, a fret 16–22 note, or a five-note grip that already fits the hand, only to obtain PASS. A confirmed FAIL may be corrected in the smallest musical way that keeps the premise, usually a secondary voice, and then re-checked. Correcting a grip is not musical approval.

Wyble constraints in `wybleGenerator.ts` and `WYBLE_ENGINE_GUITAR_CONSTRAINTS_REPORT.md` may inform the counterpoint judgement. They are not this pass/fail gate unless that generator was run.

On the existing 36 WWH scores the result was 20 PASS, 16 REVIEW, 0 FAIL. The 16 REVIEW files remain unverified by a player. That inventory is not a template result for the next piece. Run the checks again.

## 10. Evaluate against GCE musical criteria

Qualitative review follows `docs/GCE_FRAMEWORK_V3.md`: identity, transformation, development, anti-mechanism, idiom, and the evidence actually in hand.

Numerical review follows `docs/GCE_FRAMEWORK_V2.md` only when the official evaluator is run on a representation it was built to score. Hand-authored MusicXML is not automatically that representation. If the evaluator is not run, write "no official numerical GCE evaluation". Do not estimate a number.

Do not change evaluator code, weights, formulas, or hard gates as part of this procedure.

Use V3 labels only as defined:

- **TECHNICAL FAIL**
- **MUSICAL REVISE**
- **CANDIDATE FOR AUDITION**
- **MUSICALLY APPROVED**

Guitar PASS is none of these by itself.

## 11. Produce MusicXML and a compositional map

For each kept arrangement, write:

- One MusicXML score. New name if the notes changed. A KEEP copy keeps its musical version in the name and says it is a copy.
- One Markdown map: source path, source hash, mode, cells and anchors, what changed by bar, lock result, guitar result if step 9 ran, and what was not done (listening, playing, numeric GCE).

Do not retitle a score to the method's version number. A score made under V0.2 stays V0.2 when the method document becomes V0.3.

Keep previous editions. Do not overwrite leadsheets or earlier MORPH folders.

## 12. Reserve musical approval for human review

Hand the MusicXML to a person. The intended reading environment is Sibelius: open as a new score, do not overwrite unrelated user scores.

Musical approval requires that review. For technical guitar writing it also requires someone playing the part. Notation validation, a solver PASS, and a map are not approval.

Until that evidence exists, the honest status is the one that matches the checks: for the preserved WWH set, **MORPH V0.2 — Guitar-Feasibility Assessed, Musically Unapproved**.

Stop there. Do not open a further compositional correction pass in order to make the method look finished.
