/**
 * Jack White — drone-centered riff Song Mode harmony slice (`jw:*` receipts).
 * Open-tuning tonic floor, dyad/fifth implied harmony, fused lead-rhythm riff cells.
 * Receipt prefix **`jw:*`** — John Williams film slice migrated to **`jwill:*`**.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type JackWhiteOpenTuning = 'open_a' | 'open_e' | 'open_d' | 'open_g';
export type JackWhiteDroneMode = 'simultaneous' | 'alternating' | 'layered';

/** Five Jack White drone-riff slice parameters (0–1). */
export interface JackWhiteSliceParams {
  tonicPersistenceRate: number;
  droneLogicMode: number;
  harmonyByImplication: number;
  riffCellEconomy: number;
  controlledIncompleteness: number;
}

export const DEFAULT_JACK_WHITE_SLICE_PARAMS: JackWhiteSliceParams = {
  tonicPersistenceRate: 0.82,
  droneLogicMode: 0.85,
  harmonyByImplication: 0.88,
  riffCellEconomy: 0.85,
  controlledIncompleteness: 0.8,
};

export interface JackWhiteDroneSection {
  index: number;
  startBar: number;
  endBar: number;
  openTuning: JackWhiteOpenTuning;
  tonicPc: number;
  tonicName: string;
  primaryGrip: string;
  riffCells: readonly string[];
  droneMode: JackWhiteDroneMode;
}

export interface JackWhiteDronePlan {
  sections: JackWhiteDroneSection[];
  sliceParams: JackWhiteSliceParams;
  tonicPersistBars: number[];
  droneLogicBars: number[];
  impliedHarmonyBars: number[];
  riffCellBars: number[];
  incompleteBars: number[];
  fusedPartBars: number[];
}

const OPEN_A_PC = 9;
const OPEN_E_PC = 4;
const OPEN_D_PC = 2;
const OPEN_G_PC = 7;

const OPEN_TUNING_PALETTES: Readonly<Record<JackWhiteOpenTuning, readonly string[]>> = {
  open_a: ['A5', 'E5', 'Asus2', 'E/A', 'A/E', 'D5/A', 'G5/A', 'A7sus4', 'E5/A', 'Asus4', 'A(no3)'],
  open_e: ['E5', 'B5', 'Esus4', 'A/E', 'E/B', 'G5/E', 'D5/E', 'E7sus4', 'B/E', 'Asus2/E', 'E(no3)'],
  open_d: ['D5', 'Dsus2', 'A/D', 'G5/D', 'D/F#', 'A5/D', 'D5/A'],
  open_g: ['G5', 'Gsus2', 'D/G', 'C5/G', 'G/D', 'Em/G', 'G5/D'],
};

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function slashBassPc(symbol: string): number | undefined {
  if (!symbol.includes('/')) return undefined;
  const tail = symbol.slice(symbol.indexOf('/') + 1).trim();
  const m = tail.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

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

function looksDyadFifthOrImplied(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return (
    /5|sus|no3|power|\(no3\)/.test(tl) ||
    /^[a-g][#b]?(\/|$)/.test(tl) && !/maj|min|m7|dim|aug|9|11|13|alt|#/.test(tl)
  );
}

function looksFullTriadWithThird(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/5|sus|no3|power|\(no3\)/.test(tl)) return false;
  if (/maj7|maj9|m7|min7|dim|aug|alt|#9|#11|b13|ø/.test(tl)) return true;
  return /^[a-g][#b]?m?$/.test(tl) || /^[a-g][#b]?maj$/.test(tl);
}

function looksRichTertianProgression(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /maj7|maj9|m9|m11|13|alt|#9|#11|b13|dim7|ø7/.test(tl);
}

function looksHendrixModalEmbellishment(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /#9|#11|b13|7alt|9\+|aug|maj7#11|13b9/.test(tl);
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/sus|5|no3/.test(tl);
}

function pickOpenTuning(seed: number, sectionIndex: number, tonicPc: number): JackWhiteOpenTuning {
  const u = seededUnit(seed, sectionIndex, 991101);
  if (u < 0.42) return 'open_a';
  if (u < 0.78) return 'open_e';
  if (u < 0.9) return 'open_d';
  if (tonicPc === OPEN_G_PC || tonicPc === OPEN_D_PC) {
    return tonicPc === OPEN_G_PC ? 'open_g' : 'open_d';
  }
  return 'open_g';
}

function pickDroneMode(seed: number, sectionIndex: number): JackWhiteDroneMode {
  const u = seededUnit(seed, sectionIndex, 991102);
  if (u < 0.34) return 'simultaneous';
  if (u < 0.67) return 'alternating';
  return 'layered';
}

function sectionSpanBars(seed: number, sectionIndex: number, riffCellEconomy: number): number {
  const u = seededUnit(seed, sectionIndex, 991201);
  if (riffCellEconomy >= 0.82) {
    if (u < 0.35) return 8;
    if (u < 0.65) return 4;
    return 2;
  }
  if (u < 0.5) return 4;
  return 2;
}

function gripForSection(tuning: JackWhiteOpenTuning, seed: number, sectionIndex: number, tonicPc: number): string {
  const palette = OPEN_TUNING_PALETTES[tuning];
  const tonicName = pitchClassToSharpName(tonicPc);
  const tonicMatch = palette.find((c) => {
    const root = harmonyRootPc(c);
    const bass = slashBassPc(c);
    return root === tonicPc || bass === tonicPc || stemOnly(c).startsWith(tonicName);
  });
  if (tonicMatch && seededUnit(seed, sectionIndex, 991301) < 0.62) return tonicMatch;
  const u = seededUnit(seed, sectionIndex, 991302);
  return palette[Math.floor(u * palette.length) % palette.length]!;
}

function riffCellsForSection(
  tuning: JackWhiteOpenTuning,
  primary: string,
  seed: number,
  sectionIndex: number
): string[] {
  const palette = OPEN_TUNING_PALETTES[tuning];
  const u = seededUnit(seed, sectionIndex, 991303);
  const cellCount = u < 0.55 ? 2 : 1;
  const cells: string[] = [primary];
  for (let i = 1; i < cellCount; i++) {
    const alt = palette[(palette.indexOf(primary) + i + 1) % palette.length]!;
    if (!cells.includes(alt)) cells.push(alt);
  }
  return cells;
}

function tonicPcForTuning(tuning: JackWhiteOpenTuning, fallback: number): number {
  switch (tuning) {
    case 'open_a':
      return OPEN_A_PC;
    case 'open_e':
      return OPEN_E_PC;
    case 'open_d':
      return OPEN_D_PC;
    case 'open_g':
      return OPEN_G_PC;
    default:
      return fallback;
  }
}

function symbolCarriesTonicPc(symbol: string, tonicPc: number): boolean {
  const root = harmonyRootPc(symbol);
  const bass = slashBassPc(symbol);
  return root === tonicPc || bass === tonicPc;
}

function stripToImpliedHarmony(symbol: string, tuning: JackWhiteOpenTuning, tonicPc: number): string {
  const palette = OPEN_TUNING_PALETTES[tuning];
  const match = palette.find((c) => looksDyadFifthOrImplied(c) && symbolCarriesTonicPc(c, tonicPc));
  if (match) return match;
  const tonicName = pitchClassToSharpName(tonicPc);
  return `${tonicName}5`;
}

export function resolveJackWhiteSliceParams(genMeta: GenerationMetadata | undefined): JackWhiteSliceParams {
  const fromMeta = genMeta?.jackWhiteSliceParams;
  if (!fromMeta) return { ...DEFAULT_JACK_WHITE_SLICE_PARAMS };
  const d = DEFAULT_JACK_WHITE_SLICE_PARAMS;
  return {
    tonicPersistenceRate: clamp01(fromMeta.tonicPersistenceRate ?? d.tonicPersistenceRate),
    droneLogicMode: clamp01(fromMeta.droneLogicMode ?? d.droneLogicMode),
    harmonyByImplication: clamp01(fromMeta.harmonyByImplication ?? d.harmonyByImplication),
    riffCellEconomy: clamp01(fromMeta.riffCellEconomy ?? d.riffCellEconomy),
    controlledIncompleteness: clamp01(fromMeta.controlledIncompleteness ?? d.controlledIncompleteness),
  };
}

export function buildJackWhiteDronePlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: JackWhiteSliceParams = DEFAULT_JACK_WHITE_SLICE_PARAMS
): JackWhiteDronePlan {
  const sections: JackWhiteDroneSection[] = [];
  const tonicPersistBars: number[] = [];
  const droneLogicBars: number[] = [];
  const impliedHarmonyBars: number[] = [];
  const riffCellBars: number[] = [];
  const incompleteBars: number[] = [];
  const fusedPartBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    let span = Math.min(sectionSpanBars(seed, idx, params.riffCellEconomy), remaining);
    if (remaining - span > 0 && remaining - span < 2) span = remaining;
    const endBar = bar + span - 1;
    const openTuning = pickOpenTuning(seed, idx, tonicPc);
    const sectionTonicPc = tonicPcForTuning(openTuning, tonicPc);
    const tonicName = pitchClassToSharpName(sectionTonicPc);
    const primaryGrip = gripForSection(openTuning, seed, idx, sectionTonicPc);
    const riffCells = riffCellsForSection(openTuning, primaryGrip, seed, idx);
    const droneMode = pickDroneMode(seed, idx);

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      openTuning,
      tonicPc: sectionTonicPc,
      tonicName,
      primaryGrip,
      riffCells,
      droneMode,
    });

    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 991601) < params.tonicPersistenceRate * 0.78) {
        tonicPersistBars.push(b);
      }
      if (seededUnit(seed, b, 991602) < params.droneLogicMode * 0.72) {
        droneLogicBars.push(b);
      }
      if (seededUnit(seed, b, 991603) < params.harmonyByImplication * 0.75) {
        impliedHarmonyBars.push(b);
      }
      if (seededUnit(seed, b, 991604) < params.riffCellEconomy * 0.7) {
        riffCellBars.push(b);
      }
      if (seededUnit(seed, b, 991605) < params.controlledIncompleteness * 0.68) {
        incompleteBars.push(b);
      }
      if (seededUnit(seed, b, 991606) < 0.58) {
        fusedPartBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    tonicPersistBars,
    droneLogicBars,
    impliedHarmonyBars,
    riffCellBars,
    incompleteBars,
    fusedPartBars,
  };
}

export function sectionForBar(plan: JackWhiteDronePlan, bar: number): JackWhiteDroneSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function riffCellAtBar(sec: JackWhiteDroneSection, bar: number): string {
  const rel = bar - sec.startBar;
  const cellLen = sec.riffCells.length <= 1 ? 2 : 1;
  const cellIndex = Math.floor(rel / cellLen) % sec.riffCells.length;
  return sec.riffCells[cellIndex] ?? sec.primaryGrip;
}

function applyJackWhiteDroneLayers(
  out: string[],
  plan: JackWhiteDronePlan,
  seed: number,
  receipts: string[],
  context: CompositionContext
): void {
  const p = plan.sliceParams;

  for (const sec of plan.sections) {
    receipts.push(
      `jw:section@${sec.startBar}-${sec.endBar}:tuning=${sec.openTuning};tonic=${sec.tonicName};drone=${sec.droneMode};cells=${sec.riffCells.length}`
    );
    let held = sec.primaryGrip;

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = riffCellAtBar(sec, bar);

      if (bar === sec.startBar) {
        sym = sec.primaryGrip;
        held = sym;
        receipts.push(`jw:open_tuning@${bar}:${sec.openTuning}`);
      }

      if (
        plan.tonicPersistBars.includes(bar) ||
        seededUnit(seed, bar, 991701) < p.tonicPersistenceRate * 0.76
      ) {
        if (!symbolCarriesTonicPc(sym, sec.tonicPc)) {
          sym = stripToImpliedHarmony(sym, sec.openTuning, sec.tonicPc);
        }
        receipts.push(`jw:tonic_persist@${bar}`);
      }

      if (plan.droneLogicBars.includes(bar) || seededUnit(seed, bar, 991702) < p.droneLogicMode * 0.7) {
        if (sec.droneMode === 'simultaneous') {
          receipts.push(`jw:drone_sim@${bar}`);
        } else if (sec.droneMode === 'alternating') {
          receipts.push(`jw:drone_alt@${bar}`);
        } else {
          receipts.push(`jw:drone_layer@${bar}`);
        }
        if (seededUnit(seed, bar, 991703) < 0.42) {
          receipts.push(`jw:slide_harmonic@${bar}`);
        }
      }

      if (
        looksFullTriadWithThird(sym) ||
        looksRichTertianProgression(sym) ||
        seededUnit(seed, bar, 991704) > 1 - p.harmonyByImplication * 0.82
      ) {
        sym = stripToImpliedHarmony(sym, sec.openTuning, sec.tonicPc);
        receipts.push(`jw:implied_harm@${bar}`);
      }

      if (looksHendrixModalEmbellishment(sym)) {
        sym = stripToImpliedHarmony(sym, sec.openTuning, sec.tonicPc);
        receipts.push(`jw:neg_hendrix@${bar}`);
      }

      if (looksFunctionalTwoFive(sym)) {
        sym = sec.primaryGrip;
        receipts.push(`jw:strip_functional@${bar}`);
      }

      if (plan.riffCellBars.includes(bar) || seededUnit(seed, bar, 991705) < p.riffCellEconomy * 0.68) {
        const rel = bar - sec.startBar;
        if (rel % 2 === 0) {
          receipts.push(`jw:cell_repeat@${bar}`);
        } else {
          receipts.push(`jw:riff_cell@${bar}`);
        }
      }

      if (plan.incompleteBars.includes(bar) || seededUnit(seed, bar, 991706) < p.controlledIncompleteness * 0.65) {
        if (!symbolCarriesTonicPc(sym, sec.tonicPc)) {
          sym = stripToImpliedHarmony(sym, sec.openTuning, sec.tonicPc);
        }
        receipts.push(`jw:incomplete@${bar}`);
        receipts.push(`jw:tonic_anchor@${bar}`);
      }

      if (plan.fusedPartBars.includes(bar) || seededUnit(seed, bar, 991707) < 0.55) {
        receipts.push(`jw:fused_part@${bar}`);
        receipts.push(`jw:attack_phrase@${bar}`);
      }

      if (sym !== held && seededUnit(seed, bar, 991708) < 0.35) {
        held = sym;
      }

      out[i] = sym;
    }
  }
}

export interface JackWhiteHarmonyAccumulator {
  barsConsidered: number;
  tonicPersistTouches: number;
  droneLogicTouches: number;
  impliedHarmonyTouches: number;
  riffCellTouches: number;
  incompleteTouches: number;
  fusedPartTouches: number;
  fullTriadTouches: number;
  hendrixBleedTouches: number;
}

export function createJackWhiteHarmonyAccumulator(): JackWhiteHarmonyAccumulator {
  return {
    barsConsidered: 0,
    tonicPersistTouches: 0,
    droneLogicTouches: 0,
    impliedHarmonyTouches: 0,
    riffCellTouches: 0,
    incompleteTouches: 0,
    fusedPartTouches: 0,
    fullTriadTouches: 0,
    hendrixBleedTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: JackWhiteHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  if (looksFullTriadWithThird(c)) acc.fullTriadTouches++;
  if (looksHendrixModalEmbellishment(c)) acc.hendrixBleedTouches++;
}

export function accumulateJackWhiteHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JackWhiteHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function dyadFifthDominanceRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksDyadFifthOrImplied(b)).length / bars.length;
}

export function fullTriadRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksFullTriadWithThird(b)).length / bars.length;
}

export function minJackWhiteSectionSpan(plan: JackWhiteDronePlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
}

export function rateFromReceipts(receipts: readonly string[], prefix: string, bars: number): number {
  if (bars <= 0) return 0;
  const touches = receipts.filter((r) => r.startsWith(prefix)).length;
  return Math.min(1, touches / bars);
}

export function precomputeJackWhiteEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? OPEN_E_PC;
  const params = resolveJackWhiteSliceParams(genMeta);
  genMeta.jackWhiteSliceParams = params;

  const plan = buildJackWhiteDronePlan(seed, tb, tonicPc, params);
  genMeta.jackWhiteDronePlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `jw:params=tpr:${params.tonicPersistenceRate.toFixed(2)};dlm:${params.droneLogicMode.toFixed(2)};hbi:${params.harmonyByImplication.toFixed(2)};rce:${params.riffCellEconomy.toFixed(2)};ci:${params.controlledIncompleteness.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyJackWhiteDroneLayers(out, plan, seed, receipts, context);

  genMeta.jackWhiteEffectiveHarmonyBars = out;
  genMeta.jackWhiteDeviceReceipts = receipts;
}

export function finalizeJackWhiteMetadata(
  metadata: GenerationMetadata,
  acc: JackWhiteHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.jackWhiteDeviceReceipts ?? [])];
  const plan = metadata.jackWhiteDronePlan;
  const params = metadata.jackWhiteSliceParams ?? DEFAULT_JACK_WHITE_SLICE_PARAMS;
  const bars = acc.barsConsidered || flat.length || 32;

  acc.tonicPersistTouches = flat.filter((r) => r.startsWith('jw:tonic_persist@')).length;
  acc.droneLogicTouches = flat.filter(
    (r) => r.startsWith('jw:drone_sim@') || r.startsWith('jw:drone_alt@') || r.startsWith('jw:drone_layer@')
  ).length;
  acc.impliedHarmonyTouches = flat.filter((r) => r.startsWith('jw:implied_harm@')).length;
  acc.riffCellTouches = flat.filter(
    (r) => r.startsWith('jw:riff_cell@') || r.startsWith('jw:cell_repeat@')
  ).length;
  acc.incompleteTouches = flat.filter((r) => r.startsWith('jw:incomplete@')).length;
  acc.fusedPartTouches = flat.filter((r) => r.startsWith('jw:fused_part@')).length;
  acc.hendrixBleedTouches = flat.filter((r) => r.startsWith('jw:neg_hendrix@')).length;

  const tonicPersistence = rateFromReceipts(flat, 'jw:tonic_persist@', bars);
  const droneLogic = rateFromReceipts(flat, 'jw:drone_sim@', bars) +
    rateFromReceipts(flat, 'jw:drone_alt@', bars) +
    rateFromReceipts(flat, 'jw:drone_layer@', bars);
  const effBars = metadata.jackWhiteEffectiveHarmonyBars ?? [];
  const harmonyByImplication = Math.max(
    rateFromReceipts(flat, 'jw:implied_harm@', bars),
    dyadFifthDominanceRate(effBars)
  );
  const riffCellEconomy = Math.min(
    1,
    rateFromReceipts(flat, 'jw:cell_repeat@', bars) + rateFromReceipts(flat, 'jw:riff_cell@', bars)
  );
  const controlledIncompleteness = rateFromReceipts(flat, 'jw:incomplete@', bars);
  const leadRhythmFusion = Math.min(
    1,
    rateFromReceipts(flat, 'jw:fused_part@', bars) + rateFromReceipts(flat, 'jw:attack_phrase@', bars) * 0.5
  );

  metadata.jackWhiteDiagnostics = {
    songwriterId: 'jack_white',
    barsConsidered: acc.barsConsidered,
    tonicPersistTouches: acc.tonicPersistTouches,
    droneLogicTouches: acc.droneLogicTouches,
    impliedHarmonyTouches: acc.impliedHarmonyTouches,
    riffCellTouches: acc.riffCellTouches,
    incompleteTouches: acc.incompleteTouches,
    fusedPartTouches: acc.fusedPartTouches,
    fullTriadTouches: acc.fullTriadTouches,
    hendrixBleedTouches: acc.hendrixBleedTouches,
    minSectionSpan: minJackWhiteSectionSpan(plan),
    sliceParams: { ...params },
    tonicPersistence,
    droneLogic: Math.min(1, droneLogic),
    harmonyByImplication,
    riffCellEconomy,
    controlledIncompleteness,
    leadRhythmFusion,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.jackWhiteSliceReceipt = [
    'Jack White (drone-centered riff slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `tpr=${params.tonicPersistenceRate.toFixed(2)}`,
    `dlm=${params.droneLogicMode.toFixed(2)}`,
    `dyad≈${acc.impliedHarmonyTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
