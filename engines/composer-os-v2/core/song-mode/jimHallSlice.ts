/**
 * Jim Hall — interval-first guitar comping / duo counter-melody harmony slice. Receipts **`jh:*`**.
 * Symbolic lead-sheet grammar: shell+one, warm extensions, inner-voice chromaticism as colour (not root games).
 */

import type { CompositionContext, GenerationMetadata, JimHallMode } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

export type { JimHallMode } from '../compositionContext';

/** Research defaults — `buildReharmLensConfig('jim_hall')`, vault phrase bias, duo diagnostics. */
export const JIM_HALL_SLICE_PARAMETERS = {
  coreDevice: 'interval_first_guitar' as const,
  defaultMode: 'duo' as JimHallMode,
  modeComment:
    "'duo' = sparse, counter-melody, guide tones | 'trio' = slightly fuller, more inner motion | 'solo' = full orchestral spread across register",
  tensionHierarchyNotes:
    '9/13 on maj7; 9/11 on min7; 13/9 on dom7 with occasional b9/#9 via upper triad — never all altered tensions at once',
  tritoneRate: 0.25,
  susBias: 0.3,
  chromaticMediantBias: 0.35,
  staticDominantBias: 0.3,
  maxVoicingNotes: 3,
  innerVoiceChromaticRate: 0.7,
  guitarIntervalBias: true,
  harmonicEconomy: 'shell_plus_one' as const,
  contrapuntalMode: true,
  phraseTemplatesComment: 'sparse_interval | inner_chromatic | counter_melody — no cluster / dense_stack',
} as const;

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

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function resolveJimHallMode(genMeta: GenerationMetadata & Record<string, unknown>): JimHallMode {
  const m = genMeta.jimHallMode as JimHallMode | undefined;
  if (m === 'duo' || m === 'trio' || m === 'solo') return m;
  return JIM_HALL_SLICE_PARAMETERS.defaultMode;
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

/** Thin altered spelling — drop stacked altered tags toward a single colour. */
function simplifyDenseAlterations(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  let score = 0;
  if (/b9/.test(hp)) score++;
  if (/#9/.test(hp)) score++;
  if (/#11/.test(hp)) score++;
  if (/b13/.test(hp)) score++;
  if (/alt/.test(hp)) score += 2;
  if (score < 3) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  return seededUnit(seed, bar, 99101) < 0.5 ? `${root}7b9${slash}` : `${root}7#9${slash}`;
}

function applyJimHallWarmColour(symbol: string, seed: number, bar: number, balladSus: boolean): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  const sb = JIM_HALL_SLICE_PARAMETERS.staticDominantBias;
  const susB = JIM_HALL_SLICE_PARAMETERS.susBias;

  if (/dim|ø|quartal/.test(tl)) return symbol;

  if (/\bmaj7\b|maj9|Δ/.test(tl) && !/mmaj/.test(tl)) {
    if (/maj9|maj13/.test(tl)) return symbol;
    const u = seededUnit(seed, bar, 99110);
    return u < 0.55 ? `${root}maj13${slash}` : `${root}maj9${slash}`;
  }

  if ((/^m7|^m9|^m11/i.test(rest) || /\bm7\b/.test(tl)) && !/maj/.test(tl)) {
    if (/m9|m11/.test(tl)) return symbol;
    const u = seededUnit(seed, bar, 99111);
    return u < 0.52 ? `${root}m11${slash}` : `${root}m9${slash}`;
  }

  if (looksPlainDominantSeventh(symbol)) {
    if (balladSus && seededUnit(seed, bar, 99112) < susB * 0.35) {
      return `${root}13sus4${slash}`;
    }
    const u = seededUnit(seed, bar, 99113);
    if (u < sb * 0.5) return `${root}13${slash}`;
    if (u < sb * 0.82) return `${root}9${slash}`;
    if (u < 0.93) return `${root}7b9${slash}`;
    return `${root}7#9${slash}`;
  }

  if (rest === '' || rest === 'maj') {
    const u = seededUnit(seed, bar, 99114);
    return u < 0.58 ? `${root}maj9${slash}` : `${root}maj7${slash}`;
  }

  return symbol;
}

function maybeTritoneInnerApproach(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  if (seededUnit(seed, bar, 99120) >= JIM_HALL_SLICE_PARAMETERS.tritoneRate) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const slash = slashTail(symbol);
  const subPc = (r + 6) % 12;
  return `${pitchClassToSharpName(subPc)}7${slash}`;
}

export function isSongwriterJimHall(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'jim_hall' } {
  return genMeta?.songwriterStyleId === 'jim_hall';
}

export interface JimHallHarmonyAccumulator {
  barsConsidered: number;
  warmExtensionTouches: number;
  innerVoiceReceiptTouches: number;
  shellEconomyTouches: number;
}

export function createJimHallHarmonyAccumulator(): JimHallHarmonyAccumulator {
  return {
    barsConsidered: 0,
    warmExtensionTouches: 0,
    innerVoiceReceiptTouches: 0,
    shellEconomyTouches: 0,
  };
}

export function accumulateJimHallHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JimHallHarmonyAccumulator
): void {
  const c = currentChord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|maj13|m9|m11|13|13sus|sus/.test(t)) acc.warmExtensionTouches++;
  if (/b9|#9/.test(t) && /7|13/.test(t)) acc.shellEconomyTouches++;
}

/**
 * Precompute effective harmony — locked truth + Hall shell/warm grammar + **`jh:*`** receipts.
 */
export function precomputeJimHallEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  genMeta.jimHallResolvedMode = resolveJimHallMode(genMeta);
  genMeta.jimHallVoicingCap = {
    maxVoicingNotes: JIM_HALL_SLICE_PARAMETERS.maxVoicingNotes,
    harmonicEconomy: JIM_HALL_SLICE_PARAMETERS.harmonicEconomy,
    guitarIntervalBias: JIM_HALL_SLICE_PARAMETERS.guitarIntervalBias,
    contrapuntalMode: JIM_HALL_SLICE_PARAMETERS.contrapuntalMode,
  };

  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const baseSym = resolveBarSymbol(context, b).symbol;
    let sym = baseSym;
    if (!isProtectedBar(b, context)) {
      const role = coarseSectionRoleFromBar(b, context);
      const balladSus = role === 'verse' || role === 'other';
      sym = simplifyDenseAlterations(sym, seed, b);
      sym = applyJimHallWarmColour(sym, seed, b, balladSus);
      sym = maybeTritoneInnerApproach(sym, seed, b);
      if (sym !== baseSym) {
        receipts.push(`jh:shell_economy@bar${b}`);
      }
      if (seededUnit(seed, b, 99130) < JIM_HALL_SLICE_PARAMETERS.innerVoiceChromaticRate) {
        receipts.push(`jh:inner:chromatic@bar${b}`);
      }
    }
    out.push(sym);
  }

  genMeta.jimHallEffectiveHarmonyBars = out;
  genMeta.jimHallDeviceReceipts = receipts;
}

export function finalizeJimHallMetadata(metadata: GenerationMetadata, acc: JimHallHarmonyAccumulator): void {
  const flat = [...(metadata.jimHallDeviceReceipts ?? [])];
  const innerN = flat.filter((r) => r.includes('jh:inner:')).length;
  const sp = JIM_HALL_SLICE_PARAMETERS;
  const d = {
    songwriterId: 'jim_hall' as const,
    jimHallResolvedMode: metadata.jimHallResolvedMode,
    sliceParameters: {
      tritoneRate: sp.tritoneRate,
      susBias: sp.susBias,
      chromaticMediantBias: sp.chromaticMediantBias,
      staticDominantBias: sp.staticDominantBias,
      maxVoicingNotes: sp.maxVoicingNotes,
      innerVoiceChromaticRate: sp.innerVoiceChromaticRate,
      defaultMode: sp.defaultMode,
    },
    barsConsidered: acc.barsConsidered,
    warmExtensionTouches: acc.warmExtensionTouches,
    innerVoiceReceiptTouches: innerN,
    shellEconomyTouches: acc.shellEconomyTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Jim Hall (interval-first guitar slice): warmExt≈${acc.warmExtensionTouches}`,
    `inner≈${innerN}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.jimHallDiagnostics = { ...d };
  metadata.jimHallSliceReceipt = receipt;
}
