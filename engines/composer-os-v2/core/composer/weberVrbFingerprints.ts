/**
 * Eberhard Weber — VRB fingerprint receipts (8 targets + negative discriminators).
 * Bass-led harmonic field — ECM Chamber Jazz identity.
 */

export const WEBER_FIELD_VRF_FINGERPRINT_RECEIPTS = [
  'EW_PED_01 — long_pedal_foundation: target 0.78 — one bass pitch or two-pitch axis active 4–12 bars while upper harmony changes above.',
  'EW_HARM_01 — slow_harmonic_refresh: target 0.70 — average upper-structure change every 2–4 bars, not every bar.',
  'EW_HARM_02 — bass_led_chord_identity: target 0.85 — chord label derives from bass + color cluster, not root-position stack.',
  'EW_MEL_01 — arching_melodic_span: target 0.75 — primary phrases extend beyond 4 bars with clear contour apex (phraseArcLength).',
  'EW_MEL_02 — wide_calm_intervals: target 0.62:0.38 step-to-leap — prefer P4, P5, M6, octave; not Wheeler brittle leap chains.',
  'EW_RHY_01 — layered_rhythmic_independence: target 0.60 — upper line, accompaniment, bass ostinato in parallel rhythmic planes without foreground metric conflict.',
  'EW_CAD_01 — revoicing_over_resolution: target 0.65 — release tension by register/instrument/spacing change instead of cadencing.',
  'EW_FORM_01 — resonant_space: target 0.50 — silenceWeighting resonant_structural — exposed bars where bass ring and upper sustain define form.',
  'EW_NEG_01 — fail if saxophone archetypal modal lead dominates → Garbarek bleed, not Weber.',
  'EW_NEG_02 — fail if slash-chord polyaxis + brittle leap melody → Wheeler bleed, not Weber.',
  'EW_NEG_03 — fail if lush orchestral crescendo narrative → Schneider bleed, not Weber.',
] as const;
