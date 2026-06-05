/**
 * John Barry — VRB fingerprint receipts (`barry_thematic_monolith`).
 * Thematic monolith Bond scoring — not Herrmann dread, Morricone ritual, Goldsmith atonality, Schifrin groove.
 */

export const BARRY_THEMATIC_MONOLITH_VRF_FINGERPRINT_RECEIPTS = [
  'JBR_MONO_01 — thematic_monolith: target 0.80 — one theme supplies harmonic identity; cues from 1–2 cells; chord loops from opening harmony.',
  'JBR_MONO_02 — bond_chord_palette: target 0.75 — min(maj7), min(add2), min6, Bond chord, major 6/9; chromatic bass under stable upper voicing; 2-chord ostinato.',
  'JBR_MONO_03 — minor_major_duality: target 0.65 — minor-to-major brightening encodes danger/glamour; ambiguity before romantic arrival.',
  'JBR_MONO_04 — chromatic_bass_descent: target 0.68 — semitone or falling-third bass under held sonority; threat without full harmonic change.',
  'JBR_MONO_05 — block_brass_declaration: target 0.78 — 4–6 part block brass middle-high register; mute/plunger/growl; weight and glare not counterpoint.',
  'JBR_MONO_06 — string_emotional_mass: target 0.72 — sustained harmonic planes, octave doubling, broad legato; limited internal agitation.',
  'JBR_MONO_07 — melodic_nobility: target 0.72 — long arcs P4/P5/M6/octave peaks; square declarative placement; 3–4 note Bond cells in brass.',
  'JBR_MONO_08 — climax_by_accumulation: target 0.70 — repetition + orchestral bloom + register expansion; full theme statement release; restraint plus mass.',
  'JBR_NEG_01 — fail if chromatic inner-string agitation + dread → Herrmann bleed, not Barry.',
  'JBR_NEG_02 — fail if sparse modal ritual + folk timbral icons → Morricone bleed, not Barry.',
  'JBR_NEG_03 — fail if interval-cell modernism + atonality → Goldsmith bleed, not Barry.',
  'JBR_NEG_04 — fail if odd-meter groove + Latin percussion engine → Schifrin bleed, not Barry.',
  'JBR_NEG_05 — fail if soft American lounge ease + conversational swing → Mancini bleed, not Barry.',
] as const;
