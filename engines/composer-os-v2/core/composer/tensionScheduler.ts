/**
 * Phase 4+5 — Tension envelope scheduler + post-hoc Farbood-style audit (evaluator only).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { ChordEvent, NoteEvent } from '../score-model/scoreModelTypes';
import type { HarmonicScene } from './harmonicScene';
import { getChordForBar } from '../harmony/harmonyResolution';

export interface TensionAuditRow {
  sectionKey: string;
  plannedMid: number;
  actualMid: number;
  deviation: number;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function voicingColorForTension(t: number): 'stable' | 'modal' | 'altered' | 'tritone-sus' {
  if (t < 0.3) return 'stable';
  if (t < 0.6) return 'modal';
  if (t < 0.8) return 'altered';
  return 'tritone-sus';
}

/**
 * Interpolate per-bar tension from form section targets; write into scenes + metadata.
 */
export function applyTensionScheduleToContext(context: CompositionContext, totalBars: number): void {
  const fs = context.formSections;
  if (!fs?.length) return;
  const scheduled: number[] = new Array(Math.max(1, totalBars)).fill(0.5);

  for (const sec of fs) {
    const [lo, hi] = sec.barRange;
    const span = Math.max(1, hi - lo);
    for (let b = lo; b <= hi; b++) {
      if (b < 1 || b > totalBars) continue;
      const u = (b - lo) / span;
      scheduled[b - 1] = clamp01(sec.targetTensionStart + (sec.targetTensionEnd - sec.targetTensionStart) * u);
    }
  }

  const md: GenerationMetadata = {
    ...context.generationMetadata,
    scheduledTensionByBar: scheduled,
  };
  context.generationMetadata = md;

  if (context.harmonicScenes?.length) {
    const next: HarmonicScene[] = context.harmonicScenes.map((sc) => {
      let sum = 0;
      let c = 0;
      for (let b = sc.barRange[0]; b <= sc.barRange[1]; b++) {
        if (b >= 1 && b <= scheduled.length) {
          sum += scheduled[b - 1]!;
          c++;
        }
      }
      const avg = c ? sum / c : 0.5;
      return {
        ...sc,
        tensionLevel: clamp01(avg),
        dominantVoicingColor: voicingColorForTension(avg),
      };
    });
    context.harmonicScenes = next;
  }
}

/**
 * Interpolate a single section's bar range (unit test / explicit scheduling).
 */
export function interpolateTensionForBarRange(
  barLo: number,
  barHi: number,
  startT: number,
  endT: number,
  bar: number
): number {
  if (bar < barLo || bar > barHi) return 0.5;
  const span = Math.max(1, barHi - barLo);
  const u = (bar - barLo) / span;
  return clamp01(startT + (endT - startT) * u);
}

function estimateChordSymbolTension(sym: string): number {
  const s = sym.toLowerCase();
  let t = 0.25;
  if (/alt|#11|b5|#5|7b9|7#9|sus|add|dim|°|ø/.test(s)) t += 0.22;
  if (/maj7|m7|m9|6/.test(s)) t += 0.08;
  if (/^n\.c\.|^tbd$|no chord/i.test(s)) t += 0.05;
  return clamp01(t);
}

function collectGuitarPart(score: ScoreModel) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar');
}

function estimateBarActualTension(
  context: CompositionContext,
  bar: number,
  score: ScoreModel
): number {
  const sym = getChordForBar(bar, context);
  const harmT = estimateChordSymbolTension(sym);
  const guitar = collectGuitarPart(score);
  let noteCount = 0;
  let upSteps = 0;
  const pit: number[] = [];
  if (guitar) {
    for (const m of guitar.measures) {
      if (m.index !== bar) continue;
      for (const e of m.events) {
        if ((e as NoteEvent).kind === 'note') {
          const n = e as NoteEvent;
          noteCount++;
          pit.push(n.pitch);
        } else if ((e as ChordEvent).kind === 'chord') {
          const ch = e as ChordEvent;
          if (ch.pitches?.length) {
            noteCount += ch.pitches.length;
            pit.push(...ch.pitches);
          }
        }
      }
    }
  }
  for (let i = 1; i < pit.length; i++) {
    if (pit[i]! > pit[i - 1]!) upSteps++;
  }
  const density = clamp01(noteCount / 8);
  const melT = pit.length > 1 ? clamp01(0.32 + 0.12 * (upSteps / (pit.length - 1))) : 0.3;
  return clamp01(0.5 * harmT + 0.3 * melT + 0.2 * density);
}

/** Post-generation — compare actual heuristic tension vs scheduled envelope (non-blocking). */
export function runTensionDeviationAudit(context: CompositionContext, score: ScoreModel): void {
  const planned = context.generationMetadata.scheduledTensionByBar;
  if (!planned?.length) return;
  const tb = Math.min(planned.length, context.form.totalBars);

  const sections = context.formSections ?? [];
  const rows: TensionAuditRow[] = [];
  for (const sec of sections) {
    const [lo, hi] = sec.barRange;
    let pm = 0;
    let pa = 0;
    let c = 0;
    for (let b = lo; b <= hi; b++) {
      if (b < 1 || b > tb) continue;
      pm += planned[b - 1]!;
      pa += estimateBarActualTension(context, b, score);
      c++;
    }
    if (!c) continue;
    const deviation = Math.abs(pm / c - pa / c);
    rows.push({
      sectionKey: sec.sceneId,
      plannedMid: pm / c,
      actualMid: pa / c,
      deviation,
    });
    console.warn(
      `[TensionScheduler] deviation: section=${sec.sceneId} role=${sec.role} Δ=${deviation.toFixed(3)} plannedMid=${(pm / c).toFixed(3)} actualMid=${(pa / c).toFixed(3)}`
    );
  }

  context.generationMetadata = {
    ...context.generationMetadata,
    tensionAudit: rows,
  };
}
