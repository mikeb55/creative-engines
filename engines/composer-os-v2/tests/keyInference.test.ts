/**
 * V3.4 — Key signature inference + export metadata.
 */

import { inferKeyFromChords, parseTonalCenterString, resolveKeySignatureForExport } from '../core/harmony/keyInference';
import { validateTonalCenterOverride } from '../core/harmony/keyInferenceValidation';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, createScore, addEvent } from '../core/score-model/scoreEventBuilder';

function testMajorDiatonicInference(): boolean {
  const ch = ['Cmaj7', 'Fmaj7', 'G7', 'Cmaj7'];
  const r = inferKeyFromChords(ch);
  return r.inferredTonicPc === 0 && r.recommendedMode === 'major' && r.confidence > 0.4 && !r.noKeySignatureRecommended;
}

function testMinorInference(): boolean {
  const ch = ['Am7', 'Dm7', 'G7', 'Am7', 'Dm7', 'E7', 'Am7'];
  const r = inferKeyFromChords(ch);
  return r.inferredTonicPc === 9 && r.recommendedMode === 'minor';
}

function testSlashBassDoesNotDominate(): boolean {
  const ch = ['Dmin9/F', 'G13', 'Cmaj9', 'A7alt'];
  const r = inferKeyFromChords([ch[0]!, ch[1]!, ch[2]!, ch[3]!]);
  return r.inferredTonicPc !== 5;
}

function testChromaticFallback(): boolean {
  const ch = ['C7alt', 'F#7alt', 'B7alt', 'E7alt', 'A7alt', 'D7alt', 'G7alt', 'C7alt'];
  const r = inferKeyFromChords(ch);
  return r.noKeySignatureRecommended === true;
}

function testOverrideBeatsInference(): boolean {
  const inf = inferKeyFromChords(['Cmaj7', 'Fmaj7']);
  const res = resolveKeySignatureForExport(inf, { requestMode: 'override', tonalCenterOverride: 'Eb major' });
  return res.metadata.overrideUsed === true && res.export.fifths === -3 && res.export.mode === 'major';
}

function testNoneMode(): boolean {
  const inf = inferKeyFromChords(['Cmaj7']);
  const res = resolveKeySignatureForExport(inf, { requestMode: 'none' });
  return res.export.hideKeySignature === true && res.metadata.noneMode === true;
}

function testMusicXmlContainsFifths(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 4));
  const score = createScore('K', [
    { id: 'g', name: 'Guitar', instrumentIdentity: 'clean_electric_guitar', midiProgram: 27, clef: 'treble', measures: [m] },
  ]);
  score.keySignature = { fifths: -2, mode: 'major', hideKeySignature: false };
  const r = exportScoreModelToMusicXml(score);
  const xml = r.xml ?? '';
  return r.success && xml.includes('<fifths>-2</fifths>') && xml.includes('<mode>major</mode>');
}

function testMusicXmlHideKeyPrintObject(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 4));
  const score = createScore('K', [
    { id: 'g', name: 'Guitar', instrumentIdentity: 'clean_electric_guitar', midiProgram: 27, clef: 'treble', measures: [m] },
  ]);
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: true, caption: 'test' };
  const r = exportScoreModelToMusicXml(score);
  const xml = r.xml ?? '';
  return r.success && xml.includes('print-object="no"') && xml.includes('<fifths>0</fifths>');
}

function testGoldenPathHasReceipt(): boolean {
  const r = runGoldenPath(12001);
  return (
    r.success &&
    !!r.context.generationMetadata.keySignatureReceipt &&
    typeof r.context.generationMetadata.keySignatureReceipt?.confidence === 'number'
  );
}

function testParseTonalCenter(): boolean {
  return (
    parseTonalCenterString('Bb')?.tonicPc === 10 &&
    parseTonalCenterString('F# minor')?.mode === 'minor' &&
    validateTonalCenterOverride('Eb major').valid === true &&
    validateTonalCenterOverride('').valid === false
  );
}

export function runKeyInferenceTests(): { name: string; ok: boolean }[] {
  return [
    ['Key inference: diatonic major', testMajorDiatonicInference],
    ['Key inference: minor', testMinorInference],
    ['Key inference: slash bass', testSlashBassDoesNotDominate],
    ['Key inference: chromatic fallback', testChromaticFallback],
    ['Key signature: override', testOverrideBeatsInference],
    ['Key signature: none mode', testNoneMode],
    ['MusicXML: fifths in export', testMusicXmlContainsFifths],
    ['MusicXML: hide key print-object', testMusicXmlHideKeyPrintObject],
    ['Golden path: key receipt', testGoldenPathHasReceipt],
    ['Key: parse / validate tonal centre', testParseTonalCenter],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
