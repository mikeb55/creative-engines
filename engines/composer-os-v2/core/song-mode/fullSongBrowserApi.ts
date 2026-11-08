/**
 * Browser ESM surface for TunePainter: full-song MusicXML + melodic variation pack
 * + selective passage reharmonisation + musical evaluation / A–B compare.
 * Bundled by `scripts/buildFullSongBrowserBundle.cjs`.
 */

export {
  generateFullSongMusicXml,
  type GenerateFullSongMusicXmlOptions,
  type FullSongMood,
} from './generateFullSongMusicXml';

/** Same dashboard APIs as Composer OS evaluationApp — read-only; no human artistic score. */
export {
  apiEvaluateMusicalScore,
  apiCompareMusicalScores,
} from '../../app-api/evaluationApp';

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import {
  generateMelodicVariations,
  scoreMelodicVariationsForPack,
  type Melody,
} from './melodicVariationPack';
import type { GceStructureSection } from '../gce/gceAutoScorers';
import { buildReharmPostGenPreviewContext } from '../harmony/buildReharmPostGenPreviewContext';
import {
  applyReharmAlternative,
  executeReharm,
} from '../harmony/reharmController';
import type { EmotionalDrift, ReharmApproach } from '../harmony/reharmCandidateEngine';
import type { ReharmLockedEvent } from '../harmony/reharmSequenceTypes';
import {
  buildSonicYouthPolychordProgressionScore,
  buildSonicYouthProto1MelodicDialogue,
  normalizeSyProto1UserPolychordBars,
  resolveSyProto1SelectedCandidate,
  type SonicYouthPolychordTuningOptions,
  type SonicYouthProto1MelodicDialogueOptions,
  type SyProto1HarmonicVariant,
  type SyProto1HarmonyMode,
  type SyProto1SeedCandidate,
  type SyProto1SeedComparisonRecord,
  type SyProto1ComparisonSeed,
  type SyProtoPolychordPair,
  type SyProtoTriadInput,
  type SyProtoProto1MelodicDialogueResult,
} from './sonicYouthPolychordScore';

export { normalizeSyProto1UserPolychordBars };

export type { ReharmLockedEvent };

export { generateMelodicVariations, scoreMelodicVariationsForPack };

export type BrowserMelodicVariationNote = { pitch: number; duration: number };

export type BrowserMelodicVariationPackRequest = {
  melody: BrowserMelodicVariationNote[];
  chords: string[];
  variationCount: number;
  songwriterId: string;
  sections?: Array<{ label: string; barStart: number; barEnd: number; role?: string }>;
};

export type BrowserMelodicVariationPackResult =
  | {
      success: true;
      scoringMode: 'melody-only';
      melody: BrowserMelodicVariationNote[];
      variations: Array<{
        melody: BrowserMelodicVariationNote[];
        gceScore: number;
        transform: string;
      }>;
    }
  | { success: false; error: string };

/**
 * Same contract as {@link apiMelodicVariationPack}: motif mutations + GCE overall ranking.
 * Pure in-browser; no HTTP.
 */
export function packMelodicVariationsBrowser(
  body: Partial<BrowserMelodicVariationPackRequest>
): BrowserMelodicVariationPackResult {
  const melody = body.melody;
  if (!Array.isArray(melody) || melody.length === 0) {
    return { success: false, error: 'melody must be a non-empty array of { pitch, duration }.' };
  }
  const chords = body.chords;
  if (!Array.isArray(chords) || chords.length === 0) {
    return { success: false, error: 'chords must be a non-empty string array.' };
  }
  for (const n of melody) {
    if (!n || typeof n.pitch !== 'number' || typeof n.duration !== 'number') {
      return { success: false, error: 'Each melody note needs numeric pitch and duration.' };
    }
  }
  const vcRaw = body.variationCount;
  if (typeof vcRaw !== 'number' || !Number.isFinite(vcRaw)) {
    return { success: false, error: 'variationCount must be a finite number (clamped to 3–5).' };
  }
  const variationSlots = Math.max(3, Math.min(5, Math.floor(vcRaw)));
  const songwriterId =
    typeof body.songwriterId === 'string' && body.songwriterId.trim()
      ? body.songwriterId.trim()
      : '';
  if (!songwriterId) {
    return { success: false, error: 'songwriterId is required.' };
  }

  const m = melody as Melody;
  const candidates = generateMelodicVariations(m, variationSlots);
  const sections: GceStructureSection[] =
    body.sections && body.sections.length > 0
      ? body.sections.map((s) => ({
          label: s.label,
          barStart: s.barStart,
          barEnd: s.barEnd,
          role: s.role ?? s.label,
        }))
      : [{ label: 'A', barStart: 1, barEnd: Math.max(1, chords.length), role: 'A' }];
  const scored = scoreMelodicVariationsForPack(candidates, {
    chords,
    sections,
    songwriterId,
  });
  const top = scored.slice(0, variationSlots);
  return {
    success: true,
    scoringMode: 'melody-only',
    melody: melody.map((x) => ({ pitch: x.pitch, duration: x.duration })),
    variations: top.map((s) => ({
      melody: s.variation.notes.map((n) => ({ pitch: n.pitch, duration: n.duration })),
      gceScore: s.gceScore,
      transform: s.variation.transform,
    })),
  };
}

const REHARM_DRIFTS = new Set<EmotionalDrift>([
  'darker',
  'brighter',
  'more-suspended',
  'more-unstable',
  'more-cinematic',
  'neutral',
]);

const DEFAULT_REHARM_LENS_FALLBACKS = [
  'bill_evans',
  'wayne_shorter',
  'herbie_hancock',
  'antonio_carlos_jobim',
  'donald_fagen',
] as const;

function resolvePassageReharmLensIds(songwriterId: string, requested?: string[]): string[] {
  const fromReq = (requested ?? [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  const out: string[] = [];
  for (const id of fromReq) {
    if (!out.includes(id)) out.push(id);
    if (out.length >= 3) return out;
  }
  if (!out.includes(songwriterId)) out.push(songwriterId);
  for (const id of DEFAULT_REHARM_LENS_FALLBACKS) {
    if (out.length >= 3) break;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, 3);
}

export type BrowserPassageReharmRequest = {
  /** Full-song chord strip (one symbol per bar, bar 1 = index 0). */
  chords: string[];
  /** Inclusive 1-based bar range. */
  startBar: number;
  endBar: number;
  songwriterId: string;
  /** Optional per-bar melody pitch classes aligned to startBar…endBar. */
  melodyPcs?: (number | null)[];
  /**
   * Optional timed locked melody/bass events (quarter notes, passage-relative).
   * Forwarded to {@link executeReharm}; not yet used by compatibility filters.
   */
  lockedEvents?: ReharmLockedEvent[];
  drift?: EmotionalDrift;
  seed?: number;
  /** 1–3 composer lens ids (defaults: songwriter + complementary lenses). */
  lensIds?: string[];
};

export type BrowserPassageReharmCandidate = {
  lensId: string;
  gceScore: number;
  /** Substitute symbols for the selected passage only (startBar…endBar). */
  chords: string[];
  /** Full strip after splicing the alternative (same length as input chords). */
  fullChords: string[];
  /** Contrasting harmonic approach label. */
  approach?: ReharmApproach;
};

export type BrowserPassageReharmResult =
  | {
      success: true;
      scoringMode: 'reharm-gce';
      startBar: number;
      endBar: number;
      seed: number;
      candidates: BrowserPassageReharmCandidate[];
      /**
       * Present when fewer than three valid contrasting alternatives were available.
       * MelodyPcs remain first-note-per-bar samples — not all-event melody/bass proof.
       */
      shortfall?: string;
    }
  | { success: false; error: string };

/**
 * Selective passage reharm for TunePainter full-song scores.
 * Contrasting mode: up to 3 approach-tagged progressions with source/pairwise distance gates via
 * {@link executeReharm}; ranks by Composer OS GCE overall. Exact-symbol dedupe retained as safety net.
 */
export function packPassageReharmBrowser(
  body: Partial<BrowserPassageReharmRequest>
): BrowserPassageReharmResult {
  const chords = body.chords;
  if (!Array.isArray(chords) || chords.length === 0) {
    return { success: false, error: 'chords must be a non-empty string array (one per bar).' };
  }
  if (!chords.every((c) => typeof c === 'string')) {
    return { success: false, error: 'Each chord must be a string.' };
  }
  const songwriterId =
    typeof body.songwriterId === 'string' && body.songwriterId.trim()
      ? body.songwriterId.trim()
      : '';
  if (!songwriterId) {
    return { success: false, error: 'songwriterId is required.' };
  }
  const startBar = Math.floor(Number(body.startBar));
  const endBar = Math.floor(Number(body.endBar));
  if (!Number.isFinite(startBar) || !Number.isFinite(endBar) || startBar < 1 || endBar < startBar) {
    return { success: false, error: 'startBar/endBar must be inclusive 1-based integers with endBar ≥ startBar.' };
  }
  if (endBar > chords.length) {
    return { success: false, error: `endBar ${endBar} exceeds chord strip length ${chords.length}.` };
  }
  const driftRaw = body.drift ?? 'neutral';
  if (!REHARM_DRIFTS.has(driftRaw as EmotionalDrift)) {
    return { success: false, error: `Unsupported drift "${String(driftRaw)}".` };
  }
  const drift = driftRaw as EmotionalDrift;
  const seed =
    body.seed !== undefined && Number.isFinite(body.seed) ? Math.floor(body.seed as number) : 334032;
  const lensIds = resolvePassageReharmLensIds(songwriterId, body.lensIds);
  if (lensIds.length < 1) {
    return { success: false, error: 'Need 1–3 lens ids.' };
  }

  const melodyPcs = body.melodyPcs;
  if (melodyPcs !== undefined) {
    const need = endBar - startBar + 1;
    if (!Array.isArray(melodyPcs) || melodyPcs.length !== need) {
      return {
        success: false,
        error: `melodyPcs must be length ${need} (aligned to startBar…endBar) or omitted.`,
      };
    }
  }

  const lockedEvents = body.lockedEvents;
  if (lockedEvents !== undefined && !Array.isArray(lockedEvents)) {
    return { success: false, error: 'lockedEvents must be an array or omitted.' };
  }

  try {
    const context = buildReharmPostGenPreviewContext(seed, [...chords], {
      songwriterStyleId: songwriterId,
    });
    const result = executeReharm({
      context,
      startBar,
      endBar,
      lensIds,
      drift,
      seed,
      selectionMode: 'contrasting',
      ...(melodyPcs ? { melodyPcs } : {}),
      ...(lockedEvents ? { lockedEvents } : {}),
    });

    const scored = result.alternatives
      .map((alt) => {
        const fullChords = applyReharmAlternative(alt, startBar, endBar, context);
        const passage = fullChords.slice(startBar - 1, endBar);
        return {
          lensId: alt.lensId,
          gceScore: typeof alt.gceScore === 'number' ? alt.gceScore : 0,
          chords: passage,
          fullChords,
          ...(alt.approach ? { approach: alt.approach } : {}),
        } satisfies BrowserPassageReharmCandidate;
      })
      .sort((a, b) => {
        if (Math.abs(b.gceScore - a.gceScore) > 1e-9) return b.gceScore - a.gceScore;
        return a.lensId.localeCompare(b.lensId);
      });

    const seen = new Set<string>();
    const candidates: BrowserPassageReharmCandidate[] = [];
    for (const c of scored) {
      const key = c.chords.join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(c);
      if (candidates.length >= 3) break;
    }

    if (candidates.length === 0) {
      return { success: false, error: 'No reharmonisation candidates for this passage.' };
    }

    const shortfall =
      result.shortfall ??
      (candidates.length < 3
        ? `Only ${candidates.length} contrasting reharm alternative(s) available after dedupe (need 3).`
        : undefined);

    return {
      success: true,
      scoringMode: 'reharm-gce',
      startBar: result.startBar,
      endBar: result.endBar,
      seed: result.seed,
      candidates,
      ...(shortfall ? { shortfall } : {}),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type {
  SonicYouthPolychordTuningOptions,
  SonicYouthProto1MelodicDialogueOptions,
  SyProto1HarmonicVariant,
  SyProto1HarmonyMode,
  SyProto1SeedCandidate,
  SyProto1SeedComparisonRecord,
  SyProto1ComparisonSeed,
  SyProtoPolychordPair,
  SyProtoTriadInput,
  SyProtoProto1MelodicDialogueResult,
};

export type GenerateSonicYouthPolychordMusicXmlOptions = {
  bpm?: number;
  /** Optional Guitar 1 opens: six integer MIDI 0–127, physical order 6→1. Default AAEEAA. */
  guitar1Tuning?: readonly number[];
  /** Optional Guitar 2 opens: six integer MIDI 0–127, physical order 6→1. Default ACCGG#C. */
  guitar2Tuning?: readonly number[];
};

/**
 * TunePainter / browser Proto1 options.
 * Forwards seed, tunings, harmonicVariant, harmonyMode, barCount, polychordBars to the Proto1 builder.
 * `harmonyMode` default `'fixed'`; `'adaptive'` uses seeded polychord planner.
 * Optional `polychordBars` → exact user pairs (roots/qualities) per bar.
 */
export type GenerateSonicYouthProto1MelodicDialogueMusicXmlOptions =
  SonicYouthProto1MelodicDialogueOptions & {
    bpm?: number;
  };

function applySyElectricGuitarIdentity(score: {
  parts: Array<{
    id: string;
    instrumentIdentity?: string;
    midiProgram?: number;
    scoreInstrumentName?: string;
    catalogueInstrumentSound?: string;
  }>;
}): void {
  for (const p of score.parts) {
    if (p.id === 'guitar' || p.id === 'guitar_2') {
      p.instrumentIdentity = 'clean_electric_guitar';
      p.midiProgram = 27;
      p.scoreInstrumentName = 'Electric Guitar';
      p.catalogueInstrumentSound = 'strings.guitar.electric';
    }
  }
}

/**
 * Browser entry: ordered dual-guitar polychord pairs → MusicXML string.
 * Reuses {@link buildSonicYouthPolychordProgressionScore} + MusicXML exporter.
 * Preserves two electric guitar parts. Grip failures keep bar / guitar / chord detail.
 * Optional tunings pass through to solveGuitarGrip({ openStrings }).
 */
export function generateSonicYouthPolychordMusicXml(
  pairs: readonly SyProtoPolychordPair[],
  options?: GenerateSonicYouthPolychordMusicXmlOptions
): string {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error(
      'generateSonicYouthPolychordMusicXml: pairs must be a non-empty ordered list of { guitar1, guitar2 }'
    );
  }
  const tuning: SonicYouthPolychordTuningOptions = {};
  if (options?.guitar1Tuning !== undefined) tuning.guitar1Tuning = options.guitar1Tuning;
  if (options?.guitar2Tuning !== undefined) tuning.guitar2Tuning = options.guitar2Tuning;
  const built = buildSonicYouthPolychordProgressionScore(
    pairs,
    Object.keys(tuning).length > 0 ? tuning : undefined
  );
  applySyElectricGuitarIdentity(built.score);
  const bpm =
    options?.bpm !== undefined && Number.isFinite(options.bpm)
      ? Math.floor(options.bpm)
      : built.score.tempo ?? 96;
  const result = exportScoreModelToMusicXml(built.score, { bpm });
  const xml = result.xml ?? '';
  if (!result.success || !xml.includes('<score-partwise')) {
    throw new Error(
      `generateSonicYouthPolychordMusicXml: MusicXML export failed${
        result.errors?.length ? `: ${result.errors.join('; ')}` : ''
      }`
    );
  }
  return xml;
}

/** In-memory Proto1 candidate retained by the browser generation API. */
export type GenerateSonicYouthProto1ApiCandidate = {
  seed: number;
  dialogue: SyProtoProto1MelodicDialogueResult;
};

/**
 * Proto1 MusicXML generation result.
 * `xml` is the exported MusicXML; auto-select keeps all four seed candidates in memory.
 */
export type GenerateSonicYouthProto1MelodicDialogueMusicXmlResult = {
  xml: string;
  /** Seed whose ScoreModel was exported. */
  selectedSeed: number;
  /** Auto path: seeds 1–4. Explicit seed path: single requested candidate. */
  candidates: readonly GenerateSonicYouthProto1ApiCandidate[];
  /** Present when auto-select ran (no explicit seed). */
  comparison: readonly SyProto1SeedComparisonRecord[] | null;
};

/**
 * Browser entry: Sonic Youth Proto1 melodic dialogue → MusicXML + in-memory candidates.
 * No explicit `seed` → {@link resolveSyProto1SelectedCandidate} (best of 1–4 ScoreModel).
 * Explicit `seed` → that dialogue only (custom tunings / modes / polychordBars unchanged).
 * Defaults: `harmonyMode: 'fixed'`, `harmonicVariant: 'A'`.
 * Optional `polychordBars` → exact user pairs; omitted → legacy fixed/adaptive pair source.
 * No GUI — options-only surface for TunePainter.
 */
export function generateSonicYouthProto1MelodicDialogueMusicXml(
  options?: GenerateSonicYouthProto1MelodicDialogueMusicXmlOptions
): GenerateSonicYouthProto1MelodicDialogueMusicXmlResult {
  const { bpm: bpmOpt, ...dialogueOpts } = options ?? {};
  // dialogueOpts includes harmonyMode / harmonicVariant / seed / tunings / barCount / polychordBars.
  let built: SyProtoProto1MelodicDialogueResult;
  let selectedSeed: number;
  let candidates: readonly GenerateSonicYouthProto1ApiCandidate[];
  let comparison: readonly SyProto1SeedComparisonRecord[] | null;

  if (dialogueOpts.seed !== undefined) {
    built = buildSonicYouthProto1MelodicDialogue(dialogueOpts);
    selectedSeed = dialogueOpts.seed;
    candidates = [{ seed: selectedSeed, dialogue: built }];
    comparison = null;
  } else {
    const resolved = resolveSyProto1SelectedCandidate(dialogueOpts);
    built = resolved.dialogue;
    selectedSeed = resolved.selectedSeed;
    candidates = resolved.candidates;
    comparison = resolved.comparison;
  }

  applySyElectricGuitarIdentity(built.score);
  const bpm =
    bpmOpt !== undefined && Number.isFinite(bpmOpt)
      ? Math.floor(bpmOpt)
      : built.score.tempo ?? 96;
  const result = exportScoreModelToMusicXml(built.score, { bpm });
  const xml = result.xml ?? '';
  if (!result.success || !xml.includes('<score-partwise')) {
    throw new Error(
      `generateSonicYouthProto1MelodicDialogueMusicXml: MusicXML export failed${
        result.errors?.length ? `: ${result.errors.join('; ')}` : ''
      }`
    );
  }
  return { xml, selectedSeed, candidates, comparison };
}

