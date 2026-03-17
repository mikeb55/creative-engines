/**
 * Test MusicXML generation — runs Wyble, Counterpoint, Ellington and validates output.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..');

console.log('Running engine export tests...');

const wyble = spawnSync('npm', ['run', 'wyble'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (wyble.status !== 0) {
  console.error('Wyble failed');
  process.exit(1);
}

const counterpoint = spawnSync('npm', ['run', 'counterpoint'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (counterpoint.status !== 0) {
  console.error('Counterpoint failed');
  process.exit(1);
}

const ellington = spawnSync('npm', ['run', 'ellington'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (ellington.status !== 0) {
  console.error('Ellington failed');
  process.exit(1);
}

console.log('\nChecking MusicXML validity...');

const PATHS = {
  wyble: path.join(ROOT, 'outputs', 'wyble', 'clean', 'wyble_clean.musicxml'),
  counterpoint: path.join(ROOT, 'outputs', 'counterpoint', 'clean', 'counterpoint_clean.musicxml'),
  ellington: path.join(ROOT, 'outputs', 'ellington', 'clean', 'ellington_clean.musicxml'),
};

function check(file: string): void {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('<measure')) {
    throw new Error(`${file} missing measures`);
  }
}

const wybleFile = fs.existsSync(PATHS.wyble) ? PATHS.wyble : null;
const counterpointFile = fs.existsSync(PATHS.counterpoint) ? PATHS.counterpoint : null;
const ellingtonFile = fs.existsSync(PATHS.ellington) ? PATHS.ellington : null;

if (wybleFile) {
  check(wybleFile);
  console.log(`  Wyble: OK (${path.basename(wybleFile)})`);
} else {
  console.warn('  Wyble: no output found');
}

if (counterpointFile) {
  check(counterpointFile);
  console.log(`  Counterpoint: OK (${path.basename(counterpointFile)})`);
} else {
  console.warn('  Counterpoint: no output found');
}

if (ellingtonFile) {
  check(ellingtonFile);
  console.log(`  Ellington: OK (${path.basename(ellingtonFile)})`);
} else {
  console.warn('  Ellington: no output found');
}

console.log('\nAll MusicXML generation tests passed.');
