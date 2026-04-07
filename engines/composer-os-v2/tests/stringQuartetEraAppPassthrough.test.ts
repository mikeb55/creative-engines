/**
 * String Quartet — era passes app layer → MusicXML harmony on piano staff (integration).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { chordStringFromMusicXmlHarmonyBlock } from '../core/export/chordSymbolMusicXml';
import type { BigBandEraId } from '../core/big-band/bigBandResearchTypes';

const SEED = 42;
const TOTAL_BARS = 32;

const ALL_ERAS: BigBandEraId[] = ['swing', 'bebop', 'post_bop', 'contemporary'];

const STYLE_STACK: GenerateRequest['styleStack'] = {
  primary: 'barry_harris',
  styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
};

/** Ensemble scores write harmony on the piano/reduction staff, not part 0 — pick the part with the most `<harmony>` blocks. */
function extractChordSymbolsFromMusicXmlPianoHarmony(xml: string): string[] {
  const partBlocks = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/g) ?? [];
  let best = new Map<number, string>();
  for (const partBlock of partBlocks) {
    const measures = partBlock.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
    const map = new Map<number, string>();
    for (const mb of measures) {
      const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
      const num = numMatch ? parseInt(numMatch[1], 10) : -1;
      const harmonyMatch = mb.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/);
      if (!harmonyMatch || num < 1) continue;
      const chordStr = chordStringFromMusicXmlHarmonyBlock(harmonyMatch[0]);
      if (chordStr) map.set(num, chordStr);
    }
    if (map.size > best.size) best = map;
  }
  return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
}

function anyChordContainsOneOf(chords: string[], substrings: string[]): boolean {
  return chords.some((c) => substrings.some((s) => c.includes(s)));
}

function allFourDistinct(byEra: Record<BigBandEraId, string[]>): boolean {
  const sigs = ALL_ERAS.map((e) => byEra[e].join('|'));
  return new Set(sigs).size === ALL_ERAS.length;
}

function baseRequest(era: BigBandEraId): GenerateRequest {
  return {
    presetId: 'string_quartet',
    seed: SEED,
    totalBars: TOTAL_BARS,
    styleStack: STYLE_STACK,
    creativeControlLevel: 'stable',
    stylePairing: {
      songwriterStyle: 'donald_fagen',
      arrangerStyle: 'thad',
      era,
    },
  };
}

export function runStringQuartetEraAppPassthroughTests(): { ok: boolean; name: string }[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-os-sq-era-'));
  const byEra = {} as Record<BigBandEraId, string[]>;

  try {
    for (const era of ALL_ERAS) {
      const req = baseRequest(era);
      const result = runAppGeneration(req, tmpDir);
      if (!result.success || !result.filepath || !fs.existsSync(result.filepath)) {
        return [
          {
            ok: false,
            name: `String Quartet era app passthrough: generation failed for ${era}: ${result.error ?? 'no filepath'}`,
          },
        ];
      }
      const xml = fs.readFileSync(result.filepath, 'utf-8');
      byEra[era] = extractChordSymbolsFromMusicXmlPianoHarmony(xml);
      if (byEra[era].length === 0) {
        return [
          {
            ok: false,
            name: `String Quartet era app passthrough: no harmony chords parsed from MusicXML for ${era}`,
          },
        ];
      }
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  console.log(`\n=== String Quartet era app passthrough (MusicXML piano harmony) — ${TOTAL_BARS} bars, seed ${SEED} ===`);
  for (const era of ALL_ERAS) {
    console.log(`${era}: ${byEra[era].join(' | ')}`);
  }

  const swingOk = anyChordContainsOneOf(byEra.swing, ['maj6', '6/9', 'dim7', 'm6']);
  const bebopOk = anyChordContainsOneOf(byEra.bebop, ['7b9', '7#9', '7#11', 'm7b5']);
  const postOk = anyChordContainsOneOf(byEra.post_bop, ['maj7#11', '7alt', '7sus']);
  const contemporaryOk = anyChordContainsOneOf(byEra.contemporary, ['m9', 'm11', 'add9']);
  const distinctOk = allFourDistinct(byEra);

  const ok = swingOk && bebopOk && postOk && contemporaryOk && distinctOk;

  const failures: string[] = [];
  if (!swingOk) failures.push('swing missing expected vocabulary (maj6|6/9|dim7|m6)');
  if (!bebopOk) failures.push('bebop missing expected vocabulary (7b9|7#9|7#11|m7b5)');
  if (!postOk) failures.push('post_bop missing expected vocabulary (maj7#11|7alt|7sus)');
  if (!contemporaryOk) failures.push('contemporary missing expected vocabulary (m9|m11|add9)');
  if (!distinctOk) failures.push('not all four era chord sequences are distinct');

  const name =
    ok
      ? 'String Quartet app generation: era in stylePairing reaches MusicXML piano harmony (four eras distinct + typical symbols)'
      : `String Quartet era app passthrough FAILED: ${failures.join('; ')}`;

  return [{ ok, name }];
}

if (require.main === module) {
  const rows = runStringQuartetEraAppPassthroughTests();
  for (const r of rows) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
