/**
 * One-shot generator: V8 Beatrice Big Band full score (MusicXML 3.1).
 * Output path passed as argv[2] or default under Big-Band-Arranging.
 */
import fs from 'fs';
import path from 'path';

const OUT =
  process.argv[2] ||
  path.join(
    'C:',
    'Users',
    'mike',
    'Documents',
    'Cursor AI Projects',
    'Big-Band-Arranging',
    'session 9',
    'Beatrice w Bora April 2026',
    'V8-Beatrice-Big-Band-Bora.musicxml'
  );

const TOTAL_BARS = 60;
const DIVISIONS = 4;
const BEATS = 4;

/** Section bar ranges (1-based, inclusive) */
const SEC = {
  intro: [1, 4],
  head: [5, 20],
  solo: [21, 36],
  soli: [37, 44],
  shout: [45, 52],
  outro: [53, 60],
};

/** Beatrice 16-bar harmonic loop (concert) — one chord per bar; bar 15–16 split in notation via half-note harmony */
const HEAD16 = [
  'Fmaj7',
  'Ebmaj7',
  'Dm7',
  'Db7',
  'Cm7',
  'B7',
  'Bbm7',
  'A7',
  'Abmaj7',
  'G7',
  'Gm7',
  'Gbmaj7',
  'Fmaj7',
  'E7',
  'Am7',
  'Dm7',
];

function chordForBar(b) {
  const idx = ((b - 1) % 16);
  return HEAD16[idx] ?? 'Fmaj7';
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseChord(chord) {
  const c = chord.trim().replace(/\s+/g, '');
  const m = c.match(/^([A-Ga-g])([#b]?)(.*)$/);
  const step = m ? m[1].toUpperCase() : 'F';
  let alter = 0;
  if (m?.[2] === 'b') alter = -1;
  if (m?.[2] === '#') alter = 1;
  const suf = (m?.[3] ?? '').toLowerCase();
  let kind = 'major';
  if (suf.includes('maj7') || suf === 'maj') kind = 'major-seventh';
  else if (suf.includes('m7') || suf === 'm' || /^m(?!aj)/.test(suf)) kind = 'minor-seventh';
  else if (suf.includes('alt') || (suf.includes('7') && !suf.includes('maj'))) kind = 'dominant';
  else if (suf.includes('dim')) kind = 'diminished';
  return { step, alter, kind, text: escapeXml(c) };
}

function domOrMinor(suf, raw) {
  if (/^m/.test(suf) || raw.includes('m7')) return 'minor-seventh';
  return 'dominant';
}

/** One reharm (soli): bar 40 — secondary dominant / altered color */
function chordSymbolForBar(b) {
  if (b === 40) return 'E7alt';
  const idx = (b - 1) % 16;
  return HEAD16[idx] ?? 'Fmaj7';
}

/** Motif rhythm (divisions): 8th,8th,qt,8th,8th,qt — core cell */
const MOTIF_DURS = [2, 2, 4, 2, 2, 4];
const MOTIF_TYPES = ['eighth', 'eighth', 'quarter', 'eighth', 'eighth', 'quarter'];

/** Concert pitch line for motif (scale degrees over F) — F A C A A F */
const MOTIF_PCS_CONCERT = [
  { s: 'F', o: 4, a: 0 },
  { s: 'A', o: 4, a: 0 },
  { s: 'C', o: 5, a: 0 },
  { s: 'A', o: 4, a: 0 },
  { s: 'A', o: 4, a: 0 },
  { s: 'F', o: 4, a: 0 },
];

/** Written pitch offsets: concert → written for Bb trumpet (+2 semitones = up whole step) */
function transposeWritten(instrument, row) {
  const semis = {
    alto: 9,
    tenor: -2,
    bari: 9,
    tpt: 2,
    bone: 0,
    pno: 0,
    gtr: 0,
    bass: 0,
    dr: 0,
  };
  const map = {
    P1: 'alto',
    P2: 'alto',
    P3: 'tenor',
    P4: 'tenor',
    P5: 'bari',
    P6: 'tpt',
    P7: 'tpt',
    P8: 'tpt',
    P9: 'tpt',
    P10: 'bone',
    P11: 'bone',
    P12: 'bone',
    P13: 'bone',
    P14: 'pno',
    P15: 'gtr',
    P16: 'bass',
    P17: 'dr',
  };
  const t = semis[map[instrument]] ?? 0;
  return pitchShift(row, t);
}

const PC_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PC_ALT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function rowToMidi(r) {
  const p = PC_ALT[r.s] + r.a + r.o * 12;
  return p;
}

function midiToRow(m) {
  const oct = Math.floor(m / 12) - 1;
  const pc = ((m % 12) + 12) % 12;
  const table = [
    ['C', 0],
    ['D', 0],
    ['E', 0],
    ['F', 0],
    ['G', 0],
    ['A', 0],
    ['B', 0],
  ];
  const names = [
    ['C', 0],
    ['D', -1],
    ['D', 0],
    ['E', -1],
    ['E', 0],
    ['F', 0],
    ['F', 1],
    ['G', 0],
    ['G', 1],
    ['A', 0],
    ['A', 1],
    ['B', -1],
  ];
  const [step, alter] = names[pc];
  return { s: step, o: oct, a: alter };
}

function pitchShift(row, semis) {
  const m = rowToMidi(row) + semis;
  return midiToRow(m);
}

function noteXml(row, dur, typ, stem = null, beam = null, dyn = null) {
  const alterXml = row.a !== 0 ? `<alter>${row.a}</alter>` : '';
  let x = `      <note>\n        <pitch><step>${row.s}</step>${alterXml}<octave>${row.o}</octave></pitch>\n`;
  x += `        <duration>${dur}</duration>\n        <voice>1</voice>\n        <type>${typ}</type>\n`;
  if (stem) x += `        <stem>${stem}</stem>\n`;
  if (beam) x += `        <beam number="1">${beam}</beam>\n`;
  if (dyn) x += `        <notations><dynamics><${dyn}/></dynamics></notations>\n`;
  x += `      </note>\n`;
  return x;
}

function restXml(dur, typ) {
  return `      <note><rest/><duration>${dur}</duration><voice>1</voice><type>${typ}</type></note>\n`;
}

function unpitchedXml(step, dur, typ, display = 'F4') {
  return `      <note><unpitched><display-step>${step}</display-step><display-octave>4</display-octave></unpitched><duration>${dur}</duration><voice>1</voice><type>${typ}</type></note>\n`;
}

function measureAttributes(clefG, keyFifths = -1, first = false) {
  if (!first) return '';
  let a = `      <attributes>\n        <divisions>${DIVISIONS}</divisions>\n`;
  a += `        <key><fifths>${keyFifths}</fifths><mode>major</mode></key>\n`;
  a += `        <time><beats>${BEATS}</beats><beat-type>4</beat-type></time>\n`;
  if (clefG === 'G') a += `        <clef><sign>G</sign><line>2</line></clef>\n`;
  else if (clefG === 'F') a += `        <clef><sign>F</sign><line>4</line></clef>\n`;
  else if (clefG === 'P') a += `        <clef><sign>percussion</sign></clef>\n`;
  else if (clefG === 'TAB') a += `        <clef><sign>TAB</sign><line>5</line></clef>\n`;
  a += `      </attributes>\n`;
  return a;
}

function harmonyXml(chord) {
  const { step, alter, kind, text } = parseChord(chord);
  const alt = alter !== 0 ? `<root-alter>${alter}</root-alter>` : '';
  return `      <harmony>\n        <root><root-step>${step}</root-step>${alt}</root>\n        <kind text="${text}">${kind}</kind>\n      </harmony>\n`;
}

function rehearsalXml(label) {
  return `      <direction placement="above">\n        <direction-type><rehearsal>${escapeXml(label)}</rehearsal></direction-type>\n      </direction>\n`;
}

function wordsXml(w) {
  return `      <direction placement="above">\n        <direction-type><words>${escapeXml(w)}</words></direction-type>\n      </direction>\n`;
}

function barInRange(b, [a, z]) {
  return b >= a && b <= z;
}

/** Motif fragment for bar — variation by section */
function motifNotes(partId, bar, section) {
  const base = MOTIF_PCS_CONCERT.map((r) => ({ ...r }));
  let shift = 0;
  if (section === 'intro') shift = -5;
  if (section === 'head') shift = 0;
  if (section === 'solo') shift = 2;
  if (section === 'soli') shift = -2;
  if (section === 'shout') shift = 7;
  if (section === 'outro') shift = -7;
  const rowAt = (i) => pitchShift(base[i], shift + (bar % 3));
  const out = [];
  for (let i = 0; i < 6; i++) {
    out.push(transposeWritten(partId, rowAt(i)));
  }
  return out;
}

function currentSection(b) {
  if (barInRange(b, SEC.intro)) return 'intro';
  if (barInRange(b, SEC.head)) return 'head';
  if (barInRange(b, SEC.solo)) return 'solo';
  if (barInRange(b, SEC.soli)) return 'soli';
  if (barInRange(b, SEC.shout)) return 'shout';
  if (barInRange(b, SEC.outro)) return 'outro';
  return 'head';
}

/** Head melody (concert) — simplified Beatrice first 8 + second 8 bars as pitch skeleton, 2 bars per fragment */
function headMelodyConcert(bar) {
  const rel = bar - SEC.head[0];
  const pat = [
    [72, 76, 77, 72],
    [68, 65, 72, 68],
    [65, 62, 65, 67],
    [66, 65, 63, 60],
    [68, 67, 65, 63],
    [65, 62, 60, 58],
    [67, 65, 63, 60],
    [60, 64, 65, 67],
  ];
  const idx = rel % 8;
  return pat[idx].map((m) => midiToRow(m));
}

function shoutMelodyConcert(bar) {
  const rel = bar - SEC.shout[0];
  const h = motifNotes('P6', bar, 'shout');
  if (rel < 2) return h.slice(0, 6);
  if (rel < 4) return h.map((r) => pitchShift(r, 2));
  if (rel < 6) return h.map((r) => pitchShift(r, 4));
  return h.map((r) => pitchShift(r, 5));
}

function chordRootMidi(chord) {
  const p = parseChord(chord);
  const pcMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = (pcMap[p.step] + p.alter + 12) % 12;
  const octave = 2;
  return 12 * (octave + 1) + pc;
}

function walkingBass(bar) {
  const ch = chordSymbolForBar(bar);
  const r0 = chordRootMidi(ch);
  const steps = [0, 5, 3, 5];
  return steps.map((st) => midiToRow(r0 + st + ((bar + st) % 3)));
}

function ridePattern(bar) {
  const d = [2, 2, 2, 2, 2, 2, 2, 2];
  const t = ['eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth'];
  return { d, t };
}

function buildPart(partId, name, clef) {
  let xml = `  <part id="${partId}">\n`;
  for (let m = 1; m <= TOTAL_BARS; m++) {
    const sec = currentSection(m);
    const first = m === 1;
    xml += `    <measure number="${m}">\n`;
    if (partId === 'P1') {
      xml += measureAttributes('G', -1, first);
      if (m === 1) xml += rehearsalXml('[In]');
      if (m === SEC.head[0]) xml += rehearsalXml('[Hd]');
      if (m === SEC.solo[0]) xml += rehearsalXml('[So]');
      if (m === SEC.solo[0]) xml += wordsXml('Bg 1');
      if (m === 29) xml += wordsXml('Bg 2');
      if (m === 33) xml += wordsXml('Bg 3');
      if (m === SEC.soli[0]) xml += rehearsalXml('[Sx]');
      if (m === SEC.shout[0]) xml += rehearsalXml('[Sh]');
      if (m === SEC.outro[0]) xml += rehearsalXml('[Ou]');
      xml += harmonyXml(chordSymbolForBar(m));
    } else {
      xml += measureAttributes(clef, -1, first);
    }

    if (partId === 'P17') {
      const rp = ridePattern(m);
      if (sec === 'shout' && m >= SEC.shout[0] + 6) {
        xml += unpitchedXml('C', 8, 'half');
        xml += unpitchedXml('D', 8, 'half');
      } else {
        for (let i = 0; i < 8; i++) xml += unpitchedXml('G', rp.d[i], rp.t[i]);
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P16') {
      const w = walkingBass(m);
      for (let i = 0; i < 4; i++) xml += noteXml(w[i], 4, 'quarter', 'down');
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P6') {
      if (sec === 'intro') {
        if (m < SEC.intro[1]) {
          xml += restXml(16, 'whole');
        } else {
          const n = motifNotes('P6', m, 'intro');
          for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up', i < 5 ? 'begin' : 'end');
        }
      } else if (sec === 'head') {
        const mel = headMelodyConcert(m);
        const w = mel.map((r) => transposeWritten('P6', r));
        for (let i = 0; i < 4; i++) xml += noteXml(w[i], 4, 'quarter', 'up');
      } else if (sec === 'solo') {
        const n = motifNotes('P6', m, 'solo').map((r) => pitchShift(r, 12));
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else if (sec === 'soli') {
        xml += restXml(16, 'whole');
      } else if (sec === 'shout') {
        const sm = shoutMelodyConcert(m);
        for (let i = 0; i < 6; i++) xml += noteXml(sm[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else {
        const n = motifNotes('P6', m, 'outro');
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P7' || partId === 'P8') {
      const pad = sec === 'shout' ? 2 : 0;
      const n = motifNotes(partId, m, sec).map((r) => pitchShift(r, pad + (partId === 'P8' ? -2 : 0)));
      if (sec === 'soli') {
        xml += restXml(16, 'whole');
      } else if (sec === 'head') {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P9') {
      if (sec === 'solo' && (m === 24 || m === 32)) xml += restXml(16, 'whole');
      else {
        const n = motifNotes('P9', m, sec);
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P1') {
      if (sec === 'soli') {
        const n = motifNotes('P1', m, 'soli').map((r) => pitchShift(r, 5));
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else if (sec === 'head') {
        const mel = headMelodyConcert(m).map((r) => transposeWritten('P1', r));
        for (let i = 0; i < 4; i++) xml += noteXml(mel[i], 4, 'quarter', 'up');
      } else if (sec === 'shout') {
        const n = motifNotes('P1', m, 'shout');
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else {
        const n = motifNotes('P1', m, sec);
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P2' || partId === 'P3' || partId === 'P4' || partId === 'P5') {
      const off = partId === 'P2' ? 2 : partId === 'P3' ? -1 : partId === 'P4' ? 1 : 3;
      const n = motifNotes(partId, m, sec).map((r) => pitchShift(r, off));
      if (sec === 'solo' && m >= 29) {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else if (sec === 'soli') {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      } else if (sec === 'head') {
        for (let i = 0; i < 4; i++) xml += noteXml(pitchShift(n[i % 6], 7), 4, 'quarter', 'up');
      } else {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P10' || partId === 'P11' || partId === 'P12' || partId === 'P13') {
      const off = partId === 'P10' ? 0 : partId === 'P11' ? -2 : partId === 'P12' ? -4 : -7;
      const n = motifNotes(partId, m, sec).map((r) => pitchShift(r, off));
      if (sec === 'soli') {
        xml += restXml(16, 'whole');
      } else {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    if (partId === 'P14' || partId === 'P15') {
      const n = motifNotes(partId, m, sec);
      if (sec === 'head' || sec === 'solo') {
        xml += noteXml(n[0], 2, 'eighth', 'up');
        xml += restXml(12, 'half');
        xml += noteXml(pitchShift(n[5], 0), 2, 'eighth', 'up');
      } else {
        for (let i = 0; i < 6; i++) xml += noteXml(n[i], MOTIF_DURS[i], MOTIF_TYPES[i], 'up');
      }
      xml += `    </measure>\n`;
      continue;
    }

    xml += restXml(16, 'whole');
    xml += `    </measure>\n`;
  }
  xml += `  </part>\n`;
  return xml;
}

const PARTS = [
  ['P1', 'Alto Saxophone 1', 'G'],
  ['P2', 'Alto Saxophone 2', 'G'],
  ['P3', 'Tenor Saxophone 1', 'G'],
  ['P4', 'Tenor Saxophone 2', 'G'],
  ['P5', 'Baritone Saxophone', 'G'],
  ['P6', 'Trumpet 1 (lead)', 'G'],
  ['P7', 'Trumpet 2', 'G'],
  ['P8', 'Trumpet 3', 'G'],
  ['P9', 'Trumpet 4', 'G'],
  ['P10', 'Trombone 1', 'G'],
  ['P11', 'Trombone 2', 'G'],
  ['P12', 'Trombone 3', 'G'],
  ['P13', 'Bass Trombone', 'F'],
  ['P14', 'Piano', 'G'],
  ['P15', 'Guitar', 'G'],
  ['P16', 'Acoustic Bass', 'F'],
  ['P17', 'Drums', 'P'],
];

function partListXml() {
  let x = '  <part-list>\n';
  for (const [id, name] of PARTS) {
    x += `    <score-part id="${id}">\n      <part-name>${escapeXml(name)}</part-name>\n`;
    x += `      <score-instrument id="${id}-I"><instrument-name>${escapeXml(name)}</instrument-name></score-instrument>\n`;
    x += `      <midi-instrument id="${id}-I"><midi-channel>1</midi-channel></midi-instrument>\n`;
    x += `    </score-part>\n`;
  }
  x += '  </part-list>\n';
  return x;
}

function scoreXml() {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  x += '<score-partwise version="3.1">\n';
  x += `  <work><work-title>${escapeXml('Beatrice — Big Band (V8) w/ Bora')}</work-title></work>\n`;
  x += `  <identification><creator type="composer">Sam Rivers (arr.)</creator></identification>\n`;
  x += partListXml();
  for (const [id, , clef] of PARTS) {
    x += buildPart(id, '', clef);
  }
  x += '</score-partwise>\n';
  return x;
}

const dir = path.dirname(OUT);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(OUT, scoreXml(), 'utf8');
console.log('Wrote', OUT);
