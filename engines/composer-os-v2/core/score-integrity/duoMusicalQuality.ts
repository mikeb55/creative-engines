/**
 * Guitar–Bass Duo musical quality gates (non-correctness): variety, interaction, rhythm shape.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';
import { guitarRestRatio } from './duoLockQuality';

export interface DuoMusicalQualityResult {
  valid: boolean;
  errors: string[];
}

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

export function validateDuoMusicalQuality(
  score: ScoreModel,
  _opts?: { styleStack?: StyleStack; presetId?: string }
): DuoMusicalQualityResult {
  if (_opts?.presetId === 'ecm_chamber') return { valid: true, errors: [] };
  const errors: string[] = [];
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return { valid: true, errors: [] };

  const bassNotes: { bar: number; pitch: number; start: number }[] = [];
  for (const m of bass.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        bassNotes.push({
          bar: m.index,
          pitch: (e as { pitch: number }).pitch,
          start: (e as { startBeat: number }).startBeat,
        });
      }
    }
  }

  let rootClassMatches = 0;
  for (const n of bassNotes) {
    const chord = chordForBar(n.bar);
    const t = chordTonesForGoldenChord(chord);
    const rootPc = t.root % 12;
    const pc = n.pitch % 12;
    if (pc === rootPc) rootClassMatches++;
  }
  if (bassNotes.length > 0 && rootClassMatches / bassNotes.length > 0.62) {
    errors.push('Duo: bass is excessively root-heavy (guide-tone variety required)');
  }

  const rhythmCells = new Set(bassNotes.map((n) => `${n.start.toFixed(2)}`));
  if (rhythmCells.size < 3) {
    errors.push('Duo: bass rhythm too static across the piece');
  }

  const restRatio = guitarRestRatio(guitar);
  if (restRatio < 0.1) {
    errors.push('Duo: guitar lacks breathing space (rest ratio below LOCK minimum ~10%)');
  }
  if (restRatio > 0.42) {
    errors.push('Duo: guitar too sparse (rest ratio above practical ceiling)');
  }

  const guitarStarts: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        guitarStarts.push((e as { startBeat: number }).startBeat);
      }
    }
  }

  if (guitarStarts.length > 1) {
    const mean = guitarStarts.reduce((a, b) => a + b, 0) / guitarStarts.length;
    const var_ = guitarStarts.reduce((s, x) => s + (x - mean) * (x - mean), 0) / guitarStarts.length;
    const std = Math.sqrt(var_);
    if (std < 0.28) {
      errors.push('Duo: guitar attack density too flat (onset variation required)');
    }
  }

  let bothDownbeat = 0;
  let barsBoth = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = guitar.measures.find((m) => m.index === bar);
    const bm = bass.measures.find((m) => m.index === bar);
    const gn = gm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    const bn = bm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (gn && bn) {
      barsBoth++;
      if (gn.startBeat === 0 && bn.startBeat === 0) bothDownbeat++;
    }
  }
  if (barsBoth > 0 && bothDownbeat / barsBoth > 0.72) {
    errors.push('Duo: excessive simultaneous downbeats (conversational contrast required)');
  }

  return { valid: errors.length === 0, errors };
}
