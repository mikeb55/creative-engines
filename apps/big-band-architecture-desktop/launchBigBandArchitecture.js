/**
 * Launcher for Big Band Architecture Generator
 * Run: node launchBigBandArchitecture.js
 */

const { spawn } = require('child_process');
const path = require('path');

const appDir = path.resolve(__dirname);
const electronPath = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');

const child = spawn(electronPath, [appDir], {
  cwd: appDir,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
