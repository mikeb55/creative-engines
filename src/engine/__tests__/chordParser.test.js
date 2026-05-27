/**
 * Chord parser gate — imported by composer-os smoke (`runSmokeTests.ts`).
 */

import { parseChord } from '../chordParser.js';

export function runChordParserGateTests() {
  const out = [];

  const cSlashE = parseChord('C/E');
  out.push({
    name: 'chordParser C/E: root C, bass E, quality major',
    ok:
      cSlashE?.root === 'C' &&
      cSlashE?.bass === 'E' &&
      cSlashE?.quality === 'major',
  });

  const g711 = parseChord('G7#11');
  out.push({
    name: 'chordParser G7#11: root G, quality dom7, extension #11',
    ok:
      g711?.root === 'G' &&
      g711?.quality === 'dom7' &&
      Array.isArray(g711?.extensions) &&
      g711.extensions.includes('#11'),
  });

  const csus2add9 = parseChord('Csus2add9');
  out.push({
    name: 'chordParser Csus2add9: root C, quality sus2, extension add9',
    ok:
      csus2add9?.root === 'C' &&
      csus2add9?.quality === 'sus2' &&
      Array.isArray(csus2add9?.extensions) &&
      csus2add9.extensions.includes('add9'),
  });

  const cmM7 = parseChord('CmM7');
  out.push({
    name: 'chordParser CmM7: root C, quality minMaj7',
    ok: cmM7?.root === 'C' && cmM7?.quality === 'minMaj7',
  });

  const bb7b9 = parseChord('Bb7b9');
  out.push({
    name: 'chordParser Bb7b9: root Bb, quality dom7, extension b9',
    ok:
      bb7b9?.root === 'Bb' &&
      bb7b9?.quality === 'dom7' &&
      Array.isArray(bb7b9?.extensions) &&
      bb7b9.extensions.includes('b9'),
  });

  return out;
}
