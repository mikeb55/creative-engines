/**
 * V82d / V82e - Note-level chord-melody pipeline + bar harmony aggregation for style-transfer.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ImportMelodyNote, MosaicImportTimeline } from '../import/mosaicImportTimeline';
import type { CompositionContext } from '../compositionContext';
import { blockMidisForResolved } from './blockVoicings';
import { applyIdentitiesToNoteChoices } from './identities';
import { assignPhrasingRoles } from './phrasingRoles';
import {
  countEligibleStructuralSixths,
  insertPassingDiminishedEvents,
  passingDimReceiptForEvent,
} from './insertPassingDiminishedEvents';
import { scoreMelodyToImportMelody, type ScoreMelodyNote } from './scoreMelodyToImportMelody';
import { applyVoicingEngineToResolved, harmonizePhrase } from './voicingEngine';
import { precomputeBarryHarrisChordMelodyFoundation } from './precomputeFoundation';
import { selectChordMelodyNoteChoice } from './selector';
import { formatScaleOfChordsPairsLine, pitchClassToSharpName, sixthDimPair } from './scaleOfChords';
import type {
  BarryHarrisChordMelodyFoundation,
  BarryHarrisChordMelodySummary,
  BarryHarrisIdentityId,
  ChordMelodyBarAnchor,
  ChordMelodyHarmonyEvent,
  ChordMelodyNoteChoice,
  MelodyNoteForChordMelody,
  ResolvedChordMelodyNote,
  SixthDimPair,
} from './types';

export type BarryHarrisChordMelodyPipelineOptions = {
  songMode?: boolean;
  generatedMelody?: readonly ScoreMelodyNote[];
  importTimeline?: MosaicImportTimeline;
  presetId?: string;
};

export function resolveChordMelodyMelodyNotes(
  melody: readonly ImportMelodyNote[],
  options?: BarryHarrisChordMelodyPipelineOptions
): ImportMelodyNote[] {
  if (options?.songMode && options.generatedMelody) {
    return scoreMelodyToImportMelody(options.generatedMelody);
  }
  if (options?.importTimeline) {
    return [...options.importTimeline.melodyLine];
  }
  return [...melody];
}

const CM_IDENTITY_RULE_LABEL: Record<BarryHarrisIdentityId, string> = {
  m6_m7b5: 'm6_m7b5',
  m6_on_flat2_dom7alt: 'dom7alt_m6',
  six_on_five_maj9: 'maj9_6on5',
  dim7_dom7_enharmonic: 'dim7_enharmonic',
};

function anchorSymbolFromPair(pair: SixthDimPair): string {
  const root = pitchClassToSharpName(pair.sixthRootPc);
  return pair.sixthQuality === 'm6' ? `${root}m6` : `${root}6`;
}

function barAnchorForBar(
  foundation: BarryHarrisChordMelodyFoundation,
  bar: number
): ChordMelodyBarAnchor | undefined {
  return foundation.choices.find((c) => c.bar === bar);
}

function fallbackAnchor(foundation: BarryHarrisChordMelodyFoundation, bar: number): ChordMelodyBarAnchor {
  const span = foundation.sectionSpans.find((s) => bar >= s.startBar && bar <= s.endBar);
  const sectionLabel = span?.sectionLabel ?? 'A';
  const scale = foundation.scalesBySection[sectionLabel];
  const pair = scale?.pairs[0] ?? sixthDimPair(0, '6');
  return {
    bar,
    sectionLabel,
    fakeBookSymbol: 'C',
    anchor: pair,
  };
}

export function melodyNotesFromImport(melody: readonly ImportMelodyNote[]): MelodyNoteForChordMelody[] {
  return melody.map((n) => ({
    bar: n.bar,
    onsetBeat: n.onsetBeat,
    melodyPc: ((n.midiPitch % 12) + 12) % 12,
  }));
}

export function resolveBarryHarrisNoteChoices(
  foundation: BarryHarrisChordMelodyFoundation,
  melody: readonly ImportMelodyNote[]
): ChordMelodyNoteChoice[] {
  const out: ChordMelodyNoteChoice[] = [];
  for (const note of melodyNotesFromImport(melody)) {
    const anchor = barAnchorForBar(foundation, note.bar) ?? fallbackAnchor(foundation, note.bar);
    const scale = foundation.scalesBySection[anchor.sectionLabel];
    if (!scale) continue;
    out.push(selectChordMelodyNoteChoice(scale, anchor, note));
  }
  return out;
}

function isStrongBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat) < 0.05 || Math.abs(beat - 2) < 0.05;
}

function anchorSymbolForBar(foundation: BarryHarrisChordMelodyFoundation, bar: number): string {
  const anchor = barAnchorForBar(foundation, bar) ?? fallbackAnchor(foundation, bar);
  const pair = anchor.anchor;
  const root = pitchClassToSharpName(pair.sixthRootPc);
  return pair.sixthQuality === 'm6' ? `${root}m6` : `${root}6`;
}

export function harmonyBarsFromNoteChoices(
  foundation: BarryHarrisChordMelodyFoundation,
  noteChoices: readonly ChordMelodyNoteChoice[],
  totalBars: number,
  fallbackBars: readonly string[]
): string[] {
  const resolved = applyIdentitiesToNoteChoices(noteChoices);
  return harmonyBarsFromResolvedNotes(foundation, resolved, totalBars, fallbackBars);
}

export function harmonyBarsFromResolvedNotes(
  foundation: BarryHarrisChordMelodyFoundation,
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  totalBars: number,
  fallbackBars: readonly string[]
): string[] {
  const byBar = new Map<number, ResolvedChordMelodyNote[]>();
  for (const choice of resolvedNotes) {
    const list = byBar.get(choice.bar) ?? [];
    list.push(choice);
    byBar.set(choice.bar, list);
  }

  return Array.from({ length: totalBars }, (_, i) => {
    const bar = i + 1;
    const choices = byBar.get(bar);
    if (!choices?.length) {
      return fallbackBars[i] ?? anchorSymbolForBar(foundation, bar);
    }
    const strong = choices.filter((c) => isStrongBeat(c.onsetBeat));
    const pick = (strong[0] ?? choices[0])!;
    return pick.exportSymbol;
  });
}

export function buildBarryHarrisChordMelodyReceipts(
  foundation: BarryHarrisChordMelodyFoundation,
  noteChoices: readonly ChordMelodyNoteChoice[],
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  harmonyEvents?: readonly ChordMelodyHarmonyEvent[]
): string[] {
  const receipts: string[] = [];
  for (const barAnchor of foundation.choices) {
    receipts.push(
      `bh:cm:reinterpret@bar${barAnchor.bar}:${barAnchor.fakeBookSymbol}→${anchorSymbolFromPair(barAnchor.anchor)}`
    );
  }
  const structuralResolved = harmonyEvents
    ? harmonyEvents.filter((e) => e.eventKind === 'structural')
    : resolvedNotes;
  for (let i = 0; i < noteChoices.length; i++) {
    const choice = noteChoices[i]!;
    const resolved =
      structuralResolved.find(
        (r) => r.bar === choice.bar && Math.abs(r.onsetBeat - choice.onsetBeat) < 0.02
      ) ?? structuralResolved[i];
    if (!resolved) continue;
    const pc = choice.melodyPc;
    if (choice.kind === 'borrowed') {
      receipts.push(
        `bh:cm:borrowed@bar${choice.bar}:onset=${choice.onsetBeat}:pc=${pc}:active=${choice.activeSymbol}:partner=${choice.partnerSymbol}:borrowedFrom=${choice.borrowedFrom}`
      );
    } else {
      receipts.push(
        `bh:cm:select@bar${choice.bar}:onset=${choice.onsetBeat}:pc=${pc}:chord=${choice.chordSymbol}:via=${choice.kind}:dropped=${choice.droppedTonePc}`
      );
    }
    const before = choice.kind === 'borrowed' ? choice.activeSymbol : choice.chordSymbol;
    for (const ann of resolved.identityAnnotations) {
      receipts.push(
        `bh:cm:identity@bar${choice.bar}:onset=${choice.onsetBeat}:${before}→${ann.equivalentSymbol}:rule=${CM_IDENTITY_RULE_LABEL[ann.id]}`
      );
    }
    if (resolved.familyChangeLeapWarn) {
      receipts.push(`bh:cm:family_change_leap_warn@bar${choice.bar}`);
    }
  }
  if (harmonyEvents) {
    for (const event of harmonyEvents) {
      if (event.eventKind === 'passing_dim') {
        receipts.push(passingDimReceiptForEvent(event));
      }
    }
  }
  return receipts;
}

function avgVoiceLeadingStepSemitones(resolved: readonly ResolvedChordMelodyNote[]): number {
  const ordered = [...resolved]
    .filter((r) => r.phrasingRole !== 'single')
    .sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  let total = 0;
  let count = 0;
  for (let i = 1; i < ordered.length; i++) {
    const cost = ordered[i]!.voiceLeadingCost;
    if (cost != null) {
      total += cost;
      count++;
      continue;
    }
    const prevInner = [...(ordered[i - 1]!.innerVoicingMidis ?? [])].sort((a, b) => a - b);
    const currInner = [...(ordered[i]!.innerVoicingMidis ?? [])].sort((a, b) => a - b);
    if (prevInner.length === 0 || currInner.length === 0) continue;
    const used = new Set<number>();
    for (const a of prevInner) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < currInner.length; j++) {
        if (used.has(j)) continue;
        const dist = Math.abs(currInner[j]! - a);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) continue;
      used.add(bestIdx);
      total += bestDist;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

function guitarVoicingStats(resolved: readonly ResolvedChordMelodyNote[]): {
  guitarFeasiblePct: number;
  maxGuitarFretSpan: number;
} {
  const withGuitar = resolved.filter((r) => r.guitarFeasible != null);
  const feasible = withGuitar.filter((r) => r.guitarFeasible === true);
  const spans = feasible
    .map((r) => r.guitarFretSpan)
    .filter((span): span is number => typeof span === 'number' && span >= 0);
  return {
    guitarFeasiblePct: withGuitar.length > 0 ? feasible.length / withGuitar.length : 1,
    maxGuitarFretSpan: spans.length > 0 ? Math.max(...spans) : 0,
  };
}

export function summarizeBarryHarrisNoteChoices(
  noteChoices: readonly ChordMelodyNoteChoice[],
  resolvedNotes?: readonly ResolvedChordMelodyNote[],
  cmReceipts?: readonly string[],
  foundation?: BarryHarrisChordMelodyFoundation,
  harmonyEvents?: readonly ChordMelodyHarmonyEvent[]
): BarryHarrisChordMelodySummary {
  const noteCount = noteChoices.length;
  let sixthCount = 0;
  let dim7Count = 0;
  let borrowedCount = 0;
  for (const c of noteChoices) {
    if (c.kind === 'sixth') sixthCount++;
    else if (c.kind === 'dim7') dim7Count++;
    else borrowedCount++;
  }
  const resolved = resolvedNotes ?? applyIdentitiesToNoteChoices(noteChoices);
  const identityAnnotationCount = resolved.reduce((n, r) => n + r.identityAnnotations.length, 0);
  const guitar = guitarVoicingStats(resolved);
  const passingDimCount =
    harmonyEvents?.filter((e) => e.eventKind === 'passing_dim').length ??
    resolved.filter((r) => r.eventKind === 'passing_dim').length;
  const structuralSixthCount = harmonyEvents
    ? countEligibleStructuralSixths(harmonyEvents)
    : countEligibleStructuralSixths(
        resolved.map((r) => ({ ...r, eventKind: r.eventKind ?? 'structural' })) as ChordMelodyHarmonyEvent[]
      );
  const passingDimDensity =
    structuralSixthCount > 0 ? passingDimCount / structuralSixthCount : 0;
  const scaleOfChordsBySection = foundation
    ? Object.fromEntries(
        Object.entries(foundation.scalesBySection).map(([sectionLabel, scale]) => [
          sectionLabel,
          formatScaleOfChordsPairsLine(scale),
        ])
      )
    : undefined;
  return {
    noteCount,
    sixthCount,
    dim7Count,
    borrowedCount,
    borrowedDensity: noteCount > 0 ? borrowedCount / noteCount : 0,
    identityAnnotationCount,
    avgVoiceLeadingStep: avgVoiceLeadingStepSemitones(resolved),
    guitarFeasiblePct: guitar.guitarFeasiblePct,
    maxGuitarFretSpan: guitar.maxGuitarFretSpan,
    passingDimCount,
    passingDimDensity,
    structuralSixthCount,
    ...(scaleOfChordsBySection && Object.keys(scaleOfChordsBySection).length
      ? { scaleOfChordsBySection }
      : {}),
    ...(cmReceipts?.length ? { cmReceipts: [...cmReceipts] } : {}),
  };
}

export function runBarryHarrisChordMelodyPipeline(
  foundation: BarryHarrisChordMelodyFoundation,
  melody: readonly ImportMelodyNote[],
  totalBars: number,
  fallbackBars: readonly string[],
  options?: BarryHarrisChordMelodyPipelineOptions
): {
  noteChoices: ChordMelodyNoteChoice[];
  resolvedNotes: ResolvedChordMelodyNote[];
  harmonyEvents: ChordMelodyHarmonyEvent[];
  harmonyBars: string[];
  summary: BarryHarrisChordMelodySummary;
  cmReceipts: string[];
} {
  const melodyEvents = resolveChordMelodyMelodyNotes(melody, options);
  const noteChoices = resolveBarryHarrisNoteChoices(foundation, melodyEvents);
  const withIdentities = applyIdentitiesToNoteChoices(noteChoices);
  const withPhrasing = assignPhrasingRoles(withIdentities, melodyEvents, totalBars);
  const harmonyEvents = insertPassingDiminishedEvents(withPhrasing, melodyEvents);
  const resolvedNotes = harmonizePhrase(harmonyEvents, melodyEvents, {
    presetId: options?.presetId,
  });
  const cmReceipts = buildBarryHarrisChordMelodyReceipts(
    foundation,
    noteChoices,
    resolvedNotes,
    harmonyEvents
  );
  const harmonyBars = harmonyBarsFromResolvedNotes(foundation, resolvedNotes, totalBars, fallbackBars);
  const summary = summarizeBarryHarrisNoteChoices(
    noteChoices,
    resolvedNotes,
    cmReceipts,
    foundation,
    harmonyEvents
  );
  return { noteChoices, resolvedNotes, harmonyEvents, harmonyBars, summary, cmReceipts };
}

export const BARRY_HARRIS_EVAL_CHORDS_16 = [
  'Cmaj7',
  'Am7',
  'Dm7',
  'G7',
  'Cmaj7',
  'Am7',
  'Dm7',
  'G7',
  'Cmaj7',
  'E7',
  'Am7',
  'D7',
  'G7',
  'Cmaj7',
  'Am7',
  'Dm7',
] as const;

export const BARRY_HARRIS_EVAL_MELODY_16: ImportMelodyNote[] = [
  { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 61, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 71, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 5, onsetBeat: 0, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 6, onsetBeat: 1, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 7, onsetBeat: 0, durationBeats: 1, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 8, onsetBeat: 2, durationBeats: 1, midiPitch: 59, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 9, onsetBeat: 0, durationBeats: 1, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 10, onsetBeat: 0, durationBeats: 1, midiPitch: 68, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 11, onsetBeat: 1, durationBeats: 1, midiPitch: 63, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 12, onsetBeat: 0, durationBeats: 1, midiPitch: 66, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 13, onsetBeat: 2, durationBeats: 1, midiPitch: 70, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 14, onsetBeat: 0, durationBeats: 1, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 15, onsetBeat: 0, durationBeats: 1, midiPitch: 57, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 16, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' },
];

export type BarryHarrisChordMelodyEvalReport = {
  pass: boolean;
  selectorCoverage: number;
  borrowedDensity: number;
  identityAnnotationCount?: number;
  cmReceiptCount: number;
  blockVoicingOk: boolean;
  reinterpretOk: boolean;
  noteCount: number;
  passingDimCount?: number;
  passingDimDensity?: number;
  passingDimKpi?: 'PASS' | 'WARN';
};

export function runBarryHarrisChordMelodyEvalCore(repoRoot: string): BarryHarrisChordMelodyEvalReport {
  const context = {
    form: { totalBars: 16, sections: [] },
    lockedHarmonyBarsRaw: [...BARRY_HARRIS_EVAL_CHORDS_16],
    generationMetadata: {},
  } as CompositionContext;

  const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
  const pipeline = runBarryHarrisChordMelodyPipeline(
    foundation,
    BARRY_HARRIS_EVAL_MELODY_16,
    16,
    [...BARRY_HARRIS_EVAL_CHORDS_16]
  );
  const resolved = applyIdentitiesToNoteChoices(pipeline.noteChoices);

  const selectorCoverage =
    pipeline.summary.noteCount > 0
      ? (pipeline.summary.sixthCount + pipeline.summary.dim7Count + pipeline.summary.borrowedCount) /
        pipeline.summary.noteCount
      : 0;

  const identityOk =
    (pipeline.summary.identityAnnotationCount ?? 0) > 0 &&
    pipeline.summary.cmReceipts?.some((r) => r.startsWith('bh:cm:identity@')) === true;

  const borrowedOk =
    pipeline.summary.borrowedDensity >= 0.05 && pipeline.summary.borrowedDensity <= 0.85;

  let blockVoicingOk = true;
  for (const mel of BARRY_HARRIS_EVAL_MELODY_16) {
    const r = pipeline.resolvedNotes.find(
      (n) => n.bar === mel.bar && Math.abs(n.onsetBeat - mel.onsetBeat) < 0.02 && !n.harmonyOnly
    );
    if (!r) continue;
    const inner = blockMidisForResolved(r, mel.midiPitch, 'guitar_bass_duo');
    if (inner.some((p) => p >= mel.midiPitch)) blockVoicingOk = false;
    const melodyPc = ((mel.midiPitch % 12) + 12) % 12;
    if (melodyPc !== r.melodyPc) blockVoicingOk = false;
  }

  const reinterpretOk =
    (pipeline.summary.cmReceipts?.filter((r) => r.startsWith('bh:cm:reinterpret@')).length ?? 0) === 16;

  const pass =
    selectorCoverage === 1 &&
    borrowedOk &&
    identityOk &&
    blockVoicingOk &&
    reinterpretOk &&
    pipeline.noteChoices.length === BARRY_HARRIS_EVAL_MELODY_16.length;

  const passingDimDensity = pipeline.summary.passingDimDensity ?? 0;
  const passingDimKpi: 'PASS' | 'WARN' =
    passingDimDensity >= 0.15 && passingDimDensity <= 0.5 ? 'PASS' : 'WARN';
  if (passingDimKpi === 'WARN') {
    console.warn(
      `[eval:barry_harris] passingDimDensity ${passingDimDensity.toFixed(3)} outside 0.15-0.50 KPI band`
    );
  }

  const report: BarryHarrisChordMelodyEvalReport = {
    pass,
    selectorCoverage,
    borrowedDensity: pipeline.summary.borrowedDensity,
    identityAnnotationCount: pipeline.summary.identityAnnotationCount,
    cmReceiptCount: pipeline.summary.cmReceipts?.length ?? 0,
    blockVoicingOk,
    reinterpretOk,
    noteCount: pipeline.summary.noteCount,
    passingDimCount: pipeline.summary.passingDimCount,
    passingDimDensity,
    passingDimKpi,
  };

  const outDir = path.join(repoRoot, 'output', 'barry-harris-eval');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'barry-harris-chord-melody-eval.json'), JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(
    path.join(outDir, 'barry-harris-chord-melody-receipts.txt'),
    (pipeline.summary.cmReceipts ?? []).join('\n'),
    'utf-8'
  );

  return report;
}