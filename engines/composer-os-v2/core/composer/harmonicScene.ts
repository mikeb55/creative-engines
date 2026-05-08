/**
 * Phase 3a/3b — HarmonicScene session objects (tension + structural hints).
 */

import type { MotifCell2, ThemeGenome } from '../motif/themeGenome';
import type { FormSection, HarmonicFormSectionRole } from './formController';
import type { VoiceRuleBundle } from './voiceRuleBundle';

export interface HarmonicScene {
  sceneId: string;
  tensionLevel: number;
  dominantVoicingColor: string;
  activeMotifIds: string[];
  barRange: [number, number];
  /** Threadgill — rotates interval-set family at scene boundaries. */
  threadgillIntervalFamily?: number;
}

/** One stub scene per form section. */
export function buildHarmonicSceneStubs(form: {
  sections: Array<{ label: string; startBar: number; length: number }>;
  totalBars: number;
}): HarmonicScene[] {
  return form.sections.map((s, idx) => ({
    sceneId: `harmonic_scene_${s.label.replace(/\s+/g, '_')}_${idx}`,
    tensionLevel: Math.min(1, Math.max(0, 0.25 + idx * 0.08)),
    dominantVoicingColor: 'neutral',
    activeMotifIds: [],
    barRange: [s.startBar, s.startBar + s.length - 1],
  }));
}

/** Threadgill closed interval families (pitch-class interval classes). */
const THREADGILL_IC_FAMILIES: readonly (readonly number[])[] = [
  [1, 2, 3],
  [5, 6, 7],
  [8, 10],
];

function intervalClassesFromMotif(cell: MotifCell2): Set<number> {
  return new Set(cell.intervals.map((x) => Math.abs(x) % 12));
}

function motifAllowedForThreadgillFamily(cell: MotifCell2, familyIdx: number): boolean {
  const allowed = new Set(THREADGILL_IC_FAMILIES[familyIdx % THREADGILL_IC_FAMILIES.length]!);
  const ics = intervalClassesFromMotif(cell);
  if (ics.size === 0) return false;
  for (const ic of ics) {
    if (!allowed.has(ic)) return false;
  }
  return true;
}

/** Motifs whose interval classes lie entirely in the active Threadgill family slot (empty → full recall pool). */
export function threadgillMotifIdsMatchingFamily(genome: ThemeGenome, familyIdx: number): string[] {
  const ids: string[] = [];
  for (const c of [genome.primaryCell, genome.secondaryCell, genome.bridgeCell, genome.cadentialTail]) {
    if (c && motifAllowedForThreadgillFamily(c, familyIdx)) ids.push(c.id);
  }
  return ids;
}

/** Schneider two-halves arc + Threadgill rotation slots; default stub otherwise. Optional {@link ThemeGenome} fills activeMotifIds. */
export function buildHarmonicScenesForVoiceBundle(
  form: { sections: Array<{ label: string; startBar: number; length: number }>; totalBars: number },
  bundle: VoiceRuleBundle,
  genome?: ThemeGenome
): HarmonicScene[] {
  const tb = form.totalBars;
  if (bundle.voiceId === 'maria_schneider') {
    const half = Math.max(1, Math.floor(tb / 2));
    const devIds =
      genome != null ? activeMotifIdsForHarmonicRole('development', genome) : ([] as string[]);
    const recapIds =
      genome != null ? activeMotifIdsForHarmonicRole('solo-recapitulation', genome) : ([] as string[]);
    return [
      {
        sceneId: 'schneider_development_half',
        tensionLevel: 0.45,
        dominantVoicingColor: 'neutral',
        activeMotifIds: devIds,
        barRange: [1, half],
      },
      {
        sceneId: 'schneider_recapitulation_half',
        tensionLevel: 0.55,
        dominantVoicingColor: 'neutral',
        activeMotifIds: recapIds,
        barRange: [half + 1, tb],
      },
    ];
  }
  if (bundle.voiceId === 'henry_threadgill') {
    return form.sections.map((s, idx) => ({
      sceneId: `threadgill_scene_${s.label.replace(/\s+/g, '_')}_${idx}`,
      tensionLevel: Math.min(1, 0.3 + idx * 0.07),
      dominantVoicingColor: 'neutral',
      activeMotifIds:
        genome != null ? threadgillMotifIdsMatchingFamily(genome, idx % 3) : ([] as string[]),
      barRange: [s.startBar, s.startBar + s.length - 1],
      threadgillIntervalFamily: idx % 3,
    }));
  }
  return buildHarmonicSceneStubs(form);
}

/** Effective tension at bar (Schneider rising/falling halves). Optional Phase 4+5 scheduled envelope overrides scene lookup. */
export function tensionLevelForBar(
  bar: number,
  bundle: VoiceRuleBundle,
  scenes: HarmonicScene[],
  scheduledByBar?: number[] | null
): number {
  if (scheduledByBar && bar >= 1 && bar <= scheduledByBar.length) {
    const v = scheduledByBar[bar - 1];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      return Math.min(1, Math.max(0, v));
    }
  }
  if (bundle.voiceId === 'maria_schneider' && scenes.length >= 2) {
    const tb = Math.max(...scenes.map((s) => s.barRange[1]), bar);
    const half = Math.floor(tb / 2);
    if (bar <= half) {
      const span = Math.max(half - 1, 1);
      return 0.25 + (0.55 * (bar - 1)) / span;
    }
    const span = Math.max(tb - half - 1, 1);
    return 0.8 - (0.55 * (bar - half - 1)) / span;
  }
  const sc = scenes.find((s) => bar >= s.barRange[0] && bar <= s.barRange[1]);
  return sc?.tensionLevel ?? 0.5;
}

export function activeSceneForBar(bar: number, scenes: HarmonicScene[]): HarmonicScene | undefined {
  return scenes.find((s) => bar >= s.barRange[0] && bar <= s.barRange[1]);
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Mirrors {@link voicingColorForTension} — kept local to avoid cyclic import with tensionScheduler. */
function dominantVoicingColorForTensionLevel(t: number): string {
  if (t < 0.3) return 'stable';
  if (t < 0.6) return 'modal';
  if (t < 0.8) return 'altered';
  return 'tritone-sus';
}

/** ThemeGenome motif ids eligible for recall in this harmonic role (empty → full pool). */
export function activeMotifIdsForHarmonicRole(role: HarmonicFormSectionRole, genome: ThemeGenome): string[] {
  const p = genome.primaryCell.id;
  const secId = genome.secondaryCell?.id;
  switch (role) {
    case 'intro':
      return [p];
    case 'development':
      return secId ? [p, secId] : [p];
    case 'shout-chorus':
      return [p];
    case 'outro':
      return [p];
    case 'solo-recapitulation':
      return [p];
    default:
      return [];
  }
}

function sceneTensionFromScheduled(scheduled: number[] | undefined, lo: number, hi: number): number {
  if (!scheduled?.length) return 0.5;
  let sum = 0;
  let c = 0;
  for (let b = lo; b <= hi; b++) {
    if (b >= 1 && b <= scheduled.length) {
      sum += scheduled[b - 1]!;
      c++;
    }
  }
  return c ? clamp01(sum / c) : 0.5;
}

/**
 * One HarmonicScene per {@link FormSection}, aligned with ThemeGenome motif ids + shout/outro overrides.
 * Call after {@link applyTensionScheduleToContext} so `scheduledTensionByBar` can inform non-fixed scenes.
 */
export function buildHarmonicScenesFromFormPlan(
  formSections: FormSection[],
  genome: ThemeGenome,
  scheduledTensionByBar: number[] | undefined,
  bundle?: VoiceRuleBundle
): HarmonicScene[] {
  return formSections.map((sec, idx) => {
    const [lo, hi] = sec.barRange;
    let activeMotifIds = activeMotifIdsForHarmonicRole(sec.role, genome);
    if (bundle?.voiceId === 'henry_threadgill') {
      if (sec.role === 'shout-chorus' || sec.role === 'outro') {
        activeMotifIds = activeMotifIdsForHarmonicRole(sec.role, genome);
      } else {
        activeMotifIds = threadgillMotifIdsMatchingFamily(genome, idx % 3);
      }
    }
    let tensionLevel: number;
    let dominantVoicingColor: string;

    if (sec.role === 'shout-chorus') {
      tensionLevel = 0.95;
      dominantVoicingColor = dominantVoicingColorForTensionLevel(0.95);
    } else if (sec.role === 'outro') {
      tensionLevel = 0.1;
      dominantVoicingColor = 'stable';
    } else {
      tensionLevel = sceneTensionFromScheduled(scheduledTensionByBar, lo, hi);
      dominantVoicingColor = dominantVoicingColorForTensionLevel(tensionLevel);
    }

    const scene: HarmonicScene = {
      sceneId: sec.sceneId,
      tensionLevel,
      dominantVoicingColor,
      activeMotifIds,
      barRange: [lo, hi],
    };
    if (bundle?.voiceId === 'henry_threadgill') {
      scene.threadgillIntervalFamily = idx % 3;
    }
    return scene;
  });
}
