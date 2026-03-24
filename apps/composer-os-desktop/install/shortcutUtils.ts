/**
 * Windows .lnk helpers via PowerShell only (no cmd batch scripts). Dev/deploy tooling.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** Pass file paths into PowerShell without fragile quoting (apostrophes, Unicode). */
function pathToPowerShellFromBase64(filePath: string): string {
  const resolved = path.resolve(filePath);
  return Buffer.from(resolved, 'utf16le').toString('base64');
}

function runPowerShell(script: string): string {
  return execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  ).trim();
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

/** Folders to scan for .lnk (Desktop, Public Desktop, Start Menu programs). */
export function getShortcutSearchRoots(): string[] {
  if (!isWindows()) return [];
  const roots: string[] = [];
  try {
    const json = runPowerShell(
      `$d=[Environment]::GetFolderPath('Desktop');` +
        `$c=[Environment]::GetFolderPath('CommonDesktopDirectory');` +
        `$up=Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs';` +
        `$cp=Join-Path $env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs';` +
        `@($d,$c,$up,$cp) | ConvertTo-Json -Compress`
    );
    const arr = JSON.parse(json) as string[];
    for (const r of arr) {
      if (r && fs.existsSync(r)) roots.push(path.normalize(r));
    }
  } catch {
    const home = os.homedir();
    const fallback = [
      path.join(home, 'Desktop'),
      path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop'),
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.ProgramData || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ];
    for (const r of fallback) {
      if (r && fs.existsSync(r)) roots.push(path.normalize(r));
    }
  }
  return [...new Set(roots)];
}

export function getUserDesktopDir(): string {
  if (!isWindows()) return path.join(os.homedir(), 'Desktop');
  try {
    const d = runPowerShell(`[Environment]::GetFolderPath('Desktop')`);
    if (d && fs.existsSync(d)) return path.normalize(d);
  } catch {
    /* fall through */
  }
  return path.normalize(path.join(os.homedir(), 'Desktop'));
}

export function collectLnkFiles(root: string, maxDepth: number): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.lnk')) out.push(p);
    }
  };
  walk(root, 0);
  return out;
}

export function readShortcutTarget(lnkPath: string): string {
  const b64 = pathToPowerShellFromBase64(lnkPath);
  const script =
    `$p = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${b64}')); ` +
    `$w = New-Object -ComObject WScript.Shell; ` +
    `$s = $w.CreateShortcut($p); ` +
    `$s.TargetPath`;
  return runPowerShell(script);
}

export function createShortcut(opts: {
  shortcutPath: string;
  targetPath: string;
  workingDirectory: string;
  iconPath?: string;
}): void {
  const scB64 = pathToPowerShellFromBase64(opts.shortcutPath);
  const tgB64 = pathToPowerShellFromBase64(opts.targetPath);
  const wdB64 = pathToPowerShellFromBase64(opts.workingDirectory);
  const iconSrc = opts.iconPath ? path.resolve(opts.iconPath) : path.resolve(opts.targetPath);
  const iconB64 = pathToPowerShellFromBase64(iconSrc);
  const script =
    `$sc = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${scB64}')); ` +
    `$tg = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${tgB64}')); ` +
    `$wd = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${wdB64}')); ` +
    `$ic = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${iconB64}')); ` +
    `$w = New-Object -ComObject WScript.Shell; ` +
    `$l = $w.CreateShortcut($sc); ` +
    `$l.TargetPath = $tg; ` +
    `$l.WorkingDirectory = $wd; ` +
    `$l.IconLocation = ($ic + ',0'); ` +
    `$l.Save()`;
  runPowerShell(script);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function moveToQuarantine(src: string, quarantineDir: string): string {
  ensureDir(quarantineDir);
  const base = path.basename(src);
  const dest = path.join(quarantineDir, `${Date.now()}-${base}`);
  fs.renameSync(src, dest);
  return dest;
}

export function defaultQuarantineDir(): string {
  return path.join(os.homedir(), 'ComposerOsDesktop', 'shortcut-quarantine');
}
