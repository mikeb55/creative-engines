/**
 * Build MusicXML-ready ScoreModel from string quartet planning (Prompt C/3).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { QuartetFormPhase, QuartetFormPlan, QuartetTexturePlan } from './quartetPlanTypes';
import {
  QUARTET_INSTRUMENTS,
  SQ_PART_PIANO,
  SQ_PART_V1,
  SQ_PART_V2,
  SQ_PART_VA,
  SQ_PART_VC,
  partIdForQuartetInstrument,
} from './stringQuartetTypes';
import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { QUARTET_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { createNote, createPart, createRest, createScore, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { ScoredNote, SectionTag } from '../ensemble-scoring/ensembleLayoutHeuristics';
import { WholeNoteDensityTracker } from '../ensemble-scoring/ensembleLayoutHeuristics';
import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { applyQuartetWybleChordToneStack } from './quartetWybleChordToneStack';
import { wybleConsumptionReceiptForQuartet } from '../wyble/wybleConsumptionReceipt';
import {
  applySlonimskyToMelodyLine,
  buildQuartetSlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyPatternService';
import type { SlonimskyContext } from '../slonimsky/slonimskyEngine';
import { pushEnsembleSlonimskyCellReceipt } from '../slonimsky/slonimskyEnsembleReceipt';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { resolveMeterForBar } from '../rhythm/oddMeterQuantiser';
import type { SoloLine } from '../solo/soloTypes';
import { generateZappaSolo } from '../solo/zappasoloEngine';
import { stringQuartetPreset } from '../../presets/stringQuartetPreset';
import { isSongwriterFrankZappaStringQuartet } from './zappaStringQuartetSlice';
import { runQuartetParallelMotionPass } from './quartetVoiceLeadingGuard';
import {
  getEffectiveContextForBar,
  getEffectiveRegisterWindowForBar,
  getSectionArchitectureDensityHint,
} from '../section-architecture/effectiveContextForBar';

const CHORD_CYCLE = ['Dmin9', 'G13', 'Cmaj9', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];

const QUARTET_PART_IDS = [SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

/** Human-readable rehearsal mark text in exported scores (internal `phase` ids unchanged). */
const QUARTET_REHEARSAL_MARK_DISPLAY: Record<QuartetFormPhase, string> = {
  statement: 'Statement',
  development: 'Development',
  contrast: 'Contrast',
  return: 'Return',
  coda: 'Coda',
};

/**
 * Per-era lead-sheet vocabulary tokens (research-aligned). Progressions below
 * are hand-ordered loops that use these harmonic types (mirrors Big Band score builder behaviour).
 */
export const ERA_CHORD_POOLS: Record<BigBandEraId, readonly string[]> = {
  swing: ['maj6', '6/9', 'm7', 'm6', 'dim7', '7', '9', '7b9', 'maj7', '7sus4'],
  bebop: ['maj7', '6/9', 'm7', 'm7b5', '7b9', '7#9', '7#11', '7b13', 'dim7'],
  post_bop: ['maj7#11', 'm7', 'm7b5', 'mMaj7', '7alt', '7sus', 'quartal'],
  contemporary: ['maj7', 'maj7#11', 'm9', 'm11', '7sus', 'add9', '6/9', 'mMaj7'],
  cool_jazz: ['maj7', '6/9', 'm7', 'm6', 'mMaj7', '9', '13', 'm7b5', 'add9', 'maj7#11'],
  hard_bop: ['maj7', '6/9', 'm7', 'm7b5', 'm6', '7', '9', '13', '7b9', '7#9', '7#11', '7b13', 'dim7', 'sus4'],
  fusion: ['maj7', 'maj7#11', '6/9', 'm7', 'm9', 'm11', 'm7b5', '7sus', '7alt', 'add9'],
};

const ERA_PROGRESSION_CYCLES: Record<BigBandEraId, readonly string[]> = {
  swing: [
    'Dm7',
    'G7',
    'Cmaj6',
    'C6/9',
    'Am7',
    'D7b9',
    'G9',
    'G7sus4',
    'Cmaj7',
    'Fm6',
    'Bbdim7',
    'Eb9',
    'Am6',
    'Bb7',
    'Ebmaj6',
    'A7',
  ],
  bebop: [
    'Cm7',
    'F7b9',
    'Bbmaj7',
    'Bb6/9',
    'Em7b5',
    'A7b9',
    'Dm7',
    'G7#9',
    'Cmaj7',
    'Ab7#11',
    'Dm7b5',
    'G7b13',
    'Bdim7',
    'E7#9',
    'Am7',
    'D7b9',
  ],
  post_bop: [
    'Fmaj7#11',
    'Bm7b5',
    'E7alt',
    'Am7',
    'D7sus',
    'Gmaj7#11',
    'Gm7',
    'C7alt',
    'FmMaj7',
    'Bbm7b5',
    'Eb7alt',
    'Ab7sus',
    'Dbmaj7#11',
    'Dm7b5',
    'G7alt',
    'Cm7b5',
  ],
  contemporary: [
    'Cmaj7#11',
    'Dm9',
    'G7sus',
    'C6/9',
    'Am11',
    'D7sus',
    'Gmaj7add9',
    'Em9',
    'AmMaj7',
    'Bm7b5',
    'E7sus',
    'Amaj7#11',
    'Fmaj7',
    'Gm11',
    'C7sus',
    'Fm9',
  ],
  cool_jazz: [
    'Cmaj7',
    'Dm7',
    'G13',
    'C6/9',
    'Am7',
    'Fmaj7',
    'Bm7b5',
    'E9',
    'Am6',
    'Dm7',
    'G7',
    'Cadd9',
    'Fmaj7#11',
    'Bm7b5',
    'E7',
    'AmMaj7',
  ],
  hard_bop: [
    'Fm7',
    'Bb7b9',
    'Ebmaj7',
    'Eb6/9',
    'Am7b5',
    'D7b9',
    'Gm7',
    'C7#9',
    'Fm7',
    'Bb7sus4',
    'Eb9',
    'Ab7#11',
    'Ddim7',
    'G7#9',
    'Cm7',
    'F7b9',
  ],
  fusion: [
    'Cmaj7#11',
    'Dm9',
    'G7sus',
    'Am11',
    'Bm7b5',
    'E7alt',
    'Amaj7',
    'Dm9',
    'G7sus',
    'Cmaj7add9',
    'Fm11',
    'Bb7alt',
    'Ebmaj7',
    'Gm11',
    'C7sus',
    'Fm9',
  ],
};

function indexMod(n: number, len: number): number {
  return ((n % len) + len) % len;
}

function barChordFromCycle(bar: number, seed: number, cycle: readonly string[]): string {
  const L = cycle.length;
  return cycle[indexMod(bar - 1 + seed, L)]!;
}

function barChord(bar: number, seed: number, era?: BigBandEraId): string {
  if (era == null) {
    return CHORD_CYCLE[indexMod(bar + seed, CHORD_CYCLE.length)]!;
  }
  return barChordFromCycle(bar, seed, ERA_PROGRESSION_CYCLES[era]);
}

const USE_CHORD_QUALITY_VOICING_SQ = true;

/** Minor / diminished surface matcher (exclude maj-bearing symbols via `maj` guard when classifying). */
const SQ_MINOR_DIM_CHORD_RE = /m|min|dim|ø|°/;

/** Order: v1, v2, va, vc (same as QUARTET_INSTRUMENTS). */
function pitchesQuartetString(rootPc: number, sym: string): [number, number, number, number] {
  const r = rootPc;
  let vaThirdOff = 3;
  if (USE_CHORD_QUALITY_VOICING_SQ) {
    const hasMajQuality = /maj|Δ|ma7/i.test(sym);
    const minorOrDim = SQ_MINOR_DIM_CHORD_RE.test(sym) && !hasMajQuality;
    const majOrDom =
      hasMajQuality ||
      (!minorOrDim &&
        /(?:[a-g][#b]?(?:7|9|11|13)\b|7alt|7sus|7b9|7#9|7#11|7b13)/i.test(sym.trim()));
    vaThirdOff = majOrDom && !minorOrDim ? 4 : 3;
  }
  const vc = snapMidiToRange(48 + r, ...QUARTET_MIDI_BOUNDS[SQ_PART_VC]);
  const va = snapMidiToRange(60 + r + vaThirdOff, ...QUARTET_MIDI_BOUNDS[SQ_PART_VA]);
  const v2 = snapMidiToRange(67 + r + 4, ...QUARTET_MIDI_BOUNDS[SQ_PART_V2]);
  const v1 = snapMidiToRange(72 + r + 7, ...QUARTET_MIDI_BOUNDS[SQ_PART_V1]);
  return [v1, v2, va, vc];
}

/** User register spread (via chromaticStrength → allowedOutsideOverride) widens or compresses vertical spacing. */
function applyRegisterSpreadToStack(
  stack: [number, number, number, number],
  outsideLevel: 0 | 1 | 2
): [number, number, number, number] {
  const spreadSemi = outsideLevel === 0 ? -5 : outsideLevel === 2 ? 7 : 0;
  if (spreadSemi === 0) return stack;
  const deltas: [number, number, number, number] =
    spreadSemi > 0
      ? [spreadSemi, Math.round(spreadSemi * 0.55), -Math.round(spreadSemi * 0.35), -spreadSemi]
      : [
          Math.round(spreadSemi * 0.5),
          Math.round(spreadSemi * 0.35),
          Math.round(-spreadSemi * 0.25),
          Math.round(-spreadSemi * 0.5),
        ];
  return stack.map((p, i) => {
    const partId = QUARTET_PART_IDS[i]!;
    return snapMidiToRange(p + deltas[i]!, ...QUARTET_MIDI_BOUNDS[partId]);
  }) as [number, number, number, number];
}

function wholeStreakThresholdForBlend(blendStrength?: 'light' | 'medium' | 'strong'): number {
  if (blendStrength === 'strong') return 2;
  if (blendStrength === 'light') return 4;
  return 3;
}

function sqSlonimskyPhraseIntentForProductDuo(
  productDuoIntent: 'conversational' | 'supportive' | undefined,
  bar: number,
  seed: number
): SlonimskyContext['phraseIntent'] | undefined {
  if (productDuoIntent === 'supportive') return 'release';
  if (productDuoIntent === 'conversational') {
    const pool: SlonimskyContext['phraseIntent'][] = ['shock', 'float', 'build'];
    return pool[Math.abs(seed + bar * 17) % pool.length]!;
  }
  return undefined;
}

const PART_META: Array<{
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
}> = [
  { name: 'Violin I', instrumentIdentity: 'violin_1', midiProgram: 40, clef: 'treble' },
  { name: 'Violin II', instrumentIdentity: 'violin_2', midiProgram: 40, clef: 'treble' },
  { name: 'Viola', instrumentIdentity: 'viola', midiProgram: 41, clef: 'treble' },
  { name: 'Violoncello', instrumentIdentity: 'cello', midiProgram: 42, clef: 'bass' },
];

export interface BuildQuartetScoreModelInput {
  title: string;
  seed: number;
  formPlan: QuartetFormPlan;
  texturePlan: QuartetTexturePlan;
  /** When set, selects default progression from `ERA_PROGRESSION_CYCLES`; omitted → legacy `CHORD_CYCLE`. */
  era?: BigBandEraId;
  /** When length matches `formPlan.totalBars`, overrides era pool / `CHORD_CYCLE` entirely. */
  chordBars?: string[];
  /** If true, skips whole-note density + rhythm-split heuristics (pad / demo sketch). */
  padSketch?: boolean;
  /**
   * When set to the string-quartet Wyble map, chord tones for violin II and viola
   * are cross-assigned from the default per-part stack (see `quartetWybleChordToneStack`).
   */
  wybleVoiceLayout?: EnsembleWybleRoleMap;
  /** When set (from Generate request), biases Slonimsky ensemble catalogue via `SLONIMSKY_STYLE_PROFILE_MAP`. */
  songwriterStyleId?: string;
  /** Z11 — mutable sink for Slonimsky cell selection receipts. */
  slonimskyEnsembleCellReceipts?: string[];
  /** User Chromatic Strength cap — `Math.min` with profile allowance in Slonimsky contexts. */
  allowedOutsideOverride?: 0 | 1 | 2;
  /** Slonimsky voice independence — more `strong` → earlier rhythmic splits across parts. */
  blendStrength?: 'light' | 'medium' | 'strong';
  /** Slonimsky voice independence — conversational vs supportive Slonimsky phrase intent. */
  duoIntent?: 'conversational' | 'supportive';
  /** Per-bar time signatures (1-based indices); omit for all 4/4 — matches MusicXML export `barMeterMap`. */
  barMeterMap?: BarMeterMap;
  /** When present with {@link isSongwriterFrankZappaStringQuartet}, selects Zappa solo + inner-voice / bass path. */
  generationMetadata?: GenerationMetadata;
  /** Full-form harmony after Zappa SQ precompute (d5 cuts, etc.) — authoritative for cello roots when supplied. */
  zappaSQEffectiveHarmonyBars?: string[];
  /** V65 P2 — per-bar Song section architecture context. */
  sectionArchitectureContext?: CompositionContext;
}

/** Quarter-note beat span for the measure (e.g. 3.5 for 7/8). Uses {@link resolveMeterForBar} — same defaults as exporter. */
function barQuarterSpan(bar1Based: number, map: BarMeterMap | undefined): number {
  const sig = resolveMeterForBar(bar1Based, map);
  return (sig.numerator * 4) / sig.denominator;
}

function addStringBar(m: MeasureModel, pitch: number, useHalfHalf: boolean, spanQuarters: number): void {
  if (useHalfHalf) {
    const h = spanQuarters / 2;
    addEvent(m, createNote(pitch, 0, h, 1));
    addEvent(m, createNote(pitch, h, h, 1));
  } else {
    addEvent(m, createNote(pitch, 0, spanQuarters, 1));
  }
}

/** Piano comp register (matches BB piano / treble comp band). */
function clampPianoMidiSq(midi: number): number {
  return snapMidiToRange(midi, 55, 84);
}

/** Minor / maj7 / dominant shell intervals from chord symbol (aligned with BB piano). */
function pianoShellHalfStepsFromSymbolSq(sym: string): { third: number; seventh: number } {
  const t = sym.trim();
  const low = t.toLowerCase();
  if (/^[a-g][#b]?m(?!aj)/i.test(t)) {
    return { third: 3, seventh: 10 };
  }
  if (low.includes('maj') || low.includes('Δ') || low.includes('ma7')) {
    return { third: 4, seventh: 11 };
  }
  return { third: 4, seventh: 10 };
}

function wrapBeatInBarSq(beat: number, spanQuarters: number): number {
  if (spanQuarters <= 0) return 0;
  let x = beat;
  while (x >= spanQuarters) x -= spanQuarters;
  while (x < 0) x += spanQuarters;
  return x;
}

function zappaStringQuartetScorePath(input: BuildQuartetScoreModelInput): boolean {
  const meta = input.generationMetadata;
  return Boolean(meta && isSongwriterFrankZappaStringQuartet(meta));
}

function buildZappaQuartetHarmonyBars(input: BuildQuartetScoreModelInput, chordForBar: (b: number) => string): string[] {
  const tb = input.formPlan.totalBars;
  const z = input.zappaSQEffectiveHarmonyBars;
  if (z && z.length === tb) return z.map((s) => String(s));
  return Array.from({ length: tb }, (_, i) => chordForBar(i + 1));
}

function clampNoteDurationInMeasure(startBeat: number, durationBeats: number, span: number): number {
  if (startBeat >= span - 1e-4) return 0.05;
  return Math.max(0.05, Math.min(durationBeats, span - startBeat));
}

function buildZappaQuartetCompositionContext(input: BuildQuartetScoreModelInput, harmonyBars: string[]): CompositionContext {
  const tb = input.formPlan.totalBars;
  const sections = input.formPlan.slices.map((s) => ({
    label: String(s.phase),
    startBar: s.startBar,
    length: s.endBar - s.startBar + 1,
  }));
  const baseMeta = input.generationMetadata;
  const genMeta: GenerationMetadata = {
    ...(baseMeta ?? {}),
    generatedAt: baseMeta?.generatedAt ?? new Date().toISOString(),
    songwriterStyleId: 'frank_zappa',
    frankZappaEffectiveHarmonyBars: harmonyBars,
    barMeterMap: input.barMeterMap ?? baseMeta?.barMeterMap,
  };
  const preset = stringQuartetPreset;
  return {
    systemVersion: '2.0.0',
    presetId: 'string_quartet',
    seed: input.seed,
    form: { totalBars: tb, sections },
    feel: preset.defaultFeel,
    harmony: { segments: [], totalBars: tb },
    motif: { activeMotifs: [], variants: {} },
    phrase: { segments: [], totalBars: tb },
    register: {},
    density: { segments: [], totalBars: tb },
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan: { segments: [], totalBars: tb },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: genMeta,
    validation: { gates: [], passed: true },
    readiness: {
      release: { passed: true, overall: 1, categories: [] },
      mx: { passed: true, overall: 1, categories: [] },
    },
    barMeterMap: input.barMeterMap,
  } as unknown as CompositionContext;
}

function applySectionVoicingSpreadSq(stack: number[], minSpread?: number, maxSpread?: number): number[] {
  if (stack.length < 2) return stack;
  const out = [...stack];
  const spread = Math.max(...out) - Math.min(...out);
  if (typeof minSpread === 'number' && spread < minSpread) {
    out[0] = out[0]! + Math.ceil((minSpread - spread) / 2);
    out[out.length - 1] = out[out.length - 1]! - Math.floor((minSpread - spread) / 2);
  }
  if (typeof maxSpread === 'number' && spread > maxSpread) {
    const center = out.reduce((a, b) => a + b, 0) / out.length;
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.round(center + (out[i]! - center) * Math.max(0.25, maxSpread / spread));
    }
  }
  return out;
}

export function buildQuartetScoreModel(input: BuildQuartetScoreModelInput): ScoreModel {
  const USE_PIANO_COMP_SQ = true;
  const USE_SLONIMSKY_SQ = true;
  const USE_RETURN_OCTAVE_LIFT = true;
  const {
    title,
    seed,
    formPlan,
    texturePlan,
    era,
    chordBars,
    padSketch,
    wybleVoiceLayout,
    songwriterStyleId,
    allowedOutsideOverride,
    blendStrength,
    duoIntent: productDuoIntent,
    barMeterMap,
    sectionArchitectureContext,
  } = input;
  const outsideLevel = (allowedOutsideOverride ?? 1) as 0 | 1 | 2;
  const splitStreakThreshold = wholeStreakThresholdForBlend(blendStrength);
  const totalBars = formPlan.totalBars;

  const chordForBar = (b: number) => {
    if (chordBars && chordBars.length === totalBars) {
      return chordBars[b - 1]!;
    }
    return barChord(b, seed, era);
  };
  const rehearsalForBar = (b: number): string | undefined => {
    const sl = formPlan.slices.find((s) => b === s.startBar);
    if (!sl) return undefined;
    return QUARTET_REHEARSAL_MARK_DISPLAY[sl.phase];
  };

  const stringParts: PartModel[] = QUARTET_INSTRUMENTS.map((inst, idx) => {
    const partId = partIdForQuartetInstrument(inst);
    const meta = PART_META[idx];
    return createPart(
      partId,
      meta.name,
      meta.instrumentIdentity,
      meta.midiProgram,
      meta.clef,
      totalBars,
      chordForBar,
      rehearsalForBar
    );
  });

  const wholeTracker = new WholeNoteDensityTracker();
  const sectionArchitectureProfileByBar: NonNullable<ScoreModel['sectionArchitectureProfileByBar']> = {};
  let prevQuartetInner: { violin1?: number; violin2?: number; viola?: number } = {};
  /** Rolling 3-bar violin I windows for {@link applySlonimskyToMelodyLine}. */
  const slonimskyV1Acc: number[] = [];
  /** Rolling 3-bar violin II windows for {@link applySlonimskyToMelodyLine}. */
  const slonimskyV2Acc: number[] = [];

  const harmonyBarsFull = buildZappaQuartetHarmonyBars(input, chordForBar);
  const zappaSqActive = zappaStringQuartetScorePath(input);
  let zappaSoloLine: SoloLine | undefined;
  if (zappaSqActive) {
    const zappaCtx = buildZappaQuartetCompositionContext(input, harmonyBarsFull);
    zappaSoloLine = generateZappaSolo(zappaCtx, {
      midiLow: QUARTET_MIDI_BOUNDS[SQ_PART_V1]![0]!,
      midiHigh: QUARTET_MIDI_BOUNDS[SQ_PART_V1]![1]!,
    });
  }

  for (let bar = 1; bar <= totalBars; bar++) {
    const span = barQuarterSpan(bar, barMeterMap);
    for (let si = 0; si < stringParts.length; si++) {
      stringParts[si]!.measures[bar - 1]!.measureBeatSpanQuarters = span;
    }

    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const texSlice = slice ? texturePlan.slices.find((x) => x.formSliceIndex === slice.index) : undefined;
    const sectionTag = (slice?.phase ?? 'other') as SectionTag;
    const sectionEff = sectionArchitectureContext ? getEffectiveContextForBar(bar, sectionArchitectureContext) : undefined;
    const sectionDensityHint = sectionArchitectureContext
      ? getSectionArchitectureDensityHint(bar, sectionArchitectureContext)
      : undefined;
    const sectionRegisterWindow = sectionArchitectureContext
      ? getEffectiveRegisterWindowForBar(bar, sectionArchitectureContext, 'strings')
      : undefined;
    if (sectionEff || sectionDensityHint || sectionRegisterWindow) {
      sectionArchitectureProfileByBar[bar] = {
        ...(sectionDensityHint ? { density: sectionDensityHint } : {}),
        ...(typeof sectionEff?.voicing.minSpreadSemitones === 'number'
          ? { minSpreadSemitones: sectionEff.voicing.minSpreadSemitones }
          : {}),
        ...(typeof sectionEff?.voicing.maxSpreadSemitones === 'number'
          ? { maxSpreadSemitones: sectionEff.voicing.maxSpreadSemitones }
          : {}),
        ...(sectionRegisterWindow ? { registerFloor: sectionRegisterWindow.floor, registerCeiling: sectionRegisterWindow.ceil } : {}),
      };
    }

    /** Odd-meter maps: Zappa solo fragments do not reliably fill `measureBeatSpanQuarters`; use standard quartet voicing + SQ harmony bars. */
    if (zappaSqActive && zappaSoloLine && !barMeterMap) {
      const harmSym = harmonyBarsFull[bar - 1] ?? chordForBar(bar);
      const barNotes: ScoredNote[] = [];
      const notesThisBar = zappaSoloLine.allNotes
        .filter((n) => n.barIndex === bar)
        .sort((a, b) => a.startBeat - b.startBeat);
      const tpl = notesThisBar.filter((n) => !n.isRest);

      for (let idx = 0; idx < 4; idx++) {
        const inst = QUARTET_INSTRUMENTS[idx]!;
        const m = stringParts[idx]!.measures[bar - 1]!;
        const role = texSlice?.rolesByInstrument[inst];
        const pid = QUARTET_PART_IDS[idx]!;
        if (role === 'silence') {
          addEvent(m, createRest(0, span));
          continue;
        }

        if (idx === 0) {
          const v1lo = QUARTET_MIDI_BOUNDS[SQ_PART_V1]![0]!;
          const v1hi = QUARTET_MIDI_BOUNDS[SQ_PART_V1]![1]!;
          if (notesThisBar.length === 0) {
            addEvent(m, createRest(0, span));
          } else {
            for (const sn of notesThisBar) {
              if (sn.isRest) {
                addEvent(
                  m,
                  createRest(sn.startBeat, clampNoteDurationInMeasure(sn.startBeat, sn.durationBeats, span))
                );
              } else {
                const midi = snapMidiToRange(Math.round(sn.midi), v1lo, v1hi);
                const dur = clampNoteDurationInMeasure(sn.startBeat, sn.durationBeats, span);
                addEvent(m, createNote(midi, sn.startBeat, dur, 1));
                barNotes.push({ partId: pid, midi, durationBeats: dur });
              }
            }
          }
          continue;
        }

        if (idx === 1) {
          const v2lo = QUARTET_MIDI_BOUNDS[SQ_PART_V2]![0]!;
          const v2hi = QUARTET_MIDI_BOUNDS[SQ_PART_V2]![1]!;
          const anchor = tpl[0]?.midi ?? 60;
          if (tpl.length === 0) {
            addEvent(m, createRest(0, span));
          } else {
            for (const t of tpl) {
              const contour = t.midi - anchor;
              const midi = snapMidiToRange(Math.round(anchor + contour * 0.9 - 4), v2lo, v2hi);
              const dur = clampNoteDurationInMeasure(t.startBeat, t.durationBeats, span);
              addEvent(m, createNote(midi, t.startBeat, dur, 1));
              barNotes.push({ partId: pid, midi, durationBeats: dur });
            }
          }
          continue;
        }

        if (idx === 2) {
          const valo = QUARTET_MIDI_BOUNDS[SQ_PART_VA]![0]!;
          const vahi = QUARTET_MIDI_BOUNDS[SQ_PART_VA]![1]!;
          const skewRaw = span * (0.0625 + ((seed + bar * 17) % 7) * 0.004);
          if (tpl.length === 0) {
            addEvent(m, createRest(0, span));
          } else {
            for (const t of tpl) {
              const sb = wrapBeatInBarSq(t.startBeat + skewRaw, span);
              const midi = snapMidiToRange(Math.round(t.midi - 9), valo, vahi);
              const dur = clampNoteDurationInMeasure(sb, t.durationBeats, span);
              addEvent(m, createNote(midi, sb, dur, 1));
              barNotes.push({ partId: pid, midi, durationBeats: dur });
            }
          }
          continue;
        }

        const clo = QUARTET_MIDI_BOUNDS[SQ_PART_VC]![0]!;
        const chi = QUARTET_MIDI_BOUNDS[SQ_PART_VC]![1]!;
        const rpc = chordSymbolRootPc(harmSym) ?? 0;
        let rootMidi = 36 + rpc;
        rootMidi = snapMidiToRange(rootMidi, clo, chi);
        addEvent(m, createNote(rootMidi, 0, span, 1));
        barNotes.push({ partId: pid, midi: rootMidi, durationBeats: span });
      }

      wholeTracker.pushBarSlice(
        { barIndex: bar, sectionTag, barBeats: span, notes: barNotes },
        padSketch ?? false
      );
      continue;
    }

    const needSplit =
      !padSketch &&
      sectionDensityHint !== 'sparse' &&
      (blendStrength === 'strong'
        ? bar > 2
        : blendStrength === 'light'
          ? false
          : sectionDensityHint === 'dense' ||
            sectionEff?.rhythm.antiMetric === true ||
            wholeTracker.highWholeStreakAtEnd() >= splitStreakThreshold);
    const splitIdx = (bar + seed) % 4;

    const sym = chordForBar(bar);
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const stack = applySectionVoicingSpreadSq(
      applyRegisterSpreadToStack(
        applyQuartetWybleChordToneStack(pitchesQuartetString(rpc, sym), wybleVoiceLayout, prevQuartetInner),
        outsideLevel
      ),
      sectionEff?.voicing.minSpreadSemitones,
      sectionEff?.voicing.maxSpreadSemitones
    );
    const slonimskyPhraseIntent = sqSlonimskyPhraseIntentForProductDuo(productDuoIntent, bar, seed);
    prevQuartetInner = { violin1: stack[0], violin2: stack[1], viola: stack[2] };

    let melodyPitchV1 = stack[0]!;
    if (sectionRegisterWindow) {
      melodyPitchV1 = snapMidiToRange(melodyPitchV1, sectionRegisterWindow.floor, sectionRegisterWindow.ceil);
    }
    if (USE_RETURN_OCTAVE_LIFT && slice?.phase === 'return') {
      melodyPitchV1 = snapMidiToRange(stack[0]! + 12, ...QUARTET_MIDI_BOUNDS[SQ_PART_V1]);
    }
    const v1Silent = texSlice?.rolesByInstrument.violin_1 === 'silence';
    if (USE_SLONIMSKY_SQ && !v1Silent) {
      slonimskyV1Acc.push(melodyPitchV1);
      if (slonimskyV1Acc.length > 3) slonimskyV1Acc.shift();
      if (slonimskyV1Acc.length === 3) {
        const ctx = buildQuartetSlonimskyContext({
          duoIntent: 'guitar_lead',
          phase: ((bar - 1) % 8) + 1,
          seed: seed + bar * 31,
          songwriterId: songwriterStyleId,
          ...(allowedOutsideOverride !== undefined ? { allowedOutsideOverride } : {}),
          ...(slonimskyPhraseIntent ? { phraseIntent: slonimskyPhraseIntent } : {}),
          totalQuarterBeats: span,
          styleProfile: songwriterStyleId ?? null,
          chordSymbol: sym,
          keyPc: rpc,
          effectiveLow: QUARTET_MIDI_BOUNDS[SQ_PART_V1][0]!,
          effectiveHigh: QUARTET_MIDI_BOUNDS[SQ_PART_V1][1]!,
          catalogueSection: 'intervallic_mirror_permutations',
          transpositionInterval: bar % 12,
        });
        pushEnsembleSlonimskyCellReceipt(input.slonimskyEnsembleCellReceipts, 'sq', bar, ctx, seed);
        const mel: SlonimskyNote[] = slonimskyV1Acc.map((m, i) => ({
          midi: m,
          durationBeats: 1,
          beat: i,
          role: i === 0 || i === 2 ? 'target' : 'passing',
        }));
        const chords3 = [chordForBar(bar - 2), chordForBar(bar - 1), chordForBar(bar)];
        const out = applySlonimskyToMelodyLine(mel, chords3, ctx, seed + bar * 17);
        const sounding = out.filter((n) => n.durationBeats > 0).sort((a, b) => a.beat - b.beat);
        if (sounding.length > 0) {
          const pickMidi = sounding[Math.min(2, sounding.length - 1)]!.midi;
          melodyPitchV1 = snapMidiToRange(pickMidi, ...QUARTET_MIDI_BOUNDS[SQ_PART_V1]);
        }
      }
    }

    let melodyPitchV2 = stack[1]!;
    if (sectionRegisterWindow) {
      melodyPitchV2 = snapMidiToRange(melodyPitchV2, sectionRegisterWindow.floor, sectionRegisterWindow.ceil);
    }
    if (USE_SLONIMSKY_SQ && !v1Silent) {
      slonimskyV2Acc.push(melodyPitchV2);
      if (slonimskyV2Acc.length > 3) slonimskyV2Acc.shift();
      if (slonimskyV2Acc.length === 3) {
        const ctx = buildQuartetSlonimskyContext({
          duoIntent: 'guitar_lead',
          phase: ((bar - 1) % 8) + 1,
          seed: seed + bar * 31,
          songwriterId: songwriterStyleId,
          ...(allowedOutsideOverride !== undefined ? { allowedOutsideOverride } : {}),
          ...(slonimskyPhraseIntent ? { phraseIntent: slonimskyPhraseIntent } : {}),
          totalQuarterBeats: span,
          styleProfile: songwriterStyleId ?? null,
          chordSymbol: sym,
          keyPc: rpc,
          effectiveLow: QUARTET_MIDI_BOUNDS[SQ_PART_V2][0]!,
          effectiveHigh: QUARTET_MIDI_BOUNDS[SQ_PART_V2][1]!,
          catalogueSection: 'tritone_progression',
        });
        pushEnsembleSlonimskyCellReceipt(input.slonimskyEnsembleCellReceipts, 'sq', bar, ctx, seed);
        const mel: SlonimskyNote[] = slonimskyV2Acc.map((m, i) => ({
          midi: m,
          durationBeats: 1,
          beat: i,
          role: i === 0 || i === 2 ? 'target' : 'passing',
        }));
        const chords3 = [chordForBar(bar - 2), chordForBar(bar - 1), chordForBar(bar)];
        const out = applySlonimskyToMelodyLine(mel, chords3, ctx, seed + bar * 17);
        const sounding = out.filter((n) => n.durationBeats > 0).sort((a, b) => a.beat - b.beat);
        if (sounding.length > 0) {
          const pickMidi = sounding[Math.min(2, sounding.length - 1)]!.midi;
          melodyPitchV2 = snapMidiToRange(pickMidi, ...QUARTET_MIDI_BOUNDS[SQ_PART_V2]);
        }
      }
    }

    const barNotes: ScoredNote[] = [];

    for (let idx = 0; idx < 4; idx++) {
      const inst = QUARTET_INSTRUMENTS[idx]!;
      const m = stringParts[idx]!.measures[bar - 1]!;
      const role = texSlice?.rolesByInstrument[inst];
      const pid = QUARTET_PART_IDS[idx]!;
      if (role === 'silence') {
        addEvent(m, createRest(0, span));
        continue;
      }
      const splitHere = needSplit && idx === splitIdx;
      const rawPitch = idx === 0 ? melodyPitchV1 : idx === 1 ? melodyPitchV2 : stack[idx]!;
      const pitch = sectionRegisterWindow
        ? snapMidiToRange(rawPitch, sectionRegisterWindow.floor, sectionRegisterWindow.ceil)
        : rawPitch;
      const half = span / 2;
      if (splitHere) {
        barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
        barNotes.push({ partId: pid, midi: pitch, durationBeats: half });
      } else {
        barNotes.push({ partId: pid, midi: pitch, durationBeats: span });
      }
      addStringBar(m, pitch, splitHere, span);
    }

    wholeTracker.pushBarSlice(
      { barIndex: bar, sectionTag, barBeats: span, notes: barNotes },
      padSketch ?? false
    );
  }

  runQuartetParallelMotionPass(stringParts, totalBars);

  /** GM Acoustic Grand (0); exporter emits `<midi-program>1</midi-program>` + `<midi-channel>1</midi-channel>` for `sq_piano`. */
  const pianoPart = createPart(
    SQ_PART_PIANO,
    'Piano',
    'string_quartet_piano',
    0,
    'treble',
    totalBars,
    chordForBar,
    rehearsalForBar
  );
  for (let bar = 1; bar <= totalBars; bar++) {
    const span = barQuarterSpan(bar, barMeterMap);
    const m = pianoPart.measures[bar - 1]!;
    m.measureBeatSpanQuarters = span;

    if (!USE_PIANO_COMP_SQ) {
      addEvent(m, createRest(0, span, 1));
      addEvent(m, createRest(0, span, 2));
      continue;
    }

    const sym = chordForBar(bar);
    const rpc = chordSymbolRootPc(sym) ?? 0;
    const pianoMidi = snapMidiToRange(60 + rpc, 55, 84);
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    const sectionTag = (slice?.phase ?? 'other') as SectionTag;

    /** Theme / solo tacet: quartet `statement` ≈ theme, `development` ≈ solo. */
    if (sectionTag === 'statement' || sectionTag === 'development') {
      addEvent(m, createRest(0, span, 1));
      addEvent(m, createRest(0, span, 2));
      continue;
    }

    const { third: tHs, seventh: sHs } = pianoShellHalfStepsFromSymbolSq(sym);
    const rootM = clampPianoMidiSq(pianoMidi);
    const shell: number[] = [
      rootM,
      clampPianoMidiSq(pianoMidi + tHs),
      clampPianoMidiSq(pianoMidi + sHs),
    ];

    const rotateForwardOneBeat = (bar + seed) % 3 === 0;
    const rot = rotateForwardOneBeat ? 1 : 0;
    const beatScale = span / 4;
    const rotHit = (b: number) => wrapBeatInBarSq(b * beatScale + rot, span);

    const rawTemplate = sectionTag === 'contrast' ? [0, 1.5, 3] : [0, 2.5];
    const hitBeats = [...new Set(rawTemplate.map((b) => rotHit(b)))].sort((a, b) => a - b);
    const hitDur = 0.5;

    /** Voice 1: chord roots on every 4th bar; otherwise explicit rest so strict bar math sees a full span per voice. */
    if (bar % 4 === 0) {
      addEvent(m, createNote(rootM, 0, span, 1));
    } else {
      addEvent(m, createRest(0, span, 1));
    }

    /** Voice 2: shell hits + rests filling gaps (strict bar math sums event durations per voice). */
    let v2Cursor = 0;
    for (const hb of hitBeats) {
      const start = Math.min(Math.max(0, hb), Math.max(0, span - hitDur));
      if (start > v2Cursor + 1e-4) {
        addEvent(m, createRest(v2Cursor, start - v2Cursor, 2));
      }
      const d = clampNoteDurationInMeasure(start, hitDur, span);
      addEvent(m, createNote(rootM, start, d, 2, undefined, shell));
      v2Cursor = start + d;
    }
    if (v2Cursor < span - 1e-4) {
      addEvent(m, createRest(v2Cursor, span - v2Cursor, 2));
    }
  }

  const score = createScore(title, [...stringParts, pianoPart], { tempo: 96 });
  score.wybleConsumptionReceipt = wybleConsumptionReceiptForQuartet(wybleVoiceLayout);
  if (input.barMeterMap && Object.keys(input.barMeterMap).length > 0) {
    score.barMeterMap = input.barMeterMap;
  }
  if (Object.keys(sectionArchitectureProfileByBar).length > 0) {
    score.sectionArchitectureProfileByBar = sectionArchitectureProfileByBar;
  }
  return score;
}

/** Golden / smoke — cross-part MIDI span after register-spread stack nudge (C major, root 0). */
export function measureQuartetRegisterSpreadMidiSpan(outsideLevel: 0 | 1 | 2): number {
  const stack = applyRegisterSpreadToStack(pitchesQuartetString(0, 'Cmaj7'), outsideLevel);
  return Math.max(...stack) - Math.min(...stack);
}

/** Golden / smoke — count string-part notes shorter than ~75% of bar span (rhythmic splits). */
export function countSqShortDurationStringNotes(score: ScoreModel): number {
  let n = 0;
  for (const partId of QUARTET_PART_IDS) {
    const part = score.parts.find((p) => p.id === partId);
    if (!part) continue;
    for (const m of part.measures) {
      const span = m.measureBeatSpanQuarters ?? 4;
      const shortThreshold = span * 0.75;
      for (const ev of m.events) {
        if (ev.kind === 'note' && ev.duration < shortThreshold) n++;
      }
    }
  }
  return n;
}
