/**
 * Dev 3.7 nine-track diagnostic. Read-only.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/pentatonicDev37Report.ts
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import type { PentatonicPathResult } from '../core/pentatonic/pathTypes';

const album = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const files = [
  '01-Black-Aura-Duo-Leadsheet-V1.1.musicxml',
  '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml',
  '05-Orbit-Duo-Leadsheet-V2.1.musicxml',
  '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml',
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
];

function trackName(file: string): string {
  return file.replace(/-Duo-Leadsheet.*$/, '').replace(/^\d+-/, '');
}

function regions(result: PentatonicPathResult): string {
  return result.segments.map((segment) => {
    const span = segment.firstSourceLabel === segment.lastSourceLabel ? segment.firstSourceLabel : `${segment.firstSourceLabel}–${segment.lastSourceLabel}`;
    return `${span} ${segment.chosenName}`;
  }).join(' | ');
}

function labels(result: PentatonicPathResult, from: number, to: number) {
  return result.events.filter((event) => {
    const label = Number(event.sourceLabel);
    return label >= from && label <= to;
  });
}

for (const file of files) {
  const full = `${album}/${file}`;
  const before = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  const xml = fs.readFileSync(full, 'utf8');
  const dev36 = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: before, heldCollectionFloor: false });
  const dev37 = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: before });
  const after = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  const name = trackName(file);
  console.log(`\nTRACK ${name}`);
  console.log(`SHA ${before} ${before === after ? 'UNCHANGED' : 'CHANGED'}`);
  console.log(`CENTRE 3.6 ${dev36.identity.centre?.spelling ?? 'none'} ${dev36.identity.centreStatus} HOME ${dev36.identity.homeStatus} ${dev36.identity.home?.referenceNote ?? '-'} ${dev36.identity.home?.archetypeId ?? '-'}`);
  console.log(`CENTRE 3.7 ${dev37.identity.centre?.spelling ?? 'none'} ${dev37.identity.centreStatus} HOME ${dev37.identity.homeStatus} ${dev37.identity.home?.referenceNote ?? '-'} ${dev37.identity.home?.archetypeId ?? '-'}`);
  console.log(`REGIONS 3.6 ${regions(dev36.path)}`);
  console.log(`REGIONS 3.7 ${regions(dev37.path)}`);
  console.log(`SWITCHES 3.6 ${dev36.path.switchCount} 3.7 ${dev37.path.switchCount}`);
  console.log(`NONE EVENTS 3.6 ${dev36.path.noneEventCount} 3.7 ${dev37.path.noneEventCount}`);
  console.log(`ITERATIONS ${dev37.path.noneEligibility.iterations}`);
  console.log(`CONFIG ${dev37.path.configVersion}`);
  for (const row of dev37.path.noneEligibility.heldExclusions) {
    console.log(`EXCLUSION ${name} ${row.firstSourceLabel}-${row.lastSourceLabel} held ${row.heldCollectionName} mean ${row.heldMean} alt ${row.alternativeName} mean ${row.alternativeMean} iteration ${row.iteration} final ${row.finalStateName}`);
  }
  for (const row of dev37.path.noneEligibility.survivingBelowFloor) {
    console.log(`SURVIVING ${name} ${row.firstSourceLabel}-${row.lastSourceLabel} held ${row.heldCollectionName} mean ${row.heldMean} best ${row.bestAlternativeName ?? 'none'} mean ${row.bestAlternativeMean ?? 'none'}`);
  }
  if (file.startsWith('08-')) {
    console.log('SMALL TESTIMONY PATH');
    console.log(dev37.path.explanation);
    const ten = labels(dev37.path, 10, 11);
    const sixteen = labels(dev37.path, 16, 16);
    const late = labels(dev37.path, 17, 20);
    console.log(`mm.10-11 chosen ${ten.map((event) => `${event.sourceLabel}:${event.chosenName}:${event.localScore}`).join(' ')}`);
    console.log(`mm.16 chosen ${sixteen.map((event) => `${event.sourceLabel}:${event.chosenName}:${event.localScore}`).join(' ')}`);
    console.log(`mm.17-20 chosen ${late.map((event) => `${event.sourceLabel}:${event.chosenName}:${event.localScore}`).join(' ')}`);
    const noneLate = dev37.path.noneEligibility.surviving.filter((row) => Number(row.firstSourceLabel) <= 20 && Number(row.lastSourceLabel) >= 17);
    const noneRejected = dev37.path.noneEligibility.rejected.filter((row) => Number(row.firstSourceLabel) <= 20 && Number(row.lastSourceLabel) >= 17);
    console.log(`mm.17-20 surviving NONE ${JSON.stringify(noneLate)}`);
    console.log(`mm.17-20 rejected NONE ${JSON.stringify(noneRejected)}`);
  }
}
