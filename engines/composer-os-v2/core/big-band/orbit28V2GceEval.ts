/**
 * Orbit 120-bar BB — GCE evaluation (8 criteria) for `orbit_28_v2` Pass 3 loop.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { NoteEvent } from '../score-model/scoreModelTypes';
import {
  orbit28V2EnergyTier,
  orbit28V2EnsembleDropout,
  orbit28V2RhythmSectionOnly,
  orbit28V2SaxSoliWindow,
  orbit28V2BrassOnlyWindow,
  orbit28V2SaxOnlyWindow,
  orbit28V2Zone,
  type Orbit28V2GceCriterion,
} from './orbitBbV28V2Arrangement';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_SAXES, BB_PART_TRUMPETS, BB_PART_TROMBONES } from './buildBigBandOrchestrationPlan';

export interface Orbit28V2GceScores {
  dynamic_arc: number;
  sectional_contrast: number;
  dropout_events: number;
  shout_quality: number;
  brass_architecture: number;
  sax_writing: number;
  rhythm_breathing: number;
  human_playability: number;
  mean: number;
}

const CRITERION_ORDER: Orbit28V2GceCriterion[] = [
  'dynamic_arc',
  'sectional_contrast',
  'dropout_events',
  'shout_quality',
  'brass_architecture',
  'sax_writing',
  'rhythm_breathing',
  'human_playability',
];

export function lowestOrbit28V2GceCriterion(
  scores: Orbit28V2GceScores,
  exclude: Orbit28V2GceCriterion[] = []
): Orbit28V2GceCriterion {
  let min: Orbit28V2GceCriterion | undefined;
  let minVal = Infinity;
  for (const c of CRITERION_ORDER) {
    if (exclude.includes(c)) continue;
    const v = scores[c];
    if (v < minVal) {
      min = c;
      minVal = v;
    }
  }
  if (min !== undefined) return min;
  return CRITERION_ORDER[0]!;
}

function partById(score: ScoreModel, id: string) {
  return score.parts.find((p) => p.id === id);
}

function barHasPitchedNotes(score: ScoreModel, partIds: string[], bar: number): boolean {
  for (const pid of partIds) {
    const p = partById(score, pid);
    const m = p?.measures[bar - 1];
    if (!m) continue;
    if (m.events.some((e) => e.kind === 'note')) return true;
  }
  return false;
}

function barWindTexture(score: ScoreModel, bar: number): string {
  const horns = ['bb_alto_sax', 'bb_tenor_sax', 'bb_trumpets', 'bb_trombones'] as const;
  const active = horns.filter((id) => barHasPitchedNotes(score, [id], bar));
  if (active.length === 0) return 'rhythm_only';
  if (active.every((id) => id.includes('sax'))) return 'sax_only';
  if (active.every((id) => !id.includes('sax'))) return 'brass_only';
  return 'mixed';
}

function maxMidiInBar(score: ScoreModel, partId: string, bar: number): number {
  const p = partById(score, partId);
  const m = p?.measures[bar - 1];
  if (!m) return 0;
  let max = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    max = Math.max(max, (e as NoteEvent).pitch);
  }
  return max;
}

function avgVelocityInBar(score: ScoreModel, partIds: string[], bar: number): number {
  let sum = 0;
  let n = 0;
  for (const pid of partIds) {
    const p = partById(score, pid);
    const m = p?.measures[bar - 1];
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const v = (e as NoteEvent).velocity;
      if (typeof v === 'number') {
        sum += v;
        n++;
      }
    }
  }
  return n > 0 ? sum / n : 0;
}

export function evaluateOrbit28V2Gce(score: ScoreModel): Orbit28V2GceScores {
  const totalBars = score.parts[0]?.measures.length ?? 0;
  const hornIds = ['bb_alto_sax', 'bb_tenor_sax', 'bb_trumpets', 'bb_trombones'];

  // 1. Dynamic arc
  const zoneEnergies: Record<string, number[]> = {};
  for (let b = 1; b <= totalBars; b++) {
    const z = orbit28V2Zone(b);
    if (!zoneEnergies[z]) zoneEnergies[z] = [];
    zoneEnergies[z]!.push(orbit28V2EnergyTier(b));
    zoneEnergies[z]!.push(avgVelocityInBar(score, hornIds, b) / 25);
  }
  const sparseMean = avg(zoneEnergies.sparse_open ?? []);
  const shoutMean = avg(zoneEnergies.shout ?? []);
  const buildMean = avg(zoneEnergies.build ?? []);
  let dynamicScore = 6;
  if (shoutMean > buildMean && buildMean > sparseMean) dynamicScore += 2;
  if (shoutMean >= 4.5) dynamicScore += 1;
  if (sparseMean <= 2.5) dynamicScore += 1;

  // 2. Sectional contrast — texture changes per 30-bar window, no static >8 bars
  let contrastScore = 5;
  let maxStatic = 0;
  let staticRun = 1;
  let prevTex = '';
  let changesPerWindow = 0;
  for (let b = 1; b <= totalBars; b++) {
    const tex = barWindTexture(score, b);
    if (tex === prevTex) {
      staticRun++;
    } else {
      maxStatic = Math.max(maxStatic, staticRun);
      staticRun = 1;
      changesPerWindow++;
    }
    prevTex = tex;
    if (b % 30 === 0) {
      if (changesPerWindow >= 3) contrastScore += 0.4;
      changesPerWindow = 0;
    }
  }
  maxStatic = Math.max(maxStatic, staticRun);
  if (maxStatic <= 8) contrastScore += 2;
  else if (maxStatic <= 12) contrastScore += 1;
  contrastScore = clamp10(contrastScore);

  // 3. Dropout events
  let dropoutScore = 4;
  let dropoutsFound = 0;
  for (let b = 1; b <= totalBars; b++) {
    if (orbit28V2EnsembleDropout(b) && !barHasPitchedNotes(score, hornIds, b)) {
      dropoutsFound++;
    }
  }
  if (dropoutsFound >= 3) dropoutScore += 3;
  else if (dropoutsFound >= 2) dropoutScore += 2;
  if ([32, 33, 40, 41, 60, 61, 88, 89].some((b) => orbit28V2EnsembleDropout(b))) dropoutScore += 1;
  dropoutScore = clamp10(dropoutScore);

  // 4. Shout quality (105–120)
  let shoutScore = 5;
  const shoutVel = avg(
    Array.from({ length: 16 }, (_, i) => avgVelocityInBar(score, hornIds, 105 + i))
  );
  const preShoutVel = avg(
    Array.from({ length: 8 }, (_, i) => avgVelocityInBar(score, hornIds, 97 + i))
  );
  if (shoutVel > preShoutVel * 1.1) shoutScore += 2;
  const bar120Hit =
    barHasPitchedNotes(score, hornIds, 120) &&
    maxMidiInBar(score, 'bb_trumpets', 120) >= maxMidiInBar(score, 'bb_trumpets', 100);
  if (bar120Hit) shoutScore += 1;
  const saxAnswer = [109, 110, 111, 112].every(
    (b) => barHasPitchedNotes(score, ['bb_alto_sax', 'bb_tenor_sax'], b)
  );
  if (saxAnswer) shoutScore += 1;
  const tutti116 = barHasPitchedNotes(score, hornIds, 114);
  if (tutti116) shoutScore += 1;
  shoutScore = clamp10(shoutScore);

  // 5. Brass architecture
  let brassScore = 5;
  let highBefore89 = false;
  for (let b = 1; b < 89; b++) {
    if (maxMidiInBar(score, 'bb_trumpets', b) > 79) highBefore89 = true;
  }
  if (!highBefore89) brassScore += 2;
  const tromboneCounter = [105, 110, 115].some((b) => {
    const trp = maxMidiInBar(score, 'bb_trumpets', b);
    const tbn = maxMidiInBar(score, 'bb_trombones', b);
    return trp > 0 && tbn > 0 && Math.abs(trp - tbn) >= 4;
  });
  if (tromboneCounter) brassScore += 2;
  const cupMuteDev = [17, 25, 33].some((b) => {
    const vEarly = avgVelocityInBar(score, ['bb_trumpets'], b);
    const vLate = avgVelocityInBar(score, ['bb_trumpets'], b + 20);
    return vEarly > 0 && vLate > 0 && vEarly < vLate - 5;
  });
  if (cupMuteDev) brassScore += 1;
  brassScore = clamp10(brassScore);

  // 6. Sax writing
  let saxScore = 4;
  let soliBars = 0;
  for (let b = 1; b <= totalBars; b++) {
    if (orbit28V2SaxSoliWindow(b)) {
      if (
        barHasPitchedNotes(score, ['bb_alto_sax', 'bb_tenor_sax'], b) &&
        !barHasPitchedNotes(score, ['bb_trumpets', 'bb_trombones'], b)
      ) {
        soliBars++;
      }
    }
  }
  if (soliBars >= 8) saxScore += 3;
  else if (soliBars >= 4) saxScore += 2;
  const saxOnlyMoments = countWindowMatches(totalBars, (b) =>
    orbit28V2SaxOnlyWindow(b) && barWindTexture(score, b) === 'sax_only'
  );
  if (saxOnlyMoments >= 2) saxScore += 1;
  const closeHarmShout = [109, 110, 111, 112].filter((b) =>
    barHasPitchedNotes(score, ['bb_alto_sax', 'bb_tenor_sax'], b)
  ).length;
  if (closeHarmShout >= 3) saxScore += 2;
  saxScore = clamp10(saxScore);

  // 7. Rhythm breathing
  let rhythmScore = 5;
  let pianoHolesEarly = 0;
  for (let b = 1; b <= 40; b++) {
    if (!barHasPitchedNotes(score, ['bb_piano'], b)) pianoHolesEarly++;
  }
  if (pianoHolesEarly >= 8) rhythmScore += 2;
  else if (pianoHolesEarly >= 4) rhythmScore += 1;
  const rsOnly = [65, 66, 67, 68, 81, 82, 83, 84].filter(
    (b) => orbit28V2RhythmSectionOnly(b) && barWindTexture(score, b) === 'rhythm_only'
  ).length;
  if (rsOnly >= 4) rhythmScore += 2;
  const brushEarly = avgVelocityInBar(score, ['bb_drums'], 8);
  const driveLate = avgVelocityInBar(score, ['bb_drums'], 110);
  if (driveLate > brushEarly * 1.15) rhythmScore += 1;
  rhythmScore = clamp10(rhythmScore);

  // 8. Human playability
  let playScore = 7;
  let outOfRange = 0;
  const bounds: Record<string, readonly [number, number]> = {
    bb_alto_sax: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES],
    bb_tenor_sax: BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES],
    bb_trumpets: BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS],
    bb_trombones: BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES],
  };
  for (const [pid, [lo, hi]] of Object.entries(bounds)) {
    const p = partById(score, pid);
    if (!p) continue;
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const midi = (e as NoteEvent).pitch;
        if (midi < lo || midi > hi) outOfRange++;
      }
    }
  }
  if (outOfRange === 0) playScore += 2;
  else if (outOfRange <= 3) playScore += 1;
  else playScore -= 2;
  playScore = clamp10(playScore);

  const scores = {
    dynamic_arc: clamp10(dynamicScore),
    sectional_contrast: contrastScore,
    dropout_events: dropoutScore,
    shout_quality: shoutScore,
    brass_architecture: brassScore,
    sax_writing: saxScore,
    rhythm_breathing: rhythmScore,
    human_playability: playScore,
    mean: 0,
  };
  scores.mean =
    Math.round(
      ((scores.dynamic_arc +
        scores.sectional_contrast +
        scores.dropout_events +
        scores.shout_quality +
        scores.brass_architecture +
        scores.sax_writing +
        scores.rhythm_breathing +
        scores.human_playability) /
        8) *
        10
    ) / 10;
  return scores;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp10(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function countWindowMatches(totalBars: number, pred: (bar: number) => boolean): number {
  let count = 0;
  let inRun = false;
  for (let b = 1; b <= totalBars; b++) {
    if (pred(b)) {
      if (!inRun) {
        count++;
        inRun = true;
      }
    } else {
      inRun = false;
    }
  }
  return count;
}

export function formatGceLoopReport(loop: number, scores: Orbit28V2GceScores, action: string): string {
  return [
    `Loop ${loop}:`,
    `  1. DYNAMIC ARC:        ${scores.dynamic_arc}/10`,
    `  2. SECTIONAL CONTRAST: ${scores.sectional_contrast}/10`,
    `  3. DROPOUT EVENTS:     ${scores.dropout_events}/10`,
    `  4. SHOUT QUALITY:      ${scores.shout_quality}/10`,
    `  5. BRASS ARCH:         ${scores.brass_architecture}/10`,
    `  6. SAX WRITING:        ${scores.sax_writing}/10`,
    `  7. RHYTHM BREATHING:   ${scores.rhythm_breathing}/10`,
    `  8. HUMAN PLAYABILITY:  ${scores.human_playability}/10`,
    `  MEAN: ${scores.mean}/10`,
    `  ACTION: ${action}`,
  ].join('\n');
}

export { CRITERION_ORDER };
