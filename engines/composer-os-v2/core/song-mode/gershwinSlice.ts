/**
 * George Gershwin — Songbook / concert jazz harmony slice (Song Mode / duo golden-path).
 * Lead-sheet symbols only — receipts **`gg:*`** (`d1`–`d5`).
 */

import type { CompositionContext, GershwinContextMode, GenerationMetadata } from '../compositionContext';
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

function isMinorishChord(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11/.test(tl) || /^[a-g][#b]?m([^a]|$)/i.test(parseChordSymbol(symbol).harmonyPart.replace(/\s/g, ''));
}

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksBareMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|Δ|dim|ø|aug|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length).replace(/\s/g, '');
  if (!/^m/.test(rest)) return false;
  return !/[79]|11|13|maj/.test(rest);
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

function enrichGershwinTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 886101);
  if (u < 0.38) return `${root}maj7${slash}`;
  if (u < 0.72) return `${root}6${slash}`;
  return `${root}6/9${slash}`;
}

function enrichGershwinDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 886201);
  if (u < 0.35) return `${root}7(9)${slash}`;
  if (u < 0.62) return `${root}7b9${slash}`;
  if (u < 0.85) return `${root}7#5#9${slash}`;
  return `${root}13${slash}`;
}

function enrichGershwinMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 886301);
  if (u < 0.55) return `${root}m7${slash}`;
  if (u < 0.82) return `${root}m9${slash}`;
  return `${root}m11${slash}`;
}

function enrichIvSixNine(symbol: string, seed: number, bar: number, tonicPc: number | undefined): string {
  if (tonicPc === undefined) return symbol;
  const rpc = harmonyRootPc(symbol);
  if (rpc === undefined) return symbol;
  const ivPc = (tonicPc + 5) % 12;
  if (rpc !== ivPc) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/dim|ø|aug|maj7|m(?!aj)/.test(tl)) return symbol;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  if (seededUnit(seed, bar, 886401) >= 0.34) return symbol;
  return `${root}6/9${slash}`;
}

/** d1 — tag section anchors for AABA / rhapsody arcs / rhythm grid. */
function applyAabaFormPass(
  seed: number,
  receipts: string[],
  tb: number,
  ctx: GershwinContextMode,
  _context: CompositionContext
): void {
  if (tb < 8) return;
  if (ctx === 'rhythm_changes') {
    receipts.push(`gg:d1_aaba_form:rhythm_changes@${tb}`);
    return;
  }
  if (ctx === 'rhapsody') {
    const pivot = Math.max(4, Math.min(tb - 3, Math.floor(tb * 0.62)));
    receipts.push(`gg:d1_aaba_form:rhapsody_arc@${pivot}`);
    return;
  }
  const aLen = seededUnit(seed, 11, 886501) < 0.5 ? 8 : 4;
  receipts.push(`gg:d1_aaba_form:A=${aLen}b@${1}`);
  if (tb >= aLen + 4) receipts.push(`gg:d1_aaba_form:B@${aLen + 1}`);
  if (tb >= 2 * aLen + 4) receipts.push(`gg:d1_aaba_form:A_prime@${2 * aLen + 1}`);
}

/** d2 — altered/colour hits read as “blue” harmonic tint on cadential bars. */
function applyBlueNoteColourPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 886601) >= 0.38) continue;
    const sym = out[b - 1]!;
    const hp = parseChordSymbol(sym).harmonyPart;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    const rpc = harmonyRootPc(sym);
    if (looksPlainDominantSeventh(sym)) {
      const u = seededUnit(seed, b, 886602);
      out[b - 1] = u < 0.5 ? `${root}7#11${slash}` : `${root}7#9${slash}`;
      receipts.push(`gg:d2_blue_note_color@bar${b}`);
    } else if (rpc !== undefined && tonicPc !== undefined && rpc === tonicPc && !isMinorishChord(sym)) {
      out[b - 1] = `${root}maj7#11${slash}`;
      receipts.push(`gg:d2_blue_note_color@bar${b}`);
    }
  }
}

/** d3 — secondary dominant / anticipation tint toward next bar’s harmony. */
function applySyncopatedAnticipationPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b < tb; b++) {
    if (isProtectedBar(b, context) || isProtectedBar(b + 1, context)) continue;
    if (seededUnit(seed, b, 886701) >= 0.28) continue;
    const nextPc = harmonyRootPc(out[b]!);
    if (nextPc === undefined) continue;
    const domPc = (nextPc + 7) % 12;
    const domName = pitchClassToSharpName(domPc);
    const slash = slashTail(out[b - 1]!);
    out[b - 1] = `${domName}7${slash}`;
    receipts.push(`gg:d3_syncopated_anticipation@bar${b}`);
  }
}

/** d4 — diminished seventh connectors / chromatic passing harmony. */
function applyChromaticPassingPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b < tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 886801) >= 0.2) continue;
    const hp = parseChordSymbol(out[b - 1]!).harmonyPart;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(out[b - 1]!);
    out[b - 1] = `${root}dim7${slash}`;
    receipts.push(`gg:d4_chromatic_passing@bar${b}`);
  }
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece devices untouched.
 */
function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

/** Piece-final tonic: maj7 (Gershwin Songbook vocabulary; passes finalBarTension tonic-family). */
function spellGershwinTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj7`,
    receipt: `gg:final_tonic_cadence@bar${bar}`,
  };
}

/**
 * Primary force: piece-final bar always lands on tonic-family (mirrors Wayne
 * `forceFinalBarTonicResolution`). Mid-piece Gershwin devices untouched.
 */
function forceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellGershwinTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

/**
 * Safety net: if bar N is still non-tonic after primary force, rewrite to tonic maj7
 * (mirrors Wayne `enforceFinalBarTonicResolution`).
 */
function enforceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || chordLooksTonicFamily(sym)) return;
  const { symbol, receipt } = spellGershwinTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

/** d5 — brief minor-third axis shift (three semitone transpose) for a two-bar window. */
function applyMinorThirdModulationPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tb < 10) return;
  if (seededUnit(seed, 9, 886901) >= 0.55) return;
  const start = 2 + Math.floor(seededUnit(seed, 10, 886902) * Math.max(1, tb - 6));
  if (start >= tb) return;
  if (isProtectedBar(start, context) || isProtectedBar(start + 1, context)) return;
  for (let k = 0; k < 2; k++) {
    const idx = start + k - 1;
    if (idx < 0 || idx >= out.length) break;
    out[idx] = transposeChordRoot(out[idx]!, 3);
  }
  receipts.push(`gg:d5_minor_third_modulation@bar${start}`);
}

export function isSongwriterGershwin(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'gershwin' } {
  return genMeta?.songwriterStyleId === 'gershwin';
}

/**
 * Primary songwriter or harmonicVoice selects Gershwin harmony authority.
 * Single-gate (no styleProfile) — Wave-C / bill_evans HV pattern.
 *
 * Exact id `gershwin` only — soft aliases (`george_gershwin`, `rhapsody_in_blue`, …)
 * stay primary-intake via songwriter normalize; they do **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - **`gershwinContext`** (`song_aaba` | `rhapsody` | `rhythm_changes`) — primary/API stamp only.
 * - **`applyGershwinStyleSurface`** — Song Mode bias nudges from primaryId.
 * - API **`gershwinContext`** intake — primary songwriter only.
 */
export function isGershwinHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'gershwin' || voice === 'gershwin';
}

export interface GershwinHarmonyAccumulator {
  barsConsidered: number;
  functionalTouches: number;
  jazzExtensionTouches: number;
  chromaticTouches: number;
  modulationTouches: number;
}

export function createGershwinHarmonyAccumulator(): GershwinHarmonyAccumulator {
  return {
    barsConsidered: 0,
    functionalTouches: 0,
    jazzExtensionTouches: 0,
    chromaticTouches: 0,
    modulationTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: GershwinHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj|m7|m9|6\/9|(^|[^a-z])7|ii|iv|v/.test(t)) acc.functionalTouches++;
  if (/b9|#9|#11|maj7|aug|alt|13|7\(/.test(t)) acc.jazzExtensionTouches++;
  if (/dim|ø|#1|b1[0-9]/.test(t)) acc.chromaticTouches++;
  if (/aug/.test(t)) acc.modulationTouches++;
}

export function accumulateGershwinHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: GershwinHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface GershwinAntiElaborationGuards {
  noopEnrich: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeGershwinEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const ggCtx: GershwinContextMode = genMeta.gershwinContext ?? 'song_aaba';
  // Context stamp stays primary-only — HV must not steal primary surface identity.
  if (genMeta.songwriterStyleId === 'gershwin') {
    genMeta.gershwinContext = ggCtx;
  }

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: GershwinAntiElaborationGuards = {
    noopEnrich: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    const before = sym;
    sym = enrichGershwinTonic(sym, tonicPc, seed, b);
    sym = enrichGershwinDominant(sym, seed, b);
    sym = enrichGershwinMinor(sym, seed, b);
    sym = enrichIvSixNine(sym, seed, b, tonicPc);
    if (sym === before && looksBareMajorOnTonic(before, tonicPc)) guards.noopEnrich++;
    raw.push(sym);
  }

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  applyAabaFormPass(seed, receipts, tb, ggCtx, context);
  applyBlueNoteColourPass(out, seed, receipts, tb, context, tonicPc);
  applySyncopatedAnticipationPass(out, seed, receipts, tb, context);
  applyChromaticPassingPass(out, seed, receipts, tb, context);
  applyMinorThirdModulationPass(out, seed, receipts, tb, context);

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.gershwinEffectiveHarmonyBars = out;
  genMeta.gershwinDeviceReceipts = receipts;
  genMeta.gershwinAntiElaborationGuards = guards;
}

export function finalizeGershwinMetadata(metadata: GenerationMetadata, acc: GershwinHarmonyAccumulator): void {
  const flat = [...(metadata.gershwinDeviceReceipts ?? [])];
  const g = metadata.gershwinAntiElaborationGuards ?? { noopEnrich: 0 };
  const modN = flat.filter((r) => r.includes('gg:d5_minor_third_modulation')).length;
  const d = {
    songwriterId: 'gershwin' as const,
    barsConsidered: acc.barsConsidered,
    functionalTouches: acc.functionalTouches,
    jazzExtensionTouches: acc.jazzExtensionTouches,
    chromaticTouches: acc.chromaticTouches,
    modulationTouches: Math.max(acc.modulationTouches, modN),
    antiElaborationGuardTriggers: g.noopEnrich,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Gershwin (slice): functional≈${acc.functionalTouches}`,
    `jazzExt≈${acc.jazzExtensionTouches}`,
    `chrom≈${acc.chromaticTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.gershwinDiagnostics = { ...d };
  metadata.gershwinSliceReceipt = receipt;
}
