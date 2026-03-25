/**
 * Correctness gates: bar math, MusicXML round-trip, bass identity, path resolution, receipt honesty.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { resolveOpenFolderTarget } from '../app-api/composerOsOutputPaths';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { validateGuitarBassDuoBassIdentityInMusicXml } from '../core/export/validateBassIdentityInMusicXml';
import { applyPerformancePass } from '../core/performance/performancePass';
import { GUITAR_BASS_DUO_BASS_PART_NAME } from '../core/instrument-profiles/guitarBassDuoExportNames';

function testResolveOpenFolderCanonicalRoot(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-canonical-'));
  const r = resolveOpenFolderTarget(root, {});
  return r.ok && path.resolve(r.target) === path.resolve(root);
}

function testResolveOpenFolderSubfolder(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-canonical-'));
  const sub = path.join(root, 'Guitar-Bass Duos');
  fs.mkdirSync(sub, { recursive: true });
  const r = resolveOpenFolderTarget(root, { path: sub });
  return r.ok && path.resolve(r.target) === path.resolve(sub);
}

function testResolveOpenFolderOutsideRejected(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-canonical-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
  const r = resolveOpenFolderTarget(root, { path: outside });
  return !r.ok;
}

function testStrictBarMathGoodMeasure(): boolean {
  const m = createMeasure(1, 'Dmin9', 'A');
  addEvent(m, createNote(60, 0, 4));
  const part: PartModel = {
    id: 't',
    name: 'T',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
  const score = createScore('T', [part], {});
  const r = validateStrictBarMath(score);
  return r.valid;
}

function testStrictBarMathUnderfilledFails(): boolean {
  const m = createMeasure(1, 'Dmin9', undefined);
  addEvent(m, createNote(60, 0, 2));
  const part: PartModel = {
    id: 't',
    name: 'T',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
  const score = createScore('T', [part], {});
  const r = validateStrictBarMath(score);
  return !r.valid;
}

function testStrictBarMathOverlapFails(): boolean {
  const m = createMeasure(1, 'Dmin9', undefined);
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(62, 0, 2));
  const part: PartModel = {
    id: 't',
    name: 'T',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
  const score = createScore('T', [part], {});
  const r = validateStrictBarMath(score);
  return !r.valid;
}

function testGoldenPathPassesStrictAndRoundTripAndBass(): boolean {
  const r = runGoldenPath(4242);
  if (!r.xml) return false;
  if (!r.strictBarMathPassed || !r.exportRoundTripPassed || !r.instrumentMetadataPassed) return false;
  const mx = validateExportedMusicXmlBarMath(r.xml);
  const bass = validateGuitarBassDuoBassIdentityInMusicXml(r.xml);
  if (!mx.valid || !bass.valid) return false;
  if (!r.xml.includes('<midi-program>33</midi-program>')) return false;
  if (!r.xml.includes(GUITAR_BASS_DUO_BASS_PART_NAME)) return false;
  return r.success === true;
}

function testPerformancePassPreservesTiming(): boolean {
  const r = runGoldenPath(777);
  const before = JSON.stringify(
    r.score.parts.map((p) => p.measures.map((m) => m.events.map((e) => ({ d: e.duration, s: e.startBeat }))))
  );
  const after = applyPerformancePass(r.score);
  const afterJson = JSON.stringify(
    after.parts.map((p) => p.measures.map((m) => m.events.map((e) => ({ d: e.duration, s: e.startBeat }))))
  );
  return before === afterJson;
}

function testInvalidBarMathIsDetectable(): boolean {
  const m = createMeasure(1, 'Dmin9', undefined);
  addEvent(m, createNote(60, 0, 1));
  const badPart: PartModel = {
    id: 't',
    name: 'T',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
  const badScore = createScore('Bad', [badPart], {});
  return !validateStrictBarMath(badScore).valid;
}

function testExportedXmlRoundTripMatchesExporter(): boolean {
  const r = runGoldenPath(111);
  if (!r.xml) return false;
  const ex = exportScoreModelToMusicXml(r.score);
  if (!ex.success || !ex.xml) return false;
  const v = validateExportedMusicXmlBarMath(ex.xml);
  return v.valid;
}

/** Stress default duo stack + Bacharach primary across seeds — catches bar-math / round-trip drift. */
function testMultiSeedDuoPassesStrictGates(): boolean {
  for (let s = 0; s < 24; s++) {
    const r = runGoldenPath(s);
    if (
      !r.success ||
      !r.strictBarMathPassed ||
      !r.exportRoundTripPassed ||
      !r.instrumentMetadataPassed
    ) {
      return false;
    }
  }
  for (let s = 0; s < 12; s++) {
    const r = runGoldenPath(s, {
      styleStack: { primary: 'bacharach', weights: { primary: 1 } },
    });
    if (
      !r.success ||
      !r.strictBarMathPassed ||
      !r.exportRoundTripPassed ||
      !r.instrumentMetadataPassed
    ) {
      return false;
    }
  }
  return true;
}

/** Harmony kind text must be suffix-only (no D+Dmin9 in one attribute). */
function testExportedHarmonyKindTextNoDuplicateRoot(): boolean {
  const r = runGoldenPath(5);
  if (!r.xml || !r.success) return false;
  if (r.xml.includes('kind text="Dmin9"') || r.xml.includes('kind text="G13"') || r.xml.includes('kind text="A7alt"'))
    return false;
  if (!r.xml.includes('kind text="min9"')) return false;
  const mx = validateExportedMusicXmlBarMath(r.xml);
  if (!mx.valid) return false;
  return mx.sums?.['guitar']?.[2]?.[1] === 16;
}

export function runCorrectnessGatesTests(): { name: string; ok: boolean }[] {
  return [
    ['resolveOpenFolderTarget: library root', testResolveOpenFolderCanonicalRoot],
    ['resolveOpenFolderTarget: preset subfolder', testResolveOpenFolderSubfolder],
    ['resolveOpenFolderTarget: outside tree rejected', testResolveOpenFolderOutsideRejected],
    ['strict bar math: valid measure', testStrictBarMathGoodMeasure],
    ['strict bar math: underfilled fails', testStrictBarMathUnderfilledFails],
    ['strict bar math: overlap fails', testStrictBarMathOverlapFails],
    ['golden path: strict + round-trip + bass + success', testGoldenPathPassesStrictAndRoundTripAndBass],
    ['performance pass: durations unchanged', testPerformancePassPreservesTiming],
    ['strict bar math: invalid measure rejected for receipt', testInvalidBarMathIsDetectable],
    ['export round-trip: exporter output validates', testExportedXmlRoundTripMatchesExporter],
    ['multi-seed duo: strict bar math + round-trip + bass (default + Bacharach)', testMultiSeedDuoPassesStrictGates],
    ['exported harmony kind text: suffix only + guitar m2 divisions', testExportedHarmonyKindTextNoDuplicateRoot],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
