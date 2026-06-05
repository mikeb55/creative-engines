/**
 * Allan Holdsworth — VRB fingerprint receipts (8 targets + negative discriminators).
 * Scale-derived interval-subset harmony — not Henderson riff-funk / Joe Pass cadential bebop / Verlaine sus field.
 */

export const HOLDSWORTH_SCALE_DERIVED_VRF_FINGERPRINT_RECEIPTS = [
  'AH_SCL_01 — ScaleMembershipRule: target 0.90 — derive voicings and melody from one active scale-family; chord identity from interval-set membership not root grammar.',
  'AH_SUB_01 — IntervalSubsetVoicingRule: target 0.86 — weight maj7#11, maj9, min9, m(maj7), alt, lydian-augmented subsets; penalize plain triads and root-position functional stacks.',
  'AH_PERS_01 — ScaleFamilyPersistenceRule: target 0.80 — hold one scale collection 4–12 bars; change by chromatic recolor within family, not functional pivot.',
  'AH_VL_01 — ChromaticVoiceLeadingRule: target 0.84 — delayed resolution via chromatic approach within scale pool; legato voice-leading between distant subset targets.',
  'AH_ROOT_01 — FunctionalRootAvoidanceRule: target 0.88 — penalize ii–V–I, plain dom7, blues turnaround; reward non-functional subset loops.',
  'AH_LINE_01 — IntegratedLineHarmonyRule: target 0.78 — melody and chord drawn from same pitch collection; line defines harmony not block-chord grammar.',
  'AH_LEAP_01 — WideIntervalLineRule: target 0.72 — allow wide intervallic leaps and floating rhythmic placement; low riff-loop persistence.',
  'AH_TEX_01 — SopranoLineTextureRule: target 0.70 — single-voice soprano lead; sparse double-stops; sustain attack.',
  'AH_NEG_01 — fail if riff-grounded funk 16th grid + blues cadence dominate → Scott Henderson bleed, not Holdsworth.',
  'AH_NEG_02 — fail if fingerstyle cadential bebop ii–V–I + enclosure grammar dominate → Joe Pass bleed, not Holdsworth.',
  'AH_NEG_03 — fail if sus2/sus4/add9 modal field + bass displacement dominate → Verlaine bleed, not Holdsworth.',
  'AH_NEG_04 — fail if pentatonic blues riff cells + exact-loop hooks dominate → Wes Montgomery bleed, not Holdsworth.',
  'AH_NEG_05 — fail if open cadence sus stripping + tritone fields dominate → Andrew Hill (ah:*) bleed, not Holdsworth.',
  'AH_NEG_06 — fail if plain triad / functional dom7 density >0.20 → bebop functional bleed, not scale-derived fusion.',
] as const;
