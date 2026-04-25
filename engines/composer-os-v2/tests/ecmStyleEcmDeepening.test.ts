/**
 * STYLE_ECM deepening regression checks (Phase A + B):
 * - audible texture-space distinction vs non-ECM style
 * - harmonic motion policy (colour + pedal + restrained cadence gravity)
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

function toBars(segments: Array<{ chord: string; startBar: number; bars: number }>, totalBars: number): string[] {
  const out: string[] = Array(totalBars).fill('Cmaj7');
  for (const seg of segments) {
    for (let i = 0; i < seg.bars; i++) {
      const bi = seg.startBar + i - 1;
      if (bi < 0 || bi >= totalBars) continue;
      out[bi] = seg.chord;
    }
  }
  return out;
}

function colorChordCount(bars: string[]): number {
  return bars.filter((c) => /sus|add9|#11|maj9|m11/i.test(c)).length;
}

function restrainedDominantCount(bars: string[]): number {
  return bars.filter((c) => /7/.test(c) && !/sus|alt/i.test(c)).length;
}

function pedalSlashCount(bars: string[]): number {
  if (bars.length === 0) return 0;
  const root = /^([A-G](?:#|b)?)/.exec(bars[0] ?? '')?.[1];
  if (!root) return 0;
  const re = new RegExp(`/${root.replace('#', '\\#').replace('b', 'b')}$`, 'i');
  return bars.filter((c) => re.test(c.trim())).length;
}

function phraseEdgeDensity(score: ReturnType<typeof runGoldenPathOnce>['score']): number {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return Infinity;
  const edgeBars = [8, 16, 24, 32];
  let notes = 0;
  for (const bar of edgeBars) {
    const gm = guitar.measures.find((m) => m.index === bar);
    const bm = bass.measures.find((m) => m.index === bar);
    if (gm) notes += gm.events.filter((e) => e.kind === 'note').length;
    if (bm) notes += bm.events.filter((e) => e.kind === 'note').length;
  }
  return notes;
}

export function runEcmStyleEcmDeepeningTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  const seed = 246813;
  const base = {
    presetId: 'guitar_bass_duo' as const,
    songModeHookFirstIdentity: true,
    totalBars: 32,
    longFormEnabled: true,
    styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
    primarySongwriterStyle: 'beatles',
  };

  const ecm = runGoldenPathOnce(seed, { ...base, styleProfile: 'STYLE_ECM' });
  const lite = runGoldenPathOnce(seed, { ...base, styleProfile: 'STYLE_BEBOP_LITE' });

  const ecmBars = toBars(ecm.context.chordSymbolPlan.segments, ecm.context.chordSymbolPlan.totalBars);
  const liteBars = toBars(lite.context.chordSymbolPlan.segments, lite.context.chordSymbolPlan.totalBars);

  out.push({
    name: 'STYLE_ECM deepening: run succeeds in Song Mode route',
    ok: ecm.success && lite.success,
  });

  out.push({
    name: 'STYLE_ECM harmonic policy: more colour sonorities than STYLE_BEBOP_LITE baseline',
    ok: colorChordCount(ecmBars) > colorChordCount(liteBars),
  });

  out.push({
    name: 'STYLE_ECM harmonic policy: occasional bass pedal slash anchoring appears',
    ok: pedalSlashCount(ecmBars) >= 1,
  });

  out.push({
    name: 'STYLE_ECM harmonic policy: restrained clean-dominant gravity (no increase vs STYLE_BEBOP_LITE baseline)',
    ok: restrainedDominantCount(ecmBars) <= restrainedDominantCount(liteBars),
  });

  out.push({
    name: 'STYLE_ECM Phase A texture: phrase-edge density is thinner than STYLE_BEBOP_LITE baseline',
    ok: phraseEdgeDensity(ecm.score) < phraseEdgeDensity(lite.score),
  });

  return out;
}

