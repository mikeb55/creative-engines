/**
 * Contemporary Counterpoint — Minimal MusicXML export
 */

import type { CounterpointOutput } from './counterpointTypes';

const DIVISIONS = 4;

function midiToPitch(midi: number): { step: string; alter: number; octave: number } {
  const semitones = midi % 12;
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

function durationToType(duration: number): string {
  const d = duration * DIVISIONS;
  if (d <= 1) return '16th';
  if (d <= 2) return 'eighth';
  if (d <= 4) return 'quarter';
  if (d <= 8) return 'half';
  return 'whole';
}

function durationToDivs(duration: number): number {
  return Math.round(duration * DIVISIONS);
}

export function exportCounterpointToMusicXML(out: CounterpointOutput, title = 'Contemporary Counterpoint'): string {
  const parts: string[] = [];
  const totalDivs = out.totalBars * 4 * DIVISIONS;

  for (let v = 0; v < out.lines.length; v++) {
    const line = out.lines[v];
    const notes = [...line.notes].sort((a, b) => a.onset - b.onset);
    let xml = '';
    let div = 0;
    for (const n of notes) {
      const onsetDiv = Math.round(n.onset * DIVISIONS);
      const durDiv = durationToDivs(n.duration);
      if (onsetDiv > div) {
        xml += `        <forward><duration>${onsetDiv - div}</duration></forward>\n`;
        div = onsetDiv;
      }
      const { step, alter, octave } = midiToPitch(n.pitch);
      const type = durationToType(n.duration);
      xml += `        <note><pitch><step>${step}</step>${alter !== 0 ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch><duration>${durDiv}</duration><type>${type}</type></note>\n`;
      div += durDiv;
    }
    parts.push(xml);
  }

  const partIds = out.lines.map((_, i) => `P${i + 1}`);
  const partList = partIds.map((id, i) => `<score-part id="${id}"><part-name>Voice ${i + 1}</part-name></score-part>`).join('\n      ');
  const partContent = parts.map((p, i) =>
    `    <part id="${partIds[i]}">\n      <measure number="1">\n${p}      </measure>\n    </part>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <part-list>
    ${partList}
  </part-list>
${partContent}
</score-partwise>
`;
}
