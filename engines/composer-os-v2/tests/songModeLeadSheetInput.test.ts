import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import { normalizeChordToken } from '../core/harmony/chordProgressionParser';

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
        primarySongwriterStyle: 'bacharach',
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

