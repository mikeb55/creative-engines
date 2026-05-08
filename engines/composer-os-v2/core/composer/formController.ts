/**
 * Phase 4+5 — Harmonic form arcs (pre-plan section roles + tension targets).
 * Roles here describe harmonic/form narrative; distinct from duo {@link SectionRole} statement/contrast labels.
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';

export type FormLike = {
  totalBars: number;
  sections: Array<{ label: string; startBar: number; length: number }>;
};

/** Harmonic arc role — aligns with Phase 4+5 scheduler vocabulary. */
export type HarmonicFormSectionRole =
  | 'intro'
  | 'head'
  | 'development'
  | 'shout-chorus'
  | 'solo-recapitulation'
  | 'collective-improv'
  | 'interval-rotation'
  | 'outro';

export interface FormSection {
  sceneId: string;
  role: HarmonicFormSectionRole;
  barRange: [number, number];
  targetTensionStart: number;
  targetTensionEnd: number;
  motifRecallRequired: boolean;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Partition `tb` bars into segments with integer lengths proportional to `weights`. */
function sliceRanges(tb: number, weights: number[]): [number, number][] {
  const sumW = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.max(1, Math.round((w / sumW) * tb)));
  let diff = parts.reduce((a, b) => a + b, 0) - tb;
  while (diff > 0) {
    const i = parts.indexOf(Math.max(...parts));
    if (parts[i]! > 1) {
      parts[i]!--;
      diff--;
    } else break;
  }
  let addIx = 0;
  while (diff < 0) {
    parts[addIx % parts.length]!++;
    addIx++;
    diff++;
  }
  let bar = 1;
  const out: [number, number][] = [];
  for (const len of parts) {
    const hi = Math.min(tb, bar + len - 1);
    out.push([bar, hi]);
    bar = hi + 1;
    if (bar > tb) break;
  }
  return out;
}

/** Continuous curve: intro(low) → head → development(rising) → peak → recap → outro(low). */
function buildContinuousCurve(tb: number): FormSection[] {
  const ranges = sliceRanges(tb, [8, 14, 22, 12, 22, 12]);
  const roles: HarmonicFormSectionRole[] = [
    'intro',
    'head',
    'development',
    'development',
    'solo-recapitulation',
    'outro',
  ];
  const tensions: [number, number][] = [
    [0.15, 0.22],
    [0.25, 0.38],
    [0.35, 0.72],
    [0.78, 0.92],
    [0.65, 0.35],
    [0.22, 0.08],
  ];
  return ranges.slice(0, Math.min(ranges.length, roles.length)).map((br, i) => ({
    sceneId: `form_${roles[i]}_${i}`,
    role: roles[i]!,
    barRange: br,
    targetTensionStart: tensions[i]![0],
    targetTensionEnd: tensions[i]![1],
    motifRecallRequired: roles[i] === 'head' || roles[i] === 'solo-recapitulation' || roles[i] === 'outro',
  }));
}

/** Suite layout — Mingus gets collective-improv at logical section 3; Threadgill rotates intervals every section. */
function buildSuite(tb: number, voiceId: string): FormSection[] {
  const ranges = sliceRanges(tb, [10, 12, 14, 18, 16]);
  const mingusRoles: HarmonicFormSectionRole[] = [
    'intro',
    'head',
    'collective-improv',
    'development',
    'outro',
  ];
  const threadRoles: HarmonicFormSectionRole[] = [
    'intro',
    'interval-rotation',
    'interval-rotation',
    'development',
    'outro',
  ];
  const roles = voiceId === 'charles_mingus' ? mingusRoles : threadRoles;
  const tens: [number, number][] =
    voiceId === 'charles_mingus'
      ? [[0.2, 0.28], [0.32, 0.45], [0.55, 0.72], [0.48, 0.62], [0.25, 0.12]]
      : [[0.22, 0.3], [0.35, 0.48], [0.42, 0.58], [0.5, 0.68], [0.28, 0.1]];
  return ranges.slice(0, roles.length).map((br, i) => ({
    sceneId: `suite_${roles[i]}_${i}`,
    role: roles[i]!,
    barRange: br,
    targetTensionStart: tens[i]![0],
    targetTensionEnd: tens[i]![1],
    motifRecallRequired: roles[i] === 'head' || roles[i] === 'outro',
  }));
}

/** 12-bar blues units + shout-chorus region after bar 25 when form is long enough. */
function buildBluesBackbone(tb: number): FormSection[] {
  const ranges = sliceRanges(tb, [12, 12, 12, Math.max(4, tb - 36)]);
  const roles: HarmonicFormSectionRole[] = ['head', 'development', 'shout-chorus', 'outro'];
  const tens: [number, number][] = [
    [0.25, 0.42],
    [0.38, 0.58],
    [0.72, 0.88],
    [0.35, 0.12],
  ];
  return ranges.slice(0, roles.length).map((br, i) => ({
    sceneId: `blues_${roles[i]}_${i}`,
    role: roles[i]!,
    barRange: br,
    targetTensionStart: tens[i]![0],
    targetTensionEnd: tens[i]![1],
    motifRecallRequired: roles[i] === 'head' || roles[i] === 'outro',
  }));
}

/** Free arc — harmonic density drives tension; shallow scripted envelope only. */
function buildFree(tb: number, voiceId: string): FormSection[] {
  const ranges = sliceRanges(tb, [15, 25, 35, 25]);
  const roles: HarmonicFormSectionRole[] = ['intro', 'head', 'development', 'outro'];
  const tens: [number, number][] =
    voiceId === 'wayne_shorter'
      ? [[0.28, 0.38], [0.35, 0.52], [0.4, 0.62], [0.38, 0.18]]
      : [[0.22, 0.35], [0.32, 0.48], [0.42, 0.58], [0.32, 0.14]];
  return ranges.slice(0, roles.length).map((br, i) => ({
    sceneId: `free_${roles[i]}_${i}`,
    role: roles[i]!,
    barRange: br,
    targetTensionStart: tens[i]![0],
    targetTensionEnd: tens[i]![1],
    motifRecallRequired: roles[i] === 'head',
  }));
}

/**
 * Build section arc descriptors before golden-path plans.
 * Empty when no bundle (neutral harmony voice).
 */
export function buildFormSections(form: FormLike, bundle: VoiceRuleBundle | undefined): FormSection[] {
  const tb = Math.max(1, form.totalBars);
  if (!bundle) return [];
  const arc = bundle.formPolicy.narrativeArc;
  if (arc === 'continuous-curve') return buildContinuousCurve(tb);
  if (arc === 'suite') return buildSuite(tb, bundle.voiceId);
  if (arc === 'blues-backbone') return buildBluesBackbone(tb);
  return buildFree(tb, bundle.voiceId);
}

export function formDevelopmentSectionHasRisingTension(sections: FormSection[]): boolean {
  const dev = sections.filter((s) => s.role === 'development');
  if (!dev.length) return false;
  return dev.some((s) => s.targetTensionEnd > s.targetTensionStart + 0.08);
}

/** Mingus suite template — third section is collective improv. */
export function mingusSuiteHasCollectiveImprovThird(sections: FormSection[]): boolean {
  return sections.length >= 3 && sections[2]!.role === 'collective-improv';
}

/** Free narrative — no steep scripted peak/outro drop requirement (flat-ish envelopes). */
export function freeFormAvoidsSteepArc(sections: FormSection[]): boolean {
  if (sections.length === 0) return true;
  const span = Math.max(
    ...sections.map((s) => Math.abs(s.targetTensionEnd - s.targetTensionStart))
  );
  return span < 0.85;
}
