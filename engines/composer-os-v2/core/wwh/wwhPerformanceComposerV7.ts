/**
 * WWH Performance Composer V7.0
 * One imported duo score, one Performance Plan, four MusicXML outputs.
 * Does not call the long-form 8/16/32 resolver.
 */

import { createHash } from 'node:crypto';
import type { WwhImportedMeasure } from './wwhDuoImport';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhDuoScore } from './wwhDuoImport';
import {
  applySeedToGuitarAtoms,
  BLACK_AURA_BASS_PARTNER,
  BLACK_AURA_GUITAR_STUDY,
  BLACK_AURA_LEADSHEET_CUES,
  BLACK_AURA_PERFORMANCE,
  type WwhComposedSlice,
  type WwhGuitarOverBass,
  type WwhPerfSlice,
  type WwhStudyBlock,
} from './wwhBlackAuraMaterial';
import { BLACK_AURA_V71_CUES, BLACK_AURA_V71_GUITAR_STUDY, BLACK_AURA_V71_PERFORMANCE } from './wwhBlackAuraV71';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import {
  type WwhEdition,
  type WwhOutputKind,
  type WwhPerformancePlan,
  type WwhPlanSection,
  type WwhSupport,
} from './wwhPerformanceTypes';
import {
  beatOrSmallerLine,
  quarterPerMinute,
  type WwhTempoMark,
} from './wwhTiming';

export interface WwhComposeRequest {
  xml: string;
  sourcePath: string;
  seed: number;
  output?: WwhOutputKind;
  /** 7.0 and 7.1 stay the curated Black Aura baselines. 7.2 is the portable pipeline. */
  edition?: WwhEdition;
}

export interface WwhComposeFile {
  name: string;
  contents: string;
}

export interface WwhComposeResult {
  plan: WwhPerformancePlan;
  files: WwhComposeFile[];
  score: WwhDuoScore;
}

const SOFTWARE = 'Composer OS — WWH Performance Composer';

export function developedInsertLength(barCount: number): number {
  if (barCount === 7) return 5;
  if (barCount === 5) return 3;
  if (barCount > 0 && barCount % 8 === 0) return 3;
  const remainder = barCount % 4;
  return Math.max(3, remainder === 0 ? 3 : remainder);
}

function isBlackAura(score: WwhDuoScore, sourcePath: string): boolean {
  return /black aura/i.test(`${score.title} ${score.movementTitle} ${sourcePath}`);
}

export function wwhOutputStem(sourcePath: string, title: string, edition: WwhEdition): string {
  if ((edition === '7.0' || edition === '7.1') && /black aura/i.test(title)) {
    return edition === '7.1' ? '01-Black-Aura-V7.1' : '01-Black-Aura-V7';
  }
  if (edition === '7.0' || edition === '7.1') {
    const slug = title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Duo';
    return `${slug}-V${edition === '7.1' ? '7.1' : '7'}`;
  }
  const base = sourcePath.split(/[/\\]/).pop() ?? title;
  const stripped = base
    .replace(/\.musicxml$/i, '')
    .replace(/-Duo-Leadsheet-V[\d.]+$/i, '')
    .replace(/-Leadsheet-V[\d.]+$/i, '');
  const slug = stripped.replace(/[^A-Za-z0-9.]+/g, '-').replace(/^-|-$/g, '') || 'Duo';
  return `${slug}-V7.2`;
}

function stemFor(score: WwhDuoScore, sourcePath: string, edition: WwhEdition): string {
  return wwhOutputStem(sourcePath, score.title, edition);
}

function header(score: WwhDuoScore, movement: string, edition: WwhEdition, tempo?: number): WwhScoreHeader {
  return {
    title: score.title,
    movementTitle: movement,
    composer: score.composer || 'Michael Bryant',
    software: `${SOFTWARE} ${edition}`,
    tempo,
    transposeOctave: -1,
  };
}

function measureAt(part: WwhDuoScore['guitar'], barNumber: number): WwhImportedMeasure {
  const measure = part.measures[barNumber - 1];
  if (!measure) throw new Error(`missing source bar ${barNumber}`);
  return measure;
}

function tempoOrNull(mark: WwhTempoMark): WwhTempoMark | null {
  if (!mark.beatUnit && !mark.perMinute && !mark.soundTempo) return null;
  return mark;
}

function contextOf(guitar: WwhImportedMeasure, bass: WwhImportedMeasure): Pick<
  WwhWrittenBar,
  'beats' | 'beatType' | 'divisions' | 'fifths' | 'mode' | 'guitarTranspose' | 'bassTranspose' | 'tempoMark'
> {
  return {
    beats: guitar.beats,
    beatType: guitar.beatType,
    divisions: guitar.divisions,
    fifths: guitar.fifths,
    mode: guitar.mode,
    guitarTranspose: guitar.transposeOctave,
    bassTranspose: bass.transposeOctave,
    tempoMark: tempoOrNull(guitar.tempo) ?? tempoOrNull(bass.tempo),
  };
}

function sourceBars(score: WwhDuoScore, from: number, to: number, newSystem: boolean): WwhWrittenBar[] {
  const bars: WwhWrittenBar[] = [];
  for (let bar = from; bar <= to; bar++) {
    const guitar = measureAt(score.guitar, bar);
    const bass = measureAt(score.bass, bar);
    bars.push({
      guitar: [],
      bass: [],
      ...contextOf(guitar, bass),
      guitarClone: guitar.element,
      bassClone: bass.element,
      newSystem: newSystem && bar === from,
    });
  }
  return bars;
}

const SKETCH_LABEL = 'EXPERIMENTAL TECHNICAL SKETCH';

function gridBlock(score: WwhDuoScore, from: number, to: number): string | null {
  const measures = [...score.guitar.measures.slice(from - 1, to), ...score.bass.measures.slice(from - 1, to)];
  if (measures.some((measure) => !measure.gridAgrees)) {
    return `bars ${from}-${to} duration, note type, dots, or divisions do not agree`;
  }
  return null;
}

function spanBlock(score: WwhDuoScore, from: number, to: number): string | null {
  const guitar = score.guitar.measures.slice(from - 1, to);
  const bass = score.bass.measures.slice(from - 1, to);
  const measures = [...guitar, ...bass];
  if (measures.some((measure) => measure.hasRepeat || measure.hasEnding)) {
    return `bars ${from}-${to} contain a repeat or ending`;
  }
  if (guitar[guitar.length - 1]?.openTieOut || bass[bass.length - 1]?.openTieOut) {
    return `bars ${from}-${to} end on an unresolved tie`;
  }
  return gridBlock(score, from, to);
}

function pushSection(
  sections: WwhPlanSection[],
  outputType: WwhPlanSection['outputType'],
  barStart: number,
  barCount: number,
  fields: Omit<WwhPlanSection, 'outputType' | 'barStart' | 'barCount'>
): void {
  sections.push({ outputType, barStart, barCount, ...fields });
}

function assemblePerformance(
  score: WwhDuoScore,
  slices: WwhPerfSlice[],
  seed: number,
  sections: WwhPlanSection[]
): WwhWrittenBar[] {
  const bars: WwhWrittenBar[] = [];
  for (const slice of slices) {
    const barStart = bars.length + 1;
    if (slice.kind === 'source') {
      const next = sourceBars(score, slice.from, slice.to, bars.length > 0);
      bars.push(...next);
      pushSection(sections, 'performance', barStart, next.length, {
        id: slice.id,
        sourceBarStart: slice.from,
        sourceBarCount: slice.to - slice.from + 1,
        guitarRole: slice.guitarRole,
        bassRole: slice.bassRole,
        cue: slice.cue,
        sourceLocks: true,
        freedomLevel: 'locked',
        rehearsal: score.guitar.measures[slice.from - 1]?.rehearsal[0] ?? null,
      });
      continue;
    }
    const written = slice.kind === 'guitar-over-bass' ? guitarOverBass(score, slice, seed) : composedSlice(slice, seed);
    if (written[0]) written[0].newSystem = bars.length > 0;
    bars.push(...written);
    pushSection(sections, 'performance', barStart, written.length, {
      id: slice.id,
      sourceBarStart: null,
      sourceBarCount: null,
      guitarRole: slice.guitarRole,
      bassRole: slice.bassRole,
      cue: slice.cue,
      sourceLocks: false,
      freedomLevel: slice.freedom,
      rehearsal: slice.rehearsal,
    });
  }
  return bars;
}

function guitarOverBass(score: WwhDuoScore, slice: WwhGuitarOverBass, seed: number): WwhWrittenBar[] {
  const guitar = applySeedToGuitarAtoms(slice.guitar, seed);
  return slice.bassMeasures.map((barNumber, index) => {
    const bass = measureAt(score.bass, barNumber);
    const guitarMeasure = measureAt(score.guitar, barNumber);
    return {
      guitar: guitar[index] ?? [],
      bass: [],
      ...contextOf(guitarMeasure, bass),
      bassClone: bass.element,
      rehearsal: index === 0 ? slice.rehearsal : undefined,
      words: index === 0 ? slice.words : undefined,
    };
  });
}

function composedSlice(slice: WwhComposedSlice, seed: number): WwhWrittenBar[] {
  const guitar = applySeedToGuitarAtoms(
    slice.bars.map((bar) => bar.guitar),
    seed
  );
  return slice.bars.map((bar, index) => ({
    guitar: guitar[index] ?? [],
    bass: bar.bass,
    beats: 4,
    beatType: 4,
    divisions: 256,
    fifths: 0,
    mode: 'major',
    harmony: bar.harmony,
    rehearsal: index === 0 ? slice.rehearsal : undefined,
    words: index === 0 ? [...slice.words, ...(bar.words ?? [])] : bar.words,
  }));
}

function assembleStudy(score: WwhDuoScore, blocks: WwhStudyBlock[], outputType: 'guitar_study' | 'bass_partner', sections: WwhPlanSection[]): WwhWrittenBar[] {
  const bars: WwhWrittenBar[] = [];
  for (const block of blocks) {
    const barStart = bars.length + 1;
    const written: WwhWrittenBar[] = block.guitar.map((_, index) => {
      const guitarSource = block.guitarMeasures[index] ?? 0;
      const bassSource = block.bassMeasures[index] ?? 0;
      const guitarMeasure = guitarSource > 0 ? measureAt(score.guitar, guitarSource) : null;
      const bassMeasure = bassSource > 0 ? measureAt(score.bass, bassSource) : null;
      const meter = guitarMeasure ?? bassMeasure;
      const partner = guitarMeasure && bassMeasure ? contextOf(guitarMeasure, bassMeasure) : null;
      return {
        guitar: guitarMeasure ? [] : block.guitar[index] ?? [],
        bass: bassMeasure ? [] : block.bass?.[index] ?? [],
        beats: meter?.beats ?? 4,
        beatType: meter?.beatType ?? 4,
        divisions: meter?.divisions ?? 256,
        fifths: meter?.fifths ?? 0,
        mode: meter?.mode ?? 'major',
        guitarTranspose: partner?.guitarTranspose ?? guitarMeasure?.transposeOctave ?? bassMeasure?.transposeOctave,
        bassTranspose: partner?.bassTranspose ?? bassMeasure?.transposeOctave ?? guitarMeasure?.transposeOctave,
        tempoMark: partner?.tempoMark ?? (meter ? tempoOrNull(meter.tempo) : null),
        guitarClone: guitarMeasure?.element,
        bassClone: bassMeasure?.element,
        rehearsal: index === 0 ? block.rehearsal : undefined,
        words: index === 0 ? block.words : undefined,
        newSystem: index === 0 && bars.length + index > 0,
      };
    });
    bars.push(...written);
    pushSection(sections, outputType, barStart, written.length, {
      id: block.id,
      sourceBarStart: null,
      sourceBarCount: null,
      guitarRole: block.guitarRole,
      bassRole: block.bassRole,
      cue: block.cue,
      sourceLocks: false,
      freedomLevel: block.freedom,
      rehearsal: block.rehearsal,
    });
  }
  return bars;
}

function leadsheet(score: WwhDuoScore, cues: WwhComposeResult['plan']['leadsheetCues'], sections: WwhPlanSection[]): WwhWrittenBar[] {
  const byBar = new Map<number, string[]>();
  for (const cue of cues) {
    const list = byBar.get(cue.sourceBar) ?? [];
    list.push(cue.text);
    byBar.set(cue.sourceBar, list);
  }
  const bars = sourceBars(score, 1, score.guitar.measures.length, false);
  for (const [barNumber, words] of byBar) {
    const bar = bars[barNumber - 1];
    if (bar) bar.words = words;
  }
  pushSection(sections, 'leadsheet', 1, bars.length, {
    id: 'leadsheet-source',
    sourceBarStart: 1,
    sourceBarCount: bars.length,
    guitarRole: 'theme',
    bassRole: 'source',
    cue: 'Recording leadsheet. Improvisation lives in the performance plan, not as written solo choruses.',
    sourceLocks: true,
    freedomLevel: 'locked',
    rehearsal: null,
  });
  return bars;
}

const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiOf(note: { step?: string; alter?: number; octave?: number }): number | null {
  if (!note.step || note.octave === undefined) return null;
  const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[note.step];
  if (pc === undefined) return null;
  return (note.octave + 1) * 12 + pc + (note.alter ?? 0);
}

function spell(midi: number): { step: string; alter: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const name = FLAT[pc] ?? 'C';
  const step = name[0] ?? 'C';
  const alter = name.length > 1 ? -1 : 0;
  let octave = Math.floor(midi / 12) - 1;
  const written = (octave + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step] ?? 0) + alter;
  if (written !== midi) octave += Math.round((midi - written) / 12);
  return { step, alter, octave };
}

function clamp(midi: number, low: number, high: number): number {
  let next = midi;
  while (next < low) next += 12;
  while (next > high) next -= 12;
  return next;
}

function sectionBounds(score: WwhDuoScore): Array<{ from: number; to: number; rehearsal: string | null }> {
  const marks: number[] = [];
  score.guitar.measures.forEach((measure, index) => {
    if (measure.rehearsal.length) marks.push(index + 1);
  });
  if (!marks.length || marks[0] !== 1) marks.unshift(1);
  const unique = [...new Set(marks)].sort((a, b) => a - b);
  return unique.map((from, index) => ({
    from,
    to: (unique[index + 1] ?? score.guitar.measures.length + 1) - 1,
    rehearsal: score.guitar.measures[from - 1]?.rehearsal[0] ?? null,
  }));
}

function lineOnGrid(measure: WwhImportedMeasure, midi: number | null, low: number, high: number): WwhAtom[] | null {
  const pitch = midi === null ? null : spell(clamp(midi, low, high));
  return beatOrSmallerLine(measure.beats, measure.beatType, measure.divisions, pitch);
}

function genericPerformance(
  score: WwhDuoScore,
  seed: number,
  sections: WwhPlanSection[]
): { bars: WwhWrittenBar[]; skipped: string[] } {
  const bars: WwhWrittenBar[] = [];
  const skipped: string[] = [];
  const bounds = sectionBounds(score);
  bounds.forEach((bound, index) => {
    const locked = sourceBars(score, bound.from, bound.to, bars.length > 0);
    const start = bars.length + 1;
    bars.push(...locked);
    pushSection(sections, 'performance', start, locked.length, {
      id: `src-${bound.rehearsal ?? index + 1}`,
      sourceBarStart: bound.from,
      sourceBarCount: bound.to - bound.from + 1,
      guitarRole: 'theme',
      bassRole: 'source',
      cue: null,
      sourceLocks: true,
      freedomLevel: 'locked',
      rehearsal: bound.rehearsal,
    });
    const block = spanBlock(score, bound.from, bound.to);
    const mark = bound.rehearsal ?? String(index + 1);
    if (block) {
      skipped.push(`${mark}: development skipped — ${block}`);
      return;
    }
    const length = developedInsertLength(bound.to - bound.from + 1);
    const guitarPitches = score.guitar.measures
      .slice(bound.from - 1, bound.to)
      .flatMap((measure) => measure.notes.map(midiOf))
      .filter((midi): midi is number => midi !== null);
    const bassPitches = score.bass.measures
      .slice(bound.from - 1, bound.to)
      .flatMap((measure) => measure.notes.map(midiOf))
      .filter((midi): midi is number => midi !== null);
    const interval = guitarPitches.length >= 2 ? guitarPitches[1]! - guitarPitches[0]! : 0;
    const inverted = (guitarPitches[0] ?? 72) - interval + (seed % 2);
    const bassMidi = bassPitches[0] ?? 48;
    const last = score.guitar.measures[bound.to - 1]!;
    const lastBass = score.bass.measures[bound.to - 1]!;
    const insert: WwhWrittenBar[] = [];
    for (let i = 0; i < length; i++) {
      const guitarMidi = i === length - 1 ? inverted - 2 : inverted + (i % 2 === 0 ? 0 : 2);
      const guitarLine = lineOnGrid(last, i === 1 ? null : guitarMidi, 60, 81);
      const bassLine = lineOnGrid(lastBass, i === length - 1 ? null : i % 2 === 0 ? bassMidi : bassMidi + 7, 40, 62);
      if (!guitarLine || !bassLine) {
        skipped.push(`${mark}: development skipped — beat does not fit divisions ${last.divisions}`);
        return;
      }
      insert.push({
        guitar: guitarLine,
        bass: bassLine,
        ...contextOf(last, lastBass),
        rehearsal: i === 0 ? `X${index + 1}` : undefined,
        words:
          i === 0
            ? [SKETCH_LABEL, 'Guitar improvisation; bass maintains motif', 'Listen on the empty bar']
            : undefined,
        newSystem: i === 0,
      });
    }
    const insertStart = bars.length + 1;
    bars.push(...insert);
    pushSection(sections, 'performance', insertStart, insert.length, {
      id: `dev-${bound.rehearsal ?? index + 1}`,
      sourceBarStart: null,
      sourceBarCount: null,
      guitarRole: 'answer',
      bassRole: 'motif',
      cue: 'Guitar improvisation; bass maintains motif',
      sourceLocks: false,
      freedomLevel: 'lyrical',
      rehearsal: `X${index + 1}`,
    });
  });
  return { bars, skipped };
}

function genericAlternatives(
  score: WwhDuoScore,
  seed: number,
  sections: WwhPlanSection[]
): { guitar: WwhWrittenBar[]; bass: WwhWrittenBar[]; skipped: string[] } {
  const bound = sectionBounds(score)[0] ?? { from: 1, to: Math.min(4, score.guitar.measures.length), rehearsal: null };
  const skipped: string[] = [];
  const block = gridBlock(score, bound.from, bound.to);
  if (block) {
    skipped.push(`studies skipped — ${block}`);
    return { guitar: [], bass: [], skipped };
  }
  const freedoms = ['minimal', 'lyrical', 'adventurous'] as const;
  const lengths = [2, 3, 3];
  const guitar: WwhWrittenBar[] = [];
  const bass: WwhWrittenBar[] = [];
  freedoms.forEach((freedom, index) => {
    const length = lengths[index] ?? 2;
    const gStart = guitar.length + 1;
    const bStart = bass.length + 1;
    const gBars: WwhWrittenBar[] = [];
    const bBars: WwhWrittenBar[] = [];
    for (let i = 0; i < length; i++) {
      const sourceIndex = bound.from + (i % (bound.to - bound.from + 1));
      const gMeasure = measureAt(score.guitar, sourceIndex);
      const bMeasure = measureAt(score.bass, sourceIndex);
      const midi = 67 + index * 2 + (seed % 2);
      const guitarLine = lineOnGrid(
        gMeasure,
        i === 0 && freedom === 'minimal' ? null : midi + (freedom === 'adventurous' ? 5 : 0),
        60,
        81
      );
      const bassLine = lineOnGrid(bMeasure, freedom === 'minimal' ? 48 : 48 + index * 3, 40, 62);
      if (!guitarLine || !bassLine) {
        skipped.push(`${freedom} skipped — beat does not fit divisions ${gMeasure.divisions}`);
        return;
      }
      const dangling = gMeasure.openTieOut || bMeasure.openTieOut;
      gBars.push({
        guitar: guitarLine,
        bass: dangling ? bassLine : [],
        bassClone: dangling ? undefined : bMeasure.element,
        ...contextOf(gMeasure, bMeasure),
        rehearsal: i === 0 ? `G-${freedom}` : undefined,
        words: i === 0 ? [SKETCH_LABEL, `${freedom} — listen to the bass`] : undefined,
        newSystem: i === 0 && guitar.length + gBars.length > 0,
      });
      bBars.push({
        guitar: dangling ? guitarLine : [],
        guitarClone: dangling ? undefined : gMeasure.element,
        bass: bassLine,
        ...contextOf(gMeasure, bMeasure),
        rehearsal: i === 0 ? `B-${freedom}` : undefined,
        words: i === 0 ? [SKETCH_LABEL, `Bass partner ${freedom}`] : undefined,
        newSystem: i === 0 && bass.length + bBars.length > 0,
      });
    }
    guitar.push(...gBars);
    bass.push(...bBars);
    pushSection(sections, 'guitar_study', gStart, length, {
      id: `generic-guitar-${freedom}`,
      sourceBarStart: bound.from,
      sourceBarCount: bound.to - bound.from + 1,
      guitarRole: freedom,
      bassRole: 'motif',
      cue: `${freedom} guitar alternative`,
      sourceLocks: false,
      freedomLevel: freedom,
      rehearsal: `G-${freedom}`,
    });
    pushSection(sections, 'bass_partner', bStart, length, {
      id: `generic-bass-${freedom}`,
      sourceBarStart: bound.from,
      sourceBarCount: bound.to - bound.from + 1,
      guitarRole: 'theme',
      bassRole: freedom,
      cue: `Bass partner ${freedom}`,
      sourceLocks: false,
      freedomLevel: freedom,
      rehearsal: `B-${freedom}`,
    });
  });
  return { guitar, bass, skipped };
}

function scenarioNote(score: WwhDuoScore): string {
  return `# ${score.title} — V7 scenario note

Artwork is reference only. It is not inside the MusicXML.

- Front cover: \`../../WWH-V5.7-Image-Assets/00-WWH-Front-Cover-Portrait.jpeg\`
- Black Aura / High Priestess: \`../../WWH-V5.7-Image-Assets/01-Black-Aura-High-Priestess.png\`

Practise one section three ways: minimal, lyrical, adventurous. Play guitar against the bass part. Leave the written rests empty.
`;
}

function validationMarkdown(plan: WwhPerformancePlan, checks: string[]): string {
  return `# ${plan.title} — V7 validation

Source: \`${plan.source}\`
SHA-256: \`${plan.sourceSha256}\`
Seed: ${plan.seed}
Command outputs: ${plan.outputType}

## Checks

${checks.map((line) => `- ${line}`).join('\n')}

## Limitations

${plan.limitations.map((line) => `- ${line}`).join('\n')}

MuseScore 4 is the notation check. A written PDF is not playback and is not an import proof.
`;
}

export function composeWwhPerformance(request: WwhComposeRequest): WwhComposeResult {
  const output = request.output ?? 'all';
  const edition = request.edition ?? '7.0';
  const score = importWwhDuoMusicXml(request.xml);
  const sha = createHash('sha256').update(request.xml).digest('hex');
  const sections: WwhPlanSection[] = [];
  const curated =
    (edition === '7.0' || edition === '7.1') &&
    isBlackAura(score, request.sourcePath) &&
    !request.sourcePath.includes('__generic__');
  const stem = stemFor(score, request.sourcePath, edition);
  const skipped: string[] = [];
  const performanceSlices = edition === '7.1' ? BLACK_AURA_V71_PERFORMANCE : BLACK_AURA_PERFORMANCE;
  const guitarStudy = edition === '7.1' ? BLACK_AURA_V71_GUITAR_STUDY : BLACK_AURA_GUITAR_STUDY;
  let performanceBars: WwhWrittenBar[];
  if (curated) {
    performanceBars = assemblePerformance(score, performanceSlices, request.seed, sections);
  } else {
    const generic = genericPerformance(score, request.seed, sections);
    performanceBars = generic.bars;
    skipped.push(...generic.skipped);
  }
  const cues = curated
    ? edition === '7.1'
      ? BLACK_AURA_V71_CUES
      : BLACK_AURA_LEADSHEET_CUES
    : sectionBounds(score).map((bound, index) => {
        const mark = bound.rehearsal ?? String(index + 1);
        const held = skipped.some((line) => line.startsWith(`${mark}:`));
        return {
          sourceBar: bound.to,
          performanceSectionId: `dev-${bound.rehearsal ?? index + 1}`,
          text: held
            ? 'Development not written. Locked span kept. See support reasons.'
            : `After this bar: guitar improvisation; bass maintains motif (${developedInsertLength(bound.to - bound.from + 1)} bars)`,
        };
      });
  const leadsheetBars = leadsheet(score, cues, sections);
  let guitarBars: WwhWrittenBar[];
  let bassBars: WwhWrittenBar[];
  if (curated) {
    guitarBars = assembleStudy(score, guitarStudy, 'guitar_study', sections);
    bassBars = assembleStudy(score, BLACK_AURA_BASS_PARTNER, 'bass_partner', sections);
  } else {
    const generic = genericAlternatives(score, request.seed, sections);
    guitarBars = generic.guitar;
    bassBars = generic.bass;
    skipped.push(...generic.skipped);
  }

  const gridFail =
    !curated &&
    (score.guitar.measures.some((measure) => !measure.gridAgrees) ||
      score.bass.measures.some((measure) => !measure.gridAgrees));
  const rounded =
    score.guitar.measures.some((measure) => measure.roundedTuplet) ||
    score.bass.measures.some((measure) => measure.roundedTuplet);
  const supportReasons = [...skipped];
  if (gridFail) supportReasons.unshift('source duration, note type, dots, or divisions do not agree');
  if (rounded) supportReasons.push('source tuplets rounded to the nearest division were copied, not rewritten');
  const support: WwhSupport =
    curated ? 'pass' : gridFail || guitarBars.length === 0 || bassBars.length === 0 ? 'incomplete' : 'pass';
  const openingTempo = score.guitar.measures[0]?.tempo;
  const quarterTempo = openingTempo ? Number(quarterPerMinute(openingTempo)) : 92;
  const experimental = edition === '7.2';
  const sketch = experimental ? ` — ${SKETCH_LABEL}` : '';
  const headerTempo = curated ? 92 : undefined;

  const plan: WwhPerformancePlan = {
    version: edition,
    title: score.title,
    source: request.sourcePath,
    sourceSha256: sha,
    seed: request.seed,
    tempo: Number.isFinite(quarterTempo) ? quarterTempo : 92,
    outputType: output,
    naturalLanguageParsing: false,
    sections,
    leadsheetCues: cues,
    support,
    supportReasons,
    experimentalSketch: experimental,
    limitations: experimental
      ? [
          'V7.2 performance and study files are EXPERIMENTAL TECHNICAL SKETCHES. The generic insert is not a finished musical development.',
          'Recording leadsheets copy the source. Measure numbers and layout may change. Notes, pitches, onsets, durations, rests, ties, harmony, and navigation are the preservation check.',
          'Development is not inserted through an unresolved tie, a repeat, or an ending.',
          'Dotted-quarter metronome marks stay on that beat unit. Sound tempo is quarter notes per minute.',
          'No tablature. No MIDI. No GUI. No GCE score is claimed.',
          'V7.0 and V7.1 Black Aura files stay the curated baselines. V7.2 does not select them by title.',
        ]
      : [
          'Flight edition writes structured plans only. It does not parse free-text cues.',
          'Black Aura development is a composed sketch from the duo cells, not a claim about improvisational quality.',
          'Seed changes when the new performance guitar enters or thins out. Locked source bars, the leadsheet notes, and the three labelled studies stay put.',
          'No tablature. No MIDI in this edition.',
          'H OPEN ×8 is the source cue made audible. Other new sections are odd lengths so the sketch is not forced into 8/16/32-bar form.',
          edition === '7.1'
            ? 'V7.1 Liquid Harmony moves one voice at a time across Fm, C over F#, Edim, and Ab. It is not a ii–V–I and it is not the Vault planner.'
            : 'V7.0 Liquid Harmony holds a common tone against a moving bass. V7.1 replaces that passage in a separate file.',
          'V7.0 filenames stay the baseline. V7.1 uses the 01-Black-Aura-V7.1 stem.',
        ],
  };

  const want = (kind: WwhPlanSection['outputType']) => output === 'all' || output === kind;
  const files: WwhComposeFile[] = [];
  if (want('performance') && performanceBars.length) {
    files.push({
      name: `${stem}-PERFORMANCE.musicxml`,
      contents: renderWwhDuoScore(performanceBars, header(score, `${edition} duo performance${sketch}`, edition, headerTempo)),
    });
  }
  if (want('leadsheet')) {
    files.push({
      name: `${stem}-RECORDING-LEADSHEET.musicxml`,
      contents: renderWwhDuoScore(leadsheetBars, header(score, `${edition} recording leadsheet`, edition)),
    });
  }
  if (want('guitar_study') && guitarBars.length) {
    files.push({
      name: `${stem}-GUITAR-STUDY.musicxml`,
      contents: renderWwhDuoScore(guitarBars, header(score, `${edition} guitar study${sketch}`, edition, headerTempo)),
    });
  }
  if (want('bass_partner') && bassBars.length) {
    files.push({
      name: `${stem}-BASS-PARTNER.musicxml`,
      contents: renderWwhDuoScore(bassBars, header(score, `${edition} bass partner${sketch}`, edition, headerTempo)),
    });
  }
  files.push({
    name: `${stem}-PERFORMANCE-PLAN.json`,
    contents: `${JSON.stringify(plan, null, 2)}\n`,
  });
  files.push({
    name: `${stem}-SCENARIO-NOTE.md`,
    contents: scenarioNote(score),
  });
  return { plan, files, score };
}

export function lockedGuitarFingerprint(score: WwhDuoScore, from: number, to: number): string {
  return pitchFingerprint(score.guitar.measures.slice(from - 1, to));
}

export { pitchFingerprint };
