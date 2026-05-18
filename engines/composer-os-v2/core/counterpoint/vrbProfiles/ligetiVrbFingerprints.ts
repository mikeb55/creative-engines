/**
 * György Ligeti — SQ VRB micropolyphonic / cluster-saturation profile.
 * Atmosphères / Lux Aeterna / Lontano / SQ No.2 / Désordre research baseline.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const LT_BASE = [
  // POLICY (8)
  'LT_POLICY_01 — harmonicRhythm very slow (4–16 bars); no mid-bar chord changes; texture-as-harmony.',
  'LT_POLICY_02 — bassPolicy registral_boundary: lowest spatial limit, not root function or melodic bass.',
  'LT_POLICY_03 — voicingPolicy chromatic cluster fill; spread 8–15 st default, 24–36 st at climax; forbidOctaveDoubling.',
  'LT_POLICY_04 — melodicPolicy ic1/ic2 stepwise; directional ascent/descent as formal gesture; leaps structural-only.',
  'LT_POLICY_05 — rhythmPolicy antiMetric (early) + phaseDisplacement (Etudes); pulse denied or displaced.',
  'LT_POLICY_06 — repairPolicy resolveParallels=false: canonic independence by design, not species repair.',
  'LT_POLICY_07 — formPolicy stasis + densityExpansionContraction; goldenMeanClimax; noCadentialRelease.',
  'LT_POLICY_08 — contrapuntalLinePolicy maximum independence; parallelMotionPolicy avoid; leapPolicy structural_only.',
  // HARM (6)
  'LT_HARM_01 — chromatic cluster as default sonority; no triadic anchor.',
  'LT_HARM_02 — ic1/ic2 saturation in vertical micropolyphonic fields.',
  'LT_HARM_03 — registral expansion = harmonic intensification (not functional progression).',
  'LT_HARM_04 — arpeggiated chromatic pentad (Chamber Concerto / cluster technique).',
  'LT_HARM_05 — tritone as boundary interval; not resolution target.',
  'LT_HARM_06 — semitone dyad + chromatic pentad vocabulary; cluster_color_high_register.',
  // VL (5)
  'LT_VL_01 — semitone stepwise motion per voice; micropolyphonic strand.',
  'LT_VL_02 — large leaps (7ths/9ths) = structural punctuation at section boundaries only.',
  'LT_VL_03 — canonic independence; parallelMotionPolicy avoid (not conventional contrary motion).',
  'LT_VL_04 — registral boundary voices mark formal divisions.',
  'LT_VL_05 — voice merging at density peak: perceptually merged, inaudible independence.',
  // MEL (4)
  'LT_MEL_01 — angular chromatic cells (late period); motif fragmentation at climax.',
  'LT_MEL_02 — directional pure ascent / pure descent as formal gesture.',
  'LT_MEL_03 — no folk or modal inflection; folkModalPenalty active.',
  'LT_MEL_04 — melody suppressed early; angular cells late; no singable tonal line.',
  // FORM (4)
  'LT_FORM_01 — stasis as default surface; density thinning replaces cadential release.',
  'LT_FORM_02 — golden-mean climax placement; registral expansion/contraction arc.',
  'LT_FORM_03 — density thinning replaces cadential release (no V→I rhetoric).',
  'LT_FORM_04 — meccanico disintegration pattern (SQ2 Mvt III grammar).',
  // WORK (5)
  'LT_WORK_ATMOSPHERES_01 — Atmosphères: five-octave chromatic cluster opening; pulse denied; registral fog.',
  'LT_WORK_LUX_AETERNA_01 — Lux Aeterna: 16-voice canon strands + [0,5,7] signal sonority; micropolyphonic merge.',
  'LT_WORK_LONTANO_01 — Lontano: distance metaphor; transparency vs saturation alternation.',
  'LT_WORK_SQ2_01 — String Quartet No.2: meccanico disintegration + furioso jagged climax.',
  'LT_WORK_DESORDRE_01 — Étude Désordre: polyrhythmic phase offset; two-hand rhythmic canon.',
  // DIFF (3)
  'LT_DIFF_VS_WEBERN_01 — vs Webern: dense chromatic saturation vs sparse pointillist cells (σ 32 vs 40).',
  'LT_DIFF_VS_GLASS_01 — vs Glass: emergent registral stasis vs additive cell repetition.',
  'LT_DIFF_VS_SHOSTAKOVICH_01 — vs Shostakovich: cluster saturation vs triadic post-tonality (σ 32 vs 28).',
] as const;

export const LIGETI_VRB_FINGERPRINT_RECEIPTS = fillReceipts('LT', 'György Ligeti SQ VRB', LT_BASE, 35);

export type LigetiVrbFingerprintReceipt = (typeof LIGETI_VRB_FINGERPRINT_RECEIPTS)[number];
