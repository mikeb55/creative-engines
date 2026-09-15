/**
 * Cheap working-tree fingerprint for the macOS Desktop launcher.
 * Hash of: git HEAD + porcelain (scoped to the three source trees) +
 * per-tree file count + max mtime.
 * Git is optional — Finder-launched apps often cannot talk to git in
 * Documents; we then hash mtimes only so launch still proceeds.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SKIP_DIR = new Set([
  'node_modules',
  'dist',
  '.git',
  'tmp',
  'coverage',
  'release',
  '.turbo',
  '.cache',
]);

const SOURCE_TREES = [
  ['app-src', ['apps', 'composer-os-app', 'src']],
  ['desktop-electron', ['apps', 'composer-os-desktop', 'electron']],
  ['engine-v2', ['engines', 'composer-os-v2']],
];

function gitBin() {
  return fs.existsSync('/usr/bin/git') ? '/usr/bin/git' : 'git';
}

function walkTree(dir) {
  let maxMtimeMs = 0;
  let fileCount = 0;
  if (!fs.existsSync(dir)) {
    return { maxMtimeMs: 0, fileCount: 0 };
  }
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      if (ent.name === '.DS_Store') continue;
      if (ent.isDirectory()) {
        if (SKIP_DIR.has(ent.name)) continue;
        stack.push(path.join(current, ent.name));
        continue;
      }
      if (!ent.isFile()) continue;
      fileCount += 1;
      try {
        const st = fs.statSync(path.join(current, ent.name));
        if (st.mtimeMs > maxMtimeMs) maxMtimeMs = st.mtimeMs;
      } catch {
        /* ignore */
      }
    }
  }
  return { maxMtimeMs, fileCount };
}

function gitSnapshot(root) {
  const git = gitBin();
  const gitDir = path.join(root, '.git');
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  const paths = SOURCE_TREES.map(([, parts]) => parts.join('/'));
  try {
    const head = execFileSync(
      git,
      ['--git-dir', gitDir, '--work-tree', root, 'rev-parse', 'HEAD'],
      { encoding: 'utf8', env, timeout: 8000 }
    ).trim();
    const porcelain = execFileSync(
      git,
      ['--git-dir', gitDir, '--work-tree', root, 'status', '--porcelain', '--', ...paths],
      { encoding: 'utf8', env, timeout: 8000 }
    );
    return { head, porcelain };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[fingerprint] git skipped:', msg.split('\n')[0]);
    return { head: 'no-git', porcelain: '' };
  }
}

function computeLauncherFingerprint(repoRoot) {
  const root = path.resolve(repoRoot);
  try {
    fs.readFileSync(path.join(root, 'package.json'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot read ${root}. Grant Composer OS access to Documents (System Settings → Privacy & Security → Files and Folders). ${msg}`
    );
  }
  const { head, porcelain } = gitSnapshot(root);
  const lines = [head, porcelain];
  for (const [label, parts] of SOURCE_TREES) {
    const dir = path.join(root, ...parts);
    const { maxMtimeMs, fileCount } = walkTree(dir);
    lines.push(`${label}\t${fileCount}\t${Math.round(maxMtimeMs)}`);
  }
  return crypto.createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

function main() {
  const repoRoot = process.argv[2] || path.resolve(__dirname, '../../..');
  process.stdout.write(computeLauncherFingerprint(repoRoot));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

module.exports = { computeLauncherFingerprint, walkTree, SOURCE_TREES };
