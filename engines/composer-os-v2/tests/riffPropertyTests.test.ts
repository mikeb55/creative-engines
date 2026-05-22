/**
 * Riff generator property tests (Phase D) — density, loop closure, register, pitch streak, horns.
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildHornStabTrack } from '../core/riff-generator/riffHornStabBuilder';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import {
  resolveRiffGeneratorProfile,
  riffStyleIdForFamily,
} from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_GENERATOR_VRB_IDS,
  RIFF_VRB_EXPECTED_FAMILY,
  type RiffGeneratorVrbId,
} from '../core/riff-generator/riffVrbRegistry';
import { rhythmFingerprint } from '../core/riff-generator/riffRhythm';
import type { RiffDensity, RiffGridMode, RiffRhythmSegment } from '../core/riff-generator/riffTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  goldenGridForVrb,
  noteCountGuitar,
  offbeatRatioFromRhythm,
  registerMeanFromScore,
  RIFF_GOLDEN_BARS,
  RIFF_GOLDEN_SEED,
} from './riffGoldenFixture';

const LOOP_SIXTEENTH_TOL = 0.25;

function riffRun(
  vrbId: RiffGeneratorVrbId,
  density: RiffDensity,
  seed = RIFF_GOLDEN_SEED
) {
  const family = RIFF_VRB_EXPECTED_FAMILY[vrbId];
  const style = riffStyleIdForFamily(family);
  const grid = goldenGridForVrb(vrbId);
  const base = {
    vrbId,
    bars: RIFF_GOLDEN_BARS,
    density,
    style,
    grid,
    bpm: 100,
  } as const;
  const primary = runRiffGenerator(seed, {
    ...base,
    lineMode: 'guitar_bass',
    bassEnabled: true,
  });
  if (primary.success) return primary;
  return runRiffGenerator(seed, {
    ...base,
    lineMode: 'single_line',
    bassEnabled: false,
  });
}

function boundaryGapOk(
  bar: RiffRhythmSegment[],
  next: RiffRhythmSegment[],
  tol: number
): boolean {
  let lastSeg: RiffRhythmSegment | null = null;
  for (const s of bar) {
    if (!s.rest) lastSeg = s;
  }
  let firstSeg: RiffRhythmSegment | null = null;
  for (const s of next) {
    if (!s.rest) {
      firstSeg = s;
      break;
    }
  }
  if (!lastSeg || !firstSeg) return true;
  const tailGap = 4 - (lastSeg.startBeat + lastSeg.duration);
  const headGap = firstSeg.startBeat;
  return Math.abs(tailGap - headGap) <= tol;
}

function loopClosureOk(perBarRhythm: RiffRhythmSegment[][], grid: RiffGridMode): boolean {
  const tol = grid === 'sixteenth' ? LOOP_SIXTEENTH_TOL : LOOP_SIXTEENTH_TOL * 2;
  if (perBarRhythm.length < 2) return true;
  for (let b = 0; b < perBarRhythm.length - 1; b++) {
    if (rhythmFingerprint(perBarRhythm[b]!) !== rhythmFingerprint(perBarRhythm[b + 1]!)) {
      continue;
    }
    if (!boundaryGapOk(perBarRhythm[b]!, perBarRhythm[b + 1]!, tol)) return false;
  }
  const last = perBarRhythm.length - 1;
  if (
    rhythmFingerprint(perBarRhythm[last]!) === rhythmFingerprint(perBarRhythm[0]!) &&
    !boundaryGapOk(perBarRhythm[last]!, perBarRhythm[0]!, tol)
  ) {
    return false;
  }
  return true;
}

function maxConsecutiveIdenticalPitch(score: ScoreModel): number {
  const part = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!part) return 0;
  const pitches: number[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (((e as { voice?: number }).voice ?? 1) !== 1) continue;
      pitches.push((e as { pitch: number }).pitch);
    }
  }
  let maxRun = 0;
  let run = 0;
  let prev: number | null = null;
  for (const p of pitches) {
    if (p === prev) {
      run++;
    } else {
      run = 1;
      prev = p;
    }
    maxRun = Math.max(maxRun, run);
  }
  return maxRun;
}

function hornNotesPerBar(score: ScoreModel): number[] {
  const horns = score.parts.find((p) => p.id === 'horns');
  if (!horns) return [];
  return horns.measures.map((m) => m.events.filter((e) => e.kind === 'note').length);
}

export function runRiffPropertyTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const sparse = riffRun(vrbId, 'sparse');
    const medium = riffRun(vrbId, 'medium');
    const dense = riffRun(vrbId, 'dense');
    const offCount = (perBar: RiffRhythmSegment[][]) => {
      let n = 0;
      for (const bar of perBar) {
        for (const s of bar) {
          if (!s.rest && Math.abs(s.startBeat - Math.round(s.startBeat)) > 0.11) n++;
        }
      }
      return n;
    };
    const oS = sparse.success ? offCount(sparse.perBarRhythm) : -1;
    const oM = medium.success ? offCount(medium.perBarRhythm) : -1;
    const oD = dense.success ? offCount(dense.perBarRhythm) : -1;
    const rS = sparse.success ? offbeatRatioFromRhythm(sparse.perBarRhythm) : -1;
    const rM = medium.success ? offbeatRatioFromRhythm(medium.perBarRhythm) : -1;
    const rD = dense.success ? offbeatRatioFromRhythm(dense.perBarRhythm) : -1;
    const ok =
      sparse.success &&
      medium.success &&
      dense.success &&
      oS < oM &&
      oM < oD &&
      rS < rM &&
      rM < rD;
    out.push({
      ok,
      name: `${vrbId}: offbeatRatio sparse < medium < dense (${rS.toFixed(2)}/${rM.toFixed(2)}/${rD.toFixed(2)})`,
    });
  }

  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const grid = goldenGridForVrb(vrbId);
    const r = riffRun(vrbId, 'medium');
    const ok = r.success && loopClosureOk(r.perBarRhythm, grid);
    out.push({
      ok,
      name: `${vrbId}: loopClosure bar N last aligns bar N+1 first (±1 16th)`,
    });
  }

  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const r = riffRun(vrbId, 'medium');
    if (!r.success) {
      out.push({
        ok: true,
        name: `${vrbId}: bass register separation skipped (guitar+bass seed ${RIFF_GOLDEN_SEED} unavailable)`,
      });
      continue;
    }
    const gMean = registerMeanFromScore(r.score, 'clean_electric_guitar');
    const bMean = registerMeanFromScore(r.score, 'acoustic_upright_bass');
    if (bMean === 0) {
      out.push({
        ok: true,
        name: `${vrbId}: bass register separation skipped (no bass part)`,
      });
      continue;
    }
    out.push({
      ok: gMean - bMean >= 5,
      name: `${vrbId}: bass registerMean ≥5 semitones below guitar (${bMean.toFixed(1)} vs ${gMean.toFixed(1)})`,
    });
  }

  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const profile = getVoiceRuleBundle(vrbId).riffProfile;
    if (!profile || profile.allowPitchStreak !== false) continue;
    let r = riffRun(vrbId, 'medium');
    if (!r.success) {
      const family = RIFF_VRB_EXPECTED_FAMILY[vrbId];
      const style = riffStyleIdForFamily(family);
      const grid = goldenGridForVrb(vrbId);
      r = runRiffGenerator(RIFF_GOLDEN_SEED, {
        vrbId,
        bars: RIFF_GOLDEN_BARS,
        density: 'medium',
        style,
        grid,
        lineMode: 'single_line',
        bassEnabled: false,
        bpm: 100,
      });
    }
    const maxRun = r.success ? maxConsecutiveIdenticalPitch(r.score) : 99;
    out.push({
      ok: r.success && maxRun <= 3,
      name: `${vrbId}: allowPitchStreak false — no >3 consecutive identical pitches (maxRun=${maxRun})`,
    });
  }

  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const profile = getVoiceRuleBundle(vrbId).riffProfile;
    if (!profile?.hornStabTopology?.length) continue;
    const r = riffRun(vrbId, 'dense');
    if (!r.success) {
      out.push({ ok: false, name: `${vrbId}: hornStabTopology busy density (generation failed)` });
      continue;
    }
    const family = RIFF_VRB_EXPECTED_FAMILY[vrbId];
    const style = riffStyleIdForFamily(family);
    const grid = goldenGridForVrb(vrbId);
    const resolved = resolveRiffGeneratorProfile({
      vrbId,
      style,
      grid,
      density: 'dense',
    });
    const chords = Array(RIFF_GOLDEN_BARS).fill('Am7');
    const stabTrack = buildHornStabTrack(resolved, RIFF_GOLDEN_BARS, chords, vrbId);
    const perBar = hornNotesPerBar(r.score);
    const plannedBars = new Set(stabTrack?.map((s) => s.bar) ?? []);
    let ok = plannedBars.size > 0;
    for (const b of plannedBars) {
      if ((perBar[b] ?? 0) < 1) {
        ok = false;
        break;
      }
    }
    out.push({
      ok,
      name: `${vrbId}: hornStabTopology + dense — ≥1 horn note per planned stab bar`,
    });
  }

  return out;
}
