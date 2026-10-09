/**
 * Performance Composer — K · Keep Version.
 *
 * Applies the accepted (KEEP) results together in one playable score. Adds no new music.
 *   1. N1 INSERT Anticipation — four bars before the head's return.
 *   2. P1 REPLACE Mirror — the return's melody (span moved by the inserted bars).
 *   3. M Space + Wyble — the lane line, moved by the inserted bars; any lane note that would now
 *      clash with the mirrored melody, sit above it, or make an unplayable grip with it is dropped.
 * Each step is verified with its own lock check before the next is applied.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { composeInsert, verifyInsert, INSERT_BARS } from './pcInsert';
import { verifyLockedCopy, writeLane, type PcLaneEvent } from './pcLane';
import { composeMixture } from './pcPhase2';
import { composeReplace, findReplaceSpan, verifyReplace } from './pcReplace';
import { laneSetup, soundingBetween } from './pcRespond';
import { measureViews, parseScoreDocument, partElements } from './pcScore';

export const KEEP_ENGINE = 'pc-keep-3.1';
export const KEEP_LABEL = 'K · Keep Version';

export interface KeepPlan {
  insertBefore: number;
  replaceFrom: number;
  replaceTo: number;
  laneKept: number;
  laneDropped: number;
  partId: string;
  voice: string;
  bars: number;
}

export function composeKeep(sourceXml: string, seed: number): { xml: string; plan: KeepPlan; errors: string[] } {
  const errors: string[] = [];
  // Where things go, read from the untouched source.
  const { tl: srcTl } = laneSetup(sourceXml);
  const span = findReplaceSpan(srcTl);
  // 1. Insert.
  const ins = composeInsert(sourceXml, seed, 'anticipation');
  const v1 = verifyInsert(sourceXml, ins.xml, ins.plan);
  if (!v1.ok) errors.push(...v1.errors.map((e) => `insert: ${e}`));
  const shift = (b: number) => (b >= ins.plan.before ? b + INSERT_BARS : b);
  // 2. Replace on the inserted score, same musical span.
  const rep = composeReplace(ins.xml, seed, 'mirror', { from: shift(span.from), to: shift(span.to) });
  const v2 = verifyReplace(ins.xml, rep.xml, rep.plan);
  if (!v2.ok) errors.push(...v2.errors.map((e) => `replace: ${e}`));
  // 3. The M lane, moved and re-checked against the new melody.
  const mix = composeMixture(sourceXml, seed);
  const { tl } = laneSetup(rep.xml);
  const kept: PcLaneEvent[] = [];
  let dropped = 0;
  for (const e of mix.events) {
    const bar = shift(e.bar);
    const t0 = tl.barStart[bar - 1]! + e.onsetQuarters;
    const t1 = t0 + e.quarters;
    const mel = tl.melodyAll.filter((m) => m.start < t1 - 1e-9 && m.end > t0 + 1e-9).map((m) => m.midi);
    const others = soundingBetween(tl.others, t0, t1);
    const clash = e.midis.some((p) => others.some((o) => { const d = Math.abs(p - o) % 12; return p === o || d === 1 || d === 11; }));
    const above = mel.length > 0 && Math.max(...e.midis) > Math.min(...mel) - 3;
    const grip = !assessGuitarFeasibility([...e.midis, ...mel]).feasible;
    if (clash || above || grip) { dropped++; continue; }
    kept.push({ ...e, bar });
  }
  const bars = measureViews(partElements(parseScoreDocument(rep.xml))[0]!).length;
  const lane = writeLane(rep.xml, { span: { from: 1, to: bars }, events: kept, partId: mix.partId, voice: mix.voice });
  const v3 = verifyLockedCopy(rep.xml, lane.xml, { from: 1, to: bars }, lane.lane);
  if (!v3.ok) errors.push(...v3.errors.map((e) => `lane: ${e}`));
  return {
    xml: lane.xml,
    plan: { insertBefore: ins.plan.before, replaceFrom: rep.plan.from, replaceTo: rep.plan.to, laneKept: kept.length, laneDropped: dropped, partId: mix.partId, voice: mix.voice, bars },
    errors,
  };
}
