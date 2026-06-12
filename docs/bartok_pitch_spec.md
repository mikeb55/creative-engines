# Bartók CLE Pitch-Scoring — Authoritative Numeric Spec

Global config:
- shortlist size: 5 candidates per voice
- beam width: 32
- score all 5^4 = 625 voice tuples per slot
- octatonic developmental lift: +0.10 (octatonic baseWeight 1.18 -> 1.28)
- hard soprano leap cap: 5 semitones
- minimum vertical gap: 2 semitones per slot
- accent modifiers: strong x1.10 / final-slot-in-group x1.08 / weak x1.06

## 1. Five-cell library
cellId | intervals | priorWeight | contourClass | isLegacyCell
semitone_wedge | [1,-1,2,-2] | 0.24 | arch_wedge | false
tritone_axis | [6,-1,-6,1] | 0.22 | pivot_tritone | false
minor3_cycle | [3,3,3,-9] | 0.18 | rising_cycle | false
axis_pivot | [1,6,1,-8] | 0.20 | hinge_cell | false
legacy_166m7 | [1,6,6,-7] | 0.16 | step_leap | true
(priors sum to 1.00)

## 2. Imitation-mode priors
strict_transposition 0.18
strict_interval_cycle 0.20
inversional_imitation 0.24
free_counterpoint_with_motif_echo 0.26
contrary_axis_response 0.12
(sum 1.00)

## 3. Axis function enum and transitions
activeFunction values: tonic_axis, dominant_axis, subdominant_axis
Transition weights (row=current, col=next):
tonic_axis ->        tonic 0.35 | dominant 0.40 | subdominant 0.25
dominant_axis ->     tonic 0.35 | dominant 0.35 | subdominant 0.30
subdominant_axis ->  tonic 0.40 | dominant 0.30 | subdominant 0.30
Stabilization: no more than 2 consecutive phrases on the same
activeFunction; after 2, self-transition probability = 0 and the row is
renormalized across the other two.

## 4. Collection-fit table
perPcWeights relative to local tonic = 0.
pentatonic | pcs {0,2,4,7,9} | 0:1.18,2:1.08,4:1.06,5:0.90,7:1.12,9:1.06,others:0.88 | baseWeight 1.00
diatonic | pcs {0,2,4,5,7,9,11} | 0:1.16,2:1.04,4:1.02,5:1.00,7:1.10,9:1.02,11:1.00,others:0.90 | baseWeight 1.04
lydian_acoustic | pcs {0,2,4,6,7,9,10} | 0:1.18,2:1.04,4:1.02,6:1.12,7:1.10,9:1.02,10:1.00,others:0.88 | baseWeight 1.12
octatonic | pcs {0,1,3,4,6,7,9,10} | 0:1.16,1:1.06,3:1.06,4:1.04,6:1.10,7:1.04,9:1.06,10:1.04,others:0.90 | baseWeight 1.18
Developmental octatonic lift: octatonic baseWeight 1.18 -> 1.28 (+0.10) in developmental passages.
Per-voice role bias (multiplier on baseWeight):
soprano: pentatonic 1.00, diatonic 1.00, lydian_acoustic 1.08, octatonic 1.10
alto:    pentatonic 1.02, diatonic 1.04, lydian_acoustic 1.04, octatonic 1.04
tenor:   pentatonic 1.04, diatonic 1.06, lydian_acoustic 1.02, octatonic 1.02
bass:    pentatonic 1.06, diatonic 1.08, lydian_acoustic 1.00, octatonic 0.98

## 5. Per-voice scorer exponents (each voice sums to 1.00)
dimension | soprano | alto | tenor | bass
axis       | 0.22 | 0.24 | 0.24 | 0.22
collection | 0.14 | 0.16 | 0.16 | 0.18
cell       | 0.20 | 0.18 | 0.16 | 0.14
imitation  | 0.18 | 0.18 | 0.16 | 0.14
accent     | 0.06 | 0.08 | 0.08 | 0.08
vertical   | 0.08 | 0.08 | 0.10 | 0.12
contour    | 0.07 | 0.04 | 0.04 | 0.04
register   | 0.05 | 0.04 | 0.06 | 0.08

## 6. Per-voice candidate MIDI ranges
soprano (Violin I): 60-96
alto (Violin II):   55-91
tenor (Viola):      48-79
bass (Cello):       36-67

## 7. Ensemble factor weights (sum 1.00)
verticalIntervalProfile 0.26
axisCoverage 0.22
imitationConsistency 0.20
antiParallelPenalty 0.18
spacingBalance 0.14
Fixed multipliers: exposed parallel 5th/8ve x0.45; same-direction perfect
repetition x0.62; successful inversional answer x1.16; sonority with 3+
axis pcs x1.14; collection completion without plain triad x1.10.

## 8. Candidate enumeration bounds (leap window per voice)
soprano +/-5 | alto +/-7 | tenor +/-9 | bass +/-10
(soprano cap of 5 aligns with Gate 1)

## 9. Substream domain salts
bartok-shortlist 7919
bartok-beam 8081
bartok-axis-transition 8167
Tie order on equal finalScore: finalScore, then structural priority, then
lower candidateMidi, then lower tieBreakKey.

## 10. Phrase-scale inversion window scoring
Applies only when phrase imitationMode is inversional_imitation or
contrary_axis_response (alto/bass imitation dimension + ensemble multiplier
gate). Sustained mirror writing over a sliding note window is rewarded;
single-interval spot inversion scores near neutral.

| constant | value | purpose |
|----------|-------|---------|
| BARTOK_PITCH_INVERSION_WINDOW_MIN_NOTES | 3 | Minimum consecutive notes in window |
| BARTOK_PITCH_INVERSION_WINDOW_MAX_NOTES | 5 | Maximum consecutive notes in window |
| BARTOK_PITCH_INVERSION_SPOT_NEUTRAL_CAP | 0.58 | Lone single-interval inversion cap (~neutral) |
| BARTOK_PITCH_INVERSION_SUSTAIN_PEAK | 0.92 | Imitation dimension peak for sustained window |
| BARTOK_PITCH_INVERSION_SUSTAIN_MIN_FRACTION | 0.67 | Min inversional hit rate to lift above neutral |
| BARTOK_PITCH_INVERSION_SIGN_MIN_FRACTION | 0.67 | Min opposite-sign rate vs soprano source |
| BARTOK_PITCH_INVERSION_SIGN_PENALTY | 0.75 | Multiplier when sign pattern fails |
| BARTOK_PITCH_INVERSION_ENSEMBLE_SUSTAIN_MIN | 0.67 | Min fraction to apply successfulInversionalAnswer x1.16 |

## 11. Phrase-position climax weighting
Normalized phrase position `t = slotInPhrase / (PHRASE_SLOTS - 1)` in [0, 1].
Applies multipliers to `cell`, `register`, and `contour` dimensions only inside
`voiceDimensions` (soprano/bass register spread-aware; alto/tenor center-only
unchanged). Complements §10 inversion-window scoring — does not replace it.

| constant | value | purpose |
|----------|-------|---------|
| BARTOK_PITCH_PHRASE_SLOTS | 4 | Phrase length in slots (matches `% 4` phrase loop) |
| BARTOK_PITCH_CLIMAX_CENTER_T | 0.65 | Peak registral + interval intensity (~slot 2) |
| BARTOK_PITCH_CLIMAX_APPROACH_HALF_WIDTH | 0.15 | Bell weight half-width around climax center |
| BARTOK_PITCH_EARLY_PHRASE_MAX_T | 0.30 | Early-phrase band cutoff |
| BARTOK_PITCH_SPREAD_TARGET_MIN_SEMITONES | 12 | Pre-climax spread baseline (~1 octave) |
| BARTOK_PITCH_SPREAD_TARGET_PEAK_SEMITONES | 28 | Climax spread target (~2.3 octaves) |
| BARTOK_PITCH_SPREAD_EARLY_MAX_SEMITONES | 18 | Premature wide-spread cap in early phrase |
| BARTOK_PITCH_SPREAD_POST_CLIMAX_TARGET_SEMITONES | 14 | Post-climax contraction target |
| BARTOK_PITCH_CLIMAX_CELL_IDS | tritone_axis, minor3_cycle | Near-climax cell preference set |
| BARTOK_PITCH_CLIMAX_CELL_BOOST | 1.12 | Multiplier on cell when cellId matches at climax |
| BARTOK_PITCH_CLIMAX_INTERVAL_TRITONE_SEMITONES | 6 | Tritone interval-content match |
| BARTOK_PITCH_CLIMAX_INTERVAL_MINOR3_SEMITONES | 3 | Minor-third interval-content match |
| BARTOK_PITCH_CLIMAX_INTERVAL_CONTENT_BOOST | 1.08 | Near-climax boost when step matches tritone/m3 |
| BARTOK_PITCH_CLIMAX_REGISTER_BOOST_MAX | 1.15 | Max registerMul at spread-peak match |
| BARTOK_PITCH_CLIMAX_REGISTER_PENALTY_MIN | 0.88 | Early over-spread register floor |
| BARTOK_PITCH_CLIMAX_CONTOUR_CALM_BOOST | 1.10 | Post-climax small-step contour reward |
| BARTOK_PITCH_CLIMAX_CONTRACTION_BOOST | 1.08 | Post-climax spread-narrowing reward |
