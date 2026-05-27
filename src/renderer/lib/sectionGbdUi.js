/**
 * GBD section type tagging — maps UI labels to {@link SectionType} domain values.
 */

/** @typedef {'Groove' | 'Bridge' | 'Development' | 'Intro' | 'Outro' | 'Solo' | 'Free'} GbdSectionLabel */

export const GBD_SECTION_OPTIONS = [
  { label: 'Groove', type: 'verse' },
  { label: 'Bridge', type: 'bridge' },
  { label: 'Development', type: 'development' },
  { label: 'Intro', type: 'intro' },
  { label: 'Outro', type: 'outro' },
  { label: 'Solo', type: 'solo' },
  { label: 'Free', type: 'custom' },
];

/** @type {Record<string, { bg: string, border: string }>} */
export const GBD_TYPE_COLORS = {
  verse: { bg: 'rgba(59, 130, 246, 0.22)', border: 'rgba(59, 130, 246, 0.55)' },
  bridge: { bg: 'rgba(245, 158, 11, 0.22)', border: 'rgba(245, 158, 11, 0.55)' },
  development: { bg: 'rgba(34, 197, 94, 0.22)', border: 'rgba(34, 197, 94, 0.55)' },
  intro: { bg: 'rgba(156, 163, 175, 0.22)', border: 'rgba(156, 163, 175, 0.55)' },
  outro: { bg: 'rgba(156, 163, 175, 0.22)', border: 'rgba(156, 163, 175, 0.55)' },
  solo: { bg: 'rgba(168, 85, 247, 0.22)', border: 'rgba(168, 85, 247, 0.55)' },
  custom: { bg: 'rgba(239, 68, 68, 0.22)', border: 'rgba(239, 68, 68, 0.55)' },
};

/** @param {string} sectionType */
export function gbdLabelForSectionType(sectionType) {
  const hit = GBD_SECTION_OPTIONS.find((o) => o.type === sectionType);
  return hit?.label ?? 'Groove';
}

/** @param {string} label */
export function sectionTypeForGbdLabel(label) {
  const hit = GBD_SECTION_OPTIONS.find((o) => o.label === label);
  return hit?.type ?? 'verse';
}

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').SectionPreset} section */
export function sectionBarCount(section) {
  return section.barRange.endBar - section.barRange.startBar + 1;
}
