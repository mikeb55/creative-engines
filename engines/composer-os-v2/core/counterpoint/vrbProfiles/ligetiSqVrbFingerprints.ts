/**
 * Ligeti SQ VRB — pitch-field / micropolyphony fingerprint receipts (≥30).
 */

export const LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS = [
  // POLICY (6)
  'LT_SQ_POLICY_01 — micropolyphony: temporal strand differentiation over pitch divergence.',
  'LT_SQ_POLICY_02 — clusterBandField: near-chromatic parentPcSet with register-density weighting.',
  'LT_SQ_POLICY_03 — nearStepwiseMotion: maxLeapSemitones=3; m2/M2 interval pool dominant.',
  'LT_SQ_POLICY_04 — slowFieldEvolution: regions 8–32 bars; mutationStrength 0.10–0.35.',
  'LT_SQ_POLICY_05 — pitchFieldSubstrate: harmonicSubstrate upgraded to pitch-field-spine.',
  'LT_SQ_POLICY_06 — highVoiceIndependence: shared-parent overlays 0.90/0.90/0.80.',

  // HARM (5)
  'LT_SQ_HARM_01 — chromaticCluster: all 12 pcs in parent field.',
  'LT_SQ_HARM_02 — nearFullPcSpace: central register pcs weighted higher.',
  'LT_SQ_HARM_03 — registerDensityWeighting: parentWeights peak mid-register.',
  'LT_SQ_HARM_04 — m2M2Dominant: intervalPool semitone=1.00, M2=0.95.',
  'LT_SQ_HARM_05 — gradualCenterDrift: gravityCenterPc advances per region.',

  // VL (4)
  'LT_SQ_VL_01 — canonicEntriesOffset: canonOffsetRange [0.125, 0.5] bars.',
  'LT_SQ_VL_02 — entryStagger: entryStagger=0.65 temporal voice entries.',
  'LT_SQ_VL_03 — motionBlur: motionBlur=0.70 strand smear.',
  'LT_SQ_VL_04 — nearStepwiseOnly: leaps >3 semitones penalised in GCE micropolyphony scorer.',

  // FORM (4)
  'LT_SQ_FORM_01 — regionLength8to32: scheduler min 8 max 32 bars.',
  'LT_SQ_FORM_02 — densityEnvelopeDriven: textureDensity=0.85 targets saturation arc.',
  'LT_SQ_FORM_03 — continuousMorphing: high carryPcs count on transitionOut.',
  'LT_SQ_FORM_04 — noDiscreteChanges: near-imperceptible mutation at boundaries.',

  // WORK (6)
  'WORK_ATMOSPHERES — Atmosphères: chromatic cluster fog + pulse denial.',
  'WORK_LONTANO — Lontano: distance / transparency vs saturation.',
  'WORK_PIANO_ETUDES — Piano Études: polyrhythmic phase + hand canon.',
  'WORK_SQ2 — String Quartet No.2: meccanico disintegration grammar.',
  'WORK_CHAMBER_CONCERTO — Chamber Concerto: arpeggiated chromatic pentad clusters.',
  'WORK_CLOCKS_AND_CLOUDS — Clocks and Clouds: micropolyphonic merge + registral haze.',

  // DIFF (3)
  'DIFF_VS_BARTOK — vs Bartók: chromatic saturation vs folk additive cells.',
  'DIFF_VS_MESSIAEN — vs Messiaen: continuous morph vs symmetric mode blocks.',
  'DIFF_VS_COLTRANE — vs Coltrane: temporal micropolyphony vs interval-cell rotation.',

  // SUBSTRATE (2)
  'SUBSTRATE_PITCH_FIELD_UPGRADE — pitch-field-spine upgrade from chord-spine.',
  'SUBSTRATE_SHARED_PARENT_HIGH_OVERLAP — shared-parent high-overlap temporal model.',
] as const;

export type LigetiSqVrbFingerprintReceipt = (typeof LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS)[number];
