/**
 * Sonic Youth — experimental dual-guitar / alternate-tuning Song Mode harmony slice (additive, isolated).
 *
 * Harmony layer: seed-stable receipts + optional cadence destabilisation on locked progressions.
 * Score layer: optional `ChordEvent.sonicYouth` stubs (profile-gated) using `sonicYouthChordTypes` + guards.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { ChordEvent, MeasureModel } from '../score-model/scoreModelTypes';
import { getChordForBar } from '../harmony/harmonyResolution';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar } from './brianWilsonPetSoundsSlice';
import type { SonicYouthExtension } from '../score-model/sonicYouthChordTypes';
import { getSYDissonancePreset } from '../score-model/sonicYouthChordGuards';

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

export function isSongwriterSonicYouth(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'sonic_youth' } {
  return genMeta?.songwriterStyleId === 'sonic_youth';
}

export interface SonicYouthHarmonyAccumulator {
  barsConsidered: number;
  susOrAddTouches: number;
  sharpElevenOrAltTouches: number;
  slashTouches: number;
}

export function createSonicYouthHarmonyAccumulator(): SonicYouthHarmonyAccumulator {
  return {
    barsConsidered: 0,
    susOrAddTouches: 0,
    sharpElevenOrAltTouches: 0,
    slashTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: SonicYouthHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = c.toLowerCase();
  if (/sus|add9|add11/.test(t)) acc.susOrAddTouches++;
  if (/#11|alt|7sus/.test(t)) acc.sharpElevenOrAltTouches++;
  if (/\/[a-g]/i.test(c)) acc.slashTouches++;
}

export function accumulateSonicYouthHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: SonicYouthHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

const TUNING_IDS = ['bad_moon_dadgad', 'teen_age_riot_facgce', 'confusion_gdae'] as const;

/** Six-string open MIDI (approx.) — annotation only for `sonicYouth` stubs. */
const OPEN_DADGAD: readonly [number, number, number, number, number, number] = [38, 45, 50, 55, 57, 62];
const OPEN_FACGCE: readonly [number, number, number, number, number, number] = [41, 48, 52, 55, 60, 64];

function frictionFromSymbol(symbol: string): number {
  const t = symbol.toLowerCase();
  let x = 0.35;
  if (/#11|alt|b5|sus4|7sus/.test(t)) x += 0.2;
  if (/add9|add11/.test(t)) x += 0.1;
  if (/\/[a-g]/i.test(symbol)) x += 0.15;
  return Math.min(1, x + seededUnit(symbol.length, 41, 88901) * 0.1);
}

function buildSonicYouthExtension(symbol: string, bar: number, seed: number): SonicYouthExtension {
  const friction = frictionFromSymbol(symbol);
  const preset = getSYDissonancePreset(friction);
  const maskG1: readonly [boolean, boolean, boolean, boolean, boolean, boolean] =
    seededUnit(seed, bar, 88902) > 0.45
      ? [true, true, false, true, true, false]
      : [true, false, true, true, false, true];
  const maskG2: readonly [boolean, boolean, boolean, boolean, boolean, boolean] =
    seededUnit(seed, bar, 88903) > 0.5
      ? [false, true, true, false, true, true]
      : [true, false, false, true, true, false];

  return {
    guitar1: {
      tuningId: TUNING_IDS[bar % TUNING_IDS.length]!,
      openPitches: OPEN_DADGAD,
      shapeId: `g1_bar${bar}`,
      fretPattern: [0, 0, 0, 0, 0, 0],
      stringMask: 0x3f,
      droneStrings: maskG1,
      noiseLevel: friction > 0.66 ? 'feedback' : friction > 0.4 ? 'crunchy' : 'clean',
    },
    guitar2: {
      tuningId: TUNING_IDS[(bar + 1) % TUNING_IDS.length]!,
      openPitches: OPEN_FACGCE,
      shapeId: `g2_bar${bar}`,
      fretPattern: [-1, 0, 0, 0, 0, 0],
      stringMask: 0x2a,
      droneStrings: maskG2,
      noiseLevel: preset === 'high_friction' ? 'prepared' : 'crunchy',
    },
    interGuitarDissonance: {
      score: friction,
      minor2Count: friction > 0.55 ? 1 : 0,
      major2Count: friction > 0.45 && friction <= 0.55 ? 1 : 0,
      tritoneCount: /alt|#11|b5/i.test(symbol) ? 1 : 0,
      unisonCount: 0,
      preset,
    },
  };
}

/**
 * Annotate comp chord stacks with compact `sonicYouth` metadata (does not alter pitches or export grid).
 */
export function applySonicYouthGuitarBarPasses(m: MeasureModel, bar: number, context: CompositionContext): void {
  if (!isSongwriterSonicYouth(context.generationMetadata)) return;
  const sym = m.chord ?? getChordForBar(bar, context);
  const seed = context.seed;
  for (const e of m.events) {
    if (e.kind !== 'chord') continue;
    const c = e as ChordEvent;
    c.sonicYouth = buildSonicYouthExtension(sym, bar, seed);
  }
}

/**
 * Precompute effective harmony + device receipts (full-form authority for `getChordForBar`).
 */
export function precomputeSonicYouthEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(getChordForBar(b, context));
  }

  for (const sec of context.form.sections) {
    const tid = TUNING_IDS[Math.abs(seed + sec.startBar * 31) % TUNING_IDS.length]!;
    receipts.push(`sy:alternate_tuning_colour@section=${encodeURIComponent(sec.label)}@bar=${sec.startBar}@tuning=${tid}`);
    const role = coarseSectionRoleFromBar(sec.startBar, context);
    const split =
      role === 'verse'
        ? 'g1_low_g2_high'
        : role === 'chorus'
          ? 'g1_mid_g2_noise_upper'
          : role === 'bridge'
            ? 'g1_clash_g2_drone'
            : 'g1_split_g2_split';
    receipts.push(`sy:two_guitar_register_split@section=${encodeURIComponent(sec.label)}@startBar=${sec.startBar}@split=${split}`);
  }

  for (let b = 1; b <= tb; b++) {
    const sym = out[b - 1]!;
    const low = sym.toLowerCase();
    if (/sus|add9|add11/.test(low) || /\/[a-g]/i.test(sym)) {
      receipts.push(`sy:open_string_drone@bar=${b}`);
    }
    if (/#11|alt|7sus|sus4|b5/i.test(sym)) {
      receipts.push(`sy:dissonant_dyad_cluster@bar=${b}`);
    }
  }

  for (let b = 4; b <= tb; b++) {
    if (out[b - 1] === out[b - 3] && out[b - 2] === out[b - 4]) {
      receipts.push(`sy:riff_cell_repetition@bars=${b - 3}-${b}`);
    }
  }

  for (let b = 1; b <= tb; b++) {
    if ((b - 1) % 7 === 2 && seededUnit(seed, b, 88701) > 0.25) {
      receipts.push(`sy:asymmetric_phrase_extension@bar=${b}`);
    }
  }

  for (let b = 2; b <= tb; b++) {
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    const prevHp = parseChordSymbol(prev).harmonyPart;
    const curHp = parseChordSymbol(cur).harmonyPart;
    const prevDom = /7|alt|7sus/i.test(prevHp);
    const curTriad = /^[A-G][#b]?($|maj(?!or))/i.test(curHp) || /^[A-G][#b]?m($|aj)?$/i.test(curHp);
    if (prevDom && curTriad && seededUnit(seed, b, 88702) < 0.72) {
      const m = curHp.match(/^([A-G][#b]?)/);
      if (m?.[1]) {
        receipts.push(`sy:noisy_cadence_destabilisation@bar=${b}`);
        out[b - 1] = `${m[1]}sus4`;
      }
    }
  }

  let run = 1;
  for (let b = 2; b <= tb; b++) {
    if (out[b - 1] === out[b - 2]) {
      run++;
      if (run === 2) {
        receipts.push(`sy:modal_static_harmony@bar=${b}`);
      }
    } else {
      run = 1;
    }
  }

  genMeta.sonicYouthEffectiveHarmonyBars = out;
  genMeta.sonicYouthDeviceReceipts = receipts;
}

export function finalizeSonicYouthMetadata(metadata: GenerationMetadata, acc: SonicYouthHarmonyAccumulator): void {
  const flat = [...(metadata.sonicYouthDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'sonic_youth' as const,
    barsConsidered: acc.barsConsidered,
    susOrAddTouches: acc.susOrAddTouches,
    sharpElevenOrAltTouches: acc.sharpElevenOrAltTouches,
    slashTouches: acc.slashTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Sonic Youth (noise/tuning slice): sus/add≈${acc.susOrAddTouches}`,
    `#11/alt≈${acc.sharpElevenOrAltTouches}`,
    `slash≈${acc.slashTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 12).join(';')}${flat.length > 12 ? '…' : ''}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.sonicYouthDiagnostics = { ...d };
  metadata.sonicYouthSliceReceipt = receipt;
}
