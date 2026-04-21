/**
 * ECM Chamber-only arrangement / texture policy (preset-scoped).
 * Augments `planEcmTextureBars` output and applies a light post-build phrase-edge
 * pass — no harmony changes, no API surface.
 */

import type { EcmChamberMode } from './ecmChamberTypes';
import type { EcmBarTexture } from './ecmTextureEngine';
import type { MeasureModel, PartModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';

function hash01(seed: number, bar: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + bar * 78.233 + salt * 43.758) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Strengthens space, alternation, and anti–double-lead for ECM Chamber texture rows.
 * Caller must only invoke when `presetId === 'ecm_chamber'`.
 */
export function augmentEcmChamberTexturePlan(
  plan: EcmBarTexture[],
  _totalBars: number,
  seed: number,
  mode: EcmChamberMode
): EcmBarTexture[] {
  let guitarLeadRun = 0;
  let repeatedRolePairRun = 0;
  let prevRolePair = '';
  const outRows: EcmBarTexture[] = [];
  for (const row of plan) {
    const b = row.bar;
    const out: EcmBarTexture = { ...row };
    if (row.guitarRole === 'lead') guitarLeadRun += 1;
    else guitarLeadRun = 0;
    if (guitarLeadRun >= 4) {
      out.guitarRole = 'shadow';
      guitarLeadRun = 0;
    }
    if (out.guitarRole === 'lead' && out.bassRole === 'lead') {
      out.bassRole = 'inner_motion';
    }
    const phase = ((b - 1) % 8) + 1;
    const h = hash01(seed, b, 44);
    if ((phase === 7 || phase === 8) && h < 0.38) {
      if (out.guitarRole !== 'silence' && out.bassRole !== 'silence') {
        if ((seed + b) % 2 === 0) out.guitarRole = 'silence';
        else out.bassRole = 'shadow';
      }
    }
    if (b % 12 === 0 && b > 0) {
      if (out.bassRole !== 'silence') out.bassRole = 'shadow';
    }
    if (mode === 'ECM_SCHNEIDER_CHAMBER' && phase === 8 && h < 0.3) {
      out.overlapHint = false;
      if (out.guitarRole === 'lead') out.guitarRole = 'sustain_pad';
    }

    // Return-memory phrasing: during later cycles, softly echo the prior-cycle role shape
    // to create evolved reprise behavior instead of neutral restating.
    if (b > 8 && h < 0.4) {
      const prevCycle = outRows[b - 9];
      if (prevCycle) {
        out.guitarRole = prevCycle.guitarRole;
        if (h < 0.22) {
          if (out.guitarRole === 'lead') out.guitarRole = 'shadow';
          else if (out.guitarRole === 'sustain_pad') out.guitarRole = 'inner_motion';
        }
      }
    }

    // Textural arc guard: prevent long static role-pair carryover by nudging one side.
    const rolePair = `${out.guitarRole}|${out.bassRole}`;
    if (rolePair === prevRolePair) repeatedRolePairRun += 1;
    else repeatedRolePairRun = 1;
    if (repeatedRolePairRun >= 4) {
      if (out.guitarRole === 'lead') out.guitarRole = 'shadow';
      else if (out.guitarRole === 'sustain_pad') out.guitarRole = 'inner_motion';
      else if (out.bassRole === 'sustain_pad') out.bassRole = 'inner_motion';
      else if (out.bassRole === 'lead') out.bassRole = 'shadow';
      repeatedRolePairRun = 1;
    }
    prevRolePair = `${out.guitarRole}|${out.bassRole}`;
    outRows.push(out);
  }
  return outRows;
}

function isNoteInVoice(ev: ScoreEvent, voice: number): boolean {
  return ev.kind === 'note' && (ev.voice ?? 1) === voice;
}

function soundingNoteCount(measure: MeasureModel, voice: number): number {
  return measure.events.filter((e) => isNoteInVoice(e, voice)).length;
}

/**
 * Phrase-edge space: when both parts are busy on a phrase-end bar, drop the second
 * half of one part (alternating bass vs guitar by bar parity).
 */
export function applyEcmChamberPhraseEdgeSpaceToParts(
  guitarPart: PartModel,
  bassPart: PartModel,
  totalBars: number,
  seed: number
): void {
  for (let b = 1; b <= totalBars; b++) {
    if (b % 8 !== 0) continue;
    const gm = guitarPart.measures[b - 1];
    const bm = bassPart.measures[b - 1];
    if (!gm || !bm) continue;
    const gN = soundingNoteCount(gm, 1);
    const bN = soundingNoteCount(bm, 1);
    if (gN < 2 || bN < 2) continue;
    if (hash01(seed, b, 91) > 0.55) continue;
    const stripBass = (seed + b) % 2 === 0;
    const target = stripBass ? bm : gm;
    const voice = 1;
    const kept: ScoreEvent[] = [];
    let removedSecondHalf = false;
    for (const ev of target.events) {
      if (isNoteInVoice(ev, voice) && ev.startBeat >= 2) {
        removedSecondHalf = true;
        continue;
      }
      kept.push(ev);
    }
    if (!removedSecondHalf) continue;
    target.events = kept;
    const hasRestAt2 = target.events.some(
      (e) => e.kind === 'rest' && (e.voice ?? 1) === voice && e.startBeat === 2 && e.duration >= 2
    );
    if (!hasRestAt2) {
      target.events.push(createRest(2, 2, voice));
    }
  }
}
