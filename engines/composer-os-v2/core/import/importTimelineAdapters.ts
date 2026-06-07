/**
 * V80j adapters - Import IR to locked harmony + motif seed.
 */

import type { ImportHarmonyMode } from '../compositionContext';
import type { CoreMotif } from '../motif/motifEngineTypes';
import {
  buildLockedHarmonyBarContracts,
  type HarmonyBarContract,
} from '../harmony/harmonyBarContract';
import type { ImportMelodyNote, MosaicImportTimeline } from './mosaicImportTimeline';
import {
  IMPORT_CANDIDATE_MIN_CONFIDENCE,
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  IMPORT_HARD_LOCK_CONFIDENCE,
} from './mosaicImportTimeline';

export interface ImportMotifSeedResult {
  coreMotif: CoreMotif;
  /** Full IR melody retained for IMP-4 variation engine. */
  fullMelodyLine: ImportMelodyNote[];
}

export interface ImportHarmonyLockResult {
  lockedHarmonyBarsRaw: string[];
  harmonyBarContracts: HarmonyBarContract[];
  customHarmonyLocked: boolean;
  candidateOnly: boolean;
}

function contourFromIntervals(intervals: number[]): number[] {
  return intervals.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
}

/**
 * Map IR harmony to one chord symbol per bar (bars below candidate threshold omitted at parse).
 */
export function importTimelineToLockedHarmony(ir: MosaicImportTimeline): string[] {
  const byBar = new Map<number, string>();
  for (const h of ir.harmonyByBar) {
    if (h.confidence >= IMPORT_CANDIDATE_MIN_CONFIDENCE) {
      byBar.set(h.bar, h.chordSymbol);
    }
  }

  const out: string[] = [];
  let carry = '';
  for (let bar = 1; bar <= ir.bars; bar++) {
    const sym = byBar.get(bar);
    if (sym) {
      carry = sym;
      out.push(sym);
    } else if (carry) {
      out.push(carry);
    } else {
      out.push('C');
    }
  }
  return out;
}

function barMeetsHardLockThreshold(h: MosaicImportTimeline['harmonyByBar'][number]): boolean {
  if (h.fieldOrigin === 'explicit') {
    return h.confidence >= Math.min(IMPORT_HARD_LOCK_CONFIDENCE, 0.7);
  }
  return h.confidence >= IMPORT_HARD_LOCK_CONFIDENCE;
}

/**
 * Evaluate lock policy - customHarmonyLocked only when importHarmonyMode is lock_harmony
 * and every populated harmony bar meets hard-lock confidence.
 */
export function evaluateImportHarmonyLock(
  ir: MosaicImportTimeline,
  importHarmonyMode: ImportHarmonyMode | undefined
): ImportHarmonyLockResult {
  const lockedHarmonyBarsRaw = importTimelineToLockedHarmony(ir);
  const harmonyBarContracts = buildLockedHarmonyBarContracts(lockedHarmonyBarsRaw);

  const lockRequested = importHarmonyMode === 'lock_harmony';
  const hasHarmony = ir.harmonyByBar.some((h) => h.confidence >= IMPORT_CANDIDATE_MIN_CONFIDENCE);
  const allHardLockEligible =
    hasHarmony &&
    ir.harmonyByBar
      .filter((h) => h.confidence >= IMPORT_CANDIDATE_MIN_CONFIDENCE)
      .every(barMeetsHardLockThreshold);

  const customHarmonyLocked = lockRequested && allHardLockEligible;
  const candidateOnly =
    importHarmonyMode === 'free_harmony' ||
    importHarmonyMode === 'blend_harmony' ||
    (lockRequested && !allHardLockEligible);

  void candidateOnly;
  void IMPORT_EXPLICIT_HARMONY_CONFIDENCE;

  return {
    lockedHarmonyBarsRaw,
    harmonyBarContracts,
    customHarmonyLocked,
    candidateOnly: !customHarmonyLocked && hasHarmony,
  };
}

/**
 * Map IR melody line to CoreMotif seed (first phrase window, max 8 notes).
 */
export function importTimelineToMotifSeed(ir: MosaicImportTimeline): ImportMotifSeedResult {
  const window = ir.melodyLine.slice(0, Math.min(8, ir.melodyLine.length));
  const fullMelodyLine = [...ir.melodyLine];

  if (window.length === 0) {
    return {
      coreMotif: {
        id: 'import_motif_empty',
        intervalPattern: [],
        rhythmPattern: [],
        contourPattern: [],
        roleTags: ['chord-tone'],
        registerTags: ['mid'],
      },
      fullMelodyLine,
    };
  }

  const intervalPattern: number[] = [];
  for (let i = 1; i < window.length; i++) {
    intervalPattern.push(window[i]!.midiPitch - window[i - 1]!.midiPitch);
  }

  const rhythmPattern = window.map((n) => ({
    startBeat: n.onsetBeat,
    duration: n.durationBeats,
  }));

  return {
    coreMotif: {
      id: 'import_motif_seed',
      intervalPattern,
      rhythmPattern,
      contourPattern: contourFromIntervals(intervalPattern),
      roleTags: ['chord-tone'],
      registerTags: ['mid'],
    },
    fullMelodyLine,
  };
}
