/**
 * Bass harmonic integrity: not root-only on every attack.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { chordTonesFromSymbol } from '../harmony/chordSymbolAnalysis';

export function validateBassHarmonicIntegrity(score: ScoreModel, chords: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return { valid: true, errors: [] };

  let rootish = 0;
  let total = 0;
  for (const m of bass.measures) {
    const ch = chords[m.index - 1] ?? chords[0] ?? 'Am7';
    const tones = chordTonesFromSymbol(ch);
    const rootPc = tones.root % 12;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      total++;
      const p = (e as { pitch: number }).pitch % 12;
      if (p === rootPc) rootish++;
    }
  }
  if (total > 0 && rootish / total > 0.92) {
    errors.push('Riff bass: root-only concentration too high (use guide tones / targets)');
  }
  return { valid: errors.length === 0, errors };
}
