import type { EmotionalDrift } from '@composer-os/core/harmony/reharmCandidateEngine';

export const VAULT_EMOTIONAL_DRIFT_OPTIONS: { value: EmotionalDrift; label: string }[] = [
  { value: 'neutral', label: 'neutral' },
  { value: 'darker', label: 'darker' },
  { value: 'brighter', label: 'brighter' },
  { value: 'more-suspended', label: 'more-suspended' },
  { value: 'more-unstable', label: 'more-unstable' },
  { value: 'more-cinematic', label: 'more-cinematic' },
];

/** Maps 0-1 slider (step 0.1) to target emotional drift - shared by Chord Inspector + ReharmPanel. */
export function sliderToTargetReharmDrift(slider: number): EmotionalDrift {
  const order: EmotionalDrift[] = [
    'neutral',
    'darker',
    'brighter',
    'more-suspended',
    'more-unstable',
    'more-cinematic',
  ];
  const t = Math.min(1, Math.max(0, slider));
  const idx = Math.round(t * (order.length - 1));
  return order[idx]!;
}

export function emotionalDriftOptionLabel(drift: EmotionalDrift): string {
  return VAULT_EMOTIONAL_DRIFT_OPTIONS.find((o) => o.value === drift)?.label ?? drift;
}
