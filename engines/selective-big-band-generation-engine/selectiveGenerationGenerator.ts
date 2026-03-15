/**
 * Selective Big-Band Generation Engine — Note-level material generator
 */

import type { ArrangementArchitecture } from '../big-band-architecture-engine/architectureTypes';
import type { OrchestrationPlan } from '../ellington-orchestration-engine/ellingtonTypes';
import type { ArrangerAssistPlan } from '../arranger-assist-engine/arrangerAssistTypes';
import type { SelectiveMaterialPlan, TargetType, GeneratedUnit, SelectiveGenerationParameters } from './selectiveGenerationTypes';
import {
  createBackgroundFigure,
  createBrassPunctuation,
  createSaxSoliTexture,
  createShoutRampMaterial,
} from './selectiveGenerationTemplates';

const SAX_STAFF_IDS = ['P1', 'P2', 'P3', 'P4', 'P5'];
const BRASS_STAFF_IDS = ['P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13'];

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getChordForBar(plan: OrchestrationPlan, bar: number): string {
  for (const b of plan.bars) {
    if (b.bar === bar) return b.chord;
  }
  let acc = 0;
  for (const s of plan.progression) {
    acc += s.bars;
    if (bar <= acc) return s.chord;
  }
  return plan.progression[plan.progression.length - 1]?.chord ?? 'Cmaj7';
}

export function generateSelectiveMaterial(
  architecturePlan: ArrangementArchitecture,
  ellingtonPlan: OrchestrationPlan,
  arrangerAssistPlan: ArrangerAssistPlan,
  targetType: TargetType,
  parameters: SelectiveGenerationParameters = {}
): SelectiveMaterialPlan {
  const seed = parameters.seed ?? Date.now();
  const rnd = seededRandom(seed);

  const units: GeneratedUnit[] = [];

  const suggestions = arrangerAssistPlan.suggestions.filter((s) => {
    if (targetType === 'background_figures') return s.role === 'background_figure';
    if (targetType === 'brass_punctuation') return s.role === 'punctuation';
    if (targetType === 'sax_soli_texture') return s.role === 'soli_texture';
    if (targetType === 'shout_ramp_material') return s.role === 'shout_ramp';
    return false;
  });

  for (const sug of suggestions) {
    const { startBar, endBar } = sug.barRange;
    const length = endBar - startBar + 1;
    const chord = getChordForBar(ellingtonPlan, startBar);

    if (targetType === 'background_figures') {
      units.push(createBackgroundFigure(sug.section, startBar, length, chord, sug.density, SAX_STAFF_IDS.slice(0, 4), rnd));
    } else if (targetType === 'brass_punctuation') {
      units.push(createBrassPunctuation(sug.section, startBar, chord, BRASS_STAFF_IDS.slice(0, 4), rnd));
    } else if (targetType === 'sax_soli_texture') {
      units.push(createSaxSoliTexture(sug.section, startBar, length, chord, SAX_STAFF_IDS, rnd));
    } else if (targetType === 'shout_ramp_material') {
      const phase = (sug as any).subtype ?? 'intensification';
      units.push(createShoutRampMaterial(sug.section, startBar, length, chord, phase, BRASS_STAFF_IDS, rnd));
    }
  }

  if (units.length === 0) {
    for (const section of architecturePlan.sections) {
      const startBar = section.startBar;
      const length = section.length;
      const chord = getChordForBar(ellingtonPlan, startBar);
      if (targetType === 'background_figures' && (section.role === 'intro' || section.role === 'background_chorus' || section.role === 'head')) {
        units.push(createBackgroundFigure(section.name, startBar, Math.min(4, length), chord, section.density, SAX_STAFF_IDS.slice(0, 4), rnd));
      } else if (targetType === 'brass_punctuation' && section.role !== 'intro') {
        units.push(createBrassPunctuation(section.name, startBar, chord, BRASS_STAFF_IDS.slice(0, 4), rnd));
      } else if (targetType === 'sax_soli_texture' && section.role === 'soli') {
        units.push(createSaxSoliTexture(section.name, startBar, length, chord, SAX_STAFF_IDS, rnd));
      } else if (targetType === 'shout_ramp_material' && section.role === 'shout_chorus') {
        units.push(createShoutRampMaterial(section.name, startBar, length, chord, 'intensification', BRASS_STAFF_IDS, rnd));
      }
    }
  }
  if (units.length === 0) {
    const section = architecturePlan.sections[0];
    if (section) {
      const chord = getChordForBar(ellingtonPlan, section.startBar);
      if (targetType === 'background_figures') units.push(createBackgroundFigure(section.name, section.startBar, Math.min(4, section.length), chord, 'medium', SAX_STAFF_IDS.slice(0, 4), rnd));
      else if (targetType === 'brass_punctuation') units.push(createBrassPunctuation(section.name, section.startBar, chord, BRASS_STAFF_IDS.slice(0, 4), rnd));
      else if (targetType === 'sax_soli_texture') units.push(createSaxSoliTexture(section.name, section.startBar, section.length, chord, SAX_STAFF_IDS, rnd));
      else units.push(createShoutRampMaterial(section.name, section.startBar, section.length, chord, 'intensification', BRASS_STAFF_IDS, rnd));
    }
  }

  const id = `selective_${targetType}_${architecturePlan.id}_${seed}`;
  return {
    id,
    targetType,
    architectureName: architecturePlan.name,
    totalBars: architecturePlan.totalBars,
    units,
    generatedAt: new Date().toISOString(),
  };
}
