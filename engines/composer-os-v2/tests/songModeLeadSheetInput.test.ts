import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import { applySingleLineImportedExpressionConnectionNudges } from '../core/goldenPath/generateGoldenPathDuoScore';
import { normalizeChordToken } from '../core/harmony/chordProgressionParser';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';

const DONALD_FAGEN_LEADSHEET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Fagen LeadSheet Slice</work-title></work>
  <identification><creator type="composer">Test Composer</creator></identification>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>D</root-step></root><kind text="m9">minor-ninth</kind></harmony>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>G</root-step></root><kind text="13">dominant-13th</kind></harmony>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>C</root-step></root><kind text="maj9">major-ninth</kind></harmony>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="4">
      <harmony><root><root-step>A</root-step></root><kind text="7alt">dominant</kind></harmony>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="5">
      <harmony><root><root-step>D</root-step></root><kind text="m9">minor-ninth</kind></harmony>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="6">
      <harmony><root><root-step>G</root-step></root><kind text="13">dominant-13th</kind></harmony>
      <note><pitch><step>B</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="7">
      <harmony><root><root-step>C</root-step></root><kind text="maj9">major-ninth</kind></harmony>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="8">
      <harmony><root><root-step>A</root-step></root><kind text="7alt">dominant</kind></harmony>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

const MELODY_ONLY_EXPRESSION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><direction-type><wedge type="crescendo"/></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><tie type="start"/><notations><tied type="start"/></notations></note>
    </measure>
    <measure number="2">
      <direction><direction-type><wedge type="stop"/></direction-type></direction>
      <direction><direction-type><words>rit.</words></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><tie type="stop"/><notations><tied type="stop"/><fermata/></notations></note>
    </measure>
  </part>
</score-partwise>`;

function parseFirstPitchMidiFromMusicXml(xml: string): number | null {
  const pitchMatch = xml.match(
    /<note>[\s\S]*?<pitch>\s*<step>([A-G])<\/step>(?:\s*<alter>(-?\d+)<\/alter>)?\s*<octave>(\d+)<\/octave>[\s\S]*?<\/pitch>[\s\S]*?<\/note>/
  );
  if (!pitchMatch) return null;
  const step = pitchMatch[1] ?? 'C';
  const alter = Number.parseInt(pitchMatch[2] ?? '0', 10) || 0;
  const octave = Number.parseInt(pitchMatch[3] ?? '4', 10) || 4;
  const pcBase =
    step === 'C' ? 0 : step === 'D' ? 2 : step === 'E' ? 4 : step === 'F' ? 5 : step === 'G' ? 7 : step === 'A' ? 9 : 11;
  return (octave + 1) * 12 + pcBase + alter;
}

function leadSheetExpressionStrengthOf(result: ReturnType<typeof runAppGeneration>): number {
  return result.runManifest?.songModeLeadSheetExpressionStrength ?? 0;
}

export function runSongModeLeadSheetInputTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-leadsheet-'));
  try {
    const fagen = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 66021,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
      },
      tmp
    );
    const expectedBars = ['Dm9', 'G13', 'Cmaj9', 'A7alt'];
    const harmonyLocked = expectedBars.every(
      (c, i) => normalizeChordToken(fagen.parsedCustomProgressionBars?.[i] ?? '') === normalizeChordToken(c)
    );
    out.push({
      ok: fagen.success === true && harmonyLocked,
      name: 'Donald Fagen Song Mode uses LeadSheet-derived locked harmony bars',
    });

    const firstMidi = fagen.xml ? parseFirstPitchMidiFromMusicXml(fagen.xml) : null;
    out.push({
      ok:
        firstMidi !== null &&
        fagen.runManifest?.songModeLeadSheetAnchorStartApplied === true &&
        fagen.runManifest?.songModeLeadSheetInputApplied === true,
      name: 'Donald Fagen Song Mode applies LeadSheet melody-anchor guidance on bar 1',
    });

    const baseline = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 66021,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
      },
      tmp
    );
    out.push({
      ok:
        baseline.success === true &&
        baseline.runManifest?.songModeLeadSheetInputApplied !== true &&
        baseline.runManifest?.songModeLeadSheetAnchorStartApplied !== true,
      name: 'Donald Fagen Song Mode without LeadSheet remains baseline (LeadSheet guidance disabled)',
    });

    const nonTarget = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 55011,
        totalBars: 32,
        /** Control writer — must stay outside `SONG_MODE_LEADSHEET_PHASE1_WRITERS` (phase 3 includes Radiohead). */
        primarySongwriterStyle: 'sonic_youth',
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
      },
      tmp
    );
    const notApplied =
      normalizeChordToken(nonTarget.parsedCustomProgressionBars?.[0] ?? '') !== normalizeChordToken('Dm9');
    out.push({
      ok: nonTarget.success === true && notApplied,
      name: 'Non-target Song Mode writer ignores LeadSheet input slice',
    });

    const barry = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 77021,
        totalBars: 32,
        primarySongwriterStyle: 'barry_harris',
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
      },
      tmp
    );
    const barryHarmonyLocked = expectedBars.every(
      (c, i) => normalizeChordToken(barry.parsedCustomProgressionBars?.[i] ?? '') === normalizeChordToken(c)
    );
    out.push({
      ok:
        barry.success === true &&
        barryHarmonyLocked &&
        barry.runManifest?.songModeLeadSheetInputApplied === true &&
        barry.runManifest?.songModeLeadSheetAnchorStartApplied === true,
      name: 'Barry Harris Song Mode applies LeadSheet harmony lock and bounded anchor-start guidance',
    });

    const deterministicA = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 77121,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
      },
      tmp
    );
    const deterministicB = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 77121,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
      },
      tmp
    );
    out.push({
      ok:
        deterministicA.success === true &&
        deterministicB.success === true &&
        JSON.stringify(deterministicA.parsedCustomProgressionBars ?? []) ===
          JSON.stringify(deterministicB.parsedCustomProgressionBars ?? []) &&
        deterministicA.runManifest?.songModeLeadSheetInputApplied === true &&
        deterministicB.runManifest?.songModeLeadSheetInputApplied === true,
      name: 'Song Mode LeadSheet import remains deterministic for same seed/input XML (Stage 1 no-output-change guard)',
    });

    const duoImport = runAppGeneration(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 46021,
        totalBars: 8,
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
        leadSheetPerformanceBlend: 0.8,
      },
      tmp
    );
    out.push({
      ok:
        duoImport.success === true &&
        duoImport.runManifest?.songModeLeadSheetInputApplied === true,
      name: 'Guitar-Bass Duo applies guarded import-backed phrase behavior from MusicXML anchors',
    });

    const ecmImport = runAppGeneration(
      {
        presetId: 'ecm_chamber',
        styleStack: { primary: 'metheny', weights: { primary: 1 } },
        seed: 46022,
        totalBars: 16,
        songModeLeadSheetMusicXml: DONALD_FAGEN_LEADSHEET_XML,
        leadSheetPerformanceBlend: 0.8,
      },
      tmp
    );
    out.push({
      ok: ecmImport.success === true && ecmImport.runManifest?.songModeLeadSheetInputApplied === true,
      name: 'ECM Chamber applies guarded import-backed phrase behavior from MusicXML anchors',
    });

    const songModeCatStevensProxyLow = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 88110,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: MELODY_ONLY_EXPRESSION_XML,
        leadSheetPerformanceBlend: 0.3,
      },
      tmp
    );
    const songModeCatStevensProxyMid = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 88110,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: MELODY_ONLY_EXPRESSION_XML,
        leadSheetPerformanceBlend: 0.55,
      },
      tmp
    );
    const songModeCatStevensProxyHigh = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 88110,
        totalBars: 32,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: MELODY_ONLY_EXPRESSION_XML,
        leadSheetPerformanceBlend: 0.85,
      },
      tmp
    );
    out.push({
      ok:
        songModeCatStevensProxyLow.success === true &&
        songModeCatStevensProxyMid.success === true &&
        songModeCatStevensProxyHigh.success === true &&
        songModeCatStevensProxyLow.runManifest?.songModeLeadSheetInputApplied === true &&
        leadSheetExpressionStrengthOf(songModeCatStevensProxyLow) <
          leadSheetExpressionStrengthOf(songModeCatStevensProxyMid) &&
        leadSheetExpressionStrengthOf(songModeCatStevensProxyMid) <
          leadSheetExpressionStrengthOf(songModeCatStevensProxyHigh),
      name: 'Song Mode melody-only import still activates expression and blend strength rises low->mid->high',
    });

    const blendPresets = [
      { presetId: 'guitar_bass_duo' as const, styleStack: { primary: 'barry_harris', weights: { primary: 1 } }, totalBars: 8 },
      {
        presetId: 'guitar_bass_duo_single_line' as const,
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        totalBars: 8,
      },
      { presetId: 'ecm_chamber' as const, styleStack: { primary: 'metheny', weights: { primary: 1 } }, totalBars: 16 },
    ];
    for (const p of blendPresets) {
      const low = runAppGeneration(
        {
          presetId: p.presetId,
          styleStack: p.styleStack,
          seed: 99331,
          totalBars: p.totalBars,
          songModeLeadSheetMusicXml: MELODY_ONLY_EXPRESSION_XML,
          leadSheetPerformanceBlend: 0.3,
        },
        tmp
      );
      const mid = runAppGeneration(
        {
          presetId: p.presetId,
          styleStack: p.styleStack,
          seed: 99331,
          totalBars: p.totalBars,
          songModeLeadSheetMusicXml: MELODY_ONLY_EXPRESSION_XML,
          leadSheetPerformanceBlend: 0.55,
        },
        tmp
      );
      const high = runAppGeneration(
        {
          presetId: p.presetId,
          styleStack: p.styleStack,
          seed: 99331,
          totalBars: p.totalBars,
          songModeLeadSheetMusicXml: MELODY_ONLY_EXPRESSION_XML,
          leadSheetPerformanceBlend: 0.85,
        },
        tmp
      );
      out.push({
        ok:
          low.success === true &&
          mid.success === true &&
          high.success === true &&
          low.runManifest?.songModeLeadSheetInputApplied === true &&
          leadSheetExpressionStrengthOf(low) < leadSheetExpressionStrengthOf(mid) &&
          leadSheetExpressionStrengthOf(mid) < leadSheetExpressionStrengthOf(high),
        name: `${p.presetId} expression strength rises low->mid->high on melody-only import`,
      });
    }

    const basePart = {
      id: 'guitar',
      name: 'Clean Electric Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble' as const,
      measures: [
        {
          index: 1,
          chord: 'Cmaj7',
          events: [
            { kind: 'note' as const, pitch: 60, startBeat: 0, duration: 1, voice: 1, velocity: 80 },
            { kind: 'note' as const, pitch: 62, startBeat: 2, duration: 1, voice: 1, velocity: 80 },
          ],
        },
      ],
    };
    const mkContext = (strength: number) =>
      ({
        presetId: 'guitar_bass_duo_single_line',
        generationMetadata: {
          songModeLeadSheetInputApplied: true,
          songModeLeadSheetExpressionStrength: strength,
          songModeLeadSheetMelodyAnchors: [{ bar: 1, midi: 60, velocityHint: 92, connectionHint: 0.8 }],
        },
      }) as any;
    const lowPart = JSON.parse(JSON.stringify(basePart));
    const midPart = JSON.parse(JSON.stringify(basePart));
    const highPart = JSON.parse(JSON.stringify(basePart));
    applySingleLineImportedExpressionConnectionNudges(lowPart, mkContext(0.405));
    applySingleLineImportedExpressionConnectionNudges(midPart, mkContext(0.618));
    applySingleLineImportedExpressionConnectionNudges(highPart, mkContext(0.83));
    const cLow = (((lowPart.measures[0].events[0] as NoteEvent).duration + (lowPart.measures[0].events[1] as NoteEvent).duration) / 2);
    const cMid = (((midPart.measures[0].events[0] as NoteEvent).duration + (midPart.measures[0].events[1] as NoteEvent).duration) / 2);
    const cHigh = (((highPart.measures[0].events[0] as NoteEvent).duration + (highPart.measures[0].events[1] as NoteEvent).duration) / 2);
    out.push({
      ok: cLow <= cMid + 1e-6 && cMid <= cHigh + 1e-6 && cHigh - cLow >= 0.01,
      name: 'single-line imported expression nudge increases duration low->mid->high',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `Song Mode LeadSheet input slice: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  return out;
}

