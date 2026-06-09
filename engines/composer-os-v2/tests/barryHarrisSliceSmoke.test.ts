/**

 * Smoke — Barry Harris bebop / sixth–diminished songwriter slice + V82f chord-melody depth.

 */



import type { CompositionContext } from '../core/compositionContext';

import {

  applyChordMelodyToScore,

  applyIdentitiesToNoteChoices,

  blockMidisForResolved,

  dim7RootPcForSixthRoot,

  precomputeBarryHarrisChordMelodyFoundation,

  runBarryHarrisChordMelodyPipeline,

  sixthDimPartnerSymbol,

} from '../core/barry-harris';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';

import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';

import { IMPORT_CANDIDATE_MIN_CONFIDENCE } from '../core/import/mosaicImportTimeline';

import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';



const CHORDS_16 = [

  'Cmaj7',

  'Am7',

  'Dm7',

  'G7',

  'Cmaj7',

  'Am7',

  'Dm7',

  'G7',

  'Cmaj7',

  'E7',

  'Am7',

  'D7',

  'G7',

  'Cmaj7',

  'Am7',

  'Dm7',

];



function makeImportIr(): MosaicImportTimeline {

  return {

    schemaVersion: 1,

    sourceFormat: 'musicxml',

    bars: 8,

    timeSig: { num: 4, den: 4 },

    keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'explicit' },

    harmonyByBar: Array.from({ length: 8 }, (_, i) => ({

      bar: i + 1,

      chordSymbol: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'][i] ?? 'C',

      confidence: IMPORT_CANDIDATE_MIN_CONFIDENCE,

      fieldOrigin: 'explicit' as const,

    })),

    melodyLine: [

      { bar: 1, onsetBeat: 0, durationBeats: 2, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' },

      { bar: 1, onsetBeat: 2, durationBeats: 2, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' },

      { bar: 2, onsetBeat: 0, durationBeats: 4, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' },

    ],

    parseDiagnostics: [],

  };

}



export function runBarryHarrisSliceSmokeTests(): { name: string; ok: boolean }[] {

  const out: { name: string; ok: boolean }[] = [];



  const r = runGoldenPathOnce(50201, {

    presetId: 'guitar_bass_duo',

    totalBars: 32,

    longFormEnabled: true,

    songModeHookFirstIdentity: true,

    primarySongwriterStyle: 'barry_harris',

  });



  const md = r.context?.generationMetadata;

  const diag = md?.barryHarrisDiagnostics;

  const receipt = md?.barryHarrisSliceReceipt ?? '';

  const eff = md?.barryHarrisEffectiveHarmonyBars;



  out.push({

    ok:

      r.success &&

      md?.songwriterStyleId === 'barry_harris' &&

      diag?.songwriterId === 'barry_harris' &&

      (diag?.barsConsidered ?? 0) >= 32 &&

      Array.isArray(eff) &&

      eff.length === 32 &&

      receipt.includes('Barry Harris (bebop / sixth–dim slice)'),

    name: 'Barry Harris slice: golden path + bebop/sixth–dim diagnostics receipt',

  });



  const pairingOk = [

    { pc: 0, q: '6' as const, dim: 'Bdim7' },

    { pc: 7, q: '6' as const, dim: 'F#dim7' },

    { pc: 4, q: 'm6' as const, dim: 'D#dim7' },

    { pc: 9, q: 'm6' as const, dim: 'G#dim7' },

    { pc: 11, q: 'm6' as const, dim: 'A#dim7' },

  ].every(

    (row) =>

      sixthDimPartnerSymbol(row.pc, row.q).dim7Symbol === row.dim &&

      dim7RootPcForSixthRoot(row.pc) === (row.pc - 1 + 12) % 12

  );



  out.push({

    ok: pairingOk,

    name: 'Barry Harris slice: sixth-dim partner root is sixth root minus one semitone',

  });



  const ir = makeImportIr();

  const locked = importTimelineToLockedHarmony(ir);

  const st = runGoldenPathOnce(88201, {

    presetId: 'guitar_bass_duo',

    harmonyMode: 'custom_locked',

    lockedHarmonyBarsRaw: locked,

    parsedChordBars: locked,

    chordProgressionText: locked.join(' | '),

    totalBars: 8,

    importTimeline: ir,

    styleTransfer: true,

    targetComposer: 'barry_harris',

    styleTransferStrength: 1,

    preserveMelody: true,

    mosaicSectionPlan: [{ sectionLabel: 'import', startBar: 1, endBar: 8, songwriterStyleId: 'barry_harris' }],

    suppressWybleVoiceLayoutForTest: true,

  });

  const stMd = st.context?.generationMetadata;

  const stResult = stMd?.styleTransferResult;

  const cm = stResult?.barryHarrisChordMelody;

  const cmReceipts = cm?.cmReceipts ?? stMd?.barryHarrisChordMelodyReceipts ?? [];

  out.push({

    ok:

      stResult?.composerApplied === 'barry_harris' &&

      (cm?.noteCount ?? 0) === ir.melodyLine.length &&

      typeof cm?.borrowedDensity === 'number' &&

      cm.borrowedDensity >= 0 &&

      cm.borrowedDensity <= 1 &&

      cmReceipts.length > 0 &&

      cmReceipts.some((r) => r.startsWith('bh:cm:select@') || r.startsWith('bh:cm:borrowed@')),

    name: 'Barry Harris chord-melody: style-transfer echo + borrowedDensity + bh:cm receipts',

  });



  const textContext = {

    form: { totalBars: 16, sections: [] },

    lockedHarmonyBarsRaw: CHORDS_16,

    generationMetadata: {},

  } as CompositionContext;

  const melody16 = Array.from({ length: 16 }, (_, i) => ({

    bar: i + 1,

    onsetBeat: 0,

    durationBeats: 1,

    midiPitch: 60 + (i % 7),

    confidence: 1,

    fieldOrigin: 'explicit' as const,

  }));

  const foundation = precomputeBarryHarrisChordMelodyFoundation(textContext);

  const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody16, 16, CHORDS_16);

  const receipts = pipeline.summary.cmReceipts ?? [];

  const selectorCoverage =

    pipeline.summary.sixthCount + pipeline.summary.dim7Count + pipeline.summary.borrowedCount;

  out.push({

    ok:

      receipts.some((x) => x.startsWith('bh:cm:reinterpret@')) &&

      receipts.some((x) => x.startsWith('bh:cm:select@') || x.startsWith('bh:cm:borrowed@')) &&

      selectorCoverage === pipeline.summary.noteCount &&

      pipeline.summary.noteCount === 16,

    name: 'Barry Harris chord-melody: locked text chords → reinterpret + selector receipts',

  });



  const resolved = applyIdentitiesToNoteChoices(pipeline.noteChoices);

  let blockOk = true;

  for (let i = 0; i < resolved.length; i++) {

    const note = resolved[i]!;

    const mel = melody16[i]!;

    const inner = blockMidisForResolved(note, mel.midiPitch, 'guitar_bass_duo');

    if (inner.some((p) => p >= mel.midiPitch)) blockOk = false;

    if (((mel.midiPitch % 12) + 12) % 12 !== note.melodyPc) blockOk = false;

  }

  out.push({

    ok: blockOk && resolved.length === 16,

    name: 'Barry Harris chord-melody: block voicing inner voices below melody top',

  });

  const sqFoundation = precomputeBarryHarrisChordMelodyFoundation(textContext);
  const sqPipeline = runBarryHarrisChordMelodyPipeline(sqFoundation, melody16, 16, CHORDS_16, {
    presetId: 'string_quartet',
  });
  const sqScore = applyChordMelodyToScore(
    {
      title: 'BH SQ smoke',
      parts: [],
    },
    sqPipeline.resolvedNotes,
    melody16,
    'string_quartet'
  );
  const sqXml = exportScoreModelToMusicXml(sqScore, { bpm: 120, preserveChordKindLiterals: true });
  const sqPartIds = sqScore.parts.map((p) => p.id);
  out.push({
    ok:
      sqPipeline.resolvedNotes.length > 0 &&
      sqScore.parts.length >= 4 &&
      ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'].every((id) => sqPartIds.includes(id)) &&
      sqXml.success === true &&
      (sqXml.xml?.length ?? 0) > 0,
    name: 'Barry Harris chord-melody: string_quartet preset exports 4-part MusicXML',
  });

  return out;

}


