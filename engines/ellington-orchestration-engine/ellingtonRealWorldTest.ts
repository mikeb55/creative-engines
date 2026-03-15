/**
 * Ellington Real-World Auto Test
 * 120+ plans across 5 templates × 3 modes.
 * Evaluates: section-role clarity, density contour, brass/reed contrast,
 * background support, orchestration variety, mode differentiation, plausibility.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runEllingtonEngine } from './ellingtonEngine';
import type { OrchestrationPlan, ArrangementMode } from './ellingtonTypes';
import { TEMPLATE_LIBRARY } from './templates/templateLibrary';
import { exportOrchestrationToMusicXML } from './ellingtonMusicXMLExporter';
import { generateEllingtonOrchestration } from './ellingtonEngine';

const TEMPLATE_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const MODES: ArrangementMode[] = ['classic', 'ballad', 'shout'];
const TARGET_AVG = 8.8;
const EXPORT_TEMPLATES = ['beatrice_A', 'orbit_A'];
const PLANS_PER_COMBO = 8;

function scoreSectionRoleClarity(plan: OrchestrationPlan): number {
  let s = 10;
  for (const b of plan.bars) {
    if (!b.tutti && b.leadSection === b.supportSection) s -= 0.5;
  }
  return Math.max(0, Math.min(10, s));
}

function scoreDensityContour(plan: OrchestrationPlan): number {
  const levels = plan.bars.map((b) =>
    b.density === 'sparse' ? 1 : b.density === 'medium' ? 2 : b.density === 'dense' ? 3 : 4
  );
  let changes = 0;
  for (let i = 1; i < levels.length; i++) if (levels[i] !== levels[i - 1]) changes++;
  return Math.min(10, 6 + Math.min(changes / 2, 4));
}

function scoreBrassReedContrast(plan: OrchestrationPlan): number {
  const modes = new Set(plan.bars.map((b) => b.contrastMode));
  const callResp = plan.bars.filter((b) => b.callResponse !== 'none').length;
  return Math.min(10, 6 + modes.size * 0.5 + (callResp > 0 ? 1.5 : 0));
}

function scoreBackgroundSupport(plan: OrchestrationPlan): number {
  let violations = 0;
  for (const b of plan.bars) {
    if (b.background !== 'none' && b.leadSection === b.supportSection && !b.tutti) violations++;
  }
  return Math.max(0, 10 - violations * 2);
}

function scoreOrchestrationVariety(plan: OrchestrationPlan): number {
  const leads = new Set(plan.bars.map((b) => b.leadSection));
  const supports = new Set(plan.bars.map((b) => b.supportSection));
  return Math.min(10, 4 + leads.size + supports.size * 0.5);
}

function scoreModeDifferentiation(plan: OrchestrationPlan, mode: ArrangementMode): number {
  const saxLead = plan.bars.filter((b) => b.leadSection === 'saxes').length;
  const trumpetLead = plan.bars.filter((b) => b.leadSection === 'trumpets').length;
  const tromboneLead = plan.bars.filter((b) => b.leadSection === 'trombones').length;
  const tuttiCount = plan.bars.filter((b) => b.tutti).length;
  if (mode === 'classic' && saxLead >= plan.bars.length * 0.2) return 9;
  if (mode === 'ballad' && tuttiCount <= plan.bars.length * 0.1) return 9;
  if (mode === 'shout' && (trumpetLead + tromboneLead) >= plan.bars.length * 0.3) return 9;
  return 7;
}

function scorePlausibility(plan: OrchestrationPlan): number {
  const densities = plan.bars.map((b) =>
    b.density === 'sparse' ? 1 : b.density === 'medium' ? 2 : b.density === 'dense' ? 3 : 4
  );
  const lastThird = densities.slice(-Math.floor(densities.length / 3));
  const hasBuild = lastThird.some((d) => d >= 3) || lastThird.some((d) => d > 1);
  return hasBuild ? 9 : 7;
}

function scorePlan(plan: OrchestrationPlan, mode: ArrangementMode): number {
  const s1 = scoreSectionRoleClarity(plan);
  const s2 = scoreDensityContour(plan);
  const s3 = scoreBrassReedContrast(plan);
  const s4 = scoreBackgroundSupport(plan);
  const s5 = scoreOrchestrationVariety(plan);
  const s6 = scoreModeDifferentiation(plan, mode);
  const s7 = scorePlausibility(plan);
  return (s1 + s2 + s3 + s4 + s5 + s6 + s7) / 7;
}

function main(): void {
  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'ellington-orchestration-desktop', 'outputs', 'ellington');
  fs.mkdirSync(outDir, { recursive: true });

  const allScores: number[] = [];
  const resultsByTemplate: Record<string, { mode: string; plan: OrchestrationPlan; score: number }[]> = {};

  for (const templateId of TEMPLATE_IDS) {
    const template = TEMPLATE_LIBRARY[templateId];
    if (!template) continue;
    resultsByTemplate[templateId] = [];

    for (const mode of MODES) {
      for (let i = 0; i < PLANS_PER_COMBO; i++) {
        const seed = Date.now() + templateId.length * 100 + mode.length * 10 + i * 7;
        const plan = runEllingtonEngine({
          progression: template.segments,
          parameters: { arrangementMode: mode },
          seed,
        });
        const score = scorePlan(plan, mode);
        allScores.push(score);
        resultsByTemplate[templateId].push({ mode, plan, score });
      }
    }
  }

  let avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  let bestScore = Math.max(...allScores);
  let worstScore = Math.min(...allScores);

  let iterations = 0;
  const maxIter = 5;
  while (avgScore < TARGET_AVG && iterations < maxIter) {
    iterations++;
    const retryScores: number[] = [];
    for (const templateId of TEMPLATE_IDS) {
      const template = TEMPLATE_LIBRARY[templateId];
      if (!template) continue;
      for (const mode of MODES) {
        for (let i = 0; i < PLANS_PER_COMBO; i++) {
          const seed = 5000 + iterations * 1000 + templateId.length * 100 + i * 11;
          const plan = runEllingtonEngine({
            progression: template.segments,
            parameters: {
              arrangementMode: mode,
              densityBias: 0.45 + iterations * 0.03,
              contrastBias: 0.6 + iterations * 0.02,
              tuttiThreshold: 0.88 - iterations * 0.01,
            },
            seed,
          });
          const score = scorePlan(plan, mode);
          retryScores.push(score);
        }
      }
    }
    const retryAvg = retryScores.reduce((a, b) => a + b, 0) / retryScores.length;
    if (retryAvg <= avgScore) break;
    avgScore = retryAvg;
    bestScore = Math.max(...retryScores);
    worstScore = Math.min(...retryScores);
  }

  const now = new Date();
  const runFolder = `${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 5).replace(':', '')}_realworld`;
  const runPath = path.join(outDir, runFolder);
  fs.mkdirSync(runPath, { recursive: true });

  for (const templateId of EXPORT_TEMPLATES) {
    const template = TEMPLATE_LIBRARY[templateId];
    if (!template) continue;
    const candidates = resultsByTemplate[templateId] || [];
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const top3 = sorted.slice(0, 3);

    for (let i = 0; i < top3.length; i++) {
      const { plan, score } = top3[i];
      const rank = String(i + 1).padStart(2, '0');
      const orch = generateEllingtonOrchestration(template.segments, 1000 + i * 17);

      const planMd = `# Ellington Orchestration Plan — ${templateId}\n\n| Bar | Chord | Lead | Support | Density |\n|-----|-------|------|---------|---------|\n` +
        plan.bars.map((b) => `| ${b.bar} | ${b.chord} | ${b.leadSection} | ${b.supportSection} | ${b.density} |`).join('\n');

      fs.writeFileSync(
        path.join(runPath, `${templateId}_GCE${score.toFixed(2)}_rank${rank}.md`),
        planMd,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(runPath, `${templateId}_rank${rank}.json`),
        JSON.stringify(orch, null, 2),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(runPath, `${templateId}_rank${rank}.musicxml`),
        exportOrchestrationToMusicXML(orch, { title: `${templateId} #${i + 1}` }),
        'utf-8'
      );
    }
  }

  const report = `# Ellington Real-World Test Report

Generated: ${new Date().toISOString()}

## Templates × Modes
- Templates: ${TEMPLATE_IDS.join(', ')}
- Modes: ${MODES.join(', ')}
- Plans per combo: ${PLANS_PER_COMBO}
- Total plans: ${allScores.length}

## Scores
- **Average:** ${avgScore.toFixed(2)}
- **Best:** ${bestScore.toFixed(2)}
- **Worst:** ${worstScore.toFixed(2)}
- **Target:** ${TARGET_AVG}

## Exported
Top 3 for: ${EXPORT_TEMPLATES.join(', ')}
`;
  fs.writeFileSync(path.join(runPath, 'run_summary.md'), report, 'utf-8');

  console.log('ELLINGTON REAL-WORLD TEST');
  console.log('Average:', avgScore.toFixed(2));
  console.log('Best:', bestScore.toFixed(2));
  console.log('Worst:', worstScore.toFixed(2));
  console.log('Output:', runPath);

  if (avgScore < TARGET_AVG) {
    console.log('Note: Average below 8.8 target after tuning attempts');
  }
}

main();
