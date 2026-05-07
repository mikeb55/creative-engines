import type { BlendExporterBlendedPlan, BlendExporterSongForm } from '@composer-os/core/blend';

export type BlendMode = 'song-form' | 'layer-blend';
/** Blend lab engines (maps to core `RhythmEngineId` in blend exporter). */
export type RhythmBlendEngineId =
  | 'afrobeat'
  | 'rebetiko'
  | 'brazilian'
  | 'second_line'
  | 'cuban';
export type ConflictStrategy = 'max' | 'sum-clamped' | 'priority';

export interface BarRange {
  startBar: number;
  endBar: number;
}

export interface AfrobeatPresetRef {
  engine: 'afrobeat';
  presetId: string;
  label: string;
  meter: '4/4';
  gridSteps: 16;
}

export interface RebetikoPresetRef {
  engine: 'rebetiko';
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
  engine: 'second_line';
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
}

export type RhythmPresetRef =
  | AfrobeatPresetRef
  | RebetikoPresetRef
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
  /** 0 = all B flavour, 1 = all A flavour — metadata for future merge weighting; export unchanged. */
  blendRatio: number;
  conflictStrategy: ConflictStrategy;
}

export interface RhythmBlendStarterBundles {
  afrobeat: AfrobeatPresetRef[];
  rebetiko: RebetikoPresetRef[];
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
