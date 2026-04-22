import * as fs from 'fs';
import * as path from 'path';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import {
  applyLeadSheetPerformanceRendering,
  DEFAULT_LEADSHEET_PERFORMANCE_BLEND,
} from '../core/lead-sheet/leadSheetPerformanceRendering';
import { extractScoreMusicXmlFromUint8Array } from '../core/lead-sheet/musicXmlScoreInput';

const STACCATO_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>L</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration><voice>1</voice>
        <notations><articulations><staccato/></articulations></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;

function repoRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

function loadSampleBytes(rel: string): Uint8Array {
  const full = path.join(repoRoot(), rel);
  const buf = fs.readFileSync(full);
  return new Uint8Array(buf);
}

function testStaccatoShortens(): boolean {
  const r = importLeadSheetFromMusicXml(STACCATO_XML);
  if (!r.ok || !r.leadSheet) return false;
  const before = r.leadSheet.melodyEvents[0]?.durationBeats ?? 0;
  const after = applyLeadSheetPerformanceRendering(r.leadSheet, { blendTowardImported: 1 }).melodyEvents[0]?.durationBeats ?? 0;
  return before > after + 1e-6 && after > 0.05;
}

function testDefaultBlendConstant(): boolean {
  return DEFAULT_LEADSHEET_PERFORMANCE_BLEND >= 0 && DEFAULT_LEADSHEET_PERFORMANCE_BLEND <= 1;
}

/**
 * Smoke: compressed `.mxl` → extract → import → performance shaping yields melody output.
 * (Avoids committing paired “NOT.musicxml” reference exports from another tool.)
 */
function testMxlSamplePerformanceSmoke(originalRel: string, minMelody: number): boolean {
  const origBytes = loadSampleBytes(originalRel);
  const exO = extractScoreMusicXmlFromUint8Array(origBytes);
  if (!exO.ok || !exO.xml) return false;
  const io = importLeadSheetFromMusicXml(exO.xml);
  if (!io.ok || !io.leadSheet) return false;
  const shapedO = applyLeadSheetPerformanceRendering(io.leadSheet, { blendTowardImported: 0.65 });
  return shapedO.melodyEvents.length >= minMelody;
}

export function runLeadSheetPerformanceRenderingTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: testDefaultBlendConstant(),
    name: 'lead sheet performance: default blend in 0–1',
  });
  out.push({
    ok: testStaccatoShortens(),
    name: 'lead sheet performance: staccato shortens duration when blend=1',
  });

  try {
    out.push({
      ok: testMxlSamplePerformanceSmoke(path.join('Sample MIDI 2 Musicxml tracks', 'cat-stevens-father-and-son.mxl'), 4),
      name: 'lead sheet performance smoke: cat-stevens `.mxl` unpack → import → shaping',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `lead sheet performance smoke cat-stevens: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  try {
    out.push({
      ok: testMxlSamplePerformanceSmoke(
        path.join(
          'Sample MIDI 2 Musicxml tracks',
          'here-comes-the-sun-the-beatles-here-comes-the-sun-piano-solo-the-beatles.mxl'
        ),
        8
      ),
      name: 'lead sheet performance smoke: here-comes-the-sun `.mxl` (long piano reduction)',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `lead sheet performance smoke here-comes-the-sun: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return out;
}
