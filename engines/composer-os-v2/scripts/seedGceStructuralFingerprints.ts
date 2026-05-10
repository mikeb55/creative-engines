/**
 * One-shot / maintenance: build JSON fingerprints from Orbit MusicXML under repo projects/.
 */

import path from 'path';
import { extractFingerprintFromMusicXmlFile, saveFingerprint } from '../core/gce/gceStructuralMemory';

const repoRoot = path.resolve(__dirname, '../../..');

function main(): void {
  const v6 = path.join(repoRoot, 'projects/Orbit/V6.0 orbit - BB.musicxml');
  const v17 = path.join(repoRoot, 'projects/Orbit/Steely Orbit - 1st 64 bars/V1.7-Steely-Orbit.musicxml');

  const fp6 = extractFingerprintFromMusicXmlFile(
    v6,
    {
      id: 'orbit_v6_64',
      format: 'big_band',
      songwriterId: 'bill_evans',
      notes: 'V6.0 orbit — BB (projects/Orbit)',
    },
    9.0
  );
  const fp17 = extractFingerprintFromMusicXmlFile(
    v17,
    {
      id: 'steely_orbit_v1_7',
      format: 'big_band',
      songwriterId: 'donald_fagen',
      notes: 'V1.7 Steely Orbit — 1st 64 bars',
    },
    7.0
  );

  if (!fp6) {
    console.error('Failed to extract orbit_v6_64 from', v6);
    process.exit(1);
  }
  if (!fp17) {
    console.error('Failed to extract steely_orbit_v1_7 from', v17);
    process.exit(1);
  }

  saveFingerprint(fp6);
  saveFingerprint(fp17);
  console.log('Wrote gce-memory/fingerprints/orbit_v6_64.json');
  console.log('Wrote gce-memory/fingerprints/steely_orbit_v1_7.json');
}

main();
