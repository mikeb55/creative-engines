/**
 * Create Windows desktop shortcut for Wyble Etude Generator
 * Run: node createShortcut.js
 *
 * Uses a Node launcher (launchWybleDesktop.js) so paths with spaces work.
 * The shortcut targets node.exe with the launcher path as a quoted argument.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = path.resolve(__dirname);
const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop');
const shortcutPath = path.join(desktopPath, 'Wyble Etude Generator.lnk');
const launcherPath = path.join(appDir, 'launchWybleDesktop.js');
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
oLink.Description = "Jimmy Wyble Etude Generator"
oLink.IconLocation = "${escapeForVbs(path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'))},0"
oLink.Save
`;

const vbsPath = path.join(appDir, 'create_shortcut.vbs');
fs.writeFileSync(vbsPath, vbsScript.trim());

try {
  execSync(`cscript //nologo "${vbsPath}"`, { stdio: 'inherit' });
  console.log('Desktop shortcut created: Wyble Etude Generator');
  console.log('Target:', nodeExe);
  console.log('Arguments:', '"' + launcherPath + '"');
  console.log('WorkingDir:', appDir);
} catch (e) {
  console.log('Note: Run "npm start" from apps/wyble-etude-desktop to launch. Shortcut creation may require cscript.');
} finally {
  if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
}
