/**
 * Create Windows desktop shortcut for Big Band Architecture Generator
 * Run: node createShortcut.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = path.resolve(__dirname);
const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop');
const shortcutPath = path.join(desktopPath, 'Big Band Architecture Generator.lnk');
const launcherPath = path.join(appDir, 'launchBigBandArchitecture.js');
const nodeExe = process.execPath;

function escapeForVbs(s) {
  return s.replace(/\\/g, '\\\\');
}

function vbsQuoted(s) {
  return '"""" & "' + escapeForVbs(s) + '" & """"';
}

const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${escapeForVbs(shortcutPath)}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${escapeForVbs(nodeExe)}"
oLink.Arguments = ${vbsQuoted(launcherPath)}
oLink.WorkingDirectory = "${escapeForVbs(appDir)}"
oLink.Description = "Big Band Architecture Generator"
oLink.IconLocation = "${escapeForVbs(path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'))},0"
oLink.Save
`;

const vbsPath = path.join(appDir, 'create_shortcut.vbs');
fs.writeFileSync(vbsPath, vbsScript.trim());

try {
  execSync(`cscript //nologo "${vbsPath}"`, { stdio: 'inherit' });
  console.log('Desktop shortcut created: Big Band Architecture Generator');
} catch (e) {
  console.log('Note: Run "npm start" from apps/big-band-architecture-desktop to launch.');
} finally {
  if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
}
