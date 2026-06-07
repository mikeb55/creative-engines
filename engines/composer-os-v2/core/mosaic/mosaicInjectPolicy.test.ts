/**
 * Mosaic post-finalize inject policy — hook-first section-scoped bypass lift.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { generateMosaicSourceMotif } from '../mosaic-mode/mosaicMotifEngine';
import * as mosaicTilePipeline from '../mosaic-mode/mosaicTilePipeline';
import {
  applyMosaicInjectHarmonyFallback,
  applyMosaicInjectHarmonyFallbackForTarget,
  BB_MOSAIC_INJECT_EXCLUDED_PART_IDS,
  BB_MOSAIC_INJECT_LEAD_PART_ID,
  injectEligibleSectionsOnly,
  injectMosaicMotifNotesPostFinalize,
  injectMosaicMotifNotesPostFinalizeBigBand,
  isBigBandMosaicInjectGated,
  isMosaicInjectEligibleSection,
  mosaicInjectHarmonyBarViolated,
} from '../mosaic-mode/mosaicTilePipeline';
import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';

const GUITAR_MAP: InstrumentRegisterMap = {
  instrumentIdentity: 'clean_electric_guitar',
  sections: [
    {
      sectionLabel: 'verse',
      preferredZone: [55, 79],
      dangerZone: [40, 90],
      ceilingTendency: 79,
      floorTendency: 55,
      contour: 'stable',
    },
    {
      sectionLabel: 'chorus',
      preferredZone: [55, 79],
      dangerZone: [40, 90],
      ceilingTendency: 79,
      floorTendency: 55,
      contour: 'stable',
    },
  ],
};

function basePlan(): MosaicModeSectionPlanEntry[] {
  return [
    {
      sectionLabel: 'verse',
      startBar: 1,
      endBar: 4,
      songwriterStyleId: 'fripp',
      phraseRole: 'development',
      spineProtected: false,
      mosaicOwned: true,
      injectEligible: false,
    },
    {
      sectionLabel: 'chorus',
      startBar: 5,
      endBar: 8,
      songwriterStyleId: 'fripp',
      phraseRole: 'climax',
      spineProtected: true,
      mosaicOwned: true,
      injectEligible: false,
    },
  ];
}

function mosaicContext(overrides: Partial<GenerationMetadata> = {}): CompositionContext {
  const source = generateMosaicSourceMotif(88001, 64);
  const locked = Array.from({ length: 8 }, () => 'Am');
  const plan = basePlan();
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 88001,
    form: {
      sections: [
        { label: 'verse', startBar: 1, length: 4 },
        { label: 'chorus', startBar: 5, length: 4 },
      ],
      totalBars: 8,
    },
    lockedHarmonyBarsRaw: locked,
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: {
      segments: [{ startBar: 1, bars: 8, chord: 'Am' }],
      totalBars: 8,
    },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: {
      generatedAt: '2026-06-07T00:00:00.000Z',
      songwriterStyleId: 'fripp',
      mosaicSectionPlan: plan,
      mosaicMergedHarmonyBars: locked,
      mosaicSectionMotifVariants: { verse: source, chorus: source },
      songModeHookFirstIdentity: true,
      ...overrides,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function guitarScore(bars: MeasureModel[]): ScoreModel {
  return {
    title: 'policy-test',
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures: bars,
      },
    ],
  };
}

function emptyBar(index: number, chord = 'Am'): MeasureModel {
  return {
    index,
    chord,
    measureBeatSpanQuarters: 4,
    events: [createNote(60, 0, 1, 1)],
  };
}

function hasMosaicMotifInBar(score: ScoreModel, bar: number): boolean {
  const m = score.parts[0]?.measures.find((x) => x.index === bar);
  if (!m) return false;
  return m.events.some(
    (e) => e.kind === 'note' && 'motifRef' in e && String(e.motifRef).startsWith('mosaic_motif_')
  );
}

const BB_PART_IDS = [
  BB_MOSAIC_INJECT_LEAD_PART_ID,
  'bb_tenor_sax',
  'bb_trumpets',
  'bb_trombones',
  'bb_piano',
  'bb_rhythm_section',
  'bb_drums',
] as const;

function bbBasePlan(): MosaicModeSectionPlanEntry[] {
  return [
    {
      sectionLabel: 'background_figures',
      startBar: 1,
      endBar: 4,
      songwriterStyleId: 'fripp',
      phraseRole: 'development',
      presetRole: 'big_band',
      spineProtected: false,
      mosaicOwned: true,
      injectEligible: false,
    },
    {
      sectionLabel: 'shout_chorus',
      startBar: 5,
      endBar: 8,
      songwriterStyleId: 'fripp',
      phraseRole: 'climax',
      presetRole: 'big_band',
      spineProtected: true,
      mosaicOwned: true,
      injectEligible: false,
    },
  ];
}

function bbMosaicContext(overrides: Partial<GenerationMetadata> = {}): CompositionContext {
  const source = generateMosaicSourceMotif(88002, 64);
  const locked = Array.from({ length: 8 }, () => 'Am');
  const plan = bbBasePlan();
  return {
    systemVersion: '2',
    presetId: 'big_band',
    seed: 88002,
    form: {
      sections: [
        { label: 'background_figures', startBar: 1, length: 4 },
        { label: 'shout_chorus', startBar: 5, length: 4 },
      ],
      totalBars: 8,
    },
    lockedHarmonyBarsRaw: locked,
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: {
      segments: [{ startBar: 1, bars: 8, chord: 'Am' }],
      totalBars: 8,
    },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: {
      generatedAt: '2026-06-07T00:00:00.000Z',
      songwriterStyleId: 'fripp',
      mosaicSectionPlan: plan,
      mosaicMergedHarmonyBars: locked,
      mosaicSectionMotifVariants: { background_figures: source, shout_chorus: source },
      ...overrides,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function bigBandScore(bars: MeasureModel[]): ScoreModel {
  return {
    title: 'bb-policy-test',
    parts: BB_PART_IDS.map((id) => ({
      id,
      name: id,
      instrumentIdentity: 'generic',
      midiProgram: 1,
      clef: 'treble' as const,
      measures: bars.map((b) => ({
        ...b,
        events: structuredClone(b.events),
      })),
    })),
  };
}

function hasMosaicMotifInPartBar(score: ScoreModel, partId: string, bar: number): boolean {
  const m = score.parts.find((p) => p.id === partId)?.measures.find((x) => x.index === bar);
  if (!m) return false;
  return m.events.some(
    (e) => e.kind === 'note' && 'motifRef' in e && String(e.motifRef).startsWith('mosaic_motif_')
  );
}

function snapshotEventCount(score: ScoreModel, partId: string, bar: number): number {
  return (
    score.parts.find((p) => p.id === partId)?.measures.find((x) => x.index === bar)?.events
      .length ?? 0
  );
}

describe('mosaic inject policy', () => {
  test('A) hook-first + flag off → bypass (score unchanged, injectEligibleSectionsOnly not used)', () => {
    const eligibleSpy = jest.spyOn(mosaicTilePipeline, 'injectEligibleSectionsOnly');
    const score = guitarScore([1, 2, 3, 4, 5, 6, 7, 8].map((b) => emptyBar(b)));
    const context = mosaicContext();
    const out = injectMosaicMotifNotesPostFinalize(score, context, GUITAR_MAP);
    expect(out).toBe(score);
    expect(eligibleSpy).not.toHaveBeenCalled();
    expect(hasMosaicMotifInBar(out, 1)).toBe(false);
    eligibleSpy.mockRestore();
  });

  test('B) hook-first + flag on + spineProtected → inject skipped for protected section', () => {
    const plan = basePlan().map((s) =>
      s.sectionLabel === 'verse'
        ? { ...s, injectEligible: true }
        : { ...s, injectEligible: true, spineProtected: true }
    );
    const score = guitarScore([1, 2, 3, 4, 5, 6, 7, 8].map((b) => emptyBar(b)));
    const context = mosaicContext({
      allowMosaicPostFinalizeInject: true,
      mosaicSectionPlan: plan,
    });
    const out = injectMosaicMotifNotesPostFinalize(score, context, GUITAR_MAP);
    expect(hasMosaicMotifInBar(out, 1)).toBe(true);
    expect(hasMosaicMotifInBar(out, 5)).toBe(false);
  });

  test('C) hook-first + flag on + eligible verse → inject fires, harmony preserved', () => {
    const plan = basePlan().map((s) =>
      s.sectionLabel === 'verse'
        ? { ...s, injectEligible: true, spineProtected: false }
        : s
    );
    const score = guitarScore([1, 2, 3, 4, 5, 6, 7, 8].map((b) => emptyBar(b, 'Am')));
    const context = mosaicContext({
      allowMosaicPostFinalizeInject: true,
      mosaicSectionPlan: plan,
    });
    const out = injectMosaicMotifNotesPostFinalize(score, context, GUITAR_MAP);
    expect(hasMosaicMotifInBar(out, 1)).toBe(true);
    const m1 = out.parts[0]!.measures.find((x) => x.index === 1)!;
    expect(m1.chord).toBe('Am');
    expect(isMosaicInjectEligibleSection(plan[0]!)).toBe(true);
    expect(isMosaicInjectEligibleSection(plan[1]!)).toBe(false);
  });

  test('D) harmony diff root change → bar reverted and logged', () => {
    const plan: MosaicModeSectionPlanEntry[] = [
      {
        sectionLabel: 'verse',
        startBar: 1,
        endBar: 4,
        songwriterStyleId: 'fripp',
        mosaicOwned: true,
        injectEligible: true,
        spineProtected: false,
      },
    ];
    const score = guitarScore([1, 2, 3, 4].map((b) => emptyBar(b, 'Am')));
    const context = mosaicContext({
      allowMosaicPostFinalizeInject: true,
      mosaicSectionPlan: plan,
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const injected = injectEligibleSectionsOnly(score, context, GUITAR_MAP);
    const m = injected.parts[0]!.measures.find((x) => x.index === 4)!;
    m.chord = 'E7';

    expect(mosaicInjectHarmonyBarViolated('Am', 'E7', 4, 4)).toBe(true);

    const snapshot = new Map([
      [
        4,
        {
          events: structuredClone(m.events),
          chord: 'Am',
        },
      ],
    ]);
    applyMosaicInjectHarmonyFallback(injected, snapshot, plan);
    expect(m.chord).toBe('Am');
    expect(
      logSpy.mock.calls.some(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].includes('[mosaicInject] harmony revert section=verse bar=4')
      )
    ).toBe(true);
    logSpy.mockRestore();
  });
});

describe('big-band mosaic inject policy', () => {
  test('A) presetRole big_band + flag off → no inject', () => {
    const score = bigBandScore([1, 2, 3, 4, 5, 6, 7, 8].map((b) => emptyBar(b)));
    const context = bbMosaicContext();
    expect(isBigBandMosaicInjectGated(context, false)).toBe(false);
    const out = injectMosaicMotifNotesPostFinalizeBigBand(score, context, false);
    expect(out).toBe(score);
    expect(hasMosaicMotifInPartBar(out, BB_MOSAIC_INJECT_LEAD_PART_ID, 1)).toBe(false);
  });

  test('B) presetRole big_band + flag on + spineProtected → inject skipped for protected section', () => {
    const plan = bbBasePlan().map((s) =>
      s.sectionLabel === 'background_figures'
        ? { ...s, injectEligible: true }
        : { ...s, injectEligible: true, spineProtected: true }
    );
    const score = bigBandScore([1, 2, 3, 4, 5, 6, 7, 8].map((b) => emptyBar(b)));
    const context = bbMosaicContext({
      allowMosaicPostFinalizeInject: true,
      mosaicSectionPlan: plan,
    });
    const out = injectMosaicMotifNotesPostFinalizeBigBand(score, context, true);
    expect(hasMosaicMotifInPartBar(out, BB_MOSAIC_INJECT_LEAD_PART_ID, 1)).toBe(true);
    expect(hasMosaicMotifInPartBar(out, BB_MOSAIC_INJECT_LEAD_PART_ID, 5)).toBe(false);
  });

  test('C) presetRole big_band + flag on + eligible section → lead voice only', () => {
    const plan = bbBasePlan().map((s) =>
      s.sectionLabel === 'background_figures'
        ? { ...s, injectEligible: true, spineProtected: false }
        : s
    );
    const bars = [1, 2, 3, 4, 5, 6, 7, 8].map((b) => emptyBar(b, 'Am'));
    const score = bigBandScore(bars);
    const beforeDrums = snapshotEventCount(score, 'bb_drums', 1);
    const beforeRhythm = snapshotEventCount(score, 'bb_rhythm_section', 1);
    const context = bbMosaicContext({
      allowMosaicPostFinalizeInject: true,
      mosaicSectionPlan: plan,
    });
    const out = injectMosaicMotifNotesPostFinalizeBigBand(score, context, true);
    expect(hasMosaicMotifInPartBar(out, BB_MOSAIC_INJECT_LEAD_PART_ID, 1)).toBe(true);
    for (const excluded of BB_MOSAIC_INJECT_EXCLUDED_PART_IDS) {
      expect(hasMosaicMotifInPartBar(out, excluded, 1)).toBe(false);
    }
    expect(snapshotEventCount(out, 'bb_drums', 1)).toBe(beforeDrums);
    expect(snapshotEventCount(out, 'bb_rhythm_section', 1)).toBe(beforeRhythm);
  });

  test('D) harmony diff root change → bar reverted and logged (BB lead part)', () => {
    const plan: MosaicModeSectionPlanEntry[] = [
      {
        sectionLabel: 'background_figures',
        startBar: 1,
        endBar: 4,
        songwriterStyleId: 'fripp',
        presetRole: 'big_band',
        mosaicOwned: true,
        injectEligible: true,
        spineProtected: false,
      },
    ];
    const score = bigBandScore([1, 2, 3, 4].map((b) => emptyBar(b, 'Am')));
    const context = bbMosaicContext({
      allowMosaicPostFinalizeInject: true,
      mosaicSectionPlan: plan,
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const injected = injectMosaicMotifNotesPostFinalizeBigBand(score, context, true);
    const lead = injected.parts.find((p) => p.id === BB_MOSAIC_INJECT_LEAD_PART_ID)!;
    const m = lead.measures.find((x) => x.index === 4)!;
    const preMutateEvents = structuredClone(m.events);
    m.chord = 'E7';

    expect(mosaicInjectHarmonyBarViolated('Am', 'E7', 4, 4)).toBe(true);

    const snapshot = new Map([
      [
        4,
        {
          events: preMutateEvents,
          chord: 'Am',
        },
      ],
    ]);
    applyMosaicInjectHarmonyFallbackForTarget(injected, snapshot, plan, {
      resolvePart: (s) => s.parts.find((p) => p.id === BB_MOSAIC_INJECT_LEAD_PART_ID),
      getRegisterForBar: () => [55, 82],
    });
    expect(m.chord).toBe('Am');
    expect(
      logSpy.mock.calls.some(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].includes('[mosaicInject] harmony revert section=background_figures bar=4')
      )
    ).toBe(true);
    logSpy.mockRestore();
  });
});
