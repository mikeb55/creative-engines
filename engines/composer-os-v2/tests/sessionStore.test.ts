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

  const v1 = validateSessionPayload({
    formatVersion: 1,
    savedAt: new Date().toISOString(),
    presetId: 'ecm_chamber',
    seed: 2,
    styleStack: { primary: 'metheny' },
  });
  out.push({
    ok: v1.ok && v1.session?.presetId === 'ecm_chamber',
    name: 'session format v1 still validates',
  });

  const v2path = path.join(dir, 'session-v2.json');
  saveSessionFile(v2path, {
    formatVersion: 2,
    savedAt: new Date().toISOString(),
    presetId: 'song_mode',
    seed: 3,
    styleStack: { primary: 'bacharach' },
    lastBestCandidateSeed: 777,
    continuationSourceRef: 'manifest:abc',
  });
  const lv2 = loadSessionFile(v2path);
  out.push({
    ok: lv2.ok && lv2.session?.lastBestCandidateSeed === 777 && lv2.session?.continuationSourceRef === 'manifest:abc',
    name: 'session v2 round-trips project memory fields',
  });

  const v3path = path.join(dir, 'session-v3.json');
  saveSessionFile(v3path, {
    formatVersion: SESSION_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    presetId: 'ecm_chamber',
    seed: 9,
    styleStack: { primary: 'metheny' },
    referenceSourceKind: 'musicxml',
    referenceBehaviourSummary: 'sectional / medium',
    referenceInfluenceMode: 'hint_only',
    referenceInfluenceStrength: 'subtle',
  });
  const lv3 = loadSessionFile(v3path);
  out.push({
    ok: lv3.ok && lv3.session?.referenceSourceKind === 'musicxml' && lv3.session?.referenceInfluenceMode === 'hint_only',
    name: 'session v3 round-trips reference metadata',
  });

  const v4path = path.join(dir, 'session-v4.json');
  saveSessionFile(v4path, {
    formatVersion: SESSION_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    presetId: 'big_band',
    seed: 12,
    styleStack: { primary: 'barry_harris' },
    variationId: 'take_01',
    creativeControlLevel: 'stable',
    stylePairingSnapshot: { songwriterStyle: 'beatles', arrangerStyle: 'ellington', era: 'swing' },
    bigBandEnsembleConfigId: 'medium_band',
    lastOutputPath: 'C:\\\\out\\\\demo.musicxml',
  });
  const lv4 = loadSessionFile(v4path);
  out.push({
    ok:
      lv4.ok &&
      lv4.session?.variationId === 'take_01' &&
      lv4.session?.stylePairingSnapshot?.songwriterStyle === 'beatles' &&
      lv4.session?.bigBandEnsembleConfigId === 'medium_band',
    name: 'session v4 round-trips variation + pairing + ensemble',
  });

  return out;
}
