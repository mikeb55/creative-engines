/**
 * Mosaic Mode Step 5 — composerForBar + isMosaicModeActive unit tests.
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import { composerForBar, isMosaicModeActive } from '../core/mosaic-mode/mosaicBarHelpers';

function contextWithMeta(metadata: Partial<GenerationMetadata>): CompositionContext {
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 95001,
    form: { sections: [], totalBars: 16 },
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars: 16 },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: {
      generatedAt: '2026-06-06T00:00:00.000Z',
      songwriterStyleId: 'verlaine',
      ...metadata,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

export function runMosaicBarHelpersTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const duoPlan = [
    { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
    { sectionLabel: 'chorus', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
  ];

  const duoContext = contextWithMeta({
    songwriterStyleId: 'verlaine',
    mosaicSectionPlan: duoPlan,
    mosaicMergedHarmonyBars: Array.from({ length: 16 }, () => 'Am7'),
    mosaicSectionOwnership: {
      1: 'verse',
      8: 'verse',
      9: 'chorus',
      16: 'chorus',
    },
  });

  out.push({
    ok: composerForBar(1, duoContext) === 'verlaine',
    name: 'composerForBar: duo mode, Verlaine section bar → verlaine',
  });

  out.push({
    ok: composerForBar(9, duoContext) === 'marr',
    name: 'composerForBar: duo mode, Marr section bar → marr',
  });

  const singleContext = contextWithMeta({ songwriterStyleId: 'marr' });
  out.push({
    ok: composerForBar(5, singleContext) === 'marr',
    name: 'composerForBar: duo inactive → global songwriterStyleId',
  });

  out.push({
    ok: isMosaicModeActive(duoContext),
    name: 'isMosaicModeActive: plan with 2+ entries → true',
  });

  out.push({
    ok: !isMosaicModeActive(contextWithMeta({ mosaicSectionPlan: undefined })),
    name: 'isMosaicModeActive: undefined plan → false',
  });

  out.push({
    ok: !isMosaicModeActive(
      contextWithMeta({
        mosaicSectionPlan: [
          { sectionLabel: 'verse', startBar: 1, endBar: 16, songwriterStyleId: 'verlaine' },
        ],
      })
    ),
    name: 'isMosaicModeActive: single entry plan → false',
  });

  return out;
}

if (require.main === module) {
  const rows = runMosaicBarHelpersTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
