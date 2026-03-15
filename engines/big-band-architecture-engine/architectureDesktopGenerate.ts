/**
 * Big Band Architecture Desktop Generator — Run by Electron app
 * Generates architecture, connects to Ellington, exports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateArchitecture } from './architectureGenerator';
import type { ArrangementArchitecture, ChordSegment } from './architectureTypes';
import { runEllingtonEngine } from '../ellington-orchestration-engine/ellingtonEngine';
import { TEMPLATE_LIBRARY } from '../ellington-orchestration-engine/templates/templateLibrary';

const PROGRESSION_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'] as const;

function main(): { runFolderPath: string; architecture: ArrangementArchitecture; error?: string } {
  const arg = process.argv[2] || 'ii_V_I_major';
  const styleArg = (process.argv[3] || 'standard_swing') as (typeof STYLES)[number];
  const style = STYLES.includes(styleArg) ? styleArg : 'standard_swing';

  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs');
  fs.mkdirSync(outDir, { recursive: true });

  const template = TEMPLATE_LIBRARY[arg] || TEMPLATE_LIBRARY.ii_V_I_major;
  const progression: ChordSegment[] = template.segments;

  const architecture = generateArchitecture(progression, {
    style,
    seed: Date.now(),
    progressionTemplate: arg,
  });

  for (const section of architecture.sections) {
    const segs = progression.slice(0, Math.ceil(section.length / 4) + 1);
    const sectionProg = segs.length > 0 ? segs : progression;
    runEllingtonEngine({
      progression: sectionProg,
      parameters: {
        arrangementMode:
          section.leadSection === 'brass' || section.leadSection === 'trumpets'
            ? 'shout'
            : section.densityLevel === 'sparse'
              ? 'ballad'
              : 'classic',
      },
      seed: Date.now() + section.startBar,
    });
  }

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
    path.join(runPath, 'architecture.json'),
    JSON.stringify(architecture, null, 2),
    'utf-8'
  );

  const archMd = `# Big Band Architecture

## ${architecture.name}

| Section | Role | Bars | Lead | Density |
|---------|------|------|------|---------|
${architecture.sections.map((s) => `| ${s.name} | ${s.role} | ${s.startBar}-${s.startBar + s.length - 1} (${s.length}) | ${s.leadSection} | ${s.densityLevel} |`).join('\n')}

## Total: ${architecture.totalBars} bars
`;
  fs.writeFileSync(path.join(runPath, 'architecture.md'), archMd, 'utf-8');

  const planMd = `# Arrangement Plan

Progression: ${arg}
Style: ${style}

${architecture.sections.map((s) => `## ${s.name} (bars ${s.startBar}-${s.startBar + s.length - 1})
- Lead: ${s.leadSection}
- Density: ${s.densityLevel}
- ${s.notes}
`).join('\n')}
`;
  fs.writeFileSync(path.join(runPath, 'arrangement_plan.md'), planMd, 'utf-8');

  return { runFolderPath: runPath, architecture };
}

try {
  const result = main();
  console.log(JSON.stringify(result));
} catch (e) {
  console.log(JSON.stringify({ runFolderPath: '', architecture: null, error: String(e) }));
  process.exit(1);
}
