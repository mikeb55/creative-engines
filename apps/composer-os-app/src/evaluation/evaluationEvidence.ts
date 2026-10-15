/** Display helpers. They group receipt findings. They do not measure the score. */

export interface DashboardFinding {
  id: string;
  metricId: string;
  metricVersion: string;
  bars: number[];
  onsetInBar: { n: number; d: number } | null;
  instrument: string | null;
  partId: string | null;
  voice: string | null;
  eventIds: string[];
  observations: Record<string, string | number | boolean | null>;
  confidence: string;
  limitation: string | null;
}

export interface EvidenceSection {
  title: string;
  metricIds: readonly string[];
}

export const HARMONIC_SECTIONS: readonly EvidenceSection[] = [
  { title: 'Pitch-class collections', metricIds: ['pitch-class-collection'] },
  { title: 'Harmonic-field membership', metricIds: ['field-membership'] },
  { title: 'Inside / outside / return', metricIds: ['inside-outside-return', 'collection-distance'] },
  { title: 'Voice-leading motion', metricIds: ['registered-voice-leading', 'common-tone-retention', 'harmonic-displacement'] },
  { title: 'Melodic contour', metricIds: ['melodic-contour'] },
  { title: 'Interval distribution', metricIds: ['interval-distribution'] },
  { title: 'Register and tessitura', metricIds: ['tessitura'] },
  { title: 'Motif recurrence', metricIds: ['motif-recurrence', 'motif-map'] },
];

export const RHYTHM_SECTIONS: readonly EvidenceSection[] = [
  { title: 'Attack density', metricIds: ['note-density'] },
  { title: 'Sounding time and silence', metricIds: ['sounding-rest-proportion'] },
  { title: 'Joint rests', metricIds: ['duo-activity'] },
  { title: 'Shared and separate attacks', metricIds: ['attack-relationship'] },
  { title: 'Contrary, similar, parallel and oblique motion', metricIds: ['relative-motion', 'register-crossing'] },
  { title: 'Phrase boundaries', metricIds: ['phrase-boundary'] },
  { title: 'Instrument-role observations', metricIds: ['role-indicator'] },
];

export function findingsFor(findings: readonly DashboardFinding[], metricIds: readonly string[]): DashboardFinding[] {
  return findings.filter((finding) => metricIds.includes(finding.metricId));
}

export function observationText(observations: Record<string, string | number | boolean | null>): string {
  return Object.keys(observations)
    .sort()
    .map((key) => `${key}=${String(observations[key])}`)
    .join('; ');
}

export function onsetText(onset: { n: number; d: number } | null): string {
  if (!onset) return '';
  return `${onset.n}/${onset.d}`;
}
