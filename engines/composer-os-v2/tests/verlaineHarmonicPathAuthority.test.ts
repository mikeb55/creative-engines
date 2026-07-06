/**
 * Verlaine harmony authority + rhythm-overlay skip regression.
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import { buildHarmonicSceneStubs } from '../core/composer/harmonicScene';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { getChordForBar } from '../core/harmony/harmonyResolution';
import { classifyAuthoritativeLayerForBar } from '../core/harmony/harmonySpineProvider';

const STALE_ANCHOR = { anchorChord: 'Dmin9', anchorStartBar: 1 };

function authorityContext(
  metadata: Partial<GenerationMetadata>,
  opts?: { voiceId?: string; rhythmState?: typeof STALE_ANCHOR },
  totalBars = 8
): CompositionContext {
  const voiceId = opts?.voiceId;
  const bundle = voiceId ? getVoiceRuleBundle(voiceId) : undefined;
  const form = { sections: [], totalBars };
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 50021,
    form,
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars },
    rehearsalMarkPlan: { marks: [] },
    voiceBundle: bundle,
    harmonicScenes: bundle ? buildHarmonicSceneStubs(form) : undefined,
    generationMetadata: {
      generatedAt: '2026-07-06T00:00:00.000Z',
      harmonySource: 'builtin',
      voiceBundleHarmonicRhythmState: opts?.rhythmState,
      ...metadata,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function effBar(prefix: string, barIndex: number): string {
  return prefix + '-' + String(barIndex);
}

export function runVerlaineHarmonicPathAuthorityTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const verlaineBars = Array.from({ length: 8 }, (_, i) => effBar('VerlaineEff', i + 1));
  const barryBarsBar2G13 = Array.from({ length: 8 }, (_, i) => (i === 1 ? 'G13' : effBar('BarryEff', i + 1)));
  const barryBarsWithDistinctBar2 = Array.from({ length: 8 }, (_, i) => (i === 1 ? 'Dmin9' : effBar('BarryEff', i + 1)));
  const verlaineBarsWithDistinctBar2 = Array.from({ length: 8 }, (_, i) => (i === 1 ? 'C6/9/A' : effBar('VerlaineEff', i + 1)));
  const verlaineBarsEsusBar2 = Array.from({ length: 8 }, (_, i) => (i === 1 ? 'Esus4/D' : effBar('VerlaineEff', i + 1)));

  const primaryVerlaine = authorityContext({
    songwriterStyleId: 'verlaine',
    verlaineEffectiveHarmonyBars: verlaineBars,
  });
  out.push({
    ok:
      getChordForBar(1, primaryVerlaine) === verlaineBars[0] &&
      classifyAuthoritativeLayerForBar(1, primaryVerlaine).sliceId === 'verlaine',
    name: 'primary Verlaine only: getChordForBar + spine unchanged (Verlaine eff bar 1)',
  });

  const primaryVerlaineRhythmPolluted = authorityContext(
    { songwriterStyleId: 'verlaine', verlaineEffectiveHarmonyBars: verlaineBarsEsusBar2 },
    { voiceId: 'verlaine', rhythmState: STALE_ANCHOR }
  );
  out.push({
    ok: getChordForBar(2, primaryVerlaineRhythmPolluted) === 'Esus4/D',
    name: 'primary Verlaine + stale rhythm anchor: bar 2 keeps Verlaine eff (rhythm skip)',
  });

  const primaryBarry = authorityContext({
    songwriterStyleId: 'barry_harris',
    barryHarrisEffectiveHarmonyBars: barryBarsWithDistinctBar2,
  });
  out.push({
    ok:
      getChordForBar(2, primaryBarry) === 'Dmin9' &&
      classifyAuthoritativeLayerForBar(2, primaryBarry).sliceId === 'barry_harris',
    name: 'primary Barry Harris only: getChordForBar + spine unchanged (Barry eff bar 2)',
  });

  const primaryBarryRhythm = authorityContext(
    { songwriterStyleId: 'barry_harris', barryHarrisEffectiveHarmonyBars: barryBarsBar2G13 },
    { voiceId: 'barry_harris', rhythmState: STALE_ANCHOR }
  );
  out.push({
    ok: getChordForBar(2, primaryBarryRhythm) === 'G13',
    name: 'primary Barry Harris + rhythm overlay: bar 2 advances to Barry eff (not Verlaine skip)',
  });

  const barryPlusVerlaineVoice = authorityContext(
    {
      songwriterStyleId: 'barry_harris',
      harmonicVoice: 'verlaine',
      barryHarrisEffectiveHarmonyBars: barryBarsWithDistinctBar2,
      verlaineEffectiveHarmonyBars: verlaineBarsEsusBar2,
      mosaicMergedHarmonyBars: [...verlaineBarsEsusBar2],
    },
    { voiceId: 'verlaine', rhythmState: STALE_ANCHOR }
  );
  out.push({
    ok:
      getChordForBar(2, barryPlusVerlaineVoice) === 'Esus4/D' &&
      getChordForBar(2, barryPlusVerlaineVoice) !== 'Dmin9' &&
      classifyAuthoritativeLayerForBar(2, barryPlusVerlaineVoice).sliceId === 'verlaine',
    name: 'Barry Harris primary + Verlaine harmonicVoice: bar 2 Esus4/D (rhythm skip, not stale Dmin9)',
  });

  const barryPlusFrippVoice = authorityContext({
    songwriterStyleId: 'barry_harris',
    harmonicVoice: 'fripp',
    barryHarrisEffectiveHarmonyBars: barryBarsWithDistinctBar2,
    verlaineEffectiveHarmonyBars: verlaineBarsEsusBar2,
  });
  out.push({
    ok:
      getChordForBar(2, barryPlusFrippVoice) === 'Dmin9' &&
      classifyAuthoritativeLayerForBar(2, barryPlusFrippVoice).sliceId === 'barry_harris',
    name: 'Barry Harris primary + non-Verlaine harmonicVoice: bar 2 stays Barry eff (negative control)',
  });

  return out;
}

if (require.main === module) {
  const rows = runVerlaineHarmonicPathAuthorityTests();
  let failed = 0;
  for (const r of rows) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
    if (!r.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
