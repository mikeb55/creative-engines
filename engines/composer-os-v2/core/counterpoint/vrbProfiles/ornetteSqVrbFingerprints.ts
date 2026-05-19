/**
 * Ornette Coleman SQ VRB — pitch-field substrate fingerprint receipts (≥30).
 */

export const ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS = [
  // POLICY (6)
  'OC_SQ_POLICY_01 — harmonicSubstrate=pitch-field-spine: parallel field spine alongside chord symbol; chord chart not structural truth.',
  'OC_SQ_POLICY_02 — harmolodicsEnabled: harmony/melody/rhythm/time coequal; no permanent soloist/accompanist hierarchy.',
  'OC_SQ_POLICY_03 — pitchFieldGoverned: local pitch_field per tune/section replaces bar-locked chord-scale mapping.',
  'OC_SQ_POLICY_04 — collectiveImprovEnabled: democratic ensemble + micro call/response on shared pulse.',
  'OC_SQ_POLICY_05 — bluesInflectionRequired: ♭3/3 oscillation + bend vocabulary in field anchors.',
  'OC_SQ_POLICY_06 — democraticEnsemble: foreground/background roles shift by listening cues, not chart function.',

  // HARM (5)
  'OC_SQ_HARM_01 — parentPcSet: blues/pentatonic core (5–7 weighted pcs + 2–3 chromatic auxiliaries).',
  'OC_SQ_HARM_02 — no chord roots: floating verticals; bass melodic-floating not progression anchor.',
  'OC_SQ_HARM_03 — parallel motion allowed: verticalities emergent from independent lines.',
  'OC_SQ_HARM_04 — chromatic spillover: semitone/tritone neighbours inside field tolerance.',
  'OC_SQ_HARM_05 — useChordFallbackForCadences=false: cadence colour from field mutation, not V→I.',

  // VL (4)
  'OC_SQ_VL_01 — maxLeapSemitones=12: wide harmolodic leaps within interval pool.',
  'OC_SQ_VL_02 — semi-independent overlays: melody 0.75 / inner 0.65 / bass 0.55 parent overlap.',
  'OC_SQ_VL_03 — non_resolving phraseArticulation: phrase boundaries advance field regions.',
  'OC_SQ_VL_04 — interval pool m2–P5 weighted: 1→0.90 … 7→0.60 primary melodic IC budget.',

  // FORM (4)
  'OC_SQ_FORM_01 — head-solos-head narrativeArc with sectionRecallEnforced=false.',
  'OC_SQ_FORM_02 — no harmonic recall: head return may be partial/displaced/harmolodically transformed.',
  'OC_SQ_FORM_03 — phrase-boundary field advance: scheduler tension/density triggers region roll.',
  'OC_SQ_FORM_04 — field mutation: transitionOut mutationStrength 0.35–0.70 + 2–4 carryPcs.',

  // WORK (6)
  'WORK_SHAPE_OF_JAZZ — The Shape of Jazz to Come (1959): harmolodic head + democratic lines.',
  'WORK_FREE_JAZZ — Free Jazz (1960): collective density without functional chart spine.',
  'WORK_LONELY_WOMAN — Lonely Woman: slow blues-field pedal + floating bass.',
  'WORK_SKIES_OF_AMERICA — Skies of America: orchestral harmolodic field + pulse grid.',
  'WORK_CHANGE_OF_THE_CENTURY — Change of the Century: fast field mutation + interaction volatility.',
  'WORK_PRIME_TIME — Prime Time: backbeat pulse + harmolodic unison overlays.',

  // DIFF (3)
  'DIFF_VS_COLTRANE — vs Coltrane: field/pulse governed, not chord-scale-per-bar changes.',
  'DIFF_VS_BARTOK — vs Bartók: no additive cell canon; democratic jazz pulse not folk motor.',
  'DIFF_VS_LIGETI — vs Ligeti: blues/pentatonic field, not micropolyphonic chromatic saturation.',

  // SUBSTRATE (2)
  'SUBSTRATE_PITCH_FIELD_SPINE — pitch-field-spine substrate live for ornette_coleman SQ profile.',
  'SUBSTRATE_SEMI_INDEPENDENT — semi-independent overlay model: shared parentPcSet + per-voice bias.',
] as const;

export type OrnetteSqVrbFingerprintReceipt = (typeof ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS)[number];
