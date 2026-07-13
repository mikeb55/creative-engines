/**
 * Béla Bartók — axis symmetry / folk-modal / chamber orchestral harmony slice (Song Mode / duo golden-path).
 * Lead-sheet symbols only — receipts **`bk:*`**.
 */

import type { CompositionContext, BartokContextMode, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = head.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = slashTail(symbol);
  return `${newRoot}${rest}${slash}`;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function enrichAxisColour(symbol: string, seed: number, bar: number, ctx: BartokContextMode): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const u = seededUnit(seed, bar, 884101);
  const rpc = harmonyRootPc(symbol);

  if (ctx === 'mikrokosmos') {
    if (u < 0.35 && rpc !== undefined) {
      const bassName = pitchClassToSharpName((rpc + 6) % 12);
      return `${root}sus4/${bassName}`;
    }
    if (u < 0.65 && !/quartal/.test(tl)) return `${root}quartal${slash}`;
    return symbol;
  }
  if (ctx === 'string_quartet') {
    if (u < 0.4) return `${root}add9${slash}`;
    if (u < 0.72) return `${root}maj7#11${slash}`;
    return symbol;
  }
  if (u < 0.38) return `${root}m11${slash}`;
  if (u < 0.68) return `${root}7(b9,b13)${slash}`;
  return symbol;
}

function applyAxisSubstitutionPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: BartokContextMode
): void {
  const step = ctx === 'mikrokosmos' ? 3 : ctx === 'string_quartet' ? 6 : 4;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 884201) >= 0.42) continue;
    const sym = out[b - 1]!;
    out[b - 1] = transposeChordRoot(sym, step);
    receipts.push(`bk:axis_substitution@bar${b}`);
  }
}

function applyGoldenSectionClimaxPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tb < 8) return;
  const climaxBar = Math.max(2, Math.min(tb - 1, Math.floor(tb * 0.618)));
  if (isProtectedBar(climaxBar, context)) return;
  if (seededUnit(seed, climaxBar, 884301) >= 0.65) return;
  const sym = out[climaxBar - 1]!;
  const hp = parseChordSymbol(sym).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return;
  const slash = slashTail(sym);
  const coloured = seededUnit(seed, climaxBar, 884302) < 0.5 ? `${root}7alt${slash}` : `${root}maj7#11${slash}`;
  out[climaxBar - 1] = coloured;
  receipts.push(`bk:golden_section_climax@bar${climaxBar}`);
}

/** Tags bars whose upbeat aligns with Bulgarian-style additive cells (metadata / receipts only in 4/4 scaffold). */
function applyBulgarianRhythmPass(seed: number, receipts: string[], tb: number, context: CompositionContext): void {
  const accents8 = new Set([1, 4, 7]);
  const accents5 = new Set([1, 4]);
  const accents9 = new Set([1, 5, 8]);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const salt = (seed ^ b * 884401) >>> 0;
    const mode = salt % 3;
    const cycle = mode === 0 ? 8 : mode === 1 ? 5 : 9;
    const pos = ((b - 1) % cycle) + 1;
    const hit =
      (mode === 0 && accents8.has(pos)) ||
      (mode === 1 && accents5.has(pos)) ||
      (mode === 2 && accents9.has(pos));
    if (hit && seededUnit(seed, b, 884402) < 0.32) {
      receipts.push(`bk:bulgarian_rhythm@bar${b}`);
    }
  }
}

function applyIntervalCellTransformPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: BartokContextMode
): void {
  const cell = ctx === 'mikrokosmos' ? [2, 5, 1] : ctx === 'string_quartet' ? [3, 4, 1] : [4, 3, 2];
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const hop = cell[(b - 1) % cell.length]!;
    if (hop === undefined || seededUnit(seed, b, 884501) >= 0.22) continue;
    const sym = out[b - 1]!;
    out[b - 1] = transposeChordRoot(sym, hop);
    receipts.push(`bk:interval_cell_transform@bar${b}`);
  }
}

function applyArchFormMirrorPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tb < 12 || seededUnit(seed, 3, 884601) >= 0.55) return;
  const pivot = Math.floor(tb / 2);
  if (pivot < 2 || pivot >= tb) return;
  const span = Math.min(pivot - 1, tb - pivot);
  if (span < 2) return;
  for (let k = 0; k < span; k++) {
    const left = pivot - k;
    const right = pivot + k + 1;
    if (left < 1 || right > tb) break;
    if (isProtectedBar(left, context) || isProtectedBar(right, context)) continue;
    if (seededUnit(seed, left, 884602 + k) >= 0.35) continue;
    const tmp = out[left - 1]!;
    out[left - 1] = out[right - 1]!;
    out[right - 1] = tmp;
    receipts.push(`bk:arch_form_mirror@bar${left}`);
    receipts.push(`bk:arch_form_mirror@bar${right}`);
  }
}

export function isSongwriterBartok(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bartok' } {
  return genMeta?.songwriterStyleId === 'bartok';
}

/**
 * Harmonic-path gate — primary `bartok` **or** exact `harmonicVoice=bartok`.
 * Soft aliases (`bela_bartok` / `bela`) resolve to Song stub BY_ID but do **not** engage HV
 * unless primary/HV id is exact `bartok`.
 * Never `sq_vrb_bartok` (SQ CLE / axis VRB).
 */
export function isBartokHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'bartok' || voice === 'bartok';
}

export interface BartokHarmonyAccumulator {
  barsConsidered: number;
  axisTouches: number;
  quartalTouches: number;
  folkModalTouches: number;
  clusterTouches: number;
}

export function createBartokHarmonyAccumulator(): BartokHarmonyAccumulator {
  return {
    barsConsidered: 0,
    axisTouches: 0,
    quartalTouches: 0,
    folkModalTouches: 0,
    clusterTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BartokHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/quartal|sus/.test(t)) acc.quartalTouches++;
  if (/add9|m11|phryg|modal|pent/.test(t)) acc.folkModalTouches++;
  if (/cluster|b9|#9|alt/.test(t)) acc.clusterTouches++;
  if (/sus4\(|quartal/.test(t)) acc.axisTouches++;
}

export function accumulateBartokHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BartokHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface BartokAntiElaborationGuards {
  noopAxis: number;
}

/**
 * Precompute effective harmony — axis / golden-section / Bulgarian / cell / arch (`bk:*` receipts).
 * Call when {@link isBartokHarmonicPath} (primary or exact HV).
 */
export function precomputeBartokEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const bkCtx: BartokContextMode = genMeta.bartokContext ?? 'mikrokosmos';
  genMeta.bartokContext = bkCtx;

  const receipts: string[] = [];
  const guards: BartokAntiElaborationGuards = {
    noopAxis: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = enrichAxisColour(sym, seed, b, bkCtx);
    raw.push(sym);
  }

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  const beforeAxis = [...out];
  applyAxisSubstitutionPass(out, seed, receipts, tb, context, bkCtx);
  if (beforeAxis.join('|') === out.join('|')) guards.noopAxis++;

  applyGoldenSectionClimaxPass(out, seed, receipts, tb, context);
  applyBulgarianRhythmPass(seed, receipts, tb, context);
  applyIntervalCellTransformPass(out, seed, receipts, tb, context, bkCtx);
  applyArchFormMirrorPass(out, seed, receipts, tb, context);

  /* Piece-final only: bias toward Bartók axis/quartal landings that already pass fBT. */
  biasBartokFinalBarIdiomaticOpen(out, seed, tb, receipts, context, bkCtx);

  genMeta.bartokEffectiveHarmonyBars = out;
  genMeta.bartokDeviceReceipts = receipts;
  genMeta.bartokAntiElaborationGuards = guards;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece axis / quartal / golden-section devices untouched.
 * Note: 7alt / 7(b9,b13) trip FBT even when mid-piece idiomatic.
 */
function chordLooksDominantFamilyForFbtBartok(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Idiom pre-check (Batch 5): only 2/9 gen-ok baseline; both fail on F7alt.
 * Bias toward Bartók FBT-safe pool from enrichAxisColour / axis grammar:
 * quartal · sus4(/tritone) · add9 · maj7#11 · m11 — never 7alt / 7(b9,b13).
 * Not a forced jazz tonic cadence.
 */
function biasBartokFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  ctx: BartokContextMode
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtBartok(sym)) return;

  const rpc = harmonyRootPc(sym);
  if (rpc === undefined) return;
  const root = pitchClassToSharpName(rpc);
  const slash = slashTail(sym);
  const u = seededUnit(seed, totalBars, 884701);

  let next: string;
  if (ctx === 'mikrokosmos') {
    if (u < 0.35) {
      const bassName = pitchClassToSharpName((rpc + 6) % 12);
      next = `${root}sus4/${bassName}`;
    } else if (u < 0.7) next = `${root}quartal${slash}`;
    else next = `${root}add9${slash}`;
  } else if (ctx === 'string_quartet') {
    if (u < 0.4) next = `${root}add9${slash}`;
    else if (u < 0.75) next = `${root}maj7#11${slash}`;
    else next = `${root}quartal${slash}`;
  } else {
    // Concert / folk-modal — m11 / quartal / maj7#11 (never 7alt colour on final).
    if (u < 0.35) next = `${root}m11${slash}`;
    else if (u < 0.65) next = `${root}quartal${slash}`;
    else if (u < 0.85) next = `${root}maj7#11${slash}`;
    else next = `${root}add9${slash}`;
  }

  out[idx] = next;
  receipts.push(`bk:final_open_bias@bar${totalBars}`);
}

export function finalizeBartokMetadata(metadata: GenerationMetadata, acc: BartokHarmonyAccumulator): void {
  const flat = [...(metadata.bartokDeviceReceipts ?? [])];
  const g = metadata.bartokAntiElaborationGuards ?? { noopAxis: 0 };
  const d = {
    songwriterId: 'bartok' as const,
    barsConsidered: acc.barsConsidered,
    axisTouches: acc.axisTouches,
    quartalTouches: acc.quartalTouches,
    folkModalTouches: acc.folkModalTouches,
    clusterTouches: acc.clusterTouches,
    antiElaborationGuardTriggers: g.noopAxis,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Bartók (slice): axis≈${acc.axisTouches}`,
    `quartal≈${acc.quartalTouches}`,
    `folk/modal≈${acc.folkModalTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.bartokDiagnostics = { ...d };
  metadata.bartokSliceReceipt = receipt;
}
