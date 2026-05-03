/**
 * Real Book–style MusicXML stress tests: import → {@link importLeadSheetFromMusicXml}
 * (including `importedHarmonyTimeline` via {@link parseImportedHarmonyEvent}), UniversalLeadSheet parity,
 * and round-trip export (`exportScoreModelToMusicXml`).
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import {
  buildUniversalLeadSheetFromImportedLeadSheet,
} from '../core/lead-sheet/universalLeadSheetBuilder';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheet } from '../core/lead-sheet/leadSheetTypes';
import { createPart, createRest, createScore } from '../core/score-model/scoreEventBuilder';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

/** Repeat barlines + volta endings + segno / D.S. / to Coda / coda (navigation tags exercise `expandMeasureVisits`). */
const REAL_BOOK_REPEAT_NAV_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>RB Repeat Navigation</work-title></work>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="144"/></direction>
      <barline location="left"><repeat direction="forward"/></barline>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>F</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
      <barline location="right">
        <repeat direction="backward"/>
        <ending number="1" type="start"/>
      </barline>
    </measure>
    <measure number="3">
      <harmony><root><root-step>G</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
      <barline location="right"><ending number="1" type="stop"/></barline>
    </measure>
    <measure number="4">
      <direction><direction-type><segno/></direction-type></direction>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="5">
      <direction><direction-type><words>D.S. al Coda</words></direction-type><sound dalsegno="yes"/></direction>
      <harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="6">
      <direction><direction-type><words>To Coda</words></direction-type><sound tocoda="coda"/></direction>
      <harmony><root><root-step>E</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="7">
      <direction><direction-type><coda/></direction-type></direction>
      <harmony><root><root-step>F</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Mid-song key change (C → D major). */
const REAL_BOOK_KEY_CHANGE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>RB Key Change</work-title></work>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>A</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <attributes>
        <key><fifths>2</fifths><mode>major</mode></key>
      </attributes>
      <harmony><root><root-step>D</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <harmony><root><root-step>E</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Chord symbols on eighth-based rhythm grid (`divisions=8`) + `<harmony>` offsets (beat 1 + beat 3). */
const REAL_BOOK_COMPLEX_RHYTHM_CHORDS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>RB Syncopated Changes</work-title></work>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>8</divisions>
        <key><fifths>-1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony><root><root-step>F</root-step></root><kind text="7">dominant</kind></harmony>
      <harmony><root><root-step>B</root-step></root><kind text="m7">minor-seventh</kind><offset>16</offset></harmony>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Voice 1 melody + voice 2 inner line (voice 2 notes ignored; chords still parsed). */
const REAL_BOOK_MULTI_VOICE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>RB Two Voices</work-title></work>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>F</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>16</duration><voice>2</voice></note>
    </measure>
  </part>
</score-partwise>`;

function chordSymbolAtBarStart(lead: LeadSheet, bar: number): string | undefined {
  const inBar = lead.chordEvents
    .filter((c) => c.bar === bar)
    .sort((a, b) => a.beat - b.beat || a.symbol.localeCompare(b.symbol));
  if (inBar.length > 0) return inBar[0]!.symbol;
  const before = [...lead.chordEvents].filter((c) => c.bar < bar).sort((a, b) => b.bar - a.bar || b.beat - a.beat);
  return before[0]?.symbol;
}

/** No conflicting chord symbols at the same (bar, beat) slot after import dedupe. */
function chordSlotsHaveNoSymbolCollisions(lead: LeadSheet): boolean {
  const slotToSymbol = new Map<string, string>();
  for (const e of lead.chordEvents) {
    const key = `${e.bar}:${e.beat}`;
    const prev = slotToSymbol.get(key);
    if (prev !== undefined && prev !== e.symbol) return false;
    slotToSymbol.set(key, e.symbol);
  }
  for (const sym of slotToSymbol.values()) {
    if (!sym || sym.trim() === '') return false;
  }
  return true;
}

function buildRoundTripScore(lead: LeadSheet, title: string): ScoreModel {
  const beatsPerBar = lead.timeSignature?.beats ?? 4;
  const chordForBar = (barIndex: number) => chordSymbolAtBarStart(lead, barIndex);
  const guitar = createPart(
    'guitar',
    'Electric Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    Math.max(1, lead.totalBars),
    chordForBar,
    () => undefined
  );
  for (const m of guitar.measures) {
    m.events.push(createRest(0, beatsPerBar, 1));
  }
  const score = createScore(title, [guitar], { tempo: lead.tempoBpm ?? 120 });
  if (lead.keySignature) {
    score.keySignature = {
      fifths: lead.keySignature.fifths,
      mode: lead.keySignature.mode === 'minor' ? 'minor' : 'major',
      hideKeySignature: false,
    };
  }
  return score;
}

function roundTripExportSucceeds(lead: LeadSheet, title: string): boolean {
  const xr = exportScoreModelToMusicXml(buildRoundTripScore(lead, title));
  return xr.success === true && (xr.xml?.length ?? 0) > 80 && xr.errors.length === 0;
}

function repeatNavigationStressOk(): boolean {
  const imp = importLeadSheetFromMusicXml(REAL_BOOK_REPEAT_NAV_XML);
  if (!imp.ok || !imp.leadSheet) return false;
  const lead = imp.leadSheet;
  if ((lead.importedHarmonyTimeline?.events.length ?? 0) < 1) return false;
  if (!chordSlotsHaveNoSymbolCollisions(lead)) return false;

  const uni = buildUniversalLeadSheetFromImportedLeadSheet(lead);
  if (uni.source !== 'imported_musicxml') return false;
  const rm = [...uni.repeatMarkers].sort((a, b) => a.bar - b.bar || a.kind.localeCompare(b.kind));
  const kinds = new Set(rm.map((m) => m.kind));
  const hasRepeat =
    kinds.has('repeat_start') &&
    kinds.has('repeat_end') &&
    (kinds.has('ending_start') || kinds.has('ending_stop'));
  if (!hasRepeat || rm.length < 4) return false;

  return roundTripExportSucceeds(lead, uni.title);
}

function keyChangeStressOk(): boolean {
  const imp = importLeadSheetFromMusicXml(REAL_BOOK_KEY_CHANGE_XML);
  if (!imp.ok || !imp.leadSheet) return false;
  const lead = imp.leadSheet;
  const kc = lead.keyChanges ?? [];
  if (kc.length < 2) return false;
  const atThree = kc.find((k) => k.bar === 3 && k.fifths === 2);
  if (!atThree) return false;
  if (!chordSlotsHaveNoSymbolCollisions(lead)) return false;
  if ((lead.importedHarmonyTimeline?.events.length ?? 0) < 2) return false;

  const uni = buildUniversalLeadSheetFromImportedLeadSheet(lead);
  return roundTripExportSucceeds(lead, uni.title);
}

function complexRhythmChordsStressOk(): boolean {
  const imp = importLeadSheetFromMusicXml(REAL_BOOK_COMPLEX_RHYTHM_CHORDS_XML);
  if (!imp.ok || !imp.leadSheet) return false;
  const lead = imp.leadSheet;
  const tl = lead.importedHarmonyTimeline?.events ?? [];
  if (tl.length !== 2) return false;
  const beats = tl.map((e) => e.time.beat).sort((a, b) => a - b);
  if (beats[0] !== 0 || beats[1] !== 2) return false;
  const sameBar = tl.every((e) => e.time.bar === 1);
  if (!sameBar) return false;

  const atBeat2 = lead.chordEvents.filter((c) => c.bar === 1 && Math.abs(c.beat - 2) < 1e-6);
  const atBeat0 = lead.chordEvents.filter((c) => c.bar === 1 && c.beat === 0);
  if (atBeat0.length < 1 || atBeat2.length < 1) return false;
  if (!chordSlotsHaveNoSymbolCollisions(lead)) return false;

  const uni = buildUniversalLeadSheetFromImportedLeadSheet(lead);
  return uni.chordSymbols.length >= 2 && roundTripExportSucceeds(lead, uni.title);
}

function multiVoiceStressOk(): boolean {
  const imp = importLeadSheetFromMusicXml(REAL_BOOK_MULTI_VOICE_XML);
  if (!imp.ok || !imp.leadSheet) return false;
  const lead = imp.leadSheet;
  const warnJoined = imp.warnings.join(' ');
  if (!/multi.?voice|voice-?1/i.test(warnJoined) && !/non-voice-1/i.test(warnJoined)) {
    // Phase 1 warns when skipping voice≠1
    if (!imp.warnings.some((w) => /voice/i.test(w))) return false;
  }
  if (lead.melodyEvents.length < 2) return false;
  const voice1Bars = new Set(lead.melodyEvents.map((e) => e.bar));
  if (!voice1Bars.has(1) || !voice1Bars.has(2)) return false;
  if (!chordSlotsHaveNoSymbolCollisions(lead)) return false;

  const uni = buildUniversalLeadSheetFromImportedLeadSheet(lead);
  return uni.chordSymbols.length >= 2 && roundTripExportSucceeds(lead, uni.title);
}

export function runRealBookStressTests(): { ok: boolean; name: string }[] {
  return [
    {
      ok: repeatNavigationStressOk(),
      name: 'Real Book stress: repeat/volta + segno / D.S. / coda — timeline + repeatMarkers + export',
    },
    {
      ok: keyChangeStressOk(),
      name: 'Real Book stress: mid-score key change — keyChanges + harmony timeline + export',
    },
    {
      ok: complexRhythmChordsStressOk(),
      name: 'Real Book stress: chords on eighth grid + harmony offsets — timeline beats + export',
    },
    {
      ok: multiVoiceStressOk(),
      name: 'Real Book stress: multiple voices — melody retained + chord slots + export',
    },
  ];
}
