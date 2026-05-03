import type { CompositionContext } from '../compositionContext';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

type EcmGravityBand = 'opening' | 'drift' | 'return';

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

function gravityBandForBar(bar: number): EcmGravityBand {
  const phase = ((bar - 1) % 8) + 1;
  if (phase <= 2) return 'opening';
  if (phase <= 6) return 'drift';
  return 'return';
}

function colorizeEcmChord(base: string, band: EcmGravityBand, u: number): string {
  const trimmed = base.trim();
  const root = rootTokenFromChord(trimmed);
  if (!root) return trimmed;
  if (trimmed.includes('/')) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes('dim') || lower.includes('alt')) return trimmed;
  if (lower.includes('sus')) {
    if (band === 'drift' && !lower.includes('13') && u < 0.5) return `${root}13sus4`;
    return trimmed;
  }

  const isMinor = /(m(?!aj)|min)/i.test(trimmed);
  const isMajor7 = /maj7/i.test(trimmed);
  const isDominant = /7|9|13/.test(trimmed);

  if (band === 'opening') {
    if (isMajor7) return u < 0.62 ? `${root}maj7#11` : `${root}maj9`;
    if (isMinor) return u < 0.55 ? `${root}m11` : `${root}m9`;
    if (isDominant) return `${root}13sus4`;
    return `${root}add9`;
  }

  if (band === 'drift') {
    if (isMajor7) return u < 0.72 ? `${root}maj7#11` : `${root}maj9`;
    if (isMinor) return u < 0.7 ? `${root}m11` : `${root}m9`;
    if (isDominant) return u < 0.8 ? `${root}7sus4` : `${root}13sus4`;
    return u < 0.6 ? `${root}add9` : `${root}maj9`;
  }

  if (isDominant) return `${root}7sus4`;
  if (isMajor7) return u < 0.45 ? `${root}maj9` : `${root}maj7#11`;
  if (isMinor) return `${root}m9`;
  return `${root}add9`;
}

function maybeApplyPedal(chord: string, pedalRoot: string | null, band: EcmGravityBand, u: number): string {
  if (!pedalRoot) return chord;
  if (chord.includes('/')) return chord;
  if (band !== 'drift') return chord;
  if (u > 0.42) return chord;
  const root = rootTokenFromChord(chord);
  if (!root || root === pedalRoot) return chord;
  if (/alt|dim/i.test(chord)) return chord;
  return `${chord}/${pedalRoot}`;
}

/**
 * Song Mode STYLE_ECM / STYLE_ECM_CHAMBER harmonic policy:
 * - opening bars stay open / non-cadential
 * - middle bars drift by colour + occasional pedal anchoring
 * - return bars avoid hard dominant gravity
 */
export function applyEcmStyleHarmonyMotionPolicy(context: CompositionContext): void {
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  const sp = context.generationMetadata?.styleProfile;
  if (sp !== 'STYLE_ECM' && sp !== 'STYLE_ECM_CHAMBER') return;
  if (context.generationMetadata?.harmonySource !== 'builtin') return;
  if (context.generationMetadata?.customHarmonyLocked === true) return;

  const plan = context.chordSymbolPlan;
  if (!plan?.segments?.length || plan.totalBars < 1) return;

  const bars = toBars(plan.segments, plan.totalBars);
  const pedalRoot = rootTokenFromChord(bars[0] ?? '');
  const next = bars.map((chord, i) => {
    const bar = i + 1;
    const band = gravityBandForBar(bar);
    const colored = colorizeEcmChord(chord, band, hash01(context.seed, bar, 501));
    return maybeApplyPedal(colored, pedalRoot, band, hash01(context.seed, bar, 777));
  });

  context.chordSymbolPlan = {
    ...context.chordSymbolPlan,
    segments: toSegments(next),
  };

  context.generationMetadata.songModeStyleSurfaceNotes = [
    ...(context.generationMetadata.songModeStyleSurfaceNotes ?? []),
    `${sp}: harmonic motion policy v1 applied (modal colour drift, restrained cadence gravity, occasional bass pedal anchoring).`,
  ];
}
