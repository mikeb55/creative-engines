/**
 * Wyble Batch Etude Generator
 * Loads corpus presets, generates 20 studies, exports only those scoring ≥ 9.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { exportToMusicXML } from './wybleMusicXMLExporter';
import { evaluateWybleStudy } from './wybleAutoTest';
import type { WybleOutput, WybleParameters, HarmonicContext } from './wybleTypes';
import type { WybleEtudeResult } from './wybleEtudeGenerator';

const GCE_THRESHOLD = 9.0;
const BATCH_SIZE = 20;

interface CorpusPreset {
  name: string;
  progression: Array<{ chord: string; bars: number }>;
}

function loadCorpusPreset(filePath: string): CorpusPreset {
  const json = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(json) as CorpusPreset;
}

function progressionToHarmonicContext(progression: CorpusPreset['progression']): HarmonicContext {
  return {
    chords: progression.map(({ chord, bars }) => {
      const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|m7b5|dom7)?/i);
      if (!match) return { root: 'C', quality: 'maj', bars };
      let q = (match[2] ?? 'maj').toLowerCase();
      if (q === 'm7' || q === 'min7' || q === 'm7b5') q = 'min';
      if (q === '7' || q === 'dom7') q = 'dom';
      if (q === 'maj7') q = 'maj';
      return { root: match[1], quality: q, bars };
    }),
    key: 'C',
  };
}

function main() {
  const corpusDir = path.join(__dirname, 'corpus');
  const presetPath = path.join(corpusDir, 'ii_v_i_cycle.json');
  const preset = loadCorpusPreset(presetPath);

  const harmonicContext = progressionToHarmonicContext(preset.progression);
  const bars = preset.progression.reduce((sum, seg) => sum + seg.bars, 0);

  const params: WybleParameters = {
    harmonicContext,
    phraseLength: bars,
    independenceBias: 0.85,
    contraryMotionBias: 0.75,
    dyadDensity: 0.55,
    chromaticismLevel: 0.15,
  };

  const results: { output: WybleOutput; score: number }[] = [];

  for (let i = 0; i < BATCH_SIZE; i++) {
    const output = generateWybleEtude(params);
    const score = evaluateWybleStudy(output);
    results.push({ output, score });
  }

  const passing = results.filter(r => r.score >= GCE_THRESHOLD);

  const outDir = path.join(__dirname, '..', '..', 'outputs', 'wyble', 'etudes');
  fs.mkdirSync(outDir, { recursive: true });

  passing.forEach((r, idx) => {
    const result: WybleEtudeResult = {
      upper_line: r.output.upper_line,
      lower_line: r.output.lower_line,
      implied_harmony: r.output.implied_harmony,
      bars,
    };
    const filename = `wyble_etude_${String(idx + 1).padStart(2, '0')}.musicxml`;
    const outPath = path.join(outDir, filename);
    const musicXml = exportToMusicXML(result, {
      title: `Wyble Etude ${idx + 1} (GCE ${r.score.toFixed(1)})`,
    });
    fs.writeFileSync(outPath, musicXml, 'utf-8');
  });

  console.log('\nWYBLE BATCH GENERATION COMPLETE\n');
  console.log('Corpus preset: ' + preset.name);
  console.log('Studies generated: ' + BATCH_SIZE);
  console.log('Studies exported (≥' + GCE_THRESHOLD + '): ' + passing.length);
  console.log('Output directory: outputs/wyble/etudes\n');
}

main();
