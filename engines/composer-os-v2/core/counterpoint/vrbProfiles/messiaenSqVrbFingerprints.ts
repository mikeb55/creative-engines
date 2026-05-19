/**
 * Olivier Messiaen SQ VRB — pitch-field substrate fingerprint receipts (≥30).
 */

export const MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS = [
  // POLICY (6)
  'MM_SQ_POLICY_01 — modesOfLimitedTransposition: parentPcSet from MESSIAEN_MODES[modeId].',
  'MM_SQ_POLICY_02 — blockHarmony: region length 1–8 bars; formal block boundaries.',
  'MM_SQ_POLICY_03 — pedalBass: pedalPolicy=bass-drone on PitchFieldRegion.',
  'MM_SQ_POLICY_04 — additiveRhythm: rhythmicCellEnabled alternates per region.',
  'MM_SQ_POLICY_05 — noFunctionalResolution: suppressFunctionalResolution=true.',
  'MM_SQ_POLICY_06 — pitchFieldSubstrate: harmonicSubstrate=pitch-field-spine.',

  // HARM (5)
  'MM_SQ_HARM_01 — symmetricModes: M1–M7 limited-transposition pc sets.',
  'MM_SQ_HARM_02 — commonTonePivots: transitionOut carryPcs + low mutationStrength 0.20–0.45.',
  'MM_SQ_HARM_03 — resonanceChords: added_ninth + coloristic cluster vocabulary.',
  'MM_SQ_HARM_04 — modalColor: octatonic/whole-tone interval pool weights.',
  'MM_SQ_HARM_05 — staticFields: block-like stasis; min region 1 bar.',

  // VL (4)
  'MM_SQ_VL_01 — stepwiseWithinMode: maxLeapSemitones=5; semitone/step preference.',
  'MM_SQ_VL_02 — pedalSustain: bass overlapWithParent=0.60.',
  'MM_SQ_VL_03 — stratifiedLayers: melody 0.85 / inner 0.80 register strata.',
  'MM_SQ_VL_04 — commonToneTransitions: mutationStrength conservative 0.30 baseline.',

  // FORM (4)
  'MM_SQ_FORM_01 — blockLikeSections: 1–8 bar regions; formal symmetry.',
  'MM_SQ_FORM_02 — rhythmicCellCompletion: rhythmicCellEnabled gates advance.',
  'MM_SQ_FORM_03 — timelessStasis: non_resolving phraseArticulation.',
  'MM_SQ_FORM_04 — formalSymmetry: sectionRecallEnforced on form policy.',

  // WORK (6)
  'WORK_QUARTET_END_OF_TIME — Quartet for the End of Time: Mode 2 blocks.',
  'WORK_VINGT_REGARDS — Vingt Regards: luminous modal colour.',
  'WORK_TURANGALILA — Turangalîla: rhythmic-cell additive layers.',
  "WORK_L_ASCENSION — L'Ascension: sustained pedal + resonance.",
  'WORK_CHRONOCHROMIE — Chronochromie: symmetric mode rotation.',
  'WORK_ECLAIRS — Éclairs sur l\'Au-Delà: dense Mode 7 fields.',

  // DIFF (3)
  'DIFF_VS_COLTRANE — vs Coltrane: static symmetric modes vs rotating jazz cells.',
  'DIFF_VS_PART — vs Arvo Pärt: chromatic limited modes vs tintinnabuli diatonic.',
  'DIFF_VS_DEBUSSY — vs Debussy: systematic MLT vs impressionist planing.',

  // SUBSTRATE (2)
  'SUBSTRATE_PITCH_FIELD_SPINE — pitch-field-spine substrate live for messiaen SQ profile.',
  'SUBSTRATE_MODE_DEFINED_PARENT — mode-defined parent field via messiaenModeId UI wire.',
] as const;

export type MessiaenSqVrbFingerprintReceipt = (typeof MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS)[number];
