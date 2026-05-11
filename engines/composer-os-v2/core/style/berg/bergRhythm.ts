/**
 * Berg-family rhythmic leitmotif scaffolding — Hauptrhythmus object, scalings, metric accents.
 */

export type BergRhythmicScaling = 'x1' | 'x2' | 'x1_2';

export interface BergHauptrhythmus {
  /** Relative durations (e.g. [2,1,1] eighth units). */
  cell: readonly number[];
  /** Attach to pitch classes or MIDI — planning ids only here. */
  pitchAnchors?: readonly number[];
  instrumentTag?: string;
  scaling?: BergRhythmicScaling;
}

export function scaleHauptrhythmus(h: BergHauptrhythmus): number[] {
  const f =
    h.scaling === 'x2' ? 2 : h.scaling === 'x1_2' ? 0.5 : 1;
  return h.cell.map((u) => u * f);
}

/** Section tempo proportion labels (not absolute BPM). */
export type BergTempoSectionRatio = '1:1' | '1:2' | '2:1' | '2:3' | '3:2';

/** Metric accent grouping in eighth/quarter abstract units (independent of notated meter). */
export interface BergMetricAccentGrouping {
  label: string;
  units: readonly number[];
}

export const BERG_METRIC_GROUPINGS: readonly BergMetricAccentGrouping[] = [
  { label: '3+3+2', units: [3, 3, 2] },
  { label: '5+3', units: [5, 3] },
  { label: '2+2+2+2', units: [2, 2, 2, 2] },
];
