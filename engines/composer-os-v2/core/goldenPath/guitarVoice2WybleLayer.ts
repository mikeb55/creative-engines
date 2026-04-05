/**
 * Phase 18.2B+ — Guitar polyphony inner voice (Wyble-style). Voice 2 inject uses the reactive inline path (Phase 18.3B planner/generator bypassed for stability).
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

/** Phase 18.2B.5 — phrase commitment: sustain / neutral hold only within this distance of frozen run arrival. */
const V2_COMMITMENT_AT_TARGET_SEMITONES = 2;
/** Phase 18.2B.5 — far from arrival: prefer motion rhythm over a full-bar hold (anti static fallback). */
const V2_COMMITMENT_FAR_HOLD_SEMITONES = 4;

/** Realised rhythm for one bar (replaces independent per-bar probability draw). */
type Voice2RhythmKind =
  | 'whole'
  | 'delayed3'
  | 'halfBack'
  | 'offbeat1'
  /** Phase 18.2D — call/response: rest then single note; rest length in [0.5, 1.5] beats (bar = 4 beats). */
  | 'resp05'
  | 'resp075'
  | 'resp125'
  | 'resp15';

/** Coarse schedule from continuation runs (before per-bar behaviour). */
type Voice2SchedulePhase = 'enter' | 'continue' | 'resolve';

/**
 * Phase 18.2B.3 FINAL — phrase-level contrapuntal line (not bar-local weighting).
 * ENTER: phrase entry / after rest; SUSTAIN: hold guide area; MOVE: step toward target; RESOLVE: cadence; REST: inactive.
 */
type Voice2BehaviourPhase = 'enter' | 'sustain' | 'move' | 'resolve' | 'rest';

/** Per-bar run metadata (built before inject). */
type Voice2BarPhaseInfo = { schedulePhase: Voice2SchedulePhase; runEndBar: number; runStartBar: number };

/** Phase 18.2F — phrase skeleton anchor roles (time ownership at phrase level). */
type PhraseAnchorRole = 'v1_only' | 'v2_only' | 'both';

/**
 * Phase 18.2F — per-bar hints from phrase co-skeleton (planned with V1 timing, applied at Voice 2 inject).
 */
/** Phase 18.3A — one phrase-level role for Voice 2 (not mixed per bar). */
type Voice2PhraseRole = 'support' | 'counter' | 'response';

/** Phase 18.3A — phrase plan: role + mandatory activity bars (structural presence). */
type PhraseVoice2Plan = {
  phraseIndex: number;
  role: Voice2PhraseRole;
  /** 2–4 bars per phrase where Voice 2 must appear in effective schedule. */
  activityBars: Set<number>;
};

type BarVoice2CoPlan = {
  phraseIndex: number;
  /** First effective V2 bar in phrase: motion-first, not default whole sustain. */
  motionFirst: boolean;
  /** At least two bars per phrase marked; anchor-weighted toward V2-owned time. */
  independentEntry: boolean;
  interaction: 'v1_active_delay' | 'v1_idle_v2';
  /**
   * Phase 18.3A — Phrase co-plan: this bar owns the Voice-2 anchor (initiates motion, not incidental gap-fill).
   * Exactly one effective bar per phrase; chosen by highest overlap with v2_only / both skeleton anchors.
   */
  v2OwnsPhraseAnchor: boolean;
};

/** Persisted musical state for Voice 2 across bars (generation-time only; not export). */
export type Voice2State = {
  active: boolean;
  currentPitch: number | null;
  targetPitch: number | null;
  remainingDuration: number;
  phase: Voice2BehaviourPhase;
  /** Phase 18.2B.4 — frozen arrival MIDI for the active continuity run (multi-bar intent). */
  directionalRunEndMidi?: number | null;
  /** Phase 18.2B.5 — same as frozen run arrival; locked for the run (commitment target). */
  committedPhraseTargetMidi?: number | null;
  /** 1–2 bar lookahead harmonic goal. */
  lookaheadTargetMidi?: number | null;
  barsRemainingInRun?: number;
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

/** Melody attack onsets falling inside [t0, t1) — directional spans covering multiple attacks favour micro-motion. */
function countV1AttackOnsetsInSpan(v1: NoteEvent[], t0: number, t1: number): number {
  let c = 0;
  for (const n of v1) {
    if (n.startBeat >= t0 - 1e-6 && n.startBeat < t1 - 1e-6) c++;
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

/** Phase 18.2D — rest duration before the single sustained answer (rest + note = 4 beats). */
function callResponseRestBeats(rhythm: Voice2RhythmKind): number | undefined {
  switch (rhythm) {
    case 'resp05':
      return 0.5;
    case 'resp075':
      return 0.75;
    case 'delayed3':
      return 1;
    case 'resp125':
      return 1.25;
    case 'resp15':
      return 1.5;
    default:
      return undefined;
  }
}

function v1TotalNoteBeats(v1: NoteEvent[]): number {
  return v1.reduce((s, n) => s + n.duration, 0);
}

function v1LastMelodyEndBeat(v1: NoteEvent[]): number {
  let e = 0;
  for (const n of v1) e = Math.max(e, n.startBeat + n.duration);
  return e;
}

/** Short phrase clears early in the bar — room for a delayed inner answer. */
function v1IsShortPhraseEarlyCleared(v1: NoteEvent[]): boolean {
  return v1LastMelodyEndBeat(v1) <= 2.25 && v1.length <= 3;
}

/** Phase 18.2D — coarse activity of melody in the bar (rhythmic contrast vs Voice 2). */
function v1DensityClass(v1: NoteEvent[]): 'sparse' | 'medium' | 'dense' {
  const beats = v1TotalNoteBeats(v1);
  const attacks = v1.length;
  if (beats < 2) return 'sparse';
  if (beats > 3.2 || attacks >= 5) return 'dense';
  return 'medium';
}

/**
 * One inner note [startBeat, startBeat+duration) must overlap ≥2 melody notes when the bar has ≥2 melody notes
 * (same rule as {@link v2PassesMelodyOverlapRule} for a single note).
 */
function v2OneNoteSpanPassesMelodyOverlapRule(v1: NoteEvent[], startBeat: number, duration: number): boolean {
  if (v1.length < 2) return true;
  const t0 = startBeat;
  const t1 = startBeat + duration;
  return countV1NotesOverlappingSpan(v1, t0, t1) >= 2;
}

/** Phase 18.2D/E — rhythm candidate passes melody overlap rule for that bar (shared by planners). */
function validateVoice2RhythmForBar(guitar: PartModel, bar: number, kind: Voice2RhythmKind): boolean {
  const m = guitar.measures.find((x) => x.index === bar);
  if (!m) return false;
  const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  if (v1.length === 0) return false;
  const r = callResponseRestBeats(kind);
  if (r !== undefined) {
    return v2OneNoteSpanPassesMelodyOverlapRule(v1, r, 4 - r);
  }
  if (kind === 'halfBack') {
    return v2OneNoteSpanPassesMelodyOverlapRule(v1, 2, 2);
  }
  if (kind === 'offbeat1') {
    return v2OneNoteSpanPassesMelodyOverlapRule(v1, 3, 1);
  }
  return true;
}

/** Minimum Voice-2 effective bars implied by ≥50% presence per phrase (4–8 bar windows use 4-bar phrases). */
function minEffectiveBarsByPhrasePresenceFloor(tb: number): number {
  const phraseCount = Math.ceil(tb / 4);
  let sum = 0;
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const len = end - base + 1;
    sum += Math.max(1, Math.ceil(len * 0.5));
  }
  return sum;
}

/** Spread order so added bars are not clustered at one end of the phrase. */
function spreadOrderCandidates(candidates: number[], seed: number, phraseIdx: number): number[] {
  const sorted = [...candidates].sort((a, b) => a - b);
  if (sorted.length <= 1) return sorted;
  const offset = (Math.abs(seed) + phraseIdx * 7) % sorted.length;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
}

/**
 * Phase 18.2F — Phrase skeleton: 2–4 anchor beats per phrase with roles (V1-only / V2-only / both).
 * Maps to per-bar co-plan for rhythm (motion-first, independent entries, interaction mode vs V1 density).
 */
function buildPhraseCoSkeleton(
  guitar: PartModel,
  tb: number,
  seed: number,
  effectiveBars: Set<number>
): Map<number, BarVoice2CoPlan> {
  const out = new Map<number, BarVoice2CoPlan>();
  const phraseCount = Math.ceil(tb / 4);
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const lenBars = end - base + 1;
    const phraseBeats = lenBars * 4;

    const nAnchors = 2 + (Math.abs(seed) + p * 17) % 3;
    const anchors: Array<{ beat: number; role: PhraseAnchorRole }> = [];
    for (let i = 0; i < nAnchors; i++) {
      const t = (i + 1) / (nAnchors + 1);
      const jitter = (seededUnit(seed, p * 31 + i, 18210) - 0.5) * 1.4;
      const beat = Math.max(0.25, Math.min(phraseBeats - 0.25, t * phraseBeats + jitter));
      const r = seededUnit(seed, p * 31 + i, 18211);
      const role: PhraseAnchorRole = r < 0.2 ? 'both' : r < 0.5 ? 'v1_only' : 'v2_only';
      anchors.push({ beat, role });
    }
    anchors.sort((a, b) => a.beat - b.beat);

    const effInPhrase = [...effectiveBars].filter((b) => b >= base && b <= end).sort((a, b) => a - b);
    if (effInPhrase.length === 0) continue;

    const firstEff = effInPhrase[0]!;

    const scores = new Map<number, number>();
    for (const b of effInPhrase) {
      const barOffset = b - base;
      const localStart = barOffset * 4;
      const localEnd = localStart + 4;
      let s = 0;
      for (const a of anchors) {
        if (a.beat < localStart || a.beat >= localEnd) continue;
        if (a.role === 'v2_only') s += 3;
        else if (a.role === 'both') s += 2;
      }
      scores.set(b, s);
    }
    const sortedByScore = [...effInPhrase].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
    const independent = new Set<number>();
    independent.add(sortedByScore[0]!);
    if (sortedByScore.length >= 2) independent.add(sortedByScore[1]!);
    else independent.add(sortedByScore[0]!);

    /** Phase 18.3A — One bar per phrase explicitly co-planned for Voice-2-led material (highest v2 anchor weight). */
    const v2AnchorBar = sortedByScore[0]!;

    for (const b of effInPhrase) {
      const m = guitar.measures.find((x) => x.index === b);
      const v1 = m ? (m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[]) : [];
      const v1Sounding = v1TotalNoteBeats(v1) >= 1.5;
      const interaction: BarVoice2CoPlan['interaction'] = v1Sounding ? 'v1_active_delay' : 'v1_idle_v2';

      out.set(b, {
        phraseIndex: p,
        motionFirst: b === firstEff,
        independentEntry: independent.has(b),
        interaction,
        v2OwnsPhraseAnchor: b === v2AnchorBar,
      });
    }
  }
  return out;
}

/**
 * Phase 18.3A — Spread `count` distinct bar offsets across a phrase (deterministic, guitar-realistic spacing).
 */
function pickSpreadPhraseBarOffsets(len: number, count: number, seed: number, p: number): number[] {
  if (count >= len) return Array.from({ length: len }, (_, i) => i);
  if (len <= 1) return [0];
  if (len === 2 && count === 2) return [0, 1];
  if (len === 3 && count === 2) {
    const opts = [
      [0, 1],
      [0, 2],
      [1, 2],
    ];
    return opts[(Math.abs(seed) + p * 17) % opts.length]!;
  }
  if (len === 3) return [0, 1, 2];
  if (len === 4 && count === 2) {
    const opts = [
      [0, 2],
      [0, 3],
      [1, 3],
      [0, 1],
    ];
    return opts[(Math.abs(seed) + p * 19) % opts.length]!;
  }
  if (len === 4 && count === 3) {
    const opts = [
      [0, 1, 3],
      [0, 2, 3],
      [1, 2, 3],
    ];
    return opts[(Math.abs(seed) + p * 23) % opts.length]!;
  }
  if (len === 4 && count === 4) return [0, 1, 2, 3];
  const step = (len - 1) / Math.max(1, count - 1);
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    raw.push(Math.min(len - 1, Math.round(i * step)));
  }
  return [...new Set(raw)].sort((a, b) => a - b);
}

/**
 * Phase 18.3A — Phrase-level Voice 2 plan: one role per phrase + 2–4 mandatory activity bars.
 */
function buildPhraseVoice2Plans(tb: number, seed: number): Map<number, PhraseVoice2Plan> {
  const out = new Map<number, PhraseVoice2Plan>();
  const phraseCount = Math.ceil(tb / 4);
  const roles: Voice2PhraseRole[] = ['support', 'counter', 'response'];
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const len = end - base + 1;
    const role = roles[p % 3]!;
    const count =
      len <= 1 ? 1 : len === 2 ? 2 : Math.min(4, Math.max(2, 2 + (Math.abs(seed) + p * 11) % 3));
    const offsets = pickSpreadPhraseBarOffsets(len, Math.min(count, len), seed, p);
    const activityBars = new Set<number>();
    for (const off of offsets) {
      const b = base + off;
      if (b >= 1 && b <= tb) activityBars.add(b);
    }
    out.set(p, { phraseIndex: p, role, activityBars });
  }
  return out;
}

/**
 * Phase 18.3A — Every planned activity bar is in the effective set (with phase metadata if missing).
 */
function ensurePhraseActivityInEffective(
  tb: number,
  phraseV2Plans: Map<number, PhraseVoice2Plan>,
  effective: Set<number>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>
): void {
  for (const plan of phraseV2Plans.values()) {
    for (const b of plan.activityBars) {
      if (b < 1 || b > tb) continue;
      effective.add(b);
      if (!phaseByBar.has(b)) {
        const base = plan.phraseIndex * 4 + 1;
        const end = Math.min(base + 3, tb);
        phaseByBar.set(b, {
          schedulePhase: b % 4 === 0 ? 'resolve' : 'continue',
          runEndBar: end,
          runStartBar: base,
        });
      }
    }
  }
}

/**
 * Phase 18.3A — On activity-window bars (non-resolve), replace default wholes with role-specific independent rhythms.
 */
function applyPhraseRoleVoice2Rhythms(
  guitar: PartModel,
  effectiveBars: Set<number>,
  phraseV2Plans: Map<number, PhraseVoice2Plan>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  tb: number,
  out: Map<number, Voice2RhythmKind>
): void {
  for (let bar = 1; bar <= tb; bar++) {
    if (!effectiveBars.has(bar)) continue;
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) continue;

    const p = Math.floor((bar - 1) / 4);
    const plan = phraseV2Plans.get(p);
    if (!plan || !plan.activityBars.has(bar)) continue;
    const info = phaseByBar.get(bar);
    if (info?.schedulePhase === 'resolve') continue;

    const validate = (k: Voice2RhythmKind) => validateVoice2RhythmForBar(guitar, bar, k);
    const cur = out.get(bar) ?? 'whole';
    if (cur !== 'whole') continue;

    const cands: Voice2RhythmKind[] =
      plan.role === 'support'
        ? ['delayed3', 'halfBack', 'resp125', 'whole']
        : plan.role === 'counter'
          ? ['halfBack', 'delayed3', 'offbeat1', 'resp075']
          : ['resp125', 'resp15', 'delayed3', 'resp05'];

    for (const k of cands) {
      if (validate(k)) {
        out.set(bar, k);
        break;
      }
    }
  }
}

/**
 * Phase 18.2F — Apply skeleton: motion-first (no default whole on first bar), independent slots, interaction bias.
 */
function applyPhraseCoSkeletonRhythms(
  guitar: PartModel,
  effectiveBars: Set<number>,
  seed: number,
  tb: number,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  coPlan: Map<number, BarVoice2CoPlan>,
  out: Map<number, Voice2RhythmKind>
): void {
  for (let bar = 1; bar <= tb; bar++) {
    if (!effectiveBars.has(bar)) continue;
    const plan = coPlan.get(bar);
    if (!plan) continue;
    const info = phaseByBar.get(bar);
    const schedulePhase = info?.schedulePhase ?? 'continue';
    if (schedulePhase === 'resolve') continue;

    const validate = (k: Voice2RhythmKind) => validateVoice2RhythmForBar(guitar, bar, k);

    const tryReplaceWhole = (cands: Voice2RhythmKind[]) => {
      const cur = out.get(bar) ?? 'whole';
      if (cur !== 'whole') return;
      for (const k of cands) {
        if (validate(k)) {
          out.set(bar, k);
          return;
        }
      }
    };

    /** Interaction mode is used by inject (density); avoid wholesale rhythm swaps here (stability vs mirrors / overlap). */

    /** Phase 18.3A — V2-owned phrase anchor: prefer delayed / off-beat entry so V2 initiates, not imitates V1. */
    if (plan.v2OwnsPhraseAnchor) {
      tryReplaceWhole(['delayed3', 'halfBack', 'resp125', 'resp075', 'resp05', 'offbeat1']);
    }
    if (plan.motionFirst) {
      tryReplaceWhole(['halfBack', 'delayed3', 'resp125', 'resp05']);
    }
    if (plan.independentEntry) {
      tryReplaceWhole(['halfBack', 'delayed3', 'resp125', 'resp075']);
    }
  }
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
 * Phase 18.2B.4 — Blend local guide with run-end harmonic destination so the line aims across 2–4 bars.
 * Progress 0 → more local fit; progress 1 → strongly pulled toward {@link runDestinationPlaced}.
 */
function blendMovementTargetForBar(
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  offsetInRun: number,
  runLenBars: number,
  runDestinationPlaced: number
): number {
  const localGuide = computeTargetGuidePitch(chord, strictCeiling, context, seed, bar, offsetInRun);
  if (runLenBars <= 1) return runDestinationPlaced;
  const progress = offsetInRun / Math.max(1, runLenBars - 1);
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) return runDestinationPlaced;
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  const uniq: number[] = [];
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p < strictCeiling && p >= floorMidi && !uniq.includes(p)) uniq.push(p);
  }
  let best: number | undefined;
  let bd = 999;
  const destWeight = 0.38 + 0.55 * progress;
  for (const p of uniq) {
    const score = (1 - destWeight) * Math.abs(p - localGuide) + destWeight * Math.abs(p - runDestinationPlaced);
    if (score < bd) {
      bd = score;
      best = p;
    }
  }
  return best ?? runDestinationPlaced;
}

/**
 * Map schedule + horizontal anchor to behaviour: SUSTAIN holds guide area; MOVE steps toward target.
 * Phase 18.2B.5 — Commitment: on CONTINUE, never drift into passive sustain while far from frozen run arrival.
 */
function deriveBehaviourPhase(
  schedule: Voice2SchedulePhase,
  anchorMidi: number | null,
  targetPitch: number,
  seed: number,
  bar: number,
  frozenRunArrivalMidi?: number
): Voice2BehaviourPhase {
  if (schedule === 'enter') return 'enter';
  if (schedule === 'resolve') return 'resolve';
  if (anchorMidi === null) return 'sustain';
  if (frozenRunArrivalMidi !== undefined && schedule === 'continue') {
    const distEnd = Math.abs(anchorMidi - frozenRunArrivalMidi);
    if (distEnd > V2_COMMITMENT_AT_TARGET_SEMITONES) {
      return 'move';
    }
    const distGuide = Math.abs(anchorMidi - targetPitch);
    if (distGuide > 3) return 'move';
    return seededUnit(seed, bar, 7203) < 0.5 ? 'move' : 'sustain';
  }
  const dist = Math.abs(anchorMidi - targetPitch);
  if (dist <= 3) return 'sustain';
  return seededUnit(seed, bar, 7203) < 0.82 ? 'move' : 'sustain';
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
  bar: number,
  progressInRun: number,
  committedArrivalMidi?: number
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) {
    return pickVoice2PitchFromAnchor(anchorMidi, primary, secondary, seed, bar);
  }
  const needNoStationary =
    committedArrivalMidi !== undefined &&
    Math.abs(anchorMidi - committedArrivalMidi) > V2_COMMITMENT_AT_TARGET_SEMITONES;
  let destPull = 0.35 + 0.55 * progressInRun;
  if (Math.abs(anchorMidi - targetPitch) > 5) {
    destPull = Math.min(0.94, destPull + 0.16);
  } else if (Math.abs(anchorMidi - targetPitch) > 3) {
    destPull = Math.min(0.9, destPull + 0.08);
  }
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  let best: number | undefined;
  let bd = 999;
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) continue;
    if (needNoStationary && p === anchorMidi) continue;
    const step = Math.abs(p - anchorMidi);
    if (step > V2_INNER_LINE_SOFT_LEAP + 2) continue;
    const score = step * (0.88 - 0.18 * destPull) + Math.abs(p - targetPitch) * (0.32 + 0.45 * destPull);
    if (score < bd) {
      bd = score;
      best = p;
    }
  }
  if (best !== undefined) return best;
  const fallback = continuePitchFromAnchor(anchorMidi, chord, strictCeiling, context, seed, bar, primary, secondary);
  if (needNoStationary && fallback === anchorMidi) {
    return pickChordToneStepToward(
      anchorMidi,
      committedArrivalMidi ?? targetPitch,
      chord,
      strictCeiling,
      context,
      seed,
      bar,
      7207,
      false
    );
  }
  return fallback;
}

/**
 * Phase 18.2B.5 — If still far from frozen arrival, reject neutral repetition (same pitch as anchor).
 */
function enforcePitchPhraseCommitment(
  anchorMidi: number,
  chosen: number,
  behaviour: Voice2BehaviourPhase,
  committedArrival: number,
  movementTargetPitch: number,
  runDestinationPlaced: number,
  progressInRun: number,
  primary: number,
  secondary: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number
): number {
  if (behaviour === 'resolve' || behaviour === 'enter' || behaviour === 'rest') return chosen;
  if (Math.abs(anchorMidi - committedArrival) <= V2_COMMITMENT_AT_TARGET_SEMITONES) return chosen;
  if (chosen !== anchorMidi) return chosen;
  const nudged = movePitchTowardGuide(
    anchorMidi,
    movementTargetPitch,
    primary,
    secondary,
    chord,
    strictCeiling,
    context,
    seed,
    bar + 31,
    progressInRun,
    committedArrival
  );
  if (nudged !== anchorMidi) return nudged;
  return pickChordToneStepToward(
    anchorMidi,
    committedArrival,
    chord,
    strictCeiling,
    context,
    seed,
    bar,
    7208,
    false
  );
}

function pickVoice2PitchForBehaviour(
  behaviour: Voice2BehaviourPhase,
  anchorMidi: number | null,
  movementTargetPitch: number,
  runDestinationPlaced: number,
  progressInRun: number,
  primary: number,
  secondary: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  committedArrivalMidi?: number
): number {
  const committed = committedArrivalMidi ?? runDestinationPlaced;
  if (behaviour === 'enter' || behaviour === 'rest' || anchorMidi === null) {
    return primary;
  }
  if (behaviour === 'resolve') {
    return pickStrongPhraseEndArrivalPitch(
      anchorMidi,
      runDestinationPlaced,
      primary,
      secondary,
      chord,
      strictCeiling,
      context,
      seed,
      bar
    );
  }
  if (behaviour === 'sustain') {
    const s = sustainPitchFromAnchor(anchorMidi, primary, strictCeiling, chord, context);
    return enforcePitchPhraseCommitment(
      anchorMidi,
      s,
      behaviour,
      committed,
      movementTargetPitch,
      runDestinationPlaced,
      progressInRun,
      primary,
      secondary,
      chord,
      strictCeiling,
      context,
      seed,
      bar
    );
  }
  if (behaviour === 'move') {
    const m = movePitchTowardGuide(
      anchorMidi,
      movementTargetPitch,
      primary,
      secondary,
      chord,
      strictCeiling,
      context,
      seed,
      bar,
      progressInRun,
      committed
    );
    return enforcePitchPhraseCommitment(
      anchorMidi,
      m,
      behaviour,
      committed,
      movementTargetPitch,
      runDestinationPlaced,
      progressInRun,
      primary,
      secondary,
      chord,
      strictCeiling,
      context,
      seed,
      bar
    );
  }
  const c = continuePitchFromAnchor(anchorMidi, chord, strictCeiling, context, seed, bar, primary, secondary);
  return enforcePitchPhraseCommitment(
    anchorMidi,
    c,
    behaviour,
    committed,
    movementTargetPitch,
    runDestinationPlaced,
    progressInRun,
    primary,
    secondary,
    chord,
    strictCeiling,
    context,
    seed,
    bar
  );
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
 * Phase 18.2B.3 + 18.2E — Expand scheduled bars into 2–4 bar continuation runs; global cap allows phrase 50% floor.
 */
function buildVoice2ContinuationSchedule(
  tb: number,
  seed: number,
  scheduled: Set<number>
): { effective: Set<number>; phaseByBar: Map<number, Voice2BarPhaseInfo> } {
  const effective = new Set<number>();
  const phaseByBar = new Map<number, Voice2BarPhaseInfo>();
  const minByPhrase = minEffectiveBarsByPhrasePresenceFloor(tb);
  const targetMax = Math.max(2, Math.floor(tb * 0.62), minByPhrase);
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
  ensurePhraseVoice2PresenceFloor(tb, seed, scheduled, effective, phaseByBar);
  return { effective, phaseByBar };
}

/**
 * Phase 18.2E — Hard floor: each phrase has Voice 2 in ≥50% of its bars (distributed when adding from scheduled).
 */
function ensurePhraseVoice2PresenceFloor(
  tb: number,
  seed: number,
  scheduled: Set<number>,
  effective: Set<number>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>
): void {
  const phraseCount = Math.ceil(tb / 4);
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const len = end - base + 1;
    const minNeed = Math.max(1, Math.ceil(len * 0.5));
    let count = 0;
    for (let b = base; b <= end; b++) {
      if (effective.has(b)) count++;
    }
    if (count >= minNeed) continue;

    const need = minNeed - count;
    const candidates: number[] = [];
    for (let b = base; b <= end; b++) {
      if (scheduled.has(b) && !effective.has(b)) candidates.push(b);
    }
    const order = spreadOrderCandidates(candidates, seed, p);
    let added = 0;
    for (const bar of order) {
      if (added >= need) break;
      if (effective.has(bar)) continue;
      if (wouldAddCompleteTriple(effective, bar)) continue;
      effective.add(bar);
      phaseByBar.set(bar, {
        schedulePhase: bar % 4 === 0 ? 'resolve' : 'enter',
        runEndBar: bar,
        runStartBar: bar,
      });
      added++;
    }
  }
}

/**
 * Phase 18.2D — Second pass: call/response delays, overlap vs gap variety, handoff when melody enters late,
 * dense melody → longer Voice 2; sparse/short phrase → delayed answers. Respects overlap rule when possible.
 */
function applyConversationalVoice2Rhythms(
  guitar: PartModel,
  effectiveBars: Set<number>,
  seed: number,
  tb: number,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  out: Map<number, Voice2RhythmKind>
): void {
  for (let bar = 1; bar <= tb; bar++) {
    if (!effectiveBars.has(bar)) continue;
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) continue;

    const info = phaseByBar.get(bar);
    const schedulePhase = info?.schedulePhase ?? 'continue';
    const phraseIdx = Math.floor((bar - 1) / 4);
    const density = v1DensityClass(v1);
    const shortClear = v1IsShortPhraseEarlyCleared(v1);
    const rot = (bar * 17 + phraseIdx * 23 + (Math.abs(seed) % 100)) % 6;
    const gate = seededUnit(seed, bar, 9201);
    if (gate > 0.78) continue;

    const firstAttack = Math.min(...v1.map((n) => n.startBeat));

    const validate = (kind: Voice2RhythmKind): boolean => validateVoice2RhythmForBar(guitar, bar, kind);

    const pickFirstValid = (candidates: Voice2RhythmKind[]): Voice2RhythmKind | undefined => {
      for (const c of candidates) {
        if (validate(c)) return c;
      }
      return undefined;
    };

    /** Phase 18.2E — melody mostly resting: Voice 2 may carry motion (prefer ≥2 beat spans for overlap clarity). */
    if (v1TotalNoteBeats(v1) < 1.35 && density !== 'dense' && gate < 0.66) {
      const pick = pickFirstValid(['delayed3', 'halfBack', 'resp05', 'resp075']);
      if (pick !== undefined) {
        out.set(bar, pick);
        continue;
      }
    }

    if (schedulePhase !== 'resolve' && density !== 'dense' && firstAttack >= 1.1 && gate < 0.52) {
      const pick = pickFirstValid(['resp05', 'resp075', 'delayed3']);
      if (pick !== undefined) {
        out.set(bar, pick);
        continue;
      }
    }

    if (schedulePhase === 'resolve') {
      if (gate > 0.52) continue;
      const pick = pickFirstValid(['resp15', 'resp125', 'whole', 'delayed3', 'halfBack']);
      if (pick !== undefined) out.set(bar, pick);
      continue;
    }

    if (density === 'dense') {
      if (rot % 3 !== 0) {
        out.set(bar, 'whole');
      } else {
        const pick = pickFirstValid(['delayed3', 'resp05', 'halfBack']);
        out.set(bar, pick ?? 'whole');
      }
      continue;
    }

    if (density === 'sparse' || shortClear) {
      const base = (rot + phraseIdx + bar) % 5;
      const order: Voice2RhythmKind[] = ['resp05', 'resp075', 'delayed3', 'resp125', 'resp15'];
      const rotated = [...order.slice(base), ...order.slice(0, base)];
      const pick = pickFirstValid(rotated);
      if (pick !== undefined) {
        out.set(bar, pick);
        continue;
      }
    }

    const mediumMix: Voice2RhythmKind[] = ['whole', 'delayed3', 'resp125', 'halfBack', 'resp05', 'offbeat1'];
    const idx = (rot + phraseIdx * 2 + bar) % mediumMix.length;
    const pick = pickFirstValid([mediumMix[idx]!, ...mediumMix]);
    if (pick !== undefined) out.set(bar, pick);
  }
}

/** Phase 18.2E — Avoid back-to-back whole-bar sustains; bias toward motion or delayed entry. */
function applySustainStreakBreaker(
  guitar: PartModel,
  effectiveBars: Set<number>,
  tb: number,
  out: Map<number, Voice2RhythmKind>
): void {
  const sorted = [...effectiveBars].filter((b) => b >= 1 && b <= tb).sort((a, b) => a - b);
  let prevKind: Voice2RhythmKind | undefined;
  for (const bar of sorted) {
    const k = out.get(bar) ?? 'whole';
    if (prevKind === 'whole' && k === 'whole') {
      const tryKinds: Voice2RhythmKind[] = ['halfBack', 'delayed3', 'resp125', 'resp05', 'resp075'];
      for (const t of tryKinds) {
        if (validateVoice2RhythmForBar(guitar, bar, t)) {
          out.set(bar, t);
          break;
        }
      }
    }
    prevKind = out.get(bar) ?? k;
  }
}

/**
 * Phase 18.2E — Per phrase: at least one sustain-like bar, one delayed/off-beat entry, one motion-friendly bar.
 */
function applyPhraseRhythmMinimums(
  guitar: PartModel,
  effectiveBars: Set<number>,
  seed: number,
  tb: number,
  out: Map<number, Voice2RhythmKind>
): void {
  const phraseCount = Math.ceil(tb / 4);
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const barsInPhrase: number[] = [];
    for (let b = base; b <= end; b++) {
      if (effectiveBars.has(b)) barsInPhrase.push(b);
    }
    if (barsInPhrase.length === 0) continue;

    const classify = (k: Voice2RhythmKind) => {
      let sustain = false;
      let delayed = false;
      let motionRhythm = false;
      if (k === 'whole') sustain = true;
      if (k === 'delayed3' || callResponseRestBeats(k) !== undefined) {
        sustain = true;
        delayed = true;
      }
      if (k === 'offbeat1' || k === 'halfBack') {
        delayed = true;
        motionRhythm = true;
      }
      return { sustain, delayed, motionRhythm };
    };

    let hasSustain = false;
    let hasDelayed = false;
    let hasMotionRhythm = false;
    const recompute = (): void => {
      hasSustain = false;
      hasDelayed = false;
      hasMotionRhythm = false;
      for (const b of barsInPhrase) {
        const k = out.get(b) ?? 'whole';
        const c = classify(k);
        if (c.sustain) hasSustain = true;
        if (c.delayed) hasDelayed = true;
        if (c.motionRhythm) hasMotionRhythm = true;
      }
    };
    recompute();

    const pickBar = (salt: number) => barsInPhrase[(salt + p + Math.abs(seed)) % barsInPhrase.length]!;

    const trySet = (b: number, kinds: Voice2RhythmKind[]): boolean => {
      for (const k of kinds) {
        if (validateVoice2RhythmForBar(guitar, b, k)) {
          out.set(b, k);
          return true;
        }
      }
      return false;
    };

    if (!hasSustain && !hasDelayed) {
      trySet(pickBar(11), ['delayed3', 'whole', 'resp15']);
    } else {
      if (!hasSustain) trySet(pickBar(11), ['whole', 'delayed3', 'resp15']);
      if (!hasDelayed) trySet(pickBar(17), ['delayed3', 'resp125', 'halfBack', 'offbeat1']);
    }
    recompute();
    if (!hasMotionRhythm) {
      trySet(pickBar(23), ['halfBack', 'delayed3', 'resp125', 'offbeat1']);
    }
  }
}

/**
 * Phase 18.2B.5 + 18.2B.3 + 18.2B.6 — Rhythm: ENTER elongated; CONTINUE sustained;
 * RESOLVE with committed arrival (whole / delayed3); ~25% phrase micro-contrast (delayed entry / independence).
 */
function planVoice2BarRhythms(
  guitar: PartModel,
  effectiveBars: Set<number>,
  seed: number,
  tb: number,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  phraseV2Plans: Map<number, PhraseVoice2Plan>
): Map<number, Voice2RhythmKind> {
  const coPlan = buildPhraseCoSkeleton(guitar, tb, seed, effectiveBars);
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
      const strongPhraseBar = bar % 4 === 0;
      const u = seededUnit(seed, bar, 1825);
      /** 18.2B.6 — Prefer longer arrival (whole) or delayed resolve onto a strong beat (delayed3). */
      if (strongPhraseBar) {
        out.set(bar, u < 0.65 ? 'whole' : 'delayed3');
      } else {
        out.set(bar, u < 0.5 ? 'whole' : u < 0.82 ? 'delayed3' : 'halfBack');
      }
      continue;
    }

    if (schedulePhase === 'enter') {
      const phraseIdx = Math.floor((bar - 1) / 4);
      const microContrast = seededUnit(seed, phraseIdx, 7600) < 0.26;
      const u2 = seededUnit(seed, bar, 1824);
      if (microContrast && u2 < 0.72) {
        out.set(bar, 'delayed3');
        continue;
      }
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
    const phraseIdxC = Math.floor((bar - 1) / 4);
    const microContrastC = seededUnit(seed, phraseIdxC, 7601) < 0.24;
    const runInf = phaseByBar.get(bar);
    const runLenR = runInf ? runInf.runEndBar - runInf.runStartBar + 1 : 1;
    const offsetInRun = runInf ? bar - runInf.runStartBar : 0;
    const midRunContinue =
      schedulePhase === 'continue' && runLenR >= 3 && offsetInRun > 0 && offsetInRun < runLenR - 1;
    if (phraseEnd && !nextInLine) {
      out.set(bar, u < 0.82 ? 'whole' : 'halfBack');
    } else if (prevInLine) {
      if (midRunContinue) {
        /** Harmonic commitment: interior of a run favours motion (halfBack / delayed3) over static wholes. */
        if (microContrastC && u < 0.32) {
          out.set(bar, 'delayed3');
        } else if (u < 0.4) {
          out.set(bar, 'whole');
        } else if (u < 0.74) {
          out.set(bar, 'halfBack');
        } else {
          out.set(bar, 'delayed3');
        }
      } else if (microContrastC && u < 0.32) {
        out.set(bar, 'delayed3');
      } else if (u < 0.92) {
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
  applyConversationalVoice2Rhythms(guitar, effectiveBars, seed, tb, phaseByBar, out);
  applySustainStreakBreaker(guitar, effectiveBars, tb, out);
  applyPhraseRhythmMinimums(guitar, effectiveBars, seed, tb, out);
  applyPhraseCoSkeletonRhythms(guitar, effectiveBars, seed, tb, phaseByBar, coPlan, out);
  applyPhraseRoleVoice2Rhythms(guitar, effectiveBars, phraseV2Plans, phaseByBar, tb, out);
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

const INTERNAL_MOTION_MAX_STEP_SEMITONES = 4;
/** Phase 18.2E — lyrical mini-line: max leap between consecutive inner notes (perfect 5th). */
const SINGING_LINE_MAX_STEP_SEMITONES = 7;
/** Phase 18.2B.8 — Intentional motion: majority of eligible long spans get micro-line (still one bar, same total duration). */
const INTERNAL_MOTION_SEED_GATE = 7400;

/** Phase 18.2E — pattern flavour for 3-note mini-lines (inner string voice). */
type SingingLinePattern = 'stepwise' | 'neighbour' | 'approach' | 'guide_tone';

function selectSingingLinePattern(seed: number, bar: number): SingingLinePattern {
  const u = seededUnit(seed, bar, 7430);
  if (u < 0.28) return 'stepwise';
  if (u < 0.52) return 'neighbour';
  if (u < 0.76) return 'approach';
  return 'guide_tone';
}

/**
 * Phase 18.2B.4 + 18.2B.7 — One step inside a sustain: chord tones (3rd/7th first), neighbours, chromatic approach, enclosure tones toward next anchor.
 */
function pickChordToneStepToward(
  prevPitch: number,
  destPitch: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  salt: number,
  isLastStep: boolean,
  maxStepSemitones: number = INTERNAL_MOTION_MAX_STEP_SEMITONES
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) return prevPitch;
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const thirdPc = ((tones.third % 12) + 12) % 12;
  const seventhPc = ((tones.seventh % 12) + 12) % 12;

  const candidates: number[] = [];
  const tryAdd = (raw: number) => {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) return;
    const step = Math.abs(p - prevPitch);
    if (step > maxStepSemitones || step < 1) return;
    candidates.push(p);
  };

  tryAdd(tones.third);
  tryAdd(tones.seventh);
  tryAdd(tones.fifth);
  tryAdd(tones.root);
  for (let d = -2; d <= 2; d++) {
    if (d === 0) continue;
    tryAdd(prevPitch + d);
  }
  tryAdd(destPitch - 1);
  tryAdd(destPitch + 1);
  tryAdd(destPitch - 2);
  tryAdd(destPitch + 2);
  if (isLastStep) {
    tryAdd(destPitch);
  }

  const uniq = [...new Set(candidates)];
  let best: number | undefined;
  let bd = 999;
  for (const p of uniq) {
    const step = Math.abs(p - prevPitch);
    const pc = ((p % 12) + 12) % 12;
    let guideBonus = 0;
    if (pc === thirdPc || pc === seventhPc) {
      guideBonus = isLastStep ? -1.45 : -1.05;
    }
    const score =
      Math.abs(p - destPitch) * (isLastStep ? 0.52 : 0.58) +
      step * (isLastStep ? 0.22 : 0.26) +
      guideBonus +
      seededUnit(seed, bar, salt) * (isLastStep ? 0.03 : 0.07);
    if (score < bd) {
      bd = score;
      best = p;
    }
  }
  if (best !== undefined) return best;
  const sign = destPitch >= prevPitch ? 1 : -1;
  const delta = Math.min(2, Math.abs(destPitch - prevPitch));
  const np = prevPitch + sign * Math.max(1, Math.min(delta, maxStepSemitones));
  return clampPitch(np, floorMidi, innerHigh);
}

/**
 * Phase 18.2E — middle pitch of a 3-note mini-line (motion-first); keeps leaps within maxStep.
 */
function pickSingingMiddlePitch(
  prevPitch: number,
  destPitch: number,
  waypoint: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  pattern: SingingLinePattern,
  maxStep: number
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) {
    return pickChordToneStepToward(prevPitch, waypoint, chord, strictCeiling, context, seed, bar, 7505, false, maxStep);
  }
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const tryPitch = (raw: number): number | undefined => {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) return undefined;
    const step = Math.abs(p - prevPitch);
    if (step > maxStep || step < 1) return undefined;
    return p;
  };

  switch (pattern) {
    case 'neighbour': {
      const towardDest = destPitch >= prevPitch ? 1 : -1;
      const n1 = tryPitch(prevPitch + towardDest);
      const n2 = tryPitch(prevPitch - towardDest);
      const pick =
        n1 !== undefined && n2 !== undefined
          ? Math.abs(n1 - destPitch) <= Math.abs(n2 - destPitch)
            ? n1
            : n2
          : n1 ?? n2;
      if (pick !== undefined) return pick;
      break;
    }
    case 'approach': {
      const sign = destPitch >= prevPitch ? -1 : 1;
      const a1 = tryPitch(destPitch + sign);
      const a2 = tryPitch(destPitch + sign * 2);
      if (a1 !== undefined) return a1;
      if (a2 !== undefined) return a2;
      break;
    }
    case 'guide_tone': {
      const g3 = tryPitch(tones.third);
      const g7 = tryPitch(tones.seventh);
      const mid = (prevPitch + destPitch) / 2;
      const opts = [g3, g7].filter((x): x is number => x !== undefined);
      let best: number | undefined;
      let bd = 999;
      for (const p of opts) {
        const d = Math.abs(p - mid);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (best !== undefined) return best;
      break;
    }
    case 'stepwise':
    default:
      break;
  }
  return pickChordToneStepToward(prevPitch, waypoint, chord, strictCeiling, context, seed, bar, 7505, false, maxStep);
}

type BuildInternalLineOpts = {
  /** When set with segmentCount 3, shapes the middle pitch (18.2E singing line). */
  singingPattern?: SingingLinePattern | null;
  maxStepSemitones?: number;
};

function buildSlowInternalLinePitches(
  startPitch: number,
  destPitch: number,
  segmentCount: number,
  segmentCeilings: number[],
  chord: string,
  context: CompositionContext,
  seed: number,
  bar: number,
  opts?: BuildInternalLineOpts
): number[] {
  const maxStep = opts?.maxStepSemitones ?? INTERNAL_MOTION_MAX_STEP_SEMITONES;
  const pat = opts?.singingPattern ?? null;
  const out: number[] = [startPitch];
  let prev = startPitch;
  for (let i = 1; i < segmentCount; i++) {
    const ceil = segmentCeilings[i] ?? segmentCeilings[segmentCeilings.length - 1]!;
    const t = segmentCount <= 1 ? 1 : i / (segmentCount - 1);
    /** Target-to-target: interpolate toward harmonic anchor; final step aims at run destination. */
    const waypoint = Math.round(startPitch + (destPitch - startPitch) * t);
    const isLast = i === segmentCount - 1;
    let next: number;
    if (segmentCount === 3 && i === 1 && pat !== null && pat !== undefined) {
      next = pickSingingMiddlePitch(prev, destPitch, waypoint, chord, ceil, context, seed, bar, pat, maxStep);
    } else {
      next = pickChordToneStepToward(
        prev,
        isLast ? destPitch : waypoint,
        chord,
        ceil,
        context,
        seed,
        bar,
        7405 + i * 17,
        isLast,
        maxStep
      );
    }
    out.push(next);
    prev = next;
  }
  return out;
}

/**
 * Phase 18.2B.7–18.2B.8 + 18.3A — Replace one long V2 sustain with 2–4 notes (same total duration): connected micro-line inside the span.
 * Validates duo rules before commit.
 */
function applyVoice2InternalMotionShaping(
  m: MeasureModel,
  v1notes: NoteEvent[],
  chord: string,
  context: CompositionContext,
  seed: number,
  bar: number,
  harmonicDest: number,
  /** Only resolve schedule: keep single sustained arrival (cadence clarity). */
  phraseCommitBar: boolean,
  /** Last bars of run: weight longer terminal note so arrival is perceptible. */
  preferTerminalSustain: boolean,
  /** Phase 18.2E — phrase still lacks a motion segment: always attempt micro-line when eligible. */
  forcePhraseMotion = false,
  /** Phase 18.2E — motion-first lyrical mini-line (lower gate, 3-note bias, pattern-shaped middle). */
  preferSingingMiniLine = false,
  /** Phase 18.3A — phrase co-plan: V2 anchor bar → always attempt mini-line when eligible (not passive sustain). */
  forceV2PhraseAnchor = false,
  /** Phase 18.3A — bar in phrase activity window: structural Voice-2 presence + line ownership. */
  inPhraseActivityBar = false,
  phraseRoleForBar: Voice2PhraseRole | null = null
): void {
  if (phraseCommitBar) return;
  const lyricalBoost = preferSingingMiniLine || forceV2PhraseAnchor || inPhraseActivityBar;
  /** ~62% gate by default; singing / forced phrase / V2 anchor / activity window passes more often (motion-first). */
  const motionGate =
    forcePhraseMotion || forceV2PhraseAnchor || inPhraseActivityBar
      ? 1
      : preferSingingMiniLine
        ? 0.28
        : 0.62;
  if (seededUnit(seed, bar, INTERNAL_MOTION_SEED_GATE) > motionGate) return;

  const v2only = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
  if (v2only.length !== 1) return;

  const n = v2only[0]!;
  const t0 = n.startBeat;
  const dur = n.duration;
  const t1 = t0 + dur;
  const overlapV1 = countV1NotesOverlappingSpan(v1notes, t0, t1);
  const attacksInSpan = countV1AttackOnsetsInSpan(v1notes, t0, t1);
  const longEnough =
    dur >= 2 - 1e-6 ||
    (dur >= 1.5 - 1e-6 && overlapV1 >= 2) ||
    (dur >= 1.5 - 1e-6 && attacksInSpan >= 2);
  if (!longEnough || dur < 1.5 - 1e-6) return;

  let segmentCount: 2 | 3 | 4;
  if (dur >= 4 - 1e-6) {
    if (lyricalBoost && !preferTerminalSustain) {
      if (
        inPhraseActivityBar &&
        phraseRoleForBar === 'counter' &&
        seededUnit(seed, bar, 7401) < 0.38
      ) {
        segmentCount = 4;
      } else {
        segmentCount = seededUnit(seed, bar, 7401) < 0.82 ? 3 : 2;
      }
    } else {
      segmentCount = seededUnit(seed, bar, 7401) < 0.58 ? 2 : 3;
    }
  } else if (dur >= 3 - 1e-6) {
    segmentCount = 2;
  } else if (dur >= 2 - 1e-6) {
    segmentCount = 2;
  } else {
    segmentCount = 2;
  }

  const durs: number[] = [];
  if (Math.abs(dur - 4) < 1e-6) {
    if (segmentCount === 4) {
      const u = seededUnit(seed, bar, 7440);
      if (u < 0.33) durs.push(0.5, 0.5, 1.5, 1.5);
      else if (u < 0.66) durs.push(0.5, 1, 1, 1.5);
      else durs.push(0.5, 1.25, 1.25, 1);
    } else if (segmentCount === 2) {
      const u = seededUnit(seed, bar, 7402);
      if (preferTerminalSustain) {
        /** Arrival emphasis: longer last segment (perceptible landing on harmonic anchor). */
        if (u < 0.62) durs.push(1.25, 2.75);
        else if (u < 0.88) durs.push(1.5, 2.5);
        else durs.push(2, 2);
      } else if (u < 0.52) {
        durs.push(2, 2);
      } else if (u < 0.78) {
        durs.push(1.5, 2.5);
      } else {
        durs.push(2.5, 1.5);
      }
    } else {
      const u = seededUnit(seed, bar, 7403);
      if (preferTerminalSustain) {
        if (u < 0.55) durs.push(1.25, 1.25, 1.5);
        else if (u < 0.82) durs.push(1, 1.5, 1.5);
        else durs.push(1.5, 1, 1.5);
      } else if (lyricalBoost) {
        const u2 = seededUnit(seed, bar, 7435);
        if (u2 < 0.34) durs.push(0.5, 1.25, 2.25);
        else if (u2 < 0.67) durs.push(0.5, 1.5, 2);
        else durs.push(0.75, 1.25, 2);
      } else if (u < 0.42) {
        durs.push(2, 1, 1);
      } else if (u < 0.74) {
        durs.push(1, 2, 1);
      } else {
        durs.push(1.5, 1.5, 1);
      }
    }
  } else if (Math.abs(dur - 3) < 1e-6) {
    const u = seededUnit(seed, bar, 7404);
    if (preferTerminalSustain && u < 0.72) {
      durs.push(1, 2);
    } else if (lyricalBoost && !preferTerminalSustain && seededUnit(seed, bar, 7436) < 0.55) {
      durs.push(0.5, 2.5);
    } else if (u < 0.62) {
      durs.push(1.5, 1.5);
    } else {
      durs.push(2, 1);
    }
  } else if (Math.abs(dur - 2) < 1e-6) {
    durs.push(1, 1);
  } else {
    durs.push(dur / 2, dur / 2);
  }

  if (durs.length < 2 || durs.length > 4) return;
  const sum = durs.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - dur) > 0.02) return;

  const segmentCeilings: number[] = [];
  let bt = t0;
  for (let i = 0; i < durs.length; i++) {
    const d = durs[i]!;
    const segT1 = bt + d;
    const minV = minOverlappingV1Pitch(v1notes, bt, segT1);
    if (minV === undefined) return;
    segmentCeilings.push(strictCeilingFromMinV1(minV));
    bt = segT1;
  }

  const buildOpts: BuildInternalLineOpts | undefined = lyricalBoost
    ? {
        singingPattern: durs.length === 3 ? selectSingingLinePattern(seed, bar) : null,
        maxStepSemitones: SINGING_LINE_MAX_STEP_SEMITONES,
      }
    : undefined;
  const pitches = buildSlowInternalLinePitches(
    n.pitch,
    harmonicDest,
    durs.length,
    segmentCeilings,
    chord,
    context,
    seed,
    bar,
    buildOpts
  );
  if (pitches.length !== durs.length) return;

  const backup = m.events.map((e) => ({ ...e }));
  m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);

  let beat = t0;
  for (let i = 0; i < durs.length; i++) {
    addEvent(m, createNote(pitches[i]!, beat, durs[i]!, V2_VOICE));
    beat += durs[i]!;
  }
  m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);

  const v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
  const v2sum = v2r.reduce((s, x) => s + x.duration, 0);
  const ok =
    Math.abs(v2sum - 4) < 0.001 &&
    voice2StrictlyBelowOverlappingV1(v1notes, v2r) &&
    !v2SharesAttackWithV1(v1notes, v2r) &&
    maxSimultaneousGuitarNotes(m) <= MAX_GUITAR_SIMULT &&
    (v1notes.length < 2 || v2PassesMelodyOverlapRule(v1notes, v2r)) &&
    !(v2r.length >= 2 && innerContourExactParallel(v1notes, v2r));

  if (!ok) {
    m.events = backup;
  }
}

/** Phase 18.2B.5 — Progress along committed anchor chain: linear + quadratic blend so mid-run has clearer intent. */
function phraseIntentionProgress01(barOffset: number, runLen: number): number {
  if (runLen <= 1) return 1;
  const t = barOffset / (runLen - 1);
  return 0.55 * t + 0.45 * t * t;
}

/**
 * Harmonic destination at run end (future bar), in register under that bar’s melody — for phrase planning only.
 */
function computePhraseHarmonicTargetMidiAtRunEnd(
  guitar: PartModel,
  runEndBar: number,
  context: CompositionContext,
  seed: number
): number | null {
  const mEnd = guitar.measures.find((x) => x.index === runEndBar);
  if (!mEnd) return null;
  const chordEnd = mEnd.chord ?? 'Cmaj9';
  const v1End = mEnd.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  if (v1End.length === 0) return null;
  const cEnd = minOverlappingV1Pitch(v1End, 0, 4);
  if (cEnd === undefined) return null;
  const strictEnd = strictCeilingFromMinV1(cEnd);
  const innerHighEnd = Math.min(63, strictEnd - 1);
  const floorMidi = INNER_LOW;
  if (innerHighEnd < floorMidi) return null;
  if (runEndBar % 4 === 0) {
    const t = strongPhraseEndTargetPitch(chordEnd, strictEnd, INNER_LOW, innerHighEnd, 0, context, runEndBar);
    if (t !== null) return t;
  }
  const tonesEnd = guitarChordTonesInRange(chordEnd, floorMidi, innerHighEnd, chordOpts(context));
  const preferThird = seededUnit(seed, runEndBar, 7301) < 0.55;
  const raw = preferThird ? tonesEnd.third : tonesEnd.seventh;
  return placeStrictlyBelowCeiling(strictEnd, raw, floorMidi);
}

function snapPhraseIntentIdealToChordTone(
  ideal: number,
  arrivalTarget: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  isArrivalBar: boolean
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) return placeStrictlyBelowCeiling(strictCeiling, ideal, floorMidi);
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  const aim = isArrivalBar ? arrivalTarget : ideal;
  let best: number | undefined;
  let bd = 999;
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) continue;
    const d = Math.abs(p - aim);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best ?? placeStrictlyBelowCeiling(strictCeiling, ideal, floorMidi);
}

function computePhraseEntryIntentMidi(
  guitar: PartModel,
  runStartBar: number,
  targetEndMidi: number,
  chord: string,
  context: CompositionContext,
  seed: number,
  contour: 'up' | 'down' | 'flat'
): number | null {
  const m = guitar.measures.find((x) => x.index === runStartBar);
  if (!m) return null;
  const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  if (v1.length === 0) return null;
  const cFull = minOverlappingV1Pitch(v1, 0, 4);
  if (cFull === undefined) return null;
  const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, runStartBar, 1, contour);
  if (!pair) return null;
  const dP = Math.abs(pair.primary - targetEndMidi);
  const dS = Math.abs(pair.secondary - targetEndMidi);
  if (dP >= 3 && dP <= 10) return pair.primary;
  if (dS >= 3 && dS <= 10) return pair.secondary;
  return seededUnit(seed, runStartBar, 7510) < 0.55 ? pair.primary : pair.secondary;
}

/**
 * Phase 18.2B.5 — Per-bar intended pitch along entry → run-end target (future harmony), with arrival snap on last bar.
 */
function buildPhraseIntentionWaypoints(
  guitar: PartModel,
  effectiveBars: Set<number>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  context: CompositionContext,
  seed: number,
  tb: number
): Map<number, number> {
  const out = new Map<number, number>();
  const seen = new Set<string>();
  for (const bar of [...effectiveBars].sort((a, b) => a - b)) {
    const info = phaseByBar.get(bar);
    if (!info) continue;
    const key = `${info.runStartBar}-${info.runEndBar}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const runStart = info.runStartBar;
    const runEnd = info.runEndBar;
    if (runStart < 1 || runEnd > tb) continue;
    const runLen = runEnd - runStart + 1;
    const targetEnd = computePhraseHarmonicTargetMidiAtRunEnd(guitar, runEnd, context, seed);
    if (targetEnd === null) continue;
    const mStart = guitar.measures.find((x) => x.index === runStart);
    if (!mStart) continue;
    const chordS = mStart.chord ?? 'Cmaj9';
    const v1s = mStart.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1s.length === 0) continue;
    const contour = v1MelodyContour(v1s);
    const entryMidi = computePhraseEntryIntentMidi(guitar, runStart, targetEnd, chordS, context, seed, contour);
    if (entryMidi === null) continue;
    for (let bi = 0; bi < runLen; bi++) {
      const b = runStart + bi;
      const mb = guitar.measures.find((x) => x.index === b);
      if (!mb) continue;
      const chordB = mb.chord ?? chordS;
      const v1b = mb.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
      if (v1b.length === 0) continue;
      const cFb = minOverlappingV1Pitch(v1b, 0, 4);
      if (cFb === undefined) continue;
      const ceilB = strictCeilingFromMinV1(cFb);
      const progress = phraseIntentionProgress01(bi, runLen);
      const ideal = Math.round(entryMidi + (targetEnd - entryMidi) * progress);
      const isArrival = bi === runLen - 1;
      const snapped = snapPhraseIntentIdealToChordTone(ideal, targetEnd, chordB, ceilB, context, isArrival);
      out.set(b, snapped);
    }
  }
  return out;
}

/**
 * Phase 18.2B.4 — One frozen arrival pitch per continuity run (waypoint at run end or harmonic target).
 */
function buildFrozenRunEndMap(
  guitar: PartModel,
  effectiveBars: Set<number>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  phraseWaypoints: Map<number, number>,
  context: CompositionContext,
  seed: number,
  tb: number
): Map<string, number> {
  const out = new Map<string, number>();
  const seen = new Set<string>();
  for (const bar of [...effectiveBars].sort((a, b) => a - b)) {
    const info = phaseByBar.get(bar);
    if (!info) continue;
    const key = `${info.runStartBar}-${info.runEndBar}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const runEnd = info.runEndBar;
    if (runEnd < 1 || runEnd > tb) continue; // bounds guard
    const wpEnd = phraseWaypoints.get(runEnd);
    if (wpEnd !== undefined) {
      out.set(key, wpEnd);
      continue;
    }
    const t = computePhraseHarmonicTargetMidiAtRunEnd(guitar, runEnd, context, seed);
    if (t !== null) out.set(key, t);
  }
  return out;
}

/**
 * Phase 18.2B.4 — Blend per-bar waypoint with 1–2 bar lookahead and run arrival so motion stays phrase-directed.
 */
function blendDirectionalIntent(
  barWaypoint: number,
  lookaheadMidi: number,
  runEndMidi: number,
  offsetInRun: number,
  runLen: number
): number {
  if (runLen <= 1) return barWaypoint;
  const t = offsetInRun / Math.max(1, runLen - 1);
  const horizon = 0.52 * lookaheadMidi + 0.48 * runEndMidi;
  return Math.round(barWaypoint * (1 - 0.35 * t) + horizon * (0.35 * t));
}

/**
 * Phase 18.2B — Wyble inner voice injection (reactive path; Phase 18.3B planner bypassed for pipeline stability).
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
  const phraseV2Plans = buildPhraseVoice2Plans(tb, seed);
  const { effective: effectiveBars, phaseByBar } = buildVoice2ContinuationSchedule(tb, seed, activeSet);
  const barRhythms = planVoice2BarRhythms(guitar, effectiveBars, seed, tb, phaseByBar, phraseV2Plans);
  const phraseWaypoints = buildPhraseIntentionWaypoints(guitar, effectiveBars, phaseByBar, context, seed, tb);
  const frozenRunEndMap = buildFrozenRunEndMap(guitar, effectiveBars, phaseByBar, phraseWaypoints, context, seed, tb);
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
    const runLen = runInfo.runEndBar - runInfo.runStartBar + 1;
    const offsetInRun = bar - runInfo.runStartBar;
    const progressInRun = runLen <= 1 ? 1 : offsetInRun / (runLen - 1);
    const sc = strictCeilingFromMinV1(cFull);
    const phraseIntent = phraseWaypoints.get(bar);
    const runKey = `${runInfo.runStartBar}-${runInfo.runEndBar}`;
    const frozenRunEnd = frozenRunEndMap.get(runKey);
    const runDestinationPlacedFallback = computeRunDestinationPlacedForBar(
      guitar,
      runInfo.runEndBar,
      context,
      seed,
      chord,
      sc,
      bar
    );
    const runDestinationPlaced =
      phraseIntent !== undefined ? phraseIntent : runDestinationPlacedFallback;
    const lookaheadBar = Math.min(bar + 2, runInfo.runEndBar);
    const lookaheadMidi =
      phraseWaypoints.get(lookaheadBar) ??
      phraseWaypoints.get(Math.min(bar + 1, runInfo.runEndBar)) ??
      phraseIntent ??
      frozenRunEnd ??
      runDestinationPlacedFallback;
    const frozenArrival = frozenRunEnd ?? phraseWaypoints.get(runInfo.runEndBar) ?? runDestinationPlacedFallback;
    const movementTargetPitch =
      phraseIntent !== undefined
        ? blendDirectionalIntent(phraseIntent, lookaheadMidi, frozenArrival, offsetInRun, runLen)
        : blendMovementTargetForBar(
            chord,
            sc,
            context,
            seed,
            bar,
            offsetInRun,
            runLen,
            frozenArrival
          );
    const behaviour = deriveBehaviourPhase(
      runInfo.schedulePhase,
      anchorMidi,
      movementTargetPitch,
      seed,
      bar,
      frozenArrival
    );
    voice2State = {
      active: true,
      currentPitch: anchorMidi,
      targetPitch: movementTargetPitch,
      remainingDuration: Math.max(0, runInfo.runEndBar - bar),
      phase: behaviour,
      directionalRunEndMidi: frozenArrival,
      committedPhraseTargetMidi: frozenArrival,
      lookaheadTargetMidi: lookaheadMidi,
      barsRemainingInRun: runInfo.runEndBar - bar,
    };

    const cHalfBack = minOverlappingV1Pitch(v1notes, 2, 4);
    const rhythm = barRhythms.get(bar) ?? 'whole';
    /** Phase 18.2B.5 — fail-safe: long whole-bar hold while still far from frozen arrival → split into motion rhythm. */
    let rhythmUse: Voice2RhythmKind = rhythm;
    if (
      runInfo.schedulePhase === 'continue' &&
      anchorMidi !== null &&
      Math.abs(anchorMidi - frozenArrival) > V2_COMMITMENT_FAR_HOLD_SEMITONES &&
      rhythmUse === 'whole'
    ) {
      rhythmUse = seededUnit(seed, bar, 1828) < 0.55 ? 'halfBack' : 'delayed3';
    }

    /**
     * Phase 18.2B.5: rhythm from phrase plan (continuity → whole; entry → delayed / half / off-beat).
     * Pitch from anchor chain (primary/secondary) for horizontal line.
     */
    if (rhythmUse === 'whole') {
      if (cFull === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 1, contour);
      if (!pair) continue;
      if (!melodyAttacksBeatZero(v1notes)) {
        const p = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          pair.primary,
          pair.secondary,
          chord,
          strictCeilingFromMinV1(cFull),
          context,
          seed,
          bar,
          frozenArrival
        );
        addEvent(m, createNote(p, 0, 4, V2_VOICE));
      } else {
        const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
        const pairLate = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 41, contour);
        if (!pairLate) continue;
        const pL = pickVoice2PitchForBehaviour(
          behaviour,
          anchorMidi,
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          pairLate.primary,
          pairLate.secondary,
          chord,
          strictCeilingFromMinV1(cLate),
          context,
          seed,
          bar,
          frozenArrival
        );
        addEvent(m, createRest(0, 1, V2_VOICE));
        addEvent(m, createNote(pL, 1, 3, V2_VOICE));
      }
    } else if (rhythmUse === 'delayed3') {
      if (cFull === undefined) continue;
      const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
      const pairLate = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 41, contour);
      if (!pairLate) continue;
      const pL = pickVoice2PitchForBehaviour(
        behaviour,
        anchorMidi,
        movementTargetPitch,
        runDestinationPlaced,
        progressInRun,
        pairLate.primary,
        pairLate.secondary,
        chord,
        strictCeilingFromMinV1(cLate),
        context,
        seed,
        bar,
        frozenArrival
      );
      addEvent(m, createRest(0, 1, V2_VOICE));
      addEvent(m, createNote(pL, 1, 3, V2_VOICE));
    } else if (rhythmUse === 'halfBack') {
      if (cHalfBack === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cHalfBack, chord, context, seed, bar, 0, contour);
      if (!pair) continue;
      const p = pickVoice2PitchForBehaviour(
        behaviour,
        anchorMidi,
        movementTargetPitch,
        runDestinationPlaced,
        progressInRun,
        pair.primary,
        pair.secondary,
        chord,
        strictCeilingFromMinV1(cHalfBack),
        context,
        seed,
        bar,
        frozenArrival
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
        movementTargetPitch,
        runDestinationPlaced,
        progressInRun,
        pair.primary,
        pair.secondary,
        chord,
        strictCeilingFromMinV1(cFull),
        context,
        seed,
        bar,
        frozenArrival
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
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          pairL.primary,
          pairL.secondary,
          chord,
          strictCeilingFromMinV1(cLate),
          context,
          seed,
          bar,
          frozenArrival
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
        movementTargetPitch,
        runDestinationPlaced,
        progressInRun,
        pairH.primary,
        pairH.secondary,
        chord,
        strictCeilingFromMinV1(cHalfBack),
        context,
        seed,
        bar,
        frozenArrival
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
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          pairQ.primary,
          pairQ.secondary,
          chord,
          strictCeilingFromMinV1(cFull),
          context,
          seed,
          bar,
          frozenArrival
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
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          pairW.primary,
          pairW.secondary,
          chord,
          strictCeilingFromMinV1(cFull),
          context,
          seed,
          bar,
          frozenArrival
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
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          pairL.primary,
          pairL.secondary,
          chord,
          strictCeilingFromMinV1(cL),
          context,
          seed,
          bar,
          frozenArrival
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
            movementTargetPitch,
            runDestinationPlaced,
            progressInRun,
            pairFb.primary,
            pairFb.secondary,
            chord,
            strictCeilingFromMinV1(cFb),
            context,
            seed,
            bar,
            frozenArrival
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
              movementTargetPitch,
              runDestinationPlaced,
              progressInRun,
              pairOv.primary,
              pairOv.secondary,
              chord,
              strictCeilingFromMinV1(cFull),
              context,
              seed,
              bar,
              frozenArrival
            );
            addEvent(m, createNote(pOv, 0, 4, V2_VOICE));
          } else {
            const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
            const pairL = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 89, contour);
            if (pairL) {
              const pLo = pickVoice2PitchForBehaviour(
                behaviour,
                anchorMidi,
                movementTargetPitch,
                runDestinationPlaced,
                progressInRun,
                pairL.primary,
                pairL.secondary,
                chord,
                strictCeilingFromMinV1(cLate),
                context,
                seed,
                bar,
                frozenArrival
              );
              addEvent(m, createRest(0, 1, V2_VOICE));
              addEvent(m, createNote(pLo, 1, 3, V2_VOICE));
            } else {
              const pairL2 = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 90, contour);
              if (pairL2) {
                const pL2 = pickVoice2PitchForBehaviour(
                  behaviour,
                  anchorMidi,
                  movementTargetPitch,
                  runDestinationPlaced,
                  progressInRun,
                  pairL2.primary,
                  pairL2.secondary,
                  chord,
                  strictCeilingFromMinV1(cFull),
                  context,
                  seed,
                  bar,
                  frozenArrival
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

    const preferTerminalSustain =
      runLen >= 2 && offsetInRun >= runLen - 2 && runInfo.schedulePhase !== 'resolve';
    const phraseCommitBar = runInfo.schedulePhase === 'resolve';
    const harmonicDestForMotion =
      phraseWaypoints.get(runInfo.runEndBar) ?? frozenArrival ?? runDestinationPlacedFallback;
    applyVoice2InternalMotionShaping(
      m,
      v1notes,
      chord,
      context,
      seed,
      bar,
      harmonicDestForMotion,
      phraseCommitBar,
      preferTerminalSustain
    );

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

/**
 * Phase 18.2B.5 — Arrival must read as chord-tone landing, stepwise resolution, or short approach onto a chord tone.
 */
function isArrivalResolutionStrong(
  anchorMidi: number | null,
  arrival: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext
): boolean {
  if (anchorMidi === null) return true;
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) return true;
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  const arPc = ((arrival % 12) + 12) % 12;
  const isChordTone = pool.some((raw) => {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    return ((p % 12) + 12) % 12 === arPc;
  });
  const stepwise = Math.abs(arrival - anchorMidi) >= 1 && Math.abs(arrival - anchorMidi) <= 2;
  const enclosure = isChordTone && Math.abs(arrival - anchorMidi) >= 1 && Math.abs(arrival - anchorMidi) <= 2;
  return isChordTone || stepwise || enclosure;
}

/**
 * Phase 18.2B.6 — Resolve behaviour: commit to run destination when anchor law allows; else 3rd/7th/tension from strong pool.
 * Phase 18.2B.5 — weak arrivals are replaced with a validated chord-tone or stepwise alternative when anchor law allows.
 */
function pickStrongPhraseEndArrivalPitch(
  anchorMidi: number | null,
  committedTarget: number,
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
  if (innerHigh < floorMidi) return committedTarget;

  if (anchorMidi !== null && Math.abs(committedTarget - anchorMidi) <= V2_ANCHOR_MAX_STEP_SEMITONES + 0.01) {
    return committedTarget;
  }

  const strong = strongPhraseEndTargetPitch(
    chord,
    strictCeiling,
    floorMidi,
    innerHigh,
    anchorMidi ?? committedTarget,
    context,
    bar
  );
  if (strong !== null) {
    const p = placeStrictlyBelowCeiling(strictCeiling, strong, floorMidi);
    if (anchorMidi === null || Math.abs(p - anchorMidi) <= V2_ANCHOR_MAX_STEP_SEMITONES + 0.01) {
      return p;
    }
  }

  const a = pickVoice2PitchFromAnchor(anchorMidi, primary, secondary, seed, bar);
  const cands = [primary, secondary, a];
  let best = a;
  let bd = Math.abs(a - committedTarget);
  for (const c of cands) {
    if (anchorMidi !== null && Math.abs(c - anchorMidi) > V2_ANCHOR_MAX_STEP_SEMITONES + 0.01) continue;
    const d = Math.abs(c - committedTarget);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }

  if (anchorMidi !== null && !isArrivalResolutionStrong(anchorMidi, best, chord, strictCeiling, context)) {
    const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
    const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
    let bestAlt: number | undefined;
    let bdAlt = 999;
    for (const raw of pool) {
      const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
      if (p >= strictCeiling || p < floorMidi) continue;
      if (anchorMidi !== null && Math.abs(p - anchorMidi) > V2_ANCHOR_MAX_STEP_SEMITONES + 0.01) continue;
      if (!isArrivalResolutionStrong(anchorMidi, p, chord, strictCeiling, context)) continue;
      const d = Math.abs(p - committedTarget);
      if (d < bdAlt) {
        bdAlt = d;
        bestAlt = p;
      }
    }
    if (bestAlt !== undefined) return bestAlt;

    const sign = Math.sign(committedTarget - anchorMidi) || 1;
    for (const step of [1, 2] as const) {
      const raw = anchorMidi + sign * step;
      const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
      if (p >= strictCeiling || p < floorMidi) continue;
      if (Math.abs(p - anchorMidi) > V2_ANCHOR_MAX_STEP_SEMITONES + 0.01) continue;
      if (isArrivalResolutionStrong(anchorMidi, p, chord, strictCeiling, context)) return p;
    }
  }

  return best;
}

/**
 * Phase 18.2B.4 — Harmonic destination for the continuity window (run end chord), expressed under the *current* bar ceiling.
 */
function computeRunDestinationPlacedForBar(
  guitar: PartModel,
  runEndBar: number,
  context: CompositionContext,
  seed: number,
  currentChord: string,
  currentStrictCeiling: number,
  currentBar: number
): number {
  const mEnd = guitar.measures.find((x) => x.index === runEndBar);
  const chordEnd = mEnd?.chord ?? currentChord;
  const v1End = mEnd
    ? (mEnd.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[])
    : [];
  const cEnd = v1End.length ? minOverlappingV1Pitch(v1End, 0, 4) : undefined;
  const floorMidi = INNER_LOW;
  if (cEnd === undefined) {
    return computeTargetGuidePitch(currentChord, currentStrictCeiling, context, seed, currentBar, 0);
  }
  const strictEnd = strictCeilingFromMinV1(cEnd);
  const innerHighEnd = Math.min(63, strictEnd - 1);
  if (innerHighEnd < floorMidi) {
    return placeStrictlyBelowCeiling(currentStrictCeiling, 60, floorMidi);
  }
  const phraseEnd = runEndBar % 4 === 0;
  if (phraseEnd) {
    const t = strongPhraseEndTargetPitch(chordEnd, strictEnd, INNER_LOW, innerHighEnd, 0, context, runEndBar);
    if (t !== null) {
      return placeStrictlyBelowCeiling(currentStrictCeiling, t, floorMidi);
    }
  }
  const tonesEnd = guitarChordTonesInRange(chordEnd, floorMidi, innerHighEnd, chordOpts(context));
  const preferThird = seededUnit(seed, runEndBar, 7301) < 0.55;
  const raw = preferThird ? tonesEnd.third : tonesEnd.seventh;
  return placeStrictlyBelowCeiling(currentStrictCeiling, raw, floorMidi);
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
