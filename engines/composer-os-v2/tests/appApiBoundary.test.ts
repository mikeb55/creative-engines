/**
 * App / API boundary — UI talks only to composerOsApiCore (Prompt 7/7).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { apiGenerate } from '../app-api/composerOsApiCore';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { normalizeChordToken, parseChordProgressionInputWithBarCount } from '../core/harmony/chordProgressionParser';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';

/** Same progression as `songModeMusicXml.test.ts` / HomeGenerate Song Mode 32-bar paste. */
const SONG_MODE_32_BAR_REGRESSION =
  'Cmaj9 | E7(#11)/G# | Am9 | D7(b9) | G13 | Dbmaj7(#11) | Cmaj9/E | A7alt | ' +
  'Dm9 | G7(b13) | Em7 | A7(#11) | Dmaj9 | Bb13 | Ebmaj9/G | Ab7(#11) | ' +
  'G13 | B7(#9) | Em9 | A13 | Dmaj9/F# | F7(#11) | Bbmaj9 | Eb13 | ' +
  'Abmaj9 | Db13 | Gbmaj9 | B7alt | Em9 | A7 | Dmaj9 | G13';

export function runAppApiBoundaryTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-api-boundary-'));

  try {
    const base: Partial<GenerateRequest> = {
      styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
      seed: 4242,
    };
    const bad = apiGenerate({ ...base, presetId: 'not_a_real_preset' } as Partial<GenerateRequest>, tmp);
    out.push({
      ok: bad.success === false && typeof (bad as { error?: string }).error === 'string',
      name: 'negative: invalid preset fails cleanly via apiGenerate',
    });

    const bb = apiGenerate({ ...base, presetId: 'big_band', title: 'API boundary test' }, tmp);
    out.push({
      ok:
        bb.success === true &&
        !!(bb as { filepath?: string }).filepath?.endsWith('.json') &&
        (bb as { productKind?: string }).productKind === 'planning',
      name: 'apiGenerate routes big_band to planning JSON (no engine import from UI layer)',
    });

    /** Mirrors `HomeGenerate.tsx` → `api.generate` → IPC `apiGenerate` (not `runAppGeneration` direct). */
    const desktopLike = apiGenerate(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 95101,
        variationId: 'v-desktop-parity',
        creativeControlLevel: 'stable',
        tonalCenter: '',
        bpm: 120,
        totalBars: 32,
        longFormEnabled: true,
        primarySongwriterStyle: 'beatles',
        stylePairing: { songwriterStyle: 'beatles', arrangerStyle: 'ellington', era: 'post_bop' },
        title: 'Desktop IPC parity',
        variationEnabled: false,
        harmonyMode: 'custom_locked',
        chordProgressionText: SONG_MODE_32_BAR_REGRESSION,
      },
      tmp
    ) as {
      success?: boolean;
      parsedCustomProgressionBars?: string[];
      xml?: string;
      requestEcho?: { harmonyMode?: string; longFormEnabled?: boolean; totalBars?: number };
    };
    const parsed = parseChordProgressionInputWithBarCount(SONG_MODE_32_BAR_REGRESSION, 32);
    let desktopOk = false;
    if (parsed.ok && desktopLike.parsedCustomProgressionBars?.length === 32) {
      const echo = desktopLike.requestEcho;
      const echoBars =
        echo?.harmonyMode === 'custom_locked' && echo?.longFormEnabled === true && echo?.totalBars === 32;
      const b0 =
        desktopLike.parsedCustomProgressionBars[0] === 'Cmaj9' &&
        desktopLike.parsedCustomProgressionBars[1] === 'E7(#11)/G#';
      let xmlBarsOk = false;
      if (desktopLike.xml) {
        const harm = extractHarmoniesFromFirstPartXml(desktopLike.xml);
        xmlBarsOk =
          normalizeChordToken(harm.get(1) ?? '') === normalizeChordToken('Cmaj9') &&
          normalizeChordToken(harm.get(2) ?? '') === normalizeChordToken('E7(#11)/G#');
      }
      desktopOk = echoBars && b0 && xmlBarsOk;
    }
    out.push({
      ok: desktopOk,
      name: 'desktop parity: apiGenerate Song Mode custom_locked echoes bars + first MusicXML harmonies (IPC path)',
    });

    /** Same payload as desktop but `presetId` omitted — apiGenerate must infer `song_mode` (IPC drop regression). */
    const inferSongMode = apiGenerate(
      {
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 95102,
        variationId: 'v-infer-preset',
        creativeControlLevel: 'stable',
        bpm: 120,
        totalBars: 32,
        longFormEnabled: true,
        primarySongwriterStyle: 'beatles',
        stylePairing: { songwriterStyle: 'beatles', arrangerStyle: 'ellington', era: 'post_bop' },
        title: 'Infer song_mode when presetId omitted',
        harmonyMode: 'custom_locked',
        chordProgressionText: SONG_MODE_32_BAR_REGRESSION,
      },
      tmp
    ) as { success?: boolean; runManifest?: { presetId?: string }; parsedCustomProgressionBars?: string[] };
    out.push({
      ok:
        inferSongMode.runManifest?.presetId === 'song_mode' &&
        inferSongMode.parsedCustomProgressionBars?.[0] === 'Cmaj9' &&
        inferSongMode.parsedCustomProgressionBars?.[1] === 'E7(#11)/G#',
      name: 'apiGenerate infers song_mode when presetId missing but primarySongwriterStyle set (IPC path)',
    });

    const wsOnly = apiGenerate(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 1,
        harmonyMode: 'custom_locked',
        chordProgressionText: '  \n\t  ',
      },
      tmp
    );
    out.push({
      ok:
        wsOnly.success === false &&
        typeof (wsOnly as { error?: string }).error === 'string' &&
        (wsOnly as { error: string }).error.includes('custom_locked'),
      name: 'apiGenerate rejects custom_locked when chord line is whitespace-only (no silent builtin duo32)',
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
