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
  wwhBarTicks,
  type WwhAtom,
  type WwhOutputKind,
  type WwhPerformancePlan,
  type WwhPlanSection,
} from './wwhPerformanceTypes';

export interface WwhComposeRequest {
  xml: string;
  sourcePath: string;
  seed: number;
  output?: WwhOutputKind;
  /** 7.0 is the frozen baseline. 7.1 writes a separate stem and does not replace those files. */
  edition?: '7.0' | '7.1';
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

function stemFor(score: WwhDuoScore, edition: '7.0' | '7.1'): string {
  if (/black aura/i.test(score.title)) return edition === '7.1' ? '01-Black-Aura-V7.1' : '01-Black-Aura-V7';
  const slug = score.title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Duo';
  return `${slug}-V7`;
}

function header(score: WwhDuoScore, movement: string, edition: '7.0' | '7.1', tempo?: number): WwhScoreHeader {
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

function sourceBars(score: WwhDuoScore, from: number, to: number, newSystem: boolean): WwhWrittenBar[] {
  const bars: WwhWrittenBar[] = [];
  for (let bar = from; bar <= to; bar++) {
    const guitar = measureAt(score.guitar, bar);
    const bass = measureAt(score.bass, bar);
    bars.push({
      guitar: [],
      bass: [],
      beats: guitar.beats,
      beatType: guitar.beatType,
      guitarClone: guitar.element,
      bassClone: bass.element,
      newSystem: newSystem && bar === from,
    });
  }
  return bars;
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
    return {
      guitar: guitar[index] ?? [],
      bass: [],
      beats: bass.beats,
      beatType: bass.beatType,
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
      return {
        guitar: guitarMeasure ? [] : block.guitar[index] ?? [],
        bass: bassMeasure ? [] : block.bass?.[index] ?? [],
        beats: meter?.beats ?? 4,
        beatType: meter?.beatType ?? 4,
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

function restsFor(ticks: number): WwhAtom[] {
  const pieces: Array<[number, string, number]> = [
    [1024, 'whole', 0],
    [768, 'half', 1],
    [512, 'half', 0],
    [384, 'quarter', 1],
    [256, 'quarter', 0],
    [128, 'eighth', 0],
    [64, '16th', 0],
  ];
  const out: WwhAtom[] = [];
  let left = ticks;
  for (const [divisions, type, dots] of pieces) {
    while (left >= divisions) {
      out.push({ rest: true, divisions, type, dots });
      left -= divisions;
    }
  }
  if (left !== 0) throw new Error(`cannot fill ${ticks} divisions`);
  return out;
}

function pitchedQuarter(midi: number, ticks: number): WwhAtom[] {
  const spelled = spell(clamp(midi, 60, 81));
  const note: WwhAtom = {
    rest: false,
    step: spelled.step,
    alter: spelled.alter,
    octave: spelled.octave,
    divisions: 256,
    type: 'quarter',
    dots: 0,
  };
  if (ticks < 256) {
    return restsFor(ticks);
  }
  return [note, ...restsFor(ticks - 256)];
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

function genericPerformance(score: WwhDuoScore, seed: number, sections: WwhPlanSection[]): WwhWrittenBar[] {
  const bars: WwhWrittenBar[] = [];
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
    const length = developedInsertLength(bound.to - bound.from + 1);
    const guitarPitches = score.guitar.measures
      .slice(bound.from - 1, bound.to)
      .flatMap((measure) => measure.notes.map(midiOf))
      .filter((midi): midi is number => midi !== null);
    const bassPitches = score.bass.measures
      .slice(bound.from - 1, bound.to)
      .flatMap((measure) => measure.notes.map(midiOf))
      .filter((midi): midi is number => midi !== null);
    const interval = guitarPitches.length >= 2 ? (guitarPitches[1]! - guitarPitches[0]!) : 0;
    const inverted = (guitarPitches[0] ?? 72) - interval + (seed % 2);
    const bassMidi = bassPitches[0] ?? 48;
    const last = score.guitar.measures[bound.to - 1]!;
    const ticks = wwhBarTicks(last.beats, last.beatType, last.divisions);
    const insert: WwhWrittenBar[] = [];
    for (let i = 0; i < length; i++) {
      const guitarMidi = i === length - 1 ? inverted - 2 : inverted + (i % 2 === 0 ? 0 : 2);
      const bassSpell = spell(clamp(i % 2 === 0 ? bassMidi : bassMidi + 7, 40, 60));
      insert.push({
        guitar: i === 1 ? restsFor(ticks) : pitchedQuarter(guitarMidi, ticks),
        bass:
          i === length - 1
            ? restsFor(ticks)
            : [
                {
                  rest: false,
                  step: bassSpell.step,
                  alter: bassSpell.alter,
                  octave: bassSpell.octave,
                  divisions: Math.min(512, ticks),
                  type: ticks >= 512 ? 'half' : 'quarter',
                  dots: 0,
                },
                ...restsFor(ticks - Math.min(512, ticks)),
              ],
        beats: last.beats,
        beatType: last.beatType,
        rehearsal: i === 0 ? `X${index + 1}` : undefined,
        words:
          i === 0
            ? ['Guitar improvisation; bass maintains motif', 'Listen on the empty bar']
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
  return bars;
}

function genericAlternatives(score: WwhDuoScore, seed: number, sections: WwhPlanSection[]): { guitar: WwhWrittenBar[]; bass: WwhWrittenBar[] } {
  const bound = sectionBounds(score)[0] ?? { from: 1, to: Math.min(4, score.guitar.measures.length), rehearsal: null };
  const freedoms = ['minimal', 'lyrical', 'adventurous'] as const;
  const lengths = [2, 3, 3];
  const guitar: WwhWrittenBar[] = [];
  const bass: WwhWrittenBar[] = [];
  freedoms.forEach((freedom, index) => {
    const length = lengths[index] ?? 2;
    const gStart = guitar.length + 1;
    const bStart = bass.length + 1;
    for (let i = 0; i < length; i++) {
      const sourceIndex = bound.from + (i % (bound.to - bound.from + 1));
      const gMeasure = measureAt(score.guitar, sourceIndex);
      const bMeasure = measureAt(score.bass, sourceIndex);
      const ticks = wwhBarTicks(gMeasure.beats, gMeasure.beatType, gMeasure.divisions);
      const midi = 67 + index * 2 + (seed % 2);
      guitar.push({
        guitar: i === 0 && freedom === 'minimal' ? restsFor(ticks) : pitchedQuarter(midi - (freedom === 'adventurous' ? -5 : 0), ticks),
        bass: [],
        bassClone: bMeasure.element,
        beats: bMeasure.beats,
        beatType: bMeasure.beatType,
        rehearsal: i === 0 ? `G-${freedom}` : undefined,
        words: i === 0 ? [`${freedom} — listen to the bass`] : undefined,
        newSystem: i === 0 && guitar.length > 0,
      });
      bass.push({
        guitar: [],
        guitarClone: gMeasure.element,
        bass: freedom === 'minimal' ? [{ rest: false, ...spell(clamp(48, 40, 60)), divisions: Math.min(512, ticks), type: 'half', dots: 0 }, ...restsFor(ticks - Math.min(512, ticks))] : pitchedQuarter(48 + index * 3, ticks).map((atom) => {
          if (!atom.rest && atom.octave !== undefined && atom.octave > 4) return { ...atom, octave: atom.octave - 1 };
          return atom;
        }),
        beats: gMeasure.beats,
        beatType: gMeasure.beatType,
        rehearsal: i === 0 ? `B-${freedom}` : undefined,
        words: i === 0 ? [`Bass partner ${freedom}`] : undefined,
        newSystem: i === 0 && bass.length > 0,
      });
    }
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
  return { guitar, bass };
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

Sibelius import was not treated as proven unless a later line says a file was opened.
`;
}

export function composeWwhPerformance(request: WwhComposeRequest): WwhComposeResult {
  const output = request.output ?? 'all';
  const edition = request.edition ?? '7.0';
  const score = importWwhDuoMusicXml(request.xml);
  const sha = createHash('sha256').update(request.xml).digest('hex');
  const sections: WwhPlanSection[] = [];
  const blackAura = isBlackAura(score, request.sourcePath) && !request.sourcePath.includes('__generic__');
  const stem = stemFor(score, edition);
  const cues = blackAura
    ? edition === '7.1'
      ? BLACK_AURA_V71_CUES
      : BLACK_AURA_LEADSHEET_CUES
    : sectionBounds(score).map((bound, index) => ({
        sourceBar: bound.to,
        performanceSectionId: `dev-${bound.rehearsal ?? index + 1}`,
        text: `After this bar: guitar improvisation; bass maintains motif (${developedInsertLength(bound.to - bound.from + 1)} bars)`,
      }));

  const performanceSlices = edition === '7.1' ? BLACK_AURA_V71_PERFORMANCE : BLACK_AURA_PERFORMANCE;
  const guitarStudy = edition === '7.1' ? BLACK_AURA_V71_GUITAR_STUDY : BLACK_AURA_GUITAR_STUDY;
  const performanceBars = blackAura
    ? assemblePerformance(score, performanceSlices, request.seed, sections)
    : genericPerformance(score, request.seed, sections);
  const leadsheetBars = leadsheet(score, cues, sections);
  let guitarBars: WwhWrittenBar[];
  let bassBars: WwhWrittenBar[];
  if (blackAura) {
    guitarBars = assembleStudy(score, guitarStudy, 'guitar_study', sections);
    bassBars = assembleStudy(score, BLACK_AURA_BASS_PARTNER, 'bass_partner', sections);
  } else {
    const generic = genericAlternatives(score, request.seed, sections);
    guitarBars = generic.guitar;
    bassBars = generic.bass;
  }

  const plan: WwhPerformancePlan = {
    version: edition,
    title: score.title,
    source: request.sourcePath,
    sourceSha256: sha,
    seed: request.seed,
    tempo: 92,
    outputType: output,
    naturalLanguageParsing: false,
    sections,
    leadsheetCues: cues,
    limitations: [
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
  if (want('performance')) {
    files.push({
      name: `${stem}-PERFORMANCE.musicxml`,
      contents: renderWwhDuoScore(performanceBars, header(score, `${edition} duo performance`, edition, 92)),
    });
  }
  if (want('leadsheet')) {
    files.push({
      name: `${stem}-RECORDING-LEADSHEET.musicxml`,
      contents: renderWwhDuoScore(leadsheetBars, header(score, `${edition} leadsheet`, edition)),
    });
  }
  if (want('guitar_study')) {
    files.push({
      name: `${stem}-GUITAR-STUDY.musicxml`,
      contents: renderWwhDuoScore(guitarBars, header(score, `${edition} guitar study`, edition, 92)),
    });
  }
  if (want('bass_partner')) {
    files.push({
      name: `${stem}-BASS-PARTNER.musicxml`,
      contents: renderWwhDuoScore(bassBars, header(score, `${edition} bass partner`, edition, 92)),
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
