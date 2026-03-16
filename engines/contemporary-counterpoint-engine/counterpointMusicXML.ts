/**
 * Contemporary Counterpoint — MusicXML export with correct measure structure
 * Each measure sums to exactly 4/4 (16 divisions). Notes crossing barlines use ties.
 */

import type { CounterpointOutput, CounterpointNote } from './counterpointTypes';

const DIVISIONS = 4;
const MEASURE_DURATION = 4 * DIVISIONS; // 16 for 4/4

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

function beatsToDivs(beats: number): number {
  return Math.round(beats * DIVISIONS);
}

interface NoteSlice {
  pitch: number;
  onsetDiv: number;
  durationDiv: number;
  tieStart?: boolean;
  tieStop?: boolean;
}

function sliceNotesIntoMeasures(notes: CounterpointNote[]): Map<number, NoteSlice[]> {
  const sorted = [...notes].sort((a, b) => a.onset - b.onset);
  const measureNotes = new Map<number, NoteSlice[]>();

  for (const n of sorted) {
    let onsetDiv = beatsToDivs(n.onset);
    let durDiv = Math.max(1, beatsToDivs(n.duration));

    while (durDiv > 0) {
      const measureIndex = Math.floor(onsetDiv / MEASURE_DURATION);
      const measureStart = measureIndex * MEASURE_DURATION;
      const measureEnd = measureStart + MEASURE_DURATION;
      const spaceInMeasure = measureEnd - onsetDiv;
      const takeDiv = Math.min(durDiv, spaceInMeasure);

      if (takeDiv <= 0) break;

      const arr = measureNotes.get(measureIndex) ?? [];
      const noteStartDiv = beatsToDivs(n.onset);
      const isFirstSlice = onsetDiv === noteStartDiv;
      const isLastSlice = takeDiv >= durDiv;
      arr.push({
        pitch: n.pitch,
        onsetDiv,
        durationDiv: takeDiv,
        tieStart: !isLastSlice,
        tieStop: !isFirstSlice,
      });
      measureNotes.set(measureIndex, arr);

      onsetDiv += takeDiv;
      durDiv -= takeDiv;
    }
  }

  return measureNotes;
}

function measureNotesToXmlWithCarry(
  measureIndex: number,
  slices: NoteSlice[],
  allMeasures: Map<number, NoteSlice[]>
): { xml: string; carryOver: NoteSlice[] } {
  const sorted = [...slices].sort((a, b) => a.onsetDiv - b.onsetDiv);
  const measureStart = measureIndex * MEASURE_DURATION;
  const measureEnd = measureStart + MEASURE_DURATION;
  let cursor = measureStart;
  let xml = '';
  const carryOver: NoteSlice[] = [];

  for (const s of sorted) {
    if (s.onsetDiv > cursor) {
      const restDiv = s.onsetDiv - cursor;
      xml += `        <note><rest/><duration>${restDiv}</duration><type>${durationToType(restDiv)}</type></note>\n`;
      cursor = s.onsetDiv;
    }
    const spaceLeft = measureEnd - cursor;
    const actualDur = Math.min(s.durationDiv, spaceLeft);
    if (actualDur <= 0) continue;

    const { step, alter, octave } = midiToPitch(s.pitch);
    const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
    const isTruncated = actualDur < s.durationDiv;
    const notations: string[] = [];
    if (s.tieStart || isTruncated) notations.push('<tie type="start"/>');
    if (s.tieStop) notations.push('<tie type="stop"/>');
    const notationsEl = notations.length ? `<notations>${notations.join('')}</notations>` : '';
    xml += `        <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${actualDur}</duration><type>${durationToType(actualDur)}</type>${notationsEl}</note>\n`;
    cursor += actualDur;

    if (actualDur < s.durationDiv) {
      carryOver.push({
        pitch: s.pitch,
        onsetDiv: measureEnd,
        durationDiv: s.durationDiv - actualDur,
        tieStart: false,
        tieStop: true,
      });
    }
  }

  if (cursor < measureEnd) {
    const restDiv = measureEnd - cursor;
    xml += `        <note><rest/><duration>${restDiv}</duration><type>${durationToType(restDiv)}</type></note>\n`;
  }

  return { xml, carryOver };
}

export function exportCounterpointToMusicXML(out: CounterpointOutput, title = 'Contemporary Counterpoint'): string {
  const partIds = out.lines.map((_, i) => `P${i + 1}`);
  const firstMeasureAttrs = `        <attributes>
          <divisions>${DIVISIONS}</divisions>
          <key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>\n`;

  const partMeasures: Map<number, NoteSlice[]>[] = out.lines.map((line) =>
    sliceNotesIntoMeasures(line.notes)
  );

  const maxMeasure = Math.max(
    ...partMeasures.map((m) => (m.size > 0 ? Math.max(...m.keys()) : -1)),
    out.totalBars - 1
  );
  const measureCount = Math.max(maxMeasure + 1, out.totalBars);

  const partXmls = partMeasures.map((measures, partIdx) => {
    let partXml = `    <part id="${partIds[partIdx]}">\n`;
    for (let m = 0; m < measureCount; m++) {
      const slices = measures.get(m) ?? [];
      const { xml, carryOver } = measureNotesToXmlWithCarry(m, slices, measures);
      partXml += `      <measure number="${m + 1}">\n`;
      if (m === 0) partXml += firstMeasureAttrs;
      partXml += xml;
      partXml += `      </measure>\n`;
      if (carryOver.length > 0) {
        const nextSlices = measures.get(m + 1) ?? [];
        nextSlices.unshift(...carryOver);
        measures.set(m + 1, nextSlices);
      }
    }
    partXml += `    </part>`;
    return partXml;
  });

  const partList = partIds.map((id, i) => `<score-part id="${id}"><part-name>Voice ${i + 1}</part-name></score-part>`).join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <part-list>
    ${partList}
  </part-list>
${partXmls.join('\n')}
</score-partwise>
`;
}
