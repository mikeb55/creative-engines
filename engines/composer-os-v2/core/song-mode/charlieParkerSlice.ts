/**
 * Charlie Parker — bebop ii–V–I / tritone-sub / turnaround Song Mode / duo golden-path **harmony** slice.
 * Clean tertian bebop spellings, ii–V clarification, isolated tritone subs, turnaround compression, Bird enclosure — receipts **`cp:*`**.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `charlie_parker` only — soft `bird` / `parker` / `charlie` stay
 * songwriter-normalize; they do **not** engage HV.
 * Receipt prefix `cp:*` is cosmetic-only vs cole_porter (separate DeviceReceipts keys).
 */
export function isCharlieParkerHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'charlie_parker' || voice === 'charlie_parker';
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

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

export function isSongwriterCharlieParker(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'charlie_parker' } {
  return genMeta?.songwriterStyleId === 'charlie_parker';
}

export interface CharlieParkerHarmonyAccumulator {
  barsConsidered: number;
  iiVIClarified: number;
  tritoneSubTouches: number;
  turnaroundCompressed: number;
  bebopEnrichTouches: number;
}

export function createCharlieParkerHarmonyAccumulator(): CharlieParkerHarmonyAccumulator {
  return {
    barsConsidered: 0,
    iiVIClarified: 0,
    tritoneSubTouches: 0,
    turnaroundCompressed: 0,
    bebopEnrichTouches: 0,
  };
}

function headHarmony(symbol: string): string {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  return slashIdx >= 0 ? h.slice(0, slashIdx) : h;
}

function scanChordForDiagnostics(chord: string, acc: CharlieParkerHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = headHarmony(c).toLowerCase();
  if (/\bm7\b|\bm11\b|-7/.test(hp)) acc.iiVIClarified++;
  if (/7|b9|#9|alt/.test(hp) && !/maj7|mmaj/.test(hp)) acc.tritoneSubTouches++;
}

export function accumulateCharlieParkerHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: CharlieParkerHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

function hasDominantAlterations(symbol: string): boolean {
  const rest = parseChordSymbol(symbol).harmonyPart.replace(/\s/g, '').toLowerCase();
  return /b9|#9|#11|b13|alt|13|11|9/.test(rest);
}

/** Minor seventh / ii colours — m7, m11, -7 (not maj/min triads, not half-dim). */
function isMinorSeventhChord(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|dim|ø|sus|aug/.test(tl)) return false;
  return /\bm7\b|\bm11\b|\b-7\b|m9\b/.test(tl) || /^[A-G][#b]?m(7|9|11)/i.test(hp.replace(/\s/g, ''));
}

/** Dominant-family (including altered); excludes maj7 / minor triads. */
function isDominantSevenFamily(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj|dim|ø|aug/.test(tl)) return false;
  if (/^([A-G][#b]?)m(?!aj)/i.test(hp) && !/\b7\b|-7|m7/.test(tl)) return false;
  return /\b7\b|b9|#9|alt|13|11|9\(|-7\b/.test(tl) || isPlainDominantSeventh(symbol);
}

function rootIntervalSemitones(symA: string, symB: string): number | undefined {
  const a = harmonyRootPc(symA);
  const b = harmonyRootPc(symB);
  if (a === undefined || b === undefined) return undefined;
  return (b - a + 12) % 12;
}

function spellXm7Root(symbol: string): string | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  return m?.[1];
}

/** Strip ii chord to clean Xm7 (drop add9 colour; m11 → m7). */
function clarifyMinorSevenIi(symbol: string): string {
  const slash = slashTail(symbol);
  const root = spellXm7Root(symbol);
  if (!root) return symbol;
  return `${root}m7${slash}`;
}

/** Plain dominant → X7b9. */
function enrichPlainDominantTo7b9(symbol: string): string {
  const slash = slashTail(symbol);
  const root = spellXm7Root(symbol);
  if (!root || !isPlainDominantSeventh(symbol)) return symbol;
  return `${root}7b9${slash}`;
}

function stripNonBebop(symbol: string): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const headOnly = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const tl = headOnly.toLowerCase();
  const root = headOnly.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;

  const isDom =
    /\b7\b/.test(tl) &&
    !/maj7|mmaj|dim|ø/.test(tl) &&
    (!/^[A-G][#b]?m/i.test(headOnly) || /m7|m9|-7/.test(tl));

  if (/\bmaj9\b/.test(tl)) return `${root}maj7${slash}`;
  if (/\bmaj13\b/.test(tl)) return `${root}maj7${slash}`;
  if (/\badd13\b/.test(tl)) {
    const stripped = headOnly.replace(/add13/gi, '').replace(/\s+/g, '');
    return `${stripped}${slash}`;
  }
  if (/sus2|sus4/.test(tl)) {
    if (isDom) return `${root}7${slash}`;
    if (/m(?!aj)/.test(tl) || /\bm/.test(tl)) return `${root}m7${slash}`;
    return `${root}maj7${slash}`;
  }
  return symbol;
}

function enrichBebopCore(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/sus|maj7|mmaj|dim|ø|\bm7\b|\bm11\b|add|quartal|7|9|11|13/.test(tl)) {
    if (/^6([^0-9]|$)/.test(rest) || rest === '6') return `${root}maj7${slash}`;
    return symbol;
  }
  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) return `${root}m7${slash}`;
  if (rest === '' || rest === 'major' || rest === 'maj') return `${root}maj7${slash}`;
  return symbol;
}

function isMajorSeventhPlain(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /\bmaj7\b|Δ/.test(tl) && !/#11/.test(tl);
}

function isPlainMinorSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|dim|ø|m11|add|sus/.test(tl)) return false;
  return /\bm7\b|\b-7\b/.test(tl);
}

function isTonicMajorResolution(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  if (r !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø/.test(tl)) return false;
  return /\bmaj7\b|Δ/.test(tl) || /^[A-G][#b]?($|maj|major)/i.test(parseChordSymbol(symbol).harmonyPart);
}

function sectionTailFourBarStarts(tb: number, context: CompositionContext): number[] {
  const out: number[] = [];
  const secs = context.form?.sections ?? [];
  for (const sec of secs) {
    if (sec.length >= 4) {
      const start = sec.startBar + sec.length - 4;
      out.push(start);
    }
  }
  if (tb >= 4) out.push(tb - 3);
  return [...new Set(out)].filter((s) => s >= 1 && s + 3 <= tb).sort((a, b) => a - b);
}

function matchesTurnaroundWindow(
  chords: [string, string, string, string],
  tonicPc: number | undefined
): boolean {
  if (tonicPc === undefined) return false;
  const [i1, i2, i3, i4] = chords.map(harmonyRootPc);
  if (i1 === undefined || i2 === undefined || i3 === undefined || i4 === undefined) return false;
  const viPc = (tonicPc + 9) % 12;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return i1 === tonicPc && i2 === viPc && i3 === iiPc && i4 === vPc;
}

/** d1 — clarify ii–V (probability 0.72). Returns bar indices touched (ii and V bars). */
function clarifyIIVI(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  touched: Set<number>
): void {
  for (let b = 1; b < tb; b++) {
    if (isProtectedBar(b, context) || isProtectedBar(b + 1, context)) continue;
    if (seededUnit(seed, b, 991101) >= 0.72) continue;
    const iiSym = out[b - 1]!;
    const vSym = out[b]!;
    if (!isMinorSeventhChord(iiSym)) continue;
    if (!isDominantSevenFamily(vSym)) continue;
    const iv = rootIntervalSemitones(iiSym, vSym);
    if (iv !== 5) continue;
    out[b - 1] = clarifyMinorSevenIi(iiSym);
    const vNow = out[b]!;
    if (isPlainDominantSeventh(vNow) && !hasDominantAlterations(vNow)) {
      out[b] = enrichPlainDominantTo7b9(vNow);
    }
    receipts.push(`cp:ii_v_clarify@bar${b}`);
    touched.add(b);
    touched.add(b + 1);
  }
}

/** d2 — tritone sub on isolated dominants (probability 0.38). */
function applyTritoneSubOnDominant(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  d1PairBars: Set<number>
): void {
  for (let b = 1; b <= tb; b++) {
    if (b === tb) continue;
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 991201) >= 0.38) continue;
    const sym = out[b - 1]!;
    if (!isDominantSevenFamily(sym)) continue;
    if (d1PairBars.has(b)) continue;
    const prev = b > 1 ? out[b - 2] : '';
    if (prev && isMinorSeventhChord(prev) && rootIntervalSemitones(prev, sym) === 5) continue;

    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const subPc = (r + 6) % 12;
    const subRoot = pitchClassToSharpName(subPc);
    const slash = slashTail(sym);
    const useB9 = seededUnit(seed, b, 991202) < 0.5;
    out[b - 1] = useB9 ? `${subRoot}7b9${slash}` : `${subRoot}7${slash}`;
    receipts.push(`cp:tritone_sub@bar${b}`);
  }
}

/** d3 — turnaround compression at section tails (probability 0.55). */
function compressTurnaround(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const starts = sectionTailFourBarStarts(tb, context);
  for (const s of starts) {
    if (seededUnit(seed, s, 991301) >= 0.55) continue;
    const w: [string, string, string, string] = [
      out[s - 1]!,
      out[s]!,
      out[s + 1]!,
      out[s + 2]!,
    ];
    if (!matchesTurnaroundWindow(w, tonicPc)) continue;
    const viBar = s + 1;
    if (isProtectedBar(viBar, context) || isProtectedBar(s, context)) continue;
    const slashVi = slashTail(w[1]);
    const bViiPc = (tonicPc + 10) % 12;
    const bViiRoot = pitchClassToSharpName(bViiPc);
    out[viBar - 1] = `${bViiRoot}7${slashVi}`;

    const iiBar = s + 2;
    const iiRoot = spellXm7Root(w[2]);
    const slashIi = slashTail(w[2]);
    if (iiRoot) out[iiBar - 1] = `${iiRoot}m7${slashIi}`;

    receipts.push(`cp:turnaround_compress@bar${viBar}`);
  }
}

function barIsIiVMinorThird(iiSym: string, vSym: string): boolean {
  return isMinorSeventhChord(iiSym) && isDominantSevenFamily(vSym) && rootIntervalSemitones(iiSym, vSym) === 5;
}

/** d4 — maj7#11 / m9 enrichment (probability 0.45). */
function enrichBebopScalePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 991401) >= 0.45) continue;
    const sym = out[b - 1]!;
    const nxt = b < tb ? out[b]! : '';
    const prv = b > 1 ? out[b - 2]! : '';

    if (isMajorSeventhPlain(sym)) {
      const slash = slashTail(sym);
      const root = spellXm7Root(sym);
      if (root) {
        out[b - 1] = `${root}maj7(#11)${slash}`;
        receipts.push(`cp:bebop_enrich@bar${b}`);
      }
      continue;
    }

    if (isPlainMinorSeventh(sym)) {
      const inIiV = prv && barIsIiVMinorThird(prv, sym);
      const leadsIiV = nxt && barIsIiVMinorThird(sym, nxt);
      if (inIiV || leadsIiV) continue;
      const slash = slashTail(sym);
      const root = spellXm7Root(sym);
      if (root) {
        out[b - 1] = `${root}m9${slash}`;
        receipts.push(`cp:bebop_enrich@bar${b}`);
      }
    }
  }
}

/** d5 — leading-tone slash enclosure into tonic (probability 0.22). */
function applyBirdEnclosure(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 991501) >= 0.22) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (!isTonicMajorResolution(sym, tonicPc)) continue;
    const leadPc = (tonicPc + 11) % 12;
    const bassName = pitchClassToSharpName(leadPc);
    out[b - 1] = `${sym}/${bassName}`;
    receipts.push(`cp:bird_enclosure@bar${b}`);
  }
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Parker devices untouched.
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

/** Piece-final tonic: maj7 (bebop vocabulary; passes finalBarTension tonic-family). */
function spellParkerTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj7`,
    receipt: `cp:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellParkerTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellParkerTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

/**
 * Precompute effective one chord per bar after Charlie Parker slice devices (primary `charlie_parker` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeCharlieParkerEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = stripNonBebop(sym);
    sym = enrichBebopCore(sym);
    raw.push(sym);
  }

  const out = [...raw];
  const d1Touched = new Set<number>();

  clarifyIIVI(out, seed, receipts, tb, context, d1Touched);
  applyTritoneSubOnDominant(out, seed, receipts, tb, context, d1Touched);
  compressTurnaround(out, tonicPc, seed, receipts, tb, context);
  enrichBebopScalePass(out, seed, receipts, tb, context);
  applyBirdEnclosure(out, tonicPc, seed, receipts, tb, context);

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.charlieParkerEffectiveHarmonyBars = out;
  genMeta.charlieParkerDeviceReceipts = receipts;
}

export function finalizeCharlieParkerMetadata(metadata: GenerationMetadata, acc: CharlieParkerHarmonyAccumulator): void {
  const flat = [...(metadata.charlieParkerDeviceReceipts ?? [])];
  const iiVI = flat.filter((r) => r.includes('cp:ii_v_clarify')).length;
  const trSub = flat.filter((r) => r.includes('cp:tritone_sub')).length;
  const turn = flat.filter((r) => r.includes('cp:turnaround_compress')).length;
  const enrich = flat.filter((r) => r.includes('cp:bebop_enrich')).length;
  const enc = flat.filter((r) => r.includes('cp:bird_enclosure')).length;

  const d = {
    songwriterId: 'charlie_parker' as const,
    barsConsidered: acc.barsConsidered,
    iiVIClarified: iiVI,
    tritoneSubTouches: trSub,
    turnaroundCompressed: turn,
    bebopEnrichTouches: enrich,
    birdEnclosureTouches: enc,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;

  const receipt = [
    `Charlie Parker (bebop ii-V-I slice): iiVI≈${iiVI}`,
    `tritoneSub≈${trSub}`,
    `turnaround≈${turn}`,
    `bebopEnrich≈${enrich}`,
    `enclosure≈${enc}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  metadata.charlieParkerDiagnostics = { ...d };
  metadata.charlieParkerSliceReceipt = receipt;
}
