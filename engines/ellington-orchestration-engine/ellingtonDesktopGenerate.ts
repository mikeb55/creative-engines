/**
 * Ellington Desktop Generator — Run by Electron app
 * Generates candidate orchestration plans, scores them, exports top 3.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runEllingtonEngine } from './ellingtonEngine';
import type { OrchestrationPlan, ChordSegment } from './ellingtonTypes';
import { parseMusicXMLToProgression } from '../jimmy-wyble-engine/import/parseMusicXMLToProgression';

const CANDIDATE_COUNT = 20;
const EXPORT_COUNT = 3;

const PROGRESSION_PRESETS: Record<string, ChordSegment[]> = {
  ii_v_i: [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
  ],
  jazz_cycle: [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 2 },
    { chord: 'Am7', bars: 2 },
    { chord: 'D7', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
  ],
  blues_basic: [
    { chord: 'C7', bars: 4 },
    { chord: 'F7', bars: 2 },
    { chord: 'C7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'F7', bars: 2 },
    { chord: 'C7', bars: 4 },
  ],
};

function scorePlan(plan: OrchestrationPlan): number {
  let s = 10;
  for (const b of plan.bars) {
    if (!b.tutti && b.leadSection === b.supportSection) s -= 0.5;
  }
  const leads = new Set(plan.bars.map((b) => b.leadSection));
  s = Math.min(10, s + leads.size * 0.2);
  return Math.max(0, s);
}

function planToMarkdown(plan: OrchestrationPlan): string {
  const lines: string[] = [
    '# Ellington Orchestration Plan',
    '',
    '| Bar | Chord | Lead | Support | Density |',
    '|-----|-------|------|---------|---------|',
  ];
  for (const b of plan.bars) {
    lines.push(`| ${b.bar} | ${b.chord} | ${b.leadSection} | ${b.supportSection} | ${b.density} |`);
  }
  return lines.join('\n');
}

function getRunFolderName(outDir: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const prefix = `${date}_${time}_run`;
  let runNum = 1;
  while (fs.existsSync(path.join(outDir, `${prefix}${String(runNum).padStart(2, '0')}`))) {
    runNum++;
  }
  return `${prefix}${String(runNum).padStart(2, '0')}`;
}

interface DesktopResult {
  generated: number;
  exported: number;
  runFolderPath: string;
  progressionName: string;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  error?: string;
}

function main(): DesktopResult {
  const arg2 = process.argv[2] || 'ii_v_i';
  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'ellington-orchestration-desktop', 'outputs', 'ellington');
  fs.mkdirSync(outDir, { recursive: true });

  let progression: ChordSegment[];
  let progressionName: string;

  const isMusicXML = /\.(xml|musicxml)$/i.test(arg2) && fs.existsSync(arg2);
  if (isMusicXML) {
    const xml = fs.readFileSync(arg2, 'utf-8');
    const result = parseMusicXMLToProgression(xml);
    if (!result.success) {
      return {
        generated: 0, exported: 0, runFolderPath: '', progressionName: '',
        avgScore: 0, bestScore: 0, worstScore: 0, error: result.error,
      };
    }
    progression = result.progression;
    progressionName = path.basename(arg2);
  } else {
    progression = PROGRESSION_PRESETS[arg2] || PROGRESSION_PRESETS.ii_v_i;
    progressionName = arg2;
  }

  const candidates: { plan: OrchestrationPlan; score: number }[] = [];
  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    const plan = runEllingtonEngine({
      progression,
      seed: Date.now() + i * 13,
    });
    const score = scorePlan(plan);
    candidates.push({ plan, score });
  }

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const toExport = sorted.slice(0, EXPORT_COUNT);

  const runFolder = getRunFolderName(outDir);
  const runPath = path.join(outDir, runFolder);
  fs.mkdirSync(runPath, { recursive: true });

  const scores = candidates.map((c) => c.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);

  for (let i = 0; i < toExport.length; i++) {
    const { plan, score } = toExport[i];
    const rank = String(i + 1).padStart(2, '0');
    const scoreStr = score.toFixed(2);
    fs.writeFileSync(
      path.join(runPath, `ellington_plan_${rank}.md`),
      planToMarkdown(plan),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(runPath, `ellington_plan_${rank}.json`),
      JSON.stringify(plan, null, 2),
      'utf-8'
    );
  }

  const summary = `# Ellington Run Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Candidates:** ${CANDIDATE_COUNT}
- **Exported:** ${toExport.length}

## Scores
- **Average:** ${avgScore.toFixed(2)}
- **Best:** ${bestScore.toFixed(2)}
- **Worst:** ${worstScore.toFixed(2)}

## Exported
${toExport.map((c, i) => `- ellington_plan_${String(i + 1).padStart(2, '0')}.md / .json (score: ${c.score.toFixed(2)})`).join('\n')}
`;
  fs.writeFileSync(path.join(runPath, 'run_summary.md'), summary, 'utf-8');

  return {
    generated: CANDIDATE_COUNT,
    exported: toExport.length,
    runFolderPath: runPath,
    progressionName,
    avgScore,
    bestScore,
    worstScore,
  };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({
    generated: 0, exported: 0, runFolderPath: '', progressionName: '',
    avgScore: 0, bestScore: 0, worstScore: 0, error: String(e),
  }));
  process.exit(1);
}
