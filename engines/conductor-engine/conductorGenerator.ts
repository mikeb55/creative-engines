/**
 * Conductor Engine — Main generator
 * Orchestrates: form → harmony → counterpoint → orchestration → architecture → export
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  CompositionRequest,
  CompositionArchitecture,
  FormStructure,
  ChordSegment,
  EngineCall,
  GenerationResult,
} from './conductorTypes';
import { generateWybleEtudeFromProgression } from '../jimmy-wyble-engine/wybleEtudeGenerator';
import { runContemporaryCounterpointEngine } from '../contemporary-counterpoint-engine/counterpointEngine';
import { runEllingtonEngine } from '../ellington-orchestration-engine/ellingtonEngine';
import { generateArchitecture } from '../big-band-architecture-engine/architectureGenerator';

// Form templates (bars per section)
const FORM_TEMPLATES: Record<string, { sections: { name: string; length: number }[] }> = {
  AABA: {
    sections: [
      { name: 'A', length: 8 },
      { name: 'A', length: 8 },
      { name: 'B', length: 8 },
      { name: 'A', length: 8 },
    ],
  },
  blues: {
    sections: [
      { name: 'Blues A', length: 4 },
      { name: 'Blues A', length: 4 },
      { name: 'Blues B', length: 4 },
    ],
  },
  rhythm_changes: {
    sections: [
      { name: 'A', length: 8 },
      { name: 'A', length: 8 },
      { name: 'B', length: 8 },
      { name: 'A', length: 8 },
    ],
  },
  through_composed: {
    sections: [
      { name: 'A', length: 8 },
      { name: 'B', length: 8 },
      { name: 'C', length: 8 },
      { name: 'D', length: 8 },
    ],
  },
  custom: {
    sections: [{ name: 'Section', length: 16 }],
  },
};

// Progression templates from Ellington engine
const PROGRESSION_TEMPLATES: Record<string, ChordSegment[]> = {
  ii_V_I_major: [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
  ],
  jazz_blues: [
    { chord: 'F7', bars: 4 },
    { chord: 'Bb7', bars: 2 },
    { chord: 'F7', bars: 2 },
    { chord: 'C7', bars: 2 },
    { chord: 'Bb7', bars: 2 },
  ],
  rhythm_changes_A: [
    { chord: 'Bb6', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cm7', bars: 2 },
    { chord: 'F7', bars: 2 },
  ],
  beatrice_A: [
    { chord: 'Fmaj7', bars: 2 },
    { chord: 'Gbmaj7#11', bars: 2 },
    { chord: 'Fmaj7', bars: 2 },
    { chord: 'Emaj7#11', bars: 2 },
    { chord: 'Dm7', bars: 2 },
    { chord: 'Ebmaj7#11', bars: 2 },
    { chord: 'Dm7', bars: 2 },
    { chord: 'Cm7', bars: 1 },
    { chord: 'Bb7', bars: 1 },
  ],
  orbit_A: [
    { chord: 'Fmaj7b5', bars: 2 },
    { chord: 'G#11/Eb', bars: 2 },
    { chord: 'Dbmaj7', bars: 2 },
    { chord: 'Bmaj7', bars: 2 },
    { chord: 'Bbm9', bars: 2 },
    { chord: 'Abmaj13', bars: 2 },
    { chord: 'Gbmaj7', bars: 2 },
    { chord: 'Emaj9', bars: 2 },
  ],
};

function resolveForm(progression: ChordSegment[], form: string): FormStructure {
  const totalBars = progression.reduce((s, seg) => s + seg.bars, 0);
  const template = FORM_TEMPLATES[form] ?? FORM_TEMPLATES.AABA;
  let bar = 1;
  const sections = template.sections.map((sec) => {
    const len = Math.min(sec.length, totalBars - bar + 1);
    const out = { name: sec.name, startBar: bar, length: len };
    bar += len;
    return out;
  });
  return { template: form as any, sections, totalBars };
}

function resolveProgression(req: CompositionRequest): ChordSegment[] {
  if (req.progression && req.progression.length > 0) {
    return req.progression.map((c) => ({ chord: c, bars: 1 }));
  }
  const templateId = req.progressionTemplate ?? 'ii_V_I_major';
  const template = PROGRESSION_TEMPLATES[templateId] ?? PROGRESSION_TEMPLATES.ii_V_I_major;
  return template.map((s) => ({ ...s }));
}

function cycleProgressionToBars(progression: ChordSegment[], targetBars: number): ChordSegment[] {
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

function callWybleEngine(progression: ChordSegment[]): EngineCall {
  try {
    const result = generateWybleEtudeFromProgression(progression);
    return { engine: 'wyble', input: progression, output: result, success: true };
  } catch (e) {
    return {
      engine: 'wyble',
      input: progression,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function callContemporaryCounterpoint(
  progression: ChordSegment[],
  seed: number
): EngineCall {
  try {
    const out = runContemporaryCounterpointEngine({
      harmonicContext: progression,
      parameters: { lineCount: 2 },
      seed,
    });
    return { engine: 'contemporary_counterpoint', input: progression, output: out, success: true };
  } catch (e) {
    return {
      engine: 'contemporary_counterpoint',
      input: progression,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function callEllingtonEngine(progression: ChordSegment[], seed: number): EngineCall {
  try {
    const plan = runEllingtonEngine({ progression, seed });
    return { engine: 'ellington', input: progression, output: plan, success: true };
  } catch (e) {
    return {
      engine: 'ellington',
      input: progression,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function callArchitectureEngine(progression: ChordSegment[], seed: number): EngineCall {
  try {
    const arch = generateArchitecture(progression, { style: 'standard_swing', seed });
    return { engine: 'big_band_architecture', input: progression, output: arch, success: true };
  } catch (e) {
    return {
      engine: 'big_band_architecture',
      input: progression,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function generateComposition(
  request: CompositionRequest,
  outputDir?: string
): GenerationResult {
  const seed = request.seed ?? Date.now();
  const engineCalls: EngineCall[] = [];

  const progression = resolveProgression(request);
  const formStructure = resolveForm(progression, request.form);

  const fullProgression = cycleProgressionToBars(progression, formStructure.totalBars);

  if (request.counterpointMode === 'wyble' || request.style === 'guitar_duo') {
    const wybleCall = callWybleEngine(fullProgression);
    engineCalls.push(wybleCall);
  }
  if (request.counterpointMode === 'contemporary' || request.style === 'chamber_jazz') {
    const cpCall = callContemporaryCounterpoint(fullProgression, seed);
    engineCalls.push(cpCall);
  }

  if (request.orchestrationMode === 'ellington' || request.style === 'big_band') {
    const ellCall = callEllingtonEngine(fullProgression, seed);
    engineCalls.push(ellCall);
  }

  const archCall = callArchitectureEngine(fullProgression, seed);
  engineCalls.push(archCall);

  const architecture: CompositionArchitecture = {
    request,
    formStructure,
    progression: fullProgression,
    orchestrationPlan: engineCalls.find((c) => c.engine === 'ellington')?.output as any,
    architecturePlan: architecturePlanFromCall(archCall),
    engineCalls,
    generatedAt: new Date().toISOString(),
  };

  const result: GenerationResult = { success: true, architecture };

  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const planPath = path.join(outputDir, 'composition_plan.md');
    const archPath = path.join(outputDir, 'composition_architecture.json');
    const scorePath = path.join(outputDir, 'composition_score.musicxml');

    fs.writeFileSync(planPath, renderCompositionPlan(architecture), 'utf-8');
    fs.writeFileSync(archPath, JSON.stringify(architecture, null, 2), 'utf-8');
    fs.writeFileSync(scorePath, renderMinimalMusicXML(architecture), 'utf-8');

    result.compositionPlanPath = planPath;
    result.architectureJsonPath = archPath;
    result.scoreMusicPath = scorePath;
  }

  return result;
}

function architecturePlanFromCall(call: EngineCall): CompositionArchitecture['architecturePlan'] {
  if (!call.success || !call.output) return undefined;
  const out = call.output as any;
  return {
    id: out.id ?? 'arch',
    name: out.name ?? 'Architecture',
    sections: out.sections ?? [],
    totalBars: out.totalBars ?? 0,
    progressionTemplate: out.progressionTemplate ?? 'custom',
  };
}

function renderCompositionPlan(arch: CompositionArchitecture): string {
  const lines: string[] = [
    '# Composition Plan',
    '',
    `Generated: ${arch.generatedAt}`,
    `Style: ${arch.request.style}`,
    `Form: ${arch.request.form}`,
    `Total bars: ${arch.formStructure.totalBars}`,
    '',
    '## Sections',
  ];
  for (const s of arch.formStructure.sections) {
    lines.push(`- ${s.name}: bars ${s.startBar}-${s.startBar + s.length - 1} (${s.length} bars)`);
  }
  lines.push('', '## Progression');
  for (const seg of arch.progression) {
    lines.push(`- ${seg.chord} (${seg.bars} bars)`);
  }
  lines.push('', '## Engine Calls');
  for (const c of arch.engineCalls) {
    lines.push(`- ${c.engine}: ${c.success ? 'OK' : 'FAILED'}`);
  }
  return lines.join('\n');
}

function renderMinimalMusicXML(arch: CompositionArchitecture): string {
  const bars = arch.formStructure.totalBars;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.0">
  <work><work-title>Conductor Composition</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    ${Array.from({ length: bars }, (_, i) =>
      `<measure number="${i + 1}">
      <attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>4</duration></note>
    </measure>`
    ).join('\n    ')}
  </part>
</score-partwise>`;
}
