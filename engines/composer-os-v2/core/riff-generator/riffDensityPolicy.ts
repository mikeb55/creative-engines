import type { RiffDensity } from './riffTypes';

/** Maps UI density to `silencePolicy.styleClass` tag on the active VRB profile. */
export function riffDensityStyleClass(density: RiffDensity): string {
  return `riff_density:${density}`;
}

export function applyRiffDensityToSilenceStyleClass(baseStyleClass: string, density: RiffDensity): string {
  const tag = riffDensityStyleClass(density);
  const stripped = baseStyleClass.replace(/\|?riff_density:(sparse|medium|dense)/g, '').replace(/\|$/, '');
  return stripped ? `${stripped}|${tag}` : tag;
}
