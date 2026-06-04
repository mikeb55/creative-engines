/**
 * Jan Garbarek — ritual modal ECM Song Mode harmony slice (`jg:*` receipts).
 * Field-based harmonic architecture: modal center, drone gravity, slow changes, open cadences.
 * Distinct from Wheeler polyaxial, Schneider narrative swell, Threadgill anti-metric cells.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type GarbarekModalMode = 'dorian' | 'aeolian' | 'mixolydian' | 'pentatonic_drone';

/** Seven Garbarek slice parameters (0–1). */
export interface JanGarbarekSliceParams {
  modalCentricity: number;
  dronePresence: number;
  harmonicSlowness: number;
  melodicSustain: number;
  phraseBreathWeight: number;
  innerVoiceRestraint: number;
  folkArchetypeStrength: number;
}

export const DEFAULT_JAN_GARBAREK_SLICE_PARAMS: JanGarbarekSliceParams = {
  modalCentricity: 0.85,
  dronePresence: 0.76,
  harmonicSlowness: 0.78,
  melodicSustain: 0.74,
  phraseBreathWeight: 0.69,
  innerVoiceRestraint: 0.81,
  folkArchetypeStrength: 0.63,
};

export interface JanGarbarekFieldSection {
  index: number;
  startBar: number;
  endBar: number;
  modalMode: GarbarekModalMode;
  centerPc: number;
}

export interface JanGarbarekFieldPlan {
  sections: JanGarbarekFieldSection[];
  sliceParams: JanGarbarekSliceParams;
  phraseBreathBars: number[];
}

const MODAL_MODES: GarbarekModalMode[] = ['dorian', 'aeolian', 'mixolydian', 'pentatonic_drone'];

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

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|dim|aug/.test(tl);
}

function looksDominantFamily(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13|alt/.test(tl);
}

function looksMajorTonicClose(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(stemOnly(symbol)) !== tonicPc) return false;
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return !/m(?!aj)|dim|ø|sus/.test(tl) && !/7|9|11|13/.test(tl);
}

export function resolveJanGarbarekSliceParams(genMeta: GenerationMetadata | undefined): JanGarbarekSliceParams {
  const fromMeta = genMeta?.janGarbarekSliceParams;
  if (!fromMeta) return { ...DEFAULT_JAN_GARBAREK_SLICE_PARAMS };
  const d = DEFAULT_JAN_GARBAREK_SLICE_PARAMS;
  return {
    modalCentricity: clamp01(fromMeta.modalCentricity ?? d.modalCentricity),
    dronePresence: clamp01(fromMeta.dronePresence ?? d.dronePresence),
    harmonicSlowness: clamp01(fromMeta.harmonicSlowness ?? d.harmonicSlowness),
    melodicSustain: clamp01(fromMeta.melodicSustain ?? d.melodicSustain),
    phraseBreathWeight: clamp01(fromMeta.phraseBreathWeight ?? d.phraseBreathWeight),
    innerVoiceRestraint: clamp01(fromMeta.innerVoiceRestraint ?? d.innerVoiceRestraint),
    folkArchetypeStrength: clamp01(fromMeta.folkArchetypeStrength ?? d.folkArchetypeStrength),
  };
}

function sectionSpanBars(seed: number, sectionIndex: number, harmonicSlowness: number): number {
  const u = seededUnit(seed, sectionIndex, 881301);
  if (harmonicSlowness >= 0.75) {
    if (u < 0.35) return 8;
    if (u < 0.7) return 6;
    return 4;
  }
  if (u < 0.4) return 4;
  if (u < 0.75) return 6;
  return 2;
}

/** Layer 1 — modal field sections with slow harmonic rhythm. */
export function buildJanGarbarekFieldPlan(
  seed: number,
  totalBars: number,
  centerPc: number,
  params: JanGarbarekSliceParams = DEFAULT_JAN_GARBAREK_SLICE_PARAMS
): JanGarbarekFieldPlan {
  const sections: JanGarbarekFieldSection[] = [];
  let bar = 1;
  let idx = 0;
  while (bar <= totalBars) {
    const span = Math.min(sectionSpanBars(seed, idx, params.harmonicSlowness), totalBars - bar + 1);
    const endBar = bar + span - 1;
    const u = seededUnit(seed, idx, 881401);
    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      modalMode: MODAL_MODES[Math.floor(u * MODAL_MODES.length) % MODAL_MODES.length]!,
      centerPc: (centerPc + (idx % 3 === 0 ? 0 : idx % 3 === 1 ? 2 : 7)) % 12,
    });
    bar = endBar + 1;
    idx++;
  }

  const phraseBreathBars: number[] = [];
  for (const sec of sections) {
    const mid = Math.floor((sec.startBar + sec.endBar) / 2);
    if (seededUnit(seed, mid, 881501) < params.phraseBreathWeight) {
      phraseBreathBars.push(sec.endBar);
    }
  }

  return { sections, sliceParams: params, phraseBreathBars };
}

export function sectionForBar(plan: JanGarbarekFieldPlan, bar: number): JanGarbarekFieldSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function modalFieldChord(mode: GarbarekModalMode, centerPc: number, seed: number, bar: number): string {
  const root = pitchClassToSharpName(centerPc);
  const u = seededUnit(seed, bar, 881601);
  switch (mode) {
    case 'dorian':
      if (u < 0.34) return `${root}m7`;
      if (u < 0.67) return `${root}m9`;
      return `${root}sus4`;
    case 'aeolian':
      if (u < 0.5) return `${root}m7`;
      return `${root}m6`;
    case 'mixolydian':
      if (u < 0.45) return `${root}7sus4`;
      if (u < 0.8) return `${root}maj7`;
      return `${root}9sus4`;
    default:
      if (u < 0.4) return `${root}sus2`;
      if (u < 0.75) return `${root}add9`;
      return `${root}5`;
  }
}

function quartalDyadEnrichment(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 881701);
  if (u < 0.34) return `${root}sus2${slash}`;
  if (u < 0.67) return `${root}add2${slash}`;
  return `${root}sus4${slash}`;
}

function applyDronePedal(symbol: string, centerPc: number, seed: number, bar: number, dronePresence: number): string {
  if (symbol.includes('/')) return symbol;
  const u = seededUnit(seed, bar, 881801);
  if (u > dronePresence) return symbol;
  const pedal = pitchClassToSharpName(centerPc);
  return `${stemOnly(symbol)}/${pedal}`;
}

function defunctionalize(symbol: string, section: JanGarbarekFieldSection, seed: number, bar: number): string {
  if (!looksFunctionalTwoFive(symbol) && !looksDominantFamily(symbol)) return symbol;
  const u = seededUnit(seed, bar, 881901);
  if (u > 0.35) return modalFieldChord(section.modalMode, section.centerPc, seed, bar);
  return modalFieldChord(section.modalMode, (section.centerPc + 5) % 12, seed, bar);
}

function openCadence(symbol: string, section: JanGarbarekFieldSection, seed: number, bar: number): string {
  const root = pitchClassToSharpName(section.centerPc);
  const u = seededUnit(seed, bar, 882001);
  if (u < 0.4) return `${root}sus2`;
  if (u < 0.75) return `${root}m9`;
  return `${root}add9`;
}

function applyFieldLayers(
  out: string[],
  plan: JanGarbarekFieldPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined
): void {
  const p = plan.sliceParams;
  let lastChangeBar = 1;
  let held = out[0] ?? 'Dm7';

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const sec = sectionForBar(plan, bar);
    if (!sec) continue;
    let sym = out[i]!;
    const before = sym;

    if (seededUnit(seed, bar, 882101) < p.modalCentricity * 0.55) {
      sym = modalFieldChord(sec.modalMode, sec.centerPc, seed, bar);
      receipts.push(`jg:modal_field@${bar}`);
    }

    sym = defunctionalize(sym, sec, seed, bar);
    if (looksFunctionalTwoFive(sym) || looksDominantFamily(sym)) {
      sym = modalFieldChord(sec.modalMode, sec.centerPc, seed, bar);
      receipts.push(`jg:non_functional@${bar}`);
    }

    if (seededUnit(seed, bar, 882201) < p.harmonicSlowness * 0.6 && bar - lastChangeBar < 2 && sym !== held) {
      sym = held;
      receipts.push(`jg:slow_harmony@${bar}`);
    } else if (sym !== held) {
      held = sym;
      lastChangeBar = bar;
    }

    if (seededUnit(seed, bar, 882301) < 0.67) {
      sym = quartalDyadEnrichment(sym, seed, bar);
      receipts.push(`jg:quartal_dyad@${bar}`);
    }

    if (seededUnit(seed, bar, 882401) < p.dronePresence * 0.85) {
      const withDrone = applyDronePedal(sym, sec.centerPc, seed, bar, p.dronePresence);
      if (withDrone !== sym) {
        sym = withDrone;
        receipts.push(`jg:drone_pedal@${bar}`);
      }
    }

    if (bar === sec.endBar && seededUnit(seed, bar, 882501) < 0.72) {
      sym = openCadence(sym, sec, seed, bar);
      receipts.push(`jg:open_cadence@${bar}`);
    }

    if (looksMajorTonicClose(sym, tonicPc) && seededUnit(seed, bar, 882601) < 0.8) {
      sym = openCadence(sym, sec, seed, bar);
      receipts.push(`jg:avoid_functional_close@${bar}`);
    }

    if (plan.phraseBreathBars.includes(bar)) {
      receipts.push(`jg:phrase_breath@${bar}`);
    }

    if (seededUnit(seed, bar, 882701) < p.folkArchetypeStrength * 0.5) {
      receipts.push(`jg:folk_nucleus@${bar}`);
    }

    if (seededUnit(seed, bar, 882801) < p.innerVoiceRestraint * 0.4) {
      receipts.push(`jg:inner_restraint@${bar}`);
    }

    if (seededUnit(seed, bar, 882901) < p.melodicSustain * 0.45) {
      receipts.push(`jg:melodic_sustain@${bar}`);
    }

    if (sym !== before) out[i] = sym;
  }
}

export interface JanGarbarekHarmonyAccumulator {
  barsConsidered: number;
  modalFieldTouches: number;
  droneTouches: number;
  slowHarmonyTouches: number;
  openCadenceTouches: number;
  quartalTouches: number;
}

export function createJanGarbarekHarmonyAccumulator(): JanGarbarekHarmonyAccumulator {
  return {
    barsConsidered: 0,
    modalFieldTouches: 0,
    droneTouches: 0,
    slowHarmonyTouches: 0,
    openCadenceTouches: 0,
    quartalTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: JanGarbarekHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus|add2|add9|m7|m9|m6|7sus|5\b/.test(t)) acc.modalFieldTouches++;
  if (/\//.test(c)) acc.droneTouches++;
  if (/sus|add2|quart|no3/.test(t)) acc.quartalTouches++;
  if (/sus2|add9|m9|open|no3/.test(t)) acc.openCadenceTouches++;
}

export function accumulateJanGarbarekHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JanGarbarekHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function precomputeJanGarbarekEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 2;
  const params = resolveJanGarbarekSliceParams(genMeta);
  genMeta.janGarbarekSliceParams = params;

  const plan = buildJanGarbarekFieldPlan(seed, tb, tonicPc, params);
  genMeta.janGarbarekFieldPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `jg:params=mc:${params.modalCentricity.toFixed(2)};dr:${params.dronePresence.toFixed(2)};hs:${params.harmonicSlowness.toFixed(2)};ms:${params.melodicSustain.toFixed(2)};pb:${params.phraseBreathWeight.toFixed(2)};iv:${params.innerVoiceRestraint.toFixed(2)};fa:${params.folkArchetypeStrength.toFixed(2)}`
  );
  for (const sec of plan.sections) {
    receipts.push(
      `jg:section@${sec.startBar}-${sec.endBar}:mode=${sec.modalMode};center=${pitchClassToSharpName(sec.centerPc)}`
    );
  }

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyFieldLayers(out, plan, seed, receipts, tonicPc);

  genMeta.janGarbarekEffectiveHarmonyBars = out;
  genMeta.janGarbarekDeviceReceipts = receipts;
}

export function finalizeJanGarbarekMetadata(
  metadata: GenerationMetadata,
  acc: JanGarbarekHarmonyAccumulator
): void {
  const flat = [...(metadata.janGarbarekDeviceReceipts ?? [])];
  const plan = metadata.janGarbarekFieldPlan;
  const params = metadata.janGarbarekSliceParams ?? DEFAULT_JAN_GARBAREK_SLICE_PARAMS;
  metadata.janGarbarekDiagnostics = {
    songwriterId: 'jan_garbarek',
    barsConsidered: acc.barsConsidered,
    modalFieldTouches: acc.modalFieldTouches,
    droneTouches: acc.droneTouches,
    slowHarmonyTouches: flat.filter((r) => r.startsWith('jg:slow_harmony@')).length,
    openCadenceTouches: acc.openCadenceTouches,
    quartalTouches: acc.quartalTouches,
    sectionCount: plan?.sections.length,
    phraseBreathBars: plan?.phraseBreathBars,
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.janGarbarekSliceReceipt = [
    'Jan Garbarek (ritual modal ECM slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `mc=${params.modalCentricity.toFixed(2)}`,
    `dr=${params.dronePresence.toFixed(2)}`,
    `hs=${params.harmonicSlowness.toFixed(2)}`,
    `modal≈${acc.modalFieldTouches}`,
    `drone≈${acc.droneTouches}`,
    `open≈${acc.openCadenceTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
