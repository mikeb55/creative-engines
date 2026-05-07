export type BlendMode = 'song-form' | 'layer-blend';
export type RhythmEngineId = 'afrobeat' | 'rebetiko';
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

export type RhythmPresetRef = AfrobeatPresetRef | RebetikoPresetRef;

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
  afrobeatPresetId: string;
  rebetikoPresetId: string;
  conflictStrategy: ConflictStrategy;
}

export interface BlendedScorePlan {
  afrobeatPreset: AfrobeatPresetRef;
  rebetikoPreset: RebetikoPresetRef;
  conflictStrategy: ConflictStrategy;
}

export interface RhythmBlendControlsProps {
  afrobeatPresets: AfrobeatPresetRef[];
  rebetikoPresets: RebetikoPresetRef[];
  initialSongForm?: SongForm;
  initialBlendMode?: BlendMode;
  initialLayerBlend?: LayerBlendForm;
  exportSongFormToMusicXml: (form: SongForm) => string;
  exportBlendedScoreToMusicXml: (plan: BlendedScorePlan) => string;
  defaultFileName?: string;
}
