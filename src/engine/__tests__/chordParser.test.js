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
    name: 'chordParser Bb7b9: root Bb, quality dom7alt, extension b9',
    ok:
      bb7b9?.root === 'Bb' &&
      bb7b9?.quality === 'dom7alt' &&
      Array.isArray(bb7b9?.extensions) &&
      bb7b9.extensions.includes('b9'),
  });

  const cm7b5 = parseChord('Cm7b5');
  out.push({
    name: 'chordParser Cm7b5: root C, quality m7b5',
    ok: cm7b5?.root === 'C' && cm7b5?.quality === 'm7b5',
  });

  const bHalfDim = parseChord('Bø');
  out.push({
    name: 'chordParser Bø: root B, quality m7b5',
    ok: bHalfDim?.root === 'B' && bHalfDim?.quality === 'm7b5',
  });

  const cdim7 = parseChord('Cdim7');
  out.push({
    name: 'chordParser Cdim7: root C, quality dim7',
    ok: cdim7?.root === 'C' && cdim7?.quality === 'dim7',
  });

  const cdim = parseChord('Cdim');
  out.push({
    name: 'chordParser Cdim: root C, quality dim',
    ok: cdim?.root === 'C' && cdim?.quality === 'dim',
  });

  const c6 = parseChord('Cmaj6');
  out.push({
    name: 'chordParser Cmaj6: root C, quality maj6',
    ok: c6?.root === 'C' && c6?.quality === 'maj6',
  });

  const cAug = parseChord('Caug');
  out.push({
    name: 'chordParser Caug: root C, quality aug',
    ok: cAug?.root === 'C' && cAug?.quality === 'aug',
  });

  const c7alt = parseChord('C7alt');
  out.push({
    name: 'chordParser C7alt: root C, quality dom7alt',
    ok: c7alt?.root === 'C' && c7alt?.quality === 'dom7alt',
  });

  const fMaj711 = parseChord('Fmaj7#11');
  out.push({
    name: 'chordParser Fmaj7#11: root F, quality maj7, extension #11',
    ok:
      fMaj711?.root === 'F' &&
      fMaj711?.quality === 'maj7' &&
      Array.isArray(fMaj711?.extensions) &&
      fMaj711.extensions.includes('#11'),
  });

  const ebMaj75 = parseChord('Ebmaj7#5');
  out.push({
    name: 'chordParser Ebmaj7#5: root Eb, quality maj7, extension #5',
    ok:
      ebMaj75?.root === 'Eb' &&
      ebMaj75?.quality === 'maj7' &&
      Array.isArray(ebMaj75?.extensions) &&
      ebMaj75.extensions.includes('#5'),
  });

  const bbm9 = parseChord('Bbm9');
  out.push({
    name: 'chordParser Bbm9: root Bb, quality min9',
    ok: bbm9?.root === 'Bb' && bbm9?.quality === 'min9',
  });

  const gSlashF = parseChord('G/F');
  out.push({
    name: 'chordParser G/F: root G, bass F, quality major',
    ok:
      gSlashF?.root === 'G' &&
      gSlashF?.bass === 'F' &&
      gSlashF?.quality === 'major',
  });

  const ebSlashF = parseChord('Eb/F');
  out.push({
    name: 'chordParser Eb/F: root Eb, bass F, quality major',
    ok:
      ebSlashF?.root === 'Eb' &&
      ebSlashF?.bass === 'F' &&
      ebSlashF?.quality === 'major',
  });

  return out;
}
