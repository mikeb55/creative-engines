/**
 * Ellington Orchestration Engine — MusicXML export
 */

import type { EllingtonOrchestration } from './ellingtonEngine';

const DIVISIONS = 4;

function midiToPitch(midi: number): { step: string; alter: number; octave: number } {
  const semitones = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const stepMap: Record<number, { step: string; alter: number }> = {
    0: { step: 'C', alter: 0 },
    1: { step: 'C', alter: 1 },
    2: { step: 'D', alter: 0 },
    3: { step: 'D', alter: 1 },
    4: { step: 'E', alter: 0 },
    5: { step: 'F', alter: 0 },
    6: { step: 'F', alter: 1 },
    7: { step: 'G', alter: 0 },
    8: { step: 'G', alter: 1 },
    9: { step: 'A', alter: 0 },
    10: { step: 'A', alter: 1 },
    11: { step: 'B', alter: 0 },
  };
  const { step, alter } = stepMap[semitones];
  return { step, alter, octave };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function noteToXml(pitch: number, duration: number, voice: number, staff: number): string {
  const { step, alter, octave } = midiToPitch(pitch);
  const durVal = duration * DIVISIONS;
  const alterEl = alter !== 0 ? `\n        <alter>${alter}</alter>` : '';
  return `    <note>
      <pitch>
        <step>${step}</step>${alterEl}
        <octave>${octave}</octave>
      </pitch>
      <duration>${durVal}</duration>
      <type>quarter</type>
      <voice>${voice}</voice>
      <staff>${staff}</staff>
    </note>
`;
}

function chordToHarmonyXml(chord: string): string {
  const m = chord.match(/^([A-Ga-g])([#b])?(maj7|min7|m7|7|dom7|m7b5|m6|6|m)?/i);
  if (!m) return '';
  const step = m[1].toUpperCase();
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const kindMap: Record<string, string> = {
    maj7: 'major-seventh', min7: 'minor-seventh', m7: 'minor-seventh',
    '7': 'dominant', dom7: 'dominant', m7b5: 'half-diminished', m6: 'minor-sixth', '6': 'major-sixth',
  };
  const kind = kindMap[(m[3] || 'maj7').toLowerCase()] || 'major-seventh';
  const alterEl = alter !== 0 ? `\n      <root-alter>${alter}</root-alter>` : '';
  return `    <harmony>
      <root><root-step>${step}</root-step>${alterEl}</root>
      <kind>${kind}</kind>
    </harmony>
`;
}

function chordToXml(pitches: number[], duration: number, voice: number, staff: number): string {
  let xml = '';
  for (let i = 0; i < pitches.length; i++) {
    if (i > 0) xml += `    <chord/>\n`;
    xml += noteToXml(pitches[i], duration, voice, staff);
  }
  return xml;
}

export function exportOrchestrationToMusicXML(
  orch: EllingtonOrchestration,
  options?: { title?: string }
): string {
  const title = options?.title ?? 'Ellington Orchestration';
  const totalBars = orch.totalBars;

  const partList = `
  <part-list>
    <score-part id="P1">
      <part-name>Trumpets</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Trombones</part-name>
    </score-part>
    <score-part id="P3">
      <part-name>Saxes</part-name>
    </score-part>
    <score-part id="P4">
      <part-name>Rhythm</part-name>
    </score-part>
  </part-list>`;

  const sections = [
    { id: 'P1', name: 'Trumpets', data: orch.trumpets, staff: 1 },
    { id: 'P2', name: 'Trombones', data: orch.trombones, staff: 1 },
    { id: 'P3', name: 'Saxes', data: orch.saxes, staff: 1 },
    { id: 'P4', name: 'Rhythm', data: orch.rhythm, staff: 1 },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
${partList}
`;

  function chordForBar(barNum: number): string | undefined {
    let acc = 0;
    for (const seg of orch.progression) {
      if (barNum <= acc + seg.bars) return seg.chord;
      acc += seg.bars;
    }
    return orch.progression[orch.progression.length - 1]?.chord;
  }

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const { id, data } = sections[sIdx];
    const isFirstPart = sIdx === 0;
    xml += `  <part id="${id}">\n`;
    for (let m = 1; m <= totalBars; m++) {
      const barData = data.find((v) => v.bar === m);
      xml += `  <measure number="${m}">\n`;
      if (m === 1) {
        xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>G</sign><line>2</line></clef>
    </attributes>
`;
      }
      if (isFirstPart) {
        const chord = barData?.chord ?? chordForBar(m);
        if (chord) {
          const harm = chordToHarmonyXml(chord);
          if (harm) xml += harm;
        }
      }
      if (barData && barData.pitches.length > 0) {
        xml += chordToXml(barData.pitches, 4, 1, 1);
      } else {
        xml += `    <note>
      <rest/>
      <duration>${4 * DIVISIONS}</duration>
      <type>whole</type>
      <voice>1</voice>
    </note>
`;
      }
      xml += `  </measure>\n`;
    }
    xml += `  </part>\n`;
  }

  xml += `</score-partwise>\n`;
  return xml;
}
