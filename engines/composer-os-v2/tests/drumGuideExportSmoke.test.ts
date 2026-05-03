/**
 * Smoke — SD3 drum guide (`*_drum_guide.mid` + `*_drum_guide.json`) beside MusicXML on golden-path export.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';

/** Zappa Classic alternating 7/8 + 4/4 for `totalBars` bars (same tiling as UI Zappa Classic preset). */
function buildZappaClassicBarMeterMap(totalBars: number): BarMeterMap {
  const map: BarMeterMap = {};
  const n = Math.max(0, Math.floor(totalBars));
  for (let b = 1; b <= n; b++) {
    map[b] = b % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 };
  }
  return map;
}

const TB = 32 as const;

export function runDrumGuideExportSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'co-drum-guide-smoke-'));
  let ok = false;
  try {
    /**
     * Same **builtin** family as `frankZappaSliceSmoke.test.ts` **Frank Zappa + Zappa Classic** odd-meter rows (seed **77777**, **longForm**, **32** bars): duo golden path reliably passes motif + export gates (16-bar builtin alone fails motif receipts).
     */
    const req: GenerateRequest = {
      presetId: 'guitar_bass_duo',
      styleStack: { primary: 'barry_harris' },
      seed: 77777,
      totalBars: TB,
      longFormEnabled: true,
      primarySongwriterStyle: 'frank_zappa',
      styleProfile: 'STYLE_ECM',
      barMeterMap: buildZappaClassicBarMeterMap(TB),
      bpm: 120,
      title: 'Drum guide smoke',
    };
    const result = generateComposition(req, tmp);
    if (!result.success || !result.filepath) {
      ok = false;
    } else {
      const dir = path.dirname(result.filepath);
      const base = path.basename(result.filepath, path.extname(result.filepath));
      const midPath = path.join(dir, `${base}_drum_guide.mid`);
      const jsonPath = path.join(dir, `${base}_drum_guide.json`);
      const midExists = fs.existsSync(midPath);
      const jsonExists = fs.existsSync(jsonPath);
      let parsedOk = false;
      let barsLenOk = false;
      let ticksOk = false;
      if (jsonExists) {
        try {
          const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
            version?: number;
            bars?: Array<{ kickTicks?: unknown; snareTicks?: unknown }>;
          };
          parsedOk = raw.version === 1 && Array.isArray(raw.bars);
          barsLenOk = parsedOk && raw.bars!.length === TB;
          ticksOk =
            barsLenOk &&
            raw.bars!.every(
              (b) =>
                Array.isArray(b.kickTicks) &&
                (b.kickTicks as unknown[]).length > 0 &&
                Array.isArray(b.snareTicks) &&
                (b.snareTicks as unknown[]).length > 0
            );
        } catch {
          parsedOk = false;
        }
      }
      ok = midExists && jsonExists && parsedOk && barsLenOk && ticksOk;
    }
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  out.push({
    ok,
    name:
      'SD3 drum guide: Frank Zappa + Zappa Classic 32 bars → _drum_guide.mid/json beside MusicXML (kick/snare ticks per bar)',
  });
  return out;
}
