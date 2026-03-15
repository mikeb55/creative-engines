/**
 * Big Band Score Skeleton Desktop Generator — Architecture + Ellington + MusicXML export
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateArchitecture } from './architectureGenerator';
import type { ArrangementArchitecture, ChordSegment } from './architectureTypes';
import { runEllingtonEngine } from '../ellington-orchestration-engine/ellingtonEngine';
import type { OrchestrationPlan, OrchestrationBarPlan } from '../ellington-orchestration-engine/ellingtonTypes';
import { TEMPLATE_LIBRARY } from '../ellington-orchestration-engine/templates/templateLibrary';
import { exportScoreSkeleton } from './export/scoreSkeletonExporter';

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
  const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'score');
  fs.mkdirSync(outDir, { recursive: true });

  const template = TEMPLATE_LIBRARY[arg] || TEMPLATE_LIBRARY.ii_V_I_major;
  const progression: ChordSegment[] = template.segments;

  const architecture = generateArchitecture(progression, {
    style,
    seed: Date.now(),
    progressionTemplate: arg,
  });

  const mergedBars: OrchestrationBarPlan[] = [];
  for (const section of architecture.sections) {
    const sectionProg = segmentsForLength(progression, section.length);
    const plan = runEllingtonEngine({
      progression: sectionProg,
      parameters: {
        arrangementMode:
          section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout'
          : section.density === 'sparse' ? 'ballad' : 'classic',
      },
      seed: Date.now() + section.startBar,
    });
    const offset = section.startBar - 1;
    for (const b of plan.bars) {
      mergedBars.push({ ...b, bar: b.bar + offset });
    }
  }
  const arrangementPlan: OrchestrationPlan = {
    bars: mergedBars.sort((a, b) => a.bar - b.bar),
    totalBars: architecture.totalBars,
    progression,
  };

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

  const { musicXmlPath, structurePath, jsonPath } = exportScoreSkeleton(architecture, arrangementPlan, runPath);

  const runSummary = `# Run Summary

**Generated:** ${now.toISOString()}
**Template:** ${arg}
**Style:** ${style}
**Architecture:** ${architecture.name}

## Sections: ${architecture.sections.length}
## Total Bars: ${architecture.totalBars}
## Staves: 17

Outputs: score_skeleton.musicxml, score_structure.md, score_structure.json
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
