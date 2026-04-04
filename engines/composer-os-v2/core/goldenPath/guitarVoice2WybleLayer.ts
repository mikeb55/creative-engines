/**
 * Phase 18.2B / 18.2B.3 (FINAL continuity state) / 18.2B.4 / 18.2B.5 — Guitar polyphony inner voice (Wyble-style): contrapuntal line below melody.
 * Export layer untouched; this module only mutates guitar PartModel voice-2 events.
 */

import type { CompositionContext } from '../compositionContext';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import type { MeasureModel, NoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { liftToneToRange, guitarChordTonesInRange } from './guitarPhraseAuthority';

const V2_VOICE = 2;
/** Inner voice register floor (MIDI); kept low for clear gap under melody. */
const INNER_LOW = 48;
/** Never stack more than two simultaneous guitar notes (melody + inner). */
const MAX_GUITAR_SIMULT = 2;
/** Minimum semitones below each overlapping melody pitch (clear gap, still realisable after post-passes). */
const MIN_MELODY_INNER_GAP_SEMITONES = 2;
/** Phase 18.2B.3: two active bars in a 4-bar window (offsets 0–3 from phrase base). */
const PHRASE_PATTERNS_2: number[][] = [
  [0, 2],
  [0, 3],
  [1, 3],
];
/** Three active bars — never three consecutive offsets (excludes [1,2,3]). */
const PHRASE_PATTERNS_3: number[][] = [
  [0, 1, 3],
  [0, 2, 3],
];

/** Barry Harris duo gate: consecutive guitar notes in global time order (matches moduleValidation). */
const BH_GUITAR_MAX_LEAP = 12;
/** Post-phrase-end smoothing: prefer stepwise continuation on Voice 2 only. */
const V2_SOFT_MAX_LEAP = 8;
/** Phase 18.2B.2: consecutive Voice-2–only intervals (inner line). */
const V2_INNER_LINE_SOFT_LEAP = 7;
const V2_INNER_LINE_HARD_LEAP = 12;
const STAB_GUITAR_LOW = 55;
const STAB_GUITAR_HIGH = 79;

/** Phase 18.2B.4: minimum gap between highest bass pitch and Voice 2 (semitones). */
const V2_BASS_REGISTER_MIN_SEMITONES = 8;

/** Phase 18.2B.5: anchor chain — prefer stepwise motion from previous Voice-2 pitch when choosing primary vs secondary. */
const V2_ANCHOR_MAX_STEP_SEMITONES = V2_SOFT_MAX_LEAP;

/** Realised rhythm for one bar (replaces independent per-bar probability draw). */
type Voice2RhythmKind = 'whole' | 'delayed3' | 'halfBack' | 'offbeat1';

/** Coarse schedule from continuation runs (before per-bar behaviour). */
type Voice2SchedulePhase = 'enter' | 'continue' | 'resolve';

/**
 * Phase 18.2B.3 FINAL — phrase-level contrapuntal line (not bar-local weighting).
 * ENTER: phrase entry / after rest; SUSTAIN: hold guide area; MOVE: step toward target; RESOLVE: cadence; REST: inactive.
 */
type Voice2BehaviourPhase = 'enter' | 'sustain' | 'move' | 'resolve' | 'rest';

/** Per-bar run metadata (built before inject). */
type Voice2BarPhaseInfo = { schedulePhase: Voice2SchedulePhase; runEndBar: number; runStartBar: number };

/** Persisted musical state for Voice 2 across bars (generation-time only; not export). */
export type Voice2State = {
  active: boolean;
  currentPitch: number | null;
  targetPitch: number | null;
  remainingDuration: number;
  phase: Voice2BehaviourPhase;
};

function chordOpts(context: CompositionContext): ChordTonesOptions | undefined {
  return context.generationMetadata?.customHarmonyLocked ? { lockedHarmony: true } : undefined;
}

/**
 * Strictly below the ceiling pitch (min overlapping V1 pitch for this time span; may shift down octaves).
 */
function placeStrictlyBelowCeiling(ceilingPitch: number, candidate: number, floorMidi: number): number {
  let p = liftToneToRange(candidate, floorMidi, ceilingPitch - 1);
  while (p >= ceilingPitch) p -= 12;
  return Math.max(floorMidi, p);
}

/** Minimum V1 pitch sounding in [t0, t1); none if no overlap. */
function minOverlappingV1Pitch(v1: NoteEvent[], t0: number, t1: number): number | undefined {
  let m = Infinity;
  for (const n of v1) {
    const n1 = n.startBeat + n.duration;
    if (n.startBeat < t1 - 1e-6 && t0 < n1 - 1e-6) {
      m = Math.min(m, n.pitch);
    }
  }
  return m === Infinity ? undefined : m;
}

export function voice2StrictlyBelowOverlappingV1(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  for (const v2n of v2) {
    const t0 = v2n.startBeat;
    const t1 = t0 + v2n.duration;
    for (const v1n of v1) {
      const u1 = v1n.startBeat + v1n.duration;
      if (v1n.startBeat < t1 - 1e-6 && t0 < u1 - 1e-6) {
        if (v2n.pitch >= v1n.pitch) return false;
      }
    }
  }
  return true;
}

/** Remove any bar that completes three consecutive active bars (breathing: max 2 consecutive). */
function enforceBreathingNoTripleConsecutive(active: Set<number>): void {
  let changed = true;
  while (changed) {
    changed = false;
    const sorted = [...active].sort((a, b) => a - b);
    for (let i = 2; i < sorted.length; i++) {
      const a0 = sorted[i - 2]!;
      const a1 = sorted[i - 1]!;
      const a2 = sorted[i]!;
      if (a0 + 1 === a1 && a1 + 1 === a2) {
        active.delete(a2);
        changed = true;
        break;
      }
    }
  }
}

function countActiveInRange(active: Set<number>, base: number, end: number): number {
  let c = 0;
  for (let b = base; b <= end; b++) {
    if (active.has(b)) c++;
  }
  return c;
}

/** Adding `bar` would create three consecutive active bars. */
function wouldAddCompleteTriple(active: Set<number>, bar: number): boolean {
  return active.has(bar - 1) && active.has(bar - 2);
}

/**
 * Phase 18.2B.3 — phrase-aware activation: each 4-bar window has 2–3 active bars (not 0/1/4);
 * globally never three consecutive active bars (breathing after every pair).
 */
/** Exported for Phase 18.2B.3 regression tests (schedule invariants independent of later strip passes). */
export function collectPhraseAwareActiveBarIndices(totalBars: number, seed: number): number[] {
  const active = new Set<number>();
  let phraseIdx = 0;
  for (let base = 1; base <= totalBars; base += 4) {
    const end = Math.min(base + 3, totalBars);
    const len = end - base + 1;
    phraseIdx += 1;
    if (len < 2) continue;

    if (len === 2) {
      active.add(base);
      active.add(base + 1);
      continue;
    }

    if (len === 3) {
      /** No three consecutive actives in 3 bars → at most 2 active. */
      const u = seededUnit(seed, phraseIdx, 3110);
      if (u < 0.55) {
        active.add(base);
        active.add(base + 2);
      } else {
        active.add(base);
        active.add(base + 1);
      }
      continue;
    }

    const wantThree = seededUnit(seed, phraseIdx, 3111) < 0.52;
    const patList = wantThree ? PHRASE_PATTERNS_3 : PHRASE_PATTERNS_2;
    const pat = patList[(Math.abs(seed) + phraseIdx * 19) % patList.length]!;
    for (const off of pat) {
      if (off < len) active.add(base + off);
    }
  }

  enforceBreathingNoTripleConsecutive(active);

  /** Repair each phrase to 2–3 bars (and never 4). */
  const phraseCount = Math.ceil(totalBars / 4);
  for (let guard = 0; guard < phraseCount * 6; guard++) {
    let changed = false;
    for (let p = 0; p < phraseCount; p++) {
      const base = p * 4 + 1;
      const end = Math.min(base + 3, totalBars);
      let c = countActiveInRange(active, base, end);
      if (c >= 2 && c <= 3) continue;

      if (c > 3) {
        const inPhrase: number[] = [];
        for (let b = base; b <= end; b++) {
          if (active.has(b)) inPhrase.push(b);
        }
        while (inPhrase.length > 3) {
          const drop = inPhrase.pop()!;
          active.delete(drop);
          changed = true;
        }
        continue;
      }

      if (c < 2) {
        const candidates: number[] = [];
        for (let b = base; b <= end; b++) {
          if (!active.has(b)) candidates.push(b);
        }
        candidates.sort((a, b) => a - b);
        for (let i = 0; i < candidates.length; i++) {
          const pick = candidates[(i + Math.abs(seed) + p * 5) % candidates.length]!;
          if (active.has(pick)) continue;
          if (wouldAddCompleteTriple(active, pick)) continue;
          active.add(pick);
          c++;
          changed = true;
          if (c >= 2) break;
        }
        if (c < 2 && candidates.length > 0) {
          for (const pick of candidates) {
            if (active.has(pick)) continue;
            active.add(pick);
            enforceBreathingNoTripleConsecutive(active);
            c = countActiveInRange(active, base, end);
            changed = true;
            if (c >= 2) break;
            active.delete(pick);
          }
        }
      }
    }
    enforceBreathingNoTripleConsecutive(active);
    if (!changed) break;
  }

  if (active.size === 0 && totalBars >= 2) {
    active.add(1);
    active.add(3);
    enforceBreathingNoTripleConsecutive(active);
  }

  return [...active].sort((a, b) => a - b);
}

function v1MelodyContour(notes: NoteEvent[]): 'up' | 'down' | 'flat' {
  if (notes.length < 2) return 'flat';
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const first = sorted[0]!.pitch;
  const last = sorted[sorted.length - 1]!.pitch;
  if (last > first + 1) return 'up';
  if (last < first - 1) return 'down';
  return 'flat';
}

/** Melody notes whose sounding span intersects [t0, t1). */
function countV1NotesOverlappingSpan(v1: NoteEvent[], t0: number, t1: number): number {
  let c = 0;
  for (const n of v1) {
    const u1 = n.startBeat + n.duration;
    if (n.startBeat < t1 - 1e-6 && t0 < u1 - 1e-6) c++;
  }
  return c;
}

/**
 * Phase 18.2B.3: at least one inner-voice note must overlap ≥2 melody notes when the bar has ≥2 melody notes.
 */
function v2PassesMelodyOverlapRule(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  if (v1.length < 2) return true;
  for (const n of v2) {
    const t0 = n.startBeat;
    const t1 = t0 + n.duration;
    if (countV1NotesOverlappingSpan(v1, t0, t1) >= 2) return true;
  }
  return false;
}

/** Max simultaneous pitched notes on guitar (voices 1+2) at any instant. */
function maxSimultaneousGuitarNotes(m: MeasureModel): number {
  const noteSpans = m.events
    .filter((e) => e.kind === 'note' && ((e.voice ?? 1) === 1 || (e.voice ?? 1) === 2))
    .map((e) => ({ t0: e.startBeat, t1: e.startBeat + e.duration }));
  if (noteSpans.length === 0) return 0;
  const times = new Set<number>();
  for (const s of noteSpans) {
    times.add(s.t0);
    times.add(s.t1);
    times.add(s.t0 + (s.t1 - s.t0) * 0.5);
  }
  let maxN = 0;
  for (const t of times) {
    const n = noteSpans.filter((s) => t >= s.t0 && t < s.t1 - 1e-9).length;
    maxN = Math.max(maxN, n);
  }
  return maxN;
}

function rhythmMirrorsVoice1(v1Attacks: Set<number>, v2Attacks: Set<number>): boolean {
  if (v1Attacks.size === 0 || v2Attacks.size === 0) return false;
  if (v1Attacks.size !== v2Attacks.size) return false;
  const a = [...v1Attacks].sort((x, y) => x - y).join(',');
  const b = [...v2Attacks].sort((x, y) => x - y).join(',');
  return a === b;
}

/** Any voice-2 attack within ~1/16 of a melody attack (same-beat coupling). */
function v2SharesAttackWithV1(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  for (const v2n of v2) {
    const s = v2n.startBeat;
    for (const v1n of v1) {
      if (Math.abs(v1n.startBeat - s) < 0.055) return true;
    }
  }
  return false;
}

function melodyAttacksBeatZero(v1: NoteEvent[]): boolean {
  return v1.some((n) => Math.abs(n.startBeat) < 0.02);
}

/** Harsh parallel: same melodic interval in two-note inner line (downrank only, not near-miss). */
function innerContourExactParallel(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  const a = [...v1].sort((x, y) => x.startBeat - y.startBeat);
  const b = [...v2].sort((x, y) => x.startBeat - y.startBeat);
  if (a.length < 2 || b.length < 2) return false;
  const d1 = a[1]!.pitch - a[0]!.pitch;
  const d2 = b[1]!.pitch - b[0]!.pitch;
  if (d1 === 0 || d2 === 0) return false;
  return d1 === d2;
}

/**
 * 3rd/7th (and contour tweak) for one time span.
 * `minOverlappingV1` = min pitch of voice-1 notes overlapping this span.
 * Placement: strictly below min overlapping V1 (per time span).
 */
function pickPrimarySecondaryForSegment(
  minOverlappingV1: number,
  chord: string,
  context: CompositionContext,
  seed: number,
  bar: number,
  segSalt: number,
  _contour: 'up' | 'down' | 'flat'
): { primary: number; secondary: number; innerHigh: number } | null {
  const strictCeiling = minOverlappingV1 - MIN_MELODY_INNER_GAP_SEMITONES + 1;
  if (strictCeiling <= INNER_LOW) return null;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < INNER_LOW) return null;
  const tones = guitarChordTonesInRange(chord, INNER_LOW, innerHigh, chordOpts(context));
  /** Strong 3rd/7th weight; passing-like use is only via failed placement elsewhere. */
  const preferThirdFirst = seededUnit(seed, bar + segSalt, 1821) < 0.94;
  const pThird = placeStrictlyBelowCeiling(strictCeiling, tones.third, INNER_LOW);
  const pSeventh = placeStrictlyBelowCeiling(strictCeiling, tones.seventh, INNER_LOW);
  const primary = preferThirdFirst ? pThird : pSeventh;
  const secondary = preferThirdFirst ? pSeventh : pThird;
  return { primary, secondary, innerHigh };
}

/**
 * Phase 18.2B.3 — CONTINUE: derive pitch from anchor via guide tones + small intervals (not a fresh roll).
 */
function continuePitchFromAnchor(
  anchorMidi: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  fallbackPrimary: number,
  fallbackSecondary: number
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) {
    return pickVoice2PitchFromAnchor(anchorMidi, fallbackPrimary, fallbackSecondary, seed, bar);
  }
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  let best: number | undefined;
  let bd = 999;
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) continue;
    const d = Math.abs(p - anchorMidi);
    if (d <= 6 && d < bd) {
      bd = d;
      best = p;
    }
  }
  if (best !== undefined) return best;
  return pickVoice2PitchFromAnchor(anchorMidi, fallbackPrimary, fallbackSecondary, seed, bar);
}

/** Alternating 3rd ↔ 7th (guide) below ceiling for this bar’s position in the run. */
function computeTargetGuidePitch(
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  offsetInRun: number
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) {
    return placeStrictlyBelowCeiling(strictCeiling, 60, floorMidi);
  }
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const preferThird = offsetInRun % 2 === 0;
  const u = seededUnit(seed, bar, 7204);
  const raw = u < 0.5 ? (preferThird ? tones.third : tones.seventh) : preferThird ? tones.seventh : tones.third;
  return placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
}

/**
 * Map schedule + horizontal anchor to behaviour: SUSTAIN holds guide area; MOVE steps toward target.
 */
function deriveBehaviourPhase(
  schedule: Voice2SchedulePhase,
  anchorMidi: number | null,
  targetPitch: number,
  seed: number,
  bar: number
): Voice2BehaviourPhase {
  if (schedule === 'enter') return 'enter';
  if (schedule === 'resolve') return 'resolve';
  if (anchorMidi === null) return 'sustain';
  const dist = Math.abs(anchorMidi - targetPitch);
  if (dist <= 3) return 'sustain';
  return seededUnit(seed, bar, 7203) < 0.7 ? 'move' : 'sustain';
}

function sustainPitchFromAnchor(
  anchorMidi: number,
  primary: number,
  strictCeiling: number,
  chord: string,
  context: CompositionContext
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) return primary;
  if (anchorMidi >= strictCeiling || anchorMidi < floorMidi) return primary;
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (Math.abs(p - anchorMidi) <= 2) return anchorMidi;
  }
  return primary;
}

function movePitchTowardGuide(
  anchorMidi: number,
  targetPitch: number,
  primary: number,
  secondary: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) {
    return pickVoice2PitchFromAnchor(anchorMidi, primary, secondary, seed, bar);
  }
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  let best: number | undefined;
  let bd = 999;
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) continue;
    const step = Math.abs(p - anchorMidi);
    if (step > V2_INNER_LINE_SOFT_LEAP + 2) continue;
    const score = step * 0.85 + Math.abs(p - targetPitch) * 0.35;
    if (score < bd) {
      bd = score;
      best = p;
    }
  }
  if (best !== undefined) return best;
  return continuePitchFromAnchor(anchorMidi, chord, strictCeiling, context, seed, bar, primary, secondary);
}

function pickVoice2PitchForBehaviour(
  behaviour: Voice2BehaviourPhase,
  anchorMidi: number | null,
  targetPitch: number,
  primary: number,
  secondary: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number
): number {
  if (behaviour === 'enter' || behaviour === 'rest' || anchorMidi === null) {
    return primary;
  }
  if (behaviour === 'resolve') {
    return pickVoice2PitchFromAnchor(anchorMidi, primary, secondary, seed, bar);
  }
  if (behaviour === 'sustain') {
    return sustainPitchFromAnchor(anchorMidi, primary, strictCeiling, chord, context);
  }
  if (behaviour === 'move') {
    return movePitchTowardGuide(anchorMidi, targetPitch, primary, secondary, chord, strictCeiling, context, seed, bar);
  }
  return continuePitchFromAnchor(anchorMidi, chord, strictCeiling, context, seed, bar, primary, secondary);
}

/**
 * Phase 18.2B.5 — Choose primary vs secondary to stay near previous Voice-2 pitch (horizontal continuity).
 */
function strictCeilingFromMinV1(minV: number): number {
  return minV - MIN_MELODY_INNER_GAP_SEMITONES + 1;
}

function pickVoice2PitchFromAnchor(
  anchorMidi: number | null,
  primary: number,
  secondary: number,
  seed: number,
  bar: number
): number {
  if (anchorMidi === null) return primary;
  const candidates = [primary, secondary];
  let best: number | undefined;
  let bd = 999;
  for (const c of candidates) {
    const d = Math.abs(c - anchorMidi);
    if (d <= V2_ANCHOR_MAX_STEP_SEMITONES && d < bd) {
      bd = d;
      best = c;
    }
  }
  if (best !== undefined) return best;
  return seededUnit(seed, bar, 5501) < 0.5 ? primary : secondary;
}

/**
 * Phase 18.2B.3 — Expand scheduled bars into 2–4 bar continuation runs; cap total presence ~60% for sparsity.
 */
function buildVoice2ContinuationSchedule(
  tb: number,
  seed: number,
  scheduled: Set<number>
): { effective: Set<number>; phaseByBar: Map<number, Voice2BarPhaseInfo> } {
  const effective = new Set<number>();
  const phaseByBar = new Map<number, Voice2BarPhaseInfo>();
  const targetMax = Math.max(2, Math.floor(tb * 0.6));
  let runEnd = -1;
  let runStart = -1;
  for (let bar = 1; bar <= tb; bar++) {
    if (bar <= runEnd) {
      effective.add(bar);
      phaseByBar.set(bar, {
        schedulePhase: bar === runEnd ? 'resolve' : 'continue',
        runEndBar: runEnd,
        runStartBar: runStart,
      });
      continue;
    }
    runEnd = -1;
    runStart = -1;
    if (!scheduled.has(bar)) continue;
    if (effective.size >= targetMax) continue;
    let runLen = 2 + Math.floor(seededUnit(seed, bar, 7001) * 3);
    const room = targetMax - effective.size;
    runLen = Math.max(2, Math.min(runLen, room));
    if (runLen < 2) continue;
    runStart = bar;
    runEnd = Math.min(bar + runLen - 1, tb);
    effective.add(bar);
    phaseByBar.set(bar, { schedulePhase: 'enter', runEndBar: runEnd, runStartBar: runStart });
  }
  return { effective, phaseByBar };
}

/**
 * Phase 18.2B.5 + 18.2B.3 — Rhythm: ENTER elongated; CONTINUE sustained; RESOLVE shorter release.
 */
function planVoice2BarRhythms(
  guitar: PartModel,
  effectiveBars: Set<number>,
  seed: number,
  tb: number,
  phaseByBar: Map<number, Voice2BarPhaseInfo>
): Map<number, Voice2RhythmKind> {
  const out = new Map<number, Voice2RhythmKind>();
  for (let bar = 1; bar <= tb; bar++) {
    if (!effectiveBars.has(bar)) continue;
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) continue;

    const info = phaseByBar.get(bar);
    const schedulePhase = info?.schedulePhase ?? 'continue';
    const prevInLine = bar > 1 && effectiveBars.has(bar - 1);
    const nextInLine = bar < tb && effectiveBars.has(bar + 1);
    const phraseEnd = bar % 4 === 0;
    const beat0 = melodyAttacksBeatZero(v1);

    if (schedulePhase === 'resolve') {
      out.set(bar, seededUnit(seed, bar, 1825) < 0.55 ? 'halfBack' : 'delayed3');
      continue;
    }

    if (schedulePhase === 'enter') {
      const u2 = seededUnit(seed, bar, 1824);
      if (u2 < 0.9) {
        out.set(bar, beat0 ? 'delayed3' : 'whole');
      } else if (u2 < 0.97) {
        out.set(bar, 'whole');
      } else {
        out.set(bar, 'halfBack');
      }
      continue;
    }

    /** CONTINUE */
    const u = seededUnit(seed, bar, 1823);
    if (phraseEnd && !nextInLine) {
      out.set(bar, u < 0.82 ? 'whole' : 'halfBack');
    } else if (prevInLine) {
      if (u < 0.92) {
        out.set(bar, 'whole');
      } else {
        out.set(bar, 'halfBack');
      }
    } else if (beat0 && u < 0.65) {
      out.set(bar, 'delayed3');
    } else if (u < 0.06) {
      out.set(bar, 'offbeat1');
    } else if (u < 0.22) {
      out.set(bar, 'halfBack');
    } else {
      out.set(bar, 'whole');
    }
  }
  return out;
}

/** Last Voice-2 pitch in bar by end time (next window anchor). */
function lastVoice2PitchInMeasure(m: MeasureModel): number | undefined {
  const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
  if (v2.length === 0) return undefined;
  let best = v2[0]!;
  let end = best.startBeat + best.duration;
  for (const n of v2) {
    const e = n.startBeat + n.duration;
    if (e > end + 1e-6) {
      best = n;
      end = e;
    }
  }
  return best.pitch;
}

/**
 * Phase 18.2B: inject sparse inner voice — contrary/oblique preference, 3rd/7th priority,
 * rhythmic independence, max 2 simultaneous guitar notes.
 * @returns number of measures that received voice-2 content
 */
export function injectGuitarVoice2WybleLayer(guitar: PartModel, context: CompositionContext): number {
  if (context.presetId !== 'guitar_bass_duo') {
    return 0;
  }
  const seed = context.seed;
  const tb = context.form.totalBars;
  if (tb < 1) return 0;

  const activeBars = collectPhraseAwareActiveBarIndices(tb, seed);
  const activeSet = new Set(activeBars);
  const { effective: effectiveBars, phaseByBar } = buildVoice2ContinuationSchedule(tb, seed, activeSet);
  const barRhythms = planVoice2BarRhythms(guitar, effectiveBars, seed, tb, phaseByBar);
  let anchorMidi: number | null = null;
  let injected = 0;
  let voice2State: Voice2State = {
    active: false,
    currentPitch: null,
    targetPitch: null,
    remainingDuration: 0,
    phase: 'rest',
  };

  for (const bar of [...effectiveBars].sort((a, b) => a - b)) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;

    m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);

    const chord = m.chord ?? 'Cmaj9';
    const v1notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1notes.length === 0) continue;

    const contour = v1MelodyContour(v1notes);
    const runInfo = phaseByBar.get(bar);
    if (!runInfo) continue;
    const cFull = minOverlappingV1Pitch(v1notes, 0, 4);
    if (cFull === undefined) continue;
    const targetPitch = computeTargetGuidePitch(chord, strictCeilingFromMinV1(cFull), context, seed, bar, bar - runInfo.runStartBar);
    const behaviour = deriveBehaviourPhase(runInfo.schedulePhase, anchorMidi, targetPitch, seed, bar);
    voice2State = {
      active: true,
      currentPitch: anchorMidi,
      targetPitch,
      remainingDuration: Math.max(0, runInfo.runEndBar - bar),
      phase: behaviour,
    };

    const cHalfBack = minOverlappingV1Pitch(v1notes, 2, 4);
    const rhythm = barRhythms.get(bar) ?? 'whole';

    /**
     * Phase 18.2B.5: rhythm from phrase plan (continuity → whole; entry → delayed / half / off-beat).
     * Pitch from anchor chain (primary/secondary) for horizontal line.
     */
    if (rhythm === 'whole') {
      if (cFull === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 1, contour);
      if (!pair) continue;
      if (!melodyAttacksBeatZero(v1notes)) {
        const p = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          targetPitch,
          pair.primary,
          pair.secondary,
          chord,
          strictCeilingFromMinV1(cFull),
          context,
          seed,
          bar
        );
        addEvent(m, createNote(p, 0, 4, V2_VOICE));
      } else {
        const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
        const pairLate = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 41, contour);
        if (!pairLate) continue;
        const pL = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          targetPitch,
          pairLate.primary,
          pairLate.secondary,
          chord,
          strictCeilingFromMinV1(cLate),
          context,
          seed,
          bar
        );
        addEvent(m, createRest(0, 1, V2_VOICE));
        addEvent(m, createNote(pL, 1, 3, V2_VOICE));
      }
    } else if (rhythm === 'delayed3') {
      if (cFull === undefined) continue;
      const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
      const pairLate = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 41, contour);
      if (!pairLate) continue;
      const pL = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
        pairLate.primary,
        pairLate.secondary,
        chord,
        strictCeilingFromMinV1(cLate),
        context,
        seed,
        bar
      );
      addEvent(m, createRest(0, 1, V2_VOICE));
      addEvent(m, createNote(pL, 1, 3, V2_VOICE));
    } else if (rhythm === 'halfBack') {
      if (cHalfBack === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cHalfBack, chord, context, seed, bar, 0, contour);
      if (!pair) continue;
      const p = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
        pair.primary,
        pair.secondary,
        chord,
        strictCeilingFromMinV1(cHalfBack),
        context,
        seed,
        bar
      );
      addEvent(m, createRest(0, 2, V2_VOICE));
      addEvent(m, createNote(p, 2, 2, V2_VOICE));
    } else {
      if (cFull === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 3, contour);
      if (!pair) continue;
      const p = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
        pair.primary,
        pair.secondary,
        chord,
        strictCeilingFromMinV1(cFull),
        context,
        seed,
        bar
      );
      addEvent(m, createRest(0, 3, V2_VOICE));
      addEvent(m, createNote(p, 3, 1, V2_VOICE));
    }

    m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);

    const repairAttackOffset = (): boolean => {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      const tryLateSustain = (): boolean => {
        const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
        if (cLate === undefined) return false;
        const pairL = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 10, contour);
        if (!pairL) return false;
        const pLv = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          targetPitch,
          pairL.primary,
          pairL.secondary,
          chord,
          strictCeilingFromMinV1(cLate),
          context,
          seed,
          bar
        );
        addEvent(m, createRest(0, 1, V2_VOICE));
        addEvent(m, createNote(pLv, 1, 3, V2_VOICE));
        m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
        const v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
        return (
          Math.abs(v2r.reduce((s, n) => s + n.duration, 0) - 4) < 0.001 &&
          voice2StrictlyBelowOverlappingV1(v1notes, v2r) &&
          !v2SharesAttackWithV1(v1notes, v2r)
        );
      };
      if (tryLateSustain()) return true;
      if (cHalfBack === undefined) return false;
      const pairH = pickPrimarySecondaryForSegment(cHalfBack, chord, context, seed, bar, 12, contour);
      if (!pairH) return false;
      const pH = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
        pairH.primary,
        pairH.secondary,
        chord,
        strictCeilingFromMinV1(cHalfBack),
        context,
        seed,
        bar
      );
      addEvent(m, createRest(0, 2, V2_VOICE));
      addEvent(m, createNote(pH, 2, 2, V2_VOICE));
      m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
      let v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
      if (v2SharesAttackWithV1(v1notes, v2r)) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        if (cFull === undefined) return false;
        const pairQ = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 13, contour);
        if (!pairQ) return false;
        const pQ = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          targetPitch,
          pairQ.primary,
          pairQ.secondary,
          chord,
          strictCeilingFromMinV1(cFull),
          context,
          seed,
          bar
        );
        addEvent(m, createRest(0, 3, V2_VOICE));
        addEvent(m, createNote(pQ, 3, 1, V2_VOICE));
        m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
        v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
      }
      return (
        Math.abs(v2r.reduce((s, n) => s + n.duration, 0) - 4) < 0.001 &&
        voice2StrictlyBelowOverlappingV1(v1notes, v2r) &&
        !v2SharesAttackWithV1(v1notes, v2r)
      );
    };

    let v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
    const v2sum = v2notes.reduce((s, n) => s + n.duration, 0);
    if (Math.abs(v2sum - 4) > 0.001) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    if (!voice2StrictlyBelowOverlappingV1(v1notes, v2notes)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    if (v2SharesAttackWithV1(v1notes, v2notes)) {
      if (!repairAttackOffset()) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        continue;
      }
      v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
    }

    if (v2notes.length >= 2 && innerContourExactParallel(v1notes, v2notes)) {
      const cPar = minOverlappingV1Pitch(v1notes, 0, 4) ?? cFull;
      if (cPar !== undefined) {
        const pairP = pickPrimarySecondaryForSegment(cPar, chord, context, seed, bar, 55, contour);
        if (pairP) {
          const byTime = [...v2notes].sort((a, b) => a.startBeat - b.startBeat);
          const target = byTime[1]!;
          for (let ei = 0; ei < m.events.length; ei++) {
            const e = m.events[ei]!;
            if (e.kind !== 'note' || (e.voice ?? 1) !== V2_VOICE) continue;
            const n = e as NoteEvent;
            if (Math.abs(n.startBeat - target.startBeat) < 1e-6 && Math.abs(n.duration - target.duration) < 1e-6) {
              m.events[ei] = { ...n, pitch: pairP.secondary };
              break;
            }
          }
          v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
        }
      }
      if (v2notes.length >= 2 && innerContourExactParallel(v1notes, v2notes)) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        continue;
      }
    }

    const v1Attacks = new Set(
      v1notes.map((n) => Math.round(n.startBeat * 4) / 4)
    );
    const v2Attacks = new Set(
      m.events
        .filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE)
        .map((e) => Math.round((e as NoteEvent).startBeat * 4) / 4)
    );
    if (rhythmMirrorsVoice1(v1Attacks, v2Attacks)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      let mirrorResolved = false;

      const tryWhole = (): boolean => {
        if (cFull === undefined) return false;
        const pairW = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 97, contour);
        if (!pairW) return false;
        const pW = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          targetPitch,
          pairW.primary,
          pairW.secondary,
          chord,
          strictCeilingFromMinV1(cFull),
          context,
          seed,
          bar
        );
        addEvent(m, createNote(pW, 0, 4, V2_VOICE));
        m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
        const v2w = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
        const aW = new Set(v2w.map((e) => Math.round(e.startBeat * 4) / 4));
        const ok =
          !rhythmMirrorsVoice1(v1Attacks, aW) &&
          maxSimultaneousGuitarNotes(m) <= MAX_GUITAR_SIMULT &&
          voice2StrictlyBelowOverlappingV1(v1notes, v2w);
        if (!ok) {
          m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        }
        return ok;
      };
      const tryDelayedSustain = (): boolean => {
        const cL = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
        if (cL === undefined) return false;
        const pairL = pickPrimarySecondaryForSegment(cL, chord, context, seed, bar, 98, contour);
        if (!pairL) return false;
        const pLd = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          targetPitch,
          pairL.primary,
          pairL.secondary,
          chord,
          strictCeilingFromMinV1(cL),
          context,
          seed,
          bar
        );
        addEvent(m, createRest(0, 1, V2_VOICE));
        addEvent(m, createNote(pLd, 1, 3, V2_VOICE));
        m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
        const v2d = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
        const aD = new Set(v2d.map((e) => Math.round(e.startBeat * 4) / 4));
        const ok =
          !rhythmMirrorsVoice1(v1Attacks, aD) &&
          maxSimultaneousGuitarNotes(m) <= MAX_GUITAR_SIMULT &&
          voice2StrictlyBelowOverlappingV1(v1notes, v2d);
        if (!ok) {
          m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        }
        return ok;
      };

      if (tryWhole()) {
        mirrorResolved = true;
      } else {
        if (tryDelayedSustain()) {
          mirrorResolved = true;
        } else {
          m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
          const cFb = minOverlappingV1Pitch(v1notes, 2, 4);
          if (cFb === undefined) {
            continue;
          }
          const pairFb = pickPrimarySecondaryForSegment(cFb, chord, context, seed, bar, 99, contour);
          if (!pairFb) continue;
          const pFb = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
            pairFb.primary,
            pairFb.secondary,
            chord,
            strictCeilingFromMinV1(cFb),
            context,
            seed,
            bar
          );
          addEvent(m, createRest(0, 2, V2_VOICE));
          addEvent(m, createNote(pFb, 2, 2, V2_VOICE));
          m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
          const v2After = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
          const v2a = new Set(v2After.map((e) => Math.round(e.startBeat * 4) / 4));
          if (
            rhythmMirrorsVoice1(v1Attacks, v2a) ||
            maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT ||
            !voice2StrictlyBelowOverlappingV1(v1notes, v2After)
          ) {
            m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
            continue;
          }
          mirrorResolved = true;
        }
      }

      if (!mirrorResolved) {
        continue;
      }
    }

    v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
    if (v1notes.length >= 2 && !v2PassesMelodyOverlapRule(v1notes, v2notes)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      let overlapOk = false;
      if (cFull !== undefined) {
        const pairOv = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 88, contour);
        if (pairOv) {
          if (!melodyAttacksBeatZero(v1notes)) {
            const pOv = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
              pairOv.primary,
              pairOv.secondary,
              chord,
              strictCeilingFromMinV1(cFull),
              context,
              seed,
              bar
            );
            addEvent(m, createNote(pOv, 0, 4, V2_VOICE));
          } else {
            const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
            const pairL = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 89, contour);
            if (pairL) {
              const pLo = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
                pairL.primary,
                pairL.secondary,
                chord,
                strictCeilingFromMinV1(cLate),
                context,
                seed,
                bar
              );
              addEvent(m, createRest(0, 1, V2_VOICE));
              addEvent(m, createNote(pLo, 1, 3, V2_VOICE));
            } else {
              const pairL2 = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 90, contour);
              if (pairL2) {
                const pL2 = pickVoice2PitchForBehaviour(
      behaviour,
      anchorMidi,
      targetPitch,
                  pairL2.primary,
                  pairL2.secondary,
                  chord,
                  strictCeilingFromMinV1(cFull),
                  context,
                  seed,
                  bar
                );
                addEvent(m, createRest(0, 2, V2_VOICE));
                addEvent(m, createNote(pL2, 2, 2, V2_VOICE));
              }
            }
          }
          m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
          const v2o = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
          const sumo = v2o.reduce((s, n) => s + n.duration, 0);
          overlapOk =
            Math.abs(sumo - 4) < 0.001 &&
            voice2StrictlyBelowOverlappingV1(v1notes, v2o) &&
            !v2SharesAttackWithV1(v1notes, v2o) &&
            v2PassesMelodyOverlapRule(v1notes, v2o);
          if (!overlapOk) {
            m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
          } else {
            v2notes = v2o;
          }
        }
      }
      if (!overlapOk) {
        continue;
      }
    }

    if (maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    const lastP = lastVoice2PitchInMeasure(m);
    if (lastP !== undefined) {
      anchorMidi = lastP;
      voice2State = { ...voice2State, currentPitch: lastP };
    }

    injected++;
  }

  return injected;
}

/**
 * Phase 18.2B.1 — Stabilise Voice 2 for duo validators (phrase ends, Barry Harris max jump) without thinning the layer.
 * Runs after {@link injectGuitarVoice2WybleLayer}; export unchanged.
 */
function chordToneMidiPool(chord: string, low: number, high: number, context: CompositionContext): number[] {
  const tones = guitarChordTonesInRange(chord, low, high, chordOpts(context));
  return [tones.root, tones.third, tones.fifth, tones.seventh];
}

/** 3rd → 7th → 5th → root for post-selection smoothing (18.2B.2). */
function chordToneMidiPoolGuideFirst(chord: string, low: number, high: number, context: CompositionContext): number[] {
  const tones = guitarChordTonesInRange(chord, low, high, chordOpts(context));
  return [tones.third, tones.seventh, tones.fifth, tones.root];
}

function resolveLeapTowardPrev(
  pPrev: number,
  pWant: number,
  chord: string,
  low: number,
  high: number,
  maxLeap: number,
  context: CompositionContext,
  /** Prefer guide tones when multiple chord tones tie at similar distance. */
  poolGuideFirst = false
): number {
  if (Math.abs(pWant - pPrev) <= maxLeap) return pWant;
  const pool = poolGuideFirst ? chordToneMidiPoolGuideFirst(chord, low, high, context) : chordToneMidiPool(chord, low, high, context);
  let best: number | undefined;
  let bd = 999;
  for (let pi = 0; pi < pool.length; pi++) {
    const c = pool[pi]!;
    const cc = clampPitch(c, low, high);
    if (Math.abs(cc - pPrev) <= maxLeap) {
      const d = Math.abs(cc - pWant);
      const tieBreak = poolGuideFirst ? pi * 0.03 : 0;
      if (d + tieBreak < bd) {
        bd = d + tieBreak;
        best = cc;
      }
    }
  }
  if (best !== undefined) return best;
  const delta = pWant - pPrev;
  const step = Math.sign(delta) * Math.min(Math.abs(delta), maxLeap);
  return clampPitch(pPrev + step, low, high);
}

function clampVoice2PitchBelowOverlappingV1(m: MeasureModel, n: NoteEvent, pitch: number): number {
  const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  const t0 = n.startBeat;
  const t1 = t0 + n.duration;
  const minV1 = minOverlappingV1Pitch(v1, t0, t1);
  if (minV1 === undefined) return clampPitch(pitch, STAB_GUITAR_LOW, STAB_GUITAR_HIGH);
  const strictCeiling = minV1 - MIN_MELODY_INNER_GAP_SEMITONES + 1;
  if (strictCeiling <= INNER_LOW) return clampPitch(pitch, STAB_GUITAR_LOW, STAB_GUITAR_HIGH);
  return placeStrictlyBelowCeiling(strictCeiling, pitch, INNER_LOW);
}

/** Voice-2 note with latest end time in the bar (phrase “release” for inner line). */
function voice2LastNoteRefByEndTime(m: MeasureModel): { ei: number; n: NoteEvent } | undefined {
  const hits = m.events
    .map((e, ei) => ({ e, ei }))
    .filter((x) => x.e.kind === 'note' && (x.e.voice ?? 1) === V2_VOICE) as { e: NoteEvent; ei: number }[];
  if (hits.length === 0) return undefined;
  let best = hits[0]!;
  let bestEnd = best.e.startBeat + best.e.duration;
  for (const h of hits) {
    const end = h.e.startBeat + h.e.duration;
    if (end > bestEnd + 1e-6) {
      best = h;
      bestEnd = end;
    }
  }
  return { ei: best.ei, n: best.e };
}

/**
 * Phase 18.2B.4 — Phrase-end resolution (4-bar boundaries only): strict chord-tone priority.
 * 3rd → 7th → root → 5th → optional tensions (9, b9, #11, 13) when seed allows.
 */
function strongPhraseEndTargetPitch(
  chord: string,
  strictCeiling: number,
  floorMidi: number,
  innerHigh: number,
  _preferNear: number,
  context: CompositionContext,
  bar: number
): number | null {
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const tRaw = chordTonesForChordSymbol(chord, chordOpts(context));
  const r = tRaw.root;
  const tensionGate = seededUnit(context.seed, bar, 4204) < 0.35;
  const orderedRaw: number[] = [
    tones.third,
    tones.seventh,
    tones.root,
    tones.fifth,
  ];
  if (tensionGate) {
    orderedRaw.push(
      r + 14,
      r + 13,
      r + 6,
      r + 21
    );
  }
  for (const raw of orderedRaw) {
    const lifted = liftToneToRange(raw, floorMidi, innerHigh);
    const p = placeStrictlyBelowCeiling(strictCeiling, lifted, floorMidi);
    if (p < strictCeiling && p >= floorMidi) return p;
  }
  return null;
}

/** Bars 4, 8, 12, … (1-based index). */
function isPhraseBoundaryBar(barIndex: number): boolean {
  return barIndex % 4 === 0;
}

function applyPhraseEndHardOverrideForMeasure(m: MeasureModel, chord: string, context: CompositionContext): void {
  if (!isPhraseBoundaryBar(m.index)) return;
  const ref = voice2LastNoteRefByEndTime(m);
  if (!ref) return;
  const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  const t0 = ref.n.startBeat;
  const t1 = t0 + ref.n.duration;
  const minV1 = minOverlappingV1Pitch(v1, t0, t1);
  if (minV1 === undefined) return;
  const strictCeiling = minV1 - MIN_MELODY_INNER_GAP_SEMITONES + 1;
  if (strictCeiling <= INNER_LOW) return;
  const innerHigh = Math.min(63, strictCeiling - 1);
  const target = strongPhraseEndTargetPitch(chord, strictCeiling, INNER_LOW, innerHigh, ref.n.pitch, context, m.index);
  if (target === null) return;
  const p = placeStrictlyBelowCeiling(strictCeiling, target, INNER_LOW);
  if (Math.abs(p - ref.n.pitch) < 0.01) return;
  m.events[ref.ei] = { ...ref.n, pitch: p };
}

function maxBassPitchInMeasure(m: MeasureModel): number {
  const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
  if (notes.length === 0) return -1;
  return Math.max(...notes.map((n) => n.pitch));
}

/** Prefer guide tones, then root/fifth, strictly below melody ceiling and at/above bass floor. */
function pickChordToneVoice2AboveBassFloor(
  chord: string,
  floorMin: number,
  strictCeiling: number,
  context: CompositionContext
): number | null {
  const low = Math.max(INNER_LOW, floorMin);
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (low >= innerHigh) return null;
  const tones = guitarChordTonesInRange(chord, low, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  let best: number | undefined;
  let bd = 999;
  for (const c of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, c, low);
    if (p >= floorMin && p < strictCeiling) {
      const d = Math.abs(p - floorMin);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  }
  return best ?? null;
}

/**
 * Phase 18.2B.4 — After bass exists: every Voice-2 pitch must stay at least {@link V2_BASS_REGISTER_MIN_SEMITONES}
 * above the highest bass pitch in that bar (reselect chord tone, then octave shift).
 */
export function enforceVoice2BassRegisterSeparation18_2B_4(guitar: PartModel, bass: PartModel, context: CompositionContext): void {
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  for (const m of guitar.measures) {
    const bm = bass.measures.find((x) => x.index === m.index);
    if (!bm) continue;
    const bassMax = maxBassPitchInMeasure(bm);
    if (bassMax < 0) continue;
    const floorMin = bassMax + V2_BASS_REGISTER_MIN_SEMITONES;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    const chord = m.chord ?? 'Cmaj9';
    for (let ei = 0; ei < m.events.length; ei++) {
      const e = m.events[ei]!;
      if (e.kind !== 'note' || (e.voice ?? 1) !== V2_VOICE) continue;
      const n = e as NoteEvent;
      if (n.pitch >= floorMin) continue;
      const t0 = n.startBeat;
      const t1 = t0 + n.duration;
      const minV1 = minOverlappingV1Pitch(v1, t0, t1);
      if (minV1 === undefined) continue;
      const strictCeiling = minV1 - MIN_MELODY_INNER_GAP_SEMITONES + 1;
      if (strictCeiling <= floorMin + 1) continue;
      let candidate = n.pitch;
      while (candidate < floorMin && candidate + 12 < strictCeiling) candidate += 12;
      if (candidate < floorMin) {
        const alt = pickChordToneVoice2AboveBassFloor(chord, floorMin, strictCeiling, context);
        if (alt !== null) candidate = alt;
      }
      if (candidate < floorMin) candidate = Math.min(strictCeiling - 1, floorMin);
      const low = Math.max(INNER_LOW, floorMin);
      let placed = placeStrictlyBelowCeiling(strictCeiling, candidate, low);
      if (placed < floorMin) placed = clampPitch(floorMin, low, strictCeiling - 1);
      if (placed < floorMin || placed >= strictCeiling) continue;
      const v2all = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
      const trialV2 = v2all.map((x) =>
        x.startBeat === n.startBeat && Math.abs(x.duration - n.duration) < 1e-6 ? { ...x, pitch: placed } : x
      );
      if (!voice2StrictlyBelowOverlappingV1(v1, trialV2)) continue;
      m.events[ei] = { ...n, pitch: placed };
    }
  }
}

function collectGuitarNotesGlobalTimeOrder(guitar: PartModel): Array<{ bar: number; ei: number }> {
  const out: Array<{ bar: number; ei: number }> = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const sorted = [...m.events]
      .map((e, ei) => ({ e, ei }))
      .filter((x) => x.e.kind === 'note')
      .sort((a, b) => (a.e as NoteEvent).startBeat - (b.e as NoteEvent).startBeat);
    for (const { ei } of sorted) out.push({ bar: m.index, ei });
  }
  return out;
}

/** When a Voice-2 note participates in an excessive global leap, adjust **only** Voice 2 (never delete). */
function enforceVoice2LeapCap(guitar: PartModel, context: CompositionContext, maxLeap: number): void {
  const refs = collectGuitarNotesGlobalTimeOrder(guitar);
  for (let i = 1; i < refs.length; i++) {
    const m1 = guitar.measures.find((x) => x.index === refs[i - 1]!.bar);
    const m2 = guitar.measures.find((x) => x.index === refs[i]!.bar);
    if (!m1 || !m2) continue;
    const e1 = m1.events[refs[i - 1]!.ei];
    const e2 = m2.events[refs[i]!.ei];
    if (!e1 || e1.kind !== 'note' || !e2 || e2.kind !== 'note') continue;
    const n1 = e1 as NoteEvent;
    const n2 = e2 as NoteEvent;
    const p1 = n1.pitch;
    const p2 = n2.pitch;
    if (Math.abs(p2 - p1) <= maxLeap) continue;
    if ((n1.voice ?? 1) !== V2_VOICE && (n2.voice ?? 1) !== V2_VOICE) continue;
    const chord = m2.chord ?? 'Cmaj9';
    if ((n2.voice ?? 1) === V2_VOICE) {
      const np = resolveLeapTowardPrev(p1, p2, chord, STAB_GUITAR_LOW, STAB_GUITAR_HIGH, maxLeap, context);
      m2.events[refs[i]!.ei] = { ...n2, pitch: np };
    } else {
      const np = resolveLeapTowardPrev(p2, p1, chord, STAB_GUITAR_LOW, STAB_GUITAR_HIGH, maxLeap, context);
      m1.events[refs[i - 1]!.ei] = { ...n1, pitch: np };
    }
  }
}

/** All Voice-2 notes in **global chronological order** (inner line continuity). */
function collectVoice2NoteRefsGlobalOrder(guitar: PartModel): Array<{ bar: number; ei: number }> {
  const out: Array<{ bar: number; ei: number }> = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const sorted = [...m.events]
      .map((e, ei) => ({ e, ei }))
      .filter((x) => x.e.kind === 'note' && (x.e.voice ?? 1) === V2_VOICE)
      .sort((a, b) => (a.e as NoteEvent).startBeat - (b.e as NoteEvent).startBeat);
    for (const { ei } of sorted) out.push({ bar: m.index, ei });
  }
  return out;
}

/**
 * Phase 18.2B.2 — Consecutive Voice-2 notes only: post-selection leap control (no deletions).
 * Hard cap then soft preference (guide tones) without touching Voice 1 or rhythm.
 */
function enforceVoice2ConsecutiveInnerLineIntervals(
  guitar: PartModel,
  context: CompositionContext,
  maxLeap: number,
  poolGuideFirst: boolean
): void {
  const refs = collectVoice2NoteRefsGlobalOrder(guitar);
  for (let i = 1; i < refs.length; i++) {
    const mPrev = guitar.measures.find((x) => x.index === refs[i - 1]!.bar);
    const mCur = guitar.measures.find((x) => x.index === refs[i]!.bar);
    if (!mPrev || !mCur) continue;
    const ePrev = mPrev.events[refs[i - 1]!.ei];
    const eCur = mCur.events[refs[i]!.ei];
    if (!ePrev || ePrev.kind !== 'note' || !eCur || eCur.kind !== 'note') continue;
    const nPrev = ePrev as NoteEvent;
    const nCur = eCur as NoteEvent;
    if ((nPrev.voice ?? 1) !== V2_VOICE || (nCur.voice ?? 1) !== V2_VOICE) continue;
    const p1 = nPrev.pitch;
    const p2 = nCur.pitch;
    if (Math.abs(p2 - p1) <= maxLeap) continue;
    const chord = mCur.chord ?? 'Cmaj9';
    const np = resolveLeapTowardPrev(p1, p2, chord, STAB_GUITAR_LOW, STAB_GUITAR_HIGH, maxLeap, context, poolGuideFirst);
    const np2 = clampVoice2PitchBelowOverlappingV1(mCur, nCur, np);
    mCur.events[refs[i]!.ei] = { ...nCur, pitch: np2 };
  }
}

/**
 * Phase 18.2B.3 — Phrase presence (4-bar windows), breathing (max 2 consecutive active bars), and overlap/sustain bias
 * are enforced in {@link collectPhraseAwareActiveBarIndices} and {@link injectGuitarVoice2WybleLayer}. Reserved hook for future post-pass checks.
 */
export function stabiliseGuitarVoice2Wyble18_2B_3(_guitar: PartModel, _context: CompositionContext): void {
  // Intentionally empty: behaviour lives in phrase scheduling + inject.
}

/**
 * 18.2B.2: Voice-2–only interval chain (hard 12 → soft 7 + guide-tone bias) → phrase-end re-lock.
 */
export function stabiliseGuitarVoice2Wyble18_2B_2(guitar: PartModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;
  enforceVoice2ConsecutiveInnerLineIntervals(guitar, context, V2_INNER_LINE_HARD_LEAP, false);
  enforceVoice2ConsecutiveInnerLineIntervals(guitar, context, V2_INNER_LINE_SOFT_LEAP, true);
  for (const m of guitar.measures) {
    applyPhraseEndHardOverrideForMeasure(m, m.chord ?? 'Cmaj9', context);
  }
}

/**
 * 18.2B.1: phrase-end chord-tone override → BH leap cap → inner-line soft leap → phrase-end re-lock.
 */
export function stabiliseGuitarVoice2Wyble18_2B_1(guitar: PartModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;

  for (const m of guitar.measures) {
    applyPhraseEndHardOverrideForMeasure(m, m.chord ?? 'Cmaj9', context);
  }

  enforceVoice2LeapCap(guitar, context, BH_GUITAR_MAX_LEAP);
  enforceVoice2LeapCap(guitar, context, V2_SOFT_MAX_LEAP);

  for (const m of guitar.measures) {
    applyPhraseEndHardOverrideForMeasure(m, m.chord ?? 'Cmaj9', context);
  }
}

/**
 * After post-orchestration / voice-leading edits to voice 1, fix register crossings:
 * try lowering voice 2 by one octave (repeat once); only then drop voice 2 in the bar.
 * Keeps export unchanged; only mutates inner-voice pitches or removes them.
 */
export function stripVoice2IfCrossingMelody(guitar: PartModel): number {
  let strippedBars = 0;
  for (const m of guitar.measures) {
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (v2.length === 0) continue;
    if (voice2StrictlyBelowOverlappingV1(v1, v2)) continue;
    let fixed = false;
    for (let step = 0; step < 3 && !fixed; step++) {
      for (let i = 0; i < m.events.length; i++) {
        const e = m.events[i]!;
        if (e.kind !== 'note' || (e.voice ?? 1) !== V2_VOICE) continue;
        const n = e as NoteEvent;
        m.events[i] = { ...n, pitch: n.pitch - 12 };
      }
      const v2a = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
      if (voice2StrictlyBelowOverlappingV1(v1, v2a)) fixed = true;
    }
    const v2b = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (!voice2StrictlyBelowOverlappingV1(v1, v2b)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      strippedBars += 1;
    }
  }
  return strippedBars;
}
