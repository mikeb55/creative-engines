/**
 * App / API boundary — UI talks only to composerOsApiCore (Prompt 7/7).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { apiGenerate } from '../app-api/composerOsApiCore';
import type { GenerateRequest } from '../app-api/appApiTypes';

export function runAppApiBoundaryTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-api-boundary-'));

  try {
    const base: Partial<GenerateRequest> = {
      styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
      seed: 4242,
    };
    const bad = apiGenerate({ ...base, presetId: 'not_a_real_preset' } as Partial<GenerateRequest>, tmp);
    out.push({
      ok: bad.success === false && typeof (bad as { error?: string }).error === 'string',
      name: 'negative: invalid preset fails cleanly via apiGenerate',
    });

    const bb = apiGenerate({ ...base, presetId: 'big_band', title: 'API boundary test' }, tmp);
    out.push({
      ok:
        bb.success === true &&
        !!(bb as { filepath?: string }).filepath?.endsWith('.json') &&
        (bb as { productKind?: string }).productKind === 'planning',
      name: 'apiGenerate routes big_band to planning JSON (no engine import from UI layer)',
    });
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  return out;
}
