#!/usr/bin/env node
/**
 * Big Band Architecture — Desktop launcher
 * Handles paths with spaces. Invoked by Windows shortcut.
 */

const path = require('path');
const { spawn } = require('child_process');

const launcherDir = path.resolve(__dirname);
const rootDir = path.join(launcherDir, '..');

spawn('npx', ['ts-node', 'scripts/run_engine_desktop.ts', 'big_band_architecture'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  windowsHide: false,
}).on('error', (err) => {
  console.error('Failed to start Big Band Architecture:', err.message);
  process.exit(1);
});
