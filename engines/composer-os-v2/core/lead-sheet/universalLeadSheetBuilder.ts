/**
 * Build UniversalLeadSheet from existing Duo/ECM context or Song lead-sheet contract.
 */

import type { CompositionContext } from '../compositionContext';
import type { LeadSheetContract } from '../song-mode/leadSheetContract';
import type { UniversalLeadSheet, UniversalChordEntry, UniversalFormSection, UniversalRehearsalMark } from './universalLeadSheetTypes';

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
