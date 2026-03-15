/**
 * Create Windows desktop shortcut for Wyble Etude Generator
 * Run: node createShortcut.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = __dirname;
const rootDir = path.join(appDir, '..', '..');
const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop');
const shortcutPath = path.join(desktopPath, 'Wyble Etude Generator.lnk');

const electronPath = path.join(appDir, 'node_modules', '.bin', 'electron.cmd');
const targetPath = path.join(appDir, 'main.js');
const workDir = appDir;

const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe').replace(/\\/g, '\\\\')}"
oLink.Arguments = "${appDir.replace(/\\/g, '\\\\')}"
oLink.WorkingDirectory = "${workDir.replace(/\\/g, '\\\\')}"
oLink.Description = "Jimmy Wyble Etude Generator"
oLink.Save
`;

const vbsPath = path.join(appDir, 'create_shortcut.vbs');
fs.writeFileSync(vbsPath, vbsScript.trim());

try {
  execSync(`cscript //nologo "${vbsPath}"`, { stdio: 'inherit' });
  console.log('Desktop shortcut created: Wyble Etude Generator');
} catch (e) {
  console.log('Note: Run "npm start" from apps/wyble-etude-desktop to launch. Shortcut creation may require cscript.');
} finally {
  if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
}
