/**
 * Song form + per-section rhythm preset refs (Afrobeat vs Rebetiko engines).
 * Used for multi-section arrangements, meter changes at boundaries, and blend export planning.
 */

export type RhythmEngineId = 'afrobeat' | 'rebetiko';

export interface AfrobeatPresetRef {
  engine: 'afrobeat';
  presetId: string;
  meter: '4/4';
  gridSteps: 16;
  lanes: {
    kick: number[];
    snare: number[];
    hiHat: number[];
    cowbell?: number[];
    agogo?: number[];
  };
}

export interface RebetikoPresetRef {
  engine: 'rebetiko';
  presetId: string;
  meter: '9/8' | '7/8' | '10/8' | '6/8' | '2/4' | '4/4';
  groups: number[];
  gridSteps: 8 | 12 | 14 | 16 | 18 | 20;
  lanes: {
    low: number[];
    high: number[];
    jingle: number[];
    ghost?: number[];
  };
}

export type RhythmPresetRef = AfrobeatPresetRef | RebetikoPresetRef;

export interface BarRange {
  /** 1-based, inclusive */
  startBar: number;
  /** 1-based, inclusive */
  endBar: number;
}

export interface SongSection {
  id: string;
  label: string;
  bars: BarRange;
  rhythm: RhythmPresetRef;
  tempoBpm?: number;
  transitionIn?: 'hard' | 'crossfade';
  transitionOut?: 'hard' | 'crossfade';
}

export interface SongForm {
  title: string;
  sections: SongSection[];
}

/** Demo fixture matching the blend spec (Zeibekiko → Afrobeat). */
export const BLEND_DEMO_SONG_FORM_EXAMPLE: SongForm = {
  title: 'Blend Demo',
  sections: [
    {
      id: 'A',
      label: 'Zeibekiko Intro',
      bars: { startBar: 1, endBar: 8 },
      rhythm: {
        engine: 'rebetiko',
        presetId: 'zeibekiko_2223_heavy',
        meter: '9/8',
        groups: [2, 2, 2, 3],
        gridSteps: 18,
        lanes: {
          low: [100, 0, 0, 0, 90, 0, 0, 0, 95, 0, 0, 0, 110, 0, 0, 0, 0, 0],
          high: [0, 0, 50, 0, 0, 0, 60, 0, 0, 0, 50, 0, 0, 0, 70, 0, 40, 0],
          jingle: [35, 0, 35, 0, 35, 0, 35, 0, 35, 0, 35, 0, 40, 0, 40, 0, 40, 0],
        },
      },
      transitionOut: 'hard',
    },
    {
      id: 'B',
      label: 'Afrobeat Groove',
      bars: { startBar: 9, endBar: 16 },
      rhythm: {
        engine: 'afrobeat',
        presetId: 'tony_allen_basic',
        meter: '4/4',
        gridSteps: 16,
        lanes: {
          kick: [100, 0, 0, 0, 0, 0, 85, 0, 95, 0, 0, 0, 0, 0, 75, 0],
          snare: [0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0],
          hiHat: [60, 0, 55, 0, 60, 0, 55, 0, 60, 0, 55, 0, 60, 0, 55, 0],
        },
      },
      transitionIn: 'hard',
    },
  ],
};
