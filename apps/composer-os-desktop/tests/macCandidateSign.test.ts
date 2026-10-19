import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MAC_CANDIDATE_SEQUENCE, assertCandidateAppIsSignable } from '../install/signMacCandidate';

const disposables: string[] = [];

afterEach(() => {
  for (const dir of disposables.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('Mac candidate signing sequence', () => {
  it('signs only after resources, channel metadata, icons, and stamps', () => {
    expect(MAC_CANDIDATE_SEQUENCE).toEqual([
      'complete-application-build',
      'add-resources',
      'write-dev-channel-metadata',
      'finalise-icons',
      'finalise-build-stamps',
      'sign-inside-out',
      'verify-codesign-deep-strict',
      'freeze-bundle',
    ]);
    const signAt = MAC_CANDIDATE_SEQUENCE.indexOf('sign-inside-out');
    expect(signAt).toBeGreaterThan(MAC_CANDIDATE_SEQUENCE.indexOf('finalise-build-stamps'));
    expect(MAC_CANDIDATE_SEQUENCE.indexOf('verify-codesign-deep-strict')).toBe(signAt + 1);
    expect(MAC_CANDIDATE_SEQUENCE.at(-1)).toBe('freeze-bundle');
  });

  it('refuses to sign a bundle under /Applications', () => {
    expect(() => assertCandidateAppIsSignable('/Applications/Composer OS DEV.app')).toThrow(/Applications/);
    expect(() => assertCandidateAppIsSignable('/Applications/Composer OS Desktop.app')).toThrow(/Applications/);
  });

  it('accepts a disposable candidate path and does not require an installed app', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'mac-candidate-'));
    disposables.push(root);
    const app = path.join(root, 'Composer OS DEV.app');
    mkdirSync(path.join(app, 'Contents', 'Resources'), { recursive: true });
    expect(() => assertCandidateAppIsSignable(app)).not.toThrow();
  });
});
