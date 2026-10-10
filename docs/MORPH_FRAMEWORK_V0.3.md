# MORPH Framework V0.3

**Musical Originality, Recognition & Phrase-Heritage**

Status: V0.3 working method, 10 October 2026. A reusable compositional procedure. Not a validated transferable system. Not a listening result. Not musical approval of any score.

Prior records, still in force as history:

- `docs/MORPH_FRAMEWORK_V0.1.md` — pilot principles, three modes, source locks, KEEP / DEVELOP / REWRITE.
- `docs/MORPH_FRAMEWORK_V0.2.md` — strongest-version protection, comparative selection, MusicXML-only rule, first guitar-solver contract.

V0.3 consolidates both. It does not replace GCE. It does not rename existing scores.

Numeric authority stays in `docs/GCE_FRAMEWORK_V2.md`. LOCK, DCR, and the Style Profile Layer stay in `docs/GCE_LOCK_DCR_STANDARDS.md`. Qualitative evidence and the ban on invented scores stay in `docs/GCE_FRAMEWORK_V3.md`.

Cursor constraint: `.cursor/rules/morph-musicxml-only.mdc`.

How to run a new piece: `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`.

## 1. Definition, scope, and ownership

MORPH recomposes an existing piece so a listener can still tell what it is, while harmony, counterpoint, rhythm, and register may change a great deal.

MORPH is a method for people and agents writing MusicXML. It is not a Composer OS preset, not a new evaluator, and not an automatic arranger. Composer OS modules may be used when their actual function fits the metre, the locked parts, and the arrangement's idea. Reading a README is not running an engine. If a module is the wrong tool, say so.

**Scope.** Any existing composition with an authoritative source. The first corpus is *While We're Here*: nine electric-guitar and upright-bass pieces, four arrangements each. That corpus does not prove the method on other music, other ensembles, or other instruments.

**Ownership.**

| Thing | Home |
|---|---|
| Method, this document, the operating procedure | `creative-engines` (`docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`) |
| WWH scores, maps, and album reports | album repository, currently `https://github.com/mikeb55/ECM-Orbit-Album-2027` on branch `home/mike` |
| GCE V2 formulae and the official evaluator | `creative-engines`, unchanged by MORPH documentation |

A finished MusicXML file is not evidence that MORPH worked. Evidence is a comparison of actual notes: what was kept, what was transformed, what still fails, and whether anyone has looked in Sibelius, listened, or played.

## 2. MORPH composition and GCE evaluation

MORPH composes. GCE evaluates.

- GCE V2.0 is the only numerical evaluator. Its ten categories, formulas, weights, and hard-gate thresholds stay as written. MORPH must not weaken them to make an experiment pass.
- GCE V3.0 is the qualitative evidence contract: source identity, development, idiom, and what was actually verified. It does not produce a V3 score.
- A MORPH score is not a Composer OS generation object unless it was actually produced by that pipeline. Do not feed a hand-authored WWH file to the official evaluator and treat a crash, a skip, or a mismatched representation as a musical result.
- Report a GCE number only when the real V2.0 evaluator ran on a representation it was built to score, and log the evaluator version, the input, and the measurements.
- WWH release words from V3.0 — **TECHNICAL FAIL**, **MUSICAL REVISE**, **CANDIDATE FOR AUDITION**, **MUSICALLY APPROVED** — are evidence labels. No automated pass confers **MUSICALLY APPROVED**.

The 65% melody / 20% harmony / 40% rhythm sketch in V0.1 and V3.0 is a listening heuristic. It is not a quota and not a note-count target. 65% melodic identity is not 65% compulsory exact-note retention.

## 3. Five principles

1. **Identity.** Keep recognisable musical DNA: signature cells, formal anchors, and a real return. Judge this on pitches and rhythms, not on programme notes.
2. **Transformation.** Harmony, melody, rhythm, and counterpoint may be reinvented. The point of an arrangement is the new musical idea, not a decoration of the source.
3. **Development.** New material comes from the source and changes across the form: statement, variation, contrast, return.
4. **Instrumental intelligence.** Write for the instruments that will play. For the WWH duo that is electric guitar and upright bass. The bass is a melodic partner. A pitch inside a MIDI range is not proof a grip is playable. For other ensembles, replace the guitar checks with checks for those instruments. Do not pretend a guitar solver judged a piano part.
5. **Excellence.** Use GCE V3.0 as the evidence contract. A human still has to review the score in Sibelius and, where the writing is technical, play it. Do not weaken V2.0 hard gates.

No principle outranks the others. A more radical surface that loses the piece, or a legal fingering that is musically empty, fails the method.

## 4. Three modes

No mode is better than the others. Pick the mode that matches the arrangement's idea. State the mode before writing notes.

| Mode | Name | What stays obvious | What may change |
|---|---|---|---|
| M1 | Melody-led | The principal tune, substantially intact | Harmony and counterpoint |
| M2 | Motivic reconstruction | Characteristic cells, developed | Contour, interval, and the order of events around those cells |
| M3 | Radical abstraction | A few signature motifs and formal anchors | Most of the surrounding music |

M3 still needs a listener to recognise the source at the anchors. Radical is not a synonym for better. The Black Aura pilot showed a more radical rewrite can be the weaker piece.

## 5. Melodic-identity guardrails and transformational lineage

Apply these to the source before writing, and check them against the finished notes.

**A. Signature motifs.** Name 3–5 cells when the source has enough music. Record pitches, intervals, rhythm, and bar.

**B. Formal anchors.** Name what a listener uses to know where they are: the opening, the important returns, the final destination.

**C. Recognition windows.** Long stretches must still carry the tune, either quoted or transformed so the cell is audible. A quote of two notes followed by unrelated music does not count.

**D. Transformational lineage.** Say how each important new idea comes from a source cell: inversion, fragmentation, augmentation, interval expansion, rhythmic displacement, sequence, register transfer, counterpoint, or another defence a musician can hear.

**E. Meaningful return.** After the most abstract passage, bring recognisable material back at a structural point (a return, a peak, or the ending), not as a token in bar 2 only.

The original bass line does not, by itself, prove that the other part is still the piece.

High retention of the original melody is not a failure. Low retention is not a success.

## 6. Controlled transformation

Allowed, when the bar has a reason:

- Reharmonise, or drop the original chord symbols when the new harmony is what sounds.
- Add counterpoint and inner melodies.
- Move the tune into an inner register.
- Change contour, break cells up, invert them, widen their intervals.
- Displace or interrupt the rhythm inside the locked metre.
- Use dissonant, ambiguous, or unresolved harmony.
- Phrase asymmetrically inside the locked form.
- Use silence and thin texture on purpose.
- Use distinct registers and instrumental gestures.

Control means each change has a lineage back to a source cell or a named formal job. Decoration, a fixed attack grid, and an arbitrary pitch-class cycle are not transformations.

Changed-bar counts do not rank the music. They may be recorded as diagnostics. They are not a quality score.

## 7. Phrase development, structural recognition, and returns

The central idea has to operate across the composition.

A few isolated rewritten bars are not a full-form transformation unless a sparse or episodic idea makes those events structurally sufficient.

Name the premise, then the path: statement, variation, contrast, climax or restraint, return, ending appropriate to the original form. The return is a structural event. Restoring the source ending after a passage that never stated the idea is not development.

Judge counterpoint as a line: horizontal independence, melodic shape, contrary and oblique motion, voice exchange, register, breathing space, and whether the instrument can hold it. More notes are not better counterpoint.

Within one source, arrangements must be distinct in texture, rhythmic grammar, register, harmony, or the way the parts talk. Four files that share one top line are one arrangement copied three times.

## 8. Guitar, bass, and instrumental intelligence

This section is the WWH duo case. Other ensembles keep the principle and drop the guitar-specific checks.

- Electric guitar and upright bass are the instruments. The bass is a melodic partner, not a root machine.
- Guitar voices should be able to speak independently: rests, handoffs, and space are part of the writing.
- A wide voicing can be playable. An impractical stretch is a different fact. See §12 before rewriting either.
- Technical feasibility is not a convincing performance. A path the solver accepts can still be unmusical. A path the solver refuses can still be the right music.
- Jimmy Wyble's three-voice counterpoint is a reference for judgement: independent melodies, limited parallel motion, dissonance placed on weak beats, phrases that do not end on the same degree. Consulting those ideas is not the same thing as running the Wyble engine.

On the 36 WWH arrangements the Wyble generator was not run. `engines/jimmy-wyble-engine/WYBLE_ENGINE_GUITAR_CONSTRAINTS_REPORT.md` was read as guidance only. It was not a pass/fail gate.

The generator's own constants, for reference when someone does run it, live in `engines/jimmy-wyble-engine/wybleGenerator.ts`: upper register MIDI 64–76, lower register MIDI 48–60, preferred vertical gap 12 semitones inside a 10–17 window, reject at 18, preferred dyad intervals `[3, 4, 8, 9, 10, 15, 16, 17]`. Those constants shape Wyble's own studies. They do not score a MORPH MusicXML file.

## 9. Existing Composer OS guitar tools

Do not add a second guitar rule set. Do not duplicate these implementations. Call them.

**Path solver** — `engines/composer-os-v2/core/performance-composer/pcFretboard.ts`

- `fingeringOptions`, `solveFretPath`.
- Standard tuning, sounding pitch. Open strings, string 1 to string 6: MIDI 64, 59, 55, 50, 45, 40 (E4 B3 G3 D3 A2 E2).
- Search stops at fret 15 (`FRET_MAX`).
- Fretted span stops at 4 (`SPAN_MAX`). Open strings are left out of that span.
- At most four distinct pitches. Five pitches return no options.
- Highest pitch is forced onto the highest available string, then the next pitches downward. A legal grip that puts a lower pitch on a higher string than a higher pitch is invisible to this function.
- A held pitch must keep its string and fret.
- A hand shift of more than five frets in under one quarter is reported as a hard shift. On the 20 WWH paths that passed, hard shifts were 0.

**Voicing check** — `engines/composer-os-v2/core/barry-harris/guitarVoicingFeasibility.ts`

- `assessGuitarFeasibility`, `isGuitarVoicingFeasible`.
- Same tuning, stored low string to high string: MIDI 40, 45, 50, 55, 59, 64.
- Search stops at fret 22.
- Normal span 4. Stretch span 5 when `allowStretch` is set.
- At most four pitches. More than four returns not feasible. Any string order is allowed.
- Open strings are included in its span, so an open string beside a high fret can look impossible when the fretted fingers are close.

Use the fret-22 check when the fret-15 path fails, to separate a high but playable note from a note the first solver cannot see.

MusicXML has to be turned into timed sounding pitches first. Honour `octave-change`. Keep the bass out of the guitar calculation. No 24-fret path search has been run on the WWH set. A single pitch's fret on the open high E (`midi - 64`) is arithmetic, not a path solver.

Not in either model: barre, thumb, harmonics, capo, alternate tuning, or a slide used to survive a shift.

### Sounding pitch and written guitar pitch

The solvers take sounding MIDI. Printed octave is not sounding pitch when the part carries `octave-change`.

On the 36 WWH guitar-verified scores, as recorded in the feasibility report:

- Most files set `octave-change` to -1. Written guitar pitch sounds an octave lower.
- Wrong Turning has no transpose element. Its pitches were taken as written.
- Small Testimony and After Everything set `octave-change` to 0. Their lowest sounding notes reach Bb2, which is on the instrument, so a second octave drop was not applied.
- No sounding pitch in those 36 files is above high-E fret 22 (D6, MIDI 86) or below E2 (MIDI 40).

Meet Me at Hobo's is 12/8 with `divisions` 1 and eighth notes stored as duration 1, so the raw sum is 12 quarters in a 6-quarter bar. The feasibility pass scaled durations by 1/2 to the metre before shift checks. Note order and overlaps stayed as in the file. A later check that skips that scale will mis-time the shifts.

## 10. Source-lock validation and regression comparison

Locks, unless the source report names a different set:

- Authoritative bass pitches, rhythms, rests, ties, and onsets, when the bass is a locked part.
- Bar count and metre.
- Tempo and tempo changes.
- Rehearsal marks and form.
- Ensemble silences the source marks as structural.
- Any other lock written in the source report.

Original chord labels may change when they would lie about the new harmony.

If a musical idea needs to break a lock, write the conflict down. Do not override the lock quietly.

Before a rewrite, name the strongest passages already on the page. Protect successful motifs, counterlines, harmonic transformations, silence, and formal returns.

Never replace an arrangement because the new version is more radical or has more changed notes.

Every candidate is compared with the strongest existing version. Record:

- Musical improvement.
- Musical regression, if any.
- Identity retention.
- Phrase-development improvement.
- Technical and practical concerns.
- Evidence for the selection.

One corrective pass is allowed. If the new version is weaker, revert and say why.

On the WWH V0.2 comparative pass, source-lock rows for bass pitched stream, bar count, and metre were pass on all 36, with rehearsal-mark checks against the file that was copied or edited. That is a notation lock result. It is not a listening result. The later guitar pass reported bass text, measure numbers, time signatures, rehearsal marks, metronome marks, and durations unchanged on all 36 guitar-verified files, including the four octave corrections.

## 11. KEEP / DEVELOP / REWRITE

Read the MusicXML. Do not inherit a PASS from an older markdown map.

| Outcome | Meaning |
|---|---|
| KEEP | Strong, distinct, and technically sound on the notation evidence. Copy the file. Do not recompose it. Say that it is a copy. |
| DEVELOP | The idea is worth keeping. Change the named weak bars. Leave the rest. |
| REWRITE | The declared idea does not happen, or the arrangement is mechanical, decorative, or no longer the source. Write a blueprint from the source cells first, then the new notes. Keep the anchors. |

These are notation judgements until someone reviews them in Sibelius and, for guitar, plays.

A revision must improve at least one significant musical weakness without damaging source recognition, phrase coherence, instrumental idiom, or an existing strength. If that improvement cannot be shown, keep the previous version.

## 12. PASS / REVIEW / FAIL, and solver limits

These three words, in the guitar feasibility report, are computational guitar results. They are not KEEP / DEVELOP / REWRITE. They are not GCE. They are not musical approval.

Definitions used on the 36 WWH scores (`WWH-PRACTICE/95-REPORTS/MORPH-V0.2/MORPH-GUITAR-FEASIBILITY-REPORT.md`):

| Result | Meaning |
|---|---|
| PASS | `solveFretPath` returned a fingering for every guitar attack. |
| REVIEW | That path did not, and a string assignment still exists within fret 22 and a fretted span of 5, or the only refusal is the engines' four-note cap. |
| FAIL | No string assignment at fretted span ≤ 5 and fret ≤ 22. That was the only class treated as a confirmed failure eligible for a pitch correction. |

Final guitar-verified collection: **20 PASS, 16 REVIEW, 0 FAIL**.

The 16 REVIEW scores are explicitly unverified as physical guitar playing. REVIEW means the solvers did not return a clean fret-15 path. It does not mean a guitarist has accepted the grip, and it does not mean the grip is impossible.

### Real incompatibility and solver limits

Real incompatibility, under the checks that were actually run: no assignment on six strings within fret 22 and fretted span 5. Nothing in the final 36 sits in that class.

Solver limits, which must not be treated as proof the chord is impossible:

- Fret-15 ceiling. A sounding A5 (MIDI 81) is fret 17 on high E. `solveFretPath` cannot see it. `assessGuitarFeasibility` can.
- Fretted span 4, with stretch 5 only in the Barry Harris check.
- Four-pitch cap. A five-note grip that already fits the hand fails both engines. Palace Gates, bar 16, B3 G3 E3 D3 B2, fretted span 0 (open strings plus fret 7), was left unchanged for this reason.
- `fingeringOptions` will not place a higher pitch on a lower string than a lower pitch. Polychordal Fractures, bar 13, Bb3 G3 D3 C#3, has a legal grip the report names (Bb3 on the D string fret 8, G3 open, D3 on the A string fret 5, C#3 on the low E fret 9, fretted span 4). Both solvers miss it. Barry Harris counts the open G, so its span becomes 9. That bar stays REVIEW.
- Barry Harris includes open strings in the span. `pcFretboard` does not.

### Playable wide voicings and impractical stretches

A five-fret stretch, a note on frets 16–22, or a five-note chord that already has a span ≤ 4 assignment was not rewritten. Those stay REVIEW.

Confirmed failures that were corrected were secondary-guitar-voice octave moves only, where the fretted span was 6 or 7 and no assignment existed inside span 5 and fret 22:

1. Impossible Metaphysics, Pentatonic Time Warp — voice-2 notes up one octave in bars 4, 11, 27, 30, 35, 41. Bar 40 remains a span-5 stretch and stays REVIEW.
2. Impossible Metaphysics, Polychordal Fractures — bar 4 voice 2 D#4 moved to D#5. Bar 13 left as written (solver miss above).
3. The Mirror, Chordal Mirror — bars 56, 57, and 61, secondary voice only. Bar 13 remains a five-fret stretch and stays REVIEW.
4. Wrong Turning, Harmonic Trapdoors — bars 9 and 12, voice-2 triad down one octave. Five notes remain, so both engines still return no grip. The note was not deleted. Stays REVIEW.

32 of the 36 guitar parts are unchanged copies of the Sibelius-ready files. Voice 1 primary pitches were unchanged on the four edited files. This 20 / 16 / 0 result is a solver inventory after that selective correction. It is not completed musical validation.

### Feasibility and performance

A PASS fingering is a computational path under the limits in §9. It is not a musical performance and not guitar approval. Approval still requires someone playing the part. A REVIEW grip may be the better musical choice. Do not thin a chord only to satisfy the four-note cap.

## 13. GCE V3 and the official numerical evaluator

Use V3.0 §5 as the qualitative checklist: source identity and lineage, development and anti-mechanism, idiom, whether an engine was actually run, and separate evidence for parse, lock check, notation reading, import, playback, physical play, and acceptance.

Do not invent a numerical GCE score. Do not report a V3 score. The official evaluator runs only on a representation it was built to score.

The 36 WWH guitar-verified scores have no official numerical GCE evaluation. V2.0 calibration (9.0 north star, 7.9–8.4 release band, hard gates) applies when that evaluator is actually run on Composer OS output. It must not be copied onto these hand-authored files as if it had run.

WWH labels:

- **TECHNICAL FAIL** — malformed file, lock break, broken duration, lost protected landmark.
- **MUSICAL REVISE** — valid score with a named musical or idiomatic defect.
- **CANDIDATE FOR AUDITION** — technical checks pass and a substantive critique finds no material compositional defect. No independent audition yet.
- **MUSICALLY APPROVED** — someone heard it and, for technical guitar writing, played it, and accepted it.

The 36 are not **MUSICALLY APPROVED**. Guitar PASS does not make a file a candidate for audition. The full set may be called **TECHNICALLY AND COMPOSITIONALLY REVIEWED — CANDIDATES FOR AUDITION** only when every included score meets that bar. One unresolved failure blocks the claim.

## 14. Human Sibelius and performance review

Sibelius is the intended place to read and hear these scores. MusicXML is the authoritative deliverable.

| Evidence | What it may claim |
|---|---|
| MusicXML integrity | The file parses and the locks that were checked still match. |
| Notation assessment | Someone read the notes and tied a musical judgement to bar numbers. |
| Sibelius import | The file opened in Sibelius. Layout and playback in that session are whatever that session actually checked. |
| Rendering | Audio was produced. It was not heard unless a person says they heard it. |
| GCE numeric | Only if the real evaluator ran on a representation it was built to score. |
| Listening superiority | Only with an actual listening comparison. |
| Guitar approval | Only after the guitar is played. |

Do not propose audio rendering as a prerequisite for a musical judgement. Do not generate WAV, MP3, MIDI, TAB, or ZIP unless the user explicitly asks for that file.

A score has been heard only if someone heard it. It has been played only if a player played it.

## 15. Output and repository rules

MORPH produces MusicXML scores and Markdown documentation only, unless the user explicitly asks for another file.

- New musical files get new names. Do not overwrite authoritative leadsheets, V2.0, V2.1, MORPH V0.1, or MORPH V0.2 historical folders.
- Do not edit production engines or GCE evaluator code as part of a MORPH documentation or selection pass.
- Do not retitle a V0.2 score as V0.3 because the method document moved to V0.3. The scores remain the musical version they were written as.
- Method commits belong in `creative-engines`. Score commits belong in the album repository. Do not copy the whole album into `creative-engines`, and do not copy the engine tree into the album.
- Stage only the files that belong to the pass. Unrelated local edits stay unstaged.

WWH developmental selection preserved with this document:

`WWH-PRACTICE/WWH-PLAY/MORPH/V0.2-GUITAR-VERIFIED/` in the album repository.

That folder is a preservation copy of `WWH-PRACTICE/WWH-PLAY/MORPH-V0.2-GUITAR-VERIFIED/`. Filenames unchanged. Status on the album README: **MORPH V0.2 — Guitar-Feasibility Assessed, Musically Unapproved**.

## 16. Known limitations, development status, and V1.0

**Status.** V0.3 codifies the method after one nine-song guitar/bass corpus. It is the current method document. It is not V1.0.

**What the 36 WWH files show.**

- Strongest-version protection works as a selection rule: many files are unchanged copies; a trial that would have deleted a better passage was rejected (Black Aura counterpoint, V2.1 bars 9–12).
- Identity can be repaired by restoring a cell at a return without recomposing the whole piece (Palace Gates, Hobos, Orbit, Small Testimony, After Everything, and others in the V0.2 comparative report).
- Guitar checking can separate a real span failure from a solver ceiling, and a correction can be limited to a secondary voice.
- Source locks on that corpus passed in the reports cited above.
- Nobody has played the 16 REVIEW grips. Nobody has given the 36 an official GCE number. Nobody has musically approved the set.

**Known limits.**

- Guitar solvers omit barre, thumb, harmonics, capo, alternate tuning, and slide-as-shift. They cap at four pitches. One of them stops at fret 15 and forbids crossed string order.
- `octave-change` is part-specific. A check that ignores it will judge the wrong pitches.
- The method has not been run as a fresh composition on music outside WWH.
- Proposed acceptance rates in V0.1 (first-pass acceptance, blind recognition, distinctness) are targets, not results. Define the test, the sample, and the denominator before stating a percentage.

**V1.0 criteria.** All of the following, and not before:

1. The same written procedure has been applied to at least three compositions it was not designed on, with the source, the mode, the locks, and the comparison recorded.
2. Source locks declared for each of those pieces are kept, or each break is written down before the notes change.
3. Where a numerical GCE claim is made, the official V2.0 evaluator has run on a representation it was built to score, and the number is the evaluator's number.
4. At least one informed human review in Sibelius exists for the pieces being called ready, and technical instrumental writing has been played by a person who can play that instrument.
5. **MUSICALLY APPROVED** is used only for pieces that have that evidence. A guitar PASS count is not a substitute.
6. GCE V2.0 formulae are still unchanged.

Thirty-six WWH files do not validate MORPH V1.0. Do not tag them as a V1.0 release.
