/**
 * Universal lead sheet builder.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import type { StyleStack } from '../core/style-modules/styleModuleTypes';
import {
  buildUniversalLeadSheetFromCompositionContext,
  buildUniversalLeadSheetFromImportedLeadSheet,
  buildUniversalLeadSheetFromSongContract,
} from '../core/lead-sheet/universalLeadSheetBuilder';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import { runSongMode } from '../core/song-mode/runSongMode';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';

/** Same shape as `leadSheetMusicXmlImport.test.ts` — two bars, bar 2 has forward+backward repeat barlines. */
const REPEAT_LEAD_SHEET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Simple Lead</work-title></work>
  <identification><creator type="composer">Test Composer</creator></identification>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="120"/></direction>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>F</root-step></root>
        <kind text="7">dominant</kind>
      </harmony>
      <barline location="left"><repeat direction="forward"/></barline>
      <barline location="right"><repeat direction="backward"/></barline>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Shared assertion for smoke + full universalLeadSheet builder suite. */
function importedUniversalRepeatMarkersSmokeOk(): boolean {
  const imp = importLeadSheetFromMusicXml(REPEAT_LEAD_SHEET_XML);
  if (!imp.ok || !imp.leadSheet) return false;
  const uni = buildUniversalLeadSheetFromImportedLeadSheet(imp.leadSheet);
  const leadRm = [...imp.leadSheet.repeatMarkers].sort(
    (a, b) => a.bar - b.bar || a.kind.localeCompare(b.kind)
  );
  const uniRm = [...uni.repeatMarkers].sort((a, b) => a.bar - b.bar || a.kind.localeCompare(b.kind));
  const kindsOk =
    uniRm.some((m) => m.kind === 'repeat_start') && uniRm.some((m) => m.kind === 'repeat_end');
  const parity =
    leadRm.length === uniRm.length &&
    leadRm.every((lm, i) => lm.bar === uniRm[i]!.bar && lm.kind === uniRm[i]!.kind);
  return (
    uni.source === 'imported_musicxml' &&
    kindsOk &&
    parity &&
    uni.repeatMarkers.length >= 2
  );
}

/** Single-row smoke tier — keep in sync with `runSmokeTests.ts` allowlist. */
export function runUniversalLeadSheetRepeatSmokeTests(): { ok: boolean; name: string }[] {
  return [
    {
      ok: importedUniversalRepeatMarkersSmokeOk(),
      name: 'UniversalLeadSheet: MusicXML repeatMarkers → repeat_start/repeat_end + LeadSheet bar/kind parity',
    },
  ];
}

export function runUniversalLeadSheetBuilderTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const stack: StyleStack = { primary: 'barry_harris', weights: { primary: 1 } };
  const gp = runGoldenPath(55_555, {
    presetId: 'guitar_bass_duo',
    styleStack: stack,
  });
  const u = buildUniversalLeadSheetFromCompositionContext(gp.context, 'T');
  out.push({
    ok:
      u.mode === 'duo' &&
      u.chordSymbols.length >= 8 &&
      u.formSections.length >= 1 &&
      u.rehearsalMarks.length >= 1 &&
      Array.isArray(u.repeatMarkers) &&
      u.repeatMarkers.length === 0,
    name: 'universal lead sheet from composition context has chords and form',
  });

  const sm = runSongMode({ seed: 1, title: 'ULS' });
  out.push({
    ok:
      sm.universalLeadSheet.mode === 'song' &&
      sm.universalLeadSheet.formSections.length > 0 &&
      sm.universalLeadSheet.chordSymbols.length > 0 &&
      Array.isArray(sm.universalLeadSheet.repeatMarkers) &&
      sm.universalLeadSheet.repeatMarkers.length === 0,
    name: 'runSongMode exposes universalLeadSheet',
  });

  const fromContract = buildUniversalLeadSheetFromSongContract(sm.leadSheetContract);
  out.push({
    ok:
      fromContract.title === sm.leadSheetContract.title &&
      fromContract.source === 'song_lead_sheet' &&
      fromContract.repeatMarkers.length === 0,
    name: 'buildUniversalLeadSheetFromSongContract matches contract',
  });

  out.push({
    ok: importedUniversalRepeatMarkersSmokeOk(),
    name: 'buildUniversalLeadSheetFromImportedLeadSheet maps repeatMarkers (repeat_start + repeat_end, bars match LeadSheet)',
  });

  const bb = runBigBandMode({ seed: 101, title: 'ULS BB' });
  out.push({
    ok:
      bb.universalLeadSheet?.mode === 'big_band' &&
      bb.universalLeadSheet.source === 'big_band_plan' &&
      (bb.universalLeadSheet.sectionLabels?.length ?? 0) > 0 &&
      bb.universalLeadSheet.repeatMarkers.length === 0,
    name: 'runBigBandMode exposes universalLeadSheet planning contract',
  });

  const sq = runStringQuartetMode({ seed: 202, title: 'ULS SQ' });
  out.push({
    ok:
      sq.universalLeadSheet?.mode === 'quartet' &&
      sq.universalLeadSheet.source === 'quartet_plan' &&
      sq.universalLeadSheet.repeatMarkers.length === 0,
    name: 'runStringQuartetMode exposes universalLeadSheet planning contract',
  });

  return out;
}
