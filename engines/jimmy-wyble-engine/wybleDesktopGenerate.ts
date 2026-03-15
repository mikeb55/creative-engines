/**
 * Wyble Desktop Generator — Run by Electron app
 * Generates etudes, keeps GCE ≥ 9, exports to outputs/wyble/desktop/
 * Accepts progression name via argv[2]: ii_v_i | jazz_cycle | blues_basic
 * Outputs JSON result to stdout for IPC.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { evaluateWybleStudy } from './wybleAutoTest';
import { exportToMusicXML } from './wybleMusicXMLExporter';
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
    const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
    if (!match) return { root: 'C', quality: 'maj', bars };
    let q = (match[2] ?? 'maj').toLowerCase();
    if (q === 'm7' || q === 'min7') q = 'min';
    if (q === '7' || q === 'dom7') q = 'dom';
    if (q === 'maj7') q = 'maj';
    return { root: match[1], quality: q, bars };
  });
  return { chords, key: 'C' };
}

function main() {
  const BATCH_SIZE = 10;
  const GCE_THRESHOLD = 9.0;
  const progressionName = process.argv[2] || 'ii_v_i';
  const practiceMode = (process.argv[3] || 'etude') as 'etude' | 'exercise' | 'improvisation';
  const progressionFile = PROGRESSION_FILES[progressionName] || 'ii_v_i.json';

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const progressionPath = path.join(rootDir, 'progressions', progressionFile);
  const outDir = path.join(rootDir, 'outputs', 'wyble', 'desktop');

  const progression = loadProgression(progressionPath);
  const harmonicContext = progressionToHarmonicContext(progression);
  const bars = progression.reduce((sum, seg) => sum + seg.bars, 0);

  fs.mkdirSync(outDir, { recursive: true });

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

const result = main();
console.log(JSON.stringify(result));
