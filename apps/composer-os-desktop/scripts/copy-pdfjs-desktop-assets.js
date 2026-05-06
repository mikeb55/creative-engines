/**
 * Ship pdf.js worker + cmaps/standard_fonts/wasm — packaged app has no node_modules;
 * Node/Electron main needs local URLs for getDocument (not only pdf.worker.mjs).
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const pdfRootCandidates = [
  path.join(repoRoot, 'node_modules', 'pdfjs-dist'),
  path.join(repoRoot, 'engines', 'composer-os-v2', 'node_modules', 'pdfjs-dist'),
];

let pdfRoot;
for (const p of pdfRootCandidates) {
  if (fs.existsSync(path.join(p, 'legacy', 'build', 'pdf.worker.mjs'))) {
    pdfRoot = p;
    break;
  }
}
if (!pdfRoot) {
  console.error('[copy-pdfjs-desktop-assets] pdfjs-dist not found. Tried:', pdfRootCandidates);
  process.exit(1);
}

const resourcesDir = path.join(__dirname, '..', 'resources');
fs.mkdirSync(resourcesDir, { recursive: true });

const workerSrc = path.join(pdfRoot, 'legacy', 'build', 'pdf.worker.mjs');
const workerDest = path.join(resourcesDir, 'pdf.worker.mjs');
fs.copyFileSync(workerSrc, workerDest);
console.log('[copy-pdfjs-desktop-assets] worker ->', workerDest);

const assetDestRoot = path.join(resourcesDir, 'pdfjs-dist-assets');
for (const dir of ['cmaps', 'standard_fonts', 'wasm']) {
  const from = path.join(pdfRoot, dir);
  const to = path.join(assetDestRoot, dir);
  if (!fs.existsSync(from)) {
    console.error('[copy-pdfjs-desktop-assets] missing source dir:', from);
    process.exit(1);
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log('[copy-pdfjs-desktop-assets]', dir, '->', to);
}
