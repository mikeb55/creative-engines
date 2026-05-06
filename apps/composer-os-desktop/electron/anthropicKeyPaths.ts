import path from 'node:path';

/** Relative to `app.getPath('userData')`. */
export const ANTHROPIC_SECRET_RELATIVE_DIR = path.join('.composer-os-secrets');
export const ANTHROPIC_SECRET_FILENAME = 'anthropic-api-key.bin';

export function anthropicSecretKeyPathForUserData(userDataDir: string): string {
  return path.join(userDataDir, ANTHROPIC_SECRET_RELATIVE_DIR, ANTHROPIC_SECRET_FILENAME);
}
