import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { evaluatePentatonicColour } from '../core/pentatonic/colourEvaluate';
import { exportOrbitPracticePhrase } from '../core/pentatonic/orbitPhraseExport';
import { generatePracticeExample } from '../core/pentatonic/practiceFacade';

const sourcePath = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/05-Orbit-Duo-Leadsheet-V2.1.musicxml';
const xml = fs.readFileSync(sourcePath, 'utf8');
const out = exportOrbitPracticePhrase(xml);
const dest = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/pentatonic-options-v2/reports/wwh-orbit-phrase.musicxml');
fs.writeFileSync(dest, out.xml);
console.log(JSON.stringify({
  first: out.firstSourceLabel,
  last: out.lastSourceLabel,
  phraseFunction: out.phraseFunction,
  sectionId: out.sectionId,
  extended: out.extended,
  tempo: out.tempo,
  meter: out.meter,
  fifths: out.fifths,
  mode: out.mode,
  bars: out.bars,
}, null, 2));
const slip = generatePracticeExample({
  category: 'OUTSIDE_RETURN',
  centre: 'F',
  fieldId: 'minor_pentatonic',
  motif: 'F Ab C',
  chord: 'Fmaj7#11',
  variation: 2,
});
console.log('SLIP', slip.operator, slip.notes, slip.rhythm);
const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1' });
console.log('PATH HEAD', (analysis.path.explanation ?? '').split('\n').slice(0, 12).join('\n'));
const bar2 = analysis.path.events.find((event) => event.sourceLabel === '2');
console.log('BAR2', bar2?.chosenName, bar2?.archetypeId, bar2?.referenceNote, bar2?.homeRelationshipLabel);
const colour = evaluatePentatonicColour({
  centreNote: 'F',
  home: { resourceId: 'minor_pentatonic', referenceNote: 'F' },
  melodyNotes: ['F', 'Eb', 'G#', 'Bb'],
  bassNotes: ['F'],
});
console.log('COLOUR', colour.disposition, colour.selected?.resourceId, colour.selected?.transposedName, colour.explanation);
