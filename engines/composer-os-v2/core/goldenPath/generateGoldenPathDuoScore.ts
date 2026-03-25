/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware (Guitar–Bass Duo).
 */

import type { CompositionContext } from '../compositionContext';
import { chordTonesForChordSymbol, parseChordSymbol, pitchClassToBassMidi } from '../harmony/chordSymbolAnalysis';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { createMeasure, createNote, createRest, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { GUITAR_BASS_DUO_BASS_PART_NAME } from '../instrument-profiles/guitarBassDuoExportNames';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import type { MotifTrackerState, PlacedMotif } from '../motif/motifTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { getInteractionForBar } from '../interaction/interactionPlanner';
import { applyPerformancePass } from '../performance/performancePass';
import { applyExpressiveDuoFeel, buildFeelProfileFromTempo } from './expressiveDuoFeel';
import { pickGuideTone, clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { activityScoreForBar, HIGH_ACTIVITY } from './activityScore';
import { emitMelodicBassBar, scrubBassFirstAttackIfRoot, type BassSectionRole } from './bassMelodicLines';
import {
  computeEnsembleStagger,
  emitGuitarPhraseBar,
  getDuoPhraseIntent,
} from './guitarPhraseAuthority';
import { momentTagForBar } from './duoNarrativeMoments';

const GUITAR_FLOOR_FOR_SEPARATION = 60;

function getChordForBar(barIndex: number, context: CompositionContext): string {
  for (const seg of context.chordSymbolPlan.segments) {
    if (barIndex >= seg.startBar && barIndex < seg.startBar + seg.bars) {
      return seg.chord;
    }
  }
  throw new Error(
    `Chord symbol plan does not define bar ${barIndex} — custom and built-in plans must cover bars 1–8 contiguously.`
  );
}

function rehearsalForBar(barIndex: number): string | undefined {
  if (barIndex === 1) return 'A';
  if (barIndex === 5) return 'B';
  return undefined;
}

function getRegisterForBar(guitarMap: InstrumentRegisterMap, bar: number): [number, number] {
  const section = bar <= 4 ? 'A' : 'B';
  const plan = guitarMap.sections.find((s) => s.sectionLabel === section);
  return plan?.preferredZone ?? [55, 79];
}

function getBassRegisterForBar(bassMap: InstrumentRegisterMap, bar: number): [number, number] {
  const section = bar <= 4 ? 'A' : 'B';
  const plan = bassMap.sections.find((s) => s.sectionLabel === section);
  return plan?.preferredZone ?? [36, 55];
}

function getPlacementsForBar(placements: PlacedMotif[], bar: number): PlacedMotif[] {
  return placements.filter((p) => p.startBar === bar);
}

interface StyleHints {
  metheny?: { attackDensityReduced?: boolean; lyricalMotif?: boolean };
  bacharach?: { phraseAsymmetry?: boolean; chromaticPassingWeight?: number };
}

function readStyleHints(context: CompositionContext): StyleHints {
  const so = (context as { styleOverrides?: Record<string, unknown> }).styleOverrides;
  return {
    metheny: so?.metheny as StyleHints['metheny'],
    bacharach: so?.bacharach as StyleHints['bacharach'],
  };
}

/** Quarter-beat grid — keeps MusicXML division sums stable. */
function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/** Remove rests fully covered by a note span (motif tail rounding can leave orphan rests). */
function collapseRestsInsideNotes(m: MeasureModel): void {
  const notes = m.events.filter((e) => e.kind === 'note') as { startBeat: number; duration: number }[];
  if (notes.length === 0) return;
  m.events = m.events.filter((e) => {
    if (e.kind !== 'rest') return true;
    const r = e as { startBeat: number; duration: number };
    const rs = r.startBeat;
    const re = r.startBeat + r.duration;
    for (const n of notes) {
      const ns = n.startBeat;
      const ne = n.startBeat + n.duration;
      if (rs >= ns - 1e-4 && re <= ne + 1e-4) return false;
    }
    return true;
  });
}

/** Drop rests that share a start time with a note (motif rounding can create duplicate onsets). */
function dropRestsSameStartAsNote(m: MeasureModel): void {
  m.events = m.events.filter((e) => {
    if (e.kind !== 'rest') return true;
    const r = e as { startBeat: number };
    return !m.events.some(
      (o) => o !== e && o.kind === 'note' && Math.abs((o as { startBeat: number }).startBeat - r.startBeat) < 1e-4
    );
  });
}

/** Snap to quarter-beat grid and fix floating drift so MusicXML divisions sum to 16 per 4/4 bar. */
function normalizeMeasureQuarterGrid(m: MeasureModel): void {
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') {
      (e as { startBeat: number }).startBeat = qBeat((e as { startBeat: number }).startBeat);
      (e as { duration: number }).duration = qBeat((e as { duration: number }).duration);
    }
  }
  let sum = 0;
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') sum += (e as { duration: number }).duration;
  }
  const gap = 4 - sum;
  if (Math.abs(gap) > 1e-4) {
    const last = [...m.events].reverse().find((e) => e.kind === 'note' || e.kind === 'rest') as
      | { duration: number }
      | undefined;
    if (last) last.duration = qBeat(last.duration + gap);
  }
}

/**
 * One bar of guaranteed Bacharach signal: chromatic neighbour + 3+5 beat asymmetry, off-grid onsets.
 * Used on bar 2 (section A) and bar 6 (section B) when Bacharach is active — matches bacharachSignal / moduleValidation.
 */
function buildBacharachAnchorMeasure(
  barIndex: number,
  chord: string,
  rehearsal: string | undefined,
  low: number,
  high: number
): MeasureModel {
  const m = createMeasure(barIndex, chord, rehearsal);
  const tones = chordTonesForChordSymbol(chord);
  const target = clampPitch(tones.third, low, high);
  const pass = target - 1;
  const fifth = clampPitch(tones.fifth, low, high);
  addEvent(m, createRest(0, 0.5));
  addEvent(m, createNote(pass, 0.5, 0.25));
  addEvent(m, createNote(target, 0.75, 1.25));
  addEvent(m, createRest(2, 0.5));
  addEvent(m, createNote(fifth, 2.5, 1.5));
  return m;
}

function buildGuitarPart(
  context: CompositionContext,
  _guitarPlan: GuitarBehaviourPlan,
  guitarMap: InstrumentRegisterMap,
  densityPlan: DensityCurvePlan,
  rhythm: RhythmicConstraints,
  motifState: MotifTrackerState,
  interactionPlan?: InteractionPlan
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const seed = context.seed;
  const hints = readStyleHints(context);
  const measures: MeasureModel[] = [];
  const [baseLow] = profile.preferredMelodicZone;
  const effectiveBase = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);

  for (let b = 1; b <= 8; b++) {
    const m = createMeasure(b, getChordForBar(b, context), rehearsalForBar(b));
    const placements = getPlacementsForBar(motifState.placements, b);
    const density = getDensityForBar(densityPlan, b);
    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const reduceAttack = interaction?.coupling?.guitarReduceAttack;
    const phraseIntent = getDuoPhraseIntent(b, seed);
    const stagger = computeEnsembleStagger(b, seed, phraseIntent);
    const [zLow, zHigh] = getRegisterForBar(guitarMap, b);
    const sectionBump = b > 4 ? 5 : 0;
    const effectiveLow = Math.max(zLow, effectiveBase) + sectionBump;
    const effectiveHigh = Math.min(79, zHigh + sectionBump);
    const useOffbeat = (rhythm.offbeatWeight > 0.2 && (b === 2 || b === 4 || b === 6 || b === 8)) || !!reduceAttack;
    const meth = hints.metheny;
    const bach = hints.bacharach;

    if (bach && (b === 2 || b === 6)) {
      const bm = buildBacharachAnchorMeasure(b, getChordForBar(b, context), rehearsalForBar(b), effectiveLow, effectiveHigh);
      normalizeMeasureQuarterGrid(bm);
      measures.push(bm);
      continue;
    }

    if (placements.length > 0) {
      const raw: { pitch: number; start: number; dur: number }[] = [];
      for (const pl of placements) {
        for (const n of pl.notes) {
          let pitch = Math.max(effectiveLow, Math.min(effectiveHigh, n.pitch));
          const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
          if (dur > 0 && n.startBeat < 4) {
            raw.push({ pitch, start: n.startBeat + stagger.guitar, dur });
          }
        }
      }
      raw.sort((a, b2) => a.start - b2.start);
      let cursor = 0;
      for (const e of raw) {
        const start = Math.max(qBeat(e.start), cursor);
        if (start > cursor) {
          addEvent(m, createRest(cursor, start - cursor));
        }
        let dur = qBeat(Math.min(e.dur, 4 - start));
        if (meth?.attackDensityReduced && dur > 0.5) {
          dur = Math.min(dur, 1.25);
        }
        dur = qBeat(Math.min(dur, 4 - start));
        if (dur <= 0) continue;
        addEvent(m, createNote(e.pitch, start, dur));
        cursor = start + dur;
        if (cursor >= 4 - 1e-6) break;
      }
      if (reduceAttack && cursor < 3) {
        addEvent(m, createRest(cursor, 4 - cursor));
      } else if (cursor < 4 - 1e-4) {
        const tail = 4 - cursor;
        if (tail >= 1.5 && seededUnit(seed, b, 5) < 0.35) {
          addEvent(m, createRest(cursor, 0.5));
          addEvent(m, createNote(effectiveLow + 7, cursor + 0.5, tail - 0.5));
        } else {
          addEvent(m, createNote(effectiveLow + (b % 3 === 0 ? 9 : 5), cursor, tail));
        }
      }
      collapseRestsInsideNotes(m);
      dropRestsSameStartAsNote(m);
    } else {
      const densityLevel =
        density === 'very_dense' ? 'dense' : (density as 'sparse' | 'medium' | 'dense');
      emitGuitarPhraseBar({
        m,
        bar: b,
        chord: getChordForBar(b, context),
        effectiveLow,
        effectiveHigh,
        density: densityLevel,
        useOffbeat,
        reduceAttack: !!reduceAttack,
        intent: phraseIntent,
        staggerG: stagger.guitar,
        seed,
        methenyShortenLong: meth?.attackDensityReduced,
      });
    }

    normalizeMeasureQuarterGrid(m);
    measures.push(m);
  }

  return {
    id: 'guitar',
    name: 'Clean Electric Guitar',
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'treble',
    measures,
  };
}

function firstGuitarPitchInBar(guitar: PartModel, bar: number): number | undefined {
  const m = guitar.measures.find((x) => x.index === bar);
  const ev = m?.events.find((e) => e.kind === 'note');
  return ev ? (ev as { pitch: number }).pitch : undefined;
}

function lastGuitarNoteEndInBar(m: MeasureModel | undefined): number | undefined {
  if (!m) return undefined;
  let best = -1;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as { startBeat: number; duration: number };
    best = Math.max(best, n.startBeat + n.duration);
  }
  return best < 0 ? undefined : best;
}

function tagMomentBarsOnParts(parts: PartModel[]): void {
  for (const p of parts) {
    for (const m of p.measures) {
      m.momentTag = momentTagForBar(m.index);
    }
  }
}

/** Bar 4: bass supports peak — two half notes (same shape as overlap thinning; does not touch bass engine module). */
function simplifyBassAtPeakBar(
  context: CompositionContext,
  bassPart: PartModel,
  bassMap: InstrumentRegisterMap,
  bar: number,
  walkLow: number,
  bassCeiling: number
): void {
  const chord = getChordForBar(bar, context);
  const tones = chordTonesForChordSymbol(chord);
  const parsed = parseChordSymbol(chord);
  const root = tones.root;
  const [low, high] = getBassRegisterForBar(bassMap, bar);
  const effectiveHigh = Math.min(high, bassCeiling);
  const rootClamped = clampPitch(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
  const firstHalf =
    parsed.slashBassPc !== undefined
      ? pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh)
      : rootClamped;
  const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
  const m = bassPart.measures.find((x) => x.index === bar);
  if (!m) return;
  m.events = [];
  addEvent(m, createNote(firstHalf, 0, 2));
  addEvent(m, createNote(fifth, 2, 2));
  normalizeMeasureQuarterGrid(m);
}

/** When both parts are in high activity on a non-climax bar, thin bass to two half notes (bar math preserved). */
function resolveOverlapInDuoScore(
  context: CompositionContext,
  guitarPart: PartModel,
  bassPart: PartModel,
  bassMap: InstrumentRegisterMap,
  walkLow: number,
  bassCeiling: number
): void {
  const climax = new Set([4, 8]);
  for (let b = 1; b <= 8; b++) {
    if (climax.has(b)) continue;
    if (activityScoreForBar(guitarPart, b) < HIGH_ACTIVITY || activityScoreForBar(bassPart, b) < HIGH_ACTIVITY) continue;
    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbol(chord);
    const parsed = parseChordSymbol(chord);
    const root = tones.root;
    const [low, high] = getBassRegisterForBar(bassMap, b);
    const effectiveHigh = Math.min(high, bassCeiling);
    const rootClamped = clampPitch(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
    const firstHalf =
      parsed.slashBassPc !== undefined
        ? pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh)
        : rootClamped;
    const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
    const m = bassPart.measures.find((x) => x.index === b);
    if (!m) continue;
    m.events = [];
    addEvent(m, createNote(firstHalf, 0, 2));
    addEvent(m, createNote(fifth, 2, 2));
    normalizeMeasureQuarterGrid(m);
  }
}

function buildBassPart(
  context: CompositionContext,
  _bassPlan: BassBehaviourPlan,
  bassMap: InstrumentRegisterMap,
  motifState: MotifTrackerState,
  guitarPart: PartModel,
  interactionPlan?: InteractionPlan
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;

  const [walkLow, walkHigh] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(walkHigh, 52);
  const seed = context.seed;
  const measures: MeasureModel[] = [];
  let prevBassPitch: number | undefined = walkLow;

  for (let b = 1; b <= 8; b++) {
    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbol(chord);
    const parsed = parseChordSymbol(chord);
    const root = tones.root;
    const m = createMeasure(b, chord, rehearsalForBar(b));
    const [low, high] = getBassRegisterForBar(bassMap, b);
    const effectiveHigh = Math.min(high, bassCeiling);
    const rootClamped = clampPitch(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
    const slashBassPitch =
      parsed.slashBassPc !== undefined
        ? pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh)
        : undefined;
    const guide = clampPitch(pickGuideTone(tones, b, seed), walkLow, effectiveHigh);
    const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
    const third = clampPitch(tones.third, walkLow, effectiveHigh);
    const seventh = clampPitch(tones.seventh, walkLow, effectiveHigh);

    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const simplify = interaction?.coupling?.bassSimplify;
    const phraseIntent = getDuoPhraseIntent(b, seed);
    const stagger = computeEnsembleStagger(b, seed, phraseIntent);
    const placements = getPlacementsForBar(motifState.placements, b);
    let firstStart = stagger.bass;
    if (interaction?.coupling?.bassDeferToGuitar && !simplify && phraseIntent === 'guitar_lead') {
      firstStart = Math.max(firstStart, qBeat(0.5 + seededUnit(seed, b, 188) * 0.35));
    }
    firstStart = qBeat(firstStart + (seededUnit(seed, b, 701) - 0.5) * 0.14);

    if (b > 1) {
      const gPrev = guitarPart.measures.find((x) => x.index === b - 1);
      const gEnd = lastGuitarNoteEndInBar(gPrev);
      if (gEnd !== undefined && gEnd >= 2.5) {
        firstStart = Math.min(firstStart, qBeat(0.25 + seededUnit(seed, b, 702) * 0.75));
      }
    }

    const gAct = activityScoreForBar(guitarPart, b);
    const guitarActivityHot = gAct >= HIGH_ACTIVITY;

    let guitarEchoSource = firstGuitarPitchInBar(guitarPart, b);
    if (placements.length > 0 && placements[0].notes.length > 0 && !simplify) {
      guitarEchoSource = clampPitch(placements[0].notes[0].pitch - 12, walkLow, effectiveHigh);
    }

    let section: BassSectionRole = 'A';
    if (b === 8) section = 'cadence';
    else if (b >= 5) section = 'B';

    if (simplify) {
      if (firstStart > 0) {
        addEvent(m, createRest(0, firstStart));
      }
      const t0 = firstStart;
      const span = 4 - firstStart;
      const half = Math.round((span / 2) * 4) / 4;
      const half2 = span - half;
      const firstNote = slashBassPitch !== undefined ? slashBassPitch : rootClamped;
      addEvent(m, createNote(firstNote, t0, half));
      addEvent(m, createNote(fifth, t0 + half, half2));
    } else {
      emitMelodicBassBar({
        m,
        bar: b,
        seed,
        rootClamped,
        third,
        fifth,
        seventh,
        guide,
        walkLow,
        effectiveHigh,
        firstStart,
        section,
        guitarFirstPitchInBar: guitarEchoSource,
        prevBassPitch,
        guitarActivityHot,
        guideToneBias: b <= 4 ? 1.06 : 1.12,
        slashBassPitch,
      });
      scrubBassFirstAttackIfRoot(m, b, seed, rootClamped, third, guide, fifth, walkLow, effectiveHigh, {
        slashBassPitch,
      });
    }

    const lastBass = [...m.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
    if (lastBass) prevBassPitch = lastBass.pitch;

    measures.push(m);
  }

  return {
    id: 'bass',
    name: GUITAR_BASS_DUO_BASS_PART_NAME,
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'bass',
    measures,
  };
}

export interface GoldenPathPlans {
  sections: import('../section-roles/sectionRoleTypes').SectionWithRole[];
  guitarMap: InstrumentRegisterMap;
  bassMap: InstrumentRegisterMap;
  densityPlan: DensityCurvePlan;
  guitarBehaviour: GuitarBehaviourPlan;
  bassBehaviour: BassBehaviourPlan;
  rhythmConstraints: RhythmicConstraints;
  motifState: MotifTrackerState;
  styleStack?: StyleStack;
  interactionPlan?: InteractionPlan;
  scoreTitle: string;
}

/**
 * Generate golden path duo score. `context` must already include any `applyStyleStack` transforms.
 */
export function generateGoldenPathDuoScore(context: CompositionContext, plans: GoldenPathPlans): ScoreModel {
  const guitarPart = buildGuitarPart(
    context,
    plans.guitarBehaviour,
    plans.guitarMap,
    plans.densityPlan,
    plans.rhythmConstraints,
    plans.motifState,
    plans.interactionPlan
  );
  const bassPart = buildBassPart(
    context,
    plans.bassBehaviour,
    plans.bassMap,
    plans.motifState,
    guitarPart,
    plans.interactionPlan
  );
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;
  const [walkLow] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(profile.preferredWalkingZone[1], 52);
  tagMomentBarsOnParts([guitarPart, bassPart]);
  simplifyBassAtPeakBar(context, bassPart, plans.bassMap, 4, walkLow, bassCeiling);
  resolveOverlapInDuoScore(context, guitarPart, bassPart, plans.bassMap, walkLow, bassCeiling);

  const bpm = 120;
  const rawScore = createScore(plans.scoreTitle, [guitarPart, bassPart], {
    tempo: bpm,
    feelProfile: buildFeelProfileFromTempo(bpm),
  });
  return applyExpressiveDuoFeel(applyPerformancePass(rawScore, { applyArticulation: false }));
}
