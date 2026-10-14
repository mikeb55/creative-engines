/**
 * Write Targeted Repair audition files. Does not touch the album or Batch D examples.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/bhlTargetedRepairExamples.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCompose } from '../app-api/bhlApp';
import { buildBhlScratchScore } from '../core/bhl/bhlScratch';
import { sha256File } from '../core/bhl/bhlIngest';

const SOURCE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';
const OUT = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Targeted-Repair');
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

fs.mkdirSync(OUT, { recursive: true });
const beforeHash = sha256File(SOURCE);

const after = apiBhlCompose({
  sourcePath: SOURCE,
  span: { from: 33, to: 40 },
  seed: 3340,
  world: 'E',
  musical: {
    pentatonic: {
      archetypeId: 'suspended_pentatonic',
      referenceNote: 'D',
      relationshipId: 'home',
      contrastId: 'hirajoshi',
    },
  },
});
if (!after.ok) throw new Error(after.error);
const afterPath = path.join(OUT, 'World-E-after-suspended-D-hirajoshi.musicxml');
fs.writeFileSync(afterPath, after.xml);

const scratch = buildBhlScratchScore({
  bars: 16,
  beats: 4,
  beatType: 4,
  tempo: 92,
  seed: 3340,
  title: 'BHL from scratch repaired',
});
const scratchPath = path.join(OUT, 'from-scratch-seed3340-16bars-guitar.musicxml');
fs.writeFileSync(scratchPath, scratch.xml);
const composed = apiBhlCompose({
  sourcePath: scratchPath,
  span: { from: 1, to: 16 },
  seed: 3340,
  world: 'A',
});
if (!composed.ok) throw new Error(composed.error);
const composedPath = path.join(OUT, 'from-scratch-seed3340-16bars-generated.musicxml');
fs.writeFileSync(composedPath, composed.xml);

const returnEvents = after.events
  .filter((event) => event.bar === 38)
  .map((event) => event.pitchClasses.map((pc) => NAMES[pc]).join('+'))
  .join(' ');
const guitar = composed.xml.split('<part id="G">')[1]?.split('</part>')[0] ?? '';
const report = [
  'BHL Targeted Repair — evidence comparison',
  'CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED',
  '',
  `Album SHA-256 ${sha256File(SOURCE)}`,
  `Album unchanged ${sha256File(SOURCE) === beforeHash}`,
  '',
  'World E before (generator output observed before this repair, seed 3340, bars 33–40):',
  'Return bar 38 guitar pitch classes: D+A+B, D, G+A.',
  'B-natural is outside D suspended pentatonic (C D E G A) and outside D Hirajoshi (D E F A Bb).',
  'Cause: the return transposition was exempt from the selected collection, then the chord stacked around that outside melody.',
  '',
  `World E after file: ${afterPath}`,
  `Return bar 38 guitar pitch classes: ${returnEvents}`,
  `Conflict: ${(after.musicalEvidence.limitations ?? []).map((item) => item.reason).join(' | ') || 'none'}`,
  '',
  'Original silent scratch file was not overwritten:',
  path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'scratch', 'BHL-from-scratch-seed3340-16bars.musicxml'),
  `Repaired scratch canvas (section-pair guitar, not a rest staff): ${scratchPath}`,
  `Generated scratch export guitar pitch tags: ${(guitar.match(/<pitch>/g) ?? []).length}`,
  `Generated file: ${composedPath}`,
  '',
  'No musical approval is implied.',
].join('\n');
fs.writeFileSync(path.join(OUT, 'EVIDENCE-COMPARISON.txt'), report);
console.log(report);
if (sha256File(SOURCE) !== '01383c35b0eddc74442ba056cec297e36c045e130f6990865732fcac3aafcb48') {
  throw new Error('album hash changed');
}
