/**
 * Post-export: verify exported MusicXML measure duration sums (divisions) per voice match each measure's `<time>`.
 */

import { DIVISIONS } from '../score-model/scoreModelTypes';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import {
  measureDivisionsForMeter,
  resolveMeasureDivisionsForBar,
  resolveMeterForBar,
} from '../rhythm/oddMeterQuantiser';

console.log('[BARMATH] loaded, has barMeterMap support:', true);

export interface MusicXmlBarMathResult {
  valid: boolean;
  errors: string[];
  /** Per part id → measure number → voice → sum of divisions */
  sums?: Record<string, Record<number, Record<number, number>>>;
}

function sumDurationsPerVoice(measureInner: string): Map<number, number> {
  const voiceSums = new Map<number, number>();
  const noteBlocks = measureInner.match(/<note[^>]*>[\s\S]*?<\/note>/g) ?? [];
  for (const block of noteBlocks) {
    if (/<chord\s*\/>/.test(block)) continue;
    const dm = block.match(/<duration>(\d+)<\/duration>/);
    const vm = block.match(/<voice>(\d+)<\/voice>/);
    const voice = vm ? parseInt(vm[1], 10) : 1;
    const dur = dm ? parseInt(dm[1], 10) : 0;
    voiceSums.set(voice, (voiceSums.get(voice) ?? 0) + dur);
  }
  return voiceSums;
}

/**
 * Validates each voice in each measure sums to divisions implied by the active `<time>`; measure 1 must include `<time>`.
 * When `barMeterMap` is set (mixed meters), expected ticks per bar come from {@link resolveMeasureDivisionsForBar}
 * so 7/8 bars use 1680 @ DIVISIONS=480, not 4/4’s 1920.
 */
export function validateExportedMusicXmlBarMath(xml: string, barMeterMap?: BarMeterMap): MusicXmlBarMathResult {
  const errors: string[] = [];
  const sums: Record<string, Record<number, Record<number, number>>> = {};

  if (!xml.includes('<score-partwise')) {
    return { valid: false, errors: ['Not score-partwise MusicXML'], sums };
  }

  const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
  if (partBlocks.length === 0) {
    return { valid: false, errors: ['No <part> elements found'], sums };
  }

  for (const partBlock of partBlocks) {
    const idMatch = partBlock.match(/^<part id="([^"]+)"/);
    const partId = idMatch?.[1] ?? 'unknown';
    sums[partId] = {};

    const measureBlocks = partBlock.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
    let measureIdx = 0;
    let meterNum = 4;
    let meterDen = 4;
    for (const mb of measureBlocks) {
      const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
      const num = numMatch ? parseInt(numMatch[1], 10) : -1;
      const inner = mb.replace(/^<measure[^>]*>/, '').replace(/<\/measure>\s*$/, '');

      const attrsBlocks = inner.match(/<attributes>[\s\S]*?<\/attributes>/g) ?? [];
      for (const ab of attrsBlocks) {
        const tm = ab.match(/<beats>(\d+)<\/beats>\s*<beat-type>(\d+)<\/beat-type>/);
        if (tm) {
          meterNum = parseInt(tm[1]!, 10);
          meterDen = parseInt(tm[2]!, 10);
        }
      }
      const expectedDivisions = barMeterMap
        ? resolveMeasureDivisionsForBar(num, barMeterMap)
        : measureDivisionsForMeter(meterNum, meterDen);

      if (measureIdx === 0) {
        if (!inner.includes(`<divisions>${DIVISIONS}</divisions>`)) {
          errors.push(`Part ${partId} measure ${num}: missing or wrong <divisions> (expected ${DIVISIONS})`);
        }
        if (!/<time>[\s\S]*?<\/time>/.test(inner)) {
          errors.push(`Part ${partId} measure ${num}: missing <time> element in first measure attributes`);
        } else if (barMeterMap) {
          const sig = resolveMeterForBar(1, barMeterMap);
          const beatsOk = inner.includes(`<beats>${sig.numerator}</beats>`);
          const typeOk = inner.includes(`<beat-type>${sig.denominator}</beat-type>`);
          if (!beatsOk || !typeOk) {
            errors.push(
              `Part ${partId} measure ${num}: first-measure <time> must match barMeterMap (${sig.numerator}/${sig.denominator})`
            );
          }
        }
      }
      measureIdx++;

      const voiceSums = sumDurationsPerVoice(inner);
      sums[partId][num] = {};
      if (voiceSums.size === 0) {
        errors.push(`Part ${partId} measure ${num}: no note content`);
        continue;
      }
      for (const [voice, total] of voiceSums) {
        sums[partId][num][voice] = total;
        if (total !== expectedDivisions) {
          const sig = barMeterMap ? resolveMeterForBar(num, barMeterMap) : { numerator: meterNum, denominator: meterDen };
          errors.push(
            `Part ${partId} measure ${num} voice ${voice}: exported duration sum ${total} ≠ ${expectedDivisions} (${sig.numerator}/${sig.denominator} meter)`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, sums };
}
