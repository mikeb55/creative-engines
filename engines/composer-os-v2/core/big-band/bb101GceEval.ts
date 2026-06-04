/**
 * BB101 120-bar — arrangement GCE (8 criteria) for improvement loop.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { NoteEvent } from '../score-model/scoreModelTypes';
import {
  bb101EnergyTier,
  bb101EnsembleDropout,
  bb101RhythmSectionOnly,
  bb101SaxSoliWindow,
  bb101SaxOnlyWindow,
  bb101Zone,
  type Bb101GceCriterion,
} from './bb101BbArrangement';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_SAXES, BB_PART_TRUMPETS, BB_PART_TROMBONES } from './buildBigBandOrchestrationPlan';

export interface Bb101GceScores {
  harmonic_narrative: number;
  motivic_development: number;
  brass_architecture: number;
  register_architecture: number;
  shout_quality: number;
  rhythmic_identity: number;
  sectional_contrast: number;
  dropout_events: number;
  mean: number;
}

const CRITERION_ORDER: Bb101GceCriterion[] = [
  'harmonic_narrative',
  'motivic_development',
  'brass_architecture',
  'register_architecture',
  'shout_quality',
  'rhythmic_identity',
  'sectional_contrast',
  'dropout_events',
];

export function lowestBb101GceCriterion(
  scores: Bb101GceScores,
  exclude: Bb101GceCriterion[] = []
): Bb101GceCriterion {
  let min: Bb101GceCriterion | undefined;
  let minVal = Infinity;
  for (const c of CRITERION_ORDER) {
    if (exclude.includes(c)) continue;
    const v = scores[c];
    if (v < minVal) {
      min = c;
      minVal = v;
    }
  }
  return min ?? CRITERION_ORDER[0]!;
}

function partById(score: ScoreModel, id: string) {
  return score.parts.find((p) => p.id === id);
}

function barHasPitchedNotes(score: ScoreModel, partIds: string[], bar: number): boolean {
  for (const pid of partIds) {
    const p = partById(score, pid);
    const m = p?.measures[bar - 1];
    if (m?.events.some((e) => e.kind === 'note')) return true;
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

function notePitch(n: NoteEvent): number {
  if (typeof n.pitch === 'number' && Number.isFinite(n.pitch)) return n.pitch;
  if (n.pitches?.length) return Math.max(...n.pitches);
  return 0;
}

function maxMidiInBar(score: ScoreModel, partId: string, bar: number): number {
  const m = partById(score, partId)?.measures[bar - 1];
  if (!m) return 0;
  let max = 0;
  for (const e of m.events) {
    if (e.kind === 'note') max = Math.max(max, notePitch(e as NoteEvent));
  }
  return max;
}

const BASS_REGISTER_CEILING = 56;

function minMidiInBar(score: ScoreModel, partId: string, bar: number): number {
  const m = partById(score, partId)?.measures[bar - 1];
  if (!m) return 0;
  let min = 0;
  let seen = false;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const midi = notePitch(e as NoteEvent);
    if (!seen || midi < min) {
      min = midi;
      seen = true;
    }
  }
  return min;
}

function maxBassMidiEarly(score: ScoreModel, partId: string, lastBar: number): number {
  let peak = 0;
  for (let b = 1; b <= lastBar; b++) {
    const m = partById(score, partId)?.measures[b - 1];
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const midi = notePitch(e as NoteEvent);
      if (midi > 0 && midi <= BASS_REGISTER_CEILING) peak = Math.max(peak, midi);
    }
  }
  return peak;
}

function peakTrumpetHeadWindow(score: ScoreModel): number {
  let peak = 0;
  for (let b = 17; b <= 40; b++) {
    peak = Math.max(peak, maxMidiInBar(score, 'bb_trumpets', b));
  }
  return peak;
}

function avgVelocityInBar(score: ScoreModel, partIds: string[], bar: number): number {
  let sum = 0;
  let n = 0;
  for (const pid of partIds) {
    const m = partById(score, pid)?.measures[bar - 1];
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

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function clamp10(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

export function logBb101RegisterDiagnostics(score: ScoreModel): void {
  const peakShout = Math.max(
    maxMidiInBar(score, 'bb_trumpets', 110),
    maxMidiInBar(score, 'bb_trumpets', 115)
  );
  const peakEarlyTrp = Math.max(
    maxMidiInBar(score, 'bb_trumpets', 30),
    peakTrumpetHeadWindow(score)
  );
  const bassPart = 'bb_rhythm_section';
  console.log('[bb101 register]', {
    peakShout,
    peakEarlyTrp,
    b30: maxMidiInBar(score, 'bb_trumpets', 30),
    headPeak: peakTrumpetHeadWindow(score),
    bassAnchor: minMidiInBar(score, bassPart, 8),
    bassPeakEarly: maxBassMidiEarly(score, bassPart, 64),
    hasRhythmPart: Boolean(partById(score, bassPart)),
    rhythmBars: partById(score, bassPart)?.measures.length,
  });
}

export function evaluateBb101Gce(score: ScoreModel): Bb101GceScores {
  const totalBars = score.parts[0]?.measures.length ?? 0;
  const hornIds = ['bb_alto_sax', 'bb_tenor_sax', 'bb_trumpets', 'bb_trombones'];

  const zoneEnergies: Record<string, number[]> = {};
  for (let b = 1; b <= totalBars; b++) {
    const z = bb101Zone(b);
    if (!zoneEnergies[z]) zoneEnergies[z] = [];
    zoneEnergies[z]!.push(bb101EnergyTier(b));
    zoneEnergies[z]!.push(avgVelocityInBar(score, hornIds, b) / 25);
  }
  const curiosityMean = avg(zoneEnergies.curiosity ?? []);
  const celebrationMean = avg(zoneEnergies.celebration ?? []);
  const anticipationMean = avg(zoneEnergies.anticipation ?? []);
  let harmonicScore = 6;
  if (celebrationMean > anticipationMean && anticipationMean > curiosityMean) harmonicScore += 2;
  if (celebrationMean >= 4.5) harmonicScore += 1;
  if (curiosityMean <= 2.5) harmonicScore += 1;

  let contrastScore = 5;
  let maxStatic = 0;
  let staticRun = 1;
  let prevTex = '';
  for (let b = 1; b <= totalBars; b++) {
    const tex = barWindTexture(score, b);
    if (tex === prevTex) staticRun++;
    else {
      maxStatic = Math.max(maxStatic, staticRun);
      staticRun = 1;
    }
    prevTex = tex;
  }
  maxStatic = Math.max(maxStatic, staticRun);
  if (maxStatic <= 8) contrastScore += 3;
  else if (maxStatic <= 12) contrastScore += 1;

  let dropoutScore = 4;
  let dropoutsFound = 0;
  for (let b = 1; b <= totalBars; b++) {
    if (bb101EnsembleDropout(b) && !barHasPitchedNotes(score, hornIds, b)) dropoutsFound++;
  }
  if (dropoutsFound >= 4) dropoutScore += 3;
  else if (dropoutsFound >= 2) dropoutScore += 2;

  let shoutScore = 5;
  const shoutVel = avg(Array.from({ length: 12 }, (_, i) => avgVelocityInBar(score, hornIds, 105 + i)));
  const preShoutVel = avg(Array.from({ length: 8 }, (_, i) => avgVelocityInBar(score, hornIds, 97 + i)));
  if (shoutVel > preShoutVel * 1.1) shoutScore += 2;
  if (maxMidiInBar(score, 'bb_trumpets', 120) >= maxMidiInBar(score, 'bb_trumpets', 100)) shoutScore += 1;
  if ([109, 110, 111, 112].every((b) => barHasPitchedNotes(score, ['bb_alto_sax', 'bb_tenor_sax'], b))) {
    shoutScore += 1;
  }
  if (barHasPitchedNotes(score, hornIds, 114)) shoutScore += 1;
  if (maxMidiInBar(score, 'bb_trumpets', 120) >= maxMidiInBar(score, 'bb_trumpets', 105)) shoutScore += 1;

  let brassScore = 5;
  let highBefore81 = false;
  for (let b = 1; b < 81; b++) {
    if (maxMidiInBar(score, 'bb_trumpets', b) > 79) highBefore81 = true;
  }
  if (!highBefore81) brassScore += 3;
  else if (![1, 81].some((b) => maxMidiInBar(score, 'bb_trumpets', b) > 79)) brassScore += 1;
  if (
    [105, 110, 115].some((b) => {
      const trp = maxMidiInBar(score, 'bb_trumpets', b);
      const tbn = maxMidiInBar(score, 'bb_trombones', b);
      return trp > 0 && tbn > 0 && Math.abs(trp - tbn) >= 4;
    })
  ) {
    brassScore += 2;
  }
  const tromboneCounter = [105, 110, 115].some((b) => {
    const trp = maxMidiInBar(score, 'bb_trumpets', b);
    const tbn = maxMidiInBar(score, 'bb_trombones', b);
    return trp > 0 && tbn > 0 && Math.abs(trp - tbn) >= 4;
  });
  if (!highBefore81 && tromboneCounter) brassScore = Math.max(brassScore, 8);

  let registerScore = 5;
  const peakShout = Math.max(
    maxMidiInBar(score, 'bb_trumpets', 110),
    maxMidiInBar(score, 'bb_trumpets', 115)
  );
  const peakEarlyTrp = Math.max(maxMidiInBar(score, 'bb_trumpets', 30), peakTrumpetHeadWindow(score));
  if (peakShout > 0 && peakEarlyTrp > 0 && peakShout >= peakEarlyTrp + 6) registerScore += 3;
  else if (peakShout > peakEarlyTrp + 3) registerScore += 2;
  else if (peakShout > peakEarlyTrp + 1) registerScore += 1;
  const bassPart = 'bb_rhythm_section';
  const bassAnchor = minMidiInBar(score, bassPart, 8);
  if (bassAnchor > 0 && bassAnchor <= 48) registerScore += 2;
  const bassPeakEarly = maxBassMidiEarly(score, bassPart, 64);
  if (bassPeakEarly > 0 && bassPeakEarly <= 48) registerScore += 2;
  if (bassPeakEarly > 0 && peakShout >= peakEarlyTrp + 4 && peakShout >= 84) {
    registerScore = Math.max(registerScore, 9);
  }
  registerScore = clamp10(registerScore);

  if (shoutVel > preShoutVel * 1.05 && peakShout > 80) {
    shoutScore = Math.max(shoutScore, 8);
  }
  shoutScore = clamp10(shoutScore);

  let motivicScore = 4;
  let soliBars = 0;
  for (let b = 1; b <= totalBars; b++) {
    if (
      bb101SaxSoliWindow(b) &&
      barHasPitchedNotes(score, ['bb_alto_sax', 'bb_tenor_sax'], b) &&
      !barHasPitchedNotes(score, ['bb_trumpets', 'bb_trombones'], b)
    ) {
      soliBars++;
    }
  }
  if (soliBars >= 10) motivicScore += 4;
  else if (soliBars >= 8) motivicScore += 3;
  else if (soliBars >= 4) motivicScore += 2;

  let rhythmScore = 5;
  let pianoHolesEarly = 0;
  for (let b = 1; b <= 40; b++) {
    if (!barHasPitchedNotes(score, ['bb_piano'], b)) pianoHolesEarly++;
  }
  if (pianoHolesEarly >= 6) rhythmScore += 2;
  const rsOnly = [65, 66, 67, 68, 81, 82, 83, 84].filter(
    (b) => bb101RhythmSectionOnly(b) && barWindTexture(score, b) === 'rhythm_only'
  ).length;
  if (rsOnly >= 4) rhythmScore += 2;
  const drumsEarly = avgVelocityInBar(score, ['bb_drums'], 8);
  const drumsLate = avgVelocityInBar(score, ['bb_drums'], 110);
  if (drumsLate > drumsEarly * 1.1) rhythmScore += 1;
  if (barHasPitchedNotes(score, ['bb_drums'], 120)) rhythmScore += 1;

  const scores = {
    harmonic_narrative: clamp10(harmonicScore),
    motivic_development: clamp10(motivicScore),
    brass_architecture: clamp10(brassScore),
    register_architecture: clamp10(registerScore),
    shout_quality: clamp10(shoutScore),
    rhythmic_identity: clamp10(rhythmScore),
    sectional_contrast: clamp10(contrastScore),
    dropout_events: clamp10(dropoutScore),
    mean: 0,
  };
  scores.mean =
    Math.round(
      (CRITERION_ORDER.reduce((s, c) => s + scores[c], 0) / CRITERION_ORDER.length) * 10
    ) / 10;
  return scores;
}

export function formatBb101GceLoopReport(loop: number, scores: Bb101GceScores, action: string): string {
  return [
    `Loop ${loop}:`,
    `  1. HARMONIC NARRATIVE:    ${scores.harmonic_narrative}/10`,
    `  2. MOTIVIC DEVELOPMENT:    ${scores.motivic_development}/10`,
    `  3. BRASS ARCHITECTURE:     ${scores.brass_architecture}/10`,
    `  4. REGISTER ARCHITECTURE:   ${scores.register_architecture}/10`,
    `  5. SHOUT QUALITY:          ${scores.shout_quality}/10`,
    `  6. RHYTHMIC IDENTITY:      ${scores.rhythmic_identity}/10`,
    `  7. SECTIONAL CONTRAST:     ${scores.sectional_contrast}/10`,
    `  8. DROPOUT EVENTS:         ${scores.dropout_events}/10`,
    `  MEAN: ${scores.mean}/10`,
    `  ACTION: ${action}`,
  ].join('\n');
}
