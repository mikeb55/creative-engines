# H6-A4b — Blind musical audition

Date: 2026-10-16

The 12 Core pairs stay `PROVISIONAL — NOT MUSICALLY APPROVED`. This pass adds listening clips and a blind review. It does not admit a pair, add a harmonic world, or add a composition engine.

## Clips

`coreContextExamples.ts` writes four MusicXML scores for each pair. Guitar and upright bass, standard staves, no TAB, no chord symbols, no ties. Tempo is quarter = 80. Four bars of 4/4 last 12 seconds.

1. Root pedal — bass holds the left-triad root. Guitar states both triads.
2. Ambiguous — bass rests for all four bars.
3. Moving bass — bass changes pitch. Guitar moves by nearest voice leading. No common-tone tie.
4. Motif and return — opening cell, variation, the other triad, then the opening cell.

## Blind sessions

`blindAudition.ts` builds four sessions from a seed. Each session has three primary pairs and one concealed catalogue phrase from `generateHexatonicPhrase`. Session 3 repeats one pair from session 1. Session 4 repeats one pair from session 2. Codes look like `mark-07`. They are not pitch names.

The plan is stored on `hexatonic-laboratory-review` version 1 in an optional `blind` object. A review with no `blind` object still validates. `artisticApproval` must stay false.

The listener answers distinct (Yes / No / Unsure), compose (Yes / Maybe / No), and a colour note. Saving that answer reveals the name and the notation preview. A guitar play-through note and a disposition come after the reveal. ACCEPT on a primary hearing writes the existing decision `KEEP`. KEEP PROVISIONAL does not. A repeat or a reference does not write `KEEP`.

Hidden-reference hits and repeat disagreements are sentences in the review. They do not decide.

## Playback

The page uses the existing `ScoreAudition` and `ScorePreview`. One player is mounted. The preview stays off until the answer is saved. Play and Stop were checked in the interface. Sound was not heard by a person. **AUDIO NOT HUMAN-VERIFIED.**

## Not in this pass

H6-B1 through H6-B4, H6-C, catalogue promotion, and the Ian Ring scale expansion are not started.
