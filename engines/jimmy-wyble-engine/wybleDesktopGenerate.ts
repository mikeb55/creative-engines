/**
 * Wyble Desktop Generator — Run by Electron app
 * Generates a pool of candidates, scores them, exports top-ranked only.
 * Creates timestamped run folders with run_summary.md.
 *
 * Accepts: argv[2] = preset name OR path to MusicXML file
 *          argv[3] = practice mode
 *          argv[4] = candidate count (default 40)
 *          argv[5] = export count (default 3)
 *          argv[6] = min GCE target (default 9.0)
 * Outputs JSON result to stdout for IPC.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { evaluateWybleStudy } from './wybleAutoTest';
import { exportToMusicXML } from './wybleMusicXMLExporter';
import { parseMusicXMLToProgression } from './import/parseMusicXMLToProgression';
import { getTemplate } from './templates/templateLibrary';
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

const CANDIDATE_COUNT = 40;
const EXPORT_COUNT = 3;
const MIN_GCE_TARGET = 9.0;

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

function getRunFolderName(desktopOutDir: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const prefix = `${date}_${time}_run`;
  let runNum = 1;
  while (fs.existsSync(path.join(desktopOutDir, `${prefix}${String(runNum).padStart(2, '0')}`))) {
    runNum++;
  }
  return `${prefix}${String(runNum).padStart(2, '0')}`;
}

interface DesktopResult {
  generated: number;
  exported: number;
  outputDir: string;
  runFolder: string;
  runFolderPath: string;
  progressionName: string;
  practiceMode: string;
  scores: number[];
  exportedScores: number[];
  avgScore: number;
  bestScore: number;
  worstScore: number;
  gceThresholdMet: boolean;
  error?: string;
}

function main(): DesktopResult {
  const arg2 = process.argv[2] || 'ii_v_i';
  const practiceMode = (process.argv[3] || 'etude') as 'etude' | 'exercise' | 'improvisation';
  const candidateCount = parseInt(process.argv[4] || String(CANDIDATE_COUNT), 10) || CANDIDATE_COUNT;
  const exportCount = Math.max(1, parseInt(process.argv[5] || String(EXPORT_COUNT), 10) || EXPORT_COUNT);
  const minGce = parseFloat(process.argv[6] || String(MIN_GCE_TARGET)) || MIN_GCE_TARGET;

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const desktopOutDir = path.join(rootDir, 'outputs', 'wyble', 'desktop');
  fs.mkdirSync(desktopOutDir, { recursive: true });

  let progression: ProgressionSegment[];
  let bars: number;
  let progressionName: string;

  const isMusicXML = /\.(xml|musicxml)$/i.test(arg2) && fs.existsSync(arg2);
  if (isMusicXML) {
    const xml = fs.readFileSync(arg2, 'utf-8');
    const parseResult = parseMusicXMLToProgression(xml);
    if (!parseResult.success) {
      return {
        generated: 0, exported: 0, outputDir: desktopOutDir, runFolder: '', runFolderPath: '',
        progressionName: '', practiceMode, scores: [], exportedScores: [], avgScore: 0, bestScore: 0, worstScore: 0, gceThresholdMet: false,
        error: parseResult.error,
      };
    }
    progression = parseResult.progression;
    bars = parseResult.totalBars;
    progressionName = path.basename(arg2);
  } else {
    const template = getTemplate(arg2);
    if (template) {
      progression = template.progression;
      bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
      progressionName = arg2;
    } else {
      const progressionFile = PROGRESSION_FILES[arg2] || 'ii_v_i.json';
      const progressionPath = path.join(rootDir, 'progressions', progressionFile);
      progression = loadProgression(progressionPath);
      bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
      progressionName = arg2;
    }
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

  const candidates: { output: import('./wybleTypes').WybleOutput; score: number }[] = [];
  for (let i = 0; i < candidateCount; i++) {
    const output = generateWybleEtude(params);
    const score = evaluateWybleStudy(output);
    candidates.push({ output, score });
  }

  const scores = candidates.map((c) => c.score);
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const toExport = sorted.slice(0, exportCount);

  const runFolder = getRunFolderName(desktopOutDir);
  const runFolderPath = path.join(desktopOutDir, runFolder);
  fs.mkdirSync(runFolderPath, { recursive: true });

  const exportedScores: number[] = [];
  for (let i = 0; i < toExport.length; i++) {
    const r = toExport[i];
    const scoreStr = r.score.toFixed(2);
    const rankStr = String(i + 1).padStart(2, '0');
    const filename = `wyble_etude_GCE${scoreStr}_rank${rankStr}.musicxml`;
    const result: WybleEtudeResult = {
      upper_line: r.output.upper_line,
      lower_line: r.output.lower_line,
      implied_harmony: r.output.implied_harmony,
      bars,
    };
    const musicXml = exportToMusicXML(result, { title: `Wyble Etude rank ${i + 1} (GCE ${scoreStr})` });
    fs.writeFileSync(path.join(runFolderPath, filename), musicXml, 'utf-8');
    exportedScores.push(r.score);
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);
  const gceThresholdMet = scores.filter((s) => s >= minGce).length >= exportCount;

  const summary = `# Wyble Desktop Generation Run Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Practice mode:** ${practiceMode}
- **Candidates generated:** ${candidateCount}
- **Export count:** ${exportCount}
- **Min GCE target:** ${minGce}

## Candidate Scores
- **Average:** ${avgScore.toFixed(2)}
- **Best:** ${bestScore.toFixed(2)}
- **Worst:** ${worstScore.toFixed(2)}
- **GCE ≥ ${minGce} threshold met:** ${gceThresholdMet ? 'YES' : 'NO'}

## Exported Files
${toExport.map((r, i) => `- wyble_etude_GCE${r.score.toFixed(2)}_rank${String(i + 1).padStart(2, '0')}.musicxml (score: ${r.score.toFixed(2)})`).join('\n')}
`;

  fs.writeFileSync(path.join(runFolderPath, 'run_summary.md'), summary, 'utf-8');

  return {
    generated: candidateCount,
    exported: toExport.length,
    outputDir: desktopOutDir,
    runFolder,
    runFolderPath,
    progressionName,
    practiceMode,
    scores,
    exportedScores,
    avgScore,
    bestScore,
    worstScore,
    gceThresholdMet,
  };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({
    generated: 0, exported: 0, outputDir: '', runFolder: '', runFolderPath: '',
    progressionName: '', practiceMode: '', scores: [], exportedScores: [],
    avgScore: 0, bestScore: 0, worstScore: 0, gceThresholdMet: false,
    error: String(e),
  }));
  process.exit(1);
}
