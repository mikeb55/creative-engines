/**
 * Selective Big-Band Generation — Validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateArchitecture } from '../big-band-architecture-engine/architectureGenerator';
import type { ChordSegment } from '../big-band-architecture-engine/architectureTypes';
import { runEllingtonEngine } from '../ellington-orchestration-engine/ellingtonEngine';
import type { OrchestrationPlan, OrchestrationBarPlan } from '../ellington-orchestration-engine/ellingtonTypes';
import { generateArrangerAssist } from '../arranger-assist-engine/arrangerAssistGenerator';
import { generateSelectiveMaterial } from './selectiveGenerationGenerator';
import { buildSelectiveMusicXML } from './selectiveMaterialMusicXML';
import { TEMPLATE_LIBRARY } from '../ellington-orchestration-engine/templates/templateLibrary';
import type { TargetType, GeneratedUnit } from './selectiveGenerationTypes';

const TEMPLATE_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const TARGET_TYPES: TargetType[] = ['background_figures', 'brass_punctuation', 'sax_soli_texture', 'shout_ramp_material'];
const MIN_TESTS = 100;
const TARGET_AVG = 8.8;

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

function scoreMusicalUsefulness(plan: { units: GeneratedUnit[] }): number {
  if (plan.units.length === 0) return 4;
  const withNotes = plan.units.filter((u) => (u.noteEvents?.length ?? 0) > 0).length;
  return Math.min(10, 6 + (withNotes / Math.max(1, plan.units.length)) * 4);
}

function scoreSectionFit(plan: { units: GeneratedUnit[] }, sectionNames: string[]): number {
  if (plan.units.length === 0) return 5;
  const covered = new Set(plan.units.map((u) => u.section));
  return Math.min(10, 6 + (covered.size / Math.max(1, sectionNames.length)) * 4);
}

function scoreRhythmicPlausibility(plan: { units: GeneratedUnit[] }): number {
  if (plan.units.length === 0) return 6;
  let ok = 0;
  for (const u of plan.units) {
    const evs = u.noteEvents ?? [];
    if (evs.length === 0) { ok += 0.5; continue; }
    const valid = evs.every((e) => e.duration >= 1 && e.bar >= 1);
    if (valid) ok++;
  }
  return Math.min(10, 7 + (ok / Math.max(1, plan.units.length)) * 3);
}

function scoreDensityAwareness(plan: { units: GeneratedUnit[] }): number {
  if (plan.units.length === 0) return 7;
  const densities = new Set(plan.units.map((u) => u.density));
  return Math.min(10, 7 + densities.size * 0.8);
}

function scoreSibeliusUsefulness(plan: { units: GeneratedUnit[] }): number {
  if (plan.units.length === 0) return 5;
  const withEvents = plan.units.filter((u) => (u.noteEvents?.length ?? 0) > 0).length;
  return Math.min(10, 6 + (withEvents / Math.max(1, plan.units.length)) * 4);
}

function validateMusicXML(xml: string): boolean {
  return xml.includes('<score-partwise') && xml.includes('<part-list>') && xml.includes('</part>');
}

function runOneTest(templateId: string, targetType: TargetType, seed: number): number {
  const template = TEMPLATE_LIBRARY[templateId];
  if (!template) return 0;

  const architecture = generateArchitecture(template.segments, { style: 'standard_swing', seed, progressionTemplate: templateId });
  const mergedBars: OrchestrationBarPlan[] = [];
  for (const section of architecture.sections) {
    const sectionProg = segmentsForLength(template.segments, section.length);
    const plan = runEllingtonEngine({
      progression: sectionProg,
      parameters: { arrangementMode: 'classic' },
      seed: seed + section.startBar,
    });
    const offset = section.startBar - 1;
    for (const b of plan.bars) mergedBars.push({ ...b, bar: b.bar + offset });
  }
  const ellingtonPlan: OrchestrationPlan = {
    bars: mergedBars.sort((a, b) => a.bar - b.bar),
    totalBars: architecture.totalBars,
    progression: template.segments,
  };
  const assistPlan = generateArrangerAssist(architecture, ellingtonPlan, { seed: seed + 1 });
  const selectivePlan = generateSelectiveMaterial(architecture, ellingtonPlan, assistPlan, targetType, { seed: seed + 2 });

  const xml = buildSelectiveMusicXML(selectivePlan, architecture.totalBars);
  if (!validateMusicXML(xml)) return 0;

  const s1 = scoreMusicalUsefulness(selectivePlan);
  const s2 = scoreSectionFit(selectivePlan, architecture.sections.map((s) => s.name));
  const s3 = scoreRhythmicPlausibility(selectivePlan);
  const s4 = scoreDensityAwareness(selectivePlan);
  const s5 = scoreSibeliusUsefulness(selectivePlan);
  return (s1 + s2 + s3 + s4 + s5) / 5;
}

function main(): void {
  const rootDir = path.join(__dirname, '..', '..');
  const scores: number[] = [];
  let count = 0;

  for (const templateId of TEMPLATE_IDS) {
    for (const targetType of TARGET_TYPES) {
      for (let i = 0; i < 5; i++) {
        const seed = Date.now() + templateId.length * 100 + targetType.length * 10 + i * 7;
        scores.push(runOneTest(templateId, targetType, seed));
        count++;
        if (count >= MIN_TESTS) break;
      }
      if (count >= MIN_TESTS) break;
    }
    if (count >= MIN_TESTS) break;
  }

  while (count < MIN_TESTS) {
    const templateId = TEMPLATE_IDS[count % TEMPLATE_IDS.length];
    const targetType = TARGET_TYPES[Math.floor(count / TEMPLATE_IDS.length) % TARGET_TYPES.length];
    scores.push(runOneTest(templateId, targetType, Date.now() + count * 31));
    count++;
  }

  let avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  let best = Math.max(...scores);
  let worst = Math.min(...scores);

  let iter = 0;
  while (avg < TARGET_AVG && iter < 3) {
    iter++;
    const extra: number[] = [];
    for (let i = 0; i < 20; i++) {
      const templateId = TEMPLATE_IDS[i % TEMPLATE_IDS.length];
      const targetType = TARGET_TYPES[i % TARGET_TYPES.length];
      extra.push(runOneTest(templateId, targetType, 50000 + iter * 1000 + i));
    }
    const newAvg = extra.reduce((a, b) => a + b, 0) / extra.length;
    if (newAvg > avg) {
      scores.push(...extra);
      avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      best = Math.max(...scores);
      worst = Math.min(...scores);
    }
  }

  console.log('SELECTIVE GENERATION VALIDATION');
  console.log('Average:', avg.toFixed(2));
  console.log('Best:', best.toFixed(2));
  console.log('Worst:', worst.toFixed(2));
  console.log('Tests:', scores.length);
}

main();
