/**
 * Fripp / King Crimson — Song Mode duo golden-path slice.
 *
 * Rhythm: {@link asymmetricRhythmEngine} + Fripp-named presets; optional polymeter (two cycles, LCM on 16th grid).
 * Harmony: third-cycle root motion, whole-tone / octatonic pitch fields, quartal / sus / #11 surfaces — de-prioritises functional V→I.
 *
 * Melody/register targets are emitted as {@link GenerationMetadata.frippKingCrimsonMelodyHints} for downstream phrase passes (quantize 16ths; phrase length vs loop).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import {
  cycleDefinitionFromPreset,
  getAsymmetricPreset,
  resolveCycleDefinitionFromAsymmetricRhythmRequest,
  type AsymmetricRhythmRequest,
} from '../rhythm/asymmetricPresets';
import { meterSignatureFromCycle } from '../rhythm/asymmetricRhythmEngine';
import {
  buildFrippPolymeterAlignmentReceipt,
  polymeterLcmSixteenths,
  sixteenthSpanFromCycle,
} from '../rhythm/frippPolymeterGrid';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

export const FRIPP_DEFAULT_PRESET_ID = 'frame_by_frame';

export type FrippPitchCollectionMode = 'whole_tone' | 'octatonic';

export interface FrippKingCrimsonMelodyHints {
  /** Loop length in sixteenth pulses (primary asymmetric cycle). */
  phraseMultipleSixteenths: number;
  /** Target ≥ this fraction non-stepwise motion (manifest / phrase planner). */
  nonStepwiseMotionTarget: number;
  /** Periodic upward leap at least this many semitones (≥ P4). */
  periodicLeapMinSemitones: number;
  /** Guitar melodic voice register band (MIDI rough centre). */
  melodicRegisterCentreMidi: number;
  /** Bass / static layer ceiling — roots & fifths stay at or below this MIDI. */
  staticRootCeilingMidi: number;
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function frippPitchCollectionMode(seed: number, bar: number): FrippPitchCollectionMode {
  return seededUnit(seed, bar, 882001) < 0.5 ? 'whole_tone' : 'octatonic';
}

/** Major or minor third root motion (no circle-of-fifths cadential drift). */
export function frippNextRootByThird(prevPc: number, seed: number, bar: number): number {
  const majorThird = seededUnit(seed, bar, 882002) < 0.5;
  const delta = majorThird ? 4 : 3;
  return (prevPc + delta) % 12;
}

function buildFrippChordSurface(rootPc: number, seed: number, bar: number): string {
  const name = pitchClassToSharpName(rootPc);
  const u = seededUnit(seed, bar, 882003);
  if (u < 0.32) return `${name}sus4`;
  if (u < 0.54) return `${name}7sus4`;
  if (u < 0.72) return `${name}maj7(#11)`;
  if (u < 0.88) return `${name}m7`;
  return `${name}add9`;
}

/** Strip plain V7→I-like dominant pull toward tonic — favour sus / tritone-offset colour. */
function frippAvoidFunctionalCadence(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (tonicPc === undefined) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const Vpc = (tonicPc + 7) % 12;
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  const looksDom =
    r === Vpc && /\b7\b/.test(hp) && !/maj7|mmaj|m7|sus|ø|dim/.test(hp);
  if (looksDom && seededUnit(seed, bar, 882004) < 0.88) {
    const altPc = (r + 6) % 12;
    return `${pitchClassToSharpName(altPc)}7sus4`;
  }
  return symbol;
}

function buildFrippHarmonyRow(
  raw: string[],
  tb: number,
  seed: number,
  tonicPc: number | undefined
): string[] {
  const startPc = harmonyRootPc(raw[0] ?? 'C') ?? 0;
  let prevPc = startPc;
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    prevPc = frippNextRootByThird(prevPc, seed, b);
    frippPitchCollectionMode(seed, b);
    let sym = buildFrippChordSurface(prevPc, seed, b);
    sym = frippAvoidFunctionalCadence(sym, tonicPc, seed, b);
    prevPc = harmonyRootPc(sym) ?? prevPc;
    out.push(sym);
  }
  return out;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece third-cycle / avoid-cadence devices untouched.
 * Note: m7 and 7sus4 trip via digit `7` even when idiomatic mid-piece.
 */
function chordLooksDominantFamilyForFbtFripp(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Fripp landings that already pass fBT
 * (tonic-root sus4 · maj7(#11) primary; add9 mid). Never m7 / 7sus4 (digit-`7` trap).
 * Not a forced jazz tonic cadence — third-cycle / non-functional idiom preserved.
 */
function biasFrippKingCrimsonFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  tonicPc: number | undefined
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtFripp(sym)) return;

  const root = pitchClassToSharpName(tonicPc);
  const u = seededUnit(seed, totalBars, 882901);

  let next: string;
  if (u < 0.45) next = `${root}sus4`;
  else if (u < 0.82) next = `${root}maj7(#11)`;
  else next = `${root}add9`;

  out[idx] = next;
  receipts.push(`fk:final_open_bias@bar${totalBars}`);
}

export function isSongwriterFrippKingCrimson(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'fripp_king_crimson' } {
  return genMeta?.songwriterStyleId === 'fripp_king_crimson';
}

/**
 * Harmonic-path gate — primary `fripp_king_crimson` **or** exact `harmonicVoice=fripp_king_crimson`.
 * Soft Song aliases (`king_crimson` / `crimson`) normalize to Song primary before this gate.
 * Never Systems `fripp` / `fripp_systems_process` (`rf:*` — separate identity).
 */
export function isFrippKingCrimsonHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'fripp_king_crimson' || voice === 'fripp_king_crimson';
}

/**
 * Precompute effective harmony — third-cycle / asymmetric KC surfaces (`fk:*` receipts).
 * Call when {@link isFrippKingCrimsonHarmonicPath} (primary or exact HV).
 */
export function precomputeFrippKingCrimsonEffectiveHarmonyBars(context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata & {
    asymmetricRhythmRequest?: AsymmetricRhythmRequest;
    frippPolymeterSecondaryPresetId?: string;
  };
  const tb = context.form.totalBars;
  const seed = context.seed;
  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const req = md.asymmetricRhythmRequest;
  const cycle = resolveCycleDefinitionFromAsymmetricRhythmRequest(
    req ?? { presetId: FRIPP_DEFAULT_PRESET_ID },
    FRIPP_DEFAULT_PRESET_ID
  );
  const sig = meterSignatureFromCycle(cycle);

  let presetLabel: string;
  if (req && 'custom' in req) {
    presetLabel = `custom:${cycle.pulsesPerCycle}p`;
  } else {
    const pid =
      req && 'presetId' in req && req.presetId?.trim()
        ? req.presetId.trim()
        : FRIPP_DEFAULT_PRESET_ID;
    presetLabel = pid;
  }

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const effective = buildFrippHarmonyRow(raw, tb, seed, tonicPc);

  /* Piece-final only: bias toward Fripp-own open landings that already pass fBT. */
  const biasReceipts: string[] = [];
  biasFrippKingCrimsonFinalBarIdiomaticOpen(effective, seed, tb, biasReceipts, tonicPc);

  const loopSixteenths = sixteenthSpanFromCycle(cycle);
  md.frippKingCrimsonMelodyHints = {
    phraseMultipleSixteenths: loopSixteenths,
    nonStepwiseMotionTarget: 0.6,
    periodicLeapMinSemitones: 5,
    melodicRegisterCentreMidi: 72,
    staticRootCeilingMidi: 57,
  };

  md.frippKingCrimsonDiagnostics = {
    songwriterId: 'fripp_king_crimson',
    barsConsidered: tb,
    pitchCollectionBarsWholeTone: tb,
    thirdCycleSteps: tb,
    polymeterLcmSixteenths: undefined as number | undefined,
  };

  let sliceReceipt = `fk:preset@${presetLabel}|fk:meter@${sig.numerator}/${sig.denominator}|fk:bars@${tb}|fk:loop${loopSixteenths}q`;
  if (biasReceipts.length) sliceReceipt += `|${biasReceipts.join('|')}`;

  const secondaryId = md.frippPolymeterSecondaryPresetId?.trim();
  if (secondaryId) {
    const p2 = getAsymmetricPreset(secondaryId);
    if (p2) {
      const c2 = cycleDefinitionFromPreset(p2);
      const poly = buildFrippPolymeterAlignmentReceipt(cycle, c2);
      md.frippKingCrimsonPolymeterReceipt = poly;
      sliceReceipt += `|${poly}`;
      if (md.frippKingCrimsonDiagnostics) {
        md.frippKingCrimsonDiagnostics.polymeterLcmSixteenths = polymeterLcmSixteenths(cycle, c2);
      }
    }
  }

  md.frippKingCrimsonEffectiveHarmonyBars = effective;
  md.frippKingCrimsonAsymmetricPresetResolved = presetLabel;
  md.frippKingCrimsonSliceReceipt = sliceReceipt;

  const map: BarMeterMap = {};
  for (let b = 1; b <= tb; b++) map[b] = sig;

  context.barMeterMap = map;
  md.barMeterMap = map;
}
