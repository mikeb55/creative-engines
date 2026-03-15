/**
 * Wyble Etude — Export driver
 * Generates a single study from a JSON progression and exports to MusicXML.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { exportToMusicXML } from './wybleMusicXMLExporter';
import type { WybleEtudeResult } from './wybleEtudeGenerator';

interface ProgressionSegment {
  chord: string;
  bars: number;
}

function loadProgression(filePath: string): ProgressionSegment[] {
  const json = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(json) as ProgressionSegment[];
}

function progressionToHarmonicContext(progression: ProgressionSegment[]) {
  return {
    chords: progression.map(({ chord, bars: b }) => {
      const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
      if (!match) return { root: 'C', quality: 'maj', bars: b };
      let q = (match[2] ?? 'maj').toLowerCase();
      if (q === 'm7' || q === 'min7') q = 'min';
      if (q === '7' || q === 'dom7') q = 'dom';
      if (q === 'maj7') q = 'maj';
      return { root: match[1], quality: q, bars: b };
    }),
    key: 'C',
  };
}

function main() {
  const progressionPath = path.join(__dirname, '..', '..', 'progressions', 'ii_v_i.json');
  const progression = loadProgression(progressionPath);

  console.log('PROGRESSION LOADED');

  const phraseLength = progression.reduce((sum, seg) => sum + seg.bars, 0);
  const bars = phraseLength;
  const harmonicContext = progressionToHarmonicContext(progression);

  const output = generateWybleEtude({
    harmonicContext,
    phraseLength,
    independenceBias: 0.8,
    contraryMotionBias: 0.7,
    dyadDensity: 0.6,
    chromaticismLevel: 0.2,
  });

  console.log('WYBLE ETUDE GENERATED');

  const result: WybleEtudeResult = {
    upper_line: output.upper_line,
    lower_line: output.lower_line,
    implied_harmony: output.implied_harmony,
    bars,
  };

  const musicXml = exportToMusicXML(result, { title: 'Wyble Etude 01' });

  const outDir = path.join(__dirname, '..', '..', 'outputs', 'wyble');
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'wyble_etude_01.musicxml');
  fs.writeFileSync(outPath, musicXml, 'utf-8');

  console.log('FILE WRITTEN');
  console.log('  ' + path.resolve(outPath) + '\n');
}

main();
