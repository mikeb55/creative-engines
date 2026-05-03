/**
 * Smoke — Phase A odd-meter infrastructure (meter map, quantiser, MusicXML `<time>` boundaries).
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import {
  buildComposerOddMeterRows,
  isComposerOddMeterSongwriter,
  measureDivisionsForMeter,
  quantiseToMeter,
  resolveMeasureDivisionsForBar,
} from '../core/rhythm/oddMeterQuantiser';
import { createPart, createScore } from '../core/score-model/scoreEventBuilder';
import { MEASURE_DIVISIONS } from '../core/score-model/scoreModelTypes';

function buildMixedMeterMap12Bars(): BarMeterMap {
  const map: BarMeterMap = {};
  for (let b = 1; b <= 4; b++) map[b] = { numerator: 4, denominator: 4 };
  for (let b = 5; b <= 8; b++) map[b] = { numerator: 7, denominator: 8 };
  for (let b = 9; b <= 12; b++) map[b] = { numerator: 5, denominator: 8 };
  return map;
}

export function runOddMeterInfrastructureSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const mixedMap = buildMixedMeterMap12Bars();

  const q = quantiseToMeter(6, [0.25, 0.55], mixedMap);
  const quantOk =
    q.numerator === 7 &&
    q.denominator === 8 &&
    q.measureDivisions === measureDivisionsForMeter(7, 8) &&
    q.onsetDivisionsSorted.length === 2 &&
    q.onsetDivisionsSorted[0] === 480 &&
    q.onsetDivisionsSorted[1] === 960;

  const div4 = resolveMeasureDivisionsForBar(3, mixedMap);
  const div7 = resolveMeasureDivisionsForBar(6, mixedMap);
  const div5 = resolveMeasureDivisionsForBar(11, mixedMap);
  const divisionsOk =
    div4 === MEASURE_DIVISIONS &&
    div4 === measureDivisionsForMeter(4, 4) &&
    div7 === measureDivisionsForMeter(7, 8) &&
    div5 === measureDivisionsForMeter(5, 8);

  const guitar = createPart(
    'guitar',
    'Electric Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    12,
    () => 'Cmaj7',
    () => undefined
  );
  const score = createScore('Odd meter infra smoke', [guitar]);
  const xr = exportScoreModelToMusicXml(score, { barMeterMap: mixedMap, omitChordSymbols: true });

  const xml = xr.xml ?? '';
  const xmlOk =
    xr.success &&
    /<time>\s*<beats>7<\/beats>\s*<beat-type>8<\/beat-type>\s*<\/time>/.test(xml) &&
    /<time>\s*<beats>5<\/beats>\s*<beat-type>8<\/beat-type>\s*<\/time>/.test(xml) &&
    xml.split('<time>').length >= 4;

  out.push({
    ok: quantOk && divisionsOk && xmlOk,
    name: 'Odd meter Phase A: mixed map quantiser + MusicXML time changes (4/4 → 7/8 → 5/8)',
  });

  out.push({
    ok: isComposerOddMeterSongwriter('donald_fagen'),
    name: 'Composer odd-meter map: isComposerOddMeterSongwriter(donald_fagen)',
  });
  out.push({
    ok: isComposerOddMeterSongwriter('bill_evans'),
    name: 'Composer odd-meter map: isComposerOddMeterSongwriter(bill_evans)',
  });

  const fagen75 = buildComposerOddMeterRows('donald_fagen', 'fagen_seven_five', 8);
  const fagen75Expected = [
    { numerator: 7, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 7, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 7, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 7, denominator: 4 },
    { numerator: 5, denominator: 4 },
  ];
  const fagen75Ok =
    fagen75.length === 8 &&
    fagen75.every((row, i) => row.numerator === fagen75Expected[i]!.numerator && row.denominator === fagen75Expected[i]!.denominator);
  out.push({
    ok: fagen75Ok,
    name: 'Composer odd-meter tiling: Fagen 7+5 → 8 bars (7/4, 5/4)×4',
  });

  const ev53 = buildComposerOddMeterRows('bill_evans', 'evans_five_three', 8);
  const ev53Expected = [
    { numerator: 5, denominator: 4 },
    { numerator: 3, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 3, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 3, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 3, denominator: 4 },
  ];
  const ev53Ok =
    ev53.length === 8 &&
    ev53.every((row, i) => row.numerator === ev53Expected[i]!.numerator && row.denominator === ev53Expected[i]!.denominator);
  out.push({
    ok: ev53Ok,
    name: 'Composer odd-meter tiling: Evans 5+3 → 8 bars (5/4, 3/4)×4',
  });

  return out;
}
