/**
 * V82b+c / V82d - Barry Harris sixth-dim + chord-melody selector tests.
 */

import type { CompositionContext } from '../core/compositionContext';
import {
  applyIdentitiesToNoteChoice,
  applyIdentitiesToNoteChoices,
  buildBarryHarrisChordMelodyReceipts,
  buildBaseVoicing,
  buildHarmonyBarsFromSources,
  buildScaleOfChords,
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
import { dim7ChordTones, sixthChordTones } from '../core/barry-harris/chordTones';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
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
});