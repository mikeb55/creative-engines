/**
 * Build musician shell assets into resources/ for desktop packaging.
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const musicianDir = path.join(root, 'musician');
const outMusicianDir = path.join(root, 'resources', 'musician');
const outRegistryDir = path.join(root, 'resources', 'registry');
const registrySource = path.resolve(
  root,
  '..',
  '..',
  'engines',
  'composer-os-v2',
  'scripts',
  'scaffold',
  'premium-melody-composer',
  'registry.json'
);
const registryTarget = path.join(outRegistryDir, 'premium-melody-composer-registry.json');

if (!fs.existsSync(musicianDir)) throw new Error('Missing musician source folder');
if (!fs.existsSync(registrySource)) throw new Error('Missing registry source file');

fs.mkdirSync(outMusicianDir, { recursive: true });
fs.mkdirSync(outRegistryDir, { recursive: true });

esbuild
  .build({
    entryPoints: [path.join(musicianDir, 'musician.ts')],
    bundle: true,
    outfile: path.join(outMusicianDir, 'musician.js'),
    platform: 'browser',
    format: 'iife',
    target: 'es2020',
  })
  .then(() => {
    fs.copyFileSync(path.join(musicianDir, 'index.html'), path.join(outMusicianDir, 'index.html'));
    fs.copyFileSync(path.join(musicianDir, 'musician.css'), path.join(outMusicianDir, 'musician.css'));
    fs.copyFileSync(registrySource, registryTarget);
    console.log('Musician assets built.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
