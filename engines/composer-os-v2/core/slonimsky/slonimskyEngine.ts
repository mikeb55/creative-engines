import type { PhraseIntent } from '../goldenPath/phraseIntentTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { SLONIMSKY_ENGINE_PATTERNS } from './thesaurusRegistry';

export type IntervalPatternId = string;

export interface IntervalPattern {
  id: IntervalPatternId;
  name: string;
  intervals: number[];
  symmetryType: 'equalDivision' | 'asymmetric';
  baseDivision?: number;
  defaultLength: number;
  tensionLevel: 1 | 2 | 3;
  styleAffinity: Array<'coltrane' | 'shorter' | 'brecker' | 'ecm'>;
}

export interface SlonimskyContext {
  keyPc: number;
  chordType: string;
  functionalStrength: 'strong' | 'medium' | 'weak';
  allowedOutsideLevel: 0 | 1 | 2;
  phraseIntent: 'build' | 'release' | 'float' | 'shock';
  basePitch: number;
  maxBeats: number;
  /** When set, patterns whose {@link IntervalPattern.styleAffinity} matches rank earlier (soft sort). */
  styleProfile?: string;
  /** Bar chord symbol — snaps first generated pitch to nearest chord tone when set. */
  chordSymbol?: string;
  effectiveLow?: number;
  effectiveHigh?: number;
  /** When true, `applySlonimskyToMelodyLine` skips chromatic passing insertion (post-pass hook default). */
  skipInterpolation?: boolean;
  /**
   * Semitones added to the melody cursor at each completed interval cycle (see {@link generateSlonimskyPattern}).
   * Default: derived from {@link phraseIntent} when omitted (`build` +2, `shock` +1, `release` −2, `float` 0).
   */
  transpositionInterval?: number;
  /** Steps per transposition cycle; default = `pattern.intervals.length`. */
  cycleLength?: number;
  /** Max infrapolation extensions in {@link generateSlonimskyPattern}; default **2** (multi-step cap). */
  maxInfraSteps?: number;
  /** Max ultrapolation extensions in {@link generateSlonimskyPattern}; default **2** (multi-step cap). */
  maxUltraSteps?: number;
}

export interface SlonimskyNote {
  midi: number;
  durationBeats: number;
  beat: number;
  role: 'target' | 'passing' | 'pickup';
}

const GUITAR_MIDI_MIN = 48;
const GUITAR_MIDI_MAX = 84;

/** Canonical catalogue — patterns defined in `thesaurusRegistry.ts` as {@link SLONIMSKY_ENGINE_PATTERNS}. */
export const SLONIMSKY_PATTERNS: readonly IntervalPattern[] = SLONIMSKY_ENGINE_PATTERNS;

/** Intent mixture for songwriter/style Slonimsky weighting (catalogue + phrase routing). */
export type SlonimskyStyleIntentWeights = {
  build: number;
  float: number;
  release: number;
  shock: number;
};

/**
 * Per–songwriter / style defaults for Slonimsky catalogue bias, outside allowance, and transposition cycle.
 * `preferredSections` names align with research shorthand (may alias {@link ThesaurusSectionKey} at lookup time).
 */
export type SlonimskyStyleProfileSpec = {
  outsideLevel: number;
  preferredSections: readonly string[];
  defaultProfile: string;
  transpositionInterval: number;
  intentWeights: SlonimskyStyleIntentWeights;
  notes: string;
  /** Preferred Slonimsky catalogue band — keys align with {@link import('./thesaurusRegistry').ThesaurusSectionKey}. */
  catalogueSection?: string;
  maxInfraSteps?: number;
  maxUltraSteps?: number;
};

/**
 * Songwriter & house-style Slonimsky profiles (tonality vault + duo / ensemble hooks).
 */
export const SLONIMSKY_STYLE_PROFILE_MAP: Record<string, SlonimskyStyleProfileSpec> = {
  BACHARACH: {
    outsideLevel: 1,
    preferredSections: ['tritone_substitutions', 'semitone_scales'],
    defaultProfile: 'ECM',
    transpositionInterval: 1,
    intentWeights: { build: 0.2, float: 0.5, release: 0.3, shock: 0.0 },
    notes: 'chromatic neighbour tones, stepwise, never jarring',
    catalogueSection: 'tritone_progression',
    maxInfraSteps: 1,
    maxUltraSteps: 2,
  },
  JOBIM: {
    outsideLevel: 1,
    preferredSections: ['pentatonic_scales', 'whole_tone_scales'],
    defaultProfile: 'Metheny',
    transpositionInterval: 0,
    intentWeights: { build: 0.2, float: 0.6, release: 0.2, shock: 0.0 },
    notes: 'bossa float, whole-tone colour, no shock',
    catalogueSection: 'whole_tone_progression',
    maxInfraSteps: 1,
    maxUltraSteps: 1,
  },
  HERBIE_HANCOCK: {
    outsideLevel: 2,
    preferredSections: ['heptatonic_scales', 'tritone_substitutions'],
    defaultProfile: 'ECM',
    transpositionInterval: 2,
    intentWeights: { build: 0.4, float: 0.3, release: 0.1, shock: 0.2 },
    notes: 'modal + pentatonic clusters, occasional shock',
    catalogueSection: 'ditone_progression',
    maxInfraSteps: 2,
    maxUltraSteps: 2,
  },
  BRIAN_WILSON: {
    outsideLevel: 1,
    preferredSections: ['semitone_scales', 'pentatonic_scales'],
    defaultProfile: 'Indie',
    transpositionInterval: 0,
    intentWeights: { build: 0.3, float: 0.5, release: 0.2, shock: 0.0 },
    notes: 'diatonic colour, voice-leading stepwise, no outside',
    catalogueSection: 'semitone_progression',
    maxInfraSteps: 0,
    maxUltraSteps: 1,
  },
  RADIOHEAD: {
    outsideLevel: 2,
    preferredSections: ['heptatonic_scales', 'intervallic'],
    defaultProfile: 'Sonic Youth',
    transpositionInterval: 1,
    intentWeights: { build: 0.3, float: 0.2, release: 0.1, shock: 0.4 },
    notes: 'high dissonance, irregular intervals, shock-weighted',
    catalogueSection: 'sesquitone_progression',
    maxInfraSteps: 1,
    maxUltraSteps: 2,
  },
  KATE_BUSH: {
    outsideLevel: 2,
    preferredSections: ['heptatonic_scales', 'semitone_scales'],
    defaultProfile: 'ECM',
    transpositionInterval: 1,
    intentWeights: { build: 0.3, float: 0.4, release: 0.2, shock: 0.1 },
    notes: 'dramatic contour, chromatic colour, occasional shock',
    catalogueSection: 'whole_tone_progression',
    maxInfraSteps: 2,
    maxUltraSteps: 1,
  },
  DONALD_FAGEN: {
    outsideLevel: 2,
    preferredSections: ['tritone_substitutions', 'heptatonic_scales'],
    defaultProfile: 'Metheny',
    transpositionInterval: 2,
    intentWeights: { build: 0.4, float: 0.3, release: 0.2, shock: 0.1 },
    notes: 'jazz chromatic, tritone approach, controlled outside',
    catalogueSection: 'intervallic_mirror_permutations',
    maxInfraSteps: 1,
    maxUltraSteps: 2,
  },
};

function seededUnit(seed: number): number {
  let s = seed >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clampMidi(midi: number): number {
  return Math.max(GUITAR_MIDI_MIN, Math.min(GUITAR_MIDI_MAX, midi));
}

/** Whole-tone / semitone cycle shift when {@link SlonimskyContext.transpositionInterval} is unset. */
function transpositionIntervalFromPhraseIntent(ctx: SlonimskyContext): number {
  if (ctx.transpositionInterval !== undefined) return ctx.transpositionInterval;
  switch (ctx.phraseIntent) {
    case 'build':
      return 2;
    case 'shock':
      return 1;
    case 'release':
      return -2;
    case 'float':
    default:
      return 0;
  }
}

function liftIntoRange(pitch: number, low: number, high: number): number {
  let p = pitch;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return Math.max(low, Math.min(high, p));
}

/** Snap start pitch to nearest chord tone in range when `chordSymbol` is set; else raw `basePitch`. */
export function snapFirstNoteMidi(ctx: SlonimskyContext): number {
  const low = ctx.effectiveLow ?? GUITAR_MIDI_MIN;
  const high = ctx.effectiveHigh ?? GUITAR_MIDI_MAX;
  const raw = clampMidi(ctx.basePitch);
  const sym = ctx.chordSymbol?.trim();
  if (sym) {
    const t = chordTonesForChordSymbol(sym);
    const candidates = [t.root, t.third, t.fifth, t.seventh].map((x) => liftIntoRange(x, low, high));
    let best = raw;
    let bestD = 999;
    for (const c of candidates) {
      const d = Math.abs(c - raw);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return clampMidi(best);
  }
  return raw;
}

/** Heuristic chord category for Slonimsky selection bias (`chordType` substring checks). */
export function inferSlonimskyChordTypeCategory(symbol: string): string {
  const s = symbol.trim().toLowerCase();
  if (!s) return 'other';
  if (s.includes('alt') || s.includes('7alt')) return 'dominant_alt';
  if (s.includes('maj') || s.includes('ma7') || s.includes('Δ') || s.includes('major')) return 'major';
  if (s.includes('min') || s.includes('m7') || s.includes('m9') || /\bo7\b|ø/.test(s)) return 'minor';
  if (s.includes('7') || s.includes('9') || s.includes('11') || s.includes('13')) return 'dominant';
  return 'other';
}

function styleAffinityTagFromProfile(styleProfile: string | undefined): 'coltrane' | 'shorter' | 'brecker' | 'ecm' | null {
  if (!styleProfile) return null;
  const s = styleProfile.toLowerCase();
  if (s.includes('coltrane')) return 'coltrane';
  if (s.includes('shorter')) return 'shorter';
  if (s.includes('brecker')) return 'brecker';
  if (s.includes('ecm') || s.includes('metheny')) return 'ecm';
  return null;
}

/** Lower rank = earlier after sort (preferred). */
function chordTypeBiasRank(p: IntervalPattern, chordTypeRaw: string): number {
  const c = chordTypeRaw.toLowerCase();
  const id = p.id;
  const maj = c === 'major' || c.includes('maj') || c.includes('Δ');
  const isMin = c === 'minor';
  const domFam = c === 'dominant' || c === 'dominant_alt' || c.includes('dominant') || c.includes('alt');

  if (maj && !isMin) {
    if (id === 'p_wholeTone') return 0;
    if (id === 'p_asymCell123') return 1;
    if (id === 'p_contracting') return 2;
    if (id === 'p_chromaticInterp') return 3;
    if (id === 'p_expanding') return 4;
    if (id === 'p_tritonePole') return 5;
    if (id === 'p_minorThirdCycle') return 6;
    if (id === 'p_majorThirdCycle') return 7;
  }
  if (domFam || c.includes('7')) {
    if (id === 'p_tritonePole') return 0;
    if (id === 'p_minorThirdCycle') return 1;
    if (id === 'p_majorThirdCycle') return 2;
    if (id === 'p_expanding') return 3;
    if (id === 'p_chromaticInterp') return 4;
    if (id === 'p_wholeTone') return 5;
    if (id === 'p_asymCell123') return 6;
    if (id === 'p_contracting') return 7;
  }
  if (isMin) {
    if (id === 'p_wholeTone') return 0;
    if (id === 'p_contracting') return 1;
    if (id === 'p_asymCell123') return 2;
    if (id === 'p_chromaticInterp') return 3;
    if (id === 'p_expanding') return 4;
    if (id === 'p_tritonePole') return 5;
    if (id === 'p_minorThirdCycle') return 6;
    if (id === 'p_majorThirdCycle') return 7;
  }
  return 50;
}

export function generateSlonimskyPattern(
  pattern: IntervalPattern,
  ctx: SlonimskyContext,
  seed: number
): SlonimskyNote[] {
  const transpositionInterval = transpositionIntervalFromPhraseIntent(ctx);
  const cycleLength = Math.max(1, ctx.cycleLength ?? pattern.intervals.length);

  const startMidi =
    ctx.chordSymbol?.trim() && (ctx.effectiveLow !== undefined || ctx.styleProfile)
      ? snapFirstNoteMidi(ctx)
      : clampMidi(ctx.basePitch);
  const notes: number[] = [startMidi];
  let cursor = startMidi;
  let rng = seed >>> 0;
  for (let i = 0; i < Math.max(1, pattern.defaultLength - 1); i++) {
    // Transposition cycle: each full interval cycle shifts the pattern root by `transpositionInterval` semitones.
    if (i > 0 && i % cycleLength === 0) {
      cursor = clampMidi(cursor + transpositionInterval);
    }
    const baseInterval = pattern.intervals[i % pattern.intervals.length] ?? 0;
    rng += 17;
    const jitterRoll = seededUnit(rng);
    let interval = baseInterval;
    if (jitterRoll < 0.1) {
      const jitterDirection = seededUnit(rng + 73) < 0.5 ? -1 : 1;
      interval += jitterDirection;
    }
    rng += 31;
    if (seededUnit(rng) < 0.05) {
      continue;
    }
    cursor = clampMidi(cursor + interval);
    notes.push(cursor);
  }

  if (notes.length === 1) {
    notes.push(clampMidi(notes[0]! + (pattern.intervals[0] ?? 1)));
  }

  const lowBound = ctx.effectiveLow ?? GUITAR_MIDI_MIN;
  const highBound = ctx.effectiveHigh ?? GUITAR_MIDI_MAX;
  const firstIv = pattern.intervals[0] ?? 0;

  let infraSteps = 0;
  const maxInfraSteps = ctx.maxInfraSteps ?? 2;
  while (notes[0]! > lowBound + 4 && infraSteps < maxInfraSteps) {
    notes.unshift(clampMidi(notes[0]! - firstIv));
    infraSteps++;
  }

  let ultraSteps = 0;
  const maxUltraSteps = ctx.maxUltraSteps ?? 2;
  while (notes[notes.length - 1]! < highBound - 4 && ultraSteps < maxUltraSteps) {
    notes.push(clampMidi(notes[notes.length - 1]! + firstIv));
    ultraSteps++;
  }

  const slotDur = ctx.maxBeats / notes.length;
  let beatCursor = 0;
  return notes.map((midi, idx) => ({
    midi,
    durationBeats: slotDur,
    beat: beatCursor + idx * slotDur,
    role: idx === 0 || idx === notes.length - 1 ? 'target' : 'passing',
  }));
}

export function selectSlonimskyPattern(ctx: SlonimskyContext, seed: number): IntervalPattern | null {
  if (ctx.allowedOutsideLevel === 0) return null;
  const maxTension = (ctx.allowedOutsideLevel + 1) as 1 | 2 | 3;
  let filtered = SLONIMSKY_ENGINE_PATTERNS.filter((p) => p.tensionLevel <= maxTension);
  if (ctx.functionalStrength === 'strong') {
    filtered = filtered.filter((p) => p.tensionLevel <= 1);
  }
  switch (ctx.phraseIntent) {
    case 'shock':
      filtered = filtered.filter(
        (p) => p.id === 'p_minorThirdCycle' || p.id === 'p_majorThirdCycle' || p.id === 'p_tritonePole'
      );
      break;
    case 'build':
      filtered = filtered.filter((p) => p.id === 'p_expanding' || p.id === 'p_chromaticInterp');
      break;
    case 'float':
      filtered = filtered.filter((p) => p.id === 'p_wholeTone' || p.id === 'p_asymCell123');
      break;
    case 'release':
      filtered = filtered.filter((p) => p.id === 'p_contracting');
      break;
    default:
      break;
  }
  if (filtered.length === 0) return null;
  /** Song-mode hook post-pass uses bare `dominant` + no profile — keep legacy filtered-array order. */
  const skipSoftRank =
    !ctx.styleProfile && ctx.chordType === 'dominant' && !ctx.chordSymbol && !ctx.effectiveLow;
  const affinityTag = styleAffinityTagFromProfile(ctx.styleProfile);
  let ranked = [...filtered];
  if (!skipSoftRank) {
    ranked.sort((a, b) => {
      const ma =
        affinityTag && (a.styleAffinity as readonly string[]).includes(affinityTag) ? 0 : 1;
      const mb =
        affinityTag && (b.styleAffinity as readonly string[]).includes(affinityTag) ? 0 : 1;
      if (ma !== mb) return ma - mb;
      const ca = chordTypeBiasRank(a, ctx.chordType);
      const cb = chordTypeBiasRank(b, ctx.chordType);
      if (ca !== cb) return ca - cb;
      return a.id.localeCompare(b.id);
    });
  }
  return ranked[Math.abs(seed) % ranked.length] ?? null;
}

/**
 * Optional chromatic passing tones between adjacent pattern pitches (deterministic).
 */
export function interpolateSlonimskyPattern(
  notes: SlonimskyNote[],
  ctx: SlonimskyContext,
  _chord: string,
  seed: number
): SlonimskyNote[] {
  if (ctx.allowedOutsideLevel < 1 || notes.length < 2) {
    return notes.map((n) => ({ ...n }));
  }
  const sorted = [...notes].sort((a, b) => a.beat - b.beat);
  const out: SlonimskyNote[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    out.push({ ...cur });
    if (i >= sorted.length - 1) break;
    const next = sorted[i + 1]!;
    const iv = Math.abs(next.midi - cur.midi);
    if (iv < 3) continue;
    const roll = seededUnit(seed + i);
    if (roll < 0.6) continue;
    const lowerMidi = Math.min(cur.midi, next.midi);
    const ascending = next.midi >= cur.midi;
    const passingMidi = ascending ? lowerMidi + 1 : lowerMidi - 1;
    const midBeat = (cur.beat + next.beat) / 2;
    out.push({
      midi: clampMidi(passingMidi),
      durationBeats: 0.5,
      beat: midBeat,
      role: 'passing',
    });
  }
  return out.sort((a, b) => a.beat - b.beat);
}

/**
 * Maps duo golden-path {@link PhraseIntent} + 1–8 bar phase within the 8-bar cycle
 * to Slonimsky semantic `phraseIntent` (V1 research spec wiring).
 * Phase 7 + `guitar_lead` → `shock` (identity / peak bar).
 */
export function mapDuoPhraseIntentToSlonimskyPhraseIntent(
  duoIntent: PhraseIntent,
  phase: number,
  _seed: number
): 'build' | 'release' | 'float' | 'shock' {
  if (duoIntent === 'cadence' || duoIntent === 'return') return 'release';
  if (duoIntent === 'development') return 'build';
  if (duoIntent === 'contrast') return 'shock';
  if (duoIntent === 'answer_bass') return 'shock';
  if (duoIntent === 'bass_lead' || duoIntent === 'answer_guitar') return 'float';
  if (duoIntent === 'guitar_lead' && phase === 7) return 'shock';
  if (duoIntent === 'guitar_lead') return 'build';
  return 'float';
}

function resolveAllowedOutsideLevelForSlonimsky(songwriterId: string | undefined): 0 | 1 | 2 {
  if (songwriterId === 'wayne_shorter' || songwriterId === 'barry_harris') return 2;
  if (songwriterId === 'ecm_chamber' || songwriterId === 'pat_metheny') return 1;
  return 1;
}

/**
 * Builds {@link SlonimskyContext} for post-pass `applySlonimskyToMelodyLine` using duo phrase arc + songwriter allowance.
 */
export function mapDuoPhraseIntentToSlonimskyContext(params: {
  duoIntent: PhraseIntent;
  phase: number;
  seed: number;
  songwriterId?: string;
  totalQuarterBeats: number;
  styleProfile?: string;
  keyPc?: number;
  chordType?: string;
  chordSymbol?: string;
  effectiveLow?: number;
  effectiveHigh?: number;
}): SlonimskyContext {
  const phraseIntent = mapDuoPhraseIntentToSlonimskyPhraseIntent(
    params.duoIntent,
    params.phase,
    params.seed
  );
  const chordType = params.chordType ?? 'dominant';
  return {
    keyPc: params.keyPc ?? 0,
    chordType,
    functionalStrength: 'medium',
    allowedOutsideLevel: resolveAllowedOutsideLevelForSlonimsky(params.songwriterId),
    phraseIntent,
    basePitch: 62,
    maxBeats: Math.max(4, params.totalQuarterBeats),
    styleProfile: params.styleProfile,
    chordSymbol: params.chordSymbol,
    effectiveLow: params.effectiveLow,
    effectiveHigh: params.effectiveHigh,
  };
}

/** Per-bar duo guitar Slonimsky context (alternate-tuning pilot — inline emission). */
export function buildDuoBarSlonimskyContext(params: {
  duoIntent: PhraseIntent;
  phase: number;
  seed: number;
  songwriterId?: string;
  totalQuarterBeats: number;
  styleProfile?: string | null;
  chordSymbol: string;
  keyPc: number;
  effectiveLow: number;
  effectiveHigh: number;
}): SlonimskyContext {
  const inferred = inferSlonimskyChordTypeCategory(params.chordSymbol);
  const base = mapDuoPhraseIntentToSlonimskyContext({
    duoIntent: params.duoIntent,
    phase: params.phase,
    seed: params.seed,
    songwriterId: params.songwriterId,
    totalQuarterBeats: params.totalQuarterBeats,
    styleProfile: params.styleProfile ?? undefined,
    keyPc: params.keyPc,
    chordType: inferred,
    chordSymbol: params.chordSymbol,
    effectiveLow: params.effectiveLow,
    effectiveHigh: params.effectiveHigh,
  });
  const t = chordTonesForChordSymbol(params.chordSymbol);
  const third = liftIntoRange(t.third, params.effectiveLow, params.effectiveHigh);
  return {
    ...base,
    basePitch: third,
    maxBeats: 4,
  };
}

function barIsEligible(chord: string | undefined, ctx: SlonimskyContext): boolean {
  if (ctx.functionalStrength === 'weak' || ctx.functionalStrength === 'medium') return true;
  if (!chord) return false;
  const c = chord.toLowerCase();
  return c.includes('7') || c.includes('alt') || c.includes('b9');
}

export function applySlonimskyToMelodyLine(
  melody: SlonimskyNote[],
  chords: string[],
  ctx: SlonimskyContext,
  seed: number
): SlonimskyNote[] {
  if (melody.length < 3) return melody;
  const pattern = selectSlonimskyPattern(ctx, seed);
  if (!pattern) return melody;

  const out = melody.map((n) => ({ ...n }));
  const phraseBars = Math.max(1, Math.floor(ctx.maxBeats / 4));
  const phraseCount = Math.ceil(phraseBars / 4);

  for (let phrase = 0; phrase < phraseCount; phrase++) {
    const barStart = phrase * 4;
    const barEnd = Math.min(barStart + 4, phraseBars);
    let targetBar = -1;
    for (let b = barStart; b < barEnd; b++) {
      if (barIsEligible(chords[b], ctx)) {
        targetBar = b;
        break;
      }
    }
    if (targetBar < 0) continue;

    const beatStart = targetBar * 4;
    const beatSpan = 1 + (Math.abs(seed + phrase) % 2);
    const beatEnd = beatStart + beatSpan;
    const chordSym = chords[targetBar] ?? '';
    const spanCtx: SlonimskyContext = {
      ...ctx,
      maxBeats: beatSpan,
      basePitch: ctx.basePitch,
      chordSymbol: chordSym || ctx.chordSymbol,
    };
    let built = generateSlonimskyPattern(pattern, spanCtx, seed + phrase * 101);
    if (!ctx.skipInterpolation) {
      built = interpolateSlonimskyPattern(built, spanCtx, chordSym, seed + phrase * 101);
    }
    const replacement = built.map((n) => ({
      ...n,
      beat: beatStart + n.beat,
      role: n.role === 'passing' ? 'pickup' : n.role,
    }));

    for (let i = 1; i < out.length - 1; i++) {
      const note = out[i]!;
      if (note.beat >= beatStart && note.beat < beatEnd) {
        note.durationBeats = 0;
      }
    }

    for (const rep of replacement) {
      out.push(rep);
    }
  }

  const preservedStart = out[0]!;
  const preservedEnd = out[out.length - 1]!;
  const compacted = out
    .filter((n) => n.durationBeats > 0)
    .sort((a, b) => a.beat - b.beat)
    .map((n) => ({ ...n }));
  if (compacted.length > 0) {
    compacted[0] = { ...preservedStart };
    compacted[compacted.length - 1] = { ...preservedEnd };
  }
  return compacted;
}
