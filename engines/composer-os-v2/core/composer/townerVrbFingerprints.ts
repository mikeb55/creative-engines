/**
 * Ralph Towner — VRB fingerprint receipts (8 targets + negative discriminators).
 * Guitar-born polyphonic ECM — not Garbarek / Wheeler / Weber / Surman / Bley / generic classical guitar.
 */

export const TOWNER_GUITAR_POLYPHONY_VRF_FINGERPRINT_RECEIPTS = [
  'RT_VOIC_01 — guitar_born_voicing: target 0.78 — maj9/add9/6-9/sus2/slash chords from fingerstyle guitar logic; open strings ring across changes; classical spacing.',
  'RT_MEL_01 — melody_from_voicing: target 0.72 — melody derived from arpeggio or chord shape; finger-composed contour inseparable from resonance; not separate lead line.',
  'RT_RES_01 — resonance_sustain: target 0.70 — common tones preserved; open strings sustained; overtone decay structural; do not cut strings unless rhythmically necessary.',
  'RT_HARM_01 — slow_harmonic_field: target 0.72 — one sonority per phrase with internal bass or upper-note shift; non-dominant motion; no ii–V–I closure.',
  'RT_BASS_01 — classical_bass_independence: target 0.68 — bass line moves independently from upper melody; middle strand implied or present; counterpoint by register.',
  'RT_ARP_01 — arpeggio_as_composition: target 0.65 — arpeggiation is the melodic/harmonic event — not filler; arpeggio motor drives phrase architecture.',
  'RT_INT_01 — open_string_interval_bias: target 0.70 — seconds, fourths, fifths, sixths, triadic skips from open-string geometry; chromaticism sparse and linear; no dense post-bop alteration.',
  'RT_SIL_01 — pastoral_silence: target 0.65 — structural silence after key events; decay completes the phrase; chamber density — never fills all space.',
  'RT_NEG_01 — fail if sax-led modal chant + Nordic folk lament → Garbarek bleed, not Towner.',
  'RT_NEG_02 — fail if polyaxial horn lyricism + angular melody not guitar-born → Wheeler bleed, not Towner.',
  'RT_NEG_03 — fail if bass pedal field dominant + guitar as atmosphere → Weber bleed, not Towner.',
  'RT_NEG_04 — fail if dark Dorian/Mixolydian reed ostinato → Surman bleed, not Towner.',
  'RT_NEG_05 — fail if collage + irony + genre rupture → Bley bleed, not Towner.',
  'RT_NEG_06 — fail if straight tremolo showpiece + Andalusian clichés + Segovia romantic cadencing → generic classical guitar — not Towner.',
] as const;
