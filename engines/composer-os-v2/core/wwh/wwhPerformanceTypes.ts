/**
 * WWH Performance Composer V7.0 — typed Performance Plan.
 * Structured cues only. No natural-language parser.
 */

export type WwhFreedom = 'locked' | 'minimal' | 'lyrical' | 'adventurous';

export type WwhOutputKind = 'performance' | 'leadsheet' | 'guitar_study' | 'bass_partner' | 'all';

export interface WwhHarmonySpec {
  root: string;
  alter?: number;
  kind: string;
  text?: string;
  bass?: string;
  bassAlter?: number;
}

export interface WwhAtom {
  rest: boolean;
  step?: string;
  alter?: number;
  octave?: number;
  /** Duration in divisions. Divisions per quarter is 256 unless a score says otherwise. */
  divisions: number;
  type: string;
  dots?: number;
  chord?: boolean;
  fermata?: boolean;
  tieStart?: boolean;
  tieStop?: boolean;
  timeModification?: { actualNotes: number; normalNotes: number; normalType: string };
  /** Printed syllable only. Does not add a pitch. */
  lyric?: string;
}

export interface WwhDurSpec {
  divisions: number;
  type: string;
  dots: number;
}

export const WWH_DIVISIONS = 256;

export const WWH_DUR: Record<string, WwhDurSpec> = {
  whole: { divisions: 1024, type: 'whole', dots: 0 },
  half: { divisions: 512, type: 'half', dots: 0 },
  'half.': { divisions: 768, type: 'half', dots: 1 },
  quarter: { divisions: 256, type: 'quarter', dots: 0 },
  'quarter.': { divisions: 384, type: 'quarter', dots: 1 },
  eighth: { divisions: 128, type: 'eighth', dots: 0 },
  '16th': { divisions: 64, type: '16th', dots: 0 },
};

export function wwhNote(
  step: string,
  octave: number,
  dur: keyof typeof WWH_DUR | string,
  alter = 0,
  fermata = false
): WwhAtom {
  const spec = WWH_DUR[dur];
  if (!spec) throw new Error(`unknown duration ${dur}`);
  return {
    rest: false,
    step,
    alter,
    octave,
    divisions: spec.divisions,
    type: spec.type,
    dots: spec.dots,
    fermata,
  };
}

export function wwhRest(dur: keyof typeof WWH_DUR | string): WwhAtom {
  const spec = WWH_DUR[dur];
  if (!spec) throw new Error(`unknown duration ${dur}`);
  return { rest: true, divisions: spec.divisions, type: spec.type, dots: spec.dots };
}

export function wwhDyad(
  low: [string, number, number],
  high: [string, number, number],
  dur: keyof typeof WWH_DUR | string
): WwhAtom[] {
  const a = wwhNote(low[0], low[1], dur, low[2]);
  const b = wwhNote(high[0], high[1], dur, high[2]);
  b.chord = true;
  return [a, b];
}

/** Close-position stack. First note carries the duration. The rest are chord tones. */
export function wwhTriad(
  low: [string, number, number],
  mid: [string, number, number],
  high: [string, number, number],
  dur: keyof typeof WWH_DUR | string
): WwhAtom[] {
  const a = wwhNote(low[0], low[1], dur, low[2]);
  const b = wwhNote(mid[0], mid[1], dur, mid[2]);
  const c = wwhNote(high[0], high[1], dur, high[2]);
  b.chord = true;
  c.chord = true;
  return [a, b, c];
}

export function wwhBarTicks(beats = 4, beatType = 4, divisions = WWH_DIVISIONS): number {
  return Math.round((divisions * beats * 4) / beatType);
}

export function wwhSumAtoms(atoms: readonly WwhAtom[]): number {
  return atoms.reduce((sum, atom) => (atom.chord ? sum : sum + atom.divisions), 0);
}

export function assertWwhBar(atoms: readonly WwhAtom[], ticks: number, label: string): void {
  const got = wwhSumAtoms(atoms);
  if (got !== ticks) {
    throw new Error(`${label} duration ${got} != ${ticks}`);
  }
}

export interface WwhPlanSection {
  id: string;
  outputType: Exclude<WwhOutputKind, 'all'>;
  barStart: number;
  barCount: number;
  sourceBarStart: number | null;
  sourceBarCount: number | null;
  guitarRole: string;
  bassRole: string;
  cue: string | null;
  sourceLocks: boolean;
  freedomLevel: WwhFreedom;
  rehearsal: string | null;
}

export type WwhEdition = '7.0' | '7.1' | '7.2';

export type WwhSupport = 'pass' | 'incomplete' | 'fail';

export interface WwhPerformancePlan {
  version: WwhEdition;
  title: string;
  source: string;
  sourceSha256: string;
  seed: number;
  tempo: number;
  outputType: WwhOutputKind;
  naturalLanguageParsing: false;
  sections: WwhPlanSection[];
  leadsheetCues: Array<{ sourceBar: number; performanceSectionId: string; text: string }>;
  limitations: string[];
  /** V7.2 portable pipeline. Curated Black Aura stays on 7.0 and 7.1. */
  support: WwhSupport;
  supportReasons: string[];
  experimentalSketch: boolean;
}
