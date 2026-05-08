/**
 * Phase 6+7 — Big band section scoring plans (soli / pads / shout / tutti) — pure helpers for scoring pipeline.
 */

import type { FormSection, HarmonicFormSectionRole } from './formController';
import type { HarmonicScene } from './harmonicScene';
import type { VoiceRuleBundle } from './voiceRuleBundle';
import type { RhythmMotifBinding } from './rhythmDnaMotifBinder';
import {
  mingusShoutInjectActive,
  pickHighestEnergyRhythmCellFromBinding,
  RHYTHM_DNA_CELL_TABLE,
} from './rhythmDnaMotifBinder';
import { weightedRhythmSample } from './stochasticLayer';

export type BigBandSectionKind = 'soli' | 'backgrounds' | 'shout-chorus' | 'tutti';

export interface VoiceLineStub {
  voiceIndex: number;
  midiPitches: number[];
}

export interface SoliPlan {
  kind: 'soli';
  closePosition: boolean;
  spreadMin: number;
  spreadMax: number;
}

export interface BackgroundsPlan {
  kind: 'backgrounds';
  rhythm: 'whole' | 'half';
  voicingColor: string;
}

export interface ShoutChorusPlan {
  kind: 'shout-chorus';
  rhythmCellId: string;
  maxSpreadSemitones: number;
  /** All brass/rhythm voices share one rhythmic shell (TUTTI shout). */
  rhythmicUnison: true;
  /** First bar of shout section (export / Mingus overlay anchor). */
  triggerBar?: number;
  shoutBarRange?: [number, number];
  /** Mingus only — bar ≥ gospel shout threshold: gospel grid + collective-improv overlay hint. */
  mingusGospelShoutInject?: boolean;
  mingusCollectiveImprovOverlay?: boolean;
}

/** Payload for injecting shout rhythmic-unison block into partwise MusicXML. */
export interface ShoutChorusScore {
  shoutBarRange: [number, number];
  divisions: number;
  rhythmCellId: string;
  totalMeasures: number;
  /** Shout section harmonic tension (export receipts). */
  tensionLevel?: number;
  /** Voicing colour label when tension maps to altered peak. */
  dominantVoicingColor?: string;
}

export interface TuttiPlan {
  kind: 'tutti';
  independentLines: true;
}

export type SectionWritingPlan = SoliPlan | BackgroundsPlan | ShoutChorusPlan | TuttiPlan;

export function soliPlanForBundle(bundle: VoiceRuleBundle): SoliPlan {
  const wide = bundle.voiceId === 'gil_evans';
  return {
    kind: 'soli',
    closePosition: !wide,
    spreadMin: bundle.voicingPolicy.minSpreadSemitones,
    spreadMax: bundle.voicingPolicy.maxSpreadSemitones,
  };
}

export function backgroundsPlanFromScene(scene: HarmonicScene | undefined): BackgroundsPlan {
  return {
    kind: 'backgrounds',
    rhythm: 'whole',
    voicingColor: scene?.dominantVoicingColor ?? 'modal',
  };
}

/** Rhythm DNA cell id — deterministic lowest-cost (highest energy) when variance 0; weighted top-N when variance > 0. */
export function pickShoutRhythmCellId(
  binding: RhythmMotifBinding | undefined,
  opts?: { stochasticVariance?: number; seed?: number; barIndex?: number; renderOrdinal?: number }
): string {
  const pool = binding?.allowedRhythmCells?.length ? binding.allowedRhythmCells : Object.keys(RHYTHM_DNA_CELL_TABLE);
  return weightedRhythmSample(
    pool,
    opts?.stochasticVariance ?? 0,
    opts?.seed ?? 0,
    opts?.barIndex ?? 0,
    opts?.renderOrdinal ?? 0
  );
}

export function shoutChorusPlan(
  bundle: VoiceRuleBundle,
  binding: RhythmMotifBinding | undefined,
  formSection: FormSection | undefined,
  opts?: { sectionLeadBar?: number }
): ShoutChorusPlan {
  const shout =
    formSection?.role === ('shout-chorus' as HarmonicFormSectionRole) ||
    (formSection?.sceneId?.includes('shout') ?? false);
  const leadBar = opts?.sectionLeadBar ?? formSection?.barRange?.[0] ?? 1;
  const maxSpread = bundle.voicingPolicy.maxSpreadSemitones;

  let rhythmCellId = pickShoutRhythmCellId(binding);
  let mingusInject = false;
  if (shout) {
    rhythmCellId = pickHighestEnergyRhythmCellFromBinding(binding);
    if (bundle.voiceId === 'charles_mingus' && mingusShoutInjectActive(leadBar, bundle)) {
      rhythmCellId = 'rd_shout_grid';
      mingusInject = true;
    }
  } else {
    rhythmCellId = 'rd_eighth_syncop';
  }

  return {
    kind: 'shout-chorus',
    rhythmCellId,
    maxSpreadSemitones: shout ? maxSpread : bundle.voicingPolicy.maxSpreadSemitones,
    rhythmicUnison: true,
    ...(shout && formSection
      ? {
          triggerBar: leadBar,
          shoutBarRange: [formSection.barRange[0], formSection.barRange[1]] as [number, number],
        }
      : {}),
    ...(mingusInject
      ? { mingusGospelShoutInject: true as const, mingusCollectiveImprovOverlay: true as const }
      : {}),
  };
}

/** Build metadata for shout-chorus MusicXML injection (full-score measure span). */
export function buildShoutChorusSection(
  context: { form: { totalBars: number } },
  plan: ShoutChorusPlan
): ShoutChorusScore | null {
  if (plan.kind !== 'shout-chorus' || !plan.shoutBarRange) return null;
  return {
    shoutBarRange: plan.shoutBarRange,
    divisions: 8,
    rhythmCellId: plan.rhythmCellId,
    totalMeasures: Math.max(1, context.form.totalBars),
    tensionLevel: 0.95,
    dominantVoicingColor: 'tritone-sus',
  };
}

/** Detect pairs of voices within 2 semitones on same beat bucket (stub: compare consecutive sorted pitches per bar). */
export function detectCloseVoicePairs(lines: VoiceLineStub[][]): number {
  let hits = 0;
  for (const bar of lines) {
    const flat = bar.flatMap((l) => l.midiPitches).sort((a, b) => a - b);
    for (let i = 1; i < flat.length; i++) {
      if (flat[i]! - flat[i - 1]! > 0 && flat[i]! - flat[i - 1]! < 3) hits++;
    }
  }
  return hits;
}

/** If collision persists >1 bar worth of hits, suggest divergence (return true). */
export function shouldForceTuttiDivergence(barCollisionHits: number[]): boolean {
  return barCollisionHits.filter((h) => h > 0).length > 1;
}

export function shoutVoicesAreRhythmicUnison(durationsByVoice: number[][]): boolean {
  if (durationsByVoice.length < 2) return true;
  const sig = durationsByVoice.map((d) => d.join(','));
  return sig.every((s) => s === sig[0]);
}
