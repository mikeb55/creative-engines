/**
 * BHL intention audit.
 * Checks declared phrase intentions against reconstructed MusicXML.
 * A fulfilled intention is not a judgement that the music is good.
 */

import {
  qCmp,
  readBhlEvidence,
  voiceKey,
  type BhlEvidenceReport,
  type BhlTimelineEvent,
} from './bhlEvidence';
import type { BhlPhrasePlan, BhlPhraseRegion } from './bhlPhrase';

export type BhlIntentStatus = 'VERIFIED' | 'NOT OBSERVED' | 'INDETERMINATE';

export interface BhlIntentCheck {
  regionId: string;
  role: string;
  intention: string;
  status: BhlIntentStatus;
  evidence: string;
}

interface LineNote {
  bar: number;
  midi: number;
  durationN: number;
  durationD: number;
}

function guitarKeys(report: BhlEvidenceReport): string[] {
  return [...new Set(report.events.filter((event) => /guitar/i.test(event.partName)).map(voiceKey))];
}

function bassKeys(report: BhlEvidenceReport): string[] {
  return [...new Set(report.events.filter((event) => /bass|cello|contrabass/i.test(event.partName)).map(voiceKey))];
}

function lineOf(report: BhlEvidenceReport, keys: readonly string[], bars: readonly number[]): LineNote[] {
  const attacks = report.events.filter(
    (event) => event.attack && event.midi !== null && keys.includes(voiceKey(event)) && bars.includes(event.bar),
  );
  const groups = new Map<string, BhlTimelineEvent[]>();
  for (const attack of attacks) {
    const id = `${attack.bar}|${attack.onset.n}/${attack.onset.d}`;
    const list = groups.get(id) ?? [];
    list.push(attack);
    groups.set(id, list);
  }
  return [...groups.values()].map((group) => {
    const top = group.reduce((best, event) => (event.midi! > best.midi! ? event : best));
    return { bar: top.bar, midi: top.midi!, durationN: top.duration.n, durationD: top.duration.d };
  });
}

function pcStep(delta: number): number {
  let step = delta % 12;
  if (step > 6) step -= 12;
  if (step < -6) step += 12;
  return step;
}

function stepsOf(line: readonly LineNote[]): number[] {
  return line.slice(1).map((note, index) => pcStep(note.midi - line[index]!.midi));
}

function sameSteps(heard: readonly number[], motif: readonly number[]): boolean {
  return heard.length === motif.length && heard.every((step, index) => step === motif[index]);
}

function hasFragment(heard: readonly number[], motif: readonly number[]): boolean {
  if (motif.length < 2 || heard.length < 2) return false;
  for (let length = 2; length <= motif.length; length++) {
    const needle = motif.slice(0, length);
    for (let start = 0; start <= heard.length - length; start++) {
      if (sameSteps(heard.slice(start, start + length), needle)) return true;
    }
  }
  return false;
}

function registerSpan(line: readonly LineNote[]): string {
  if (!line.length) return 'empty';
  const midis = line.map((note) => note.midi);
  return `${Math.min(...midis)}–${Math.max(...midis)}`;
}

function check(region: BhlPhraseRegion, intention: string, status: BhlIntentStatus, evidence: string): BhlIntentCheck {
  return { regionId: region.id, role: region.role, intention, status, evidence };
}

export function auditBhlIntentions(xml: string, plan: BhlPhrasePlan): BhlIntentCheck[] {
  const report = readBhlEvidence(xml, plan.span);
  const guitars = guitarKeys(report);
  const basses = bassKeys(report);
  const statement = plan.regions.find((region) => region.role === 'statement');
  const statementLine = statement ? lineOf(report, guitars, statement.bars) : [];
  const statementSteps = stepsOf(statementLine);
  const results: BhlIntentCheck[] = [];

  for (const region of plan.regions) {
    const line = lineOf(report, guitars, region.bars);
    const heard = stepsOf(line);
    if (region.role === 'statement') {
      if (line.length < 2 || plan.motif.intervals.length < 1) {
        results.push(check(region, `Present the declared motif (${region.pitchTransform}).`, 'INDETERMINATE', 'Not enough sounding attacks to recognise a motif.'));
      } else if (sameSteps(heard.slice(0, plan.motif.intervals.length), plan.motif.intervals) || sameSteps(heard, plan.motif.intervals)) {
        results.push(check(region, `Present the declared motif (${region.pitchTransform}).`, 'VERIFIED', `Sounding steps ${heard.join(', ')} match the declared intervals ${plan.motif.intervals.join(', ')}.`));
      } else {
        results.push(check(region, `Present the declared motif (${region.pitchTransform}).`, 'NOT OBSERVED', `Sounding steps ${heard.join(', ') || 'none'} do not match declared intervals ${plan.motif.intervals.join(', ')}.`));
      }
    }
    if (region.role === 'transformation') {
      if (statementLine.length < 2 || line.length < 2) {
        results.push(check(region, `Show a change of pitch, interval, rhythm, or register (${region.pitchTransform}, ${region.rhythmTransform}).`, 'INDETERMINATE', 'The statement or this region does not have enough notes to compare.'));
      } else {
        const rhythmDiffers = line.some((note, index) => {
          const other = statementLine[index];
          return !other || note.durationN !== other.durationN || note.durationD !== other.durationD;
        });
        const changed = !sameSteps(heard, statementSteps) || rhythmDiffers || registerSpan(line) !== registerSpan(statementLine);
        results.push(check(
          region,
          `Show a change of pitch, interval, rhythm, or register (${region.pitchTransform}, ${region.rhythmTransform}).`,
          changed ? 'VERIFIED' : 'NOT OBSERVED',
          `Statement steps ${statementSteps.join(', ')}; this region ${heard.join(', ')}; register ${registerSpan(line)} against ${registerSpan(statementLine)}.`,
        ));
      }
    }
    if (region.role === 'development') {
      if (statementSteps.length < 2 || heard.length < 2) {
        results.push(check(region, 'Keep a recognisable interval relationship with the earlier motif.', 'INDETERMINATE', 'Not enough intervals to judge a relationship. Shared pitch classes alone are not a match.'));
      } else if (hasFragment(heard, statementSteps) || hasFragment(heard, plan.motif.intervals)) {
        results.push(check(region, 'Keep a recognisable interval relationship with the earlier motif.', 'VERIFIED', `Heard steps ${heard.join(', ')} share a contiguous interval fragment with the earlier line.`));
      } else {
        results.push(check(region, 'Keep a recognisable interval relationship with the earlier motif.', 'NOT OBSERVED', `Heard steps ${heard.join(', ')} do not repeat a contiguous interval fragment. Pitch-class overlap was not treated as a match.`));
      }
    }
    if (region.role === 'return') {
      if (heard.length < plan.motif.intervals.length || plan.motif.intervals.length < 1) {
        results.push(check(region, 'Bring identifiable motif material back.', 'INDETERMINATE', 'The return region is too short to confirm recurrence.'));
      } else if (sameSteps(heard, plan.motif.intervals) || sameSteps(heard, statementSteps)) {
        results.push(check(region, 'Bring identifiable motif material back.', 'VERIFIED', `Heard steps ${heard.join(', ')} match the motif or the statement.`));
      } else if (hasFragment(heard, plan.motif.intervals)) {
        results.push(check(region, 'Bring identifiable motif material back.', 'INDETERMINATE', `Only a fragment was found (${heard.join(', ')}). That is not enough to call it a return.`));
      } else {
        results.push(check(region, 'Bring identifiable motif material back.', 'NOT OBSERVED', `Heard steps ${heard.join(', ')} do not recur.`));
      }
    }
    if (region.role === 'continuation') {
      results.push(check(region, `Continue from the previous region (${region.pitchTransform}).`, 'INDETERMINATE', 'Continuation has no sharper musical test. The composer decides whether it continues.'));
    }

    if (region.dialogue === 'counter-motion') {
      const contrary = report.motions.filter((motion) => {
        if (motion.kind !== 'contrary' || !region.bars.includes(motion.bar)) return false;
        const roles = [motion.voiceA, motion.voiceB].map((key) => {
          if (guitars.includes(key)) return 'guitar';
          if (basses.includes(key)) return 'bass';
          return 'other';
        });
        return roles.includes('guitar') && roles.includes('bass');
      });
      const together = report.activity.some((row) => region.bars.includes(row.bar) && row.simultaneous);
      results.push(check(
        region,
        'Two independently sounding lines move in opposite directions.',
        contrary.length ? 'VERIFIED' : together ? 'NOT OBSERVED' : 'INDETERMINATE',
        contrary.length
          ? `${contrary.length} contrary motion${contrary.length === 1 ? '' : 's'} between guitar and bass.`
          : together
            ? 'Guitar and bass sound together, and no contrary motion was found.'
            : 'Guitar and bass do not overlap enough to judge counter-motion.',
      ));
    }
    if (region.dialogue === 'handoff-before-bass' || region.dialogue === 'answer-after-bass') {
      const handoff = report.entries.filter((entry) => entry.kind === 'handoff' && region.bars.includes(entry.bar));
      const answered = region.bars.some((bar) => {
        const bassOnsets = report.events.filter((event) => event.attack && basses.includes(voiceKey(event)) && event.bar === bar);
        const guitarOnsets = report.events.filter((event) => event.attack && guitars.includes(voiceKey(event)) && event.bar === bar);
        return bassOnsets.some((bass) => guitarOnsets.some((guitar) => qCmp(guitar.onset, bass.onset) > 0));
      });
      const intention = region.dialogue === 'handoff-before-bass'
        ? 'The entry and rest relationship hands activity from one instrument to the other.'
        : 'The guitar answers after the bass has attacked.';
      const seen = region.dialogue === 'answer-after-bass' ? answered || handoff.length > 0 : handoff.length > 0;
      const present = line.length > 0 && report.events.some((event) => event.attack && basses.includes(voiceKey(event)) && region.bars.includes(event.bar));
      results.push(check(
        region,
        intention,
        seen ? 'VERIFIED' : present ? 'NOT OBSERVED' : 'INDETERMINATE',
        seen
          ? region.dialogue === 'answer-after-bass' && answered
            ? 'A guitar attack falls after a bass attack in the same bar.'
            : `${handoff.length} handoff entr${handoff.length === 1 ? 'y' : 'ies'} during the other instrument's rest.`
          : 'The declared entry/rest relationship was not found in the reconstructed score.',
      ));
    }
    if (region.dialogue === 'leave-space') {
      const rests = report.silences.filter((silence) => region.bars.includes(silence.bar) && guitars.includes(silence.voice));
      results.push(check(
        region,
        'Leave rests where the guitar is meant to leave space.',
        rests.length ? 'VERIFIED' : line.length ? 'NOT OBSERVED' : 'INDETERMINATE',
        rests.length ? `${rests.length} guitar rest${rests.length === 1 ? '' : 's'} in this region.` : 'No guitar rest or unwritten gap was found.',
      ));
    }
  }
  return results;
}
