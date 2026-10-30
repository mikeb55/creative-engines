/**
 * Song Mode → Mosaic thin mapper (V78e / V79b v2).
 * Compiled sections → mosaicSectionPlan entries; no runSongMode re-compile.
 * Per-section songwriterStyleId: explicit override → sectionEngine router → primary fallback.
 */

import { compiledSectionKindToFormLabel } from '../form/resolveFormPrecedence';
import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { PhraseRole } from '../mosaic-mode/mosaicPhrasePlanner';
import type { CompiledSong, SectionChordPlan } from './songCompilationTypes';
import { defaultSectionEngineForKind } from './songModeSectionEngineTypes';
import type { SongModeSectionEngine, SongSectionKind } from './songModeTypes';

type SectionChordPlanExtended = SectionChordPlan & {
  timeSignature?: { numerator: number; denominator: number };
  songwriterStyleId?: string;
  sectionEngine?: SongModeSectionEngine;
};

function phraseRoleForSectionKind(kind: SongSectionKind): PhraseRole | undefined {
  switch (kind) {
    case 'intro':
      return 'statement';
    case 'verse':
      return 'development';
    case 'pre_chorus':
      return 'statement';
    case 'chorus':
      return 'climax';
    case 'bridge':
      return 'release';
    case 'outro':
      return 'release';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Spine-protected sections keep hook-first mosaic inject bypass even when lift flag is on. */
function spineProtectedForSection(kind: SongSectionKind, sectionLabel: string): boolean {
  const lab = sectionLabel.toLowerCase();
  if (/\b(intro[-_]?hook|intro_hook)\b/.test(lab)) return true;
  if (/\brefrain\b/.test(lab)) return true;
  if (/\b(final[-_]?cadence|final_cadence)\b/.test(lab)) return true;
  if (/\binterlude\b/.test(lab)) return false;
  switch (kind) {
    case 'chorus':
    case 'pre_chorus':
      return true;
    case 'verse':
    case 'bridge':
      return false;
    default:
      return false;
  }
}

/** Section engines that map 1:1 to mosaic composer dispatch ids. */
function songwriterStyleIdFromSectionEngine(engine: SongModeSectionEngine): string | undefined {
  switch (engine) {
    case 'wayne_shorter':
      return 'wayne_shorter';
    case 'ecm_chamber':
      return 'ecm_chamber';
    default:
      return undefined;
  }
}

function resolveSectionSongwriterStyleId(
  section: SectionChordPlanExtended,
  defaultStyleId: string
): string {
  const explicit = section.songwriterStyleId?.trim();
  if (explicit) return explicit;

  if (section.sectionEngine) {
    const fromEngine = songwriterStyleIdFromSectionEngine(section.sectionEngine);
    if (fromEngine) return fromEngine;
  }

  const kindEngine = defaultSectionEngineForKind(section.sectionKind);
  const fromKind = songwriterStyleIdFromSectionEngine(kindEngine);
  if (fromKind) return fromKind;

  return defaultStyleId;
}

export function mapSongModeToMosaicSectionPlan(
  compiled: CompiledSong,
  options?: { songwriterStyleId?: string }
): MosaicModeSectionPlanEntry[] {
  const chordPlan = compiled.chordPlan ?? [];
  if (chordPlan.length < 2) return [];

  const defaultStyleId =
    options?.songwriterStyleId?.trim() ||
    compiled.songwriting?.resolvedStyle?.primaryId?.trim() ||
    '';

  const kindCounts: Partial<Record<SongSectionKind, number>> = {};
  let bar = 1;
  const entries: MosaicModeSectionPlanEntry[] = [];

  for (const section of chordPlan) {
    const barLength = section.chordSymbols?.length ?? 0;
    if (barLength < 1) continue;

    const ord = kindCounts[section.sectionKind] ?? 0;
    kindCounts[section.sectionKind] = ord + 1;
    const sectionLabel = compiledSectionKindToFormLabel(section.sectionKind, ord);
    const startBar = bar;
    const endBar = bar + barLength - 1;
    bar = endBar + 1;

    const phraseRole = phraseRoleForSectionKind(section.sectionKind);
    const ext = section as SectionChordPlanExtended;
    const timeSignature =
      ext.timeSignature?.numerator != null && ext.timeSignature?.denominator != null
        ? {
            numerator: ext.timeSignature.numerator,
            denominator: ext.timeSignature.denominator,
          }
        : undefined;

    entries.push({
      sectionLabel,
      startBar,
      endBar,
      songwriterStyleId: resolveSectionSongwriterStyleId(ext, defaultStyleId),
      ...(timeSignature ? { timeSignature } : {}),
      ...(phraseRole ? { phraseRole } : {}),
      spineProtected: spineProtectedForSection(section.sectionKind, sectionLabel),
      mosaicOwned: true,
      injectEligible: false,
    });
  }

  return entries.length >= 2 ? entries : [];
}
