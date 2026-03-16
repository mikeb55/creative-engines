/**
 * Ellington Orchestration Engine — MusicXML export
 * Big band score with proper part structure, clefs, and transpositions.
 */

import type { EllingtonOrchestration } from './ellingtonEngine';

const DIVISIONS = 4;

const INSTRUMENTS: Array<{
  id: string;
  name: string;
  clef: 'treble' | 'bass' | 'percussion';
  transposition: number; // semitones to add to concert for written pitch (0 = concert)
  section: 'saxes' | 'trumpets' | 'trombones' | 'rhythm';
  sectionIndex: number;
}> = [
  { id: 'P1', name: 'Alto Sax 1', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 0 },
  { id: 'P2', name: 'Alto Sax 2', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 1 },
  { id: 'P3', name: 'Tenor Sax 1', clef: 'treble', transposition: 2, section: 'saxes', sectionIndex: 2 },
  { id: 'P4', name: 'Tenor Sax 2', clef: 'treble', transposition: 2, section: 'saxes', sectionIndex: 3 },
  { id: 'P5', name: 'Baritone Sax', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 4 },
  { id: 'P6', name: 'Trumpet 1', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 0 },
  { id: 'P7', name: 'Trumpet 2', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 1 },
  { id: 'P8', name: 'Trumpet 3', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 2 },
  { id: 'P9', name: 'Trumpet 4', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 3 },
  { id: 'P10', name: 'Trombone 1', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 0 },
  { id: 'P11', name: 'Trombone 2', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 1 },
  { id: 'P12', name: 'Trombone 3', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 2 },
  { id: 'P13', name: 'Bass Trombone', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 3 },
  { id: 'P14', name: 'Piano', clef: 'treble', transposition: 0, section: 'rhythm', sectionIndex: 0 },
  { id: 'P15', name: 'Bass', clef: 'bass', transposition: 0, section: 'rhythm', sectionIndex: 1 },
  { id: 'P16', name: 'Drums', clef: 'percussion', transposition: 0, section: 'rhythm', sectionIndex: 2 },
];

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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function durationToType(beats: number): string {
  if (beats >= 4) return 'whole';
  if (beats >= 2) return 'half';
  if (beats >= 1) return 'quarter';
  if (beats >= 0.5) return 'eighth';
  return 'quarter';
}

function noteToXml(pitch: number, duration: number, voice: number, staff?: number): string {
  const { step, alter, octave } = midiToPitch(pitch);
  const durVal = duration * DIVISIONS;
  const type = durationToType(duration);
  const alterEl = alter !== 0 ? `\n        <alter>${alter}</alter>` : '';
  const staffEl = staff !== undefined ? `\n      <staff>${staff}</staff>` : '';
  return `    <note>
      <pitch>
        <step>${step}</step>${alterEl}
        <octave>${octave}</octave>
      </pitch>
      <duration>${durVal}</duration>
      <type>${type}</type>
      <voice>${voice}</voice>${staffEl}
    </note>
`;
}

function restToXml(duration: number, voice: number): string {
  const durVal = duration * DIVISIONS;
  return `    <note>
      <rest/>
      <duration>${durVal}</duration>
      <type>whole</type>
      <voice>${voice}</voice>
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

const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};

function getRootMidi(chord: string, octave: number = 3): number {
  const base = chord.split('/')[0];
  const m = base.match(/^([A-Ga-g])([#b])?/i);
  if (!m) return 48;
  const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const midi = (ROOT_MIDI[root] ?? 60) + alter + (octave - 4) * 12;
  return midi;
}

function getSectionData(orch: EllingtonOrchestration, section: string): Array<{ bar: number; chord: string; pitches: number[] }> {
  switch (section) {
    case 'trumpets': return orch.trumpets;
    case 'trombones': return orch.trombones;
    case 'saxes': return orch.saxes;
    case 'rhythm': return orch.rhythm;
    default: return [];
  }
}

function getPitchForInstrument(
  inst: (typeof INSTRUMENTS)[0],
  pitches: number[],
  chord: string
): number | null {
  if (inst.section === 'rhythm') {
    if (inst.sectionIndex === 0) return pitches[0] ?? null;
    if (inst.sectionIndex === 1) return getRootMidi(chord, 2);
    return null;
  }
  if (inst.section === 'saxes' && inst.sectionIndex === 4) {
    return pitches.length > 0 ? Math.min(...pitches) : null;
  }
  return pitches[inst.sectionIndex] ?? null;
}

export function exportOrchestrationToMusicXML(
  orch: EllingtonOrchestration,
  options?: { title?: string }
): string {
  const title = options?.title ?? 'Ellington Orchestration';
  const totalBars = orch.totalBars;

  const partList = INSTRUMENTS.map((inst) => {
    const transEl = inst.transposition !== 0
      ? `\n      <transpose>\n        <chromatic>${-inst.transposition}</chromatic>\n      </transpose>`
      : '';
    return `    <score-part id="${inst.id}">
      <part-name>${escapeXml(inst.name)}</part-name>
      <score-instrument id="${inst.id}-I1">
        <instrument-name>${escapeXml(inst.name)}</instrument-name>
      </score-instrument>${transEl}
    </score-part>`;
  }).join('\n');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
  <part-list>
${partList}
  </part-list>
`;

  for (const inst of INSTRUMENTS) {
    const sectionData = getSectionData(orch, inst.section);
    const pitchesPerBar = sectionData.map((v) => v.pitches);
    xml += `  <part id="${inst.id}">\n`;

    for (let m = 1; m <= totalBars; m++) {
      const barData = sectionData.find((v) => v.bar === m);
      const chord = barData?.chord ?? '';
      const pitches = barData?.pitches ?? [];
      const pitchForThisInst = getPitchForInstrument(inst, pitches, chord);

      xml += `  <measure number="${m}">\n`;
      if (m === 1) {
        const clefSign = inst.clef === 'bass' ? 'F' : inst.clef === 'percussion' ? 'percussion' : 'G';
        const clefLine = inst.clef === 'bass' ? 4 : 2;
        const clefEl = inst.clef === 'percussion'
          ? `<clef><sign>percussion</sign><line>2</line></clef>`
          : `<clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>`;
        xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      ${clefEl}
    </attributes>
`;
      }
      if (inst.id === 'P1') {
        const chordForBar = chord || sectionData[0]?.chord;
        if (chordForBar) {
          const harm = chordToHarmonyXml(chordForBar);
          if (harm) xml += harm;
        }
      }
      if (pitchForThisInst !== null) {
        const writtenPitch = inst.transposition !== 0 ? pitchForThisInst + inst.transposition : pitchForThisInst;
        xml += noteToXml(writtenPitch, 4, 1);
      } else {
        xml += restToXml(4, 1);
      }
      xml += `  </measure>\n`;
    }
    xml += `  </part>\n`;
  }

  xml += `</score-partwise>\n`;
  return xml;
}
