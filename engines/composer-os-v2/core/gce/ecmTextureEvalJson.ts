/**
 * Ingest JSON lines from `npm run eval:ecm-texture` / `ecmArrangementProbe` for GCE-style aggregation.
 * Each line must be one JSON object with `preset: "ecm_chamber"`.
 */

import type { EcmChamberTextureEvalRun } from '../ecm/ecmChamberTextureMetrics';

export function parseEcmTextureEvalJsonLines(raw: string): EcmChamberTextureEvalRun[] {
  const out: EcmChamberTextureEvalRun[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    let o: unknown;
    try {
      o = JSON.parse(t);
    } catch {
      continue;
    }
    if (typeof o !== 'object' || o === null) continue;
    const p = o as Partial<EcmChamberTextureEvalRun>;
    if (p.preset !== 'ecm_chamber') continue;
    if (typeof p.seed !== 'number' || typeof p.totalBars !== 'number') continue;
    if (p.metrics === undefined || typeof p.ecmTextureScore !== 'number') continue;
    out.push(o as EcmChamberTextureEvalRun);
  }
  return out;
}

export function meanEcmTextureScore(runs: EcmChamberTextureEvalRun[]): number {
  if (runs.length === 0) return 0;
  return runs.reduce((s, r) => s + r.ecmTextureScore, 0) / runs.length;
}
