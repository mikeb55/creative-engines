/**
 * Riff Generator — DCR candidate loop, internal riff composite ≥ 9.0 hard gate, export.
 * (Composite is `scoreRiffGce` — not duo / Song Mode GCE.)
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXmlSchema } from '../export/musicxmlValidation';
import { validateExportIntegrity } from '../export/exportHardening';
import { expandNotationSafeDurationsInScore } from '../score-integrity/notationSafeRhythm';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import { validateNotationSafeRhythm } from '../score-integrity/notationSafeRhythm';
import { buildRiffScoreModel } from './buildRiffScoreModel';
import {
  applyRiffBarLocksToBuilt,
  buildRiffScoreFromBarSnapshots,
  normalizeRiffBarLocks,
  retargetLockedBarToChord,
  snapshotRiffCarryForward,
} from './riffCarryForward';
import { normalizeChordLoop } from './riffChordLoop';
import { applyMutation } from './riffVariationApply';
import type { RiffProfile } from '../composer/riffProfileTypes';
import type { RiffGenerationMetadata } from './riffMultiVoiceTypes';
import { finalizeRiffScoreBarMath } from './riffFinalizeBarMath';
import { scoreRiffGce } from './riffGce';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { RiffGeneratorParams, RiffGeneratorResult } from './riffTypes';
import { validateRiffIdentity } from './riffIdentityValidation';
import { validateBassHarmonicIntegrity } from './riffBassHarmonicGate';
import { validateRiffMusicXmlStructure } from './riffMusicXmlSanity';
import { evaluateRiffQualityRules } from './riffQualityRules';
import {
  evaluateRiffMusicality,
  RIFF_MUSICALITY_MAX_SEED_RETRIES,
  selectRiffByMusicality,
} from './riffMusicalityGate';
import {
  resolveRiffGeneratorProfile,
  riffStyleIdForFamily,
} from './resolveRiffGeneratorProfile';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { resolveRiffFamilyTag } from './riffVrbRegistry';
import { buildRiffGeneratorMusicContext } from '../music-context/musicContextAdapters';

const CANDIDATES = 7;
const MAX_ROUNDS = 40;
const GCE_THRESHOLD = 9.0;

export { buildRiffGeneratorMusicContext } from '../music-context/musicContextAdapters';

function prepareCarryForward(
  p: RiffGeneratorParams,
  musicalityProfile: RiffProfile,
  barLocks: boolean[],
  op: 'regenerate' | 'mutate' | 'full'
): import('./riffCarryForward').RiffCarryForward | undefined {
  const carry = p.carryForward;
  if (!carry?.bars.length || op === 'full') return carry;

  const priorChords = carry.bars.map((b) => (b.chord ?? '').trim());
  const chordChanged = p.chordSymbols.some((c, i) => priorChords[i] && priorChords[i] !== c.trim());

  if (op === 'regenerate' && chordChanged) {
    return {
      bars: carry.bars.map((snap, i) => {
        if (barLocks[i] && priorChords[i] !== (p.chordSymbols[i] ?? '').trim()) {
          return retargetLockedBarToChord(
            snap,
            p.chordSymbols[i]!,
            musicalityProfile,
            p.vrbId,
            i,
            p.style
          );
        }
        return {
          ...snap,
          rhythm: snap.rhythm.map((r) => ({ ...r })),
          guitarNotes: snap.guitarNotes.map((n) => ({ ...n })),
          bassNotes: snap.bassNotes?.map((n) => ({ ...n })),
          chord: p.chordSymbols[i] ?? snap.chord,
        };
      }),
    };
  }
  return carry;
}

function buildRiffCandidate(
  p: RiffGeneratorParams,
  musicalityProfile: RiffProfile,
  barLocks: boolean[]
) {
  const op = p.riffOp ?? 'full';
  const carry = prepareCarryForward(p, musicalityProfile, barLocks, op);

  if (op === 'mutate' && carry?.bars.length) {
    const snaps = carry.bars.map((s, b) => {
      if (barLocks[b]) {
        return {
          ...s,
          rhythm: s.rhythm.map((r) => ({ ...r })),
          guitarNotes: s.guitarNotes.map((n) => ({ ...n })),
          bassNotes: s.bassNotes?.map((n) => ({ ...n })),
        };
      }
      return applyMutation(s, musicalityProfile, p.seed + b * 997, p.vrbId, b);
    });
    while (snaps.length < p.bars) {
      const i = snaps.length;
      snaps.push({
        rhythm: [],
        guitarNotes: [],
        chord: p.chordSymbols[i],
      });
    }
    return buildRiffScoreFromBarSnapshots(p, snaps.slice(0, p.bars), p.chordSymbols);
  }

  let built = buildRiffScoreModel(p);
  if ((op === 'regenerate' || op === 'mutate') && carry && barLocks.some(Boolean)) {
    built = applyRiffBarLocksToBuilt(built, carry, barLocks);
  }
  return built;
}

export function runRiffGenerator(baseSeed: number, params: Omit<RiffGeneratorParams, 'seed' | 'chordSymbols'> & { chordSymbols?: string[]; chordProgressionText?: string }): RiffGeneratorResult {
  const chords = normalizeChordLoop(params.chordProgressionText, params.bars);
  const bundle = params.vrbId ? getVoiceRuleBundle(params.vrbId) : undefined;
  const engineStyle =
    bundle?.family && typeof bundle.family === 'string'
      ? riffStyleIdForFamily(bundle.family)
      : params.style;
  const musicalityProfile = resolveRiffGeneratorProfile({
    vrbId: params.vrbId,
    style: engineStyle,
    grid: params.grid,
    density: params.density,
    oddMeterPreset: params.oddMeterPreset,
    chordProgression: chords,
  });
  const full: RiffGeneratorParams = {
    ...params,
    style: engineStyle,
    seed: baseSeed,
    chordSymbols: chords,
    chordProgression: chords,
    riffProfile: musicalityProfile,
  };
  const barLocks = normalizeRiffBarLocks(full.barLocks, full.bars);
  const partialOp = full.riffOp === 'regenerate' || full.riffOp === 'mutate';

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let best: {
      gce: number;
      xml: string;
      score: import('../score-model/scoreModelTypes').ScoreModel;
      coreMotif: CoreMotif;
      perBarRhythm: import('./riffTypes').RiffRhythmSegment[][];
      density: import('./riffTypes').RiffDensity;
      bars: number;
      grid: import('./riffTypes').RiffGridMode;
      style: import('./riffTypes').RiffStyleId;
    } | null = null;

    const musicalityPool: Array<{
      gce: number;
      xml: string;
      score: import('../score-model/scoreModelTypes').ScoreModel;
      coreMotif: CoreMotif;
      perBarRhythm: import('./riffTypes').RiffRhythmSegment[][];
      density: import('./riffTypes').RiffDensity;
      bars: number;
      grid: import('./riffTypes').RiffGridMode;
      style: import('./riffTypes').RiffStyleId;
      musicality: import('./riffMusicalityGate').RiffMusicalityResult;
      generationMetadata?: RiffGenerationMetadata;
    }> = [];

    for (let c = 0; c < CANDIDATES; c++) {
      const seed = baseSeed + round * 100_003 + c * 7919;
      const p: RiffGeneratorParams = { ...full, seed };
      const built = buildRiffCandidate(p, musicalityProfile, barLocks);
      const { score, perBarRhythm } = built;

      finalizeRiffScoreBarMath(score, p.grid === 'sixteenth' ? 'sixteenth' : 'eighth');
      expandNotationSafeDurationsInScore(score);

      const bm = validateStrictBarMath(score);
      if (!bm.valid) continue;

      const ns = validateNotationSafeRhythm(score);
      if (!ns.valid) continue;

      const id = validateRiffIdentity(score, perBarRhythm);
      if (!id.valid) continue;

      if (p.bassEnabled && p.lineMode === 'guitar_bass') {
        const bh = validateBassHarmonicIntegrity(score, chords);
        if (!bh.valid) continue;
      }

      const gce = scoreRiffGce(score, perBarRhythm, chords);
      if (gce < GCE_THRESHOLD) continue;

      const exp = exportScoreModelToMusicXml(score);
      if (!exp.success || !exp.xml) continue;

      const schema = validateMusicXmlSchema(exp.xml);
      if (!schema.valid) continue;

      const exInt = validateExportIntegrity(exp.xml);
      if (!exInt.valid) continue;

      const sanity = validateRiffMusicXmlStructure(exp.xml);
      if (!sanity.valid) continue;

      const musicality = evaluateRiffMusicality(
        { score, perBarRhythm, bars: p.bars, grid: p.grid },
        musicalityProfile,
        { vrbId: p.vrbId, familyTag: p.vrbId ? resolveRiffFamilyTag(p.vrbId) : null }
      );
      const row = {
        gce,
        xml: exp.xml,
        score,
        coreMotif: built.coreMotif,
        perBarRhythm,
        density: p.density,
        bars: p.bars,
        grid: p.grid,
        style: p.style,
        musicality,
        generationMetadata: built.generationMetadata,
      };
      if (musicalityPool.length < RIFF_MUSICALITY_MAX_SEED_RETRIES) {
        musicalityPool.push(row);
      }
      if (!best || gce > best.gce) {
        best = {
          gce,
          xml: exp.xml,
          score,
          coreMotif: built.coreMotif,
          perBarRhythm,
          density: p.density,
          bars: p.bars,
          grid: p.grid,
          style: p.style,
        };
      }
    }

    if (best && best.gce >= GCE_THRESHOLD) {
      const musicalPick = selectRiffByMusicality(musicalityPool);
      const chosen = musicalPick ?? (musicalityPool[0] ? musicalityPool[0] : null);
      const out = chosen ?? {
        ...best,
        musicality: evaluateRiffMusicality(
          { score: best.score, perBarRhythm: best.perBarRhythm, bars: best.bars, grid: best.grid },
          musicalityProfile,
          { vrbId: full.vrbId, familyTag: full.vrbId ? resolveRiffFamilyTag(full.vrbId) : null }
        ),
      };
      const riffQuality = evaluateRiffQualityRules({
        score: out.score,
        perBarRhythm: out.perBarRhythm,
        density: out.density,
        bars: out.bars,
        grid: out.grid,
      });
      const genMeta = out.generationMetadata ?? musicalityPool[0]?.generationMetadata;
      const musicContext = buildRiffGeneratorMusicContext(full, out.coreMotif);
      return {
        success: true,
        score: out.score,
        xml: out.xml,
        gce: out.gce,
        version: 1,
        coreMotif: out.coreMotif,
        perBarRhythm: out.perBarRhythm,
        riffQuality,
        riffMusicality: out.musicality,
        riffCarryForward: snapshotRiffCarryForward(out.score, out.perBarRhythm),
        generationMetadata: genMeta,
        musicContext,
      };
    }
  }

  return {
    success: false,
    error: partialOp && !full.carryForward
      ? 'Riff Generator: regenerate/mutate requires a prior riff (generate once first)'
      : `Riff Generator: no candidate reached GCE ${GCE_THRESHOLD} after ${MAX_ROUNDS} rounds`,
  };
}
