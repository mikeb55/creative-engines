/**
 * Song Mode → golden-path MusicXML (app generation entry).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import { normalizeChordToken, parseChordProgressionInputWithBarCount } from '../core/harmony/chordProgressionParser';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';
import { validateLockedHarmonyMusicXmlTruthFromFile } from '../core/export/validateLockedHarmonyMusicXml';

const SONG_MODE_32_BAR_REGRESSION =
  'Cmaj9 | E7(#11)/G# | Am9 | D7(b9) | G13 | Dbmaj7(#11) | Cmaj9/E | A7alt | ' +
  'Dm9 | G7(b13) | Em7 | A7(#11) | Dmaj9 | Bb13 | Ebmaj9/G | Ab7(#11) | ' +
  'G13 | B7(#9) | Em9 | A13 | Dmaj9/F# | F7(#11) | Bbmaj9 | Eb13 | ' +
  'Abmaj9 | Db13 | Gbmaj9 | B7alt | Em9 | A7 | Dmaj9 | G13';

const LOCK_HARMONY_TIMELINE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>G</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const LOCK_HARMONY_NO_TIMELINE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

export function runSongModeMusicXmlTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-mx-'));
  try {
    const result = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 4242,
        title: 'Song Mode MX smoke',
      },
      dir
    );
    const hasMx =
      !!result.filepath &&
      result.filepath.endsWith('.musicxml') &&
      fs.existsSync(result.filepath);
    const parseErr = result.validation?.errors?.some((e) =>
      e.toLowerCase().includes('songwriting research parse failed')
    );
    const ok =
      !!result.success &&
      hasMx &&
      result.productKind === 'musicxml' &&
      !parseErr &&
      !!result.validation?.strictBarMathPassed &&
      !!result.validation?.exportIntegrityPassed;
    out.push({
      ok,
      name: 'Song Mode runAppGeneration writes .musicxml and passes duo validation gates',
    });
    if (ok) {
      console.log('PASSED! – Mike!!');
    } else {
      console.log('Not yet – FAIL');
    }
  } catch (e) {
    out.push({
      ok: false,
      name: `Song Mode MusicXML: ${e instanceof Error ? e.message : String(e)}`,
    });
    console.log('Not yet – FAIL');
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-lock32-'));
  try {
    const parsed = parseChordProgressionInputWithBarCount(SONG_MODE_32_BAR_REGRESSION, 32);
    const r = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 93002,
        title: 'Song Mode locked 32',
        chordProgressionText: SONG_MODE_32_BAR_REGRESSION,
        harmonyMode: 'custom_locked',
        totalBars: 32,
        longFormEnabled: true,
      },
      dir2
    );
    let ok2 = false;
    /** Harmony path can succeed while Song Mode compile validation fails — assert locked harmony + MusicXML only */
    if (parsed.ok && r.filepath && fs.existsSync(r.filepath) && r.parsedCustomProgressionBars?.length === 32) {
      const disk = validateLockedHarmonyMusicXmlTruthFromFile(r.filepath, parsed.bars);
      const xml = fs.readFileSync(r.filepath, 'utf-8');
      const harm = extractHarmoniesFromFirstPartXml(xml);
      let barsMatch = disk.ok;
      for (let b = 1; b <= 32; b++) {
        const h = harm.get(b);
        if (!h || normalizeChordToken(h) !== normalizeChordToken(parsed.bars[b - 1] ?? '')) {
          barsMatch = false;
          break;
        }
      }
      ok2 =
        barsMatch &&
        r.customHarmonyMusicXmlTruthPassed === true &&
        r.parsedCustomProgressionBars[0] === 'Cmaj9' &&
        r.builtInHarmonyFallbackOccurred !== true;
    }
    out.push({
      ok: ok2,
      name: 'Song Mode: pasted 32-bar custom_locked matches score + MusicXML bar-for-bar (regression progression)',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `Song Mode locked 32: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    try {
      fs.rmSync(dir2, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-harmony-meta-'));
  try {
    const r = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 93003,
        title: 'Song Mode harmony metadata',
        importHarmonyMode: 'blend_harmony',
        harmonyBlend: 1.4,
      },
      dir3
    );
    const ok3 =
      r.success === true &&
      r.runManifest?.importHarmonyMode === 'blend_harmony' &&
      r.runManifest?.importHarmonyModeSource === 'explicit' &&
      r.runManifest?.harmonyBlendRaw === 1;
    out.push({
      ok: ok3,
      name: 'Song Mode: import harmony mode + harmonyBlendRaw propagate to run manifest',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `Song Mode harmony metadata: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    try {
      fs.rmSync(dir3, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const dir4 = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-lock-harmony-success-'));
  try {
    const r = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 93004,
        totalBars: 32,
        primarySongwriterStyle: 'wayne_shorter',
        importHarmonyMode: 'lock_harmony',
        songModeLeadSheetMusicXml: LOCK_HARMONY_TIMELINE_XML,
      },
      dir4
    );
    let ok4 = false;
    if (r.success && r.filepath && fs.existsSync(r.filepath)) {
      const harm = extractHarmoniesFromFirstPartXml(fs.readFileSync(r.filepath, 'utf-8'));
      const expectedFirstEight = ['Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7'];
      ok4 =
        expectedFirstEight.every((ch, idx) => normalizeChordToken(harm.get(idx + 1) ?? '') === normalizeChordToken(ch)) &&
        r.runManifest?.importHarmonyLockApplied === true &&
        (r.runManifest?.importHarmonyLockedBarsCount ?? 0) > 0 &&
        r.runManifest?.importHarmonyLockFallbackReason === undefined;
    }
    out.push({
      ok: ok4,
      name: 'Song Mode: lock_harmony uses imported timeline progression and records lock telemetry',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `Song Mode lock_harmony success: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    try {
      fs.rmSync(dir4, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const dir5 = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-lock-harmony-fallback-'));
  try {
    const baseReq = {
      presetId: 'song_mode',
      styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
      seed: 93005,
      totalBars: 32,
      primarySongwriterStyle: 'wayne_shorter',
      songModeLeadSheetMusicXml: LOCK_HARMONY_NO_TIMELINE_XML,
    } as const;
    const baseline = runAppGeneration(baseReq, dir5);
    const fallback = runAppGeneration({ ...baseReq, importHarmonyMode: 'lock_harmony' }, dir5);
    const ok5 =
      baseline.success === true &&
      fallback.success === true &&
      baseline.xml === fallback.xml &&
      fallback.runManifest?.importHarmonyLockApplied === false &&
      typeof fallback.runManifest?.importHarmonyLockFallbackReason === 'string';
    out.push({
      ok: ok5,
      name: 'Song Mode: lock_harmony falls back on unusable timeline without changing output',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `Song Mode lock_harmony fallback: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    try {
      fs.rmSync(dir5, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  return out;
}
