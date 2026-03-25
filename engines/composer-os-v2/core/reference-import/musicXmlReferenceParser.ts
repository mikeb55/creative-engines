/**
 * Light MusicXML behavioural extraction — regex-friendly, safe partial results.
 */

import type { ReferenceChordSegment, ReferencePiece, ReferencePitchSummary, ReferenceNoteSample } from './referencePieceTypes';
import { importSuccess, emptyImportFailure, type ReferenceImportResult } from './referenceImportTypes';

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchToMidi(step: string, octave: number, alter: number): number {
  const pc = STEP_TO_PC[step.toUpperCase()] ?? 0;
  return (octave + 1) * 12 + pc + alter;
}

function extractFirstPartBlock(xml: string): string | null {
  const m = xml.match(/<part\s+id="[^"]*"[^>]*>([\s\S]*?)<\/part>/);
  return m?.[1] ?? null;
}

function extractMeasures(inner: string): string[] {
  return inner.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
}

function extractRehearsalBar(measureXml: string, measureNumber: number): { label: string; bar: number } | null {
  const rm = measureXml.match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
  if (rm) return { label: rm[1].trim(), bar: measureNumber };
  const words = measureXml.match(/<words[^>]*>([^<]+)<\/words>/i);
  if (words && /[A-Z][a-z]/.test(words[1]) && words[1].length < 24) {
    return { label: words[1].trim(), bar: measureNumber };
  }
  return null;
}

function extractHarmonyChord(measureXml: string): string | null {
  const hm = measureXml.match(/<harmony[^>]*>([\s\S]*?)<\/harmony>/i);
  if (!hm) return null;
  const block = hm[1];
  const stepM = block.match(/<root-step>([A-G])<\/root-step>/i);
  const alterM = block.match(/<root-alter>(-?\d+)<\/root-alter>/);
  const kindM = block.match(/<kind[^>]*>([^<]*)<\/kind>/i) ?? block.match(/<kind[^>]*\/>/);
  if (!stepM) return null;
  const alt = alterM ? parseInt(alterM[1], 10) : 0;
  const acc = alt === -1 ? 'b' : alt === 1 ? '#' : '';
  const root = `${stepM[1]}${acc}`;
  let qual = '';
  if (kindM && kindM[1]) {
    const k = kindM[1].trim().toLowerCase();
    if (k.includes('minor')) qual = 'm';
    else if (k.includes('dominant') || k === '7') qual = '7';
    else if (k.includes('major') || k === '') qual = '';
    else if (k.includes('half-diminished')) qual = 'm7b5';
    else qual = k.slice(0, 4);
  }
  return `${root}${qual}` || root;
}

function collectNotesFromMeasure(measureXml: string, measureNum: number): ReferenceNoteSample[] {
  const out: ReferenceNoteSample[] = [];
  const noteBlocks = measureXml.match(/<note[^>]*>[\s\S]*?<\/note>/g) ?? [];
  for (const nb of noteBlocks) {
    if (/<rest/.test(nb)) continue;
    if (/<chord\s*\/>/.test(nb)) continue;
    const sm = nb.match(/<step>([A-G])<\/step>/i);
    const om = nb.match(/<octave>(\d+)<\/octave>/);
    const am = nb.match(/<alter>(-?\d+)<\/alter>/);
    if (!sm || !om) continue;
    const alter = am ? parseInt(am[1], 10) : 0;
    const midi = pitchToMidi(sm[1], parseInt(om[1], 10), alter);
    out.push({ midi, barApprox: measureNum, beatInBar: 0 });
  }
  return out;
}

function mergeChordBars(rows: Array<{ chord: string; bar: number }>): ReferenceChordSegment[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => a.bar - b.bar);
  const segments: ReferenceChordSegment[] = [];
  let i = 0;
  while (i < sorted.length) {
    const chord = sorted[i].chord;
    const startBar = sorted[i].bar;
    let bars = 1;
    let j = i + 1;
    while (j < sorted.length && sorted[j].chord === chord && sorted[j].bar === sorted[j - 1].bar + 1) {
      bars++;
      j++;
    }
    segments.push({ chord, startBar, bars });
    i = j;
  }
  return segments;
}

/**
 * Parse MusicXML string into a ReferencePiece (first part only; harmony + rehearsal when present).
 */
export function parseMusicXmlReference(xml: string): ReferenceImportResult {
  const warnings: string[] = [];
  const trimmed = xml.trim();
  if (!trimmed.includes('<score-partwise') && !trimmed.includes('<score-timewise')) {
    return emptyImportFailure(['Not recognized as MusicXML partwise/timewise'], warnings);
  }
  if (trimmed.includes('<score-timewise')) {
    warnings.push('timewise MusicXML: import not supported — use partwise export');
    return emptyImportFailure(['timewise MusicXML not supported for reference import'], warnings);
  }

  const partInner = extractFirstPartBlock(trimmed);
  if (!partInner) {
    return emptyImportFailure(['No <part> block found'], warnings);
  }

  const measures = extractMeasures(partInner);
  if (measures.length === 0) {
    return emptyImportFailure(['No measures in first part'], warnings);
  }

  const rehearsalMarks: Array<{ label: string; bar: number }> = [];
  const chordByBar: Array<{ chord: string; bar: number }> = [];
  const noteSamples: ReferenceNoteSample[] = [];

  let idx = 0;
  for (const mb of measures) {
    const numM = mb.match(/<measure[^>]*number="(\d+)"/);
    const measureNum = numM ? parseInt(numM[1], 10) : idx + 1;

    const rh = extractRehearsalBar(mb, measureNum);
    if (rh) rehearsalMarks.push(rh);

    const ch = extractHarmonyChord(mb);
    if (ch) chordByBar.push({ chord: ch, bar: measureNum });

    noteSamples.push(...collectNotesFromMeasure(mb, measureNum));
    idx++;
  }

  const totalBars = measures.length;
  const chordSegments = mergeChordBars(chordByBar);

  const sections: ReferencePiece['sections'] = [{ label: 'A', startBar: 1, barCount: totalBars }];

  const uniqueMidi = noteSamples.map((n) => n.midi);
  let minM = 127;
  let maxM = 0;
  for (const m of uniqueMidi) {
    if (m < minM) minM = m;
    if (m > maxM) maxM = m;
  }
  if (uniqueMidi.length === 0) {
    minM = 60;
    maxM = 60;
    warnings.push('no pitched notes found in first part — register summary is nominal');
  }

  const pitchByPart: Record<string, ReferencePitchSummary> = {
    P1: {
      minMidi: minM,
      maxMidi: maxM,
      noteCount: uniqueMidi.length,
    },
  };

  let harmonicRhythmBars = 0;
  if (chordSegments.length > 0) {
    const sum = chordSegments.reduce((a, s) => a + s.bars, 0);
    harmonicRhythmBars = sum / chordSegments.length;
  }

  const piece: ReferencePiece = {
    sourceKind: 'musicxml',
    totalBars,
    sections,
    chordSegments,
    rehearsalMarks,
    pitchByPart,
    noteSamples,
    harmonicRhythmBars,
    warnings,
    partial: chordByBar.length === 0 || uniqueMidi.length === 0,
  };

  return importSuccess(piece, warnings);
}
