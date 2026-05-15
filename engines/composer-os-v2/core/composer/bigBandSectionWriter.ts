/**
 * Phase 6+7 — Big band section scoring plans (soli / pads / shout / tutti) — pure helpers for scoring pipeline.
 */

import type { AbstractLineSet } from '../counterpoint/abstractLineSet';
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
  /** Run 1 — BB router: which doubling / spread derivation path ran (metadata only). */
  derivationTag?: string;
}

export interface BackgroundsPlan {
  kind: 'backgrounds';
  rhythm: 'whole' | 'half';
  voicingColor: string;
  /** Run 1 — BB router: inner-voice fill contract hint (metadata only). */
  derivationTag?: string;
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
    derivationTag: 'brookmeyer_default',
  };
}

export function backgroundsPlanFromScene(scene: HarmonicScene | undefined): BackgroundsPlan {
  return {
    kind: 'backgrounds',
    rhythm: 'whole',
    voicingColor: scene?.dominantVoicingColor ?? 'modal',
    derivationTag: 'brookmeyer_default',
  };
}

/**
 * Run 1 — BB router: per-composer soli / backgrounds wrapping {@link soliPlanForBundle} /
 * {@link backgroundsPlanFromScene}. `lines` reserved for future intersection-based pads; fall-through
 * matches legacy Brookmeyer conventions.
 */
export function sectionPlansForBigBandFromAbstract(
  bundle: VoiceRuleBundle,
  scene: HarmonicScene | undefined,
  _lines: AbstractLineSet | undefined,
): { soliPlan: SoliPlan; backgroundsPlan: BackgroundsPlan } {
  void _lines;
  const baseSoli = soliPlanForBundle(bundle);
  const baseBg = backgroundsPlanFromScene(scene);
  const id = bundle.voiceId;
  switch (id) {
    case 'charles_mingus':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.min(18, Math.max(baseSoli.spreadMin, 8)),
          spreadMax: Math.min(34, baseSoli.spreadMax + 6),
          derivationTag: 'mingus_collective_texture',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'collective_inner_from_outer_line_intersection',
          derivationTag: 'mingus_collective_texture',
        },
      };
    case 'duke_ellington':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.min(14, baseSoli.spreadMin + 2),
          derivationTag: 'ellington_voice_colour',
        },
        backgroundsPlan: {
          ...baseBg,
          voicingColor: 'chromatic_pass_between_soprano_bass',
          derivationTag: 'ellington_voice_colour',
        },
      };
    case 'count_basie':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.max(4, baseSoli.spreadMin - 2),
          spreadMax: Math.min(22, baseSoli.spreadMax),
          derivationTag: 'basie_freddie_green_riff',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'on_beat_sparse_stabs_from_soprano_line',
          derivationTag: 'basie_freddie_green_riff',
        },
      };
    case 'oliver_nelson':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: false,
          spreadMin: baseSoli.spreadMin,
          spreadMax: Math.min(40, baseSoli.spreadMax + 10),
          derivationTag: 'nelson_orchestral_wedge',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'wedge_outward_from_bass_meet_mid_phrase',
          derivationTag: 'nelson_orchestral_wedge',
        },
      };
    case 'thad_jones':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.min(16, baseSoli.spreadMin + 1),
          derivationTag: 'thad_chromatic_voice_leading',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'chromatic_pass_soprano_bass_comp_behind',
          derivationTag: 'thad_chromatic_voice_leading',
        },
      };
    case 'maria_schneider':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: false,
          spreadMax: Math.min(38, baseSoli.spreadMax + 4),
          derivationTag: 'schneider_sustained_orchestral',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'whole',
          voicingColor: 'sustain_pad_upper_extension_from_soprano',
          derivationTag: 'schneider_sustained_orchestral',
        },
      };
    case 'bill_evans':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: false,
          spreadMin: Math.min(12, baseSoli.spreadMin + 3),
          spreadMax: Math.min(36, baseSoli.spreadMax + 4),
          derivationTag: 'evans_bb_upper_extension',
        },
        backgroundsPlan: {
          ...baseBg,
          voicingColor: 'upper_extension_independence_no_downbeat_double',
          derivationTag: 'evans_bb_upper_extension',
        },
      };
    default:
      return { soliPlan: baseSoli, backgroundsPlan: baseBg };
  }
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
