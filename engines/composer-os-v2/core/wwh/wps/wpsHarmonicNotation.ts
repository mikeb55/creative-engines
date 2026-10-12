/**
 * WPS V1.5 harmonic notation safeguards.
 * Reads a finished duo score. Does not write MusicXML and does not open Sibelius.
 * A passing XML check is not visual proof.
 */

import type { WwhImportedMeasure, WwhImportedNote, WwhImportedPart } from '../wwhDuoImport';

const PITCH = String.raw`[A-G](?:b|#|♭|♯)?`;
const OVER_FIELD = new RegExp(`^(?:[Ff]inal\\s+)?${PITCH}(?:/${PITCH})+\\s+over\\s+${PITCH}$`);
const PITCH_LIST = new RegExp(`^${PITCH}(?:[–—-]${PITCH})+(?:\\s+returns)?$`);
const SLASH_START = new RegExp(`^${PITCH}(?:/${PITCH})+`);
const HELD_PITCH = new RegExp(`\\bheld\\b.*\\b${PITCH}\\b`);
const THEN_PITCH = new RegExp(`\\bthen\\b.*\\b${PITCH}\\b`);
const ANSWER = new RegExp(`^${PITCH}[–—-]${PITCH}\\s+answer$`);
const ONLY = new RegExp(`^${PITCH}[–—-]${PITCH}\\s+only$`);

/** More than this many directions on one bar is a layout flag. Accepted studies sit at 4. */
export const HARMONIC_DIRECTION_LIMIT = 4;

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface HarmonicSonorityCounts {
  /** Chord symbol in force while the guitar rests. */
  underlyingOverRest: number;
  /** Chord symbol in force while the guitar plays one note. */
  underlyingOverSingleNote: number;
  /** Guitar grip under the symbol. Bass adds no new pitch class. */
  guitarVoicing: number;
  /** Guitar grip plus a bass pitch class the grip does not contain. */
  ensemble: number;
}

export interface HarmonicNotationReport {
  ok: boolean;
  bars: number;
  guitarBars: number;
  bassBars: number;
  chordSymbols: number;
  bassChordSymbols: number;
  fieldLabels: number;
  voicingAnnotations: number;
  uncoveredBars: number[];
  soloSpansWithoutMark: string[];
  droppedLeadsheetHarmony: string[];
  integrityBars: string[];
  overcrowdedBars: number[];
  sonority: HarmonicSonorityCounts;
  /** XML validation never sets this to a completed proof. */
  sibeliusVisualVerification: 'NOT PERFORMED';
  failures: string[];
}

export interface HarmonicNotationInput {
  guitar: WwhImportedPart;
  bass: WwhImportedPart;
  /** Leadsheet guitar. Cycle 1 must still contain every original `<harmony>` label. */
  leadsheetGuitar?: WwhImportedPart;
}

export function isFieldLabel(word: string, barHasChordSymbol: boolean): boolean {
  const text = word.trim();
  if (/\bfield\b/i.test(text)) return true;
  if (/^turned cell$/i.test(text)) return true;
  if (OVER_FIELD.test(text) && !barHasChordSymbol) return true;
  return false;
}

/** Colour, grip, or empty-bar note. Not a chord symbol and not a new change. */
export function isVoicingAnnotation(word: string, barHasChordSymbol: boolean): boolean {
  const text = word.trim();
  if (isFieldLabel(text, barHasChordSymbol)) return false;
  if (OVER_FIELD.test(text) && barHasChordSymbol) return true;
  if (/^(?:common tone|tritone, once|leave this bar empty)$/i.test(text)) return true;
  if (/\bis foreign\b/i.test(text)) return true;
  if (PITCH_LIST.test(text)) return true;
  if (SLASH_START.test(text)) return true;
  if (HELD_PITCH.test(text)) return true;
  if (THEN_PITCH.test(text)) return true;
  if (/^triad, then /.test(text)) return true;
  if (ANSWER.test(text)) return true;
  if (ONLY.test(text)) return true;
  return false;
}

function genuineChordLabel(label: string): boolean {
  return new RegExp(`^${PITCH}`).test(label.trim());
}

function pitchClass(note: WwhImportedNote): number | null {
  if (note.rest || !note.step) return null;
  const step = PC[note.step];
  if (step == null) return null;
  return (step + (note.alter ?? 0) + 120) % 12;
}

function soundingPcs(measure: WwhImportedMeasure): number[] {
  const found: number[] = [];
  for (const note of measure.notes) {
    const pc = pitchClass(note);
    if (pc != null && !found.includes(pc)) found.push(pc);
  }
  return found;
}

function soundingCount(measure: WwhImportedMeasure): number {
  return measure.notes.filter((note) => !note.rest && note.step).length;
}

function classifySonority(guitar: WwhImportedMeasure, bass: WwhImportedMeasure | undefined): keyof HarmonicSonorityCounts {
  const guitarNotes = soundingCount(guitar);
  if (guitarNotes === 0) return 'underlyingOverRest';
  if (guitarNotes === 1) return 'underlyingOverSingleNote';
  const guitarPcs = new Set(soundingPcs(guitar));
  const bassPcs = bass ? soundingPcs(bass) : [];
  if (bassPcs.some((pc) => !guitarPcs.has(pc))) return 'ensemble';
  return 'guitarVoicing';
}

function labelCounts(labels: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return counts;
}

function soloSpans(measures: readonly WwhImportedMeasure[]): Array<{ start: number; end: number }> {
  const rehearsalAt: number[] = [];
  measures.forEach((measure, index) => {
    if (measure.rehearsal.length) rehearsalAt.push(index);
  });
  const spans: Array<{ start: number; end: number }> = [];
  measures.forEach((measure, index) => {
    if (!measure.words.some((word) => /\bsolo\b/i.test(word))) return;
    let end = measures.length - 1;
    for (const mark of rehearsalAt) {
      if (mark > index) {
        end = mark - 1;
        break;
      }
    }
    spans.push({ start: index, end });
  });
  return spans;
}

export function assessHarmonicNotation(input: HarmonicNotationInput): HarmonicNotationReport {
  const guitar = input.guitar.measures;
  const bass = input.bass.measures;
  const failures: string[] = [];
  const uncoveredBars: number[] = [];
  const soloSpansWithoutMark: string[] = [];
  const droppedLeadsheetHarmony: string[] = [];
  const integrityBars: string[] = [];
  const overcrowdedBars: number[] = [];
  const sonority: HarmonicSonorityCounts = {
    underlyingOverRest: 0,
    underlyingOverSingleNote: 0,
    guitarVoicing: 0,
    ensemble: 0,
  };

  let chordSymbols = 0;
  let fieldLabels = 0;
  let voicingAnnotations = 0;
  let bassChordSymbols = 0;
  let active = false;

  if (!guitar.length || !bass.length) failures.push('guitar and upright bass must both contain bars');
  if (guitar.length !== bass.length) {
    failures.push(`bar count guitar ${guitar.length}, bass ${bass.length}`);
  }

  guitar.forEach((measure, index) => {
    const bar = index + 1;
    const bassMeasure = bass[index];
    const hasChord = measure.harmony.length > 0;
    const fields = measure.words.filter((word) => isFieldLabel(word, hasChord));
    const voicings = measure.words.filter((word) => isVoicingAnnotation(word, hasChord));
    chordSymbols += measure.harmony.length;
    fieldLabels += fields.length;
    voicingAnnotations += voicings.length;
    if (bassMeasure) bassChordSymbols += bassMeasure.harmony.length;

    for (const label of measure.harmony) {
      if (!genuineChordLabel(label)) failures.push(`bar ${bar} chord symbol is not a rooted MusicXML harmony (${label || 'empty'})`);
      sonority[classifySonority(measure, bassMeasure)] += 1;
    }
    if (fields.length || hasChord) active = true;
    else if (!active) uncoveredBars.push(bar);

    const load = measure.rehearsal.length + measure.words.length + measure.harmony.length;
    if (load > HARMONIC_DIRECTION_LIMIT || measure.rehearsal.length > 1) overcrowdedBars.push(bar);

    if (!measure.gridAgrees) integrityBars.push(`guitar ${bar}`);
    if (bassMeasure && !bassMeasure.gridAgrees) integrityBars.push(`bass ${bar}`);
  });

  for (const span of soloSpans(guitar)) {
    let local = false;
    for (let index = span.start; index <= span.end; index += 1) {
      const measure = guitar[index]!;
      const hasChord = measure.harmony.length > 0;
      if (hasChord || measure.words.some((word) => isFieldLabel(word, hasChord))) local = true;
    }
    if (!local) soloSpansWithoutMark.push(`${span.start + 1}–${span.end + 1}`);
  }

  const lead = input.leadsheetGuitar?.measures ?? [];
  if (lead.length && guitar.length < lead.length) {
    failures.push(`study is shorter than the leadsheet (${guitar.length} < ${lead.length})`);
  }
  lead.forEach((measure, index) => {
    const study = guitar[index];
    if (!study) return;
    const found = labelCounts(study.harmony);
    for (const [label, count] of labelCounts(measure.harmony)) {
      if ((found.get(label) ?? 0) < count) droppedLeadsheetHarmony.push(`${index + 1}:${label}`);
    }
  });

  if (uncoveredBars.length) failures.push(`harmonic coverage missing at bars ${uncoveredBars.join(', ')}`);
  if (soloSpansWithoutMark.length) {
    failures.push(`solo passage has no chord symbol or field label: ${soloSpansWithoutMark.join(', ')}`);
  }
  if (bassChordSymbols) failures.push(`upright bass has ${bassChordSymbols} chord symbol(s)`);
  if (droppedLeadsheetHarmony.length) {
    failures.push(`LOCK dropped leadsheet harmony ${droppedLeadsheetHarmony.join(', ')}`);
  }
  if (integrityBars.length) failures.push(`musical event integrity failed at ${integrityBars.join(', ')}`);
  if (overcrowdedBars.length) {
    failures.push(`potentially overcrowded harmonic directions at bars ${overcrowdedBars.join(', ')}`);
  }

  return {
    ok: failures.length === 0,
    bars: guitar.length,
    guitarBars: guitar.length,
    bassBars: bass.length,
    chordSymbols,
    bassChordSymbols,
    fieldLabels,
    voicingAnnotations,
    uncoveredBars,
    soloSpansWithoutMark,
    droppedLeadsheetHarmony,
    integrityBars,
    overcrowdedBars,
    sonority,
    sibeliusVisualVerification: 'NOT PERFORMED',
    failures,
  };
}

export function formatHarmonicNotationReport(report: HarmonicNotationReport): string[] {
  const sonority = report.sonority;
  return [
    `Harmonic notation: ${report.bars} bars, ${report.chordSymbols} chord symbols, ${report.fieldLabels} field labels, ${report.voicingAnnotations} voicing annotations`,
    `Bass chord symbols: ${report.bassChordSymbols}`,
    `Harmonic coverage gaps: ${report.uncoveredBars.join(', ') || 'none'}`,
    `Solo passages without a local mark: ${report.soloSpansWithoutMark.join(', ') || 'none'}`,
    `Leadsheet harmony LOCK: ${report.droppedLeadsheetHarmony.length ? `dropped ${report.droppedLeadsheetHarmony.join(', ')}` : 'preserved'}`,
    `Guitar and bass event integrity: ${report.integrityBars.length ? report.integrityBars.join(', ') : 'pass'}`,
    `Overcrowded directions: ${report.overcrowdedBars.join(', ') || 'none'}`,
    `Sonority under chord symbols: underlying-over-rest ${sonority.underlyingOverRest}, underlying-over-single-note ${sonority.underlyingOverSingleNote}, guitar-voicing ${sonority.guitarVoicing}, guitar-plus-bass ${sonority.ensemble}`,
    'Sibelius visual verification: NOT PERFORMED. XML validation is not visual proof.',
  ];
}
