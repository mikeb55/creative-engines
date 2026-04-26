import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { apiGenerate } from '../app-api/composerOsApiCore';

const SONG =
  'Cmaj9 | E7(#11)/G# | Am9 | D7(b9) | G13 | Dbmaj7(#11) | Cmaj9/E | A7alt | ' +
  'Dm9 | G7(b13) | Em7 | A7(#11) | Dmaj9 | Bb13 | Ebmaj9/G | Ab7(#11) | ' +
  'G13 | B7(#9) | Em9 | A13 | Dmaj9/F# | F7(#11) | Bbmaj9 | Eb13 | ' +
  'Abmaj9 | Db13 | Gbmaj9 | B7alt | Em9 | A7 | Dmaj9 | G13';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xm-'));
const r = apiGenerate(
  {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
    seed: 881105,
    tonalCenter: 'C',
    bpm: 120,
    totalBars: 32,
    longFormEnabled: true,
    harmonyMode: 'custom_locked',
    chordProgressionText: SONG,
    primarySongwriterStyle: 'beatles',
    stylePairing: { songwriterStyle: 'beatles', arrangerStyle: 'gil_evans', era: 'contemporary' },
    styleProfile: 'STYLE_INDIE_ART_POP',
    title: 'inspect',
    alternateGuitarTuning: { mode: 'separate', guitar1: { presetId: 'drop_d' }, guitar2: { presetId: 'dadgad' } },
  },
  tmp
) as { success?: boolean; xml?: string };

const xml = r.xml ?? '';
const g2 = xml.match(/<part id="guitar_2"[^>]*>([\s\S]*?)<\/part>/);
const inner = g2?.[1] ?? '';
const m1 = inner.match(/<measure[^>]*number="1"[^>]*>([\s\S]*?)<\/measure>/)?.[1] ?? '';
const bc = m1.indexOf('</backup>');
const head = bc === -1 ? m1 : m1.slice(0, bc);
const tail = bc === -1 ? '' : m1.slice(bc + '</backup>'.length);
const chordTags = (tail.match(/<chord\s*\/>/g) ?? []).length;

function parseLayer(layerXml: string, defaultVoice: number): { startDiv: number; rest: boolean; voice: number }[] {
  const events: { startDiv: number; rest: boolean; voice: number }[] = [];
  let time = 0;
  let lastStart = -1;
  const toks = layerXml.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
  for (const tok of toks) {
    const dur = Number(tok.match(/<duration>\s*(\d+)\s*<\/duration>/)?.[1] ?? '0');
    const voice = Number(tok.match(/<voice>\s*(\d+)\s*<\/voice>/)?.[1] ?? String(defaultVoice));
    const isRest = /<rest/.test(tok);
    const isChord = tok.includes('<chord/>') || tok.includes('<chord />');
    let st: number;
    if (isChord) {
      st = lastStart >= 0 ? lastStart : time;
    } else {
      st = time;
      lastStart = st;
      time = st + dur;
    }
    events.push({ startDiv: st, rest: isRest, voice });
  }
  return events;
}

const merged = [...parseLayer(head, 1), ...parseLayer(tail, 2)];
const c480 = merged.filter((e) => !e.rest && e.startDiv === 480).length;

process.stdout.write(
  JSON.stringify({ success: r.success, chordTagsVoice2M1: chordTags, simultaneousPitchedAtDiv480Merged: c480 }) + '\n'
);
