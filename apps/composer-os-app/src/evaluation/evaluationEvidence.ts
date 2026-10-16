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
  { title: 'Hexatonic colour', metricIds: ['hexatonic-status', 'hexatonic-writing'] },
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

export interface ComparisonDifference {
  left: string;
  right: string;
  bar: number;
  onset: string;
  instrument: string | null;
  voice: string | null;
  eventId: string;
  change: 'only-in-left' | 'only-in-right';
  signature: string;
}

export interface SignedEvent {
  id: string;
  bar: number;
  instrument: string;
  onset: string;
  signature: string;
  rest: boolean;
}

export function pairChanges(differences: readonly ComparisonDifference[], left: string, right: string) {
  return differences.filter((difference) => difference.left === left && difference.right === right);
}

export function retainedSignatures(events: readonly SignedEvent[], removedSignatures: readonly string[]): SignedEvent[] {
  const gone = new Set(removedSignatures);
  return events.filter((event) => !event.rest && !gone.has(event.signature));
}

export function descriptiveMetricChanges(
  columns: readonly { label: string; findings: readonly DashboardFinding[] }[],
): Array<{ metricId: string; bar: string; instrument: string; values: Array<{ label: string; text: string }> }> {
  const keys = new Map<string, Map<string, string>>();
  for (const column of columns) {
    for (const finding of column.findings) {
      if (finding.metricId !== 'note-density' && finding.metricId !== 'melodic-contour' && finding.metricId !== 'interval-distribution' && finding.metricId !== 'pitch-class-collection') continue;
      const key = `${finding.metricId}|${finding.bars.join(',')}|${finding.instrument ?? ''}|${finding.partId ?? ''}`;
      const row = keys.get(key) ?? new Map<string, string>();
      row.set(column.label, observationText(finding.observations));
      keys.set(key, row);
    }
  }
  const changes: Array<{ metricId: string; bar: string; instrument: string; values: Array<{ label: string; text: string }> }> = [];
  for (const [key, row] of keys) {
    const texts = [...row.values()];
    if (new Set(texts).size < 2) continue;
    const [metricId, bar, instrument] = key.split('|');
    changes.push({
      metricId: metricId ?? '',
      bar: bar ?? '',
      instrument: instrument ?? '',
      values: columns.map((column) => ({ label: column.label, text: row.get(column.label) ?? '' })),
    });
  }
  return changes;
}
