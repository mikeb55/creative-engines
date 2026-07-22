/**
 * Phase 2 POC - sax_inspired motif seed (weather_report), flag default OFF.
 */

import * as crypto from 'crypto';
import { generateRiffCoreMotif } from '../core/motif/songModeMotifEngine';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { loadSyntheticPhraseFixtures } from '../core/riff-generator/riffPhraseLibraryFixtures';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  RIFF_SAX_MOTIF_SEED_POC_VRB,
  isRiffSaxMotifSeedPocEnabled,
  resetRiffSaxMotifSeedPocCacheForTests,
  resolveRiffCoreMotif,
  setRiffSaxMotifSeedPocPoolForTests,
} from '../core/riff-generator/riffSaxMotifSeedPoc';
import type { RiffGeneratorParams } from '../core/riff-generator/riffTypes';

function sha(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function xmlOf(score: Parameters<typeof exportScoreModelToMusicXml>[0]): string {
  const exp = exportScoreModelToMusicXml(score);
  if (!exp.success || !exp.xml) {
    throw new Error(exp.errors.join('; ') || 'MusicXML export failed');
  }
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
    title: 'sax-motif-poc',
    riffProfile: profile,
  };
}

function withFlag(value: string | undefined, fn: () => void): void {
  const prev = process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
  try {
    if (value === undefined) delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
    else process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = value;
    resetRiffSaxMotifSeedPocCacheForTests();
    fn();
  } finally {
    if (prev === undefined) delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
    else process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = prev;
    resetRiffSaxMotifSeedPocCacheForTests();
  }
}

export function runRiffSaxMotifSeedPocTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];
  const synthSax = loadSyntheticPhraseFixtures().find((e) => e.category === 'sax_inspired');

  withFlag(undefined, () => {
    out.push({
      ok: isRiffSaxMotifSeedPocEnabled() === false,
      name: 'flag default OFF when env unset',
    });
    const seed = 424242;
    const a = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
    const b = generateRiffCoreMotif(seed);
    out.push({
      ok:
        a.id === b.id &&
        a.intervalPattern.join(',') === b.intervalPattern.join(',') &&
        a.contourPattern.join(',') === b.contourPattern.join(','),
      name: 'flag OFF: resolve === generateRiffCoreMotif (weather_report)',
      detail: a.id + ' vs ' + b.id,
    });

    const xmlA = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_SAX_MOTIF_SEED_POC_VRB)).score);
    const xmlB = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_SAX_MOTIF_SEED_POC_VRB)).score);
    out.push({
      ok: sha(xmlA) === sha(xmlB),
      name: 'flag OFF: two builds byte-identical MusicXML',
      detail: sha(xmlA).slice(0, 12),
    });
  });

  withFlag('1', () => {
    setRiffSaxMotifSeedPocPoolForTests(synthSax ? [synthSax] : null);
    out.push({
      ok: isRiffSaxMotifSeedPocEnabled() === true,
      name: 'flag ON when env=1',
    });
    const seed = 7;
    const motif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
    out.push({
      ok: !!synthSax && motif.id === 'phrase:' + synthSax.id,
      name: 'flag ON + weather_report: motif from sax_inspired phrase',
      detail: motif.id,
    });

    const other = resolveRiffCoreMotif(seed, 'mahavishnu');
    const procedural = generateRiffCoreMotif(seed);
    out.push({
      ok: other.id === procedural.id,
      name: 'flag ON + mahavishnu: still procedural (no other VRB)',
      detail: other.id,
    });

    resetRiffSaxMotifSeedPocCacheForTests();
    setRiffSaxMotifSeedPocPoolForTests(synthSax ? [synthSax] : null);
    const offMotif = (() => {
      delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
      resetRiffSaxMotifSeedPocCacheForTests();
      const m = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
      process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = '1';
      resetRiffSaxMotifSeedPocCacheForTests();
      setRiffSaxMotifSeedPocPoolForTests(synthSax ? [synthSax] : null);
      return m;
    })();
    out.push({
      ok: offMotif.id !== motif.id,
      name: 'flag ON vs OFF: motif ids differ for same seed',
      detail: offMotif.id + ' vs ' + motif.id,
    });

    const xmlOff = (() => {
      delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
      resetRiffSaxMotifSeedPocCacheForTests();
      const x = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_SAX_MOTIF_SEED_POC_VRB)).score);
      process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = '1';
      resetRiffSaxMotifSeedPocCacheForTests();
      setRiffSaxMotifSeedPocPoolForTests(synthSax ? [synthSax] : null);
      return x;
    })();
    const xmlOn = xmlOf(buildRiffScoreModel(baseParams(seed, RIFF_SAX_MOTIF_SEED_POC_VRB)).score);
    out.push({
      ok: sha(xmlOff) !== sha(xmlOn),
      name: 'flag ON vs OFF: MusicXML differs (audible path)',
      detail: sha(xmlOff).slice(0, 8) + ' vs ' + sha(xmlOn).slice(0, 8),
    });

    const mahaOff = (() => {
      delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
      resetRiffSaxMotifSeedPocCacheForTests();
      return sha(xmlOf(buildRiffScoreModel(baseParams(seed, 'mahavishnu')).score));
    })();
    process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = '1';
    resetRiffSaxMotifSeedPocCacheForTests();
    const mahaOn = sha(xmlOf(buildRiffScoreModel(baseParams(seed, 'mahavishnu')).score));
    out.push({
      ok: mahaOff === mahaOn,
      name: 'flag ON: mahavishnu MusicXML unchanged vs flag OFF',
      detail: mahaOff.slice(0, 12),
    });
  });

  setRiffSaxMotifSeedPocPoolForTests(null);
  resetRiffSaxMotifSeedPocCacheForTests();
  return out;
}

if (require.main === module) {
  const rows = runRiffSaxMotifSeedPocTests();
  for (const r of rows) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail ?? '');
  }
  if (rows.some((r) => !r.ok)) process.exit(1);
}
