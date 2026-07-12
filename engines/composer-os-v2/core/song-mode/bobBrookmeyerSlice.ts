/**
 * Bob Brookmeyer — line-first quartal counterpoint, pitch-module episodes (`brk:*` receipts).
 */

import type { CompositionContext, GenerationMetadata, BrookmeyerPeriodMode } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';
import {
  buildBrookmeyerEpisodePlan,
  episodeForBrookmeyerBar,
  type BrookmeyerEpisodePlan,
} from './brookmeyerEpisodeTypes';

export type { BrookmeyerPeriodMode } from '../compositionContext';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const SLICE_PARAMS = {
  harmonicRhythmMinBars: 2,
  climaxTailMinBars: 2,
} as const;

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function harmonyRootPc(sym: string): number | undefined {
  const hp = parseChordSymbol(sym).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

function deriveActivePitchModule(seed: number): [number, number, number] {
  const a = Math.abs(seed) % 12;
  const b = (a + 3 + ((Math.abs(seed) >> 4) % 5)) % 12;
  const c = (a + 7 + ((Math.abs(seed) >> 8) % 4)) % 12;
  if (b === a || c === a || c === b) return deriveActivePitchModule(seed + 131071);
  return [a, b, c];
}

function pcTripletToNames(pcs: [number, number, number]): string[] {
  return pcs.map((p) => PC_NAMES[((p % 12) + 12) % 12]!);
}

export function resolveBrookmeyerPeriodMode(
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): BrookmeyerPeriodMode {
  const ctx = context.brookmeyerPeriodMode;
  if (ctx === 'early_brookmeyer' || ctx === 'late_brookmeyer') return ctx;
  const meta = genMeta.brookmeyerPeriodMode as BrookmeyerPeriodMode | undefined;
  if (meta === 'early_brookmeyer' || meta === 'late_brookmeyer') return meta;
  return Math.abs(context.seed) % 2 === 0 ? 'early_brookmeyer' : 'late_brookmeyer';
}

function tintChordTowardModule(sym: string, modulePcs: [number, number, number], bar: number): string {
  const rootPc = harmonyRootPc(sym);
  if (rootPc === undefined) return sym;
  const targetPc = modulePcs[bar % 3]!;
  if (rootPc === targetPc) return sym;
  return replaceChordRoot(sym, PC_NAMES[targetPc]!);
}

function looksDominantSurface(sym: string): boolean {
  const hp = parseChordSymbol(sym).harmonyPart.toLowerCase();
  if (/dim|ø|maj|Δ|aug|sus|^n\.c\.|^nc$/i.test(sym)) return false;
  if (/m7|m9|m11|maj7|mmaj/.test(hp)) return false;
  return /\d/.test(hp) && /7|9|11|13|alt/.test(hp);
}

function looksTonicMajorLocal(sym: string): boolean {
  const hp = parseChordSymbol(sym).harmonyPart.toLowerCase();
  return /maj|^Δ/.test(hp) || /^[a-g](#|b)?$/i.test(hp.trim());
}

function antiFunctionalColour(sym: string, seed: number, bar: number): string {
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  if (seededUnit(seed, bar, 884402) < 0.5) {
    return replaceChordRoot(sym, PC_NAMES[(pc + 6) % 12]!);
  }
  const r = PC_NAMES[pc]!;
  return `${r}sus13`;
}

function climaxClusterSymbol(seed: number, bar: number): string {
  const pc = (seed + bar * 5) % 12;
  const r = PC_NAMES[pc]!;
  return seededUnit(seed, bar, 771009) < 0.5 ? `${r}13(#11)` : `${r}m9(b5)`;
}

export function isSongwriterBobBrookmeyer(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bob_brookmeyer' } {
  return genMeta?.songwriterStyleId === 'bob_brookmeyer';
}

export interface BobBrookmeyerHarmonyAccumulator {
  barsConsidered: number;
  quartalTouches: number;
  alteredTouches: number;
}

export function createBobBrookmeyerHarmonyAccumulator(): BobBrookmeyerHarmonyAccumulator {
  return { barsConsidered: 0, quartalTouches: 0, alteredTouches: 0 };
}

function scanChord(chord: string, acc: BobBrookmeyerHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const tl = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/quartal|sus/.test(tl)) acc.quartalTouches++;
  if (/alt|#11|ø|m7\(b5\)/.test(tl)) acc.alteredTouches++;
}

export function accumulateBobBrookmeyerHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: BobBrookmeyerHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeBobBrookmeyerMetadata(metadata: GenerationMetadata, acc: BobBrookmeyerHarmonyAccumulator): void {
  const flat = [...(metadata.bobBrookmeyerDeviceReceipts ?? [])];
  metadata.bobBrookmeyerDiagnostics = {
    songwriterId: 'bob_brookmeyer',
    barsConsidered: acc.barsConsidered,
    quartalTouches: acc.quartalTouches,
    alteredTouches: acc.alteredTouches,
    pitchModuleReceiptTouches: flat.filter((r) => r.includes('brk:pitch_module')).length,
    episodeReceiptTouches: flat.filter((r) => r.startsWith('brk:episode@')).length,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.bobBrookmeyerSliceReceipt = [
    `Brookmeyer (slice): pitch-module line-first; quartal≈${acc.quartalTouches}`,
    `soloGate=${String(metadata.brookmeyerSoloPermitted ?? false)}`,
    `period=${String(metadata.brookmeyerPeriodModeResolved ?? metadata.brookmeyerPeriodMode ?? '?')}`,
    flat.length ? `brk_devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeBobBrookmeyerEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const periodResolved = resolveBrookmeyerPeriodMode(context, genMeta);
  genMeta.brookmeyerPeriodModeResolved = periodResolved;
  if (
    genMeta.brookmeyerPeriodMode !== 'early_brookmeyer' &&
    genMeta.brookmeyerPeriodMode !== 'late_brookmeyer'
  ) {
    genMeta.brookmeyerPeriodMode = periodResolved;
  }
  context.brookmeyerPeriodMode = periodResolved;

  const activePitchModule = deriveActivePitchModule(seed);
  genMeta.activePitchModule = [...activePitchModule];
  genMeta.brookmeyerActivePitchModule = [...activePitchModule];
  genMeta.brookmeyerActivePitchModuleNames = pcTripletToNames(activePitchModule);

  const plan: BrookmeyerEpisodePlan = buildBrookmeyerEpisodePlan(seed, tb, periodResolved);
  genMeta.brookmeyerSoloPermitted = plan.soloPermitted;
  genMeta.brookmeyerSoloGateThresholdEpisodes = plan.soloGateThresholdEpisodes;
  genMeta.brookmeyerLineFirstHierarchy = true;
  genMeta.lineFirstHierarchy = true;
  context.lineFirstHierarchy = true;

  const lineCounts = plan.episodes.map((e) => e.contrapuntalLineCount);
  const maxLines = lineCounts.length ? Math.max(...lineCounts) : 2;
  genMeta.brookmeyerContrapuntalLineCount = maxLines;
  genMeta.contrapuntalLineCount = maxLines;

  genMeta.brookmeyerEpisodePlanSummary = plan.episodes
    .map((e) => `${e.episodeType}:${e.startBar}-${e.endBar}`)
    .join('|');
  receipts.push(`brk:pitch_module@[${activePitchModule.join(',')}]`);
  receipts.push(`brk:solo_gate@${plan.soloPermitted ? 'open' : 'closed'}@threshold${plan.soloGateThresholdEpisodes}`);
  receipts.push('brk:line_first_hierarchy');

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  const minHold = SLICE_PARAMS.harmonicRhythmMinBars;
  for (let segStart = 1; segStart <= tb; segStart += minHold) {
    const anchorBar = segStart;
    if (anchorBar > tb) break;
    let sym = out[anchorBar - 1] ?? raw[anchorBar - 1] ?? 'C';
    sym = tintChordTowardModule(sym, activePitchModule, anchorBar);
    if (!isProtectedBar(anchorBar, context)) {
      receipts.push(`brk:module_spine@bars${anchorBar}-${Math.min(anchorBar + minHold - 1, tb)}`);
    }
    for (let k = 0; k < minHold && segStart + k <= tb; k++) {
      const b = segStart + k;
      if (isProtectedBar(b, context)) {
        out[b - 1] = raw[b - 1]!;
        continue;
      }
      let barSym = tintChordTowardModule(sym, activePitchModule, b);
      const ep = episodeForBrookmeyerBar(plan, b);
      if (ep) {
        receipts.push(`brk:episode@${ep.episodeType}@bar${b}`);
        if (ep.episodeType === 'pitch_module_statement') receipts.push(`brk:pitch_module_statement@bar${b}`);
        if (ep.episodeType === 'contrapuntal_development') {
          receipts.push(`brk:contrapuntal_lines@${ep.contrapuntalLineCount}@bar${b}`);
        }
      }
      out[b - 1] = barSym;
      if (k > 0) receipts.push(`brk:pedal_hold@bar${b}`);
    }
  }

  for (let b = 2; b <= tb; b++) {
    const prev = out[b - 2]!;
    let curr = out[b - 1]!;
    if (!isProtectedBar(b, context) && looksDominantSurface(prev) && looksTonicMajorLocal(curr)) {
      const pPc = harmonyRootPc(prev);
      const cPc = harmonyRootPc(curr);
      if (pPc !== undefined && cPc !== undefined && (pPc + 5) % 12 === cPc) {
        curr = antiFunctionalColour(curr, seed, b);
        out[b - 1] = curr;
        receipts.push(`brk:no_functional_resolution@bar${b}`);
      }
    }
  }

  for (let b = 1; b <= tb; b++) {
    const ep = episodeForBrookmeyerBar(plan, b);
    if (ep?.episodeType === 'climax_shout' && !isProtectedBar(b, context)) {
      out[b - 1] = climaxClusterSymbol(seed, b);
      receipts.push(`brk:climax_cluster@bar${b}`);
    }
  }

  /* Piece-final only: bias toward Brookmeyer quartal/pedal landings that already pass fBT. */
  biasBobBrookmeyerFinalBarIdiomaticOpen(out, seed, tb, receipts, context);

  genMeta.brookmeyerEraShort = periodResolved === 'early_brookmeyer' ? 'early' : 'late';
  genMeta.bobBrookmeyerEffectiveHarmonyBars = out;
  genMeta.bobBrookmeyerDeviceReceipts = receipts;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece pitch-module / pedal_hold / antiFunctional untouched.
 * Note: 13(#11) / sus13 trip via digit `13` even when mid-piece idiomatic.
 */
function chordLooksDominantFamilyForFbtBrookmeyer(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Brookmeyer pool landings that already pass fBT
 * (Fm9(b5) / Dbm9(b5) cluster-quartal; sus4 pedal secondary).
 * Never leave 13(#11) / sus13 on the final bar.
 * Not a forced jazz tonic cadence — line-first / non-functional idiom preserved.
 */
function biasBobBrookmeyerFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtBrookmeyer(sym)) return;

  const pc = harmonyRootPc(sym);
  if (pc === undefined) return;
  const root = PC_NAMES[pc]!;
  const slash = slashTail(sym);
  const u = seededUnit(seed, totalBars, 884501);

  // Proven FBT-pass pool is m9(b5); sus4 for quartal/pedal colour (never 13).
  let next: string;
  if (u < 0.72) next = `${root}m9(b5)${slash}`;
  else if (u < 0.88) next = `${root}sus4${slash}`;
  else next = `${root}m9(b5)${slash}`;

  out[idx] = next;
  receipts.push(`brk:final_open_bias@bar${totalBars}`);
}
