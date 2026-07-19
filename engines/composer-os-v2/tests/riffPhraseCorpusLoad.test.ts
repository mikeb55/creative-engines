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
    name: 'subset totals: 38 files parseOk, 99 phrases',
    ok:
      corpus.stats.totals.files === 38 &&
      corpus.stats.totals.parseOk === 38 &&
      corpus.stats.totals.phrases === 99,
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
  rows.push({
    name: 'category file/phrase counts match road-test subset',
    ok:
      !!sax &&
      sax.files === 17 &&
      sax.phrases === 18 &&
      !!dim &&
      dim.files === 11 &&
      dim.phrases === 69 &&
      !!jazz &&
      jazz.files === 10 &&
      jazz.phrases === 12,
    detail: JSON.stringify({ sax, dim, jazz }),
  });
  const empty = ['bebop_jazz_blues', 'blues_rock', 'modern_rock', 'progressive_blues'];
  rows.push({
    name: 'empty categories have zero files/phrases in stats',
    ok: empty.every(
      (c) =>
        (corpus.stats.byCategory[c]?.files ?? 0) === 0 &&
        (corpus.stats.byCategory[c]?.phrases ?? 0) === 0
    ),
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
      name: 'packaged resources derived override loads 38/99',
      ok: packed.ok && packed.stats.totals.files === 38 && packed.stats.totals.phrases === 99,
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
