/**
 * WYBLE THREE-VOICE PARAMETER DEFAULTS
 * Source: Perplexity research mapping — Jimmy Wyble + three-part counterpoint
 * Voices: G1 (guitar upper / voice 1), G2 (guitar lower / voice 2), B (bass)
 *
 * songwriterHookRepetitionBias: 0.24  (range 0.18–0.32)
 * songwriterPhraseRegularity:   0.36  (range 0.28–0.44)
 * songwriterSyncopationBias:    0.43  (range 0.34–0.52)
 * songwriterDensityBias:        0.49  (range 0.42–0.58)
 *
 * c4Strength:           light
 * blendStrength:        medium
 * ostinatoStrength:     Stable
 * songModeRhythmStrength: balanced
 *
 * maxDensityPerBeat:    2.5  (range 2.2–2.8, peak 3.0)
 * maxSyncopationRatio:  0.32 (range 0.24–0.38)
 * maxRepetitionScore:   0.24 (range 0.18–0.30)
 *
 * entryBias:      onbeat 0.44 / offbeat 0.34 / late 0.22
 * groupingBias:   even 0.32 / odd 0.22 / fragmented 0.22 / arc 0.40
 * densityShape:   flat 0.40 / burst_rest 0.16 / swell 0.34 / sparse 0.20
 * barlineBehavior: contained 0.34 / crossing 0.46 / delayed 0.20
 *
 * FeelConfig motion targets (when exposed):
 *   contrary 0.34–0.46 / oblique 0.24–0.34 / similar 0.16–0.24 / parallel 0.08–0.16
 *   parallel perfects on consecutive strong beats: 0.00
 *
 * Overlay weights:
 *   wyble_two_line_core:       0.85–1.00
 *   bass_independent_counterline: 0.72–0.92
 *   contrary_motion_enforcer:  0.58–0.76
 *   oblique_motion_support:    0.46–0.64
 *   parallel_3rds_6ths_window: 0.30–0.48
 *   anti_block_chord_guard:    0.88–1.00
 *   cadence_alignment_boost:   0.22–0.36
 *   register_separation_guard: 0.82–0.96
 *
 * RegisterMap targets (strong-beat spacing):
 *   B–G2:  preferred 6th/10th  (3rd–10th allowed)
 *   G2–G1: preferred 3rd/6th   (3rd–10th allowed)
 *   B–G1:  preferred 10th/12th (10th–17th allowed)
 *   B below G2: 88–96% of events
 *   G2 below G1: 84–94% of events
 *   Voice crossing ceiling: B over G2 ≤2%, G2 over G1 ≤8%
 *
 * Per-voice activity factors (relative to G1 = 1.00):
 *   G2: 0.72–0.88
 *   B:  0.55–0.72
 *
 * Cadence probabilities:
 *   Contrary motion involving B at phrase end: 0.68–0.84
 *   Distinct arrival tones all 3 voices:       0.82–0.96
 *   Full rhythmic alignment at cadence:        0.22–0.36
 *
 * Anti-collapse safeguards:
 *   If maxDensityPerBeat > 3.0 for >1 beat → force one voice sustain/rest
 *   If repetitionScore > 0.30 → reduce parallel_3rds_6ths_window by 0.10–0.18
 *   If B and G2 share pitch class on strong beats ≥3 consecutive events
 *     → force register_separation_guard + contrary_motion_enforcer next bar
 */

export const wybleParameterDefaults = {
  songwriterHookRepetitionBias: 0.24,
  songwriterPhraseRegularity: 0.36,
  songwriterSyncopationBias: 0.43,
  songwriterDensityBias: 0.49,
  c4Strength: 'light' as const,
  blendStrength: 'medium' as const,
  ostinatoStrength: 'Stable' as const,
  songModeRhythmStrength: 'balanced' as const,
  maxDensityPerBeat: 2.5,
  maxSyncopationRatio: 0.32,
  maxRepetitionScore: 0.24,
} as const;
