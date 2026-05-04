import type { GenerationMode } from '../generation';
import { generateVaultRiff, type ScoreNote } from '../guitar/vaultRiffGenerator';
import { inspectChordSymbol } from './chordSymbolMapper';

export type InspectChordToMusicXmlOptions = {
  bars?: 1 | 2 | 4;
  mode?: GenerationMode;
  tuningId?: string;
  riffStyle?: 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string' | 'bebop-placement';
};

const DIVISIONS = 2;
/** Quarter-note beats per 4/4 measure. */
const BEATS_PER_MEASURE = 4;
const DIVISIONS_PER_MEASURE = DIVISIONS * BEATS_PER_MEASURE;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** MusicXML string number: 1 = high E … 6 = low E; `guitarString` is 0..5 low→high index from vault generator. */
function toMusicXmlStringNumber(guitarString: number): number {
  return 6 - guitarString;
}

function midiToPitch(midi: number): { step: string; alter?: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const table: { step: string; alter?: number }[] = [
    { step: 'C' },
    { step: 'C', alter: 1 },
    { step: 'D' },
    { step: 'D', alter: 1 },
    { step: 'E' },
    { step: 'F' },
    { step: 'F', alter: 1 },
    { step: 'G' },
    { step: 'G', alter: 1 },
    { step: 'A' },
    { step: 'A', alter: 1 },
    { step: 'B' },
  ];
  const row = table[pc]!;
  return row.alter !== undefined
    ? { step: row.step, alter: row.alter, octave }
    : { step: row.step, octave };
}

function pitchXml(midi: number): string {
  const p = midiToPitch(midi);
  const alter =
    p.alter !== undefined && p.alter !== 0
      ? `\n          <alter>${p.alter}</alter>`
      : '';
  return `<pitch>
          <step>${p.step}</step>${alter}
          <octave>${p.octave}</octave>
        </pitch>`;
}

function technicalXml(n: ScoreNote): string {
  if (typeof n.guitarString !== 'number' || typeof n.guitarFret !== 'number') return '';
  const str = toMusicXmlStringNumber(n.guitarString);
  return `
        <notations>
          <technical>
            <string>${str}</string>
            <fret>${n.guitarFret}</fret>
          </technical>
        </notations>`;
}

function measureNotesXml(measureNumber: number, notes: ScoreNote[], isFirstMeasure: boolean): string {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  let cursor = 0;
  const lines: string[] = [];

  const attrs = isFirstMeasure
    ? `
        <attributes>
          <divisions>${DIVISIONS}</divisions>
          <key><fifths>0</fifths></key>
          <time>
            <beats>4</beats>
            <beat-type>4</beat-type>
          </time>
          <clef>
            <sign>G</sign>
            <line>2</line>
          </clef>
        </attributes>`
    : '';

  if (sorted.length === 0) {
    lines.push(`<note>
          <rest />
          <duration>${DIVISIONS_PER_MEASURE}</duration>
          <voice>1</voice>
          <type>whole</type>
        </note>`);
  } else {
    for (const n of sorted) {
      const pos = Math.round(n.startBeat * DIVISIONS);
      if (pos > cursor) {
        lines.push(`<forward><duration>${pos - cursor}</duration></forward>`);
        cursor = pos;
      }
      const durDiv = Math.round(n.duration * DIVISIONS);
      lines.push(`<note>
        ${pitchXml(n.pitch)}
          <duration>${durDiv}</duration>
          <voice>1</voice>
          <type>eighth</type>
          <stem>up</stem>${technicalXml(n)}
        </note>`);
      cursor += durDiv;
    }
    if (cursor < DIVISIONS_PER_MEASURE) {
      lines.push(`<forward><duration>${DIVISIONS_PER_MEASURE - cursor}</duration></forward>`);
    }
  }

  return `    <measure number="${measureNumber}">
${attrs}
${lines.join('\n')}
    </measure>`;
}

function scoreNotesToMusicXml(notes: ScoreNote[], barCount: number): string {
  const byBar = new Map<number, ScoreNote[]>();
  for (const n of notes) {
    const list = byBar.get(n.barIndex) ?? [];
    list.push(n);
    byBar.set(n.barIndex, list);
  }

  const measures: string[] = [];
  for (let m = 1; m <= barCount; m++) {
    measures.push(measureNotesXml(m, byBar.get(m) ?? [], m === 1));
  }

  const title = 'Chord inspector riff';
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Guitar</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${measures.join('\n')}
  </part>
</score-partwise>`;
}

/**
 * Inspect a chord symbol, generate a vault riff, and return minimal MusicXML (4/4, treble clef, guitar string/fret technical).
 */
export function inspectChordToMusicXml(input: string, options?: InspectChordToMusicXmlOptions): string | null {
  const inspected = inspectChordSymbol(input, options?.tuningId);
  if (!inspected) return null;

  const bars = options?.bars ?? 2;
  const mode: GenerationMode = options?.mode ?? 'solo';
  const riffStyle =
    options?.riffStyle ?? (mode === 'melody' ? 'quadratonic' : 'bebop-placement');

  const notes = generateVaultRiff({
    chordTypeId: inspected.vaultChordTypeId,
    rootPc: inspected.rootPc,
    bars,
    style: riffStyle,
    tuningId: options?.tuningId ?? 'standard',
  });

  if (notes.length === 0) return null;

  return scoreNotesToMusicXml(notes, bars);
}
