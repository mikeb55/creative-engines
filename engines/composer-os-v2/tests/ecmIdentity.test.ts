/**
 * ECM Chamber identity — extended form, Metheny vs Schneider separation across seeds.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import { ECM_DEFAULT_TOTAL_BARS } from '../core/ecm/buildEcmChamberContext';

function noteCountPart(p: PartModel): number {
  return p.measures.reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0);
}

function perBarNoteCounts(p: PartModel): number[] {
  return p.measures.map((m) => m.events.filter((e) => e.kind === 'note').length);
}

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
}

function meanNoteDuration(p: PartModel): number {
  let sum = 0;
  let n = 0;
  for (const m of p.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        sum += (e as { duration: number }).duration;
        n++;
      }
    }
  }
  return n > 0 ? sum / n : 0;
}

function gridness(p: PartModel): number {
  let grid = 0;
  let total = 0;
  for (const m of p.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      total++;
      const s = (e as { startBeat: number }).startBeat;
      const r = Math.round(s * 2) / 2;
      if (Math.abs(s - r) < 0.08) grid++;
    }
  }
  return total > 0 ? grid / total : 0;
}

export function runEcmIdentityTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const seeds = [11_101, 22_202, 33_303, 44_404, 55_505, 66_606, 77_707, 88_808, 99_909, 101_010];
  let allOk = true;
  for (const seed of seeds) {
    const met = runGoldenPath(seed, { presetId: 'ecm_chamber', ecmMode: 'ECM_METHENY_QUARTET' });
    const sch = runGoldenPath(seed, { presetId: 'ecm_chamber', ecmMode: 'ECM_SCHNEIDER_CHAMBER' });
    const gM = met.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const bM = met.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    const gS = sch.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const bS = sch.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    if (!gM || !bM || !gS || !bS) {
      allOk = false;
      break;
    }
    const bnM = noteCountPart(bM);
    const bnS = noteCountPart(bS);
    const vM = variance(perBarNoteCounts(gM));
    const vS = variance(perBarNoteCounts(gS));
    const dM = meanNoteDuration(gM);
    const dS = meanNoteDuration(gS);
    const rM = gridness(gM);
    const rS = gridness(gS);
    const diff =
      met.success &&
      sch.success &&
      bnM !== bnS &&
      Math.abs(vM - vS) > 1e-4 &&
      (Math.abs(dM - dS) > 0.02 || Math.abs(rM - rS) > 0.02);
    if (!diff) allOk = false;
  }
  out.push({
    ok: allOk,
    name: 'ECM identity: 10-seed Metheny vs Schneider differ (bass count, density var, phrase/rhythm)',
  });

  const form = runGoldenPath(42_000, { presetId: 'ecm_chamber', ecmMode: 'ECM_METHENY_QUARTET' });
  const nMeas = form.score.parts[0]?.measures.length ?? 0;
  out.push({
    ok: form.success && nMeas >= 24 && nMeas === ECM_DEFAULT_TOTAL_BARS,
    name: 'ECM form: output length matches extended ECM default (24 bars)',
  });

  const collapse = runGoldenPath(77_777, { presetId: 'ecm_chamber', ecmMode: 'ECM_METHENY_QUARTET' });
  const collapseS = runGoldenPath(77_777, { presetId: 'ecm_chamber', ecmMode: 'ECM_SCHNEIDER_CHAMBER' });
  const g1 = collapse.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const g2 = collapseS.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const nonCollapse = !!(
    collapse.success &&
    collapseS.success &&
    g1 &&
    g2 &&
    Math.abs(gridness(g1) - gridness(g2)) > 0.01
  );
  out.push({
    ok: nonCollapse,
    name: 'ECM non-collapse: rhythmic profiles differ at same seed across modes',
  });

  const ext32 = runGoldenPath(88_888, {
    presetId: 'ecm_chamber',
    ecmMode: 'ECM_METHENY_QUARTET',
    ecmTotalBars: 32,
  });
  const n32 = ext32.score.parts[0]?.measures.length ?? 0;
  const g32 = ext32.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const v32 = g32 ? variance(perBarNoteCounts(g32)) : 0;
  out.push({
    ok: ext32.success && n32 === 32 && v32 > 0.05,
    name: 'ECM optional 32-bar: generation succeeds, bar count, density variation',
  });

  return out;
}
