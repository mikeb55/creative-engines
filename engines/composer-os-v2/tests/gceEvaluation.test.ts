/**
 * Golden Composer Evaluation (GCE) — Guitar–Bass Duo quality floor and variation gates.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { evaluateGoldenComposerGce } from '../core/quality/goldenComposerEvaluation';
import { chordTonesForGoldenChord } from '../core/goldenPath/guitarBassDuoHarmony';
import { validateDuoMusicalQuality } from '../core/score-integrity/duoMusicalQuality';

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

function duoSignature(score: import('../core/score-model/scoreModelTypes').ScoreModel): string {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return '';
  const parts: string[] = [];
  for (let b = 1; b <= 8; b++) {
    const gn = guitar.measures.find((m) => m.index === b)?.events.find((e) => e.kind === 'note') as
      | { pitch: number }
      | undefined;
    const bn = bass.measures.find((m) => m.index === b)?.events.find((e) => e.kind === 'note') as
      | { pitch: number }
      | undefined;
    parts.push(`${gn?.pitch ?? 'x'}:${bn?.pitch ?? 'x'}`);
  }
  return parts.join('|');
}

function testGceAtLeastNineOnLockSeeds(): boolean {
  for (let s = 101; s <= 107; s++) {
    const r = runGoldenPath(s);
    if (!r.success || !r.score) return false;
    const gce = evaluateGoldenComposerGce(r.score);
    if (gce.total < 9) return false;
    const duo = validateDuoMusicalQuality(r.score);
    if (!duo.valid) return false;
  }
  return true;
}

function testBassRootRatioBelowGate(): boolean {
  const r = runGoldenPath(88);
  const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return false;
  let hits = 0;
  let n = 0;
  for (const m of bass.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      n++;
      const pc = (e as { pitch: number }).pitch % 12;
      const root = chordTonesForGoldenChord(chordForBar(m.index)).root % 12;
      if (pc === root) hits++;
    }
  }
  return n > 0 && hits / n <= 0.62;
}

function testGuitarRegisterSpreadAcrossSections(): boolean {
  const r = runGoldenPath(77);
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return false;
  const a: number[] = [];
  const bsec: number[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const p = (e as { pitch: number }).pitch;
      if (m.index <= 4) a.push(p);
      else bsec.push(p);
    }
  }
  if (!a.length || !bsec.length) return false;
  const meanA = a.reduce((x, y) => x + y, 0) / a.length;
  const meanB = bsec.reduce((x, y) => x + y, 0) / bsec.length;
  return Math.abs(meanA - meanB) >= 1;
}

function testTryAnotherDistinctSignatures(): boolean {
  const sigs = new Set<string>();
  for (const seed of [101, 202, 303, 404, 505]) {
    const r = runGoldenPath(seed);
    if (!r.score) return false;
    sigs.add(duoSignature(r.score));
  }
  return sigs.size >= 4;
}

export function runGceEvaluationTests(): { name: string; ok: boolean }[] {
  return [
    ['GCE ≥ 9 and duo gates for LOCK seeds 101–107', testGceAtLeastNineOnLockSeeds],
    ['Bass root share within duo gate', testBassRootRatioBelowGate],
    ['Guitar register differs A vs B', testGuitarRegisterSpreadAcrossSections],
    ['Try Another: distinct duo signatures across seeds', testTryAnotherDistinctSignatures],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
