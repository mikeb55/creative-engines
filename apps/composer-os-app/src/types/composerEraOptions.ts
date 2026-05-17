/**
 * Unified composer era dropdown — all Generate modes (see docs/SQ_BB_ERA_STYLE_GUIDE.md).
 */

import type { SqToBbClassicalEraId, SqToBbJazzEraId } from '@composer-os/core/counterpoint/sqToBbWorkflowTypes';

export type ComposerJazzEraId = SqToBbJazzEraId;
export type ComposerClassicalEraId = SqToBbClassicalEraId;
export type ComposerEraId = ComposerJazzEraId | ComposerClassicalEraId;

/** `<select>` value for no era (DOM only). */
export const COMPOSER_ERA_SELECT_NULL = '';

export const COMPOSER_ERA_NO_ERA_TOOLTIP =
  'Leave the sketch untagged by period so harmony and scoring stay neutral.';

export const COMPOSER_ERA_JAZZ_OPTIONS: ReadonlyArray<{
  id: ComposerJazzEraId;
  label: string;
  tooltip: string;
}> = [
  { id: 'swing', label: 'Swing', tooltip: 'Four-beat swing feel and pre-bop big-band phrasing cues.' },
  { id: 'bebop', label: 'Bebop', tooltip: 'Fast harmonic rhythm and linear bop language on the BB side.' },
  {
    id: 'post_bop',
    label: 'Post-bop',
    tooltip: 'Extended harmony and looser form typical of 1960s small-group jazz.',
  },
  {
    id: 'cool_jazz',
    label: 'Cool Jazz',
    tooltip: 'Lyrical, restrained dynamics and lighter brass writing.',
  },
  {
    id: 'hard_bop',
    label: 'Hard Bop',
    tooltip: 'Blues roots, gospel cadences, and punchy section hits.',
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    tooltip: 'Current jazz orchestration: mixed meters, open voicings, ECM-adjacent color.',
  },
  {
    id: 'fusion',
    label: 'Fusion',
    tooltip: 'Electric-era harmony, backbeat layers, and rock-influenced densities.',
  },
] as const;

export const COMPOSER_ERA_CLASSICAL_OPTIONS: ReadonlyArray<{
  id: ComposerClassicalEraId;
  label: string;
  tooltip: string;
}> = [
  {
    id: 'classical',
    label: 'Classical',
    tooltip: 'Clear phrases, periodic cadences, and restrained chromaticism in the source lines.',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    tooltip: 'Long lyrical arcs, wider dynamics, and heightened harmonic color.',
  },
  {
    id: 'impressionist',
    label: 'Impressionist / Late Romantic',
    tooltip: 'Whole-tone and modal color, blurred cadence, and orchestral wash.',
  },
  {
    id: 'early_modernist',
    label: 'Early Modernist',
    tooltip: 'Stravinsky-era asymmetry, biting rhythms, and neoclassical irony.',
  },
  {
    id: 'postwar_modernist',
    label: 'Postwar Modernist / Serialist',
    tooltip: 'Serial languages, sparse textures, and pointillistic independence.',
  },
  {
    id: 'contemporary_classical',
    label: 'Contemporary Classical',
    tooltip: 'Present-day concert syntax: extended techniques and mixed tonalities.',
  },
] as const;

export type ComposerEraSelectValue = ComposerEraId | null;

export function composerEraSelectValueFromDom(raw: string): ComposerEraSelectValue {
  if (raw === COMPOSER_ERA_SELECT_NULL) return null;
  return raw as ComposerEraId;
}

export function composerEraDomValue(era: ComposerEraSelectValue): string {
  return era ?? COMPOSER_ERA_SELECT_NULL;
}

/** API / stylePairing — omit when null (never empty string). */
export function composerEraForRequest(era: ComposerEraSelectValue): string | undefined {
  if (era === null) return undefined;
  const t = String(era).trim();
  return t.length > 0 ? t : undefined;
}
