/**
 * V82b+c / V82d - Barry Harris sixth-dim + chord-melody selector tests.
 */

import type { CompositionContext } from '../core/compositionContext';
import {
  applyIdentitiesToNoteChoice,
  applyIdentitiesToNoteChoices,
  buildBarryHarrisChordMelodyReceipts,
  buildHarmonyBarsFromSources,
  buildScaleOfChords,
  closeBlockVoicingBelowMelody,
  dim7RootPcForSixthRoot,
  drop2VoicingBelowMelody,
  precomputeBarryHarrisChordMelodyFoundation,
  reinterpretFakeBookSymbol,
  reinterpretHarmonyBars,
  resolveBarryHarrisNoteChoices,
  runBarryHarrisChordMelodyPipeline,
  selectChordMelodyNoteChoice,
  sixthDimPartnerSymbol,
  summarizeBarryHarrisNoteChoices,
} from '../core/barry-harris';
import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import { IMPORT_CANDIDATE_MIN_CONFIDENCE } from '../core/import/mosaicImportTimeline';

const CHORDS = ['Cmaj7', 'Am7', 'Dm7', 'G7'];

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
  });
});