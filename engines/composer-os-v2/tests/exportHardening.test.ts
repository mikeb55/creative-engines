/**
 * Composer OS V2 — Export hardening tests
 */

import { validateExportIntegrity } from '../core/export/exportHardening';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testValidExportPasses(): boolean {
  const r = runGoldenPath(70);
  if (!r.xml) return false;
  const result = validateExportIntegrity(r.xml);
  return result.valid;
}

function testMalformedFails(): boolean {
  const result = validateExportIntegrity('<invalid>');
  return !result.valid;
}

function testMissingPartListFails(): boolean {
  const xml = '<?xml?><score-partwise><part id="p1"><measure number="1"/></part></score-partwise>';
  const result = validateExportIntegrity(xml);
  return !result.valid;
}

function testCorruptStructureFails(): boolean {
  const xml = '<score-partwise></score-partwise>';
  const result = validateExportIntegrity(xml);
  return !result.valid;
}

function testExportContainsArticulation(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  const n = createNote(60, 0, 0.5);
  (n as { articulation?: string }).articulation = 'staccato';
  addEvent(m, n);
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const out = exportScoreModelToMusicXml(score);
  return out.success && !!out.xml && out.xml.includes('<staccato');
}

export function runExportHardeningTests(): { name: string; ok: boolean }[] {
  return [
    ['Valid export passes', testValidExportPasses],
    ['Malformed XML fails', testMalformedFails],
    ['Missing part-list fails', testMissingPartListFails],
    ['Corrupt structure fails', testCorruptStructureFails],
    ['Export contains articulation', testExportContainsArticulation],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
