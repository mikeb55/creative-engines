/**
 * Mosaic Mode Step 4 — per-bar harmony dispatch in getChordForBar.
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import { getChordForBar } from '../core/harmony/harmonyResolution';

function mosaicDispatchContext(
  totalBars: number,
  metadata: Partial<GenerationMetadata> = {}
): CompositionContext {
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 95001,
    form: { sections: [], totalBars },
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars },
    rehearsalMarkPlan: { marks: [] },
    lockedHarmonyBarsRaw: undefined,
    generationMetadata: {
      generatedAt: '2026-06-06T00:00:00.000Z',
      songwriterStyleId: 'verlaine',
      harmonySource: 'builtin',
      ...metadata,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function customSpineContext(
  totalBars: number,
  locked: string[],
  metadata: Partial<GenerationMetadata> = {}
): CompositionContext {
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 95001,
    form: { sections: [], totalBars },
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars },
    rehearsalMarkPlan: { marks: [] },
    lockedHarmonyBarsRaw: locked,
    generationMetadata: {
      generatedAt: '2026-06-06T00:00:00.000Z',
      songwriterStyleId: 'verlaine',
      harmonySource: 'custom',
      parsedCustomProgressionBars: locked,
      ...metadata,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function minimalContext(
  totalBars: number,
  metadata: Partial<GenerationMetadata> = {}
): CompositionContext {
  const locked = Array.from({ length: totalBars }, (_, i) => `C${i + 1}`);
  return customSpineContext(totalBars, locked, metadata);
}

function mergedDuoBars16(): string[] {
  return Array.from({ length: 16 }, (_, i) => {
    if (i < 8) return `Esus4/verse-${i + 1}`;
    return `Aadd9/chorus-${i + 1}`;
  });
}

export function runHarmonyResolutionDuoDispatchTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const merged = mergedDuoBars16();

  const duoContext = mosaicDispatchContext(16, {
    songwriterStyleId: 'verlaine',
    mosaicMergedHarmonyBars: merged,
    mosaicSectionOwnership: {
      1: 'verse',
      8: 'verse',
      9: 'chorus',
      16: 'chorus',
    },
  });

  out.push({
    ok: getChordForBar(1, duoContext) === merged[0],
    name: 'duo dispatch active: bar 1 returns merged array bar 1',
  });

  out.push({
    ok: getChordForBar(9, duoContext) === merged[8],
    name: 'duo dispatch active: bar 9 returns merged array bar 9',
  });

  out.push({
    ok:
      getChordForBar(8, duoContext) === 'Esus4/verse-8' &&
      getChordForBar(9, duoContext) === 'Aadd9/chorus-9' &&
      getChordForBar(8, duoContext) !== getChordForBar(9, duoContext),
    name: 'duo dispatch active: section boundary returns correct composer symbols',
  });

  const customLocked = Array.from({ length: 16 }, (_, i) => `Spine-${i + 1}`);
  const customWithMosaic = customSpineContext(16, customLocked, {
    mosaicMergedHarmonyBars: merged,
  });

  out.push({
    ok: getChordForBar(9, customWithMosaic) === 'Spine-9',
    name: 'custom spine wins over mosaicMergedHarmonyBars when full-form custom is active',
  });

  const verlaineOnly = Array.from({ length: 16 }, (_, i) => `VerlaineEff-${i + 1}`);
  const verlaineContext = minimalContext(16, {
    songwriterStyleId: 'verlaine',
    verlaineEffectiveHarmonyBars: verlaineOnly,
  });

  out.push({
    ok: getChordForBar(1, verlaineContext) === verlaineOnly[0],
    name: 'single-composer fallback: Verlaine branch fires when mosaicMergedHarmonyBars undefined',
  });

  const marrOnly = Array.from({ length: 16 }, (_, i) => `MarrEff-${i + 1}`);
  const marrContext = minimalContext(16, {
    songwriterStyleId: 'marr',
    marrEffectiveHarmonyBars: marrOnly,
  });

  out.push({
    ok: getChordForBar(12, marrContext) === marrOnly[11],
    name: 'single-composer fallback: Marr branch fires when mosaicMergedHarmonyBars undefined',
  });

  const wrongLengthContext = mosaicDispatchContext(16, {
    songwriterStyleId: 'verlaine',
    mosaicMergedHarmonyBars: merged.slice(0, 8),
    verlaineEffectiveHarmonyBars: verlaineOnly,
  });

  out.push({
    ok: getChordForBar(1, wrongLengthContext) === verlaineOnly[0],
    name: 'array length guard: mosaicMergedHarmonyBars length !== tb → falls through to Verlaine branch',
  });

  out.push({
    ok: merged.every((_, i) => {
      const sym = getChordForBar(i + 1, duoContext);
      return typeof sym === 'string' && sym.length > 0;
    }),
    name: 'no undefined returns: every bar in valid merged array returns defined chord symbol',
  });

  return out;
}

if (require.main === module) {
  const rows = runHarmonyResolutionDuoDispatchTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
