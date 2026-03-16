#!/usr/bin/env node
/**
 * Wyble Etude Generator — Desktop launcher
 * Handles paths with spaces. Invoked by Windows shortcut.
 */

const path = require('path');
const { spawn } = require('child_process');

const launcherDir = path.resolve(__dirname);
const rootDir = path.join(launcherDir, '..');

spawn('npx', ['ts-node', 'scripts/run_engine_desktop.ts', 'jimmy_wyble'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  windowsHide: false,
}).on('error', (err) => {
  console.error('Failed to start Wyble:', err.message);
  process.exit(1);
});
