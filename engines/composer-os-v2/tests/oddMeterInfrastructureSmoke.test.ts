/**
 * Smoke — Phase A odd-meter infrastructure (meter map, quantiser, MusicXML `<time>` boundaries).
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import {
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

  return out;
}
