/**
 * assertExportTruth — consolidated export-truth entry tests.
 */

import { assertExportTruth, buildSpineSymbolsForExportTruth } from './assertExportTruth';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { runGoldenPathOnce } from '../goldenPath/runGoldenPath';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { pipelineTruthAllPassed } from '../score-integrity/pipelineTruthGates';

const LOCKED_16 = [
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
  'Am7',
  'D7',
  'Gmaj7',
  'Gmaj7',
] as const;

function testSpineMismatchThrowsHarmonySpineLock(): boolean {
  try {
    const locked = [...LOCKED_16];
    const r = runGoldenPathOnce(88001, {
      presetId: 'guitar_bass_duo',
      totalBars: 16,
      longFormEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join('|'),
      lockedHarmonyBarsRaw: locked,
    });
    if (!r.score || !r.context || !r.xml) return false;
    const scoreClone = JSON.parse(JSON.stringify(r.score)) as ScoreModel;
    const g = scoreClone.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (!g) return false;
    const m = g.measures.find((x) => x.index === 1) ?? g.measures[0];
    if (!m) return false;
    const spine1 = resolveBarSymbol(r.context, 1).symbol;
    m.chord = spine1.toLowerCase().startsWith('b') ? 'Cmaj7' : 'Bmaj7';
    const routing = {
      harmonyMode: 'custom_locked' as const,
      lockedHarmonyBarsRaw: locked,
      parsedChordBars: locked,
    };
    const effective =
      r.context.lockedHarmonyBarsRaw && r.context.lockedHarmonyBarsRaw.length === 16
        ? [...r.context.lockedHarmonyBarsRaw]
        : locked;
    try {
      assertExportTruth({
        scoreModel: scoreClone,
        exportedXml: r.xml,
        effectiveBars: effective,
        lockedBars: locked,
        spineSymbols: buildSpineSymbolsForExportTruth(r.context, 16),
        runMode: 'song',
        context: r.context,
        routingWire: routing,
        spineLayer: 'assertExportTruth.test:spine-mismatch',
      });
      return false;
    } catch (e) {
      return String(e).includes('HARMONY_SPINE_LOCK');
    }
  } catch {
    return false;
  }
}

function testXmlBarsMismatchThrowsCustomHarmonyTruthFailure(): boolean {
  try {
    const locked = [...LOCKED_16];
    const r = runGoldenPathOnce(88002, {
      presetId: 'guitar_bass_duo',
      totalBars: 16,
      longFormEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join('|'),
      lockedHarmonyBarsRaw: locked,
    });
    if (!r.score || !r.context || !r.xml) return false;
    const badXml = r.xml.replace(/<kind text="[^"]*"/, '<kind text="ZZZ"');
    const effective = [...locked];
    try {
      assertExportTruth({
        scoreModel: r.score,
        exportedXml: badXml,
        effectiveBars: effective,
        lockedBars: locked,
        spineSymbols: buildSpineSymbolsForExportTruth(r.context, 16),
        runMode: 'song',
        context: r.context,
        routingWire: {
          harmonyMode: 'custom_locked',
          lockedHarmonyBarsRaw: locked,
          parsedChordBars: locked,
        },
      });
      return false;
    } catch (e) {
      const msg = String(e);
      return msg.includes('CUSTOM HARMONY TRUTH FAILURE') || msg.includes('SONG MODE HARMONY LOCK');
    }
  } catch {
    return false;
  }
}

function testLockedRunBothChecksPass(): boolean {
  try {
    const locked = [...LOCKED_16];
    const r = runGoldenPathOnce(88003, {
      presetId: 'guitar_bass_duo',
      totalBars: 16,
      longFormEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join('|'),
      lockedHarmonyBarsRaw: locked,
    });
    if (!r.score || !r.context || !r.xml) return false;
    assertExportTruth({
      scoreModel: r.score,
      exportedXml: r.xml,
      effectiveBars: locked,
      lockedBars: locked,
      spineSymbols: buildSpineSymbolsForExportTruth(r.context, 16),
      runMode: 'song',
      context: r.context,
      routingWire: {
        harmonyMode: 'custom_locked',
        lockedHarmonyBarsRaw: locked,
        parsedChordBars: locked,
      },
    });
    return true;
  } catch {
    return false;
  }
}

function testDuoEightBarPipelineTruthPasses(): boolean {
  try {
    const progression = 'Bm9 | D13 | Gmaj9 | C#7alt | F#m9 | A13 | Dmaj9 | G#7alt';
    const r = runGoldenPathOnce(88004, {
      presetId: 'guitar_bass_duo',
      totalBars: 8,
      harmonyMode: 'custom',
      chordProgressionText: progression,
      parsedChordBars: progression.split('|').map((s) => s.trim()),
    });
    if (!r.score || !r.context || !r.xml) return false;
    const report = assertExportTruth({
      scoreModel: r.score,
      exportedXml: r.xml,
      effectiveBars: progression.split('|').map((s) => s.trim()),
      lockedBars: undefined,
      spineSymbols: buildSpineSymbolsForExportTruth(r.context, 8),
      runMode: 'duo',
      context: r.context,
      routingWire: {
        harmonyMode: 'custom',
        chordProgressionText: progression,
        parsedChordBars: progression.split('|').map((s) => s.trim()),
      },
      pipelineOptions: {
        harmonyMode: 'custom',
        chordProgressionText: progression,
        parsedChordBars: progression.split('|').map((s) => s.trim()),
      },
    });
    return !!report && pipelineTruthAllPassed(report);
  } catch {
    return false;
  }
}

function testMissingEffectiveBarsOnLockedRunThrows(): boolean {
  try {
    assertExportTruth({
      scoreModel: { parts: [], tempo: 120 } as ScoreModel,
      exportedXml: '<score-partwise></score-partwise>',
      effectiveBars: undefined,
      lockedBars: ['Cmaj7'],
      spineSymbols: ['Cmaj7'],
      runMode: 'song',
    });
    return false;
  } catch (e) {
    return String(e).includes('EXPORT TRUTH: locked run requires effectiveBars');
  }
}

function testRunModeSqSkipsDuoPipelineGates(): boolean {
  try {
    const locked = [...LOCKED_16];
    const r = runGoldenPathOnce(88006, {
      presetId: 'guitar_bass_duo',
      totalBars: 16,
      longFormEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join('|'),
      lockedHarmonyBarsRaw: locked,
    });
    if (!r.score || !r.context || !r.xml) return false;
    const report = assertExportTruth({
      scoreModel: r.score,
      exportedXml: r.xml,
      effectiveBars: locked,
      lockedBars: locked,
      spineSymbols: buildSpineSymbolsForExportTruth(r.context, 16),
      runMode: 'sq',
      context: r.context,
      routingWire: {
        harmonyMode: 'custom_locked',
        lockedHarmonyBarsRaw: locked,
        parsedChordBars: locked,
      },
    });
    return report === undefined;
  } catch {
    return false;
  }
}

export function runAssertExportTruthTests(): { name: string; ok: boolean }[] {
  return [
    { name: 'assertExportTruth: spine mismatch throws HARMONY_SPINE_LOCK', ok: testSpineMismatchThrowsHarmonySpineLock() },
    {
      name: 'assertExportTruth: XML bars mismatch throws CUSTOM HARMONY TRUTH FAILURE',
      ok: testXmlBarsMismatchThrowsCustomHarmonyTruthFailure(),
    },
    { name: 'assertExportTruth: locked run both checks pass', ok: testLockedRunBothChecksPass() },
    { name: 'assertExportTruth: duo 8-bar pipeline truth passes', ok: testDuoEightBarPipelineTruthPasses() },
    {
      name: 'assertExportTruth: missing effectiveBars on locked run throws immediately',
      ok: testMissingEffectiveBarsOnLockedRunThrows(),
    },
    { name: 'assertExportTruth: runMode=sq skips duo-only gates', ok: testRunModeSqSkipsDuoPipelineGates() },
  ];
}
