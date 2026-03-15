/**
 * Wyble Etude Generator — Example driver
 * Generates an 8-bar study from Dm7 → G7 → Cmaj7 and exports MusicXML.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtudeFromProgression } from './wybleEtudeGenerator';
import { exportToMusicXML } from './wybleMusicXMLExporter';

const progression = [
  { chord: 'Dm7', bars: 2 },
  { chord: 'G7', bars: 2 },
  { chord: 'Cmaj7', bars: 4 },
];

function main() {
  const result = generateWybleEtudeFromProgression(progression, {
    key: 'C',
    phraseLength: 8,
  });

  console.log('\n--- WYBLE ETUDE GENERATED ---\n');
  console.log(`Progression: Dm7 (2 bars) → G7 (2 bars) → Cmaj7 (4 bars)`);
  console.log(`Total bars: ${result.bars}`);
  console.log(`Upper line events: ${result.upper_line.events.length}`);
  console.log(`Lower line events: ${result.lower_line.events.length}`);

  const musicXml = exportToMusicXML(result, { title: 'Wyble Etude — ii–V–I' });

  const outPath = path.join(__dirname, 'wyble-etude-example.xml');
  fs.writeFileSync(outPath, musicXml, 'utf-8');

  console.log(`\nMusicXML exported to: ${outPath}`);
  console.log('\n--- END ---\n');
}

main();
