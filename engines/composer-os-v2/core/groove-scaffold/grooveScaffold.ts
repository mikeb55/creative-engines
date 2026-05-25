import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { EffectiveGenerationContext, SectionType, Song } from '../section-architecture/sectionArchitectureTypes';
import { getEffectiveContextForBar } from '../section-architecture/effectiveContextForBar';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import type { PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createNote, createPart, createRest } from '../score-model/scoreEventBuilder';

export const GROOVE_DRUMS_PART_ID = 'groove_drums';
export const GROOVE_DRUMS_INSTRUMENT_IDENTITY = 'groove_scaffold_drums';

export type GrooveFeel = 'swing' | 'funk' | 'rock' | 'bossa' | 'ballad' | 'odd_meter';
export type GrooveSubdivision = '8th' | '16th' | 'triplet';
export type GrooveDensityTier = 'low' | 'mid' | 'high';
export type GrooveLaneRole = 'time' | 'backbeat' | 'comping' | 'fillColor';
export type GrooveBarRole =
  | 'stable'
  | 'stable_lift'
  | 'lead_in'
  | 'turnaround'
  | 'cadence'
  | 'fill'
  | 'post_fill_reset'
  | 'ending';
export type GrooveSectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';

export interface GrooveStyleProfile {
  feel: GrooveFeel;
  subdivision: GrooveSubdivision;
  laneRoles: { time: string; backbeat: string; comping: string; fillColor: string };
  densityCaps: Record<GrooveDensityTier, Record<GrooveLaneRole, number>>;
  accentPolicy: { backbeatStrength: number; beat1Strength: number; cadenceAccent: number };
  microtimingPolicy: 'none' | 'tight' | 'laid_back' | 'swing_triplet';
  variationBudget: 'low' | 'medium' | 'high';
  fillFamilies: ['pickup', 'snare_turn', 'tom_down', 'kick_push', 'ending_hit'];
  barRoleRules: Record<GrooveSectionType, GrooveBarRole[]>;
}

export interface GrooveBarContext {
  bar: number;
  effectiveContext: EffectiveGenerationContext;
  sectionType: GrooveSectionType;
  barPositionInSection: number;
  barsToSectionEnd: number;
  localEnergyDelta: number;
  barsSinceFill: number;
  previousBarRole: GrooveBarRole;
  cadenceStrength: number;
}

export interface GrooveBarPlan {
  bar: number;
  role: GrooveBarRole;
  densityTier: GrooveDensityTier;
  laneActivityMask: { kick: boolean; snare: boolean; ride: boolean; hihat: boolean; tom: boolean };
  fillEligible: boolean;
  arrivalAccent: boolean;
  crashEligible: boolean;
  resolvedFeel: GrooveFeel;
}

export interface PercussionRenderPolicy {
  midiChannel: 10;
  kitMap: {
    kick: 36;
    snare: 38;
    hihatClosed: 42;
    hihatOpen: 46;
    ride: 51;
    crash: 49;
    tomHigh: 50;
    tomMid: 48;
    tomFloor: 45;
  };
  musicXmlStaves: 1;
  musicXmlVoices: 1;
  noteheadPolicy: 'standard GM only';
  displayStepMap: Record<keyof PercussionRenderPolicy['kitMap'], { displayStep: string; displayOctave: number }>;
}

export interface GrooveScaffoldRequest {
  enabled: boolean;
  feel?: GrooveFeel;
}

export interface GrooveScaffoldDiagnostics {
  enabled: true;
  receipts: string[];
  fillCountPer32Bars: number;
  fillCountBySection: Record<string, number>;
  consecutiveIdenticalStableBars: number;
  laneDensityPerSectionEnergyTier: Record<string, Record<GrooveDensityTier, Record<string, number>>>;
  crashCount: number;
  openHatCount: number;
  barsSinceLastFill: number;
  oddMeterBars: number[];
  exportSimplificationWarnings: string[];
  barPlans: GrooveBarPlan[];
}

export const GROOVE_RECEIPTS = {
  swing: 'GROOVE_SWING',
  funk: 'GROOVE_FUNK',
  rock: 'GROOVE_ROCK',
  bossa: 'GROOVE_BOSSA',
  ballad: 'GROOVE_BALLAD',
  odd_meter: 'GROOVE_ODD_METER',
} as const satisfies Record<GrooveFeel, string>;

export const GROOVE_RECEIPT_LINES = [
  'GROOVE_SWING — groove scaffold: triplet feel metadata; ride-led time; hi-hat closes on 2+4; sparse fills only.',
  'GROOVE_FUNK — groove scaffold: 16th grid; tight hi-hat; ghost snare colour; no named drummer emulation.',
  'GROOVE_ROCK — groove scaffold: 8th grid; strong backbeat; open-hat lift; simple kick/snare/tom fills.',
  'GROOVE_BOSSA — groove scaffold: 8th cross-stick posture; minimal kick; restrained section fills.',
  'GROOVE_BALLAD — groove scaffold: sparse 8th pulse; side-stick/snare only; low variation budget.',
  'GROOVE_ODD_METER — groove scaffold: ostinato derived from per-bar meter span; no complex cymbal choreography.',
] as const;

export const PERCUSSION_RENDER_POLICY: PercussionRenderPolicy = {
  midiChannel: 10,
  kitMap: {
    kick: 36,
    snare: 38,
    hihatClosed: 42,
    hihatOpen: 46,
    ride: 51,
    crash: 49,
    tomHigh: 50,
    tomMid: 48,
    tomFloor: 45,
  },
  musicXmlStaves: 1,
  musicXmlVoices: 1,
  noteheadPolicy: 'standard GM only',
  displayStepMap: {
    kick: { displayStep: 'C', displayOctave: 5 },
    snare: { displayStep: 'E', displayOctave: 5 },
    hihatClosed: { displayStep: 'F', displayOctave: 5 },
    hihatOpen: { displayStep: 'A', displayOctave: 5 },
    ride: { displayStep: 'D', displayOctave: 5 },
    crash: { displayStep: 'A', displayOctave: 5 },
    tomHigh: { displayStep: 'E', displayOctave: 5 },
    tomMid: { displayStep: 'A', displayOctave: 4 },
    tomFloor: { displayStep: 'F', displayOctave: 4 },
  },
};

const FEEL_TO_SUBDIVISION: Record<GrooveFeel, GrooveSubdivision> = {
  swing: 'triplet',
  funk: '16th',
  rock: '8th',
  bossa: '8th',
  ballad: '8th',
  odd_meter: '8th',
};

const BASE_STYLE: Omit<GrooveStyleProfile, 'feel' | 'subdivision' | 'laneRoles' | 'microtimingPolicy' | 'variationBudget'> = {
  densityCaps: {
    low: { time: 8, backbeat: 2, comping: 2, fillColor: 2 },
    mid: { time: 12, backbeat: 3, comping: 3, fillColor: 4 },
    high: { time: 16, backbeat: 4, comping: 4, fillColor: 6 },
  },
  accentPolicy: { backbeatStrength: 0.82, beat1Strength: 0.76, cadenceAccent: 0.9 },
  fillFamilies: ['pickup', 'snare_turn', 'tom_down', 'kick_push', 'ending_hit'],
  barRoleRules: {
    intro: ['stable', 'lead_in'],
    verse: ['stable', 'turnaround'],
    chorus: ['stable_lift', 'fill'],
    bridge: ['stable'],
    outro: ['stable', 'ending'],
  },
};

export function buildGrooveStyleProfile(feel: GrooveFeel): GrooveStyleProfile {
  const common = {
    ...BASE_STYLE,
    feel,
    subdivision: FEEL_TO_SUBDIVISION[feel],
  };
  if (feel === 'swing') {
    return {
      ...common,
      laneRoles: { time: 'ride', backbeat: 'hihat_2_4', comping: 'kick_feather', fillColor: 'snare_tom' },
      microtimingPolicy: 'swing_triplet',
      variationBudget: 'medium',
    };
  }
  if (feel === 'funk') {
    return {
      ...common,
      laneRoles: { time: 'tight_hihat', backbeat: 'snare_ghosted', comping: 'kick_syncopation', fillColor: 'snare_tom' },
      microtimingPolicy: 'tight',
      variationBudget: 'high',
    };
  }
  if (feel === 'rock') {
    return {
      ...common,
      laneRoles: { time: 'open_hihat_lift', backbeat: 'snare_2_4', comping: 'kick_downbeat', fillColor: 'snare_tom' },
      microtimingPolicy: 'tight',
      variationBudget: 'medium',
    };
  }
  if (feel === 'bossa') {
    return {
      ...common,
      laneRoles: { time: 'closed_hihat', backbeat: 'cross_stick', comping: 'minimal_kick', fillColor: 'snare_turn' },
      microtimingPolicy: 'laid_back',
      variationBudget: 'low',
    };
  }
  if (feel === 'ballad') {
    return {
      ...common,
      laneRoles: { time: 'sparse_hihat', backbeat: 'side_stick', comping: 'soft_kick', fillColor: 'snare_turn' },
      microtimingPolicy: 'laid_back',
      variationBudget: 'low',
    };
  }
  return {
    ...common,
    laneRoles: { time: 'meter_ostinato', backbeat: 'group_accent', comping: 'kick_group_start', fillColor: 'tom_down' },
    microtimingPolicy: 'none',
    variationBudget: 'medium',
  };
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ (bar * 1103515245) ^ (salt * 12345)) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function normalizeSectionType(type: SectionType): GrooveSectionType {
  if (type === 'intro' || type === 'verse' || type === 'chorus' || type === 'bridge' || type === 'outro') return type;
  return type === 'development' || type === 'solo' ? 'bridge' : 'verse';
}

function sectionForBar(song: Song, bar: number) {
  return song.sections.find((s) => bar >= s.barRange.startBar && bar <= s.barRange.endBar);
}

function densityTier(energy: number | undefined, role: GrooveBarRole): GrooveDensityTier {
  if (role === 'post_fill_reset') return 'low';
  const e = typeof energy === 'number' ? Math.max(0, Math.min(1, energy)) : 0.45;
  if (role === 'stable_lift' || e >= 0.68) return 'high';
  if (e <= 0.35 || role === 'lead_in') return 'low';
  return 'mid';
}

function fillChance(feel: GrooveFeel, energy: number | undefined, finalBar: boolean): number {
  const e = typeof energy === 'number' ? Math.max(0, Math.min(1, energy)) : 0.45;
  const feelBoost = feel === 'funk' || feel === 'rock' ? 0.06 : feel === 'ballad' || feel === 'bossa' ? -0.04 : 0;
  const raw = finalBar ? 0.35 + e * 0.25 + feelBoost : 0.1 + e * 0.1 + feelBoost * 0.4;
  return finalBar ? Math.max(0.35, Math.min(0.6, raw)) : Math.max(0.1, Math.min(0.2, raw));
}

function resolveRequestedFeel(song: Song): GrooveFeel {
  const req = song.globalDefaults.grooveScaffold?.feel;
  return req ?? 'rock';
}

function resolveFeelForBar(requested: GrooveFeel, beatSpan: number): GrooveFeel {
  return Math.abs(beatSpan - 4) > 0.001 ? 'odd_meter' : requested;
}

function buildBarContext(
  bar: number,
  context: CompositionContext,
  song: Song,
  previousRole: GrooveBarRole,
  barsSinceFill: number,
  previousEnergy: number
): GrooveBarContext | undefined {
  const section = sectionForBar(song, bar);
  const effectiveContext = getEffectiveContextForBar(bar, context);
  if (!section || !effectiveContext) return undefined;
  const energy = effectiveContext.energy ?? section.energy ?? previousEnergy;
  const pos = bar - section.barRange.startBar + 1;
  return {
    bar,
    effectiveContext,
    sectionType: normalizeSectionType(section.type),
    barPositionInSection: pos,
    barsToSectionEnd: section.barRange.endBar - bar,
    localEnergyDelta: energy - previousEnergy,
    barsSinceFill,
    previousBarRole: previousRole,
    cadenceStrength: section.barRange.endBar === bar ? 1 : pos % 4 === 0 ? 0.45 : 0,
  };
}

function planGrooveBar(
  ctx: GrooveBarContext,
  requestedFeel: GrooveFeel,
  seed: number,
  beatSpan: number,
  fillsInCurrentSection: number
): GrooveBarPlan {
  const resolvedFeel = resolveFeelForBar(requestedFeel, beatSpan);
  const energy = ctx.effectiveContext.energy ?? 0.45;
  const finalBar = ctx.barsToSectionEnd === 0;
  let role: GrooveBarRole = 'stable';
  let fillEligible = false;

  if (ctx.previousBarRole === 'fill') {
    role = 'post_fill_reset';
  } else if (ctx.sectionType === 'intro') {
    role = finalBar ? 'lead_in' : 'stable';
  } else if (ctx.sectionType === 'verse') {
    role = ctx.barPositionInSection % 4 === 0 || finalBar ? 'turnaround' : 'stable';
  } else if (ctx.sectionType === 'chorus') {
    role = 'stable_lift';
    fillEligible = ctx.barPositionInSection % 4 === 0 || finalBar;
  } else if (ctx.sectionType === 'bridge') {
    role = 'stable';
  } else if (ctx.sectionType === 'outro') {
    role = ctx.barsToSectionEnd <= 3 ? 'ending' : 'stable';
  }

  const canFillBySpacing = ctx.barsSinceFill >= 3 || role === 'ending';
  const finalFillRoll = seededUnit(seed, ctx.bar, 65003) < fillChance(resolvedFeel, energy, true);
  const midCadenceRoll =
    ctx.cadenceStrength >= 0.4 &&
    ctx.barsSinceFill >= 4 &&
    seededUnit(seed, ctx.bar, 65002) < fillChance(resolvedFeel, energy, false);
  const sectionNeedsOneSparseFill =
    finalBar && fillsInCurrentSection === 0 && ctx.barsSinceFill >= 4 && ctx.sectionType !== 'outro';
  if (
    role !== 'post_fill_reset' &&
    role !== 'ending' &&
    canFillBySpacing &&
    (sectionNeedsOneSparseFill || (finalBar && finalFillRoll) || (!finalBar && midCadenceRoll && ctx.sectionType !== 'bridge'))
  ) {
    role = 'fill';
    fillEligible = true;
  }

  const tier = densityTier(energy, role);
  return {
    bar: ctx.bar,
    role,
    densityTier: tier,
    laneActivityMask: {
      kick: role !== 'post_fill_reset',
      snare: role !== 'post_fill_reset',
      ride: resolvedFeel === 'swing',
      hihat: resolvedFeel !== 'swing',
      tom: role === 'fill' || role === 'ending',
    },
    fillEligible,
    arrivalAccent: ctx.barPositionInSection === 1 && ctx.bar > 1,
    crashEligible: ctx.barPositionInSection === 1 && ctx.bar > 1 && role !== 'fill',
    resolvedFeel,
  };
}

type HitLane =
  | 'kick'
  | 'snare'
  | 'hihatClosed'
  | 'hihatOpen'
  | 'ride'
  | 'crash'
  | 'tomHigh'
  | 'tomMid'
  | 'tomFloor';

const LANE_TO_MIDI: Record<HitLane, number> = {
  kick: PERCUSSION_RENDER_POLICY.kitMap.kick,
  snare: PERCUSSION_RENDER_POLICY.kitMap.snare,
  hihatClosed: PERCUSSION_RENDER_POLICY.kitMap.hihatClosed,
  hihatOpen: PERCUSSION_RENDER_POLICY.kitMap.hihatOpen,
  ride: PERCUSSION_RENDER_POLICY.kitMap.ride,
  crash: PERCUSSION_RENDER_POLICY.kitMap.crash,
  tomHigh: PERCUSSION_RENDER_POLICY.kitMap.tomHigh,
  tomMid: PERCUSSION_RENDER_POLICY.kitMap.tomMid,
  tomFloor: PERCUSSION_RENDER_POLICY.kitMap.tomFloor,
};

function addHit(hits: Map<number, Set<HitLane>>, beat: number, lanes: HitLane[], span: number): void {
  if (beat < -1e-6 || beat >= span - 1e-6) return;
  const b = Math.round(beat * 1000) / 1000;
  if (!hits.has(b)) hits.set(b, new Set());
  const set = hits.get(b)!;
  for (const lane of lanes) set.add(lane);
}

function renderHits(plan: GrooveBarPlan, span: number): Map<number, Set<HitLane>> {
  const hits = new Map<number, Set<HitLane>>();
  if (plan.crashEligible) addHit(hits, 0, ['crash', 'kick'], span);

  if (plan.role === 'fill') {
    const starts = [Math.max(0, span - 2), Math.max(0, span - 1.5), Math.max(0, span - 1), Math.max(0, span - 0.5)];
    const lanes: HitLane[][] = [['snare'], ['tomHigh'], ['tomMid'], ['tomFloor', 'kick']];
    starts.forEach((s, i) => addHit(hits, s, lanes[i]!, span));
    return hits;
  }
  if (plan.role === 'ending') {
    addHit(hits, 0, ['kick', 'crash'], span);
    if (span > 1) addHit(hits, Math.max(0.5, span - 1), ['snare', 'tomFloor'], span);
    if (span > 0.5) addHit(hits, span - 0.5, ['kick'], span);
    return hits;
  }

  switch (plan.resolvedFeel) {
    case 'swing':
      for (let b = 0; b < span; b += 1) addHit(hits, b, ['ride'], span);
      addHit(hits, 1, ['hihatClosed', 'snare'], span);
      addHit(hits, 3, ['hihatClosed', 'snare'], span);
      addHit(hits, 0, ['kick'], span);
      if (plan.role === 'lead_in' || plan.role === 'turnaround') addHit(hits, Math.max(0, span - 1), ['snare'], span);
      break;
    case 'funk':
      for (let b = 0; b < span; b += 0.25) {
        if (plan.densityTier !== 'low' || Math.abs((b * 4) % 2) < 0.001) addHit(hits, b, ['hihatClosed'], span);
      }
      addHit(hits, 0, ['kick'], span);
      addHit(hits, 1, ['snare'], span);
      addHit(hits, 2.5, ['kick'], span);
      addHit(hits, 3, ['snare'], span);
      if (plan.densityTier === 'high') addHit(hits, 1.75, ['snare'], span);
      break;
    case 'rock':
      for (let b = 0; b < span; b += 0.5) addHit(hits, b, [plan.densityTier === 'high' ? 'hihatOpen' : 'hihatClosed'], span);
      addHit(hits, 0, ['kick'], span);
      addHit(hits, 1, ['snare'], span);
      addHit(hits, 2, ['kick'], span);
      addHit(hits, 3, ['snare'], span);
      break;
    case 'bossa':
      for (let b = 0; b < span; b += 0.5) addHit(hits, b, ['hihatClosed'], span);
      addHit(hits, 0, ['kick'], span);
      addHit(hits, 1.5, ['snare'], span);
      addHit(hits, 3, ['snare'], span);
      break;
    case 'ballad':
      addHit(hits, 0, ['hihatClosed', 'kick'], span);
      if (span > 2) addHit(hits, 2, ['hihatClosed'], span);
      addHit(hits, Math.min(3, Math.max(0, span - 1)), ['snare'], span);
      break;
    case 'odd_meter':
      for (let b = 0; b < span; b += 0.5) addHit(hits, b, ['hihatClosed'], span);
      addHit(hits, 0, ['kick'], span);
      addHit(hits, Math.floor(span / 2), ['snare'], span);
      if (plan.role === 'stable_lift') addHit(hits, Math.max(0, span - 0.5), ['kick'], span);
      break;
  }

  return hits;
}

function eventsFromHits(hits: Map<number, Set<HitLane>>, span: number): ScoreEvent[] {
  const starts = [...hits.keys()].filter((b) => b >= 0 && b < span).sort((a, b) => a - b);
  const events: ScoreEvent[] = [];
  let cursor = 0;
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]!;
    if (start > cursor + 1e-6) {
      events.push(createRest(cursor, start - cursor, 1));
      cursor = start;
    }
    const next = starts[i + 1] ?? span;
    const duration = Math.max(0.25, next - start);
    const midis = [...(hits.get(start) ?? new Set<HitLane>())]
      .map((lane) => LANE_TO_MIDI[lane])
      .sort((a, b) => a - b);
    if (midis.length > 0) {
      events.push(createNote(midis[0]!, start, Math.min(duration, span - start), 1, undefined, midis, 88));
    }
    cursor = Math.min(span, start + duration);
  }
  if (cursor < span - 1e-6) events.push(createRest(cursor, span - cursor, 1));
  if (events.length === 0) events.push(createRest(0, span, 1));
  return events;
}

function stableSignature(plan: GrooveBarPlan, events: ScoreEvent[]): string {
  if (plan.role !== 'stable' && plan.role !== 'stable_lift') return '';
  return events
    .filter((e) => e.kind === 'note')
    .map((e) => `${e.startBeat}:${e.duration}:${[e.pitch, ...(e.pitches ?? [])].join('.')}`)
    .join('|');
}

function sectionEnergyTierKey(sectionLabel: string, tier: GrooveDensityTier): string {
  return `${sectionLabel}:${tier}`;
}

export function shouldRunGrooveScaffold(context: CompositionContext, song: Song | undefined = context.song): song is Song {
  return song?.globalDefaults.grooveScaffold?.enabled === true && context.presetId === 'song_mode';
}

export function grooveScaffoldPass(score: ScoreModel, context: CompositionContext, song: Song | undefined = context.song): void {
  if (!shouldRunGrooveScaffold(context, song)) return;
  if (score.parts.some((p) => p.id === GROOVE_DRUMS_PART_ID)) return;

  const totalBars = song.totalBars;
  const requestedFeel = resolveRequestedFeel(song);
  const profile = buildGrooveStyleProfile(requestedFeel);
  const part: PartModel = createPart(
    GROOVE_DRUMS_PART_ID,
    'Groove Drums',
    GROOVE_DRUMS_INSTRUMENT_IDENTITY,
    0,
    'treble',
    totalBars,
    () => undefined,
    () => undefined
  );

  const fillCountBySection: Record<string, number> = {};
  const laneDensityPerSectionEnergyTier: Record<string, Record<GrooveDensityTier, Record<string, number>>> = {};
  const oddMeterBars: number[] = [];
  const barPlans: GrooveBarPlan[] = [];
  const receipts = new Set<string>([GROOVE_RECEIPTS[requestedFeel]]);
  let fillCount = 0;
  let crashCount = 0;
  let openHatCount = 0;
  let previousRole: GrooveBarRole = 'stable';
  let barsSinceFill = 99;
  let previousEnergy = 0.45;
  let previousStableSig = '';
  let stableRun = 0;
  let maxStableRun = 0;

  for (let bar = 1; bar <= totalBars; bar++) {
    const measure = part.measures[bar - 1]!;
    const span = resolveMeasureBeatSpanQuarters(bar, context.barMeterMap ?? context.generationMetadata?.barMeterMap);
    measure.measureBeatSpanQuarters = span;
    const gb = buildBarContext(bar, context, song, previousRole, barsSinceFill, previousEnergy);
    if (!gb) {
      measure.events = [createRest(0, span, 1)];
      continue;
    }
    previousEnergy = gb.effectiveContext.energy ?? previousEnergy;
    const plan = planGrooveBar(gb, requestedFeel, context.seed, span, fillCountBySection[gb.effectiveContext.sectionLabel] ?? 0);
    if (plan.resolvedFeel === 'odd_meter') {
      receipts.add(GROOVE_RECEIPTS.odd_meter);
      oddMeterBars.push(bar);
    }
    const hits = renderHits(plan, span);
    const events = eventsFromHits(hits, span);
    measure.events = events;
    barPlans.push(plan);

    if (plan.role === 'fill' || (plan.role === 'ending' && gb.barsToSectionEnd === 0)) {
      if (plan.role === 'fill') fillCount++;
      const sec = gb.effectiveContext.sectionLabel;
      fillCountBySection[sec] = (fillCountBySection[sec] ?? 0) + 1;
      barsSinceFill = 0;
    } else {
      barsSinceFill += 1;
    }

    for (const e of events) {
      if (e.kind !== 'note') continue;
      const pitches = [e.pitch, ...(e.pitches ?? [])];
      if (pitches.includes(PERCUSSION_RENDER_POLICY.kitMap.crash)) crashCount++;
      if (pitches.includes(PERCUSSION_RENDER_POLICY.kitMap.hihatOpen)) openHatCount++;
    }

    const secKey = sectionEnergyTierKey(gb.effectiveContext.sectionLabel, plan.densityTier);
    laneDensityPerSectionEnergyTier[secKey] ??= { low: {}, mid: {}, high: {} };
    const laneBucket = laneDensityPerSectionEnergyTier[secKey]![plan.densityTier]!;
    for (const e of events) {
      if (e.kind !== 'note') continue;
      for (const pitch of [e.pitch, ...(e.pitches ?? [])]) {
        laneBucket[String(pitch)] = (laneBucket[String(pitch)] ?? 0) + 1;
      }
    }

    const sig = stableSignature(plan, events);
    if (sig && sig === previousStableSig) stableRun++;
    else stableRun = sig ? 1 : 0;
    previousStableSig = sig;
    maxStableRun = Math.max(maxStableRun, stableRun);
    previousRole = plan.role;
  }

  score.parts.push(part);
  const md = context.generationMetadata as GenerationMetadata;
  md.grooveScaffoldDiagnostics = {
    enabled: true,
    receipts: [...receipts],
    fillCountPer32Bars: Math.round((fillCount / Math.max(1, totalBars)) * 32 * 10) / 10,
    fillCountBySection,
    consecutiveIdenticalStableBars: maxStableRun,
    laneDensityPerSectionEnergyTier,
    crashCount,
    openHatCount,
    barsSinceLastFill: barsSinceFill,
    oddMeterBars,
    exportSimplificationWarnings:
      profile.microtimingPolicy === 'swing_triplet'
        ? ['Swing feel exported as straight notation with swing-triplet receipt metadata.']
        : [],
    barPlans,
  };
  md.grooveScaffoldReceipts = [...receipts];
  md.grooveScaffoldReceipt = `Groove scaffold: feel=${requestedFeel}; receipts=${[...receipts].join(',')}; fills=${fillCount}; odd_meter_bars=${oddMeterBars.length}`;
}
