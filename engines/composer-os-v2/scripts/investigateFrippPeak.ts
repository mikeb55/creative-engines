/**
 * Local one-off: Fripp peak (bars 21-28) density + GCE-style read for TV Suite Art Rock arc.
 * NOT committed - investigation only.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  TELEVISION_FIELD_SUITE_PRESET,
  TELEVISION_FIELD_SUITE_PRESET_ID,
  cloneMosaicSectionPlanPresetPlan,
} from '../core/mosaic-mode/mosaicSectionPlanPresets';
import { analyzeMusicXmlPerBar, type PartSummary } from './analyzeMusicXmlPerBar';
import { validateArc, PROOF_SEED } from './validateArtRockMosaicArc';
import { evaluateMosaicSections } from '../core/mosaic-mode/evaluateMosaicSections';
import { validateMethenyConformance } from '../core/style-modules/metheny/moduleValidation';
import {
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreTensionAndReleaseForEnsemble,
  scoreArrangementAndOrchestrationForEnsemble,
  gceSectionsFromFormMap,
} from '../core/gce/gceAutoScorers';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { isGuitarMelodyVoiceNote } from '../core/score-integrity/guitarVoiceMelody';
import { validateDuoMelodyIdentityV3 } from '../core/score-integrity/duoMelodyIdentityV3';

const PEAK_FROM = 21;
const PEAK_TO = 28;
const METHENY_GUITAR_CEILING = 56;
const TOTAL_BARS = TELEVISION_FIELD_SUITE_PRESET.totalBars;

function lockedHarmony40(): string[] {
  const cycle = ['Em', 'Am', 'D', 'G', 'C', 'B7', 'Em', 'Am'];
  return Array.from({ length: TOTAL_BARS }, (_, i) => cycle[i % cycle.length]!);
}

function findPart(parts: PartSummary[], pattern: RegExp): PartSummary | undefined {
  return parts.find((p) => pattern.test(p.partName) || pattern.test(p.partId));
}

function barAttacks(part: PartSummary | undefined, bar: number): number {
  return part?.bars.find((b) => b.bar === bar)?.attacks ?? 0;
}

function sliceScore(score: ScoreModel, from: number, to: number): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((p) => ({
      ...p,
      measures: p.measures
        .filter((m) => m.index >= from && m.index <= to)
        .map((m) => ({
          ...m,
          events: m.events.map((e) => ({ ...e })),
        })),
    })),
  };
}

function guitarNotesInBar(score: ScoreModel, bar: number): number {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return 0;
  const m = guitar.measures.find((x) => x.index === bar);
  return m ? m.events.filter((e) => e.kind === 'note').length : 0;
}

function sectionAvgAttacks(parts: PartSummary[], from: number, to: number): number {
  let sum = 0;
  let count = 0;
  for (const part of parts) {
    for (const bar of part.bars.filter((b) => b.bar >= from && b.bar <= to)) {
      sum += bar.attacks;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function maxMelodyLeapDetail(score: ScoreModel): Record<string, unknown> {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return { error: 'no guitar' };
  let maxLeap = 0;
  let info: Record<string, unknown> | null = null;
  let prev: { bar: number; beat: number; pitch: number } | null = null;
  for (const m of [...g.measures].sort((a, b) => a.index - b.index)) {
    for (const e of [...m.events].sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    )) {
      if (!isGuitarMelodyVoiceNote(e)) continue;
      const pitch = (e as { pitch: number }).pitch;
      const beat = (e as { startBeat: number }).startBeat;
      const cur = { bar: m.index, beat, pitch };
      if (prev) {
        const d = Math.abs(pitch - prev.pitch);
        if (d > maxLeap) {
          maxLeap = d;
          info = { from: prev, to: cur, interval: d };
        }
      }
      prev = cur;
    }
  }
  return { maxLeap, leap: info };
}

function runOnce(bandModeLike = false): Record<string, unknown> {
  const plan = cloneMosaicSectionPlanPresetPlan(TELEVISION_FIELD_SUITE_PRESET_ID);
  const locked = lockedHarmony40();
  const result = runGoldenPathOnce(PROOF_SEED, {
    presetId: 'guitar_bass_duo',
    scoreTitle: 'Fripp Peak Investigation',
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: plan,
    mosaicOutputFormat: 'melody-bass-chords',
    primarySongwriterStyle: 'verlaine',
    ...(bandModeLike ? { bandModeEnabled: true as const } : { songModeHookFirstIdentity: true }),
  });

  const xml = result.xml ?? '';
  if (!result.score || !xml) {
    return { error: 'generation failed', errors: result.errors };
  }

  const report = validateArc(
    xml,
    { verlaine: true, marr: true, fripp: true },
    result.success === true,
    result.errors ?? []
  );

  const { parts } = analyzeMusicXmlPerBar(xml);
  const guitar = findPart(parts, /guitar/i);
  const bass = findPart(parts, /bass|electric bass|upright/i);

  const peakBars = [];
  for (let bar = PEAK_FROM; bar <= PEAK_TO; bar++) {
    const g = barAttacks(guitar, bar);
    const b = barAttacks(bass, bar);
    peakBars.push({
      bar,
      guitarAttacks: g,
      bassAttacks: b,
      totalAttacks: g + b,
      guitarScoreNotes: guitarNotesInBar(result.score, bar),
    });
  }

  const sections = TELEVISION_FIELD_SUITE_PRESET.plan.map((s) => ({
    label: s.sectionLabel,
    from: s.startBar,
    to: s.endBar,
    avgAttacksPerPartBar: sectionAvgAttacks(parts, s.startBar, s.endBar),
  }));

  const md = result.context?.generationMetadata;
  const mosaicEval =
    md?.mosaicSectionEvalResults ??
    (result.context ? evaluateMosaicSections(result.score, result.context) : []);

  const frippEval = mosaicEval.find((e) => e.composerId === 'fripp' || e.sectionLabel === 'peak');

  const methenyWhole = validateMethenyConformance(result.score);
  const methenyPeakSlice = validateMethenyConformance(sliceScore(result.score, PEAK_FROM, PEAK_TO));

  const peakScore = sliceScore(result.score, PEAK_FROM, PEAK_TO);
  const melody = scoreModelToMelodicLine(peakScore, resolveMelodicPartId(peakScore));
  const lockedPeak = locked.slice(PEAK_FROM - 1, PEAK_TO);
  const sectionsForm =
    result.context?.form != null
      ? gceSectionsFromFormMap(result.context.form).filter(
          (s) => s.endBar >= PEAK_FROM && s.startBar <= PEAK_TO
        )
      : [{ role: 'peak' as const, startBar: PEAK_FROM, endBar: PEAK_TO }];

  const gcePeak = {
    rhythmicIdentity: scoreRhythmicIdentity(melody),
    structureAndForm: scoreStructureAndForm(peakScore, lockedPeak, sectionsForm),
    tensionAndRelease: scoreTensionAndReleaseForEnsemble(peakScore, lockedPeak, melody),
    arrangementOrchestration: scoreArrangementAndOrchestrationForEnsemble(peakScore),
  };

  const leapDetail = result.score ? maxMelodyLeapDetail(result.score) : null;
  const v3 =
    result.score && result.context
      ? validateDuoMelodyIdentityV3(result.score, result.plans?.motifState, {
          presetId: 'guitar_bass_duo',
          effectiveFormBars: TOTAL_BARS,
          compositionContext: result.context,
        })
      : null;
  const leapTripsCap = leapDetail && typeof leapDetail.maxLeap === 'number' ? leapDetail.maxLeap > 14 : false;
  console.log(
    '[duo-v3-debug] validator=duoMelodyIdentityV3.ts validateDuoMelodyIdentityV3 / largeLeapStats; condition=maxLeap>14; cap=14; maxLeap=',
    leapDetail && 'maxLeap' in leapDetail ? leapDetail.maxLeap : 'n/a',
    'trips=',
    leapTripsCap,
    'worst=',
    JSON.stringify(leapDetail?.leap ?? null)
  );
  if (result.errors?.length) {
    const leapErrs = result.errors.filter((e) => /leap|v3/i.test(e));
    if (leapErrs.length) console.log('[duo-v3-debug] goldenPath leap/v3 errors:', leapErrs);
  }

  return {
    seed: PROOF_SEED,
    bandModeLike,
    goldenSuccess: result.success,
    goldenErrors: result.errors,
    leapDetail,
    v3Valid: v3?.valid,
    v3Errors: v3?.errors,
    deterministic: true,
    densityPeak: report.metrics.densityPeak,
    densityIntro: report.metrics.densityIntro,
    densityBuild: report.metrics.densityBuild,
    densityTail: report.metrics.densityTail,
    sectionAvgs: sections,
    peakBars,
    maxTotalAttacksPerBar: Math.max(...peakBars.map((x) => x.totalAttacks)),
    maxGuitarAttacksPerBarXml: Math.max(...peakBars.map((x) => x.guitarAttacks)),
    maxGuitarScoreNotesPerBar: Math.max(...peakBars.map((x) => x.guitarScoreNotes)),
    methenyCeiling: METHENY_GUITAR_CEILING,
    methenyWholeScore: methenyWhole,
    methenyPeakSliceGuitarTotal: methenyPeakSlice,
    frippMosaicEval: frippEval,
    gcePeakSlice: gcePeak,
    arcOverall: report.overall,
    arcRules: report.rules.map((r) => ({ id: r.id, verdict: r.verdict })),
  };
}

function main(): void {
  console.log('Fripp peak investigation - seed', PROOF_SEED);
  console.log('--- bandModeLike (no songModeHookFirstIdentity) ---');
  console.log(JSON.stringify(runOnce(true), null, 2));
}

if (require.main === module) {
  main();
}
