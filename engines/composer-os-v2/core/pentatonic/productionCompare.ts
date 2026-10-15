/**
 * Dev 6C production compare.
 * At most three candidates. Order follows the plan, then one alternative, then silence.
 * GCE stays an advisory line. It does not sort the list.
 * Notes still come from mapMotifPitches, the phrase engine, and the existing exporter.
 */

import type { PentatonicScoreAnalysis, PentatonicScoreRegion } from './analyzeScore';
import {
  autoColorContextFromAnalysis,
  planAutoColor,
  type AutoColorContext,
  type AutoColorPlan,
  type MusicalIntention,
} from './autoColor';
import { DEV5C_RETAINED_COLOUR } from './dev5cReview';
import {
  collectionForRegion,
  colourField,
  generatePentatonicPhrase,
  homeCollection,
  midiNoteName,
  transformPentatonicMotif,
  type PentatonicCandidateView,
} from './dev4cWorkflow';
import {
  assessPentatonicFormDuo,
  formDuoEventsFromAnalysis,
  type DuoRole,
  type FormFunction,
} from './formDuoIntelligence';
import { maxAdjacentCollectionRun, transposeCollection, type PentatonicCollectionView } from './motifTransform';
import type { PentatonicOperator } from './phraseOperators';

export const PENTATONIC_COMPARE_VERSION = 'pentatonic-compare-6c';

export const COMPARE_CANDIDATE_CAP = 3;

export const PENTATONIC_PRODUCTION_MODES = ['analyse', 'plan', 'transform', 'generate', 'compare', 'export'] as const;

export const DEV6C_OUTPUT_DIR = '/Users/user/Documents/DEVS/Pentatonic-Options/Dev6C-Release';

export const DEV6C_PATH_PROMOTIONS: readonly string[] = [];

export const DEV6C_REJECTED_BEHAVIOURS = [
  'generic lick',
  'over-busy line',
  'scalar run',
  'mechanical sequence',
  'unnecessary chromaticism',
  'repetition without development',
  'bass-insensitive line',
  'formal misplacement',
  'GCE-only ranking',
  'source overwrite',
  'TAB',
  'THROUGH',
  'generic SEQUENCE',
  'generic INTENSIFY',
  'Woody Shaw semitone pair',
] as const;

export type OperatorReviewStatus = 'KEEP' | 'RESTRICT' | 'DISABLE';

export const DEV6C_OPERATOR_REVIEW: readonly { id: string; status: OperatorReviewStatus; reason: string }[] = [
  { id: 'CELL_LINEAGE', status: 'KEEP', reason: 'Default motif statement. Parent cell stays audible.' },
  { id: 'RETAIN', status: 'KEEP', reason: 'Current field stays when the plan does not earn a move.' },
  { id: 'RESEAT', status: 'KEEP', reason: 'Same five notes, new landing. No new collection.' },
  { id: 'HOLD_FIELD', status: 'KEEP', reason: 'One colour across a harmony change when a common tone still belongs.' },
  { id: 'SLIP', status: 'RESTRICT', reason: 'Only with grounding, a permitting form, and a return. Not an opening. Not an unresolved ending.' },
  { id: 'TRITONE_PAIR', status: 'RESTRICT', reason: 'A region that already trades two fields. Not a bar-to-bar switch.' },
  { id: 'QUARTAL_COMP', status: 'RESTRICT', reason: 'Support texture. Two or three notes from the field.' },
  { id: 'QUARTAL_LINE', status: 'RESTRICT', reason: 'One fourth, then a break. Lineage stays.' },
  { id: 'NONE', status: 'KEEP', reason: 'PATH NONE. The path declines a pentatonic. Separate from phrase silence.' },
  { id: 'NO_PHRASE', status: 'KEEP', reason: 'The purpose is to add nothing. Separate from PATH NONE.' },
  { id: 'STRUCTURAL_SILENCE', status: 'KEEP', reason: 'Space inside a known field. Separate from PATH NONE and NO_PHRASE.' },
];

export type ColourReviewStatus = 'used' | 'shortlisted' | 'unused but functionally justified' | 'redundant' | 'weak';

export type CompareKind = 'RETAIN' | 'RESEAT' | 'TRANSFORMED' | 'OUTSIDE_RETURN' | 'SILENCE';

export type CompareSlot = 'plan' | 'alternative' | 'silence';

export interface CompareCandidate {
  slot: CompareSlot;
  kind: CompareKind;
  resource: string;
  operator: string;
  generatedNotes: string;
  outsideResourceNotes: string;
  lineage: string;
  returnQuality: string;
  formFit: string;
  duoFit: string;
  gceAdvisory: string;
  gceOverall: number | null;
  musicXml: string;
  silence: boolean;
  accepted: boolean;
  rejectionReasons: readonly string[];
}

export interface CompareSet {
  version: typeof PENTATONIC_COMPARE_VERSION;
  ranking: 'plan-alternative-silence';
  plan: AutoColorPlan;
  candidates: readonly CompareCandidate[];
}

export interface ProductionSnapshot {
  centre: string;
  home: string;
  currentField: string;
  formContext: string;
  duoContext: string;
  noneRegions: string;
  holdField: string;
  tritonePairField: string;
  pathNone: string;
  noPhrase: string;
  structuralSilence: string;
}

export interface StructuralProbe {
  formFunction: FormFunction;
  duoRole: DuoRole;
  regionLabel: string;
  intentions: readonly MusicalIntention[];
  plans: readonly {
    intention: MusicalIntention;
    outcome: string;
    operator: PentatonicOperator;
    resource: string;
    targetResourceId: string | null;
    fieldChanged: boolean;
    silence: string;
  }[];
}

const WWH_ALBUM_MARK = 'WWH DUO LEADSHEETS';

function formReading(analysis: PentatonicScoreAnalysis) {
  const homePcs = analysis.identity.home?.pitchClasses ? [...analysis.identity.home.pitchClasses] : null;
  return assessPentatonicFormDuo({
    events: formDuoEventsFromAnalysis(analysis),
    endingDetected: analysis.score.endingDetected,
    homePitchClasses: homePcs,
  });
}

export function productionSnapshot(analysis: PentatonicScoreAnalysis): ProductionSnapshot {
  const form = formReading(analysis);
  const centre =
    analysis.identity.centreStatus === 'CENTRE' && analysis.identity.centre ? analysis.identity.centre.spelling : 'not established';
  const home = homeCollection(analysis)?.name ?? 'not established';
  const current =
    analysis.regions.find((region) => region.explicitCollection) ??
    analysis.regions.find((region) => region.collectionName !== 'NONE');
  const none = analysis.regions.filter((region) => region.collectionName === 'NONE' && !region.explicitCollection);
  const fieldName = current?.explicitCollection?.name ?? current?.collectionName ?? 'NONE';
  return {
    centre,
    home,
    currentField: current ? `${current.measureRangeLabel} ${fieldName}` : 'NONE',
    formContext: form.phrases.length
      ? form.phrases.map((phrase) => `${phrase.function} ${phrase.firstSourceLabel}–${phrase.lastSourceLabel}`).join('; ')
      : 'unknown',
    duoContext: form.roles.length
      ? form.roles.map((role) => `${role.role} ${role.firstSourceLabel}–${role.lastSourceLabel}`).join('; ')
      : 'UNKNOWN',
    noneRegions: none.length ? none.map((region) => region.measureRangeLabel).join(', ') : 'none',
    holdField: form.holdFieldSpans.length ? form.holdFieldSpans.join('; ') : 'none',
    tritonePairField: form.tritonePairSpans.length ? form.tritonePairSpans.join('; ') : 'none',
    pathNone: 'PATH NONE declines a pentatonic reading.',
    noPhrase: 'NO_PHRASE adds no line.',
    structuralSilence: 'STRUCTURAL_SILENCE leaves space inside a known field.',
  };
}

function contextForRegion(analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion, intentions: readonly MusicalIntention[]): AutoColorContext {
  const base = autoColorContextFromAnalysis(analysis);
  const form = formReading(analysis);
  const bar = Number(region.firstSourceLabel);
  const phrase = form.phrases.find((span) => bar >= Number(span.firstSourceLabel) && bar <= Number(span.lastSourceLabel));
  const decision = form.decisions.find((row) => row.sourceLabel === region.firstSourceLabel);
  const role = phrase ? form.roles.find((row) => row.phraseId === phrase.id) : undefined;
  const explicit = region.identityStatus === 'explicit' ? region.explicitCollection : null;
  const none = region.collectionName === 'NONE' && !explicit;
  return {
    ...base,
    intentions,
    formFunction: decision?.function ?? phrase?.function ?? base.formFunction,
    duoRole: role?.role ?? base.duoRole,
    pathIsNone: none,
    currentResourceId: none ? null : explicit?.archetypeId ?? base.currentResourceId,
    centreNote: explicit?.referenceNote ?? base.centreNote,
    hasMotif: base.hasMotif,
    holdCredible: form.holdFieldSpans.length > 0 || base.holdCredible,
    pairIsRegion: form.tritonePairSpans.length > 0,
  };
}

function gceLine(score: number | null, silence: boolean): string {
  if (silence || score === null) return 'No numeric score. Silence is a musical result, not a lower rank.';
  return `Advisory ${score.toFixed(2)}. This number does not choose the candidate.`;
}

function lineageLine(kind: CompareKind, pitchChange: 'YES' | 'NO' | null): string {
  if (kind === 'SILENCE') return 'Parent cell unused. Space keeps the field.';
  if (pitchChange === 'NO') return 'Parent pitches held. Lineage clear.';
  if (kind === 'RESEAT' || kind === 'RETAIN' || kind === 'TRANSFORMED' || kind === 'OUTSIDE_RETURN') return 'Parent cell mapped with M-DEG.';
  return 'Lineage weak.';
}

function audition(args: {
  kind: CompareKind;
  silence: boolean;
  notes: string;
  outside: string;
  plan: AutoColorPlan;
  scaleReject: boolean;
}): { accepted: boolean; rejectionReasons: string[] } {
  if (args.silence) return { accepted: true, rejectionReasons: [] };
  const reasons: string[] = [];
  const count = args.notes === 'NONE' ? 0 : args.notes.split(' ').filter(Boolean).length;
  if (count > 8) reasons.push('over-busy line');
  if (args.scaleReject) reasons.push('scalar run');
  if (args.kind !== 'OUTSIDE_RETURN' && args.outside !== 'NONE' && args.outside.split(' ').filter(Boolean).length > 2) {
    reasons.push('unnecessary chromaticism');
  }
  if (args.plan.duoRole === 'BASS_LEADS' && count > 4) reasons.push('bass-insensitive line');
  if (args.plan.formFunction === 'opening' && args.kind === 'OUTSIDE_RETURN') reasons.push('formal misplacement');
  if (args.kind === 'OUTSIDE_RETURN' && !args.plan.homeReturn) reasons.push('return not credible');
  if (args.plan.lineagePreserved === false && args.kind !== 'SILENCE') reasons.push('lineage weak');
  return { accepted: reasons.length === 0, rejectionReasons: reasons };
}

function fromView(args: {
  slot: CompareSlot;
  kind: CompareKind;
  operator: string;
  view: Pick<PentatonicCandidateView, 'selectedResource' | 'actualNotes' | 'outsideResourceNotes' | 'gceOverall' | 'musicXml' | 'silence' | 'scaleLike' | 'pitchChange'>;
  plan: AutoColorPlan;
}): CompareCandidate {
  const judged = audition({
    kind: args.kind,
    silence: args.view.silence,
    notes: args.view.actualNotes,
    outside: args.view.outsideResourceNotes,
    plan: args.plan,
    scaleReject: args.view.scaleLike === 'WARNING',
  });
  return {
    slot: args.slot,
    kind: args.kind,
    resource: args.view.selectedResource,
    operator: args.operator,
    generatedNotes: args.view.silence ? 'rest' : args.view.actualNotes,
    outsideResourceNotes: args.view.silence ? 'NONE' : args.view.outsideResourceNotes,
    lineage: lineageLine(args.kind, args.view.pitchChange),
    returnQuality: args.plan.returnBehaviour,
    formFit: args.plan.formFunction,
    duoFit: args.plan.duoRole,
    gceAdvisory: gceLine(args.view.gceOverall, args.view.silence),
    gceOverall: args.view.silence ? null : args.view.gceOverall,
    musicXml: args.view.musicXml,
    silence: args.view.silence,
    accepted: judged.accepted,
    rejectionReasons: judged.rejectionReasons,
  };
}

function silenceCandidate(xml: string, analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion, plan: AutoColorPlan, slot: CompareSlot): CompareCandidate | null {
  const generated = generatePentatonicPhrase({ xml, analysis, region, purpose: 'NO_PHRASE', activity: 'SPARSE' });
  const view = generated.candidates[0];
  if (!view) return null;
  const operator = plan.silencePreference === 'PATH_NONE' ? 'NONE' : plan.silencePreference === 'NO_PHRASE' ? 'NO_PHRASE' : 'STRUCTURAL_SILENCE';
  return fromView({ slot, kind: 'SILENCE', operator, view, plan });
}

function transformCandidate(args: {
  xml: string;
  analysis: PentatonicScoreAnalysis;
  region: PentatonicScoreRegion;
  target: PentatonicCollectionView;
  plan: AutoColorPlan;
  slot: CompareSlot;
  kind: CompareKind;
  operator: string;
}): CompareCandidate | null {
  try {
    const transformed = transformPentatonicMotif({
      xml: args.xml,
      analysis: args.analysis,
      region: args.region,
      target: args.target,
      method: 'M-DEG',
    });
    const pitches = transformed.resultPitches;
    const scaleReject = pitches.length >= 3 && maxAdjacentCollectionRun(pitches, args.target) >= 3;
    return fromView({
      slot: args.slot,
      kind: args.kind,
      operator: args.operator,
      plan: args.plan,
      view: {
        selectedResource: transformed.selectedResource,
        actualNotes: transformed.actualNotes,
        outsideResourceNotes: transformed.outsideResourceNotes,
        gceOverall: null,
        musicXml: transformed.musicXml,
        silence: false,
        scaleLike: scaleReject ? 'WARNING' : 'CLEAR',
        pitchChange: transformed.pitchChange,
      },
    });
  } catch {
    return null;
  }
}

function reseatCandidate(xml: string, analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion, plan: AutoColorPlan, slot: CompareSlot): CompareCandidate | null {
  const generated = generatePentatonicPhrase({ xml, analysis, region, purpose: 'DEVELOPMENT', activity: 'SPARSE' });
  const view = generated.candidates.find((candidate) => !candidate.silence);
  if (!view) return null;
  return fromView({ slot, kind: 'RESEAT', operator: 'RESEAT', view: { ...view, pitchChange: 'YES' }, plan });
}

function pushCandidate(rows: CompareCandidate[], candidate: CompareCandidate | null): void {
  if (!candidate || rows.length >= COMPARE_CANDIDATE_CAP) return;
  if (rows.some((row) => row.kind === candidate.kind)) return;
  rows.push(candidate);
}

export function orderCompareCandidates(rows: readonly CompareCandidate[]): CompareCandidate[] {
  const rank: Record<CompareSlot, number> = { plan: 0, alternative: 1, silence: 2 };
  return [...rows].sort((left, right) => rank[left.slot] - rank[right.slot] || left.kind.localeCompare(right.kind)).slice(0, COMPARE_CANDIDATE_CAP);
}

export function comparePentatonicCandidates(args: {
  xml: string;
  analysis: PentatonicScoreAnalysis;
  region: PentatonicScoreRegion;
  intentions?: readonly MusicalIntention[];
}): CompareSet {
  const intentions = args.intentions?.length ? args.intentions : (['RETAIN_MOTIF'] as const);
  const context = contextForRegion(args.analysis, args.region, intentions);
  const plan = planAutoColor(context);
  const collection =
    args.region.collectionName === 'NONE' && !args.region.explicitCollection
      ? null
      : collectionForRegion(args.region) ?? homeCollection(args.analysis);
  const rows: CompareCandidate[] = [];
  const silencePlan = plan.silencePreference !== 'NONE' || plan.outcome === 'STRUCTURAL_SILENCE' || plan.outcome === 'NO_PHRASE' || plan.outcome === 'NONE';

  if (silencePlan || !collection) {
    pushCandidate(rows, silenceCandidate(args.xml, args.analysis, args.region, plan, 'plan'));
  } else if (plan.operator === 'SLIP' && plan.homeReturn) {
    pushCandidate(
      rows,
      transformCandidate({
        xml: args.xml,
        analysis: args.analysis,
        region: args.region,
        target: transposeCollection(collection, -1),
        plan,
        slot: 'plan',
        kind: 'OUTSIDE_RETURN',
        operator: 'SLIP',
      })
    );
  } else if (plan.operator === 'RESEAT') {
    pushCandidate(rows, reseatCandidate(args.xml, args.analysis, args.region, plan, 'plan'));
  } else if (plan.fieldChanged && (plan.targetResourceId === 'major_pentatonic' || plan.targetResourceId === 'minor_pentatonic')) {
    const target = homeCollection(args.analysis) ?? collection;
    pushCandidate(
      rows,
      transformCandidate({
        xml: args.xml,
        analysis: args.analysis,
        region: args.region,
        target,
        plan,
        slot: 'plan',
        kind: 'TRANSFORMED',
        operator: plan.operator,
      })
    );
  } else {
    pushCandidate(
      rows,
      transformCandidate({
        xml: args.xml,
        analysis: args.analysis,
        region: args.region,
        target: collection,
        plan,
        slot: 'plan',
        kind: plan.operator === 'RESEAT' ? 'RESEAT' : 'RETAIN',
        operator: plan.operator,
      })
    );
  }

  if (collection && !rows.some((row) => row.kind === 'RETAIN')) {
    pushCandidate(
      rows,
      transformCandidate({
        xml: args.xml,
        analysis: args.analysis,
        region: args.region,
        target: collection,
        plan,
        slot: 'alternative',
        kind: 'RETAIN',
        operator: 'RETAIN',
      })
    );
  } else if (collection && !rows.some((row) => row.kind === 'RESEAT') && rows.length < COMPARE_CANDIDATE_CAP) {
    pushCandidate(rows, reseatCandidate(args.xml, args.analysis, args.region, plan, 'alternative'));
  }

  if (!rows.some((row) => row.kind === 'SILENCE')) {
    pushCandidate(rows, silenceCandidate(args.xml, args.analysis, args.region, plan, 'silence'));
  }

  return {
    version: PENTATONIC_COMPARE_VERSION,
    ranking: 'plan-alternative-silence',
    plan,
    candidates: orderCompareCandidates(rows),
  };
}

export function intentionsForProbe(form: FormFunction, role: DuoRole): MusicalIntention[] {
  const rows: MusicalIntention[] = [];
  if (form === 'opening') rows.push('RETAIN_MOTIF', 'MORE_CONTINUITY');
  else if (form === 'continuation') rows.push('MORE_CONTINUITY', 'MORE_SPACE');
  else if (form === 'development') rows.push('TENSION_THEN_RESOLVE', 'MORE_OUTSIDE', 'DARKER');
  else if (form === 'climax') rows.push('MORE_OUTSIDE', 'TENSION_THEN_RESOLVE');
  else if (form === 'release') rows.push('MORE_SPACE', 'BRIGHTER');
  else if (form === 'ending') rows.push('RETAIN_MOTIF', 'MORE_SPACE');
  else rows.push('RETAIN_MOTIF');
  if (role === 'BASS_LEADS' || role === 'BASS_RESPONDS' || role === 'BASS_SUPPORTS') rows.push('SUPPORT_BASS', 'ANSWER_BASS');
  return rows.slice(0, 3);
}

export function structuralProbes(analysis: PentatonicScoreAnalysis): StructuralProbe[] {
  const form = formReading(analysis);
  const seen = new Set<FormFunction>();
  const probes: StructuralProbe[] = [];
  const phrases = form.phrases.length
    ? form.phrases
    : [
        {
          id: 'unknown',
          level: 'PHRASE' as const,
          function: 'unknown' as const,
          confidence: 'unknown' as const,
          firstSourceLabel: analysis.regions[0]?.firstSourceLabel ?? '1',
          lastSourceLabel: analysis.regions[0]?.lastSourceLabel ?? '1',
          firstIndex: 0,
          lastIndex: 0,
          evidence: ['no phrase span'],
        },
      ];
  for (const phrase of phrases) {
    if (seen.has(phrase.function)) continue;
    seen.add(phrase.function);
    const region =
      analysis.regions.find((row) => Number(row.firstSourceLabel) <= Number(phrase.lastSourceLabel) && Number(row.lastSourceLabel) >= Number(phrase.firstSourceLabel)) ??
      analysis.regions[0];
    if (!region) continue;
    const role = form.roles.find((row) => row.phraseId === phrase.id)?.role ?? 'UNKNOWN';
    const intentions = intentionsForProbe(phrase.function, role);
    const plans = intentions.map((intention) => {
      const plan = planAutoColor(contextForRegion(analysis, region, [intention]));
      return {
        intention,
        outcome: plan.outcome,
        operator: plan.operator,
        resource: plan.selectedResource,
        targetResourceId: plan.targetResourceId,
        fieldChanged: plan.fieldChanged,
        silence: plan.silencePreference,
      };
    });
    probes.push({ formFunction: phrase.function, duoRole: role, regionLabel: region.measureRangeLabel, intentions, plans });
  }
  return probes;
}

export function compareRegion(analysis: PentatonicScoreAnalysis): PentatonicScoreRegion | null {
  return analysis.regions.find((region) => region.collectionName !== 'NONE') ?? analysis.regions[0] ?? null;
}

export function reviewColourRegistry(usedIds: ReadonlySet<string>, shortlistedIds: ReadonlySet<string>): { id: string; status: ColourReviewStatus; reason: string }[] {
  return DEV5C_RETAINED_COLOUR.map((row) => {
    if (usedIds.has(row.id)) return { id: row.id, status: 'used' as const, reason: row.reason };
    if (shortlistedIds.has(row.id)) return { id: row.id, status: 'shortlisted' as const, reason: row.reason };
    return { id: row.id, status: 'unused but functionally justified' as const, reason: row.reason };
  });
}

export function assertExportPathIsSeparate(sourceFile: string, outputFile: string): void {
  const source = sourceFile.replace(/\\/g, '/');
  const output = outputFile.replace(/\\/g, '/');
  if (source === output) throw new Error('Export path is the source file.');
  if (output.includes(WWH_ALBUM_MARK)) throw new Error('Export path sits inside the WWH source album.');
  if (source && output.endsWith(source.split('/').pop() ?? '___') && output.includes(WWH_ALBUM_MARK)) {
    throw new Error('Export would replace a WWH source name inside the album.');
  }
}

export function validateProductionMusicXml(args: {
  xml: string;
  beats: number;
  beatType: number;
  bpm: number;
  silence: boolean;
  outsideNotes: string;
}): string[] {
  const issues: string[] = [];
  if (!args.xml.includes(`<beats>${args.beats}</beats>`)) issues.push('meter beats missing');
  if (!args.xml.includes(`<beat-type>${args.beatType}</beat-type>`)) issues.push('meter beat type missing');
  const tempo = String(args.bpm);
  if (!args.xml.includes(`tempo="${tempo}"`) && !args.xml.includes(`<per-minute>${tempo}</per-minute>`)) issues.push('tempo missing');
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(args.xml)) issues.push('TAB staff');
  if (args.silence && !/<rest[\s/>]/.test(args.xml)) issues.push('silence has no rest');
  const numbers = [...args.xml.matchAll(/<measure number="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(numbers).size !== numbers.length) issues.push('duplicate measures');
  if (args.outsideNotes !== 'NONE' && args.outsideNotes !== 'none' && args.outsideNotes.trim()) {
    for (const token of args.outsideNotes.split(' ').filter(Boolean)) {
      const step = token.replace(/[0-9-]+$/, '');
      if (step && !args.xml.includes(`<step>${step[0]}</step>`)) issues.push(`outside note ${token} dropped`);
    }
  }
  return issues;
}

export function pitchNames(pitches: readonly number[]): string {
  return pitches.length ? pitches.map(midiNoteName).join(' ') : 'NONE';
}

export function fieldNotes(collection: PentatonicCollectionView | null, pitches: readonly number[]): string {
  return colourField(collection, pitches).outsideResourceNotes;
}
