/**
 * James Brown — funk/soul dominant-centre Song Mode / duo golden-path **harmony** slice.
 *
 * **Boundary (C3):** `songModeJamesBrownFunkOverlay` is opt-in and lives in the rhythm/velocity layer
 * (`applyJamesBrownFunkOverlay`). This module owns **harmony** (vamp lock, bridge side, blues-tension
 * flags, horn-stab metadata on comp hits). It does not auto-enable the C3 overlay.
 *
 * **Known interaction:** C3 funk overlay + primary `james_brown` may hit overlay span asserts on some golden-path
 * seeds — rhythm-layer invariant, not harmony routing. Harmony receipts (`jamesBrownEffectiveHarmonyBars`) are
 * authoritative regardless of overlay opt-in.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { ChordEvent, MeasureModel } from '../score-model/scoreModelTypes';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { coarseSectionRoleFromBar, inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function logJamesBrownGuard(message: string): void {
  if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_JB === '1') {
    console.warn(`[jb-guard] ${message}`);
  }
}

export function isSongwriterJamesBrown(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'james_brown' } {
  return genMeta?.songwriterStyleId === 'james_brown';
}

/**
 * Harmonic-path gate — primary `james_brown` **or** exact `harmonicVoice=james_brown`.
 * Soft alias `jb` stays primary-intake / VRB BY_ID only; it does **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - Guitar bar passes (`applyJamesBrownGuitarBarPasses`)
 * - C3 funk overlay opt-in / rhythm stamps
 * - Accumulator finalize stamps
 */
export function isJamesBrownHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'james_brown' || voice === 'james_brown';
}

export interface JamesBrownHarmonyAccumulator {
  barsConsidered: number;
  dominantVampTouches: number;
  minorSeventhTouches: number;
  extensionTouches: number;
}

export function createJamesBrownHarmonyAccumulator(): JamesBrownHarmonyAccumulator {
  return {
    barsConsidered: 0,
    dominantVampTouches: 0,
    minorSeventhTouches: 0,
    extensionTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: JamesBrownHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/\bmaj7\b|Δ|mmaj7/i.test(t)) acc.extensionTouches++;
  if (/\bm7\b|m9|m11|m13|min7/i.test(t)) acc.minorSeventhTouches++;
  if (/9|11|13|7/.test(t)) acc.dominantVampTouches++;
}

export function accumulateJamesBrownHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JamesBrownHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface JamesBrownDeviceReceipts {
  deviceReceipts: string[];
}

export interface JamesBrownAntiElaborationGuards {
  reharmBlock: number;
  turnaroundBlock: number;
  extensionBeyond13: number;
}

function stripExtensionBeyond13(symbol: string, guards: JamesBrownAntiElaborationGuards): string {
  const p = parseChordSymbol(symbol);
  const hp = p.harmonyPart;
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  if (/\b(15|add15|#15|b15)\b/i.test(hp)) {
    guards.extensionBeyond13++;
    logJamesBrownGuard(`extensionBeyond13: stripped exotic extension in "${symbol}"`);
    const stripped = hp.replace(/\b(15|add15|#15|b15)\b/gi, '').trim();
    return `${stripped}${slash}` || symbol;
  }
  if (/\bmaj7\b|Δ|mmaj7/i.test(hp)) {
    guards.reharmBlock++;
    logJamesBrownGuard(`reharmBlock: removed maj7 colour from "${symbol}"`);
    const root = hp.match(ROOT_AT_START)?.[1];
    if (root) {
      const tail = hp.slice(root.length).replace(/\bmaj7\b|Δ|mmaj7/gi, '');
      const domTail = tail.includes('m') && !/maj/.test(tail) ? tail : tail.replace(/^maj/i, '') || '7';
      const core = `${root}${domTail.includes('7') ? '' : '7'}`.replace(/77+/g, '7');
      return `${core}${slash}`;
    }
  }
  return symbol;
}

function looksRadioheadBrianWilsonBorrow(symbol: string): boolean {
  const t = symbol.toLowerCase();
  return (
    /dbmaj7|eb6|bii|biii|bvi|bvii/.test(t) ||
    (symbol.includes('/') && /maj7/.test(t))
  );
}

function sanitizeJamesBrownBarChord(symbol: string, guards: JamesBrownAntiElaborationGuards): string {
  let s = stripExtensionBeyond13(symbol, guards);
  if (looksRadioheadBrianWilsonBorrow(s)) {
    guards.reharmBlock++;
    logJamesBrownGuard(`reharmBlock: neutralized borrowed/modal colour "${symbol}"`);
    const r = harmonyRootPc(s);
    if (r !== undefined) return `${pitchClassToSharpName(r)}9`;
  }
  return s;
}

/** Rough ii–V in major: m7 on ii then dom7 on V (roots a fifth apart). */
function isTwoFivePair(prev: string, cur: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  const rp = harmonyRootPc(prev);
  const rc = harmonyRootPc(cur);
  if (rp !== iiPc || rc !== vPc) return false;
  const pl = prev.toLowerCase();
  const cl = cur.toLowerCase();
  return /\bm7\b|m9|m11/.test(pl) && (/^([a-g][#b]?)7/.test(parseChordSymbol(cur).harmonyPart) || /7|9|13/.test(cl));
}

function applyTurnaroundGuard(
  out: string[],
  tonicPc: number | undefined,
  guards: JamesBrownAntiElaborationGuards
): void {
  if (tonicPc === undefined) return;
  let turnaroundSeen = false;
  for (let i = 1; i < out.length; i++) {
    if (!isTwoFivePair(out[i - 1]!, out[i]!, tonicPc)) continue;
    if (!turnaroundSeen) {
      turnaroundSeen = true;
      continue;
    }
    guards.turnaroundBlock++;
    logJamesBrownGuard(`turnaroundBlock: flattened ii–V at bar ${i + 1}`);
    out[i] = out[i - 1]!;
  }
}

function applyDominantVampLockVerseChorus(params: {
  context: CompositionContext;
  out: string[];
  receipts: JamesBrownDeviceReceipts;
}): void {
  const { context, out, receipts } = params;

  for (const sec of context.form.sections) {
    const start = sec.startBar;
    const end = Math.min(sec.startBar + sec.length - 1, out.length);
    const role0 = coarseSectionRoleFromBar(start, context);
    if (role0 !== 'verse' && role0 !== 'chorus') continue;

    let current = out[start - 1]!;
    let streak = 1;

    for (let b = start + 1; b <= end; b++) {
      const role = coarseSectionRoleFromBar(b, context);
      if (role !== 'verse' && role !== 'chorus') break;

      const want = out[b - 1]!;
      if (want === current) {
        streak++;
        continue;
      }
      if (streak < 4) {
        out[b - 1] = current;
        streak++;
        receipts.deviceReceipts.push(`jb:dominant_vamp_lock@bar${b}`);
      } else {
        current = want;
        streak = 1;
      }
    }
  }
}

function applyIvSideBridgeOnce(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: JamesBrownDeviceReceipts;
  seed: number;
}): void {
  const { context, tonicPc, out, receipts, seed } = params;
  if (tonicPc === undefined) return;
  let fired = false;
  const ivPc = (tonicPc + 5) % 12;
  const i7 = `${pitchClassToSharpName(tonicPc)}7`;
  const iv7 = `${pitchClassToSharpName(ivPc)}7`;

  for (const sec of context.form.sections) {
    if (fired) break;
    if (coarseSectionRoleFromBar(sec.startBar, context) !== 'bridge') continue;
    if (seededUnit(seed, sec.startBar, 98201) > 0.92) continue;
    const b0 = sec.startBar;
    if (b0 >= 1 && b0 <= out.length) {
      out[b0 - 1] = i7;
      receipts.deviceReceipts.push(`jb:iv_side_bridge@bar${b0}`);
    }
    if (b0 + 1 <= out.length) {
      out[b0] = iv7;
    }
    if (b0 + 2 <= out.length) {
      out[b0 + 1] = i7;
    }
    fired = true;
  }
}

function collectVampLockRuns(out: string[], context: CompositionContext): {
  minRun: number;
  maxRun: number;
  meanRun: number;
} {
  const tb = out.length;
  const runs: number[] = [];
  let cur = '';
  let len = 0;
  for (let b = 1; b <= tb; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && role !== 'chorus') {
      if (len > 0) runs.push(len);
      len = 0;
      cur = '';
      continue;
    }
    const c = out[b - 1] ?? '';
    if (c === cur) len++;
    else {
      if (len > 0) runs.push(len);
      cur = c;
      len = 1;
    }
  }
  if (len > 0) runs.push(len);
  if (runs.length === 0) return { minRun: 0, maxRun: 0, meanRun: 0 };
  const sum = runs.reduce((a, n) => a + n, 0);
  return {
    minRun: Math.min(...runs),
    maxRun: Math.max(...runs),
    meanRun: sum / runs.length,
  };
}

function collectHornStabHitRate(args: {
  context: CompositionContext;
  receiptStrings: string[];
  tb: number;
}): { eligibleBars: number; stabReceiptBars: number } {
  let eligibleBars = 0;
  const stabBars = new Set<number>();
  for (let b = 1; b <= args.tb; b++) {
    const role = coarseSectionRoleFromBar(b, args.context);
    if (role !== 'verse' && role !== 'chorus') continue;
    eligibleBars++;
  }
  for (const r of args.receiptStrings) {
    const m = /^jb:horn_stab_rhythm@bar(\d+)/.exec(r);
    if (m) stabBars.add(parseInt(m[1]!, 10));
  }
  return { eligibleBars, stabReceiptBars: stabBars.size };
}

/**
 * Precompute effective one chord per bar after JB devices + guards.
 * Call when {@link isJamesBrownHarmonicPath} (primary or exact HV).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeJamesBrownEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: JamesBrownDeviceReceipts = { deviceReceipts: [] };
  const guards: JamesBrownAntiElaborationGuards = { reharmBlock: 0, turnaroundBlock: 0, extensionBeyond13: 0 };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(sanitizeJamesBrownBarChord(resolveBarSymbol(context, b).symbol, guards));
  }

  applyTurnaroundGuard(raw, tonicPc, guards);

  const out = [...raw];

  applyDominantVampLockVerseChorus({ context, out, receipts });

  applyIvSideBridgeOnce({ context, tonicPc, out, receipts, seed });

  for (let b = 2; b <= tb; b++) {
    if (out[b - 1] !== out[b - 2]) {
      receipts.deviceReceipts.push(`jb:the_one_anchor@bar${b}`);
    }
  }

  const bluesBars: number[] = [];
  for (let b = 1; b <= tb; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && role !== 'bridge') continue;
    if (seededUnit(seed, b, 98205) > 0.4) continue;
    bluesBars.push(b);
    receipts.deviceReceipts.push(`jb:blues_tension@bar${b}`);
  }

  for (let b = 1; b <= tb; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && role !== 'chorus') continue;
    if (seededUnit(seed, b, 98203) > 0.75) continue;
    receipts.deviceReceipts.push(`jb:horn_stab_rhythm@bar${b}`);
  }

  /* Piece-final only: force funk tonic-9 + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts.deviceReceipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts.deviceReceipts, context);

  const vampStats = collectVampLockRuns(out, context);
  const stabStats = collectHornStabHitRate({ context, receiptStrings: receipts.deviceReceipts, tb });

  genMeta.jamesBrownEffectiveHarmonyBars = out;
  genMeta.jamesBrownDeviceReceipts = receipts.deviceReceipts;
  genMeta.jamesBrownAntiElaborationGuards = guards;
  genMeta.jamesBrownBluesTensionBars = bluesBars;
  genMeta.jamesBrownVampLockStats = vampStats;
  genMeta.jamesBrownStabPlacementStats = {
    eligibleBars: stabStats.eligibleBars,
    stabReceiptBars: stabStats.stabReceiptBars,
    hitRate: stabStats.eligibleBars > 0 ? stabStats.stabReceiptBars / stabStats.eligibleBars : 0,
  };
}

/**
 * GCE / FBT landing check for piece-final force.
 * Funk tonic-9 is mid-tension (0.55) under finalBarTension — not jazz maj7,
 * and not dominant-family (no `7`/`alt`/`13` digit path).
 */
function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  const hp = parseChordSymbol(s).harmonyPart;
  if (/^[A-G](?:#|b)?9$/i.test(hp)) return true;
  return false;
}

/** Piece-final tonic: dominant-9 (JB vamp vocabulary; strips maj7 mid-piece). */
function spellJamesBrownTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}9`,
    receipt: `jb:final_tonic_cadence@bar${bar}`,
  };
}

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
  const { symbol, receipt } = spellJamesBrownTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

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
  const { symbol, receipt } = spellJamesBrownTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function finalizeJamesBrownMetadata(metadata: GenerationMetadata, acc: JamesBrownHarmonyAccumulator): void {
  const flat = [...(metadata.jamesBrownDeviceReceipts ?? [])];
  const g = metadata.jamesBrownAntiElaborationGuards ?? {
    reharmBlock: 0,
    turnaroundBlock: 0,
    extensionBeyond13: 0,
  };
  const guardTotal = g.reharmBlock + g.turnaroundBlock + g.extensionBeyond13;
  const d = {
    songwriterId: 'james_brown' as const,
    barsConsidered: acc.barsConsidered,
    dominantVampTouches: acc.dominantVampTouches,
    minorSeventhTouches: acc.minorSeventhTouches,
    extensionTouches: acc.extensionTouches,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
    vampLockStats: metadata.jamesBrownVampLockStats,
    stabPlacement: metadata.jamesBrownStabPlacementStats,
  } as const;
  const receipt = [
    `James Brown (dominant-centre slice): domColour≈${acc.dominantVampTouches}`,
    `m7≈${acc.minorSeventhTouches}`,
    `ext≈${acc.extensionTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.jamesBrownDiagnostics = { ...d };
  metadata.jamesBrownSliceReceipt = receipt;
}

/**
 * Device 3 — mark short comp hits on beats 1 and 3 (voice-2 chord stacks when present).
 * Device 5 — blues tension on comp chord events for selected bars (metadata-driven).
 */
export function applyJamesBrownGuitarBarPasses(m: MeasureModel, bar: number, context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  if (!isSongwriterJamesBrown(context.generationMetadata)) return;
  const role = coarseSectionRoleFromBar(bar, context);
  const tensionBars = new Set(
    Array.isArray(md.jamesBrownBluesTensionBars) ? (md.jamesBrownBluesTensionBars as number[]) : []
  );

  for (const e of m.events) {
    if (e.kind !== 'chord') continue;
    const c = e as ChordEvent;
    const sb = c.startBeat;
    if ((role === 'verse' || role === 'chorus') && (sb === 0 || sb === 2)) {
      c.stabDuration = 'short';
    }
    if (tensionBars.has(bar) && (role === 'verse' || role === 'bridge')) {
      c.bluesTension = true;
    }
  }
}
