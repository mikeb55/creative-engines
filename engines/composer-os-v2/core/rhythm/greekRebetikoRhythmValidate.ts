import type { RhythmPreset } from './greekRebetikoRhythmTypes';

export function validateRhythmPreset(p: RhythmPreset): void {
  if (!p.id || !p.label) {
    throw new Error('greekRebetikoRhythmValidate: preset id/label required');
  }
  const { beats, beatType } = p.timeSignature;
  if (!Number.isFinite(beats) || beats < 1 || !Number.isFinite(beatType) || beatType < 1) {
    throw new Error(`greekRebetikoRhythmValidate: invalid time signature ${beats}/${beatType}`);
  }
  if (p.stepsPerBar < 1 || !Number.isInteger(p.stepsPerBar)) {
    throw new Error(`greekRebetikoRhythmValidate: stepsPerBar must be a positive integer (preset ${p.id})`);
  }
  if (p.layers.length === 0) {
    throw new Error(`greekRebetikoRhythmValidate: preset ${p.id} has no layers`);
  }
  for (const L of p.layers) {
    if (L.pattern.length !== p.stepsPerBar) {
      throw new Error(
        `greekRebetikoRhythmValidate: layer ${L.layerId} length ${L.pattern.length} !== stepsPerBar ${p.stepsPerBar}`
      );
    }
  }
}
