/**
 * V82b+c / V82d - Barry Harris sixth-dim + chord-melody selector tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import {
  applyIdentitiesToNoteChoice,
  applyIdentitiesToNoteChoices,
  applyChordMelodyToScore,
  applyVoicingEngineToResolved,
  assignPhrasingRoles,
  harmonySymbolForResolved,
  assessGuitarFeasibility,
  buildBarryHarrisChordMelodyReceipts,
  buildBaseVoicing,
  buildHarmonyBarsFromSources,
  buildScaleOfChords,
  buildLadder,
  closeBlockVoicingBelowMelody,
  drop2VoicingBelowMelody,
  dim7RootPcForSixthRoot,
  precomputeBarryHarrisChordMelodyFoundation,
  reinterpretFakeBookSymbol,
  reinterpretHarmonyBars,
  resolveBarryHarrisNoteChoices,
  runBarryHarrisChordMelodyPipeline,
  selectChordMelodyNoteChoice,
  sixthDimPartnerSymbol,
  summarizeBarryHarrisNoteChoices,
} from '../core/barry-harris';
import {
  dim7ParticipationRate,
  isDrop2Voicing,
  ladderRungHitRate,
  maxConsecutiveIdenticalFingerprints,
} from '../core/barry-harris/voicingEngine';
import { dim7ChordTones, sixthChordTones } from '../core/barry-harris/chordTones';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import { IMPORT_CANDIDATE_MIN_CONFIDENCE } from '../core/import/mosaicImportTimeline';
import type { ImportMelodyNote } from '../core/import/mosaicImportTimeline';
import type { ResolvedChordMelodyNote } from '../core/barry-harris/types';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const CHORDS = ['Cmaj7', 'Am7', 'Dm7', 'G7'];

const BENCHMARK_EXPORT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\barry_harris';

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function stackPcs(midis: readonly number[]): number[] {
  return [...new Set(midis.map((m) => mod12(m)))].sort((a, b) => a - b);
}

function pcSetLabel(pcs: readonly number[]): string {
  return pcs.map((pc) => PC_NAMES[pc]!).join(' ');
}

function melodyNote(
  bar: number,
  onsetBeat: number,
  midiPitch: number,
  durationBeats = 1
): ImportMelodyNote {
  return { bar, onsetBeat, durationBeats, midiPitch, confidence: 1, fieldOrigin: 'explicit' };
}

function exportBenchmarkXml(filename: string, scored: ScoreModel): string {
  fs.mkdirSync(BENCHMARK_EXPORT_DIR, { recursive: true });
  const xmlResult = exportScoreModelToMusicXml(scored, { bpm: 120, preserveChordKindLiterals: true });
  expect(xmlResult.success).toBe(true);
  const xml = xmlResult.xml ?? '';
  fs.writeFileSync(path.join(BENCHMARK_EXPORT_DIR, filename), xml, 'utf-8');
  return xml;
}

function avgInnerVoiceStep(resolved: readonly ResolvedChordMelodyNote[]): number {
  const ordered = [...resolved]
    .filter((r) => r.phrasingRole !== 'single' && r.innerVoicingMidis.length > 0)
    .sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  let totalLeap = 0;
  let leaps = 0;
  for (let i = 1; i < ordered.length; i++) {
    const prevInner = [...ordered[i - 1]!.innerVoicingMidis].sort((a, b) => a - b);
    const currInner = [...ordered[i]!.innerVoicingMidis].sort((a, b) => a - b);
    const used = new Set<number>();
    for (const a of prevInner) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < currInner.length; j++) {
        if (used.has(j)) continue;
        const dist = Math.abs(currInner[j]! - a);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) continue;
      used.add(bestIdx);
      totalLeap += bestDist;
      leaps++;
    }
  }
  return leaps > 0 ? totalLeap / leaps : 0;
}

function scoreChordMelodyBenchmark(
  harmonyBars: readonly string[],
  melody: readonly ImportMelodyNote[],
  presetId: 'guitar_bass_duo' = 'guitar_bass_duo'
): {
  pipeline: ReturnType<typeof runBarryHarrisChordMelodyPipeline>;
  scored: ScoreModel;
  xml: string;
} {
  const context = {
    form: { totalBars: harmonyBars.length, sections: [] },
    lockedHarmonyBarsRaw: [...harmonyBars],
    generationMetadata: {},
  } as CompositionContext;
  const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
  const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, harmonyBars.length, harmonyBars);
  const emptyScore: ScoreModel = {
    title: 'BH benchmark',
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        measures: [],
      },
    ],
  };
  const scored = applyChordMelodyToScore(emptyScore, pipeline.resolvedNotes, melody, presetId);
  return { pipeline, scored, xml: '' };
}

describe('Barry Harris chord-melody foundation', () => {
  test('sixth-dim partner is one semitone below sixth root (locked pairs)', () => {
    const locked = [
      { pc: 0, quality: '6' as const, dim: 'Bdim7' },
      { pc: 7, quality: '6' as const, dim: 'F#dim7' },
      { pc: 4, quality: 'm6' as const, dim: 'D#dim7' },
      { pc: 9, quality: 'm6' as const, dim: 'G#dim7' },
      { pc: 11, quality: 'm6' as const, dim: 'A#dim7' },
    ];
    for (const row of locked) {
      expect(sixthDimPartnerSymbol(row.pc, row.quality).dim7Symbol).toBe(row.dim);
      expect(dim7RootPcForSixthRoot(row.pc)).toBe((row.pc - 1 + 12) % 12);
    }
  });

  test('buildScaleOfChords emits fixed 7-pair ladder per section tonic', () => {
    const scale = buildScaleOfChords(0, false);
    expect(scale.pairs).toHaveLength(7);
    expect(scale.pairs[0]).toEqual({ sixthRootPc: 0, sixthQuality: '6', dim7RootPc: 11 });
  });

  test('V82 reinterpret preserves minor quality as m6 anchors', () => {
    expect(reinterpretFakeBookSymbol('Am')).toEqual({
      sixthRootPc: 9,
      sixthQuality: 'm6',
      dim7RootPc: 8,
    });
    expect(reinterpretFakeBookSymbol('Em')).toEqual({
      sixthRootPc: 4,
      sixthQuality: 'm6',
      dim7RootPc: 3,
    });
    expect(reinterpretFakeBookSymbol('Dm')).toEqual({
      sixthRootPc: 2,
      sixthQuality: 'm6',
      dim7RootPc: 1,
    });
    expect(reinterpretFakeBookSymbol('Cm7')).toEqual({
      sixthRootPc: 0,
      sixthQuality: 'm6',
      dim7RootPc: 11,
    });
    expect(reinterpretFakeBookSymbol('C')).toEqual({
      sixthRootPc: 0,
      sixthQuality: '6',
      dim7RootPc: 11,
    });
    expect(reinterpretFakeBookSymbol('F')).toEqual({
      sixthRootPc: 5,
      sixthQuality: '6',
      dim7RootPc: 4,
    });
    expect(reinterpretFakeBookSymbol('G7')).toEqual({
      sixthRootPc: 7,
      sixthQuality: '6',
      dim7RootPc: 6,
    });
  });

  test('reinterpret parity across locked, parsed, and import IR sources', () => {
    const tb = CHORDS.length;
    const lockedContext = {
      form: { totalBars: tb, sections: [] },
      lockedHarmonyBarsRaw: [...CHORDS],
      generationMetadata: {},
    } as CompositionContext;
    const parsedContext = {
      form: { totalBars: tb, sections: [] },
      generationMetadata: { parsedCustomProgressionBars: [...CHORDS] },
    } as CompositionContext;
    const ir: MosaicImportTimeline = {
      schemaVersion: 1,
      sourceFormat: 'midi',
      bars: tb,
      timeSig: { num: 4, den: 4 },
      keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'explicit' },
      harmonyByBar: CHORDS.map((chordSymbol, i) => ({
        bar: i + 1,
        chordSymbol,
        confidence: IMPORT_CANDIDATE_MIN_CONFIDENCE,
        fieldOrigin: 'explicit' as const,
      })),
      melodyLine: [],
    };
    const importContext = {
      form: { totalBars: tb, sections: [] },
      generationMetadata: {},
    } as CompositionContext;

    const lockedBars = buildHarmonyBarsFromSources(lockedContext);
    const parsedBars = buildHarmonyBarsFromSources(parsedContext);
    const importBars = buildHarmonyBarsFromSources(importContext, ir);
    expect(lockedBars).toEqual(parsedBars);
    expect(lockedBars).toEqual(importBars);

    const lockedRe = reinterpretHarmonyBars(lockedContext);
    const parsedRe = reinterpretHarmonyBars(parsedContext);
    const importRe = reinterpretHarmonyBars(importContext, ir);
    expect(lockedRe).toEqual(parsedRe);
    expect(lockedRe).toEqual(importRe);
  });

  test('selector resolves sixth, dim7, and borrowed note kinds', () => {
    const scale = buildScaleOfChords(0, false);
    const barAnchor = {
      bar: 1,
      sectionLabel: 'A',
      fakeBookSymbol: 'Cmaj7',
      anchor: { sixthRootPc: 0, sixthQuality: '6' as const, dim7RootPc: 11 },
    };
    const sixth = selectChordMelodyNoteChoice(scale, barAnchor, { bar: 1, onsetBeat: 0, melodyPc: 9 });
    expect(sixth.kind).toBe('sixth');
    expect(sixth.chordSymbol).toBe('C6');
    expect(sixth.droppedTonePc).toBe(9);

    const dim = selectChordMelodyNoteChoice(scale, barAnchor, { bar: 1, onsetBeat: 1, melodyPc: 11 });
    expect(dim.kind).toBe('dim7');
    expect(dim.chordSymbol).toBe('Bdim7');

    const borrowed = selectChordMelodyNoteChoice(scale, barAnchor, { bar: 1, onsetBeat: 2, melodyPc: 1 });
    expect(borrowed.kind).toBe('borrowed');
    expect(borrowed.activeSymbol).toBe('C6');
    expect(borrowed.partnerSymbol).toBe('Bdim7');
  });

  test('precompute + note choices summarize borrowed density', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const noteChoices = resolveBarryHarrisNoteChoices(foundation, [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 61, confidence: 1, fieldOrigin: 'explicit' },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' },
    ]);
    const summary = summarizeBarryHarrisNoteChoices(noteChoices);
    expect(summary.noteCount).toBe(3);
    expect(summary.borrowedDensity).toBeGreaterThanOrEqual(0);
    expect(noteChoices.some((c) => c.kind === 'borrowed')).toBe(true);
    expect(reinterpretFakeBookSymbol('Cmaj7')).toEqual({
      sixthRootPc: 0,
      sixthQuality: '6',
      dim7RootPc: 11,
    });
  });

  test('V82e identities annotate sixth, dim7, and pick chart-closest exportSymbol', () => {
    const m6Choice = {
      bar: 1,
      onsetBeat: 0,
      sectionLabel: 'A',
      fakeBookSymbol: 'F#m7b5',
      anchor: { sixthRootPc: 9, sixthQuality: 'm6' as const, dim7RootPc: 8 },
      scalePairIndex: 0,
      melodyPc: 9,
      kind: 'sixth' as const,
      chordSymbol: 'Am6',
      droppedTonePc: 6,
    };
    const resolved = applyIdentitiesToNoteChoice(m6Choice);
    expect(resolved.exportSymbol).toBe('F#m7b5');
    expect(resolved.identityAnnotations.some((a) => a.id === 'm6_m7b5')).toBe(true);
    expect(resolved.identityAnnotations.some((a) => a.id === 'six_on_five_maj9')).toBe(true);
    expect(resolved.voicingHint).toBe('guitar-sixth-block-close');

    const dimChoice = {
      ...m6Choice,
      kind: 'dim7' as const,
      chordSymbol: 'G#dim7',
      droppedTonePc: 6,
      melodyPc: 8,
    };
    const dimResolved = applyIdentitiesToNoteChoice(dimChoice);
    expect(dimResolved.identityAnnotations.filter((a) => a.id === 'dim7_dom7_enharmonic')).toHaveLength(4);
    expect(dimResolved.voicingHint).toBe('guitar-dim7-block-close');
  });

  test('V82e block voicings lock melody as top voice', () => {
    const tones = [0, 4, 7, 9];
    const melody = 74;
    const close = closeBlockVoicingBelowMelody(melody, tones, 9);
    expect(close.every((p) => p < melody)).toBe(true);
    expect(close.length).toBe(3);

    const drop2 = drop2VoicingBelowMelody(melody, tones, 9);
    expect(drop2.length).toBe(3);
    expect(Math.max(...drop2)).toBeLessThan(melody);
  });

  test('V82f bh:cm receipts emit select, borrowed, reinterpret, and identity per note', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 61, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const receipts = pipeline.cmReceipts;
    expect(receipts.some((r) => r.startsWith('bh:cm:reinterpret@bar'))).toBe(true);
    expect(receipts.some((r) => r.startsWith('bh:cm:select@') || r.startsWith('bh:cm:borrowed@'))).toBe(true);
    expect(receipts.some((r) => r.startsWith('bh:cm:identity@'))).toBe(true);
    expect(receipts.filter((r) => r.startsWith('bh:cm:select@') || r.startsWith('bh:cm:borrowed@'))).toHaveLength(3);
    expect(buildBarryHarrisChordMelodyReceipts(foundation, pipeline.noteChoices, pipeline.resolvedNotes)).toEqual(
      receipts
    );
  });

  test('V82e pipeline returns resolvedNotes with identity summary', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const pipeline = runBarryHarrisChordMelodyPipeline(
      foundation,
      [{ bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' }],
      4,
      CHORDS
    );
    expect(pipeline.resolvedNotes).toHaveLength(1);
    expect(pipeline.resolvedNotes[0]?.exportSymbol).toBeTruthy();
    expect(pipeline.summary.identityAnnotationCount).toBeGreaterThan(0);
    expect(pipeline.resolvedNotes[0]?.exportStackMidis.length).toBeGreaterThan(0);
    expect(pipeline.resolvedNotes[0]?.phrasingRole).toBeTruthy();
  });

  test('V80j forward reinterpret mappings (m7b5, alt dom, maj9)', () => {
    expect(reinterpretFakeBookSymbol('C#m7b5')).toEqual({
      sixthRootPc: 4,
      sixthQuality: 'm6',
      dim7RootPc: 3,
    });
    expect(reinterpretFakeBookSymbol('F#7')).toEqual({
      sixthRootPc: 7,
      sixthQuality: 'm6',
      dim7RootPc: 6,
    });
    expect(reinterpretFakeBookSymbol('Gmaj9')).toEqual({
      sixthRootPc: 2,
      sixthQuality: '6',
      dim7RootPc: 1,
    });
  });

  test('V80j MusicXML export has chord stacks and BH harmony symbols', () => {
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 61, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const ir: MosaicImportTimeline = {
      schemaVersion: 1,
      sourceFormat: 'midi',
      bars: 4,
      timeSig: { num: 4, den: 4 },
      keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'explicit' },
      harmonyByBar: CHORDS.map((chordSymbol, i) => ({
        bar: i + 1,
        chordSymbol,
        confidence: IMPORT_CANDIDATE_MIN_CONFIDENCE,
        fieldOrigin: 'explicit' as const,
      })),
      melodyLine: melody,
    };
    const gp = runGoldenPathOnce(88001, {
      presetId: 'guitar_bass_duo',
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: [...CHORDS, ...CHORDS, ...CHORDS, ...CHORDS],
      totalBars: 16,
      importTimeline: {
        ...ir,
        bars: 16,
        harmonyByBar: Array.from({ length: 16 }, (_, i) => ({
          bar: i + 1,
          chordSymbol: CHORDS[i % CHORDS.length]!,
          confidence: IMPORT_CANDIDATE_MIN_CONFIDENCE,
          fieldOrigin: 'explicit' as const,
        })),
        melodyLine: [
          ...melody,
          ...melody.map((n) => ({ ...n, bar: n.bar + 4 })),
          ...melody.map((n) => ({ ...n, bar: n.bar + 8 })),
          ...melody.map((n) => ({ ...n, bar: n.bar + 12 })),
        ],
      },
      styleTransfer: true,
      targetComposer: 'barry_harris',
      styleTransferStrength: 1,
      preserveMelody: true,
      suppressWybleVoiceLayoutForTest: true,
    });
    const xmlResult = exportScoreModelToMusicXml(gp.score, { bpm: 120, preserveChordKindLiterals: true });
    expect(xmlResult.success).toBe(true);
    const xml = xmlResult.xml ?? '';
    expect(xml).toMatch(/<chord\/>/);
    const guitarPart = xml.match(/<part id="[^"]*"[\s\S]*?<\/part>/g)?.find((p) => p.includes('Guitar') || p.includes('guitar'));
    expect(guitarPart).toBeTruthy();
    const noteCount = (guitarPart?.match(/<note>/g) ?? []).length;
    expect(noteCount).toBeGreaterThan(melody.length);
    const harmonies = extractHarmoniesFromFirstPartXml(xml);
    const bhSymbols = [...harmonies.values()].some((s) => /6|dim7|m6/i.test(s));
    expect(bhSymbols).toBe(true);
    expect(xml).not.toMatch(/Cmaj7/);
    const resolved =
      (gp.context.generationMetadata?.barryHarrisResolvedNotes as import('../core/barry-harris').ResolvedChordMelodyNote[]) ??
      [];
    for (const r of resolved) {
      const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
      if (!mel || r.exportStackMidis.length === 0) continue;
      expect(Math.max(...r.exportStackMidis)).toBe(mel.midiPitch);
      if (r.phrasingRole === 'dyad') expect(r.exportStackMidis.length).toBe(2);
      if (r.phrasingRole === 'single') expect(r.exportStackMidis.length).toBe(1);
      if (r.phrasingRole === 'full') expect(r.exportStackMidis.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('V80j-fix sixth chord voicings include required 6th degree pitch class', () => {
    function stackPcs(midis: readonly number[]): number[] {
      return [...new Set(midis.map((m) => ((m % 12) + 12) % 12))];
    }
    function fullVoicing(
      bar: number,
      sixthRootPc: number,
      quality: '6' | 'm6',
      melodyMidi: number,
      requiredPc: number
    ) {
      const dim7RootPc = dim7RootPcForSixthRoot(sixthRootPc);
      const anchor = { sixthRootPc, sixthQuality: quality, dim7RootPc };
      const resolved = applyIdentitiesToNoteChoice({
        bar,
        onsetBeat: 0,
        sectionLabel: 'A',
        fakeBookSymbol: 'C',
        anchor,
        scalePairIndex: 0,
        melodyPc: ((melodyMidi % 12) + 12) % 12,
        kind: 'sixth',
        chordSymbol: quality === 'm6' ? 'Am6' : 'C6',
        droppedTonePc: ((sixthRootPc + 9) % 12 + 12) % 12,
      });
      const voiced = buildBaseVoicing({ ...resolved, phrasingRole: 'full' }, melodyMidi, 'full');
      expect(stackPcs(voiced.exportStackMidis)).toContain(requiredPc);
      expect(sixthChordTones(sixthRootPc, quality)).toHaveLength(4);
    }

    fullVoicing(1, 0, '6', 67, 9); // C6 + G melody -> A (pc 9)
    fullVoicing(2, 5, '6', 69, 2); // F6 + A melody -> D (pc 2)
    fullVoicing(3, 9, 'm6', 60, 6); // Am6 + C melody -> F# (pc 6)
    fullVoicing(4, 4, 'm6', 76, 1); // Em6 + E5 melody -> C# (pc 1)
  });

  test('V80j-fix dim7 voicing uses four dim7 chord tones when selector picks dim7', () => {
    const anchor = { sixthRootPc: 0, sixthQuality: '6' as const, dim7RootPc: 11 };
    const dimTones = dim7ChordTones(11);
    expect(dimTones).toHaveLength(4);
    expect(dimTones).toEqual([11, 2, 5, 8]); // B D F Ab

    const resolved = applyIdentitiesToNoteChoice({
      bar: 1,
      onsetBeat: 1,
      sectionLabel: 'A',
      fakeBookSymbol: 'C',
      anchor,
      scalePairIndex: 0,
      melodyPc: 11,
      kind: 'dim7',
      chordSymbol: 'Bdim7',
      droppedTonePc: 8,
    });
    const voiced = buildBaseVoicing({ ...resolved, phrasingRole: 'full' }, 71, 'full');
    const pcs = [...new Set(voiced.exportStackMidis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
    expect(pcs).toEqual([...dimTones].sort((a, b) => a - b));
    expect(resolved.chordSymbol).toBe('Bdim7');
  });

  test('V80j-fix golden path preserves imported melody event count and melody-on-top stacks', () => {
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 0.5, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1.5, durationBeats: 0.5, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 2, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 3, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 3.5, durationBeats: 0.5, midiPitch: 71, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 1, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 3, durationBeats: 1, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 57, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 1, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 2, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 3, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 1, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 2, durationBeats: 1, midiPitch: 71, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 3, durationBeats: 1, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 0.5, durationBeats: 0.5, midiPitch: 61, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0.5, durationBeats: 0.5, midiPitch: 66, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0.5, durationBeats: 0.5, midiPitch: 58, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0.5, durationBeats: 0.5, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    expect(melody.length).toBeGreaterThanOrEqual(20);

    const ir: MosaicImportTimeline = {
      schemaVersion: 1,
      sourceFormat: 'midi',
      bars: 16,
      timeSig: { num: 4, den: 4 },
      keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'explicit' },
      harmonyByBar: ['C', 'F', 'Am', 'Em', 'C', 'F', 'Am', 'Em', 'C', 'F', 'Am', 'Em', 'C', 'F', 'Am', 'Em'].map(
        (chordSymbol, i) => ({
          bar: i + 1,
          chordSymbol,
          confidence: IMPORT_CANDIDATE_MIN_CONFIDENCE,
          fieldOrigin: 'explicit' as const,
        })
      ),
      melodyLine: melody,
    };
    const gp = runGoldenPathOnce(88002, {
      presetId: 'guitar_bass_duo',
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: ['C', 'F', 'Am', 'Em', 'C', 'F', 'Am', 'Em', 'C', 'F', 'Am', 'Em', 'C', 'F', 'Am', 'Em'],
      totalBars: 16,
      importTimeline: ir,
      styleTransfer: true,
      targetComposer: 'barry_harris',
      styleTransferStrength: 1,
      preserveMelody: true,
      suppressWybleVoiceLayoutForTest: true,
    });
    const xmlResult = exportScoreModelToMusicXml(gp.score, { bpm: 120, preserveChordKindLiterals: true });
    expect(xmlResult.success).toBe(true);
    const guitar = gp.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    let guitarEventCount = 0;
    for (const m of guitar?.measures.filter((meas) => meas.index <= 4) ?? []) {
      guitarEventCount += m.events.filter((e) => e.kind === 'note' || e.kind === 'chord').length;
    }
    expect(guitarEventCount).toBeGreaterThanOrEqual(20);

    const resolved =
      (gp.context.generationMetadata?.barryHarrisResolvedNotes as import('../core/barry-harris').ResolvedChordMelodyNote[]) ??
      [];
    const resolvedHookpad = resolved.filter((r) => r.bar >= 1 && r.bar <= 4);
    expect(resolvedHookpad.length).toBe(melody.length);
    for (const r of resolvedHookpad) {
      const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
      if (!mel || r.exportStackMidis.length === 0) continue;
      expect(Math.max(...r.exportStackMidis)).toBe(mel.midiPitch);
    }
  });

  test('V80k ladder average inner-voice step <= 3 semitones', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 2, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const voiced = pipeline.resolvedNotes;
    const ordered = [...voiced].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
    let totalLeap = 0;
    let leaps = 0;
    for (let i = 1; i < ordered.length; i++) {
      const prevInner = [...ordered[i - 1]!.innerVoicingMidis].sort((a, b) => a - b);
      const currInner = [...ordered[i]!.innerVoicingMidis].sort((a, b) => a - b);
      const used = new Set<number>();
      for (const a of prevInner) {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let j = 0; j < currInner.length; j++) {
          if (used.has(j)) continue;
          const dist = Math.abs(currInner[j]! - a);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = j;
          }
        }
        if (bestIdx < 0) continue;
        used.add(bestIdx);
        totalLeap += bestDist;
        leaps++;
      }
    }
    expect(leaps).toBeGreaterThan(0);
    expect(totalLeap / leaps).toBeLessThanOrEqual(3);
  });

  test('V80k ladder rung hit rate >= 80%', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 2, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    expect(ladderRungHitRate(pipeline.resolvedNotes)).toBeGreaterThanOrEqual(0.8);
  });

  test('V80k ladder chord-change max voice displacement <= 6 semitones', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const voiced = pipeline.resolvedNotes;
    let maxDisp = 0;
    for (let i = 1; i < voiced.length; i++) {
      const prev = voiced[i - 1]!;
      const curr = voiced[i]!;
      if (prev.phrasingRole === 'single' || curr.phrasingRole === 'single') continue;
      if (prev.anchor.sixthRootPc !== curr.anchor.sixthRootPc) {
        const prevInner = [...prev.innerVoicingMidis].sort((a, b) => a - b);
        const currInner = [...curr.innerVoicingMidis].sort((a, b) => a - b);
        const used = new Set<number>();
        let disp = 0;
        for (const a of prevInner) {
          let bestIdx = -1;
          let bestDist = Infinity;
          for (let j = 0; j < currInner.length; j++) {
            if (used.has(j)) continue;
            const dist = Math.abs(currInner[j]! - a);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = j;
            }
          }
        if (bestIdx < 0) continue;
        used.add(bestIdx);
        disp = Math.max(disp, bestDist);
      }
      maxDisp = Math.max(maxDisp, disp);
      }
    }
    expect(maxDisp).toBeLessThanOrEqual(6);
  });

  test('V80k-fix dim7 participation >= 15% of harmonised events', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 2, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const voiced = pipeline.resolvedNotes;
    expect(dim7ParticipationRate(voiced)).toBeGreaterThanOrEqual(0.15);
  });

  test('V80k-fix no more than 2 consecutive identical voicing fingerprints', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const voiced = pipeline.resolvedNotes;
    expect(maxConsecutiveIdenticalFingerprints(voiced)).toBeLessThanOrEqual(2);
  });

  test('V80k all full/dyad voicings pass guitar feasibility (fret span <= 5)', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const voiced = pipeline.resolvedNotes;
    for (const r of voiced) {
      if (r.phrasingRole === 'single') continue;
      expect(r.guitarFeasible).toBe(true);
      expect((r.guitarFretSpan ?? 99)).toBeLessThanOrEqual(5);
      const check = assessGuitarFeasibility(r.exportStackMidis, { allowStretch: true });
      expect(check.feasible).toBe(true);
      expect(check.fretSpan).toBeLessThanOrEqual(5);
    }
  });

  test('V80k drop-2 variant includes drop-2 spacing voicing', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const dropVoiced = applyVoicingEngineToResolved(pipeline.resolvedNotes, melody, { spacingPreference: 'drop2' });
    expect(
      dropVoiced.some((r) => isDrop2Voicing(r, melody.find((m) => m.bar === r.bar && Math.abs(m.onsetBeat - r.onsetBeat) < 0.02)?.midiPitch ?? 60))
    ).toBe(true);
  });

  test('V80k-export ladder rung source drives MusicXML chord symbols and melody count', () => {
    const hookpadMelody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1.5, durationBeats: 0.5, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 2, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 3, durationBeats: 0.5, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 3.5, durationBeats: 0.5, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 1, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 1.5, durationBeats: 0.5, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 3, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 3.5, durationBeats: 0.5, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 1, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 1.5, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 2, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 3, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 3.5, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 1, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 1.5, durationBeats: 0.5, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 2, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 3, durationBeats: 0.5, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 4, onsetBeat: 3.5, durationBeats: 0.5, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    expect(hookpadMelody.length).toBe(24);

    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: ['C', 'F', 'Am', 'Em'],
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const pipeline = runBarryHarrisChordMelodyPipeline(
      foundation,
      hookpadMelody,
      4,
      ['C', 'F', 'Am', 'Em']
    );
    const voiced = pipeline.resolvedNotes;

    for (const r of voiced) {
      const sym = harmonySymbolForResolved(r);
      if (r.voicingChordColour === 'dim7') {
        expect(sym).toMatch(/dim7/i);
        const expected = [...dim7ChordTones(r.anchor.dim7RootPc)].sort((a, b) => a - b);
        const pcs = [...new Set(r.exportStackMidis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
        expect(pcs).toEqual(expected);
      } else if (r.voicingChordColour === 'sixth') {
        expect(sym).toMatch(/6/);
      }
    }

    const dimProbePipeline = runBarryHarrisChordMelodyPipeline(
      foundation,
      [{ bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const }],
      4,
      ['C', 'F', 'Am', 'Em']
    );
    const dimProbeVoiced = dimProbePipeline.resolvedNotes;
    expect(dimProbeVoiced.some((r) => r.voicingChordColour === 'dim7')).toBe(true);

    expect(maxConsecutiveIdenticalFingerprints(voiced)).toBeLessThanOrEqual(2);

    const emptyScore = {
      title: 'BH export test',
      parts: [
        {
          id: 'guitar',
          name: 'Guitar',
          instrumentIdentity: 'clean_electric_guitar',
          measures: [],
        },
      ],
    };
    const scored = applyChordMelodyToScore(emptyScore as import('../core/score-model/scoreModelTypes').ScoreModel, voiced, hookpadMelody, 'guitar_bass_duo');
    const guitar = scored.parts[0]!;
    let melodyEvents = 0;
    for (const m of guitar.measures) {
      melodyEvents += m.events.filter((e) => e.kind === 'chord' || e.kind === 'note').length;
    }
    expect(melodyEvents).toBe(24);

    const xmlResult = exportScoreModelToMusicXml(scored, { bpm: 120, preserveChordKindLiterals: true });
    expect(xmlResult.success).toBe(true);
    const xml = xmlResult.xml ?? '';
    const dimProbeMelody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const dimScored = applyChordMelodyToScore(
      structuredClone(emptyScore) as import('../core/score-model/scoreModelTypes').ScoreModel,
      dimProbeVoiced,
      dimProbeMelody,
      'guitar_bass_duo'
    );
    const dimXmlResult = exportScoreModelToMusicXml(dimScored, { bpm: 120, preserveChordKindLiterals: true });
    expect(dimXmlResult.success).toBe(true);
    expect((dimXmlResult.xml ?? '').match(/dim7/gi)?.length ?? 0).toBeGreaterThan(0);
    const guitarNotes = (xml.match(/<note>/g) ?? []).length;
    expect(guitarNotes).toBeGreaterThanOrEqual(24);
  });

  test('V80k drop-2 variant voicings differ from close variant', () => {
    const context = {
      form: { totalBars: 4, sections: [] },
      lockedHarmonyBarsRaw: CHORDS,
      generationMetadata: {},
    } as CompositionContext;
    const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
    const melody = [
      { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' as const },
      { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' as const },
    ];
    const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, 4, CHORDS);
    const closeVoiced = applyVoicingEngineToResolved(pipeline.resolvedNotes, melody, { spacingPreference: 'close' });
    const dropVoiced = applyVoicingEngineToResolved(pipeline.resolvedNotes, melody, { spacingPreference: 'drop2' });
    const closeSigs = closeVoiced.map((r) => r.voicingFingerprint).join('|');
    const dropSigs = dropVoiced.map((r) => r.voicingFingerprint).join('|');
    expect(dropSigs).not.toBe(closeSigs);
  });

  test('Benchmark A — ladder fidelity (synthetic 8-note C-major scale)', () => {
    const harmonyBars = ['C', 'C'];
    const ladderMelody = [
      melodyNote(1, 0, 60),
      melodyNote(1, 1, 62),
      melodyNote(1, 2, 64),
      melodyNote(1, 3, 65),
      melodyNote(2, 0, 67),
      melodyNote(2, 1, 68),
      melodyNote(2, 2, 69),
      melodyNote(2, 3, 71),
    ];
    const expectedPattern = ['sixth', 'dim7', 'sixth', 'dim7', 'sixth', 'dim7', 'sixth', 'dim7'] as const;
    const expectedVoicingPcs: number[][] = [
      [0, 4, 7, 9],
      [2, 5, 8, 11],
      [0, 4, 7, 9],
      [2, 5, 8, 11],
      [0, 4, 7, 9],
      [2, 5, 8, 11],
      [0, 4, 7, 9],
      [2, 5, 8, 11],
    ];
    const expectedSymbols = ['C6', 'Bdim7', 'C6', 'Bdim7', 'C6', 'Bdim7', 'C6', 'Bdim7'];
    const cAnchor = reinterpretFakeBookSymbol('C');
    const ladder = buildLadder(cAnchor);

    const { pipeline, scored } = scoreChordMelodyBenchmark(harmonyBars, ladderMelody);
    const resolved = pipeline.resolvedNotes;
    expect(resolved).toHaveLength(8);

    const rows: string[] = [];
    for (let i = 0; i < ladderMelody.length; i++) {
      const mel = ladderMelody[i]!;
      const r = resolved[i]!;
      const actualColour = r.voicingChordColour ?? (r.kind === 'dim7' ? 'dim7' : 'sixth');
      const expectedColour = expectedPattern[i]!;
      const actualPcs = stackPcs(r.exportStackMidis);
      const expectedPcs = expectedVoicingPcs[i]!;
      const rung = ladder[i]!;
      const sym = harmonySymbolForResolved(r);
      const colourPass = actualColour === expectedColour;
      const symPass = sym === expectedSymbols[i];
      const ladderPass = r.ladderHit === true && r.ladderRungIndex === rung.index;
      const tonePass =
        r.phrasingRole === 'full'
          ? actualPcs.length === expectedPcs.length && actualPcs.every((pc, j) => pc === expectedPcs[j])
          : actualPcs.every((pc) => expectedPcs.includes(pc));
      const pass = colourPass && symPass && ladderPass && tonePass;
      rows.push(
        `${PC_NAMES[mod12(mel.midiPitch)]!.padEnd(3)} | ${expectedColour.padEnd(5)} | ${actualColour.padEnd(5)} | ${pass ? 'PASS' : 'FAIL'} (${r.phrasingRole}, ${pcSetLabel(actualPcs)})`
      );
      expect(actualColour).toBe(expectedColour);
      expect(sym).toBe(expectedSymbols[i]);
      expect(r.ladderHit).toBe(true);
      expect(r.ladderRungIndex).toBe(rung.index);
      expect(rung.source).toBe(expectedColour === 'sixth' ? '6' : 'dim');
      if (r.phrasingRole === 'full') {
        expect(actualPcs).toEqual(expectedPcs);
      } else {
        expect(actualPcs.every((pc) => expectedPcs.includes(pc))).toBe(true);
      }
    }

    const colourPattern = resolved.map(
      (r) => r.voicingChordColour ?? (r.kind === 'dim7' ? 'dim7' : 'sixth')
    );
    expect(colourPattern.join('-')).toBe('sixth-dim7-sixth-dim7-sixth-dim7-sixth-dim7');

    const xml = exportBenchmarkXml('BH_Benchmark_LadderFidelity.musicxml', scored);
    const perNoteSymbols = resolved.map((r) => harmonySymbolForResolved(r));
    expect(perNoteSymbols).toEqual(expectedSymbols);
    expect(xml).toMatch(/dim7|°7|o7/i);

    console.log('\n=== Benchmark A — Ladder Fidelity ===');
    console.log('melody | expected rung | actual rung | pass/fail');
    console.log('-------|---------------|-------------|----------');
    for (const row of rows) console.log(row);
    console.log(`Exported symbols sample: ${expectedSymbols.slice(0, 4).join(', ')}…`);
  });

  test('Benchmark B — jazz melody (Embraceable-You-style changes)', () => {
    const harmonyBars = ['G', 'G', 'Am7', 'D7', 'Bm7', 'Bm7', 'D7', 'G'];
    const jazzMelody = [
      melodyNote(1, 0, 66),
      melodyNote(1, 2, 71),
      melodyNote(2, 0, 69),
      melodyNote(2, 2, 67),
      melodyNote(3, 0, 69),
      melodyNote(3, 2, 68),
      melodyNote(4, 0, 70),
      melodyNote(4, 2, 66),
      melodyNote(5, 0, 71),
      melodyNote(5, 2, 69),
      melodyNote(6, 0, 71),
      melodyNote(6, 2, 66),
      melodyNote(7, 0, 70),
      melodyNote(7, 2, 68),
      melodyNote(8, 0, 67),
      melodyNote(8, 2, 71),
    ];

    const { pipeline, scored } = scoreChordMelodyBenchmark(harmonyBars, jazzMelody);
    const resolved = pipeline.resolvedNotes;
    expect(resolved).toHaveLength(jazzMelody.length);

    const dimPct = dim7ParticipationRate(resolved) * 100;
    expect(dimPct).toBeGreaterThan(0);

    const avgVl = avgInnerVoiceStep(resolved);
    expect(avgVl).toBeLessThanOrEqual(3);

    const xml = exportBenchmarkXml('BH_Benchmark_JazzMelody.musicxml', scored);
    const symbols = [...extractHarmoniesFromFirstPartXml(xml).values()].slice(0, 8);

    console.log('\n=== Benchmark B — Jazz Melody ===');
    console.log(`event count: ${resolved.length} (input ${jazzMelody.length})`);
    console.log(`dim7 participation: ${dimPct.toFixed(1)}%`);
    console.log(`avg inner-voice VL step: ${avgVl.toFixed(2)} semitones`);
    console.log(`exported symbols sample: ${symbols.join(' | ') || '(none)'}`);
  });
});