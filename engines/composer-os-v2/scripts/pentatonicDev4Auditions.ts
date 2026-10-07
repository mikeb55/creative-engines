/**
 * Regenerate the four Dev 4 guitar auditions.
 * Run: npm run pentatonic:dev4-auditions
 */
import { writeDev4Auditions } from '../core/pentatonic/dev4Audition';
import { landingIndexes } from '../core/pentatonic/motifTransform';

const written = writeDev4Auditions();
for (const audition of written) {
  const extracted = audition.extracted;
  const landings = landingIndexes(extracted.motif.notes, extracted.meter.beats, extracted.meter.beatType);
  console.log(audition.filePath);
  console.log(`  valid ${audition.valid} roundTrip ${audition.roundTripEqual}`);
  console.log(`  meter ${extracted.meter.beats}/${extracted.meter.beatType} region ${extracted.colourRegion}`);
  console.log(`  home ${extracted.home.name} colour ${extracted.colour.name} rel ${extracted.colour.homeRelationshipLabel}`);
  console.log(`  source ${extracted.motif.notes.map((note) => note.pitch).join(' ')}`);
  console.log(`  rhythm ${extracted.rhythm.map((slot) => `${slot.kind}@${slot.startBeat}/${slot.duration}`).join(' ')}`);
  console.log(`  landings ${landings.join(',')}`);
  console.log(`  colour ${audition.colour.notes.map((note) => note.pitch).join(' ')} scale ${audition.colour.scaleRun.sourceMax}->${audition.colour.scaleRun.targetMax} ${audition.colour.scaleRun.valid}`);
  console.log(`  return ${audition.returned.notes.map((note) => note.pitch).join(' ')} scale ${audition.returned.scaleRun.sourceMax}->${audition.returned.scaleRun.targetMax} ${audition.returned.scaleRun.valid}`);
  console.log(`  colourAlign ${audition.colour.degreeAlignment}`);
  console.log(`  returnAlign ${audition.returned.degreeAlignment}`);
  console.log(`  retain ${audition.colour.commonToneRetentions.join(',') || 'none'} collisions ${audition.colour.contourCollisions.length} ornaments ${audition.colour.preservedOrnaments.length}`);
}
