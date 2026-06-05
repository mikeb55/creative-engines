/**
 * Johnny Mandel — VRB fingerprint receipts (8 targets + negative discriminators).
 * Melody-forward Studio Orchestral warmth — not Ogerman / Quincy / Sebesky / Nelson / Nestico.
 */

export const MANDEL_LYRIC_WARMTH_VRF_FINGERPRINT_RECEIPTS = [
  'JMD_MEL_01 — melody_on_extensions: target 0.78 — melody lands on 3rd/6th/7th/9th at strong metric points; declares chord quality; singable yet harmonically rich.',
  'JMD_VOIC_01 — inner_voice_semitone: target 0.75 — at least one inner line moves m2 or M2 at most chord changes; common tones retained; contrary/oblique to melody.',
  'JMD_HARM_01 — borrowed_iv_minor: target 0.55 — borrowed iv-minor inflection as warmth device; Fm6 or iv6 in major context; mechanical warmth not sentiment.',
  'JMD_MEL_02 — long_lyric_phrase: target 0.75 — 4–8 bar phrases as one breath; mostly stepwise; expressive leaps P4/P5/M6 at phrase peaks; slight rhythmic ease.',
  'JMD_CAD_01 — softened_cadence: target 0.70 — resolve clearly but arrive on 6/9 or maj9 tonic color not plain triad; inner extensions retained at arrival.',
  'JMD_ORCH_01 — warm_brass_blend: target 0.68 — brass in chorale/cushion/pad formation; rounded attack by voicing and register; not punchy unison or aggressive stab.',
  'JMD_ORCH_02 — orchestra_frames_soloist: target 0.65 — accompaniment contours soloist emotionally; countermelodies selective; no dense continuous commentary; tuttis as support.',
  'JMD_FORM_01 — hollywood_scene_awareness: target 0.60 — transitions shaded orchestrally; entrances softened; voicing for emotional contour not just swing efficiency.',
  'JMD_NEG_01 — fail if suspended nonfunctional drift + cluster logic + symphonic through-composition → Ogerman bleed, not Mandel.',
  'JMD_NEG_02 — fail if punchy brass + groove-forward attack + direct functional drive → Quincy bleed, not Mandel.',
  'JMD_NEG_03 — fail if CTI groove bed + fusion rhythm + strings over groove → Sebesky bleed, not Mandel.',
  'JMD_NEG_04 — fail if blues-modal bite + earthy riff-centered writing → Nelson bleed, not Mandel.',
  'JMD_NEG_05 — fail if Basie-economy swing shorthand → Nestico bleed, not Mandel.',
] as const;
