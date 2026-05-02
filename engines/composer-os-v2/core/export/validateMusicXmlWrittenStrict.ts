/**
 * Deterministic validation of WRITTEN MusicXML (string), not internal score objects.
 * Catches: per-voice sum errors, linear measure overflow (missing <backup> between voices),
 * and internal vs exported duration mismatch.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { DIVISIONS } from '../score-model/scoreModelTypes';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { computeVoiceExportDivisionSum } from './musicxmlExporter';
import { validateExportedMusicXmlBarMath } from './validateMusicXmlBarMath';
import { measureDivisionsForMeter, resolveMeasureDivisionsForBar } from '../rhythm/oddMeterQuantiser';

export interface MusicXmlWrittenStrictResult {
  valid: boolean;
  errors: string[];
  linearTimeline?: { partId: string; measureNumber: number; endCursor: number }[];
}

/** Strip non–time-advancing children of <measure> for linear parsing. */
function stripMeasureDecorations(measureInner: string): string {
  return measureInner
    .replace(/<attributes>[\s\S]*?<\/attributes>/g, '')
    .replace(/<direction[^>]*>[\s\S]*?<\/direction>/g, '')
    .replace(/<harmony[^>]*>[\s\S]*?<\/harmony>/g, '')
    .replace(/<barline[^>]*>[\s\S]*?<\/barline>/g, '')
    .replace(/<sound[^>]*\/>/g, '')
    .replace(/<print[^>]*\/>/g, '');
}

/** Walk document order: note (skip chord-stacked notes for cursor), backup, forward. */
function simulateMeasureLinearCursor(
  measureInner: string,
  measureCapacityTicks: number
): { cursor: number; errors: string[] } {
  const errors: string[] = [];
  const stripped = stripMeasureDecorations(measureInner);
  let cursor = 0;
  let pos = 0;
  while (pos < stripped.length) {
    const iNote = stripped.indexOf('<note', pos);
    const iBackup = stripped.indexOf('<backup', pos);
    const iForward = stripped.indexOf('<forward', pos);
    const candidates = [
      iNote >= 0 ? iNote : Infinity,
      iBackup >= 0 ? iBackup : Infinity,
      iForward >= 0 ? iForward : Infinity,
    ];
    const next = Math.min(...candidates);
    if (next === Infinity) break;
    if (next === iNote) {
      const close = stripped.indexOf('</note>', next);
      if (close < 0) {
        errors.push('Malformed <note> block');
        break;
      }
      const block = stripped.slice(next, close + '</note>'.length);
      pos = close + '</note>'.length;
      const isChordStack = /<chord\s*\/>/.test(block);
      const dm = block.match(/<duration>(\d+)<\/duration>/);
      const d = dm ? parseInt(dm[1], 10) : 0;
      if (isChordStack) {
        continue;
      }
      if (d <= 0) {
        errors.push(`Note block with invalid duration ${d}`);
        continue;
      }
      cursor += d;
      if (cursor > measureCapacityTicks + 1e-6) {
        errors.push(
          `Linear timeline overflow: cursor ${cursor} > ${measureCapacityTicks} (missing <backup> between voices or bad durations)`
        );
      }
      continue;
    }
    if (next === iBackup) {
      const close = stripped.indexOf('</backup>', next);
      if (close < 0) break;
      const block = stripped.slice(next, close + '</backup>'.length);
      pos = close + '</backup>'.length;
      const dm = block.match(/<duration>(\d+)<\/duration>/);
      const d = dm ? parseInt(dm[1], 10) : 0;
      cursor -= d;
      if (cursor < 0) errors.push(`Backup moved cursor negative: ${cursor}`);
      continue;
    }
    const close = stripped.indexOf('</forward>', next);
    if (close < 0) break;
    const block = stripped.slice(next, close + '</forward>'.length);
    pos = close + '</forward>'.length;
    const dm = block.match(/<duration>(\d+)<\/duration>/);
    const d = dm ? parseInt(dm[1], 10) : 0;
    cursor += d;
    if (cursor > measureCapacityTicks + 1e-6) {
      errors.push(`Forward overflow: cursor ${cursor} > ${measureCapacityTicks}`);
    }
  }
  if (cursor !== measureCapacityTicks) {
    errors.push(
      `Linear measure end cursor ${cursor} ≠ ${measureCapacityTicks} (MusicXML sequential duration / backup contract)`
    );
  }
  return { cursor, errors };
}

/** Full strict pass on written XML string. */
export function validateWrittenMusicXmlStrict(xml: string, barMeterMap?: BarMeterMap): MusicXmlWrittenStrictResult {
  const errors: string[] = [];
  const linearTimeline: { partId: string; measureNumber: number; endCursor: number }[] = [];

  const perVoice = validateExportedMusicXmlBarMath(xml, barMeterMap);
  errors.push(...perVoice.errors);

  const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
  for (const partBlock of partBlocks) {
    const idMatch = partBlock.match(/^<part id="([^"]+)"/);
    const partId = idMatch?.[1] ?? 'unknown';
    const measureBlocks = partBlock.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
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
      const measureCapacityTicks = barMeterMap
        ? resolveMeasureDivisionsForBar(num, barMeterMap)
        : measureDivisionsForMeter(meterNum, meterDen);
      const { cursor, errors: linErr } = simulateMeasureLinearCursor(inner, measureCapacityTicks);
      linearTimeline.push({ partId, measureNumber: num, endCursor: cursor });
      for (const e of linErr) {
        errors.push(`Part ${partId} measure ${num}: ${e}`);
      }
    }
  }

  const tieOpens = (xml.match(/<tie type="start"/g) ?? []).length;
  const tieStops = (xml.match(/<tie type="stop"/g) ?? []).length;
  if (tieOpens !== tieStops) {
    errors.push(`Tie mismatch: ${tieOpens} tie starts vs ${tieStops} tie stops`);
  }

  return { valid: errors.length === 0, errors, linearTimeline };
}

/**
 * Compare export algorithm division totals per voice to parsed XML per-voice sums.
 * Detects drift between frozen score and serialized `<note>` durations.
 */
export function validateScoreModelVsWrittenXmlParity(
  score: ScoreModel,
  xml: string,
  barMeterMap?: BarMeterMap
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
  const partById = new Map(score.parts.map((p) => [p.id, p]));

  for (const partBlock of partBlocks) {
    const idMatch = partBlock.match(/^<part id="([^"]+)"/);
    const partId = idMatch?.[1];
    if (!partId) continue;
    const part = partById.get(partId);
    if (!part) continue;

    const measureBlocks = partBlock.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
    let i = 0;
    for (const mb of measureBlocks) {
      const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
      const xmlMeasureNum = numMatch ? parseInt(numMatch[1], 10) : i + 1;
      const ordered = [...part.measures].sort((a, b) => a.index - b.index);
      const m = ordered[i];
      if (!m) break;

      const inner = mb.replace(/^<measure[^>]*>/, '').replace(/<\/measure>\s*$/, '');
      const voiceSums = new Map<number, number>();
      const noteBlocks = inner.match(/<note[^>]*>[\s\S]*?<\/note>/g) ?? [];
      for (const block of noteBlocks) {
        if (/<chord\s*\/>/.test(block)) continue;
        const dm = block.match(/<duration>(\d+)<\/duration>/);
        const vm = block.match(/<voice>(\d+)<\/voice>/);
        const voice = vm ? parseInt(vm[1], 10) : 1;
        const dur = dm ? parseInt(dm[1], 10) : 0;
        voiceSums.set(voice, (voiceSums.get(voice) ?? 0) + dur);
      }

      const voicesInScore = new Set(m.events.map((e) => e.voice ?? 1));
      const allVoices = new Set([...voicesInScore, ...voiceSums.keys()]);
      const measureCapacityTicks = barMeterMap
        ? resolveMeasureDivisionsForBar(xmlMeasureNum, barMeterMap)
        : Math.round(measureBeatSpanQuartersOf(m) * DIVISIONS);
      for (const v of allVoices) {
        const expected = computeVoiceExportDivisionSum(m, v, measureCapacityTicks);
        const written = voiceSums.get(v) ?? 0;
        if (expected !== written) {
          errors.push(
            `Parity part ${partId} measure ${xmlMeasureNum} voice ${v}: export-algorithm divisions ${expected} ≠ written XML sum ${written}`
          );
        }
      }
      i++;
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Bar math (per voice) + linear timeline + tie balance + score↔XML parity (same algorithm as export). */
export function validateWrittenMusicXmlComplete(
  score: ScoreModel,
  xml: string,
  barMeterMap?: BarMeterMap
): { valid: boolean; errors: string[] } {
  const strict = validateWrittenMusicXmlStrict(xml, barMeterMap);
  const parity = validateScoreModelVsWrittenXmlParity(score, xml, barMeterMap);
  const errors = [...strict.errors, ...parity.errors];
  return { valid: errors.length === 0, errors };
}
