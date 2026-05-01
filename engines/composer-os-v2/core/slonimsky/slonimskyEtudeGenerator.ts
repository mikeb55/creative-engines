/**
 * Slonimsky Etudes — deterministic score-model generation from catalogue patterns (engine layer).
 * Layout parallels {@link wybleBypassGenerator.ts}: timeline → measure grid → {@link ScoreModel} → MusicXML.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { createMeasure, createNote, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import {
  generateSlonimskyPattern,
  inferSlonimskyChordTypeCategory,
  type IntervalPatternId,
  type SlonimskyContext,
  type SlonimskyNote,
} from './slonimskyEngine';
import { getEnginePatternById } from './thesaurusRegistry';

const EPS = 1e-9;

export interface SlonimskyEtudeParams {
  patternId: IntervalPatternId;
  /** One chord symbol per bar; length = number of bars in one progression cycle. */
  chordSymbols: string[];
  /** Pitch class of tonic (0–11). */
  keyPc: number;
  bpm: number;
  /** Beats per measure (default 4). */
  beatsPerBar?: number;
  /** Chromatic outside allowance (default 1). */
  allowedOutsideLevel?: 0 | 1 | 2;
  seed?: number;
  /** Passed through to {@link SlonimskyContext.transpositionInterval}; also steps keys when {@link cycleKeys} is true (default 1). */
  transpositionInterval?: number;
  /** When true, repeat the progression in 12 key blocks: `keyPc + n * step` (mod 12), `n = 0..11`. */
  cycleKeys?: boolean;
}

export interface SlonimskyEtudeResult {
  measures: MeasureModel[];
  patternId: IntervalPatternId;
  keyPc: number;
  bpm: number;
}

function clampKeyPc(pc: number): number {
  const k = Math.round(pc);
  return ((k % 12) + 12) % 12;
}

function buildEtudeBarContext(
  params: SlonimskyEtudeParams,
  barChord: string,
  keyPc: number,
  beatsPerBar: number
): SlonimskyContext {
  const allowed = (params.allowedOutsideLevel ?? 1) as 0 | 1 | 2;
  return {
    keyPc: clampKeyPc(keyPc),
    chordType: inferSlonimskyChordTypeCategory(barChord),
    functionalStrength: 'medium',
    allowedOutsideLevel: allowed,
    phraseIntent: 'float',
    basePitch: 60 + clampKeyPc(keyPc),
    maxBeats: beatsPerBar,
    chordSymbol: barChord.trim() || undefined,
    effectiveLow: 48,
    effectiveHigh: 84,
    ...(params.transpositionInterval !== undefined ? { transpositionInterval: params.transpositionInterval } : {}),
  };
}

/**
 * Converts a beat-length Slonimsky timeline into {@link MeasureModel} rows for export.
 * Chord labels come from `chordSymbolsByBar[barIndex]` (one entry per global measure, 0-based index).
 */
export function slonimskyNotesToMeasures(
  notes: SlonimskyNote[],
  beatsPerBar: number,
  chordSymbolsByBar: string[]
): MeasureModel[] {
  const bpb = beatsPerBar;
  const maxBarFromNotes =
    notes.length === 0 ? -1 : Math.max(...notes.map((n) => Math.floor((n.beat + EPS) / bpb)));
  const barCount = Math.max(maxBarFromNotes + 1, chordSymbolsByBar.length);
  const buckets: SlonimskyNote[][] = Array.from({ length: barCount }, () => []);

  for (const n of notes) {
    const bi = Math.floor((n.beat + EPS) / bpb);
    if (bi >= 0 && bi < barCount) buckets[bi]!.push(n);
  }

  const measures: MeasureModel[] = [];
  for (let bi = 0; bi < barCount; bi++) {
    const chord =
      chordSymbolsByBar[bi] ??
      chordSymbolsByBar[chordSymbolsByBar.length - 1] ??
      '';
    const m = createMeasure(bi + 1, chord || undefined);
    const bucket = buckets[bi] ?? [];
    bucket.sort((a, b) => a.beat - b.beat);
    for (const note of bucket) {
      const localBeat = note.beat - bi * bpb;
      const lb = Math.max(0, Math.min(bpb - EPS, localBeat));
      const dur = Math.max(EPS, Math.min(bpb - lb, note.durationBeats));
      addEvent(m, createNote(note.midi, lb, dur, 1));
    }
    measures.push(m);
  }
  return measures;
}

/**
 * Builds a Slonimsky etude: one pattern id, chord progression, optional 12-key cycle.
 */
export function generateSlonimskyEtude(params: SlonimskyEtudeParams): SlonimskyEtudeResult {
  const beatsPerBar = params.beatsPerBar ?? 4;
  const seedBase = params.seed ?? 0;
  const chordSymbols = params.chordSymbols;
  if (!chordSymbols.length) {
    throw new Error('generateSlonimskyEtude: chordSymbols must be non-empty');
  }

  const pattern = getEnginePatternById(params.patternId);
  if (!pattern) {
    throw new Error(`generateSlonimskyEtude: unknown pattern id ${params.patternId}`);
  }

  const cycleBlocks = params.cycleKeys ? 12 : 1;
  const keyStep = params.transpositionInterval ?? 1;

  const allNotes: SlonimskyNote[] = [];
  let globalBarIndex = 0;

  for (let block = 0; block < cycleBlocks; block++) {
    const keyPcBlock = clampKeyPc(params.keyPc + block * keyStep);
    for (let b = 0; b < chordSymbols.length; b++) {
      const sym = chordSymbols[b]!;
      const ctx = buildEtudeBarContext(params, sym, keyPcBlock, beatsPerBar);
      const barNotes = generateSlonimskyPattern(pattern, ctx, seedBase + globalBarIndex);
      const offset = globalBarIndex * beatsPerBar;
      for (const n of barNotes) {
        allNotes.push({
          ...n,
          beat: n.beat + offset,
        });
      }
      globalBarIndex++;
    }
  }

  const chordSymbolsByBar: string[] = [];
  for (let block = 0; block < cycleBlocks; block++) {
    chordSymbolsByBar.push(...chordSymbols);
  }

  const measures = slonimskyNotesToMeasures(allNotes, beatsPerBar, chordSymbolsByBar);

  return {
    measures,
    patternId: params.patternId,
    keyPc: clampKeyPc(params.keyPc),
    bpm: params.bpm,
  };
}

function buildEtudeScoreModel(etude: SlonimskyEtudeResult, tempo: number): ScoreModel {
  const part: PartModel = {
    id: 'slonimsky_etude',
    name: 'Melody',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: etude.measures,
  };
  return createScore('Slonimsky Etude', [part], { tempo });
}

/**
 * Full pipeline: params → {@link MeasureModel} grid → {@link ScoreModel} → MusicXML string.
 */
export function generateSlonimskyEtudeXml(params: SlonimskyEtudeParams): { xml: string; errors: string[] } {
  const errors: string[] = [];
  try {
    const etude = generateSlonimskyEtude(params);
    const score = buildEtudeScoreModel(etude, params.bpm);
    const result = exportScoreModelToMusicXml(score, { bpm: params.bpm });
    if (!result.success) {
      errors.push(...result.errors);
    }
    return {
      xml: result.xml ?? '',
      errors,
    };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { xml: '', errors };
  }
}
