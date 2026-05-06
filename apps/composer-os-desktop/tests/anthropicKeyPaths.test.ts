import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANTHROPIC_SECRET_FILENAME,
  anthropicSecretKeyPathForUserData,
} from '../electron/anthropicKeyPaths';

describe('anthropicKeyPaths', () => {
  it('places ciphertext under userData/.composer-os-secrets/', () => {
    const ud = path.win32.join('C:', 'Users', 'x', 'AppData', 'Roaming', 'Composer OS Test');
    const p = anthropicSecretKeyPathForUserData(ud);
    expect(p).toContain('.composer-os-secrets');
    expect(p.endsWith(ANTHROPIC_SECRET_FILENAME)).toBe(true);
  });
});
