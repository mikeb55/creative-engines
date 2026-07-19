/**
 * Copy derived riff phrase corpus into desktop resources for packaged IPC load.
 * Source: <repo>/data/riff-phrase-corpus/derived/{phrases.jsonl,audit.csv}
 * Dest:   resources/riff-phrase-corpus/derived/
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const srcDir = path.join(repoRoot, 'data', 'riff-phrase-corpus', 'derived');
const destDir = path.join(__dirname, '..', 'resources', 'riff-phrase-corpus', 'derived');

const required = ['phrases.jsonl', 'audit.csv'];
for (const name of required) {
  const filePath = path.join(srcDir, name);
  if (!fs.existsSync(filePath)) {
    console.warn('[copy-riff-phrase-corpus] skip — missing ' + filePath);
    process.exit(0);
  }
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of required) {
  const from = path.join(srcDir, name);
  const to = path.join(destDir, name);
  fs.copyFileSync(from, to);
  console.log('[copy-riff-phrase-corpus] ' + from + ' -> ' + to);
}