/**
 * Before/after evidence for a plan edit.
 * MusicXML hashes are recorded and then ignored as proof.
 */

import { createHash } from 'node:crypto';
import type { CompiledPerformance } from './compilePerformancePlan';
import type { SectionSchedule } from './performancePlanTypes';

export interface MutationReport {
  name: string;
  status: 'PASS' | 'FAIL';
  lines: string[];
}

function point(schedule: SectionSchedule | undefined, player: 'guitar' | 'bass', edge: 'entry' | 'exit'): string {
  const window = schedule?.[player];
  if (!window) return 'none';
  const at = window[edge];
  return `bar ${at.bar} + ${at.offsetQ.n}/${at.offsetQ.d}`;
}

function scheduleOf(compiled: CompiledPerformance, sectionId: string): SectionSchedule | undefined {
  return compiled.receipt.schedule?.find((item) => item.sectionId === sectionId);
}

function primaryIds(compiled: CompiledPerformance, player: 'guitar' | 'bass'): string[] {
  return compiled.receipt.sourceMap.filter((row) => row.player === player && row.use === 'primary').map((row) => row.sourceMeasureId ?? '');
}

function notationStrip(compiled: CompiledPerformance, sectionId: string, player: 'guitar' | 'bass'): string {
  return compiled.receipt.sourceMap
    .filter((row) => row.sectionId === sectionId && row.player === player)
    .map((row) => row.notation ?? '?')
    .join(',');
}

export function describeMutation(options: {
  name: string;
  claim: string;
  before: CompiledPerformance;
  after: CompiledPerformance;
  sectionId: string;
  passed: boolean;
  extra?: string[];
}): MutationReport {
  const left = scheduleOf(options.before, options.sectionId);
  const right = scheduleOf(options.after, options.sectionId);
  const beforeXml = createHash('sha256').update(options.before.bars.map((bar) => `${bar.outputBar}:${bar.guitar.barNotation}:${bar.bass.barNotation}`).join('|')).digest('hex');
  const afterXml = createHash('sha256').update(options.after.bars.map((bar) => `${bar.outputBar}:${bar.guitar.barNotation}:${bar.bass.barNotation}`).join('|')).digest('hex');
  const lines = [
    `### ${options.name}`,
    '',
    `Status: **${options.passed ? 'PASS' : 'FAIL'}**`,
    options.claim,
    `Section \`${options.sectionId}\` bars ${left?.barCount ?? 'n/a'} → ${right?.barCount ?? 'n/a'}. Planned ${left?.plannedBarCount ?? 'n/a'} → ${right?.plannedBarCount ?? 'n/a'}.`,
    `Guitar entry ${point(left, 'guitar', 'entry')} → ${point(right, 'guitar', 'entry')}. Exit ${point(left, 'guitar', 'exit')} → ${point(right, 'guitar', 'exit')}.`,
    `Bass entry ${point(left, 'bass', 'entry')} → ${point(right, 'bass', 'entry')}. Exit ${point(left, 'bass', 'exit')} → ${point(right, 'bass', 'exit')}.`,
    `Cue owners ${left?.cues.map((cue) => `${cue.cueId}:${cue.owner}@${cue.at.bar}+${cue.at.offsetQ.n}/${cue.at.offsetQ.d}`).join('; ') || 'none'}`,
    `→ ${right?.cues.map((cue) => `${cue.cueId}:${cue.owner}@${cue.at.bar}+${cue.at.offsetQ.n}/${cue.at.offsetQ.d}`).join('; ') || 'none'}`,
    `Guitar notation ${notationStrip(options.before, options.sectionId, 'guitar')} → ${notationStrip(options.after, options.sectionId, 'guitar')}`,
    `Bass notation ${notationStrip(options.before, options.sectionId, 'bass')} → ${notationStrip(options.after, options.sectionId, 'bass')}`,
    `Primary guitar ids ${primaryIds(options.before, 'guitar').join(',') === primaryIds(options.after, 'guitar').join(',') ? 'unchanged' : 'CHANGED'}.`,
    `Lane fingerprint ${beforeXml} → ${afterXml}. A hash difference is not the evidence. The points above are.`,
    ...(options.extra ?? []),
    '',
  ];
  return { name: options.name, status: options.passed ? 'PASS' : 'FAIL', lines };
}
