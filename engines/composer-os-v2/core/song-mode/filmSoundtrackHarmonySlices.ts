/**
 * Film soundtrack Song Mode harmony slices — lead-sheet symbols only; device receipts use composer prefixes **bh:** **jwill:** **em:** **nr:** **jg:** **pg:** **hz:** **ab:**.
 */

import type {
  AngeloBadalamentiContextMode,
  BernardHerrmannContextMode,
  CompositionContext,
  EnnioMorriconeContextMode,
  GenerationMetadata,
  HansZimmerContextMode,
  JerryGoldsmithContextMode,
  JohnWilliamsContextMode,
  NinoRotaContextMode,
  PhilipGlassContextMode,
} from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function seededFilmUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

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

function extractRootAndSlash(symbol: string): { root: string; slash: string; rest: string } | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  const root = m[1];
  const rest = head.slice(root.length);
  return { root, slash: slashTail(symbol), rest };
}

function phraseRoleFourBar(bar: number, tb: number): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = (bar - 1) % 4;
  if (bar === tb) return 'phraseFinal';
  if (idx === 0) return 'phraseStart';
  if (idx === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

export interface FilmHarmonyAccumulator {
  barsConsidered: number;
}

export function createFilmHarmonyAccumulator(): FilmHarmonyAccumulator {
  return { barsConsidered: 0 };
}

export function accumulateFilmHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: FilmHarmonyAccumulator
): void {
  if (currentChord.trim()) acc.barsConsidered++;
}

/** --- Bernard Herrmann --- */
export let bernardHerrmannEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeBernardHerrmannEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: BernardHerrmannContextMode[] = ['bh:thriller_mode', 'bh:romantic_mode', 'bh:minimal_pulse'];
  const rawM = genMeta.bernardHerrmannContext as string | undefined;
  const mode: BernardHerrmannContextMode = modes.includes(rawM as BernardHerrmannContextMode)
    ? (rawM as BernardHerrmannContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.bernardHerrmannContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];
  const tonicPc = inferTonicPitchClassFromBar1(context);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 910101) < 0.16) {
      const sym = out[b - 1]!;
      const ex = extractRootAndSlash(sym);
      if (ex) {
        out[b - 1] = seededFilmUnit(seed, b, 910102) < 0.5 ? transposeChordRoot(sym, 6) : `${ex.root}aug${ex.slash}`;
        receipts.push(`bh:d1_polytonal_menace@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (b >= 2 && out[b - 1] === out[b - 2] && seededFilmUnit(seed, b, 910201) < 0.4) {
      receipts.push(`bh:d2_neurotic_ostinato@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 910301) < 0.13) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}dim7${ex.slash}`;
        receipts.push(`bh:d3_cluster_stab@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 910401) < 0.15 && tonicPc !== undefined) {
      const sym = out[b - 1]!;
      if (!sym.includes('/')) {
        out[b - 1] = `${sym}/${pitchClassToSharpName(tonicPc)}`;
        receipts.push(`bh:d4_pedal_swell@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const role = phraseRoleFourBar(b, tb);
    if ((role === 'phraseFinal' || role === 'phraseStart') && seededFilmUnit(seed, b, 910501) < 0.24) {
      receipts.push(`bh:d5_tritone_inflection@bar${b}`);
    }
  }

  /* Piece-final only: bias toward Herrmann-own open landings that already pass fBT. */
  biasBernardHerrmannFinalBarIdiomaticOpen(out, seed, tb, receipts, context, mode);

  genMeta.bernardHerrmannEffectiveHarmonyBars = out;
  genMeta.bernardHerrmannDeviceReceipts = receipts;
  bernardHerrmannEffectiveHarmonyBars = out;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece ostinato / pedal / cluster devices untouched.
 * Note: dim7 also fails FBT via digit `7`.
 */
function chordLooksDominantFamilyForFbtHerrmann(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Herrmann pool landings that already pass fBT
 * (tonic-root m / m(add2) / add2 stasis; maj7 / aug romantic+polytonal colours).
 * Not a forced jazz tonic cadence — thriller / polytonal idiom preserved.
 */
function biasBernardHerrmannFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  mode: BernardHerrmannContextMode
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtHerrmann(sym)) return;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return;
  const root = pitchClassToSharpName(tonicPc);
  const u = seededFilmUnit(seed, totalBars, 910601);

  let next: string;
  if (mode === 'bh:romantic_mode') {
    // Romantic branch — maj7 / add2 present; still mix stasis colours.
    if (u < 0.3) next = `${root}maj7`;
    else if (u < 0.5) next = `${root}m(add2)`;
    else if (u < 0.7) next = `${root}add2`;
    else if (u < 0.85) next = `${root}aug`;
    else next = `${root}m`;
  } else {
    // Thriller / minimal — dread stasis heavier; aug from polytonal_menace.
    if (u < 0.28) next = `${root}m`;
    else if (u < 0.52) next = `${root}m(add2)`;
    else if (u < 0.72) next = `${root}add2`;
    else if (u < 0.88) next = `${root}aug`;
    else next = `${root}maj7`;
  }

  out[idx] = next;
  receipts.push(`bh:final_open_bias@bar${totalBars}`);
}

export function finalizeBernardHerrmannMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.bernardHerrmannDeviceReceipts ?? [];
  metadata.bernardHerrmannDiagnostics = {
    songwriterId: 'bernard_herrmann',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.bernardHerrmannSliceReceipt = `Bernard Herrmann (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- John Williams --- */
export let johnWilliamsEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeJohnWilliamsEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: JohnWilliamsContextMode[] = ['jwill:heroic_mode', 'jwill:magic_mode', 'jwill:drama_mode'];
  const rawM = genMeta.johnWilliamsContext as string | undefined;
  const mode: JohnWilliamsContextMode = modes.includes(rawM as JohnWilliamsContextMode)
    ? (rawM as JohnWilliamsContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.johnWilliamsContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 920101) < 0.17) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}maj7(#11)${ex.slash}`;
        receipts.push(`jwill:d1_lydian_wonder@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 920201) < 0.16) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}7sus4${ex.slash}`;
        receipts.push(`jwill:d2_mixolydian_hero@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseStart' && seededFilmUnit(seed, b, 920301) < 0.35) {
      receipts.push(`jwill:d3_leitmotif_anchor@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseFinal' && seededFilmUnit(seed, b, 920401) < 0.2) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}maj9${ex.slash}`;
        receipts.push(`jwill:d4_brass_fanfare@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 920501) < 0.14) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 4);
      receipts.push(`jwill:d5_chromatic_mediant@bar${b}`);
    }
  }

  /* Piece-final only: force tonic maj9 + safety net (Wayne fBT pattern; mid-piece devices untouched). */
  const tonicPc = inferTonicPitchClassFromBar1(context);
  forceJohnWilliamsFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceJohnWilliamsFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.johnWilliamsEffectiveHarmonyBars = out;
  genMeta.johnWilliamsDeviceReceipts = receipts;
  johnWilliamsEffectiveHarmonyBars = out;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Lydian/fanfare devices untouched.
 */
function chordLooksTonicFamilyWilliams(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

/** Piece-final tonic: maj9 — Williams brass-fanfare colour (d4; already FBT-pass). */
function spellJohnWilliamsTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9`,
    receipt: `jwill:final_tonic_cadence@bar${bar}`,
  };
}

function forceJohnWilliamsFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellJohnWilliamsTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

function enforceJohnWilliamsFinalBarTonicResolution(
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
  if (!sym || chordLooksTonicFamilyWilliams(sym)) return;
  const { symbol, receipt } = spellJohnWilliamsTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function finalizeJohnWilliamsMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.johnWilliamsDeviceReceipts ?? [];
  metadata.johnWilliamsDiagnostics = {
    songwriterId: 'john_williams',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.johnWilliamsSliceReceipt = `John Williams (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- Ennio Morricone --- */
export let ennioMorriconeEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeEnnioMorriconeEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: EnnioMorriconeContextMode[] = ['em:spaghetti_mode', 'em:lyric_mode', 'em:serial_tension'];
  const rawM = genMeta.ennioMorriconeContext as string | undefined;
  const mode: EnnioMorriconeContextMode = modes.includes(rawM as EnnioMorriconeContextMode)
    ? (rawM as EnnioMorriconeContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.ennioMorriconeContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 930101) < 0.22) {
      receipts.push(`em:d1_endless_ostinato@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 930201) < 0.18) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 9);
      receipts.push(`em:d2_plagal_thirds@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 930301) < 0.16) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}m7${ex.slash}`;
        receipts.push(`em:d3_dorian_colour@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 930401) < 0.14) {
      const sym = out[b - 1]!;
      const rpc = harmonyRootPc(sym);
      if (rpc !== undefined && !sym.includes('/')) {
        const stepBass = pitchClassToSharpName((rpc + 11) % 12);
        out[b - 1] = `${sym}/${stepBass}`;
        receipts.push(`em:d4_lament_bass@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 930501) < 0.2) {
      receipts.push(`em:d5_timbre_hook@bar${b}`);
    }
  }

  genMeta.ennioMorriconeEffectiveHarmonyBars = out;
  genMeta.ennioMorriconeDeviceReceipts = receipts;
  ennioMorriconeEffectiveHarmonyBars = out;
}

export function finalizeEnnioMorriconeMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.ennioMorriconeDeviceReceipts ?? [];
  metadata.ennioMorriconeDiagnostics = {
    songwriterId: 'ennio_morricone',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.ennioMorriconeSliceReceipt = `Ennio Morricone (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- Nino Rota --- */
export let ninoRotaEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeNinoRotaEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: NinoRotaContextMode[] = ['nr:waltz_mode', 'nr:carnival_mode', 'nr:godfather_mode'];
  const rawM = genMeta.ninoRotaContext as string | undefined;
  const mode: NinoRotaContextMode = modes.includes(rawM as NinoRotaContextMode)
    ? (rawM as NinoRotaContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.ninoRotaContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 940101) < 0.2) {
      receipts.push(`nr:d1_waltz_colour@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 940201) < 0.17) {
      receipts.push(`nr:d2_carnival_band@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseStart' && seededFilmUnit(seed, b, 940301) < 0.25) {
      receipts.push(`nr:d3_melancholy_cantilena@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 940401) < 0.18) {
      receipts.push(`nr:d4_diatonic_glue@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseFinal' && seededFilmUnit(seed, b, 940501) < 0.16) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}maj7${ex.slash}`;
        receipts.push(`nr:d5_stravinsky_punch@bar${b}`);
      }
    }
  }

  /* Piece-final only: force tonic maj7 + safety net (Wayne fBT pattern; mid-piece devices untouched). */
  const tonicPc = inferTonicPitchClassFromBar1(context);
  forceNinoRotaFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceNinoRotaFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.ninoRotaEffectiveHarmonyBars = out;
  genMeta.ninoRotaDeviceReceipts = receipts;
  ninoRotaEffectiveHarmonyBars = out;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece waltz/carnival devices untouched.
 */
function chordLooksTonicFamilyRota(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

/** Piece-final tonic: maj7 — Rota phrase-final diatonic colour (d5; already FBT-pass). */
function spellNinoRotaTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj7`,
    receipt: `nr:final_tonic_cadence@bar${bar}`,
  };
}

function forceNinoRotaFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellNinoRotaTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

function enforceNinoRotaFinalBarTonicResolution(
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
  if (!sym || chordLooksTonicFamilyRota(sym)) return;
  const { symbol, receipt } = spellNinoRotaTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function finalizeNinoRotaMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.ninoRotaDeviceReceipts ?? [];
  metadata.ninoRotaDiagnostics = {
    songwriterId: 'nino_rota',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.ninoRotaSliceReceipt = `Nino Rota (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- Jerry Goldsmith --- */
export let jerryGoldsmithEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeJerryGoldsmithEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: JerryGoldsmithContextMode[] = ['jg:action_mode', 'jg:lyric_mode', 'jg:suspense_mode'];
  const rawM = genMeta.jerryGoldsmithContext as string | undefined;
  const mode: JerryGoldsmithContextMode = modes.includes(rawM as JerryGoldsmithContextMode)
    ? (rawM as JerryGoldsmithContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.jerryGoldsmithContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 950101) < 0.15) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 6);
      receipts.push(`jg:d1_polytonal_action@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 950201) < 0.18) {
      receipts.push(`jg:d2_mixed_meter_ostinato@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 950301) < 0.16) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}sus4${ex.slash}`;
        receipts.push(`jg:d3_quartal_brass@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 950401) < 0.14) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 3);
      receipts.push(`jg:d4_octatonic_suspense@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 950501) < 0.2) {
      receipts.push(`jg:d5_motif_fragmentation@bar${b}`);
    }
  }

  /* Piece-final only: bias toward Goldsmith-own open landings that already pass fBT. */
  biasJerryGoldsmithFinalBarIdiomaticOpen(out, seed, tb, receipts, context, mode);

  genMeta.jerryGoldsmithEffectiveHarmonyBars = out;
  genMeta.jerryGoldsmithDeviceReceipts = receipts;
  jerryGoldsmithEffectiveHarmonyBars = out;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece polytonal / ostinato / octatonic devices untouched.
 */
function chordLooksDominantFamilyForFbtGoldsmith(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Goldsmith pool landings that already pass fBT
 * (tonic-root sus4 from d3_quartal_brass; lyric-branch maj9 lighter secondary).
 * Not a forced jazz tonic cadence — polytonal / quartal / octatonic idiom preserved.
 */
function biasJerryGoldsmithFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  mode: JerryGoldsmithContextMode
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtGoldsmith(sym)) return;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return;
  const root = pitchClassToSharpName(tonicPc);
  const u = seededFilmUnit(seed, totalBars, 950601);

  let next: string;
  if (mode === 'jg:lyric_mode') {
    // Lyric branch — maj9 present but still mostly quartal sus4.
    if (u < 0.35) next = `${root}maj9`;
    else next = `${root}sus4`;
  } else {
    // Action / suspense — sus4 primary (d3 quartal brass, proven FBT pass).
    if (u < 0.18) next = `${root}maj9`;
    else next = `${root}sus4`;
  }

  out[idx] = next;
  receipts.push(`jg:final_open_bias@bar${totalBars}`);
}

export function finalizeJerryGoldsmithMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.jerryGoldsmithDeviceReceipts ?? [];
  metadata.jerryGoldsmithDiagnostics = {
    songwriterId: 'jerry_goldsmith',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.jerryGoldsmithSliceReceipt = `Jerry Goldsmith (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- Philip Glass --- */
export let philipGlassEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputePhilipGlassEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: PhilipGlassContextMode[] = ['pg:minimal_pulse', 'pg:lyrical_minimal', 'pg:dark_pedal'];
  const rawM = genMeta.philipGlassContext as string | undefined;
  const mode: PhilipGlassContextMode = modes.includes(rawM as PhilipGlassContextMode)
    ? (rawM as PhilipGlassContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.philipGlassContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];
  const tonicPc = inferTonicPitchClassFromBar1(context);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 960101) < 0.22) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}add2${ex.slash}`;
        receipts.push(`pg:d1_additive_cell@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 960201) < 0.2) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}sus2${ex.slash}`;
        receipts.push(`pg:d2_arpeggio_engine@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 960301) < 0.18 && tonicPc !== undefined) {
      const sym = out[b - 1]!;
      if (!sym.includes('/')) {
        out[b - 1] = `${sym}/${pitchClassToSharpName(tonicPc)}`;
        receipts.push(`pg:d3_static_pedal@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 960401) < 0.2) {
      receipts.push(`pg:d4_micro_variation@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 960501) < 0.2) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}m${ex.slash}`;
        receipts.push(`pg:d5_modal_stasis@bar${b}`);
      }
    }
  }

  genMeta.philipGlassEffectiveHarmonyBars = out;
  genMeta.philipGlassDeviceReceipts = receipts;
  philipGlassEffectiveHarmonyBars = out;
}

export function finalizePhilipGlassMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.philipGlassDeviceReceipts ?? [];
  metadata.philipGlassDiagnostics = {
    songwriterId: 'philip_glass',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.philipGlassSliceReceipt = `Philip Glass (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- Hans Zimmer --- */
export let hansZimmerEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeHansZimmerEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: HansZimmerContextMode[] = ['hz:epic_mode', 'hz:introspective_mode', 'hz:tension_mode'];
  const rawM = genMeta.hansZimmerContext as string | undefined;
  const mode: HansZimmerContextMode = modes.includes(rawM as HansZimmerContextMode)
    ? (rawM as HansZimmerContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.hansZimmerContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 970101) < 0.24) {
      receipts.push(`hz:d1_ostinato_engine@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 970201) < 0.18) {
      receipts.push(`hz:d2_hybrid_epic@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 970301) < 0.2) {
      receipts.push(`hz:d3_static_time@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 970401) < 0.15) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 3);
      receipts.push(`hz:d4_mediantic_drift@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseStart' && seededFilmUnit(seed, b, 970501) < 0.22) {
      receipts.push(`hz:d5_low_end_impact@bar${b}`);
    }
  }

  /* Piece-final only: bias toward Zimmer-own open landings that already pass fBT. */
  biasHansZimmerFinalBarIdiomaticOpen(out, seed, tb, receipts, context, mode);

  genMeta.hansZimmerEffectiveHarmonyBars = out;
  genMeta.hansZimmerDeviceReceipts = receipts;
  hansZimmerEffectiveHarmonyBars = out;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece ostinato / static_time devices untouched.
 */
function chordLooksDominantFamilyForFbtZimmer(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Zimmer pool landings that already pass fBT
 * (tonic-root m / m(add9) / add9 stasis; maj7 introspective branch).
 * Not a forced jazz tonic cadence — ostinato / non-cadential idiom preserved.
 */
function biasHansZimmerFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  mode: HansZimmerContextMode
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtZimmer(sym)) return;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return;
  const root = pitchClassToSharpName(tonicPc);
  const u = seededFilmUnit(seed, totalBars, 970601);

  let next: string;
  if (mode === 'hz:introspective_mode') {
    // Introspective branch — maj7 lighter but present; still mix stasis colours.
    if (u < 0.35) next = `${root}maj7`;
    else if (u < 0.55) next = `${root}m(add9)`;
    else if (u < 0.78) next = `${root}add9`;
    else next = `${root}m`;
  } else {
    // Epic / tension — ostinato stasis pool heavier.
    if (u < 0.32) next = `${root}m`;
    else if (u < 0.62) next = `${root}m(add9)`;
    else if (u < 0.88) next = `${root}add9`;
    else next = `${root}maj7`;
  }

  out[idx] = next;
  receipts.push(`hz:final_open_bias@bar${totalBars}`);
}

export function finalizeHansZimmerMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.hansZimmerDeviceReceipts ?? [];
  metadata.hansZimmerDiagnostics = {
    songwriterId: 'hans_zimmer',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.hansZimmerSliceReceipt = `Hans Zimmer (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}

/** --- Angelo Badalamenti --- */
export let angeloBadalamentiEffectiveHarmonyBars: string[] = [];

/** @deprecated — use resolveBarSymbol */
export function precomputeAngeloBadalamentiEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: AngeloBadalamentiContextMode[] = ['ab:dream_pop', 'ab:mystery_mode', 'ab:romantic_dark'];
  const rawM = genMeta.angeloBadalamentiContext as string | undefined;
  const mode: AngeloBadalamentiContextMode = modes.includes(rawM as AngeloBadalamentiContextMode)
    ? (rawM as AngeloBadalamentiContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.angeloBadalamentiContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 980101) < 0.18) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}m(maj7)${ex.slash}`;
        receipts.push(`ab:d1_dark_lounge@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 980201) < 0.15) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 5);
      receipts.push(`ab:d2_chromatic_dream@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseMiddle' && seededFilmUnit(seed, b, 980301) < 0.2) {
      receipts.push(`ab:d3_vocal_theme@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 980401) < 0.17) {
      const tonicPc = inferTonicPitchClassFromBar1(context);
      const sym = out[b - 1]!;
      if (tonicPc !== undefined && !sym.includes('/')) {
        out[b - 1] = `${sym}/${pitchClassToSharpName(tonicPc)}`;
        receipts.push(`ab:d4_soft_pedal@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 980501) < 0.14) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        const alt = seededFilmUnit(seed, b, 980502) < 0.5 ? `${ex.root}m7` : `${ex.root}maj7`;
        out[b - 1] = `${alt}${ex.slash}`;
        receipts.push(`ab:d5_parallel_shadow@bar${b}`);
      }
    }
  }

  /* Piece-final only: bias toward Badalamenti-own open landings that already pass fBT. */
  biasAngeloBadalamentiFinalBarIdiomaticOpen(out, seed, tb, receipts, context, mode);

  genMeta.angeloBadalamentiEffectiveHarmonyBars = out;
  genMeta.angeloBadalamentiDeviceReceipts = receipts;
  angeloBadalamentiEffectiveHarmonyBars = out;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece dark lounge / dream / pedal devices untouched.
 * Note: plain Am7 also fails FBT via digit `7` (same trap as Herrmann dim7).
 */
function chordLooksDominantFamilyForFbtBadalamenti(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/m\(maj7\)|mmaj7|min\(maj7\)/i.test(s)) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Badalamenti pool landings that already pass fBT
 * (tonic-root m(maj7) from d1_dark_lounge; maj7 / soft-pedal slash secondary from d4/d5).
 * Not a forced jazz tonic cadence — dream-jazz / no-cadence idiom preserved.
 */
function biasAngeloBadalamentiFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  mode: AngeloBadalamentiContextMode
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtBadalamenti(sym)) return;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return;
  const root = pitchClassToSharpName(tonicPc);
  const u = seededFilmUnit(seed, totalBars, 980601);

  let next: string;
  if (mode === 'ab:romantic_dark') {
    // Romantic-dark — maj7 / soft pedal present; m(maj7) still primary.
    if (u < 0.45) next = `${root}m(maj7)`;
    else if (u < 0.7) next = `${root}maj7`;
    else if (u < 0.85) next = `${root}m(maj7)/${root}`;
    else next = `${root}maj7/${root}`;
  } else {
    // dream_pop / mystery — dark lounge m(maj7) heavier.
    if (u < 0.62) next = `${root}m(maj7)`;
    else if (u < 0.8) next = `${root}maj7`;
    else if (u < 0.92) next = `${root}m(maj7)/${root}`;
    else next = `${root}maj7/${root}`;
  }

  out[idx] = next;
  receipts.push(`ab:final_open_bias@bar${totalBars}`);
}

export function finalizeAngeloBadalamentiMetadata(metadata: GenerationMetadata, acc: FilmHarmonyAccumulator): void {
  const flat = metadata.angeloBadalamentiDeviceReceipts ?? [];
  metadata.angeloBadalamentiDiagnostics = {
    songwriterId: 'angelo_badalamenti',
    barsConsidered: acc.barsConsidered,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.angeloBadalamentiSliceReceipt = `Angelo Badalamenti (film slice): bars=${acc.barsConsidered}; devices=${flat.length}`;
}
