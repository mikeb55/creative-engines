/**
 * Duo Song Mode Step 3 — tonic map + precompute orchestrator unit tests (no full generation).
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import {
  buildDuoTonicMap,
  precomputeDuoEffectiveHarmonyBars,
  type DuoSongModeSectionPlan,
} from '../core/duo-song-mode/precomputeDuoEffectiveHarmonyBars';
import type { SectionComposerRouting } from '../core/duo-song-mode/resolveSectionSongwritingStyles';
import { precomputeVerlaineEffectiveHarmonyBars } from '../core/song-mode/verlainFieldSlice';
import { precomputeMarrEffectiveHarmonyBars } from '../core/song-mode/marrMelodicSlice';

const SEED = 95001;

function lockedProgression16(): string[] {
  const bars = Array.from({ length: 16 }, () => 'Am7');
  bars[0] = 'E';
  bars[8] = 'D';
  return bars;
}

function minimalContext(
  locked: string[],
  overrides: Partial<GenerationMetadata> = {}
): CompositionContext {
  const totalBars = locked.length;
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: SEED,
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
      parsedCustomProgressionBars: [...locked],
      ...overrides,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function duoPlan(): DuoSongModeSectionPlan {
  return [
    { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
    { sectionLabel: 'chorus', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
  ];
}

function duoRouting(): SectionComposerRouting {
  const barComposerMap: Record<number, string> = {};
  for (let bar = 1; bar <= 8; bar++) barComposerMap[bar] = 'verlaine';
  for (let bar = 9; bar <= 16; bar++) barComposerMap[bar] = 'marr';
  return {
    mode: 'duo',
    primarySongwriterStyleId: 'verlaine',
    barComposerMap,
    sectionComposerMap: duoPlan(),
  };
}

function cloneSectionContext(
  context: CompositionContext,
  section: DuoSongModeSectionPlan[number]
): CompositionContext {
  const span = section.endBar - section.startBar + 1;
  const sliced = context.lockedHarmonyBarsRaw!.slice(section.startBar - 1, section.endBar);
  return {
    ...context,
    form: {
      ...context.form,
      totalBars: span,
      sections: [{ label: section.sectionLabel, startBar: 1, length: span }],
    },
    lockedHarmonyBarsRaw: sliced,
    generationMetadata: {
      ...context.generationMetadata,
      songwriterStyleId: section.songwriterStyleId,
      parsedCustomProgressionBars: sliced,
    },
  };
}

function throwsGap(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes('unmapped') || message.includes('gap');
  }
}

export function runPrecomputeDuoEffectiveHarmonyBarsTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const locked = lockedProgression16();
  const context = minimalContext(locked);
  const plan = duoPlan();
  const routing = duoRouting();

  const tonicMap = buildDuoTonicMap(plan, context);
  out.push({
    ok: tonicMap.verse === 4 && tonicMap.chorus === 2,
    name: 'buildDuoTonicMap: two sections → E (4) and D (2) tonic pitch classes',
  });

  out.push({
    ok: tonicMap.chorus !== tonicMap.verse && tonicMap.chorus === 2,
    name: 'buildDuoTonicMap: chorus tonic from bar 9 (D), not bar 1 (E)',
  });

  const merged = precomputeDuoEffectiveHarmonyBars(context, routing, tonicMap);

  out.push({
    ok: merged.bars.length === 16 && context.generationMetadata.duoMergedHarmonyBars?.length === 16,
    name: 'precomputeDuoEffectiveHarmonyBars: merged array length 16 + metadata write-back',
  });

  out.push({
    ok: merged.bars.every((sym) => typeof sym === 'string' && sym.length > 0),
    name: 'precomputeDuoEffectiveHarmonyBars: no gaps — all 16 bars defined',
  });

  const verseCtx = cloneSectionContext(context, plan[0]!);
  precomputeVerlaineEffectiveHarmonyBars(verseCtx);
  const expectedVerse = verseCtx.generationMetadata.verlaineEffectiveHarmonyBars ?? [];

  const chorusCtx = cloneSectionContext(context, plan[1]!);
  precomputeMarrEffectiveHarmonyBars(chorusCtx);
  const expectedChorus = chorusCtx.generationMetadata.marrEffectiveHarmonyBars ?? [];

  out.push({
    ok:
      expectedVerse.length === 8 &&
      merged.bars.slice(0, 8).every((sym, i) => sym === expectedVerse[i]),
    name: 'precomputeDuoEffectiveHarmonyBars: bars 1–8 match Verlaine section precompute',
  });

  out.push({
    ok:
      expectedChorus.length === 8 &&
      merged.bars.slice(8, 16).every((sym, i) => sym === expectedChorus[i]),
    name: 'precomputeDuoEffectiveHarmonyBars: bars 9–16 match Marr section precompute',
  });

  out.push({
    ok:
      [1, 4, 8].every((bar) => merged.sectionOwnership[bar] === 'verse') &&
      [9, 12, 16].every((bar) => merged.sectionOwnership[bar] === 'chorus'),
    name: 'precomputeDuoEffectiveHarmonyBars: sectionOwnership maps each bar to section label',
  });

  const gapRouting: SectionComposerRouting = {
    mode: 'duo',
    primarySongwriterStyleId: 'verlaine',
    barComposerMap: { 1: 'verlaine', 2: 'verlaine' },
    sectionComposerMap: [
      { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
      { sectionLabel: 'chorus', startBar: 10, endBar: 16, songwriterStyleId: 'marr' },
    ],
  };

  out.push({
    ok: throwsGap(() =>
      precomputeDuoEffectiveHarmonyBars(minimalContext(locked), gapRouting, tonicMap)
    ),
    name: 'gap detection: plan with missing bar 9 throws before returning',
  });

  return out;
}

if (require.main === module) {
  const rows = runPrecomputeDuoEffectiveHarmonyBarsTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
