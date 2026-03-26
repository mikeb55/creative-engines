/**
 * V3.4 / V3.4b — Key signature inference + MusicXML export wiring.
 */

import {
  inferKeyFromChords,
  minorKeyFifthsForTonicPc,
  parseTonalCenterString,
  resolveKeySignatureForExport,
} from '../core/harmony/keyInference';
import { validateTonalCenterOverride } from '../core/harmony/keyInferenceValidation';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, createScore, addEvent } from '../core/score-model/scoreEventBuilder';

const BB_MINOR_EIGHT = [
  'Bbm9',
  'Gbmaj7/Bb',
  'Eb7(#11)/G',
  'Dbmaj7/F',
  'Ab13/C',
  'E7(#11)/G#',
  'Bbm9/Db',
  'F7alt/A',
];

function testMajorDiatonicInference(): boolean {
  const ch = ['Cmaj7', 'Fmaj7', 'G7', 'Cmaj7'];
  const r = inferKeyFromChords(ch);
  return r.inferredTonicPc === 0 && r.recommendedMode === 'major' && r.confidence > 0.4 && !r.noKeySignatureRecommended;
}

function testMinorInference(): boolean {
  const ch = ['Am7', 'Dm7', 'G7', 'Am7', 'Dm7', 'E7', 'Am7'];
  const r = inferKeyFromChords(ch);
  return r.inferredTonicPc === 9 && r.recommendedMode === 'minor' && r.recommendedFifths === 0;
}

function testSlashBassDoesNotDominate(): boolean {
  const ch = ['Dmin9/F', 'G13', 'Cmaj9', 'A7alt'];
  const r = inferKeyFromChords([ch[0]!, ch[1]!, ch[2]!, ch[3]!]);
  return r.inferredTonicPc !== 5;
}

function testChromaticFallback(): boolean {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G'];
  const ch = roots.map((r) => `${r}7alt`);
  const r = inferKeyFromChords(ch);
  return r.noKeySignatureRecommended === true && r.confidence < 0.2;
}

function testOverrideBeatsInference(): boolean {
  const inf = inferKeyFromChords(['Cmaj7', 'Fmaj7']);
  const res = resolveKeySignatureForExport(inf, { requestMode: 'override', tonalCenterOverride: 'Eb major' });
  return res.metadata.overrideUsed === true && res.export.fifths === -3 && res.export.mode === 'major';
}

function testNoneMode(): boolean {
  const inf = inferKeyFromChords(['Cmaj7']);
  const res = resolveKeySignatureForExport(inf, { requestMode: 'none' });
  return (
    res.export.hideKeySignature === true &&
    res.metadata.noneMode === true &&
    res.metadata.exportKeyWritten === false
  );
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
  const rec = r.context.generationMetadata.keySignatureReceipt;
  return (
    r.success &&
    !!rec &&
    typeof rec.confidence === 'number' &&
    typeof rec.exportKeyWritten === 'boolean' &&
    typeof rec.keySignatureModeApplied === 'string'
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

/** V3.4b — Bb minor / Db major area → 5 flats (not C# +7). */
function testBbMinorProgressionFiveFlats(): boolean {
  const r = inferKeyFromChords(BB_MINOR_EIGHT);
  const res = resolveKeySignatureForExport(r, { requestMode: 'auto' });
  return (
    r.inferredTonicPc === 10 &&
    r.recommendedMode === 'minor' &&
    r.recommendedFifths === -5 &&
    !r.noKeySignatureRecommended &&
    res.export.fifths === -5 &&
    res.export.hideKeySignature === false &&
    res.metadata.exportKeyWritten === true
  );
}

/** D minor: natural minor signature = 1 flat (F major relative). */
function testDMinorOneFlat(): boolean {
  const ch = ['Dm7', 'A7', 'Dm7', 'A7', 'Dm7', 'Gm7', 'A7', 'Dm7'];
  const r = inferKeyFromChords(ch);
  const res = resolveKeySignatureForExport(r, { requestMode: 'auto' });
  return (
    r.inferredTonicPc === 2 &&
    r.recommendedMode === 'minor' &&
    minorKeyFifthsForTonicPc(2) === -1 &&
    res.export.fifths === -1 &&
    res.export.mode === 'minor'
  );
}

function testCMajorZero(): boolean {
  const r = inferKeyFromChords(['Cmaj7', 'Fmaj7', 'G7', 'Cmaj7']);
  const res = resolveKeySignatureForExport(r, { requestMode: 'auto' });
  return r.inferredTonicPc === 0 && res.export.fifths === 0 && res.export.mode === 'major';
}

function testGoldenPathCustomBbXmlFiveFlats(): boolean {
  const text = BB_MINOR_EIGHT.join(' | ');
  const r = runGoldenPath(10000, { chordProgressionText: text, harmonyMode: 'custom' });
  if (!r.success || !r.xml) return false;
  return (
    r.xml.includes('<fifths>-5</fifths>') &&
    r.xml.includes('<mode>minor</mode>') &&
    !r.xml.includes('print-object="no"') &&
    r.context.generationMetadata.keySignatureReceipt?.exportKeyWritten === true
  );
}

/** Clear diatonic progression should not be flagged ambiguous-only. */
function testAmbiguousNotOverused(): boolean {
  const r = inferKeyFromChords(['Cmaj7', 'Fmaj7', 'G7', 'Cmaj7']);
  return r.mode !== 'ambiguous' && r.noKeySignatureRecommended === false;
}

/** V3.4c — low-confidence inference still writes MusicXML key (no hidden C fallback). */
function testV34cWritesKeyWhenInferenceWouldSuppress(): boolean {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G'];
  const ch = roots.map((r) => `${r}7alt`);
  const inf = inferKeyFromChords(ch);
  const res = resolveKeySignatureForExport(inf, { requestMode: 'auto' });
  return (
    inf.noKeySignatureRecommended === true &&
    res.export.hideKeySignature === false &&
    res.metadata.exportKeyWritten === true &&
    res.export.fifths === inf.recommendedFifths &&
    res.export.mode === inf.recommendedMode
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
    ['V3.4b: Bb minor progression → 5 flats', testBbMinorProgressionFiveFlats],
    ['V3.4b: D minor → 1 flat', testDMinorOneFlat],
    ['V3.4b: C major → 0 fifths', testCMajorZero],
    ['V3.4b: golden path custom Bb XML', testGoldenPathCustomBbXmlFiveFlats],
    ['V3.4b: ambiguity not overused (diatonic)', testAmbiguousNotOverused],
    ['V3.4c: write key when inference would suppress (no silent C)', testV34cWritesKeyWhenInferenceWouldSuppress],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
