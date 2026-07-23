/**
 * Phrase motif-seed extend — many-to-many STYLE_PAIRINGS registry.
 * Flags default OFF; flag-off byte parity; shared-category independence.
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
  RIFF_BLACKSOUL_MOTIF_SEED_ENV,
  RIFF_BEBOP_MOTIF_SEED_ENV,
  RIFF_BEBOP_MOTIF_SEED_VRB,
  RIFF_BLUESROCK_MOTIF_SEED_ENV,
  RIFF_BLUESROCK_MOTIF_SEED_VRB,
  RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV,
  RIFF_BLUESROCK_ZEP_MOTIF_SEED_VRB,
  RIFF_JAZZROCK_MOTIF_SEED_ENV,
  RIFF_JAZZROCK_MOTIF_SEED_VRB,
  RIFF_PROGBLUES_MOTIF_SEED_ENV,
  RIFF_PROGBLUES_MOTIF_SEED_VRB,
  RIFF_MODERNROCK_MOTIF_SEED_ENV,
  RIFF_MODERNROCK_MOTIF_SEED_VRB,
  RIFF_VIRTUOSO_MOTIF_SEED_ENV,
  RIFF_VIRTUOSO_MOTIF_SEED_VRB,
  RIFF_SOUTHERNROCK_MOTIF_SEED_ENV,
  RIFF_SOUTHERNROCK_MOTIF_SEED_VRB,
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  STYLE_PAIRINGS,
  getPairing,
  getPairingsForCategory,
  getPairingsForProfile,
  isRiffBluesRockMotifSeedEnabled,
  isRiffBluesRockZepMotifSeedEnabled,
  isRiffDimMotifSeedEnabled,
  isRiffJazzRockMotifSeedEnabled,
  isRiffSouthernRockMotifSeedEnabled,
  makePairingId,
  pickBluesRockPhraseForSeed,
  pickDiminishedPhraseForSeed,
  pickJazzRockPhraseForSeed,
  pickSouthernRockPhraseForSeed,
  resetRiffPhraseMotifSeedCacheForTests,
  resolveRiffCoreMotif,
  resolvePairingForProfile,
} from '../core/riff-generator/riffPhraseMotifSeed';
import {
  phraseMotifSeedCheckboxLabel,
  profileHasPhraseMotifSeedPairing,
  getUiPairingsForCategory,
} from '../ui/riffPhraseMotifSeedUi';
import type { RiffGeneratorParams } from '../core/riff-generator/riffTypes';
import type { PairingFlags } from '../core/riff-generator/riffStylePairings';

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

const ALL_LEGACY_ENVS = [
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  RIFF_JAZZROCK_MOTIF_SEED_ENV,
  RIFF_DIM_MOTIF_SEED_ENV,
  RIFF_WHITEROCK_MOTIF_SEED_ENV,
  RIFF_BLACKSOUL_MOTIF_SEED_ENV,
  RIFF_BEBOP_MOTIF_SEED_ENV,
  RIFF_BLUESROCK_MOTIF_SEED_ENV,
  RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV,
  RIFF_PROGBLUES_MOTIF_SEED_ENV,
  RIFF_MODERNROCK_MOTIF_SEED_ENV,
  RIFF_VIRTUOSO_MOTIF_SEED_ENV,
  RIFF_SOUTHERNROCK_MOTIF_SEED_ENV,
] as const;

function clearAllFlags(): void {
  for (const e of ALL_LEGACY_ENVS) delete process.env[e];
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

  // --- Registry ---
  out.push({
    ok: STYLE_PAIRINGS.length === 12,
    name: 'STYLE_PAIRINGS has 12 edges',
    detail: String(STYLE_PAIRINGS.length),
  });
  out.push({
    ok: getPairingsForCategory('blues_rock').length === 2,
    name: 'blues_rock has 2 profile edges (hendrix + led_zeppelin)',
    detail: getPairingsForCategory('blues_rock')
      .map((p) => p.profileId)
      .join(','),
  });
  out.push({
    ok:
      getPairingsForCategory('southern_rock').length === 1 &&
      getPairingsForCategory('modern_rock').length === 1 &&
      getPairingsForCategory('virtuoso_technique').length === 1 &&
      !!getPairing('southern_rock', 'jimmy_herring') &&
      !!getPairing('modern_rock', 'morello') &&
      !!getPairing('virtuoso_technique', 'eddie_van_halen'),
    name: 'southern→jimmy_herring; modern_rock→morello; virtuoso→eddie_van_halen',
  });
  out.push({
    ok:
      !!getPairing('blues_rock', 'hendrix') &&
      !!getPairing('blues_rock', 'led_zeppelin') &&
      getPairing('southern_rock', 'led_zeppelin') == null,
    name: 'getPairing exact-edge API',
  });
  out.push({
    ok: makePairingId('blues_rock', 'hendrix') === 'blues_rock::hendrix',
    name: 'makePairingId composite form',
  });

  // --- Shared-category regression (order-independent) ---
  {
    clearAllFlags();
    const flagsBoth: PairingFlags = {
      'blues_rock::hendrix': true,
      'blues_rock::led_zeppelin': true,
    };
    const flagsZepFirst: PairingFlags = {
      'blues_rock::led_zeppelin': true,
      'blues_rock::hendrix': true,
    };
    const hxA = resolvePairingForProfile('hendrix', { pairingFlags: flagsBoth });
    const hxB = resolvePairingForProfile('hendrix', { pairingFlags: flagsZepFirst });
    const zepA = resolvePairingForProfile('led_zeppelin', { pairingFlags: flagsBoth });
    const zepB = resolvePairingForProfile('led_zeppelin', { pairingFlags: flagsZepFirst });
    out.push({
      ok:
        hxA?.id === 'blues_rock::hendrix' &&
        hxB?.id === 'blues_rock::hendrix' &&
        zepA?.id === 'blues_rock::led_zeppelin' &&
        zepB?.id === 'blues_rock::led_zeppelin',
      name: 'shared-category: hendrix/zep resolve own edges independent of flag order',
      detail: [hxA?.id, zepA?.id].join(' / '),
    });

    const seed = 2;
    const hxMotif = resolveRiffCoreMotif(seed, 'hendrix', { pairingFlags: flagsBoth });
    const zepMotif = resolveRiffCoreMotif(seed, 'led_zeppelin', { pairingFlags: flagsBoth });
    const phrase = pickBluesRockPhraseForSeed(seed);
    out.push({
      ok:
        !!phrase &&
        hxMotif.id === 'phrase:' + phrase.id &&
        zepMotif.id === 'phrase:' + phrase.id,
      name: 'shared-category: both profiles seed blues_rock phrases when both edges ON',
      detail: hxMotif.id,
    });

    // Only hendrix edge ON → zep procedural
    const flagsHxOnly: PairingFlags = { 'blues_rock::hendrix': true, 'blues_rock::led_zeppelin': false };
    const hxOn = resolveRiffCoreMotif(seed, 'hendrix', { pairingFlags: flagsHxOnly });
    const zepOff = resolveRiffCoreMotif(seed, 'led_zeppelin', { pairingFlags: flagsHxOnly });
    const proc = generateRiffCoreMotif(seed);
    out.push({
      ok: hxOn.id.startsWith('phrase:') && zepOff.id === proc.id,
      name: 'shared-category: hendrix-only flag leaves zep procedural',
    });

    // Only zep edge ON → hendrix procedural
    const flagsZepOnly: PairingFlags = { 'blues_rock::hendrix': false, 'blues_rock::led_zeppelin': true };
    const hxOff = resolveRiffCoreMotif(seed, 'hendrix', { pairingFlags: flagsZepOnly });
    const zepOn = resolveRiffCoreMotif(seed, 'led_zeppelin', { pairingFlags: flagsZepOnly });
    out.push({
      ok: zepOn.id.startsWith('phrase:') && hxOff.id === proc.id,
      name: 'shared-category: zep-only flag leaves hendrix procedural',
    });
  }

  // --- Default OFF + jazzrock/dim parity samples ---
  out.push({
    ok: isRiffJazzRockMotifSeedEnabled() === false && isRiffDimMotifSeedEnabled() === false,
    name: 'jazzrock + dim flags default OFF when unset',
  });

  const seed = 424242;
  {
    clearAllFlags();
    const maha = resolveRiffCoreMotif(seed, RIFF_JAZZROCK_MOTIF_SEED_VRB);
    const fripp = resolveRiffCoreMotif(seed, RIFF_DIM_MOTIF_SEED_VRB);
    const hx = resolveRiffCoreMotif(seed, 'hendrix');
    const zep = resolveRiffCoreMotif(seed, 'led_zeppelin');
    const proc = generateRiffCoreMotif(seed);
    out.push({
      ok:
        maha.id === proc.id &&
        fripp.id === proc.id &&
        hx.id === proc.id &&
        zep.id === proc.id,
      name: 'flags OFF: paired profiles === generateRiffCoreMotif',
    });
  }

  withEnv(RIFF_JAZZROCK_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffJazzRockMotifSeedEnabled() === true,
      name: 'jazzrock legacy env ON',
    });
    const phrase = pickJazzRockPhraseForSeed(7);
    const motif = resolveRiffCoreMotif(7, RIFF_JAZZROCK_MOTIF_SEED_VRB);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id,
      name: 'jazzrock ON + mahavishnu: motif from jazz_rock phrase',
      detail: motif.id,
    });
  });

  withEnv(RIFF_DIM_MOTIF_SEED_ENV, '1', () => {
    const phrase = pickDiminishedPhraseForSeed(7);
    const motif = resolveRiffCoreMotif(7, RIFF_DIM_MOTIF_SEED_VRB);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id,
      name: 'dim ON + fripp: motif from diminished_lines phrase',
      detail: motif.id,
    });
  });

  // Live jazzrock ON differs
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
    });
  }

  // Cross-VRB: jazzrock must not change fripp/weather/nile/iommi/hendrix/zep
  clearAllFlags();
  {
    const vrbs = ['fripp', 'weather_report', 'nile_rodgers', 'iommi', 'hendrix', 'led_zeppelin'] as const;
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
      name: 'jazzrock flag ON: non-mahavishnu profiles byte-identical',
      detail: details.join(',') || 'ok',
    });
  }

  // UI: 12 edges, blues_rock shared, morello + EVH + herring paired
  out.push({
    ok:
      profileHasPhraseMotifSeedPairing('weather_report') &&
      profileHasPhraseMotifSeedPairing('hendrix') &&
      profileHasPhraseMotifSeedPairing('led_zeppelin') &&
      profileHasPhraseMotifSeedPairing('david_gilmour') &&
      profileHasPhraseMotifSeedPairing('morello') &&
      profileHasPhraseMotifSeedPairing('eddie_van_halen') &&
      profileHasPhraseMotifSeedPairing('jimmy_herring') &&
      !profileHasPhraseMotifSeedPairing('james_brown') &&
      getUiPairingsForCategory('blues_rock').length === 2 &&
      getUiPairingsForCategory('southern_rock').length === 1 &&
      (phraseMotifSeedCheckboxLabel('hendrix') ?? '').includes('blues-rock') &&
      (phraseMotifSeedCheckboxLabel('led_zeppelin') ?? '').includes('blues-rock') &&
      (phraseMotifSeedCheckboxLabel('morello') ?? '').includes('modern rock') &&
      (phraseMotifSeedCheckboxLabel('eddie_van_halen') ?? '').includes('virtuoso') &&
      (phraseMotifSeedCheckboxLabel('jimmy_herring') ?? '').includes('southern rock'),
    name: 'UI helpers: 12 edges; blues_rock shared; morello + EVH + herring paired',
  });

  // Blues hendrix legacy env
  clearAllFlags();
  withEnv(RIFF_BLUESROCK_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffBluesRockMotifSeedEnabled() === true,
      name: 'bluesrock hendrix legacy env ON',
    });
    const phrase = pickBluesRockPhraseForSeed(2);
    const motif = resolveRiffCoreMotif(2, RIFF_BLUESROCK_MOTIF_SEED_VRB);
    const zep = resolveRiffCoreMotif(2, 'led_zeppelin');
    const proc = generateRiffCoreMotif(2);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id && zep.id === proc.id,
      name: 'bluesrock hendrix ON: seeds phrase; zep still procedural',
      detail: motif.id,
    });
  });

  // Blues zep derived env
  clearAllFlags();
  withEnv(RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffBluesRockZepMotifSeedEnabled() === true,
      name: 'bluesrock zep derived env ON',
    });
    const phrase = pickBluesRockPhraseForSeed(2);
    const motif = resolveRiffCoreMotif(2, RIFF_BLUESROCK_ZEP_MOTIF_SEED_VRB);
    const hx = resolveRiffCoreMotif(2, 'hendrix');
    const proc = generateRiffCoreMotif(2);
    out.push({
      ok: !!phrase && motif.id === 'phrase:' + phrase.id && hx.id === proc.id,
      name: 'bluesrock zep ON: seeds phrase; hendrix still procedural',
      detail: motif.id,
    });
  });

  // Both blues envs ON — env coexistence
  clearAllFlags();
  process.env[RIFF_BLUESROCK_MOTIF_SEED_ENV] = '1';
  process.env[RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV] = '1';
  resetRiffPhraseMotifSeedCacheForTests();
  {
    const phrase = pickBluesRockPhraseForSeed(2);
    const hx = resolveRiffCoreMotif(2, 'hendrix');
    const zep = resolveRiffCoreMotif(2, 'led_zeppelin');
    out.push({
      ok:
        !!phrase &&
        hx.id === 'phrase:' + phrase.id &&
        zep.id === 'phrase:' + phrase.id,
      name: 'both blues edges env ON: hendrix + zep each seed blues_rock',
    });
  }

  // Live zep ON differs
  clearAllFlags();
  process.env[RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV] = '1';
  resetRiffPhraseMotifSeedCacheForTests();
  {
    const phrase = pickBluesRockPhraseForSeed(2);
    const onMotif = resolveRiffCoreMotif(2, RIFF_BLUESROCK_ZEP_MOTIF_SEED_VRB);
    delete process.env[RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV];
    resetRiffPhraseMotifSeedCacheForTests();
    const offXml = xmlOf(buildRiffScoreModel(baseParams(2, RIFF_BLUESROCK_ZEP_MOTIF_SEED_VRB)).score);
    process.env[RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV] = '1';
    resetRiffPhraseMotifSeedCacheForTests();
    const onXml = xmlOf(buildRiffScoreModel(baseParams(2, RIFF_BLUESROCK_ZEP_MOTIF_SEED_VRB)).score);
    out.push({
      ok:
        !!phrase &&
        phrase.intervalSequence.length >= 10 &&
        onMotif.id.startsWith('phrase:') &&
        sha(offXml) !== sha(onXml),
      name: 'bluesrock zep live: ON seeds phrase (≥10 iv) + XML differs',
    });
  }
  clearAllFlags();
  {
    const vrbs = ['mahavishnu', 'weather_report', 'nile_rodgers', 'iommi', 'fripp', 'bill_evans_sax', 'hendrix'] as const;
    let ok = true;
    const details: string[] = [];
    for (const vrbId of vrbs) {
      delete process.env[RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV];
      resetRiffPhraseMotifSeedCacheForTests();
      const off = sha(xmlOf(buildRiffScoreModel(baseParams(2, vrbId)).score));
      process.env[RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV] = '1';
      resetRiffPhraseMotifSeedCacheForTests();
      const on = sha(xmlOf(buildRiffScoreModel(baseParams(2, vrbId)).score));
      if (off !== on) {
        ok = false;
        details.push(vrbId);
      }
    }
    out.push({
      ok,
      name: 'bluesrock zep flag ON: non-led_zeppelin profiles byte-identical',
      detail: details.join(',') || 'ok',
    });
  }

  // Bebop + progblues smoke
  clearAllFlags();
  withEnv(RIFF_BEBOP_MOTIF_SEED_ENV, '1', () => {
    const motif = resolveRiffCoreMotif(2, RIFF_BEBOP_MOTIF_SEED_VRB);
    out.push({
      ok: motif.id.startsWith('phrase:'),
      name: 'bebop ON + bill_evans_sax seeds phrase',
      detail: motif.id,
    });
  });
  clearAllFlags();
  withEnv(RIFF_PROGBLUES_MOTIF_SEED_ENV, '1', () => {
    const motif = resolveRiffCoreMotif(1, RIFF_PROGBLUES_MOTIF_SEED_VRB);
    out.push({
      ok: motif.id.startsWith('phrase:'),
      name: 'progblues ON + david_gilmour seeds phrase',
      detail: motif.id,
    });
  });
  clearAllFlags();
  withEnv(RIFF_MODERNROCK_MOTIF_SEED_ENV, '1', () => {
    const motif = resolveRiffCoreMotif(1, RIFF_MODERNROCK_MOTIF_SEED_VRB);
    out.push({
      ok: motif.id.startsWith('phrase:'),
      name: 'modernrock ON + morello seeds phrase',
      detail: motif.id,
    });
  });
  clearAllFlags();
  withEnv(RIFF_VIRTUOSO_MOTIF_SEED_ENV, '1', () => {
    const motif = resolveRiffCoreMotif(1, RIFF_VIRTUOSO_MOTIF_SEED_VRB);
    out.push({
      ok: motif.id.startsWith('phrase:'),
      name: 'virtuoso ON + eddie_van_halen seeds phrase',
      detail: motif.id,
    });
  });
  clearAllFlags();
  withEnv(RIFF_SOUTHERNROCK_MOTIF_SEED_ENV, '1', () => {
    out.push({
      ok: isRiffSouthernRockMotifSeedEnabled() === true,
      name: 'southernrock legacy env ON',
    });
    const phrase = pickSouthernRockPhraseForSeed(1);
    const motif = resolveRiffCoreMotif(1, RIFF_SOUTHERNROCK_MOTIF_SEED_VRB);
    out.push({
      ok: !!phrase && motif.id.startsWith('phrase:'),
      name: 'southernrock ON + jimmy_herring seeds phrase',
      detail: motif.id,
    });
  });

  // Request-scoped opt-in without env
  {
    clearAllFlags();
    const off = resolveRiffCoreMotif(seed, 'weather_report');
    const on = resolveRiffCoreMotif(seed, 'weather_report', { phraseMotifSeed: true });
    out.push({
      ok: off.id === 'riff_core' && on.id.startsWith('phrase:'),
      name: 'request phraseMotifSeed opts in without env (weather_report)',
      detail: off.id + ' -> ' + on.id,
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