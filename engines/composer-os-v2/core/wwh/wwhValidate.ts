/**
 * Re-parse WWH MusicXML and check duo structure, durations, and notation bans.
 */

import { importWwhDuoMusicXml, type WwhDuoScore, type WwhImportedMeasure } from './wwhDuoImport';
import { wwhBarTicks } from './wwhPerformanceTypes';

export interface WwhAudit {
  ok: boolean;
  barCount: number;
  lines: string[];
}

function voiceSums(measure: WwhImportedMeasure): Map<string, number> {
  const sums = new Map<string, number>();
  for (const note of measure.notes) {
    if (note.chord) continue;
    sums.set(note.voice, (sums.get(note.voice) ?? 0) + note.duration);
  }
  return sums;
}

export function auditWwhMusicXml(xml: string, label: string): WwhAudit {
  const lines: string[] = [];
  let score: WwhDuoScore;
  try {
    score = importWwhDuoMusicXml(xml);
  } catch (error) {
    return { ok: false, barCount: 0, lines: [`${label}: parse failed — ${error instanceof Error ? error.message : String(error)}`] };
  }
  lines.push(`${label}: parts ${score.guitar.name} + ${score.bass.name}, ${score.guitar.measures.length} bars`);
  if (!/guitar/i.test(score.guitar.name) || !/bass/i.test(score.bass.name)) {
    lines.push(`${label}: FAIL instrument names`);
  }
  if (/<technical>|<staff-type>\s*tab/i.test(xml)) {
    lines.push(`${label}: FAIL tablature present`);
  }
  let durationFails = 0;
  for (const part of [score.guitar, score.bass]) {
    for (const measure of part.measures) {
      const expected = wwhBarTicks(measure.beats, measure.beatType, measure.divisions);
      const sums = voiceSums(measure);
      if (!sums.size) {
        durationFails += 1;
        continue;
      }
      for (const sum of sums.values()) {
        if (sum !== expected) durationFails += 1;
      }
    }
  }
  lines.push(`${label}: duration mismatches ${durationFails}`);
  const marks = score.guitar.measures.flatMap((measure) => measure.rehearsal);
  lines.push(`${label}: rehearsal marks ${marks.length ? marks.join(' ') : 'NONE'}`);
  const ok = durationFails === 0 && !lines.some((line) => line.includes('FAIL'));
  return { ok, barCount: score.guitar.measures.length, lines };
}
