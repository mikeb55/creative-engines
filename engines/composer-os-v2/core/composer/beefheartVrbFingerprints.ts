/**
 * Captain Beefheart — VRB fingerprint receipts (8 targets + negative discriminators).
 * Composed blues-fragment polyphony — independent part periodicity, wrong-note recurrence,
 * resolution suppression. Not delta blues, not rock hierarchy, not Ornette, not Zappa, not Ayler.
 */

export const BEEFHEART_FRAGMENT_POLYPHONY_VRF_FINGERPRINT_RECEIPTS = [
  'CBF_BLU_01 — BluesTransformedRule: target 0.85 — blues center detectable; functional progression removed; blues tones distributed across independent parts as friction not resolution; Safe As Milk baseline / Trout Mask maximal fracture; encode transformation not source.',
  'CBF_PER_01 — IndependentPartPeriodicityRule: target 0.90 — each part own repeating cell length; mismatched accent cycles; sync at phrase junctions not bar boundaries; drums as independent melodic-rhythmic design not groove support.',
  'CBF_WRN_01 — WrongNoteRecurrenceRule: target 0.88 — dissonant notes recur in same contour or rhythmic slot; never one-off spikes; m2/tritone friction; P4/P5 skeletal anchors; m3/M3 competing color-states; abnormal repeats until grammar.',
  'CBF_APM_01 — AsymmetricPhraseModuleRule: target 0.85 — 3/5/7/9-beat or mixed-length cells; compact fragment then varied repetition; not square 4+4 default; ideas carved not flowed.',
  'CBF_GTR_01 — GuitarCounterpointRule: target 0.80 — two guitars interlock as equal melodic-rhythmic voices; not lead plus rhythm; jagged delta-slide logic reorganized; registral leaps feel carved.',
  'CBF_VOC_01 — VocalBarlineInsubordinationRule: target 0.78 — vocal phrases enter before/after/across instrumental accents; speech-song bark; blue-note inflection beyond conventional blues syntax; cuts across bar structure.',
  'CBF_RES_01 — ResolutionSuppressionRule: target 0.92 — no cadential release; tension resets by repetition or sectional cut; coexistence not resolution; horns as puncturing counterlines not harmonic pads.',
  'CBF_UTT_01 — TranscribedUtteranceRule: target 0.85 — lines feel individually spoken not idiomatically guitaristic; voice/hand-tapped piano contour mapped without smoothing; hyper-specific repeatability from drilled rehearsal.',
  'CBF_NEG_01 — fail if clean 12-bar resolution dominant → delta blues bleed, not Beefheart.',
  'CBF_NEG_02 — fail if common-bar sync across all parts dominant → conventional rock bleed, not Beefheart.',
  'CBF_NEG_03 — fail if guitar riff-plus-solo hierarchy dominant → standard rock bleed, not Beefheart.',
  'CBF_NEG_04 — fail if dissonance without recurrence schema → random noise hardest fail; must fire reliably.',
  'CBF_NEG_05 — fail if jazz swing feel or improvisational looseness dominant → Ornette Coleman bleed, not Beefheart.',
  'CBF_NEG_06 — fail if formally tidy sectional architecture + genre wink dominant → Zappa bleed, not Beefheart.',
  'CBF_NEG_07 — fail if ecstatic scalar cries / spiritual energy arcs dominant → Ayler bleed, not Beefheart.',
  'CBF_NEG_08 — fail if postmodern theatrical conceptualism dominant → Pere Ubu/Residents bleed, not Beefheart.',
  'CBF_NEG_09 — fail if too weird without blues body → generic avant-garde bleed, not Beefheart.',
] as const;
