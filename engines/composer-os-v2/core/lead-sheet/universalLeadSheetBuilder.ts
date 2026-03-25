/**
 * Build UniversalLeadSheet from existing Duo/ECM context or Song lead-sheet contract.
 */

import type { CompositionContext } from '../compositionContext';
import type { LeadSheetContract } from '../song-mode/leadSheetContract';
import type {
  UniversalLeadSheet,
  UniversalChordEntry,
  UniversalFormSection,
  UniversalRehearsalMark,
} from './universalLeadSheetTypes';

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
    topLine: {
      hasEvents: contract.vocalMelody.events.length > 0,
      note: contract.vocalMelody.events.length === 0 ? 'Vocal placeholder — events optional' : undefined,
    },
    source: 'song_lead_sheet',
  };
}
