/**
 * Session JSON save/load.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadSessionFile, saveSessionFile } from '../core/sessions/sessionStore';
import { SESSION_FORMAT_VERSION } from '../core/sessions/sessionTypes';
import { validateSessionPayload } from '../core/sessions/sessionValidation';

export function runSessionStoreTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-session-'));
  const fp = path.join(dir, 'session.json');
  const saved = saveSessionFile(fp, {
    formatVersion: SESSION_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    presetId: 'guitar_bass_duo',
    seed: 42,
    styleStack: { primary: 'barry_harris' },
  });
  out.push({
    ok: saved.ok && fs.existsSync(fp),
    name: 'saveSessionFile writes JSON',
  });

  const loaded = loadSessionFile(fp);
  out.push({
    ok: loaded.ok && loaded.session?.seed === 42 && loaded.session.presetId === 'guitar_bass_duo',
    name: 'loadSessionFile round-trips session',
  });

  const bad = loadSessionFile(path.join(dir, 'nope.json'));
  out.push({
    ok: !bad.ok && bad.errors.length > 0,
    name: 'negative: missing session file fails',
  });

  const badParse = path.join(dir, 'bad.json');
  fs.writeFileSync(badParse, '{', 'utf-8');
  const badLoad = loadSessionFile(badParse);
  out.push({
    ok: !badLoad.ok,
    name: 'negative: invalid JSON fails',
  });

  const wrongVer = validateSessionPayload({
    formatVersion: 0,
    savedAt: new Date().toISOString(),
    presetId: 'guitar_bass_duo',
    seed: 1,
    styleStack: { primary: 'barry_harris' },
  });
  out.push({
    ok: !wrongVer.ok && wrongVer.errors.some((e) => e.includes('formatVersion')),
    name: 'negative: wrong session formatVersion rejected',
  });

  return out;
}
