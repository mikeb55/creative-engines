/**
 * Greek rhythm → MusicXML (Sibelius drum kit metadata). Not in `runSmokeTests.ts` allowlist.
 */

import { exportGreekRhythmToMusicXml } from '../core/rhythm/greekRhythmMusicXmlExporter';
import { getGreekRebetikoPresetById } from '../core/rhythm/greekRebetikoRhythmPresets';

export function runGreekRhythmMusicXmlExporterTests(): { name: string; ok: boolean }[] {
  const rows: { name: string; ok: boolean }[] = [];
  const preset = getGreekRebetikoPresetById('hasapiko_4_4');
  if (!preset) {
    rows.push({ name: 'Greek rhythm XML: preset hasapiko_4_4 exists', ok: false });
    return rows;
  }
  const xml = exportGreekRhythmToMusicXml(preset, 1);

  const checks: [string, boolean][] = [
    ['<instrument-sound>drum.kit</instrument-sound>', xml.includes('<instrument-sound>drum.kit</instrument-sound>')],
    ['<midi-channel>10</midi-channel>', xml.includes('<midi-channel>10</midi-channel>')],
    ['<midi-program>1</midi-program>', xml.includes('<midi-program>1</midi-program>')],
    ['<volume>78.7402</volume>', xml.includes('<volume>78.7402</volume>')],
  ];

  for (const [label, ok] of checks) {
    rows.push({ name: `Greek rhythm XML contains ${label}`, ok });
  }
  return rows;
}
