/**
 * Song Mode MusicContext producer (V103a) — section truth + assembly + projection.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import type {
  SongModeExportTruth,
  SongModeResult,
  SongModeSectionContext,
  SongSectionPlan,
} from './songModeTypes';
import type { SectionChordPlan } from './songCompilationTypes';
import type { DuoLock } from '../duo/duoTypes';
import { assertDuoLock } from '../duo/duoLock';

export interface BuildSongModeSectionContextInput {
  sectionId: string;
  plan: SongSectionPlan;
  harmonyBars: string[];
  seed?: number;
  bpm?: number;
}

/** Section inputs for {@link buildSongModeResult} (V103b handoff). */
export interface SongModeStructure {
  sectionInputs: readonly BuildSongModeSectionContextInput[];
}

const DUPLICATE_SECTION_ID = (id: string) =>
  `Song Mode: duplicate section ID "${id}"`;

function sectionIdForChordPlanBlock(
  block: SectionChordPlan,
  planIndex: number,
  formSections?: readonly { label: string; startBar: number; length: number }[]
): string {
  const formSection = formSections?.[planIndex];
  if (formSection?.label.trim()) {
    return formSection.label.trim().replace(/\s+/g, '_').toLowerCase();
  }
  return `${block.sectionKind}_${block.sectionOrder}`;
}

/**
 * Build section structure from compile-time chord plan (+ optional form labels).
 * Hard-fails on duplicate section IDs before Map insertion downstream.
 */
export function buildSongModeStructureFromChordPlan(
  chordPlan: readonly SectionChordPlan[],
  formSections?: readonly { label: string; startBar: number; length: number }[],
  options?: { seed?: number; bpm?: number }
): SongModeStructure {
  const seen = new Set<string>();
  const sectionInputs: BuildSongModeSectionContextInput[] = [];

  for (const [planIndex, block] of chordPlan.entries()) {
    const sectionId = sectionIdForChordPlanBlock(block, planIndex, formSections);
    if (seen.has(sectionId)) {
      throw new Error(DUPLICATE_SECTION_ID(sectionId));
    }
    seen.add(sectionId);
    sectionInputs.push({
      sectionId,
      plan: { order: block.sectionOrder, kind: block.sectionKind },
      harmonyBars: block.chordSymbols.map(normalizeChordSymbol),
      seed: options?.seed,
      bpm: options?.bpm,
    });
  }

  return { sectionInputs };
}

/** Duo LOCK gate + section truth assembly (checksum logging inside assembler). */
export function buildSongModeResult(
  structure: SongModeStructure,
  duoLock: DuoLock
): SongModeResult {
  assertDuoLock(duoLock);
  return assembleSongModeExportTruth(structure.sectionInputs);
}

function sortSectionIdentityDeterministic<
  T extends { sectionId: string; plan: SongSectionPlan; checksum: string },
>(sections: readonly T[]): T[] {
  return [...sections].sort((a, b) => {
    if (a.plan.order !== b.plan.order) return a.plan.order - b.plan.order;
    return a.sectionId.localeCompare(b.sectionId);
  });
}

/** Per-section checksum from normalised harmony bars only. */
export function computeSongModeSectionChecksum(harmonyBars: readonly string[]): string {
  const normalised = harmonyBars.map(normalizeChordSymbol);
  return computeMusicContextChecksum(normalised);
}

/**
 * Master checksum — deterministic from ordered section identity + per-section checksums.
 * Recomputable from {@link SongModeLock.sections} after LOCK.
 */
export function computeSongModeMasterChecksum(
  sections: readonly { sectionId: string; plan: SongSectionPlan; checksum: string }[]
): string {
  const ordered = sortSectionIdentityDeterministic(sections);
  const payload = ordered.map(
    (s) => `${s.sectionId}\u0002${s.plan.order}\u0002${s.plan.kind}\u0002${s.checksum}`
  );
  return computeMusicContextChecksum(payload);
}

function buildSectionMusicContext(
  harmonyBars: readonly string[],
  checksum: string,
  seed: number,
  bpm: number
): MusicContext {
  const bars = harmonyBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars,
    checksum,
    source: 'generated',
  };
  const { root, mode } = normalizeKeyRoot(inferKeyRootFromChordSymbols(bars));
  return {
    schemaVersion: '1.0',
    seed,
    presetId: 'song_mode',
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm,
    totalBars: bars.length,
    harmony,
    provenance: {
      sourceEngineId: 'song_mode',
      capturedAt: Date.now(),
    },
    receipts: [],
  };
}

/** Section-level record builder — normalises bars before checksum + MusicContext. */
export function buildSongModeSectionContext(
  input: BuildSongModeSectionContextInput
): SongModeSectionContext {
  const normalisedBars = input.harmonyBars.map(normalizeChordSymbol);
  const checksum = computeMusicContextChecksum(normalisedBars);
  const musicContext = buildSectionMusicContext(
    normalisedBars,
    checksum,
    input.seed ?? 0,
    input.bpm ?? 120
  );
  return {
    sectionId: input.sectionId,
    plan: { ...input.plan },
    musicContext,
    checksum,
  };
}

function logSectionChecksums(sections: readonly SongModeSectionContext[]): void {
  for (const section of sections) {
    console.log('[Song Mode] section checksum', section.sectionId, section.checksum);
  }
}

/**
 * Assemble export truth with duplicate-ID guard (hard-fail, never last-write-wins).
 * Logs each section checksum before computing {@link SongModeExportTruth.masterChecksum}.
 */
export function assembleSongModeExportTruth(
  sectionInputs: readonly BuildSongModeSectionContextInput[]
): SongModeExportTruth {
  const sectionById: Record<string, SongModeSectionContext> = {};
  const built: SongModeSectionContext[] = [];

  for (const input of sectionInputs) {
    const section = buildSongModeSectionContext(input);
    if (sectionById[section.sectionId]) {
      throw new Error(DUPLICATE_SECTION_ID(section.sectionId));
    }
    sectionById[section.sectionId] = section;
    built.push(section);
  }

  const sectionsOrdered = sortSectionIdentityDeterministic(built);
  logSectionChecksums(sectionsOrdered);
  const masterChecksum = computeSongModeMasterChecksum(sectionsOrdered);

  return {
    sectionsOrdered,
    sectionById,
    masterChecksum,
    capturedAt: Date.now(),
  };
}

/** Final MusicContext — concat sections in order, re-normalise, checksum-after-norm. */
export function buildMusicContextFromSongModeTruth(
  truth: SongModeExportTruth,
  options?: { seed?: number; bpm?: number; sourceRunId?: string }
): MusicContext {
  const rawBars = truth.sectionsOrdered.flatMap((s) => [...s.musicContext.harmony.bars]);
  const harmonyBars = rawBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const { root, mode } = normalizeKeyRoot(inferKeyRootFromChordSymbols(harmonyBars));
  const seed = options?.seed ?? truth.sectionsOrdered[0]?.musicContext.seed ?? 0;
  const bpm = options?.bpm ?? truth.sectionsOrdered[0]?.musicContext.bpm ?? 120;

  return {
    schemaVersion: '1.0',
    seed,
    presetId: 'song_mode',
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'song_mode',
      capturedAt: truth.capturedAt,
      ...(options?.sourceRunId ? { sourceRunId: options.sourceRunId } : {}),
    },
    receipts: [
      {
        engine: 'song_mode',
        kind: 'song_mode_sections_assembled',
        payload: {
          sectionIds: truth.sectionsOrdered.map((s) => s.sectionId),
          masterChecksum: truth.masterChecksum,
        },
      },
    ],
  };
}
