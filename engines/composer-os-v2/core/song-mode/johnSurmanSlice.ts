/**
 * John Surman — British folk-minimalist ECM Song Mode harmony slice (`js:*` receipts).
 * Dorian / Mixolydian / pentatonic modal centers, minimalist ostinato, dark reed register,
 * structural silence — distinct from Garbarek (Nordic ritual), Wheeler (polyaxial), Weber (bass pedal field).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type SurmanFolkModalMode = 'dorian' | 'mixolydian' | 'pentatonic_minor';

/** Five Surman slice parameters (0–1). */
export interface JohnSurmanSliceParams {
  folkModalCenter: number;
  minimalistRepetition: number;
  darkReedRegister: number;
  spaceAndSilence: number;
  folkMelodyContour: number;
}

export const DEFAULT_JOHN_SURMAN_SLICE_PARAMS: JohnSurmanSliceParams = {
  folkModalCenter: 0.8,
  minimalistRepetition: 0.72,
  darkReedRegister: 0.75,
  spaceAndSilence: 0.68,
  folkMelodyContour: 0.7,
};

export interface JohnSurmanModalSection {
  index: number;
  startBar: number;
  endBar: number;
  modalMode: SurmanFolkModalMode;
  centerPc: number;
  centerName: string;
  phraseArcBars: number;
}

export interface JohnSurmanFolkPlan {
  sections: JohnSurmanModalSection[];
  sliceParams: JohnSurmanSliceParams;
  silenceBars: number[];
  ostinatoBars: number[];
  darkRegisterMidiFloor: number;
  darkRegisterMidiCeiling: number;
}

const SURMAN_MODAL_CENTERS: ReadonlyArray<{ mode: SurmanFolkModalMode; pc: number; name: string }> = [
  { mode: 'dorian', pc: 2, name: 'D' },
  { mode: 'mixolydian', pc: 7, name: 'G' },
  { mode: 'pentatonic_minor', pc: 9, name: 'A' },
  { mode: 'dorian', pc: 4, name: 'E' },
];

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function looksAlteredDominant(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /alt|b9|#9|#11|b13|aug|dim7|ø|m7b5/.test(tl);
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|add/.test(tl);
}

function looksDominantFamily(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13/.test(tl);
}

export function resolveJohnSurmanSliceParams(genMeta: GenerationMetadata | undefined): JohnSurmanSliceParams {
  const fromMeta = genMeta?.johnSurmanSliceParams;
  if (!fromMeta) return { ...DEFAULT_JOHN_SURMAN_SLICE_PARAMS };
  const d = DEFAULT_JOHN_SURMAN_SLICE_PARAMS;
  return {
    folkModalCenter: clamp01(fromMeta.folkModalCenter ?? d.folkModalCenter),
    minimalistRepetition: clamp01(fromMeta.minimalistRepetition ?? d.minimalistRepetition),
    darkReedRegister: clamp01(fromMeta.darkReedRegister ?? d.darkReedRegister),
    spaceAndSilence: clamp01(fromMeta.spaceAndSilence ?? d.spaceAndSilence),
    folkMelodyContour: clamp01(fromMeta.folkMelodyContour ?? d.folkMelodyContour),
  };
}

function sectionSpanBars(seed: number, sectionIndex: number, minimalistRepetition: number): number {
  const u = seededUnit(seed, sectionIndex, 971301);
  if (minimalistRepetition >= 0.7) {
    if (u < 0.4) return 16;
    if (u < 0.75) return 12;
    return 8;
  }
  if (u < 0.5) return 8;
  return 4;
}

function phraseArcForSection(seed: number, sectionIndex: number): number {
  const u = seededUnit(seed, sectionIndex, 971401);
  if (u < 0.25) return 4;
  if (u < 0.6) return 6;
  if (u < 0.85) return 8;
  return 5;
}

/** Layer 1 — folk modal field sections (8–16 bar spans). */
export function buildJohnSurmanFolkPlan(
  seed: number,
  totalBars: number,
  params: JohnSurmanSliceParams = DEFAULT_JOHN_SURMAN_SLICE_PARAMS
): JohnSurmanFolkPlan {
  const sections: JohnSurmanModalSection[] = [];
  const silenceBars: number[] = [];
  const ostinatoBars: number[] = [];
  let bar = 1;
  let idx = 0;
  while (bar <= totalBars) {
    const span = Math.min(sectionSpanBars(seed, idx, params.minimalistRepetition), totalBars - bar + 1);
    const endBar = bar + span - 1;
    const centerPick = SURMAN_MODAL_CENTERS[idx % SURMAN_MODAL_CENTERS.length]!;
    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      modalMode: centerPick.mode,
      centerPc: centerPick.pc,
      centerName: centerPick.name,
      phraseArcBars: phraseArcForSection(seed, idx),
    });
    if (seededUnit(seed, endBar, 971501) < params.spaceAndSilence * 0.55) {
      silenceBars.push(endBar);
    }
    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 971601) < params.minimalistRepetition * 0.65) {
        ostinatoBars.push(b);
      }
    }
    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    silenceBars,
    ostinatoBars,
    darkRegisterMidiFloor: 46,
    darkRegisterMidiCeiling: 70,
  };
}

export function sectionForBar(plan: JohnSurmanFolkPlan, bar: number): JohnSurmanModalSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function folkModalChord(mode: SurmanFolkModalMode, centerPc: number, seed: number, bar: number): string {
  const root = pitchClassToSharpName(centerPc);
  const u = seededUnit(seed, bar, 971701);
  switch (mode) {
    case 'dorian':
      if (u < 0.34) return `${root}m7sus4`;
      if (u < 0.67) return `${root}m9`;
      return `${root}m(add9)`;
    case 'mixolydian':
      if (u < 0.4) return `${root}7sus4`;
      if (u < 0.75) return `${root}maj9`;
      return `${root}add9`;
    default:
      if (u < 0.35) return `${root}m7`;
      if (u < 0.7) return `${root}sus2`;
      return `${root}m(add9)`;
  }
}

function stripJazzColour(symbol: string, section: JohnSurmanModalSection, seed: number, bar: number): string {
  if (looksAlteredDominant(symbol) || looksFunctionalTwoFive(symbol) || looksDominantFamily(symbol)) {
    return folkModalChord(section.modalMode, section.centerPc, seed, bar);
  }
  return symbol;
}

function applyFolkLayers(
  out: string[],
  plan: JohnSurmanFolkPlan,
  seed: number,
  receipts: string[]
): void {
  const p = plan.sliceParams;
  let held = out[0] ?? 'Dm7sus4';
  let lastChangeBar = 1;

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const sec = sectionForBar(plan, bar);
    if (!sec) continue;
    const before = out[i]!;
    let sym = before;

    if (seededUnit(seed, bar, 971801) < p.folkModalCenter * 0.72) {
      sym = folkModalChord(sec.modalMode, sec.centerPc, seed, bar);
      receipts.push(`js:folk_modal@${bar}`);
    }

    sym = stripJazzColour(sym, sec, seed, bar);
    if (looksAlteredDominant(sym)) {
      sym = folkModalChord(sec.modalMode, sec.centerPc, seed, bar);
      receipts.push(`js:strip_altered@${bar}`);
    }

    if (plan.ostinatoBars.includes(bar) || seededUnit(seed, bar, 971901) < p.minimalistRepetition * 0.7) {
      if (sym !== held && bar - lastChangeBar < 2) {
        sym = held;
        receipts.push(`js:ostinato_hold@${bar}`);
      }
    }

    if (bar === sec.startBar) {
      receipts.push(
        `js:modal_shift@${bar}:mode=${sec.modalMode};center=${sec.centerName};span=${sec.endBar - sec.startBar + 1}`
      );
    }

    if (bar - lastChangeBar >= sec.phraseArcBars && sym !== held) {
      held = sym;
      lastChangeBar = bar;
      receipts.push(`js:phrase_arc@${bar}:len=${sec.phraseArcBars}`);
    } else if (sym !== held && bar - lastChangeBar >= 2) {
      held = sym;
      lastChangeBar = bar;
    }

    if (plan.silenceBars.includes(bar)) {
      receipts.push(`js:structural_silence@${bar}`);
    }

    if (seededUnit(seed, bar, 972001) < p.darkReedRegister * 0.5) {
      receipts.push(`js:dark_reed@${bar}:floor=${plan.darkRegisterMidiFloor};ceil=${plan.darkRegisterMidiCeiling}`);
    }

    if (seededUnit(seed, bar, 972101) < p.folkMelodyContour * 0.55) {
      receipts.push(`js:folk_contour@${bar}:stepwise`);
    }

    if (seededUnit(seed, bar, 972201) < p.spaceAndSilence * 0.45) {
      receipts.push(`js:low_density@${bar}`);
    }

    if (sym !== before) out[i] = sym;
  }
}

export interface JohnSurmanHarmonyAccumulator {
  barsConsidered: number;
  folkModalTouches: number;
  ostinatoTouches: number;
  silenceTouches: number;
  alteredStripped: number;
  darkReedTouches: number;
}

export function createJohnSurmanHarmonyAccumulator(): JohnSurmanHarmonyAccumulator {
  return {
    barsConsidered: 0,
    folkModalTouches: 0,
    ostinatoTouches: 0,
    silenceTouches: 0,
    alteredStripped: 0,
    darkReedTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: JohnSurmanHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus|add9|m7|m9|maj9|add9|sus2|sus4/.test(t) && !/alt|b9|#9|ø|dim/.test(t)) {
    acc.folkModalTouches++;
  }
  if (/alt|b9|#9|ø|dim7|m7b5/.test(t)) acc.alteredStripped++;
}

export function accumulateJohnSurmanHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JohnSurmanHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function countAlteredDominantsInBars(bars: readonly string[] | undefined): number {
  if (!bars) return 0;
  return bars.filter((s) => looksAlteredDominant(s)).length;
}

export function minSurmanSectionSpan(plan: JohnSurmanFolkPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
}

export function maxSurmanPhraseArcLength(plan: JohnSurmanFolkPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.max(...plan.sections.map((s) => s.phraseArcBars));
}

export function precomputeJohnSurmanEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const params = resolveJohnSurmanSliceParams(genMeta);
  genMeta.johnSurmanSliceParams = params;

  const plan = buildJohnSurmanFolkPlan(seed, tb, params);
  genMeta.johnSurmanFolkPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `js:params=fm:${params.folkModalCenter.toFixed(2)};mr:${params.minimalistRepetition.toFixed(2)};dr:${params.darkReedRegister.toFixed(2)};ss:${params.spaceAndSilence.toFixed(2)};fc:${params.folkMelodyContour.toFixed(2)}`
  );
  for (const sec of plan.sections) {
    receipts.push(
      `js:section@${sec.startBar}-${sec.endBar}:mode=${sec.modalMode};center=${sec.centerName};arc=${sec.phraseArcBars}`
    );
  }

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyFolkLayers(out, plan, seed, receipts);

  genMeta.johnSurmanEffectiveHarmonyBars = out;
  genMeta.johnSurmanDeviceReceipts = receipts;
}

export function finalizeJohnSurmanMetadata(
  metadata: GenerationMetadata,
  acc: JohnSurmanHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.johnSurmanDeviceReceipts ?? [])];
  const plan = metadata.johnSurmanFolkPlan;
  const params = metadata.johnSurmanSliceParams ?? DEFAULT_JOHN_SURMAN_SLICE_PARAMS;

  acc.ostinatoTouches = flat.filter((r) => r.startsWith('js:ostinato_hold@')).length;
  acc.silenceTouches = flat.filter((r) => r.startsWith('js:structural_silence@')).length;
  acc.darkReedTouches = flat.filter((r) => r.startsWith('js:dark_reed@')).length;
  acc.alteredStripped = flat.filter((r) => r.startsWith('js:strip_altered@')).length;

  metadata.johnSurmanDiagnostics = {
    songwriterId: 'john_surman',
    barsConsidered: acc.barsConsidered,
    folkModalTouches: acc.folkModalTouches,
    ostinatoTouches: acc.ostinatoTouches,
    silenceTouches: acc.silenceTouches,
    alteredStripped: acc.alteredStripped,
    darkReedTouches: acc.darkReedTouches,
    minSectionSpan: minSurmanSectionSpan(plan),
    maxPhraseArcBars: maxSurmanPhraseArcLength(plan),
    darkRegisterMidiFloor: plan?.darkRegisterMidiFloor,
    darkRegisterMidiCeiling: plan?.darkRegisterMidiCeiling,
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.johnSurmanSliceReceipt = [
    'John Surman (British folk-minimalist ECM slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `fm=${params.folkModalCenter.toFixed(2)}`,
    `mr=${params.minimalistRepetition.toFixed(2)}`,
    `dr=${params.darkReedRegister.toFixed(2)}`,
    `folk≈${acc.folkModalTouches}`,
    `ostinato≈${acc.ostinatoTouches}`,
    `silence≈${acc.silenceTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
