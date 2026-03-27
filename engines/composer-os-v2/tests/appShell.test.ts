/**
 * Product shell expectations — presets + diagnostics surface (Prompt 7/7).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildDiagnostics } from '../app-api/buildDiagnostics';

export function runAppShellTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const appTs = fs.readFileSync(
    path.join(__dirname, '../../..', 'apps', 'composer-os-app', 'src', 'App.tsx'),
    'utf-8'
  );
  out.push({
    ok: appTs.includes('Composer OS') && appTs.includes('Generate') && appTs.includes('Outputs'),
    name: 'web app shell has Generate + Outputs navigation',
  });

  const home = fs.readFileSync(
    path.join(__dirname, '../../..', 'apps', 'composer-os-app', 'src', 'pages', 'HomeGenerate.tsx'),
    'utf-8'
  );
  out.push({
    ok:
      home.includes('string_quartet') &&
      home.includes('big_band') &&
      home.includes('song_mode') &&
      home.includes('riff_generator'),
    name: 'HomeGenerate references all non-duo preset ids for honest labelling',
  });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-app-shell-'));
  try {
    const d = buildDiagnostics(tmp, 3001);
    out.push({
      ok: d.supportedModes?.length === 6 && d.version.length > 0,
      name: 'diagnostics exposes version + supportedModes (V1 baseline)',
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return out;
}
