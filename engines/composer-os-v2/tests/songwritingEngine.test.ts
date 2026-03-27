/**
 * Songwriting Engine — Phase 1 contract + Phase 2 Swingometer (rhythm-only pass).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateSong } from '../core/songwriting-engine/generateSong';
import { buildSongScoreModel } from '../core/songwriting-engine/songEngineMusic';
import { applySwingPass } from '../core/songwriting-engine/swingPass';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateScoreModel } from '../core/score-model/scoreModelValidation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

function cloneScore(score: ScoreModel): ScoreModel {
  return JSON.parse(JSON.stringify(score)) as ScoreModel;
}

/** Rhythm-only fingerprint (start/duration/kind; pitch listed for notes to ensure unchanged when compared separately). */
function rhythmFingerprint(score: ScoreModel): string {
  return JSON.stringify(
    score.parts.map((p) =>
      p.measures.map((m) =>
        m.events.map((e) =>
          e.kind === 'note'
            ? { k: 'n', sb: e.startBeat, d: e.duration, p: e.pitch }
            : { k: 'r', sb: e.startBeat, d: e.duration }
        )
      )
    )
  );
}

export function runSongwritingEngineTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const prevOut = process.env.COMPOSER_OS_OUTPUT_DIR;
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-song-'));
  process.env.COMPOSER_OS_OUTPUT_DIR = tmpRoot;

  try {
    const eightBars = 'C | Am | Dm | G | C | Am | Dm | G';
    const r = generateSong({
      bars: 8,
      chordProgression: eightBars,
      seed: 424242,
      tempo: 96,
      swingLevel: 2,
      dryRun: false,
    });
    const songsDir = path.join(tmpRoot, 'Songs');
    const fileOk =
      r.success === true &&
      r.bars === 8 &&
      r.chordBars.length === 8 &&
      r.seed === 424242 &&
      typeof r.filePath === 'string' &&
      r.filePath.length > 0 &&
      fs.existsSync(r.filePath) &&
      path.dirname(r.filePath) === songsDir;
    const xml = fs.readFileSync(r.filePath, 'utf-8');
    const sibeliusOk =
      xml.includes('<?xml') &&
      xml.includes('<score-partwise') &&
      xml.includes('<part id="melody"') &&
      xml.includes('</score-partwise>');
    out.push({
      ok: fileOk && sibeliusOk,
      name: 'generateSong 8 bars + swing 2 writes valid MusicXML under library Songs/',
    });

    const bad = generateSong({
      bars: 8,
      chordProgression: 'C | Am | Dm | G',
      seed: 1,
    });
    const mismatchOk =
      bad.success === false &&
      (bad.errors?.some((e) => e.includes('8') && e.includes('4')) ?? false);
    out.push({
      ok: mismatchOk,
      name: 'generateSong fails fast when bar count does not match chord count',
    });

    const s1 = buildSongScoreModel(
      ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
      999001,
      100
    );
    const x1 = exportScoreModelToMusicXml(s1);
    const s2 = buildSongScoreModel(
      ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
      999001,
      100
    );
    const x2 = exportScoreModelToMusicXml(s2);
    const detOk =
      x1.success &&
      x2.success &&
      x1.xml === x2.xml &&
      (x1.xml?.length ?? 0) > 200;
    out.push({
      ok: detOk,
      name: 'same seed → identical MusicXML from buildSongScoreModel + export (no swing pass)',
    });

    const base = buildSongScoreModel(
      ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
      777888,
      100
    );
    const baseRhythm = rhythmFingerprint(base);
    const basePitches = JSON.stringify(
      base.parts.map((p) => p.measures.map((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.pitch)))
    );
    const after0 = cloneScore(base);
    applySwingPass(after0, 0);
    const swing0Ok =
      rhythmFingerprint(after0) === baseRhythm &&
      JSON.stringify(
        after0.parts.map((p) =>
          p.measures.map((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.pitch))
        )
      ) === basePitches;
    out.push({
      ok: swing0Ok,
      name: 'swing level 0 leaves rhythm (and pitch) unchanged',
    });

    const a = buildSongScoreModel(
      ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
      333444,
      100
    );
    applySwingPass(a, 2);
    const b = buildSongScoreModel(
      ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
      333444,
      100
    );
    applySwingPass(b, 2);
    const xa = exportScoreModelToMusicXml(a);
    const xb = exportScoreModelToMusicXml(b);
    const swingDetOk =
      xa.success &&
      xb.success &&
      xa.xml === xb.xml &&
      validateScoreModel(a, { requireAtLeastOneNote: true }).valid &&
      validateScoreModel(b, { requireAtLeastOneNote: true }).valid;
    out.push({
      ok: swingDetOk,
      name: 'same seed + same swing level → identical MusicXML',
    });

    const heavy = buildSongScoreModel(
      ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'],
      111222,
      100
    );
    applySwingPass(heavy, 5);
    const vHeavy = validateScoreModel(heavy, { requireAtLeastOneNote: true, maxEventsPerMeasure: 256 });
    const xHeavy = exportScoreModelToMusicXml(heavy);
    const heavyOk =
      vHeavy.valid &&
      xHeavy.success &&
      (xHeavy.xml?.includes('<score-partwise') ?? false);
    out.push({
      ok: heavyOk,
      name: 'swing level 5 keeps bar math and exports without crash',
    });
  } finally {
    if (prevOut === undefined) {
      delete process.env.COMPOSER_OS_OUTPUT_DIR;
    } else {
      process.env.COMPOSER_OS_OUTPUT_DIR = prevOut;
    }
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  return out;
}
