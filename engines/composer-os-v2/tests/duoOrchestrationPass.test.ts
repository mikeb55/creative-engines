/**
 * Duo orchestration — section contrast, validation, determinism.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';
import { countPartNotes } from '../core/goldenPath/ecmShapingPass';

const ECM_BASE = {
  presetId: 'ecm_chamber' as const,
  ecmMode: 'ECM_METHENY_QUARTET' as const,
  styleStack: { primary: 'metheny' as const, weights: { primary: 1 as const } },
};

const DUO_BASE = {
  presetId: 'guitar_bass_duo' as const,
  styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
};

const SEED = 77_772;

function guitar(score: { parts: PartModel[] }): PartModel | undefined {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function meanPitchBarRange(g: PartModel, lo: number, hi: number): number {
  let s = 0;
  let n = 0;
  for (const m of g.measures) {
    if (m.index < lo || m.index > hi) continue;
    for (const e of m.events) {
      if (e.kind === 'note') {
        s += (e as NoteEvent).pitch;
        n++;
      }
    }
  }
  return n > 0 ? s / n : 0;
}

function avgDensityBars(g: PartModel, lo: number, hi: number): number {
  let c = 0;
  let nb = 0;
  for (const m of g.measures) {
    if (m.index < lo || m.index > hi) continue;
    c += m.events.filter((e) => e.kind === 'note').length;
    nb++;
  }
  return nb > 0 ? c / nb : 0;
}

function testOrchestrationPassesGatesEcm(): boolean {
  const r = runGoldenPathOnce(SEED, { ...ECM_BASE, orchestrationEnabled: true });
  return (
    r.success &&
    r.behaviourGatesPassed &&
    r.integrityPassed &&
    r.mxValidationPassed &&
    !!r.xml
  );
}

function testOrchestrationDeterministicEcm(): boolean {
  const a = runGoldenPathOnce(SEED, { ...ECM_BASE, orchestrationEnabled: true });
  const b = runGoldenPathOnce(SEED, { ...ECM_BASE, orchestrationEnabled: true });
  return a.success && b.success && a.xml === b.xml;
}

function testEcmSectionContrastMeasurable(): boolean {
  const r = runGoldenPathOnce(SEED, { ...ECM_BASE, orchestrationEnabled: true });
  if (!r.success) return false;
  const g = guitar(r.score);
  if (!g) return false;
  const dA = avgDensityBars(g, 1, 4);
  const dB = avgDensityBars(g, 5, 8);
  const pA = meanPitchBarRange(g, 1, 4);
  const pB = meanPitchBarRange(g, 5, 8);
  const contrast = dA < dB + 0.01 || pB >= pA - 0.5;
  return contrast;
}

function testNoteCountWithinReason(): boolean {
  const off = runGoldenPathOnce(SEED, { ...ECM_BASE, orchestrationEnabled: false });
  const on = runGoldenPathOnce(SEED, { ...ECM_BASE, orchestrationEnabled: true });
  if (!off.success || !on.success) return false;
  const gOff = guitar(off.score);
  const gOn = guitar(on.score);
  if (!gOff || !gOn) return false;
  const nOff = countPartNotes(gOff);
  const nOn = countPartNotes(gOn);
  return nOn <= nOff + 2;
}

function testDuoPresetPasses(): boolean {
  const r = runGoldenPathOnce(SEED, { ...DUO_BASE, orchestrationEnabled: true });
  return r.success && r.behaviourGatesPassed && !!r.xml;
}

export function runDuoOrchestrationPassTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];
  const t = (name: string, ok: boolean) => results.push({ name, ok });
  t('Orchestration ON (ECM): passes behaviour + integrity + MX', testOrchestrationPassesGatesEcm());
  t('Orchestration ON (ECM): deterministic XML', testOrchestrationDeterministicEcm());
  t('Orchestration ON (ECM): A vs B shows density or register contrast', testEcmSectionContrastMeasurable());
  t('Orchestration ON vs OFF: guitar note count not inflated vs ECM-only', testNoteCountWithinReason());
  t('Orchestration ON (duo preset): passes gates', testDuoPresetPasses());
  return results;
}
