/**
 * Phase 1.5 — corpus load from derived/ (no GPX, no melody path).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  loadRiffPhraseCorpus,
  resolveRiffPhraseCorpusDerivedRoot,
} from '../core/riff-generator/riffPhraseCorpusLoad';

export function runRiffPhraseCorpusLoadTests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const corpus = loadRiffPhraseCorpus();
  rows.push({
    name: 'load ok from derived phrases.jsonl + audit.csv',
    ok: corpus.ok === true,
    detail: corpus.error,
  });
  rows.push({
    name: 'derived totals: 193 files parseOk, 345 phrases',
    ok:
      corpus.stats.totals.files === 193 &&
      corpus.stats.totals.parseOk === 193 &&
      corpus.stats.totals.phrases === 345,
    detail: JSON.stringify(corpus.stats.totals),
  });
  rows.push({
    name: 'audit phrasesOut sum matches phrases length',
    ok: corpus.stats.totals.auditPhrasesOutSum === corpus.stats.totals.phrases,
    detail: `${corpus.stats.totals.auditPhrasesOutSum} vs ${corpus.stats.totals.phrases}`,
  });
  const sax = corpus.stats.byCategory.sax_inspired;
  const dim = corpus.stats.byCategory.diminished_lines;
  const jazz = corpus.stats.byCategory.jazz_rock;
  const bebop = corpus.stats.byCategory.bebop_jazz_blues;
  const wrf = corpus.stats.byCategory.white_rock_funk;
  const bsf = corpus.stats.byCategory.black_soul_funk;
  const blues = corpus.stats.byCategory.blues_rock;
  const southern = corpus.stats.byCategory.southern_rock;
  const modern = corpus.stats.byCategory.modern_rock;
  const progressive = corpus.stats.byCategory.progressive_blues;
  const virtuoso = corpus.stats.byCategory.virtuoso_technique;
  rows.push({
    name: 'category file/phrase counts match ingested corpus',
    ok:
      !!sax &&
      sax.files === 17 &&
      sax.phrases === 18 &&
      !!dim &&
      dim.files === 11 &&
      dim.phrases === 69 &&
      !!jazz &&
      jazz.files === 10 &&
      jazz.phrases === 12 &&
      !!bebop &&
      bebop.files === 31 &&
      bebop.phrases === 33 &&
      !!wrf &&
      wrf.files === 8 &&
      wrf.phrases === 8 &&
      !!bsf &&
      bsf.files === 12 &&
      bsf.phrases === 54 &&
      !!blues &&
      blues.files === 18 &&
      blues.phrases === 30 &&
      !!southern &&
      southern.files === 13 &&
      southern.phrases === 27 &&
      !!modern &&
      modern.files === 26 &&
      modern.phrases === 33 &&
      !!progressive &&
      progressive.files === 26 &&
      progressive.phrases === 34 &&
      !!virtuoso &&
      virtuoso.files === 21 &&
      virtuoso.phrases === 27,
    detail: JSON.stringify({
      sax,
      dim,
      jazz,
      bebop,
      wrf,
      bsf,
      blues,
      southern,
      modern,
      progressive,
      virtuoso,
    }),
  });
  rows.push({
    name: 'no empty stub categories remain (all 11 populated)',
    ok: Object.values(corpus.stats.byCategory).every((c) => (c?.files ?? 0) > 0 && (c?.phrases ?? 0) > 0),
    detail: JSON.stringify(
      Object.fromEntries(
        Object.entries(corpus.stats.byCategory).map(([k, v]) => [k, { files: v?.files, phrases: v?.phrases }])
      )
    ),
  });
  rows.push({
    name: 'stats.byCategory includes all 11 categories including virtuoso_technique',
    ok:
      !!corpus.stats.byCategory.white_rock_funk &&
      !!corpus.stats.byCategory.black_soul_funk &&
      !!corpus.stats.byCategory.bebop_jazz_blues &&
      !!corpus.stats.byCategory.blues_rock &&
      !!corpus.stats.byCategory.southern_rock &&
      !!corpus.stats.byCategory.modern_rock &&
      !!corpus.stats.byCategory.progressive_blues &&
      !!corpus.stats.byCategory.virtuoso_technique &&
      corpus.stats.byCategory.virtuoso_technique.files === 21,
  });

  const melodyFiles = [
    'riffMelody.ts',
    'riffPitchField.ts',
    'buildRiffScoreModel.ts',
    'runRiffGenerator.ts',
  ].map((f) => path.join(__dirname, '../core/riff-generator', f));
  const loadSrc = fs.readFileSync(
    path.join(__dirname, '../core/riff-generator/riffPhraseCorpusLoad.ts'),
    'utf8'
  );
  rows.push({
    name: 'corpus load has no melody-path imports',
    ok: !/from ['"].*riffMelody|from ['"].*riffPitchField|from ['"].*buildRiffScoreModel|from ['"].*runRiffGenerator/.test(
      loadSrc
    ),
  });
  rows.push({
    name: 'melody-path files exist (unchanged presence check)',
    ok: melodyFiles.every((f) => fs.existsSync(f)),
  });

  const prevRepo = process.env.COMPOSER_OS_REPO_ROOT;
  try {
    const repo = path.resolve(__dirname, '../../..');
    process.env.COMPOSER_OS_REPO_ROOT = repo;
    const resolved = resolveRiffPhraseCorpusDerivedRoot();
    const expected = path.join(repo, 'data', 'riff-phrase-corpus', 'derived');
    rows.push({
      name: 'resolve finds derived via COMPOSER_OS_REPO_ROOT when set',
      ok: path.resolve(resolved) === path.resolve(expected),
      detail: `${resolved} vs ${expected}`,
    });
  } finally {
    if (prevRepo === undefined) delete process.env.COMPOSER_OS_REPO_ROOT;
    else process.env.COMPOSER_OS_REPO_ROOT = prevRepo;
  }

  const packaged = path.resolve(
    __dirname,
    '../../../apps/composer-os-desktop/resources/riff-phrase-corpus/derived'
  );
  if (fs.existsSync(path.join(packaged, 'phrases.jsonl'))) {
    const packed = loadRiffPhraseCorpus({ derivedRoot: packaged });
    rows.push({
      name: 'packaged resources derived override loads 193/345',
      ok: packed.ok && packed.stats.totals.files === 193 && packed.stats.totals.phrases === 345,
      detail: JSON.stringify(packed.stats.totals),
    });
  }

  return rows;
}

if (require.main === module) {
  const rows = runRiffPhraseCorpusLoadTests();
  for (const r of rows) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail ?? '');
  }
  if (rows.some((r) => !r.ok)) process.exit(1);
}
