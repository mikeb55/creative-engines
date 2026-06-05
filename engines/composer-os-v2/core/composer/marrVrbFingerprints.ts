/**
 * Johnny Marr — VRB fingerprint receipts (8 targets + negative discriminators).
 * Melodic rhythm guitar — partial voicings, open-string resonance, top-note melody in arpeggiated figures.
 */

export const MARR_MELODIC_RHYTHM_VRF_FINGERPRINT_RECEIPTS = [
  'JMA_PVR_01 — PartialVoicingFirstRule: target 0.88 — 2–5 note voicings default; root omitted or weakly stated; upper-string triads/dyads on strings 1–3 or 2–4; penalize full 6-string barres as primary harmonic surface; if replaceable by straight downstroke barres without losing identity — not Marr.',
  'JMA_OSR_01 — OpenStringResonanceRule: target 0.80 — 1–2 sustained open strings per chord event; open-position shells held while melody moves above on string 1 or 2; common-tone pedal especially open B or E against changing fretted shapes; moveable open-shape transformations.',
  'JMA_TNM_01 — TopNoteMelodyRule: target 0.85 — highest note of rhythm pattern forms melodic contour across bars; upper-voice motion is principal hook; 3–6 note motivic cell in upper voice across 2–4 bars minimum; rhythm and melody integrated not optional coloring.',
  'JMA_ASH_01 — ArpeggioStrumHybridRule: target 0.78 — alternate beat-based strums and upbeat-picked melody notes above held lower chord tones; arpeggiation dominant for riff-identity; strumming selective and articulated — individual tones speak even in strum.',
  'JMA_ANH_01 — AddNoteHarmonyRule: target 0.82 — add9/sus2/sus4/maj7/6/6-9/dominant color/pedal composites; major triads colored by 6 or maj7 with extension on top string; suspended 2nd/4th delay major/minor definition; neither overt jazz reharm nor folk-modal stasis.',
  'JMA_PSD_01 — PendulumSubdivisionRule: target 0.83 — continuous 16th-note hand motion through rests; syncopation from selective contact not hand stopping; highlife-derived syncopated arpeggios; dyads and slides not bends; tenuto vs staccato attack contrast.',
  'JMA_MAM_01 — ModalAmbiguityRule: target 0.68 — major-key framework with modal/extension coloration; bright and wistful simultaneously; mix major and relative-minor/pentatonic motion inside one figure; open-string pedal against borrowed upper shapes; suspended arrival over strong cadential closure.',
  'JMA_CAP_01 — CapoOpenShapeRule: target 0.72 — capo or retuned open-position fingering preserves open-string color while shifting key center; low-to-mid capo zones for shimmer; higher placements for compressed mandolin-like triad brightness.',
  'JMA_NEG_01 — fail if 12-string parallel jangle without add-note/modal voicing logic → McGuinn/Byrds bleed, not Marr.',
  'JMA_NEG_02 — fail if atmosphere from delay repeats and dotted-rhythm echo grids → The Edge bleed, not Marr.',
  'JMA_NEG_03 — fail if explicit jazz-chord voicings and isolated color-stab comping → Andy Summers bleed, not Marr.',
  'JMA_NEG_04 — fail if thicker romantic chord mass and dramatic swell → Bernard Butler bleed, not Marr.',
  'JMA_NEG_05 — fail if blues bends and sustained lead lines dominant → generic rock bleed, not Marr.',
  'JMA_NEG_06 — fail if full barre block strumming dominant → conventional rock bleed, not Marr.',
  'JMA_NEG_07 — fail if backbeat-only rhythmic placement without pendulum hand motion → conventional rock bleed, not Marr.',
] as const;
