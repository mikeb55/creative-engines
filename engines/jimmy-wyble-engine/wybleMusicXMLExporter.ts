/**
 * Wyble MusicXML Exporter
 * Two-staff guitar study with correct measure duration accounting.
 * Each measure sums exactly to 16 divisions (4/4).
 */

import type { WybleEtudeResult } from './wybleEtudeGenerator';
import type { NoteEvent } from './wybleTypes';

const DIVISIONS = 4;
const BEATS_PER_MEASURE = 4;
const MEASURE_DURATION = BEATS_PER_MEASURE * DIVISIONS;

function midiToPitch(midi: number): { step: string; alter: number; octave: number } {
  const semitones = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const stepMap: Record<number, { step: string; alter: number }> = {
    0: { step: 'C', alter: 0 }, 1: { step: 'C', alter: 1 }, 2: { step: 'D', alter: 0 },
    3: { step: 'D', alter: 1 }, 4: { step: 'E', alter: 0 }, 5: { step: 'F', alter: 0 },
    6: { step: 'F', alter: 1 }, 7: { step: 'G', alter: 0 }, 8: { step: 'G', alter: 1 },
    9: { step: 'A', alter: 0 }, 10: { step: 'A', alter: 1 }, 11: { step: 'B', alter: 0 },
  };
  const { step, alter } = stepMap[semitones];
  return { step, alter, octave };
}

function durationToType(divs: number): string {
  if (divs <= 1) return '16th';
  if (divs <= 2) return 'eighth';
  if (divs <= 4) return 'quarter';
  if (divs <= 8) return 'half';
  return 'whole';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Build beat-indexed slots: each slot has at most one upper and one lower event. */
function buildMeasureSlots(result: WybleEtudeResult): Array<{ upper?: NoteEvent; lower?: NoteEvent }>[] {
  const upper = result.upper_line.events;
  const lower = result.lower_line.events;
  const totalBeats = result.bars * BEATS_PER_MEASURE;
  const allSlots: Array<{ upper?: NoteEvent; lower?: NoteEvent }> = [];
  let uIdx = 0;
  let lIdx = 0;

  for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
    const slot: { upper?: NoteEvent; lower?: NoteEvent } = {};
    if (uIdx < upper.length && upper[uIdx].isDyad && lIdx < lower.length) {
      slot.upper = upper[uIdx];
      slot.lower = lower[lIdx];
      uIdx++;
      lIdx++;
    } else if (beatIndex % 2 === 0 && uIdx < upper.length) {
      slot.upper = upper[uIdx];
      uIdx++;
    } else if (lIdx < lower.length) {
      slot.lower = lower[lIdx];
      lIdx++;
    }
    allSlots.push(slot);
  }

  const measures: Array<{ upper?: NoteEvent; lower?: NoteEvent }>[] = [];
  for (let m = 0; m < result.bars; m++) {
    measures.push(allSlots.slice(m * BEATS_PER_MEASURE, (m + 1) * BEATS_PER_MEASURE));
  }
  return measures;
}

function measureToXml(
  measureIndex: number,
  slots: Array<{ upper?: NoteEvent; lower?: NoteEvent }>,
  divisions: number
): string {
  const durVal = 1 * divisions;
  const durType = durationToType(durVal);

  let xml = `  <measure number="${measureIndex + 1}">\n`;

  if (measureIndex === 0) {
    xml += `    <attributes>
      <divisions>${divisions}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <staves>2</staves>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>G</sign><line>2</line></clef>
    </attributes>\n`;
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];

    if (slot.upper) {
      const { step, alter, octave } = midiToPitch(slot.upper.pitch);
      const alterEl = alter !== 0 ? `\n        <alter>${alter}</alter>` : '';
      xml += `    <note>
      <pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>
      <duration>${durVal}</duration>
      <type>${durType}</type>
      <voice>1</voice>
      <staff>1</staff>
    </note>\n`;
    }

    if (slot.lower) {
      if (slot.upper) {
        xml += `    <backup><duration>${durVal}</duration></backup>\n`;
      }
      const { step, alter, octave } = midiToPitch(slot.lower.pitch);
      const alterEl = alter !== 0 ? `\n        <alter>${alter}</alter>` : '';
      xml += `    <note>
      <pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>
      <duration>${durVal}</duration>
      <type>${durType}</type>
      <voice>2</voice>
      <staff>2</staff>
    </note>\n`;
    }

    if (!slot.upper && !slot.lower) {
      xml += `    <note>
      <rest/>
      <duration>${durVal}</duration>
      <type>${durType}</type>
      <voice>1</voice>
      <staff>1</staff>
    </note>\n`;
    }
  }

  xml += `  </measure>\n`;
  return xml;
}

export function exportToMusicXML(
  result: WybleEtudeResult,
  options?: { title?: string }
): string {
  const measures = buildMeasureSlots(result);
  const title = options?.title ?? 'Wyble Etude';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Guitar</part-name>
      <score-instrument id="P1-I1"><instrument-name>Guitar</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
`;

  for (let m = 0; m < measures.length; m++) {
    xml += measureToXml(m, measures[m], DIVISIONS);
  }

  xml += `  </part>
</score-partwise>
`;
  return xml;
}
