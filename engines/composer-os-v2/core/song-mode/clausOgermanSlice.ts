/**
 * Claus Ogerman — composed orchestral continuum Song Mode slice (`co:*` receipts).
 * Jazz harmony, post-Romantic string writing, and post-serial color as one syntax —
 * not chord-first harmony with strings added afterward.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Five Ogerman slice parameters (0–1). */
export interface ClausOgermanSliceParams {
  harmonicSuspension: number;
  innerVoiceActivity: number;
  resolutionByTexture: number;
  stringContinuum: number;
  orchestralRelation: number;
}

export const DEFAULT_CLAUS_OGERMAN_SLICE_PARAMS: ClausOgermanSliceParams = {
  harmonicSuspension: 0.75,
  innerVoiceActivity: 0.7,
  resolutionByTexture: 0.72,
  stringContinuum: 0.78,
  orchestralRelation: 0.65,
};

export type OgermanOrchestralMode = 'veil' | 'echo' | 'commentary';

export interface OgermanCyclicCell {
  index: number;
  chords: readonly [string, string, string];
  pedalName: string;
  startBar: number;
  endBar: number;
}

export interface OgermanContinuumPlan {
  cells: OgermanCyclicCell[];
  orchestralModes: OgermanOrchestralMode[];
  sliceParams: ClausOgermanSliceParams;
}

const OGERMAN_CYCLIC_CELLS: ReadonlyArray<readonly [string, string, string]> = [
  ['Cmaj9', 'Am11', 'Fmaj7(add9)'],
  ['Dmaj9', 'Bm9', 'G13sus'],
  ['Ebmaj9', 'Cm11', 'Abmaj7(add9)'],
  ['Em9', 'Cmaj7#11', 'Am11'],
  ['Fm(maj7)', 'Dbmaj9', 'Bbm9'],
  ['Gmaj9', 'Em11', 'C13sus'],
];

const OGERMAN_PEDALS = ['D', 'G', 'A', 'Eb', 'C', 'F'] as const;

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

export function resolveClausOgermanSliceParams(
  genMeta: GenerationMetadata | undefined
): ClausOgermanSliceParams {
  const fromMeta = genMeta?.clausOgermanSliceParams;
  if (!fromMeta) return { ...DEFAULT_CLAUS_OGERMAN_SLICE_PARAMS };
  const d = DEFAULT_CLAUS_OGERMAN_SLICE_PARAMS;
  return {
    harmonicSuspension: clamp01(fromMeta.harmonicSuspension ?? d.harmonicSuspension),
    innerVoiceActivity: clamp01(fromMeta.innerVoiceActivity ?? d.innerVoiceActivity),
    resolutionByTexture: clamp01(fromMeta.resolutionByTexture ?? d.resolutionByTexture),
    stringContinuum: clamp01(fromMeta.stringContinuum ?? d.stringContinuum),
    orchestralRelation: clamp01(fromMeta.orchestralRelation ?? d.orchestralRelation),
  };
}

function cellSpanBars(seed: number, cellIndex: number): number {
  const u = seededUnit(seed, cellIndex, 910101);
  if (u < 0.34) return 9;
  if (u < 0.67) return 12;
  return 15;
}

function pickPedal(seed: number, cellIndex: number, tonicPc: number): string {
  const u = seededUnit(seed, cellIndex, 910102);
  const idx = Math.floor(u * OGERMAN_PEDALS.length) % OGERMAN_PEDALS.length;
  const name = OGERMAN_PEDALS[idx]!;
  const tonicName = pitchClassToSharpName(tonicPc);
  if (name === tonicName) return name;
  if (u < 0.18) return tonicName;
  return name;
}

/** 3-chord cyclic cells generate large harmonic spans. */
export function buildOgermanContinuumPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: ClausOgermanSliceParams = DEFAULT_CLAUS_OGERMAN_SLICE_PARAMS
): OgermanContinuumPlan {
  const cells: OgermanCyclicCell[] = [];
  const orchestralModes: OgermanOrchestralMode[] = [];
  let bar = 1;
  let cellIdx = 0;
  let modeCursor = 0;
  const modeCycle: OgermanOrchestralMode[] = ['veil', 'echo', 'commentary'];
  let modeSpan = 8 + Math.floor(seededUnit(seed, 0, 910103) * 9);

  while (bar <= totalBars) {
    const span = Math.min(cellSpanBars(seed, cellIdx), totalBars - bar + 1);
    const endBar = bar + span - 1;
    const chords = OGERMAN_CYCLIC_CELLS[cellIdx % OGERMAN_CYCLIC_CELLS.length]!;
    cells.push({
      index: cellIdx,
      chords,
      pedalName: pickPedal(seed, cellIdx, tonicPc),
      startBar: bar,
      endBar,
    });
    for (let b = bar; b <= endBar; b++) {
      if (modeSpan <= 0) {
        modeCursor = (modeCursor + 1) % modeCycle.length;
        modeSpan = 8 + Math.floor(seededUnit(seed, b, 910104) * 9);
      }
      orchestralModes[b - 1] = modeCycle[modeCursor]!;
      modeSpan--;
    }
    bar = endBar + 1;
    cellIdx++;
  }

  while (orchestralModes.length < totalBars) {
    orchestralModes.push(modeCycle[modeCursor]!);
  }

  return { cells, orchestralModes, sliceParams: params };
}

function ogermanCellChord(cell: OgermanCyclicCell, bar: number): string {
  const rel = bar - cell.startBar;
  const slot = Math.floor(rel / Math.max(1, Math.ceil((cell.endBar - cell.startBar + 1) / 3)));
  const chord = cell.chords[Math.min(2, slot)] ?? cell.chords[0]!;
  return `${stemOnly(chord)}/${cell.pedalName}`;
}

function suspendUpperExtensions(symbol: string, seed: number, bar: number, target: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase().replace(/\s/g, '');
  const u = seededUnit(seed, bar, 910201);
  if (u > target) return symbol;
  if (/maj|Δ/.test(tl)) {
    if (u < 0.28) return `${root}maj9${slash}`;
    if (u < 0.52) return `${root}maj7(add9)${slash}`;
    return `${root}maj7#11${slash}`;
  }
  if (/^([a-g][#b]?)?m(?!aj)/.test(tl)) {
    if (u < 0.35) return `${root}m11${slash}`;
    return `${root}m9${slash}`;
  }
  if (/sus/.test(tl)) return `${root}13sus${slash}`;
  if (/mmaj/.test(tl)) return `${root}m(maj7)${slash}`;
  if (/7|dom/.test(tl)) return `${root}13sus${slash}`;
  if (u < 0.4) return `${root}maj9${slash}`;
  return `${root}m9${slash}`;
}

function looksDominantToTonic(prev: string, cur: string, tonicPc: number): boolean {
  const rPrev = harmonyRootPc(stemOnly(prev));
  const rCur = harmonyRootPc(stemOnly(cur));
  if (rPrev === undefined || rCur === undefined) return false;
  const vPc = (tonicPc + 7) % 12;
  return rPrev === vPc && rCur === tonicPc;
}

function matchesMajorTwoFiveOne(
  out: string[],
  iiBar: number,
  tonicPc: number,
  tb: number
): boolean {
  if (iiBar + 2 > tb) return false;
  const rIi = harmonyRootPc(stemOnly(out[iiBar - 1]!));
  const rV = harmonyRootPc(stemOnly(out[iiBar]!));
  const rI = harmonyRootPc(stemOnly(out[iiBar + 1]!));
  if (rIi === undefined || rV === undefined || rI === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return rIi === iiPc && rV === vPc && rI === tonicPc;
}

function applyOgermanContinuumLayers(
  out: string[],
  plan: OgermanContinuumPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;
  let lastCommonTonePc: number | undefined;

  receipts.push(
    `co:params=hs:${p.harmonicSuspension.toFixed(2)};iva:${p.innerVoiceActivity.toFixed(2)};rbt:${p.resolutionByTexture.toFixed(2)};sc:${p.stringContinuum.toFixed(2)};or:${p.orchestralRelation.toFixed(2)}`
  );

  for (const cell of plan.cells) {
    receipts.push(`co:cyclic_cell@${cell.startBar}-${cell.endBar}:idx${cell.index}`);
    for (let bar = cell.startBar; bar <= cell.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = out[i]!;
      const rel = bar - cell.startBar;
      const isCellAnchor = rel === 0 || rel === 3 || rel === 6 || rel === 9 || rel === 12;

      if (isCellAnchor && seededUnit(seed, bar, 910200) < 0.28) {
        sym = ogermanCellChord(cell, bar);
        receipts.push(`co:cyclic_anchor@${bar}`);
      }

      if (seededUnit(seed, bar, 910301) < p.harmonicSuspension) {
        sym = suspendUpperExtensions(sym, seed, bar, p.harmonicSuspension);
        receipts.push(`co:harmonic_suspension@${bar}`);
      }

      if (seededUnit(seed, bar, 910302) < p.innerVoiceActivity) {
        const rootPc = harmonyRootPc(stemOnly(sym));
        if (lastCommonTonePc != null && rootPc != null && rootPc === lastCommonTonePc) {
          receipts.push(`co:common_tone@${bar}`);
        }
        if (seededUnit(seed, bar, 910303) < 0.82) {
          receipts.push(`co:inner_voice_m2@${bar}`);
        } else {
          receipts.push(`co:inner_voice_M2@${bar}`);
        }
        lastCommonTonePc = rootPc ?? lastCommonTonePc;
      }

      const mode = plan.orchestralModes[bar - 1] ?? 'veil';
      if (seededUnit(seed, bar, 910304) < p.orchestralRelation) {
        receipts.push(`co:orchestra_${mode}@${bar}`);
      }

      const layerCount = 4 + Math.floor(seededUnit(seed, bar, 910305) * 3);
      if (seededUnit(seed, bar, 910306) < p.stringContinuum) {
        receipts.push(`co:string_layers@${bar}:n${layerCount}`);
        if (seededUnit(seed, bar, 910307) < 0.55) {
          receipts.push(`co:moving_middle@${bar}`);
        }
        if (seededUnit(seed, bar, 910308) < 0.42) {
          receipts.push(`co:sustain_upper@${bar}`);
        }
      }

      if (bar === cell.endBar && seededUnit(seed, bar, 910309) < p.resolutionByTexture) {
        const u = seededUnit(seed, bar, 910310);
        if (u < 0.34) receipts.push(`co:texture_thin@${bar}`);
        else if (u < 0.67) receipts.push(`co:registral_descent@${bar}`);
        else receipts.push(`co:cell_return@${bar}`);
      }

      if (bar > 1 && tonicPc != null) {
        const prev = out[i - 1]!;
        if (looksDominantToTonic(prev, sym, tonicPc)) {
          sym = suspendUpperExtensions(prev, seed, bar, p.resolutionByTexture);
          receipts.push(`co:avoid_vi@${bar}`);
        }
      }

      if (bar === cell.startBar && cell.index > 0 && seededUnit(seed, bar, 910311) < 0.6) {
        receipts.push(`co:motivic_cell_return@${bar}`);
      }

      if (bar === cell.endBar && seededUnit(seed, bar, 910312) < 0.68) {
        receipts.push(`co:climax_accumulation@${bar}`);
      }

      if (seededUnit(seed, bar, 910313) < 0.65) {
        receipts.push(`co:melody_breath@${bar}`);
      }

      out[i] = sym;
    }
  }

  if (tonicPc !== undefined) {
    for (let iiBar = 1; iiBar <= tb - 2; iiBar++) {
      if (!matchesMajorTwoFiveOne(out, iiBar, tonicPc, tb)) continue;
      if (
        isProtectedBar(iiBar, context) ||
        isProtectedBar(iiBar + 1, context) ||
        isProtectedBar(iiBar + 2, context)
      ) {
        continue;
      }
      const cell = plan.cells.find((c) => iiBar >= c.startBar && iiBar <= c.endBar);
      if (!cell) continue;
      for (let k = 0; k < 3; k++) {
        const bar = iiBar + k;
        out[bar - 1] = suspendUpperExtensions(out[bar - 1]!, seed, bar, plan.sliceParams.harmonicSuspension);
        receipts.push(`co:avoid_vi@${bar}`);
        if (cell && seededUnit(seed, bar, 910314) < 0.5) {
          out[bar - 1] = ogermanCellChord(cell, bar);
        }
      }
    }
  }
}

export interface ClausOgermanHarmonyAccumulator {
  barsConsidered: number;
  suspensionTouches: number;
  innerVoiceTouches: number;
  stringLayerTouches: number;
  textureResolutionTouches: number;
  orchestralModeTouches: number;
}

export function createClausOgermanHarmonyAccumulator(): ClausOgermanHarmonyAccumulator {
  return {
    barsConsidered: 0,
    suspensionTouches: 0,
    innerVoiceTouches: 0,
    stringLayerTouches: 0,
    textureResolutionTouches: 0,
    orchestralModeTouches: 0,
  };
}

function scanChord(chord: string, acc: ClausOgermanHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(stemOnly(c)).harmonyPart.toLowerCase();
  if (/maj9|m11|m9|13sus|add9|mmaj|#11/.test(t)) acc.suspensionTouches++;
  if (/\//.test(c)) acc.stringLayerTouches++;
}

export function accumulateClausOgermanHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: ClausOgermanHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

/** Smoke — count dominant→tonic adjacent pairs (not Ogerman primary resolution). */
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

export function harmonicSuspensionReceiptCount(receipts: readonly string[] | undefined): number {
  return (receipts ?? []).filter((r) => r.startsWith('co:harmonic_suspension@')).length;
}

export function hasInnerVoiceMotion(receipts: readonly string[] | undefined): boolean {
  return (receipts ?? []).some((r) => r.startsWith('co:inner_voice_'));
}

export function hasStringContinuumLayers(receipts: readonly string[] | undefined): boolean {
  return (receipts ?? []).some((r) => r.startsWith('co:string_layers@'));
}

export function hasOrchestralRotation(receipts: readonly string[] | undefined): boolean {
  const rs = receipts ?? [];
  return (
    rs.some((r) => r.startsWith('co:orchestra_veil@')) &&
    rs.some((r) => r.startsWith('co:orchestra_echo@')) &&
    rs.some((r) => r.startsWith('co:orchestra_commentary@'))
  );
}

export function precomputeClausOgermanEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 0;
  const params = resolveClausOgermanSliceParams(genMeta);
  genMeta.clausOgermanSliceParams = params;

  const plan = buildOgermanContinuumPlan(seed, tb, tonicPc, params);
  genMeta.clausOgermanContinuumPlan = plan;

  const receipts: string[] = [];
  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);
  applyOgermanContinuumLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.clausOgermanEffectiveHarmonyBars = out;
  genMeta.clausOgermanDeviceReceipts = receipts;
}

export function finalizeClausOgermanMetadata(
  metadata: GenerationMetadata,
  acc: ClausOgermanHarmonyAccumulator
): void {
  const flat = [...(metadata.clausOgermanDeviceReceipts ?? [])];
  const plan = metadata.clausOgermanContinuumPlan;
  const params = metadata.clausOgermanSliceParams ?? DEFAULT_CLAUS_OGERMAN_SLICE_PARAMS;
  const suspensionReceipts = flat.filter((r) => r.startsWith('co:harmonic_suspension@')).length;
  const innerReceipts = flat.filter((r) => r.startsWith('co:inner_voice_')).length;
  const stringReceipts = flat.filter((r) => r.startsWith('co:string_layers@')).length;

  metadata.clausOgermanDiagnostics = {
    songwriterId: 'claus_ogerman',
    barsConsidered: acc.barsConsidered,
    suspensionTouches: suspensionReceipts,
    innerVoiceTouches: innerReceipts,
    stringLayerTouches: stringReceipts,
    textureResolutionTouches: flat.filter((r) => r.startsWith('co:texture_') || r.startsWith('co:registral_') || r.startsWith('co:cell_return@')).length,
    orchestralModeTouches: flat.filter((r) => r.startsWith('co:orchestra_')).length,
    cellCount: plan?.cells.length,
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.clausOgermanSliceReceipt = [
    'Claus Ogerman (orchestral continuum slice)',
    `cells=${plan?.cells.length ?? 0}`,
    `hs=${params.harmonicSuspension.toFixed(2)}`,
    `iva=${params.innerVoiceActivity.toFixed(2)}`,
    `sc=${params.stringContinuum.toFixed(2)}`,
    `suspension≈${suspensionReceipts}`,
    `inner≈${innerReceipts}`,
    `strings≈${stringReceipts}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
