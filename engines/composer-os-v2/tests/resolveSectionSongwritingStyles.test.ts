/**
 * Duo Song Mode Step 2 — pure resolver unit tests (no generation).
 */

import type { FormMap, GenerationMetadata } from '../core/compositionContext';
import {
  resolveSectionSongwritingStyles,
  type DuoSongModeSectionPlanEntry,
} from '../core/duo-song-mode/resolveSectionSongwritingStyles';

function formMap(totalBars: number): FormMap {
  return { sections: [], totalBars };
}

function metadata(
  overrides: Partial<GenerationMetadata> & {
    duoSongModeSectionPlan?: DuoSongModeSectionPlanEntry[];
  } = {}
): GenerationMetadata {
  return {
    generatedAt: '2026-06-06T00:00:00.000Z',
    songwriterStyleId: 'barry_harris',
    ...overrides,
  } as GenerationMetadata;
}

function assertEveryBarMapped(
  barComposerMap: Record<number, string>,
  totalBars: number
): boolean {
  for (let bar = 1; bar <= totalBars; bar++) {
    if (barComposerMap[bar] === undefined) return false;
  }
  return Object.keys(barComposerMap).length === totalBars;
}

function throwsGapError(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      message.includes('unmapped') ||
      message.includes('does not cover every bar')
    );
  }
}

export function runResolveSectionSongwritingStylesTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const singleUndefined = resolveSectionSongwritingStyles(
    formMap(16),
    metadata({ songwriterStyleId: 'verlaine', duoSongModeSectionPlan: undefined })
  );
  out.push({
    ok:
      singleUndefined.mode === 'single' &&
      singleUndefined.primarySongwriterStyleId === 'verlaine' &&
      singleUndefined.sectionComposerMap.length === 0 &&
      assertEveryBarMapped(singleUndefined.barComposerMap, 16) &&
      [1, 8, 16].every((bar) => singleUndefined.barComposerMap[bar] === 'verlaine'),
    name: 'single mode: undefined duoSongModeSectionPlan → mode single, all bars map to songwriterStyleId',
  });

  const duoBasic = resolveSectionSongwritingStyles(
    formMap(16),
    metadata({
      songwriterStyleId: 'barry_harris',
      duoSongModeSectionPlan: [
        { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
        { sectionLabel: 'chorus', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
      ],
    })
  );
  out.push({
    ok:
      duoBasic.mode === 'duo' &&
      duoBasic.primarySongwriterStyleId === 'verlaine' &&
      [1, 4, 8].every((bar) => duoBasic.barComposerMap[bar] === 'verlaine') &&
      [9, 12, 16].every((bar) => duoBasic.barComposerMap[bar] === 'marr') &&
      assertEveryBarMapped(duoBasic.barComposerMap, 16),
    name: 'duo mode basic: verse verlaine 1–8, chorus marr 9–16',
  });

  const duoBoundary = resolveSectionSongwritingStyles(
    formMap(16),
    metadata({
      duoSongModeSectionPlan: [
        { sectionLabel: 'A', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
        { sectionLabel: 'B', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
      ],
    })
  );
  const boundaryKeys = Object.keys(duoBoundary.barComposerMap)
    .map(Number)
    .sort((a, b) => a - b);
  out.push({
    ok:
      boundaryKeys.length === 16 &&
      boundaryKeys[0] === 1 &&
      boundaryKeys[15] === 16 &&
      duoBoundary.barComposerMap[8] === 'verlaine' &&
      duoBoundary.barComposerMap[9] === 'marr' &&
      duoBoundary.barComposerMap[8] !== duoBoundary.barComposerMap[9],
    name: 'duo mode boundary: adjacent sections — no overlap, no gap, map length === totalBars',
  });

  out.push({
    ok: throwsGapError(() =>
      resolveSectionSongwritingStyles(
        formMap(16),
        metadata({
          duoSongModeSectionPlan: [
            { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
            { sectionLabel: 'chorus', startBar: 10, endBar: 16, songwriterStyleId: 'marr' },
          ],
        })
      )
    ),
    name: 'duo mode gap detection: missing bar 9 throws descriptive error',
  });

  const trio = resolveSectionSongwritingStyles(
    formMap(24),
    metadata({
      duoSongModeSectionPlan: [
        { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
        { sectionLabel: 'chorus', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
        { sectionLabel: 'outro', startBar: 17, endBar: 24, songwriterStyleId: 'fripp' },
      ],
    })
  );
  out.push({
    ok:
      trio.mode === 'duo' &&
      [1, 8].every((bar) => trio.barComposerMap[bar] === 'verlaine') &&
      [9, 16].every((bar) => trio.barComposerMap[bar] === 'marr') &&
      [17, 24].every((bar) => trio.barComposerMap[bar] === 'fripp') &&
      assertEveryBarMapped(trio.barComposerMap, 24),
    name: 'duo mode three sections: verse verlaine, chorus marr, outro fripp',
  });

  return out;
}

if (require.main === module) {
  const rows = runResolveSectionSongwritingStylesTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
