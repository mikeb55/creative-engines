/**
 * Mosaic Mode Step 7 — evaluateMosaicSections unit tests.
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import {
  evaluateMosaicSections,
  type DuoSectionEvalResult,
} from '../core/mosaic-mode/evaluateMosaicSections';
import type { SectionLockEntry } from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

function minimalContext(
  registry: SectionLockEntry[] | undefined,
  extra: Partial<GenerationMetadata> = {}
): CompositionContext {
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 96001,
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
      mosaicLockRegistry: registry,
      ...extra,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function scoreWithBars(chords: string[], startBar = 1): ScoreModel {
  const measures = chords.map((chord, i) => ({
    index: startBar + i,
    events: [{ kind: 'note' as const, pitch: 64, startBeat: 0, duration: 2 }],
    chord,
  }));
  return {
    title: 'eval-test',
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures,
      },
    ],
  };
}

function registryEntry(
  overrides: Partial<SectionLockEntry> & Pick<SectionLockEntry, 'sectionLabel' | 'composerId' | 'startBar' | 'endBar'>
): SectionLockEntry {
  const span = overrides.endBar - overrides.startBar + 1;
  const expectedHarmonyBars =
    overrides.expectedHarmonyBars ??
    Array.from({ length: span }, (_, i) => {
      if (overrides.composerId === 'marr') return `Aadd9/${i % 2 === 0 ? 'E' : 'G'}`;
      return `Esus2/${i % 2 === 0 ? 'G' : 'A'}`;
    });
  return {
    expectedHarmonyBars,
    ...overrides,
  };
}

export function runEvaluateMosaicSectionsTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];

  const emptyRegistry = evaluateMosaicSections(scoreWithBars(['Em7']), minimalContext(undefined));
  out.push({
    ok: emptyRegistry.length === 0,
    name: 'evaluateMosaicSections: no registry → returns []',
    detail: emptyRegistry.length !== 0 ? `got ${emptyRegistry.length}` : undefined,
  });

  const verlaineBars = ['Esus2/G', 'Asus2/E', 'Bsus4/C#', 'C#m7', 'Asus2/E', 'Esus2/G', 'F#m7', 'Bsus4/F#'];
  const verlaineEntry = registryEntry({
    sectionLabel: 'verse',
    composerId: 'verlaine',
    startBar: 1,
    endBar: 8,
    expectedHarmonyBars: verlaineBars,
  });
  const verlaineResults = evaluateMosaicSections(
    scoreWithBars(verlaineBars),
    minimalContext([verlaineEntry])
  );
  out.push({
    ok:
      verlaineResults.length === 1 &&
      verlaineResults[0]?.composerId === 'verlaine' &&
      typeof verlaineResults[0]?.scores.overall === 'number' &&
      verlaineResults[0]?.scores.modalFieldPersistence != null,
    name: 'evaluateMosaicSections: Verlaine section → Verlaine profile dimensions scored',
    detail:
      verlaineResults[0] == null
        ? 'no result'
        : `overall=${verlaineResults[0].scores.overall}`,
  });

  const marrBars = ['A7', 'E7', 'B7', 'C#7', 'A7', 'E7', 'F#7', 'B7'];
  const marrEntry = registryEntry({
    sectionLabel: 'chorus',
    composerId: 'marr',
    startBar: 9,
    endBar: 16,
    expectedHarmonyBars: marrBars,
  });
  const marrResults = evaluateMosaicSections(
    scoreWithBars(marrBars, 9),
    minimalContext([marrEntry])
  );
  out.push({
    ok:
      marrResults.length === 1 &&
      marrResults[0]?.composerId === 'marr' &&
      typeof marrResults[0]?.scores.partialVoicingRate === 'number',
    name: 'evaluateMosaicSections: Marr section → Marr profile dimensions scored',
    detail: marrResults[0] == null ? 'no result' : `composer=${marrResults[0].composerId}`,
  });

  let unknownThrew = false;
  let unknownResults: DuoSectionEvalResult[] = [];
  try {
    unknownResults = evaluateMosaicSections(
      scoreWithBars(['C']),
      minimalContext([
        registryEntry({
          sectionLabel: 'mystery',
          composerId: 'unknown_composer_xyz',
          startBar: 1,
          endBar: 1,
          expectedHarmonyBars: ['C'],
        }),
      ])
    );
  } catch {
    unknownThrew = true;
  }
  out.push({
    ok: !unknownThrew && unknownResults.length === 0,
    name: 'evaluateMosaicSections: unknown composer → skips, does not throw',
    detail: unknownThrew ? 'threw' : `results=${unknownResults.length}`,
  });

  const dualVerlaine = evaluateMosaicSections(
    scoreWithBars([...verlaineBars, ...verlaineBars.map((c) => c.replace('Esus2', 'Dsus2'))]),
    minimalContext([
      registryEntry({ sectionLabel: 'A', composerId: 'verlaine', startBar: 1, endBar: 8, expectedHarmonyBars: verlaineBars }),
      registryEntry({
        sectionLabel: 'B',
        composerId: 'verlaine',
        startBar: 9,
        endBar: 16,
        expectedHarmonyBars: verlaineBars.map((c) => c.replace('Esus2', 'Dsus2')),
      }),
    ])
  );
  out.push({
    ok:
      dualVerlaine.length === 2 &&
      dualVerlaine[0]?.sectionLabel === 'A' &&
      dualVerlaine[1]?.sectionLabel === 'B' &&
      dualVerlaine[0]?.composerId === 'verlaine' &&
      dualVerlaine[1]?.composerId === 'verlaine' &&
      dualVerlaine[0] !== dualVerlaine[1],
    name: 'evaluateMosaicSections: two sections same composer → two independent results',
  });

  const ctx = minimalContext([verlaineEntry]);
  const score = scoreWithBars(verlaineBars);
  const ctxBefore = JSON.stringify(ctx);
  const scoreBefore = JSON.stringify(score);
  evaluateMosaicSections(score, ctx);
  out.push({
    ok: JSON.stringify(ctx) === ctxBefore && JSON.stringify(score) === scoreBefore,
    name: 'evaluateMosaicSections: pure function — score and context unchanged',
  });

  out.push({
    ok:
      verlaineResults[0]?.scores.modalFieldPersistence != null &&
      marrResults[0]?.scores.partialVoicingRate != null,
    name: 'evaluateMosaicSections: fixture profiles verlaine + marr registered',
  });

  return out;
}

if (require.main === module) {
  const rows = runEvaluateMosaicSectionsTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
