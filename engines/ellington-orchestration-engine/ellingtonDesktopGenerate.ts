/**
 * Ellington Desktop Generator — Run by Electron app
 * Generates orchestration with voicings, scores with GCE heuristic, exports top 3.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateEllingtonOrchestration, runEllingtonEngine } from './ellingtonEngine';
import type { EllingtonOrchestration } from './ellingtonEngine';
import type { ChordSegment, ArrangementMode, OrchestrationPlan } from './ellingtonTypes';
import { exportOrchestrationToMusicXML } from './ellingtonMusicXMLExporter';
import { parseMusicXMLToProgression } from '../jimmy-wyble-engine/import/parseMusicXMLToProgression';
import { TEMPLATE_LIBRARY } from './templates/templateLibrary';

const CANDIDATE_COUNT = 40;
const EXPORT_COUNT = 3;

function getProgressionPresets(): Record<string, ChordSegment[]> {
  const presets: Record<string, ChordSegment[]> = {};
  for (const [id, tpl] of Object.entries(TEMPLATE_LIBRARY)) {
    presets[id] = tpl.segments;
  }
  presets.ii_v_i = presets.ii_V_I_major || [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
  ];
  return presets;
}

const PROGRESSION_PRESETS = getProgressionPresets();

/** GCE-style heuristic for orchestration voicings */
function scoreOrchestration(orch: EllingtonOrchestration): number {
  let score = 10;

  // Voice leading smoothness (≤ minor third preferred)
  for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
    let prev: number[] = [];
    for (const v of section) {
      if (prev.length > 0 && v.pitches.length > 0) {
        const maxJump = Math.max(
          ...v.pitches.map((p, i) => Math.abs(p - (prev[i] ?? prev[0])))
        );
        if (maxJump <= 3) score += 0.1;
        else if (maxJump > 6) score -= 0.2;
      }
      prev = v.pitches;
    }
  }

  // Register balance (spread across sections)
  const allPitches = [
    ...orch.trumpets.flatMap((v) => v.pitches),
    ...orch.trombones.flatMap((v) => v.pitches),
    ...orch.saxes.flatMap((v) => v.pitches),
  ];
  if (allPitches.length > 0) {
    const minP = Math.min(...allPitches);
    const maxP = Math.max(...allPitches);
    const span = maxP - minP;
    if (span >= 24 && span <= 48) score += 0.2;
  }

  // Orchestral density (all sections populated)
  const sectionsPopulated =
    (orch.trumpets.some((v) => v.pitches.length > 0) ? 1 : 0) +
    (orch.trombones.some((v) => v.pitches.length > 0) ? 1 : 0) +
    (orch.saxes.some((v) => v.pitches.length > 0) ? 1 : 0) +
    (orch.rhythm.some((v) => v.pitches.length > 0) ? 1 : 0);
  score += sectionsPopulated * 0.25;

  // Chord completeness (4+ notes in full sections)
  for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
    const complete = section.filter((v) => v.pitches.length >= 3).length;
    score += (complete / section.length) * 0.1;
  }

  return Math.max(0, Math.min(10, score));
}

/** GCE-style heuristic for orchestration plans */
function scorePlan(plan: OrchestrationPlan): number {
  let s = 10;
  for (const b of plan.bars) {
    if (!b.tutti && b.leadSection === b.supportSection) s -= 0.5;
  }
  const leads = new Set(plan.bars.map((b) => b.leadSection));
  s = Math.min(10, s + leads.size * 0.2);
  const densities = new Set(plan.bars.map((b) => b.density));
  s = Math.min(10, s + (densities.size > 1 ? 0.2 : 0));
  return Math.max(0, s);
}

function planToMarkdownFromPlan(plan: OrchestrationPlan): string {
  const lines = ['# Ellington Orchestration Plan', '', '| Bar | Chord | Lead | Support | Density |', '|-----|-------|------|---------|---------|'];
  for (const b of plan.bars) {
    lines.push(`| ${b.bar} | ${b.chord} | ${b.leadSection} | ${b.supportSection} | ${b.density} |`);
  }
  return lines.join('\n');
}

function orchestrationToSummary(orch: EllingtonOrchestration, score: number): string {
  const lines: string[] = [
    'ELLINGTON ORCHESTRATION SUMMARY',
    '==============================',
    '',
    `Progression: ${orch.progression.map((s) => s.chord).join(' - ')}`,
    `Total bars: ${orch.totalBars}`,
    `Score: ${score.toFixed(2)}`,
    '',
    'Sections:',
    `  Trumpets: ${orch.trumpets.length} bars`,
    `  Trombones: ${orch.trombones.length} bars`,
    `  Saxes: ${orch.saxes.length} bars`,
    `  Rhythm: ${orch.rhythm.length} bars`,
    '',
  ];
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
  const arg2 = process.argv[2] || 'ii_V_I_major';
  const arg3 = (process.argv[3] || 'classic') as ArrangementMode;
  const mode = ['classic', 'ballad', 'shout'].includes(arg3) ? arg3 : 'classic';
  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'outputs', 'ellington');
  fs.mkdirSync(outDir, { recursive: true });

  let progression: ChordSegment[];
  let progressionName: string;

  const isMusicXML = /\.(xml|musicxml)$/i.test(arg2) && fs.existsSync(arg2);
  if (isMusicXML) {
    const xml = fs.readFileSync(arg2, 'utf-8');
    const result = parseMusicXMLToProgression(xml);
    if (!result.success) {
      return {
        generated: 0,
        exported: 0,
        runFolderPath: '',
        progressionName: '',
        avgScore: 0,
        bestScore: 0,
        worstScore: 0,
        error: result.error,
      };
    }
    progression = result.progression;
    progressionName = path.basename(arg2);
  } else {
    progression = PROGRESSION_PRESETS[arg2] || PROGRESSION_PRESETS.ii_V_I_major || PROGRESSION_PRESETS.ii_v_i;
    progressionName = arg2;
  }

  const candidates: { orch: EllingtonOrchestration; plan: OrchestrationPlan; score: number }[] = [];
  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    const seed = Date.now() + i * 13;
    const plan = runEllingtonEngine({ progression, parameters: { arrangementMode: mode }, seed });
    const orch = generateEllingtonOrchestration(progression, seed);
    const score = (scoreOrchestration(orch) + scorePlan(plan)) / 2;
    candidates.push({ orch, plan, score });
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
    const { orch, plan, score } = toExport[i];
    const rank = String(i + 1).padStart(2, '0');

    fs.writeFileSync(
      path.join(runPath, `ellington_plan_GCE${score.toFixed(2)}_rank${rank}.md`),
      planToMarkdownFromPlan(plan),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(runPath, `ellington_plan_rank${rank}.json`),
      JSON.stringify(orch, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(runPath, `ellington_plan_rank${rank}.musicxml`),
      exportOrchestrationToMusicXML(orch, { title: `Ellington Orchestration #${i + 1}` }),
      'utf-8'
    );
  }

  const best = toExport[0];
  const summary = `# Ellington Run Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Mode:** ${mode}
- **Candidates:** ${CANDIDATE_COUNT}
- **Exported:** ${toExport.length}

## Scores
- **Average:** ${avgScore.toFixed(2)}
- **Best:** ${bestScore.toFixed(2)}
- **Worst:** ${worstScore.toFixed(2)}

## Outputs
${toExport.map((c, i) => `- ellington_plan_GCE${c.score.toFixed(2)}_rank${String(i + 1).padStart(2, '0')}.md`).join('\n')}
${toExport.map((_, i) => `- ellington_plan_rank${String(i + 1).padStart(2, '0')}.json, .musicxml`).join('\n')}
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
  console.log(
    JSON.stringify({
      generated: 0,
      exported: 0,
      runFolderPath: '',
      progressionName: '',
      avgScore: 0,
      bestScore: 0,
      worstScore: 0,
      error: String(e),
    })
  );
  process.exit(1);
}
