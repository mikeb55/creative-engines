/**
 * Phrase motif-seed extend — jazz_rock→mahavishnu + diminished_lines→fripp.
 * Flags default OFF; flag-off byte parity; flag-on seeds phrase:* only for paired VRB.
 */

import * as crypto from 'crypto';
import { generateRiffCoreMotif } from '../core/motif/songModeMotifEngine';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_DIM_MOTIF_SEED_ENV,
  RIFF_DIM_MOTIF_SEED_VRB,
  RIFF_WHITEROCK_MOTIF_SEED_ENV,
  RIFF_WHITEROCK_MOTIF_SEED_VRB,
  RIFF_BLACKSOUL_MOTIF_SEED_ENV,
  RIFF_BLACKSOUL_MOTIF_SEED_VRB,
  RIFF_BEBOP_MOTIF_SEED_ENV,
  RIFF_BEBOP_MOTIF_SEED_VRB,
  RIFF_JAZZROCK_MOTIF_SEED_ENV,
  RIFF_JAZZROCK_MOTIF_SEED_VRB,
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  isRiffBebopMotifSeedEnabled,
  isRiffDimMotifSeedEnabled,
  isRiffJazzRockMotifSeedEnabled,
  pickBebopPhraseForSeed,
  pickDiminishedPhraseForSeed,
  pickJazzRockPhraseForSeed,
  resetRiffPhraseMotifSeedCacheForTests,
  resolveRiffCoreMotif,
} from '../core/riff-generator/riffPhraseMotifSeed';
import { phraseMotifSeedCheckboxLabel, vrbHasPhraseMotifSeedPairing } from '../ui/riffPhraseMotifSeedUi';
import type { RiffGeneratorParams } from '../core/riff-generator/riffTypes';

function sha(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function xmlOf(score: Parameters<typeof exportScoreModelToMusicXml>[0]): string {
  const exp = exportScoreModelToMusicXml(score);
  if (!exp.success || !exp.xml) throw new Error(exp.errors.join('; ') || 'MusicXML export failed');
  return exp.xml;
}

function baseParams(seed: number, vrbId: string): RiffGeneratorParams {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId,
    style,
    grid: 'sixteenth',
    density: 'dense',
  });
  return {
    seed,
    bars: 8,
    density: 'dense',
    style,
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId,
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'phrase-motif-extend',
    riffProfile: profile,
  };
}

function clearAllFlags(): void {
  delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
  delete process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV];
  delete process.env[RIFF_DIM_MOTIF_SEED_ENV];
  delete process.env[RIFF_WHITEROCK_MOTIF_SEED_ENV];
  delete process.env[RIFF_BLACKSOUL_MOTIF_SEED_ENV];
  delete process.env[RIFF_BEBOP_MOTIF_SEED_ENV];
  resetRiffPhraseMotifSeedCacheForTests();
}

function withEnv(env: string, value: string | undefined, fn: () => void): void {
  const prev = process.env[env];
  try {
    if (value === undefined) delete process.env[env];
    else process.env[env] = value;
    resetRiffPhraseMotifSeedCacheForTests();
    fn();
  } finally {
    if (prev === undefined) delete process.env[env];
    else process.env[env] = prev;
    resetRiffPhraseMotifSeedCacheForTests();
  }
}

export function runRiffPhraseMotifSeedExtendTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];
  clearAllFlags();

  out.push({
    ok: isRiffJazzRockMotifSeedEnabled() === false && isRiffDimMotifSeedEnabled() === false,
    name: 'jazzrock + dim flags default OFF when unset',
  });

  const seed = 424242;
  {
    clearAllFlags();
    const maha = resolveRiffCoreMotif(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB);
    const fripp = resolveRiffCoreMotif(seed, RIFF_DIM_MOTIF_SEED_VRB);
    const proc = generateRiffCoreMotif(seed);
    out.push({
      ok:
        maha.id === proc.id &&
        fripp.id === proc.id &&
        maha.intervalPattern.join(',') === proc.intervalPattern.join(','),
      name: 'flags OFF: mahavishnu + fripp === generateRiffCoreMotif',
      detail: maha.id,
    });

    const mahaA = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB)).score);
    const mahaB = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB)).score);
    const frippA = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_DIM_MOTIF_SEED_VRB)).score);
    const frippB = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_DIM_MOTIF_SEED_VRB)).score);
    out.push({
      ok: sha(mahaA) === sha(mahaB) && sha(frippA) === sha(frippB),
      name: 'flags OFF: mahavishnu + fripp self MusicXML parity',
      detail: sha(mahaA).slice(0, 12) + '/' + sha(frippA).slice(0, 12),
    });
  }

  withEnv(RIFF_JAZZROCK_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffJazzRockMotifSeedEnabled() === true,
      name: 'jazzrock flag ON when env=1',
    });
    const phrase = pickJazzRockPhraseForSeed(7);
    const motif = resolveRiffCoreMotif(7, RIFF_JAZZROCK_MOTIF_SEED_VRB);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id,
      name: 'jazzrock ON + mahavishnu: motif from jazz_rock phrase',
      detail: motif.id,
    });
    const wr = resolveRiffCoreMotif(7, 'weather_report');
    const fripp = resolveRiffCoreMotif(7, 'fripp');
    const proc = generateRiffCoreMotif(7);
    out.push({
      ok: wr.id === proc.id && fripp.id === proc.id,
      name: 'jazzrock ON: weather_report + fripp still procedural',
    });
  });

  withEnv(RIFF_DIM_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffDimMotifSeedEnabled() === true,
      name: 'dim flag ON when env=1',
    });
    const phrase = pickDiminishedPhraseForSeed(7);
    const motif = resolveRiffCoreMotif(7, RIFF_DIM_MOTIF_SEED_VRB);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id,
      name: 'dim ON + fripp: motif from diminished_lines phrase',
      detail: motif.id,
    });
    const wr = resolveRiffCoreMotif(7, 'weather_report');
    const maha = resolveRiffCoreMotif(7, 'mahavishnu');
    const proc = generateRiffCoreMotif(7);
    out.push({
      ok: wr.id === proc.id && maha.id === proc.id,
      name: 'dim ON: weather_report + mahavishnu still procedural',
    });
  });

  // Live corpus: ON differs from OFF for each pairing
  clearAllFlags();
  process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV] = '1';
  resetRiffPhraseMotifSeedCacheForTests();
  {
    const phrase = pickJazzRockPhraseForSeed(seed);
    const onMotif = resolveRiffCoreMotif(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB);
    delete process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV];
    resetRiffPhraseMotifSeedCacheForTests();
    const offXml = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB)).score);
    process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV] = '1';
    resetRiffPhraseMotifSeedCacheForTests();
    const onXml = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB)).score);
    out.push({
      ok:
        !!phrase &&
        phrase.intervalSequence.length >= 10 &&
        onMotif.id.startsWith('phrase:') &&
        sha(offXml) !== sha(onXml),
      name: 'jazzrock live: ON seeds phrase (≥10 iv) + XML differs',
      detail: phrase ? phrase.intervalSequence.length + ' ' + onMotif.id : 'no phrase',
    });
  }
  clearAllFlags();
  process.env[RIFF_DIM_MOTIF_SEED_ENV] = '1';
  resetRiffPhraseMotifSeedCacheForTests();
  {
    const phrase = pickDiminishedPhraseForSeed(seed);
    const onMotif = resolveRiffCoreMotif(seed, RIFF_DIM_MOTIF_SEED_VRB);
    delete process.env[RIFF_DIM_MOTIF_SEED_ENV];
    resetRiffPhraseMotifSeedCacheForTests();
    const offXml = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_DIM_MOTIF_SEED_VRB)).score);
    process.env[RIFF_DIM_MOTIF_SEED_ENV] = '1';
    resetRiffPhraseMotifSeedCacheForTests();
    const onXml = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_DIM_MOTIF_SEED_VRB)).score);
    out.push({
      ok:
        !!phrase &&
        phrase.intervalSequence.length >= 10 &&
        onMotif.id.startsWith('phrase:') &&
        sha(offXml) !== sha(onXml),
      name: 'dim live: ON seeds phrase (≥10 iv) + XML differs',
      detail: phrase ? phrase.intervalSequence.length + ' ' + onMotif.id : 'no phrase',
    });
  }

  // Cross-VRB regression: jazzrock flag must not change fripp / weather_report / nile
  clearAllFlags();
  {
    const vrbs = ['fripp', 'weather_report', 'nile_rodgers', 'iommi'] as const;
    let ok = true;
    const details: string[] = [];
    for (const vrbId of vrbs) {
      delete process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV];
      resetRiffPhraseMotifSeedCacheForTests();
      const off = sha(xmlOf(buildRiffScoreModel(baseParams(seed, vrbId)).score));
      process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV] = '1';
      resetRiffPhraseMotifSeedCacheForTests();
      const on = sha(xmlOf(buildRiffScoreModel(baseParams(seed, vrbId)).score));
      if (off !== on) {
        ok = false;
        details.push(vrbId);
      }
    }
    out.push({
      ok,
      name: 'jazzrock flag ON: non-mahavishnu VRBs byte-identical',
      detail: details.join(',') || 'ok',
    });
  }
  clearAllFlags();
  {
    const vrbs = ['mahavishnu', 'weather_report', 'nile_rodgers', 'iommi'] as const;
    let ok = true;
    const details: string[] = [];
    for (const vrbId of vrbs) {
      delete process.env[RIFF_DIM_MOTIF_SEED_ENV];
      resetRiffPhraseMotifSeedCacheForTests();
      const off = sha(xmlOf(buildRiffScoreModel(baseParams(seed, vrbId)).score));
      process.env[RIFF_DIM_MOTIF_SEED_ENV] = '1';
      resetRiffPhraseMotifSeedCacheForTests();
      const on = sha(xmlOf(buildRiffScoreModel(baseParams(seed, vrbId)).score));
      if (off !== on) {
        ok = false;
        details.push(vrbId);
      }
    }
    out.push({
      ok,
      name: 'dim flag ON: non-fripp VRBs byte-identical',
      detail: details.join(',') || 'ok',
    });
  }


  out.push({
    ok:
      vrbHasPhraseMotifSeedPairing('weather_report') &&
      vrbHasPhraseMotifSeedPairing('mahavishnu') &&
      vrbHasPhraseMotifSeedPairing('fripp') &&
      vrbHasPhraseMotifSeedPairing('iommi') &&
      vrbHasPhraseMotifSeedPairing('nile_rodgers') &&
      vrbHasPhraseMotifSeedPairing('bill_evans_sax') &&
      !vrbHasPhraseMotifSeedPairing('hendrix') &&
      !vrbHasPhraseMotifSeedPairing('james_brown') &&
      (phraseMotifSeedCheckboxLabel('weather_report') ?? '').includes('sax') &&
      (phraseMotifSeedCheckboxLabel('iommi') ?? '').includes('white rock funk') &&
      (phraseMotifSeedCheckboxLabel('nile_rodgers') ?? '').includes('black soul funk') &&
      (phraseMotifSeedCheckboxLabel('bill_evans_sax') ?? '').includes('bebop jazz blues') &&
      phraseMotifSeedCheckboxLabel('hendrix') === null,
    name: 'UI helpers: pairing visibility + lick labels for 6 VRBs only',
  });

  withEnv(RIFF_BEBOP_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffBebopMotifSeedEnabled() === true,
      name: 'bebop flag ON when env=1',
    });
    const phrase = pickBebopPhraseForSeed(2);
    const motif = resolveRiffCoreMotif(2, RIFF_BEBOP_MOTIF_SEED_VRB);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id,
      name: 'bebop ON + bill_evans_sax: motif from bebop_jazz_blues phrase',
      detail: motif.id,
    });
    const wr = resolveRiffCoreMotif(2, 'weather_report');
    const maha = resolveRiffCoreMotif(2, 'mahavishnu');
    const proc = generateRiffCoreMotif(2);
    out.push({
      ok: wr.id === proc.id && maha.id === proc.id,
      name: 'bebop ON: weather_report + mahavishnu still procedural',
    });
  });

  clearAllFlags();
  process.env[RIFF_BEBOP_MOTIF_SEED_ENV] = '1';
  resetRiffPhraseMotifSeedCacheForTests();
  {
    const phrase = pickBebopPhraseForSeed(2);
    const onMotif = resolveRiffCoreMotif(2, RIFF_BEBOP_MOTIF_SEED_VRB);
    delete process.env[RIFF_BEBOP_MOTIF_SEED_ENV];
    resetRiffPhraseMotifSeedCacheForTests();
    const offXml = xmlOf(buildRiffScoreModel(baseParams(2, RIFF_BEBOP_MOTIF_SEED_VRB)).score);
    process.env[RIFF_BEBOP_MOTIF_SEED_ENV] = '1';
    resetRiffPhraseMotifSeedCacheForTests();
    const onXml = xmlOf(buildRiffScoreModel(baseParams(2, RIFF_BEBOP_MOTIF_SEED_VRB)).score);
    out.push({
      ok:
        !!phrase &&
        phrase.intervalSequence.length >= 10 &&
        onMotif.id.startsWith('phrase:') &&
        sha(offXml) !== sha(onXml),
      name: 'bebop live: ON seeds phrase (≥10 iv) + XML differs',
      detail: phrase ? phrase.intervalSequence.length + ' ' + onMotif.id : 'no phrase',
    });
  }
  clearAllFlags();
  {
    const vrbs = ['mahavishnu', 'weather_report', 'nile_rodgers', 'iommi', 'fripp'] as const;
    let ok = true;
    const details: string[] = [];
    for (const vrbId of vrbs) {
      delete process.env[RIFF_BEBOP_MOTIF_SEED_ENV];
      resetRiffPhraseMotifSeedCacheForTests();
      const off = sha(xmlOf(buildRiffScoreModel(baseParams(2, vrbId)).score));
      process.env[RIFF_BEBOP_MOTIF_SEED_ENV] = '1';
      resetRiffPhraseMotifSeedCacheForTests();
      const on = sha(xmlOf(buildRiffScoreModel(baseParams(2, vrbId)).score));
      if (off !== on) {
        ok = false;
        details.push(vrbId);
      }
    }
    out.push({
      ok,
      name: 'bebop flag ON: non-bill_evans_sax VRBs byte-identical',
      detail: details.join(',') || 'ok',
    });
  }

  // Request-scoped opt-in without env
  {
    clearAllFlags();
    const seed = 424242;
    const off = resolveRiffCoreMotif(seed, 'weather_report');
    const on = resolveRiffCoreMotif(seed, 'weather_report', { phraseMotifSeed: true });
    out.push({
      ok: off.id === 'riff_core' && on.id.startsWith('phrase:'),
      name: 'request phraseMotifSeed opts in without env (weather_report)',
      detail: off.id + " -> " + on.id,
    });
  }
  clearAllFlags();
  return out;
}

if (require.main === module) {
  for (const r of runRiffPhraseMotifSeedExtendTests()) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail ?? '');
  }
}