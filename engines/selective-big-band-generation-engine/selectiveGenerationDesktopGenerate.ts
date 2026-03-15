/**
 * Selective Big-Band Generation Desktop — Generate note-level material for a target type
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateArchitecture } from '../big-band-architecture-engine/architectureGenerator';
import type { ArrangementArchitecture, ChordSegment } from '../big-band-architecture-engine/architectureTypes';
import { runEllingtonEngine } from '../ellington-orchestration-engine/ellingtonEngine';
import type { OrchestrationPlan, OrchestrationBarPlan } from '../ellington-orchestration-engine/ellingtonTypes';
import { generateArrangerAssist } from '../arranger-assist-engine/arrangerAssistGenerator';
import { generateSelectiveMaterial } from './selectiveGenerationGenerator';
import { buildSelectiveMusicXML } from './selectiveMaterialMusicXML';
import { TEMPLATE_LIBRARY } from '../ellington-orchestration-engine/templates/templateLibrary';
import type { TargetType } from './selectiveGenerationTypes';

const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'] as const;
const TARGET_TYPES: TargetType[] = ['background_figures', 'brass_punctuation', 'sax_soli_texture', 'shout_ramp_material'];

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

function main(): { runFolderPath: string; error?: string } {
  const arg = process.argv[2] || 'ii_V_I_major';
  const styleArg = (process.argv[3] || 'standard_swing') as (typeof STYLES)[number];
  const targetArg = (process.argv[4] || 'background_figures') as TargetType;
  const style = STYLES.includes(styleArg) ? styleArg : 'standard_swing';
  const targetType = TARGET_TYPES.includes(targetArg) ? targetArg : 'background_figures';

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'selective-material');
  fs.mkdirSync(outDir, { recursive: true });

  const template = TEMPLATE_LIBRARY[arg] || TEMPLATE_LIBRARY.ii_V_I_major;
  const progression = template.segments;

  const architecture = generateArchitecture(progression, { style, seed: Date.now(), progressionTemplate: arg });

  const mergedBars: OrchestrationBarPlan[] = [];
  let arrangementMode: 'classic' | 'ballad' | 'shout' = 'classic';
  for (const section of architecture.sections) {
    arrangementMode = section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout' : section.density === 'sparse' ? 'ballad' : 'classic';
    const sectionProg = segmentsForLength(progression, section.length);
    const plan = runEllingtonEngine({ progression: sectionProg, parameters: { arrangementMode }, seed: Date.now() + section.startBar });
    const offset = section.startBar - 1;
    for (const b of plan.bars) mergedBars.push({ ...b, bar: b.bar + offset });
  }
  const ellingtonPlan: OrchestrationPlan = {
    bars: mergedBars.sort((a, b) => a.bar - b.bar),
    totalBars: architecture.totalBars,
    progression,
  };

  const assistPlan = generateArrangerAssist(architecture, ellingtonPlan, { seed: Date.now(), arrangementMode });
  const selectivePlan = generateSelectiveMaterial(architecture, ellingtonPlan, assistPlan, targetType, { seed: Date.now() });

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  let runNum = 1;
  let runFolder = `${date}_${time}_${targetType}_run${String(runNum).padStart(2, '0')}`;
  while (fs.existsSync(path.join(outDir, runFolder))) {
    runNum++;
    runFolder = `${date}_${time}_${targetType}_run${String(runNum).padStart(2, '0')}`;
  }
  const runPath = path.join(outDir, runFolder);
  fs.mkdirSync(runPath, { recursive: true });

  const musicXml = buildSelectiveMusicXML(selectivePlan, architecture.totalBars);
  fs.writeFileSync(path.join(runPath, 'selective_material.musicxml'), musicXml, 'utf-8');

  let md = `# Selective Material: ${targetType}\n\n`;
  md += `**Architecture:** ${selectivePlan.architectureName}\n`;
  md += `**Total Bars:** ${selectivePlan.totalBars}\n`;
  md += `**Units:** ${selectivePlan.units.length}\n\n`;
  for (const u of selectivePlan.units) {
    md += `## ${u.section} (bars ${u.barRange.startBar}-${u.barRange.endBar})\n`;
    md += `- ${u.notes}\n`;
    md += `- Rhythm: ${u.rhythmPattern}\n`;
    md += `- Voicing: ${u.voicingHint}\n\n`;
  }
  fs.writeFileSync(path.join(runPath, 'selective_material.md'), md, 'utf-8');

  const runSummary = `# Run Summary\n\n**Generated:** ${now.toISOString()}\n**Target:** ${targetType}\n**Template:** ${arg}\n**Units:** ${selectivePlan.units.length}\n`;
  fs.writeFileSync(path.join(runPath, 'run_summary.md'), runSummary, 'utf-8');

  return { runFolderPath: runPath };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({ runFolderPath: '', error: String(e) }));
  process.exit(1);
}
