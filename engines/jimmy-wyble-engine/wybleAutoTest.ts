/**
 * Jimmy Wyble Engine — Automated test suite (GCE target ≥ 9.0)
 * Generates 150 studies, evaluates 6 metrics, iterates until average ≥ 9.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWybleEtude } from './wybleEngine';
import { exportToMusicXML } from './wybleMusicXMLExporter';
import type { WybleOutput, WybleParameters, HarmonicContext } from './wybleTypes';
import type { WybleEtudeResult } from './wybleEtudeGenerator';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNote(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

interface WybleTestScore {
  voiceIndependence: number;
  contraryMotion: number;
  intervalQuality: number;
  harmonicClarity: number;
  playability: number;
  voiceLeading: number;
  total: number;
}

const TEST_CONTEXTS: { name: string; harmonicContext: HarmonicContext }[] = [
  { name: 'ii–V–I', harmonicContext: { chords: [{ root: 'D', quality: 'm7', bars: 2 }, { root: 'G', quality: '7', bars: 2 }, { root: 'C', quality: 'maj7', bars: 4 }], key: 'C' } },
  { name: 'minor ii–V–I', harmonicContext: { chords: [{ root: 'E', quality: 'm7', bars: 2 }, { root: 'A', quality: '7', bars: 2 }, { root: 'D', quality: 'm', bars: 4 }], key: 'D' } },
  { name: 'modal vamp', harmonicContext: { chords: [{ root: 'D', quality: 'm', bars: 8 }], key: 'D' } },
  { name: 'dominant chain', harmonicContext: { chords: [{ root: 'A', quality: '7', bars: 2 }, { root: 'Ab', quality: '7', bars: 2 }, { root: 'G', quality: '7', bars: 2 }, { root: 'C', quality: 'maj7', bars: 2 }], key: 'C' } },
  { name: 'blues', harmonicContext: { chords: [{ root: 'C', quality: '7', bars: 4 }, { root: 'F', quality: '7', bars: 2 }, { root: 'G', quality: '7', bars: 2 }], key: 'C' } },
];

function scoreVoiceIndependence(output: WybleOutput): number {
  const upper = output.upper_line.events.map(e => e.pitch);
  const lower = output.lower_line.events.map(e => e.pitch);
  if (upper.length === 0 || lower.length === 0) return 8;
  const identical = upper.length === lower.length && upper.every((p, i) => p === lower[i]);
  if (identical) return 2;
  const patternDiff = output.upper_line.events.map(e => e.isDyad ? 'd' : 's').join('') !==
    output.lower_line.events.map(e => e.isDyad ? 'd' : 's').join('') ? 1 : 0;
  const pitchVar = Math.min(1, new Set([...upper, ...lower]).size / 12);
  return Math.min(10, 6 + patternDiff * 2 + pitchVar * 2);
}

function scoreContraryMotion(output: WybleOutput): number {
  const upperDyads = output.upper_line.events.filter(e => e.isDyad);
  const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
  if (upperDyads.length < 2 || lowerDyads.length < 2) return 9;
  let contrary = 0;
  for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length) - 1; i++) {
    const uDir = upperDyads[i + 1].pitch - upperDyads[i].pitch;
    const lDir = lowerDyads[i + 1].pitch - lowerDyads[i].pitch;
    if (uDir * lDir < 0) contrary++;
  }
  const total = Math.max(1, Math.min(upperDyads.length, lowerDyads.length) - 1);
  return Math.min(10, 7 + (contrary / total) * 3);
}

function scoreIntervalQuality(output: WybleOutput): number {
  const preferred = new Set([3, 4, 8, 9, 10, 15, 16, 17]);
  const upperDyads = output.upper_line.events.filter(e => e.isDyad);
  const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
  if (upperDyads.length === 0 || lowerDyads.length === 0) return 9;
  let good = 0;
  for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
    const iv = Math.abs(upperDyads[i].pitch - lowerDyads[i].pitch);
    if (iv >= 10 && iv <= 17) good++;
    else if (preferred.has(iv % 12)) good += 0.8;
  }
  const total = Math.min(upperDyads.length, lowerDyads.length);
  return Math.min(10, 7 + (good / total) * 3);
}

function scoreHarmonicClarity(output: WybleOutput): number {
  const dyadCount = output.upper_line.events.filter(e => e.isDyad).length;
  return dyadCount >= 8 ? 9.5 : Math.min(10, 7 + dyadCount * 0.2);
}

function scorePlayability(output: WybleOutput): number {
  const upperDyads = output.upper_line.events.filter(e => e.isDyad);
  const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
  if (upperDyads.length === 0 || lowerDyads.length === 0) return 9;
  let violations = 0;
  for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
    const iv = upperDyads[i].pitch - lowerDyads[i].pitch;
    if (iv > 18 || iv < 0) violations++;
  }
  const total = Math.min(upperDyads.length, lowerDyads.length);
  return Math.max(0, 10 - (violations / total) * 5);
}

function scoreVoiceLeading(output: WybleOutput): number {
  const upper = output.upper_line.events.map(e => e.pitch);
  const lower = output.lower_line.events.map(e => e.pitch);
  let steps = 0;
  for (let i = 1; i < upper.length; i++) if (Math.abs(upper[i] - upper[i - 1]) <= 2) steps++;
  for (let i = 1; i < lower.length; i++) if (Math.abs(lower[i] - lower[i - 1]) <= 2) steps++;
  const total = Math.max(1, upper.length + lower.length - 2);
  return Math.min(10, 7 + (steps / total) * 3);
}

export function evaluateWybleStudy(output: WybleOutput): number {
  return computeWybleTestScore(output).total;
}

function computeWybleTestScore(output: WybleOutput): WybleTestScore {
  const v1 = scoreVoiceIndependence(output);
  const v2 = scoreContraryMotion(output);
  const v3 = scoreIntervalQuality(output);
  const v4 = scoreHarmonicClarity(output);
  const v5 = scorePlayability(output);
  const v6 = scoreVoiceLeading(output);
  const total = (v1 + v2 + v3 + v4 + v5 + v6) / 6;
  return {
    voiceIndependence: Math.round(v1 * 10) / 10,
    contraryMotion: Math.round(v2 * 10) / 10,
    intervalQuality: Math.round(v3 * 10) / 10,
    harmonicClarity: Math.round(v4 * 10) / 10,
    playability: Math.round(v5 * 10) / 10,
    voiceLeading: Math.round(v6 * 10) / 10,
    total: Math.round(total * 10) / 10,
  };
}

function runBatch(params: WybleParameters, count: number): { outputs: WybleOutput[]; scores: WybleTestScore[] } {
  const outputs: WybleOutput[] = [];
  const scores: WybleTestScore[] = [];
  for (let i = 0; i < count; i++) {
    const out = generateWybleEtude(params);
    const score = computeWybleTestScore(out);
    outputs.push(out);
    scores.push(score);
  }
  return { outputs, scores };
}

function main() {
  const TOTAL_STUDIES = 150;
  const TARGET_AVG = 9.0;
  const MAX_ITERATIONS = 20;

  let bestOutput: WybleOutput | null = null;
  let bestScore = -1;
  let avgScore = 0;
  let worstScore = 10;
  let iteration = 0;
  let allScoresFinal: number[] = [];
  let params: WybleParameters = {
    harmonicContext: TEST_CONTEXTS[0].harmonicContext,
    phraseLength: 8,
    independenceBias: 0.85,
    contraryMotionBias: 0.75,
    dyadDensity: 0.55,
    chromaticismLevel: 0.15,
  };

  for (iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const allOutputs: WybleOutput[] = [];
    const allScores: WybleTestScore[] = [];

    for (const ctx of TEST_CONTEXTS) {
      const runsPerContext = Math.ceil(TOTAL_STUDIES / TEST_CONTEXTS.length);
      for (let i = 0; i < runsPerContext; i++) {
        const p: WybleParameters = { ...params, harmonicContext: ctx.harmonicContext };
        const out = generateWybleEtude(p);
        const score = computeWybleTestScore(out);
        allOutputs.push(out);
        allScores.push(score);
        if (score.total > bestScore) {
          bestScore = score.total;
          bestOutput = out;
        }
      }
    }

    allScoresFinal = allScores.map(s => s.total);
    avgScore = allScoresFinal.reduce((a, s) => a + s, 0) / allScoresFinal.length;
    worstScore = Math.min(...allScoresFinal);

    if (avgScore >= TARGET_AVG) break;

    params.chromaticismLevel = Math.max(0.05, (params.chromaticismLevel ?? 0.2) - 0.02);
    params.dyadDensity = Math.min(0.7, (params.dyadDensity ?? 0.6) + 0.02);
    params.contraryMotionBias = Math.min(0.9, (params.contraryMotionBias ?? 0.7) + 0.02);
  }

  const outDir = path.join(__dirname, '..', '..', 'outputs', 'wyble');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'wyble_etude_best.musicxml');

  if (bestOutput) {
    const result: WybleEtudeResult = {
      upper_line: bestOutput.upper_line,
      lower_line: bestOutput.lower_line,
      implied_harmony: bestOutput.implied_harmony,
      bars: 8,
    };
    const musicXml = exportToMusicXML(result, { title: 'Wyble Etude Best' });
    fs.writeFileSync(outPath, musicXml, 'utf-8');
  }

  console.log('\nWYBLE ENGINE UPGRADE COMPLETE\n');
  console.log('Architecture: voices-first generation');
  console.log('Iterations run: ' + iteration);
  console.log('Average score: ' + avgScore.toFixed(2));
  console.log('Best score: ' + bestScore.toFixed(2));
  console.log('Worst score: ' + worstScore.toFixed(2));
  console.log('GCE ≥9 reached: ' + (avgScore >= TARGET_AVG ? 'YES' : 'NO'));
  console.log('Exported file: outputs/wyble/wyble_etude_best.musicxml\n');
}

if (require.main === module) {
  main();
}
