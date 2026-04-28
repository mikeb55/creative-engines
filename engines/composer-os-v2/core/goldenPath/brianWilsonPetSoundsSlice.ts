/**
 * Brian Wilson — Pet Sounds era (1964–67) Song Mode / duo golden-path slice.
 * Harmony receipts + light guitar melody shaping (progressive register / pickups).
 */

import type { GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

export interface BrianWilsonHarmonyAccumulator {
  barsConsidered: number;
  chromaticBassTransitions: number;
  halfDiminishedTouches: number;
  augmentedTouches: number;
  diminishedSeventhTouches: number;
}

export function createBrianWilsonHarmonyAccumulator(): BrianWilsonHarmonyAccumulator {
  return {
    barsConsidered: 0,
    chromaticBassTransitions: 0,
    halfDiminishedTouches: 0,
    augmentedTouches: 0,
    diminishedSeventhTouches: 0,
  };
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function rootPcFromHarmonyPart(harmonyPart: string): number | undefined {
  const m = harmonyPart.trim().match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

/** Prefer slash bass PC; else chord root PC. */
export function bassPitchClassForChordSymbol(symbol: string): number | undefined {
  const p = parseChordSymbol(symbol);
  if (p.slashBassPc !== undefined) return p.slashBassPc;
  return rootPcFromHarmonyPart(p.harmonyPart);
}

export function accumulateBrianWilsonHarmonyDiagnostics(
  previousChord: string | undefined,
  currentChord: string,
  acc: BrianWilsonHarmonyAccumulator
): void {
  const cur = currentChord.trim();
  if (!cur) return;
  acc.barsConsidered++;

  const h = parseChordSymbol(cur).harmonyPart;
  const hl = h.toLowerCase();

  if (hl.includes('m7b5') || hl.includes('ø') || hl.includes('half-dim')) {
    acc.halfDiminishedTouches++;
  } else if (hl.includes('dim7') || hl.includes('°') || (/\bdim\b/i.test(h) && !hl.includes('maj'))) {
    acc.diminishedSeventhTouches++;
  }
  if (hl.includes('aug') || /^[a-g][#b]?\+(?=\(|\/|$)/i.test(h.trim())) {
    acc.augmentedTouches++;
  }

  if (!previousChord?.trim()) return;
  const prevPc = bassPitchClassForChordSymbol(previousChord);
  const curPc = bassPitchClassForChordSymbol(currentChord);
  if (prevPc === undefined || curPc === undefined) return;
  const step = ((curPc - prevPc + 12) % 12);
  if (step === 1 || step === 11) {
    acc.chromaticBassTransitions++;
  }
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clampPitch(p: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, p));
}

/**
 * Guitar voice-1 shaping: progressive upward expansion over the form, pickup entries,
 * mild arch emphasis (lift mid-phrase notes slightly).
 */
export function applyBrianWilsonGuitarBarPasses(
  m: MeasureModel,
  bar: number,
  seed: number,
  low: number,
  high: number,
  phrasePhase: number
): void {
  const expansion = Math.min(3, Math.floor((bar - 1) / 7));
  const archLift =
    phrasePhase === 3 || phrasePhase === 4 ? 1 : phrasePhase === 5 ? 2 : 0;

  const v1 = m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);

  if (v1.length === 0) return;

  // Pickup: first attack on downbeat → occasional eighth-late entry (off-beat phrase starts).
  const first = v1[0];
  if (
    first &&
    Math.abs(first.startBeat) < 1e-4 &&
    seededUnit(seed, bar, 88301) < 0.34
  ) {
    first.startBeat = 0.25;
  }

  let i = 0;
  for (const e of v1) {
    let p = e.pitch;
    if (expansion > 0 && seededUnit(seed, bar, 88320 + i) < 0.48) {
      p = clampPitch(p + expansion, low, high);
    }
    if (archLift > 0 && i === Math.floor(v1.length / 2) && seededUnit(seed, bar, 88340 + i) < 0.55) {
      p = clampPitch(p + archLift, low, high);
    }
    e.pitch = p;
    i++;
  }
}

export function finalizeBrianWilsonPetSoundsMetadata(
  metadata: GenerationMetadata,
  acc: BrianWilsonHarmonyAccumulator
): void {
  const d = {
    songwriterId: 'brian_wilson',
    barsConsidered: acc.barsConsidered,
    chromaticBassTransitions: acc.chromaticBassTransitions,
    halfDiminishedTouches: acc.halfDiminishedTouches,
    augmentedTouches: acc.augmentedTouches,
    diminishedSeventhTouches: acc.diminishedSeventhTouches,
  } as const;
  const receipt = [
    `Brian Wilson (Pet Sounds slice): bass chromatic steps≈${acc.chromaticBassTransitions}`,
    `ø7=${acc.halfDiminishedTouches}`,
    `aug=${acc.augmentedTouches}`,
    `dim7=${acc.diminishedSeventhTouches}`,
    `bars=${acc.barsConsidered}`,
  ].join('; ');
  metadata.brianWilsonPetSoundsDiagnostics = { ...d };
  metadata.brianWilsonPetSoundsSliceReceipt = receipt;
}
