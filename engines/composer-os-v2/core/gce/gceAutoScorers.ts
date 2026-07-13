import type { MelodicNote } from './gce_melody_eval';
import type { SqVrbGceScorerAdjustments } from '../counterpoint/vrbProfiles/sqVrbProfileTypes';
import type { FormMap } from '../compositionContext';
import type { CadenceTag } from '../counterpoint/abstractLineSet';
import type { PhraseCadenceStrength } from '../counterpoint/quartetFeatureTypes';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { CompositionContext } from '../compositionContext';
import {
  scoreEcmMethenyFeel,
  scoreEcmSchneiderFeel,
  type EcmScorePlans,
} from '../ecm/ecmChamberScoring';
import type { EcmChamberMode } from '../ecm/ecmChamberTypes';
import { getSqVrbGceAdjustments } from '../counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { BEATS_PER_MEASURE, type NoteEvent, type PartModel, type ScoreModel } from '../score-model/scoreModelTypes';
import { activePartsNormalizedBigBand } from './gceStructuralMemory';
import { resolveFieldForBar } from '../harmony/pitchFieldResolver';
import type { PitchFieldSpine } from '../harmony/pitchFieldSpineTypes';

/** Per-meso register σ ceiling for SQ→BB contrapuntal Melodic Identity (Bartók default = 24 st). */
const CONTRAPUNTAL_REGISTER_STDEV_CEILING_DEFAULT = 24;

/** SQ→BB only — explicit opt-in; never inferred from VRB id alone. */
export interface ContrapuntalMesoSpanRef {
  startBeat: number;
  endBeat: number;
  cadenceStrength: PhraseCadenceStrength;
}

export interface ContrapuntalGceScoringOptions {
  contrapuntalLinePolicy: true;
  mesoSpans: readonly ContrapuntalMesoSpanRef[];
  cadenceTags: readonly CadenceTag[];
  /** SQ→BB Harmonic Voice id for per-composer GCE tweaks (`ravel` → σ≤20 st, …). */
  sqVrbId?: string;
  /** SQ→BB — informational only (no GCE threshold changes). */
  chordTimelineSource?: 'user' | 'internal' | 'mixed';
  /** Zimmer passacaglia sub-mode — raises σ ceiling when ground bass + progressive entry. */
  passacagliaMode?: boolean;
  /** Bar used for per-section SQ GCE resolution (Commit 4+5). */
  scoringBar?: number;
  /** Seam bar scored with merged adjacent VRB adjustments. */
  isBoundaryBar?: boolean;
  /** Pre-merged per-bar GCE adjustments (boundary bars). */
  sqGceAdjustmentsOverride?: SqVrbGceScorerAdjustments;
}

/** Melodic line position in bar-offset space (matches meso span startBeat/endBeat). */
function melodicAbsBars(n: MelodicNote): number {
  return (n.bar - 1) + n.beat / BEATS_PER_MEASURE;
}

function pitchedNotesInBarRange(
  line: MelodicNote[],
  startBeat: number,
  endBeat: number,
): MelodicNote[] {
  return line.filter((n) => {
    if (n.rest || n.midi <= 0) return false;
    const abs = melodicAbsBars(n);
    return abs >= startBeat - 1e-6 && abs < endBeat - 1e-6;
  });
}

function registerCohesionPerMesoSpans(
  line: MelodicNote[],
  mesoSpans: readonly ContrapuntalMesoSpanRef[],
  stdevCeilingSt: number = CONTRAPUNTAL_REGISTER_STDEV_CEILING_DEFAULT,
): number {
  const ceiling = stdevCeilingSt > 0 ? stdevCeilingSt : CONTRAPUNTAL_REGISTER_STDEV_CEILING_DEFAULT;
  const perPhrase: number[] = [];
  for (const span of mesoSpans) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    if (notes.length < 2) {
      perPhrase.push(0.55);
      continue;
    }
    const pitches = notes.map((n) => n.midi);
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length;
    const stddev = Math.sqrt(variance);
    if (stddev <= ceiling) {
      perPhrase.push(1);
    } else {
      const excess = stddev - ceiling;
      perPhrase.push(Math.max(0, 1 - excess / ceiling));
    }
  }
  if (perPhrase.length === 0) return 0.5;
  const sorted = [...perPhrase].sort((a, b) => b - a);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.75));
  return sorted.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}

/** Goldsmith — σ≤24 nominal; soft warning only between 24–26 st (sequential ascent). */
function registerCohesionPerMesoSpansGoldsmith(
  line: MelodicNote[],
  mesoSpans: readonly ContrapuntalMesoSpanRef[],
  ceilingSt: number,
  softCeilingSt: number,
): number {
  const ceiling = ceilingSt > 0 ? ceilingSt : CONTRAPUNTAL_REGISTER_STDEV_CEILING_DEFAULT;
  const soft = softCeilingSt > ceiling ? softCeilingSt : ceiling + 2;
  const perPhrase: number[] = [];
  for (const span of mesoSpans) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    if (notes.length < 2) {
      perPhrase.push(0.55);
      continue;
    }
    const pitches = notes.map((n) => n.midi);
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length;
    const stddev = Math.sqrt(variance);
    if (stddev <= ceiling) {
      perPhrase.push(1);
    } else if (stddev <= soft) {
      const excess = stddev - ceiling;
      perPhrase.push(Math.max(0.82, 1 - excess / (soft - ceiling + 1) * 0.35));
    } else {
      const excess = stddev - soft;
      perPhrase.push(Math.max(0, 1 - excess / ceiling));
    }
  }
  if (perPhrase.length === 0) return 0.5;
  const sorted = [...perPhrase].sort((a, b) => b - a);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.75));
  return sorted.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}

/** Glass — σ≤18 hard; soft flag 16–18 st (mid-register additive loops). */
function registerCohesionPerMesoSpansGlass(
  line: MelodicNote[],
  mesoSpans: readonly ContrapuntalMesoSpanRef[],
  ceilingSt: number,
  softCeilingSt: number,
): number {
  const ceiling = ceilingSt > 0 ? ceilingSt : 18;
  const soft = softCeilingSt > 0 && softCeilingSt < ceiling ? softCeilingSt : 16;
  const perPhrase: number[] = [];
  for (const span of mesoSpans) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    if (notes.length < 2) {
      perPhrase.push(0.55);
      continue;
    }
    const pitches = notes.map((n) => n.midi);
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length;
    const stddev = Math.sqrt(variance);
    if (stddev <= soft) {
      perPhrase.push(1);
    } else if (stddev <= ceiling) {
      const excess = stddev - soft;
      perPhrase.push(Math.max(0.88, 1 - excess / (ceiling - soft + 1) * 0.25));
    } else {
      const excess = stddev - ceiling;
      perPhrase.push(Math.max(0, 1 - excess / ceiling));
    }
  }
  if (perPhrase.length === 0) return 0.5;
  const sorted = [...perPhrase].sort((a, b) => b - a);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.75));
  return sorted.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}

/** Zimmer — σ≤26 nominal; soft warning 26–32 st; hard fail only above 32 (passacaglia: ceiling 28). */
function registerCohesionPerMesoSpansZimmer(
  line: MelodicNote[],
  mesoSpans: readonly ContrapuntalMesoSpanRef[],
  ceilingSt: number,
  softCeilingSt: number,
  hardFailSt: number,
): number {
  const ceiling = ceilingSt > 0 ? ceilingSt : 26;
  const soft = softCeilingSt >= ceiling ? softCeilingSt : ceiling;
  const hard = hardFailSt > soft ? hardFailSt : 32;
  const perPhrase: number[] = [];
  for (const span of mesoSpans) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    if (notes.length < 2) {
      perPhrase.push(0.55);
      continue;
    }
    const pitches = notes.map((n) => n.midi);
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length;
    const stddev = Math.sqrt(variance);
    if (stddev <= ceiling) {
      perPhrase.push(1);
    } else if (stddev <= soft) {
      const excess = stddev - ceiling;
      perPhrase.push(Math.max(0.88, 1 - excess / (soft - ceiling + 1) * 0.22));
    } else if (stddev <= hard) {
      const excess = stddev - soft;
      perPhrase.push(Math.max(0.72, 1 - excess / (hard - soft + 1) * 0.35));
    } else {
      const excess = stddev - hard;
      perPhrase.push(Math.max(0, 1 - excess / hard));
    }
  }
  if (perPhrase.length === 0) return 0.5;
  const sorted = [...perPhrase].sort((a, b) => b - a);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.75));
  return sorted.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}

/** Webern — σ≤40 hard; soft 40–45; isolated single tones + Klangfarben sparse strands valid. */
function registerCohesionPerMesoSpansWebern(
  line: MelodicNote[],
  mesoSpans: readonly ContrapuntalMesoSpanRef[],
  ceilingSt: number,
  softCeilingSt: number,
  hardFailSt: number,
): number {
  const ceiling = ceilingSt > 0 ? ceilingSt : 40;
  const soft = softCeilingSt >= ceiling ? softCeilingSt : ceiling + 5;
  const hard = hardFailSt > soft ? hardFailSt : 45;
  const perPhrase: number[] = [];
  for (const span of mesoSpans) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    if (notes.length === 0) {
      perPhrase.push(0.5);
      continue;
    }
    if (notes.length === 1) {
      perPhrase.push(0.94);
      continue;
    }
    if (notes.length === 2) {
      const pitches = notes.map((n) => n.midi);
      const spread = Math.max(...pitches) - Math.min(...pitches);
      perPhrase.push(spread >= 12 ? 0.9 : 0.96);
      continue;
    }
    const pitches = notes.map((n) => n.midi);
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length;
    const stddev = Math.sqrt(variance);
    if (stddev <= ceiling) {
      perPhrase.push(1);
    } else if (stddev <= soft) {
      const excess = stddev - ceiling;
      perPhrase.push(Math.max(0.9, 1 - excess / (soft - ceiling + 1) * 0.18));
    } else if (stddev <= hard) {
      const excess = stddev - soft;
      perPhrase.push(Math.max(0.82, 1 - excess / (hard - soft + 1) * 0.28));
    } else {
      const excess = stddev - hard;
      perPhrase.push(Math.max(0.68, 1 - excess / hard * 0.35));
    }
  }
  if (perPhrase.length === 0) return 0.5;
  const sorted = [...perPhrase].sort((a, b) => b - a);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.75));
  return sorted.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}

/** Joni Mitchell — σ≤23 hard; registral polarity (low pedal + high melody) valid. */
function registerCohesionPerMesoSpansJoniMitchell(
  line: MelodicNote[],
  mesoSpans: readonly ContrapuntalMesoSpanRef[],
  ceilingSt: number,
  softCeilingSt: number,
): number {
  const ceiling = ceilingSt > 0 ? ceilingSt : 23;
  const soft = softCeilingSt >= ceiling ? softCeilingSt : ceiling + 4;
  const perPhrase: number[] = [];
  for (const span of mesoSpans) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    if (notes.length === 0) {
      perPhrase.push(0.5);
      continue;
    }
    if (notes.length <= 2) {
      perPhrase.push(0.96);
      continue;
    }
    const pitches = notes.map((n) => n.midi);
    const minP = Math.min(...pitches);
    const maxP = Math.max(...pitches);
    if (minP <= 50 && maxP >= 76) {
      perPhrase.push(0.94);
      continue;
    }
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length;
    const stddev = Math.sqrt(variance);
    if (stddev <= ceiling) {
      perPhrase.push(1);
    } else if (stddev <= soft) {
      const excess = stddev - ceiling;
      perPhrase.push(Math.max(0.88, 1 - excess / (soft - ceiling + 1) * 0.22));
    } else {
      const excess = stddev - soft;
      perPhrase.push(Math.max(0.78, 1 - excess / soft * 0.32));
    }
  }
  if (perPhrase.length === 0) return 0.5;
  const sorted = [...perPhrase].sort((a, b) => b - a);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.75));
  return sorted.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}

function cadenceStrengthRank(
  strength: PhraseCadenceStrength,
  contrapuntal?: boolean,
  sqVrbId?: string,
): number {
  if (contrapuntal && sqVrbId === 'morricone') {
    switch (strength) {
      case 'strong':
        return 1;
      case 'medium':
        return 0.92;
      case 'weak':
        return 0.82;
      default:
        return 0.72;
    }
  }
  if (contrapuntal && sqVrbId === 'williams') {
    switch (strength) {
      case 'strong':
        return 1;
      case 'medium':
        return 0.9;
      case 'weak':
        return 0.52;
      default:
        return 0.32;
    }
  }
  if (contrapuntal && sqVrbId === 'rota') {
    switch (strength) {
      case 'strong':
        return 1;
      case 'medium':
        return 0.85;
      case 'weak':
        return 0.38;
      default:
        return 0.25;
    }
  }
  if (contrapuntal && sqVrbId === 'goldsmith') {
    switch (strength) {
      case 'strong':
        return 1;
      case 'medium':
        return 0.9;
      case 'weak':
        return 0.82;
      default:
        return 0.72;
    }
  }
  if (contrapuntal && sqVrbId === 'glass') {
    switch (strength) {
      case 'strong':
        return 0.88;
      case 'medium':
        return 0.9;
      case 'weak':
        return 0.86;
      default:
        return 0.8;
    }
  }
  if (contrapuntal && sqVrbId === 'zimmer') {
    switch (strength) {
      case 'strong':
        return 0.72;
      case 'medium':
        return 0.88;
      case 'weak':
        return 0.86;
      default:
        return 0.82;
    }
  }
  if (contrapuntal && sqVrbId === 'badalamenti') {
    switch (strength) {
      case 'strong':
        return 0.68;
      case 'medium':
        return 0.9;
      case 'weak':
        return 0.88;
      default:
        return 0.84;
    }
  }
  if (contrapuntal && sqVrbId === 'shostakovich') {
    switch (strength) {
      case 'strong':
        return 0.78;
      case 'medium':
        return 0.9;
      case 'weak':
        return 0.88;
      default:
        return 0.84;
    }
  }
  if (contrapuntal && sqVrbId === 'webern') {
    switch (strength) {
      case 'strong':
        return 0.32;
      case 'medium':
        return 0.72;
      case 'weak':
        return 0.88;
      default:
        return 0.84;
    }
  }
  if (contrapuntal && sqVrbId === 'joni_mitchell') {
    switch (strength) {
      case 'strong':
        return 0.55;
      case 'medium':
        return 0.92;
      case 'weak':
        return 0.88;
      default:
        return 0.84;
    }
  }
  if (contrapuntal) {
    switch (strength) {
      case 'strong':
        return 1;
      case 'medium':
        return 0.9;
      case 'weak':
        return 0.75;
      default:
        return 0.62;
    }
  }
  switch (strength) {
    case 'strong':
      return 1;
    case 'medium':
      return 0.78;
    case 'weak':
      return 0.52;
    default:
      return 0.22;
  }
}

function cadenceTagStrengthNear(tags: readonly CadenceTag[], positionBars: number): number {
  let best = 0;
  for (const c of tags) {
    if (Math.abs(c.positionBars - positionBars) > 0.12) continue;
    const rank =
      c.strength === 'strong' ? 1 : c.strength === 'medium' ? 0.82 : c.strength === 'weak' ? 0.55 : 0.3;
    best = Math.max(best, rank);
  }
  return best;
}

/** Mirror **`uprightBassProfile`** hard range — inlined to avoid any module-init edge cases in GCE-only imports. */
const UPRIGHT_BASS_HARD_LOW = 28;
const UPRIGHT_BASS_HARD_HIGH = 55;

/** Section slice for GCE Structure & Form (aligned with `FormMap` / lead sheet conventions). */
export interface GceStructureSection {
  label: string;
  barStart: number;
  barEnd: number;
  role: string;
}

export function gceSectionsFromFormMap(form: FormMap): GceStructureSection[] {
  return form.sections.map((s) => ({
    label: s.label,
    barStart: s.startBar,
    barEnd: s.startBar + s.length - 1,
    role: s.label,
  }));
}

export interface CategoryScore {
  score: number;
  justification: string;
}

function getIntervalTarget(songwriterId?: string): {
  steps: number;
  skips: number;
  leaps: number;
  wideLeaps: number;
  /** Preferred absolute melodic interval span (semitones) — tighter bands for lyric/minimal writers. */
  min: number;
  max: number;
} {
  switch (songwriterId) {
    case 'gil_evans':
    case 'angelo_badalamenti':
    case 'ennio_morricone':
      // Lyric / vocal-adjacent — 2nds & 3rds dominate; narrow semitone band
      return { steps: 0.58, skips: 0.3, leaps: 0.1, wideLeaps: 0.02, min: 1, max: 5 };
    case 'bernard_herrmann':
    case 'jerry_goldsmith':
    case 'john_williams':
      // Dramatic scoring — 4ths–7ths + octaves usable; wide permissible span
      return { steps: 0.38, skips: 0.22, leaps: 0.28, wideLeaps: 0.12, min: 1, max: 12 };
    case 'philip_glass':
    case 'nino_rota':
      // Minimal / song-like — stepwise with occasional 3rds only (no broad leaps)
      return { steps: 0.73, skips: 0.25, leaps: 0.015, wideLeaps: 0.005, min: 1, max: 4 };
    case 'donald_fagen':
      // Keyboard style — more wide leaps, chromatic
      return { steps: 0.45, skips: 0.2, leaps: 0.2, wideLeaps: 0.15, min: 1, max: 12 };
    case 'wayne_shorter':
      // Post-bop horn lines — angular, wide intervals
      return { steps: 0.4, skips: 0.25, leaps: 0.25, wideLeaps: 0.1, min: 1, max: 11 };
    case 'bacharach':
      // Vocal/pop — very stepwise, lyrical
      return { steps: 0.65, skips: 0.25, leaps: 0.08, wideLeaps: 0.02, min: 1, max: 5 };
    case 'barry_harris':
      // Bebop — mostly steps and skips, few wide leaps
      return { steps: 0.55, skips: 0.3, leaps: 0.12, wideLeaps: 0.03, min: 1, max: 7 };
    case 'ecm_chamber':
      // ECM — sparse, wide open intervals acceptable
      return { steps: 0.45, skips: 0.2, leaps: 0.2, wideLeaps: 0.15, min: 1, max: 10 };
    case 'pat_metheny':
      // Lyrical guitar — mostly stepwise with nice leaps
      return { steps: 0.6, skips: 0.25, leaps: 0.12, wideLeaps: 0.03, min: 1, max: 6 };
    case 'ravel':
      // Ravel SQ — stepwise + thirds/sixths; wide leaps only at structural peaks
      return { steps: 0.62, skips: 0.28, leaps: 0.08, wideLeaps: 0.02, min: 1, max: 7 };
    case 'herrmann':
      // Herrmann SQ — semitone + minor third + tritone signature (not long stepwise arcs)
      return { steps: 0.52, skips: 0.22, leaps: 0.18, wideLeaps: 0.08, min: 1, max: 10 };
    case 'morricone':
      // Morricone SQ — stepwise + folk fourths/fifths; not semitone/tritone obsession
      return { steps: 0.58, skips: 0.22, leaps: 0.14, wideLeaps: 0.06, min: 1, max: 9 };
    case 'williams':
      // Williams SQ — P4/P5/M3 heroic leaps + stepwise lyrical; penalize semitone/tritone cells
      return { steps: 0.48, skips: 0.24, leaps: 0.2, wideLeaps: 0.08, min: 1, max: 12 };
    case 'rota':
      // Rota SQ — verismo stepwise + chromatic neighbour + mediant color; tight register
      return { steps: 0.64, skips: 0.26, leaps: 0.08, wideLeaps: 0.02, min: 1, max: 6 };
    case 'goldsmith':
      // Goldsmith SQ — chromatic/mediant + sequential ascent; wide arc allowed
      return { steps: 0.42, skips: 0.24, leaps: 0.22, wideLeaps: 0.12, min: 1, max: 12 };
    case 'glass':
      // Glass SQ — narrow pattern-loop steps; no jazz wide leaps
      return { steps: 0.78, skips: 0.18, leaps: 0.03, wideLeaps: 0.01, min: 1, max: 5 };
    case 'shostakovich':
      // Shostakovich SQ — semitone + minor third + tritone; chromatic inner approach
      return { steps: 0.5, skips: 0.22, leaps: 0.18, wideLeaps: 0.1, min: 1, max: 11 };
    case 'webern':
      // Webern SQ — ic1/ic2 saturation + wide pointillist leaps; no tonal step bias
      return { steps: 0.55, skips: 0.2, leaps: 0.15, wideLeaps: 0.1, min: 1, max: 24 };
    case 'joni_mitchell':
      // Mitchell SQ — quartal steps + fourths/fifths; lyrical skips; no tritone obsession
      return { steps: 0.52, skips: 0.28, leaps: 0.14, wideLeaps: 0.06, min: 1, max: 10 };
    default:
      // Universal jazz target
      return { steps: 0.55, skips: 0.25, leaps: 0.15, wideLeaps: 0.05, min: 1, max: 8 };
  }
}

export function scoreJazzIntervalBalance(
  midi: number[],
  songwriterId?: string,
  contrapuntalRelaxed?: boolean,
): number {
  if (midi.length < 3) return 0.5;

  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.2;

  let steps = 0,
    skips = 0,
    leaps = 0,
    wideLeaps = 0;
  for (const d of intervals) {
    const a = Math.abs(d);
    if (a <= 2) steps++;
    else if (a <= 4) skips++;
    else if (a <= 7) leaps++;
    else wideLeaps++;
  }

  const n = intervals.length;
  const pSteps = steps / n;
  const pSkips = skips / n;
  const pLeaps = leaps / n;
  const pWide = wideLeaps / n;

  const t = getIntervalTarget(songwriterId);
  const distributionPenalty =
    Math.abs(pSteps - t.steps) * 1.0 +
    Math.abs(pSkips - t.skips) * 0.9 +
    Math.abs(pLeaps - t.leaps) * 1.1 +
    Math.abs(pWide - t.wideLeaps) * 1.4;

  let recoverableLeaps = 0;
  let recoveredLeaps = 0;
  for (let i = 0; i < intervals.length - 1; i++) {
    const a1 = Math.abs(intervals[i]!);
    const d1 = Math.sign(intervals[i]!);
    const a2 = Math.abs(intervals[i + 1]!);
    const d2 = Math.sign(intervals[i + 1]!);
    if (a1 >= 5) {
      recoverableLeaps++;
      if (d1 !== 0 && d2 !== 0 && d1 !== d2 && a2 <= 2) recoveredLeaps++;
    }
  }
  const leapRecoveryRate = recoverableLeaps > 0 ? recoveredLeaps / recoverableLeaps : 1;

  const uniqueAbs = new Set(intervals.map((x) => Math.abs(x))).size;
  let varietyScore = 1;
  if (uniqueAbs < 3) varietyScore = uniqueAbs / 3;
  else if (uniqueAbs <= 7) varietyScore = 1;
  else varietyScore = Math.max(0, 1 - (uniqueAbs - 7) / 5);

  const penaltyScale = contrapuntalRelaxed ? 0.12 : 0.55;
  const raw =
    1 -
    distributionPenalty * penaltyScale +
    (leapRecoveryRate - 0.6) * 0.25 +
    (varietyScore - 0.8) * 0.15;
  const clamped = Math.max(0, Math.min(1, raw));
  return contrapuntalRelaxed ? Math.max(0.55, clamped) : clamped;
}

/** Herrmann — reward semitone, tritone, minor-third recurrence in melodic cells. */
function herrmannSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.4;
  let hits = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a === 1 || a === 11 || a === 6 || a === 3 || a === 4) hits++;
  }
  return Math.min(1, (hits / intervals.length) * 1.35);
}

/** Morricone — reward stepwise, fourths/fifths, minor thirds; penalize semitone/tritone obsession. */
function morriconeSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let folk = 0;
  let chromaticObsession = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 5 || a === 7) folk++;
    if (a === 1 || a === 11 || a === 6) chromaticObsession++;
  }
  const n = intervals.length;
  return Math.max(0, Math.min(1, (folk / n) * 1.25 - (chromaticObsession / n) * 0.45));
}

/** Williams — reward P4/P5/M3 + stepwise; penalize semitone/tritone obsession (Herrmann profile). */
function williamsSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let heroic = 0;
  let chromaticObsession = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 5 || a === 7 || a === 9) heroic++;
    if (a === 1 || a === 11 || a === 6) chromaticObsession++;
  }
  const n = intervals.length;
  return Math.max(0, Math.min(1, (heroic / n) * 1.2 - (chromaticObsession / n) * 0.5));
}

/** Rota — verismo stepwise + chromatic neighbour + mediant thirds/sixths. */
function rotaSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let rotaColor = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 8 || a === 9 || a === 11) rotaColor++;
  }
  return Math.min(1, (rotaColor / intervals.length) * 1.22);
}

function rotaParallelThirdSixthScore(midi: number[]): number {
  if (midi.length < 3) return 0.45;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.4;
  let hits = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a === 3 || a === 4 || a === 8 || a === 9) hits++;
  }
  return Math.min(1, (hits / intervals.length) * 1.35);
}

/** Goldsmith — chromatic neighbour, mediant thirds, jazz extensions, sequential ascent. */
function goldsmithSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let color = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 6 || a === 8 || a === 9 || a === 11) color++;
  }
  return Math.min(1, (color / intervals.length) * 1.2);
}

function goldsmithSequentialAscentScore(midi: number[]): number {
  if (midi.length < 4) return 0.45;
  let ascendingRuns = 0;
  let runLen = 0;
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d > 0) {
      runLen++;
    } else {
      if (runLen >= 2) ascendingRuns++;
      runLen = 0;
    }
  }
  if (runLen >= 2) ascendingRuns++;
  return Math.min(1, ascendingRuns / Math.max(1, Math.floor(midi.length / 4)));
}

/** Glass — narrow pattern-loop steps + block parallel motion. */
function glassSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let hits = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 5) hits++;
  }
  return Math.min(1, (hits / intervals.length) * 1.25);
}

/** Zimmer — narrow ostinato steps + parallel octave Shepard-tone ascent (valid, not penalized). */
function zimmerSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let hits = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 5 || a === 7) hits++;
    if (Math.abs(d) === 12) hits += 0.5;
  }
  return Math.min(1, (hits / intervals.length) * 1.15);
}

/** Badalamenti — cool-jazz modal stepwise + extension colour; avoid Herrmann tritone obsession. */
function badalamentiSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let color = 0;
  let harsh = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 5 || a === 7 || a === 10) color++;
    if (a === 1 || a === 6) harsh++;
  }
  const colorRatio = color / intervals.length;
  const harshPenalty = harsh / intervals.length > 0.38 ? 0.72 : 1;
  return Math.min(1, colorRatio * 1.18 * harshPenalty);
}

/** Shostakovich — DSCH semitone / minor third / tritone / chromatic neighbour. */
function shostakovichSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 3) return 0.5;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let hits = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 4 || a === 6 || a === 8 || a === 9) hits++;
  }
  return Math.min(1, (hits / intervals.length) * 1.22);
}

function shostakovichThirdRelationScore(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  let thirds = 0;
  for (let i = 1; i < midi.length; i++) {
    const a = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if (a === 3 || a === 4 || a === 8 || a === 9) thirds++;
  }
  return Math.min(1, (thirds / (midi.length - 1)) * 1.4);
}

function shostakovichTritoneAxisScore(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  let tritones = 0;
  for (let i = 1; i < midi.length; i++) {
    const a = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if (a === 6) tritones++;
  }
  return Math.min(1, tritones > 0 ? 0.55 + (tritones / (midi.length - 1)) * 0.9 : 0.35);
}

function shostakovichHalfStepApproachScore(midi: number[]): number {
  if (midi.length < 3) return 0.45;
  let approaches = 0;
  for (let i = 2; i < midi.length; i++) {
    const d1 = Math.abs(midi[i - 1]! - midi[i - 2]!) % 12;
    const d2 = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if ((d1 <= 2 || d1 === 11) && (d2 <= 2 || d2 === 11)) approaches++;
  }
  return Math.min(1, approaches / Math.max(1, midi.length - 2));
}

/** Webern — semitone / minor-second saturation + tritone axis. */
function webernSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  const intervals: number[] = [];
  for (let i = 1; i < midi.length; i++) {
    const d = midi[i]! - midi[i - 1]!;
    if (d !== 0) intervals.push(d);
  }
  if (intervals.length === 0) return 0.45;
  let hits = 0;
  for (const d of intervals) {
    const a = Math.abs(d) % 12;
    if (a <= 2 || a === 3 || a === 6 || a === 8 || a === 10) hits++;
  }
  return Math.min(1, (hits / intervals.length) * 1.28);
}

function webernIc1SaturationScore(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  let ic1ic2 = 0;
  for (let i = 1; i < midi.length; i++) {
    const a = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if (a <= 2) ic1ic2++;
  }
  return Math.min(1, (ic1ic2 / (midi.length - 1)) * 1.35);
}

/** Mitchell — quartal ic5 + sus/add9 ic2 colour; not semitone/tritone saturation. */
function joniMitchellSignatureIntervalScore(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  let hits = 0;
  for (let i = 1; i < midi.length; i++) {
    const a = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if (a === 2 || a === 3 || a === 4 || a === 5 || a === 7 || a === 10) hits++;
  }
  return Math.min(1, (hits / (midi.length - 1)) * 1.28);
}

function joniMitchellIc5Score(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  let ic5 = 0;
  for (let i = 1; i < midi.length; i++) {
    const a = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if (a === 5 || a === 7) ic5++;
  }
  return Math.min(1, (ic5 / (midi.length - 1)) * 1.4);
}

function joniMitchellIc2Score(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  let ic2 = 0;
  for (let i = 1; i < midi.length; i++) {
    const a = Math.abs(midi[i]! - midi[i - 1]!) % 12;
    if (a <= 2 || a === 10) ic2++;
  }
  return Math.min(1, (ic2 / (midi.length - 1)) * 1.3);
}

function joniMitchellSopranoArchScore(midi: number[]): number {
  if (midi.length < 3) return 0.45;
  const span = Math.max(...midi) - Math.min(...midi);
  if (span >= 12 && span <= 18) return 0.95;
  if (span >= 9 && span <= 22) return 0.82;
  return 0.55;
}

function joniMitchellLowPedalScore(midi: number[]): number {
  if (midi.length < 2) return 0.45;
  const low = midi.filter((p) => p <= 50);
  if (low.length === 0) return 0.5;
  return Math.min(1, 0.55 + (low.length / midi.length) * 0.55);
}

function mesoSpanHasSilenceBoundary(
  line: MelodicNote[],
  startBeat: number,
  endBeat: number,
  minRestBeats: number = 1,
): boolean {
  for (const n of line) {
    const abs = melodicAbsBars(n);
    if (abs < startBeat - 1e-6 || abs >= endBeat - 1e-6) continue;
    if (n.rest && n.beats >= minRestBeats) return true;
  }
  return false;
}

function mesoSpanRowCompletionRatio(line: MelodicNote[], span: ContrapuntalMesoSpanRef): number {
  const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
  const pcs = new Set(notes.map((n) => n.midi % 12));
  if (pcs.size >= 12) return 1;
  if (pcs.size >= 10) return 0.85;
  if (pcs.size >= 8) return 0.65;
  return pcs.size / 12;
}

function badalamentiCodaDissolutionScore(
  line: MelodicNote[],
  meso: readonly ContrapuntalMesoSpanRef[],
): number {
  if (meso.length < 2) return 0;
  const last = meso[meso.length - 1]!;
  if (last.cadenceStrength === 'strong') return 0.35;
  return cyclicMotifReturnScore(line, meso);
}

function glassAdditiveLayeringScore(line: MelodicNote[], meso: readonly ContrapuntalMesoSpanRef[]): number {
  if (meso.length < 2) return 0;
  const densities: number[] = [];
  for (const span of meso) {
    const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    densities.push(notes.length);
  }
  let increases = 0;
  for (let i = 1; i < densities.length; i++) {
    if (densities[i]! >= densities[i - 1]!) increases++;
  }
  return increases / Math.max(1, densities.length - 1);
}

const SQ_VRB_MI_IDS = new Set([
  'ravel',
  'herrmann',
  'morricone',
  'williams',
  'rota',
  'goldsmith',
  'glass',
  'zimmer',
  'badalamenti',
  'shostakovich',
  'webern',
  'joni_mitchell',
]);

export function scoreMelodicIdentity(
  line: MelodicNote[],
  songwriterId?: string,
  contrapuntal?: ContrapuntalGceScoringOptions,
): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length < 4) {
    return { score: 0, justification: 'Too few notes' };
  }

  const pitches = notes.map((n) => n.midi);

  const uniquePitchCount = new Set(pitches).size;
  const pitchClassCount = new Set(pitches.map((p) => p % 12)).size;

  // R — motif recurrence (sliding windows, pitch-class interval vectors)
  const windowSize = 4;
  const windows: number[][] = [];
  for (let i = 0; i <= pitches.length - windowSize; i++) {
    const win = pitches.slice(i, i + windowSize);
    const intervals = win.slice(1).map((p, j) => (((p - win[j]!) % 12) + 12) % 12);
    windows.push(intervals);
  }
  let recurrences = 0;
  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 2; j < windows.length; j++) {
      const match = windows[i]!.every((iv, k) => Math.abs(iv - windows[j]![k]!) <= 2);
      if (match) {
        recurrences++;
        break;
      }
    }
  }
  const motifRecurrence =
    windows.length > 0 ? Math.min(recurrences / (windows.length * 0.4), 1) : 0;

  // C — contour: directed entropy + adjacent arc pairs (UD/DU) + turns + excursion (+ per-writer tolerance)
  const contour = pitches.slice(1).map((p, i) =>
    p > pitches[i]! ? 'U' : p < pitches[i]! ? 'D' : 'S'
  );
  const counts = { U: 0, D: 0, S: 0 };
  for (const c of contour) counts[c as 'U' | 'D' | 'S']++;
  const total = contour.length;
  let entropy = 0;
  for (const k of ['U', 'D', 'S'] as const) {
    const p = counts[k] / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(3);
  /** Softer than raw (1−H/Hmax): mid entropy (mixed contour) no longer scores ~0. */
  const entropyNorm = Math.max(0, 1 - entropy / maxEntropy);
  const entropyComponent = 0.55 * entropyNorm + 0.45 * Math.sqrt(entropyNorm);

  let arcAdjacent = 0;
  for (let i = 0; i < contour.length - 1; i++) {
    const a = contour[i]!;
    const b = contour[i + 1]!;
    if ((a === 'U' && b === 'D') || (a === 'D' && b === 'U')) arcAdjacent++;
  }
  const arcAdjacentScore = Math.min(
    1,
    arcAdjacent / Math.max(1.2, total * 0.22)
  );

  let directionTurns = 0;
  for (let i = 0; i < contour.length - 1; i++) {
    const a = contour[i]!;
    const b = contour[i + 1]!;
    if (a !== 'S' && b !== 'S' && a !== b) directionTurns++;
  }
  const turnScore = Math.min(1, directionTurns / Math.max(1.5, total * 0.32));

  const pitchMin = Math.min(...pitches);
  const pitchMax = Math.max(...pitches);
  let excursionDivisor = 20;
  switch (songwriterId) {
    case 'philip_glass':
    case 'nino_rota':
      excursionDivisor = 22;
      break;
    case 'bernard_herrmann':
    case 'jerry_goldsmith':
    case 'john_williams':
      excursionDivisor = 13;
      break;
    default:
      break;
  }
  const excursionNorm = Math.min(1, (pitchMax - pitchMin) / excursionDivisor);

  const pitchMean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const pitchVariance =
    pitches.reduce((s, p) => s + Math.pow(p - pitchMean, 2), 0) / pitches.length;
  const pitchStddev = Math.sqrt(pitchVariance);

  let wEntropy = 0.17;
  let wArc = 0.33;
  let wExc = 0.3;
  let wTurn = 0.2;
  let flatRecurrenceCap = 0.58;

  switch (songwriterId) {
    case 'philip_glass':
    case 'nino_rota':
      wEntropy = 0.22;
      wArc = 0.18;
      wExc = 0.38;
      wTurn = 0.22;
      flatRecurrenceCap = 0.88;
      break;
    case 'bernard_herrmann':
    case 'jerry_goldsmith':
    case 'john_williams':
      wEntropy = 0.12;
      wArc = 0.4;
      wExc = 0.36;
      wTurn = 0.12;
      flatRecurrenceCap = 0.36;
      break;
    default:
      break;
  }

  let contourCompression =
    wEntropy * entropyComponent +
    wArc * arcAdjacentScore +
    wExc * excursionNorm +
    wTurn * turnScore;

  if (pitchStddev < 1.0) {
    const rescue = Math.min(
      flatRecurrenceCap,
      motifRecurrence * flatRecurrenceCap * 0.92 + 0.14
    );
    contourCompression = Math.max(contourCompression, rescue);
  }

  /** Map typical weighted sums (~0.35–0.65) into ~0.75–0.9 so contour adds ~2.0+ to raw melodic score. */
  contourCompression = Math.min(1, 0.52 + 0.48 * contourCompression);

  const contrapuntalSq =
    contrapuntal?.contrapuntalLinePolicy === true && (contrapuntal.mesoSpans?.length ?? 0) >= 2;
  const sqGce =
    contrapuntalSq && contrapuntal.sqGceAdjustmentsOverride
      ? contrapuntal.sqGceAdjustmentsOverride
      : contrapuntalSq && contrapuntal.sqVrbId
        ? getSqVrbGceAdjustments(contrapuntal.sqVrbId)
        : undefined;
  const miSongwriterId =
    contrapuntalSq && contrapuntal.sqVrbId && SQ_VRB_MI_IDS.has(contrapuntal.sqVrbId)
      ? contrapuntal.sqVrbId
      : songwriterId;

  // I — interval balance (jazz step/skip/leap distribution + recovery)
  let intervalEconomy = scoreJazzIntervalBalance(pitches, miSongwriterId, contrapuntalSq);
  if (contrapuntalSq && contrapuntal.sqVrbId === 'herrmann' && sqGce?.herrmannSignatureIntervalBlend) {
    const sig = herrmannSignatureIntervalScore(pitches);
    const blend = sqGce.herrmannSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'morricone' && sqGce?.morriconeSignatureIntervalBlend) {
    const sig = morriconeSignatureIntervalScore(pitches);
    const blend = sqGce.morriconeSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'williams' && sqGce?.williamsSignatureIntervalBlend) {
    const sig = williamsSignatureIntervalScore(pitches);
    const blend = sqGce.williamsSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'rota' && sqGce?.rotaSignatureIntervalBlend) {
    const sig = rotaSignatureIntervalScore(pitches);
    const blend = sqGce.rotaSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'rota' && sqGce?.parallelThirdSixthBonus) {
    const par = rotaParallelThirdSixthScore(pitches);
    intervalEconomy = Math.min(1, intervalEconomy + par * sqGce.parallelThirdSixthBonus);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'goldsmith' && sqGce?.goldsmithSignatureIntervalBlend) {
    const sig = goldsmithSignatureIntervalScore(pitches);
    const blend = sqGce.goldsmithSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'goldsmith' && sqGce?.sequentialAscentCredit) {
    const asc = goldsmithSequentialAscentScore(pitches);
    intervalEconomy = Math.min(1, intervalEconomy + asc * sqGce.sequentialAscentCredit);
  }
  if (
    contrapuntalSq &&
    (contrapuntal.sqVrbId === 'glass' || contrapuntal.sqVrbId === 'arvo_part') &&
    sqGce?.glassSignatureIntervalBlend
  ) {
    const sig = glassSignatureIntervalScore(pitches);
    const blend = sqGce.glassSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'glass' && sqGce?.parallelThirdSixthBonus) {
    const par = rotaParallelThirdSixthScore(pitches);
    intervalEconomy = Math.min(1, intervalEconomy + par * sqGce.parallelThirdSixthBonus);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'zimmer' && sqGce?.zimmerSignatureIntervalBlend) {
    const sig = zimmerSignatureIntervalScore(pitches);
    const blend = sqGce.zimmerSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'badalamenti' && sqGce?.badalamentiSignatureIntervalBlend) {
    const sig = badalamentiSignatureIntervalScore(pitches);
    const blend = sqGce.badalamentiSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'shostakovich' && sqGce?.shostakovichSignatureIntervalBlend) {
    const sig = shostakovichSignatureIntervalScore(pitches);
    const blend = sqGce.shostakovichSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'shostakovich' && sqGce?.thirdRelationCredit) {
    intervalEconomy = Math.min(
      1,
      intervalEconomy + shostakovichThirdRelationScore(pitches) * sqGce.thirdRelationCredit,
    );
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'shostakovich' && sqGce?.tritoneAxisCredit) {
    intervalEconomy = Math.min(
      1,
      intervalEconomy + shostakovichTritoneAxisScore(pitches) * sqGce.tritoneAxisCredit,
    );
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'shostakovich' && sqGce?.halfStepApproachCredit) {
    intervalEconomy = Math.min(
      1,
      intervalEconomy + shostakovichHalfStepApproachScore(pitches) * sqGce.halfStepApproachCredit,
    );
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'webern' && sqGce?.webernSignatureIntervalBlend) {
    const sig = webernSignatureIntervalScore(pitches);
    const blend = sqGce.webernSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'webern' && sqGce?.ic1SaturationCredit) {
    intervalEconomy = Math.min(
      1,
      intervalEconomy + webernIc1SaturationScore(pitches) * sqGce.ic1SaturationCredit,
    );
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'webern' && sqGce?.tritoneAxisCredit) {
    intervalEconomy = Math.min(
      1,
      intervalEconomy + shostakovichTritoneAxisScore(pitches) * sqGce.tritoneAxisCredit,
    );
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'joni_mitchell' && sqGce?.joniMitchellSignatureIntervalBlend) {
    const sig = joniMitchellSignatureIntervalScore(pitches);
    const blend = sqGce.joniMitchellSignatureIntervalBlend;
    intervalEconomy = Math.min(1, intervalEconomy * (1 - blend) + sig * blend);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'joni_mitchell' && sqGce?.ic5Credit) {
    intervalEconomy = Math.min(1, intervalEconomy + joniMitchellIc5Score(pitches) * sqGce.ic5Credit);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'joni_mitchell' && sqGce?.ic2Credit) {
    intervalEconomy = Math.min(1, intervalEconomy + joniMitchellIc2Score(pitches) * sqGce.ic2Credit);
  }

  // G — register cohesion (global σ for song/duo; per-meso mean σ for SQ contrapuntal)
  const zimmerPassacaglia =
    contrapuntalSq &&
    contrapuntal.sqVrbId === 'zimmer' &&
    contrapuntal.passacagliaMode === true;
  const registerCohesion = contrapuntalSq
    ? contrapuntal.sqVrbId === 'glass'
      ? registerCohesionPerMesoSpansGlass(
          line,
          contrapuntal.mesoSpans,
          sqGce?.registerCohesionStdevCeilingSt ?? 18,
          sqGce?.registerCohesionSoftCeilingSt ?? 16,
        )
      : contrapuntal.sqVrbId === 'goldsmith'
        ? registerCohesionPerMesoSpansGoldsmith(
            line,
            contrapuntal.mesoSpans,
            sqGce?.registerCohesionStdevCeilingSt ?? CONTRAPUNTAL_REGISTER_STDEV_CEILING_DEFAULT,
            sqGce?.registerCohesionSoftCeilingSt ?? 26,
          )
        : contrapuntal.sqVrbId === 'zimmer'
          ? registerCohesionPerMesoSpansZimmer(
              line,
              contrapuntal.mesoSpans,
              zimmerPassacaglia ? 28 : (sqGce?.registerCohesionStdevCeilingSt ?? 26),
              sqGce?.registerCohesionSoftCeilingSt ?? 26,
              32,
            )
          : contrapuntal.sqVrbId === 'shostakovich'
            ? registerCohesionPerMesoSpansZimmer(
                line,
                contrapuntal.mesoSpans,
                sqGce?.registerCohesionStdevCeilingSt ?? 28,
                sqGce?.registerCohesionSoftCeilingSt ?? 32,
                32,
              )
            : contrapuntal.sqVrbId === 'webern'
              ? registerCohesionPerMesoSpansWebern(
                  line,
                  contrapuntal.mesoSpans,
                  sqGce?.registerCohesionStdevCeilingSt ?? 40,
                  sqGce?.registerCohesionSoftCeilingSt ?? 45,
                  45,
                )
              : contrapuntal.sqVrbId === 'joni_mitchell'
                ? registerCohesionPerMesoSpansJoniMitchell(
                    line,
                    contrapuntal.mesoSpans,
                    sqGce?.registerCohesionStdevCeilingSt ?? 23,
                    sqGce?.registerCohesionSoftCeilingSt ?? 27,
                  )
                : registerCohesionPerMesoSpans(
              line,
              contrapuntal.mesoSpans,
              sqGce?.registerCohesionStdevCeilingSt ?? CONTRAPUNTAL_REGISTER_STDEV_CEILING_DEFAULT,
            )
    : 1 - Math.min(pitchStddev / 12, 1);

  const wMotif = sqGce?.motifRecurrenceWeight ?? (contrapuntalSq ? 0.38 : 0.35);
  const wContour = contrapuntalSq ? 0.3 : 0.25;
  const wInterval = sqGce?.intervalEconomyWeight ?? (contrapuntalSq ? 0.07 : 0.2);
  const wRegister = sqGce?.registerCohesionWeight ?? (contrapuntalSq ? 0.25 : 0.2);

  let motifTerm = motifRecurrence;
  if (contrapuntalSq && contrapuntal.sqVrbId === 'webern') {
    const webernIc1 = webernIc1SaturationScore(pitches);
    motifTerm = Math.min(1, 0.35 + (1 - Math.min(1, motifRecurrence / 0.48)) * 0.58);
    if (webernIc1 >= 0.65 && intervalEconomy >= 0.82) {
      motifTerm = Math.max(motifTerm, 0.72);
    }
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'joni_mitchell') {
    motifTerm = Math.min(1, 0.38 + (1 - Math.min(1, motifRecurrence / 0.52)) * 0.55);
  }

  const rawScore =
    10 *
    (wMotif * motifTerm +
      wContour * contourCompression +
      wInterval * intervalEconomy +
      wRegister * registerCohesion);

  let score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  if (contrapuntalSq && contrapuntal.sqVrbId === 'webern') {
    const webernIc1 = webernIc1SaturationScore(pitches);
    const klangBoost = registerCohesion * (sqGce?.klangfarbenmelodieCredit ?? 0.14) * 2.8;
    const isoBoost = registerCohesion * (sqGce?.isolatedToneCredit ?? 0.12) * 1.8;
    const ic1Boost =
      sqGce?.ic1SaturationCredit && webernIc1 >= 0.65
        ? webernIc1 * sqGce.ic1SaturationCredit * 2.5
        : 0;
    score = Math.min(10, score + klangBoost + isoBoost + ic1Boost);
  }
  if (contrapuntalSq && contrapuntal.sqVrbId === 'joni_mitchell') {
    const archBoost = joniMitchellSopranoArchScore(pitches) * (sqGce?.sopranoArchCredit ?? 0.14) * 2.4;
    const pedalBoost = joniMitchellLowPedalScore(pitches) * (sqGce?.lowRegisterPedalCredit ?? 0.14) * 1.8;
    const ic5Boost = joniMitchellIc5Score(pitches) * (sqGce?.ic5Credit ?? 0.14) * 1.6;
    score = Math.min(10, score + archBoost + pedalBoost + ic5Boost);
  }

  if (uniquePitchCount <= 2) {
    return {
      score: Math.min(2, score),
      justification: 'HARD FAIL — insufficient pitch variety',
    };
  }
  if (pitchClassCount <= 2) {
    return {
      score: Math.min(3, score),
      justification: 'HARD FAIL — insufficient pitch class variety',
    };
  }

  const motifHardMin =
    sqGce?.motifRecurrenceHardFailMin ?? (contrapuntalSq ? 0.35 : 0.35);
  const hardFail =
    contrapuntalSq &&
    contrapuntal.sqVrbId !== 'webern' &&
    contrapuntal.sqVrbId !== 'joni_mitchell' &&
    motifRecurrence < motifHardMin;
  const webernLoopPenalty =
    contrapuntalSq &&
    contrapuntal.sqVrbId === 'webern' &&
    motifRecurrence > 0.78 &&
    (sqGce?.loopingMotifRecurrencePenalty ?? 0) > 0;
  const joniLoopPenalty =
    contrapuntalSq &&
    contrapuntal.sqVrbId === 'joni_mitchell' &&
    motifRecurrence > 0.85 &&
    intervalEconomy < 0.88 &&
    (sqGce?.loopingCellPenalty ?? 0) > 0;

  const registerLabel = contrapuntalSq ? 'register cohesion (meso σ)' : 'register cohesion';
  const sqTag =
    contrapuntalSq && contrapuntal.sqVrbId === 'herrmann'
      ? ' [SQ herrmann MI]'
      : contrapuntalSq && contrapuntal.sqVrbId === 'ravel'
        ? ' [SQ ravel MI]'
        : contrapuntalSq && contrapuntal.sqVrbId === 'morricone'
          ? ' [SQ morricone MI]'
          : contrapuntalSq && contrapuntal.sqVrbId === 'williams'
            ? ' [SQ williams MI]'
            : contrapuntalSq && contrapuntal.sqVrbId === 'rota'
              ? ' [SQ rota MI]'
              : contrapuntalSq && contrapuntal.sqVrbId === 'goldsmith'
                ? ' [SQ goldsmith MI]'
                : contrapuntalSq && contrapuntal.sqVrbId === 'glass'
                  ? ' [SQ glass MI]'
                  : contrapuntalSq && contrapuntal.sqVrbId === 'zimmer'
                    ? zimmerPassacaglia
                      ? ' [SQ zimmer passacaglia MI]'
                      : ' [SQ zimmer MI]'
                    : contrapuntalSq && contrapuntal.sqVrbId === 'badalamenti'
                      ? ' [SQ badalamenti MI]'
                      : contrapuntalSq && contrapuntal.sqVrbId === 'shostakovich'
                        ? ' [SQ shostakovich MI]'
                        : contrapuntalSq && contrapuntal.sqVrbId === 'webern'
                          ? ' [SQ webern MI]'
                          : contrapuntalSq && contrapuntal.sqVrbId === 'joni_mitchell'
                            ? ' [SQ joni_mitchell MI]'
                            : contrapuntalSq
                              ? ' [SQ contrapuntal]'
                              : '';

  if (webernLoopPenalty) {
    score = Math.min(
      score,
      Math.max(
        5.5,
        score - motifRecurrence * (sqGce?.loopingMotifRecurrencePenalty ?? 0.18) * 12,
      ),
    );
  }
  if (joniLoopPenalty) {
    score = Math.min(
      score,
      Math.max(
        5.5,
        score - motifRecurrence * (sqGce?.loopingCellPenalty ?? 0.18) * 10,
      ),
    );
  }

  return {
    score: hardFail ? Math.min(score, 6) : score,
    justification:
      `motif recurrence ${(motifRecurrence * 10).toFixed(1)}, ` +
      `contour ${(contourCompression * 10).toFixed(1)}, ` +
      `interval balance ${(intervalEconomy * 10).toFixed(1)}, ` +
      `${registerLabel} ${(registerCohesion * 10).toFixed(1)}` +
      (hardFail ? ' [HARD FAIL]' : '') +
      sqTag,
  };
}

export function scoreHarmonyAndLanguage(chords: string[]): CategoryScore {
  if (!chords || chords.length === 0) {
    return { score: 0, justification: 'No chords' };
  }

  const extendedPatterns = [
    /maj7/i,
    /maj9/i,
    /maj11/i,
    /maj13/i,
    /m7/i,
    /m9/i,
    /m11/i,
    /m13/i,
    /mmaj/i,
    /7alt/i,
    /7#/i,
    /7b/i,
    /#11/i,
    /b9/i,
    /#9/i,
    /b13/i,
    /13sus/i,
    /13/i,
    /11/i,
    /sus4/i,
    /sus2/i,
    /add9/i,
    /add11/i,
    /6\/9/i,
    /6-9/i,
    /dim7/i,
    /m7b5/i,
    /maj6/i,
    /\/[A-G]/, // slash chords
  ];

  const plainTriadPattern = /^[A-G][#b]?m?$/;

  let extendedCount = 0;
  let plainCount = 0;
  let repeatedRunCount = 0;
  let consecutiveSame = 1;

  for (let i = 0; i < chords.length; i++) {
    const c = chords[i] ?? '';
    const isExtended = extendedPatterns.some((p) => p.test(c));
    const isPlain = plainTriadPattern.test(c.trim());

    if (isExtended) extendedCount++;
    else if (isPlain) plainCount++;

    if (i > 0 && c === chords[i - 1]) {
      consecutiveSame++;
      if (consecutiveSame >= 4) repeatedRunCount++;
    } else {
      consecutiveSame = 1;
    }
  }

  const total = chords.length;
  const extendedRatio = extendedCount / total;
  const plainPenalty = plainCount / total;
  const repetitionPenalty = Math.min(repeatedRunCount / total, 0.3);

  const uniqueRoots = new Set(
    chords.map((c) => c.match(/^[A-G][#b]?/)?.[0] ?? '')
  ).size;
  const varietyScore = Math.min(uniqueRoots / 8, 1);

  const rawScore =
    extendedRatio * 6 +
    varietyScore * 2 +
    (1 - plainPenalty) * 1.5 -
    repetitionPenalty * 2;

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  const justification =
    `${extendedCount}/${total} extended chords, ` +
    `${uniqueRoots} unique roots, ` +
    `${plainCount} plain triads`;

  return { score, justification };
}

export interface RhythmExpectation {
  placementMode: 'grid' | 'swing' | 'anti_metric';
  targetOffbeatWindow?: [number, number];
  syncopationBand?: [number, number];
  anticipationRateMax?: number;
  grooveStabilityTolerance?: number;
}

function barFraction(n: MelodicNote): number {
  return n.beat / BEATS_PER_MEASURE;
}

function scoreRhythmicIdentityGeneric(line: MelodicNote[]): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length === 0) {
    return { score: 0, justification: 'No notes' };
  }

  const durBuckets = new Map<number, number>();
  for (const n of notes) {
    const bucket = Math.round(n.beats * 4);
    durBuckets.set(bucket, (durBuckets.get(bucket) ?? 0) + 1);
  }
  const total = notes.length;
  let entropy = 0;
  for (const count of durBuckets.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(Math.max(durBuckets.size, 1));
  const ioiVariety = maxEntropy > 0 ? Math.min(entropy / maxEntropy, 1) : 0;

  const offbeat = notes.filter((n) => {
    const b = n.beat % 1;
    return b > 0.1 && b < 0.9;
  }).length;
  const syncopation = Math.min(offbeat / total, 1);

  const durations = notes.map((n) => Math.round(n.beats * 4));
  let matches = 0;
  const grams = new Map<string, number>();
  for (let i = 0; i <= durations.length - 3; i++) {
    const key = durations.slice(i, i + 3).join(',');
    grams.set(key, (grams.get(key) ?? 0) + 1);
  }
  for (const count of grams.values()) {
    if (count >= 2) matches++;
  }
  const rhythmMotif = Math.min(matches / Math.max(grams.size, 1), 1);

  const barAttacks = new Map<number, number>();
  for (const n of notes) {
    barAttacks.set(n.bar, (barAttacks.get(n.bar) ?? 0) + 1);
  }
  const attackCounts = [...barAttacks.values()];
  const mean = attackCounts.reduce((a, b) => a + b, 0) / attackCounts.length;
  const variance =
    attackCounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / attackCounts.length;
  const stddev = Math.sqrt(variance);
  const grooveStability = Math.max(0, 1 - Math.min(stddev / mean, 1));

  const rawScore =
    10 *
    (0.25 * ioiVariety + 0.3 * syncopation + 0.25 * rhythmMotif + 0.2 * grooveStability);

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  const hardFail = syncopation < 0.15 && rhythmMotif < 0.2;

  return {
    score: hardFail ? Math.min(score, 6) : score,
    justification:
      `IOI variety ${(ioiVariety * 10).toFixed(1)}, ` +
      `syncopation ${(syncopation * 100).toFixed(0)}%, ` +
      `rhythm motif ${(rhythmMotif * 10).toFixed(1)}, ` +
      `groove ${(grooveStability * 10).toFixed(1)}` +
      (hardFail ? ' [HARD FAIL]' : ''),
  };
}

function scoreRhythmicStyleConformance(
  line: MelodicNote[],
  expectation: RhythmExpectation,
): number {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length === 0) return 0;

  const offbeats = notes.filter((n) => {
    const frac = barFraction(n);
    const eighth = frac % 0.5;
    return eighth > 0.08 && eighth < 0.42;
  });
  if (offbeats.length === 0) return 5;

  if (expectation.placementMode === 'swing') {
    const [lo, hi] = expectation.targetOffbeatWindow ?? [0.55, 0.72];
    let reward = 0;
    let gridPenalty = 0;
    for (const n of offbeats) {
      const frac = barFraction(n);
      if (frac >= lo && frac <= hi) reward += 1;
      const eighth = frac % 0.5;
      if (Math.abs(eighth - 0.25) < 0.04) gridPenalty += 1;
    }
    const hitRate = reward / offbeats.length;
    const gridRate = gridPenalty / offbeats.length;
    return Math.max(0, Math.min(10, 10 * (0.65 * hitRate + 0.35 * (1 - gridRate))));
  }

  if (expectation.placementMode === 'grid') {
    let gridHits = 0;
    let anticipations = 0;
    for (const n of offbeats) {
      const frac = barFraction(n);
      const eighth = frac % 0.5;
      if (Math.abs(eighth - 0.25) < 0.06) gridHits += 1;
      if (frac < 0.2 || (frac > 0.45 && frac < 0.55)) anticipations += 1;
    }
    const gridRate = gridHits / offbeats.length;
    const antRate = anticipations / offbeats.length;
    const antMax = expectation.anticipationRateMax ?? 0.15;
    const antPenalty = antRate > antMax ? Math.min(1, (antRate - antMax) / Math.max(antMax, 0.05)) : 0;
    return Math.max(0, Math.min(10, 10 * (0.75 * gridRate + 0.25 * (1 - antPenalty))));
  }

  const downbeats = notes.filter((n) => {
    const frac = barFraction(n);
    return frac < 0.08 || Math.abs(frac - 0.5) < 0.08;
  });
  const displaced = downbeats.filter((n) => {
    const frac = barFraction(n);
    return frac > 0.04 && frac < 0.12;
  }).length;
  const barAttacks = new Map<number, number>();
  for (const n of notes) {
    barAttacks.set(n.bar, (barAttacks.get(n.bar) ?? 0) + 1);
  }
  const counts = [...barAttacks.values()];
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((s, v) => s + (v - mean) ** 2, 0) / counts.length;
  const regularity = mean > 0 ? Math.max(0, 1 - Math.sqrt(variance) / mean) : 1;
  const dispRate = downbeats.length > 0 ? displaced / downbeats.length : 0;
  return Math.max(0, Math.min(10, 10 * (0.55 * dispRate + 0.45 * (1 - regularity))));
}

function parseBlendedVrbComponentIds(vrbId: string): string[] | null {
  const trimmed = vrbId.trim().toLowerCase();
  if (!trimmed.startsWith('blended:')) return null;
  const body = trimmed.slice('blended:'.length);
  return body ? body.split('+').filter(Boolean) : null;
}

function rhythmExpectationForBlendedVrbId(vrbId: string): RhythmExpectation | undefined {
  const ids = parseBlendedVrbComponentIds(vrbId);
  if (!ids || ids.length < 2) return undefined;
  const expectations = ids.map((id) => rhythmExpectationForVrb(id)).filter(Boolean) as RhythmExpectation[];
  if (expectations.length !== ids.length) return undefined;
  const weights = expectations.map(() => 1 / expectations.length);
  const placementCounts = new Map<string, number>();
  for (let i = 0; i < expectations.length; i++) {
    const mode = expectations[i]!.placementMode;
    placementCounts.set(mode, (placementCounts.get(mode) ?? 0) + weights[i]!);
  }
  let placementMode: RhythmExpectation['placementMode'] = 'grid';
  let bestPl = 0;
  for (const [mode, w] of placementCounts) {
    if (w > bestPl) {
      bestPl = w;
      placementMode = mode as RhythmExpectation['placementMode'];
    }
  }
  const wm = (vals: number[]) => vals.reduce((acc, v, i) => acc + v * weights[i]!, 0);
  const antMaxVals = expectations.map((e) => e.anticipationRateMax ?? 0.15);
  const grooveVals = expectations.map((e) => e.grooveStabilityTolerance ?? 0.9);
  const offLow = expectations.map((e) => e.targetOffbeatWindow?.[0] ?? 0.48);
  const offHigh = expectations.map((e) => e.targetOffbeatWindow?.[1] ?? 0.52);
  return {
    placementMode,
    anticipationRateMax: wm(antMaxVals),
    grooveStabilityTolerance: wm(grooveVals),
    targetOffbeatWindow: [wm(offLow), wm(offHigh)],
  };
}

export function rhythmExpectationForVrb(vrbId: string): RhythmExpectation | undefined {
  const raw = vrbId.trim().toLowerCase();
  if (raw.startsWith('blended:')) {
    return rhythmExpectationForBlendedVrbId(raw);
  }
  const id = (getVoiceRuleBundle(vrbId)?.voiceId ?? vrbId).trim().toLowerCase();
  if (id === 'gershwin') {
    return {
      placementMode: 'swing',
      targetOffbeatWindow: [0.55, 0.7],
      anticipationRateMax: 0.14,
    };
  }
  if (id === 'cole_porter') {
    return {
      placementMode: 'swing',
      targetOffbeatWindow: [0.55, 0.65],
      anticipationRateMax: 0.1,
    };
  }
  if (id === 'turtle_island') {
    return { placementMode: 'swing', targetOffbeatWindow: [0.58, 0.72] };
  }
  if (id === 'satie') {
    return { placementMode: 'grid' };
  }
  if (raw === 'glass' || id === 'reich_glass') {
    return {
      placementMode: 'grid',
      targetOffbeatWindow: [0.49, 0.51],
      anticipationRateMax: 0.06,
      grooveStabilityTolerance: 0.96,
    };
  }
  if (id === 'part' || id === 'arvo_part') {
    return {
      placementMode: 'grid',
      targetOffbeatWindow: [0.49, 0.51],
      anticipationRateMax: 0.02,
      grooveStabilityTolerance: 0.98,
    };
  }
  if (id === 'debussy') {
    return {
      placementMode: 'grid',
      targetOffbeatWindow: [0.48, 0.52],
      anticipationRateMax: 0.08,
      grooveStabilityTolerance: 0.94,
    };
  }
  if (id === 'bartok' || id === 'sq_vrb_bartok') {
    return {
      placementMode: 'grid',
      targetOffbeatWindow: [0.49, 0.51],
      anticipationRateMax: 0.04,
      grooveStabilityTolerance: 0.96,
    };
  }
  if (id === 'reich_glass') {
    return { placementMode: 'grid' };
  }
  if (id === 'shostakovich') {
    return { placementMode: 'anti_metric' };
  }
  if (id === 'ligeti') {
    return { placementMode: 'anti_metric' };
  }
  if (id === 'ecm_chamber') {
    return {
      placementMode: 'grid',
      targetOffbeatWindow: [0.48, 0.52],
      syncopationBand: [0.0, 0.15],
      anticipationRateMax: 0.05,
      grooveStabilityTolerance: 0.95,
    };
  }
  if (id === 'frank_zappa' || raw === 'zappa' || raw === 'mothers' || raw === 'fz') {
    return {
      placementMode: 'anti_metric',
      targetOffbeatWindow: [0.42, 0.68],
      anticipationRateMax: 0.35,
      grooveStabilityTolerance: 0.55,
    };
  }
  return undefined;
}

export function scoreRhythmicIdentity(
  line: MelodicNote[],
  expectation?: RhythmExpectation,
): CategoryScore {
  const generic = scoreRhythmicIdentityGeneric(line);
  if (!expectation) {
    return generic;
  }
  const styleScore = scoreRhythmicStyleConformance(line, expectation);
  const blended = Math.max(
    0,
    Math.min(10, Math.round((0.8 * generic.score + 0.2 * styleScore) * 10) / 10),
  );
  const hardCapped =
    generic.justification.includes('[HARD FAIL]') ? Math.min(blended, 6) : blended;
  return {
    score: hardCapped,
    justification: `${generic.justification}; style ${expectation.placementMode} ${styleScore.toFixed(1)}`,
  };
}

export function scoreStructureAndForm(
  _score: ScoreModel,
  chords: string[],
  sections: GceStructureSection[]
): CategoryScore {
  void _score;
  if (!sections || sections.length < 2) {
    return { score: 4, justification: 'Insufficient section data' };
  }

  // Adjacent contrast — distinct section roles
  const roles = sections.map((s) => s.role);
  const uniqueRoles = new Set(roles).size;
  const adjacentChanges = roles.filter((r, i) => i > 0 && r !== roles[i - 1]).length;
  const adjacentContrast = Math.min(adjacentChanges / (sections.length - 1), 1);

  // Return consistency — same-role sections have similar chord content
  const roleGroups = new Map<string, string[][]>();
  for (const sec of sections) {
    const secChords = chords.slice(sec.barStart - 1, sec.barEnd);
    if (!roleGroups.has(sec.role)) roleGroups.set(sec.role, []);
    roleGroups.get(sec.role)!.push(secChords);
  }
  const consistencyScores: number[] = [];
  for (const [, groups] of roleGroups) {
    if (groups.length < 2) continue;
    for (let i = 1; i < groups.length; i++) {
      const a = new Set(groups[0]);
      const b = new Set(groups[i]);
      const intersection = [...a].filter((c) => b.has(c)).length;
      const union = new Set([...a, ...b]).size;
      consistencyScores.push(union > 0 ? intersection / union : 0);
    }
  }
  const returnConsistency =
    consistencyScores.length > 0
      ? consistencyScores.reduce((x, y) => x + y, 0) / consistencyScores.length
      : 0.5;

  // Boundary strength — chord changes at section boundaries
  let boundaryChanges = 0;
  for (const sec of sections) {
    const boundaryBar = sec.barStart - 1;
    if (boundaryBar > 0 && boundaryBar < chords.length) {
      if (chords[boundaryBar] !== chords[boundaryBar - 1]) {
        boundaryChanges++;
      }
    }
  }
  const boundaryStrength = Math.min(boundaryChanges / sections.length, 1);

  const rawScore =
    10 *
    (0.35 * adjacentContrast + 0.35 * returnConsistency + 0.3 * boundaryStrength);

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  const hardFail = adjacentContrast < 0.2;

  return {
    score: hardFail ? Math.min(score, 4) : score,
    justification:
      `${uniqueRoles} distinct roles, ` +
      `${adjacentChanges}/${sections.length - 1} adjacent changes, ` +
      `return consistency ${(returnConsistency * 10).toFixed(1)}, ` +
      `boundary strength ${(boundaryStrength * 10).toFixed(1)}` +
      (hardFail ? ' [HARD FAIL - no contrast]' : ''),
  };
}

/** SQ→BB lead scoring — distinct beat slots, not stacked render attacks. */
export type EconomyFocusScoringContext = 'default' | 'bb_lead';

export interface EconomyFocusScoringOptions {
  scoringContext?: EconomyFocusScoringContext;
}

function countUniqueMelodicBeatSlots(notes: MelodicNote[]): number {
  const slots = new Set<number>();
  for (const n of notes) {
    const absBeat = (n.bar - 1) * BEATS_PER_MEASURE + n.beat;
    slots.add(Math.round(absBeat * 4) / 4);
  }
  return slots.size;
}

export function scoreEconomyAndFocus(
  line: MelodicNote[],
  options?: EconomyFocusScoringOptions,
): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  const totalBars = Math.max(...line.map((n) => n.bar), 1);
  const beatSlots =
    options?.scoringContext === 'bb_lead' ? countUniqueMelodicBeatSlots(notes) : notes.length;
  const density = beatSlots / (totalBars * BEATS_PER_MEASURE);
  let score: number;
  /** Jazz duo melody: ideal ~50–80% notes per beat; wall-to-wall >95% penalised. */
  if (density > 0.95) {
    score = density >= 0.98 ? 3 : 4;
  } else if (density > 0.88) {
    score = density <= 0.915 ? 6 : 5;
  } else if (density > 0.8) {
    score = density <= 0.84 ? 8 : 7;
  } else if (density >= 0.5) {
    score = density >= 0.58 && density <= 0.72 ? 10 : 9;
  } else if (density >= 0.3) {
    score = density < 0.4 ? 6 : 7;
  } else {
    score = density < 0.15 ? 4 : 5;
  }
  const densityLabel =
    options?.scoringContext === 'bb_lead'
      ? `Beat-slot density ${Math.round(density * 100)}% (${beatSlots} slots / ${totalBars} bars)`
      : `Note density ${Math.round(density * 100)}% (${notes.length} notes / ${totalBars} bars)`;
  return {
    score,
    justification: densityLabel,
  };
}

export interface EcmBarRole {
  bar: number;
  guitarRole: string;
  bassRole: string;
}

export interface EcmSpaceSilenceDetails {
  silenceRatio: number;
  sustainRatio: number;
  phraseEdgeSpaceApplied: boolean;
}

export type EcmSpaceSilenceCategoryScore = CategoryScore & {
  label: 'ecm_space_silence';
  details: EcmSpaceSilenceDetails;
};

export type EcmFeelCategoryScore = CategoryScore & {
  label: 'ecm_feel';
  mode: EcmChamberMode;
};

function resolveEcmSpacePolicy(vrbId?: string) {
  const bundle = getVoiceRuleBundle(vrbId ?? 'ecm_chamber');
  return (
    bundle?.ecmSpacePolicy ?? {
      targetSilenceRatio: 0.2,
      targetSustainRatio: 0.15,
      phraseEdgeSpaceEnabled: true,
      densityEnvelopeMode: 'schneider' as const,
    }
  );
}

/** ECM chamber — silence / sustain_pad roles vs VRB targets (0–10 scale for GCE gate). */
export function scoreEcmSpaceAndSilence(
  bars: readonly EcmBarRole[],
  totalBars: number,
  preset: string,
  options?: {
    phraseEdgeSpaceApplied?: boolean;
    vrbId?: string;
  },
): EcmSpaceSilenceCategoryScore {
  const policy = resolveEcmSpacePolicy(options?.vrbId);
  const tb = Math.max(1, totalBars);
  if (preset !== 'ecm_chamber' || bars.length === 0) {
    return {
      label: 'ecm_space_silence',
      score: 0,
      justification: 'inactive',
      details: { silenceRatio: 0, sustainRatio: 0, phraseEdgeSpaceApplied: false },
    };
  }

  const silenceCount = bars.filter((r) => r.guitarRole === 'silence').length;
  const sustainCount = bars.filter((r) => r.guitarRole === 'sustain_pad').length;
  const silenceRatio = silenceCount / tb;
  const sustainRatio = sustainCount / tb;

  const target = policy.targetSilenceRatio;
  const lo = target - 0.05;
  const hi = target + 0.1;

  let unit = 1;
  if (silenceRatio >= lo && silenceRatio <= hi) unit = 1;
  else if (silenceRatio < 0.1) unit = 0.3;
  else if (silenceRatio > 0.4) unit = 0.5;
  else if (silenceRatio < lo || silenceRatio > hi) unit = 0.7;

  const sustainTarget = policy.targetSustainRatio;
  if (sustainRatio >= sustainTarget - 0.05 && sustainRatio <= sustainTarget + 0.1) {
    unit = Math.min(1, unit + 0.15);
  }

  let phraseEdgeSpaceApplied = options?.phraseEdgeSpaceApplied === true;
  if (!phraseEdgeSpaceApplied && policy.phraseEdgeSpaceEnabled) {
    let phraseEnds = 0;
    let phraseHits = 0;
    for (let b = 4; b <= tb; b += 4) {
      phraseEnds++;
      const row = bars.find((r) => r.bar === b);
      if (row && (row.guitarRole === 'silence' || row.guitarRole === 'sustain_pad')) {
        phraseHits++;
      }
    }
    phraseEdgeSpaceApplied = phraseEnds > 0 && phraseHits / phraseEnds >= 0.35;
  }
  if (phraseEdgeSpaceApplied) unit = Math.min(1, unit + 0.08);

  const score = Math.max(0, Math.min(10, Math.round(unit * 10 * 10) / 10));
  return {
    label: 'ecm_space_silence',
    score,
    justification:
      `silence ${(silenceRatio * 100).toFixed(0)}% (target ${(target * 100).toFixed(0)}%), ` +
      `sustain_pad ${(sustainRatio * 100).toFixed(0)}%, ` +
      `phrase-edge ${phraseEdgeSpaceApplied ? 'yes' : 'no'}`,
    details: { silenceRatio, sustainRatio, phraseEdgeSpaceApplied },
  };
}

function normalizeEcmFeelRaw(raw: number): number {
  return Math.max(0, Math.min(10, Math.round((raw / 14) * 10) / 10));
}

/** ECM Metheny / Schneider feel heuristics as a GCE category (0–10). */
export function scoreEcmFeelCategory(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans = {},
): EcmFeelCategoryScore {
  const policy = resolveEcmSpacePolicy(context.generationMetadata?.songwriterStyleId ?? 'ecm_chamber');
  const mode: EcmChamberMode =
    context.generationMetadata?.ecmMode ??
    (policy.densityEnvelopeMode === 'metheny' ? 'ECM_METHENY_QUARTET' : 'ECM_SCHNEIDER_CHAMBER');
  const raw =
    mode === 'ECM_METHENY_QUARTET'
      ? scoreEcmMethenyFeel(score, context, plans)
      : scoreEcmSchneiderFeel(score, context, plans);
  const normalized = normalizeEcmFeelRaw(raw);
  return {
    label: 'ecm_feel',
    mode,
    score: normalized,
    justification: `${mode} feel raw=${raw} → ${normalized}/10`,
  };
}

function isTensionChord(c: string): boolean {
  if (!c) return false;
  if (c.includes('maj7') || c.includes('maj9') || c.includes('maj13') || c.includes('6/9')) return false;
  if (
    ['alt', 'b9', '#9', '7#11', '7b13', 'dim7', 'm7b5', '7sus'].some((m) => c.includes(m))
  ) {
    return true;
  }
  const stem = chordStem(c);
  return /^[A-G][#b]?13/.test(stem) && !stem.includes('maj');
}

function isReleaseChord(c: string): boolean {
  if (!c) return false;
  if (['maj7', 'maj9', 'maj7#11', '6/9', 'maj6'].some((m) => c.includes(m))) {
    return true;
  }
  const stem = chordStem(c);
  return /^[A-G][#b]?(m9|m7|m11|mmaj)/.test(stem);
}

export function scoreTensionAndRelease(chords: string[]): CategoryScore {
  if (chords.length === 0) {
    return { score: 4, justification: '0 tension-release arcs found' };
  }
  let arcs = 0;
  let cooldown = 0;
  for (let i = 0; i < chords.length - 1; i++) {
    if (cooldown > 0) {
      cooldown--;
      continue;
    }
    const curr = chords[i] ?? '';
    const next = chords[i + 1] ?? '';
    const twoAhead = chords[i + 2] ?? '';
    if (isTensionChord(curr)) {
      if (isReleaseChord(next) || isReleaseChord(twoAhead)) {
        arcs++;
        cooldown = 2;
      }
    }
  }
  let score = 4;
  if (arcs >= 6) score = 10;
  else if (arcs >= 4) score = 9;
  else if (arcs >= 3) score = 8;
  else if (arcs === 2) score = 7;
  else if (arcs === 1) score = 6;
  return {
    score,
    justification: `${arcs} tension-release arcs found`,
  };
}

/** Strip alternate bass / parenthetical extensions for classification (e.g. `Dm9/F` → `Dm9`). */
function chordStem(raw: string): string {
  const s = raw.trim();
  const noParen = s.split('(')[0]!.trim();
  return noParen.split('/')[0]!.trim();
}

/** Dominant-function markers (excludes maj7 / minor-7 types). */
function chordSymbolDominantFamily(raw: string): boolean {
  const s = chordStem(raw);
  if (/maj7|mmaj|maj9|maj11|maj13/i.test(s)) return false;
  if (/^[A-G][#b]?m(7|9|11|13)/i.test(s)) return false;
  /** Lead-sheet spellings like `Dmin9` / `Ebmin11` (not dominant). */
  if (/^[A-G][#b]?min(7|9|11|13)/i.test(s)) return false;
  if (/7alt/i.test(s)) return true;
  if (/7b9|7#9/i.test(s)) return true;
  if (/b13/i.test(s)) return true;
  if (/7#11/i.test(s)) return true;
  if (/13/i.test(s) && !/13sus/i.test(s) && !/maj13/i.test(s) && !/m13/i.test(s)) return true;
  if (/b9/i.test(s) && !/maj9/i.test(s) && !/add9/i.test(s)) return true;
  if (/#9/i.test(s) && !/maj9/i.test(s)) return true;
  if (/^[A-G][#b]?(9|11|13)$/i.test(s)) return true;
  if (/^[A-G][#b]?7([^m]|$)/i.test(s)) return true;
  return false;
}

function chordSymbolTonicFamily(raw: string): boolean {
  const c = chordStem(raw);
  if (/maj7|maj9|maj6|maj11|maj13|mmaj7|add9/i.test(c)) return true;
  if (/[A-G][#b]?m(7|9|11|13)/i.test(c) || /[A-G][#b]?min(7|9|11|13)/i.test(c)) return true;
  if (/maj6|6\/9|6-9/i.test(c)) return true;
  /** `Cm` / `Cmin` triads; `sus` without 7 reads as pedal / plagal-adjacent, not V7. */
  if (/^[A-G][#b]?(m|min)?$/i.test(c)) return true;
  if (!chordSymbolDominantFamily(c)) return true;
  return false;
}

const CADENCE_TONIC_LOOKBACK_BARS = 4;

/** Any tonic-family chord in the last N bars of the section (handles ii–V–I with V7 on the bar line). */
function sectionCadenceHasTonicFamily(
  chords: string[],
  sec: GceStructureSection,
  lookbackBars: number = CADENCE_TONIC_LOOKBACK_BARS
): boolean {
  const span = Math.min(
    lookbackBars,
    Math.max(0, sec.barEnd - sec.barStart + 1)
  );
  for (let i = 0; i < span; i++) {
    const bar = sec.barEnd - i;
    const idx = bar - 1;
    const sym = idx >= 0 && idx < chords.length ? chords[idx]! : '';
    if (sym.trim() !== '' && chordSymbolTonicFamily(sym)) return true;
  }
  return false;
}

function sectionHasLongEnding(line: MelodicNote[], sec: GceStructureSection): boolean {
  const idxs: number[] = [];
  for (let i = 0; i < line.length; i++) {
    const n = line[i]!;
    if (n.rest || n.midi <= 0) continue;
    if (n.bar >= sec.barStart && n.bar <= sec.barEnd) idxs.push(i);
  }
  if (idxs.length === 0) return false;
  const lastTwoIdx = idxs.slice(-2);
  for (const i of lastTwoIdx) {
    const n = line[i]!;
    if (n.beats >= 1.5) return true;
    const next = line[i + 1];
    if (next?.rest === true && next.beats >= 1.0) return true;
  }
  return false;
}

/** GCE v2.0 — Cadential Clarity */
export function scoreCadentialClarity(
  line: MelodicNote[],
  chords: string[],
  sections: GceStructureSection[],
  contrapuntal?: ContrapuntalGceScoringOptions,
): CategoryScore {
  if (!sections?.length || !chords.length) {
    return { score: 0, justification: 'Insufficient section or chord data' };
  }
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  let strongBeatLandings = 0;
  let tonicLandings = 0;
  let longNoteEndings = 0;

  for (const sec of sections) {
    const inSection = notes.filter((n) => n.bar >= sec.barStart && n.bar <= sec.barEnd);
    if (inSection.length === 0) continue;
    const last = inSection[inSection.length - 1]!;
    const beatInt = Math.floor(last.beat);
    if (beatInt >= 0 && beatInt <= 3) strongBeatLandings++;

    if (sectionCadenceHasTonicFamily(chords, sec)) tonicLandings++;

    if (sectionHasLongEnding(line, sec)) longNoteEndings++;
  }

  const denom = 3 * sections.length;
  const raw =
    denom > 0 ? (10 * (strongBeatLandings + tonicLandings + longNoteEndings)) / denom : 0;
  let score = Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
  let justification =
    `strong beats ${strongBeatLandings}, tonic-family ${tonicLandings}, long endings ${longNoteEndings} / ${sections.length} sections`;

  if (contrapuntal?.contrapuntalLinePolicy === true && (contrapuntal.mesoSpans?.length ?? 0) >= 2) {
    const mesoCadence = scorePhraseGrammarContrapuntal(line, contrapuntal).score;
    score = Math.max(0, Math.min(10, Math.round((0.42 * score + 0.58 * mesoCadence) * 10) / 10));
    justification += `; meso cadence blend ${mesoCadence.toFixed(1)} [SQ contrapuntal]`;
  }

  return { score, justification };
}

function mesoSpanLengthBars(span: ContrapuntalMesoSpanRef): number {
  return Math.max(0, span.endBeat - span.startBeat) / BEATS_PER_MEASURE;
}

function motifIntervalVectorForSpan(line: MelodicNote[], span: ContrapuntalMesoSpanRef): number[] {
  const notes = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
  if (notes.length < 3) return [];
  const pitches = notes.map((n) => n.midi);
  const head = pitches.slice(0, Math.min(4, pitches.length));
  return head.slice(1).map((p, j) => (((p - head[j]!) % 12) + 12) % 12);
}

function cyclicMotifReturnScore(
  line: MelodicNote[],
  meso: readonly ContrapuntalMesoSpanRef[],
): number {
  if (meso.length < 2) return 0;
  const first = motifIntervalVectorForSpan(line, meso[0]!);
  const last = motifIntervalVectorForSpan(line, meso[meso.length - 1]!);
  if (first.length < 2 || first.length !== last.length) return 0;
  const match = first.every((iv, k) => Math.abs(iv - last[k]!) <= 2);
  return match ? 1 : 0;
}

function adjacentMesoCellRepeat(
  line: MelodicNote[],
  meso: readonly ContrapuntalMesoSpanRef[],
  index: number,
): boolean {
  if (index < 1) return false;
  const a = motifIntervalVectorForSpan(line, meso[index - 1]!);
  const b = motifIntervalVectorForSpan(line, meso[index]!);
  if (a.length < 2 || b.length < 2) return false;
  let matches = 0;
  const n = Math.min(a.length, b.length);
  for (let k = 0; k < n; k++) {
    if (Math.abs(a[k]! - b[k]!) <= 2) matches++;
  }
  return matches >= n - 1;
}

function scorePhraseGrammarContrapuntal(
  line: MelodicNote[],
  options: ContrapuntalGceScoringOptions,
): CategoryScore {
  const meso = options.mesoSpans;
  if (meso.length < 2) {
    return scorePhraseGrammar(line);
  }

  const sqGce = options.sqGceAdjustmentsOverride
    ? options.sqGceAdjustmentsOverride
    : options.sqVrbId
      ? getSqVrbGceAdjustments(options.sqVrbId)
      : undefined;
  const ostinatoPg = sqGce?.phraseGrammarMode === 'ostinato_cell';
  const folkModalPg = sqGce?.phraseGrammarMode === 'folk_modal_suspended';
  const romanticPg = sqGce?.phraseGrammarMode === 'romantic_periodic_cadential';
  const strictPeriodicPg = sqGce?.phraseGrammarMode === 'strict_periodic_tonal_cadence';
  const doublyOpenPg = sqGce?.phraseGrammarMode === 'doubly_open_cell_development';
  const loopingCellPg = sqGce?.phraseGrammarMode === 'looping_cell_no_cadence';
  const repeatingOstinatoPg = sqGce?.phraseGrammarMode === 'repeating_ostinato_no_cadence';
  const throughComposedArchPg = sqGce?.phraseGrammarMode === 'through_composed_arch_no_cadence';
  const shostakovichPg = sqGce?.phraseGrammarMode === 'asymmetric_cell_non_resolving';
  const webernPg = sqGce?.phraseGrammarMode === 'aphoristic_cell_silence_bounded';
  const joniMitchellPg = sqGce?.phraseGrammarMode === 'four_bar_periodic_suspended_non_resolving';
  const zimmerPassacagliaPg =
    options.sqVrbId === 'zimmer' && options.passacagliaMode === true;

  let closedPhrases = 0;
  let cadenceSum = 0;
  let periodicCellHits = 0;
  let ostinatoCellRepeats = 0;
  let dissonantClosures = 0;
  let longArchHits = 0;
  let inconclusiveHits = 0;
  let wallToWallHits = 0;
  let doublyOpenHits = 0;
  let chordTransitionHits = 0;
  let silenceBoundaryHits = 0;
  let loopingCellHits = 0;
  let rowCompletionHits = 0;
  let sparseTextureHits = 0;
  let innerVoiceSustainHits = 0;
  let shortPhraseHits = 0;
  let dominantResolutionHits = 0;
  for (let i = 0; i < meso.length; i++) {
    const span = meso[i]!;
    const spanCadence = Math.max(
      cadenceStrengthRank(span.cadenceStrength, true, options.sqVrbId),
      cadenceTagStrengthNear(options.cadenceTags, span.endBeat),
      i < meso.length - 1 ? 0.68 : 0.55,
    );
    cadenceSum += spanCadence;
    const notesIn = pitchedNotesInBarRange(line, span.startBeat, span.endBeat);
    const last = notesIn[notesIn.length - 1];
    const longEnding = last ? last.beats >= 1.5 : false;
    const lenBars = mesoSpanLengthBars(span);
    const cellRepeat = adjacentMesoCellRepeat(line, meso, i);
    if (cellRepeat) ostinatoCellRepeats++;
    if (folkModalPg) {
      const longArch = lenBars >= (sqGce?.longPhraseBarsMin ?? 8);
      const inconclusive = span.cadenceStrength === 'weak' || !longEnding;
      if (longArch) longArchHits++;
      if (inconclusive) inconclusiveHits++;
      if (longArch || inconclusive || spanCadence >= 0.45 || longEnding || i < meso.length - 1) {
        closedPhrases++;
      }
    } else if (romanticPg) {
      if (
        span.cadenceStrength === 'strong' ||
        spanCadence >= 0.72 ||
        (spanCadence >= 0.55 && longEnding) ||
        i < meso.length - 1
      ) {
        closedPhrases++;
      }
    } else if (strictPeriodicPg) {
      if (span.cadenceStrength === 'strong' || (spanCadence >= 0.78 && longEnding)) {
        closedPhrases++;
      }
      if (lenBars > 8 && span.cadenceStrength !== 'strong') {
        wallToWallHits++;
      }
    } else if (doublyOpenPg) {
      const doublyOpen =
        span.cadenceStrength === 'weak' ||
        span.cadenceStrength === 'medium' ||
        !longEnding;
      if (doublyOpen) doublyOpenHits++;
      if (cellRepeat || spanCadence >= 0.4 || doublyOpen || longEnding || i < meso.length - 1) {
        closedPhrases++;
      }
    } else if (loopingCellPg) {
      const inconclusive =
        span.cadenceStrength === 'weak' || span.cadenceStrength === 'medium' || !longEnding;
      if (inconclusive) inconclusiveHits++;
      const chordBoundary =
        sqGce?.chordTransitionAsBoundary === true && lenBars >= 1.5 && lenBars <= 2.75;
      if (chordBoundary) chordTransitionHits++;
      if (
        cellRepeat ||
        spanCadence >= 0.38 ||
        inconclusive ||
        longEnding ||
        chordBoundary ||
        i < meso.length - 1
      ) {
        closedPhrases++;
      }
    } else if (repeatingOstinatoPg) {
      const inconclusive =
        span.cadenceStrength === 'weak' || span.cadenceStrength === 'medium' || !longEnding;
      if (inconclusive) inconclusiveHits++;
      if (
        cellRepeat ||
        spanCadence >= 0.36 ||
        inconclusive ||
        longEnding ||
        i < meso.length - 1
      ) {
        closedPhrases++;
      }
    } else if (throughComposedArchPg) {
      const longArch = lenBars >= (sqGce?.longPhraseBarsMin ?? 16);
      const inconclusive =
        span.cadenceStrength === 'weak' ||
        span.cadenceStrength === 'medium' ||
        !longEnding;
      if (longArch) longArchHits++;
      if (inconclusive) inconclusiveHits++;
      if (longArch || inconclusive || spanCadence >= 0.42 || longEnding || i < meso.length - 1) {
        closedPhrases++;
      }
    } else if (shostakovichPg) {
      const inconclusive =
        span.cadenceStrength === 'weak' ||
        span.cadenceStrength === 'medium' ||
        !longEnding;
      if (inconclusive) inconclusiveHits++;
      if (
        cellRepeat ||
        inconclusive ||
        spanCadence >= 0.38 ||
        longEnding ||
        i < meso.length - 1
      ) {
        closedPhrases++;
      }
    } else if (webernPg) {
      const silenceBoundary = mesoSpanHasSilenceBoundary(line, span.startBeat, span.endBeat, 1);
      const shortCell = lenBars >= 1 && lenBars <= 3.25;
      const longCell = lenBars > 4.25;
      const rowComplete = mesoSpanRowCompletionRatio(line, span) >= 0.85;
      const sparseVoices = notesIn.length <= 2;
      if (silenceBoundary) silenceBoundaryHits++;
      if (cellRepeat) loopingCellHits++;
      if (longCell) wallToWallHits++;
      if (rowComplete) rowCompletionHits++;
      if (sparseVoices) sparseTextureHits++;
      if (silenceBoundary || shortCell || rowComplete || spanCadence >= 0.34 || i < meso.length - 1) {
        closedPhrases++;
      }
    } else if (joniMitchellPg) {
      const inconclusive =
        span.cadenceStrength === 'weak' ||
        span.cadenceStrength === 'medium' ||
        !longEnding;
      const periodicCell = lenBars >= 4 && lenBars <= 5.25;
      const shortCell = lenBars >= 2.75 && lenBars <= 3.25;
      const longCell = lenBars >= 5.75 && lenBars <= 6.25;
      const threeTier = notesIn.length <= 3;
      if (inconclusive) inconclusiveHits++;
      if (threeTier) innerVoiceSustainHits++;
      if (cellRepeat) loopingCellHits++;
      if (shortCell) shortPhraseHits++;
      if (longCell) wallToWallHits++;
      if (span.cadenceStrength === 'strong') dominantResolutionHits++;
      if (inconclusive || periodicCell || threeTier || spanCadence >= 0.4 || i < meso.length - 1) {
        closedPhrases++;
      }
    } else if (ostinatoPg) {
      if (cellRepeat || spanCadence >= 0.4 || longEnding || i < meso.length - 1) {
        closedPhrases++;
      }
      if (span.cadenceStrength === 'weak' || spanCadence < 0.55) {
        dissonantClosures++;
      }
    } else if (spanCadence >= 0.5 || longEnding || i < meso.length - 1) {
      closedPhrases++;
    }
    if (sqGce && !folkModalPg) {
      if (lenBars >= sqGce.phraseCellBarsMin && lenBars <= sqGce.phraseCellBarsMax + 0.25) {
        periodicCellHits++;
      }
    } else if (sqGce && (folkModalPg || throughComposedArchPg)) {
      if (lenBars >= sqGce.phraseCellBarsMin && lenBars <= sqGce.phraseCellBarsMax + 0.25) {
        periodicCellHits++;
      }
    } else if (sqGce && shostakovichPg) {
      if (lenBars >= sqGce.phraseCellBarsMin && lenBars <= sqGce.phraseCellBarsMax + 0.25) {
        periodicCellHits++;
      } else if (lenBars >= 12 && lenBars <= 16.25) {
        periodicCellHits++;
      }
    } else if (sqGce && webernPg) {
      if (lenBars >= sqGce.phraseCellBarsMin && lenBars <= sqGce.phraseCellBarsMax + 0.25) {
        periodicCellHits++;
      }
    } else if (sqGce && joniMitchellPg) {
      if (lenBars >= sqGce.phraseCellBarsMin && lenBars <= sqGce.phraseCellBarsMax + 0.25) {
        periodicCellHits++;
      }
    }
  }

  const cadenceStrengthScore = cadenceSum / meso.length;
  const closedRatio = closedPhrases / meso.length;
  const phraseCountNorm = Math.min(meso.length / 6, 1);

  let periodicBonus = 0;
  if (sqGce) {
    if (folkModalPg) {
      periodicBonus =
        (longArchHits / meso.length) * 0.1 +
        (inconclusiveHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.12) +
        (meso.filter((m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium').length /
          meso.length) *
          (sqGce.modalCadenceCredit ?? 0.1) +
        (periodicCellHits / meso.length) * 0.06 +
        cyclicMotifReturnScore(line, meso) * sqGce.cyclicMotifReturnBoost;
    } else if (romanticPg) {
      const strongCadences = meso.filter((m) => m.cadenceStrength === 'strong').length;
      const totalBars = meso.reduce((s, m) => s + mesoSpanLengthBars(m), 0);
      const cyclic = cyclicMotifReturnScore(line, meso);
      periodicBonus =
        (strongCadences / meso.length) * (sqGce.authenticCadenceCredit ?? 0.16) +
        (periodicCellHits / meso.length) * 0.12 +
        (sqGce.phrasePeriodBars > 0 && totalBars > 0 && totalBars % sqGce.phrasePeriodBars < 1
          ? 0.08
          : 0) +
        cyclic * sqGce.cyclicMotifReturnBoost;
    } else if (strictPeriodicPg) {
      const strongCadences = meso.filter((m) => m.cadenceStrength === 'strong').length;
      const totalBars = meso.reduce((s, m) => s + mesoSpanLengthBars(m), 0);
      const cyclic = cyclicMotifReturnScore(line, meso);
      periodicBonus =
        (strongCadences / meso.length) * (sqGce.authenticCadenceCredit ?? 0.22) +
        (periodicCellHits / meso.length) * 0.14 +
        (sqGce.phrasePeriodBars > 0 && totalBars > 0 && totalBars % sqGce.phrasePeriodBars < 1
          ? 0.1
          : 0) +
        cyclic * sqGce.cyclicMotifReturnBoost -
        (wallToWallHits / meso.length) * (sqGce.wallToWallPhrasePenalty ?? 0.14);
    } else if (doublyOpenPg) {
      const strongCadences = meso.filter((m) => m.cadenceStrength === 'strong').length;
      const modalEnds = meso.filter(
        (m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium',
      ).length;
      const repeatRatio = ostinatoCellRepeats / Math.max(1, meso.length - 1);
      const cyclic = cyclicMotifReturnScore(line, meso);
      periodicBonus =
        (doublyOpenHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.12) +
        (modalEnds / meso.length) *
          (sqGce.modalEndingsValid ? (sqGce.modalCadenceCredit ?? 0.14) : 0) +
        (sqGce.chromaticMediantCredit ?? 0.12) * (periodicCellHits / meso.length) +
        repeatRatio * (sqGce.ostinatoPhraseEndingCredit ?? 0.16) +
        (strongCadences / meso.length) * (sqGce.authenticCadenceCredit ?? 0.08) +
        (periodicCellHits / meso.length) * 0.08 +
        cyclic * sqGce.cyclicMotifReturnBoost;
    } else if (shostakovichPg) {
      const modalEnds = meso.filter(
        (m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium',
      ).length;
      const repeatRatio = ostinatoCellRepeats / Math.max(1, meso.length - 1);
      const cyclic = cyclicMotifReturnScore(line, meso);
      const longStrettoSpan = meso.some((m) => {
        const lb = mesoSpanLengthBars(m);
        return lb >= 12 && lb <= 16.25;
      });
      periodicBonus =
        (inconclusiveHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.16) +
        (modalEnds / meso.length) *
          (sqGce.modalEndingsValid ? (sqGce.chromaticMediantCredit ?? 0.14) : 0) +
        (sqGce.thirdRelationCredit ?? 0.14) * (periodicCellHits / meso.length) +
        (sqGce.tritoneAxisCredit ?? 0.12) * (periodicCellHits / meso.length) +
        repeatRatio * (sqGce.ostinatoPhraseEndingCredit ?? 0.18) +
        (sqGce.passacagliaPedalCredit ?? 0.14) * repeatRatio +
        (sqGce.bassPedalCredit ?? 0.12) * 0.55 +
        (longStrettoSpan ? (sqGce.strettoMotifSaturationCredit ?? 0.12) : 0) +
        (periodicCellHits / meso.length) * 0.08 +
        cyclic * sqGce.cyclicMotifReturnBoost;
    } else if (webernPg) {
      periodicBonus =
        (silenceBoundaryHits / meso.length) * (sqGce.silenceBoundaryCredit ?? 0.18) +
        (periodicCellHits / meso.length) * 0.1 +
        (rowCompletionHits / meso.length) * (sqGce.rowCompletionBoundaryCredit ?? 0.14) +
        (sparseTextureHits / meso.length) * (sqGce.klangfarbenmelodieCredit ?? 0.14) +
        (sqGce.isolatedToneCredit ?? 0.12) * 0.45 -
        (loopingCellHits / meso.length) * (sqGce.loopingCellPenalty ?? 0.2) -
        (wallToWallHits / meso.length) * (sqGce.longPhraseCellPenalty ?? 0.16) -
        (ostinatoCellRepeats / Math.max(1, meso.length - 1)) *
          (sqGce.loopingCellPenalty ?? 0.2) *
          0.5;
    } else if (joniMitchellPg) {
      const modalEnds = meso.filter(
        (m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium',
      ).length;
      periodicBonus =
        (inconclusiveHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.16) +
        (modalEnds / meso.length) *
          (sqGce.modalEndingsValid ? (sqGce.modalCadenceCredit ?? 0.14) : 0) +
        (periodicCellHits / meso.length) * (sqGce.susChordCredit ?? 0.16) +
        (innerVoiceSustainHits / meso.length) * (sqGce.innerVoiceSustainCredit ?? 0.12) +
        (sqGce.lowRegisterPedalCredit ?? 0.14) * 0.45 +
        (sqGce.sopranoArchCredit ?? 0.14) * 0.4 -
        (loopingCellHits / meso.length) * (sqGce.loopingCellPenalty ?? 0.18) -
        (shortPhraseHits / meso.length) * (sqGce.shortPhraseCellPenalty ?? 0.12) -
        (wallToWallHits / meso.length) * (sqGce.longPhraseCellPenalty ?? 0.1) -
        (dominantResolutionHits / meso.length) * (sqGce.dominantResolutionPenalty ?? 0.14);
    } else if (loopingCellPg) {
      const repeatRatio = ostinatoCellRepeats / Math.max(1, meso.length - 1);
      const modalEnds = meso.filter(
        (m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium',
      ).length;
      const cyclic = cyclicMotifReturnScore(line, meso);
      const additive = glassAdditiveLayeringScore(line, meso);
      periodicBonus =
        repeatRatio * (sqGce.ostinatoPhraseEndingCredit ?? 0.2) +
        (inconclusiveHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.14) +
        (modalEnds / meso.length) *
          (sqGce.modalEndingsValid ? (sqGce.modalCadenceCredit ?? 0.12) : 0) +
        (chordTransitionHits / meso.length) * 0.12 +
        (periodicCellHits / meso.length) * 0.1 +
        additive * (sqGce.additiveLayeringCredit ?? 0.1) +
        cyclic * sqGce.cyclicMotifReturnBoost;
    } else if (repeatingOstinatoPg) {
      const repeatRatio = ostinatoCellRepeats / Math.max(1, meso.length - 1);
      const modalEnds = meso.filter(
        (m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium',
      ).length;
      const weakCadences = meso.filter((m) => m.cadenceStrength === 'weak').length;
      const cyclic = cyclicMotifReturnScore(line, meso);
      const additive = glassAdditiveLayeringScore(line, meso);
      periodicBonus =
        repeatRatio * (sqGce.ostinatoPhraseEndingCredit ?? 0.18) +
        (inconclusiveHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.14) +
        (modalEnds / meso.length) *
          (sqGce.modalEndingsValid ? (sqGce.modalCadenceCredit ?? 0.14) : 0) +
        (weakCadences / meso.length) * (sqGce.subMediantColorCredit ?? 0.1) +
        (sqGce.chromaticMediantCredit ?? 0.12) * (periodicCellHits / meso.length) +
        additive * (sqGce.additiveLayeringCredit ?? 0.14) +
        (meso.filter((m) => m.cadenceStrength === 'strong').length / meso.length) *
          (sqGce.authenticCadenceCredit ?? 0.04) +
        cyclic * sqGce.cyclicMotifReturnBoost -
        (wallToWallHits / meso.length) * (sqGce.wallToWallPhrasePenalty ?? 0);
      if (zimmerPassacagliaPg) {
        periodicBonus += (additive * 0.08 + repeatRatio * 0.06);
      }
    } else if (throughComposedArchPg) {
      const modalEnds = meso.filter(
        (m) => m.cadenceStrength === 'weak' || m.cadenceStrength === 'medium',
      ).length;
      const cyclic = cyclicMotifReturnScore(line, meso);
      const codaDiss = badalamentiCodaDissolutionScore(line, meso);
      periodicBonus =
        (longArchHits / meso.length) * 0.12 +
        (inconclusiveHits / meso.length) * (sqGce.inconclusiveEndingCredit ?? 0.16) +
        (modalEnds / meso.length) *
          (sqGce.modalEndingsValid ? (sqGce.modalCadenceCredit ?? 0.14) : 0) +
        (periodicCellHits / meso.length) * (sqGce.jazzExtensionCredit ?? 0.12) +
        (sqGce.chromaticMediantCredit ?? 0.14) * (periodicCellHits / meso.length) +
        (sqGce.bassPedalCredit ?? 0.12) * 0.55 +
        codaDiss * (sqGce.codaDissolutionCredit ?? 0.14) +
        (inconclusiveHits / meso.length) * (sqGce.coolJazzModalCredit ?? 0.1) +
        cyclic * sqGce.cyclicMotifReturnBoost -
        (wallToWallHits / meso.length) * (sqGce.wallToWallPhrasePenalty ?? 0);
    } else if (ostinatoPg) {
      const repeatRatio = ostinatoCellRepeats / Math.max(1, meso.length - 1);
      periodicBonus =
        repeatRatio * (sqGce.ostinatoPhraseEndingCredit ?? 0.15) +
        (periodicCellHits / meso.length) * 0.1 +
        (dissonantClosures / meso.length) * (sqGce.dissonantClosureCredit ?? 0.1) +
        cyclicMotifReturnScore(line, meso) * sqGce.cyclicMotifReturnBoost;
    } else {
      const cellRatio = periodicCellHits / meso.length;
      const totalBars = meso.reduce((s, m) => s + mesoSpanLengthBars(m), 0);
      const cyclic = cyclicMotifReturnScore(line, meso);
      periodicBonus =
        cellRatio * 0.08 +
        (sqGce.phrasePeriodBars > 0 && totalBars > 0 && totalBars % sqGce.phrasePeriodBars < 1
          ? 0.06
          : 0) +
        cyclic * sqGce.cyclicMotifReturnBoost;
    }
  }

  const rawScore =
    10 *
    (0.35 * closedRatio +
      0.35 * phraseCountNorm +
      0.3 * cadenceStrengthScore +
      periodicBonus);
  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  const pgTag =
    options.sqVrbId === 'herrmann'
      ? ' [SQ herrmann PG]'
      : options.sqVrbId === 'ravel'
        ? ' [SQ ravel PG]'
        : options.sqVrbId === 'morricone'
          ? ' [SQ morricone PG]'
          : options.sqVrbId === 'williams'
            ? ' [SQ williams PG]'
            : options.sqVrbId === 'rota'
              ? ' [SQ rota PG]'
              : options.sqVrbId === 'goldsmith'
                ? ' [SQ goldsmith PG]'
                : options.sqVrbId === 'glass'
                  ? ' [SQ glass PG]'
                  : options.sqVrbId === 'zimmer'
                    ? zimmerPassacagliaPg
                      ? ' [SQ zimmer passacaglia PG]'
                      : ' [SQ zimmer PG]'
                    : options.sqVrbId === 'badalamenti'
                      ? ' [SQ badalamenti PG]'
                      : options.sqVrbId === 'shostakovich'
                        ? ' [SQ shostakovich PG]'
                        : options.sqVrbId === 'webern'
                          ? ' [SQ webern PG]'
                          : options.sqVrbId === 'joni_mitchell'
                            ? ' [SQ joni_mitchell PG]'
                            : '';
  return {
    score,
    justification:
      `${closedPhrases}/${meso.length} meso-closed, ${meso.length} meso phrases, ` +
      `cadence strength ${(cadenceStrengthScore * 10).toFixed(1)} [SQ contrapuntal]${pgTag}`,
  };
}

/** GCE v2.0 — Phrase Grammar */
export function scorePhraseGrammar(
  line: MelodicNote[],
  contrapuntal?: ContrapuntalGceScoringOptions,
): CategoryScore {
  if (contrapuntal?.contrapuntalLinePolicy === true && (contrapuntal.mesoSpans?.length ?? 0) >= 2) {
    return scorePhraseGrammarContrapuntal(line, contrapuntal);
  }

  const phrases: MelodicNote[][] = [];
  let buf: MelodicNote[] = [];
  for (const e of line) {
    if (e.rest && e.beats >= 0.75) {
      if (buf.length) {
        phrases.push(buf);
        buf = [];
      }
      continue;
    }
    buf.push(e);
  }
  if (buf.length) phrases.push(buf);

  const pitchedPhrases = phrases.filter((p) => p.some((n) => !n.rest && n.midi > 0));
  const totalPhrases = Math.max(pitchedPhrases.length, 1);
  let closedPhrases = 0;
  const lengths: number[] = [];
  for (let p = 0; p < pitchedPhrases.length; p++) {
    const pitched = pitchedPhrases[p]!.filter((n) => !n.rest && n.midi > 0);
    if (!pitched.length) continue;
    lengths.push(pitched.length);
    const last = pitched[pitched.length - 1]!;
    if (p < pitchedPhrases.length - 1 || last.beats >= 1.5) closedPhrases++;
  }

  const phraseCount = pitchedPhrases.length;
  let phraseVariety = 0;
  if (lengths.length > 0) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / lengths.length;
    phraseVariety = Math.min(Math.sqrt(variance) / (mean + 0.01), 1);
  }

  const rawScore =
    10 *
    (0.4 * (closedPhrases / totalPhrases) +
      0.3 * Math.min(phraseCount / 6, 1) +
      0.3 * phraseVariety);
  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score,
    justification: `${closedPhrases}/${totalPhrases} closed phrases, ${phraseCount} phrases, variety ${(phraseVariety * 10).toFixed(1)}`,
  };
}

function countNotesPerBar(part: PartModel): Map<number, number> {
  const m = new Map<number, number>();
  for (const meas of part.measures) {
    let n = 0;
    for (const e of meas.events) {
      if (e.kind === 'note') n++;
    }
    m.set(meas.index, n);
  }
  return m;
}

/**
 * Lowest/highest MIDI in the part.
 * **`melodyVoiceOnly`** — same convention as **`scoreModelToMelodicLine`**: voice **1** or unspecified (excludes guitar **voice 2** shells so register gap reflects lead vs bass).
 */
function collectMidiRange(
  part: PartModel,
  opts?: { melodyVoiceOnly?: boolean }
): { min: number; max: number } {
  let min = 127;
  let max = 0;
  let counted = 0;
  for (const meas of part.measures) {
    for (const e of meas.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!Number.isFinite(n.pitch)) continue;
      if (
        opts?.melodyVoiceOnly &&
        n.voice !== undefined &&
        n.voice !== 1
      ) {
        continue;
      }
      counted++;
      min = Math.min(min, n.pitch);
      max = Math.max(max, n.pitch);
    }
  }
  if (counted === 0 && opts?.melodyVoiceOnly) {
    return collectMidiRange(part);
  }
  const isBassPart =
    part.instrumentIdentity === 'acoustic_upright_bass' || part.id === 'bass';
  if (counted === 0 && isBassPart) {
    /** No finite pitches (pipeline bug / frozen sentinel) — use upright hard range, not `{60,60}` (that forces gap 0 vs melody at middle C). */
    return { min: UPRIGHT_BASS_HARD_LOW, max: UPRIGHT_BASS_HARD_HIGH };
  }
  const out = min <= max ? { min, max } : { min: 60, max: 60 };
  return {
    min: Number.isFinite(out.min) ? out.min : 60,
    max: Number.isFinite(out.max) ? out.max : 60,
  };
}

/** GCE v2.0 — Arrangement & Orchestration */
export function scoreArrangementAndOrchestration(score: ScoreModel): CategoryScore {
  const guitar =
    score.parts.find((p) => p.id === 'guitar') ??
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass =
    score.parts.find((p) => p.id === 'bass') ??
    score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) {
    return { score: 4, justification: 'Missing guitar or bass part' };
  }

  const gMap = countNotesPerBar(guitar);
  const bMap = countNotesPerBar(bass);
  const bars = new Set([...gMap.keys(), ...bMap.keys()]);
  const barList = [...bars].sort((a, b) => a - b);
  if (barList.length === 0) {
    return { score: 0, justification: 'No measures' };
  }

  /** Per bar: **|Ng/4 − Nb/4|** = imbalance of note counts scaled to one beat (4/4). Mean → **densityDifference** ∈ ~0–2+. */
  let diffSum = 0;
  const totals: number[] = [];
  for (const bar of barList) {
    const gn = gMap.get(bar) ?? 0;
    const bn = bMap.get(bar) ?? 0;
    diffSum += Math.abs(gn / 4 - bn / 4);
    totals.push(gn + bn);
  }
  const densityDifference = diffSum / barList.length;

  const gMelody = collectMidiRange(guitar, { melodyVoiceOnly: true });
  const bR = collectMidiRange(bass);
  /** Low overlap between **melody-register** guitar bottom and bass ceiling (typical duo target ~5–20 st when separated). */
  const gmin = Number.isFinite(gMelody.min) ? gMelody.min : 60;
  const bmax = Number.isFinite(bR.max) ? bR.max : UPRIGHT_BASS_HARD_HIGH;
  const registerSeparation = Math.max(0, gmin - bmax);

  const meanTot = totals.reduce((a, b) => a + b, 0) / totals.length;
  const varTot =
    totals.reduce((s, v) => s + Math.pow(v - meanTot, 2), 0) / totals.length;
  const activePartVariety = Math.sqrt(varTot);

  const rawScore =
    10 *
    (0.4 * Math.min(densityDifference / 0.5, 1) +
      0.35 * Math.min(registerSeparation / 12, 1) +
      0.25 * Math.min(activePartVariety / 2, 1));
  const sc = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score: sc,
    justification:
      `density Δ ${densityDifference.toFixed(2)} (mean |guitar−bass| notes/bar ÷ 4), register gap ${registerSeparation.toFixed(0)} st (melody guitar min − bass max), part activity σ ${activePartVariety.toFixed(1)}`,
  };
}

function isBigBandScoreModel(score: ScoreModel): boolean {
  return score.parts.some((p) => p.id.startsWith('bb_'));
}

function bbScoreBarCount(score: ScoreModel): number {
  let n = 0;
  for (const p of score.parts) {
    if (p.measures.length > n) n = p.measures.length;
  }
  return n;
}

/**
 * GCE v2.0 Arrangement pillar — hierarchy clarity (0–1).
 * Mean per-bar dominance of the busiest part vs total attacks (flat textures → low H).
 */
export function computeArrangementHierarchyClarityBigBand(score: ScoreModel): number {
  const barCount = bbScoreBarCount(score);
  if (barCount < 1) return 0;
  let sum = 0;
  for (let b = 1; b <= barCount; b++) {
    const counts: number[] = [];
    for (const p of score.parts) {
      if (p.id === 'bb_drums' || p.id === 'groove_drums') continue;
      const m = p.measures[b - 1];
      let n = 0;
      if (m) {
        for (const e of m.events) {
          if (e.kind === 'note' && (e.voice ?? 1) === 1) n++;
        }
      }
      counts.push(n);
    }
    const total = counts.reduce((a, c) => a + c, 0);
    if (total === 0) {
      sum += 0.5;
      continue;
    }
    const max = Math.max(...counts);
    sum += max / total;
  }
  return sum / barCount;
}

/** Big-band arrangement: ensemble density motion / contrast across bars (not guitar–bass duo). */
export function scoreArrangementAndOrchestrationBigBand(score: ScoreModel): CategoryScore {
  const barCount = bbScoreBarCount(score);
  if (barCount < 1) return { score: 0, justification: 'BB: no bars' };
  const dens: number[] = [];
  for (let b = 1; b <= barCount; b++) {
    dens.push(activePartsNormalizedBigBand(score, b));
  }
  let motion = 0;
  for (let i = 1; i < dens.length; i++) {
    motion += Math.abs(dens[i]! - dens[i - 1]!);
  }
  const boundaryMotion = motion / Math.max(1, dens.length - 1);
  const rangeSpread = Math.max(...dens) - Math.min(...dens);
  const mean = dens.reduce((a, b) => a + b, 0) / dens.length;
  const varD = dens.reduce((s, v) => s + (v - mean) ** 2, 0) / dens.length;
  const sigma = Math.sqrt(varD);
  const rawScore =
    10 *
    (0.38 * Math.min(boundaryMotion / 0.18, 1) +
      0.37 * Math.min(rangeSpread / 0.55, 1) +
      0.25 * Math.min(sigma / 0.14, 1));
  const sc = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score: sc,
    justification: `BB motion ${boundaryMotion.toFixed(3)}, spread ${rangeSpread.toFixed(3)}, σ ${sigma.toFixed(3)}`,
  };
}

export function scoreArrangementAndOrchestrationForEnsemble(score: ScoreModel): CategoryScore {
  if (isBigBandScoreModel(score)) return scoreArrangementAndOrchestrationBigBand(score);
  return scoreArrangementAndOrchestration(score);
}

function chordTimelineCoverage(chords: string[]): number {
  if (!chords.length) return 0;
  let k = 0;
  for (const c of chords) {
    if (c != null && String(c).trim().length > 0) k++;
  }
  return k / chords.length;
}

/** Melodic peaks / valleys when chord-symbol tension arcs are thin. */
export function scoreTensionAndReleaseMelodicContour(line: MelodicNote[]): CategoryScore {
  const pitches = line.filter((n) => !n.rest && n.midi > 0).map((n) => n.midi);
  if (pitches.length < 5) {
    return { score: 4, justification: 'melodic contour: too few notes' };
  }
  let peaks = 0;
  for (let i = 2; i < pitches.length - 2; i++) {
    const pk = pitches[i]!;
    if (pk > pitches[i - 1]! && pk > pitches[i + 1]! && pk >= pitches[i - 2]! && pk >= pitches[i + 2]!) peaks++;
  }
  let score = 4;
  if (peaks >= 10) score = 10;
  else if (peaks >= 8) score = 9;
  else if (peaks >= 6) score = 8;
  else if (peaks >= 4) score = 7;
  else if (peaks >= 2) score = 6;
  else if (peaks >= 1) score = 5;
  return { score, justification: `melodic contour peaks ${peaks}` };
}

export function scoreTensionAndReleaseForEnsemble(
  score: ScoreModel,
  chords: string[],
  melody: MelodicNote[]
): CategoryScore {
  if (!isBigBandScoreModel(score)) return scoreTensionAndRelease(chords);
  const cov = chordTimelineCoverage(chords);
  const chordSc = scoreTensionAndRelease(chords);
  const melSc = scoreTensionAndReleaseMelodicContour(melody);
  if (cov >= 0.35 && chordSc.score >= 7) return chordSc;
  if (cov < 0.22) return melSc;
  const blended = Math.round((0.45 * chordSc.score + 0.55 * melSc.score) * 10) / 10;
  const scoreVal = Math.min(10, Math.max(chordSc.score, melSc.score, blended));
  return {
    score: scoreVal,
    justification: `BB tension chord=${chordSc.score} cov=${cov.toFixed(2)} melodic=${melSc.score} → ${scoreVal.toFixed(1)}`,
  };
}

export function scoreEconomyAndFocusBigBand(
  line: MelodicNote[],
  sections: GceStructureSection[],
  options?: EconomyFocusScoringOptions,
): CategoryScore {
  const duo = scoreEconomyAndFocus(line, options);
  if (!sections.length) return duo;
  const densities: number[] = [];
  for (const sec of sections) {
    const span = Math.max(1, sec.barEnd - sec.barStart + 1);
    const notesIn = line.filter(
      (n) => !n.rest && n.midi > 0 && n.bar >= sec.barStart && n.bar <= sec.barEnd
    );
    densities.push(notesIn.length / (span * 4));
  }
  if (densities.length < 2) return duo;
  const spread = Math.max(...densities) - Math.min(...densities);
  const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
  const varD = densities.reduce((s, v) => s + (v - mean) ** 2, 0) / densities.length;
  const secScore = Math.min(
    10,
    Math.max(4, Math.round((4 + spread * 22 + Math.sqrt(varD) * 28) * 10) / 10)
  );
  const blended = Math.round((0.35 * duo.score + 0.65 * secScore) * 10) / 10;
  return {
    score: Math.min(10, blended),
    justification: `BB economy duo=${duo.score.toFixed(1)} secSpread=${spread.toFixed(3)} → ${blended.toFixed(1)}`,
  };
}

export function scoreEconomyAndFocusForEnsemble(
  line: MelodicNote[],
  sections: GceStructureSection[],
  score: ScoreModel,
  options?: EconomyFocusScoringOptions,
): CategoryScore {
  if (isBigBandScoreModel(score)) return scoreEconomyAndFocusBigBand(line, sections, options);
  return scoreEconomyAndFocus(line, options);
}

function sectionIndexForBar(bar: number, sections: GceStructureSection[]): number {
  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s]!;
    if (bar >= sec.barStart && bar <= sec.barEnd) return s;
  }
  return -1;
}

/** Same 4-note interval windows as scoreMelodicIdentity (for thematic recall). */
function melodicIntervalWindows(pitches: number[]): number[][] {
  const windowSize = 4;
  const windows: number[][] = [];
  for (let i = 0; i <= pitches.length - windowSize; i++) {
    const win = pitches.slice(i, i + windowSize);
    windows.push(win.slice(1).map((p, j) => (((p - win[j]!) % 12) + 12) % 12));
  }
  return windows;
}

/** GCE v2.0 — Thematic Recall Potential */
export function scoreThematicRecallPotential(
  line: MelodicNote[],
  sections: GceStructureSection[]
): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length < 4 || !sections.length) {
    return { score: 0, justification: 'Too few notes or no sections' };
  }
  const pitches = notes.map((n) => n.midi);
  const windows = melodicIntervalWindows(pitches);
  const motifSectionSets = new Map<string, Set<number>>();

  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 2; j < windows.length; j++) {
      const match = windows[i]!.every((iv, k) => Math.abs(iv - windows[j]![k]!) <= 2);
      if (!match) continue;
      const key = windows[i]!.join(',');
      if (!motifSectionSets.has(key)) motifSectionSets.set(key, new Set());
      const si = sectionIndexForBar(notes[i]!.bar, sections);
      const sj = sectionIndexForBar(notes[j]!.bar, sections);
      if (si >= 0) motifSectionSets.get(key)!.add(si);
      if (sj >= 0) motifSectionSets.get(key)!.add(sj);
    }
  }

  let crossSectionMotifs = 0;
  let spread3Plus = 0;
  for (const set of motifSectionSets.values()) {
    if (set.size >= 2) crossSectionMotifs++;
    if (set.size >= 3) spread3Plus++;
  }

  /** One motif across 2+ sections scores faster than old /3 curve; 3+ sections adds a small bonus. */
  const rawScore = 10 * Math.min((crossSectionMotifs + 0.5 * spread3Plus) / 2, 1);
  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score,
    justification: `${crossSectionMotifs} motif type(s) across 2+ sections`,
  };
}

/** Ligeti micropolyphony — stepwise motion, cluster density, entry stagger (ligeti vrbId only). */
export function scoreMicropolyphonyCoherence(
  notes: MelodicNote[],
  spine: PitchFieldSpine,
  textureDensity: number,
  voiceId = 'melody',
): CategoryScore {
  const pitched = notes.filter((n) => !n.rest && n.midi > 0);
  if (pitched.length < 2) {
    return { score: 0, justification: 'Insufficient pitched notes for micropolyphony' };
  }
  let stepwise = 0;
  let leapsOver3 = 0;
  let clusterHits = 0;
  const offsets: number[] = [];
  for (let i = 0; i < pitched.length; i++) {
    const n = pitched[i]!;
    const field = resolveFieldForBar(spine, n.bar, voiceId);
    const pc = ((n.midi % 12) + 12) % 12;
    const entry = field.allowedPcs.find((a) => a.pc === pc);
    clusterHits += entry?.weight ?? 0;
    offsets.push(n.beat);
    if (i === 0) continue;
    const prev = pitched[i - 1]!;
    const leap = Math.abs(n.midi - prev.midi);
    if (leap <= 2) stepwise++;
    if (leap > 3) leapsOver3++;
  }
  const stepRate = stepwise / Math.max(1, pitched.length - 1);
  const clusterRate = clusterHits / pitched.length;
  let staggerRegularity = 0.5;
  if (offsets.length >= 3) {
    const deltas: number[] = [];
    for (let i = 1; i < offsets.length; i++) {
      deltas.push(Math.abs(offsets[i]! - offsets[i - 1]!));
    }
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const var_ =
      deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / Math.max(1, deltas.length);
    staggerRegularity = mean > 0 ? Math.max(0, 1 - Math.sqrt(var_) / mean) : 0.5;
  }
  const leapPenalty = leapsOver3 / Math.max(1, pitched.length);
  const td = Math.max(0, Math.min(1, textureDensity));
  const raw =
    stepRate * 0.45 +
    clusterRate * 0.35 * (0.5 + td * 0.5) +
    staggerRegularity * 0.2 -
    leapPenalty * 0.5;
  const score = Math.max(0, Math.min(10, Math.round(raw * 10 * 10) / 10));
  return {
    score,
    justification: `step ${stepRate.toFixed(2)} cluster ${clusterRate.toFixed(2)} stagger ${staggerRegularity.toFixed(2)} leaps>3 ${leapsOver3}`,
  };
}

/** Pitch-field spine — weighted pitch-class adherence per bar (harmolodic / Ornette path). */
export function scorePitchFieldCoherence(
  notes: MelodicNote[],
  spine: PitchFieldSpine,
  voiceId = 'melody',
): CategoryScore {
  const pitched = notes.filter((n) => !n.rest && n.midi > 0);
  if (pitched.length === 0) {
    return { score: 0, justification: 'No pitched notes' };
  }
  let weightedHits = 0;
  let totalWeight = 0;
  for (const n of pitched) {
    const field = resolveFieldForBar(spine, n.bar, voiceId);
    const pc = ((n.midi % 12) + 12) % 12;
    const entry = field.allowedPcs.find((a) => a.pc === pc);
    const w = entry?.weight ?? 0;
    weightedHits += w;
    totalWeight += 1;
    const maxW = field.allowedPcs.reduce((m, a) => Math.max(m, a.weight), 0.01);
    totalWeight += maxW * 0.001;
  }
  const ratio = totalWeight > 0 ? weightedHits / pitched.length : 0;
  const score = Math.max(0, Math.min(10, Math.round(ratio * 10 * 10) / 10));
  return {
    score,
    justification: `pitch-field pc match ratio ${ratio.toFixed(2)} (${pitched.length} notes)`,
  };
}
