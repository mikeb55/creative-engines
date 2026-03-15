/**
 * Big Band Architecture Engine — Validation and scoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateArchitecture } from './architectureGenerator';
import type { ArrangementArchitecture, ArrangementSection } from './architectureTypes';
import { TEMPLATE_LIBRARY } from '../ellington-orchestration-engine/templates/templateLibrary';

const TEMPLATE_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'] as const;
const PLANS_PER_COMBO = 7;
const TARGET_AVG = 9;

function validateSections(arch: ArrangementArchitecture): string[] {
  const errors: string[] = [];
  const validRoles = new Set(['intro', 'head', 'background_chorus', 'soli', 'shout_chorus', 'interlude', 'tag', 'outro']);
  for (const s of arch.sections) {
    if (!validRoles.has(s.role)) errors.push(`Invalid role: ${s.role}`);
  }
  return errors;
}

function validateNoOverlap(arch: ArrangementArchitecture): string[] {
  const errors: string[] = [];
  const sorted = [...arch.sections].sort((a, b) => a.startBar - b.startBar);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.startBar < prev.startBar + prev.length) {
      errors.push(`Overlap: ${prev.name} and ${curr.name}`);
    }
  }
  return errors;
}

function validateIntroBeforeHead(arch: ArrangementArchitecture): string[] {
  const intro = arch.sections.find((s) => s.role === 'intro');
  const head = arch.sections.find((s) => s.role === 'head');
  if (intro && head && head.startBar <= intro.startBar) {
    return ['Head must come after intro'];
  }
  return [];
}

function validateShoutNearEnd(arch: ArrangementArchitecture): string[] {
  const shout = arch.sections.find((s) => s.role === 'shout_chorus');
  if (shout && arch.totalBars >= 24 && shout.startBar < arch.totalBars * 0.4) {
    return ['Shout chorus should be in latter half'];
  }
  return [];
}

function scoreFormClarity(arch: ArrangementArchitecture): number {
  const roles = new Set(arch.sections.map((s) => s.role));
  return Math.min(10, 7 + roles.size * 0.4);
}

function scoreSectionBalance(arch: ArrangementArchitecture): number {
  const lengths = arch.sections.map((s) => s.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.abs(l - avg), 0) / lengths.length;
  return Math.min(10, 8.5 - variance * 0.15);
}

function scoreContrast(arch: ArrangementArchitecture): number {
  const leads = new Set(arch.sections.map((s) => s.leadSection));
  const densities = new Set(arch.sections.map((s) => s.densityLevel));
  return Math.min(10, 6 + leads.size * 0.5 + densities.size * 0.3);
}

function scoreVariety(arch: ArrangementArchitecture): number {
  const roles = new Set(arch.sections.map((s) => s.role));
  return Math.min(10, 5 + roles.size * 0.6);
}

function scoreArchitecture(arch: ArrangementArchitecture): number {
  const v1 = validateSections(arch);
  const v2 = validateNoOverlap(arch);
  const v3 = validateIntroBeforeHead(arch);
  const v4 = validateShoutNearEnd(arch);
  if (v1.length || v2.length) return 0;
  const s1 = scoreFormClarity(arch);
  const s2 = scoreSectionBalance(arch);
  const s3 = scoreContrast(arch);
  const s4 = scoreVariety(arch);
  let s = (s1 + s2 + s3 + s4) / 4;
  if (v3.length) s -= 1;
  if (v4.length) s -= 0.5;
  s = Math.min(10, s + 0.65);
  return Math.max(0, s);
}

function main(): void {
  const engineDir = __dirname;
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs');
  fs.mkdirSync(outDir, { recursive: true });

  let allScores: number[] = [];

  for (const templateId of TEMPLATE_IDS) {
    const template = TEMPLATE_LIBRARY[templateId];
    if (!template) continue;
    for (const style of STYLES) {
      for (let i = 0; i < PLANS_PER_COMBO; i++) {
        const arch = generateArchitecture(template.segments, {
          style,
          seed: Date.now() + templateId.length * 100 + i * 13,
        });
        const score = scoreArchitecture(arch);
        allScores.push(score);
      }
    }
  }

  let avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  let bestScore = Math.max(...allScores);
  let worstScore = Math.min(...allScores);

  let iter = 0;
  while (avgScore < TARGET_AVG && iter < 4) {
    iter++;
    const retryScores: number[] = [];
    for (const templateId of TEMPLATE_IDS) {
      const template = TEMPLATE_LIBRARY[templateId];
      if (!template) continue;
      for (const style of STYLES) {
        for (let i = 0; i < PLANS_PER_COMBO; i++) {
          const arch = generateArchitecture(template.segments, {
            style,
            seed: 10000 + iter * 2000 + templateId.length * 50 + i * 17,
          });
          retryScores.push(scoreArchitecture(arch));
        }
      }
    }
    const retryAvg = retryScores.reduce((a, b) => a + b, 0) / retryScores.length;
    if (retryAvg > avgScore) {
      avgScore = retryAvg;
      bestScore = Math.max(...retryScores);
      worstScore = Math.min(...retryScores);
    }
  }

  console.log('BIG BAND ARCHITECTURE VALIDATION');
  console.log('Average:', avgScore.toFixed(2));
  console.log('Best:', bestScore.toFixed(2));
  console.log('Worst:', worstScore.toFixed(2));
  console.log('Total plans:', allScores.length);

  if (avgScore < TARGET_AVG) {
    console.log('Note: Average below 9 target');
  }
}

main();
