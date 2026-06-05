/**
 * Jack White — VRB fingerprint receipts (8 targets + negative discriminators).
 * Drone-centered open-tuning riff fusion — not Hendrix modal / Iommi doom / Gilmour legato / Verlaine field.
 */

export const JACK_WHITE_DRONE_RIFF_VRF_FINGERPRINT_RECEIPTS = [
  'JW_TUN_01 — OpenTuningPriorityRule: target 0.82 — prefer open-A and open-E geometry; chord shapes from open-tuning interval logic not standard barre grammar; open string identity is compositional substrate.',
  'JW_TON_01 — TonicPersistenceRule: target 0.82 — one pitch class present or recurrent across 60–80% of riff events via open string, return note, or octave doubling; tonal floor always audible.',
  'JW_IMP_01 — HarmonyByImplicationRule: target 0.88 — dyads, fifths, open-string composites as default; third omitted frequently; penalize rich tertian progression as primary surface.',
  'JW_CELL_01 — RiffCellEconomyRule: target 0.85 — 1–2 bar cells repeated before varied; variation = registral/rhythmic/slide inflection not new harmonic content; one idea hit harder.',
  'JW_SLIDE_01 — SlideAsHarmonicAgentRule: target 0.85 — slide tones articulate chord area or turnaround targets in open-tuned states; harmonic voice not blues embellishment.',
  'JW_FUSE_01 — LeadRhythmFusionRule: target 0.80 — chord hit, drone, melodic fragment inside one layer; no separate accompaniment plus solo; fused aggressive guitar part.',
  'JW_RAW_01 — ControlledIncompletnessRule: target 0.80 — unresolved thirds, abrasive doublings, phrase truncation valid; friction preserved; tonal anchor must remain audible.',
  'JW_ATK_01 — AttackWeightedPhrasingRule: target 0.78 — accent note onset over sustain elegance; bent entries, pick attack, octave emphasis, abrupt rests; silence resets next attack.',
  'JW_NEG_01 — fail if extended-modal chord embellishment dominates → Hendrix bleed, not Jack White.',
  'JW_NEG_02 — fail if palm-muted symmetric chromatic doom power chords without drone logic → Iommi bleed, not Jack White.',
  'JW_NEG_03 — fail if folk-modal multi-section development + ornate turnaround architecture → Page/Zeppelin bleed, not Jack White.',
  'JW_NEG_04 — fail if sustained legato lyrical solo + spacious harmonic support → Gilmour bleed, not Jack White.',
  'JW_NEG_05 — fail if airy post-punk linear guitar without tonic grounding → Verlaine bleed, not Jack White.',
  'JW_NEG_06 — fail if standard-tuning pentatonic blues-rock without open-string drone → Black Keys bleed, not Jack White.',
  'JW_NEG_07 — fail if collage-structure hyper-groove cut-up form → Jon Spencer bleed, not Jack White.',
  'JW_NEG_08 — fail if flat chant-like melody without slide/drone interval drama → Billy Childish bleed, not Jack White.',
] as const;
