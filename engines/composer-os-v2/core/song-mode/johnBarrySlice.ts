/**
 * John Barry — thematic monolith Film Soundtrack slice (`jbr:*` receipts).
 * Bond harmonic language, brass-strings polarity, melodic nobility, restraint plus mass —
 * distinct from Herrmann dread, Morricone ritual, Goldsmith atonality, Schifrin groove.
 *
 * Note: `jb:*` is owned by James Brown (`jamesBrownSlice.ts`); Barry uses `jbr:*`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { seededFilmUnit } from './filmSoundtrackHarmonySlices';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface JohnBarrySliceParams {
  thematicMonolith: number;
  bondHarmony: number;
  brassStringPolarity: number;
  melodicNobility: number;
  restraintPlusMass: number;
}

export const DEFAULT_JOHN_BARRY_SLICE_PARAMS: JohnBarrySliceParams = {
  thematicMonolith: 0.8,
  bondHarmony: 0.75,
  brassStringPolarity: 0.78,
  melodicNobility: 0.72,
  restraintPlusMass: 0.7,
};

export type BarryThematicSection =
  | 'theme_ostinato'
  | 'bond_cue'
  | 'brass_declaration'
  | 'string_mass'
  | 'chromatic_bass_pass'
  | 'romantic_arrival';

export interface BarryThemePhrase {
  index: number;
  startBar: number;
  endBar: number;
  progression: readonly string[];
  section: BarryThematicSection;
  /** Two-chord ostinato loop when set. */
  ostinatoPair?: readonly [string, string];
}

export interface BarryThematicMonolithPlan {
  phrases: BarryThemePhrase[];
  sliceParams: JohnBarrySliceParams;
  themeRestatementBars: number[];
  climaxBars: number[];
}

const BARRY_PROGRESSIONS: ReadonlyArray<readonly string[]> = [
  ['Cm(maj7)', 'Cm6', 'Fm(add9)', 'Bb13', 'Eb6/9'],
  ['Dm(maj7)', 'Dm6', 'Gm9', 'A7alt', 'D6/9'],
  ['Em(maj7)(add9)', 'Em6', 'Am11', 'D7(#9)', 'G6/9'],
  ['Cm(maj7)', 'Cm(maj7)/B', 'Cm(maj7)/Bb', 'Cm6', 'F6/9'],
  ['Fm6', 'Fm6/E', 'Fm6/Eb', 'Ab6/9', 'Db6/9'],
];

const BARRY_OSTINATO_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['Cm(maj7)', 'Cm6'],
  ['Dm(maj7)', 'Dm6'],
  ['Em(maj7)(add9)', 'Em6'],
  ['Fm(add9)', 'Cm6'],
];

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function transposeProgression(prog: readonly string[], tonicPc: number, refPc: number): string[] {
  const shift = ((tonicPc - refPc) % 12 + 12) % 12;
  if (shift === 0) return [...prog];
  return prog.map((sym) => {
    const hp = parseChordSymbol(stemOnly(sym)).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) return sym;
    const rootPc = noteNameToPitchClass(m[1]);
    if (rootPc === undefined) return sym;
    const newRoot = pitchClassToSharpName((rootPc + shift) % 12);
    const qual = hp.slice(m[1].length);
    const slash = slashTail(sym);
    return `${newRoot}${qual}${slash}`;
  });
}

function transposePair(pair: readonly [string, string], tonicPc: number, refPc: number): [string, string] {
  const t = transposeProgression(pair, tonicPc, refPc);
  return [t[0]!, t[1]!];
}

export function resolveJohnBarrySliceParams(genMeta: GenerationMetadata | undefined): JohnBarrySliceParams {
  const fromMeta = genMeta?.johnBarrySliceParams;
  const d = DEFAULT_JOHN_BARRY_SLICE_PARAMS;
  if (!fromMeta) return { ...d };
  return {
    thematicMonolith: clamp01(fromMeta.thematicMonolith ?? d.thematicMonolith),
    bondHarmony: clamp01(fromMeta.bondHarmony ?? d.bondHarmony),
    brassStringPolarity: clamp01(fromMeta.brassStringPolarity ?? d.brassStringPolarity),
    melodicNobility: clamp01(fromMeta.melodicNobility ?? d.melodicNobility),
    restraintPlusMass: clamp01(fromMeta.restraintPlusMass ?? d.restraintPlusMass),
  };
}

function phraseSpanBars(seed: number, phraseIndex: number): number {
  const u = seededFilmUnit(seed, phraseIndex, 100101);
  if (u < 0.3) return 8;
  if (u < 0.55) return 6;
  if (u < 0.8) return 4;
  return 5;
}

function sectionForPhraseIndex(idx: number, seed: number): BarryThematicSection {
  if (idx === 0) return 'theme_ostinato';
  const u = seededFilmUnit(seed, idx, 100102);
  if (u < 0.2) return 'bond_cue';
  if (u < 0.38) return 'chromatic_bass_pass';
  if (u < 0.55) return 'brass_declaration';
  if (u < 0.72) return 'string_mass';
  if (u < 0.88) return 'theme_ostinato';
  return 'romantic_arrival';
}

export function buildBarryThematicMonolithPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: JohnBarrySliceParams = DEFAULT_JOHN_BARRY_SLICE_PARAMS
): BarryThematicMonolithPlan {
  const phrases: BarryThemePhrase[] = [];
  const themeRestatementBars: number[] = [];
  const climaxBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const span = Math.min(phraseSpanBars(seed, idx), totalBars - bar + 1);
    const endBar = bar + span - 1;
    const baseProg = BARRY_PROGRESSIONS[idx % BARRY_PROGRESSIONS.length]!;
    const progression = transposeProgression(baseProg, tonicPc, 0);
    const section = sectionForPhraseIndex(idx, seed);
    const ostinatoPair =
      section === 'theme_ostinato' || section === 'bond_cue'
        ? transposePair(BARRY_OSTINATO_PAIRS[idx % BARRY_OSTINATO_PAIRS.length]!, tonicPc, 0)
        : undefined;

    phrases.push({ index: idx, startBar: bar, endBar, progression, section, ostinatoPair });

    if (section === 'brass_declaration' || section === 'romantic_arrival') {
      themeRestatementBars.push(endBar);
    }
    if (section === 'romantic_arrival' || (idx > 0 && section === 'brass_declaration')) {
      climaxBars.push(endBar);
    }

    bar = endBar + 1;
    idx++;
  }

  return { phrases, sliceParams: params, themeRestatementBars, climaxBars };
}

export function phraseForBar(plan: BarryThematicMonolithPlan, bar: number): BarryThemePhrase | undefined {
  return plan.phrases.find((p) => bar >= p.startBar && bar <= p.endBar);
}

function chordFromPhrase(phrase: BarryThemePhrase, bar: number): string {
  if (phrase.ostinatoPair) {
    const rel = bar - phrase.startBar;
    return rel % 2 === 0 ? phrase.ostinatoPair[0] : phrase.ostinatoPair[1];
  }
  const rel = bar - phrase.startBar;
  const span = phrase.endBar - phrase.startBar + 1;
  const slot = Math.min(
    phrase.progression.length - 1,
    Math.floor((rel / Math.max(1, span)) * phrase.progression.length)
  );
  return phrase.progression[slot] ?? phrase.progression[0]!;
}

function bondPaletteColour(symbol: string, seed: number, bar: number, bondHarmony: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededFilmUnit(seed, bar, 100201);
  const qual = hp.slice(root.length);
  const slash = slashTail(symbol);
  if (/maj7|m6|add9|6\/9|6-9|\(maj7\)/.test(hp)) return symbol;
  if (u < bondHarmony * 0.35) return `${root}m(maj7)${slash}`;
  if (u < bondHarmony * 0.55) return `${root}m6${slash}`;
  if (u < bondHarmony * 0.72) return `${root}m(add9)${slash}`;
  if (u < bondHarmony * 0.88) return `${root}(maj7)(add9)${slash}`;
  return `${root}6/9${slash || qual ? slash : ''}`;
}

function applyMinorMajorBrightening(symbol: string, tonicName: string): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return `${tonicName}6/9`;
  if (/^m|min|-/.test(hp.slice(root.length))) return `${tonicName}6/9`;
  return `${tonicName}maj9`;
}

function applyChromaticBassDescent(symbol: string, bar: number, seed: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const qual = hp.slice(root.length);
  const rootPc = noteNameToPitchClass(root);
  if (rootPc === undefined) return symbol;
  const step = seededFilmUnit(seed, bar, 100301) < 0.5 ? 1 : 2;
  const bassPc = (rootPc - step + 12) % 12;
  const bassName = pitchClassToSharpName(bassPc);
  return `${root}${qual}/${bassName}`;
}

function applyBarryLayers(
  out: string[],
  plan: BarryThematicMonolithPlan,
  seed: number,
  receipts: string[],
  context: CompositionContext,
  params: JohnBarrySliceParams
): void {
  const tb = out.length;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 0;
  const tonicName = pitchClassToSharpName(tonicPc);

  for (const phrase of plan.phrases) {
    receipts.push(
      `jbr:phrase@${phrase.startBar}-${phrase.endBar}:section=${phrase.section};prog=${phrase.progression.slice(0, 4).join('>')}`
    );
  }

  for (let bar = 1; bar <= tb; bar++) {
    if (isProtectedBar(bar, context)) continue;
    const phrase = phraseForBar(plan, bar);
    if (!phrase) continue;

    const i = bar - 1;
    out[i] = chordFromPhrase(phrase, bar);

    if (seededFilmUnit(seed, bar, 100401) < params.thematicMonolith) {
      receipts.push(`jbr:thematic_monolith@${bar}`);
      if (phrase.ostinatoPair) receipts.push(`jbr:theme_cell_loop@${bar}`);
    }

    if (seededFilmUnit(seed, bar, 100402) < params.bondHarmony) {
      out[i] = bondPaletteColour(out[i]!, seed, bar, params.bondHarmony);
      receipts.push(`jbr:bond_chord_palette@${bar}`);
      if (/m\(maj7\)|m6|m\(add9\)|\(maj7\)\(add9\)|6\/9/.test(out[i]!)) {
        receipts.push(`jbr:bond_chord@${bar}`);
      }
    }

    if (phrase.section === 'chromatic_bass_pass' && seededFilmUnit(seed, bar, 100403) < params.bondHarmony * 0.85) {
      out[i] = applyChromaticBassDescent(out[i]!, bar, seed);
      receipts.push(`jbr:chromatic_bass_descent@${bar}`);
    }

    if (phrase.section === 'romantic_arrival' && bar === phrase.endBar) {
      out[i] = applyMinorMajorBrightening(out[i]!, tonicName);
      receipts.push(`jbr:minor_major_duality@${bar}`);
    } else if (seededFilmUnit(seed, bar, 100404) < params.bondHarmony * 0.45) {
      receipts.push(`jbr:minor_major_duality@${bar}:held_ambiguity`);
    }

    if (seededFilmUnit(seed, bar, 100501) < params.brassStringPolarity) {
      if (phrase.section === 'brass_declaration' || phrase.section === 'bond_cue') {
        receipts.push(`jbr:block_brass_declaration@${bar}`);
        if (seededFilmUnit(seed, bar, 100502) < 0.45) receipts.push(`jbr:plunger_mute@${bar}`);
      }
      if (phrase.section === 'string_mass' || phrase.section === 'romantic_arrival') {
        receipts.push(`jbr:string_emotional_mass@${bar}`);
      }
    }

    if (seededFilmUnit(seed, bar, 100601) < params.melodicNobility) {
      receipts.push(`jbr:melodic_nobility@${bar}`);
      if (phrase.section === 'brass_declaration' && seededFilmUnit(seed, bar, 100602) < 0.55) {
        receipts.push(`jbr:bond_cell@${bar}:3note`);
      }
      if (bar === phrase.endBar) receipts.push(`jbr:long_phrase_arc@${bar}`);
    }

    if (seededFilmUnit(seed, bar, 100701) < params.restraintPlusMass) {
      if (plan.climaxBars.includes(bar)) {
        receipts.push(`jbr:climax_by_accumulation@${bar}`);
        receipts.push(`jbr:register_expansion@${bar}`);
      }
      if (plan.themeRestatementBars.includes(bar)) {
        receipts.push(`jbr:full_theme_statement@${bar}`);
      }
      if (seededFilmUnit(seed, bar, 100702) < 0.35) receipts.push(`jbr:gesture_space@${bar}`);
    }

    if (seededFilmUnit(seed, bar, 100801) < 0.55) {
      receipts.push(`jbr:british_noble_weight@${bar}`);
    }
  }

  /* Piece-final only: Bond tonic lock (mirrors Wayne force/enforce). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Barry devices untouched.
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

/** Piece-final tonic: minor-major 7 (Bond / Barry vocabulary; passes finalBarTension). */
function spellBarryTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}m(maj7)`,
    receipt: `jbr:final_tonic_cadence@bar${bar}`,
  };
}

/**
 * Primary force: piece-final bar always lands on Bond tonic-family (mirrors Wayne
 * `forceFinalBarTonicResolution`). Mid-piece Barry devices untouched.
 *
 * Closes residual FBT fail where phrase slot + chromatic bass leave a transposed
 * `Bb13` → `C13/A#` (or similar dominant-13 slash) on the final bar.
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
  const { symbol, receipt } = spellBarryTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

/**
 * Safety net: if bar N is still non-tonic after primary force, rewrite to tonic m(maj7)
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
  const { symbol, receipt } = spellBarryTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export interface JohnBarryHarmonyAccumulator {
  barsConsidered: number;
  bondTouches: number;
  themeTouches: number;
}

export function createJohnBarryHarmonyAccumulator(): JohnBarryHarmonyAccumulator {
  return { barsConsidered: 0, bondTouches: 0, themeTouches: 0 };
}

export function accumulateJohnBarryHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: JohnBarryHarmonyAccumulator
): void {
  const c = currentChord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(stemOnly(c)).harmonyPart.toLowerCase();
  if (/m\(maj7\)|m6|add9|6\/9|\(maj7\)/.test(t)) acc.bondTouches++;
}

export function thematicMonolithReceiptCount(receipts: readonly string[] | undefined): number {
  return (receipts ?? []).filter((r) => r.startsWith('jbr:thematic_monolith@')).length;
}

export function bondPaletteReceiptCount(receipts: readonly string[] | undefined): number {
  return (receipts ?? []).filter((r) => r.startsWith('jbr:bond_chord_palette@')).length;
}

export function brassPolarityReceiptCount(receipts: readonly string[] | undefined): number {
  return (receipts ?? []).filter(
    (r) => r.startsWith('jbr:block_brass_declaration@') || r.startsWith('jbr:string_emotional_mass@')
  ).length;
}

export function hasHerrmannBleedReceipts(receipts: readonly string[] | undefined): boolean {
  return (receipts ?? []).some((r) => r.startsWith('bh:') || r.includes('chromatic_inner_string'));
}

export function minBarryPhraseSpan(plan: BarryThematicMonolithPlan | undefined): number {
  if (!plan?.phrases.length) return 0;
  return Math.min(...plan.phrases.map((p) => p.endBar - p.startBar + 1));
}

export function precomputeJohnBarryEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 0;
  const params = resolveJohnBarrySliceParams(genMeta);
  genMeta.johnBarrySliceParams = params;

  const plan = buildBarryThematicMonolithPlan(seed, tb, tonicPc, params);
  genMeta.barryThematicMonolithPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `jbr:params=tm:${params.thematicMonolith.toFixed(2)};bh:${params.bondHarmony.toFixed(2)};bsp:${params.brassStringPolarity.toFixed(2)};mn:${params.melodicNobility.toFixed(2)};rpm:${params.restraintPlusMass.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  const out = [...raw];
  applyBarryLayers(out, plan, seed, receipts, context, params);

  genMeta.johnBarryEffectiveHarmonyBars = out;
  genMeta.johnBarryDeviceReceipts = receipts;
}

export function finalizeJohnBarryMetadata(
  metadata: GenerationMetadata,
  acc: JohnBarryHarmonyAccumulator
): void {
  const flat = metadata.johnBarryDeviceReceipts ?? [];
  const plan = metadata.barryThematicMonolithPlan;
  const params = metadata.johnBarrySliceParams ?? DEFAULT_JOHN_BARRY_SLICE_PARAMS;

  metadata.johnBarryDiagnostics = {
    songwriterId: 'john_barry',
    barsConsidered: acc.barsConsidered,
    thematicMonolithTouches: thematicMonolithReceiptCount(flat),
    bondPaletteTouches: bondPaletteReceiptCount(flat),
    brassPolarityTouches: brassPolarityReceiptCount(flat),
    melodicNobilityTouches: flat.filter((r) => r.startsWith('jbr:melodic_nobility@')).length,
    climaxTouches: flat.filter((r) => r.startsWith('jbr:climax_by_accumulation@')).length,
    minPhraseSpan: minBarryPhraseSpan(plan),
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.johnBarrySliceReceipt = [
    'John Barry (thematic monolith Film slice)',
    `phrases=${plan?.phrases.length ?? 0}`,
    `tm=${params.thematicMonolith.toFixed(2)}`,
    `bond≈${bondPaletteReceiptCount(flat)}`,
    `brass≈${brassPolarityReceiptCount(flat)}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function isSongwriterJohnBarry(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'john_barry' } {
  return genMeta?.songwriterStyleId === 'john_barry';
}
