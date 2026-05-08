/**
 * Section recall contracts — Motif Authority Layer V2 lead-melody enforcement (Song Mode).
 */

import type { HarmonicScene } from '../composer/harmonicScene';
import { activeSceneForBar } from '../composer/harmonicScene';
import type { FormSection } from '../composer/formController';
import type { MeasureModel, NoteEvent, PartModel, ScoreEvent } from '../score-model/scoreModelTypes';
import type { LeadMelodyPlan, MelodyNoteEvent } from '../song-mode/leadMelodyTypes';
import type { SectionChordPlan } from '../song-mode/songCompilationTypes';
import type { SongSectionPlan } from '../song-mode/songModeTypes';
import type { MotifDevelopmentSummary } from './motifAuthorityV1';
import { meetsRecallThreshold, scoreMotifSimilarity } from './motifSimilarityScorer';
import type { MotifCell2, ThemeGenome } from './themeGenome';

export interface SectionRecallEntry {
  recallRole: 'A' | 'B' | 'coda' | 'middle';
  startBar: number;
  endBar: number;
  label: string;
}

export type SectionMap = SectionRecallEntry[];

/** ThemeGenome cells eligible for recall at `bar` given harmonic scene {@link HarmonicScene.activeMotifIds}. Empty ids → full pool. */
export function recallMotifCandidatesAtBar(
  genome: ThemeGenome,
  harmonicScenes: HarmonicScene[] | undefined,
  bar: number
): MotifCell2[] {
  const scene = harmonicScenes?.length ? activeSceneForBar(bar, harmonicScenes) : undefined;
  const ids = scene?.activeMotifIds ?? [];
  const out: MotifCell2[] = [];
  const push = (c?: MotifCell2): void => {
    if (c) out.push(c);
  };
  if (!ids.length) {
    push(genome.primaryCell);
    push(genome.secondaryCell);
    push(genome.bridgeCell);
    push(genome.cadentialTail);
    return out;
  }
  const allow = new Set(ids);
  if (allow.has(genome.primaryCell.id)) push(genome.primaryCell);
  if (genome.secondaryCell && allow.has(genome.secondaryCell.id)) push(genome.secondaryCell);
  if (genome.bridgeCell && allow.has(genome.bridgeCell.id)) push(genome.bridgeCell);
  if (genome.cadentialTail && allow.has(genome.cadentialTail.id)) push(genome.cadentialTail);
  return out;
}

function recallPrimaryTargetForBar(
  genome: ThemeGenome,
  harmonicScenes: HarmonicScene[] | undefined,
  bar: number
): MotifCell2 {
  const pool = recallMotifCandidatesAtBar(genome, harmonicScenes, bar);
  const hit = pool.find((c) => c.id === genome.primaryCell.id);
  return hit ?? genome.primaryCell;
}

function recallBridgeTargetForBar(
  genome: ThemeGenome,
  harmonicScenes: HarmonicScene[] | undefined,
  bar: number
): MotifCell2 | undefined {
  const pool = recallMotifCandidatesAtBar(genome, harmonicScenes, bar);
  const bridge = genome.bridgeCell;
  const secondary = genome.secondaryCell;
  if (!pool.length) return bridge;
  if (bridge && pool.some((c) => c.id === bridge.id)) return bridge;
  if (secondary && pool.some((c) => c.id === secondary.id)) return secondary;
  return undefined;
}

export function buildSectionRecallMap(sectionPlans: SongSectionPlan[], chordPlan: SectionChordPlan[]): SectionMap {
  const out: SectionMap = [];
  let bar = 1;
  for (let i = 0; i < chordPlan.length; i++) {
    const span = chordPlan[i]!.chordSymbols.length;
    const startBar = bar;
    const endBar = bar + span - 1;
    const kind = sectionPlans[i]?.kind ?? 'verse';
    let recallRole: SectionRecallEntry['recallRole'] = 'middle';
    if (i === 0) recallRole = 'A';
    if (kind === 'bridge') recallRole = 'B';
    out.push({ recallRole, startBar, endBar, label: `${kind}_${sectionPlans[i]?.order ?? i}` });
    bar = endBar + 1;
  }
  const totalBars = bar - 1;
  if (totalBars >= 8) {
    out.push({
      recallRole: 'coda',
      startBar: Math.max(1, totalBars - 7),
      endBar: totalBars,
      label: 'coda_tail',
    });
  }
  return out;
}

function isNote(ev: ScoreEvent): ev is NoteEvent {
  return ev.kind === 'note';
}

function cloneScoreEvent(ev: ScoreEvent): ScoreEvent {
  if (ev.kind === 'note') {
    const n = ev as NoteEvent;
    return { ...n, ...(n.pitches?.length ? { pitches: [...n.pitches] } : {}) };
  }
  return { ...ev };
}

function clonePart(part: PartModel): PartModel {
  return {
    ...part,
    measures: part.measures.map(
      (m): MeasureModel => ({
        ...m,
        events: m.events.map(cloneScoreEvent),
      })
    ),
  };
}

interface NoteRef {
  mi: number;
  ei: number;
}

function collectNoteRefs(part: PartModel, lo: number, hi: number): NoteRef[] {
  const refs: NoteRef[] = [];
  for (let mi = 0; mi < part.measures.length; mi++) {
    const m = part.measures[mi]!;
    if (m.index < lo || m.index > hi) continue;
    for (let ei = 0; ei < m.events.length; ei++) {
      if (isNote(m.events[ei]!)) refs.push({ mi, ei });
    }
  }
  refs.sort((a, b) => {
    const ma = part.measures[a.mi]!.index;
    const mb = part.measures[b.mi]!.index;
    if (ma !== mb) return ma - mb;
    const na = part.measures[a.mi]!.events[a.ei] as NoteEvent;
    const nb = part.measures[b.mi]!.events[b.ei] as NoteEvent;
    return na.startBeat - nb.startBeat;
  });
  return refs;
}

/** Build MotifCell2 from consecutive notes in part range (minimum viable). */
export function motifCell2FromPartRange(part: PartModel, lo: number, hi: number): MotifCell2 {
  const refs = collectNoteRefs(part, lo, hi);
  const notes = refs.map((r) => part.measures[r.mi]!.events[r.ei] as NoteEvent);
  if (notes.length === 0) {
    return {
      id: 'derived_empty',
      role: 'primary',
      intervals: [],
      durations: [],
      contour: [],
      accents: [],
      registerBand: [60, 72],
      harmonicMask: { chordTonesBias: 0.5, tensionBias: 0.35 },
      transformBudget: {
        transpose: true,
        invert: false,
        retrograde: false,
        augment: false,
        diminish: false,
        fragment: true,
        sequence: false,
        embedInnerVoice: false,
      },
      recallWeight: 0.5,
    };
  }
  const pitches = notes.map((n) => n.pitch);
  const intervals: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    intervals.push(pitches[i]! - pitches[i - 1]!);
  }
  const contour: ('up' | 'down' | 'same')[] = ['same'];
  for (const d of intervals) {
    contour.push(d > 1 ? 'up' : d < -1 ? 'down' : 'same');
  }
  const durations = notes.map((n) => n.duration);
  const accents = durations.map((d) => 0.45 + Math.min(0.25, d / 8));
  const registerBand: [number, number] = [Math.min(...pitches), Math.max(...pitches)];
  return {
    id: 'derived_part',
    role: 'primary',
    intervals,
    durations,
    contour,
    accents,
    registerBand,
    harmonicMask: { chordTonesBias: 0.5, tensionBias: 0.35 },
    transformBudget: {
      transpose: true,
      invert: true,
      retrograde: false,
      augment: true,
      diminish: true,
      fragment: true,
      sequence: true,
      embedInnerVoice: true,
    },
    recallWeight: 0.8,
  };
}

function stepTowardPitch(actual: number, target: number): number {
  if (actual === target) return actual;
  return actual < target ? actual + 1 : actual - 1;
}

/** Nudge pitches in bar range toward primary interval spine (±1 ST per step). */
function nudgeRangeTowardPrimary(part: PartModel, lo: number, hi: number, primary: MotifCell2): void {
  const refs = collectNoteRefs(part, lo, hi);
  if (refs.length < 2 || primary.intervals.length === 0) return;
  const maxPairs = Math.min(primary.intervals.length, refs.length - 1);
  for (let i = 0; i < maxPairs; i++) {
    const ra = refs[i]!;
    const rb = refs[i + 1]!;
    const a = part.measures[ra.mi]!.events[ra.ei] as NoteEvent;
    const bEv = part.measures[rb.mi]!.events[rb.ei] as NoteEvent;
    const targetDelta = primary.intervals[i] ?? 0;
    if (bEv.pitch - a.pitch === targetDelta) continue;
    const wantB = a.pitch + targetDelta;
    const nextPitch = stepTowardPitch(bEv.pitch, wantB);
    part.measures[rb.mi]!.events[rb.ei] = { ...bEv, pitch: nextPitch };
  }
}

function nudgeCodaTowardPrimary(part: PartModel, lo: number, hi: number, primary: MotifCell2): void {
  nudgeRangeTowardPrimary(part, lo, hi, primary);
}

/** Phase 4+5 — extra primary-motif nudge windows driven by harmonic {@link FormSection} arcs. */
export function applyFormSectionRecallToLeadPart(
  part: PartModel,
  genome: ThemeGenome,
  formSections: FormSection[],
  harmonicScenes?: HarmonicScene[]
): PartModel {
  const work = clonePart(part);
  for (const sec of formSections) {
    const recallWindow = sec.motifRecallRequired || sec.role === 'shout-chorus';
    if (!recallWindow) continue;
    if (sec.role === 'development') continue;
    const lo = sec.barRange[0];
    const hi = sec.barRange[1];
    const primary =
      harmonicScenes?.length ? recallPrimaryTargetForBar(genome, harmonicScenes, lo) : genome.primaryCell;
    nudgeRangeTowardPrimary(work, lo, hi, primary);
  }
  return work;
}

/** Apply recall contracts to a single melodic {@link PartModel} (typically `lead_melody`). */
export function enforceRecallContract(
  part: PartModel,
  genome: ThemeGenome,
  sections: SectionMap,
  scorer: typeof scoreMotifSimilarity = scoreMotifSimilarity,
  harmonicScenes?: HarmonicScene[]
): PartModel {
  const work = clonePart(part);
  const regionA = sections.find((s) => s.recallRole === 'A');
  if (regionA) {
    const endA = Math.min(regionA.startBar + genome.sectionContracts.A.presentWithin - 1, regionA.endBar);
    const derived = motifCell2FromPartRange(work, regionA.startBar, endA);
    const targetA = recallPrimaryTargetForBar(genome, harmonicScenes, regionA.startBar);
    const sc = scorer(derived, targetA);
    if (!meetsRecallThreshold(sc, 'A')) {
      nudgeRangeTowardPrimary(work, regionA.startBar, endA, targetA);
    }
  }

  const regionB = sections.find((s) => s.recallRole === 'B');
  const bridgeTarget = regionB ? recallBridgeTargetForBar(genome, harmonicScenes, regionB.startBar) : undefined;
  if (regionB && bridgeTarget) {
    const derivedB = motifCell2FromPartRange(work, regionB.startBar, regionB.endBar);
    const scB = scorer(derivedB, bridgeTarget);
    if (!meetsRecallThreshold(scB, 'B')) {
      nudgeRangeTowardPrimary(work, regionB.startBar, regionB.endBar, bridgeTarget);
    }
  }

  const coda = sections.filter((s) => s.recallRole === 'coda').pop();
  if (coda) {
    const derivedC = motifCell2FromPartRange(work, coda.startBar, coda.endBar);
    const targetC = recallPrimaryTargetForBar(genome, harmonicScenes, coda.startBar);
    const scC = scorer(derivedC, targetC);
    if (!meetsRecallThreshold(scC, 'coda')) {
      nudgeCodaTowardPrimary(work, coda.startBar, coda.endBar, targetC);
    }
  }

  return work;
}

export function leadMelodyPlanToPartModel(plan: LeadMelodyPlan): PartModel {
  const ordered = [...plan.notes].sort((a, b) => a.measure - b.measure || a.beat - b.beat);
  const byMeasure = new Map<number, NoteEvent[]>();
  for (const n of ordered) {
    const ev: NoteEvent = {
      kind: 'note',
      pitch: n.midi,
      startBeat: n.beat,
      duration: n.duration,
      voice: 1,
    };
    const list = byMeasure.get(n.measure) ?? [];
    list.push(ev);
    byMeasure.set(n.measure, list);
  }
  const indices = [...byMeasure.keys()].sort((a, b) => a - b);
  const measures: MeasureModel[] = indices.map((idx) => ({
    index: idx,
    events: (byMeasure.get(idx) ?? []).sort((a, b) => a.startBeat - b.startBeat),
  }));
  return {
    id: 'lead_melody',
    name: 'Lead',
    instrumentIdentity: 'lead_melody',
    midiProgram: 0,
    clef: 'treble',
    measures,
  };
}

export function mergePartPitchIntoLeadPlan(plan: LeadMelodyPlan, part: PartModel): LeadMelodyPlan {
  const refs = collectNoteRefs(part, 1, 1_000_000);
  const indexed = plan.notes.map((n, idx) => ({ n, idx }));
  const sorted = [...indexed].sort((a, b) => a.n.measure - b.n.measure || a.n.beat - b.n.beat);
  const pitchByNoteIndex = new Map<number, number>();
  sorted.forEach((row, j) => {
    const r = refs[j];
    if (!r) return;
    const ev = part.measures[r.mi]!.events[r.ei] as NoteEvent;
    pitchByNoteIndex.set(row.idx, ev.pitch);
  });
  const nextNotes = plan.notes.map((n, i) => {
    const p = pitchByNoteIndex.get(i);
    return p !== undefined ? { ...n, midi: p } : n;
  });
  return { ...plan, notes: nextNotes };
}

function estimateRecallQuota(plan: LeadMelodyPlan, genome: ThemeGenome, scorer: typeof scoreMotifSimilarity): number {
  if (plan.phrases.length === 0) return 0;
  let tied = 0;
  for (const ph of plan.phrases) {
    const slice = plan.notes.filter((n) => n.measure >= ph.startMeasure && n.measure <= ph.endMeasure);
    if (slice.length < 2) continue;
    const fakePart = leadMelodyPlanToPartModel({
      phrases: [ph],
      notes: slice,
      contourArc: plan.contourArc,
      cadenceMeasures: plan.cadenceMeasures,
    });
    const cell = motifCell2FromPartRange(fakePart, ph.startMeasure, ph.endMeasure);
    const sc = scorer(cell, genome.primaryCell);
    if (sc.total >= 0.35) tied++;
  }
  return tied / plan.phrases.length;
}

export interface MotifAuthorityLayerResult {
  plan: LeadMelodyPlan;
  summary: MotifDevelopmentSummary;
  receipts: readonly string[];
}

export function applyMotifAuthorityLayerToLeadMelody(
  plan: LeadMelodyPlan,
  genome: ThemeGenome,
  sectionPlans: SongSectionPlan[],
  chordPlan: SectionChordPlan[],
  scorer: typeof scoreMotifSimilarity = scoreMotifSimilarity,
  formSections?: FormSection[],
  harmonicScenes?: HarmonicScene[]
): MotifAuthorityLayerResult {
  const receipts: string[] = [`mal:genome:${genome.generationId}`, `mal:voice:${genome.voiceId}`];
  const sectionMap = buildSectionRecallMap(sectionPlans, chordPlan);
  const part = leadMelodyPlanToPartModel(plan);
  let adjustedPart = enforceRecallContract(part, genome, sectionMap, scorer, harmonicScenes);
  if (formSections?.length) {
    adjustedPart = applyFormSectionRecallToLeadPart(adjustedPart, genome, formSections, harmonicScenes);
    receipts.push('mal:form_section_recall');
  }
  if (harmonicScenes?.length) {
    receipts.push('mal:harmonic_scene_motif_filter');
  }
  let nextPlan = mergePartPitchIntoLeadPlan(plan, adjustedPart);

  const quota = estimateRecallQuota(nextPlan, genome, scorer);
  if (quota < genome.recallQuota) {
    receipts.push(`mal:recall_quota_shortfall:${quota.toFixed(2)}<${genome.recallQuota}`);
  } else {
    receipts.push(`mal:recall_quota_ok:${quota.toFixed(2)}`);
  }

  const summary: MotifDevelopmentSummary = {
    motifAuthorityLevel: 'soft',
    pilotPathTag: 'mal_v2',
    coreCellEstablished: true,
    recurrenceCountEstimate: Math.round(quota * plan.phrases.length),
    recurrenceSummary: `MAL recall quota est=${quota.toFixed(2)} target=${genome.recallQuota}`,
    transformationSummary: [...receipts],
    motifCoherence: quota,
    motifLedPrimaryIdentity: true,
    experimental: true,
  };

  return { plan: nextPlan, summary, receipts };
}
