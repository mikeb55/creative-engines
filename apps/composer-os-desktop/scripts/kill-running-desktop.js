/**
 * Predist cleanup: stop a running Composer OS Desktop so electron-builder can overwrite artifacts.
 * Must exit 0 when nothing is running — a failed kill must not fail the build.
 */
const { execSync, spawnSync } = require('child_process');

function killWindows() {
  // Same taskkill sequence as the previous `predist` npm script.
  const cmd =
    'cmd /c "taskkill /F /IM \\"Composer OS.exe\\" /T 2>nul & taskkill /F /IM Composer-OS.exe /T 2>nul & taskkill /F /IM electron.exe /T 2>nul & ping 127.0.0.1 -n 2 >nul"';
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    /* no matching process, or taskkill returned non-zero */
  }
}

function killDarwin() {
  const r = spawnSync('pkill', ['-f', 'Composer OS Desktop'], { stdio: 'ignore' });
  if (r.error) {
    console.warn('[kill-running-desktop] pkill error (ignored):', r.error.message);
  }
}

if (process.platform === 'win32') {
  killWindows();
} else if (process.platform === 'darwin') {
  killDarwin();
}

process.exit(0);
