/**
 * Donald Fagen — jazz-rock / studio precision Song Mode / duo golden-path **harmony** slice.
 * Tight tertian labels: Lydian tonic colour (maj9 / maj7#11), rich dominants (9 / 13), chromatic approach harmony,
 * tritone / backdoor cadence options, sus breathing room — receipts `df:*`.
 *
 * No `core/style-modules/donald-fagen/` package; this slice owns symbol-level harmony for `donald_fagen` primary.
 * Melodic / keys-comp colour remains in `generateGoldenPathDuoScore` (existing Fagen guitar passes + keys-comp V1.5).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

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

function phrasePositionFromBar(bar: number): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const k = (bar - 1) % 4;
  if (k === 0) return 'phraseStart';
  if (k === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

export function isSongwriterDonaldFagen(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'donald_fagen' } {
  return genMeta?.songwriterStyleId === 'donald_fagen';
}

/**
 * Harmonic-path gate — primary `donald_fagen` **or** exact `harmonicVoice=donald_fagen`.
 * Soft aliases (`fagen`, `steely_dan`) stay primary-intake via songwriter normalize; they do **not** engage HV.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - Guitar / keys-comp colour biases (`applyFagen*` passes)
 * - Accumulator finalize stamps
 */
export function isDonaldFagenHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'donald_fagen' || voice === 'donald_fagen';
}

export interface DonaldFagenHarmonyAccumulator {
  barsConsidered: number;
  lydianTonicTouches: number;
  dominantEnrichTouches: number;
  chromaticApproachTouches: number;
  susBreathTouches: number;
}

export function createDonaldFagenHarmonyAccumulator(): DonaldFagenHarmonyAccumulator {
  return {
    barsConsidered: 0,
    lydianTonicTouches: 0,
    dominantEnrichTouches: 0,
    chromaticApproachTouches: 0,
    susBreathTouches: 0,
  };
}

/** Dominant-type harmony spelled as plain `7` without 9/13/11 extensions yet. */
function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13/.test(rest)) return false;
  if (/b9|#9|#11|b13|b5|#5/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

function looksStrongDominant(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return /^7/.test(rest) || /^9/.test(rest) || /^13/.test(rest);
}

function scanChordForDiagnostics(chord: string, acc: DonaldFagenHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/maj9|maj7#11|maj7\(#11\)/.test(t)) acc.lydianTonicTouches++;
  if (looksStrongDominant(c) && (/(^|[^a-z])9([^a-z]|$)|\b13\b/.test(t))) acc.dominantEnrichTouches++;
  if (/sus(2|4)/.test(t)) acc.susBreathTouches++;
}

export function accumulateDonaldFagenHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: DonaldFagenHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface DonaldFagenAntiElaborationGuards {
  clusterVoicingReduced: number;
  denseAlterationReduced: number;
}

/** Precision-first: strip ambiguous dense stacks toward tertian spellings the exporter handles cleanly. */
function sanitizePrecision(symbol: string, guards: DonaldFagenAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(s);

  if (/add11|13.*\(.*#11|maj9\(.*#11|\(13.*11\)/.test(tl)) {
    guards.clusterVoicingReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    const tail = hp.slice(root!.length).replace(/\s/g, '');
    if (/m(?!aj)/.test(tail)) return `${root}m9${slash}`;
    return `${root}maj9${slash}`;
  }

  if (/\balt\b|7\(.*alt|7\(.*b13.*#9/.test(tl)) {
    guards.denseAlterationReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    return `${root}7b9${slash}`;
  }

  return s;
}

function isTonicMajorFamily(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|min|dim|ø|sus/.test(tl)) return false;
  if (/\b7\b/.test(tl) && !/maj7|maj9|mmaj7|Δ/.test(tl)) return false;
  return true;
}

function enrichTonicLydian(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!isTonicMajorFamily(symbol, tonicPc)) return symbol;
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  const tl = hp.toLowerCase();
  if (/maj9|maj7#11|maj7\(#11\)|Δ/.test(tl)) return symbol;

  const pickSharp11 = seededUnit(seed, bar, 771101) < 0.45;
  if (rest === '' || /^major$/i.test(rest) || rest === 'maj') {
    return pickSharp11 ? `${root}maj7#11${slash}` : `${root}maj9${slash}`;
  }
  if (/^maj7$|^maj$|Δ/.test(rest) || /\bmaj7\b/.test(tl)) {
    return pickSharp11 ? `${root}maj7#11${slash}` : `${root}maj9${slash}`;
  }
  return symbol;
}

function enrichDominantNineOrThirteen(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const use13 = seededUnit(seed, bar, 771201) < 0.42;
  return use13 ? `${root}13${slash}` : `${root}9${slash}`;
}

function tritoneSubDominantSymbol(symbol: string): string {
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const subPc = (r + 6) % 12;
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/\b13\b/.test(tl)) return `${pitchClassToSharpName(subPc)}13${slash}`;
  if (/\b9\b/.test(tl)) return `${pitchClassToSharpName(subPc)}9${slash}`;
  return `${pitchClassToSharpName(subPc)}7${slash}`;
}

function applyTritoneSubPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const v = out[b - 1]!;
    const i = out[b]!;
    if (!looksStrongDominant(v)) continue;
    if (harmonyRootPc(i) !== tonicPc) continue;
    if (!isTonicMajorFamily(i, tonicPc)) continue;
    if (phrasePositionFromBar(b + 1) !== 'phraseFinal' && seededUnit(seed, b, 771301) > 0.5) continue;
    if (seededUnit(seed, b, 771302) >= 0.38) continue;
    out[b - 1] = tritoneSubDominantSymbol(v);
    receipts.push(`df:tri_sub@bar${b}`);
  }
}

/** Backdoor: replace dominant lead-in with bVII7 before tonic resolution (phrase-final cadence window). */
function applyBackdoorDominantPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const bViiPc = (tonicPc + 10) % 12;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b - 1, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseFinal') continue;
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    if (!looksStrongDominant(prev)) continue;
    if (harmonyRootPc(cur) !== tonicPc || !isTonicMajorFamily(cur, tonicPc)) continue;
    if (seededUnit(seed, b, 771401) >= 0.24) continue;
    const slash = slashTail(prev);
    out[b - 2] = `${pitchClassToSharpName(bViiPc)}13${slash}`;
    receipts.push(`df:backdoor@bar${b - 1}`);
  }
}

/** Chromatic inner-line hints via slash bass between neighbouring chord roots (displacement-friendly spelling). */
function applyChromaticInnerSlashPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) === 'phraseFinal') continue;
    if (seededUnit(seed, b, 771501) >= 0.32) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    const prev = out[b - 2]!;
    const r0 = harmonyRootPc(prev);
    const r1 = harmonyRootPc(sym);
    if (r0 === undefined || r1 === undefined) continue;
    const diff = (r1 - r0 + 12) % 12;
    if (diff !== 1 && diff !== 11) continue;
    const bassPc = (r1 + 11 + 12) % 12;
    const hp = parseChordSymbol(sym).harmonyPart;
    const rootName = hp.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const tail = hp.slice(rootName.length);
    out[b - 1] = `${rootName}${tail}/${pitchClassToSharpName(bassPc)}`;
    receipts.push(`df:chrom_slash@bar${b}`);
  }
}

/** Sus2 / sus4 breathing room after dense extensions (phrase-middle syncopation pocket). */
function applySusBreathPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseMiddle') continue;
    const prev = out[b - 2]!;
    const tlPrev = parseChordSymbol(prev).harmonyPart.toLowerCase();
    if (!/(maj9|13|11)/.test(tlPrev)) continue;
    if (seededUnit(seed, b, 771601) >= 0.22) continue;
    const sym = out[b - 1]!;
    if (/sus/.test(parseChordSymbol(sym).harmonyPart.toLowerCase())) continue;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const sus2 = seededUnit(seed, b, 771602) < 0.5;
    const slash = slashTail(sym);
    out[b - 1] = sus2 ? `${pitchClassToSharpName(r)}sus2${slash}` : `${pitchClassToSharpName(r)}sus4${slash}`;
    receipts.push(`df:sus_breath@bar${b}`);
  }
}

/** Phrase-position bias: anticipation pocket — enrich dominants one beat earlier in harmony label via slash push (symbol-level). */
function applyPhraseAnticipationBiasPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 771701) >= 0.28) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (!looksStrongDominant(sym)) continue;
    const root = harmonyRootPc(sym);
    if (root === undefined) continue;
    const hp = parseChordSymbol(sym).harmonyPart;
    const rootName = hp.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const tail = hp.slice(rootName.length);
    const anticipPc = (root + 7 + 12) % 12;
    out[b - 1] = `${rootName}${tail}/${pitchClassToSharpName(anticipPc)}`;
    receipts.push(`df:anticipation_slash@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after Donald Fagen slice devices.
 * Call when {@link isDonaldFagenHarmonicPath} (primary or exact HV).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeDonaldFagenEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: DonaldFagenAntiElaborationGuards = {
    clusterVoicingReduced: 0,
    denseAlterationReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = sanitizePrecision(resolveBarSymbol(context, b).symbol, guards);
    sym = enrichTonicLydian(sym, tonicPc, seed, b);
    sym = enrichDominantNineOrThirteen(sym, seed, b);
    sym = sanitizePrecision(sym, guards);
    raw.push(sym);
  }

  const out = [...raw];

  applyTritoneSubPass(out, tonicPc, seed, receipts, tb, context);
  applyBackdoorDominantPass(out, tonicPc, seed, receipts, tb, context);
  applyChromaticInnerSlashPass(out, seed, receipts, tb, context);
  applySusBreathPass(out, seed, receipts, tb, context);
  applyPhraseAnticipationBiasPass(out, seed, receipts, tb, context);

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.donaldFagenEffectiveHarmonyBars = out;
  genMeta.donaldFagenDeviceReceipts = receipts;
  genMeta.donaldFagenAntiElaborationGuards = guards;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Fagen devices untouched.
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

/**
 * Piece-final tonic: maj9 — enrichTonicLydian pool (maj9 · maj7#11; avoid bare 13 FBT trap).
 */
function spellFagenTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9`,
    receipt: `df:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellFagenTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellFagenTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function finalizeDonaldFagenMetadata(metadata: GenerationMetadata, acc: DonaldFagenHarmonyAccumulator): void {
  const flat = [...(metadata.donaldFagenDeviceReceipts ?? [])];
  const g = metadata.donaldFagenAntiElaborationGuards ?? {
    clusterVoicingReduced: 0,
    denseAlterationReduced: 0,
  };
  const guardTotal = g.clusterVoicingReduced + g.denseAlterationReduced;
  const tri = flat.filter((r) => r.includes('df:tri_sub')).length;
  const back = flat.filter((r) => r.includes('df:backdoor')).length;
  const slash = flat.filter((r) => r.includes('df:chrom_slash') || r.includes('df:anticipation_slash')).length;
  const sus = flat.filter((r) => r.includes('df:sus_breath')).length;
  const d = {
    songwriterId: 'donald_fagen' as const,
    barsConsidered: acc.barsConsidered,
    lydianTonicTouches: acc.lydianTonicTouches,
    dominantEnrichTouches: acc.dominantEnrichTouches,
    chromaticApproachTouches: tri + back + slash,
    susBreathTouches: Math.max(acc.susBreathTouches, sus),
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Donald Fagen (jazz-rock harmony slice): lydian≈${acc.lydianTonicTouches}`,
    `domRich≈${acc.dominantEnrichTouches}`,
    `chrom≈${d.chromaticApproachTouches}`,
    `sus≈${d.susBreathTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.donaldFagenDiagnostics = { ...d };
  metadata.donaldFagenSliceReceipt = receipt;
}
