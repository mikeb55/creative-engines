/**
 * Orbit V16 — Add bass part to guitar lead.
 *
 * Reads: ORBIT 20 Jan 2026 Guitar Lead.xml (guitar only, 29 measures, 3/4)
 * Output: Orbit_V16_LOCK.musicxml with Guitar (P1) + Bass (P2)
 *
 * Run: npx ts-node --project tsconfig.json scripts/createOrbitV16.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// --- paths ---
const OUTPUT_DIR = path.join(
  __dirname,
  '..',
  'projects',
  'guitar-bass-duos',
  'V1-orbit'
);
const SOURCE_FILENAME = 'ORBIT 20 Jan 2026 Guitar Lead.xml';
const OUTPUT_FILENAME = 'Orbit_V16_LOCK.musicxml';

// --- chord map (1-indexed measure) ---
const CHORD_MAP: Record<number, string> = {
  1: '', // intro
  2: 'Fmaj7',
  3: 'Ebmaj7#5',
  4: 'Dbmaj7',
  5: 'Bmaj7',
  6: 'Bbm9',
  7: 'Gbmaj7',
  8: 'Abmaj7',
  9: 'Emaj7',
  10: 'Fmaj7',
  11: 'Ebmaj7#5',
  12: 'Dbmaj7',
  13: 'Bmaj7',
  14: 'Bbm9',
  15: 'Abmaj7',
  16: 'Gbmaj7',
  17: 'Emaj7',
  18: 'G/F', // B section — PEDAL F
  19: 'G/F',
  20: 'Eb/F',
  21: 'Eb/F',
  22: 'G/F',
  23: 'G/F',
  24: 'Eb/F',
  25: 'Eb/F',
  26: 'Dbmaj7', // C section
  27: 'Bb7',
  28: 'Fmaj7',
  29: 'Fmaj7',
};

// --- divisions per measure (3/4: total divs = divisions * 3) ---
const DIVISIONS_MAP: Record<number, number> = {
  1: 4,
  2: 4,
  3: 6,
  4: 4,
  5: 1,
  6: 4,
  7: 4,
  8: 4,
  9: 4, // inherit (use 4)
  10: 1,
  11: 6,
  12: 4,
  13: 1,
  14: 4,
  15: 4,
  16: 4,
  17: 2,
  18: 4,
  19: 4,
  20: 4,
  21: 1,
  22: 4,
  23: 4,
  24: 2,
  25: 4,
  26: 4,
  27: 4,
  28: 4,
  29: 2,
};

// --- pitch helpers ---
const PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function parseChordRoot(chordStr: string): { pc: number; bass?: number } | null {
  if (!chordStr) return null;
  // Slash chord: G/F → bass F
  const slash = chordStr.indexOf('/');
  if (slash >= 0) {
    const bassStr = chordStr.slice(slash + 1).trim();
    const pc = PITCH_CLASS[bassStr];
    if (pc !== undefined) return { pc, bass: pc };
    return null;
  }
  const rootMatch = chordStr.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const pc = PITCH_CLASS[rootMatch[1]];
  if (pc === undefined) return null;
  return { pc };
}

interface BassNote {
  rest?: boolean;
  step?: string;
  alter?: number;
  octave?: number;
  duration: number;
  divisions: number;
}

function pcToStepAlter(pc: number): { step: string; alter: number } {
  const map: { step: string; alter: number }[] = [
    { step: 'C', alter: 0 },
    { step: 'C', alter: 1 },
    { step: 'D', alter: 0 },
    { step: 'D', alter: 1 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'F', alter: 1 },
    { step: 'G', alter: 0 },
    { step: 'G', alter: 1 },
    { step: 'A', alter: 0 },
    { step: 'A', alter: 1 },
    { step: 'B', alter: 0 },
  ];
  return map[((pc % 12) + 12) % 12];
}

function bassNote(pc: number, octave: number, duration: number, divisions: number): BassNote {
  const { step, alter } = pcToStepAlter(pc);
  return { step: step!, alter: alter!, octave, duration, divisions };
}

/** Compose bass notes for one measure. */
function composeBassMeasure(
  measureNum: number,
  chordStr: string,
  divisions: number,
  prevPc: number | null
): BassNote[] {
  const totalDivs = divisions * 3; // 3/4
  const notes: BassNote[] = [];

  // B section (18–25): F pedal only
  if (measureNum >= 18 && measureNum <= 25) {
    const fPc = 5; // F
    const fOct = 2; // F2
    if (measureNum === 18 || measureNum === 22) {
      notes.push(bassNote(fPc, fOct, totalDivs, divisions));
    } else {
      notes.push(bassNote(fPc, fOct, totalDivs, divisions));
    }
    return notes;
  }

  const parsed = parseChordRoot(chordStr);
  if (!parsed && measureNum === 1) {
    notes.push({ rest: true, duration: totalDivs, divisions });
    return notes;
  }
  if (!parsed) return notes;

  const rootPc = parsed.bass ?? parsed.pc;
  const rootOct = rootPc >= 3 && rootPc <= 8 ? 2 : rootPc <= 2 ? 3 : 2;

  // C section (26–29): Dbmaj7 → Bb7 → Fmaj7 resolution
  if (measureNum >= 26) {
    const pc = rootPc;
    const oct = rootPc === 1 ? 2 : rootPc === 10 ? 2 : rootPc === 5 ? 2 : 2;
    const { step, alter } = pcToStepAlter(pc);
    notes.push({ step, alter, octave: oct, duration: totalDivs, divisions });
    return notes;
  }

  // A section: root/3rd/7th with voice leading, varied rhythm
  const thirdPc = (rootPc + 4) % 12;
  const seventhPc = (rootPc + 10) % 12;

  if (measureNum === 1) {
    notes.push(bassNote(rootPc, rootOct, totalDivs, divisions));
    return notes;
  }

  // Varied patterns: some measures with anticipation, some with rest then entry
  const beatDiv = totalDivs / 3;
  const useLate = measureNum % 3 === 0;
  const useAnticipation = measureNum % 5 === 2;
  const useSustain = measureNum % 4 === 1;

  if (useSustain && totalDivs >= 6) {
    notes.push(bassNote(rootPc, rootOct, totalDivs, divisions));
    return notes;
  }

  if (useAnticipation && totalDivs >= 12) {
    const anticDiv = Math.floor(beatDiv * 0.75);
    const mainDiv = totalDivs - anticDiv;
    notes.push(bassNote(rootPc, rootOct, anticDiv, divisions));
    notes.push(bassNote(rootPc, rootOct, mainDiv, divisions));
    return notes;
  }

  if (useLate && totalDivs >= 12) {
    const restDiv = Math.floor(beatDiv);
    notes.push({ rest: true, duration: restDiv, divisions });
    const dur = totalDivs - restDiv;
    notes.push(bassNote(rootPc, rootOct, dur, divisions));
    return notes;
  }

  if (totalDivs >= 12 && prevPc !== null) {
    const stepDist = Math.min((rootPc - prevPc + 12) % 12, (prevPc - rootPc + 12) % 12);
    if (stepDist <= 2 && totalDivs >= 18) {
      notes.push(bassNote(rootPc, rootOct, Math.floor(totalDivs / 3), divisions));
      notes.push(bassNote(seventhPc, rootOct + (seventhPc < rootPc ? 1 : 0), Math.floor(totalDivs / 3), divisions));
      notes.push(bassNote(rootPc, rootOct, totalDivs - 2 * Math.floor(totalDivs / 3), divisions));
      return notes;
    }
  }

  notes.push(bassNote(rootPc, rootOct, totalDivs, divisions));
  return notes;
}

function durationToType(d: number, divs: number): { type: string; dot?: boolean } {
  const quarter = divs;
  const half = divs * 2;
  const dottedHalf = divs * 3;
  const whole = divs * 4;
  if (d <= Math.floor(divs / 2)) return { type: '16th' };
  if (d <= divs) return { type: 'eighth' };
  if (d <= divs * 1.5) return { type: 'eighth', dot: true };
  if (d <= half) return { type: 'quarter' };
  if (d <= half + divs / 2) return { type: 'quarter', dot: true };
  if (d <= dottedHalf) return { type: 'half' };
  if (d <= dottedHalf + divs / 2) return { type: 'half', dot: true };
  return { type: 'whole' };
}

function bassNotesToXml(notes: BassNote[], voice: number = 1): string {
  let xml = '';
  for (const n of notes) {
    const d = n.duration;
    const divs = n.divisions;
    const { type, dot } = durationToType(d, divs);

    if (n.rest) {
      const dotEl = dot ? '<dot/>' : '';
      xml += `        <note><rest/><duration>${d}</duration><type>${type}</type>${dotEl}<voice>${voice}</voice></note>\n`;
      continue;
    }

    const alterEl = (n.alter ?? 0) !== 0 ? `<alter>${n.alter}</alter>` : '';
    const dotEl = dot ? '<dot/>' : '';
    xml += `        <note><pitch><step>${n.step}</step>${alterEl}<octave>${n.octave}</octave></pitch><duration>${d}</duration><type>${type}</type>${dotEl}<voice>${voice}</voice></note>\n`;
  }
  return xml;
}

/** Escape XML special chars */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Harmony element for a chord symbol */
function harmonyToXml(chordStr: string): string {
  if (!chordStr) return '';
  const parsed = parseChordRoot(chordStr);
  if (!parsed) return '';
  const rootPc = parsed.bass ?? parsed.pc;
  const { step, alter } = pcToStepAlter(rootPc);
  const rootStep = step;
  const rootAlter = alter;
  let kind = 'major';
  if (chordStr.includes('maj7') || chordStr.includes('maj')) kind = 'major';
  else if (chordStr.includes('7') && !chordStr.includes('maj')) kind = 'dominant';
  else if (chordStr.includes('m') || chordStr.includes('min')) kind = 'minor-minor';
  return `      <harmony print-frame="no">
        <root><root-step>${rootStep}</root-step><root-alter>${rootAlter}</root-alter></root>
        <kind text="+">${kind}</kind>
      </harmony>
`;
}

function main(): void {
  const sourceArg = process.argv[2];
  const sourcePath = sourceArg
    ? path.resolve(sourceArg)
    : path.join(OUTPUT_DIR, SOURCE_FILENAME);
  const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILENAME);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    console.error('Usage: npx ts-node scripts/createOrbitV16.ts [source-path]');
    console.error('Default source: projects/guitar-bass-duos/V1-orbit/ORBIT 20 Jan 2026 Guitar Lead.xml');
    process.exit(1);
  }

  const xml = fs.readFileSync(sourcePath, 'utf-8');

  const partMatch = xml.match(/<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/);
  if (!partMatch) {
    console.error('Could not parse part from source XML');
    process.exit(1);
  }

  const partId = partMatch[1];
  const partContent = partMatch[2];

  const measureRegex = /<measure\s+number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
  const measures: { num: number; xml: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = measureRegex.exec(partContent)) !== null) {
    measures.push({ num: parseInt(m[1], 10), xml: m[2] });
  }
  measures.sort((a, b) => a.num - b.num);

  if (measures.length !== 29) {
    console.error(`Expected 29 measures, found ${measures.length}`);
    process.exit(1);
  }

  // Build bass part
  let prevPc: number | null = null;
  const bassMeasures: string[] = [];
  for (const meas of measures) {
    const chordStr = CHORD_MAP[meas.num] ?? '';
    const divisions = DIVISIONS_MAP[meas.num] ?? 4;
    const notes = composeBassMeasure(meas.num, chordStr, divisions, prevPc);
    if (notes.length > 0) {
      const parsed = parseChordRoot(chordStr || 'F');
      if (parsed) prevPc = parsed.bass ?? parsed.pc;
    }
    const bassXml = bassNotesToXml(notes);
    bassMeasures.push(bassXml);
  }

  // Build output
  const firstMeasureContent = measures[0].xml;
  const firstDivisions = firstMeasureContent.match(/<divisions>(\d+)<\/divisions>/);
  const defaultDivisions = firstDivisions ? firstDivisions[1] : '4';
  const firstTime = firstMeasureContent.match(/<time>[\s\S]*?<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/);
  const beats = firstTime ? firstTime[1] : '3';
  const beatType = firstTime ? firstTime[2] : '4';

  let out = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Orbit V16</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Guitar</part-name>
      <score-instrument id="P1-I1"><instrument-name>Guitar</instrument-name></score-instrument>
    </score-part>
    <score-part id="P2">
      <part-name>Bass</part-name>
      <score-instrument id="P2-I1"><instrument-name>Bass</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
`;

  for (let i = 0; i < measures.length; i++) {
    const meas = measures[i];
    out += `    <measure number="${meas.num}">\n`;
    out += meas.xml;
    out += `    </measure>\n`;
  }

  out += `  </part>
  <part id="P2">
`;

  let currentDivisions = defaultDivisions;
  for (let i = 0; i < measures.length; i++) {
    const meas = measures[i];
    const num = meas.num;
    const divisions = DIVISIONS_MAP[num] ?? 4;
    const chordStr = CHORD_MAP[num] ?? '';

    out += `    <measure number="${num}">\n`;
    if (i === 0) {
      out += `    <attributes>
      <divisions>${divisions}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
      <clef><sign>F</sign><line>4</line></clef>
    </attributes>
`;
    } else if (divisions !== parseInt(currentDivisions, 10)) {
      out += `    <attributes>
      <divisions>${divisions}</divisions>
    </attributes>
`;
    }
    currentDivisions = String(divisions);
    // Chord symbols stay on guitar only
    out += bassMeasures[i];
    out += `    </measure>\n`;
  }

  out += `  </part>
</score-partwise>
`;

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, out, 'utf-8');
  console.log(`Written: ${outputPath}`);
}

main();
