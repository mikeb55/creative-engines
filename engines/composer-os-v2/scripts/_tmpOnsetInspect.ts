/** One-off: Indie regression + guitar_2 m1–4 onset pitched counts (aligned with appApiBoundary). */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { apiGenerate } from '../app-api/composerOsApiCore';

const SONG =
  'Cmaj9 | E7(#11)/G# | Am9 | D7(b9) | G13 | Dbmaj7(#11) | Cmaj9/E | A7alt | ' +
  'Dm9 | G7(b13) | Em7 | A7(#11) | Dmaj9 | Bb13 | Ebmaj9/G | Ab7(#11) | ' +
  'G13 | B7(#9) | Em9 | A13 | Dmaj9/F# | F7(#11) | Bbmaj9 | Eb13 | ' +
  'Abmaj9 | Db13 | Gbmaj9 | B7alt | Em9 | A7 | Dmaj9 | G13';

interface Ev {
  startDiv: number;
  voice: number;
  pitched: boolean;
}

function parseNoteLayer(layerXml: string, defaultVoice: number): Ev[] {
  const events: Ev[] = [];
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
      events.push({ startDiv: st, voice, pitched: !isRest });
      continue;
    }
    const st = time;
    lastStart = st;
    events.push({ startDiv: st, voice, pitched: !isRest });
    time = st + dur;
  }
  return events;
}

function parseMeasureMerged(measureXml: string): Ev[] {
  const backupClose = measureXml.indexOf('</backup>');
  const head = backupClose === -1 ? measureXml : measureXml.slice(0, backupClose);
  const tail = backupClose === -1 ? '' : measureXml.slice(backupClose + '</backup>'.length);
  return [...parseNoteLayer(head, 1), ...parseNoteLayer(tail, 2)];
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'onset-'));
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
    title: 'Onset inspect',
    alternateGuitarTuning: { mode: 'separate', guitar1: { presetId: 'drop_d' }, guitar2: { presetId: 'dadgad' } },
  },
  tmp
) as { success?: boolean; error?: string; filepath?: string; xml?: string };

const xml = r.xml ?? '';
const ok =
  r.success === true &&
  xml.includes('<score-part id="guitar">') &&
  xml.includes('<score-part id="guitar_2">') &&
  !xml.includes('<score-part id="bass">');
const g2 = xml.match(/<part id="guitar_2"[^>]*>([\s\S]*?)<\/part>/);
const ms = [...(g2?.[1]?.matchAll(/<measure\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g) ?? [])];
const backupOk = ms.length > 0 && ms.every((row) => ((row[2] ?? '').match(/<backup>/g) ?? []).length === 1);

const examples: { measure: number; onsetDiv: number; pitchedCount: number }[] = [];
for (const row of ms) {
  const num = Number(row[1]);
  if (num < 1 || num > 4) continue;
  const evs = parseMeasureMerged(row[2] ?? '');
  const byStart = new Map<number, Ev[]>();
  for (const e of evs) {
    if (!byStart.has(e.startDiv)) byStart.set(e.startDiv, []);
    byStart.get(e.startDiv)!.push(e);
  }
  for (const [onsetDiv, arr] of [...byStart.entries()].sort((a, b) => a[0] - b[0])) {
    const hasV2 = arr.some((n) => n.voice === 2 && n.pitched);
    if (!hasV2) continue;
    const pitchedCount = arr.filter((n) => n.pitched).length;
    if (pitchedCount >= 3) examples.push({ measure: num, onsetDiv, pitchedCount });
  }
}

process.stdout.write(
  JSON.stringify(
    {
      exportPass: ok && backupOk,
      filepath: r.filepath ?? null,
      error: r.error,
      backupOk,
      examples3plus: examples.slice(0, 8),
    },
    null,
    2
  ) + '\n'
);
