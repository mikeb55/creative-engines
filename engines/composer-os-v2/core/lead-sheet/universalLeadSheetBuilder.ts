/**
 * Build UniversalLeadSheet from existing Duo/ECM context or Song lead-sheet contract.
 */

import type { CompositionContext } from '../compositionContext';
import type { LeadSheetContract } from '../song-mode/leadSheetContract';
import type { LeadSheet } from './leadSheetTypes';
import type {
  UniversalLeadSheet,
  UniversalChordEntry,
  UniversalFormSection,
  UniversalRehearsalMark,
  UniversalRepeatMarker,
} from './universalLeadSheetTypes';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';

/**
 * Sum section bar lengths; any section that contains a `repeat_end` marker counts double.
 */
export function computeTotalBarsWithRepeats(
  formSections: UniversalFormSection[],
  repeatMarkers: UniversalRepeatMarker[]
): number {
  let total = 0;
  for (const s of formSections) {
    const span = Math.max(0, s.barEnd - s.barStart + 1);
    const hasRepeatEndInSection = repeatMarkers.some(
      (m) => m.kind === 'repeat_end' && m.bar >= s.barStart && m.bar <= s.barEnd
    );
    total += hasRepeatEndInSection ? span * 2 : span;
  }
  return total;
}

/**
 * Align each part’s measure list to `sheet.totalBars` by trimming or padding (last measure cloned).
 * No-op when `totalBars` is unset or every part already has that many measures.
 */
export function applyRepeatTruthToScoreModel(
  score: ScoreModel,
  sheet: UniversalLeadSheet
): ScoreModel {
  const target = sheet.totalBars;
  if (target === undefined || !Number.isFinite(target) || target < 0) return score;
  const n = Math.max(0, Math.floor(target));

  if (score.parts.length === 0) return score;

  if (score.parts.every((p) => p.measures.length === n)) {
    return score;
  }

  const out = structuredClone(score) as ScoreModel;
  const meta = out as ScoreModel & { totalBars?: number; length?: number };

  for (const part of out.parts) {
    let ms = part.measures.map((m) => structuredClone(m) as MeasureModel);
    if (ms.length > n) {
      ms = ms.slice(0, n);
    } else if (ms.length < n && ms.length > 0) {
      const template = ms[ms.length - 1]!;
      while (ms.length < n) {
        ms.push(structuredClone(template) as MeasureModel);
      }
    }
    part.measures = ms.map((m, i) => ({ ...m, index: i + 1 }));
  }

  if ('totalBars' in meta && typeof meta.totalBars === 'number') {
    meta.totalBars = n;
  }
  if ('length' in meta && typeof meta.length === 'number') {
    meta.length = n;
  }

  return out;
}

function parseEndingNumberFromMarker(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Maps imported `LeadSheet` repeat/volta markers into the universal contract. */
export function universalRepeatMarkersFromLeadSheet(lead: LeadSheet): UniversalRepeatMarker[] {
  const markers = lead.repeatMarkers ?? [];
  return markers.map((m) => {
    const endingNum =
      m.endingNumber !== undefined ? parseEndingNumberFromMarker(m.endingNumber) : undefined;
    return {
      bar: m.bar,
      kind: m.kind,
      ...(endingNum !== undefined ? { endingNumber: endingNum } : {}),
    };
  });
}

function chordEntriesFromImportedLeadSheet(lead: LeadSheet): UniversalChordEntry[] {
  const beatsPerBar = lead.timeSignature?.beats ?? 4;
  const sorted = [...lead.chordEvents].sort((a, b) => a.bar - b.bar || a.beat - b.beat || a.symbol.localeCompare(b.symbol));
  const out: UniversalChordEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i]!;
    const next = sorted[i + 1];
    let durationInBeats: number;
    if (next) {
      durationInBeats = (next.bar - c.bar) * beatsPerBar + (next.beat - c.beat);
    } else {
      durationInBeats = Math.max(1 / 16, (lead.totalBars - c.bar + 1) * beatsPerBar - c.beat);
    }
    durationInBeats = Math.max(1 / 16, durationInBeats);
    out.push({
      measure: c.bar,
      beat: c.beat,
      symbol: c.symbol,
      durationInBeats,
    });
  }
  return out;
}

function formSectionsFromImportedLeadSheet(lead: LeadSheet): UniversalFormSection[] {
  const secs = lead.sections;
  if (secs.length === 0) {
    return [{ label: 'A', barStart: 1, barEnd: Math.max(1, lead.totalBars), role: 'A' }];
  }
  return secs.map((s, i) => {
    const nextStart = secs[i + 1]?.startBar ?? lead.totalBars + 1;
    return {
      label: s.label,
      barStart: s.startBar,
      barEnd: Math.max(s.startBar, nextStart - 1),
      role: s.label,
    };
  });
}

function rehearsalMarksFromImportedLeadSheet(lead: LeadSheet): UniversalRehearsalMark[] {
  return lead.sections.map((s) => ({ measure: s.startBar, label: s.label }));
}

/** Minimal slice shape shared by Big Band / String Quartet form plans. */
export interface PlanningFormSliceLike {
  phase: string;
  startBar: number;
  endBar: number;
}

function chordsFromChordSymbolPlan(ctx: CompositionContext): UniversalChordEntry[] {
  const out: UniversalChordEntry[] = [];
  const beatsPerBar = 4;
  for (const seg of ctx.chordSymbolPlan.segments) {
    let m = seg.startBar;
    const endBar = seg.startBar + seg.bars - 1;
    while (m <= endBar) {
      out.push({
        measure: m,
        beat: 0,
        symbol: seg.chord,
        durationInBeats: beatsPerBar,
      });
      m += 1;
    }
  }
  return out;
}

function formFromContext(ctx: CompositionContext): UniversalFormSection[] {
  return ctx.form.sections.map((s) => ({
    label: s.label,
    barStart: s.startBar,
    barEnd: s.startBar + s.length - 1,
    role: s.label,
  }));
}

function rehearsalFromContext(ctx: CompositionContext): UniversalRehearsalMark[] {
  return ctx.rehearsalMarkPlan.marks.map((r) => ({
    measure: r.bar,
    label: r.label,
  }));
}

export function buildUniversalLeadSheetFromCompositionContext(
  ctx: CompositionContext,
  title: string
): UniversalLeadSheet {
  const mode: UniversalLeadSheet['mode'] = ctx.presetId === 'ecm_chamber' ? 'ecm' : 'duo';
  return {
    mode,
    title,
    presetId: ctx.presetId,
    chordSymbols: chordsFromChordSymbolPlan(ctx),
    formSections: formFromContext(ctx),
    rehearsalMarks: rehearsalFromContext(ctx),
    repeatMarkers: [],
    topLine: { hasEvents: false, note: 'Top line from score export when present' },
    source: 'composition_context',
  };
}

/**
 * Planning-only lead sheet: placeholder harmony (N.C.) per section; real chords come from orchestration later.
 */
export function buildUniversalLeadSheetFromPlanningForm(opts: {
  mode: 'big_band' | 'quartet';
  title: string;
  presetId?: string;
  slices: PlanningFormSliceLike[];
}): UniversalLeadSheet {
  const chordSymbols: UniversalChordEntry[] = [];
  for (const s of opts.slices) {
    const bars = Math.max(1, s.endBar - s.startBar + 1);
    chordSymbols.push({
      measure: s.startBar,
      beat: 0,
      symbol: 'N.C.',
      durationInBeats: bars * 4,
    });
  }
  const formSections: UniversalFormSection[] = opts.slices.map((s) => ({
    label: s.phase,
    barStart: s.startBar,
    barEnd: s.endBar,
    role: s.phase,
  }));
  const rehearsalMarks: UniversalRehearsalMark[] = opts.slices.map((s) => ({
    measure: s.startBar,
    label: s.phase.replace(/_/g, ' '),
  }));
  const sectionLabels = opts.slices.map((s) => s.phase);
  return {
    mode: opts.mode,
    title: opts.title,
    presetId: opts.presetId,
    chordSymbols,
    formSections,
    rehearsalMarks,
    repeatMarkers: [],
    topLine: { hasEvents: false, note: 'Planning — replace N.C. when harmonizing' },
    sectionLabels,
    source: opts.mode === 'big_band' ? 'big_band_plan' : 'quartet_plan',
  };
}

export function buildUniversalLeadSheetFromSongContract(contract: LeadSheetContract): UniversalLeadSheet {
  const chords: UniversalChordEntry[] = contract.chordSymbols.map((c) => ({
    measure: c.measure,
    beat: c.beat,
    symbol: c.chord,
    durationInBeats: c.durationInBeats,
  }));
  const form: UniversalFormSection[] = contract.formSummary.sections.map((s) => ({
    label: s.label,
    barStart: s.barStart,
    barEnd: s.barEnd,
    role: s.role,
  }));
  const rehearsal: UniversalRehearsalMark[] = [];
  return {
    mode: 'song',
    title: contract.title,
    chordSymbols: chords,
    formSections: form,
    rehearsalMarks: rehearsal,
    repeatMarkers: [],
    topLine: {
      hasEvents: contract.vocalMelody.events.length > 0,
      note: contract.vocalMelody.events.length === 0 ? 'Vocal placeholder — events optional' : undefined,
    },
    source: 'song_lead_sheet',
  };
}

/**
 * Full universal contract from a MusicXML-imported {@link LeadSheet} (repeat markers, chords, sections).
 */
export function buildUniversalLeadSheetFromImportedLeadSheet(lead: LeadSheet): UniversalLeadSheet {
  const formSections = formSectionsFromImportedLeadSheet(lead);
  const repeatMarkers = universalRepeatMarkersFromLeadSheet(lead);
  const totalBars = computeTotalBarsWithRepeats(formSections, repeatMarkers);
  return {
    mode: 'song',
    title: lead.title?.trim() ? lead.title : 'Imported lead sheet',
    totalBars,
    chordSymbols: chordEntriesFromImportedLeadSheet(lead),
    formSections,
    rehearsalMarks: rehearsalMarksFromImportedLeadSheet(lead),
    repeatMarkers,
    topLine: {
      hasEvents: lead.melodyEvents.length > 0,
      note: lead.melodyEvents.length === 0 ? 'Melody optional — import may be chords-only' : undefined,
    },
    source: 'imported_musicxml',
  };
}
