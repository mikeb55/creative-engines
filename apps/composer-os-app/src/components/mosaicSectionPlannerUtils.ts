/**
 * Mosaic section planner — pure helpers (timeline, validation, import suggestions).
 */

import type { MosaicImportTimeline } from '@composer-os/core/import/mosaicImportTimeline';
import type { MosaicOutputFormatUi, MosaicPresetRoleUi, MosaicSectionPlanEntry } from './MosaicSectionPlanner';

export type MosaicPlannerWarningLevel = 'error' | 'warning' | 'info';

export type MosaicPlannerWarning = {
  id: string;
  level: MosaicPlannerWarningLevel;
  message: string;
  sectionIndex?: number;
};

export type MosaicTimelineBlock = {
  sectionIndex: number;
  sectionLabel: string;
  startBar: number;
  endBar: number;
  presetRole: MosaicPresetRoleUi;
  widthPercent: number;
  color: string;
  partCount: number;
};

const PRESET_COLORS: Record<MosaicPresetRoleUi, string> = {
  duo: '#3b82f6',
  big_band: '#d97706',
  string_quartet: '#7c3aed',
};

const PRESET_PART_COUNTS: Record<MosaicPresetRoleUi, number> = {
  duo: 2,
  big_band: 15,
  string_quartet: 4,
};

const SECTION_LABELS = ['intro', 'verse', 'chorus', 'bridge', 'outro'] as const;

export function presetRoleColor(role: MosaicPresetRoleUi | undefined): string {
  return PRESET_COLORS[role ?? 'duo'];
}

export function partCountForPresetRole(role: MosaicPresetRoleUi | undefined): number {
  return PRESET_PART_COUNTS[role ?? 'duo'];
}

export function resolvePlannerTotalBars(
  sections: MosaicSectionPlanEntry[],
  importTimeline?: MosaicImportTimeline | null,
): number {
  if (importTimeline && importTimeline.bars > 0) return importTimeline.bars;
  if (sections.length === 0) return 1;
  return Math.max(1, ...sections.map((s) => Math.max(s.startBar, s.endBar)));
}

export function computeTimelineBlocks(
  sections: MosaicSectionPlanEntry[],
  totalBars: number,
): MosaicTimelineBlock[] {
  if (sections.length === 0 || totalBars < 1) return [];
  const safeTotal = Math.max(1, totalBars);
  return sections.map((section, sectionIndex) => {
    const start = Math.max(1, section.startBar);
    const end = Math.max(start, section.endBar);
    const span = Math.max(1, end - start + 1);
    const role = section.presetRole ?? 'duo';
    return {
      sectionIndex,
      sectionLabel: section.sectionLabel,
      startBar: start,
      endBar: end,
      presetRole: role,
      widthPercent: (span / safeTotal) * 100,
      color: presetRoleColor(role),
      partCount: partCountForPresetRole(role),
    };
  });
}

function rangesOverlap(a: MosaicSectionPlanEntry, b: MosaicSectionPlanEntry): boolean {
  return a.startBar <= b.endBar && b.startBar <= a.endBar;
}

function sectionExceedsTotal(section: MosaicSectionPlanEntry, totalBars: number): boolean {
  return section.startBar > totalBars || section.endBar > totalBars || section.startBar > section.endBar;
}

export function hasMixedPresetSections(sections: MosaicSectionPlanEntry[]): boolean {
  const roles = new Set(sections.map((s) => s.presetRole ?? 'duo'));
  return roles.size > 1;
}

export function computeMosaicPlannerWarnings(
  sections: MosaicSectionPlanEntry[],
  totalBars: number,
  outputFormat: MosaicOutputFormatUi,
): MosaicPlannerWarning[] {
  const warnings: MosaicPlannerWarning[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]!;
    if (sectionExceedsTotal(section, totalBars)) {
      warnings.push({
        id: `exceeds-total-${i}`,
        level: 'error',
        message: `Bars ${section.startBar}–${section.endBar} exceed total (${totalBars})`,
        sectionIndex: i,
      });
    }
    for (let j = i + 1; j < sections.length; j++) {
      if (rangesOverlap(section, sections[j]!)) {
        warnings.push({
          id: `overlap-${i}-${j}`,
          level: 'error',
          message: `Overlaps with "${sections[j]!.sectionLabel}" (${sections[j]!.startBar}–${sections[j]!.endBar})`,
          sectionIndex: i,
        });
      }
    }
    if (
      outputFormat === 'lead-sheet' &&
      (section.presetRole === 'big_band' || section.presetRole === 'string_quartet')
    ) {
      warnings.push({
        id: `lead-sheet-preset-${i}`,
        level: 'warning',
        message: 'Lead sheet is duo-only — change preset or output format',
        sectionIndex: i,
      });
    }
  }

  if (sections.length > 0) {
    const sorted = [...sections].sort((a, b) => a.startBar - b.startBar);
    let cursor = 1;
    for (const section of sorted) {
      if (section.startBar > cursor) {
        warnings.push({
          id: `gap-before-${section.startBar}`,
          level: 'warning',
          message: `Gap: bars ${cursor}–${section.startBar - 1} not covered`,
        });
        break;
      }
      cursor = Math.max(cursor, section.endBar + 1);
    }
    if (cursor <= totalBars) {
      const lastEnd = Math.max(...sections.map((s) => s.endBar));
      if (lastEnd < totalBars) {
        warnings.push({
          id: `gap-after-${lastEnd}`,
          level: 'warning',
          message: `Gap: bars ${lastEnd + 1}–${totalBars} not covered`,
        });
      }
    }
  }

  if (hasMixedPresetSections(sections)) {
    warnings.push({
      id: 'mixed-preset',
      level: 'info',
      message: 'Mixed-preset export — sections merged into one score',
    });
  }

  return warnings;
}

export function warningsForSection(
  warnings: MosaicPlannerWarning[],
  sectionIndex: number,
): MosaicPlannerWarning[] {
  return warnings.filter((w) => w.sectionIndex === sectionIndex);
}

export function warningSummaryCounts(warnings: MosaicPlannerWarning[]): {
  error: number;
  warning: number;
  info: number;
} {
  return warnings.reduce(
    (acc, w) => {
      acc[w.level] += 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0 },
  );
}

const MIN_SECTION_BARS = 4;
const PHRASE_BARS = 8;

function harmonyChordAt(ir: MosaicImportTimeline, bar: number): string | null {
  const row = ir.harmonyByBar.find((h) => h.bar === bar);
  return row?.chordSymbol ?? null;
}

/**
 * Derive section plan from import IR (no sectionStarts on MosaicImportTimeline).
 * Splits at harmony-change boundaries; falls back to 8-bar phrases when harmony is sparse.
 */
export function suggestSectionsFromImport(ir: MosaicImportTimeline): MosaicSectionPlanEntry[] {
  const totalBars = ir.bars;
  if (totalBars < 1) return [];

  const splitBars: number[] = [1];
  let prevChord: string | null = null;

  for (let bar = 1; bar <= totalBars; bar++) {
    const chord = harmonyChordAt(ir, bar);
    if (bar > 1 && chord != null && prevChord != null && chord !== prevChord) {
      const lastSplit = splitBars[splitBars.length - 1]!;
      if (bar - lastSplit >= MIN_SECTION_BARS) {
        splitBars.push(bar);
      }
    }
    if (chord != null) prevChord = chord;
  }

  if (splitBars.length === 1 && ir.harmonyByBar.length === 0 && totalBars > PHRASE_BARS) {
    for (let bar = PHRASE_BARS + 1; bar <= totalBars; bar += PHRASE_BARS) {
      splitBars.push(bar);
    }
  } else if (splitBars.length === 1 && totalBars > PHRASE_BARS * 2) {
    for (let bar = PHRASE_BARS + 1; bar < totalBars; bar += PHRASE_BARS) {
      const lastSplit = splitBars[splitBars.length - 1]!;
      if (bar - lastSplit >= MIN_SECTION_BARS) {
        splitBars.push(bar);
      }
    }
  }

  const meter =
    ir.timeSig != null
      ? { numerator: ir.timeSig.num, denominator: ir.timeSig.den }
      : undefined;

  return splitBars.map((startBar, index) => {
    const endBar = index + 1 < splitBars.length ? splitBars[index + 1]! - 1 : totalBars;
    return {
      sectionLabel: SECTION_LABELS[index] ?? `section_${index + 1}`,
      startBar,
      endBar,
      songwriterStyleId: 'default',
      presetRole: 'duo' as const,
      ...(meter ? { timeSignature: meter } : {}),
    };
  });
}

export function planHasContent(sections: MosaicSectionPlanEntry[]): boolean {
  return sections.length > 0;
}
