/**
 * Billy Strayhorn — VRB fingerprint receipts (13 targets).
 * Extended-tone melody/harmony fusion; chromatic song architecture distinct from Ellington.
 */

export const BILLY_STRAYHORN_VRF_FINGERPRINT_RECEIPTS = [
  'BS_MEL_01 — Extended-tone melody bias: target 0.65 — maj7/9/11/13 on accented beats, not root or 5th.',
  'BS_MEL_02 — Long legato angular phrase: target 0.70 — ≥P4 leap rhythmically connected across barline.',
  'BS_HARM_01 — Parallel color-chord opening: target 0.45 — minor-6/maj7 planing at phrase start.',
  'BS_HARM_02 — Tonal obscuring dissonance: target 0.60 — delay tonic confirmation with color tones at cadence.',
  'BS_HARM_03 — Minor-third key drift: target 0.40 — new tonic by minor-third relation within 32 bars.',
  'BS_HARM_04 — Tritone-dominant reinterpretation: target 0.50 — dominant redirected via tritone sub at cadence.',
  'BS_HARM_05 — Enharmonic diminished pivot: target 0.35 — shared dim7 content pivots dominant/tonic areas.',
  'BS_HARM_06 — Descending dominant chain: target 0.25 — 3–4 successive dominants descending by semitone.',
  'BS_MEL_03 — Descending maj7 arpeggio motive: target 0.40 — descending major-7 span as melodic cell.',
  'BS_ORCH_01 — Sax unison countermelody: target 0.45 — reed line as thin independent contrapuntal layer.',
  'BS_ORCH_02 — Sustained closed-block writing: target 0.50 — within-octave block voicing persists phrase span.',
  'BS_ORCH_03 — Polyphonic background support: target 0.55 — horizontal counterpoint, not static pads.',
  'BS_HARM_07 — Functional fourth-cycle avoidance: target 1.00 — no minor7 -> dominant7 -> major with both roots ascending a perfect fourth in distinctive passages; enforced by strayhornRootMotionGuard.',
] as const;
