import { describe, expect, it } from 'vitest';
import { formatSmokeReport } from '../install/smokeOutput';

describe('formatSmokeReport', () => {
  it('formats PASS with required fields only', () => {
    const s = formatSmokeReport({
      ok: true,
      packagedExePath: 'C:\\r\\Composer-OS.exe',
      launched: true,
      buildVersion: '1.0.1',
      uiBuildTimestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(s).toBe(
      [
        'PASS',
        'packaged exe path: C:\\r\\Composer-OS.exe',
        'launched: yes',
        'build version: 1.0.1',
        'ui build timestamp: 2026-01-01T00:00:00.000Z',
      ].join('\n')
    );
  });

  it('formats FAIL with blocking step', () => {
    const s = formatSmokeReport({
      ok: false,
      blockingStep: 'desktop:package',
      detail: 'npm exited 1',
    });
    expect(s.startsWith('FAIL')).toBe(true);
    expect(s).toContain('blocking step: desktop:package');
    expect(s).toContain('npm exited 1');
  });
});
