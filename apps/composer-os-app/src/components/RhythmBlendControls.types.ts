import type { BlendExporterBlendedPlan, BlendExporterSongForm } from '@composer-os/core/blend';
import type { RhythmEngineId as RhythmBlendCatalogId } from '@composer-os/core/blend/rhythmBlendTypes';

export type BlendMode = 'song-form' | 'layer-blend';

/** V43 blend lab engine IDs (catalog). */
export type RhythmBlendEngineId = RhythmBlendCatalogId;

export type ConflictStrategy = 'max' | 'sum-clamped' | 'priority';

export interface BarRange {
  startBar: number;
  endBar: number;
}

export interface FelaKutiPresetRef {
  engine: 'felaKuti';
  presetId: string;
  label: string;
  meter: '4/4';
  gridSteps: 16;
}

export interface GreekRebetikoPresetRef {
  engine: 'greekRebetiko';
  presetId: string;
  label: string;
  meter: '9/8' | '7/8' | '10/8' | '6/8' | '2/4' | '4/4';
  groups: number[];
  gridSteps: number;
}

export interface BrazilianPresetRef {
  engine: 'brazilian';
  presetId: string;
  label: string;
  meterSignature: string;
  gridSteps: number;
}

export interface SecondLinePresetRef {
  engine: 'secondLine';
  presetId: string;
  label: string;
  meterSignature: string;
  gridSteps: number;
}

export interface CubanPresetRef {
  engine: 'cuban';
  presetId: string;
  label: string;
  meterSignature: string;
  gridSteps: number;
  /** From preset — display-only in blend UI. */
  claveDirection?: '3-2' | '2-3' | '6-8';
}

export type RhythmPresetRef =
  | FelaKutiPresetRef
  | GreekRebetikoPresetRef
  | BrazilianPresetRef
  | SecondLinePresetRef
  | CubanPresetRef;

export interface SongSection {
  id: string;
  label: string;
  bars: BarRange;
  rhythm: RhythmPresetRef;
  tempoBpm?: number;
  expanded?: boolean;
}

export interface SongForm {
  title: string;
  sections: SongSection[];
}

export interface LayerBlendForm {
  engineA: RhythmBlendEngineId;
  engineAPresetId: string;
  engineB: RhythmBlendEngineId;
  engineBPresetId: string;
  /** 0 = all B flavour, 1 = all A flavour — metadata for exploration. */
  blendRatio: number;
  conflictStrategy: ConflictStrategy;
}

export interface RhythmBlendStarterBundles {
  felaKuti: FelaKutiPresetRef[];
  greekRebetiko: GreekRebetikoPresetRef[];
  brazilian: BrazilianPresetRef[];
  secondLine: SecondLinePresetRef[];
  cuban: CubanPresetRef[];
}

export interface RhythmBlendControlsProps {
  starterBundles: RhythmBlendStarterBundles;
  initialSongForm?: SongForm;
  initialBlendMode?: BlendMode;
  initialLayerBlend?: LayerBlendForm;
  exportSongFormToMusicXml: (form: BlendExporterSongForm) => string;
  exportBlendedScoreToMusicXml: (plan: BlendExporterBlendedPlan) => string;
  defaultFileName?: string;
}
