/**
 * Composer OS V2 — Export subsystem tests
 */

import { exportScoreModelToMusicXml, exportToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXmlSchema, reParseMusicXml } from '../core/export/musicxmlValidation';
import { checkSibeliusSafe } from '../core/export/sibeliusSafeProfile';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testMusicXmlExporterReturnsXml(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 4));
  const score = createScore('Minimal', [{
    id: 'p1',
    name: 'Part 1',
    instrumentIdentity: 'guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const r = exportScoreModelToMusicXml(score);
  return r.success && r.xml !== undefined && r.xml.includes('score-partwise');
}

function testSchemaValidationPassesForValid(): boolean {
  const xml = '<?xml?><score-partwise version="3.1"/>';
  const r = validateMusicXmlSchema(xml);
  return r.valid;
}

function testSchemaValidationFailsForInvalid(): boolean {
  const xml = '<?xml?><invalid-root/>';
  const r = validateMusicXmlSchema(xml);
  return !r.valid;
}

function testReParseReturnsResult(): boolean {
  const xml = '<?xml?><score-partwise><part/><measure/></score-partwise>';
  const r = reParseMusicXml(xml);
  return typeof r.valid === 'boolean';
}

function testSibeliusSafePassesForValid(): boolean {
  const xml = '<?xml?><score-partwise/>';
  const r = checkSibeliusSafe(xml);
  return r.safe;
}

function testSibeliusSafeFailsForInvalid(): boolean {
  const xml = '<?xml?><invalid/>';
  const r = checkSibeliusSafe(xml);
  return !r.safe;
}

export function runExportTests(): { name: string; ok: boolean }[] {
  return [
    ['MusicXML exporter returns XML', testMusicXmlExporterReturnsXml],
    ['Schema validation passes for valid', testSchemaValidationPassesForValid],
    ['Schema validation fails for invalid', testSchemaValidationFailsForInvalid],
    ['Re-parse returns result', testReParseReturnsResult],
    ['Sibelius safe passes for valid', testSibeliusSafePassesForValid],
    ['Sibelius safe fails for invalid', testSibeliusSafeFailsForInvalid],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
