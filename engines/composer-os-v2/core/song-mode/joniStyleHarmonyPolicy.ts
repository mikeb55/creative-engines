/**
 * Song Mode STYLE_JONI_MITCHELL — builtin chord-symbol plan nudge (folk-modal surface).
 * Lighter cadential gravity + suspended-colour preference before duo score build.
 */

import type { CompositionContext } from '../compositionContext';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

type GravityBand = 'opening' | 'drift' | 'return';

function hash01(seed: number, bar: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + bar * 78.233 + salt * 43.758) * 43758.5453;
  return x - Math.floor(x);
}

function rootTokenFromChord(chord: string): string | null {
  const m = /^([A-G](?:#|b)?)/.exec(chord.trim());
  return m ? m[1] : null;
}

function toBars(segments: Array<{ chord: string; startBar: number; bars: number }>, totalBars: number): string[] {
  const bars: string[] = Array(totalBars).fill('Cmaj7');
  for (const seg of segments) {
    for (let i = 0; i < seg.bars; i++) {
      const bi = seg.startBar + i - 1;
      if (bi < 0 || bi >= totalBars) continue;
      bars[bi] = seg.chord;
    }
  }
  return bars;
}

function toSegments(bars: string[]): Array<{ chord: string; startBar: number; bars: number }> {
  const out: Array<{ chord: string; startBar: number; bars: number }> = [];
  if (bars.length === 0) return out;
  let cur = bars[0]!;
  let start = 1;
  let run = 1;
  for (let i = 1; i < bars.length; i++) {
    const c = bars[i]!;
    if (c === cur) {
      run++;
      continue;
    }
    out.push({ chord: cur, startBar: start, bars: run });
    cur = c;
    start = i + 1;
    run = 1;
  }
  out.push({ chord: cur, startBar: start, bars: run });
  return out;
}

function gravityBandForBar(bar: number): GravityBand {
  const phase = ((bar - 1) % 8) + 1;
  if (phase <= 2) return 'opening';
  if (phase <= 6) return 'drift';
  return 'return';
}

function colorizeJoniFolkModal(base: string, band: GravityBand, u: number): string {
  const trimmed = base.trim();
  const root = rootTokenFromChord(trimmed);
  if (!root) return trimmed;
  if (trimmed.includes('/')) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes('dim') || lower.includes('alt')) return trimmed;

  const isMinor = /(m(?!aj)|min)/i.test(trimmed);
  const isDominant = /(^|[\s/])(7|9|11|13|dom)/i.test(trimmed) || /\b7\b/.test(lower);

  if (band === 'return' && isDominant) {
    return u < 0.55 ? `${root}7sus4` : `${root}9sus4`;
  }
  if (isDominant) {
    if (u < 0.4) return `${root}7sus4`;
    if (u < 0.72) return `${root}13sus4`;
    return `${root}9`;
  }
  if (isMinor) {
    return u < 0.6 ? `${root}m9` : `${root}m11`;
  }
  if (/maj7/i.test(trimmed)) {
    return u < 0.5 ? `${root}maj9` : `${root}maj7sus4`;
  }
  return u < 0.65 ? `${root}add9` : `${root}sus2`;
}

/**
 * Song Mode STYLE_JONI_MITCHELL harmonic policy (builtin plans):
 * drift/opening favour sus/add colour; return windows soften dominant cadences toward sus arrivals.
 */
export function applyJoniStyleFolkModalHarmonyPolicy(context: CompositionContext): void {
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.generationMetadata?.styleProfile !== 'STYLE_JONI_MITCHELL') return;
  if (context.generationMetadata?.harmonySource !== 'builtin') return;
  if (context.generationMetadata?.customHarmonyLocked === true) return;

  const plan = context.chordSymbolPlan;
  if (!plan?.segments?.length || plan.totalBars < 1) return;

  const bars = toBars(plan.segments, plan.totalBars);
  const next = bars.map((chord, i) => {
    const bar = i + 1;
    const band = gravityBandForBar(bar);
    return colorizeJoniFolkModal(chord, band, hash01(context.seed, bar, 602));
  });

  context.chordSymbolPlan = {
    ...context.chordSymbolPlan,
    segments: toSegments(next),
  };

  context.generationMetadata.songModeStyleSurfaceNotes = [
    ...(context.generationMetadata.songModeStyleSurfaceNotes ?? []),
    'STYLE_JONI_MITCHELL: folk-modal harmony nudge v1 (lighter cadential gravity, suspended preference on dominants).',
  ];
}
