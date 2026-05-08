/**
 * Film soundtrack Song Mode harmony slices — lead-sheet symbols only; device receipts use composer prefixes **bh:** **jw:** **em:** **nr:** **jg:** **pg:** **hz:** **ab:**.
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
import { getChordForBar } from '../harmony/harmonyResolution';
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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

  genMeta.bernardHerrmannEffectiveHarmonyBars = out;
  genMeta.bernardHerrmannDeviceReceipts = receipts;
  bernardHerrmannEffectiveHarmonyBars = out;
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

export function precomputeJohnWilliamsEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const modes: JohnWilliamsContextMode[] = ['jw:heroic_mode', 'jw:magic_mode', 'jw:drama_mode'];
  const rawM = genMeta.johnWilliamsContext as string | undefined;
  const mode: JohnWilliamsContextMode = modes.includes(rawM as JohnWilliamsContextMode)
    ? (rawM as JohnWilliamsContextMode)
    : modes[Math.abs(seed) % 3]!;
  genMeta.johnWilliamsContext = mode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 920101) < 0.17) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}maj7(#11)${ex.slash}`;
        receipts.push(`jw:d1_lydian_wonder@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 920201) < 0.16) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}7sus4${ex.slash}`;
        receipts.push(`jw:d2_mixolydian_hero@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseStart' && seededFilmUnit(seed, b, 920301) < 0.35) {
      receipts.push(`jw:d3_leitmotif_anchor@bar${b}`);
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleFourBar(b, tb) === 'phraseFinal' && seededFilmUnit(seed, b, 920401) < 0.2) {
      const ex = extractRootAndSlash(out[b - 1]!);
      if (ex) {
        out[b - 1] = `${ex.root}maj9${ex.slash}`;
        receipts.push(`jw:d4_brass_fanfare@bar${b}`);
      }
    }
  }
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededFilmUnit(seed, b, 920501) < 0.14) {
      out[b - 1] = transposeChordRoot(out[b - 1]!, 4);
      receipts.push(`jw:d5_chromatic_mediant@bar${b}`);
    }
  }

  genMeta.johnWilliamsEffectiveHarmonyBars = out;
  genMeta.johnWilliamsDeviceReceipts = receipts;
  johnWilliamsEffectiveHarmonyBars = out;
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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

  genMeta.ninoRotaEffectiveHarmonyBars = out;
  genMeta.ninoRotaDeviceReceipts = receipts;
  ninoRotaEffectiveHarmonyBars = out;
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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

  genMeta.jerryGoldsmithEffectiveHarmonyBars = out;
  genMeta.jerryGoldsmithDeviceReceipts = receipts;
  jerryGoldsmithEffectiveHarmonyBars = out;
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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

  genMeta.hansZimmerEffectiveHarmonyBars = out;
  genMeta.hansZimmerDeviceReceipts = receipts;
  hansZimmerEffectiveHarmonyBars = out;
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
  for (let b = 1; b <= tb; b++) raw.push(getChordForBar(b, context));
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

  genMeta.angeloBadalamentiEffectiveHarmonyBars = out;
  genMeta.angeloBadalamentiDeviceReceipts = receipts;
  angeloBadalamentiEffectiveHarmonyBars = out;
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
