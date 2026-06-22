/**
 * Smoke — Band mode Stage 2 (G/B + drum guide + scored Drums staff in MusicXML).
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';
import { extractScoreModelFeatures } from '../core/evaluation/featureExtractor';
import {
  ART_ROCK_BAND_DRUMS_PART_ID,
  appendArtRockBandDrumsToScore,
  buildArtRockBandMeasureEventsForBar,
} from '../core/export/appendArtRockBandDrumsToScore';
import {
  ART_ROCK_KICK_TICKS_44,
  ART_ROCK_SNARE_TICKS_44,
  ART_ROCK_CLOSED_HAT_TICKS_44,
  ART_ROCK_SPARSE_KICK_TICKS_44,
  ART_ROCK_SPARSE_SNARE_TICKS_44,
  ART_ROCK_SPARSE_CLOSED_HAT_TICKS_44,
  ART_ROCK_VELOCITY_BY_TIER,
  artRockSectionTierForBar,
} from '../core/export/artRockBandDrumGuide';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { runGoldenPath, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import {
  TELEVISION_FIELD_SUITE_PRESET,
  cloneMosaicSectionPlanPresetPlan,
} from '../core/mosaic-mode/mosaicSectionPlanPresets';
import { validateScoreDuoAttackGrid } from '../core/score-integrity/duoEighthBeatGrid';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const PROOF_SEED = 90106;
const NON_MOSAIC_BAND_SEED = 88888;
const SHORT_DUO_BARS = 16;
const TOTAL_BARS = TELEVISION_FIELD_SUITE_PRESET.totalBars;

function lockedHarmony40(): string[] {
  const cycle = ['Em', 'Am', 'D', 'G', 'C', 'B7', 'Em', 'Am'];
  return Array.from({ length: TOTAL_BARS }, (_, i) => cycle[i % cycle.length]!);
}

function tvSuiteGoldenPathOptions(bandModeEnabled: boolean): RunGoldenPathOptions {
  const locked = lockedHarmony40();
  const plan = cloneMosaicSectionPlanPresetPlan(TELEVISION_FIELD_SUITE_PRESET.id);
  return {
    presetId: 'guitar_bass_duo',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    primarySongwriterStyle: 'verlaine',
    harmonyMode: 'custom_locked',
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: plan,
    mosaicOutputFormat: 'melody-bass-chords',
    bpm: 120,
    scoreTitle: 'Band mode TV Suite smoke',
    ...(bandModeEnabled ? { bandModeEnabled: true as const } : {}),
  };
}

function tvSuiteGenerateRequest(bandModeEnabled: boolean): GenerateRequest {
  const locked = lockedHarmony40();
  const plan = cloneMosaicSectionPlanPresetPlan(TELEVISION_FIELD_SUITE_PRESET.id);
  return {
    presetId: 'guitar_bass_duo',
    styleStack: { primary: 'barry_harris' },
    seed: PROOF_SEED,
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    bandModeEnabled: bandModeEnabled ? true : undefined,
    primarySongwriterStyle: 'verlaine',
    harmonyMode: 'custom_locked',
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: plan,
    mosaicOutputFormat: 'melody-bass-chords',
    bpm: 120,
    title: 'Band mode TV Suite smoke',
  };
}

function xmlPartIds(xml: string): string[] {
  const ids: string[] = [];
  const re = /<part id="([^"]+)">/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    ids.push(m[1]!);
  }
  return ids;
}

function xmlScorePartNames(xml: string): string[] {
  const names: string[] = [];
  const re = /<part-name>([^<]+)<\/part-name>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    names.push(m[1]!.trim());
  }
  return names;
}

function xmlHasUnpitchedArtRockDrums(xml: string): boolean {
  return (
    xml.includes(`id="${ART_ROCK_BAND_DRUMS_PART_ID}"`) &&
    /<sign>percussion<\/sign>/.test(xml) &&
    /<unpitched>/.test(xml)
  );
}

function ticksEqual(a: number[] | undefined, b: readonly number[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((t, i) => t === b[i]);
}

function sidecarBarsHaveNoClosedHatTicks(
  bars: Array<{ closedHatTicks?: number[] }> | undefined
): boolean {
  if (!bars?.length) return false;
  return bars.every((b) => b.closedHatTicks == null || b.closedHatTicks.length === 0);
}

function partEventsFingerprint(score: ScoreModel, partId: string): string {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return '';
  return JSON.stringify(
    part.measures.map((m) =>
      m.events.map((e) =>
        e.kind === 'note'
          ? { k: 'n', sb: e.startBeat, d: e.duration, p: e.pitch, v: e.voice ?? 1 }
          : { k: e.kind, sb: e.startBeat, d: e.duration, v: e.voice ?? 1 }
      )
    )
  );
}

function drumBarHitCount(score: ScoreModel, barIndex: number): number {
  const drumPart = score.parts.find((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID);
  if (!drumPart) return 0;
  const m = drumPart.measures.find((x) => x.index === barIndex);
  if (!m) return 0;
  return m.events.filter((e) => e.kind === 'note').length;
}

function drumSectionAvgHits(score: ScoreModel, from: number, to: number): number {
  let sum = 0;
  let count = 0;
  for (let bar = from; bar <= to; bar++) {
    if ([8, 20, 28].includes(bar)) continue;
    sum += drumBarHitCount(score, bar);
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
}

function drumBarPatternKey(score: ScoreModel, barIndex: number): string {
  const drumPart = score.parts.find((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID);
  if (!drumPart) return '';
  const m = drumPart.measures.find((x) => x.index === barIndex);
  if (!m) return '';
  return JSON.stringify(
    m.events.map((e) =>
      e.kind === 'note'
        ? { k: 'n', sb: e.startBeat, d: e.duration, p: e.pitch, v: e.voice ?? 1 }
        : { k: e.kind, sb: e.startBeat, d: e.duration, v: e.voice ?? 1 }
    )
  );
}

function drumBarAvgVelocity(score: ScoreModel, from: number, to: number): number {
  const drumPart = score.parts.find((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID);
  if (!drumPart) return 0;
  let sum = 0;
  let count = 0;
  for (let bar = from; bar <= to; bar++) {
    const m = drumPart.measures.find((x) => x.index === bar);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note' || e.velocity == null) continue;
      sum += e.velocity;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function mediumPatternKey(beatSpan = 4): string {
  return JSON.stringify(
    buildArtRockBandMeasureEventsForBar(10, beatSpan, true).map((e) =>
      e.kind === 'note'
        ? { k: 'n', sb: e.startBeat, d: e.duration, p: e.pitch, v: e.voice ?? 1 }
        : { k: e.kind, sb: e.startBeat, d: e.duration, v: e.voice ?? 1 }
    )
  );
}

function drumBarMathOk(score: ScoreModel): boolean {
  const drumPart = score.parts.find((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID);
  if (!drumPart) return false;
  for (const m of drumPart.measures) {
    const v1 = m.events.filter((e) => (e.voice ?? 1) === 1);
    const v2 = m.events.filter((e) => (e.voice ?? 1) === 2);
    const span = m.measureBeatSpanQuarters ?? 4;
    const sum = (evs: typeof m.events) => evs.reduce((a, e) => a + e.duration, 0);
    if (Math.abs(sum(v1) - span) > 1e-5 || Math.abs(sum(v2) - span) > 1e-5) return false;
  }
  const check = validateStrictBarMath({
    ...score,
    parts: [drumPart],
  });
  return check.valid;
}

export function runBandModeSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  const tmpOn = fs.mkdtempSync(path.join(os.tmpdir(), 'co-band-mode-on-'));
  const tmpOnNoMosaic = fs.mkdtempSync(path.join(os.tmpdir(), 'co-band-mode-on-nomosaic-'));
  const tmpOff = fs.mkdtempSync(path.join(os.tmpdir(), 'co-band-mode-off-'));
  const tmpOffProof = fs.mkdtempSync(path.join(os.tmpdir(), 'co-band-mode-off-proof-'));

  let bandOnOk = false;
  try {
    const req = tvSuiteGenerateRequest(true);
    const result = generateComposition(req, tmpOn);
    if (result.success && result.filepath && result.xml) {
      const dir = path.dirname(result.filepath);
      const base = path.basename(result.filepath, path.extname(result.filepath));
      const midPath = path.join(dir, `${base}_drum_guide.mid`);
      const jsonPath = path.join(dir, `${base}_drum_guide.json`);
      const manifestPath = manifestPathForMusicXml(result.filepath);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
        bandMode?: boolean;
        drumGuideSource?: string;
      };
      const sidecar = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
        totalBars?: number;
        bandMode?: boolean;
        drumGuideSource?: string;
        bars?: Array<{
          kickTicks?: number[];
          snareTicks?: number[];
          closedHatTicks?: number[];
        }>;
      };
      const bar1 = sidecar.bars?.[0];
      const partIds = xmlPartIds(result.xml);
      const partNames = xmlScorePartNames(result.xml);
      bandOnOk =
        result.validation.behaviourGatesPassed === true &&
        result.validation.exportIntegrityPassed === true &&
        result.validation.strictBarMathPassed === true &&
        fs.existsSync(midPath) &&
        fs.existsSync(jsonPath) &&
        manifest.bandMode === true &&
        manifest.drumGuideSource === 'art_rock_mosaic_grid' &&
        sidecar.totalBars === TOTAL_BARS &&
        sidecar.drumGuideSource === 'art_rock_mosaic_grid' &&
        sidecar.bandMode === true &&
        ticksEqual(bar1?.kickTicks, ART_ROCK_SPARSE_KICK_TICKS_44) &&
        ticksEqual(bar1?.snareTicks, ART_ROCK_SPARSE_SNARE_TICKS_44) &&
        ticksEqual(bar1?.closedHatTicks, ART_ROCK_SPARSE_CLOSED_HAT_TICKS_44) &&
        partIds.length === 3 &&
        partIds.includes('guitar') &&
        partIds.includes('bass') &&
        partIds.includes(ART_ROCK_BAND_DRUMS_PART_ID) &&
        partNames.some((n) => /^drums?$/i.test(n)) &&
        xmlHasUnpitchedArtRockDrums(result.xml);
    }
  } finally {
    try {
      fs.rmSync(tmpOn, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  let bandOnNoMosaicOk = false;
  try {
    const reqNoMosaic: GenerateRequest = {
      presetId: 'guitar_bass_duo',
      styleStack: { primary: 'barry_harris' },
      seed: NON_MOSAIC_BAND_SEED,
      totalBars: SHORT_DUO_BARS,
      bandModeEnabled: true,
      bpm: 120,
      title: 'Band mode no-mosaic smoke',
    };
    const resultNoMosaic = generateComposition(reqNoMosaic, tmpOnNoMosaic);
    if (resultNoMosaic.success && resultNoMosaic.filepath && resultNoMosaic.xml) {
      const dir = path.dirname(resultNoMosaic.filepath);
      const base = path.basename(resultNoMosaic.filepath, path.extname(resultNoMosaic.filepath));
      const midPath = path.join(dir, `${base}_drum_guide.mid`);
      const jsonPath = path.join(dir, `${base}_drum_guide.json`);
      const manifestPath = manifestPathForMusicXml(resultNoMosaic.filepath);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
        bandMode?: boolean;
        drumGuideSource?: string;
      };
      const sidecar = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
        bandMode?: boolean;
        drumGuideSource?: string;
        bars?: Array<{ closedHatTicks?: number[] }>;
      };
      const midStat = fs.existsSync(midPath) ? fs.statSync(midPath) : undefined;
      const partIds = xmlPartIds(resultNoMosaic.xml);
      bandOnNoMosaicOk =
        midStat != null &&
        midStat.size > 0 &&
        fs.existsSync(jsonPath) &&
        manifest.bandMode === true &&
        sidecar.bandMode === true &&
        manifest.drumGuideSource === 'gb_onset_proxy' &&
        sidecar.drumGuideSource === 'gb_onset_proxy' &&
        sidecarBarsHaveNoClosedHatTicks(sidecar.bars) &&
        partIds.length === 3 &&
        partIds.includes(ART_ROCK_BAND_DRUMS_PART_ID) &&
        xmlHasUnpitchedArtRockDrums(resultNoMosaic.xml);
    }
  } finally {
    try {
      fs.rmSync(tmpOnNoMosaic, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  let bandOffOk = false;
  try {
    const reqOff: GenerateRequest = {
      presetId: 'guitar_bass_duo',
      styleStack: { primary: 'barry_harris' },
      seed: 77777,
      totalBars: 16,
      skipDrumGuide: true,
      bpm: 120,
      title: 'Band mode off smoke',
    };
    const resultOff = generateComposition(reqOff, tmpOff);
    if (resultOff.success && resultOff.filepath && resultOff.xml) {
      const dir = path.dirname(resultOff.filepath);
      const base = path.basename(resultOff.filepath, path.extname(resultOff.filepath));
      const midPath = path.join(dir, `${base}_drum_guide.mid`);
      const partIds = xmlPartIds(resultOff.xml);
      bandOffOk =
        !fs.existsSync(midPath) &&
        resultOff.drumGuideFilepath == null &&
        resultOff.bandModeEnabled !== true &&
        partIds.length === 2 &&
        !partIds.includes(ART_ROCK_BAND_DRUMS_PART_ID);
    }
  } finally {
    try {
      fs.rmSync(tmpOff, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  let bandOffProofByteStable = false;
  try {
    const reqOffProof = tvSuiteGenerateRequest(false);
    delete reqOffProof.bandModeEnabled;
    const resultOffProof = generateComposition(reqOffProof, tmpOffProof);
    if (resultOffProof.success && resultOffProof.xml) {
      const partIds = xmlPartIds(resultOffProof.xml);
      bandOffProofByteStable =
        partIds.length === 2 &&
        !resultOffProof.xml.includes(ART_ROCK_BAND_DRUMS_PART_ID) &&
        resultOffProof.validation.behaviourGatesPassed === true &&
        resultOffProof.validation.strictBarMathPassed === true;
    }
  } finally {
    try {
      fs.rmSync(tmpOffProof, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  let stage2GateBundleOk = false;
  try {
    const gpOff = runGoldenPath(PROOF_SEED, tvSuiteGoldenPathOptions(false));
    const gpOn = runGoldenPath(PROOF_SEED, tvSuiteGoldenPathOptions(true));
    const scoreOff = gpOff.score;
    const scoreOn = gpOn.score;
    const drumPart = scoreOn.parts.find((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID);
    const grid = validateScoreDuoAttackGrid(scoreOn);
    const melodicId = resolveMelodicPartId(scoreOn);
    const ratioOffRaw = extractScoreModelFeatures(scoreOff).formal?.riffRepetitionRatio;
    const ratioOnRaw = extractScoreModelFeatures(scoreOn).formal?.riffRepetitionRatio;
    const ratioOff = typeof ratioOffRaw === 'number' ? ratioOffRaw : -1;
    const ratioOnFiltered = typeof ratioOnRaw === 'number' ? ratioOnRaw : -2;
    const guitarSame = partEventsFingerprint(scoreOff, 'guitar') === partEventsFingerprint(scoreOn, 'guitar');
    const bassSame = partEventsFingerprint(scoreOff, 'bass') === partEventsFingerprint(scoreOn, 'bass');
    stage2GateBundleOk =
      gpOff.strictBarMathPassed === true &&
      gpOn.strictBarMathPassed === true &&
      gpOn.behaviourGatesPassed === true &&
      drumPart != null &&
      drumBarMathOk(scoreOn) &&
      grid.valid === true &&
      melodicId === 'guitar' &&
      ratioOff >= 0 &&
      ratioOnFiltered >= 0 &&
      Math.abs(ratioOff - ratioOnFiltered) < 1e-9 &&
      guitarSame &&
      bassSame;
  } catch {
    stage2GateBundleOk = false;
  }

  let appendIdempotentOk = false;
  try {
    const gp = runGoldenPath(PROOF_SEED, tvSuiteGoldenPathOptions(true));
    const beforeHash = crypto
      .createHash('sha256')
      .update(partEventsFingerprint(gp.score, 'guitar') + partEventsFingerprint(gp.score, 'bass'))
      .digest('hex');
    const afterFirst = appendArtRockBandDrumsToScore(gp.score, gp.context, true);
    const afterSecond = appendArtRockBandDrumsToScore(afterFirst, gp.context, true);
    const afterHash = crypto
      .createHash('sha256')
      .update(partEventsFingerprint(afterSecond, 'guitar') + partEventsFingerprint(afterSecond, 'bass'))
      .digest('hex');
    const drumCount = afterSecond.parts.filter((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID).length;
    appendIdempotentOk = beforeHash === afterHash && drumCount === 1;
  } catch {
    appendIdempotentOk = false;
  }

  let stage3Gate90106Ok = false;
  let stage3Density90106 = { intro: 0, build: 0, peak: 0, tail: 0 };
  let stage3Velocity90106 = { intro: 0, peak: 0, tail: 0 };
  try {
    const gp = runGoldenPath(PROOF_SEED, tvSuiteGoldenPathOptions(true));
    const score = gp.score;
    stage3Density90106 = {
      intro: drumSectionAvgHits(score, 1, 7),
      build: drumSectionAvgHits(score, 9, 19),
      peak: drumSectionAvgHits(score, 21, 27),
      tail: drumSectionAvgHits(score, 29, 40),
    };
    stage3Velocity90106 = {
      intro: drumBarAvgVelocity(score, 1, 7),
      peak: drumBarAvgVelocity(score, 21, 27),
      tail: drumBarAvgVelocity(score, 29, 40),
    };
    const mediumKey = mediumPatternKey();
    const fillBarMath =
      drumBarMathOk(score) &&
      [8, 20, 28].every((bar) => {
        const drumPart = score.parts.find((p) => p.id === ART_ROCK_BAND_DRUMS_PART_ID);
        const m = drumPart?.measures.find((x) => x.index === bar);
        if (!m) return false;
        const v1 = m.events.filter((e) => (e.voice ?? 1) === 1);
        const v2 = m.events.filter((e) => (e.voice ?? 1) === 2);
        const span = m.measureBeatSpanQuarters ?? 4;
        const sum = (evs: typeof m.events) => evs.reduce((a, e) => a + e.duration, 0);
        return Math.abs(sum(v1) - span) < 1e-5 && Math.abs(sum(v2) - span) < 1e-5;
      });
    stage3Gate90106Ok =
      stage3Density90106.build > stage3Density90106.intro &&
      stage3Density90106.peak > stage3Density90106.build &&
      stage3Density90106.peak > stage3Density90106.tail &&
      drumBarPatternKey(score, 9) === mediumKey &&
      drumBarPatternKey(score, 7) !== drumBarPatternKey(score, 9) &&
      drumBarPatternKey(score, 21) !== drumBarPatternKey(score, 20) &&
      drumBarPatternKey(score, 29) !== drumBarPatternKey(score, 28) &&
      stage3Velocity90106.intro < stage3Velocity90106.peak &&
      stage3Velocity90106.tail < stage3Velocity90106.peak &&
      stage3Velocity90106.intro <= ART_ROCK_VELOCITY_BY_TIER.sparse + 1 &&
      stage3Velocity90106.peak >= ART_ROCK_VELOCITY_BY_TIER.busy - 1 &&
      fillBarMath;
  } catch {
    stage3Gate90106Ok = false;
  }

  let stage3Gate88888Ok = false;
  try {
    const gp = runGoldenPath(NON_MOSAIC_BAND_SEED, {
      presetId: 'guitar_bass_duo',
      styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
      totalBars: SHORT_DUO_BARS,
      primarySongwriterStyle: 'verlaine',
      bpm: 120,
      scoreTitle: 'Band mode Stage 3 no-mosaic',
      bandModeEnabled: true,
    });
    const score = gp.score;
    const mediumKey = mediumPatternKey();
    let allMedium = true;
    for (let bar = 1; bar <= SHORT_DUO_BARS; bar++) {
      if (drumBarPatternKey(score, bar) !== mediumKey) {
        allMedium = false;
        break;
      }
    }
    stage3Gate88888Ok =
      gp.strictBarMathPassed === true &&
      drumBarMathOk(score) &&
      allMedium &&
      drumBarAvgVelocity(score, 1, SHORT_DUO_BARS) >= ART_ROCK_VELOCITY_BY_TIER.medium - 1 &&
      drumBarAvgVelocity(score, 1, SHORT_DUO_BARS) <= ART_ROCK_VELOCITY_BY_TIER.medium + 1;
  } catch {
    stage3Gate88888Ok = false;
  }

  out.push({
    ok: bandOnOk,
    name: `Band mode ON: TV Suite ${TOTAL_BARS} bars seed ${PROOF_SEED} -> guide + 3-part XML (G/B/Drums unpitched) + golden-path gates`,
  });
  out.push({
    ok: bandOnNoMosaicOk,
    name: `Band mode ON no mosaic: ${SHORT_DUO_BARS} bars seed ${NON_MOSAIC_BAND_SEED} -> gb_onset_proxy guide + scored Drums (3 parts)`,
  });
  out.push({
    ok: bandOffOk,
    name: 'Band mode OFF + skipDrumGuide: no _drum_guide.mid, 2 parts only',
  });
  out.push({
    ok: bandOffProofByteStable,
    name: `Band mode OFF proof seed ${PROOF_SEED}: no scored Drums part, strictBarMath + behaviour gates PASS`,
  });
  out.push({
    ok: stage2GateBundleOk,
    name: `Band Stage 2 gates seed ${PROOF_SEED}: drum 2-voice bar-math, attack-grid exempt, melodic=guitar, sectionContrast filtered match`,
  });
  out.push({
    ok: appendIdempotentOk,
    name: 'appendArtRockBandDrumsToScore idempotent; guitar/bass events unchanged on re-append',
  });
  out.push({
    ok: stage3Gate90106Ok,
    name: `Band Stage 3 gates seed ${PROOF_SEED}: section density arc + boundary fills + velocity tiers (intro=${stage3Density90106.intro.toFixed(2)} build=${stage3Density90106.build.toFixed(2)} peak=${stage3Density90106.peak.toFixed(2)} tail=${stage3Density90106.tail.toFixed(2)} vel intro=${stage3Velocity90106.intro.toFixed(1)} peak=${stage3Velocity90106.peak.toFixed(1)} tail=${stage3Velocity90106.tail.toFixed(1)})`,
  });
  out.push({
    ok: stage3Gate88888Ok,
    name: `Band Stage 3 no-mosaic seed ${NON_MOSAIC_BAND_SEED}: flat medium scored drums unchanged`,
  });
  return out;
}
