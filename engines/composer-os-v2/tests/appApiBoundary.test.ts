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
import { expectedPitchTableForTuning } from '../core/song-mode/indieDualGuitarTuningFixture';

/** Same progression as `songModeMusicXml.test.ts` / HomeGenerate Song Mode 32-bar paste. */
const SONG_MODE_32_BAR_REGRESSION =
  'Cmaj9 | E7(#11)/G# | Am9 | D7(b9) | G13 | Dbmaj7(#11) | Cmaj9/E | A7alt | ' +
  'Dm9 | G7(b13) | Em7 | A7(#11) | Dmaj9 | Bb13 | Ebmaj9/G | Ab7(#11) | ' +
  'G13 | B7(#9) | Em9 | A13 | Dmaj9/F# | F7(#11) | Bbmaj9 | Eb13 | ' +
  'Abmaj9 | Db13 | Gbmaj9 | B7alt | Em9 | A7 | Dmaj9 | G13';

const INDIE_G1_CUSTOM: [string, string, string, string, string, string] = ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'];
const INDIE_G2_CUSTOM: [string, string, string, string, string, string] = ['C2', 'G2', 'D3', 'G3', 'B3', 'D4'];
const INDIE_FIXTURE_FRETS = [0, 3, 5, 7, 12] as const;
const STEP_TO_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function extractMeasurePitchesForPart(xml: string, partId: string, measureNumber: number): number[] {
  const partMatch = xml.match(new RegExp(`<part id="${partId}">([\\s\\S]*?)<\\/part>`));
  if (!partMatch) return [];
  const measureMatch = partMatch[1].match(
    new RegExp(`<measure number="${measureNumber}">([\\s\\S]*?)<\\/measure>`)
  );
  if (!measureMatch) return [];
  const noteBlocks = measureMatch[1].match(/<note>[\s\S]*?<\/note>/g) ?? [];
  const pitches: number[] = [];
  for (const block of noteBlocks) {
    if (block.includes('<rest/>')) continue;
    const step = block.match(/<step>([A-G])<\/step>/)?.[1];
    const alter = Number(block.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? '0');
    const octave = Number(block.match(/<octave>(-?\d+)<\/octave>/)?.[1] ?? '0');
    if (!step || !Number.isFinite(octave)) continue;
    pitches.push((octave + 1) * 12 + STEP_TO_SEMITONE[step]! + alter);
  }
  return pitches.sort((a, b) => a - b);
}

/** Parsed pitched/rest entries for MusicXML chord-density characterization (voice + divisions offset within measure). */
interface ParsedXmlNote {
  measure: number;
  voice: number;
  startDiv: number;
  isRest: boolean;
}

function parseNoteLayer(layerXml: string, measureNum: number, defaultVoice: number): ParsedXmlNote[] {
  const events: ParsedXmlNote[] = [];
  let time = 0;
  let lastStart = -1;
  const toks = layerXml.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
  for (const tok of toks) {
    const dur = Number(tok.match(/<duration>\s*(\d+)\s*<\/duration>/)?.[1] ?? '0');
    const voice = Number(tok.match(/<voice>\s*(\d+)\s*<\/voice>/)?.[1] ?? String(defaultVoice));
    const isRest = /<rest/.test(tok);
    const isChord = tok.includes('<chord/>') || tok.includes('<chord />');
    if (isChord) {
      const st = lastStart >= 0 ? lastStart : time;
      events.push({ measure: measureNum, voice, startDiv: st, isRest });
      continue;
    }
    const st = time;
    lastStart = st;
    events.push({ measure: measureNum, voice, startDiv: st, isRest });
    time = st + dur;
  }
  return events;
}

/** Split at `</backup>` so voice-1 and voice-2 streams each get an independent division cursor (Sibelius duo export). */
function parseMeasureNoteTimes(measureXml: string, measureNum: number): ParsedXmlNote[] {
  const backupClose = measureXml.indexOf('</backup>');
  const head = backupClose === -1 ? measureXml : measureXml.slice(0, backupClose);
  const tail = backupClose === -1 ? '' : measureXml.slice(backupClose + '</backup>'.length);
  return [...parseNoteLayer(head, measureNum, 1), ...parseNoteLayer(tail, measureNum, 2)];
}

function parsePartNotes(xml: string, partId: string): ParsedXmlNote[] {
  const partRe = new RegExp(`<part id="${partId}"[^>]*>([\\s\\S]*?)</part>`);
  const pm = xml.match(partRe);
  if (!pm) return [];
  const inner = pm[1] ?? '';
  const measures = [...inner.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
  const out: ParsedXmlNote[] = [];
  for (const row of measures) {
    const num = Number(row[1]);
    const body = row[2] ?? '';
    out.push(...parseMeasureNoteTimes(body, num));
  }
  return out;
}

function isChordToneSameVoice(n: ParsedXmlNote, all: ParsedXmlNote[]): boolean {
  if (n.isRest) return false;
  const same = all.filter(
    (o) =>
      !o.isRest &&
      o.measure === n.measure &&
      o.voice === n.voice &&
      o.startDiv === n.startDiv
  );
  return same.length >= 2;
}

/** Duo export often doubles v1 melody + v2 shells at the same division (no `<chord/>` across voices). */
function isChordalAttackAnyVoice(n: ParsedXmlNote, all: ParsedXmlNote[]): boolean {
  if (n.isRest) return false;
  const cluster = all.filter((o) => !o.isRest && o.measure === n.measure && o.startDiv === n.startDiv);
  return cluster.length >= 2;
}

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

    const indieDualGuitar = apiGenerate(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 812345,
        variationId: 'v-indie-dual-gtr',
        creativeControlLevel: 'stable',
        bpm: 118,
        totalBars: 32,
        longFormEnabled: true,
        styleProfile: 'STYLE_INDIE_ART_POP',
        primarySongwriterStyle: 'donald_fagen',
        chordProgressionText: SONG_MODE_32_BAR_REGRESSION,
        alternateGuitarTuning: {
          mode: 'separate',
          guitar1: { presetId: 'custom', customStrings: INDIE_G1_CUSTOM },
          guitar2: { presetId: 'custom', customStrings: INDIE_G2_CUSTOM },
        },
      },
      tmp
    ) as {
      success?: boolean;
      xml?: string;
      runManifest?: { presetId?: string; activeModules?: string[] };
      requestEcho?: { styleProfile?: string };
      error?: string;
    };
    const indieXml = indieDualGuitar.xml ?? '';
    const noFallbackNames = !/Piano|Upright Bass/i.test(indieXml);
    const hasTwoGuitars =
      indieXml.includes('<score-part id="guitar">') &&
      indieXml.includes('<score-part id="guitar_2">') &&
      indieXml.includes('<part-name>Clean Electric Guitar</part-name>') &&
      indieXml.includes('<part-name>Electric Guitar 2</part-name>');
    const hasChordSymbols = (indieXml.match(/<harmony>/g) ?? []).length >= 8;
    const notWyble = !(indieDualGuitar.runManifest?.activeModules ?? []).includes('jimmy_wyble_engine');
    const g2Part = indieXml.match(/<part id="guitar_2"[\s\S]*?<\/part>/);
    let guitar2SingleBackupPerMeasure = false;
    if (g2Part && /<voice>2<\/voice>/.test(g2Part[0])) {
      const measures = [...g2Part[0].matchAll(/<measure\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
      guitar2SingleBackupPerMeasure =
        measures.length > 0 &&
        measures.every((row) => ((row[2] ?? '').match(/<backup>/g) ?? []).length === 1);
    }
    out.push({
      ok:
        indieDualGuitar.success === true &&
        indieDualGuitar.runManifest?.presetId === 'song_mode' &&
        indieDualGuitar.requestEcho?.styleProfile === 'STYLE_INDIE_ART_POP' &&
        noFallbackNames &&
        hasTwoGuitars &&
        hasChordSymbols &&
        notWyble &&
        guitar2SingleBackupPerMeasure,
      name:
        'song_mode indie alias route stays Song Mode, canonicalizes style, exports dual electric guitars, and avoids piano/upright/wyble fallback',
    });

    /** Same shape as packaged v1.0.47 oracle: preset tunings (drop_d + dadgad) + 32-bar locked harmony. */
    const indieSeparatePresetTunings = apiGenerate(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 881105,
        tonalCenter: 'C',
        bpm: 120,
        totalBars: 32,
        longFormEnabled: true,
        harmonyMode: 'custom_locked',
        chordProgressionText: SONG_MODE_32_BAR_REGRESSION,
        primarySongwriterStyle: 'beatles',
        stylePairing: { songwriterStyle: 'beatles', arrangerStyle: 'gil_evans', era: 'contemporary' },
        styleProfile: 'STYLE_INDIE_ART_POP',
        title: 'Regression indie separate preset tunings',
        alternateGuitarTuning: {
          mode: 'separate',
          guitar1: { presetId: 'drop_d' },
          guitar2: { presetId: 'dadgad' },
        },
      },
      tmp
    ) as { success?: boolean; xml?: string; error?: string };
    const ox = indieSeparatePresetTunings.xml ?? '';
    const midi28 = (ox.match(/<midi-program>28<\/midi-program>/g) ?? []).length;
    const g2b = ox.match(/<part id="guitar_2"[\s\S]*?<\/part>/);
    let g2bOk = false;
    if (g2b && /<voice>2<\/voice>/.test(g2b[0])) {
      const ms = [...g2b[0].matchAll(/<measure\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
      g2bOk = ms.length > 0 && ms.every((row) => ((row[2] ?? '').match(/<backup>/g) ?? []).length === 1);
    }
    out.push({
      ok:
        indieSeparatePresetTunings.success === true &&
        ox.includes('<score-part id="guitar">') &&
        ox.includes('<score-part id="guitar_2">') &&
        midi28 >= 2 &&
        !/Upright Bass/i.test(ox) &&
        g2bOk,
      name:
        'song_mode STYLE_INDIE_ART_POP + separate drop_d/dadgad: export succeeds, two GM28 guitars, no bass, one <backup> per guitar_2 measure',
    });

    const guitar2Notes = parsePartNotes(ox, 'guitar_2');
    const guitar2Pitched = guitar2Notes.filter((n) => !n.isRest);
    const chordNotesG2 = guitar2Pitched.filter((n) => isChordalAttackAnyVoice(n, guitar2Pitched));
    const g2Density = guitar2Pitched.length === 0 ? 0 : chordNotesG2.length / guitar2Pitched.length;
    const guitar1Notes = parsePartNotes(ox, 'guitar');
    const guitar1Pitched = guitar1Notes.filter((n) => !n.isRest);
    const guitar1Solo = guitar1Pitched.filter((n) => !isChordToneSameVoice(n, guitar1Pitched));
    out.push({
      ok: g2Density > 0.65 && guitar1Solo.length > 0,
      name: `Indie separate regression: guitar_2 chord-density ${g2Density.toFixed(3)} (>0.65, same-beat any-voice), guitar solo pitched ${guitar1Solo.length} (>0)`,
    });

    const indieRejectStandard = apiGenerate(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 812346,
        styleProfile: 'STYLE_INDIE_ART_POP',
        primarySongwriterStyle: 'beatles',
        alternateGuitarTuning: {
          mode: 'separate',
          guitar1: { presetId: 'standard' },
          guitar2: { presetId: 'dadgad' },
        },
      },
      tmp
    ) as { success?: boolean; error?: string };
    out.push({
      ok:
        indieRejectStandard.success === false &&
        typeof indieRejectStandard.error === 'string' &&
        indieRejectStandard.error.includes('requires both Guitar 1 and Guitar 2 to use non-standard tunings'),
      name: 'indie separate-tuning route rejects standard-tuning substitution guardrail',
    });

    const fixture = apiGenerate(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 812347,
        styleProfile: 'STYLE_INDIE_ART_POP',
        primarySongwriterStyle: 'donald_fagen',
        debugFixtureMode: 'indie_dual_guitar_tuning_proof',
      },
      tmp
    ) as {
      success?: boolean;
      filepath?: string;
      xml?: string;
      requestEcho?: { styleProfile?: string; debugFixtureMode?: string };
    };
    const fixtureXml = fixture.xml ?? '';
    const fixtureFileExists = fixture.filepath ? fs.existsSync(fixture.filepath) : false;
    const expectedG1 = expectedPitchTableForTuning(INDIE_G1_CUSTOM);
    const expectedG2 = expectedPitchTableForTuning(INDIE_G2_CUSTOM);
    const fixturePitchPass = INDIE_FIXTURE_FRETS.every((fret, idx) => {
      const g1 = extractMeasurePitchesForPart(fixtureXml, 'guitar', idx + 1);
      const g2 = extractMeasurePitchesForPart(fixtureXml, 'guitar_2', idx + 1);
      return (
        g1.length === 6 &&
        g2.length === 6 &&
        JSON.stringify(g1) === JSON.stringify([...expectedG1[fret]].sort((a, b) => a - b)) &&
        JSON.stringify(g2) === JSON.stringify([...expectedG2[fret]].sort((a, b) => a - b))
      );
    });
    out.push({
      ok:
        fixture.success === true &&
        fixtureFileExists &&
        fixture.requestEcho?.styleProfile === 'STYLE_INDIE_ART_POP' &&
        fixture.requestEcho?.debugFixtureMode === 'indie_dual_guitar_tuning_proof' &&
        fixtureXml.includes('<score-part id="guitar">') &&
        fixtureXml.includes('<score-part id="guitar_2">') &&
        !/Piano|Upright Bass/i.test(fixtureXml) &&
        fixturePitchPass,
      name:
        'indie dual-guitar tuning-proof fixture runs through apiGenerate, writes real MusicXML file, and matches deterministic pitch tables',
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
