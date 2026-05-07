/**
 * Starter rows for Rhythm blend lab — mirrors Tony Allen feels + shipped rhythm preset catalogs.
 */

import { BRAZILIAN_RHYTHM_PRESETS } from '@composer-os/core/rhythm/brazilianRhythmPresets';
import { CUBAN_RHYTHM_PRESETS } from '@composer-os/core/rhythm/cubanRhythmPresets';
import { GREEK_REBETIKO_RHYTHM_PRESETS } from '@composer-os/core/rhythm/greekRebetikoRhythmPresets';
import type { RhythmPreset } from '@composer-os/core/rhythm/greekRebetikoRhythmTypes';
import { SECOND_LINE_RHYTHM_PRESETS } from '@composer-os/core/rhythm/secondLineRhythmPresets';

import type {
  AfrobeatPresetRef,
  BrazilianPresetRef,
  CubanPresetRef,
  RebetikoPresetRef,
  SecondLinePresetRef,
} from '../components/RhythmBlendControls.types';

const TONY_ALLEN_FEELS: { presetId: string; label: string }[] = [
  { presetId: 'straight', label: 'Tony Allen — straight' },
  { presetId: 'swing', label: 'Tony Allen — swing' },
  { presetId: 'afrobeat', label: 'Tony Allen — afrobeat' },
];

export const AFROBEAT_STARTER_PRESETS: AfrobeatPresetRef[] = TONY_ALLEN_FEELS.map((f) => ({
  engine: 'afrobeat',
  presetId: f.presetId,
  label: f.label,
  meter: '4/4',
  gridSteps: 16,
}));

function rebetikoMeter(p: RhythmPreset): RebetikoPresetRef['meter'] {
  const { beats, beatType } = p.timeSignature;
  if (beats === 9 && beatType === 8) return '9/8';
  if (beats === 7 && beatType === 8) return '7/8';
  if (beats === 10 && beatType === 8) return '10/8';
  if (beats === 6 && beatType === 8) return '6/8';
  if (beats === 2 && beatType === 4) return '2/4';
  if (beats === 4 && beatType === 4) return '4/4';
  return '4/4';
}

function rebetikoGroups(p: RhythmPreset): number[] {
  if (p.id === 'zeibekiko_9_8') return [2, 2, 2, 3];
  if (p.id === 'hasapiko_4_4') return [2, 2, 2, 2];
  return [2, 2, 2, 2];
}

export const GREEK_REBETIKO_STARTER_PRESETS: RebetikoPresetRef[] = GREEK_REBETIKO_RHYTHM_PRESETS.map(
  (p) =>
    ({
      engine: 'rebetiko',
      presetId: p.id,
      label: p.label,
      meter: rebetikoMeter(p),
      groups: rebetikoGroups(p),
      gridSteps: p.stepsPerBar,
    }) satisfies RebetikoPresetRef
);

export const BRAZILIAN_STARTER_PRESETS: BrazilianPresetRef[] = BRAZILIAN_RHYTHM_PRESETS.map((p) => ({
  engine: 'brazilian',
  presetId: p.id,
  label: p.label,
  meterSignature: p.meter.signature,
  gridSteps: p.meter.gridSteps,
}));

export const SECOND_LINE_STARTER_PRESETS: SecondLinePresetRef[] = SECOND_LINE_RHYTHM_PRESETS.map((p) => ({
  engine: 'second_line',
  presetId: p.id,
  label: p.label,
  meterSignature: p.meter.signature,
  gridSteps: p.meter.gridSteps,
}));

export const CUBAN_STARTER_PRESETS: CubanPresetRef[] = CUBAN_RHYTHM_PRESETS.map((p) => ({
  engine: 'cuban',
  presetId: p.id,
  label: p.label,
  meterSignature: p.meter.signature,
  gridSteps: p.meter.gridSteps,
}));
