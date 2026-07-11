/**
 * Erik Satie — modal stasis / parallel harmony Song Mode / duo golden-path **harmony** slice.
 * Lead-sheet symbols — receipts **`es:*`** (`d1`–`d5`).
 * Bans ii–V–I chains (via shared pool guard) and strips textbook functional dominants toward sus / tertian colour.
 */

import type { CompositionContext, GenerationMetadata, SatieContextMode } from '../compositionContext';
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

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
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

/** Strip dominant-function tertian spelling toward suspended / colour voicing (no mimic claim). */
function stripFunctionalDominantSatie(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const tl = head.toLowerCase();
  if (/\bm(?!aj)|dim|ø/.test(tl)) return symbol;
  if (/maj7|mmaj|Δ/.test(tl)) return symbol;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = head.slice(root.length).replace(/\s/g, '');
  const rtl = rest.toLowerCase();
  if (!rtl) return symbol;
  if (
    /^7(\(|$|\/)/.test(rtl) ||
    /^7b9/.test(rtl) ||
    /^9(\(|$|\/)/.test(rtl) ||
    /^13/.test(rtl) ||
    /alt/.test(rtl) ||
    /dom/.test(rtl)
  ) {
    const slash = slashTail(symbol);
    return `${root}sus4${slash}`;
  }
  return symbol;
}

/** Remove altered-posture leftovers after ii–V guard so pools stay non-functional. */
function neutralizeResidualFunctionalSatie(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/alt|7b9|7\(.*b9|7\(.*#9|ø/.test(tl)) {
    const rpc = harmonyRootPc(symbol);
    if (rpc === undefined) return symbol;
    const slash = slashTail(symbol);
    return `${pitchClassToSharpName(rpc)}sus4${slash}`;
  }
  return symbol;
}

export interface SatieHarmonyAccumulator {
  barsConsidered: number;
  staticFieldTouches: number;
  parallelTouches: number;
}

export function createSatieHarmonyAccumulator(): SatieHarmonyAccumulator {
  return {
    barsConsidered: 0,
    staticFieldTouches: 0,
    parallelTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: SatieHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus|\/|add/.test(hp)) acc.staticFieldTouches++;
  if (/sus|quartal/.test(hp)) acc.parallelTouches++;
}

export function accumulateSatieHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: SatieHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** d1 — static_field: prolong harmony bar-to-bar. */
function applyStaticFieldPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: SatieContextMode
): void {
  const rate = ctx === 'gymnopedie' ? 0.38 : ctx === 'gnossienne' ? 0.44 : 0.32;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 951101) >= rate) continue;
    out[b - 1] = out[b - 2]!;
    receipts.push(`es:d1_static_field@bar${b}`);
  }
}

/** d2 — parallel_planning: uniform chromatic planing window. */
function applyParallelPlaningPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: SatieContextMode
): void {
  if (tb < 6) return;
  const span = ctx === 'poire' ? 3 : ctx === 'gnossienne' ? 4 : 5;
  const start = 1 + Math.floor(seededUnit(seed, 4, 951201) * Math.max(1, tb - span));
  const delta = ctx === 'gnossienne' ? -1 : ctx === 'poire' ? 1 : -2;
  const end = Math.min(tb, start + span - 1);
  if (seededUnit(seed, 5, 951202) >= 0.55) return;
  for (let b = start; b <= end; b++) {
    if (isProtectedBar(b, context)) continue;
    out[b - 1] = transposeChordRoot(out[b - 1]!, delta);
    receipts.push(`es:d2_parallel_planning@bar${b}|delta=${delta}`);
  }
}

/** d3 — cell_repetition: echo two-bar cell. */
function applyCellRepetitionPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tb < 6) return;
  if (seededUnit(seed, 6, 951301) >= 0.42) return;
  const start = 2 + Math.floor(seededUnit(seed, 7, 951302) * Math.max(0, tb - 5));
  const a = out[start - 1]!;
  const bSym = out[start]!;
  if (!isProtectedBar(start + 1, context)) {
    out[start + 1] = a;
    receipts.push(`es:d3_cell_repetition@${start + 1}`);
  }
  if (!isProtectedBar(start + 2, context)) {
    out[start + 2] = bSym;
    receipts.push(`es:d3_cell_repetition@${start + 2}`);
  }
}

/** d4 — texture_form: form-span receipt (inspectability). */
function applyTextureFormReceiptPass(tb: number, seed: number, receipts: string[], ctx: SatieContextMode): void {
  const hinge = Math.max(2, Math.min(tb - 1, Math.floor(tb * 0.5)));
  receipts.push(`es:d4_texture_form|ctx=${ctx}|tb=${tb}|hinge=${hinge}|seed=${seed % 100000}`);
}

/** d5 — modal_collection: bias roots toward white-note collection on sparse bars. */
function applyModalCollectionPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  const modalSet = new Set([0, 2, 4, 5, 7, 9, 11]);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 951401) >= 0.18) continue;
    const rpc = harmonyRootPc(out[b - 1]!);
    if (rpc === undefined) continue;
    if (modalSet.has(rpc)) {
      receipts.push(`es:d5_modal_collection@bar${b}|rootPc=${rpc}|tonic=${tonicPc ?? 'na'}`);
    }
  }
}

export interface SatieAntiElaborationGuards {
  dominantStripNoop: number;
}

export function isSongwriterSatie(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'satie' } {
  return genMeta?.songwriterStyleId === 'satie';
}

/**
 * Primary songwriter or harmonicVoice selects Satie harmony authority.
 * Single-gate (no styleProfile) — Wave-C / bill_evans HV pattern.
 *
 * Exact id `satie` only — soft aliases (`erik_satie`, …) stay primary-intake via
 * songwriter normalize; they do **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - **`satieContext`** (`gymnopedie` | …) — primary/API stamp only.
 * - **`applySatieStyleSurface`** — Song Mode bias nudges from primaryId.
 */
export function isSatieHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'satie' || voice === 'satie';
}

/** @deprecated — use resolveBarSymbol */
export function precomputeSatieEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const satCtx: SatieContextMode = genMeta.satieContext ?? 'gymnopedie';
  // Context stamp stays primary-only — HV must not steal primary surface identity.
  if (genMeta.songwriterStyleId === 'satie') {
    genMeta.satieContext = satCtx;
  }

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: SatieAntiElaborationGuards = { dominantStripNoop: 0 };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    const before = sym;
    sym = stripFunctionalDominantSatie(sym);
    if (sym === before) guards.dominantStripNoop++;
    raw.push(sym);
  }

  let out = breakFrankZappaIiViProgressions(raw, seed);
  out = out.map((s) => neutralizeResidualFunctionalSatie(s));

  applyStaticFieldPass(out, seed, receipts, tb, context, satCtx);
  applyParallelPlaningPass(out, seed, receipts, tb, context, satCtx);
  applyCellRepetitionPass(out, seed, receipts, tb, context);
  applyTextureFormReceiptPass(tb, seed, receipts, satCtx);
  applyModalCollectionPass(out, seed, receipts, tb, context, tonicPc);

  genMeta.satieEffectiveHarmonyBars = out;
  genMeta.satieDeviceReceipts = receipts;
  genMeta.satieAntiElaborationGuards = guards;
}

export function finalizeSatieMetadata(metadata: GenerationMetadata, acc: SatieHarmonyAccumulator): void {
  const flat = [...(metadata.satieDeviceReceipts ?? [])];
  const g = metadata.satieAntiElaborationGuards ?? { dominantStripNoop: 0 };
  const d1 = flat.filter((r) => r.includes('es:d1_')).length;
  const d2 = flat.filter((r) => r.includes('es:d2_')).length;
  const d3 = flat.filter((r) => r.includes('es:d3_')).length;
  const d4 = flat.filter((r) => r.includes('es:d4_')).length;
  const d5 = flat.filter((r) => r.includes('es:d5_')).length;

  metadata.satieDiagnostics = {
    songwriterId: 'satie',
    barsConsidered: acc.barsConsidered,
    staticFieldTouches: d1,
    parallelPlanningTouches: d2,
    cellRepetitionTouches: d3,
    textureFormTouches: d4,
    modalCollectionTouches: d5,
    parallelColourTouches: acc.parallelTouches,
    antiElaborationGuardTriggers: g.dominantStripNoop,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  };
  const receipt = [
    `Satie (slice): static=${d1}`,
    `parallel=${d2}`,
    `cell=${d3}`,
    `texture=${d4}`,
    `modal=${d5}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 14).join(';')}${flat.length > 14 ? '…' : ''}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.satieSliceReceipt = receipt;
}
