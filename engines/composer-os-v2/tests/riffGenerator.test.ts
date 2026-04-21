/**
 * Riff Generator — internal composite gate, export sanity, honest app naming.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import { runRiffGeneratorApp } from '../app-api/riffGeneratorApp';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';
import { runRiffQualityRulesSuite } from './riffQualityRules.test';

function countMelodicNotes(score: ScoreModel): number {
  let n = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') n++;
      }
    }
  }
  return n;
}

function barsWithNotes(score: ScoreModel): number {
  let b = 0;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  for (const m of g.measures) {
    if (m.events.some((e) => e.kind === 'note')) b++;
  }
  return b;
}

export function runRiffGeneratorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'Smoke',
    });
    const notes = r.success ? countMelodicNotes(r.score) : 0;
    const barsOk = r.success ? barsWithNotes(r.score) : 0;
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      notes >= 4 &&
      barsOk >= 2 &&
      r.xml.includes('<score-partwise') &&
      r.xml.includes('Riff') &&
      r.score.title === 'Smoke' &&
      r.xml.includes('<work-title>Smoke</work-title>');
    out.push({
      ok,
      name: 'runRiffGenerator seed 0 passes internal riff composite gate and exports XML',
    });
  }

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'guitar_bass',
      bassEnabled: true,
      bpm: 100,
      title: 'Bass',
    });
    const notes = r.success ? countMelodicNotes(r.score) : 0;
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      notes >= 6 &&
      r.xml.includes('Upright Bass') &&
      r.xml.includes('midi-program') &&
      r.score.title === 'Bass' &&
      r.xml.includes('<work-title>Bass</work-title>');
    out.push({
      ok,
      name: 'runRiffGenerator guitar+bass mode exports with bass part',
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-riff-app-'));
    try {
      const baseStyle = {
        primary: 'barry_harris' as const,
        styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
      };
      const r = runRiffGeneratorApp(
        {
          presetId: 'riff_generator',
          styleStack: baseStyle,
          seed: 101,
          title: 'ManifestTrust',
          totalBars: 2,
          riffStyle: 'neutral',
          riffDensity: 'medium',
          riffGrid: 'eighth',
          riffLineMode: 'single_line',
          riffBass: false,
          bpm: 100,
        },
        tmp
      );
      let ok =
        r.success &&
        !!r.filename &&
        !r.filename.includes('GCE') &&
        r.filename.includes('seed101') &&
        r.filename.includes('neutral') &&
        r.filename.endsWith('-2b.musicxml');
      ok = ok && r.validation?.behaviourGatesPassed === false && r.validation?.readiness?.shareable === false;
      if (ok && r.filepath && fs.existsSync(r.filepath)) {
        const mp = manifestPathForMusicXml(r.filepath);
        const raw = fs.readFileSync(mp, 'utf-8');
        const mj = JSON.parse(raw) as {
          validation?: { behaviourGates?: boolean; shareable?: boolean };
          riffCompositeScore?: number;
          riffInternalGatePassed?: boolean;
          riffQualityRules?: { aggregatePass?: boolean; rules?: unknown[] };
          seed?: number;
          gceScore?: number;
        };
        ok =
          mj.validation?.behaviourGates === false &&
          mj.validation?.shareable === false &&
          typeof mj.riffCompositeScore === 'number' &&
          mj.riffCompositeScore !== undefined &&
          mj.riffInternalGatePassed === true &&
          mj.seed === 101 &&
          mj.gceScore === undefined &&
          typeof mj.riffQualityRules?.aggregatePass === 'boolean' &&
          (mj.riffQualityRules?.rules?.length ?? 0) >= 8;
      } else {
        ok = false;
      }
      out.push({ ok, name: 'runRiffGeneratorApp: filenames neutral; manifest honest (no duo GCE mimicry)' });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  return [...out, ...runRiffQualityRulesSuite()];
}
