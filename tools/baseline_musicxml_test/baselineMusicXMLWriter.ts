/**
 * Minimal MusicXML writer — score-partwise, one part, 8 measures.
 * No backup/forward, no multi-voice, no multi-staff.
 */

import { getBaselineMeasures, DIVISIONS } from './baselineScore';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

export function writeBaselineMusicXML(): string {
  const measures = getBaselineMeasures();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Baseline Test</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Melody</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  for (let mi = 0; mi < measures.length; mi++) {
    const m = measures[mi];
    xml += `  <measure number="${mi + 1}">\n`;

    if (mi === 0) {
      xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>G</sign><line>2</line></clef>
    </attributes>
`;
    }

    for (const midi of m.notes) {
      const { step, alter, octave } = midiToPitch(midi);
      const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
      xml += `    <note>
      <pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>
      <duration>4</duration>
      <type>quarter</type>
    </note>
`;
    }

    xml += `  </measure>
`;
  }

  xml += `  </part>
</score-partwise>
`;
  return xml;
}
