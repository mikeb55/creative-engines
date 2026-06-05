/**
 * John Surman — VRB fingerprint receipts (8 targets + negative discriminators).
 * British folk-minimalist ECM — not Garbarek ritual sax, Wheeler polyaxial, or Weber bass field.
 */

export const SURMAN_FOLK_MODAL_VRF_FINGERPRINT_RECEIPTS = [
  'JS_FOLK_01 — folk_modal_center: target 0.80 — Dorian/Mixolydian/pentatonic as primary harmonic material sustained 8–16 bars; not jazz changes with folk decoration.',
  'JS_RHY_01 — minimalist_ostinato: target 0.72 — rhythmic and melodic repetition as structure; gradual evolution over 8–16 bar spans; organic not mechanical.',
  'JS_MEL_01 — dark_reed_weight: target 0.75 — melodic lines in baritone sax / bass clarinet register (Bb2–Bb4); long introspective phrases; not bright upper-register archetype.',
  'JS_FORM_01 — structural_silence: target 0.68 — rests and sustained tones as compositional material; low density; phrases decay before next begins.',
  'JS_MEL_02 — folk_melody_stepwise: target 0.70 — stepwise dominant motion; modal leaps m3/P4/P5 only; singable grounded contour; no bebop approach tones.',
  'JS_FORM_02 — phrase_arc_folk: target 0.65 — 4–8 bar phrase spans with clear contour apex; folk song rise-and-fall; not short jazz motivic cells.',
  'JS_HARM_01 — modal_shift_slow: target 0.72 — modal center sustained 8–16 bars minimum; shifts by step relation or common tone (D Dorian → G Mixolydian).',
  'JS_TEX_01 — low_density_texture: target 0.68 — ensemble saturation stays low; chamber or solo texture; no tutti saturation; space is structural.',
  'JS_NEG_01 — fail if bright upper-register saxophone archetype + Nordic modal chant → Garbarek bleed, not Surman.',
  'JS_NEG_02 — fail if polyaxial slash-chord harmony + brittle leap melody → Wheeler bleed, not Surman.',
  'JS_NEG_03 — fail if bass pedal field dominant + suspended upper harmony → Weber bleed, not Surman.',
  'JS_NEG_04 — fail if episodic collage + genre irony → Bley bleed, not Surman.',
  'JS_NEG_05 — fail if altered dominants + chromatic approach tones → jazz bleed, not Surman.',
] as const;
