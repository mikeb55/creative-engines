import { describe, expect, it } from 'vitest';
import {
  executablePathMatchesComposerOsPortable,
  fileNameMatchesComposerOsPortable,
  processNameMatchesComposerOsPortable,
} from '../install/processMatchers';
import { wouldConsiderProcessForClose } from '../install/closeComposerOsDesktop';

describe('processMatchers', () => {
  it('fileNameMatchesComposerOsPortable matches stable and legacy artifacts', () => {
    expect(fileNameMatchesComposerOsPortable('Composer-OS.exe')).toBe(true);
    expect(fileNameMatchesComposerOsPortable('Composer-OS-Desktop-1.0.1-portable.exe')).toBe(true);
    expect(fileNameMatchesComposerOsPortable('notepad.exe')).toBe(false);
  });

  it('processNameMatchesComposerOsPortable matches stable and legacy names', () => {
    expect(processNameMatchesComposerOsPortable('Composer-OS')).toBe(true);
    expect(processNameMatchesComposerOsPortable('Composer-OS.exe')).toBe(true);
    expect(processNameMatchesComposerOsPortable('Composer-OS-Desktop-1.0.1-portable')).toBe(true);
    expect(processNameMatchesComposerOsPortable('electron')).toBe(false);
  });

  it('executablePathMatchesComposerOsPortable matches path suffix', () => {
    expect(executablePathMatchesComposerOsPortable('D:\\release\\Composer-OS.exe')).toBe(true);
    expect(
      executablePathMatchesComposerOsPortable('D:\\release\\Composer-OS-Desktop-2.0.0-portable.exe')
    ).toBe(true);
    expect(executablePathMatchesComposerOsPortable('C:\\Windows\\System32\\notepad.exe')).toBe(false);
  });
});

describe('wouldConsiderProcessForClose', () => {
  it('matches stable portable image name', () => {
    expect(
      wouldConsiderProcessForClose({
        processName: 'Composer-OS.exe',
        executablePath: null,
      })
    ).toBe(true);
  });

  it('matches full image name with exe (legacy)', () => {
    expect(
      wouldConsiderProcessForClose({
        processName: 'Composer-OS-Desktop-1.0.1-portable.exe',
        executablePath: null,
      })
    ).toBe(true);
  });

  it('matches full path', () => {
    expect(
      wouldConsiderProcessForClose({
        processName: 'Composer-OS.exe',
        executablePath: 'C:\\r\\Composer-OS.exe',
      })
    ).toBe(true);
  });

  it('rejects unrelated', () => {
    expect(
      wouldConsiderProcessForClose({
        processName: 'node.exe',
        executablePath: 'C:\\n\\node.exe',
      })
    ).toBe(false);
  });
});
