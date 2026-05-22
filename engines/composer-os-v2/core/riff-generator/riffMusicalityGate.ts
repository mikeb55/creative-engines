/**
 * Style-aware 8-rule riff musicality gate (replaces legacy 4-rule pass/fail checks).
 * Riff-generator only — does not import duo / BB GCE modules.
 */

import type { RiffProfile } from '../composer/riffProfileTypes';
import type { RiffFamilyTag } from './riffVrbRegistry';
import { resolveRiffFamilyTag, riffMusicalityFamilyFromRiffTag } from './riffVrbRegistry';
import { getFunkGridPolicy, type FunkGridPolicyStyle } from '../rhythm/funkGridPolicy';
import { computeAlignmentCycle, getAccentSlots, getOddMeterPolicy, type OddMeterPolicyStyle } from '../rhythm/oddMeterEngine';
import {
  getRockRiffPolicy,
  rockRiffAllowsPitchStreak,
  type RockRiffPolicyStyle,
} from '../rhythm/rockRiffPolicy';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { countMaxRhythmRepeats } from './riffRhythm';
import type { RiffGridMode, RiffRhythmSegment, RiffStyleId } from './riffTypes';

export const RIFF_MUSICALITY_GATE_VERSION = 'riff_musicality_v8' as const;
export const RIFF_MUSICALITY_DEFAULT_THRESHOLD = 0.65;
export const RIFF_MUSICALITY_MAX_SEED_RETRIES = 8;

export type RiffMusicalityRuleId =
  | 'anchorStrength'
  | 'loopIdentityScore'
  | 'syncopationBalance'
  | 'registerCoherence'
  | 'intervalIdentityScore'
  | 'barToBarMutationBudget'
  | 'silencePatternScore'
  | 'cadentialReset';

export type RiffMusicalityFamily =
  | 'rock'
  | 'funk'
  | 'fusion'
  | 'art_rock'
  | 'jazz'
  | 'impressionist'
  | 'cinematic'
  | 'minimal'
  | 'neutral';

export interface GeneratedRiff {
  score: ScoreModel;
  perBarRhythm: RiffRhythmSegment[][];
  bars: number;
  grid: RiffGridMode;
}

export interface GateFailure {
  ruleId: string;
  friendlyLabel: string;
  profileField?: string;
  profileValue?: string;
}

export interface RiffMusicalityGateOptions {
  threshold?: number;
  weights?: Partial<Record<RiffMusicalityRuleId, number>>;
  /** VRB registry family tag (funk / rock / fusion / art_rock). */
  familyTag?: RiffFamilyTag | null;
  vrbId?: string;
}

export interface RiffMusicalityResult {
  passed: boolean;
  score: number;
  failedRules: string[];
  gateFailures: GateFailure[];
  details: Record<string, number>;
  pitchStreakBypassed: boolean;
  contourRequired: boolean;
  rulesetVersion: typeof RIFF_MUSICALITY_GATE_VERSION;
  family: RiffMusicalityFamily;
}

/** Per-family rule weight multipliers (applied before threshold check). */
export const FAMILY_RULE_WEIGHT_MULTIPLIERS: Partial<
  Record<RiffMusicalityFamily, Partial<Record<RiffMusicalityRuleId, number>>>
> = {
  funk: { syncopationBalance: 1.4, loopIdentityScore: 0.8 },
  rock: { loopIdentityScore: 1.4, anchorStrength: 1.2 },
  fusion: { cadentialReset: 1.3, barToBarMutationBudget: 1.2 },
  art_rock: { silencePatternScore: 1.3, registerCoherence: 1.1 },
};

type MelodicNote = {
  midi: number;
  measureIndex: number;
  startBeat: number;
  duration: number;
};

const EPS = 0.12;
const DEFAULT_WEIGHTS: Record<RiffMusicalityRuleId, number> = {
  anchorStrength: 0.14,
  loopIdentityScore: 0.14,
  syncopationBalance: 0.12,
  registerCoherence: 0.12,
  intervalIdentityScore: 0.12,
  barToBarMutationBudget: 0.12,
  silencePatternScore: 0.12,
  cadentialReset: 0.12,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function bandScore(value: number, lo: number, hi: number): number {
  if (value >= lo && value <= hi) return 1;
  if (value < lo) return clamp01(value / Math.max(lo, 1e-6));
  const over = value - hi;
  const span = Math.max(hi - lo, 1e-6);
  return clamp01(1 - over / span);
}

function callResponsePatternActive(profile: RiffProfile): boolean {
  const p = profile.spacePolicy?.callResponsePattern?.toLowerCase() ?? '';
  return (
    p.includes('vocal') ||
    p.includes('call') ||
    p.includes('drop') ||
    p.includes('rest_window')
  );
}

function profileHintForRule(
  ruleId: RiffMusicalityRuleId,
  profile: RiffProfile
): { profileField?: string; profileValue?: string } {
  switch (ruleId) {
    case 'anchorStrength':
      if (profile.hornStabTopology?.length) {
        return {
          profileField: 'hornStabTopology',
          profileValue: `${profile.hornStabTopology.length} topology(ies)`,
        };
      }
      return { profileField: 'accentTopology', profileValue: `${profile.accentTopology?.length ?? 0} slots` };
    case 'loopIdentityScore':
      return {
        profileField: 'repetitionPolicy.barIdentityPersistence',
        profileValue: String(profile.repetitionPolicy?.barIdentityPersistence ?? ''),
      };
    case 'syncopationBalance':
      return {
        profileField: 'spacePolicy.callResponsePattern',
        profileValue: profile.spacePolicy?.callResponsePattern ?? '',
      };
    case 'registerCoherence':
      if (profile.pedalRigid) {
        return { profileField: 'pedalRigid', profileValue: 'true' };
      }
      return {
        profileField: 'riffRegisterFloor',
        profileValue: String(profile.riffRegisterFloor),
      };
    case 'intervalIdentityScore':
      return {
        profileField: 'intervalCell.steps',
        profileValue: profile.intervalCell?.steps?.join(',') ?? '',
      };
    case 'barToBarMutationBudget':
      return {
        profileField: 'repetitionPolicy.barIdentityPersistence',
        profileValue: String(profile.repetitionPolicy?.barIdentityPersistence ?? ''),
      };
    case 'silencePatternScore':
      return {
        profileField: 'silencePolicy.styleClass',
        profileValue: profile.silencePolicy?.styleClass ?? '',
      };
    case 'cadentialReset':
      return {
        profileField: 'cadenceTypes',
        profileValue: profile.cadenceTypes ? JSON.stringify(profile.cadenceTypes) : '',
      };
    default:
      return {};
  }
}

function guitarMelodicNotes(score: ScoreModel): MelodicNote[] {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const out: MelodicNote[] = [];
  if (!g) return out;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (((e as { voice?: number }).voice ?? 1) !== 1) continue;
      out.push({
        midi: (e as { pitch: number }).pitch,
        measureIndex: m.index,
        startBeat: (e as { startBeat: number }).startBeat,
        duration: (e as { duration: number }).duration,
      });
    }
  }
  return out;
}

function measureVoice1PitchSignature(score: ScoreModel, barIndex: number): string {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const m = g?.measures.find((x) => x.index === barIndex);
  if (!m) return '';
  const pcs: number[] = [];
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if (((e as { voice?: number }).voice ?? 1) !== 1) continue;
    pcs.push((e as { pitch: number }).pitch % 12);
  }
  return pcs.join(',');
}

function slotsPerBar(profile: RiffProfile): number {
  return profile.subdivisionGrid ?? 8;
}

function slotToBeat(slot: number, slotsPerBarCount: number): number {
  return (slot / slotsPerBarCount) * 4;
}

function strongSlots(profile: RiffProfile): number[] {
  const topo = profile.accentTopology ?? [];
  const slots: number[] = [];
  for (let i = 0; i < topo.length; i++) {
    if ((topo[i] ?? 0) >= 0.9) slots.push(i);
  }
  return slots.length ? slots : [0];
}

function resolveOddMeterPreset(profile: RiffProfile): OddMeterPolicyStyle | undefined {
  return profile.silencePolicy.oddMeterPreset;
}

function resolveRockPreset(profile: RiffProfile): RockRiffPolicyStyle | undefined {
  return profile.silencePolicy.rockRiffPreset;
}

function resolveFunkPreset(profile: RiffProfile): FunkGridPolicyStyle | undefined {
  return profile.silencePolicy.funkGridPreset;
}

/** Resolve gate family: VRB registry tag when present, else profile posture. */
export function resolveMusicalityFamilyForGate(
  profile: RiffProfile,
  familyTag?: RiffFamilyTag | null,
  vrbId?: string
): RiffMusicalityFamily {
  const tag = familyTag ?? (vrbId ? resolveRiffFamilyTag(vrbId) : null);
  if (tag) return riffMusicalityFamilyFromRiffTag(tag);
  return resolveMusicalityFamily(profile);
}

/** Infer scoring family from riff profile posture (VRB-agnostic). */
export function resolveMusicalityFamily(profile: RiffProfile): RiffMusicalityFamily {
  if (profile.allowPitchStreak || resolveRockPreset(profile)) return 'rock';
  if (resolveFunkPreset(profile) || profile.swingStyle === 'funk16th') return 'funk';
  if (profile.processLoopPolicy || profile.phaseOffsetPolicy) return 'art_rock';
  if (resolveOddMeterPreset(profile) === 'mahavishnu' || profile.meterPolicy === 'odd_grouped') return 'fusion';
  if (profile.modalUsage === 'linear-melodic' || profile.swingStyle === 'jazz') return 'jazz';
  const sc = profile.silencePolicy.styleClass ?? '';
  if (/impressionist|cinematic|minimal/i.test(sc)) {
    if (/minimal/i.test(sc)) return 'minimal';
    if (/cinematic/i.test(sc)) return 'cinematic';
    return 'impressionist';
  }
  return 'neutral';
}

function contourRequiredForFamily(family: RiffMusicalityFamily): boolean {
  return family === 'impressionist' || family === 'jazz' || family === 'cinematic' || family === 'minimal';
}

function contourDisabledForFamily(family: RiffMusicalityFamily): boolean {
  return family === 'funk' || family === 'rock';
}

/** Neutral riff-generator profile when VRB slice not supplied. */
export function defaultRiffProfileForGenerator(style: RiffStyleId, grid: RiffGridMode): RiffProfile {
  const subdivisionGrid = grid === 'sixteenth' ? 16 : 8;
  const slots = subdivisionGrid;
  const accentTopology = new Array<number>(slots).fill(0.2);
  accentTopology[0] = 1;
  if (slots >= 8) {
    accentTopology[slots >> 1] = 0.65;
    accentTopology[(slots * 3) >> 2] = 0.65;
  }
  const funk = style === 'funk';
  const rock = false;
  return {
    meterPolicy: 'simple',
    subdivisionGrid,
    accentTopology,
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: true,
      barIdentityPersistence: funk ? 0.55 : 0.72,
      minExactRepetitions: 2,
    },
    silencePolicy: {
      restProbabilityBySlot: new Array(slots).fill(funk ? 0.14 : 0.1),
      styleClass: `riff_generator:${style}`,
      funkGridPreset: funk ? 'generic' : undefined,
    },
    attackPolicy: 'staccato',
    riffContourPolicy: { rangeCeiling: 12, apexTiming: 0.5, returnTendency: 0.5 },
    registerAnchor: 'mid_register',
    riffRegisterFloor: 45,
    riffRegisterCeiling: 84,
    pedalBias: 0.4,
    octaveDisplacementTolerance: 12,
    powerIntervalPolicy: { fifthWeight: 0.5, octaveWeight: 0.35, pedalWeight: 0.3 },
    ornamentPolicy: { slides: false, ghosts: funk, graceAttacks: false, bends: false, deadNotes: false },
    allowPitchStreak: rock,
    swingStyle: funk ? 'funk16th' : 'straight',
    modalUsage: style === 'metheny' || style === 'scofield' ? 'linear-melodic' : undefined,
  };
}

function scoreAnchorStrength(
  riff: GeneratedRiff,
  profile: RiffProfile,
  family: RiffMusicalityFamily
): { score: number; detail?: string } {
  const slots = slotsPerBar(profile);
  let strongTargets: number[] = strongSlots(profile).map((s) => slotToBeat(s, slots));

  const oddPreset = resolveOddMeterPreset(profile);
  if (oddPreset) {
    const odd = getOddMeterPolicy(oddPreset);
    const grouping = odd.defaultGrouping;
    const groupStarts = getAccentSlots(grouping).map((p) => (p / grouping.reduce((a, b) => a + b, 0)) * 4);
    strongTargets = [...new Set([...strongTargets, ...groupStarts])];
  }

  if (family === 'funk') strongTargets = [0, ...strongTargets.filter((b) => Math.abs(b) > EPS)];

  const horn = riff.score.parts.find((p) => p.id === 'horns');

  let barsWithAnchor = 0;
  for (let b = 0; b < riff.bars; b++) {
    const barRh = riff.perBarRhythm[b] ?? [];
    const barNotes = guitarMelodicNotes(riff.score).filter((n) => n.measureIndex === b + 1);
    const hornOnsets: number[] = [];
    if (profile.hornStabTopology?.length && horn?.measures[b]) {
      for (const e of horn.measures[b]!.events) {
        if (e.kind === 'note') hornOnsets.push((e as { startBeat: number }).startBeat);
      }
      const topo = profile.hornStabTopology[b % profile.hornStabTopology.length];
      if (topo) {
        for (const slot of topo.slots) hornOnsets.push(slotToBeat(slot, slots));
      }
    }
    const onsets = [
      ...barRh.filter((s) => !s.rest).map((s) => s.startBeat),
      ...barNotes.map((n) => n.startBeat),
      ...hornOnsets,
    ];
    const hasStrong = strongTargets.some((t) => onsets.some((o) => Math.abs(o - t) < EPS));
    if (hasStrong) barsWithAnchor += 1;
  }

  const bar1Beat1 =
    (riff.perBarRhythm[0]?.some((s) => !s.rest && Math.abs(s.startBeat) < EPS) ?? false) ||
    guitarMelodicNotes(riff.score).some((n) => n.measureIndex === 1 && Math.abs(n.startBeat) < EPS);

  const barRatio = riff.bars > 0 ? barsWithAnchor / riff.bars : 0;
  let score = clamp01(barRatio * 0.75 + (bar1Beat1 ? 0.25 : 0));
  if (family === 'funk' && !bar1Beat1) score *= 0.65;
  return {
    score,
    detail: `bars_with_strong=${barsWithAnchor}/${riff.bars} bar1_downbeat=${bar1Beat1}`,
  };
}

function scoreLoopIdentity(
  riff: GeneratedRiff,
  profile: RiffProfile,
  family: RiffMusicalityFamily
): { score: number; detail?: string } {
  const rep = countMaxRhythmRepeats(riff.perBarRhythm);
  const identity = riff.bars > 0 ? rep / riff.bars : 0;
  let lo = 0.45;
  let hi = 0.85;
  if (family === 'rock' || profile.allowPitchStreak) {
    lo = 0.7;
    hi = 1.0;
  } else if (family === 'funk') {
    lo = 0.5;
    hi = 0.8;
  } else if (family === 'art_rock' || family === 'fusion') {
    lo = 0.2;
    hi = 0.6;
  }
  return { score: bandScore(identity, lo, hi), detail: `rhythm_identity=${identity.toFixed(2)} band=${lo}-${hi}` };
}

function onsetTimes(perBar: RiffRhythmSegment[][]): number[] {
  const out: number[] = [];
  for (let b = 0; b < perBar.length; b++) {
    for (const s of perBar[b] ?? []) {
      if (!s.rest) out.push(b * 4 + s.startBeat);
    }
  }
  return out.sort((a, b) => a - b);
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
}

function scoreSyncopationBalance(
  riff: GeneratedRiff,
  profile: RiffProfile,
  family: RiffMusicalityFamily
): { score: number; detail?: string } {
  const onsets = onsetTimes(riff.perBarRhythm);
  if (onsets.length < 2) return { score: 0.35, detail: 'too_few_onsets' };
  const ioi: number[] = [];
  for (let i = 1; i < onsets.length; i++) ioi.push(onsets[i]! - onsets[i - 1]!);
  const v = variance(ioi);

  let lo = 0.02;
  let hi = 1.4;
  if (family === 'funk') {
    lo = 0.08;
    hi = 2.2;
    const funkPreset = resolveFunkPreset(profile) ?? 'generic';
    const accent = getFunkGridPolicy(funkPreset).accentMap;
    const refVar = variance(
      accent.map((w, i) => (w >= 0.9 ? i * 0.25 : i * 0.25 + 0.12)).filter((_, i) => accent[i]! > 0.2)
    );
    if (refVar > 0) return { score: bandScore(v, lo, hi * (1 + refVar * 0.05)), detail: `ioi_var=${v.toFixed(3)}` };
  }
  if (resolveOddMeterPreset(profile)) {
    const odd = getOddMeterPolicy(resolveOddMeterPreset(profile)!);
    hi = 0.35 + odd.syncopationBudget * 0.45;
  }
  if (family === 'rock') {
    lo = 0.03;
    hi = 0.9;
  }
  if (callResponsePatternActive(profile)) {
    hi *= 1.4;
  }
  return { score: bandScore(v, lo, hi), detail: `ioi_var=${v.toFixed(3)}` };
}

function scoreRegisterCoherence(
  riff: GeneratedRiff,
  profile: RiffProfile
): { score: number; detail?: string } {
  const notes = guitarMelodicNotes(riff.score);
  if (!notes.length) return { score: 0, detail: 'no_notes' };
  const floor = profile.riffRegisterFloor;
  const ceiling = profile.riffRegisterCeiling;

  if (profile.pedalRigid) {
    const span = Math.max(5, Math.min(9, ceiling - floor));
    const lowLock = notes.every((n) => n.midi >= floor && n.midi <= floor + span);
    if (lowLock) return { score: 1, detail: 'pedal_rigid_low_string_lock' };
  }
  const odd = resolveOddMeterPreset(profile);
  const outPct =
    notes.filter((n) => n.midi < floor || n.midi > ceiling).length / notes.length;
  const limit = odd === 'mahavishnu' ? 0.32 : 0.2;
  const score = outPct <= limit ? 1 : clamp01(1 - (outPct - limit) / (1 - limit));
  return { score, detail: `outside_band=${(outPct * 100).toFixed(1)}% limit=${(limit * 100).toFixed(0)}%` };
}

function intervalClass(a: number, b: number): number {
  const d = Math.abs(b - a) % 12;
  return d;
}

function scoreIntervalIdentity(
  riff: GeneratedRiff,
  profile: RiffProfile,
  family: RiffMusicalityFamily
): { score: number; detail?: string } {
  const notes = guitarMelodicNotes(riff.score).sort(
    (a, b) => a.measureIndex - b.measureIndex || a.startBeat - b.startBeat
  );
  if (notes.length < 2) return { score: 0.4, detail: 'too_few_notes' };

  let characteristic = new Set<number>();
  if (family === 'rock') characteristic = new Set([1, 2, 3, 5, 6, 7]);
  else if (family === 'funk') characteristic = new Set([1, 2, 3, 4, 10, 11]);
  else if (family === 'art_rock') characteristic = new Set([1, 2, 5, 6]);
  else if (family === 'fusion') characteristic = new Set([1, 2, 4, 5, 6, 7]);
  else characteristic = new Set([1, 2, 3, 4, 5, 7]);

  if (profile.intervalCell?.steps.length) {
    for (const s of profile.intervalCell.steps) characteristic.add(((s % 12) + 12) % 12);
  }

  let hits = 0;
  let total = 0;
  for (let i = 1; i < notes.length; i++) {
    const ic = intervalClass(notes[i - 1]!.midi, notes[i]!.midi);
    if (ic === 0) continue;
    total++;
    if (characteristic.has(ic)) hits++;
  }
  const freq = total > 0 ? hits / total : 0.5;
  return { score: clamp01(freq * 1.15), detail: `family_interval_rate=${freq.toFixed(2)}` };
}

function barPitchSigs(score: ScoreModel, bars: number): string[] {
  const sigs: string[] = [];
  for (let b = 1; b <= bars; b++) sigs.push(measureVoice1PitchSignature(score, b));
  return sigs;
}

function scoreBarToBarMutation(
  riff: GeneratedRiff,
  profile: RiffProfile
): { score: number; detail?: string } {
  const sigs = barPitchSigs(riff.score, riff.bars);
  if (sigs.length < 2) return { score: 0.7, detail: 'single_bar' };
  let sameAdj = 0;
  for (let i = 1; i < sigs.length; i++) {
    if (sigs[i] === sigs[i - 1] && sigs[i] !== '') sameAdj++;
  }
  const similarity = sameAdj / (sigs.length - 1);
  const target = profile.repetitionPolicy.barIdentityPersistence;
  const delta = Math.abs(similarity - target);
  const score = profile.allowPitchStreak
    ? clamp01(1 - delta * 0.6 + similarity * 0.25)
    : clamp01(1 - delta * 1.1);
  return {
    score,
    detail: `similarity=${similarity.toFixed(2)} target=${target.toFixed(2)}`,
  };
}

function restMass(perBar: RiffRhythmSegment[][]): { restBeats: number; total: number } {
  let restBeats = 0;
  let total = 0;
  for (const bar of perBar) {
    for (const s of bar) {
      total += s.duration;
      if (s.rest) restBeats += s.duration;
    }
  }
  return { restBeats, total };
}

function scoreSilencePattern(
  riff: GeneratedRiff,
  profile: RiffProfile,
  family: RiffMusicalityFamily
): { score: number; detail?: string } {
  const { restBeats, total } = restMass(riff.perBarRhythm);
  const restRatio = total > 0 ? restBeats / total : 0;

  const rockPreset = resolveRockPreset(profile);
  if (rockPreset) {
    const rock = getRockRiffPolicy(rockPreset);
    const target = profile.allowPitchStreak
      ? rock.restPolicy.intraBarRestProb * 0.65
      : rock.restPolicy.intraBarRestProb;
    const delta = Math.abs(restRatio - target);
    return { score: clamp01(1 - delta * 2.2), detail: `rest_ratio=${restRatio.toFixed(2)} rock_target=${target.toFixed(2)}` };
  }

  const funkPreset = resolveFunkPreset(profile);
  if (funkPreset) {
    const restMap = getFunkGridPolicy(funkPreset).restProbMap;
    const meanRest = restMap.reduce((a, b) => a + b, 0) / restMap.length;
    const delta = Math.abs(restRatio - meanRest);
    return { score: clamp01(1 - delta * 1.8), detail: `rest_ratio=${restRatio.toFixed(2)} funk_mean=${meanRest.toFixed(2)}` };
  }

  if (family === 'art_rock' && profile.processLoopPolicy) {
    return { score: bandScore(restRatio, 0.05, 0.45), detail: `fripp_flat_rest=${restRatio.toFixed(2)}` };
  }

  return { score: bandScore(restRatio, 0.08, 0.42), detail: `rest_ratio=${restRatio.toFixed(2)}` };
}

function scoreCadentialReset(
  riff: GeneratedRiff,
  profile: RiffProfile
): { score: number; detail?: string } {
  const phraseLens = [2, 4, 8].filter((n) => n <= riff.bars);
  if (!phraseLens.length) return { score: 0.7, detail: 'short_riff' };

  if (profile.processLoopPolicy && profile.phaseOffsetPolicy) {
    const cycle = computeAlignmentCycle(
      profile.phaseOffsetPolicy.loopLengthBeats,
      profile.phaseOffsetPolicy.barLengthBeats
    );
    const cycleBars = Math.max(1, Math.round(cycle / 4));
    phraseLens.push(cycleBars);
  }

  let hits = 0;
  let checks = 0;
  for (const len of phraseLens) {
    for (let end = len; end <= riff.bars; end += len) {
      checks++;
      const nextBar = end + 1;
      if (nextBar > riff.bars) {
        const barRh = riff.perBarRhythm[end - 1] ?? [];
        const cadence =
          barRh.some((s) => !s.rest && s.startBeat >= 3 - EPS) ||
          barRh.some((s) => s.rest && s.duration >= 1);
        if (cadence) hits++;
        continue;
      }
      const rh = riff.perBarRhythm[nextBar - 1] ?? [];
      const downbeat = rh.some((s) => !s.rest && Math.abs(s.startBeat) < EPS) || rh.some((s) => s.rest && s.startBeat < EPS);
      if (downbeat) hits++;
    }
  }

  const score = checks > 0 ? hits / checks : 0.75;
  const odd = resolveOddMeterPreset(profile);
  const detail =
    odd != null
      ? `cadence_hits=${hits}/${checks} odd_behavior=${getOddMeterPolicy(odd).cadenceGroupBehavior}`
      : `cadence_hits=${hits}/${checks}`;
  return { score: clamp01(score), detail };
}

function scoreContourShape(
  riff: GeneratedRiff,
  profile: RiffProfile
): { score: number; skipped: boolean; detail?: string } {
  const notes = guitarMelodicNotes(riff.score).sort(
    (a, b) => a.measureIndex - b.measureIndex || a.startBeat - b.startBeat
  );
  if (notes.length < 3) return { score: 0.45, skipped: false, detail: 'too_few_for_arc' };
  const mids = notes.map((n) => n.midi);
  let asc = 0;
  let desc = 0;
  for (let i = 1; i < mids.length; i++) {
    if (mids[i]! > mids[i - 1]!) asc++;
    else if (mids[i]! < mids[i - 1]!) desc++;
  }
  const motion = asc + desc;
  const arc = motion > 0 ? Math.abs(asc - desc) / motion : 0;
  const apex = Math.max(...mids);
  const nadir = Math.min(...mids);
  const span = apex - nadir;
  const apexOk = span >= 3 ? 1 : span / 3;
  const returnPc = Math.min(Math.abs((mids[0]! % 12) - (mids[mids.length - 1]! % 12)), 12 - Math.abs((mids[0]! % 12) - (mids[mids.length - 1]! % 12)));
  const returnScore = returnPc <= profile.riffContourPolicy.returnTendency * 6 + 3 ? 1 : 0.55;
  const score = clamp01(arc * 0.55 + apexOk * 0.25 + returnScore * 0.2);
  return { score, skipped: false, detail: `arc=${arc.toFixed(2)} span=${span}` };
}

export function evaluatePitchStreakGuard(
  riff: GeneratedRiff,
  profile: RiffProfile
): { score: number; bypassed: boolean; failures: string[] } {
  const rockPreset = resolveRockPreset(profile);
  const bypassed =
    profile.allowPitchStreak === true ||
    (profile.allowPitchStreak !== false &&
      rockPreset != null &&
      rockRiffAllowsPitchStreak(rockPreset));
  if (bypassed) return { score: 1, bypassed: true, failures: [] };

  const failures: string[] = [];
  let prev = '\x00';
  let run = 0;
  for (let b = 1; b <= riff.bars; b++) {
    const sig = measureVoice1PitchSignature(riff.score, b);
    if (!sig) {
      prev = '\x00';
      run = 0;
      continue;
    }
    run = sig === prev ? run + 1 : 1;
    prev = sig;
    if (run >= 2) {
      failures.push(`pitchStreakGuard: consecutive bars ${b - 1}–${b} share pitch-class sequence`);
    }
  }
  const score = failures.length === 0 ? 1 : clamp01(1 - failures.length * 0.35);
  return { score, bypassed: false, failures };
}

/** Exported for tests — family-aware rule weights (normalized). */
export function familyRuleWeights(
  family: RiffMusicalityFamily,
  overrides?: Partial<Record<RiffMusicalityRuleId, number>>
): Record<RiffMusicalityRuleId, number> {
  const w = { ...DEFAULT_WEIGHTS, ...overrides };
  const mult = FAMILY_RULE_WEIGHT_MULTIPLIERS[family];
  if (mult) {
    for (const [k, m] of Object.entries(mult) as [RiffMusicalityRuleId, number][]) {
      w[k] = (w[k] ?? 0) * m;
    }
  }
  if (family === 'rock') {
    w.loopIdentityScore = (w.loopIdentityScore ?? 0) * 1.05;
    w.silencePatternScore = (w.silencePatternScore ?? 0) * 0.85;
  } else if (family === 'funk') {
    w.syncopationBalance = (w.syncopationBalance ?? 0) * 1.05;
    w.silencePatternScore = (w.silencePatternScore ?? 0) * 1.05;
  }
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum <= 0) return w;
  const out = { ...w };
  for (const k of Object.keys(out) as RiffMusicalityRuleId[]) {
    out[k] = out[k]! / sum;
  }
  return out;
}

const RIFF_RULE_FRIENDLY_LABELS: Record<string, string> = {
  anchorStrength: 'Needs a stronger downbeat',
  loopIdentityScore: 'Riff lacks repetition coherence',
  syncopationBalance: 'Rhythm too square / too random',
  registerCoherence: 'Notes out of register',
  intervalIdentityScore: "Intervals don't match style",
  barToBarMutationBudget: 'Too much variation bar-to-bar',
  silencePatternScore: 'Silence pattern off for this style',
  cadentialReset: 'Phrase ending needs reset',
  contourShape: 'Contour arc weak for this family',
  pitchStreakGuard: 'Pitch streak policy',
};

function buildGateFailure(
  ruleId: string,
  profile: RiffProfile,
  detail?: string
): GateFailure {
  const hint = profileHintForRule(ruleId as RiffMusicalityRuleId, profile);
  const friendlyLabel = RIFF_RULE_FRIENDLY_LABELS[ruleId] ?? ruleId;
  return {
    ruleId,
    friendlyLabel,
    profileField: hint.profileField,
    profileValue: hint.profileValue ?? detail,
  };
}

/**
 * Evaluate 8-rule musicality gate + optional contour + pitch-streak guard.
 */
export function evaluateRiffMusicality(
  riff: GeneratedRiff,
  profile: RiffProfile,
  options?: RiffMusicalityGateOptions
): RiffMusicalityResult {
  const family = resolveMusicalityFamilyForGate(profile, options?.familyTag, options?.vrbId);
  const threshold = options?.threshold ?? RIFF_MUSICALITY_DEFAULT_THRESHOLD;
  const weights = familyRuleWeights(family, options?.weights);
  const failedRules: string[] = [];
  const gateFailures: GateFailure[] = [];
  const details: Record<string, number> = {};

  const rules: Record<RiffMusicalityRuleId, { score: number; detail?: string }> = {
    anchorStrength: scoreAnchorStrength(riff, profile, family),
    loopIdentityScore: scoreLoopIdentity(riff, profile, family),
    syncopationBalance: scoreSyncopationBalance(riff, profile, family),
    registerCoherence: scoreRegisterCoherence(riff, profile),
    intervalIdentityScore: scoreIntervalIdentity(riff, profile, family),
    barToBarMutationBudget: scoreBarToBarMutation(riff, profile),
    silencePatternScore: scoreSilencePattern(riff, profile, family),
    cadentialReset: scoreCadentialReset(riff, profile),
  };

  let weighted = 0;
  for (const id of Object.keys(rules) as RiffMusicalityRuleId[]) {
    const row = rules[id]!;
    details[id] = row.score;
    weighted += row.score * weights[id]!;
    if (row.score < 0.45) {
      failedRules.push(`${id}: score=${row.score.toFixed(2)}${row.detail ? ` (${row.detail})` : ''}`);
      gateFailures.push(buildGateFailure(id, profile, row.detail));
    }
  }

  const contourRequired = contourRequiredForFamily(family);
  const contourDisabled = contourDisabledForFamily(family);
  let contourScore = 1;
  if (!contourDisabled) {
    const c = scoreContourShape(riff, profile);
    contourScore = c.score;
    details.contourShape = contourScore;
    if (contourRequired && contourScore < 0.45) {
      failedRules.push(`contourShape: score=${contourScore.toFixed(2)} (${c.detail ?? 'weak_arc'})`);
      gateFailures.push(buildGateFailure('contourShape', profile, c.detail));
    } else if (!contourRequired && contourScore < 0.3) {
      weighted = weighted * 0.95 + contourScore * 0.05;
    } else if (contourRequired) {
      weighted = weighted * 0.92 + contourScore * 0.08;
    }
  } else {
    details.contourShape = 1;
  }

  const pitch = evaluatePitchStreakGuard(riff, profile);
  details.pitchStreakGuard = pitch.score;
  if (!pitch.bypassed) {
    for (const f of pitch.failures) {
      failedRules.push(f);
      gateFailures.push({
        ruleId: 'pitchStreakGuard',
        friendlyLabel: RIFF_RULE_FRIENDLY_LABELS.pitchStreakGuard!,
        profileField: 'allowPitchStreak',
        profileValue: String(profile.allowPitchStreak),
      });
    }
    if (pitch.score < 0.55) {
      weighted = Math.min(weighted, pitch.score);
    }
  }

  const passed = weighted >= threshold && failedRules.length === 0;

  return {
    passed,
    score: clamp01(weighted),
    failedRules,
    gateFailures,
    details,
    pitchStreakBypassed: pitch.bypassed,
    contourRequired,
    rulesetVersion: RIFF_MUSICALITY_GATE_VERSION,
    family,
  };
}

/** Pick best musicality among up to {@link RIFF_MUSICALITY_MAX_SEED_RETRIES} candidates. */
export function selectRiffByMusicality<T extends { musicality: RiffMusicalityResult }>(
  candidates: T[]
): T | null {
  if (!candidates.length) return null;
  const slice = candidates.slice(0, RIFF_MUSICALITY_MAX_SEED_RETRIES);
  const passing = slice.filter((c) => c.musicality.passed);
  const pool = passing.length ? passing : slice;
  return pool.reduce((best, cur) => (cur.musicality.score > best.musicality.score ? cur : best));
}
