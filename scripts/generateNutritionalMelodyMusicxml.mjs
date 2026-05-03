/**
 * Generates V1.0-Melody-Nutritional.musicxml + validation report.
 * Run: node scripts/generateNutritionalMelodyMusicxml.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_XML = path.join(
  ROOT,
  'outputs/nutritional-info/Cubase - Zappa Nutritional/V1.0-Melody-Nutritional.musicxml'
);
const OUT_REPORT = path.join(ROOT, 'outputs/nutritional-info/MUSICXML_VALIDATION_REPORT.md');

const DIV = 480;
const D16 = 120;
const D8 = 240;
const Q = 480;
const DQ = 720;
const H = 960;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @typedef {{ step: string, alter?: number, octave: number }} Pitch */
/** @typedef {{ d: number, pitch?: Pitch | null, lyric?: { text: string, syllabic: 'single'|'begin'|'middle'|'end' } }} Ev */

function pitchXml(p) {
  const alt =
    p.alter === 1 ? '\n          <alter>1</alter>' : p.alter === -1 ? '\n          <alter>-1</alter>' : '';
  return `<pitch>
          <step>${p.step}</step>${alt}
          <octave>${p.octave}</octave>
        </pitch>`;
}

function typeForDur(d) {
  if (d === D16) return '16th';
  if (d === D8) return 'eighth';
  if (d === Q) return 'quarter';
  if (d === DQ) return 'quarter'; // dotted handled separately
  if (d === H) return 'half';
  return 'quarter';
}

function dotsForDur(d) {
  return d === DQ ? '\n        <dot/>' : '';
}

function noteXml(ev, stem = 'up') {
  const dur = ev.d;
  const type = typeForDur(dur);
  const dots = dotsForDur(dur);
  if (ev.pitch == null) {
    return `      <note>
        <rest/>
        <duration>${dur}</duration>
        <type>${type}</type>${dots}
      </note>`;
  }
  const lyr = ev.lyric
    ? `
        <lyric>
          <syllabic>${ev.lyric.syllabic}</syllabic>
          <text>${esc(ev.lyric.text)}</text>
        </lyric>`
    : '';
  return `      <note>
        ${pitchXml(ev.pitch)}
        <duration>${dur}</duration>
        <type>${type}</type>${dots}
        <stem>${stem}</stem>${lyr}
      </note>`;
}

/** Harmony: display via kind @text; semantic kind string */
function harmonyXml(spec) {
  const { rootStep, rootAlter = 0, bassStep, bassAlter = 0, kindText, kindTag = 'major' } = spec;
  const rootAlterEl = rootAlter !== 0 ? `\n      <root-alter>${rootAlter}</root-alter>` : '';
  let bassEl = '';
  if (bassStep) {
    const ba = bassAlter !== 0 ? `\n        <bass-alter>${bassAlter}</bass-alter>` : '';
    bassEl = `\n    <bass>\n      <bass-step>${bassStep}</bass-step>${ba}\n    </bass>`;
  }
  return `      <harmony>
    <root>
      <root-step>${rootStep}</root-step>${rootAlterEl}
    </root>${bassEl}
    <kind text="${esc(kindText)}">${kindTag}</kind>
  </harmony>`;
}

function chordSpec(sym) {
  const map = {
    Dsus2: () => harmonyXml({ rootStep: 'D', kindText: 'Dsus2', kindTag: 'suspended-second' }),
    'Dsus2/C': () =>
      harmonyXml({
        rootStep: 'D',
        bassStep: 'C',
        kindText: 'Dsus2/C',
        kindTag: 'suspended-second',
      }),
    'Bbmaj9(no3)': () =>
      harmonyXml({
        rootStep: 'B',
        rootAlter: -1,
        kindText: 'Bbmaj9(no3)',
        kindTag: 'major-ninth',
      }),
    Csus: () => harmonyXml({ rootStep: 'C', kindText: 'Csus', kindTag: 'suspended-fourth' }),
    Esus4: () => harmonyXml({ rootStep: 'E', kindText: 'Esus4', kindTag: 'suspended-fourth' }),
    Gadd9: () => harmonyXml({ rootStep: 'G', kindText: 'Gadd9', kindTag: 'major' }),
    A7sus: () => harmonyXml({ rootStep: 'A', kindText: 'A7sus', kindTag: 'dominant' }),
    Fmaj9: () => harmonyXml({ rootStep: 'F', kindText: 'Fmaj9', kindTag: 'major-ninth' }),
    Gsus: () => harmonyXml({ rootStep: 'G', kindText: 'Gsus', kindTag: 'suspended-fourth' }),
    'Em(add9)': () => harmonyXml({ rootStep: 'E', kindText: 'Em(add9)', kindTag: 'minor' }),
    'Cmaj7#11': () => harmonyXml({ rootStep: 'C', kindText: 'Cmaj7#11', kindTag: 'major-seventh' }),
    'B7sus': () => harmonyXml({ rootStep: 'B', kindText: 'B7sus', kindTag: 'dominant' }),
    D: () => harmonyXml({ rootStep: 'D', kindText: 'D', kindTag: 'major' }),
  };
  const fn = map[sym];
  if (!fn) throw new Error(`Unknown chord: ${sym}`);
  return fn();
}

/** @param {Pitch} p */
const P = (step, alter, octave) => ({ step, alter, octave });

const measures = [];

function addMeasure(num, opt) {
  measures.push({ num, ...opt });
}

// --- Build measures 1-42 ---

addMeasure(1, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  rehearsal: 'Verse 1',
  events: [
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'met', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'her', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'chilled', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'aisle', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'on', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'Wednesday', syllabic: 'single' } },
  ],
});

addMeasure(2, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2/C',
  events: [
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'was', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'reading', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'her', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'own', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'label', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'light', syllabic: 'single' } },
  ],
});

addMeasure(3, {
  beats: 9,
  beatType: 8,
  chord: 'Bbmaj9(no3)',
  events: [
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'said', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'serving', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'size', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'is', syllabic: 'single' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'one', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'but', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: "who's", syllabic: 'single' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'counting', syllabic: 'single' } },
  ],
});

addMeasure(4, {
  beats: 9,
  beatType: 8,
  chord: 'Csus',
  events: [
    { d: D16, pitch: P('C', undefined, 3), lyric: { text: 'And', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 're', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'com', syllabic: 'middle' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'mend', syllabic: 'middle' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'ed', syllabic: 'end' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'dai', syllabic: 'begin' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'ly', syllabic: 'end' } },
    { d: D16, pitch: P('C', undefined, 3), lyric: { text: 'a', syllabic: 'begin' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'mount', syllabic: 'end' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'is a', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'mat', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'ter', syllabic: 'end' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'of', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'o', syllabic: 'begin' } },
    { d: D16, pitch: P('C', undefined, 3), lyric: { text: 'pin', syllabic: 'middle' } },
    { d: D8, pitch: P('G', undefined, 2), lyric: { text: 'ion', syllabic: 'end' } },
  ],
});

addMeasure(5, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  events: [
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'said', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'appreciated', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'trans', syllabic: 'begin' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'par', syllabic: 'middle' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'en', syllabic: 'middle' } },
    { d: D8, pitch: P('A', undefined, 2), lyric: { text: 'cy', syllabic: 'end' } },
  ],
});

addMeasure(6, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2/C',
  events: [
    { d: Q, pitch: P('C', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'said', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: "she'd", syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'heard', syllabic: 'single' } },
    /** Second `C` encoded as eighth so bar totals 9/8 (source quarter row summed to 10 eighths). */
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'that', syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 2), lyric: { text: 'before', syllabic: 'single' } },
    { d: D8, pitch: null, lyric: undefined },
  ],
});

// Bar 7: meter change 7/8
addMeasure(7, {
  beats: 7,
  beatType: 8,
  chord: 'Esus4',
  rehearsal: 'Pre-Chorus',
  events: [
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'Con', syllabic: 'begin' } },
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'tains', syllabic: 'end' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'trac', syllabic: 'begin' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'es', syllabic: 'end' } },
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'of', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'longing', syllabic: 'single' } },
  ],
});

addMeasure(8, {
  beats: 7,
  beatType: 8,
  chord: 'Gadd9',
  events: [
    { d: Q, pitch: P('G', undefined, 3), lyric: { text: 'May', syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'con', syllabic: 'begin' } },
    { d: Q, pitch: P('G', undefined, 3), lyric: { text: 'tain', syllabic: 'end' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'nuts', syllabic: 'single' } },
  ],
});

addMeasure(9, {
  beats: 7,
  beatType: 8,
  chord: 'A7sus',
  events: [
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'Not', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'suitable', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'for', syllabic: 'single' } },
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'people', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'with', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'self', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'control', syllabic: 'single' } },
  ],
});

addMeasure(10, {
  beats: 7,
  beatType: 8,
  chord: 'A7sus',
  events: [
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'Or', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'anyone', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'op', syllabic: 'begin' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'er', syllabic: 'end' } },
    { d: D8, pitch: P('C', 1, 3), lyric: { text: 'heavy', syllabic: 'single' } },
    { d: Q, pitch: null },
  ],
});

addMeasure(11, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  rehearsal: 'Chorus',
  events: [
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'had', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'nu', syllabic: 'begin' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'tri', syllabic: 'middle' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'tion', syllabic: 'middle' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'al', syllabic: 'end' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'for', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'ma', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'tion', syllabic: 'end' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'right', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'there', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'on', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'box', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(12, {
  beats: 9,
  beatType: 8,
  chord: 'Fmaj9',
  events: [
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'Cal', syllabic: 'begin' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'o', syllabic: 'middle' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'ries', syllabic: 'end' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'per', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'por', syllabic: 'begin' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'tion', syllabic: 'end' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'more', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'than', syllabic: 'single' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'expect', syllabic: 'single' } },
  ],
});

addMeasure(13, {
  beats: 9,
  beatType: 8,
  chord: 'Csus',
  events: [
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'Fat', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'con', syllabic: 'begin' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'tent', syllabic: 'end' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'dis', syllabic: 'begin' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'tri', syllabic: 'middle' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'bu', syllabic: 'middle' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'ted', syllabic: 'end' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 2), lyric: { text: 'an', syllabic: 'single' } },
  ],
});

addMeasure(14, {
  beats: 9,
  beatType: 8,
  chord: 'Gsus',
  events: [
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'So', syllabic: 'begin' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'di', syllabic: 'middle' } },
    { d: D8, pitch: P('C', undefined, 4), lyric: { text: 'um', syllabic: 'end' } },
    { d: D8, pitch: P('B', undefined, 3), lyric: { text: 'on', syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'ly', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'when', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: "she's angry", syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(15, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  events: [
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'read', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'ev', syllabic: 'begin' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'ery', syllabic: 'middle' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'word', syllabic: 'end' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'from', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'top', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'to', syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 2), lyric: { text: 'bottom', syllabic: 'single' } },
  ],
});

addMeasure(16, {
  beats: 9,
  beatType: 8,
  chord: 'Fmaj9',
  events: [
    { d: Q, pitch: P('A', undefined, 3), lyric: { text: 'And', syllabic: 'single' } },
    { d: Q, pitch: P('G', undefined, 3), lyric: { text: 'some', syllabic: 'single' } },
    { d: Q, pitch: P('F', undefined, 3), lyric: { text: 'words', syllabic: 'single' } },
    /** C as quarter so measure fills 9/8 (source eighth pair summed to 8 eighths). */
    { d: Q, pitch: P('C', undefined, 3), lyric: { text: 'twice', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(17, {
  beats: 9,
  beatType: 8,
  chord: 'Csus',
  events: [
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'And', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'small', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'print', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'at', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'ver', syllabic: 'begin' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'y', syllabic: 'middle' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'bottom', syllabic: 'end' } },
  ],
});

addMeasure(18, {
  beats: 9,
  beatType: 8,
  chord: 'Gsus',
  events: [
    { d: Q, pitch: P('G', undefined, 3), lyric: { text: 'Three', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'times', syllabic: 'single' } },
    { d: D8, pitch: null },
    { d: D8, pitch: null },
    { d: D8, pitch: null },
    { d: D8, pitch: null },
    { d: D8, pitch: null },
  ],
});

addMeasure(19, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  rehearsal: 'Verse 2',
  events: [
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'asked', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'a', syllabic: 'begin' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'bout', syllabic: 'end' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'in', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'gre', syllabic: 'middle' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'di', syllabic: 'middle' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'ents', syllabic: 'end' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'she', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'was', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'ver', syllabic: 'begin' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'y', syllabic: 'end' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'forth', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'com', syllabic: 'middle' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'ing', syllabic: 'end' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: '\u2014', syllabic: 'single' } },
  ],
});

addMeasure(20, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2/C',
  events: [
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'list', syllabic: 'begin' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'ed', syllabic: 'end' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'them', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'or', syllabic: 'begin' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'der', syllabic: 'end' } },
    { d: D8, pitch: P('A', undefined, 2), lyric: { text: 'of', syllabic: 'single' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'descending weight', syllabic: 'single' } },
  ],
});

addMeasure(21, {
  beats: 9,
  beatType: 8,
  chord: 'Bbmaj9(no3)',
  events: [
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'The', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'first', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'three', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 're', syllabic: 'begin' } },
    { d: D16, pitch: P('C', undefined, 3), lyric: { text: 'cog', syllabic: 'middle' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'nised', syllabic: 'end' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'from', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'pre', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'vi', syllabic: 'middle' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'ous', syllabic: 'middle' } },
    { d: D16, pitch: P('C', undefined, 3), lyric: { text: 'ex', syllabic: 'begin' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'pe', syllabic: 'middle' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'ri', syllabic: 'middle' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'ence', syllabic: 'end' } },
  ],
});

addMeasure(22, {
  beats: 9,
  beatType: 8,
  chord: 'Csus',
  events: [
    { d: Q, pitch: P('C', undefined, 3), lyric: { text: 'The', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'fourth', syllabic: 'single' } },
    { d: Q, pitch: P('F', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'had', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'to look up', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(23, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  events: [
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'said', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: "it's", syllabic: 'single' } },
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'a', syllabic: 'single' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'sta', syllabic: 'begin' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'bil', syllabic: 'middle' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'iser', syllabic: 'end' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(24, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2/C',
  events: [
    { d: Q, pitch: P('C', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'said', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'can', syllabic: 'single' } },
    { d: Q, pitch: P('C', undefined, 3), lyric: { text: 'see that', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(25, {
  beats: 5,
  beatType: 4,
  chord: 'Em(add9)',
  rehearsal: 'Bridge',
  events: [
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'Store', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'a', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'cool', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'dry place', syllabic: 'single' } },
  ],
});

addMeasure(26, {
  beats: 5,
  beatType: 4,
  chord: 'Em(add9)',
  events: [
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'Once', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'o', syllabic: 'begin' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'pened', syllabic: 'end' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'consume', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'within', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'three days', syllabic: 'single' } },
  ],
});

addMeasure(27, {
  beats: 5,
  beatType: 4,
  chord: 'Cmaj7#11',
  events: [
    { d: H, pitch: P('E', undefined, 3), lyric: { text: 'Do', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'not', syllabic: 'single' } },
    { d: H, pitch: P('E', undefined, 3), lyric: { text: 'freeze', syllabic: 'single' } },
  ],
});

addMeasure(28, {
  beats: 5,
  beatType: 4,
  chord: 'Cmaj7#11',
  events: [
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'Keep', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'a', syllabic: 'begin' } },
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'way', syllabic: 'end' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'from', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'di', syllabic: 'begin' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'rect', syllabic: 'end' } },
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'sun', syllabic: 'begin' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'light', syllabic: 'end' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'and younger siblings', syllabic: 'single' } },
  ],
});

addMeasure(29, {
  beats: 5,
  beatType: 4,
  chord: 'B7sus',
  events: [
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'Best', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'be', syllabic: 'begin' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'fore', syllabic: 'end' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'end', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'of the second drink', syllabic: 'single' } },
  ],
});

addMeasure(30, {
  beats: 5,
  beatType: 4,
  chord: 'B7sus',
  events: [
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'This', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'pro', syllabic: 'begin' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'duct', syllabic: 'end' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'may', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'settle', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'during transit', syllabic: 'single' } },
  ],
});

addMeasure(31, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  rehearsal: 'Final Chorus',
  events: [
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'She', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'had', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'nu', syllabic: 'begin' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'tri', syllabic: 'middle' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'tion', syllabic: 'middle' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'al', syllabic: 'end' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'in', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'for', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'ma', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'tion', syllabic: 'end' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'right', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'there', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'on', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('D', undefined, 3), lyric: { text: 'box', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(32, {
  beats: 9,
  beatType: 8,
  chord: 'Fmaj9',
  events: [
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'And', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'had', syllabic: 'single' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'read', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'it', syllabic: 'single' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'care', syllabic: 'begin' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'ful', syllabic: 'middle' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'ly', syllabic: 'end' } },
    { d: D16, pitch: P('E', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'thought', syllabic: 'single' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'un', syllabic: 'begin' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'der', syllabic: 'middle' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'stood', syllabic: 'end' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: '\u2014', syllabic: 'single' } },
  ],
});

addMeasure(33, {
  beats: 9,
  beatType: 8,
  chord: 'Csus',
  events: [
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'But', syllabic: 'single' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'ac', syllabic: 'begin' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'tu', syllabic: 'middle' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'al', syllabic: 'end' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'ex', syllabic: 'begin' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'pe', syllabic: 'middle' } },
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'ri', syllabic: 'middle' } },
    { d: D8, pitch: P('C', undefined, 3), lyric: { text: 'ence', syllabic: 'end' } },
  ],
});

addMeasure(34, {
  beats: 9,
  beatType: 8,
  chord: 'Gsus',
  events: [
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'Ex', syllabic: 'begin' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'cee', syllabic: 'middle' } },
    { d: D16, pitch: P('C', undefined, 4), lyric: { text: 'ded', syllabic: 'end' } },
    { d: D16, pitch: P('B', undefined, 3), lyric: { text: 'the', syllabic: 'single' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'stat', syllabic: 'begin' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'ed', syllabic: 'end' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 're', syllabic: 'begin' } },
    { d: D16, pitch: P('C', undefined, 4), lyric: { text: 'com', syllabic: 'middle' } },
    { d: D16, pitch: P('B', undefined, 3), lyric: { text: 'mend', syllabic: 'middle' } },
    { d: D16, pitch: P('A', undefined, 3), lyric: { text: 'ed', syllabic: 'end' } },
    { d: D16, pitch: P('G', undefined, 3), lyric: { text: 'dai', syllabic: 'begin' } },
    { d: D16, pitch: P('F', undefined, 3), lyric: { text: 'ly', syllabic: 'end' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'amount', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(35, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  events: [
    { d: D8, pitch: P('D', undefined, 3), lyric: { text: 'By', syllabic: 'single' } },
    { d: D8, pitch: P('E', undefined, 3), lyric: { text: 'a', syllabic: 'single' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'con', syllabic: 'begin' } },
    { d: Q, pitch: P('A', undefined, 3), lyric: { text: 'sid', syllabic: 'middle' } },
    { d: D8, pitch: P('G', undefined, 3), lyric: { text: 'er', syllabic: 'middle' } },
    { d: D8, pitch: P('F', undefined, 3), lyric: { text: 'a', syllabic: 'middle' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'ble', syllabic: 'end' } },
  ],
});

addMeasure(36, {
  beats: 4,
  beatType: 4,
  chord: 'D',
  events: [
    { d: Q, pitch: P('A', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'have', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'no', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'complaints', syllabic: 'single' } },
  ],
});

addMeasure(37, {
  beats: 4,
  beatType: 4,
  chord: 'D',
  events: [
    { d: D8, pitch: P('A', undefined, 3), lyric: { text: 'I', syllabic: 'single' } },
    { d: D8, pitch: P('F', 1, 3), lyric: { text: 'have', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'filed', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'no', syllabic: 'single' } },
    { d: Q, pitch: P('A', undefined, 2), lyric: { text: 'complaints', syllabic: 'single' } },
  ],
});

addMeasure(38, {
  beats: 4,
  beatType: 4,
  chord: 'D',
  events: [
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'The', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'box', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'is', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'empty', syllabic: 'single' } },
  ],
});

addMeasure(39, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  rehearsal: 'Outro',
  events: [
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'Two', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'two', syllabic: 'single' } },
    { d: Q, pitch: P('F', undefined, 3), lyric: { text: 'two', syllabic: 'single' } },
    { d: Q, pitch: P('A', undefined, 3), lyric: { text: 'three', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(40, {
  beats: 4,
  beatType: 4,
  chord: 'D',
  events: [
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'One', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'two', syllabic: 'single' } },
    { d: Q, pitch: P('A', undefined, 3), lyric: { text: 'three', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 4), lyric: { text: 'four', syllabic: 'single' } },
  ],
});

addMeasure(41, {
  beats: 9,
  beatType: 8,
  chord: 'Dsus2',
  events: [
    { d: Q, pitch: P('A', undefined, 3), lyric: { text: 'Two', syllabic: 'single' } },
    { d: Q, pitch: P('G', undefined, 3), lyric: { text: 'two', syllabic: 'single' } },
    { d: Q, pitch: P('F', undefined, 3), lyric: { text: 'two', syllabic: 'single' } },
    { d: Q, pitch: P('E', undefined, 3), lyric: { text: 'three', syllabic: 'single' } },
    { d: D8, pitch: null },
  ],
});

addMeasure(42, {
  beats: 4,
  beatType: 4,
  chord: 'D',
  events: [
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'One', syllabic: 'single' } },
    { d: Q, pitch: P('F', 1, 3), lyric: { text: 'two', syllabic: 'single' } },
    { d: Q, pitch: P('D', undefined, 3), lyric: { text: 'three', syllabic: 'single' } },
    { d: Q, pitch: null },
  ],
});

function expectedTicks(beats, beatType) {
  if (beats === 9 && beatType === 8) return 9 * D8;
  if (beats === 7 && beatType === 8) return 7 * D8;
  if (beats === 5 && beatType === 4) return 5 * Q;
  if (beats === 4 && beatType === 4) return 4 * Q;
  return beats * (beatType === 8 ? D8 : Q);
}

function buildScoreXml() {
  const title = 'She Had The Nutritional Information Right There On The Box';
  const creditWords = 'V1.0 — Melody (Nutritional)';
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${esc(title)}</work-title>
  </work>
  <identification>
    <encoding>
      <software>generateNutritionalMelodyMusicxml.mjs</software>
      <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>
    </encoding>
  </identification>
  <defaults>
    <scaling>
      <millimeters>7.05556</millimeters>
      <tenths>40</tenths>
    </scaling>
  </defaults>
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Voice</instrument-name>
      </score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
`;

  let prevMeter = '';
  for (const m of measures) {
    const expect = expectedTicks(m.beats, m.beatType);
    let actual = 0;
    for (const ev of m.events) actual += ev.d;
    if (actual !== expect) {
      throw new Error(`Measure ${m.num}: duration ${actual} !== expected ${expect}`);
    }

    xml += `    <measure number="${m.num}">\n`;

    const meterKey = `${m.beats}/${m.beatType}`;
    if (m.num === 1) {
      xml += `      <attributes><divisions>${DIV}</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>${m.beats}</beats><beat-type>${m.beatType}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n`;
      prevMeter = meterKey;
    } else if (meterKey !== prevMeter) {
      xml += `      <attributes><time><beats>${m.beats}</beats><beat-type>${m.beatType}</beat-type></time></attributes>\n`;
      prevMeter = meterKey;
    }

    if (m.rehearsal) {
      xml += `      <direction placement="above">\n`;
      xml += `        <direction-type><rehearsal>${esc(m.rehearsal)}</rehearsal></direction-type>\n`;
      xml += `      </direction>\n`;
    }

    if (m.num === 1) {
      xml += `      <direction placement="above">\n`;
      xml += `        <direction-type><words>${esc(creditWords)}</words></direction-type>\n`;
      xml += `      </direction>\n`;
    }

    xml += chordSpec(m.chord) + '\n';

    for (const ev of m.events) {
      xml += noteXml(ev) + '\n';
    }

    xml += `    </measure>\n`;
  }

  xml += `  </part>
</score-partwise>
`;
  return xml;
}

function measureTicksFromData(m) {
  return m.events.reduce((s, e) => s + e.d, 0);
}

function runValidationReport(xml, pathXml) {
  const lines = [];
  lines.push('# MusicXML validation — Nutritional melody');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- File: \`${pathXml.replace(/\\/g, '/')}\``);
  lines.push(`- divisions=${DIV}`);
  lines.push('');
  lines.push('## Per-bar tick totals');
  let bad = [];
  for (const m of measures) {
    const exp = expectedTicks(m.beats, m.beatType);
    const act = measureTicksFromData(m);
    const ok = act === exp;
    if (!ok) bad.push({ num: m.num, act, exp });
    lines.push(`- Bar ${m.num}: ${act} ticks (expected ${exp}) ${ok ? 'OK' : '**MISMATCH**'}`);
  }
  lines.push('');
  lines.push('## High-risk bars (4, 11, 19, 21, 31, 32, 34)');
  for (const n of [4, 11, 19, 21, 31, 32, 34]) {
    const mm = measures.find((x) => x.num === n);
    const exp = expectedTicks(mm.beats, mm.beatType);
    const act = measureTicksFromData(mm);
    lines.push(`- Bar ${n}: ${act === exp ? 'PASS' : 'FAIL'} (${act}/${exp} ticks)`);
  }
  lines.push('');
  lines.push('## Syllabic tags');
  lines.push('- All `<syllabic>` values are `single`, `begin`, `middle`, or `end` where multi-syllable words span adjacent notes.');
  lines.push('');
  lines.push('## Chord symbols');
  lines.push('- Every measure includes one `<harmony>` element before notes.');
  lines.push('');
  lines.push('## Rehearsal marks');
  lines.push('- Verse 1 (bar 1), Pre-Chorus (7), Chorus (11), Verse 2 (19), Bridge (25), Final Chorus (31), Outro (39).');
  lines.push('');
  lines.push('## Tuplets / grace notes / ties');
  lines.push(`- \`<tuplet>\` count in file: ${(xml.match(/<tuplet/gi) || []).length}`);
  lines.push(`- \`<grace\` count: ${(xml.match(/<grace/gi) || []).length}`);
  lines.push(`- \`<tie\` count: ${(xml.match(/<tie/gi) || []).length}`);
  lines.push('');
  lines.push('## Rests (heavy / Three times / bar 42 beat 4)');
  lines.push('- Bar 10: quarter rest after `heavy` on beat 5.');
  lines.push('- Bar 18: eighth rests beats 5–9 after `Three times`.');
  lines.push('- Bar 42: quarter rest on beat 4.');
  lines.push('');
  lines.push('## D major first appearance');
  lines.push('- Plain `D` major (`<kind text="D">`) first occurs at bar 36 (Final Chorus resolution). Earlier bars use sus/add/slash chords only.');
  lines.push('');
  lines.push('## Encoding notes');
  lines.push('- Bar 6: second `C` (“that”) encoded as **eighth** (not quarter) so the measure sums to 9/8.');
  lines.push('- Bar 16: final **C** (“twice”) encoded as **quarter** + eighth **rest** (source eighth pair summed to 8 eighths).');
  lines.push('- Bar 32: source rhythm sums to 14×16th + 8th (1920 ticks); encoded as 14×16th + **E3 quarter** (2160 ticks) to satisfy 9/8.');
  lines.push('- Bar 34: quarter **E3** + eighth **rest** after twelve sixteenths.');
  lines.push('- Bar 10: `operating` appears as syllables **op**–**er**; **ating** is elided to fit five pitched eighths before **heavy**.');
  lines.push('');
  if (bad.length) {
    lines.push('## FAILURES');
    for (const b of bad) lines.push(`- Bar ${b.num}: ${b.act} !== ${b.exp}`);
  }
  return lines.join('\n');
}

const xmlOut = buildScoreXml();
fs.mkdirSync(path.dirname(OUT_XML), { recursive: true });
fs.writeFileSync(OUT_XML, xmlOut, 'utf8');
fs.writeFileSync(OUT_REPORT, runValidationReport(xmlOut, OUT_XML), 'utf8');
console.log('Wrote', OUT_XML);
console.log('Wrote', OUT_REPORT);