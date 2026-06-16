/**
 * Shared MIDI chord inference templates (import IR + SQ-BB extractor parity).
 * v1 import: no slash bass; confidence capped below explicit MusicXML harmony.
 */

import { IMPORT_EXPLICIT_HARMONY_CONFIDENCE } from './mosaicImportTimeline';

const PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type MidiImportChordTemplateId =
  | 'major'
  | 'minor'
  | 'dom7'
  | 'maj7'
  | 'min7'
  | 'half_dim7'
  | 'dim7'
  | 'sus2'
  | 'sus4';

export const MIDI_IMPORT_CHORD_TEMPLATES: ReadonlyArray<{
  id: MidiImportChordTemplateId;
  pcs: readonly number[];
  suffix: string;
}> = [
  { id: 'major', pcs: [0, 4, 7], suffix: '' },
  { id: 'minor', pcs: [0, 3, 7], suffix: 'm' },
  { id: 'dom7', pcs: [0, 4, 7, 10], suffix: '7' },
  { id: 'maj7', pcs: [0, 4, 7, 11], suffix: 'maj7' },
  { id: 'min7', pcs: [0, 3, 7, 10], suffix: 'm7' },
  { id: 'half_dim7', pcs: [0, 3, 6, 10], suffix: 'm7b5' },
  { id: 'dim7', pcs: [0, 3, 6, 9], suffix: 'dim7' },
  { id: 'sus2', pcs: [0, 2, 7], suffix: 'sus2' },
  { id: 'sus4', pcs: [0, 5, 7], suffix: 'sus4' },
];

export const MIDI_INFERRED_HARMONY_CONFIDENCE_CAP =
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE - 0.1;

export function midiImportPcName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12]!;
}

function templateScore(rel: Set<number>, template: readonly number[]): number {
  let hits = 0;
  for (const t of template) {
    if (rel.has(t)) hits++;
  }
  let extra = 0;
  for (const r of rel) {
    if (!template.includes(r)) extra++;
  }
  return hits / template.length - extra * 0.1;
}

export function inferChordFromMidis(midis: number[]): { symbol: string; confidence: number } {
  if (midis.length === 0) return { symbol: 'N.C.', confidence: 0 };
  if (midis.length === 1) {
    return { symbol: midiImportPcName(midis[0]!), confidence: 0.45 };
  }

  const pcSet = new Set(midis.map((m) => ((m % 12) + 12) % 12));

  let bestRoot = 0;
  let bestSuffix = '';
  let bestScore = -1;

  for (let root = 0; root < 12; root++) {
    const rel = new Set<number>();
    for (const pc of pcSet) rel.add((pc - root + 12) % 12);
    for (const tmpl of MIDI_IMPORT_CHORD_TEMPLATES) {
      const s = templateScore(rel, tmpl.pcs);
      if (s > bestScore) {
        bestScore = s;
        bestRoot = root;
        bestSuffix = tmpl.suffix;
      }
    }
  }

  const symbol = `${midiImportPcName(bestRoot)}${bestSuffix}`;
  const raw = Math.max(0, Math.min(1, 0.35 + bestScore * 0.65));
  const confidence = Math.min(MIDI_INFERRED_HARMONY_CONFIDENCE_CAP, raw);
  return { symbol, confidence };
}
