/**
 * Example pack for the Solo Piano Musician's Guide.
 * Calls the committed piano API and copies files. Does not change the engine.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { apiComposePianoV1 } from '../../../engines/composer-os-v2/app-api/pianoCompositionApp';
import { persistPianoComposition } from '../../../engines/composer-os-v2/app-api/pianoCompositionPersist';
import { parseGeneralPianoChord } from '../../../engines/composer-os-v2/core/piano/generalPianoWriter';
import { pianoMidiNotes } from '../../../engines/composer-os-v2/core/piano/pianoMidi';
import { COFFEE_RUN_HARMONY } from '../../../engines/composer-os-v2/core/piano/coffeeRunVariation';
import { PIANO_V1_HARMONY } from '../../../engines/composer-os-v2/core/piano/pianoWriter';
import type { NoteEvent, ScoreModel } from '../../../engines/composer-os-v2/core/score-model/scoreModelTypes';

const OUT = resolve('docs/manuals/solo-piano-musicians-guide-v1.0/examples');
mkdirSync(OUT, { recursive: true });

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function pitchName(midi: number): string {
  const name = NAMES[((midi % 12) + 12) % 12]!;
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

function notes(score: ScoreModel, voice: number): Array<NoteEvent & { bar: number }> {
  const out: Array<NoteEvent & { bar: number }> = [];
  for (const measure of score.parts[0]?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind === 'note' && (event.voice ?? 1) === voice) out.push({ ...event, bar: measure.index });
    }
  }
  return out;
}

function signature(score: ScoreModel): string {
  return notes(score, 1).concat(notes(score, 3)).map((note) => (
    `${note.bar}:${note.voice}:${note.startBeat}:${note.duration}:${note.pitch}:${(note.pitches ?? []).join('+')}:${note.notation?.tie ?? ''}`
  )).join('|');
}

function barLine(score: ScoreModel, bar: number, voice: number): string {
  return notes(score, voice)
    .filter((note) => note.bar === bar)
    .map((note) => `${pitchName(note.pitch)}@${note.startBeat}/${note.duration}`)
    .join(' ');
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

type Saved = {
  id: string;
  ok: boolean;
  error?: string;
  musicxml?: string;
  midi?: string;
  xmlSha256?: string;
  midiSha256?: string;
  officialBase?: string;
  bars?: number;
  tempo?: number;
  elapsedSeconds?: number;
  soundingAttacks?: number;
  pedalEventCount?: number;
  title?: string;
  seedEffect?: string;
  oracleOk?: boolean;
  signature?: string;
  rhCount?: number;
  lhCount?: number;
  voice2Count?: number;
  bar1Rh?: string;
  bar1Lh?: string;
  returnRh?: string;
  midiNotes?: number;
  midiLastOffSeconds?: number;
  keyMode?: string;
  fifths?: number;
};

function save(id: string, body: Record<string, unknown>): Saved {
  const composed = apiComposePianoV1(body);
  if (!composed.ok) return { id, ok: false, error: composed.error };
  const scratch = mkdtempSync(join(tmpdir(), 'solo-piano-guide-'));
  const persisted = persistPianoComposition(body, scratch);
  if (!persisted.ok) return { id, ok: false, error: persisted.error };
  const xmlDest = join(OUT, `${id}.musicxml`);
  const midiDest = join(OUT, `${id}.mid`);
  copyFileSync(persisted.filepath, xmlDest);
  copyFileSync(persisted.midiFilepath, midiDest);
  const midi = pianoMidiNotes(midiDest);
  const lastOff = midi.notes.reduce((max, note) => Math.max(max, note.ticks + note.durationTicks), 0);
  const bpm = composed.score.tempo ?? 0;
  const returnBar = composed.plan.returnBar;
  return {
    id,
    ok: true,
    musicxml: `examples/${id}.musicxml`,
    midi: `examples/${id}.mid`,
    xmlSha256: sha256(xmlDest),
    midiSha256: sha256(midiDest),
    officialBase: persisted.filepath.split(/[/\\]/).pop(),
    bars: persisted.bars,
    tempo: persisted.tempo,
    elapsedSeconds: persisted.elapsedSeconds,
    soundingAttacks: persisted.soundingAttacks,
    pedalEventCount: persisted.pedalEventCount,
    title: persisted.title,
    seedEffect: persisted.seedEffect,
    oracleOk: persisted.validation.oracleOk,
    signature: signature(composed.score),
    rhCount: notes(composed.score, 1).length,
    lhCount: notes(composed.score, 3).length,
    voice2Count: notes(composed.score, 2).length,
    bar1Rh: barLine(composed.score, 1, 1),
    bar1Lh: barLine(composed.score, 1, 3),
    returnRh: barLine(composed.score, returnBar, 1),
    midiNotes: midi.notes.length,
    midiLastOffSeconds: bpm > 0 ? Math.round((lastOff / midi.ppq) * (60 / bpm) * 1000) / 1000 : null,
    keyMode: composed.score.keySignature?.mode,
    fifths: composed.score.keySignature?.fifths,
  };
}

const CYCLE_C = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'Cmaj7'];
const CYCLE_A = ['Am7', 'Dm7', 'E7', 'Am7', 'Fmaj7', 'Cmaj7', 'Dm7', 'E7'];

function defaultHarmony(bars: number, centre: 'C' | 'Am'): string[] {
  const source = centre === 'Am' ? CYCLE_A : CYCLE_C;
  const out: string[] = [];
  for (let index = 0; index < bars; index += 1) out.push(source[index % source.length]!);
  const tonic = centre === 'Am' ? 'Am7' : 'Cmaj7';
  out[0] = tonic;
  const returnIndex = bars === 8 ? 6 : bars === 16 ? 12 : 20;
  out[returnIndex] = tonic;
  out[bars - 2] = tonic;
  out[bars - 1] = tonic;
  return out;
}

function repeat(symbol: string[], bars: number): string[] {
  const out: string[] = [];
  for (let index = 0; index < bars; index += 1) out.push(symbol[index % symbol.length]!);
  return out;
}

function general(seed: number, bars: number, tempo: number, centre: 'C' | 'Am', harmony: string[]) {
  return {
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed,
    bars,
    tempo,
    tonalCentre: centre,
    harmony,
    metre: '4/4',
  };
}

const spellings = [
  'Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'E7', 'Am', 'F', 'Dm', 'C', 'G',
  'Bbmaj7', 'C/E', 'Am(add9)', 'Fmaj9', 'G6sus2', 'Dm9', 'Am9/E', 'Cmaj7/E',
  'Fmaj7/A', 'Bbmaj7(#11)', 'C(add9)/E', 'Fmaj7(add9)', 'Am9', 'Cxyz', 'C maj7', 'CMaj7', '',
];

const parser = spellings.map((symbol) => {
  const parsed = parseGeneralPianoChord(symbol);
  return parsed
    ? { symbol, accepted: true, rootPc: parsed.rootPc, bassPc: parsed.bassPc, tones: parsed.tones }
    : { symbol, accepted: false };
});

const pieces: Saved[] = [];
pieces.push(save('study-seed76018-inner', { pianoCompositionV1: true, seed: 76018, innerVoice: true }));
pieces.push(save('study-seed76019-inner', { pianoCompositionV1: true, seed: 76019, innerVoice: true }));
pieces.push(save('study-seed76020-inner', { pianoCompositionV1: true, seed: 76020, innerVoice: true }));
pieces.push(save('study-seed76018-no-inner', { pianoCompositionV1: true, seed: 76018, innerVoice: false }));
pieces.push(save('coffee-run-seed76018-inner', { pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation', innerVoice: true }));
pieces.push(save('coffee-run-seed76019-inner', { pianoCompositionV1: true, seed: 76019, filmCue: 'coffee-run-variation', innerVoice: true }));
pieces.push(save('coffee-run-seed76018-no-inner', { pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation', innerVoice: false }));

const harmC8 = defaultHarmony(8, 'C');
const harmA8 = defaultHarmony(8, 'Am');
const harmOther = ['Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Bbmaj7'];
const harmMini = repeat(['Am', 'F', 'Dm', 'E7'], 24);
const harmLength = (bars: number) => repeat(['C', 'Am', 'F', 'G'], bars);

pieces.push(save('general-c-8-seed76018-q80', general(76018, 8, 80, 'C', harmC8)));
pieces.push(save('general-c-8-seed76019-q80', general(76019, 8, 80, 'C', harmC8)));
pieces.push(save('general-c-8-seed76020-q80', general(76020, 8, 80, 'C', harmC8)));
pieces.push(save('general-c-8-seed76018-other-q80', general(76018, 8, 80, 'C', harmOther)));
pieces.push(save('general-am-8-seed76018-q80', general(76018, 8, 80, 'Am', harmA8)));
pieces.push(save('general-c-8-length-q80', general(76018, 8, 80, 'C', harmLength(8))));
pieces.push(save('general-c-16-length-q80', general(76018, 16, 80, 'C', harmLength(16))));
pieces.push(save('general-c-24-length-q80', general(76018, 24, 80, 'C', harmLength(24))));
pieces.push(save('general-miniature-24-q64', general(76018, 24, 64, 'Am', harmMini)));
pieces.push(save('general-miniature-24-q80', general(76018, 24, 80, 'Am', harmMini)));
pieces.push(save('general-c-16-default-q80', general(76018, 16, 80, 'C', defaultHarmony(16, 'C'))));

const byId = Object.fromEntries(pieces.map((piece) => [piece.id, piece]));
function same(a: string, b: string): boolean | null {
  const left = byId[a]?.signature;
  const right = byId[b]?.signature;
  if (!left || !right) return null;
  return left === right;
}

const rejections = [
  general(1.5 as unknown as number, 8, 80, 'C', harmC8),
  general(76018, 12, 80, 'C', harmLength(12)),
  general(76018, 8, 47, 'C', harmC8),
  general(76018, 8, 121, 'C', harmC8),
  general(76018, 8, 64.5 as unknown as number, 'C', harmC8),
  { ...general(76018, 8, 80, 'C', harmC8), tonalCentre: 'D' },
  { ...general(76018, 8, 80, 'C', harmC8), metre: '3/4' },
  general(76018, 8, 80, 'C', ['Cxyz', 'C', 'C', 'C', 'C', 'C', 'C', 'C']),
  { pianoCompositionV1: true, seed: 76018, bars: 16, tempo: 90 },
  { pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation', tempo: 72 },
].map((body) => {
  const result = apiComposePianoV1(body);
  return { ok: result.ok, code: result.ok ? 'ok' : result.code, error: result.ok ? '' : result.error };
});

const ledger = {
  commit: '51e170692272643ecff7bcfb6ccd461767a2d731',
  generatedAt: new Date().toISOString(),
  method: 'apiComposePianoV1 + persistPianoComposition. Files copied out of a temporary output root.',
  parser,
  fixtureHarmony: [...PIANO_V1_HARMONY],
  coffeeRunWrittenHarmony: [...COFFEE_RUN_HARMONY],
  defaultHarmony: {
    c8: harmC8,
    am8: harmA8,
    c16: defaultHarmony(16, 'C'),
    miniature: harmMini,
    lengthCycle: ['C', 'Am', 'F', 'G'],
    other: harmOther,
  },
  comparisons: {
    study76018Equals76019: same('study-seed76018-inner', 'study-seed76019-inner'),
    study76018Equals76020: same('study-seed76018-inner', 'study-seed76020-inner'),
    studyInnerChangesEvents: same('study-seed76018-inner', 'study-seed76018-no-inner') === false,
    coffee76018Equals76019: same('coffee-run-seed76018-inner', 'coffee-run-seed76019-inner'),
    coffeeInnerChangesEvents: same('coffee-run-seed76018-inner', 'coffee-run-seed76018-no-inner') === false,
    generalSeedsDiffer: same('general-c-8-seed76018-q80', 'general-c-8-seed76019-q80') === false
      && same('general-c-8-seed76018-q80', 'general-c-8-seed76020-q80') === false
      && same('general-c-8-seed76019-q80', 'general-c-8-seed76020-q80') === false,
    generalHarmonyChangesPitches: same('general-c-8-seed76018-q80', 'general-c-8-seed76018-other-q80') === false,
    generalCentreAndHarmonyChangePitches: same('general-c-8-seed76018-q80', 'general-am-8-seed76018-q80') === false,
    tempoKeepsPitches: same('general-miniature-24-q64', 'general-miniature-24-q80'),
    length8vs16: same('general-c-8-length-q80', 'general-c-16-length-q80') === false,
    length16vs24: same('general-c-16-length-q80', 'general-c-24-length-q80') === false,
  },
  rejections,
  pieces: pieces.map(({ signature: _signature, ...rest }) => rest),
};

writeFileSync(join(OUT, 'evidence.json'), `${JSON.stringify(ledger, null, 2)}\n`);
const failed = pieces.filter((piece) => !piece.ok);
console.log(JSON.stringify({
  saved: pieces.length - failed.length,
  failed: failed.map((piece) => ({ id: piece.id, error: piece.error })),
  comparisons: ledger.comparisons,
  parserRejected: parser.filter((item) => !item.accepted).map((item) => item.symbol),
}, null, 2));
