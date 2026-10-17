/**
 * Write Coffee Run — Variation into the film-cue folder.
 * Refuses to overwrite an existing deliverable.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { coffeeRunBarSummary } from '../core/piano/coffeeRunVariation';
import { writePianoScoreMidi } from '../core/piano/pianoMidi';

const DEST = '/Users/user/Documents/DEVS/FILM CUES/12-FILM-CUES-ALBUM-SOURCE-MATERIAL/01-COFFEE-RUN/05-COMPOSITION/WONDERLAND-LYRICAL-V1.0';
const NAMES = [
  'Coffee-Run-Variation.musicxml',
  'Coffee-Run-Variation.mid',
  'Coffee-Run-Variation-Bar-Summary.md',
] as const;

const present = NAMES.filter((name) => fs.existsSync(path.join(DEST, name)));
if (present.length) {
  console.error(`STOP existing deliverable: ${present.join(', ')}`);
  process.exit(2);
}
fs.mkdirSync(DEST, { recursive: true });
const composed = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation' });
if (!composed.ok) {
  console.error(composed.error);
  process.exit(1);
}
const xmlPath = path.join(DEST, NAMES[0]);
const midiPath = path.join(DEST, NAMES[1]);
const summaryPath = path.join(DEST, NAMES[2]);
fs.writeFileSync(xmlPath, composed.xml);
writePianoScoreMidi(composed.score, midiPath);
fs.writeFileSync(summaryPath, coffeeRunBarSummary());
for (const filePath of [xmlPath, midiPath, summaryPath]) {
  const stat = fs.statSync(filePath);
  console.log(`${stat.size}\t${filePath}`);
}
