import type { BrazilianRhythmPreset } from './brazilianRhythmTypes';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const LANES: (keyof BrazilianRhythmPreset['lanes'])[] = ['low', 'high', 'jingle', 'ghost'];

export function validateBrazilianRhythmPreset(preset: BrazilianRhythmPreset): ValidationResult {
  const errors: string[] = [];
  const g = preset.meter.gridSteps;
  for (const lane of LANES) {
    const len = preset.lanes[lane].length;
    if (len !== g) {
      errors.push(`lane ${lane}: length ${len} !== meter.gridSteps ${g} (preset ${preset.id})`);
    }
    for (let i = 0; i < preset.lanes[lane].length; i++) {
      const v = preset.lanes[lane][i];
      if (!Number.isFinite(v) || v < 0 || v > 127) {
        errors.push(`lane ${lane} step ${i}: velocity ${v} out of 0..127 (${preset.id})`);
      }
    }
  }
  const m = preset.gmNoteMap;
  if (
    !Number.isFinite(m.low) ||
    !Number.isFinite(m.high) ||
    !Number.isFinite(m.jingle) ||
    !Number.isFinite(m.ghost)
  ) {
    errors.push(`gmNoteMap missing or invalid keys (${preset.id})`);
  }
  const [t0, t1] = preset.feel.tempoBPMRange;
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t0 >= t1) {
    errors.push(`feel.tempoBPMRange invalid: [${t0}, ${t1}] (${preset.id})`);
  }
  return { ok: errors.length === 0, errors };
}

export function validateAllBrazilianRhythmPresets(
  presets: BrazilianRhythmPreset[]
): Map<string, ValidationResult> {
  const map = new Map<string, ValidationResult>();
  for (const p of presets) {
    map.set(p.id, validateBrazilianRhythmPreset(p));
  }
  return map;
}
