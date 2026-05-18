/**
 * SQ→BB canonical section labels by composition mode.
 *
 * Hard constraints:
 * - No free-form labels as sectionVrbMap keys.
 * - sectionVrbMap keys must come from exactly one mode's canonical set per composition.
 * - `sq_bb` is valid in both modes (backwards compat).
 */

export type SqToBbSectionLabelMode = 'song' | 'instrumental';

/** Default section-label mode for SQ→BB workflow. */
export const SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE: SqToBbSectionLabelMode = 'instrumental';

export const SQ_TO_BB_SONG_SECTION_LABELS = [
  'intro',
  'verse',
  'chorus',
  'bridge',
  'outro',
  'sq_bb',
] as const;

export const SQ_TO_BB_INSTRUMENTAL_SECTION_LABELS = [
  'opening',
  'statement',
  'transition',
  'development',
  'contrast',
  'reprise',
  'coda',
  'sq_bb',
] as const;

export const SQ_TO_BB_SECTION_LABELS_BY_MODE = {
  song: SQ_TO_BB_SONG_SECTION_LABELS,
  instrumental: SQ_TO_BB_INSTRUMENTAL_SECTION_LABELS,
} as const;

export type SongSectionLabel = (typeof SQ_TO_BB_SONG_SECTION_LABELS)[number];

export type InstrumentalSectionLabel = (typeof SQ_TO_BB_INSTRUMENTAL_SECTION_LABELS)[number];

export type SqToBbSectionLabel = SongSectionLabel | InstrumentalSectionLabel;

export function getSectionLabelsForMode(
  mode: SqToBbSectionLabelMode,
): readonly SqToBbSectionLabel[] {
  return SQ_TO_BB_SECTION_LABELS_BY_MODE[mode];
}

export function isValidSectionLabel(
  label: string,
  mode: SqToBbSectionLabelMode,
): label is SqToBbSectionLabel {
  return (SQ_TO_BB_SECTION_LABELS_BY_MODE[mode] as readonly string[]).includes(label);
}
