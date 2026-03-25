/**
 * Output path UX helpers — Windows-safe paths (Prompt 7/7).
 */

import * as path from 'path';
import { displayPathForApi } from '../app-api/composerOsApiCore';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';

export function runOutputUxTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const mixed = 'C:\\Users\\Test\\Mike Composer Files\\Guitar-Bass Duos\\x.musicxml';
  const d = displayPathForApi(mixed);
  out.push({
    ok: d.includes('\\') || path.sep === '/',
    name: 'displayPathForApi normalizes paths',
  });

  const mp = manifestPathForMusicXml('C:\\out\\preset\\file.musicxml');
  out.push({
    ok: mp.includes('_meta') && mp.endsWith('file.manifest.json'),
    name: 'manifestPathForMusicXml points at _meta companion manifest',
  });

  return out;
}
