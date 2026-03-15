/**
 * Wyble Desktop Generator — Run by Electron app
 * Generates etudes, keeps GCE ≥ 9, exports to outputs/wyble/desktop/
 * Accepts: argv[2] = preset name (ii_v_i | jazz_cycle | blues_basic) OR path to MusicXML file
 *          argv[3] = practice mode
 * Outputs JSON result to stdout for IPC.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { evaluateWybleStudy } from './wybleAutoTest';
import { exportToMusicXML } from './wybleMusicXMLExporter';
import { parseMusicXMLToProgression } from './import/parseMusicXMLToProgression';
import type { WybleParameters, HarmonicContext } from './wybleTypes';
import type { WybleEtudeResult } from './wybleEtudeGenerator';

interface ProgressionSegment {
  chord: string;
  bars: number;
}

const PROGRESSION_FILES: Record<string, string> = {
  ii_v_i: 'ii_v_i.json',
  jazz_cycle: 'jazz_cycle.json',
  blues_basic: 'blues_basic.json',
};

function loadProgression(filePath: string): ProgressionSegment[] {
  const json = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(json) as ProgressionSegment[];
}

function progressionToHarmonicContext(progression: ProgressionSegment[]): HarmonicContext {
  const chords = progression.map(({ chord, bars }) => {
    const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7|m7b5)?/i);
    if (!match) return { root: 'C', quality: 'maj', bars };
    let q = (match[2] ?? 'maj').toLowerCase();
    if (q === 'm7' || q === 'min7' || q === 'm7b5') q = 'min';
    if (q === '7' || q === 'dom7') q = 'dom';
    if (q === 'maj7') q = 'maj';
    return { root: match[1], quality: q, bars };
  });
  return { chords, key: 'C' };
}

function main(): { generated: number; exported: number; outputDir: string; error?: string } {
  const BATCH_SIZE = 10;
  const GCE_THRESHOLD = 9.0;
  const arg2 = process.argv[2] || 'ii_v_i';
  const practiceMode = (process.argv[3] || 'etude') as 'etude' | 'exercise' | 'improvisation';

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'outputs', 'wyble', 'desktop');
  fs.mkdirSync(outDir, { recursive: true });

  let progression: ProgressionSegment[];
  let bars: number;

  const isMusicXML = /\.(xml|musicxml)$/i.test(arg2) && fs.existsSync(arg2);
  if (isMusicXML) {
    const xml = fs.readFileSync(arg2, 'utf-8');
    const parseResult = parseMusicXMLToProgression(xml);
    if (!parseResult.success) {
      return { generated: 0, exported: 0, outputDir: outDir, error: parseResult.error };
    }
    progression = parseResult.progression;
    bars = parseResult.totalBars;
  } else {
    const progressionFile = PROGRESSION_FILES[arg2] || 'ii_v_i.json';
    const progressionPath = path.join(rootDir, 'progressions', progressionFile);
    progression = loadProgression(progressionPath);
    bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
  }

  const harmonicContext = progressionToHarmonicContext(progression);

  const params: WybleParameters = {
    harmonicContext,
    phraseLength: bars,
    independenceBias: 0.85,
    contraryMotionBias: 0.75,
    dyadDensity: 0.55,
    chromaticismLevel: 0.15,
    practiceMode,
    voiceRatioMode: practiceMode === 'exercise' ? 'two_to_one' : practiceMode === 'improvisation' ? 'mixed' : 'one_to_one',
  };

  let exportIndex = 0;
  const generated: number[] = [];

  for (let i = 0; i < BATCH_SIZE; i++) {
    const output = generateWybleEtude(params);
    const score = evaluateWybleStudy(output);
    if (score >= GCE_THRESHOLD) {
      exportIndex++;
      const result: WybleEtudeResult = {
        upper_line: output.upper_line,
        lower_line: output.lower_line,
        implied_harmony: output.implied_harmony,
        bars,
      };
      const filename = `wyble_etude_${String(exportIndex).padStart(2, '0')}.musicxml`;
      const outPath = path.join(outDir, filename);
      const musicXml = exportToMusicXML(result, { title: `Wyble Etude ${exportIndex}` });
      fs.writeFileSync(outPath, musicXml, 'utf-8');
      generated.push(score);
    }
  }

  return {
    generated: BATCH_SIZE,
    exported: exportIndex,
    outputDir: outDir,
  };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({ generated: 0, exported: 0, outputDir: '', error: String(e) }));
  process.exit(1);
}
