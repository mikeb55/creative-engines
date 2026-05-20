/**
 * Riff structural supplement — objective rules only (`riffQualityRules.ts`).
 * Duo / phrase engines must not depend on this module (see isolation test below).
 */

import * as fs from 'fs';
import * as path from 'path';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import {
  compactRiffQualityForManifest,
  evaluateRiffQualityRules,
  RIFF_QUALITY_RULESET_VERSION,
} from '../core/riff-generator/riffQualityRules';
import { RIFF_MUSICALITY_GATE_VERSION } from '../core/riff-generator/riffMusicalityGate';
import { validateTihaiCadence } from '../core/rhythm/oddMeterEngine';
import { createMeasure, createNote, createRest, createScore } from '../core/score-model/scoreEventBuilder';
import type { PartModel } from '../core/score-model/scoreModelTypes';

export function runRiffQualityRulesSuite(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'RQ Healthy',
    });
    const ok =
      r.success &&
      r.riffQuality.rulesetVersion === RIFF_QUALITY_RULESET_VERSION &&
      r.riffQuality.rules.length === 8 &&
      r.riffQuality.aggregatePass &&
      compactRiffQualityForManifest(r.riffQuality).totalRules === 8 &&
      r.riffMusicality.rulesetVersion === RIFF_MUSICALITY_GATE_VERSION &&
      r.riffMusicality.details.anchorStrength != null &&
      Object.keys(r.riffMusicality.details).length >= 8;
    rows.push({
      ok,
      name: 'riffQualityRules: healthy deterministic riff passes aggregate supplement',
    });
  }

  {
    const r = runRiffGenerator(42, {
      bars: 2,
      density: 'medium',
      style: 'funk',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
    });
    const ok =
      r.success &&
      r.riffMusicality.score >= 0.45 &&
      r.riffMusicality.details.syncopationBalance != null;
    rows.push({
      ok,
      name: 'riffMusicalityGate: funk sixteenth riff yields v8 rule scores',
    });
  }

  {
    /** Thin synthetic score: bar 2 effectively empty melodic line (only companion rest semantics). */
    const m1 = createMeasure(1, 'Am7');
    m1.events = [createNote(60, 0, 2, 1)];
    const m2 = createMeasure(2, 'Am7');
    m2.events = [createRest(0, 4, 1)];
    const guitar: PartModel = {
      id: 'guitar',
      name: 'Clean Electric Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: [m1, m2],
    };
    const score = createScore('Thin', [guitar], { tempo: 100 });
    const perBar: import('../core/riff-generator/riffTypes').RiffRhythmSegment[][] = [
      [{ startBeat: 0, duration: 2, rest: false }],
      [{ startBeat: 0, duration: 4, rest: true }],
    ];
    const q = evaluateRiffQualityRules({
      score,
      perBarRhythm: perBar,
      density: 'medium',
      bars: 2,
      grid: 'eighth',
    });
    const ok = !q.aggregatePass && q.rules.some((r) => r.id === 'bar_occupancy' && !r.passed);
    rows.push({
      ok,
      name: 'riffQualityRules: thin synthetic fails structural rules (occupancy / density)',
    });
  }

  {
    const ok = validateTihaiCadence(10, 3);
    rows.push({ ok, name: 'riffMusicalityGate: tihai cadence 10/3 validates for meter10 preset' });
  }

  {
    let duoImportsRiffQuality = false;
    try {
      const src = fs.readFileSync(path.join(__dirname, '../core/goldenPath/runGoldenPath.ts'), 'utf-8');
      duoImportsRiffQuality = src.includes('riffQualityRules');
    } catch {
      duoImportsRiffQuality = true;
    }
    rows.push({
      ok: !duoImportsRiffQuality,
      name: 'isolation: golden-path entry does not import riffQualityRules',
    });
  }

  return rows;
}
