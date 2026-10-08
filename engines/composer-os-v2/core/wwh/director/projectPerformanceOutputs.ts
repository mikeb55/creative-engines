/**
 * Four views of one compiled plan.
 * Leadsheet stays at the source bar count. The other three follow the performance timeline.
 */

import type { WwhScoreHeader, WwhWrittenBar } from '../wwhMusicXmlWrite';
import { renderWwhDuoScore } from '../wwhMusicXmlWrite';
import type { CompiledBar, CompiledPerformance } from './compilePerformancePlan';
import type { PerformancePlan, PlanSection, Product } from './performancePlanTypes';
import { expandSpan, type SourceIndex } from './sourceIndexAdapter';

function header(index: SourceIndex, plan: PerformancePlan, title: string): WwhScoreHeader {
  return {
    title,
    movementTitle: plan.id,
    composer: index.composer || 'Michael Bryant',
    software: plan.engineEdition === '7.3b' ? 'WWH Performance Director 7.3B' : 'WWH Performance Director 7.3A',
    transposeOctave: index.measures[0]?.guitar.transposeOctave ?? -1,
  };
}

function notationOf(kind: CompiledBar['guitar']['barNotation']): 'open' | 'tacet' | undefined {
  if (kind === 'open') return 'open';
  if (kind === 'rest') return 'tacet';
  return undefined;
}

function writtenFrom(bar: CompiledBar, guitarExtra: string[] = [], bassExtra: string[] = []): WwhWrittenBar {
  const guitarWords = [...bar.guitar.lines, ...guitarExtra];
  const bassWords = [...bar.bass.lines, ...bassExtra];
  return {
    guitar: bar.guitar.atoms ?? [],
    bass: bar.bass.atoms ?? [],
    beats: bar.beats,
    beatType: bar.beatType,
    divisions: bar.divisions,
    fifths: bar.fifths,
    mode: bar.mode,
    guitarTranspose: bar.guitarTranspose,
    bassTranspose: bar.bassTranspose,
    tempoMark: bar.tempo,
    guitarClone: bar.guitar.kind === 'source' || bar.guitar.kind === 'chord_melody' ? bar.guitar.measure?.element : undefined,
    bassClone: bar.bass.kind === 'source' || bar.bass.kind === 'chord_melody' ? bar.bass.measure?.element : undefined,
    guitarNotation: bar.guitar.atoms ? undefined : notationOf(bar.guitar.barNotation),
    bassNotation: bar.bass.atoms ? undefined : notationOf(bar.bass.barNotation),
    words: guitarWords.length ? guitarWords : undefined,
    bassWords: bassWords.length ? bassWords : undefined,
  };
}

function approachLines(plan: PerformancePlan, product: 'guitar_study' | 'bass_partner'): string[] {
  const view = plan.practiceViews.find((item) => item.product === product);
  const approaches = view?.approaches ?? [];
  if (plan.engineEdition === '7.3b' && product === 'guitar_study') {
    const lines = [`Guitar study · plan ${plan.id}. Instructions only. No new pitches or voicings.`];
    if (approaches.includes('minimal')) lines.push('MINIMAL — play the named source cell, then stop. No added notes.');
    if (approaches.includes('lyrical')) lines.push('LYRICAL — hold the written contour and its rests. No new pitches.');
    if (approaches.includes('adventurous')) lines.push('ADVENTUROUS — vary only the rhythm and silence of that cell. No new pitches or voicings.');
    return lines;
  }
  if (plan.engineEdition === '7.3b' && product === 'bass_partner') {
    const lines = [`Bass partner · plan ${plan.id}. Open bass is not an autonomous part. No new pitches.`];
    if (approaches.includes('minimal')) lines.push('MINIMAL — play the written bass, or rest when the plan says tacet.');
    if (approaches.includes('lyrical')) lines.push('LYRICAL — release the written phrase and leave the notated space.');
    if (approaches.includes('adventurous')) lines.push('ADVENTUROUS — wait inside the cue delay. The score writes no new bass notes.');
    return lines;
  }
  const label = approaches.join(' / ') || 'minimal / lyrical / adventurous';
  if (product === 'guitar_study') return [`Guitar study · plan ${plan.id} · approaches ${label}. Instructions only. No new pitches or voicings.`];
  return [`Bass partner · two-player exercise · plan ${plan.id} · approaches ${label}. Open bass is not an autonomous part.`];
}

function performanceBars(compiled: CompiledPerformance): WwhWrittenBar[] {
  return compiled.bars.map((bar) => writtenFrom(bar));
}

function studyBars(plan: PerformancePlan, compiled: CompiledPerformance, product: 'guitar_study' | 'bass_partner'): WwhWrittenBar[] {
  const line = approachLines(plan, product);
  let seen = new Set<string>();
  return compiled.bars.map((bar) => {
    const first = !seen.has(bar.sectionId);
    seen.add(bar.sectionId);
    const extra = first ? line : [];
    return writtenFrom(bar, product === 'guitar_study' ? extra : [], product === 'bass_partner' ? extra : []);
  });
}

function previewBars(section: PlanSection): number {
  if (section.length.kind === 'fixed') return section.length.bars;
  if (section.length.kind === 'cue_window') return section.length.cycleBars * section.length.previewCycles;
  return 0;
}

function leadsheetBars(index: SourceIndex, plan: PerformancePlan): WwhWrittenBar[] {
  const ids = plan.sections.map((section) => section.id).join(', ');
  const insertions: string[] = [];
  let cursor = 0;
  for (const section of plan.sections) {
    if (section.primarySourceSpan) {
      cursor += expandSpan(index, section.primarySourceSpan).length;
      continue;
    }
    const bars = previewBars(section);
    const where = cursor === 0 ? 'before source bar 1' : `after source bar ${index.measures[cursor - 1]?.printedNumber}`;
    insertions.push(`${where}: ${section.id} (${bars} bars, not printed here)`);
  }
  return index.measures.map((measure, order) => {
    const words: string[] = [];
    if (order === 0) {
      words.push(`Plan ${plan.id}. Sections: ${ids}.`);
      words.push('Recording leadsheet: locked source in written order. Added plan sections are not part of this score.');
      if (insertions.length) words.push(insertions.join(' | '));
    }
    return {
      guitar: [],
      bass: [],
      beats: measure.guitar.beats,
      beatType: measure.guitar.beatType,
      divisions: measure.guitar.divisions,
      fifths: measure.guitar.fifths,
      mode: measure.guitar.mode,
      guitarTranspose: measure.guitar.transposeOctave,
      bassTranspose: measure.bass.transposeOctave,
      tempoMark: { ...measure.guitar.tempo },
      guitarClone: measure.guitar.element,
      bassClone: measure.bass.element,
      words: words.length ? words : undefined,
    };
  });
}

export interface ProjectedScores {
  performance: string;
  leadsheet: string;
  guitar_study: string;
  bass_partner: string;
}

export function projectPerformanceOutputs(index: SourceIndex, plan: PerformancePlan, compiled: CompiledPerformance): ProjectedScores {
  const piece = index.title || 'WWH';
  return {
    performance: renderWwhDuoScore(performanceBars(compiled), header(index, plan, `${piece} — Performance Plan Score`)),
    leadsheet: renderWwhDuoScore(leadsheetBars(index, plan), header(index, plan, `${piece} — Recording Leadsheet`)),
    guitar_study: renderWwhDuoScore(studyBars(plan, compiled, 'guitar_study'), header(index, plan, `${piece} — Guitar Performance Study`)),
    bass_partner: renderWwhDuoScore(studyBars(plan, compiled, 'bass_partner'), header(index, plan, `${piece} — Bass Partner Exercises`)),
  };
}

export function productFileName(stem: string, product: Product): string {
  if (product === 'performance') return `${stem}-PERFORMANCE-PLAN-SCORE.musicxml`;
  if (product === 'leadsheet') return `${stem}-RECORDING-LEADSHEET.musicxml`;
  if (product === 'guitar_study') return `${stem}-GUITAR-STUDY.musicxml`;
  return `${stem}-BASS-PARTNER.musicxml`;
}
