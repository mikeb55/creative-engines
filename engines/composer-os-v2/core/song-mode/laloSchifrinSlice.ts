/**
 * Lalo Schifrin — groove-native jazz-Latin film Song Mode slice (`ls:*` receipts).
 * Motor energy via percussion grid, brass attack, odd-meter riff accents, modal vamps.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { seededFilmUnit } from './filmSoundtrackHarmonySlices';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface LaloSchifrinSliceParams {
  oddMeterGroove: number;
  latinPercussionGrid: number;
  brassAttackDensity: number;
  modalAlteredHarmony: number;
  motivicCompactness: number;
}

export const DEFAULT_LALO_SCHIFRIN_SLICE_PARAMS: LaloSchifrinSliceParams = {
  oddMeterGroove: 0.72,
  latinPercussionGrid: 0.8,
  brassAttackDensity: 0.75,
  modalAlteredHarmony: 0.7,
  motivicCompactness: 0.75,
};

export type LaloSchifrinContextMode = 'ls:groove_mode' | 'ls:action_mode' | 'ls:jazz_latin_mode';

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function harmonyRootPc(symbol: string): number | undefined {
  const m = parseChordSymbol(stemOnly(symbol)).harmonyPart.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function extractRootAndSlash(symbol: string): { root: string; slash: string; rest: string } | undefined {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  const root = m[1];
  return { root, slash: slashTail(symbol), rest: hp.slice(root.length) };
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const rootPc = noteNameToPitchClass(ex.root);
  if (rootPc === undefined) return symbol;
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  return `${newRoot}${ex.rest}${ex.slash}`;
}

export function resolveLaloSchifrinSliceParams(genMeta: GenerationMetadata | undefined): LaloSchifrinSliceParams {
  const fromMeta = genMeta?.laloSchifrinSliceParams;
  const d = DEFAULT_LALO_SCHIFRIN_SLICE_PARAMS;
  if (!fromMeta) return { ...d };
  return {
    oddMeterGroove: clamp01(fromMeta.oddMeterGroove ?? d.oddMeterGroove),
    latinPercussionGrid: clamp01(fromMeta.latinPercussionGrid ?? d.latinPercussionGrid),
    brassAttackDensity: clamp01(fromMeta.brassAttackDensity ?? d.brassAttackDensity),
    modalAlteredHarmony: clamp01(fromMeta.modalAlteredHarmony ?? d.modalAlteredHarmony),
    motivicCompactness: clamp01(fromMeta.motivicCompactness ?? d.motivicCompactness),
  };
}

function toModalAltered(symbol: string, seed: number, bar: number, tonicPc: number): string {
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededFilmUnit(seed, bar, 940401);
  const pedal = pitchClassToSharpName(tonicPc);
  if (u < 0.22) return `${ex.root}m9${ex.slash || `/${pedal}`}`;
  if (u < 0.38) return `${ex.root}7alt${ex.slash || `/${pedal}`}`;
  if (u < 0.52) return `${ex.root}7sus(b9)${ex.slash || `/${pedal}`}`;
  if (u < 0.66) return `${ex.root}maj7(#11)${ex.slash || `/${pedal}`}`;
  if (u < 0.78) return `${transposeChordRoot(symbol, 6)}${ex.slash || `/${pedal}`}`;
  if (u < 0.88) {
    const upper = pitchClassToSharpName((tonicPc + 2) % 12);
    return `${upper}maj/${pedal}`;
  }
  return `${ex.root}sus4${ex.slash || `/${pedal}`}`;
}

function slashPedalPc(symbol: string): number | undefined {
  if (!symbol.includes('/')) return undefined;
  const tail = symbol.slice(symbol.indexOf('/') + 1).trim();
  const m = tail.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function sharesTonicPedal(prev: string, cur: string, tonicPc: number): boolean {
  const pPrev = slashPedalPc(prev);
  const pCur = slashPedalPc(cur);
  return pPrev === tonicPc && pCur === tonicPc;
}

function looksDominantToTonic(prev: string, cur: string, tonicPc: number): boolean {
  if (sharesTonicPedal(prev, cur, tonicPc)) return false;
  const rPrev = harmonyRootPc(stemOnly(prev));
  const rCur = harmonyRootPc(stemOnly(cur));
  if (rPrev === undefined || rCur === undefined) return false;
  const vPc = (tonicPc + 7) % 12;
  return rPrev === vPc && rCur === tonicPc;
}

function matchesMajorTwoFiveOne(out: string[], iiBar: number, tonicPc: number, tb: number): boolean {
  if (iiBar + 2 > tb) return false;
  const trio = [out[iiBar - 1]!, out[iiBar]!, out[iiBar + 1]!];
  if (trio.every((sym) => slashPedalPc(sym) === tonicPc)) return false;
  const rIi = harmonyRootPc(stemOnly(out[iiBar - 1]!));
  const rV = harmonyRootPc(stemOnly(out[iiBar]!));
  const rI = harmonyRootPc(stemOnly(out[iiBar + 1]!));
  if (rIi === undefined || rV === undefined || rI === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return rIi === iiPc && rV === vPc && rI === tonicPc;
}

export function oddMeterGrooveReceiptCount(receipts: readonly string[] | undefined): number {
  return (receipts ?? []).filter((r) => r.startsWith('ls:d1_odd_meter') || r.startsWith('ls:5_4') || r.startsWith('ls:7_8')).length;
}

export function latinPercussionGridReceiptCount(receipts: readonly string[] | undefined): number {
  return (receipts ?? []).filter((r) => r.startsWith('ls:d2_latin_percussion') || r.startsWith('ls:clave_')).length;
}

export function countDominantTonicPairs(bars: readonly string[], tonicPc: number): number {
  let count = 0;
  for (let i = 1; i < bars.length; i++) {
    if (looksDominantToTonic(bars[i - 1]!, bars[i]!, tonicPc)) count++;
  }
  return count;
}

export function countMajorTwoFiveOneChains(bars: readonly string[], tonicPc: number): number {
  let count = 0;
  for (let iiBar = 1; iiBar <= bars.length - 2; iiBar++) {
    if (matchesMajorTwoFiveOne([...bars], iiBar, tonicPc, bars.length)) count++;
  }
  return count;
}

export interface LaloSchifrinHarmonyAccumulator {
  barsConsidered: number;
  oddMeterTouches: number;
  percussionTouches: number;
  brassTouches: number;
  modalTouches: number;
  motivicTouches: number;
}

export function createLaloSchifrinHarmonyAccumulator(): LaloSchifrinHarmonyAccumulator {
  return {
    barsConsidered: 0,
    oddMeterTouches: 0,
    percussionTouches: 0,
    brassTouches: 0,
    modalTouches: 0,
    motivicTouches: 0,
  };
}

export function accumulateLaloSchifrinHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: LaloSchifrinHarmonyAccumulator
): void {
  const c = currentChord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(stemOnly(c)).harmonyPart.toLowerCase();
  if (/m9|7alt|sus\(b9\)|#11|maj\//.test(t)) acc.modalTouches++;
}

export function precomputeLaloSchifrinEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: LaloSchifrinContextMode[] = ['ls:groove_mode', 'ls:action_mode', 'ls:jazz_latin_mode'];
  const rawM = genMeta.laloSchifrinContext as string | undefined;
  const mode: LaloSchifrinContextMode = modes.includes(rawM as LaloSchifrinContextMode)
    ? (rawM as LaloSchifrinContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.laloSchifrinContext = mode;

  const params = resolveLaloSchifrinSliceParams(genMeta);
  genMeta.laloSchifrinSliceParams = params;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 0;

  receipts.push(
    `ls:params=omg:${params.oddMeterGroove.toFixed(2)};lpg:${params.latinPercussionGrid.toFixed(2)};bad:${params.brassAttackDensity.toFixed(2)};mah:${params.modalAlteredHarmony.toFixed(2)};mc:${params.motivicCompactness.toFixed(2)}`
  );
  receipts.push(`ls:context=${mode}`);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  const oddGrouping = seededFilmUnit(seed, 0, 940101) < 0.5 ? '5_4_3+2' : '7_8_3+2+2';
  receipts.push(`ls:${oddGrouping}@form`);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;

    if (seededFilmUnit(seed, b, 940102) < params.oddMeterGroove) {
      receipts.push(`ls:d1_odd_meter_groove@bar${b}`);
      if (oddGrouping.startsWith('5_4')) receipts.push(`ls:5_4_riff_accent@bar${b}`);
      else receipts.push(`ls:7_8_riff_accent@bar${b}`);
    }

    if (seededFilmUnit(seed, b, 940201) < params.latinPercussionGrid) {
      receipts.push(`ls:d2_latin_percussion_grid@bar${b}`);
      if (seededFilmUnit(seed, b, 940202) < 0.55) receipts.push(`ls:clave_subdivision@bar${b}`);
      if (b <= 4 && seededFilmUnit(seed, b, 940203) < 0.7) receipts.push(`ls:layer_percussion_first@bar${b}`);
    }

    if (seededFilmUnit(seed, b, 940301) < params.brassAttackDensity) {
      receipts.push(`ls:d3_brass_attack@bar${b}`);
      if (seededFilmUnit(seed, b, 940302) < 0.45) receipts.push(`ls:brass_stab@bar${b}`);
      else if (seededFilmUnit(seed, b, 940303) < 0.7) receipts.push(`ls:cup_mute_call@bar${b}`);
      else receipts.push(`ls:trombone_support@bar${b}`);
      if (b > tb * 0.65 && seededFilmUnit(seed, b, 940304) < 0.5) {
        receipts.push(`ls:brass_register_spread@bar${b}`);
      }
    }

    if (seededFilmUnit(seed, b, 940401) < params.modalAlteredHarmony) {
      out[b - 1] = toModalAltered(out[b - 1]!, seed, b, tonicPc);
      receipts.push(`ls:d4_modal_vamp@bar${b}`);
      if (seededFilmUnit(seed, b, 940402) < 0.35) receipts.push(`ls:tritone_exchange@bar${b}`);
      if (seededFilmUnit(seed, b, 940403) < 0.4) receipts.push(`ls:pedal_upper_structure@bar${b}`);
    }

    if (seededFilmUnit(seed, b, 940501) < params.motivicCompactness) {
      receipts.push(`ls:d5_motivic_cell@bar${b}`);
      if ((b - 1) % 2 === 0) receipts.push(`ls:cell_sequence@bar${b}`);
      if (seededFilmUnit(seed, b, 940502) < 0.4) receipts.push(`ls:repeated_note_entry@bar${b}`);
    }

    if (b >= 8 && seededFilmUnit(seed, b, 940601) < 0.68) {
      receipts.push(`ls:layer_combo_nucleus@bar${b}`);
    }
    if (b >= 12 && seededFilmUnit(seed, b, 940602) < 0.55) {
      receipts.push(`ls:layer_orchestral_reinforcement@bar${b}`);
    }
    if (seededFilmUnit(seed, b, 940603) < 0.7) {
      receipts.push(`ls:tension_additive_layer@bar${b}`);
    }

    if (b > 1 && looksDominantToTonic(out[b - 2]!, out[b - 1]!, tonicPc)) {
      out[b - 1] = toModalAltered(out[b - 1]!, seed, b, tonicPc);
      receipts.push(`ls:avoid_cadence@bar${b}`);
    }
  }

  for (let iiBar = 1; iiBar <= tb - 2; iiBar++) {
    if (!matchesMajorTwoFiveOne(out, iiBar, tonicPc, tb)) continue;
    if (isProtectedBar(iiBar, context) || isProtectedBar(iiBar + 1, context) || isProtectedBar(iiBar + 2, context)) {
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const bar = iiBar + k;
      out[bar - 1] = toModalAltered(out[bar - 1]!, seed, bar, tonicPc);
      receipts.push(`ls:avoid_cadence@bar${bar}`);
    }
  }

  /* Piece-final only: bias toward Schifrin-own vamp landings that already pass fBT. */
  biasLaloSchifrinFinalBarIdiomaticOpen(out, seed, tb, receipts, context, tonicPc);

  genMeta.laloSchifrinEffectiveHarmonyBars = out;
  genMeta.laloSchifrinDeviceReceipts = receipts;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece modal vamp / avoid_cadence devices untouched.
 */
function chordLooksDominantFamilyForFbtSchifrin(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Schifrin vamp landings that already pass fBT
 * (tonic-root m9/pedal primary; maj7(#11)/pedal secondary; sus4/pedal mid).
 * Not a forced jazz tonic cadence — modal-vamp / anti-cadential idiom preserved.
 */
function biasLaloSchifrinFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  tonicPc: number
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtSchifrin(sym)) return;

  const root = pitchClassToSharpName(tonicPc);
  const pedal = `/${root}`;
  const u = seededFilmUnit(seed, totalBars, 940701);

  let next: string;
  if (u < 0.5) next = `${root}m9${pedal}`;
  else if (u < 0.78) next = `${root}maj7(#11)${pedal}`;
  else next = `${root}sus4${pedal}`;

  out[idx] = next;
  receipts.push(`ls:final_open_bias@bar${totalBars}`);
}

export function finalizeLaloSchifrinMetadata(
  metadata: GenerationMetadata,
  acc: LaloSchifrinHarmonyAccumulator
): void {
  const flat = metadata.laloSchifrinDeviceReceipts ?? [];
  const params = metadata.laloSchifrinSliceParams ?? DEFAULT_LALO_SCHIFRIN_SLICE_PARAMS;
  const oddCount = oddMeterGrooveReceiptCount(flat);
  const percCount = latinPercussionGridReceiptCount(flat);

  metadata.laloSchifrinDiagnostics = {
    songwriterId: 'lalo_schifrin',
    barsConsidered: acc.barsConsidered,
    oddMeterTouches: oddCount,
    percussionTouches: percCount,
    brassTouches: flat.filter((r) => r.startsWith('ls:d3_brass')).length,
    modalTouches: flat.filter((r) => r.startsWith('ls:d4_modal')).length,
    motivicTouches: flat.filter((r) => r.startsWith('ls:d5_motivic')).length,
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.laloSchifrinSliceReceipt = [
    'Lalo Schifrin (groove film slice)',
    `omg=${params.oddMeterGroove.toFixed(2)}`,
    `lpg=${params.latinPercussionGrid.toFixed(2)}`,
    `bad=${params.brassAttackDensity.toFixed(2)}`,
    `odd≈${oddCount}`,
    `perc≈${percCount}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 6).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
