/**
 * John Coltrane (late) SQ VRB — pitch-field substrate fingerprint receipts (≥30).
 */

export const COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS = [
  // POLICY (6)
  'CT_SQ_POLICY_01 — harmonicSubstrate=pitch-field-spine: interval-cell field replaces bar-locked chord spine.',
  'CT_SQ_POLICY_02 — pitchFieldGoverned: rotating trichord/hexachord parentPcSet per region.',
  'CT_SQ_POLICY_03 — patternSaturationAdvance: densityDrive>0.8 triggers region roll before 16 bars.',
  'CT_SQ_POLICY_04 — modalPedal: bass modal-pedal role; pedal spans over cell exhaustion.',
  'CT_SQ_POLICY_05 — sheetsOfSound: dense chromatic saturation within interval-cell pool.',
  'CT_SQ_POLICY_06 — suppressFunctionalResolution: no V→I cadence closure; field mutation only.',

  // HARM (5)
  'CT_SQ_HARM_01 — trichord/hexachord sets: 3–6 pc progenitor cells with transpositionCycle=5.',
  'CT_SQ_HARM_02 — transpositionCycles: region index advances cell by semitone cycle.',
  'CT_SQ_HARM_03 — chromaticDensity: m2-weight 0.95 dominant in intervalPool.',
  'CT_SQ_HARM_04 — modalCenter: gravityCenterPc anchors cell root.',
  'CT_SQ_HARM_05 — pentatonicScalarBase: modal dorian/mixolydian vocabulary tags.',

  // VL (4)
  'CT_SQ_VL_01 — rapidNoteValues: 0.25-bar swing grid; high note density.',
  'CT_SQ_VL_02 — stepwiseWithinCell: preferredIntervals 1–6 within parent field.',
  'CT_SQ_VL_03 — registralSaturation: dramatically_volatile_wide_arc register policy.',
  'CT_SQ_VL_04 — pivotTrichordTransitions: transitionOut pivotPcs carry 2–3 pcs; mutation 0.25–0.55.',

  // FORM (4)
  'CT_SQ_FORM_01 — longPedalSpans: cell-exhaustion narrativeArc.',
  'CT_SQ_FORM_02 — cellExhaustionForm: region length 4–16 bars before advance.',
  'CT_SQ_FORM_03 — densityDrivenAdvance: densityDrive metadata on PitchFieldRegion.',
  'CT_SQ_FORM_04 — energyThreshold: tension arc triggers mid-region boundary.',

  // WORK (6)
  'WORK_A_LOVE_SUPREME — A Love Supreme: modal cell + spiritual pedal.',
  'WORK_ASCENSION — Ascension: sheets-of-sound density + free pulse.',
  'WORK_INTERSTELLAR_SPACE — Interstellar Space: duo pulse + interval cells.',
  'WORK_GIANT_STEPS — Giant Steps (early ref): cell rotation echo only.',
  'WORK_MY_FAVORITE_THINGS — My Favorite Things: modal pedal + soprano arch.',
  'WORK_MEDITATIONS — Meditations: sparse→dense registral arc.',

  // DIFF (3)
  'DIFF_VS_ORNETTE — vs Ornette: structured interval cells vs harmolodic blues field.',
  'DIFF_VS_MESSIAEN — vs Messiaen: rotating jazz cells vs symmetric limited modes.',
  'DIFF_VS_LIGETI — vs Ligeti: modal jazz density vs micropolyphonic chromatic wash.',

  // SUBSTRATE (2)
  'SUBSTRATE_PITCH_FIELD_SPINE — pitch-field-spine substrate live for coltrane SQ profile.',
  'SUBSTRATE_SHARED_PARENT — shared-parent overlay: melody 0.85 / inner 0.80 / bass 0.70.',
] as const;

export type ColtraneSqVrbFingerprintReceipt = (typeof COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS)[number];
