/**
 * Claus Ogerman — VRB fingerprint receipts (8 targets + negative discriminators).
 * Composed orchestral continuum — not CTI groove-orchestra or ECM spatial wash.
 */

export const OGERMAN_CONTINUUM_VRF_FINGERPRINT_RECEIPTS = [
  'CO_HARM_01 — harmonic_suspension: target 0.75 — upper 9ths/11ths/13ths persist through root change as structural tones.',
  'CO_HARM_02 — inner_voice_counterpoint: target 0.70 — 2+ inner lines move by m2/M2/m3; one common tone 60–75% of changes.',
  'CO_HARM_03 — resolution_by_texture: target 0.72 — tension released by registral settling, density thinning, or cyclic cell return — not V–I.',
  'CO_ORCH_01 — string_layered_sustain: target 0.78 — strings divided into sustained upper + moving middles; 4–6 real harmonic layers.',
  'CO_FORM_01 — climax_accumulation: target 0.68 — register/density/pedal tension over 8–32 bars; brass enters late and sparingly.',
  'CO_FORM_02 — motivic_cell_return: target 0.60 — primary theme or 3-chord cell returns transformed across large spans.',
  'CO_MEL_01 — melody_breath: target 0.65 — stepwise melody with M6/m6/octave peaks; stepToLeapRatio 0.68:0.32; long breathable arcs.',
  'CO_ORCH_02 — orchestral_rotation: target 0.65 — orchestra rotates veil/echo/commentary every 8–16 bars; never static background.',
  'CO_NEG_01 — fail if brass punches + shout choruses dominate → Quincy bleed, not Ogerman.',
  'CO_NEG_02 — fail if sax soli + jazz tutti rhetoric dominates → Sebesky bleed, not Ogerman.',
  'CO_NEG_03 — fail if sentimental string homophony + cadential swoops → Jenkins/Riddle bleed, not Ogerman.',
  'CO_NEG_04 — fail if short 2-bar riff logic drives form → Ogerman thinks in spans and cyclic cells.',
] as const;
