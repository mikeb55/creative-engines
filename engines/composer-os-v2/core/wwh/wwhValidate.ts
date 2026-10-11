/**
 * Re-parse WWH MusicXML and check duo structure, durations, and notation bans.
 */

import { importWwhDuoMusicXml, type WwhDuoScore, type WwhImportedMeasure } from './wwhDuoImport';
import { durationAgreement, wwhBarTicksExact } from './wwhTiming';

export interface WwhAudit {
  ok: boolean;
  barCount: number;
  lines: string[];
  roundedTuplets: number;
  agreementFails: number;
  pickupBars: number;
}

function voiceSums(measure: WwhImportedMeasure): Map<string, number> {
  const sums = new Map<string, number>();
  for (const note of measure.notes) {
    if (note.chord) continue;
    sums.set(note.voice, (sums.get(note.voice) ?? 0) + note.storedDuration);
  }
  return sums;
}

export function auditWwhMusicXml(xml: string, label: string): WwhAudit {
  const lines: string[] = [];
  let score: WwhDuoScore;
  try {
    score = importWwhDuoMusicXml(xml);
  } catch (error) {
    return {
      ok: false,
      barCount: 0,
      lines: [`${label}: parse failed — ${error instanceof Error ? error.message : String(error)}`],
      roundedTuplets: 0,
      agreementFails: 0,
      pickupBars: 0,
    };
  }
  lines.push(`${label}: parts ${score.guitar.name} + ${score.bass.name}, ${score.guitar.measures.length} bars`);
  if (!/guitar/i.test(score.guitar.name) || !/bass/i.test(score.bass.name)) {
    lines.push(`${label}: FAIL instrument names`);
  }
  if (/<technical>|<staff-type>\s*tab/i.test(xml)) {
    lines.push(`${label}: FAIL tablature present`);
  }
  let durationFails = 0;
  let agreementFails = 0;
  let roundedTuplets = 0;
  let pickupBars = 0;
  for (const part of [score.guitar, score.bass]) {
    for (const measure of part.measures) {
      const expected = wwhBarTicksExact(measure.beats, measure.beatType, measure.statedDivisions);
      const sums = voiceSums(measure);
      if (measure.implicit) pickupBars += 1;
      if (expected === null || !sums.size) {
        durationFails += 1;
      } else if (measure.implicit) {
        for (const sum of sums.values()) {
          if (sum <= 0 || sum >= expected) durationFails += 1;
        }
      } else {
        for (const sum of sums.values()) {
          if (sum !== expected) durationFails += 1;
        }
      }
      for (const note of measure.notes) {
        // Chord tones keep the file's stored duration. Agreement uses the
        // importer's aligned duration when type, dots, and tuplet match the attack.
        const agreement = durationAgreement(
          measure.statedDivisions,
          note.type,
          note.dots,
          note.duration,
          note.timeModification
        );
        if (agreement === 'mismatch') agreementFails += 1;
        if (agreement === 'rounded-tuplet') roundedTuplets += 1;
      }
    }
  }
  const repairs = [score.guitar, score.bass].flatMap((part) =>
    part.measures.flatMap((measure) => measure.timingRepairs)
  );
  if (repairs.length) lines.push(`${label}: timing read ${repairs.join('; ')}`);
  lines.push(`${label}: duration mismatches ${durationFails}`);
  lines.push(`${label}: duration/type mismatches ${agreementFails}`);
  lines.push(`${label}: rounded tuplets ${roundedTuplets}`);
  lines.push(`${label}: pickup bars ${pickupBars}`);
  const marks = score.guitar.measures.flatMap((measure) => measure.rehearsal);
  lines.push(`${label}: rehearsal marks ${marks.length ? marks.join(' ') : 'NONE'}`);
  const divisions = [...new Set([...score.guitar.measures, ...score.bass.measures].map((measure) => measure.statedDivisions))];
  lines.push(`${label}: divisions ${divisions.join(',')}`);
  const ok = durationFails === 0 && agreementFails === 0 && !lines.some((line) => line.includes('FAIL'));
  return { ok, barCount: score.guitar.measures.length, lines, roundedTuplets, agreementFails, pickupBars };
}
