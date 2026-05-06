/**
 * Windows: Explorer-launched GUI often lacks fresh User env vars; registry still holds them.
 * PowerShell [Environment]::GetEnvironmentVariable is preferred; `reg.exe` works when PowerShell is blocked.
 */
import { execFileSync } from 'node:child_process';

/** Exported for unit tests — sample stdout lines from `reg.exe query`. */
export function parseRegQueryValue(stdout: string, valueName: string): string | undefined {
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.includes(valueName) || !trimmed.includes('REG_')) continue;
    const parts = trimmed.split(/\s+/);
    const regIdx = parts.findIndex((p) => p.startsWith('REG_'));
    if (regIdx >= 0 && regIdx < parts.length - 1) {
      const v = parts.slice(regIdx + 1).join(' ').trim();
      if (v.length > 0) return v;
    }
  }
  return undefined;
}

function tryRegAnthropicUser(): string | undefined {
  try {
    const out = execFileSync(
      'reg.exe',
      ['query', 'HKCU\\Environment', '/v', 'ANTHROPIC_API_KEY'],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 65536 }
    );
    return parseRegQueryValue(out, 'ANTHROPIC_API_KEY');
  } catch {
    return undefined;
  }
}

function tryRegAnthropicMachine(): string | undefined {
  try {
    const out = execFileSync(
      'reg.exe',
      ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment', '/v', 'ANTHROPIC_API_KEY'],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 65536 }
    );
    return parseRegQueryValue(out, 'ANTHROPIC_API_KEY');
  } catch {
    return undefined;
  }
}

function tryPowerShellStores(): string | undefined {
  const powershell =
    process.env.SystemRoot != null
      ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
      : 'powershell.exe';
  const scopes: Array<'User' | 'Machine'> = ['User', 'Machine'];
  for (const scope of scopes) {
    try {
      const out = execFileSync(
        powershell,
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          `[Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY','${scope}')`,
        ],
        { encoding: 'utf-8', windowsHide: true, maxBuffer: 65536 }
      );
      const v = out.replace(/^\uFEFF/, '').replace(/\r?\n+$/, '').trim();
      if (v.length > 0) return v;
    } catch {
      /* continue */
    }
  }
  return undefined;
}

/**
 * If `ANTHROPIC_API_KEY` is missing or blank, copy from Windows User/Machine stores into `process.env`.
 * Safe no-op on non-Windows or when the key is already set.
 */
export function hydrateAnthropicKeyFromWindowsStores(): void {
  if (process.platform !== 'win32') return;
  const cur = process.env.ANTHROPIC_API_KEY;
  if (typeof cur === 'string' && cur.trim() !== '') return;

  let v = tryPowerShellStores();
  if (!v) v = tryRegAnthropicUser();
  if (!v) v = tryRegAnthropicMachine();
  if (v && v.length > 0) {
    process.env.ANTHROPIC_API_KEY = v;
  }
}
