# Voice 2 System — External Reviewer Snapshot

_Generated for repository: creative-engines. Section 2 embeds full file contents as requested._

## SECTION 1: FILE INVENTORY

### Core Voice 2 / Wyble implementation
- `engines/composer-os-v2/core/goldenPath/guitarVoice2WybleLayer.ts` — main Voice 2 inject + stabilisation + Phase 18.2B.5 normalization
- `engines/composer-os-v2/core/goldenPath/guitarVoice2PolyphonyDiagnostics.ts` — V2 metrics + VOICE 2 DIAGNOSTIC console block
- `engines/composer-os-v2/core/goldenPath/phaseAGuitarPolyphonyProbe.ts` — calls inject + stabilise 18.2B.1–3 + diagnostics
- `engines/composer-os-v2/core/goldenPath/Voice2LineGenerator.ts` — exists (planner/generator path)
- `engines/composer-os-v2/core/goldenPath/Voice2PhrasePlanner.ts` — exists
- `engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts` — imports Wyble exports
- `engines/composer-os-v2/core/goldenPath/ecmShapingPass.ts` — imports Wyble register / strip helpers
- `engines/composer-os-v2/core/compositionContext.ts` — voice2PolyphonyDiagnostics on metadata
- `engines/composer-os-v2/tests/guitarBassDuoWybleVoice2.test.ts` — tests

### Validation / interaction (keywords)
- `engines/composer-os-v2/core/score-integrity/duoLockQuality.ts` — validateDuoInteractionAuthorityGate, wall-to-wall, maxConsecutiveNoteHeavyBars
- `engines/composer-os-v2/core/style-modules/barry-harris/moduleValidation.ts` — validateBarryHarrisConformance, voice-leading jump message

### Docs
- `CHANGELOG.md` (repo root)
- `docs/CHANGELOG.md` (secondary)
- `README.md` (repo root)
- `engines/composer-os-v2/README.md` (module-level)

### Direct imports of guitarVoice2WybleLayer.ts (dependency files)
- `engines/composer-os-v2/core/compositionContext.ts` (type only)
- `engines/composer-os-v2/core/presets/guitarBassDuoPresetIds.ts`
- `engines/composer-os-v2/core/score-model/scoreModelTypes.ts`
- `engines/composer-os-v2/core/score-model/scoreEventBuilder.ts`
- `engines/composer-os-v2/core/harmony/chordSymbolAnalysis.ts`
- `engines/composer-os-v2/core/goldenPath/guitarBassDuoHarmony.ts`
- `engines/composer-os-v2/core/goldenPath/guitarPhraseAuthority.ts`

## SECTION 2: FULL FILE CONTENTS

### 1. engines/composer-os-v2/core/goldenPath/guitarVoice2WybleLayer.ts

```typescript
/**
 * Phase 18.2B+ — Guitar polyphony inner voice (Wyble-style). Voice 2 inject uses the reactive inline path (Phase 18.3B planner/generator bypassed for stability).
 * Export layer untouched; this module only mutates guitar PartModel voice-2 events.
 */

import type { CompositionContext } from '../compositionContext';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { DIVISIONS } from '../score-model/scoreModelTypes';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreEvent } from '../score-model/scoreModelTypes';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { liftToneToRange, guitarChordTonesInRange } from './guitarPhraseAuthority';

const V2_VOICE = 2;
/** Score beats spanned by one measure in this path (4/4; startBeat + duration use this span). */
const V2_BAR_DURATION_BEATS = 4;
/** Matches polyphony diagnostics active-bar threshold (≥ eighth). */
const MIN_REAL_V2_ACTIVE_BEATS = 0.5;
/** Realized sustained-wall detection: dominant long note (beats in 4/4). */
const MIN_REAL_V2_SUSTAINED_BEATS = 3;
const REAL_V2_BEAT_EPS = 1e-4;
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

/** Phase 18.2B.3 — prefer motion within a perfect 4th when continuity applies. */
const V2_CONTINUITY_MAX_LEAP_SEMITONES = 5;
/** Phase 18.2B.4 — after a gap (non-consecutive V2 bars), bridge from last pitch within a perfect 4th. */
const V2_GAP_BRIDGE_MAX_LEAP_SEMITONES = 5;
/** Phase 18.2B.4 — final guard: reject intervals wider than a perfect 5th vs previous V2 pitch. */
const V2_LEAP_SAFETY_MAX_SEMITONES = 7;
/** Phase 18.2B.5 — salt for texture-density pass (post-injection, realized V2 only). */
const V2_TEX_SALT_182B5 = 19250;

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

/** Phase 18.2B.2 (repair) — one bar-level footprint per active Voice-2 bar (primary rhythm controller). */
type BarV2RhythmShape = 'SUSTAINED_BAR' | 'TWO_SLABS' | 'OFFBEAT_HOLD' | 'REST';

/** Phase 18.2B.2 — coarse weighting state (bar shape only; from schedule phase). */
type Voice2RhythmWeightState182B2 = 'ENTERING' | 'CONTINUING' | 'RESOLVING' | 'RESTING';

const V2_COV_TARGET_MIN = 0.35;
/** Nominal upper band for repair / continuation caps (target coverage ~0.35–0.50). */
const V2_COV_TARGET_MAX = 0.45;
/** Hard ceiling: trim active bars until at or below this ratio (Phase 18.2B.3 breathing fix). */
const V2_COV_HARD_MAX = 0.55;
const V2_COV_FORCE_SUSTAINED = 0.3;
const V2_MAX_GAP_INACTIVE_BARS = 3;
/** Max consecutive active Voice-2 bars (runs longer than this are trimmed before inject). */
const V2_MAX_CONSECUTIVE_ACTIVE_BARS = 3;

function deriveVoice2WeightState182B2(
  schedulePhase: Voice2SchedulePhase | undefined
): Voice2RhythmWeightState182B2 {
  if (schedulePhase === 'resolve') return 'RESOLVING';
  if (schedulePhase === 'enter') return 'ENTERING';
  if (schedulePhase === 'continue') return 'CONTINUING';
  return 'CONTINUING';
}

/** Fallback when a chosen shape cannot be placed or validated (Phase 18.2B.2 repair). */
const BAR_V2_SHAPE_FALLBACK_ORDER: readonly BarV2RhythmShape[] = [
  'SUSTAINED_BAR',
  'TWO_SLABS',
  'OFFBEAT_HOLD',
  'REST',
];

function uniqBarShapeFallbackChain(preferred: BarV2RhythmShape): BarV2RhythmShape[] {
  const seen = new Set<BarV2RhythmShape>();
  const out: BarV2RhythmShape[] = [];
  for (const s of [preferred, ...BAR_V2_SHAPE_FALLBACK_ORDER]) {
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Contiguous active runs (sorted bar indices). */
function splitEffectiveIntoRuns(effective: Set<number>): number[][] {
  const sorted = [...effective].sort((a, b) => a - b);
  const runs: number[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j]! + 1 === sorted[j + 1]!) j++;
    runs.push(sorted.slice(i, j + 1) as number[]);
    i = j + 1;
  }
  return runs;
}

/**
 * Phase 18.2B.3 — Rebuild schedule metadata after bars are removed from `effective`.
 */
function rebuildPhaseByBarFromEffectiveRuns(effective: Set<number>, tb: number): Map<number, Voice2BarPhaseInfo> {
  const phaseByBar = new Map<number, Voice2BarPhaseInfo>();
  const runs = splitEffectiveIntoRuns(effective);
  for (const run of runs) {
    const start = run[0]!;
    const end = run[run.length - 1]!;
    for (let k = 0; k < run.length; k++) {
      const bar = run[k]!;
      if (bar < 1 || bar > tb) continue;
      const schedulePhase: Voice2SchedulePhase =
        k === 0 ? 'enter' : k === run.length - 1 ? 'resolve' : 'continue';
      phaseByBar.set(bar, { schedulePhase, runStartBar: start, runEndBar: end });
    }
  }
  return phaseByBar;
}

/**
 * Phase 18.2B.3 — Keep at most `maxConsecutive` consecutive active bars (preserve earlier bars in each run).
 */
function capEffectiveConsecutiveActiveRuns182B3(effective: Set<number>, maxConsecutive: number): void {
  const runs = splitEffectiveIntoRuns(effective);
  for (const run of runs) {
    if (run.length <= maxConsecutive) continue;
    for (let k = maxConsecutive; k < run.length; k++) {
      effective.delete(run[k]!);
    }
  }
}

/**
 * Phase 18.2B.3 — After a run of ≥2 active bars, leave a gap before the next active bar (phrasing).
 */
function enforceBreathingGapAfterRuns182B3(effective: Set<number>, tb: number, seed: number): void {
  const runs = splitEffectiveIntoRuns(effective);
  for (const run of runs) {
    const L = run.length;
    if (L < 2) continue;
    const last = run[run.length - 1]!;
    const next = last + 1;
    if (next > tb || !effective.has(next)) continue;
    if (L >= 3) {
      effective.delete(next);
      continue;
    }
    if (seededUnit(seed, last, 18801) < 0.7) {
      effective.delete(next);
    }
  }
}

/**
 * Prefer removing the **end** bar of the **longest** active run; tie-break lowest {@link seededUnit} (bar, 18600).
 * Phase 18.2B.3 — hard max coverage {@link V2_COV_HARD_MAX}.
 */
function pickBarToRemoveForCoverageTrim182B3(effective: Set<number>, seed: number): number {
  const runs = splitEffectiveIntoRuns(effective);
  if (runs.length === 0) return -1;
  const maxLen = Math.max(...runs.map((r) => r.length));
  const ends = runs.filter((r) => r.length === maxLen).map((r) => r[r.length - 1]!);
  let worst = ends[0]!;
  let worstScore = seededUnit(seed, worst, 18600);
  for (const e of ends.slice(1)) {
    const s = seededUnit(seed, e, 18600);
    if (s < worstScore) {
      worstScore = s;
      worst = e;
    }
  }
  return worst;
}

/**
 * Phase 18.2B.2 / 18.2B.3 — Drop active bars until coverage ≤ hard max; prefer trimming long runs first.
 */
function trimBarLevelVoice2CoverageIfOverCap(
  tb: number,
  seed: number,
  effective: Set<number>,
  _scheduled: Set<number>
): void {
  const hardCap = Math.max(1, Math.floor(tb * V2_COV_HARD_MAX));
  while (effective.size > hardCap) {
    const worstBar = pickBarToRemoveForCoverageTrim182B3(effective, seed);
    if (worstBar < 0) break;
    effective.delete(worstBar);
  }
}

/**
 * Phase 18.2B.2 — bar-level Voice 2 rhythm: one shape per active bar (light state weighting on shape only).
 */
function buildBarLevelVoice2ShapeMap(
  tb: number,
  seed: number,
  effectiveBars: Set<number>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>,
  forceSustainedBars: Set<number>
): Map<number, BarV2RhythmShape> {
  const out = new Map<number, BarV2RhythmShape>();
  const sorted = [...effectiveBars].filter((b) => b >= 1 && b <= tb).sort((a, b) => a - b);
  let prevActiveBar = 0;
  for (const bar of sorted) {
    if (forceSustainedBars.has(bar)) {
      out.set(bar, 'SUSTAINED_BAR');
      prevActiveBar = bar;
      continue;
    }
    const info = phaseByBar.get(bar);
    const schedulePhase = info?.schedulePhase ?? 'continue';
    const gapSincePrev = prevActiveBar > 0 ? bar - prevActiveBar - 1 : 0;
    prevActiveBar = bar;
    const wState = deriveVoice2WeightState182B2(schedulePhase);

    if (gapSincePrev > V2_MAX_GAP_INACTIVE_BARS) {
      out.set(bar, seededUnit(seed, bar, 18710) < 0.32 ? 'TWO_SLABS' : 'OFFBEAT_HOLD');
      continue;
    }

    switch (wState) {
      case 'RESOLVING':
        out.set(bar, 'SUSTAINED_BAR');
        break;
      case 'ENTERING': {
        const u = seededUnit(seed, bar, 18711);
        out.set(bar, u < 0.38 ? 'SUSTAINED_BAR' : 'TWO_SLABS');
        break;
      }
      case 'CONTINUING': {
        const u = seededUnit(seed, bar, 18712);
        out.set(bar, u < 0.28 ? 'TWO_SLABS' : 'OFFBEAT_HOLD');
        break;
      }
      case 'RESTING':
        out.set(bar, 'REST');
        break;
      default:
        out.set(bar, 'SUSTAINED_BAR');
    }
  }
  return out;
}

/**
 * Phase 18.2B.3 — If the previous two score bars were active sustained wholes, avoid a third sustained wall.
 */
function applySustainedWallSafety182B3(
  tb: number,
  seed: number,
  effectiveBars: Set<number>,
  shapeByBar: Map<number, BarV2RhythmShape>
): void {
  const sorted = [...effectiveBars].filter((b) => b >= 1 && b <= tb).sort((a, b) => a - b);
  for (const bar of sorted) {
    if (bar < 3) continue;
    if (shapeByBar.get(bar) !== 'SUSTAINED_BAR') continue;
    if (
      effectiveBars.has(bar - 1) &&
      effectiveBars.has(bar - 2) &&
      shapeByBar.get(bar - 1) === 'SUSTAINED_BAR' &&
      shapeByBar.get(bar - 2) === 'SUSTAINED_BAR'
    ) {
      const u = seededUnit(seed, bar, 18750);
      if (u < 0.55) {
        shapeByBar.set(bar, 'OFFBEAT_HOLD');
      } else {
        shapeByBar.set(bar, 'REST');
        effectiveBars.delete(bar);
      }
    }
  }
}

/**
 * Phase 18.2B.2 — Raise coverage toward ~35–50%, cap effective bars, break silent gaps >3 bars.
 * Returns bars that must use sustained (whole-class) rhythms only when coverage was critically low.
 */
function phase182B2RepairCoverageAndGaps(
  tb: number,
  seed: number,
  scheduled: Set<number>,
  effective: Set<number>,
  phaseByBar: Map<number, Voice2BarPhaseInfo>
): Set<number> {
  const forceSustainedWhole = new Set<number>();
  const ensurePhase = (bar: number): void => {
    if (!phaseByBar.has(bar)) {
      phaseByBar.set(bar, {
        schedulePhase: bar % 4 === 0 ? 'resolve' : 'enter',
        runEndBar: bar,
        runStartBar: bar,
      });
    }
  };

  const covRatio = (): number => (tb > 0 ? effective.size / tb : 0);

  let runStart = -1;
  let runLen = 0;
  for (let b = 1; b <= tb + 1; b++) {
    const inactive = b <= tb && !effective.has(b);
    if (inactive) {
      if (runLen === 0) runStart = b;
      runLen++;
    } else {
      if (runLen > V2_MAX_GAP_INACTIVE_BARS && runStart >= 1) {
        const end = runStart + runLen - 1;
        const mid = runStart + Math.floor(runLen / 2);
        const tryOrder = [mid, mid - 1, mid + 1, runStart, end];
        let pick: number | undefined;
        for (const c of tryOrder) {
          if (c >= runStart && c <= end && scheduled.has(c) && !effective.has(c)) {
            pick = c;
            break;
          }
        }
        if (pick === undefined) {
          for (let c = runStart; c <= end; c++) {
            if (scheduled.has(c) && !effective.has(c)) {
              pick = c;
              break;
            }
          }
        }
        if (pick !== undefined && !wouldAddCompleteTriple(effective, pick)) {
          effective.add(pick);
          ensurePhase(pick);
          if (covRatio() < V2_COV_FORCE_SUSTAINED) forceSustainedWhole.add(pick);
        }
      }
      runLen = 0;
    }
  }

  const targetMin = Math.max(1, Math.ceil(tb * V2_COV_TARGET_MIN));
  const targetMax = Math.max(targetMin, Math.floor(tb * V2_COV_TARGET_MAX));
  const candidates = [...scheduled].filter((x) => !effective.has(x)).sort((a, b) => a - b);
  let salt = 0;
  while (effective.size < targetMin && effective.size < targetMax && candidates.length > 0) {
    const idx = (Math.abs(seed) + salt * 37) % candidates.length;
    const bar = candidates[idx]!;
    candidates.splice(idx, 1);
    if (wouldAddCompleteTriple(effective, bar)) {
      salt++;
      continue;
    }
    effective.add(bar);
    ensurePhase(bar);
    if (covRatio() < V2_COV_FORCE_SUSTAINED) forceSustainedWhole.add(bar);
    salt++;
  }

  return forceSustainedWhole;
}

/** Coarse schedule from continuation runs (before per-bar behaviour). */
type Voice2SchedulePhase = 'enter' | 'continue' | 'resolve';

/**
 * Phase 18.2B.3 FINAL — phrase-level contrapuntal line (not bar-local weighting).
 * ENTER: phrase entry / after rest; SUSTAIN: hold guide area; MOVE: step toward target; RESOLVE: cadence; REST: inactive.
 */
type Voice2BehaviourPhase = 'enter' | 'sustain' | 'move' | 'resolve' | 'rest';

/** Per-bar run metadata (built before inject). */
type Voice2BarPhaseInfo = { schedulePhase: Voice2SchedulePhase; runEndBar: number; runStartBar: number };

/** Phase 18.3A — phrase-level role (internal motion shaping only). */
type Voice2PhraseRole = 'support' | 'counter' | 'response';

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

/** Minimum Voice-2 effective bars implied by ~35% phrase floor (keeps global coverage in target band). */
function minEffectiveBarsByPhrasePresenceFloor(tb: number): number {
  const phraseCount = Math.ceil(tb / 4);
  let sum = 0;
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const len = end - base + 1;
    sum += Math.max(1, Math.floor(len * 0.35 + 1e-9));
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
/**
 * Phase 18.2B.3 — optional pitch context: guide-tone bias, continuity, register, light imitation.
 */
type Voice2PitchPickContext182B3 = {
  lastV2Pitch: number | null;
  /** Previous Voice-2 pitch in the same bar (two-slab second note). */
  intraBarPrevPitch: number | null;
  registerAnchor: number | null;
  weightState: Voice2RhythmWeightState182B2;
  schedulePhase: Voice2SchedulePhase;
  imitationAllowed: boolean;
  v1Contour: -1 | 0 | 1;
  segmentSalt: number;
  /** Phase 18.2B.4 — infer beat-1/3 vs offbeat entry for directed arrival. */
  preferredShapeHint: BarV2RhythmShape | undefined;
  /** True when previous V2 was not the bar immediately before (rest / normalization gap). */
  gapAfterRest: boolean;
  /** Last bar of 4-bar window or schedule resolve — stable landing. */
  phraseEndResolution: boolean;
  /** Phrase start, phrase end, schedule enter/resolve, or strong-beat entry (not offbeat hold). */
  directedArrivalStrong: boolean;
  /** Previous bar had Voice 2 (no gap). */
  consecutiveV2: boolean;
};

function v1FragmentContour182B3(v1: NoteEvent[]): -1 | 0 | 1 {
  const s = [...v1].sort((a, b) => a.startBeat - b.startBeat);
  if (s.length < 2) return 0;
  const d = s[s.length - 1]!.pitch - s[0]!.pitch;
  if (d > 2) return 1;
  if (d < -2) return -1;
  return 0;
}

function buildVoice2PitchPickContext182B3(
  bar: number,
  seed: number,
  lastPitchV2: number | null,
  lastV2BarIndex: number,
  registerAnchor: number | null,
  schedulePhase: Voice2SchedulePhase,
  v1notes: NoteEvent[],
  imitationRunBars: number,
  preferredShapeHint: BarV2RhythmShape | undefined
): Voice2PitchPickContext182B3 {
  const consecutiveV2 = lastPitchV2 !== null && lastV2BarIndex === bar - 1;
  const gapAfterRest = lastPitchV2 !== null && lastV2BarIndex < bar - 1;
  const phraseStartBar = bar % 4 === 1;
  const phraseEndBarFour = bar % 4 === 0;
  const strongBeatEntry =
    preferredShapeHint === undefined ||
    preferredShapeHint === 'SUSTAINED_BAR' ||
    preferredShapeHint === 'TWO_SLABS';
  const directedArrivalStrong =
    phraseStartBar ||
    phraseEndBarFour ||
    schedulePhase === 'enter' ||
    schedulePhase === 'resolve' ||
    strongBeatEntry;
  const phraseEndResolution = schedulePhase === 'resolve' || phraseEndBarFour;
  const weightState = deriveVoice2WeightState182B2(schedulePhase);
  const v1Contour = v1FragmentContour182B3(v1notes);
  const imitationAllowed =
    consecutiveV2 &&
    v1notes.length >= 1 &&
    imitationRunBars < 2 &&
    seededUnit(seed, bar, 18301) < 0.67;
  return {
    lastV2Pitch: lastPitchV2,
    intraBarPrevPitch: null,
    registerAnchor,
    weightState,
    schedulePhase,
    imitationAllowed,
    v1Contour,
    segmentSalt: 0,
    preferredShapeHint,
    gapAfterRest,
    phraseEndResolution,
    directedArrivalStrong,
    consecutiveV2,
  };
}

/**
 * Phase 18.2B.4 — pick chord tone closest to `wantPitch` while staying within `maxLeap` of `refPitch`.
 */
function pickNearestChordToneWithinLeap182B4(
  refPitch: number,
  wantPitch: number,
  maxLeap: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  floorMidi: number,
  innerHigh: number
): number {
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  let best: number | undefined;
  let bd = Infinity;
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
    if (p >= strictCeiling || p < floorMidi) continue;
    const step = Math.abs(p - refPitch);
    if (step > maxLeap) continue;
    const tie = Math.abs(p - wantPitch);
    if (tie < bd) {
      bd = tie;
      best = p;
    }
  }
  if (best !== undefined) return best;
  const sign = wantPitch >= refPitch ? 1 : -1;
  const step = Math.min(maxLeap, Math.abs(wantPitch - refPitch));
  const stepped = refPitch + sign * step;
  return placeStrictlyBelowCeiling(strictCeiling, stepped, floorMidi);
}

/**
 * Phase 18.2B.3 — reweight chosen pitch toward guide tones, stepwise continuity, register, optional imitation.
 * Phase 18.2B.4 — directed arrival, phrase-end landing, gap-bridge, leap safety (pitch only).
 */
function refineVoice2Pitch182B3(
  raw: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  ctx: Voice2PitchPickContext182B3
): number {
  const floorMidi = INNER_LOW;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < floorMidi) {
    return clampPitch(raw, STAB_GUITAR_LOW, STAB_GUITAR_HIGH);
  }
  const tones = guitarChordTonesInRange(chord, floorMidi, innerHigh, chordOpts(context));
  const tRaw = chordTonesForChordSymbol(chord, chordOpts(context));
  const rootLifted = liftToneToRange(tRaw.root, floorMidi, innerHigh);
  const sixth = placeStrictlyBelowCeiling(strictCeiling, rootLifted + 9, floorMidi);
  const ninth = placeStrictlyBelowCeiling(strictCeiling, rootLifted + 14, floorMidi);
  const rawPlaced = placeStrictlyBelowCeiling(strictCeiling, raw, floorMidi);
  const continuityRef = ctx.intraBarPrevPitch ?? ctx.lastV2Pitch;
  const firstAttackInBar = ctx.intraBarPrevPitch === null;
  const candSet = new Set<number>();
  const addCand = (x: number) => {
    const p = placeStrictlyBelowCeiling(strictCeiling, x, floorMidi);
    if (p < strictCeiling && p >= floorMidi) candSet.add(p);
  };
  addCand(rawPlaced);
  for (let d = -6; d <= 6; d++) addCand(rawPlaced + d);
  [tones.third, tones.seventh, tones.fifth, tones.root, sixth, ninth].forEach((x) => addCand(x));
  const candidates = [...candSet];
  const thirdPc = ((tones.third % 12) + 12) % 12;
  const seventhPc = ((tones.seventh % 12) + 12) % 12;
  const rootPc = ((tones.root % 12) + 12) % 12;
  const sixthPc = ((sixth % 12) + 12) % 12;
  const ninthPc = ((ninth % 12) + 12) % 12;
  const occas69 = seededUnit(seed, bar + ctx.segmentSalt, 18321) < 0.28;
  let best = rawPlaced;
  let bd = Infinity;
  for (const c of candidates) {
    const pc = ((c % 12) + 12) % 12;
    let s = Math.abs(c - rawPlaced) * 0.3;
    if (continuityRef !== null) {
      const dist = Math.abs(c - continuityRef);
      if (dist <= 2) s += dist * 0.42;
      else if (dist <= V2_CONTINUITY_MAX_LEAP_SEMITONES) s += 1.1 + dist * 0.5;
      else s += 6.5 + (dist - V2_CONTINUITY_MAX_LEAP_SEMITONES) * 2.8;
    }
    let guideBonus = 0;
    if (pc === thirdPc || pc === seventhPc) guideBonus -= 1.05;
    else if ((pc === sixthPc || pc === ninthPc) && occas69) guideBonus -= 0.55;
    if (ctx.directedArrivalStrong) {
      if (pc === thirdPc || pc === seventhPc) guideBonus -= 0.55;
      else if (pc === rootPc) guideBonus -= 0.22;
      else s += 0.62;
    }
    if (ctx.phraseEndResolution) {
      if (pc === thirdPc || pc === seventhPc) guideBonus -= 0.48;
      else if (pc === rootPc) guideBonus -= 0.12;
      else s += 0.72;
      if (pc === sixthPc || pc === ninthPc) s += 0.52;
      s += 0.14 * Math.abs(c - rawPlaced);
    }
    if (ctx.consecutiveV2 && continuityRef !== null) {
      const dist = Math.abs(c - continuityRef);
      if (dist <= 2) s -= 0.38;
      else if (dist > 2 && (pc === thirdPc || pc === seventhPc)) s -= 0.14;
    }
    if (
      continuityRef !== null &&
      ctx.gapAfterRest &&
      firstAttackInBar &&
      Math.abs(c - continuityRef) > V2_GAP_BRIDGE_MAX_LEAP_SEMITONES
    ) {
      s += 9.0 + Math.abs(c - continuityRef) * 0.22;
    }
    if (ctx.registerAnchor !== null) {
      s += Math.abs(c - ctx.registerAnchor) * 0.36;
    }
    if (ctx.imitationAllowed && continuityRef !== null && ctx.v1Contour !== 0) {
      const span = 1 + Math.floor(seededUnit(seed, bar, 18322 + ctx.segmentSalt) * 2);
      const target = continuityRef + ctx.v1Contour * span;
      const t = placeStrictlyBelowCeiling(strictCeiling, target, floorMidi);
      if (t < strictCeiling && t >= floorMidi) s += Math.abs(c - t) * 0.38;
    }
    if (ctx.weightState === 'ENTERING') {
      guideBonus -= pc === thirdPc || pc === seventhPc ? 0.22 : 0;
      s += 0.18 * Math.abs(c - rawPlaced);
    } else if (ctx.weightState === 'CONTINUING') {
      if (continuityRef !== null && Math.abs(c - continuityRef) <= 2) s -= 0.4;
    } else if (ctx.weightState === 'RESOLVING') {
      guideBonus -= pc === thirdPc || pc === seventhPc ? 0.35 : 0;
      s += 0.28 * Math.abs(c - rawPlaced);
    }
    s -= guideBonus;
    s += seededUnit(seed, bar, 18340 + ctx.segmentSalt) * 0.018;
    if (s < bd) {
      bd = s;
      best = c;
    }
  }
  if (continuityRef !== null && firstAttackInBar && ctx.gapAfterRest) {
    const d = Math.abs(best - continuityRef);
    if (d > V2_GAP_BRIDGE_MAX_LEAP_SEMITONES) {
      best = pickNearestChordToneWithinLeap182B4(
        continuityRef,
        best,
        V2_GAP_BRIDGE_MAX_LEAP_SEMITONES,
        chord,
        strictCeiling,
        context,
        floorMidi,
        innerHigh
      );
    }
  }
  if (continuityRef !== null) {
    const d = Math.abs(best - continuityRef);
    if (d > V2_LEAP_SAFETY_MAX_SEMITONES) {
      best = pickNearestChordToneWithinLeap182B4(
        continuityRef,
        best,
        V2_LEAP_SAFETY_MAX_SEMITONES,
        chord,
        strictCeiling,
        context,
        floorMidi,
        innerHigh
      );
    }
  }
  return best;
}

function applyPitch182B3IfPresent(
  p: number,
  chord: string,
  strictCeiling: number,
  context: CompositionContext,
  seed: number,
  bar: number,
  pitchCtx: Voice2PitchPickContext182B3 | undefined
): number {
  return pitchCtx !== undefined ? refineVoice2Pitch182B3(p, chord, strictCeiling, context, seed, bar, pitchCtx) : p;
}

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
  committedArrivalMidi?: number,
  pitchCtx?: Voice2PitchPickContext182B3
): number {
  const committed = committedArrivalMidi ?? runDestinationPlaced;
  const wrap = (p: number) => applyPitch182B3IfPresent(p, chord, strictCeiling, context, seed, bar, pitchCtx);
  if (behaviour === 'enter' || behaviour === 'rest' || anchorMidi === null) {
    return wrap(primary);
  }
  if (behaviour === 'resolve') {
    return wrap(
      pickStrongPhraseEndArrivalPitch(
        anchorMidi,
        runDestinationPlaced,
        primary,
        secondary,
        chord,
        strictCeiling,
        context,
        seed,
        bar
      )
    );
  }
  if (behaviour === 'sustain') {
    const s = sustainPitchFromAnchor(anchorMidi, primary, strictCeiling, chord, context);
    return wrap(
      enforcePitchPhraseCommitment(
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
      )
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
    return wrap(
      enforcePitchPhraseCommitment(
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
      )
    );
  }
  const c = continuePitchFromAnchor(anchorMidi, chord, strictCeiling, context, seed, bar, primary, secondary);
  return wrap(
    enforcePitchPhraseCommitment(
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
    )
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
 * Phase 18.2B.3 + 18.2E — Expand scheduled bars into 2–3 bar continuation runs; global cap respects hard coverage ceiling.
 */
function buildVoice2ContinuationSchedule(
  tb: number,
  seed: number,
  scheduled: Set<number>
): { effective: Set<number>; phaseByBar: Map<number, Voice2BarPhaseInfo> } {
  const effective = new Set<number>();
  const phaseByBar = new Map<number, Voice2BarPhaseInfo>();
  const minByPhrase = minEffectiveBarsByPhrasePresenceFloor(tb);
  /** Phase 18.2B.3 — never exceed hard coverage cap when seeding continuation runs. */
  const hardCapBars = Math.max(1, Math.floor(tb * V2_COV_HARD_MAX));
  const targetMax = Math.min(
    hardCapBars,
    Math.max(2, Math.floor(tb * V2_COV_TARGET_MAX), minByPhrase)
  );
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
    /** 2–3 bars per run (max 3 consecutive; absolute max 4 only if repair adds — capped later). */
    let runLen = 2 + Math.floor(seededUnit(seed, bar, 7001) * 2);
    runLen = Math.min(runLen, V2_MAX_CONSECUTIVE_ACTIVE_BARS);
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
 * Phase 18.2E — Phrase floor: each phrase has Voice 2 in at least ~35% of its bars (distributed when adding from scheduled).
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
    const minNeed = Math.max(1, Math.floor(len * 0.35 + 1e-9));
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
 * Phase 18.2B.2 — Emit Voice-2 events for one bar-level shape.
 * Phase 18.2B.3 — optional {@link Voice2PitchPickContext182B3} refines pitch only (rhythm unchanged).
 */
function applyBarLevelShapeV2Events(
  m: MeasureModel,
  shape: BarV2RhythmShape,
  chord: string,
  v1notes: NoteEvent[],
  cFull: number,
  cHalfBack: number | undefined,
  behaviour: Voice2BehaviourPhase,
  anchorMidi: number | null,
  movementTargetPitch: number,
  runDestinationPlaced: number,
  progressInRun: number,
  contour: 'up' | 'down' | 'flat',
  context: CompositionContext,
  seed: number,
  bar: number,
  frozenArrival: number,
  pitchCtx?: Voice2PitchPickContext182B3
): boolean {
  if (shape === 'REST') return true;
  if (shape === 'SUSTAINED_BAR') {
    if (!melodyAttacksBeatZero(v1notes)) {
      const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 1, contour);
      if (!pair) return false;
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
        frozenArrival,
        pitchCtx
      );
      addEvent(m, createNote(p, 0, 4, V2_VOICE));
    } else {
      const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
      const pairLate = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 41, contour);
      if (!pairLate) return false;
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
        frozenArrival,
        pitchCtx
      );
      addEvent(m, createRest(0, 1, V2_VOICE));
      addEvent(m, createNote(pL, 1, 3, V2_VOICE));
    }
    return true;
  }
  if (shape === 'OFFBEAT_HOLD') {
    const cLate = minOverlappingV1Pitch(v1notes, 1, 4) ?? cFull;
    const pairLate = pickPrimarySecondaryForSegment(cLate, chord, context, seed, bar, 41, contour);
    if (!pairLate) return false;
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
      frozenArrival,
      pitchCtx
    );
    addEvent(m, createRest(0, 1, V2_VOICE));
    addEvent(m, createNote(pL, 1, 3, V2_VOICE));
    return true;
  }
  /** TWO_SLABS */
  const c02 = minOverlappingV1Pitch(v1notes, 0, 2);
  const c24 = minOverlappingV1Pitch(v1notes, 2, 4);
  if (c02 === undefined || c24 === undefined) return false;
  if (v1notes.length >= 2) {
    if (!v2OneNoteSpanPassesMelodyOverlapRule(v1notes, 0, 2)) return false;
    if (!v2OneNoteSpanPassesMelodyOverlapRule(v1notes, 2, 2)) return false;
  }
  const pair0 = pickPrimarySecondaryForSegment(c02, chord, context, seed, bar, 501, contour);
  const pair1 = pickPrimarySecondaryForSegment(c24, chord, context, seed, bar, 502, contour);
  if (!pair0 || !pair1) return false;
  const p0 = pickVoice2PitchForBehaviour(
    behaviour,
    anchorMidi,
    movementTargetPitch,
    runDestinationPlaced,
    progressInRun,
    pair0.primary,
    pair0.secondary,
    chord,
    strictCeilingFromMinV1(c02),
    context,
    seed,
    bar,
    frozenArrival,
    pitchCtx
  );
  const ctx1: Voice2PitchPickContext182B3 | undefined =
    pitchCtx === undefined
      ? undefined
      : { ...pitchCtx, intraBarPrevPitch: p0, segmentSalt: 1 };
  const p1 = pickVoice2PitchForBehaviour(
    behaviour,
    anchorMidi,
    movementTargetPitch,
    runDestinationPlaced,
    progressInRun,
    pair1.primary,
    pair1.secondary,
    chord,
    strictCeilingFromMinV1(c24),
    context,
    seed,
    bar,
    frozenArrival,
    ctx1
  );
  addEvent(m, createNote(p0, 0, 2, V2_VOICE));
  addEvent(m, createNote(p1, 2, 2, V2_VOICE));
  return true;
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
  const schedule = buildVoice2ContinuationSchedule(tb, seed, activeSet);
  let effectiveBars = schedule.effective;
  let phaseByBar = schedule.phaseByBar;
  const forceSustainedOneBars = phase182B2RepairCoverageAndGaps(tb, seed, activeSet, effectiveBars, phaseByBar);
  capEffectiveConsecutiveActiveRuns182B3(effectiveBars, V2_MAX_CONSECUTIVE_ACTIVE_BARS);
  phaseByBar = rebuildPhaseByBarFromEffectiveRuns(effectiveBars, tb);
  trimBarLevelVoice2CoverageIfOverCap(tb, seed, effectiveBars, activeSet);
  phaseByBar = rebuildPhaseByBarFromEffectiveRuns(effectiveBars, tb);
  enforceBreathingGapAfterRuns182B3(effectiveBars, tb, seed);
  phaseByBar = rebuildPhaseByBarFromEffectiveRuns(effectiveBars, tb);
  trimBarLevelVoice2CoverageIfOverCap(tb, seed, effectiveBars, activeSet);
  phaseByBar = rebuildPhaseByBarFromEffectiveRuns(effectiveBars, tb);
  for (const b of [...forceSustainedOneBars]) {
    if (!effectiveBars.has(b)) forceSustainedOneBars.delete(b);
  }
  const barShapeByBar = buildBarLevelVoice2ShapeMap(tb, seed, effectiveBars, phaseByBar, forceSustainedOneBars);
  applySustainedWallSafety182B3(tb, seed, effectiveBars, barShapeByBar);
  phaseByBar = rebuildPhaseByBarFromEffectiveRuns(effectiveBars, tb);
  for (const b of [...forceSustainedOneBars]) {
    if (!effectiveBars.has(b)) forceSustainedOneBars.delete(b);
  }
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
  /** Phase 18.2B.3 — continuity / register / imitation (pitch only). */
  let lastPitchV2: number | null = null;
  let lastV2BarIndex = -999;
  let registerAnchorV2: number | null = null;
  let imitationRunBars = 0;

  forBar: for (const bar of [...effectiveBars].sort((a, b) => a - b)) {
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

    const preferredShape = barShapeByBar.get(bar) ?? 'SUSTAINED_BAR';
    const pitchCtx = buildVoice2PitchPickContext182B3(
      bar,
      seed,
      lastPitchV2,
      lastV2BarIndex,
      registerAnchorV2,
      runInfo.schedulePhase,
      v1notes,
      imitationRunBars,
      preferredShape
    );

    const cHalfBack = minOverlappingV1Pitch(v1notes, 2, 4);
    const chain = uniqBarShapeFallbackChain(preferredShape);
    let shapeOk = false;
    shapeLoop: for (const shapeTry of chain) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      if (shapeTry === 'REST') {
        continue forBar;
      }
      if (
        !applyBarLevelShapeV2Events(
          m,
          shapeTry,
          chord,
          v1notes,
          cFull,
          cHalfBack,
          behaviour,
          anchorMidi,
          movementTargetPitch,
          runDestinationPlaced,
          progressInRun,
          contour,
          context,
          seed,
          bar,
          frozenArrival,
          pitchCtx
        )
      ) {
        continue shapeLoop;
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
          frozenArrival,
          pitchCtx
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
        frozenArrival,
        pitchCtx
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
          frozenArrival,
          pitchCtx
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
      continue shapeLoop;
    }

    if (!voice2StrictlyBelowOverlappingV1(v1notes, v2notes)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue shapeLoop;
    }

    if (v2SharesAttackWithV1(v1notes, v2notes)) {
      if (!repairAttackOffset()) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        continue shapeLoop;
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
        continue shapeLoop;
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
          frozenArrival,
          pitchCtx
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
          frozenArrival,
          pitchCtx
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
            continue shapeLoop;
          }
          const pairFb = pickPrimarySecondaryForSegment(cFb, chord, context, seed, bar, 99, contour);
          if (!pairFb) continue shapeLoop;
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
            frozenArrival,
            pitchCtx
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
            continue shapeLoop;
          }
          mirrorResolved = true;
        }
      }

      if (!mirrorResolved) {
        continue shapeLoop;
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
              frozenArrival,
              pitchCtx
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
                frozenArrival,
                pitchCtx
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
                  frozenArrival,
                  pitchCtx
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
        continue shapeLoop;
      }
    }

    if (maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue shapeLoop;
    }

    shapeOk = true;
    break shapeLoop;
    }

    if (!shapeOk) continue forBar;

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
      const consecAfterPrev = lastPitchV2 !== null && lastV2BarIndex === bar - 1;
      const v1ContourEnd = v1FragmentContour182B3(v1notes);
      const imitationGate = seededUnit(seed, bar, 18301) < 0.67;
      if (consecAfterPrev && v1notes.length >= 1 && imitationRunBars < 2 && imitationGate && v1ContourEnd !== 0) {
        imitationRunBars = Math.min(2, imitationRunBars + 1);
      } else if (!consecAfterPrev) {
        imitationRunBars = 0;
      }
      lastPitchV2 = lastP;
      lastV2BarIndex = bar;
      registerAnchorV2 =
        registerAnchorV2 === null ? lastP : Math.round(registerAnchorV2 * 0.62 + lastP * 0.38);
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

function measureAtBarIndex182B3(guitar: PartModel, bar: number): MeasureModel | undefined {
  return guitar.measures.find((x) => x.index === bar);
}

/** Strip all Voice-2 events from one measure (realized REST). */
function stripAllVoice2EventsFromMeasure182B3(m: MeasureModel): void {
  m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
}

/**
 * Phase 18.2B.3 — Actual written Voice-2 activity (matches polyphony diagnostics semantics).
 */
function buildActualV2ActiveBarSet182B3(guitar: PartModel, tb: number): Set<number> {
  const s = new Set<number>();
  for (let bar = 1; bar <= tb; bar++) {
    const m = measureAtBarIndex182B3(guitar, bar);
    if (!m) continue;
    const longEnough = m.events.some(
      (e) =>
        e.kind === 'note' &&
        (e.voice ?? 1) === V2_VOICE &&
        (e as NoteEvent).duration >= MIN_REAL_V2_ACTIVE_BEATS - REAL_V2_BEAT_EPS
    );
    if (longEnough) s.add(bar);
  }
  return s;
}

function isV2RealSustainedBar182B3(m: MeasureModel): boolean {
  const notes = m.events.filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE
  );
  if (notes.length === 0) return false;
  return notes.some((n) => n.duration >= MIN_REAL_V2_SUSTAINED_BEATS - REAL_V2_BEAT_EPS);
}

/**
 * Lower = remove first when trimming runs (OFFBEAT → TWO_SLABS → SUSTAINED).
 */
function realizedV2RemovalPriorityForBar182B3(m: MeasureModel): number {
  const notes = m.events.filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE
  );
  if (notes.length === 0) return 99;
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  if (sorted.length === 1) {
    const n = sorted[0]!;
    if (n.duration >= MIN_REAL_V2_SUSTAINED_BEATS - REAL_V2_BEAT_EPS) return 2;
    return 1;
  }
  if (sorted.length >= 2) {
    if (sorted[0]!.startBeat <= REAL_V2_BEAT_EPS && sorted[1]!.startBeat >= 1.9) return 1;
    if (sorted[0]!.startBeat >= 0.9) return 0;
  }
  return 1;
}

function enforceRealizedRunLengthCap182B3(guitar: PartModel, tb: number): boolean {
  const active = buildActualV2ActiveBarSet182B3(guitar, tb);
  const runs = splitEffectiveIntoRuns(active);
  let changed = false;
  for (const run of runs) {
    if (run.length <= V2_MAX_CONSECUTIVE_ACTIVE_BARS) continue;
    const removeCount = run.length - V2_MAX_CONSECUTIVE_ACTIVE_BARS;
    const removable = run.slice(V2_MAX_CONSECUTIVE_ACTIVE_BARS);
    const scored = removable.map((bar) => {
      const m = measureAtBarIndex182B3(guitar, bar);
      return { bar, pr: m ? realizedV2RemovalPriorityForBar182B3(m) : 99 };
    });
    scored.sort((a, b) => (a.pr !== b.pr ? a.pr - b.pr : a.bar - b.bar));
    for (let i = 0; i < removeCount && i < scored.length; i++) {
      const m = measureAtBarIndex182B3(guitar, scored[i]!.bar);
      if (m) {
        stripAllVoice2EventsFromMeasure182B3(m);
        changed = true;
      }
    }
  }
  return changed;
}

function enforceRealizedBreathingAfterRuns182B3(guitar: PartModel, tb: number, seed: number): boolean {
  const active = buildActualV2ActiveBarSet182B3(guitar, tb);
  const runs = splitEffectiveIntoRuns(active);
  let changed = false;
  for (const run of runs) {
    const L = run.length;
    if (L < 2) continue;
    const last = run[run.length - 1]!;
    const next = last + 1;
    if (next > tb || !active.has(next)) continue;
    if (L >= 3) {
      const m = measureAtBarIndex182B3(guitar, next);
      if (m) {
        stripAllVoice2EventsFromMeasure182B3(m);
        changed = true;
      }
      continue;
    }
    if (L === 2 && seededUnit(seed, last, 18801) < 0.7) {
      const m = measureAtBarIndex182B3(guitar, next);
      if (m) {
        stripAllVoice2EventsFromMeasure182B3(m);
        changed = true;
      }
    }
  }
  return changed;
}

/**
 * Try rest+note offbeat footprint without re-running full inject (guide tones via pickPrimarySecondary).
 */
function tryApplyOffbeatHoldMinimalFromRealized182B3(
  m: MeasureModel,
  context: CompositionContext,
  seed: number
): boolean {
  const chord = m.chord ?? 'Cmaj9';
  const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  if (v1.length === 0) return false;
  const contour = v1MelodyContour(v1);
  const cLate = minOverlappingV1Pitch(v1, 1, 4) ?? minOverlappingV1Pitch(v1, 0, 4);
  if (cLate === undefined) return false;
  const pair = pickPrimarySecondaryForSegment(cLate, chord, context, seed, m.index, 19001, contour);
  if (!pair) return false;
  const sc = strictCeilingFromMinV1(cLate);
  const p = pickVoice2PitchForBehaviour(
    'enter',
    null,
    pair.primary,
    pair.primary,
    0,
    pair.primary,
    pair.secondary,
    chord,
    sc,
    context,
    seed,
    m.index,
    undefined,
    undefined
  );
  stripAllVoice2EventsFromMeasure182B3(m);
  addEvent(m, createRest(0, 1, V2_VOICE));
  addEvent(m, createNote(p, 1, 3, V2_VOICE));
  m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
  const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
  if (!voice2StrictlyBelowOverlappingV1(v1, v2) || maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT) {
    stripAllVoice2EventsFromMeasure182B3(m);
    return false;
  }
  return true;
}

/**
 * Phase 18.2B.5 — Realized V2 “sustained wall” texture (streaming inner layer), not TWO_SLABS split rhythm.
 * Aligns with duo interaction anti-streaming: long holds / near–full-bar V2 note mass.
 */
function isV2SustainedTextureBar182B5(m: MeasureModel): boolean {
  const notes = m.events.filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE
  );
  if (notes.length === 0) return false;
  const sum = notes.reduce((s, n) => s + n.duration, 0);
  const maxSeg = Math.max(...notes.map((n) => n.duration));
  const first = Math.min(...notes.map((n) => n.startBeat));
  /** TWO_SLABS (2+2): rhythmic contrast — not sustained texture wall. */
  if (sum >= 3.95 && maxSeg < 2.75 && notes.length >= 2) return false;
  /** Meaningful breath before first V2 attack — not wall unless note mass still streams. */
  if (first >= 0.5 && sum < 3.95) return false;
  if (sum >= 3.95) return true;
  if (first <= REAL_V2_BEAT_EPS && maxSeg >= 3.0) return true;
  if (maxSeg >= 3.75) return true;
  return false;
}

function tryApplyTwoSlabsMinimalFromRealized182B5(
  m: MeasureModel,
  context: CompositionContext,
  seed: number
): boolean {
  const chord = m.chord ?? 'Cmaj9';
  const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
  if (v1.length === 0) return false;
  const contour = v1MelodyContour(v1);
  const c02 = minOverlappingV1Pitch(v1, 0, 2);
  const c24 = minOverlappingV1Pitch(v1, 2, 4);
  if (c02 === undefined || c24 === undefined) return false;
  if (v1.length >= 2) {
    if (!v2OneNoteSpanPassesMelodyOverlapRule(v1, 0, 2)) return false;
    if (!v2OneNoteSpanPassesMelodyOverlapRule(v1, 2, 2)) return false;
  }
  const pair0 = pickPrimarySecondaryForSegment(c02, chord, context, seed, m.index, 19021, contour);
  const pair1 = pickPrimarySecondaryForSegment(c24, chord, context, seed, m.index, 19022, contour);
  if (!pair0 || !pair1) return false;
  const p0 = pickVoice2PitchForBehaviour(
    'enter',
    null,
    pair0.primary,
    pair0.primary,
    0,
    pair0.primary,
    pair0.secondary,
    chord,
    strictCeilingFromMinV1(c02),
    context,
    seed,
    m.index,
    undefined,
    undefined
  );
  const p1 = pickVoice2PitchForBehaviour(
    'enter',
    null,
    pair1.primary,
    pair1.primary,
    0,
    pair1.primary,
    pair1.secondary,
    chord,
    strictCeilingFromMinV1(c24),
    context,
    seed,
    m.index,
    undefined,
    undefined
  );
  stripAllVoice2EventsFromMeasure182B3(m);
  addEvent(m, createNote(p0, 0, 2, V2_VOICE));
  addEvent(m, createNote(p1, 2, 2, V2_VOICE));
  m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
  const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
  if (!voice2StrictlyBelowOverlappingV1(v1, v2) || maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT) {
    stripAllVoice2EventsFromMeasure182B3(m);
    return false;
  }
  return true;
}

function lightenV2BarTexture182B5(
  m: MeasureModel,
  context: CompositionContext,
  seed: number,
  bar: number
): boolean {
  if (tryApplyTwoSlabsMinimalFromRealized182B5(m, context, seed + bar * 31 + V2_TEX_SALT_182B5)) return true;
  if (tryApplyOffbeatHoldMinimalFromRealized182B3(m, context, seed + bar * 37 + V2_TEX_SALT_182B5)) return true;
  stripAllVoice2EventsFromMeasure182B3(m);
  return true;
}

function computeLongestSustainedTextureRun182B5(guitar: PartModel, context: CompositionContext, tb: number): void {
  const active = buildActualV2ActiveBarSet182B3(guitar, tb);
  let cur = 0;
  let maxRun = 0;
  for (let bar = 1; bar <= tb; bar++) {
    const m = measureAtBarIndex182B3(guitar, bar);
    if (!m || !active.has(bar) || !isV2SustainedTextureBar182B5(m)) {
      cur = 0;
    } else {
      cur++;
      maxRun = Math.max(maxRun, cur);
    }
  }
  const meta = context.generationMetadata as { voice2LongestSustainedTextureRun182B5?: number };
  meta.voice2LongestSustainedTextureRun182B5 = maxRun;
}

/**
 * Phase 18.2B.5 — Max 2 consecutive realized sustained-texture bars; lighten 3rd; optional alternation in pairs.
 */
function enforceV2TextureDensity182B5(guitar: PartModel, context: CompositionContext, tb: number, seed: number): void {
  for (let iter = 0; iter < 14; iter++) {
    const active = buildActualV2ActiveBarSet182B3(guitar, tb);
    let changed = false;
    for (let bar = 3; bar <= tb; bar++) {
      if (!active.has(bar - 2) || !active.has(bar - 1) || !active.has(bar)) continue;
      const m0 = measureAtBarIndex182B3(guitar, bar - 2);
      const m1 = measureAtBarIndex182B3(guitar, bar - 1);
      const m2 = measureAtBarIndex182B3(guitar, bar);
      if (!m0 || !m1 || !m2) continue;
      if (
        !isV2SustainedTextureBar182B5(m0) ||
        !isV2SustainedTextureBar182B5(m1) ||
        !isV2SustainedTextureBar182B5(m2)
      ) {
        continue;
      }
      lightenV2BarTexture182B5(m2, context, seed, bar);
      changed = true;
      break;
    }
    if (!changed) break;
  }
  for (let bar = 2; bar <= tb; bar++) {
    const active = buildActualV2ActiveBarSet182B3(guitar, tb);
    if (!active.has(bar - 1) || !active.has(bar)) continue;
    const mPrev = measureAtBarIndex182B3(guitar, bar - 1);
    const mCur = measureAtBarIndex182B3(guitar, bar);
    if (!mPrev || !mCur) continue;
    if (!isV2SustainedTextureBar182B5(mPrev) || !isV2SustainedTextureBar182B5(mCur)) continue;
    if (seededUnit(seed, bar, V2_TEX_SALT_182B5 + 3) >= 0.48) continue;
    lightenV2BarTexture182B5(mCur, context, seed, bar);
  }
}

function enforceRealizedSustainedWall182B3(guitar: PartModel, context: CompositionContext, seed: number, tb: number): boolean {
  const active = buildActualV2ActiveBarSet182B3(guitar, tb);
  let changed = false;
  for (let bar = 3; bar <= tb; bar++) {
    if (!active.has(bar - 2) || !active.has(bar - 1) || !active.has(bar)) continue;
    const m0 = measureAtBarIndex182B3(guitar, bar - 2);
    const m1 = measureAtBarIndex182B3(guitar, bar - 1);
    const m2 = measureAtBarIndex182B3(guitar, bar);
    if (!m0 || !m1 || !m2) continue;
    if (!isV2RealSustainedBar182B3(m0) || !isV2RealSustainedBar182B3(m1) || !isV2RealSustainedBar182B3(m2)) continue;
    if (tryApplyOffbeatHoldMinimalFromRealized182B3(m2, context, seed + bar * 17)) {
      changed = true;
      continue;
    }
    stripAllVoice2EventsFromMeasure182B3(m2);
    changed = true;
  }
  return changed;
}

function enforceRealizedCoverageCap182B3(guitar: PartModel, tb: number, seed: number): boolean {
  let active = buildActualV2ActiveBarSet182B3(guitar, tb);
  const hardCap = Math.max(1, Math.floor(tb * V2_COV_HARD_MAX));
  let changed = false;
  while (active.size > hardCap) {
    const bar = pickBarToRemoveForCoverageTrim182B3(active, seed);
    if (bar < 0) break;
    const m = measureAtBarIndex182B3(guitar, bar);
    if (m) {
      stripAllVoice2EventsFromMeasure182B3(m);
      changed = true;
    }
    active.delete(bar);
  }
  return changed;
}

/** Realized Voice-2 note with bar index for global beat math (post-injection normalization). */
type V2NoteEntry182B5 = { note: NoteEvent; measureIndex: number };

/** Whole or near-whole Voice-2 hold (validator wall-to-wall uses summed note beats per measure). */
function isFullBarSustained(note: NoteEvent, barDuration: number): boolean {
  return note.duration >= barDuration * 0.875 - REAL_V2_BEAT_EPS;
}

function barHasFullBarV2Sustain(m: MeasureModel, barDuration: number): boolean {
  for (const e of m.events) {
    if (e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) {
      if (isFullBarSustained(e as NoteEvent, barDuration)) return true;
    }
  }
  return false;
}

/**
 * No two adjacent bars may both be full-bar sustained Voice 2 (independent wholes in consecutive measures).
 * Converts the second bar of each flagged pair: same pitch as the original note, duration halved, rest fills the remainder (no new pitched content).
 */
function convertMeasureBreakV2FullSustain(guitar: PartModel, bar: number, barDuration: number): void {
  const m = measureAtBarIndex182B3(guitar, bar);
  if (!m) return;
  const half = barDuration / 2;
  let targetIdx = -1;
  for (let i = 0; i < m.events.length; i++) {
    const e = m.events[i]!;
    if (e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) {
      const n = e as NoteEvent;
      if (n.startBeat <= REAL_V2_BEAT_EPS && isFullBarSustained(n, barDuration)) {
        targetIdx = i;
        break;
      }
    }
  }
  if (targetIdx >= 0) {
    const n = m.events[targetIdx] as NoteEvent;
    const newEvents: ScoreEvent[] = [];
    for (let i = 0; i < m.events.length; i++) {
      if (i === targetIdx) {
        newEvents.push({ ...n, startBeat: 0, duration: half });
        newEvents.push(createRest(half, half, V2_VOICE));
        continue;
      }
      const e = m.events[i]!;
      if (e.kind === 'note') newEvents.push({ ...(e as NoteEvent) });
      else if (e.kind === 'rest') newEvents.push({ ...(e as RestEvent) });
      else newEvents.push(e);
    }
    m.events = newEvents;
    m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
    return;
  }
  for (let i = 0; i < m.events.length; i++) {
    const e = m.events[i]!;
    if (e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) {
      const n = e as NoteEvent;
      if (isFullBarSustained(n, barDuration)) {
        const head = { ...n, duration: half };
        const restStart = head.startBeat + head.duration;
        const restDur = barDuration - restStart;
        const newEvents: ScoreEvent[] = [];
        for (let j = 0; j < m.events.length; j++) {
          if (j === i) {
            newEvents.push(head);
            if (restDur > REAL_V2_BEAT_EPS) {
              newEvents.push(createRest(restStart, restDur, V2_VOICE));
            }
            continue;
          }
          const ev = m.events[j]!;
          if (ev.kind === 'note') newEvents.push({ ...(ev as NoteEvent) });
          else if (ev.kind === 'rest') newEvents.push({ ...(ev as RestEvent) });
          else newEvents.push(ev);
        }
        m.events = newEvents;
        m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
        return;
      }
    }
  }
}

function breakConsecutiveV2Sustains(guitar: PartModel, barDuration: number, totalBars: number): void {
  const flags: boolean[] = [];
  for (let i = 0; i <= totalBars; i++) flags[i] = false;
  for (let b = 1; b <= totalBars; b++) {
    const m = measureAtBarIndex182B3(guitar, b);
    flags[b] = m ? barHasFullBarV2Sustain(m, barDuration) : false;
  }
  const toConvert = new Set<number>();
  for (let b = 1; b < totalBars; b++) {
    if (flags[b] && flags[b + 1]) toConvert.add(b + 1);
  }
  for (const bar of [...toConvert].sort((a, c) => a - c)) {
    convertMeasureBreakV2FullSustain(guitar, bar, barDuration);
  }
}

/** MusicXML tick threshold for "full bar" sustained diagnostics (0.875 × 1920 @ divisions 480). */
const V2_FULL_BAR_SUSTAIN_TICKS_DEBUG = 1680;

function v2NoteDurationSum182B5(m: MeasureModel): number {
  let s = 0;
  for (const e of m.events) {
    if (e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) {
      s += (e as NoteEvent).duration;
    }
  }
  return s;
}

/** True if any Voice-2 note has exported duration ≥ tickThreshold (divisions-per-quarter × beats). */
function barHasV2NoteDurationTicksGte182B5(m: MeasureModel, tickThreshold: number): boolean {
  for (const e of m.events) {
    if (e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) {
      const n = e as NoteEvent;
      const ticks = Math.round(n.duration * DIVISIONS);
      if (ticks >= tickThreshold) return true;
    }
  }
  return false;
}

/** Diagnostic: adjacent bars that are both realized-active for V2; sums and full-bar flags for sustained debugging. */
function logAdjacentActiveBarPairsDebug182B5(
  guitar: PartModel,
  barDuration: number,
  totalBars: number,
  activeBarSet: Set<number>,
): void {
  for (let b = 1; b < totalBars; b++) {
    if (!activeBarSet.has(b) || !activeBarSet.has(b + 1)) continue;
    const m0 = measureAtBarIndex182B3(guitar, b);
    const m1 = measureAtBarIndex182B3(guitar, b + 1);
    if (!m0 || !m1) continue;
    const sumA = v2NoteDurationSum182B5(m0);
    const sumB = v2NoteDurationSum182B5(m1);
    const ticksA = Math.round(sumA * DIVISIONS);
    const ticksB = Math.round(sumB * DIVISIONS);
    const combinedTicks = ticksA + ticksB;
    console.debug('[V2 normalize 18.2B.5] adjacent active pair sustained diag', {
      barA: b,
      barB: b + 1,
      fullBarSustainedA: barHasV2NoteDurationTicksGte182B5(m0, V2_FULL_BAR_SUSTAIN_TICKS_DEBUG),
      fullBarSustainedB: barHasV2NoteDurationTicksGte182B5(m1, V2_FULL_BAR_SUSTAIN_TICKS_DEBUG),
      sumV2BeatsA: sumA,
      sumV2BeatsB: sumB,
      sumV2TicksA: ticksA,
      sumV2TicksB: ticksB,
      combinedV2Beats: sumA + sumB,
      combinedV2Ticks: combinedTicks,
    });
  }
}

function computeLongestConsecutiveSustainedRun182B5(guitar: PartModel, barDuration: number, totalBars: number): number {
  let run = 0;
  let maxRun = 0;
  for (let b = 1; b <= totalBars; b++) {
    const m = measureAtBarIndex182B3(guitar, b);
    if (m && barHasFullBarV2Sustain(m, barDuration)) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  return maxRun;
}

function collectV2NoteEntries182B5(guitar: PartModel): V2NoteEntry182B5[] {
  const out: V2NoteEntry182B5[] = [];
  const measures = [...guitar.measures].sort((a, b) => a.index - b.index);
  for (const m of measures) {
    for (const e of m.events) {
      if (e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) {
        out.push({ note: e as NoteEvent, measureIndex: m.index });
      }
    }
  }
  return out;
}

/**
 * Bar index N (1..totalBars) is active if any Voice-2 note sounds in that bar, including sustain from prior bars.
 * Minimum sounding length: one eighth-note span derived from barDuration.
 */
function buildRealizedActiveBarSet(
  v2Notes: V2NoteEntry182B5[],
  barDuration: number,
  totalBars: number,
): Set<number> {
  const minDur = barDuration / 8;
  const active = new Set<number>();
  for (let b = 1; b <= totalBars; b++) {
    const g0 = (b - 1) * barDuration;
    const g1 = b * barDuration;
    for (const { note, measureIndex } of v2Notes) {
      if (note.duration < minDur - REAL_V2_BEAT_EPS) continue;
      const startG = (measureIndex - 1) * barDuration + note.startBeat;
      const endG = startG + note.duration;
      if (startG < g1 - REAL_V2_BEAT_EPS && endG > g0 + REAL_V2_BEAT_EPS) {
        active.add(b);
        break;
      }
    }
  }
  return active;
}

/**
 * Shorten Voice-2 notes that would sound past a bar boundary into a following bar that is also active (validator time basis).
 * Uses global beat span (startBeat + duration per measure); MusicXML ticks are derived at export from the same durations.
 */
function clampV2NotesToBarBoundaries(
  v2Notes: V2NoteEntry182B5[],
  activeBarSet: Set<number>,
  barDuration: number,
  totalBars: number,
): V2NoteEntry182B5[] {
  const out: V2NoteEntry182B5[] = [];
  for (const { note, measureIndex } of v2Notes) {
    const startG = (measureIndex - 1) * barDuration + note.startBeat;
    const endG = startG + note.duration;
    const noteBarIndex = Math.floor(startG / barDuration + REAL_V2_BEAT_EPS);
    const barEndExclusive = (noteBarIndex + 1) * barDuration;
    const nextBar1Based = measureIndex + 1;
    let nextDur = note.duration;
    if (
      nextBar1Based <= totalBars &&
      activeBarSet.has(nextBar1Based) &&
      endG > barEndExclusive + REAL_V2_BEAT_EPS
    ) {
      const clamped = barDuration - note.startBeat;
      if (clamped > REAL_V2_BEAT_EPS && clamped + REAL_V2_BEAT_EPS < note.duration) {
        nextDur = clamped;
      }
    }
    out.push({ measureIndex, note: { ...note, duration: nextDur } });
  }
  return out;
}

function applyV2NoteEntryClones182B5(guitar: PartModel, entries: V2NoteEntry182B5[]): void {
  const measures = [...guitar.measures].sort((a, b) => a.index - b.index);
  let i = 0;
  for (const m of measures) {
    m.events = m.events.map((e) => {
      if (e.kind !== 'note' || (e.voice ?? 1) !== V2_VOICE) return e;
      const entry = entries[i]!;
      i++;
      return entry.note;
    });
  }
}

function computeLongestV2SustainAcrossActiveBars182B5(
  v2Notes: V2NoteEntry182B5[],
  activeBarSet: Set<number>,
  barDuration: number,
  totalBars: number,
): number {
  let max = 0;
  for (const { note, measureIndex } of v2Notes) {
    const nextBar = measureIndex + 1;
    if (nextBar > totalBars || !activeBarSet.has(nextBar)) continue;
    if (note.duration < barDuration / 8 - REAL_V2_BEAT_EPS) continue;
    const startG = (measureIndex - 1) * barDuration + note.startBeat;
    const endG = startG + note.duration;
    const spanBars = (endG - startG) / barDuration;
    max = Math.max(max, spanBars);
  }
  return max;
}

/**
 * Phase 18.2B.3 — Normalize **realized** Voice-2 activity after inject + pitch stabilisers so metrics/validators
 * match the written score (runs after {@link stabiliseGuitarVoice2Wyble18_2B_2}; diagnostics read this result).
 */
function normalizeRealizedVoice2PostInjection182B3(guitar: PartModel, context: CompositionContext): void {
  const tb = context.form.totalBars;
  const seed = context.seed;
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    if (enforceRealizedRunLengthCap182B3(guitar, tb)) changed = true;
    if (enforceRealizedBreathingAfterRuns182B3(guitar, tb, seed)) changed = true;
    if (enforceRealizedSustainedWall182B3(guitar, context, seed, tb)) changed = true;
    if (enforceRealizedCoverageCap182B3(guitar, tb, seed)) changed = true;
    if (!changed) break;
  }
  const barDur = V2_BAR_DURATION_BEATS;
  breakConsecutiveV2Sustains(guitar, barDur, tb);
  let v2Entries = collectV2NoteEntries182B5(guitar);
  let realizedActive = buildRealizedActiveBarSet(v2Entries, barDur, tb);
  const clampedEntries = clampV2NotesToBarBoundaries(v2Entries, realizedActive, barDur, tb);
  applyV2NoteEntryClones182B5(guitar, clampedEntries);
  v2Entries = collectV2NoteEntries182B5(guitar);
  realizedActive = buildRealizedActiveBarSet(v2Entries, barDur, tb);
  const longestV2SustainAcrossActiveBars = computeLongestV2SustainAcrossActiveBars182B5(
    v2Entries,
    realizedActive,
    barDur,
    tb,
  );
  const longestConsecutiveSustainedRun = computeLongestConsecutiveSustainedRun182B5(guitar, barDur, tb);
  logAdjacentActiveBarPairsDebug182B5(guitar, barDur, tb, realizedActive);
  console.debug(
    '[V2 normalize 18.2B.5] realized active bars (post-clamp)',
    [...realizedActive].sort((a, b) => a - b).join(','),
  );
  console.debug('[V2 normalize 18.2B.5] longestV2SustainAcrossActiveBars', longestV2SustainAcrossActiveBars);
  console.debug('[V2 normalize 18.2B.5] longestConsecutiveSustainedRun', longestConsecutiveSustainedRun);
  /** Phase 18.2B.5 — realized sustained-texture density (after run/coverage breathing; polyphony diag follows). */
  enforceV2TextureDensity182B5(guitar, context, tb, seed);
  computeLongestSustainedTextureRun182B5(guitar, context, tb);
}

/**
 * Phase 18.2B.3 — Realized-score breathing / run caps / coverage (after 18.2B.1–2 pitch stabilisers, before polyphony diagnostics).
 */
export function stabiliseGuitarVoice2Wyble18_2B_3(guitar: PartModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;
  normalizeRealizedVoice2PostInjection182B3(guitar, context);
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

```

### 2. Direct-import files whose types/builders define Voice 2 note events

#### engines/composer-os-v2/core/score-model/scoreModelTypes.ts

```typescript
/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 */

/**
 * MusicXML divisions per quarter note (fixed; Sibelius-safe integer tick grid).
 * All <duration> values and <type>/<dot/> come from the same tick integer in the exporter.
 */
export const DIVISIONS = 480;

/** Beats per measure (4/4). */
export const BEATS_PER_MEASURE = 4;

/** Measure duration in divisions (4/4 @ DIVISIONS=480 → 1920). */
export const MEASURE_DIVISIONS = DIVISIONS * BEATS_PER_MEASURE;

/** Alias for exporters that name ticks explicitly. */
export const MUSIC_XML_DIVISIONS_PER_QUARTER = DIVISIONS;
export const MEASURE_TICKS_4_4 = MEASURE_DIVISIONS;

/** Articulation metadata (performance pass / expressive feel). */
export type Articulation = 'staccato' | 'tenuto' | 'accent';

/** Playback / feel metadata (does not change bar structure). */
export interface FeelProfile {
  /** Long:short eighth ratio for swing interpretation (e.g. 2.0 ≈ triplet swing). */
  swingRatio: number;
  tempoFeel: 'slow' | 'medium' | 'fast';
  /** Smooth drift budget across the form (beats), for display / playback hints only. */
  driftTotalBeats: number;
}

/** Note event: pitch in MIDI, startBeat 0–4, duration in beats. */
export interface NoteEvent {
  kind: 'note';
  pitch: number;
  startBeat: number;
  duration: number;
  voice?: number;
  articulation?: Articulation;
  /** MIDI velocity 1–127; optional expressive shaping (ghost notes, comp). */
  velocity?: number;
  /** Optional motif/riff identity tag (symbolic layer; not exported to MusicXML). */
  motifRef?: string;
}

/** Rest event. */
export interface RestEvent {
  kind: 'rest';
  startBeat: number;
  duration: number;
  voice?: number;
}

/** Union of note/rest. */
export type ScoreEvent = NoteEvent | RestEvent;

/** Chord symbol event (measure-level). */
export interface ChordSymbolEvent {
  kind: 'chord';
  chord: string;
}

/** Rehearsal mark event (measure-level). */
export interface RehearsalMarkEvent {
  kind: 'rehearsal';
  label: string;
}

/** Tempo event (score-level, typically measure 1). */
export interface TempoEvent {
  kind: 'tempo';
  bpm: number;
}

/** Time signature event. */
export interface TimeSignatureEvent {
  kind: 'time';
  beats: number;
  beatType: number;
}

/** Narrative / moment hint for duo shaping (metadata only; not read by exporter). */
export type MomentTag = 'peak' | 'cadence' | 'handoff';

/** One measure: events + optional chord + optional rehearsal mark. */
export interface MeasureModel {
  index: number; // 1-based
  events: ScoreEvent[];
  chord?: string;
  rehearsalMark?: string;
  /** Optional duo narrative tag (peak bar, handoff, final cadence). */
  momentTag?: MomentTag;
}

/** One part (e.g. guitar, bass). */
export interface PartModel {
  id: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
  measures: MeasureModel[];
}

/** MusicXML key signature line (additive; does not change harmony generation). */
export interface KeySignatureLine {
  fifths: number;
  mode: 'major' | 'minor';
  hideKeySignature: boolean;
  caption?: string;
}

/** Golden-path duo: how bar math seal snaps rhythm (ECM chamber keeps quarter-beat grid). */
export type DuoRhythmSnapMode = 'quarter' | 'eighth_beats';

/** Full score model. */
export interface ScoreModel {
  title: string;
  tempo?: number;
  timeSignature?: { beats: number; beatType: number };
  /** Optional duo feel hint (export as direction text; no structural change). */
  feelProfile?: FeelProfile;
  /** Set before finalize for guitar_bass_duo Sibelius-safe eighth-beat attacks; ECM omits (quarter grid). */
  duoRhythmSnap?: DuoRhythmSnapMode;
  /** V3.4 — exporter reads this for `<key>`; when omitted, defaults to C / visible. */
  keySignature?: KeySignatureLine;
  /** TEMP V3.4c — mirror receipt for export debug log; remove when stable. */
  keySignatureExportDebug?: { inferredKey: string; inferredFifths: number; exportKeyWritten: boolean };
  /** Hook repetition bias from songwriter profile — used by duoBarMathFinalize to gate bar 25 restoration. */
  _hookRepetitionBias?: number;
  parts: PartModel[];
}

```

#### engines/composer-os-v2/core/score-model/scoreEventBuilder.ts

```typescript
/**
 * Composer OS V2 — Score event builder
 * Builds score model from structured plans.
 */

import type {
  ScoreModel,
  PartModel,
  MeasureModel,
  NoteEvent,
  RestEvent,
  ScoreEvent,
  FeelProfile,
} from './scoreModelTypes';

/** Create empty measure. */
export function createMeasure(index: number, chord?: string, rehearsalMark?: string): MeasureModel {
  return {
    index,
    events: [],
    chord,
    rehearsalMark,
  };
}

/** Create note event. */
export function createNote(pitch: number, startBeat: number, duration: number, voice = 1, motifRef?: string): NoteEvent {
  return { kind: 'note', pitch, startBeat, duration, voice, ...(motifRef ? { motifRef } : {}) };
}

/** Create rest event. */
export function createRest(startBeat: number, duration: number, voice = 1): RestEvent {
  return { kind: 'rest', startBeat, duration, voice };
}

/** Add event to measure. */
export function addEvent(measure: MeasureModel, event: ScoreEvent): void {
  measure.events.push(event);
}

/** Create part with empty measures. */
export function createPart(
  id: string,
  name: string,
  instrumentIdentity: string,
  midiProgram: number,
  clef: 'treble' | 'bass',
  measureCount: number,
  chordPerBar: (barIndex: number) => string | undefined,
  rehearsalPerBar: (barIndex: number) => string | undefined
): PartModel {
  const measures: MeasureModel[] = [];
  for (let i = 1; i <= measureCount; i++) {
    measures.push(
      createMeasure(i, chordPerBar(i), rehearsalPerBar(i))
    );
  }
  return { id, name, instrumentIdentity, midiProgram, clef, measures };
}

/** Create score model. */
export function createScore(
  title: string,
  parts: PartModel[],
  options?: { tempo?: number; feelProfile?: FeelProfile }
): ScoreModel {
  return {
    title,
    tempo: options?.tempo,
    timeSignature: { beats: 4, beatType: 4 },
    feelProfile: options?.feelProfile,
    parts,
  };
}

```

### 3. Validation: Duo Interaction V3.1 (wall-to-wall) — full file

#### engines/composer-os-v2/core/score-integrity/duoLockQuality.ts

```typescript
/**
 * Guitar–Bass Duo LOCK quality: GCE composite, rhythm anti-loop, melodic heuristics.
 * Additive — used by behaviour gates for `guitar_bass_duo` only.
 */

import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import { activityScoreForBar } from '../goldenPath/activityScore';
import { melodyAuthorityGceLayer } from './duoMelodyIdentityV3';
import {
  countCallResponseEvents,
  guideToneCoverage,
  hasCallResponseInWindow,
  rootRatioStrongBeats,
  scoreJazzDuoBehaviourSoft,
} from './jazzDuoBehaviourValidation';
import {
  isSongModeHookFirstIdentity,
  partitionDuoIdentityIssues,
  type SongModeDuoIdentityIssue,
} from '../song-mode/songModeDuoIdentityBehaviourRules';
import {
  collectMelodyMidiBarRangeInclusive,
  isGuitarMelodyVoiceNote,
} from './guitarVoiceMelody';

export interface DuoLockValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: SongModeDuoIdentityIssue[];
}

function finalizeDuoLock(
  issues: SongModeDuoIdentityIssue[],
  compositionContext: CompositionContext | undefined
): DuoLockValidationResult {
  const songMode = isSongModeHookFirstIdentity(compositionContext);
  const { blocking, warnings } = partitionDuoIdentityIssues(issues, songMode);
  return {
    valid: blocking.length === 0,
    errors: blocking,
    warnings,
    issues,
  };
}

function rhythmSig(m: MeasureModel): string {
  return [...m.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat)
    .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
    .join('|');
}

/** Melody-only rhythm (voice 1) — aligns identity gates with polyphonic guitar. */
export function rhythmSigMelody(m: MeasureModel): string {
  return [...m.events]
    .filter((e) => isGuitarMelodyVoiceNote(e))
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat)
    .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
    .join('|');
}

/**
 * Guitar rest fraction: sum(rest durations) / sum(note + rest durations) across all voices.
 * Per measure each voice fills 4 beats; with two voices the old `rests / (measures×4)` numerator
 * summed both voices’ rests but the denominator only counted one layer — inflating ratio (~2×) and false “too sparse”.
 */
export function guitarRestRatio(guitar: PartModel): number {
  let restBeats = 0;
  let noteBeats = 0;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'rest') restBeats += (e as { duration: number }).duration;
      else if (e.kind === 'note') noteBeats += (e as { duration: number }).duration;
    }
  }
  const total = restBeats + noteBeats;
  return total > 0 ? restBeats / total : 0;
}

/** Max run of consecutive semitone steps in same direction (chromatic run). */
export function maxConsecutiveChromaticSteps(guitar: PartModel): number {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (isGuitarMelodyVoiceNote(e)) pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 2) return 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    if (Math.abs(d) === 1) {
      if (i >= 2) {
        const prev = pitches[i - 1] - pitches[i - 2];
        if (Math.sign(d) === Math.sign(prev) && prev !== 0) run++;
        else run = 2;
      }
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
    }
  }
  return maxRun;
}

/** Stepwise motion with |step| ≤ maxStep (in semitones), same direction. */
export function maxConsecutiveStepwiseMotion(guitar: PartModel, maxStep: number): number {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (isGuitarMelodyVoiceNote(e)) pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 2) return 0;
  let maxRun = 1;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    if (d === 0) continue;
    const ad = Math.abs(d);
    if (ad > maxStep) {
      run = 1;
      dir = Math.sign(d);
      continue;
    }
    const s = Math.sign(d);
    if (dir === 0 || s === dir) {
      run++;
      dir = s;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 2;
      dir = s;
    }
  }
  return maxRun;
}

/** Adjacent melodic intervals include a repeated interval size (motivic identity). */
export function hasRepeatedIntervalCell(guitar: PartModel): boolean {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (isGuitarMelodyVoiceNote(e)) pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 4) return true;
  const adjs: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    adjs.push(Math.abs(pitches[i] - pitches[i - 1]) % 12);
  }
  const seen = new Set<number>();
  for (const iv of adjs) {
    if (iv === 0) continue;
    if (seen.has(iv)) return true;
    seen.add(iv);
  }
  return false;
}

/** V3.1 — Guitar rests in 15–45% window (conversational space; upper slack for motif variance). */
export function spaceUsageScore(restRatio: number): number {
  if (restRatio < 0.15 || restRatio > 0.45) return Math.max(0, 0.45 - Math.min(restRatio, 1 - restRatio) * 0.5);
  const mid = 0.3;
  return Math.min(1, 1 - Math.abs(restRatio - mid) / 0.15);
}

/** V3.1 — Phrase A vs B: guitar vs bass activity swap (lead vs support). */
export function roleContrastScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const g12 = (activityScoreForBar(g, 1) + activityScoreForBar(g, 2)) / 2;
  const g34 = (activityScoreForBar(g, 3) + activityScoreForBar(g, 4)) / 2;
  const b12 = (activityScoreForBar(b, 1) + activityScoreForBar(b, 2)) / 2;
  const b34 = (activityScoreForBar(b, 3) + activityScoreForBar(b, 4)) / 2;
  const micro = Math.abs(g12 - g34) + Math.abs(b34 - b12);
  const avg = (part: typeof g, from: number, to: number) => {
    let s = 0;
    for (let i = from; i <= to; i++) s += activityScoreForBar(part, i);
    return s / (to - from + 1);
  };
  const gA = avg(g, 1, 4);
  const gB = avg(g, 5, 8);
  const bA = avg(b, 1, 4);
  const bB = avg(b, 5, 8);
  const macro = Math.abs(gA - gB) + Math.abs(bA - bB);
  const contrast = 0.45 * micro + 0.55 * macro;
  return Math.min(1, contrast / 14);
}

/** V3.1 — Call/response density + phrase boundaries (soft). */
export function conversationalFlowScore(score: ScoreModel): number {
  const cr = countCallResponseEvents(score);
  return Math.min(1, cr / 5);
}

/**
 * V3.1 — Composite 0–1.2 layer: call/response clarity, role contrast, flow, space.
 */
export function interactionAuthorityGceLayer(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  const restR = guitarRestRatio(g);
  const cr = countCallResponseEvents(score);
  const crN = Math.min(1, cr / 4);
  const rc = roleContrastScore(score);
  const flow = conversationalFlowScore(score);
  const space = spaceUsageScore(restR);
  return Math.min(1.2, 0.28 * crN + 0.24 * rc + 0.26 * flow + 0.22 * space + 0.1);
}

/** Largest |Δpitch| between consecutive **melody (voice 1)** attacks in a bar (time-ordered). */
export function guitarBarMaxAdjacentInterval(m: MeasureModel): number {
  const notes = [...m.events]
    .filter((e) => isGuitarMelodyVoiceNote(e))
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    ) as { pitch: number }[];
  if (notes.length < 2) return 0;
  let max = 0;
  for (let i = 1; i < notes.length; i++) {
    max = Math.max(max, Math.abs(notes[i].pitch - notes[i - 1].pitch));
  }
  return max;
}

/** V3.2: bar 7 max adjacent leap must be ≥ bar 6 (used when picking among multi-seed golden-path variants). */
export function duoGuitarBarSevenIntervalPeakVsBarSixOk(score: ScoreModel): boolean {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return true;
  const m6 = g.measures.find((x) => x.index === 6);
  const m7 = g.measures.find((x) => x.index === 7);
  if (!m6 || !m7) return true;
  return guitarBarMaxAdjacentInterval(m7) >= guitarBarMaxAdjacentInterval(m6);
}

function maxNoteDurationInBar(m: MeasureModel): number {
  let max = 0;
  for (const e of m.events) {
    if (e.kind === 'note') max = Math.max(max, (e as { duration: number }).duration);
  }
  return max;
}

function syncopationStrengthBar(m: MeasureModel): number {
  let s = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const sb = (e as { startBeat: number }).startBeat;
    const frac = sb % 1;
    if (sb > 0.15 && frac > 0.15 && frac < 0.85) s += 0.35;
  }
  return Math.min(1, s);
}

function barDistinctivenessRaw(gm: MeasureModel, _bar: number): number {
  const maxIv = guitarBarMaxAdjacentInterval(gm);
  const maxDur = maxNoteDurationInBar(gm);
  const sync = syncopationStrengthBar(gm);
  const nNotes = gm.events.filter((e) => e.kind === 'note' && isGuitarMelodyVoiceNote(e)).length;
  return maxIv * 0.11 + maxDur * 1.75 + sync * 2.1 + (nNotes >= 3 ? 0.45 : 0);
}

/** Heuristic: which 1–8 bar has the strongest “signature” profile (bar 7 structurally favoured). */
export function distinctiveGuitarBarIndex(guitar: PartModel): number {
  let best = 1;
  let bestS = -1;
  for (let bar = 1; bar <= 8; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const s = barDistinctivenessRaw(m, bar);
    if (s > bestS) {
      bestS = s;
      best = bar;
    }
  }
  return best;
}

/**
 * V3.2 / 18.2C — Phrase-level identity: cadence area + distributed distinctiveness + contour /
 * recurrence, not a single-bar peak.
 */
export function computeDuoIdentityMomentScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const m6 = g.measures.find((x) => x.index === 6);
  const m7 = g.measures.find((x) => x.index === 7);
  const m8 = g.measures.find((x) => x.index === 8);
  const b7 = b.measures.find((x) => x.index === 7);
  if (!m7 || !m8) return 0;
  let s = 0;
  s += Math.min(2.8, guitarBarMaxAdjacentInterval(m7) / 3.2);
  s += Math.min(2.2, maxNoteDurationInBar(m7) * 1.05);
  s += syncopationStrengthBar(m7) * 1.1;

  const distBars: number[] = [];
  for (let bar = 5; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (m) distBars.push(barDistinctivenessRaw(m, bar));
  }
  distBars.sort((a, b) => b - a);
  const distributed = (distBars[0] ?? 0) * 0.5 + (distBars[1] ?? 0) * 0.35;
  s += Math.min(2.6, distributed * 0.4);

  const melodyB = collectMelodyMidiBarRangeInclusive(g, 5, 8);
  if (melodyB.length >= 2) {
    const sp = Math.max(...melodyB) - Math.min(...melodyB);
    s += Math.min(1.5, sp / 11);
  }

  const rs = new Set<string>();
  for (let bar = 5; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (m) rs.add(rhythmSigMelody(m));
  }
  if (rs.size >= 3) s += 1.15;
  else if (rs.size >= 2) s += 0.55;

  if (m6) s += rhythmSigMelody(m7) !== rhythmSigMelody(m6) ? 1.5 : 0;
  s += rhythmSigMelody(m7) !== rhythmSigMelody(m8) ? 1.5 : 0;
  if (b7) {
    const gRh = rhythmSigMelody(m7);
    const bRh = rhythmSig(b7);
    if (gRh !== bRh || gRh.split('|').length < 3) s += 1.3;
    else s += 0.25;
  }
  const a7 = activityScoreForBar(g, 7);
  const a8 = activityScoreForBar(g, 8);
  if (a7 > a8 + 0.05) s += 0.9;
  return Math.min(10, s * 1.08 + 0.95);
}

/** V3.2 — 0–1.2 layer for composite GCE. */
export function identityMomentGceLayer(score: ScoreModel): number {
  return Math.min(1.2, (computeDuoIdentityMomentScore(score) / 10) * 1.18);
}

function guitarBarRestBeats(m: MeasureModel): number {
  let r = 0;
  for (const e of m.events) {
    if (e.kind === 'rest') r += (e as { duration: number }).duration;
  }
  return r;
}

export function firstGuitarAttackInBar(m: MeasureModel): number | undefined {
  const notes = [...m.events]
    .filter((e) => isGuitarMelodyVoiceNote(e))
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    );
  if (!notes.length) return undefined;
  return (notes[0] as { startBeat: number }).startBeat;
}

function lastGuitarNoteEndInBar(m: MeasureModel): number | undefined {
  let best = -1;
  for (const e of m.events) {
    if (!isGuitarMelodyVoiceNote(e)) continue;
    const n = e as { startBeat: number; duration: number };
    best = Math.max(best, n.startBeat + n.duration);
  }
  return best < 0 ? undefined : best;
}

/** Bar resolves after meaningful rest (delayed resolution / across-the-barline feel in 4/4 slice). */
export function barHasDelayedResolutionGesture(m: MeasureModel): boolean {
  const notes = [...m.events]
    .filter((e) => isGuitarMelodyVoiceNote(e))
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    );
  if (notes.length === 0) return false;
  const first = (notes[0] as { startBeat: number }).startBeat;
  const last = notes[notes.length - 1] as { startBeat: number; duration: number };
  const lastEnd = last.startBeat + last.duration;
  if (first >= 1.0 && lastEnd >= 3.35) return true;
  if (first >= 1.5) return true;
  return false;
}

/**
 * V3.3 — Phrasing polish: asymmetry, delayed resolution, attack variety, restraint; penalise mirror phrases.
 */
export function computeDuoPolishV33Score(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  const attacks: number[] = [];
  let asymmetryHits = 0;
  let delayedBars = 0;
  let totalNotes = 0;
  let overResolvedBars = 0;

  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const fa = firstGuitarAttackInBar(m);
    const le = lastGuitarNoteEndInBar(m);
    if (fa !== undefined) attacks.push(fa);
    totalNotes += m.events.filter((e) => isGuitarMelodyVoiceNote(e)).length;
    if (fa !== undefined && fa >= 0.62) asymmetryHits++;
    if (fa !== undefined && le !== undefined && le <= 3.15) asymmetryHits++;
    if (barHasDelayedResolutionGesture(m)) delayedBars++;

    let bestEnd = -1;
    let bestStart = 0;
    let bestDur = 0;
    for (const e of m.events) {
      if (!isGuitarMelodyVoiceNote(e)) continue;
      const n = e as { startBeat: number; duration: number };
      const end = n.startBeat + n.duration;
      if (end > bestEnd) {
        bestEnd = end;
        bestStart = n.startBeat;
        bestDur = n.duration;
      }
    }
    if (bestEnd >= 0 && bestStart <= 0.85 && bestDur >= 2.25) overResolvedBars++;
  }

  let s = 0;
  const spread = attacks.length >= 2 ? Math.max(...attacks) - Math.min(...attacks) : 0;
  s += Math.min(2.9, spread * 3.1);
  s += Math.min(2.4, asymmetryHits * 0.48);
  s += Math.min(2.4, delayedBars * 1.0);

  const uniq = new Set(attacks.map((a) => Math.round(a * 4) / 4));
  s += Math.min(1.5, Math.max(0, uniq.size - 2) * 0.32);

  if (totalNotes <= 32) s += 1.15;
  else if (totalNotes <= 36) s += 0.7;
  else if (totalNotes <= 40) s += 0.35;
  else s -= 0.75;

  const a4 = attacks.slice(0, 4);
  const b4 = attacks.slice(4);
  const meanA = a4.length ? a4.reduce((x, y) => x + y, 0) / a4.length : 0;
  const meanB = b4.length ? b4.reduce((x, y) => x + y, 0) / b4.length : 0;
  if (attacks.length >= 6 && Math.abs(meanA - meanB) < 0.14 && spread < 0.42) s -= 1.65;

  if (overResolvedBars >= 5) s -= 1.1;

  const m7 = g.measures.find((x) => x.index === 7);
  if (m7) {
    const rb = guitarBarRestBeats(m7);
    const nc = m7.events.filter((e) => isGuitarMelodyVoiceNote(e)).length;
    if (rb >= 0.45 && nc <= 4) s += 1.05;
  }

  return Math.min(10, Math.max(0, s * 1.04 + 0.45));
}

/** V3.3 — 0–1.2 layer: inevitability / restraint (score-only). */
export function polishV33GceLayer(score: ScoreModel): number {
  return Math.min(1.2, (computeDuoPolishV33Score(score) / 10) * 1.15);
}

/**
 * Composite 0–10 “GCE-style” score: melody memorability, motif-like intervals, bass clarity, interaction.
 * V3.3 adds polish layer (asymmetry, delayed resolution, restraint).
 */
export function computeDuoGceScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const gc = guideToneCoverage(b);
  const rr = rootRatioStrongBeats(b);
  const soft = scoreJazzDuoBehaviourSoft(score);
  const restR = guitarRestRatio(g);
  const chrom = maxConsecutiveChromaticSteps(g);
  const stepwise = maxConsecutiveStepwiseMotion(g, 2);
  const rep = hasRepeatedIntervalCell(g) ? 1 : 0.35;
  const callA = hasCallResponseInWindow(score, 4, 1);
  const callB = hasCallResponseInWindow(score, 4, 5);
  const call = callA && callB ? 1 : callA || callB ? 0.72 : 0.4;
  const softN = Math.min(1, Math.max(0, (soft - 4) / 20));
  const maLayer = melodyAuthorityGceLayer(g);
  const iaLayer = interactionAuthorityGceLayer(score);
  const idLayer = identityMomentGceLayer(score);
  const p33Layer = polishV33GceLayer(score);
  let s =
    2.45 * gc +
    1.52 * (1 - rr) +
    1.72 * softN +
    1.12 * Math.min(1.35, restR / 0.14) +
    0.62 * rep +
    0.92 * call +
    0.82 * (1 - Math.min(1, chrom / 7)) +
    0.28 * (1 - Math.min(1, stepwise / 18)) +
    0.32 * maLayer +
    0.3 * iaLayer +
    0.28 * idLayer +
    0.3 * p33Layer;
  s = Math.min(10, s * 1.38 + 0.62);
  return Math.round(Math.max(0, s) * 10) / 10;
}

const DUO_GCE_FLOOR = 9.0;

function duoGceFloorForForm(effectiveFormBars: number | undefined): number {
  if (effectiveFormBars === undefined) return DUO_GCE_FLOOR;
  if (effectiveFormBars >= 32) return 8.25;
  if (effectiveFormBars >= 16) return 8.55;
  return DUO_GCE_FLOOR;
}

export function validateDuoGceHardGate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return finalizeDuoLock([], opts?.compositionContext);
  const gce = computeDuoGceScore(score);
  const floor = duoGceFloorForForm(opts?.effectiveFormBars);
  if (gce < floor) {
    return finalizeDuoLock(
      [
        {
          ruleId: 'lock_gce_floor',
          message: `Duo LOCK: GCE ${gce.toFixed(1)} < ${floor} (V3.3 polish, motif, interaction, bass clarity)`,
        },
      ],
      opts?.compositionContext
    );
  }
  return finalizeDuoLock([], opts?.compositionContext);
}

/**
 * V3.3 — Soft gate: minimum phrasing polish (asymmetry / timing / restraint signals).
 */
function polishMinScore(effectiveFormBars: number | undefined): number {
  if (effectiveFormBars === undefined) return 7.2;
  if (effectiveFormBars >= 32) return 6.45;
  if (effectiveFormBars >= 16) return 6.75;
  return 7.2;
}

export function validateDuoPolishV33Gate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return finalizeDuoLock([], opts?.compositionContext);
  const issues: SongModeDuoIdentityIssue[] = [];
  const p = computeDuoPolishV33Score(score);
  const minP = polishMinScore(opts?.effectiveFormBars);
  if (p < minP) {
    issues.push({
      ruleId: 'lock_polish_score_low',
      message: `Duo polish V3.3: phrasing score ${p.toFixed(1)} < ${minP.toFixed(2)} (asymmetry / resolution / restraint)`,
    });
  }
  const attacks: number[] = [];
  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const fa = firstGuitarAttackInBar(m);
    if (fa !== undefined) attacks.push(fa);
  }
  const spread = attacks.length >= 2 ? Math.max(...attacks) - Math.min(...attacks) : 0;
  let delayed = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (m && barHasDelayedResolutionGesture(m)) delayed++;
  }
  const longForm = (opts?.effectiveFormBars ?? 8) >= 16;
  if (!longForm && spread < 0.28 && delayed === 0) {
    issues.push({
      ruleId: 'lock_polish_too_square',
      message: 'Duo polish V3.3: phrasing too square (need late entry, early cut, or delayed resolution)',
    });
  }
  return finalizeDuoLock(issues, opts?.compositionContext);
}

/** V3.3 — max − min first-attack onset across bars (asymmetry proxy). */
export function guitarPhraseOnsetSpread(guitar: PartModel): number {
  const attacks: number[] = [];
  for (let bar = 1; bar <= 8; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const fa = firstGuitarAttackInBar(m);
    if (fa !== undefined) attacks.push(fa);
  }
  return attacks.length >= 2 ? Math.max(...attacks) - Math.min(...attacks) : 0;
}

/** V3.3 — bars with delayed-resolution gesture. */
export function countDelayedResolutionBars(guitar: PartModel): number {
  let n = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (m && barHasDelayedResolutionGesture(m)) n++;
  }
  return n;
}

/** Guitar rhythm loop + rest window + unison rhythm with bass (duo-specific). */
export function validateDuoRhythmAntiLoop(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const issues: SongModeDuoIdentityIssue[] = [];
  if (!guitar || !bass) return finalizeDuoLock([], opts?.compositionContext);

  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  let prevRh = '';
  let runRh = 0;
  let maxRh = 0;
  for (const m of sorted) {
    const rh = rhythmSig(m);
    if (rh === prevRh) runRh++;
    else {
      runRh = 1;
      prevRh = rh;
    }
    maxRh = Math.max(maxRh, runRh);
  }
  const maxRhAllowed = (opts?.effectiveFormBars ?? 8) >= 16 ? 3 : 2;
  if (maxRh > maxRhAllowed) {
    issues.push({
      ruleId: 'lock_rhythm_cell_repeat',
      message: `Duo LOCK: identical guitar rhythmic cell repeats >${maxRhAllowed} consecutive bars`,
    });
  }

  let unisonRun = 0;
  let maxUnison = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = guitar.measures.find((x) => x.index === bar);
    const bm = bass.measures.find((x) => x.index === bar);
    if (!gm || !bm) continue;
    const gRh = rhythmSig(gm);
    const bRh = rhythmSig(bm);
    if (gRh.length > 0 && gRh === bRh && gRh.split('|').length >= 3) {
      unisonRun++;
      maxUnison = Math.max(maxUnison, unisonRun);
    } else {
      unisonRun = 0;
    }
  }
  const maxUniAllowed = (opts?.effectiveFormBars ?? 8) >= 16 ? 3 : 2;
  if (maxUnison > maxUniAllowed) {
    issues.push({
      ruleId: 'lock_unison_dense_rhythm',
      message: `Duo LOCK: guitar and bass share identical dense rhythm for more than ${maxUniAllowed} consecutive bars`,
    });
  }

  return finalizeDuoLock(issues, opts?.compositionContext);
}

const DUAL_DENSE_ACTIVITY = 6;

/**
 * V3.0 swing: ≥20% guitar rests, no long dual-density runs, bass not constant walking, bass rhythm variety.
 */
export function validateDuoSwingRhythm(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const issues: SongModeDuoIdentityIssue[] = [];
  if (!guitar || !bass) return finalizeDuoLock([], opts?.compositionContext);

  const rr = guitarRestRatio(guitar);
  if (rr < 0.15) {
    issues.push({
      ruleId: 'swing_guitar_rests_too_low',
      message: 'Duo swing: guitar needs at least 15% rests (conversational space)',
    });
  }
  if (rr > 0.45) {
    issues.push({
      ruleId: 'swing_guitar_rests_too_high',
      message: 'Duo swing: guitar rests exceed 45% (needs more melodic presence)',
    });
  }

  const tb = guitar.measures.length;
  let dualRun = 0;
  let maxDual = 0;
  for (let b = 1; b <= tb; b++) {
    const ga = activityScoreForBar(guitar, b);
    const ba = activityScoreForBar(bass, b);
    if (ga >= DUAL_DENSE_ACTIVITY && ba >= DUAL_DENSE_ACTIVITY) {
      dualRun++;
      maxDual = Math.max(maxDual, dualRun);
    } else {
      dualRun = 0;
    }
  }
  const longFormSwing = (opts?.effectiveFormBars ?? 8) >= 16;
  const maxDualAllowed = longFormSwing ? 3 : 2;
  if (maxDual > maxDualAllowed) {
    issues.push({
      ruleId: 'swing_dual_dense_run',
      message: `Duo swing: both instruments dense for more than ${maxDualAllowed} consecutive bars`,
    });
  }

  let walkLikeBars = 0;
  for (const m of bass.measures) {
    const nNotes = m.events.filter((e) => e.kind === 'note').length;
    if (nNotes >= 5) walkLikeBars++;
  }
  const walkCap = longFormSwing ? 6 : 4;
  if (walkLikeBars > walkCap) {
    issues.push({
      ruleId: 'swing_bass_constant_walking',
      message: 'Duo swing: bass is too constant-walking (need held notes / anticipations / off-beats)',
    });
  }

  const sortedBass = [...bass.measures].sort((a, b) => a.index - b.index);
  let prevBRh = '';
  let runBRh = 0;
  let maxBRh = 0;
  for (const m of sortedBass) {
    const rh = rhythmSig(m);
    if (rh.length > 0 && rh === prevBRh) runBRh++;
    else {
      runBRh = 1;
      prevBRh = rh;
    }
    maxBRh = Math.max(maxBRh, runBRh);
  }
  const maxBassRhAllowed = longFormSwing ? 3 : 2;
  if (maxBRh > maxBassRhAllowed) {
    issues.push({
      ruleId: 'swing_bass_rhythm_cell_repeat',
      message: `Duo swing: bass rhythmic cell repeats more than ${maxBassRhAllowed} consecutive bars`,
    });
  }

  return finalizeDuoLock(issues, opts?.compositionContext);
}

/** Bars where summed note durations ≥ threshold (full activity). */
export function maxConsecutiveNoteHeavyBars(part: PartModel, thresholdBeats = 3.5): number {
  const sorted = [...part.measures].sort((a, b) => a.index - b.index);
  let run = 0;
  let maxRun = 0;
  for (const m of sorted) {
    let noteBeats = 0;
    for (const e of m.events) {
      if (e.kind === 'note') noteBeats += (e as { duration: number }).duration;
    }
    if (noteBeats >= thresholdBeats) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  return maxRun;
}

/**
 * V3.1 — Explicit interaction floor: call/response count, anti-streaming, role contrast.
 */
export function validateDuoInteractionAuthorityGate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext }
): DuoLockValidationResult {
  const issues: SongModeDuoIdentityIssue[] = [];
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return finalizeDuoLock([], opts?.compositionContext);
  if (countCallResponseEvents(score) < 2) {
    issues.push({
      ruleId: 'ix_call_response_events',
      message: 'Duo interaction V3.1: need at least 2 call/response events per 8 bars',
    });
  }
  /** Wall-to-wall sustained activity: ≥3.95 beats of notes, no meaningful breath (anti-streaming). */
  if (maxConsecutiveNoteHeavyBars(g, 3.95) > 2) {
    issues.push({
      ruleId: 'ix_guitar_wall_to_wall',
      message: 'Duo interaction V3.1: guitar sustained wall-to-wall activity exceeds two bars',
    });
  }
  if (maxConsecutiveNoteHeavyBars(b, 3.95) > 2) {
    issues.push({
      ruleId: 'ix_bass_wall_to_wall',
      message: 'Duo interaction V3.1: bass sustained wall-to-wall activity exceeds two bars',
    });
  }
  if (roleContrastScore(score) < 0.06) {
    issues.push({
      ruleId: 'ix_role_contrast_weak',
      message: 'Duo interaction V3.1: role contrast between phrase A and B is too weak',
    });
  }
  return finalizeDuoLock(issues, opts?.compositionContext);
}

/**
 * V3.2 / 18.2C — Phrase identity: score floor + cadence-area contour (melody rhythm), not “bar 7 wins”.
 */
export function validateDuoIdentityMomentGate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext }
): DuoLockValidationResult {
  const issues: SongModeDuoIdentityIssue[] = [];
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return finalizeDuoLock([], opts?.compositionContext);
  const id = computeDuoIdentityMomentScore(score);
  if (id < 8.5) {
    issues.push({
      ruleId: 'id_moment_score_low',
      message: `Duo identity V3.2: phrase identity score ${id.toFixed(1)} < 8.5`,
    });
  }
  const m6 = g.measures.find((x) => x.index === 6);
  const m7 = g.measures.find((x) => x.index === 7);
  const m8 = g.measures.find((x) => x.index === 8);
  const b7 = b.measures.find((x) => x.index === 7);
  if (m7 && m6 && m8 && rhythmSigMelody(m7) === rhythmSigMelody(m6) && rhythmSigMelody(m7) === rhythmSigMelody(m8)) {
    issues.push({
      ruleId: 'id_cadence_area_rhythm_flat',
      message:
        'Duo identity V3.2: melody rhythm in bars 6–8 is identical (no identifiable cadence contour)',
    });
  }
  if (m7 && b7) {
    const gr = rhythmSigMelody(m7);
    const br = rhythmSig(b7);
    if (gr.length > 0 && gr === br && gr.split('|').length >= 3) {
      issues.push({
        ruleId: 'id_bass_mirrors_guitar_bar7',
        message: 'Duo identity V3.2: bass mirrors guitar melody rhythm on bar 7',
      });
    }
  }
  return finalizeDuoLock(issues, opts?.compositionContext);
}

```

### 4. Validation: voice-leading jumps — full file

#### engines/composer-os-v2/core/style-modules/barry-harris/moduleValidation.ts

```typescript
/**
 * Composer OS V2 — Barry Harris style validation
 */

import type { ScoreModel } from '../../score-model/scoreModelTypes';

export interface BarryHarrisValidationResult {
  valid: boolean;
  errors: string[];
}

function maxVoiceLeadJump(pitches: number[]): number {
  let max = 0;
  for (let i = 1; i < pitches.length; i++) {
    max = Math.max(max, Math.abs(pitches[i] - pitches[i - 1]));
  }
  return max;
}

export function validateBarryHarrisConformance(score: ScoreModel): BarryHarrisValidationResult {
  const errors: string[] = [];

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (guitar) {
    const allPitches: number[] = [];
    for (const m of guitar.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') allPitches.push(e.pitch);
      }
    }
    const maxJump = maxVoiceLeadJump(allPitches);
    if (maxJump > 12) errors.push('Voice-leading jumps excessive for current duo grammar');
  }

  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (bass) {
    const allPitches: number[] = [];
    for (const m of bass.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') allPitches.push(e.pitch);
      }
    }
    const maxJump = maxVoiceLeadJump(allPitches);
    /** Walking bass + register shifts: allow up to 14 st (echo / cadence moves). */
    if (maxJump > 14) errors.push('Bass voice-leading jumps excessive');
  }

  const chordCount = new Set(score.parts.flatMap((p) => p.measures.map((m) => m.chord).filter(Boolean))).size;
  if (chordCount < 3) errors.push('Harmony too static for current duo grammar');

  return { valid: errors.length === 0, errors };
}

```

## SECTION 3: ARCHITECTURE SUMMARY (guitarVoice2WybleLayer.ts)

### a) Voice 2 note event type
Uses NoteEvent from scoreModelTypes: kind note; pitch number (MIDI); startBeat number; duration number; optional voice, articulation, velocity, motifRef.

### b) Start / end / units
- **Start:** `startBeat` (beats within the measure, 0–4 in 4/4).
- **End:** not stored; **duration** in **beats** (measure-local). Global span in beats = `(measureIndex - 1) * barDuration + startBeat` through `+ duration`.
- **Not** ticks/seconds in the **score model**; exporter converts beats to MusicXML ticks via `DIVISIONS`.

### c) Bar duration
- Constant `V2_BAR_DURATION_BEATS = 4` (beats per measure in this path).

### d) Post-injection normalization
- **Function:** `normalizeRealizedVoice2PostInjection182B3`
- **Called from:** `stabiliseGuitarVoice2Wyble18_2B_3` (same file).
- **Pipeline:** `injectPhaseAGuitarVoice2Probe` in `phaseAGuitarPolyphonyProbe.ts` calls `stabiliseGuitarVoice2Wyble18_2B_3` after 18.2B.1 and 18.2B.2.
- **Line numbers (current tree):** `normalizeRealizedVoice2PostInjection182B3` at line **3963**; `stabiliseGuitarVoice2Wyble18_2B_3` at line **4004** in `guitarVoice2WybleLayer.ts` (also in Section 2).

### e) Call order (inject → validation) — high level
1. `injectGuitarVoice2WybleLayer` (guitar part)
2. `stabiliseGuitarVoice2Wyble18_2B_1`
3. `stabiliseGuitarVoice2Wyble18_2B_2`
4. `stabiliseGuitarVoice2Wyble18_2B_3` → `normalizeRealizedVoice2PostInjection182B3` (run-length, breathing, sustained wall, coverage loop; then `breakConsecutiveV2Sustains`, `clampV2NotesToBarBoundaries`, texture density)
5. `computeGuitarVoice2PolyphonyDiagnostics` + `logGuitarVoice2PolyphonyDiagnosticReport`
6. Later: score export + `validateBarryHarrisConformance` / `validateDuoInteractionAuthorityGate` on final `ScoreModel` (outside Wyble module).

### f) Pre-commit seam
- Voice 2 events are written directly to `guitar.measures[].events` during injection and stabilisation. There is **no** separate intermediate store in this module; the shared representation is `PartModel.measures`.

### g) Phase 18.2B.5 functions
- `isFullBarSustained` — ≥7/8 bar duration threshold for “full bar” sustained.
- `barHasFullBarV2Sustain` — any V2 note in measure passes `isFullBarSustained`.
- `convertMeasureBreakV2FullSustain` — replace one full-bar V2 note with shortened note + rest (pitch preserved via spread).
- `breakConsecutiveV2Sustains` — adjacent full-bar pairs; convert second bar of each pair.
- `computeLongestConsecutiveSustainedRun182B5` — diagnostic max run of full-bar sustained bars.
- `buildRealizedActiveBarSet` — bars where V2 sounds (incl. spill), min eighth.
- `clampV2NotesToBarBoundaries` — shorten duration if note crosses into next active bar.
- `applyV2NoteEntryClones182B5` — write clamped note clones back to measures.
- `computeLongestV2SustainAcrossActiveBars182B5` — diagnostic span metric.
- `logAdjacentActiveBarPairsDebug182B5` — console.debug adjacent active pairs.
- `normalizeRealizedVoice2PostInjection182B3` — orchestrates normalization + clamp + texture pass.

## SECTION 4: CURRENT DIAGNOSTIC OUTPUT

_Not captured: desktop app / Guitar–Bass Duo generation was not executed here (no build/run). Verbatim shape from `logGuitarVoice2PolyphonyDiagnosticReport` (`guitarVoice2PolyphonyDiagnostics.ts`):_

```text
VOICE 2 DIAGNOSTIC
Bars active: <v2ActiveBars> / <totalBars>
Bar coverage: <v2BarCoverage.toFixed(2)>
Total notes: <v2TotalNotes>
Notes per active bar: <v2AvgNotesPerActiveBar.toFixed(2)>
Longest rest gap: <v2LongestRestGap>
Longest active run: <v2LongestActiveRun>
Strong-beat entries: <v2StrongBeatEntries>
Offbeat entries: <v2OffbeatEntries>
```

## SECTION 5: VALIDATION RULES

### A: guitar sustained wall-to-wall activity exceeds two bars
- **File:** `engines/composer-os-v2/core/score-integrity/duoLockQuality.ts`
- **Function:** `validateDuoInteractionAuthorityGate`
- **Condition:** if (maxConsecutiveNoteHeavyBars(g, 3.95) > 2)
- **Reads:** score.parts → guitar PartModel → measures sorted by index → each m.events: sums duration of every kind === note event (all voices in the part).
- **Planned shapes:** No — realized note durations in the score model.

### B: Voice-leading jumps excessive for current duo grammar
- **File:** `engines/composer-os-v2/core/style-modules/barry-harris/moduleValidation.ts`
- **Function:** `validateBarryHarrisConformance`
- **Condition:** if (maxJump > 12) errors.push(Voice-leading jumps excessive for current duo grammar)
- **Reads:** Guitar part: all `note` events in measure order flattened to `pitch` array; max consecutive semitone jump in that order (**includes V1 + V2**).
- **Planned shapes:** No — realized pitches.

## SECTION 6: CHANGELOG AND README PATHS

- `CHANGELOG.md` (repo root)
- `docs/CHANGELOG.md`
- `README.md` (repo root)
- `engines/composer-os-v2/README.md` (module-level)
