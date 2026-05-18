/**
 * VRB / SQ gate explanation strings for UI tooltips.
 */

export type GateKey =
  | 'register'
  | 'swing'
  | 'anti_metric'
  | 'blend'
  | 'boundary_ramp'
  | 'silence';

export const GATE_EXPLANATIONS: Record<GateKey, string> = {
  register: 'Controls maximum voice spread (σ ceiling).',
  swing: 'Enables tempo-adaptive off-beat displacement.',
  anti_metric: 'Activates displaced downbeats and phase drift.',
  blend: 'Enables per-section style crossfade.',
  boundary_ramp: 'Smooths same-family section transitions.',
  silence: 'Targets silence bars as structural punctuation.',
};

export const GATE_LABELS: Record<GateKey, string> = {
  register: 'Register gate',
  swing: 'Swing gate',
  anti_metric: 'Anti-metric gate',
  blend: 'Blend gate',
  boundary_ramp: 'Boundary ramp',
  silence: 'Silence gate',
};
