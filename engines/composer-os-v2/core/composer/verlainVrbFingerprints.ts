/**
 * Tom Verlaine / Television — VRB fingerprint receipts (8 targets + negative discriminators).
 * Suspended modal field art-rock — not Fripp process / Morello cells / Towner ECM / Weber pedal / jazz-lush.
 */

export const VERLAINE_SUSPENDED_FIELD_VRF_FINGERPRINT_RECEIPTS = [
  'TV_MEL_01 — SupraChordMelodyRule: target 0.72 — phrase targets weight scale degrees 2, 4, 6, 9-equivalents over roots and thirds, especially at phrase starts; chord-defining tones delayed or omitted; melody floats over field, only intermittently confirming harmony.',
  'TV_FIELD_01 — ModalFieldPersistenceRule: target 0.82 — harmonic center holds 4–16 bars; change is bass displacement under static upper shape, not new chord; penalize frequent root movement.',
  'TV_EXT_01 — ExtensionRetentionRule: target 0.68 — one or two upper tones (9, 4, 6) persist across bass or root change in 60–75% of adjacent harmonic events; upper shape moves slowly; bass moves beneath it.',
  'TV_SURF_01 — ChordSurfaceBiasRule: target 0.85 — weight sus2, sus4, add9, add4, 6/9, fifth-plus-2, triad-plus-4, slash chords, dyad drones; bias against thick altered dominant grips, jazz-lush voicings, dense distortion harmonic masking.',
  'TV_BASS_01 — BassDisplacementRule: target 0.72 — guitar grip root and bass root differ frequently; harmony reinterpreted by moving bass under static upper shape (C bass + B guitar grip).',
  'TV_PROG_01 — ProgressionAvoidanceRule: target 0.90 — penalize stock I–V–vi–IV, 12-bar blues closure, repeated ii–V–I, arena-rock harmonic telegraphing; reward 1–3 chord modal loops and oblique bass motion.',
  'TV_LINE_01 — IntersectingLinesRule: target 0.65 — melody emerges as by-product of intersecting guitar/bass lines rather than block-chord progression; staggered counterpart entries over shared field.',
  'TV_CLOS_01 — ReturnToRiffClosureRule: target 0.78 — phrase and section closure via return-to-center riff grip or textural cutoff instead of V–I cadence; modal loop restatement preferred over functional resolution.',
  'TV_NEG_01 — fail if exact-loop process cells + 5/4 odd-meter grid dominate → Fripp/King Crimson bleed, not Verlaine.',
  'TV_NEG_02 — fail if kill-switch power5 riff cells + whammy-slot punctuation dominate → Morello bleed, not Verlaine.',
  'TV_NEG_03 — fail if fingerstyle maj9 ECM pastoral + arpeggio motor dominate → Towner bleed, not Verlaine.',
  'TV_NEG_04 — fail if long bass pedal field + slow upper refresh dominate → Weber bleed, not Verlaine.',
  'TV_NEG_05 — fail if altered-dominant jazz-lush voicing density >0.15 → jazz bleed, not Verlaine suspended field.',
  'TV_NEG_06 — fail if I–V–vi–IV telegraph or blues turnaround closure present → arena/pop bleed, not Verlaine.',
] as const;
