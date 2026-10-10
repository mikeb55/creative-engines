# MORPH Framework V0.1

**Musical Originality, Recognition & Phrase-Heritage**

Status: V0.1 working method, 10 October 2026. Not a validated transferable system. Later method: `docs/MORPH_FRAMEWORK_V0.3.md`. This file stays the V0.1 record.

MORPH creates and transforms music. GCE V3.0 evaluates evidence of its quality. MORPH does not replace GCE, and GCE V3.0 does not replace GCE V2.0.

Numeric authority stays in `docs/GCE_FRAMEWORK_V2.md`. LOCK, DCR, and the Style Profile Layer stay in `docs/GCE_LOCK_DCR_STANDARDS.md`. Qualitative evidence, WWH labels, and the ban on invented scores stay in `docs/GCE_FRAMEWORK_V3.md`.

First corpus: *While We're Here*, nine electric-guitar and upright-bass compositions, four arrangements each.

## 1. What MORPH is

MORPH is a way to recompose an existing piece so a listener can still tell what it is, while the surface — harmony, counterpoint, rhythm, register — can change a great deal.

A finished MusicXML file is not evidence that MORPH worked. Evidence is a comparison of actual notes: what was kept, what was transformed, what still fails, and whether anyone has listened or played.

## 2. Five principles

1. **Identity.** Keep recognisable musical DNA: signature cells, formal anchors, and a real return. Judge this on pitches and rhythms, not on programme notes.
2. **Transformation.** Harmony, melody, rhythm, and counterpoint may be reinvented. The point of an arrangement is the new musical idea, not a decoration of the leadsheet.
3. **Development.** New material has to come from somewhere in the source and change across the form: statement, variation, contrast, return.
4. **Instrumental intelligence.** Write for electric guitar and upright bass as they are. The bass is a melodic partner. A pitch that fits a MIDI range is not proof a grip is playable.
5. **Excellence.** Use GCE V3.0 as the evidence contract. A human still has to hear and, for guitar, play. Do not weaken V2.0 hard gates to make an experiment pass.

## 3. Three transformation levels

No level is better than the others. Pick the level that matches the arrangement's idea.

| Level | Name | What stays obvious | What may change |
|---|---|---|---|
| M1 | Melody-led | The principal tune, substantially intact | Harmony and counterpoint |
| M2 | Motivic reconstruction | Characteristic cells, developed | Contour, interval, order of events around those cells |
| M3 | Radical abstraction | A few signature motifs and formal anchors | Most of the surrounding music |

The old listening sketch — about 65% melody, 20% harmony, 40% rhythm still recognisable — is a creative guide. It is not a quota and not a note-count target.

## 4. Five melodic-identity guardrails

Apply these to each source before writing, and check them against the finished notes.

**A. Signature motifs.** Name 3–5 cells when the source has enough music. Record pitches, intervals, rhythm, and bar.

**B. Formal anchors.** Name what a listener uses to know where they are: the opening, the important returns, the final destination.

**C. Recognition windows.** Long stretches must still carry the tune, either quoted or transformed so the cell is audible. A quote of two notes followed by unrelated music does not count.

**D. Transformational lineage.** Say how each important new idea comes from a source cell: inversion, fragmentation, augmentation, interval expansion, rhythmic displacement, sequence, register transfer, counterpoint, or another defence a musician can hear.

**E. Meaningful return.** After the most abstract passage, bring recognisable material back at a structural point (a return, a peak, or the ending), not as a token in bar 2 only.

The original bass line does not, by itself, prove that the guitar piece is still there.

## 5. Controlled rule-breaking

Allowed, when the bar has a reason:

- Reharmonise or drop the original chord symbols.
- Add counterpoint and inner melodies.
- Move the tune into an inner register.
- Change contour, break cells up, invert them, widen their intervals.
- Displace or interrupt the rhythm.
- Use dissonant, ambiguous, or unresolved harmony.
- Phrase asymmetrically inside the locked metre and form.
- Use silence and thin texture on purpose.
- Use distinct registers and instrumental gestures.

Not allowed to change:

- Authoritative upright-bass pitches, rhythms, rests, ties, and onsets.
- Bar count and metre.
- Tempo and tempo changes.
- Rehearsal marks and form.
- Ensemble silences the source marks as structural.
- Any other lock written in the source report.

If a musical idea needs to break a lock, write the conflict down. Do not quietly override the lock.

## 6. Audit outcomes

Read the MusicXML. Do not inherit a PASS from an older markdown map.

| Outcome | Meaning |
|---|---|
| KEEP | Strong, distinct, and technically sound on the notation evidence. Do not rewrite it. |
| DEVELOP | The idea is worth keeping. Named bars are weak and can be repaired without throwing the piece out. |
| REWRITE | The declared idea does not happen, or the arrangement is mechanical, decorative, or no longer the source. |

These are notation decisions until someone listens and plays.

High retention of the original melody is not a failure. Low retention is not a success.

## 7. Pilot and scale

1. Audit every existing arrangement against its authoritative leadsheet.
2. Run the method on one piece (Black Aura, 39 bars, 4/4, quarter = 92) until a before/after comparison shows a real musical gain and says what is still unknown.
3. Only then use the same method on the other songs.
4. Keep every previous file. New files get new names.
5. After WWH, MORPH is still not a general system until it has been tried on three pieces it was not designed on.

Proposed targets, not results:

- 80% first-pass acceptance once the method is stable.
- 100% of mandatory source locks kept.
- 90% source recognition in a blind listening test.
- 85% of within-song arrangement pairs judged distinct.

Define the test, the sample, and the denominator before stating a percentage. Thirty-six files do not validate MORPH V1.0.

## 8. Evidence layers

Report these separately. Do not collapse them into one score.

| Layer | What it may claim |
|---|---|
| Technical integrity | The file parses; bass, bars, metre, tempo, rehearsal marks, and protected rests match the source. |
| Composition review | A named person or agent read the notes and stated musical judgements tied to bar numbers. |
| GCE numeric | Only if the real V2.0 evaluator ran on a representation it was built to score. |
| Listening | Only if audio was rendered and actually heard. |
| Performance | Only if the guitar was physically played. |

WWH release words from GCE V3.0:

- **TECHNICAL FAIL**
- **MUSICAL REVISE**
- **CANDIDATE FOR AUDITION**
- **MUSICALLY APPROVED**

The full set may be called **TECHNICALLY AND COMPOSITIONALLY REVIEWED — CANDIDATES FOR AUDITION** only when every included score meets that bar. One unresolved failure blocks the claim. Do not relabel a rejected score after the fact.

## 9. Engines

Composer OS modules may be used when their actual function fits the metre, the locked bass, and the arrangement's idea. Reading a README is not running an engine. If a module is the wrong tool, say so and do not pretend it composed the bar.

## 10. Repositories

- Method and this document: `creative-engines/docs/MORPH_FRAMEWORK_V0.1.md`
- WWH scores, maps, and the evaluation report: the album project, under `WWH-PRACTICE/95-REPORTS/MORPH-V0.1/` and `WWH-PRACTICE/WWH-PLAY/MORPH-V0.1/`
- Do not edit authoritative leadsheets, V2.0 or V2.1 arrangements, production engines, or GCE evaluator code as part of MORPH.
