/**
 * Guitar phrase authority — intentional contours, guide-tone landings, ensemble stagger (duo golden path).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { chordTonesForChordSymbol, type ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import { resolveDuoHarmonyForSymbol } from '../harmony/duoVaultHarmony';
import { isStandardGuitarBassDuo } from '../presets/guitarBassDuoPresetIds';
import type { ResolvedTuningVoicingContext } from '../song-mode/alternateGuitarTuningVoicingMaps';
import {
  generateSlonimskyPattern,
  inferSlonimskyChordTypeCategory,
  interpolateSlonimskyPattern,
  selectSlonimskyPattern,
  type SlonimskyContext,
} from '../slonimsky/slonimskyEngine';

import type { PhraseIntent } from './phraseIntentTypes';
export type { PhraseIntent } from './phraseIntentTypes';

export function liftToneToRange(pitch: number, low: number, high: number): number {
  let p = pitch;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return clampPitch(p, low, high);
}

/**
 * Phrase ending: chord 3rd/7th (or anchor pitch class when it matches harmony) — V3.0 singable landings.
 */
export function resolvePhraseEndForDuo(
  tones: ReturnType<typeof guitarChordTonesInRange>,
  anchorMidi: number | undefined,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  bar: number
): number {
  const endStrong = seededUnit(seed, bar, 401) < 0.52 ? tones.third : tones.seventh;
  if (anchorMidi === undefined) return endStrong;
  const anchorPc = ((anchorMidi % 12) + 12) % 12;
  const chordPcs = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => ((p % 12) + 12) % 12);
  if (chordPcs.includes(anchorPc) && seededUnit(seed, bar, 406) < 0.4) {
    return liftToneToRange(anchorMidi, effectiveLow, effectiveHigh);
  }
  return endStrong;
}

/** Chord tones placed in the current guitar window (idiomatic register). */
export type GuitarChordTonesInRangeResult = {
  third: number;
  seventh: number;
  fifth: number;
  root: number;
};

export function guitarChordTonesInRange(
  chord: string,
  low: number,
  high: number,
  chordToneOpts?: ChordTonesOptions
): GuitarChordTonesInRangeResult {
  const t = chordTonesForChordSymbol(chord, chordToneOpts);
  return {
    root: liftToneToRange(t.root, low, high),
    third: liftToneToRange(t.third, low, high),
    fifth: liftToneToRange(t.fifth, low, high),
    seventh: liftToneToRange(t.seventh, low, high),
  };
}

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/**
 * Stage 4d.2 — orchestration register-lift snap: nearest harmony PC within ±maxDelta semitones.
 * Standard `guitar_bass_duo` prefers vault melody PCs; falls back to legacy root/3/5/7 when resolver source is fallback.
 */
export function snapGuitarPitchToChordWindow(
  pitch: number,
  chord: string,
  low: number,
  high: number,
  context?: CompositionContext,
  maxDelta = 2,
  chordToneOpts?: ChordTonesOptions
): number {
  const pc = normalizePc(pitch);

  const snapToPcPool = (melodyPcs: readonly number[]): number => {
    const pool = [...new Set(melodyPcs.map(normalizePc))];
    if (pool.includes(pc)) return pitch;
    let best = pitch;
    let bd = 99;
    for (const vpc of pool) {
      for (let m = low; m <= high; m++) {
        if (normalizePc(m) !== vpc) continue;
        const d = Math.abs(m - pitch);
        if (d <= maxDelta && d < bd) {
          bd = d;
          best = m;
        }
      }
    }
    return bd <= maxDelta ? best : pitch;
  };

  if (context && isStandardGuitarBassDuo(context.presetId)) {
    const locked = chordToneOpts?.lockedHarmony ?? true;
    const res = resolveDuoHarmonyForSymbol(chord, { lockedHarmony: locked });
    if (res.source !== 'fallback' && res.melodyPcs.length > 0) {
      return snapToPcPool(res.melodyPcs);
    }
  }

  const pool = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const legacyPcs = new Set(
    [pool.root, pool.third, pool.fifth, pool.seventh].map((p) => normalizePc(Math.round(p)))
  );
  if (legacyPcs.has(pc)) return pitch;
  let best = pitch;
  let bd = 99;
  for (const c of [pool.root, pool.third, pool.fifth, pool.seventh]) {
    const cc = clampPitch(Math.round(c), low, high);
    const d = Math.abs(cc - pitch);
    if (d <= maxDelta && d < bd) {
      bd = d;
      best = cc;
    }
  }
  return bd <= maxDelta ? best : pitch;
}

/** Vault melody PCs as MIDI candidates in [low, high] for leap-repair pools (Stage 4d.3). Returns null → use legacy. */
export function vaultMelodyPitchesInRange(
  chord: string,
  low: number,
  high: number,
  context: CompositionContext,
  chordToneOpts?: ChordTonesOptions
): number[] | null {
  if (!isStandardGuitarBassDuo(context.presetId)) return null;
  const locked = chordToneOpts?.lockedHarmony ?? true;
  const res = resolveDuoHarmonyForSymbol(chord, { lockedHarmony: locked });
  if (res.source === 'fallback' || res.melodyPcs.length === 0) return null;
  const midis: number[] = [];
  for (const vpc of res.melodyPcs) {
    const pc = normalizePc(vpc);
    for (let m = low; m <= high; m++) {
      if (normalizePc(m) === pc) midis.push(m);
    }
  }
  return midis.length > 0 ? [...new Set(midis)].sort((a, b) => a - b) : null;
}

function liftPcToRange(pc: number, refMidi: number, low: number, high: number): number {
  const refPc = normalizePc(refMidi);
  const targetPc = normalizePc(pc);
  let delta = targetPc - refPc;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  return liftToneToRange(refMidi + delta, low, high);
}

/** Stage 3 / 4c — vault phrase-fill tone slots for standard `guitar_bass_duo` (phrase bar + motif phrasetail). */
export function phraseFillTonesFromVaultResolver(
  chord: string,
  low: number,
  high: number,
  chordToneOpts?: ChordTonesOptions
): GuitarChordTonesInRangeResult {
  const locked = chordToneOpts?.lockedHarmony ?? true;
  const res = resolveDuoHarmonyForSymbol(chord, { lockedHarmony: locked });
  const legacy = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  if (res.source === 'fallback') return legacy;

  const pool = res.melodyPcs.length > 0 ? res.melodyPcs : [res.rootPc];
  const nearestPoolPc = (refMidi: number): number => {
    const refPc = normalizePc(refMidi);
    if (pool.some((pc) => normalizePc(pc) === refPc)) return refPc;
    let best = pool[0]!;
    let bd = 99;
    for (const pc of pool) {
      const npc = normalizePc(pc);
      const d = Math.min(Math.abs(npc - refPc), 12 - Math.abs(npc - refPc));
      if (d < bd) {
        bd = d;
        best = npc;
      }
    }
    return normalizePc(best);
  };

  return {
    root: liftPcToRange(res.rootPc, legacy.root, low, high),
    third: liftPcToRange(nearestPoolPc(legacy.third), legacy.third, low, high),
    fifth: liftPcToRange(nearestPoolPc(legacy.fifth), legacy.fifth, low, high),
    seventh: liftPcToRange(nearestPoolPc(legacy.seventh), legacy.seventh, low, high),
  };
}

/**
 * Optional post-pass on `guitarChordTonesInRange` output for alternate-tuning pilot maps.
 * When `context` is null or `context.map` is null, returns `base` unchanged (strict fallback).
 */
export function applyTuningVoicingMapToChordTones(
  base: GuitarChordTonesInRangeResult,
  _chord: string,
  low: number,
  high: number,
  context: ResolvedTuningVoicingContext | null,
  seed: number,
  bar: number,
  salt: number
): GuitarChordTonesInRangeResult {
  if (!context?.map) return base;
  const map = context.map;
  if (map.fifthHeavyCharacter || map.presetId === 'new_standard') {
    const u = seededUnit(seed, bar, salt);
    const fifth =
      u < 0.55 ? liftToneToRange(base.fifth + 12, low, high) : base.fifth;
    return { ...base, fifth };
  }
  return base;
}

/**
 * Bar-level dialogue roles — not 1:1 with section labels; drives stagger and phrase shape.
 * Bar 4: arrival in A; bar 7: B-side “moment”; bar 8: cadence.
 */
export function getDuoPhraseIntent(bar: number, seed: number): PhraseIntent {
  if (bar === 8) return 'cadence';
  if (bar === 4) return 'guitar_lead';
  if (bar === 7) return seededUnit(seed, bar, 301) < 0.55 ? 'guitar_lead' : 'answer_guitar';

  const u = (seed + bar * 31 + bar * bar) % 11;
  if (bar <= 4) {
    if (u < 4) return 'guitar_lead';
    if (u < 7) return 'bass_lead';
    return 'answer_guitar';
  }
  if (u < 3) return 'bass_lead';
  if (u < 7) return 'answer_guitar';
  return 'guitar_lead';
}

/**
 * V3.1 — Duo interaction authority: fixed 8-bar roles (cycle phase 1–8).
 * Phrase A (1–2): guitar lead / bass support; B (3–4): bass lead / guitar reduced;
 * (5–6): shared interlock; (7–8): guitar lead + cadence.
 * phraseNumber 1–4 (32-bar): phrase 2–4 use development / contrast / return on phase 1–2 only.
 */
export function getDuoPhraseIntentV31(phase: number, phraseNumber: number = 1): PhraseIntent {
  const p = ((phase - 1) % 8) + 1;
  if (phraseNumber === 2 && (p === 1 || p === 2)) return 'development';
  if (phraseNumber === 3 && (p === 1 || p === 2)) return 'contrast';
  if (phraseNumber === 4 && (p === 1 || p === 2)) return 'return';
  if (p === 8) return 'cadence';
  if (p === 7) return 'guitar_lead';
  if (p === 5) return 'answer_bass';
  if (p === 6) return 'answer_guitar';
  if (p === 3 || p === 4) return 'bass_lead';
  return 'guitar_lead';
}

/** Ensemble stagger (quarter beats) from phrase intent — favors handoffs over unison downbeats. */
export function computeEnsembleStagger(bar: number, seed: number, intent: PhraseIntent): { guitar: number; bass: number } {
  const j = seededUnit(seed, bar, 201);
  switch (intent) {
    case 'cadence':
      return j < 0.45 ? { guitar: 0, bass: 0.5 } : { guitar: 0.5, bass: 0 };
    case 'guitar_lead':
      return { guitar: qBeat(0.15 + j * 0.2), bass: qBeat(0.55 + j * 0.35) };
    case 'bass_lead':
      return { guitar: qBeat(1 + j * 0.75), bass: qBeat(0.1 + j * 0.15) };
    case 'answer_guitar':
      return { guitar: qBeat(1.27 + j * 0.35), bass: qBeat(0.05 + j * 0.2) };
    case 'answer_bass':
      return { guitar: qBeat(0.28 + j * 0.25), bass: qBeat(1 + j * 0.5) };
    case 'development':
      return { guitar: qBeat(0.18 + j * 0.2), bass: qBeat(0.52 + j * 0.33) };
    case 'contrast':
      return { guitar: qBeat(1.27 + j * 0.35), bass: qBeat(0.05 + j * 0.2) };
    case 'return':
      return { guitar: qBeat(0.12 + j * 0.18), bass: qBeat(0.42 + j * 0.3) };
    default:
      return { guitar: 0, bass: 0.5 };
  }
}

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/** V3.2 — Fixed chorus “signature” bar (listener hook). */
export const DUO_IDENTITY_MOMENT_BAR = 7 as const;

/**
 * V3.2 — Bar 7 identity: clear interval gesture, syncopation or long hold, peak before cadence.
 */
export function emitGuitarDuoIdentityBar7(params: {
  m: MeasureModel;
  chord: string;
  effectiveLow: number;
  effectiveHigh: number;
  staggerG: number;
  seed: number;
  chordToneOpts?: ChordTonesOptions;
}): void {
  const { m, chord, effectiveLow, effectiveHigh, staggerG, seed, chordToneOpts } = params;
  const tones = guitarChordTonesInRange(chord, effectiveLow, effectiveHigh, chordToneOpts);
  const endStrong = resolvePhraseEndForDuo(tones, undefined, effectiveLow, effectiveHigh, seed, DUO_IDENTITY_MOMENT_BAR);
  const u = seededUnit(seed, DUO_IDENTITY_MOMENT_BAR, 702);
  const lo = clampPitch(tones.third, effectiveLow, effectiveHigh);
  const tOff = snapAttackBeatToGrid(qBeat(0.75 + Math.min(0.5, staggerG) + 0.2));

  if (u < 0.34) {
    const leap = clampPitch(lo + (seededUnit(seed, 7, 703) < 0.5 ? 8 : 9), effectiveLow, effectiveHigh);
    addEvent(m, createRest(0, tOff));
    addEvent(m, createNote(lo, tOff, 0.5));
    addEvent(m, createNote(leap, snapAttackBeatToGrid(tOff + 0.5), 1));
    addEvent(m, createNote(endStrong, snapAttackBeatToGrid(tOff + 1.5), qBeat(4 - tOff - 1.5)));
    return;
  }
  if (u < 0.67) {
    const hi = clampPitch(tones.fifth + (seededUnit(seed, 7, 704) < 0.5 ? 0 : 1), effectiveLow, effectiveHigh);
    const leapEnd = clampPitch(hi + (seededUnit(seed, 7, 705) < 0.5 ? 8 : 9), effectiveLow, effectiveHigh);
    addEvent(m, createRest(0, 1));
    addEvent(m, createNote(hi, 1, 2));
    addEvent(m, createRest(3, 0.5));
    addEvent(m, createNote(leapEnd, 3.5, 0.5));
    return;
  }
  const rep = clampPitch(tones.fifth, effectiveLow, effectiveHigh);
  addEvent(m, createRest(0, 1.5));
  addEvent(m, createNote(rep, 1.5, 1.0));
  addEvent(m, createRest(2.5, 0.5));
  addEvent(m, createNote(endStrong, 3, 1));
}

/**
 * Non-motif guitar bar: phrase contour, decisive endings on 3rd/7th, space when answering bass.
 */
export function emitGuitarPhraseBar(params: {
  m: MeasureModel;
  bar: number;
  chord: string;
  effectiveLow: number;
  effectiveHigh: number;
  density: 'sparse' | 'medium' | 'dense';
  useOffbeat: boolean;
  reduceAttack: boolean;
  intent: PhraseIntent;
  staggerG: number;
  seed: number;
  methenyShortenLong?: boolean;
  /** Primary motif anchor — repeated pitch class when harmonically valid (duo V3.0). */
  anchorMidi?: number;
  /** Duo swing: delayed downbeats, short–long cells, stronger syncopation. */
  swingDuo?: boolean;
  chordToneOpts?: ChordTonesOptions;
  /** Lippincott triad pairs: favour third/fifth over scalar runs. */
  triadPairs?: boolean;
  /** Alternate-tuning duo: per-bar Slonimsky interior (1.5–3.5) when pattern resolves; sparse only. */
  slonimskyCtx?: SlonimskyContext;
  /** When `guitar_bass_duo`, phrase-fill uses Tonality Vault resolver (Stage 3). */
  presetId?: string;
}): void {
  const {
    m,
    bar,
    chord,
    effectiveLow,
    effectiveHigh,
    density,
    useOffbeat,
    reduceAttack,
    intent,
    staggerG,
    seed,
    methenyShortenLong,
    anchorMidi,
    swingDuo,
    chordToneOpts,
    triadPairs,
    slonimskyCtx,
    presetId,
  } = params;

  /** Duo: attacks only on eighth-beat grid; durations still use quarter-beat rounding where needed. */
  const pos = swingDuo ? snapAttackBeatToGrid : qBeat;

  const tones =
    presetId !== undefined && isStandardGuitarBassDuo(presetId)
      ? phraseFillTonesFromVaultResolver(chord, effectiveLow, effectiveHigh, chordToneOpts)
      : guitarChordTonesInRange(chord, effectiveLow, effectiveHigh, chordToneOpts);
  const endStrong = resolvePhraseEndForDuo(tones, anchorMidi, effectiveLow, effectiveHigh, seed, bar);
  const uPen = seededUnit(seed, bar, 401);
  const pen = uPen < 0.4 ? tones.fifth : tones.root;
  const lead = seededUnit(seed, bar, 403) < 0.45 ? tones.fifth : tones.third;

  /** V3.1: bass-lead phrase — guitar stabs / rests / fragments (few attacks → keeps V3 line clarity). */
  if (intent === 'bass_lead' && swingDuo) {
    const u = seededUnit(seed, bar, 551);
    if (u < 0.45) {
      addEvent(m, createRest(0, 2.5));
      addEvent(m, createNote(tones.third, 2.5, 1.5));
      return;
    }
    if (u < 0.82) {
      addEvent(m, createRest(0, 1.75));
      addEvent(m, createNote(tones.seventh, 1.75, 0.5));
      addEvent(m, createRest(2.25, 1.75));
      return;
    }
    addEvent(m, createRest(0, 3));
    addEvent(m, createNote(tones.fifth, 3, 1));
    return;
  }

  /** Final bar: stable chord tone, minimal motion (resolution). V3.2 duo: longer breath vs bar 7 peak. */
  if (bar === 8) {
    if (swingDuo) {
      addEvent(m, createRest(0, 2));
      addEvent(m, createNote(endStrong, 2, 2));
      return;
    }
    addEvent(m, createRest(0, 1.5));
    addEvent(m, createNote(endStrong, 1.5, 2.5));
    return;
  }

  let headRest =
    intent === 'answer_guitar' || intent === 'cadence'
      ? pos(0.75 + staggerG * 0.5 + seededUnit(seed, bar, 405) * 0.5)
      : intent === 'answer_bass'
        ? pos(0.2 + staggerG * 0.45 + seededUnit(seed, bar, 410) * 0.4)
        : intent === 'bass_lead'
          ? pos(1.1 + Math.min(staggerG, 0.75) + seededUnit(seed, bar, 407) * 0.35)
          : pos(0.35 + staggerG * 0.6 + (useOffbeat ? 0.35 : 0));

  if (density === 'sparse') {
    headRest = Math.min(headRest, swingDuo ? 2 : 1.75);
  }

  /** Bar 4: reach higher register; bar 7: slight lift for tension line. */
  const regBump = bar === 4 ? 4 : bar === 7 ? 1 : 0;
  const hi = Math.min(effectiveHigh, endStrong + regBump);
  const mid = clampPitch(pen + (bar % 2), effectiveLow, effectiveHigh);
  const lo = clampPitch(lead - (intent === 'guitar_lead' ? 0 : 1), effectiveLow, effectiveHigh);

  const shorten = (d: number) => {
    let x = d;
    if (methenyShortenLong && x > 0.5) x = Math.min(x, 1.25);
    return qBeat(x);
  };

  if (density === 'sparse') {
    if (reduceAttack && intent !== 'answer_guitar') {
      addEvent(m, createRest(0, 2));
      addEvent(m, createNote(endStrong, 2, 2));
      return;
    }
    if (slonimskyCtx && intent !== 'cadence' && slonimskyCtx.allowedOutsideLevel > 0) {
      const barChordCtx: SlonimskyContext = {
        ...slonimskyCtx,
        chordSymbol: chord,
        chordType: inferSlonimskyChordTypeCategory(chord),
        effectiveLow,
        effectiveHigh,
        basePitch: lo,
        maxBeats: 2,
      };
      const pat = selectSlonimskyPattern(barChordCtx, seed + bar * 17);
      if (pat) {
        const raw = generateSlonimskyPattern(pat, barChordCtx, seed + bar * 101);
        const interp = interpolateSlonimskyPattern(raw, barChordCtx, chord, seed + bar * 503);
        if (interp.length > 0) {
          const t0 = headRest;
          const n1 = bar === 4 ? shorten(1) : shorten(1.25);
          const gapAfter = bar === 4 ? 0.25 : 0.5;
          const gapEnd = qBeat(t0 + n1 + gapAfter);
          const lastStart = qBeat(t0 + n1 + gapAfter);
          const innerLo = Math.max(1.5, gapEnd);
          const innerHi = Math.min(3.5, lastStart - 0.25);
          if (innerLo < innerHi - 1e-3) {
            addEvent(m, createRest(0, headRest));
            addEvent(m, createNote(lo, t0, n1));
            let cursor = qBeat(t0 + n1);
            if (innerLo > cursor + 1e-4) {
              addEvent(m, createRest(cursor, innerLo - cursor));
              cursor = innerLo;
            }
            const span = innerHi - innerLo;
            const nIntr = interp.length;
            for (let k = 0; k < nIntr; k++) {
              const slice = span / nIntr;
              const st = innerLo + k * slice;
              const dur = qBeat(Math.min(slice, interp[k]!.durationBeats));
              if (st > cursor + 1e-4) {
                addEvent(m, createRest(cursor, st - cursor));
              }
              addEvent(m, createNote(interp[k]!.midi, pos(st), dur));
              cursor = qBeat(st + dur);
            }
            const tailDur = qBeat(4 - lastStart);
            if (lastStart > cursor + 1e-4) {
              addEvent(m, createRest(cursor, lastStart - cursor));
            }
            addEvent(m, createNote(endStrong, lastStart, tailDur));
            const v2Sparse = tones.third !== endStrong ? tones.third : tones.fifth;
            addEvent(m, createNote(v2Sparse, pos(headRest), qBeat(4 - headRest), 2));
            return;
          }
        }
      }
    }
    addEvent(m, createRest(0, headRest));
    const t0 = headRest;
    if (intent === 'cadence') {
      const a = shorten(1);
      const b0 = shorten(1);
      const tail = 4 - t0 - a - b0;
      if (tail > 0.2) {
        addEvent(m, createNote(lo, t0, a));
        addEvent(m, createNote(mid, pos(t0 + a), b0));
        addEvent(m, createNote(hi, pos(t0 + a + b0), tail));
      } else {
        addEvent(m, createNote(lo, t0, 1.25));
        addEvent(m, createNote(endStrong, pos(t0 + 1.25), 4 - t0 - 1.25));
      }
      return;
    }
    const n1 = bar === 4 ? shorten(1) : shorten(1.25);
    addEvent(m, createNote(lo, t0, n1));
    const gapAfter = bar === 4 ? 0.25 : 0.5;
    addEvent(m, createRest(t0 + n1, gapAfter));
    const lastStart = qBeat(t0 + n1 + gapAfter);
    const tailDur = qBeat(4 - lastStart);
    addEvent(m, createNote(endStrong, lastStart, tailDur));
    const v2Sparse = tones.third !== endStrong ? tones.third : tones.fifth;
    addEvent(m, createNote(v2Sparse, pos(headRest), qBeat(4 - headRest), 2));
    return;
  }

  if (density === 'medium') {
    const dyadBar = bar === 4;
    if (swingDuo && bar % 3 === 1 && intent !== 'answer_guitar') {
      addEvent(m, createRest(0, 0.5));
      addEvent(m, createNote(tones.third, 0.5, 0.5));
      addEvent(m, createNote(tones.fifth, 1, 1));
      addEvent(m, createRest(2, 0.5));
      addEvent(m, createNote(endStrong, 2.5, 1.5));
      return;
    }
    if (dyadBar && intent !== 'answer_guitar') {
      addEvent(m, createRest(0, 0.5));
      addEvent(m, createNote(tones.third, 0.5, 1));
      addEvent(m, createNote(tones.fifth, 1.5, 1));
      addEvent(m, createRest(2.5, 0.5));
      addEvent(m, createNote(endStrong, 3, 1));
      return;
    }
    const g = staggerG;
    if (g > 0) addEvent(m, createRest(0, g));
    const t0 = g;
    const rem = 4 - t0;
    if (rem <= 0.25) {
      addEvent(m, createNote(endStrong, t0, rem));
      return;
    }
    const d1 = qBeat(Math.min(1.5, rem * 0.48));
    const lippincottPitch = triadPairs ? tones.third : lo;
    addEvent(m, createNote(lippincottPitch, t0, d1));
    if (bar === 7 && intent !== 'answer_guitar') {
      const chrom = clampPitch(mid - 1, effectiveLow, effectiveHigh);
      const dCh = qBeat(Math.min(0.75, (rem - d1) * 0.35));
      addEvent(m, createNote(chrom, t0 + d1, dCh));
      const afterChrom = rem - d1 - dCh;
      const r1 = qBeat(Math.min(1, afterChrom * 0.42));
      addEvent(m, createRest(t0 + d1 + dCh, r1));
      const tEnd = qBeat(t0 + d1 + dCh + r1);
      addEvent(m, createNote(endStrong, tEnd, qBeat(4 - tEnd)));
      return;
    }
    const r1 = qBeat(Math.min(1, (rem - d1) * 0.42));
    addEvent(m, createRest(t0 + d1, r1));
    const tEnd = qBeat(t0 + d1 + r1);
    addEvent(m, createNote(endStrong, tEnd, qBeat(4 - tEnd)));
    const v2Med = tones.seventh !== endStrong ? tones.seventh : tones.third;
    addEvent(m, createNote(v2Med, pos(tEnd - 1 < 0 ? 0 : tEnd - 1), 1, 2));
    return;
  }

  /* dense */
  const g = staggerG;
  if (g > 0) addEvent(m, createRest(0, g));
  const t0 = g;
  const rem = 4 - t0;
  if (rem <= 0.25) {
    addEvent(m, createNote(endStrong, t0, rem));
    return;
  }
  const d1 = qBeat(Math.min(1, rem * 0.34));
  const d2 = qBeat(Math.min(1, (rem - d1) * 0.4));
  const lippincottLo = triadPairs ? tones.third : lo;
  const lippincottMid = triadPairs ? tones.fifth : mid;
  addEvent(m, createNote(lippincottLo, t0, d1));
  if (bar === 7) {
    const pass = clampPitch(mid - 1, effectiveLow, effectiveHigh);
    const dPass = qBeat(Math.min(0.5, (rem - d1) * 0.28));
    addEvent(m, createNote(pass, pos(t0 + d1), dPass));
    const d2b = qBeat(Math.min(1, (rem - d1 - dPass) * 0.45));
    addEvent(m, createNote(mid, pos(t0 + d1 + dPass), d2b));
    const r = qBeat(Math.min(0.5, rem - d1 - dPass - d2b));
    addEvent(m, createRest(pos(t0 + d1 + dPass + d2b), r));
    const tLast = pos(t0 + d1 + dPass + d2b + r);
    addEvent(m, createNote(hi, tLast, qBeat(4 - tLast)));
    return;
  }
  addEvent(m, createNote(mid, pos(t0 + d1), d2));
  const r = qBeat(Math.min(0.5, rem - d1 - d2));
  addEvent(m, createRest(pos(t0 + d1 + d2), r));
  const tLast = pos(t0 + d1 + d2 + r);
  addEvent(m, createNote(hi, tLast, qBeat(4 - tLast)));
  const v2Dense = tones.third !== hi ? tones.third : tones.root;
  addEvent(m, createNote(v2Dense, pos(tLast), qBeat(4 - tLast), 2));
  const v2Check = m.events.filter((e) => (e as any).voice === 2);
  if (v2Check.length === 0) console.warn('[wyble] bar has no voice-2 events after emitGuitarPhraseBar');
}
