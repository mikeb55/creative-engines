#!/usr/bin/env node
/**
 * Contemporary Counterpoint Generator — Windows launcher
 * Resolves absolute app path and starts Electron. Handles paths with spaces.
 * Invoked by desktop shortcut: node.exe "path\to\launchContemporaryCounterpointDesktop.js"
 */

const path = require('path');
const { spawn } = require('child_process');

const appDir = path.resolve(__dirname);
const electronExe = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');

spawn(electronExe, [appDir], {
  cwd: appDir,
  stdio: 'inherit',
  shell: false,
  windowsHide: false,
}).on('error', (err) => {
  console.error('Failed to start Electron:', err.message);
  process.exit(1);
});
