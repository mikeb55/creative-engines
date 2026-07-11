/**
 * Sonic Youth — experimental dual-guitar / alternate-tuning Song Mode harmony slice (additive, isolated).
 *
 * Harmony layer: seed-stable receipts + optional cadence destabilisation on locked progressions.
 * Score layer: optional `ChordEvent.sonicYouth` stubs (profile-gated) using `sonicYouthChordTypes` + guards.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import type { ChordEvent, MeasureModel } from '../score-model/scoreModelTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar } from './brianWilsonPetSoundsSlice';
import type { SonicYouthExtension, SYTextureState } from '../score-model/sonicYouthChordTypes';
import { getSYDissonancePreset } from '../score-model/sonicYouthChordGuards';
import { getNextTextureState } from '../score-model/sonicYouthTextureEngine';
import { getEffectiveTuningProfileForBar } from '../section-architecture/effectiveContextForBar';
import { getAlternateGuitarTuningPreset } from './alternateGuitarTunings';

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

/**
 * Primary songwriter, STYLE_SONIC_YOUTH surface, or harmonicVoice selects Sonic Youth harmony authority.
 * Texture / ChordEvent.sonicYouth annotation stays on primary|styleProfile gates only — not this helper.
 */
export function isSonicYouthHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
    styleProfile?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return (
    primary === 'sonic_youth' ||
    voice === 'sonic_youth' ||
    metadata?.styleProfile === 'STYLE_SONIC_YOUTH'
  );
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
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function noteToMidi(note: string): number | null {
  const m = /^\s*([A-Ga-g])([#b]?)(-?\d+)\s*$/.exec(note);
  if (!m) return null;
  const semi = NOTE_TO_SEMITONE[`${m[1]!.toUpperCase()}${m[2] ?? ''}`];
  const oct = Number(m[3]);
  if (semi === undefined || !Number.isFinite(oct)) return null;
  return (oct + 1) * 12 + semi;
}

function resolveSectionTuningState(
  context: CompositionContext,
  bar: number,
  instrument: 'guitar' | 'guitar_2',
  fallbackId: string,
  fallbackOpen: readonly [number, number, number, number, number, number]
): { tuningId: string; openPitches: readonly [number, number, number, number, number, number] } {
  const tuningId = getEffectiveTuningProfileForBar(bar, context, instrument)?.tuningId;
  const preset = getAlternateGuitarTuningPreset(tuningId);
  if (!preset) return { tuningId: fallbackId, openPitches: fallbackOpen };
  const midis = preset.strings.map(noteToMidi);
  if (midis.some((m) => m == null) || midis.length !== 6) {
    return { tuningId: fallbackId, openPitches: fallbackOpen };
  }
  return {
    tuningId: preset.id,
    openPitches: midis as [number, number, number, number, number, number],
  };
}

function frictionFromSymbol(symbol: string): number {
  const t = symbol.toLowerCase();
  let x = 0.35;
  if (/#11|alt|b5|sus4|7sus/.test(t)) x += 0.2;
  if (/add9|add11/.test(t)) x += 0.1;
  if (/\/[a-g]/i.test(symbol)) x += 0.15;
  return Math.min(1, x + seededUnit(symbol.length, 41, 88901) * 0.1);
}

/** Texture phase at this bar after deterministic transitions from bar 1 (`riff`). Exported for Style Engine velocity + tests. */
export function getSonicYouthTextureStateAtBar(context: CompositionContext, bar: number): SYTextureState {
  let s: SYTextureState = 'riff';
  for (let b = 1; b < bar; b++) {
    const sym = resolveBarSymbol(context, b).symbol;
    const friction = frictionFromSymbol(sym);
    const preset = getSYDissonancePreset(friction);
    const noiseLevel =
      preset === 'high_friction'
        ? 'prepared'
        : friction > 0.66
          ? 'feedback'
          : friction > 0.4
            ? 'crunchy'
            : 'clean';
    s = getNextTextureState(s, noiseLevel, preset);
  }
  return s;
}

/** Exported for texture / MusicXML regression tests (`score-model/__tests__/sonicYouthTexture.test.ts`). */
export function buildSonicYouthExtension(
  symbol: string,
  bar: number,
  seed: number,
  context: CompositionContext
): SonicYouthExtension {
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

  const guitar1Tuning = resolveSectionTuningState(
    context,
    bar,
    'guitar',
    TUNING_IDS[bar % TUNING_IDS.length]!,
    OPEN_DADGAD
  );
  const guitar2Tuning = resolveSectionTuningState(
    context,
    bar,
    'guitar_2',
    TUNING_IDS[(bar + 1) % TUNING_IDS.length]!,
    OPEN_FACGCE
  );

  return {
    guitar1: {
      tuningId: guitar1Tuning.tuningId,
      openPitches: guitar1Tuning.openPitches,
      shapeId: `g1_bar${bar}`,
      fretPattern: [0, 0, 0, 0, 0, 0],
      stringMask: 0x3f,
      droneStrings: maskG1,
      noiseLevel: friction > 0.66 ? 'feedback' : friction > 0.4 ? 'crunchy' : 'clean',
    },
    guitar2: {
      tuningId: guitar2Tuning.tuningId,
      openPitches: guitar2Tuning.openPitches,
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
    textureState: getSonicYouthTextureStateAtBar(context, bar),
  };
}

/**
 * Annotate comp chord stacks with compact `sonicYouth` metadata (does not alter pitches or export grid).
 */
export function applySonicYouthGuitarBarPasses(m: MeasureModel, bar: number, context: CompositionContext): void {
  const sp = context.generationMetadata?.styleProfile;
  if (!isSongwriterSonicYouth(context.generationMetadata) && sp !== 'STYLE_SONIC_YOUTH') return;
  const sym = m.chord ?? resolveBarSymbol(context, bar).symbol;
  const seed = context.seed;
  for (const e of m.events) {
    if (e.kind !== 'chord') continue;
    const c = e as ChordEvent;
    c.sonicYouth = buildSonicYouthExtension(sym, bar, seed, context);
  }
}

/**
 * Precompute effective harmony + device receipts (full-form authority for `getChordForBar`).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeSonicYouthEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(resolveBarSymbol(context, b).symbol);
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
