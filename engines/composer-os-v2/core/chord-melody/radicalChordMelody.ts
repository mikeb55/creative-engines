/**
 * Radical chord melody under a fixed melody.
 * The melody pitch is never moved, replaced, or dropped.
 */

import { createHash } from 'node:crypto';
import type { CompositionContext } from '../compositionContext';
import { scoreTymoczkoHorizontal } from '../counterpoint/voiceLeadingScorer';
import { GUITAR_MAX_FRET_SPAN, GUITAR_STRETCH_FRET_SPAN, solveGuitarGrip } from '../guitar/voicingFeasibility';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { MotifNoteEvent } from '../motif-ops/types';

export type VoicingSource = 'barry-harris' | 'triad-pair' | 'unrelated-triads' | 'shell-dyads' | 'upper-structure';

export interface ChordMelodyHarmony {
  onset: number;
  symbol?: string;
  collectionMask?: number;
  triads?: string[];
}

export interface ChordMelodyRequest {
  melody: readonly MotifNoteEvent[];
  harmony: readonly ChordMelodyHarmony[];
  source: VoicingSource;
  tuningId: string;
  maxVoices: 2 | 3 | 4;
  maxSpan?: number;
  voiceEvery: 'each-note' | 'strong-beats' | 'harmony-changes';
}

export interface GripChoice {
  onset: number;
  midis: number[];
  frets: Array<{ string: number; fret: number }>;
  span: number;
  stretch: boolean;
}

export interface RejectedGrip {
  onset: number;
  midis: number[];
  reason: string;
}

export interface ChordMelodyResult {
  musicXml: string;
  grips: GripChoice[];
  unvoiced: Array<{ onset: number; reason: string }>;
  rejected: RejectedGrip[];
  receipt: {
    version: 'radical-chord-melody-1';
    source: VoicingSource;
    tuningId: string;
    inputSha256: string;
    musicalQualityScore: null;
    musicallyApproved: false;
    melodyPreserved: true;
    notes: string[];
  };
}

const STEPS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const WORLD_F = ['C', 'Eb', 'F#'];

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function parseRoot(symbol: string): { pc: number; rest: string } | null {
  const match = /^([A-G](?:#|b)?)(.*)$/.exec(symbol.trim());
  if (!match) return null;
  const pc = STEPS[match[1]!];
  if (pc === undefined) return null;
  return { pc, rest: match[2] ?? '' };
}

function triadPcs(symbol: string): number[] | null {
  const parsed = parseRoot(symbol.replace(/maj$|major$/i, ''));
  if (!parsed) return null;
  const minor = /^m(?!aj)/i.test(parsed.rest);
  const shape = minor ? [0, 3, 7] : [0, 4, 7];
  return shape.map((interval) => mod12(parsed.pc + interval));
}

function guideTones(symbol: string): number[] | null {
  const parsed = parseRoot(symbol);
  if (!parsed) return null;
  const rest = parsed.rest.toLowerCase();
  const minor = rest.startsWith('m') && !rest.startsWith('maj');
  const majorSeven = rest.includes('maj7') || rest.includes('maj9') || rest === 'm' && false;
  const seventh = minor ? 10 : majorSeven || rest.includes('maj') ? 11 : 10;
  const third = minor ? 3 : 4;
  return [mod12(parsed.pc + third), mod12(parsed.pc + seventh)];
}

function upperPcs(symbol: string): number[] | null {
  const parsed = parseRoot(symbol);
  if (!parsed) return null;
  return [2, 6, 9].map((interval) => mod12(parsed.pc + interval));
}

function harmonyAt(request: ChordMelodyRequest, onset: number): ChordMelodyHarmony {
  const rows = [...request.harmony].sort((a, b) => a.onset - b.onset);
  let current = rows[0] ?? { onset: 0 };
  for (const row of rows) {
    if (row.onset <= onset) current = row;
  }
  return current;
}

function collections(request: ChordMelodyRequest, onset: number): number[][] {
  const row = harmonyAt(request, onset);
  if (request.source === 'triad-pair' || request.source === 'unrelated-triads') {
    const names = row.triads?.length ? row.triads : request.source === 'unrelated-triads' ? WORLD_F : [];
    return names.map(triadPcs).filter((pcs): pcs is number[] => Boolean(pcs));
  }
  if (request.source === 'shell-dyads') {
    const guides = row.symbol ? guideTones(row.symbol) : null;
    return guides ? [guides] : [];
  }
  if (request.source === 'upper-structure') {
    const upper = row.symbol ? upperPcs(row.symbol) : null;
    return upper ? [upper] : [];
  }
  return [];
}

function below(pc: number, melody: number): number[] {
  const found: number[] = [];
  for (let midi = melody - 1; midi >= melody - 24; midi -= 1) {
    if (mod12(midi) === pc) found.push(midi);
  }
  return found;
}

function combinations(lists: number[][]): number[][] {
  let rows: number[][] = [[]];
  for (const list of lists) {
    const next: number[][] = [];
    for (const row of rows) {
      for (const midi of list) next.push([...row, midi]);
    }
    rows = next;
  }
  return rows;
}

function shouldVoice(request: ChordMelodyRequest, onset: number, index: number): boolean {
  if (request.voiceEvery === 'each-note') return true;
  if (request.voiceEvery === 'strong-beats') return onset % 4 === 0 || onset % 4 === 2;
  const current = harmonyAt(request, onset);
  const previous = index === 0 ? null : harmonyAt(request, request.melody[index - 1]!.onset);
  if (!previous) return true;
  return current.symbol !== previous.symbol || JSON.stringify(current.triads ?? []) !== JSON.stringify(previous.triads ?? []);
}

function choose(melody: number, pools: number[][], previous: number[] | null, tuningId: string, maxSpan: number, rejected: RejectedGrip[], onset: number): GripChoice | null {
  const playable: Array<{ midis: number[]; span: number; fret: number; frets: GripChoice['frets']; stretch: boolean; score: number }> = [];
  for (const pool of pools) {
    if (!pool.includes(mod12(melody))) {
      rejected.push({ onset, midis: [melody], reason: 'triad does not contain the melody pitch class' });
      continue;
    }
    const others = pool.filter((pc) => pc !== mod12(melody));
    const lists = others.map((pc) => below(pc, melody));
    if (lists.some((list) => list.length === 0)) {
      rejected.push({ onset, midis: [melody], reason: 'no chord tone sits below the melody' });
      continue;
    }
    for (const choice of combinations(lists)) {
      const midis = [melody, ...choice].sort((a, b) => b - a);
      if (midis[0] !== melody) {
        rejected.push({ onset, midis, reason: 'melody would not be the top sounding note' });
        continue;
      }
      const solved = solveGuitarGrip(midis, { tuningId, maxSpan: GUITAR_STRETCH_FRET_SPAN });
      if (!solved.feasible || solved.fretSpan > GUITAR_STRETCH_FRET_SPAN) {
        rejected.push({ onset, midis, reason: 'no playable grip within span 5' });
        continue;
      }
      if (solved.fretSpan > maxSpan && solved.fretSpan > GUITAR_STRETCH_FRET_SPAN) {
        rejected.push({ onset, midis, reason: 'span exceeds the stretch limit' });
        continue;
      }
      const inners = midis.slice(1);
      const prevInners = previous ? previous.slice(1) : inners;
      const score = previous
        ? scoreTymoczkoHorizontal(
            prevInners[0] ?? 0,
            inners[0] ?? 0,
            prevInners[1] ?? prevInners[0] ?? 0,
            inners[1] ?? inners[0] ?? 0,
            previous[0] ?? melody,
            melody,
          )
        : 1;
      playable.push({
        midis,
        span: solved.fretSpan,
        fret: solved.lowestFret,
        frets: solved.frets,
        stretch: solved.fretSpan > maxSpan,
        score,
      });
    }
  }
  const preferred = playable.filter((item) => item.span <= maxSpan);
  const pool = preferred.length ? preferred : playable.filter((item) => item.stretch);
  if (!pool.length) return null;
  pool.sort((a, b) => b.score - a.score || a.span - b.span || a.fret - b.fret || a.midis.join(',').localeCompare(b.midis.join(',')));
  const winner = pool[0]!;
  for (const loser of pool.slice(1)) {
    rejected.push({ onset, midis: loser.midis, reason: 'another grip moves the inner voices less or sits in a smaller span' });
  }
  return { onset, midis: winner.midis, frets: winner.frets, span: winner.span, stretch: winner.stretch || winner.span > GUITAR_MAX_FRET_SPAN };
}

function barryHarrisNotes(request: ChordMelodyRequest): { notes: Array<{ onset: number; midis: number[] }> | null; reason: string | null } {
  try {
    const melody = request.melody.filter((event) => event.midi !== null);
    const totalBars = Math.max(1, ...melody.map((event) => Math.floor(event.onset / 4) + 1));
    const symbols = Array.from({ length: totalBars }, (_, index) => {
      const row = request.harmony.find((item) => Math.floor(item.onset / 4) === index);
      return row?.symbol ?? 'Cmaj7';
    });
    const context = {
      form: { totalBars, sections: [] },
      lockedHarmonyBarsRaw: symbols,
      generationMetadata: {},
    } as unknown as CompositionContext;
    const foundationMod = require('../barry-harris/precomputeFoundation') as {
      precomputeBarryHarrisChordMelodyFoundation: (context: CompositionContext) => unknown;
    };
    const pipelineMod = require('../barry-harris/chordMelodyPipeline') as {
      runBarryHarrisChordMelodyPipeline: (
        foundation: unknown,
        melody: ImportMelodyNote[],
        totalBars: number,
        symbols: string[],
        options: { presetId: string },
      ) => { resolvedNotes: Array<{ bar: number; onsetBeat: number; innerVoicingMidis?: number[] }> };
    };
    const foundation = foundationMod.precomputeBarryHarrisChordMelodyFoundation(context);
    const imported: ImportMelodyNote[] = melody.map((event) => ({
      bar: Math.floor(event.onset / 4) + 1,
      onsetBeat: event.onset % 4,
      durationBeats: event.duration,
      midiPitch: event.midi!,
      confidence: 1,
      fieldOrigin: 'explicit',
    }));
    const pipeline = pipelineMod.runBarryHarrisChordMelodyPipeline(foundation, imported, totalBars, symbols, { presetId: 'guitar_bass_duo' });
    return {
      notes: pipeline.resolvedNotes.map((note) => {
        const melodyMidi = imported.find((item) => item.bar === note.bar && item.onsetBeat === note.onsetBeat)?.midiPitch ?? null;
        const inners = (note.innerVoicingMidis ?? []).filter((midi) => melodyMidi === null || midi < melodyMidi);
        return { onset: (note.bar - 1) * 4 + note.onsetBeat, midis: melodyMidi === null ? inners : [melodyMidi, ...inners] };
      }),
      reason: null,
    };
  } catch (error) {
    return { notes: null, reason: error instanceof Error ? error.message : String(error) };
  }
}

function spell(midi: number): { step: string; alter: number; octave: number } {
  const pc = mod12(midi);
  const name = NAMES[pc]!;
  const alter = name.includes('#') ? 1 : 0;
  return { step: name[0]!, alter, octave: Math.floor(midi / 12) - 1 };
}

function pitchXml(midi: number): string {
  const note = spell(midi);
  const alter = note.alter ? `<alter>${note.alter}</alter>` : '';
  return `<pitch><step>${note.step}</step>${alter}<octave>${note.octave}</octave></pitch>`;
}

function musicXml(melody: readonly MotifNoteEvent[], grips: readonly GripChoice[]): string {
  const divisions = 2;
  const notes: string[] = [];
  let barOnset = 0;
  let cursor = 0;
  const close = () => {
    const remain = 4 - (cursor - barOnset);
    if (remain > 0.001) notes.push(`<note><rest/><duration>${Math.round(remain * divisions)}</duration><voice>1</voice></note>`);
  };
  const sounding = melody.filter((event) => event.midi !== null);
  for (const event of sounding) {
    while (event.onset >= barOnset + 4) {
      close();
      notes.push('</measure><measure number="next">');
      barOnset += 4;
      cursor = barOnset;
    }
    if (event.onset > cursor + 0.001) {
      notes.push(`<note><rest/><duration>${Math.round((event.onset - cursor) * divisions)}</duration><voice>1</voice></note>`);
    }
    const duration = Math.max(1, Math.round(event.duration * divisions));
    notes.push(`<note>${pitchXml(event.midi!)}<duration>${duration}</duration><voice>1</voice><type>quarter</type></note>`);
    const grip = grips.find((item) => item.onset === event.onset);
    const lowers = grip ? grip.midis.filter((midi) => midi !== event.midi) : [];
    if (lowers.length) {
      notes.push(`<backup><duration>${duration}</duration></backup>`);
      lowers.forEach((midi, index) => {
        const chord = index === 0 ? '' : '<chord/>';
        notes.push(`<note>${chord}${pitchXml(midi)}<duration>${duration}</duration><voice>2</voice></note>`);
      });
    }
    cursor = event.onset + event.duration;
  }
  close();
  let measure = 1;
  const body = notes.join('').replace(/number="next"/g, () => {
    measure += 1;
    return `number="${measure}"`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      ${body}
    </measure>
  </part>
</score-partwise>`;
}

export function voiceRadicalChordMelody(request: ChordMelodyRequest): ChordMelodyResult {
  const maxSpan = request.maxSpan ?? GUITAR_MAX_FRET_SPAN;
  const grips: GripChoice[] = [];
  const unvoiced: ChordMelodyResult['unvoiced'] = [];
  const rejected: RejectedGrip[] = [];
  const notes: string[] = [];
  let previous: number[] | null = null;
  const barry = request.source === 'barry-harris' ? barryHarrisNotes(request) : { notes: null, reason: null };
  if (barry.reason) notes.push(`Barry Harris pipeline did not voice this melody. ${barry.reason}`);

  request.melody.forEach((event, index) => {
    if (event.midi === null) return;
    if (!shouldVoice(request, event.onset, index)) return;
    if (request.source === 'barry-harris') {
      const found = barry.notes?.find((item) => item.onset === event.onset);
      const midis = found?.midis?.length ? [...found.midis] : [event.midi];
      if (midis[0] !== event.midi) midis.unshift(event.midi);
      const unique = [...new Set(midis)].sort((a, b) => b - a);
      if (unique[0] !== event.midi) {
        unvoiced.push({ onset: event.onset, reason: 'Barry Harris stack put another pitch above the melody. The melody note is kept alone.' });
        rejected.push({ onset: event.onset, midis: unique, reason: 'melody would not be the top sounding note' });
        return;
      }
      const solved = unique.length === 1 ? null : solveGuitarGrip(unique, { tuningId: request.tuningId, maxSpan: GUITAR_STRETCH_FRET_SPAN });
      if (!solved || !solved.feasible) {
        unvoiced.push({ onset: event.onset, reason: barry.reason ?? 'no playable grip within span 5' });
        rejected.push({ onset: event.onset, midis: unique, reason: 'no playable grip within span 5' });
        return;
      }
      const grip = { onset: event.onset, midis: unique, frets: solved.frets, span: solved.fretSpan, stretch: solved.fretSpan > maxSpan };
      grips.push(grip);
      previous = unique;
      return;
    }
    const pools = collections(request, event.onset).map((pcs) => pcs.slice(0, Math.max(1, request.maxVoices)));
    if (!pools.length) {
      unvoiced.push({ onset: event.onset, reason: 'no voicing collection for this onset' });
      return;
    }
    const containing = pools.filter((pcs) => pcs.includes(mod12(event.midi!)));
    const ordered = request.source === 'triad-pair' && previous
      ? [...containing].sort((a, b) => Number(sameTriad(a, previous!)) - Number(sameTriad(b, previous!)))
      : containing;
    const grip = choose(event.midi, ordered.length ? ordered : pools, previous, request.tuningId, maxSpan, rejected, event.onset);
    if (!grip) {
      unvoiced.push({ onset: event.onset, reason: 'no playable grip within span 5' });
      return;
    }
    grips.push(grip);
    previous = grip.midis;
  });

  const xml = musicXml(request.melody, grips);
  for (const event of request.melody) {
    if (event.midi === null) continue;
    if (!xml.includes(`<octave>${spell(event.midi).octave}</octave>`)) {
      notes.push(`Melody MIDI ${event.midi} is missing from the score text.`);
    }
  }
  return {
    musicXml: xml,
    grips,
    unvoiced,
    rejected,
    receipt: {
      version: 'radical-chord-melody-1',
      source: request.source,
      tuningId: request.tuningId,
      inputSha256: createHash('sha256').update(JSON.stringify(request.melody)).digest('hex'),
      musicalQualityScore: null,
      musicallyApproved: false,
      melodyPreserved: true,
      notes,
    },
  };
}

function sameTriad(pcs: readonly number[], previous: readonly number[]): boolean {
  const prev = new Set(previous.map(mod12));
  return pcs.every((pc) => prev.has(pc));
}
