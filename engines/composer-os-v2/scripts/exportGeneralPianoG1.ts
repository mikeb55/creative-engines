/**
 * Write the two General Piano G1 inspection scores.
 * Refuses to overwrite an existing deliverable.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { comparePianoScoreToXml } from '../core/piano/pianoXmlOracle';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const DEST = '/Users/user/Documents/DEVS/FILM CUES/12-FILM-CUES-ALBUM-SOURCE-MATERIAL/01-COFFEE-RUN/05-COMPOSITION/WONDERLAND-LYRICAL-V1.0';

const C_MAJOR = [
  'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Em7', 'Am7',
  'Dm7', 'G7', 'Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7',
  'Dm9', 'G7', 'Cmaj7', 'Fmaj7', 'Cmaj7', 'Am7', 'Cmaj7', 'Cmaj7',
];
const A_MINOR = [
  'Am7', 'Dm7', 'E7', 'Am7', 'Fmaj7', 'Cmaj7', 'Dm7', 'E7',
  'Am7', 'Fmaj7', 'Cmaj7', 'Dm7', 'Am7', 'G7', 'Fmaj7', 'E7',
  'Dm7', 'Am7', 'Fmaj7', 'E7', 'Am7', 'Dm7', 'Am7', 'Am7',
];

const FILES = [
  'General-Piano-V1-Seed76018.musicxml',
  'General-Piano-V1-Seed76018.mid',
  'General-Piano-V1-Seed76019.musicxml',
  'General-Piano-V1-Seed76019.mid',
] as const;

function counts(score: ScoreModel): { rh: number; lh: number; rests: number } {
  let rh = 0;
  let lh = 0;
  let rests = 0;
  for (const measure of score.parts[0]?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind === 'rest') rests += 1;
      else if ((event.voice ?? 1) === 3) lh += 1;
      else rh += 1;
    }
  }
  return { rh, lh, rests };
}

const present = FILES.filter((name) => fs.existsSync(path.join(DEST, name)));
if (present.length) {
  console.error(`STOP existing deliverable: ${present.join(', ')}`);
  process.exit(2);
}

const pieces = [
  { seed: 76018, tempo: 64, tonalCentre: 'C' as const, harmony: C_MAJOR, stem: 'General-Piano-V1-Seed76018' },
  { seed: 76019, tempo: 72, tonalCentre: 'Am' as const, harmony: A_MINOR, stem: 'General-Piano-V1-Seed76019' },
];

fs.mkdirSync(DEST, { recursive: true });
for (const piece of pieces) {
  const composed = apiComposePianoV1({
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: piece.seed,
    bars: 24,
    tempo: piece.tempo,
    tonalCentre: piece.tonalCentre,
    harmony: piece.harmony,
    metre: '4/4',
  });
  if (!composed.ok) {
    console.error(piece.stem, composed.error);
    process.exit(1);
  }
  const xmlPath = path.join(DEST, `${piece.stem}.musicxml`);
  const midiPath = path.join(DEST, `${piece.stem}.mid`);
  fs.writeFileSync(xmlPath, composed.xml);
  writePianoScoreMidi(composed.score, midiPath);
  const oracle = comparePianoScoreToXml(composed.score, fs.readFileSync(xmlPath, 'utf8'));
  const midi = pianoMidiNotes(midiPath);
  const xmlKeys = oracle.sounding
    .filter((event) => !event.rest && event.midi !== null)
    .map((event) => `${event.midi}:${Math.round(event.onset * midi.ppq)}:${Math.round(event.duration * midi.ppq)}`)
    .sort();
  const midiKeys = midi.notes.map((note) => `${note.midi}:${note.ticks}:${note.durationTicks}`).sort();
  const endTicks = 24 * 4 * midi.ppq;
  const lastOff = midi.notes.reduce((max, note) => Math.max(max, note.ticks + note.durationTicks), 0);
  console.log(JSON.stringify({
    stem: piece.stem,
    seed: piece.seed,
    tempo: piece.tempo,
    centre: piece.tonalCentre,
    elapsed: composed.elapsedSeconds,
    attacks: composed.soundingAttacks,
    counts: counts(composed.score),
    phases: composed.plan.general?.phases,
    ops: composed.plan.transformOps,
    returnBar: composed.plan.returnBar,
    openingIntervals: composed.plan.general?.openingIntervals,
    returnIntervals: composed.plan.general?.returnIntervals,
    developmentDurations: composed.plan.general?.developmentDurations,
    oracleOk: oracle.ok,
    parity: xmlKeys.join('|') === midiKeys.join('|'),
    xmlEvents: xmlKeys.length,
    midiEvents: midiKeys.length,
    lastOff,
    endTicks,
    lastOffSeconds: lastOff / midi.ppq * (60 / piece.tempo),
    xmlBytes: fs.statSync(xmlPath).size,
    midiBytes: fs.statSync(midiPath).size,
  }));
}
