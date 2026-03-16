#!/usr/bin/env node
/**
 * Create Windows desktop shortcuts for all engine launchers.
 * Run: node launchers/create_shortcuts.js
 *
 * Uses VBS to create .lnk files. Targets node.exe with launcher path as quoted argument.
 * Handles paths with spaces correctly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const launcherDir = path.resolve(__dirname);
const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop');
const nodeExe = process.execPath;

const SHORTCUTS = [
  { name: 'Wyble Etude Generator', launcher: 'launch_wyble.js' },
  { name: 'Ellington Orchestration', launcher: 'launch_ellington.js' },
  { name: 'Big Band Architecture', launcher: 'launch_big_band.js' },
  { name: 'Contemporary Counterpoint', launcher: 'launch_counterpoint.js' },
];

function escapeForVbs(s) {
  return s.replace(/\\/g, '\\\\');
}

function vbsQuoted(s) {
  return '"""" & "' + escapeForVbs(s) + '" & """"';
}

for (const { name, launcher } of SHORTCUTS) {
  const shortcutPath = path.join(desktopPath, `${name}.lnk`);
  const launcherPath = path.join(launcherDir, launcher);

  const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${escapeForVbs(shortcutPath)}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${escapeForVbs(nodeExe)}"
oLink.Arguments = ${vbsQuoted(launcherPath)}
oLink.WorkingDirectory = "${escapeForVbs(launcherDir)}"
oLink.Description = "${name}"
oLink.Save
`;

  const vbsPath = path.join(launcherDir, `create_${launcher.replace('.js', '')}.vbs`);
  fs.writeFileSync(vbsPath, vbsScript.trim());

  try {
    execSync(`cscript //nologo "${vbsPath}"`, { stdio: 'inherit' });
    console.log(`Created: ${name}`);
  } catch (e) {
    console.error(`Failed ${name}:`, e.message);
  } finally {
    if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
  }
}

console.log('\nDone. Shortcuts on Desktop.');
