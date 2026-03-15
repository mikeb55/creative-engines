/**
 * Arranger-Assist Desktop Generator — Architecture + Ellington + Arranger-Assist export
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateArchitecture } from '../big-band-architecture-engine/architectureGenerator';
import type { ArrangementArchitecture, ChordSegment } from '../big-band-architecture-engine/architectureTypes';
import { runEllingtonEngine } from '../ellington-orchestration-engine/ellingtonEngine';
import type { OrchestrationPlan, OrchestrationBarPlan } from '../ellington-orchestration-engine/ellingtonTypes';
import { TEMPLATE_LIBRARY } from '../ellington-orchestration-engine/templates/templateLibrary';
import { generateArrangerAssist } from './arrangerAssistGenerator';

const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'] as const;

function segmentsForLength(progression: ChordSegment[], targetBars: number): ChordSegment[] {
  if (progression.length === 0) return [];
  const out: ChordSegment[] = [];
  let bars = 0;
  let i = 0;
  while (bars < targetBars) {
    const seg = progression[i % progression.length];
    const take = Math.min(seg.bars, targetBars - bars);
    if (take > 0) out.push({ chord: seg.chord, bars: take });
    bars += take;
    i++;
  }
  return out;
}

function main(): { runFolderPath: string; architecture: ArrangementArchitecture; error?: string } {
  const arg = process.argv[2] || 'ii_V_I_major';
  const styleArg = (process.argv[3] || 'standard_swing') as (typeof STYLES)[number];
  const style = STYLES.includes(styleArg) ? styleArg : 'standard_swing';

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'arranger-assist');
  fs.mkdirSync(outDir, { recursive: true });

  const template = TEMPLATE_LIBRARY[arg] || TEMPLATE_LIBRARY.ii_V_I_major;
  const progression: ChordSegment[] = template.segments;

  const architecture = generateArchitecture(progression, {
    style,
    seed: Date.now(),
    progressionTemplate: arg,
  });

  const mergedBars: OrchestrationBarPlan[] = [];
  let arrangementMode: 'classic' | 'ballad' | 'shout' = 'classic';
  for (const section of architecture.sections) {
    arrangementMode =
      section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout'
      : section.density === 'sparse' ? 'ballad' : 'classic';
    const sectionProg = segmentsForLength(progression, section.length);
    const plan = runEllingtonEngine({
      progression: sectionProg,
      parameters: { arrangementMode },
      seed: Date.now() + section.startBar,
    });
    const offset = section.startBar - 1;
    for (const b of plan.bars) mergedBars.push({ ...b, bar: b.bar + offset });
  }
  const ellingtonPlan: OrchestrationPlan = {
    bars: mergedBars.sort((a, b) => a.bar - b.bar),
    totalBars: architecture.totalBars,
    progression,
  };

  const assistPlan = generateArrangerAssist(architecture, ellingtonPlan, {
    seed: Date.now(),
    arrangementMode,
  });

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  let runNum = 1;
  let runFolder = `${date}_${time}_run${String(runNum).padStart(2, '0')}`;
  while (fs.existsSync(path.join(outDir, runFolder))) {
    runNum++;
    runFolder = `${date}_${time}_run${String(runNum).padStart(2, '0')}`;
  }
  const runPath = path.join(outDir, runFolder);
  fs.mkdirSync(runPath, { recursive: true });

  fs.writeFileSync(
    path.join(runPath, 'arranger_assist_plan.json'),
    JSON.stringify(assistPlan, null, 2),
    'utf-8'
  );

  const bySection = new Map<string, typeof assistPlan.suggestions>();
  for (const s of assistPlan.suggestions) {
    const list = bySection.get(s.section) ?? [];
    list.push(s);
    bySection.set(s.section, list);
  }

  let md = `# Arranger-Assist Plan

**Architecture:** ${assistPlan.architectureName}
**Progression:** ${assistPlan.progressionTemplate}
**Total Bars:** ${assistPlan.totalBars}
**Suggestions:** ${assistPlan.suggestions.length}

---

`;

  for (const section of architecture.sections) {
    const sugs = bySection.get(section.name) ?? [];
    const bg = sugs.filter((s) => s.role === 'background_figure');
    const punct = sugs.filter((s) => s.role === 'punctuation');
    const soli = sugs.filter((s) => s.role === 'soli_texture');
    const ramp = sugs.filter((s) => s.role === 'shout_ramp');
    const swap = sugs.filter((s) => s.role === 'section_swap');

    md += `## ${section.name} (bars ${section.startBar}-${section.startBar + section.length - 1})\n\n`;

    if (bg.length > 0) {
      md += `### Suggested background figures\n`;
      for (const s of bg) {
        md += `- **${s.barRange.startBar}-${s.barRange.endBar}** ${s.description}\n`;
        if (s.optionalRhythmText) md += `  - Rhythm: ${s.optionalRhythmText}\n`;
        if (s.optionalVoicingHint) md += `  - Voicing: ${s.optionalVoicingHint}\n`;
      }
      md += '\n';
    }
    if (punct.length > 0) {
      md += `### Suggested section answers / punctuation\n`;
      for (const s of punct) {
        md += `- **${s.barRange.startBar}-${s.barRange.endBar}** ${s.description}\n`;
        if (s.optionalRhythmText) md += `  - ${s.optionalRhythmText}\n`;
      }
      md += '\n';
    }
    if (soli.length > 0) {
      md += `### Suggested support texture\n`;
      for (const s of soli) {
        md += `- **${s.barRange.startBar}-${s.barRange.endBar}** ${s.description}\n`;
        if (s.optionalVoicingHint) md += `  - ${s.optionalVoicingHint}\n`;
      }
      md += '\n';
    }
    if (ramp.length > 0) {
      md += `### Suggested ramp + brass punctuation\n`;
      for (const s of ramp) {
        md += `- **${s.barRange.startBar}-${s.barRange.endBar}** [${(s as any).subtype}] ${s.description}\n`;
      }
      md += '\n';
    }
    if (swap.length > 0) {
      md += `### Optional section swaps\n`;
      for (const s of swap) md += `- ${s.description}\n`;
      md += '\n';
    }
  }

  fs.writeFileSync(path.join(runPath, 'arranger_assist_plan.md'), md, 'utf-8');

  const runSummary = `# Run Summary

**Generated:** ${now.toISOString()}
**Template:** ${arg}
**Style:** ${style}
**Architecture:** ${assistPlan.architectureName}

## Suggestions: ${assistPlan.suggestions.length}
## Total Bars: ${assistPlan.totalBars}

Outputs: arranger_assist_plan.md, arranger_assist_plan.json
`;
  fs.writeFileSync(path.join(runPath, 'run_summary.md'), runSummary, 'utf-8');

  return { runFolderPath: runPath, architecture };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({ runFolderPath: '', architecture: null, error: String(e) }));
  process.exit(1);
}
