/**
 * Smoke — Frank Zappa songwriter slice (golden path + receipts).
 */

import { lockedHarmonyChordSymbolsEquivalent } from '../core/harmony/chordProgressionParser';
import { computeHarmonyChecksum } from '../core/harmony/harmonyContext';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import type { ScoreEvent } from '../core/score-model/scoreModelTypes';
import { frankZappaIiViRollingTriplePresent } from '../core/song-mode/songModeBuilder';

function buildZappaClassicBarMeterMap32(): BarMeterMap {
  const map: BarMeterMap = {};
  for (let b = 1; b <= 32; b++) {
    map[b] = b % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 };
  }
  return map;
}

/** Voice 1 note + rest durations (monophonic bass line). */
function bassVoice1RhythmSum(events: ScoreEvent[]): number {
  let s = 0;
  for (const e of events) {
    if ((e.voice ?? 1) !== 1) continue;
    if (e.kind !== 'note' && e.kind !== 'rest') continue;
    s += e.duration;
  }
  return s;
}

export function runFrankZappaSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50200, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    /** Alias resolves to `frank_zappa` via `normalizeSongwriterStyleKey`. */
    primarySongwriterStyle: 'fz',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.frankZappaDiagnostics;
  const sliceReceipt = md?.frankZappaSliceReceipt ?? '';
  const eff = md?.frankZappaEffectiveHarmonyBars;
  const dev = md?.frankZappaDeviceReceipts ?? [];

  const fzDeviceReceiptOk = dev.some((x) => /^fz:d[1-5]:/.test(x));

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'frank_zappa' &&
      diag?.songwriterId === 'frank_zappa' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      fzDeviceReceiptOk &&
      sliceReceipt.includes('Frank Zappa (slice)') &&
      !frankZappaIiViRollingTriplePresent(eff),
    name: 'Frank Zappa slice: golden path + fz receipts + effective bars + no ii–V–I rolling triples',
  });

  const iiViOneCycle = ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
  const iiVi32 = [...iiViOneCycle, ...iiViOneCycle, ...iiViOneCycle, ...iiViOneCycle];
  const rLocked = runGoldenPathOnce(50221, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    chordProgressionText: iiVi32.join('|'),
    parsedChordBars: [...iiVi32],
    lockedHarmonyBarsRaw: [...iiVi32],
  });
  const hc = rLocked.context?.harmonyContext;
  const g = rLocked.score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  let parityOk = false;
  if (hc && hc.bars.length === 32 && g) {
    parityOk =
      hc.checksum === computeHarmonyChecksum(hc.bars) &&
      hc.source === 'frank_zappa_effective' &&
      hc.styleId === 'frank_zappa';
    for (let b = 1; b <= 32; b++) {
      const got = g.measures.find((m) => m.index === b)?.chord ?? '';
      const exp = hc.bars[b - 1] ?? '';
      if (!lockedHarmonyChordSymbolsEquivalent(got, exp)) parityOk = false;
    }
  }
  out.push({
    ok: parityOk,
    name: 'Frank Zappa HarmonyContext: immutable bars checksum + guitar parity (custom_locked ii–V–I 32)',
  });

  const bar5Bb7b9OverE32 = [
    ...Array.from({ length: 4 }, () => 'Cmaj7'),
    'Bb7b9/E',
    ...Array.from({ length: 27 }, () => 'Cmaj7'),
  ];
  const rBar5 = runGoldenPathOnce(50223, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    chordProgressionText: bar5Bb7b9OverE32.join('|'),
    parsedChordBars: [...bar5Bb7b9OverE32],
    lockedHarmonyBarsRaw: [...bar5Bb7b9OverE32],
  });
  const hcB = rBar5.context?.harmonyContext;
  const effB = rBar5.context?.generationMetadata?.frankZappaEffectiveHarmonyBars;
  const gB = rBar5.score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const eff5 = effB?.[4] ?? '';
  const score5 = gB?.measures.find((m) => m.index === 5)?.chord ?? '';
  const bar5CanonicalOk =
    !!hcB &&
    !!gB &&
    bar5Bb7b9OverE32[4] === 'Bb7b9/E' &&
    lockedHarmonyChordSymbolsEquivalent(eff5, 'Bb7b9/E') &&
    lockedHarmonyChordSymbolsEquivalent(score5, eff5) &&
    lockedHarmonyChordSymbolsEquivalent(hcB.bars[4] ?? '', eff5);
  out.push({
    ok: bar5CanonicalOk,
    name: 'Frank Zappa HarmonyContext: effective bar 5 Bb7b9/E ⇒ score bar 5 matches (validator parity)',
  });

  const iiViOneCycleZm = ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
  const iiVi32Zm = [...iiViOneCycleZm, ...iiViOneCycleZm, ...iiViOneCycleZm, ...iiViOneCycleZm];
  let zappaClassicOddMeterOk = false;
  try {
    const rZm = runGoldenPathOnce(77777, {
      presetId: 'guitar_bass_duo',
      totalBars: 32,
      longFormEnabled: true,
      songModeHookFirstIdentity: true,
      primarySongwriterStyle: 'frank_zappa',
      harmonyMode: 'custom_locked',
      chordProgressionText: iiVi32Zm.join('|'),
      parsedChordBars: [...iiVi32Zm],
      lockedHarmonyBarsRaw: [...iiVi32Zm],
      barMeterMap: buildZappaClassicBarMeterMap32(),
    });
    const bassZm = rZm.score?.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    let bassOdd78SpansOk = !!bassZm;
    if (bassZm) {
      for (let b = 1; b <= 31; b += 2) {
        const m = bassZm.measures.find((x) => x.index === b);
        if (!m) {
          bassOdd78SpansOk = false;
          break;
        }
        const sum = bassVoice1RhythmSum(m.events);
        if (Math.abs(sum - 3.5) > 0.02) {
          bassOdd78SpansOk = false;
          break;
        }
      }
    }
    zappaClassicOddMeterOk =
      rZm.success &&
      rZm.runManifest.pipelineTruthExportStage === 'pass' &&
      rZm.exportIntegrityPassed === true &&
      rZm.strictBarMathPassed === true &&
      bassOdd78SpansOk;
  } catch {
    zappaClassicOddMeterOk = false;
  }
  out.push({
    ok: zappaClassicOddMeterOk,
    name:
      'Frank Zappa + Zappa Classic (7/8 + 4/4 alternating): golden path + export truth + strict bar math + bass 7/8 span',
  });

  /** Builtin Zappa harmony + alternating 7/8 / 4/4 (no custom_locked); seed/meter per Phase 5 UI parity. */
  let zappaBuiltinOddMeterOk = false;
  try {
    const rBo = runGoldenPathOnce(77777, {
      presetId: 'guitar_bass_duo',
      totalBars: 32,
      longFormEnabled: true,
      songModeHookFirstIdentity: true,
      primarySongwriterStyle: 'frank_zappa',
      barMeterMap: buildZappaClassicBarMeterMap32(),
    });
    const map32 = buildZappaClassicBarMeterMap32();
    let xmlAutoOk = false;
    if (rBo.success && rBo.score) {
      const res = exportScoreModelToMusicXml(rBo.score, { barMeterMap: map32 });
      const xml = res.success && res.xml !== undefined ? res.xml : '';
      const pianoOk = xml.includes('<part-name>Acoustic Grand Piano</part-name>');
      const soloMatch = xml.match(/<part id="zappa_solo">[\s\S]*?<\/part>/);
      const soloBlock = soloMatch?.[0] ?? '';
      const soloNoOct7 = soloBlock.length > 0 && !/<octave>7<\/octave>/.test(soloBlock);
      xmlAutoOk = res.success && pianoOk && soloNoOct7;
    }
    zappaBuiltinOddMeterOk =
      rBo.success === true &&
      rBo.exportIntegrityPassed === true &&
      rBo.strictBarMathPassed === true &&
      (rBo.errors?.length ?? 0) === 0 &&
      xmlAutoOk;
  } catch {
    zappaBuiltinOddMeterOk = false;
  }
  out.push({
    ok: zappaBuiltinOddMeterOk,
    name:
      'Frank Zappa + Zappa Classic (7/8+4/4) builtin harmony: success + MusicXML Acoustic Grand Piano + zappa_solo no octave 7 (seed 77777)',
  });

  return out;
}
