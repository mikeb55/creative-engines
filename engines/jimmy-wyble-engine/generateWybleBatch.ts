/**
 * Wyble Batch Generator
 * Generates 60 studies, keeps only GCE ≥ 9, exports to outputs/wyble/desktop/
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { evaluateWybleStudy } from './wybleAutoTest';
import { exportToMusicXML } from './wybleMusicXMLExporter';
import type { WybleParameters, HarmonicContext, WybleOutput } from './wybleTypes';
import type { WybleEtudeResult } from './wybleEtudeGenerator';

interface ProgressionSegment {
  chord: string;
  bars: number;
}

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

const PROGRESSION_FILES: Record<string, string> = {
  ii_v_i: 'ii_v_i.json',
  jazz_cycle: 'jazz_cycle.json',
  blues_basic: 'blues_basic.json',
};

function main() {
  const BATCH_SIZE = 60;
  const GCE_THRESHOLD = 9.0;
  const progressionName = process.argv[2] || 'ii_v_i';
  const progressionFile = PROGRESSION_FILES[progressionName] || 'ii_v_i.json';

  const progressionPath = path.join(__dirname, '..', '..', 'progressions', progressionFile);
  const progression = loadProgression(progressionPath);
  const harmonicContext = progressionToHarmonicContext(progression);
  const bars = progression.reduce((sum, seg) => sum + seg.bars, 0);

  const outDir = path.join(__dirname, '..', '..', 'outputs', 'wyble', 'desktop');
  fs.mkdirSync(outDir, { recursive: true });

  const params: WybleParameters = {
    harmonicContext,
    phraseLength: bars,
    independenceBias: 0.85,
    contraryMotionBias: 0.75,
    dyadDensity: 0.55,
    chromaticismLevel: 0.15,
  };

  const accepted: { output: WybleOutput; score: number }[] = [];
  let exportIndex = 0;

  for (let i = 0; i < BATCH_SIZE; i++) {
    const output = generateWybleEtude(params);
    const score = evaluateWybleStudy(output);
    if (score >= GCE_THRESHOLD) {
      accepted.push({ output, score });
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
    }
  }

  console.log('\nWYBLE BATCH GENERATION COMPLETE\n');
  console.log('Studies generated: ' + BATCH_SIZE);
  console.log('Studies accepted (GCE ≥9): ' + accepted.length);
  console.log('\nFiles exported:\noutputs/wyble/desktop/\n');
}

main();
