/**
 * Cheap working-tree fingerprint for the macOS Desktop launcher.
 * Hash of: git HEAD + porcelain status + per-tree file count + max mtime
 * of apps/composer-os-app/src, apps/composer-os-desktop/electron, engines/composer-os-v2.
 * No network and no history-changing git commands.
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

function computeLauncherFingerprint(repoRoot) {
  const root = path.resolve(repoRoot);
  const git = gitBin();
  const head = execFileSync(git, ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const porcelain = execFileSync(git, ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  });
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
