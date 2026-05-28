/**
 * Martino convert gate — imported by composer-os smoke.
 */

import { convert_progression, martino_convert } from '../martinoConvert.js';

export function runMartinoConvertGateTests() {
  const out = [];

  out.push({
    name: 'martinoConvert Fmaj7#11 → Dm',
    ok: martino_convert('Fmaj7#11').minorRoot === 'Dm',
  });
  out.push({
    name: 'martinoConvert Ebmaj7#5 → Cm',
    ok: martino_convert('Ebmaj7#5').minorRoot === 'Cm',
  });
  out.push({
    name: 'martinoConvert Bbm9 → Bbm',
    ok: martino_convert('Bbm9').minorRoot === 'Bbm',
  });
  out.push({
    name: 'martinoConvert G/F → Em',
    ok: martino_convert('G/F').minorRoot === 'Em',
  });
  out.push({
    name: 'martinoConvert Cmaj6 → Am',
    ok: martino_convert('Cmaj6').minorRoot === 'Am',
  });
  out.push({
    name: 'martinoConvert Cmaj7 → Em',
    ok: martino_convert('Cmaj7').minorRoot === 'Em',
  });
  out.push({
    name: 'martinoConvert G7 low → Dm',
    ok: martino_convert('G7', 'low').minorRoot === 'Dm',
  });
  out.push({
    name: 'martinoConvert G7 med → Abm',
    ok: martino_convert('G7', 'medium').minorRoot === 'Abm',
  });
  out.push({
    name: 'martinoConvert Cm7b5 → Ebm',
    ok: martino_convert('Cm7b5').minorRoot === 'Ebm',
  });
  out.push({
    name: 'martinoConvert Gb7alt → Gm',
    ok: martino_convert('Gb7alt').minorRoot === 'Gm',
  });

  const iiVi = convert_progression(['Dm7', 'G7', 'Cmaj7'], {});
  out.push({
    name: 'martinoConvert progression Dm7 G7 Cmaj7',
    ok:
      iiVi[0].minorRoot === 'Dm' &&
      iiVi[1].minorRoot === 'Dm' &&
      iiVi[2].minorRoot === 'Em',
  });

  const orbitSeq = convert_progression(['Fmaj7#11', 'Ebmaj7#5', 'Dbmaj7', 'Bmaj7'], {});
  out.push({
    name: 'martinoConvert Orbit chromatic sequence',
    ok:
      orbitSeq[0].minorRoot === 'Dm' &&
      orbitSeq[1].minorRoot === 'Cm' &&
      orbitSeq[2].minorRoot === 'Bbm' &&
      orbitSeq[3].minorRoot === 'Abm',
  });

  return out;
}
