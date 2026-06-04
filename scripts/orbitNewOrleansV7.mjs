/**
 * Orbit — New Orleans 5-horn big band (84 bars). Drums: whole rests only.
 * Run: node scripts/orbitNewOrleansV7.mjs
 */
import fs from 'fs';
import path from 'path';

const OUT =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-NewOrleans-V7.musicxml';

const DIV = 256;
const Q = 256;
const E = 128;
const H = 512;
const W = 1024;
const BAR = 1024;
const TOTAL = 84;

const PARTS = {
  alto: 'P1',
  tenor: 'P2',
  trumpet: 'P3',
  trombone: 'P4',
  drums: 'P5',
};

const WRITTEN = {
  [PARTS.alto]: 9,
  [PARTS.tenor]: 2,
  [PARTS.trumpet]: 2,
  [PARTS.trombone]: 0,
};

const REG = {
  [PARTS.alto]: [62, 81],
  [PARTS.tenor]: [60, 79],
  [PARTS.trumpet]: [64, 84],
  [PARTS.trombone]: [34, 70],
};

function beatOff(b) {
  return Math.round((b - 1) * Q);
}

function pc(s) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(s.trim());
  if (!m) throw new Error(`pitch ${s}`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return base + alt + (parseInt(m[3], 10) + 1) * 12;
}

function clamp(m, pid) {
  const [lo, hi] = REG[pid];
  return Math.max(lo, Math.min(hi, m));
}

function toWritten(concert, pid) {
  return clamp(concert + (WRITTEN[pid] ?? 0), pid);
}

function pitchParts(midi) {
  const names = [
    ['C', 0],
    ['C', 1],
    ['D', 0],
    ['D', 1],
    ['E', 0],
    ['F', 0],
    ['F', 1],
    ['G', 0],
    ['G', 1],
    ['A', 0],
    ['A', 1],
    ['B', 0],
  ];
  const pcN = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  const [step, alter] = names[pcN];
  return { step, alter, octave: oct };
}

function typeDur(d) {
  if (d >= W) return 'whole';
  if (d >= H) return 'half';
  if (d >= Q) return 'quarter';
  if (d >= E) return 'eighth';
  return '16th';
}

function noteXml(midi, dur, pid, opts = {}) {
  const { chord = false, staccato = false, fermata = false, dyn = null } = opts;
  const { step, alter, octave } = pitchParts(midi);
  const altTag = alter ? `     <alter>${alter}</alter>\n` : '';
  const acc = alter ? `    <accidental>${alter === 1 ? 'sharp' : 'flat'}</accidental>\n` : '';
  const chordTag = chord ? '    <chord />\n' : '';
  let notations = '';
  if (staccato || fermata) {
    notations = '    <notations>\n';
    if (staccato) notations += '     <articulations>\n      <staccato />\n     </articulations>\n';
    if (fermata) notations += '     <fermata type="upright" />\n';
    notations += '    </notations>\n';
  }
  const dynTag = dyn
    ? `   <direction placement="below"><direction-type><dynamics><${dyn}/></dynamics></direction-type></direction>\n`
    : '';
  return `${dynTag}   <note>\n${chordTag}    <pitch>\n     <step>${step}</step>\n${altTag}     <octave>${octave}</octave>\n    </pitch>\n    <duration>${dur}</duration>\n    <instrument id="${pid}-I1" />\n    <voice>1</voice>\n    <type>${typeDur(dur)}</type>\n${notations}${acc}    <staff>1</staff>\n   </note>\n`;
}

function restXml(dur, pid) {
  return `   <note>\n    <rest />\n    <duration>${dur}</duration>\n    <instrument id="${pid}-I1" />\n    <voice>1</voice>\n    <type>${typeDur(dur)}</type>\n    <staff>1</staff>\n   </note>\n`;
}

function buildMeasure(events, pid) {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let xml = '';
  let t = 0;
  for (const ev of sorted) {
    if (ev.t > t) xml += restXml(ev.t - t, pid);
    if (ev.rest) xml += restXml(ev.d, pid);
    else xml += noteXml(ev.m, ev.d, pid, ev.opts || {});
    t = ev.t + ev.d;
  }
  if (t < BAR) xml += restXml(BAR - t, pid);
  return xml;
}

function hookABar1(pid) {
  return [
    { t: beatOff(2.5), d: E, m: toWritten(pc('Bb3'), pid) },
    { t: beatOff(3), d: E, m: toWritten(pc('C4'), pid), opts: { chord: true, dyn: 'mp' } },
    { t: beatOff(3.5), d: E, m: toWritten(pc('Db4'), pid), opts: { chord: true, dyn: 'mp' } },
    { t: beatOff(4), d: E, m: toWritten(pc('C4'), pid), opts: { chord: true, dyn: 'mp' } },
  ];
}

function hookABar2(pid) {
  return [{ t: beatOff(1), d: Q, m: toWritten(pc('Bb3'), pid), opts: { dyn: 'mp' } }];
}

function hookBEvents(pid) {
  return [
    { t: 0, d: Q, m: toWritten(pc('F4'), pid), opts: { dyn: 'mp' } },
    { t: Q, d: Q, m: toWritten(pc('Eb4'), pid), opts: { chord: true, dyn: 'mp' } },
    { t: Q * 2, d: Q, m: toWritten(pc('Db4'), pid), opts: { chord: true, dyn: 'mp' } },
  ];
}

function hookCEvents(barPhase, pid) {
  return [
    { t: 0, d: Q, m: toWritten(pc('F2'), pid), opts: { dyn: 'mp' } },
    { t: Q * 2, d: Q, m: toWritten(pc('Eb2'), pid), opts: { dyn: 'mp' } },
  ];
}

function hookDEvents(pid) {
  const db = pc('Db4');
  const f = pc('F4');
  const ab = pc('Ab4');
  return [
    { t: 0, d: Q, m: toWritten(db, pid), opts: { staccato: true, dyn: 'f' } },
    { t: Q, d: Q, m: toWritten(f, pid), opts: { chord: true, staccato: true, dyn: 'f' } },
    { t: Q * 2, d: Q, m: toWritten(ab, pid), opts: { chord: true, staccato: true, dyn: 'f' } },
    { t: Q * 3, d: Q, m: toWritten(db, pid), opts: { chord: true, staccato: true, dyn: 'f' } },
  ];
}

const HEAD_A_FIXED = {};
for (const [b, arr] of Object.entries({
  5: [[2, 1, 'C4']],
  6: [
    [1, 1, 'F4'],
    [2, 1, 'Eb4'],
    [3, 1, 'Ab3'],
    [4, 1, 'C#4'],
  ],
  7: [[1, 1, 'C4']],
  8: [
    [1, 0.5, 'C#3'],
    [1.5, 0.5, 'F3'],
    [2, 0.5, 'C4'],
    [2.5, 0.5, 'C4'],
    [3, 0.5, 'Eb4'],
  ],
  9: [[1, 2, 'Bb3']],
  10: [
    [2, 0.5, 'C4'],
    [2.5, 0.5, 'C#4'],
    [3, 0.5, 'C4'],
    [3.5, 0.5, 'Bb3'],
    [4, 1, 'C4'],
  ],
  11: [
    [1, 1, 'F3'],
    [2, 0.5, 'C4'],
    [2.5, 0.5, 'C#4'],
    [3, 1, 'F#4'],
    [4, 1, 'C#4'],
  ],
  12: [
    [1, 0.5, 'C4'],
    [1.5, 0.5, 'C#4'],
    [2, 2, 'F#4'],
  ],
  13: [
    [1, 1, 'F4'],
    [2, 1, 'Eb4'],
    [3, 0.5, 'Ab3'],
    [3.5, 0.5, 'Bb3'],
    [4, 1, 'C#4'],
  ],
  14: [
    [1, 1, 'C4'],
    [2, 1, 'F4'],
    [3, 1, 'Eb4'],
    [4, 1, 'Bb3'],
  ],
  15: [
    [1, 1, 'C#4'],
    [2, 2, 'C4'],
  ],
  16: [
    [2, 0.5, 'F4'],
    [2.5, 1, 'Eb4'],
    [3.5, 0.5, 'F4'],
    [4, 0.5, 'G#4'],
    [4.5, 1, 'F4'],
  ],
  17: [[1, 2, 'F4']],
  18: [
    [2, 0.5, 'C4'],
    [2.5, 0.5, 'C#4'],
    [3, 0.5, 'C4'],
    [3.5, 1, 'Bb3'],
    [4.5, 1, 'C4'],
  ],
  19: [
    [1, 1, 'F3'],
    [3, 1, 'C4'],
    [4, 1, 'C#4'],
  ],
  20: [
    [1, 1, 'F#4'],
    [2, 1, 'C#4'],
    [3, 0.5, 'C#4'],
    [3.5, 0.5, 'C#4'],
    [4, 1, 'Bb3'],
  ],
  21: [[1, 2, 'Bb3']],
  22: [
    [2, 0.5, 'F3'],
    [2.5, 0.5, 'A3'],
    [3, 1, 'C4'],
    [4, 1, 'D4'],
  ],
  23: [
    [1, 1, 'B3'],
    [2, 2, 'G3'],
  ],
  24: [
    [1, 1, 'G3'],
    [2, 1, 'B3'],
    [3, 1, 'D4'],
    [4, 1, 'Eb4'],
  ],
  25: [[1, 4, 'C4']],
  26: [
    [1, 1, 'C4'],
    [2, 1, 'G3'],
    [3, 1, 'Eb4'],
  ],
  27: [
    [1, 1, 'D4'],
    [2, 1, 'G3'],
    [3, 2, 'D4'],
  ],
  28: [[1, 2, 'Bb3']],
  29: [
    [2, 1, 'C4'],
    [3, 1, 'F4'],
    [4, 1, 'Eb4'],
  ],
  30: [
    [1, 1, 'Eb4'],
    [2, 0.5, 'Ab3'],
    [2.5, 0.5, 'Bb3'],
    [3, 1, 'C4'],
  ],
  31: [[1, 2, 'C4']],
  32: [],
})) {
  HEAD_A_FIXED[+b] = arr.map(([beat, db, p]) => ({
    t: beatOff(beat),
    d: db * Q,
    _p: p,
  }));
}

const HEAD_OUT_FIXED = {};
for (const [b, arr] of Object.entries({
  73: [
    [2, 1, 'C4'],
    [3, 1, 'F4'],
    [4, 1, 'Eb4'],
  ],
  74: [
    [1, 1, 'Eb4'],
    [2, 0.5, 'Ab3'],
    [2.5, 0.5, 'Bb3'],
    [3, 1, 'C4'],
  ],
  75: [[1, 2, 'C4']],
  76: [],
  77: [
    [2, 0.5, 'C4'],
    [2.5, 0.5, 'C#4'],
    [3, 0.5, 'C4'],
    [3.5, 1, 'Bb3'],
    [4.5, 1, 'C4'],
  ],
  78: [
    [1, 1, 'F3'],
    [3, 1, 'C4'],
    [4, 1, 'C#4'],
  ],
  79: [
    [1, 1, 'F#4'],
    [2, 1, 'C#4'],
    [3, 0.5, 'C#4'],
    [3.5, 0.5, 'C#4'],
    [4, 1, 'Bb3'],
  ],
  80: [[1, 2, 'Bb3']],
  81: [
    [2, 0.5, 'F3'],
    [2.5, 0.5, 'A3'],
    [3, 1, 'C4'],
    [4, 1, 'D4'],
  ],
  82: [
    [1, 1, 'B3'],
    [2, 2, 'G3'],
  ],
  83: [[1, 2, 'Bb3']],
  84: [[1, 4, 'F3']],
})) {
  HEAD_OUT_FIXED[+b] = arr.map(([beat, db, p]) => ({
    t: beatOff(beat),
    d: db * Q,
    _p: p,
    fermata: b === '84',
  }));
}

const CHORDS = {
  5: 'NC',
  6: 'Fmaj7',
  7: 'Ebmaj7',
  8: 'Dbmaj7',
  9: 'Bmaj7',
  10: 'Bbm9',
  11: 'Abmaj7',
  12: 'Gbmaj7',
  13: 'Ebmaj7',
  14: 'Fmaj7',
  15: 'Ebmaj7',
  16: 'Dbmaj7',
  17: 'Bmaj7',
  18: 'Bbm9',
  19: 'NC',
  20: 'Gbmaj7',
  21: 'Emaj7',
  22: 'G',
  23: 'G',
  24: 'Eb',
  25: 'Eb',
  26: 'G',
  27: 'G',
  28: 'G',
  29: 'Dbmaj7',
  30: 'Bb7',
  31: 'Fmaj7',
  32: 'NC',
  73: 'Dbmaj7',
  74: 'Bb7',
  75: 'Fmaj7',
  76: 'NC',
  77: 'Bbm9',
  78: 'NC',
  79: 'Gbmaj7',
  80: 'Emaj7',
  81: 'G',
  82: 'G',
  83: 'G',
  84: 'Fmaj7',
};

const SHOUT_CHORDS = {
  57: 'Fmaj7',
  58: 'Ebmaj7',
  59: 'Dbmaj7',
  60: 'Bmaj7',
  61: 'Bbm9',
  62: 'Abmaj7',
  63: 'Gbmaj7',
  64: 'Emaj7',
  65: 'Ebmaj7',
  66: 'Fmaj7',
  67: 'Ebmaj7',
  68: 'Dbmaj7',
  69: 'Bmaj7',
  70: 'Bbm9',
  71: 'Abmaj7',
  72: 'Gbmaj7',
};

function chordRootPc(sym) {
  if (!sym || sym === 'NC') return null;
  const m = sym.match(/^([A-G])(b|#)?/);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const alt = m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0;
  return (base + alt + 120) % 12;
}

function rootMidi(sym, octave = 2) {
  const r = chordRootPc(sym);
  if (r == null) return null;
  return (octave + 1) * 12 + r;
}

function melEvents(bar, pid, dyn = 'mf') {
  const src = HEAD_A_FIXED[bar] || HEAD_OUT_FIXED[bar] || [];
  return src.map((e) => ({
    t: e.t,
    d: e.d,
    m: toWritten(pc(e._p), pid),
    opts: { dyn, fermata: e.fermata },
  }));
}

function lowestMelodyMidi(bar) {
  const src =
    HEAD_A_FIXED[bar] ||
    HEAD_OUT_FIXED[bar] ||
    HEAD_A_FIXED[bar - 28] ||
    [];
  let min = 999;
  for (const e of src) {
    if (e._p) min = Math.min(min, pc(e._p));
  }
  return min === 999 ? 60 : min;
}

function tromboneFeature(bar) {
  const lines = {
    41: [
      [1, 0.5, 'Bb2'],
      [1.5, 0.5, 'D3'],
      [2.5, 1, 'Eb3'],
      [4, 0.5, 'G3'],
    ],
    42: [
      [1, 1, 'F3'],
      [2.5, 0.5, 'A2'],
      [3, 1, 'C3'],
      [4, 0.5, 'F3'],
    ],
    43: [
      [1, 0.5, 'Eb3'],
      [2, 1, 'Bb2'],
      [3.5, 0.5, 'G2'],
      [4, 1, 'Eb3'],
    ],
    44: [
      [1, 1, 'Db3'],
      [2.5, 0.5, 'F2'],
      [3, 1, 'Ab2'],
      [4, 0.5, 'Db3'],
    ],
    45: [
      [1, 0.5, 'B2'],
      [2, 1, 'D#3'],
      [3, 0.5, 'F#3'],
      [4, 1, 'B2'],
    ],
    46: [
      [1, 1, 'Bb2'],
      [2.5, 0.5, 'Db3'],
      [3, 1, 'F3'],
      [4, 0.5, 'Ab2'],
    ],
    47: [
      [1, 0.5, 'Ab2'],
      [2.5, 1, 'C3'],
      [4, 0.5, 'Eb3'],
    ],
    48: [
      [1, 1, 'Gb2'],
      [2.5, 0.5, 'Bb2'],
      [3, 1, 'Db3'],
      [4, 1, 'F3'],
    ],
  };
  return (lines[bar] || []).map(([beat, db, p]) => ({
    t: beatOff(beat),
    d: db * Q,
    m: toWritten(pc(p), PARTS.trombone),
    opts: { dyn: 'mf' },
  }));
}

function trumpetPad(bar) {
  const lo = lowestMelodyMidi(bar);
  return [
    { t: 0, d: H, m: clamp(lo - 14, PARTS.trumpet), opts: { dyn: 'mp' } },
    { t: Q * 2, d: H, m: clamp(lo - 17, PARTS.trumpet), opts: { chord: true, dyn: 'mp' } },
  ];
}

function isShoutPunchBeat(beat) {
  const frac = beat - Math.floor(beat);
  if (Math.abs(frac) < 0.05 && beat === Math.floor(beat)) return beat === 1;
  if (Math.abs(frac - 0.5) < 0.05) return Math.floor(beat) === 2;
  return false;
}

function shoutHarm(bar, pid) {
  const leadBar = bar - 52;
  const raw = HEAD_A_FIXED[leadBar] || [];
  const sym = SHOUT_CHORDS[bar];
  const out = [];

  if (pid === PARTS.trumpet) {
    for (const e of raw) {
      const beat = e.t / Q + 1;
      if (Math.abs(beat - 3) < 0.05) continue;
      const punch = isShoutPunchBeat(beat);
      out.push({
        t: e.t,
        d: e.d,
        m: toWritten(pc(e._p), pid),
        opts: { dyn: 'mf', staccato: punch },
      });
    }
    return out;
  }
  if (pid === PARTS.alto) {
    for (const e of raw) {
      const beat = e.t / Q + 1;
      if (Math.abs(beat - 3) < 0.05) continue;
      out.push({
        t: e.t,
        d: e.d,
        m: toWritten(pc(e._p) - 4, pid),
        opts: { dyn: 'mf', chord: e.t > 0, staccato: isShoutPunchBeat(beat) },
      });
    }
    return out;
  }
  if (pid === PARTS.tenor) {
    for (const e of raw) {
      const beat = e.t / Q + 1;
      if (Math.abs(beat - 3) < 0.05) continue;
      out.push({
        t: e.t,
        d: e.d,
        m: toWritten(pc(e._p) - 7, pid),
        opts: { dyn: 'mf', chord: e.t > 0, staccato: isShoutPunchBeat(beat) },
      });
    }
    return out;
  }
  if (pid === PARTS.trombone) {
    const rm = rootMidi(sym, 2);
    if (rm != null) {
      out.push({ t: 0, d: Q, m: toWritten(rm, pid), opts: { dyn: 'mp', staccato: true } });
      out.push({
        t: beatOff(2.5),
        d: Q,
        m: toWritten(rm, pid),
        opts: { dyn: 'mp', staccato: true },
      });
    }
  }
  return out;
}

function headOutHarm(bar, pid) {
  const raw = HEAD_OUT_FIXED[bar] || [];
  const sym = CHORDS[bar] || 'Fmaj7';

  if (pid === PARTS.trumpet || pid === PARTS.tenor) {
    return raw.map((e) => ({
      t: e.t,
      d: e.d,
      m: toWritten(pc(e._p), pid),
      opts: { dyn: 'mf', fermata: e.fermata },
    }));
  }
  if (pid === PARTS.alto) {
    return raw.map((e) => ({
      t: e.t,
      d: e.d,
      m: toWritten(pc(e._p) + 9, pid),
      opts: { dyn: 'mf', chord: e.t > 0, fermata: e.fermata },
    }));
  }
  if (pid === PARTS.trombone) {
    const rm = rootMidi(sym, 2);
    if (rm == null) return [];
    return [
      { t: 0, d: H, m: toWritten(rm, pid), opts: { dyn: 'mp' } },
      { t: H, d: H, m: toWritten(rm, pid), opts: { chord: true, dyn: 'mp', fermata: bar === 84 } },
    ];
  }
  return [];
}

function harmonyXml(sym) {
  if (!sym || sym === 'NC') return '';
  const root = sym[0];
  const alter = sym.includes('b') ? -1 : sym.includes('#') ? 1 : 0;
  const kind = sym.includes('maj7')
    ? 'major-seventh'
    : sym.includes('m9')
      ? 'minor-ninth'
      : sym.includes('7')
        ? 'dominant'
        : 'major';
  const altEl = alter ? `<root-alter>${alter}</root-alter>` : '';
  return `   <harmony>
    <root>
     <root-step>${root}</root-step>${altEl ? `\n     ${altEl}` : ''}
    </root>
    <kind text="${sym}">${kind}</kind>
   </harmony>\n`;
}

function partScore(bar, pid) {
  const events = [];
  const hookABarsTenor = new Set([9, 13, 17, 21, 25, 29]);
  const hookABarsAlto = new Set([34, 38, 42, 46, 50, 54]);
  const hookBBars = new Set([40, 44, 48, 52, 56, 64]);

  if (bar >= 1 && bar <= 4) {
    if (pid === PARTS.trombone) {
      events.push({ t: 0, d: BAR, m: toWritten(pc('Db2'), pid), opts: { dyn: 'mp' } });
    }
    if (pid === PARTS.alto || pid === PARTS.tenor) {
      events.push(...((bar - 1) % 2 === 0 ? hookABar1(pid) : hookABar2(pid)));
    }
    return events;
  }

  if (bar >= 5 && bar <= 32) {
    if (pid === PARTS.alto) events.push(...melEvents(bar, pid));
    if (pid === PARTS.tenor && hookABarsTenor.has(bar)) {
      events.push(...((Math.floor((bar - 9) / 4) % 2 === 0 ? hookABar1 : hookABar2)(pid)));
    }
    if (pid === PARTS.trumpet && bar >= 17) events.push(...trumpetPad(bar));
    if (pid === PARTS.trombone) events.push(...hookCEvents((bar - 5) % 2, pid));
    return events;
  }

  if (bar >= 33 && bar <= 56) {
    const lead = bar - 28;
    if (pid === PARTS.tenor) {
      const raw = HEAD_A_FIXED[lead] || [];
      events.push(
        ...raw.map((e) => ({
          t: e.t,
          d: e.d,
          m: toWritten(pc(e._p), pid),
          opts: { dyn: 'mf' },
        })),
      );
    }
    if (pid === PARTS.alto && hookABarsAlto.has(bar)) {
      events.push(...((Math.floor((bar - 34) / 4) % 2 === 0 ? hookABar1 : hookABar2)(pid)));
    }
    if (pid === PARTS.trumpet && hookBBars.has(bar)) {
      events.push(...hookBEvents(pid));
    }
    if (pid === PARTS.trombone) {
      if (bar >= 41 && bar <= 48) events.push(...tromboneFeature(bar));
      else events.push(...hookCEvents((bar - 5) % 2, pid));
    }
    return events;
  }

  if (bar >= 57 && bar <= 72) {
    if (bar === 71 || bar === 72) {
      if (pid !== PARTS.drums) events.push(...hookDEvents(pid));
      return events;
    }
    events.push(...shoutHarm(bar, pid));
    return events;
  }

  if (bar >= 73 && bar <= 84) {
    if (bar === 84 && pid !== PARTS.drums) {
      const hook = hookDEvents(pid)[0];
      if (hook) events.push({ ...hook, d: Q });
      if (pid === PARTS.trumpet || pid === PARTS.tenor) {
        events.push({
          t: Q,
          d: Q * 3,
          m: toWritten(pc('F3'), pid),
          opts: { dyn: 'mf', fermata: true },
        });
      } else if (pid === PARTS.alto) {
        events.push({
          t: Q,
          d: Q * 3,
          m: toWritten(pc('F3') + 9, pid),
          opts: { dyn: 'mf', fermata: true },
        });
      } else if (pid === PARTS.trombone) {
        events.push({
          t: Q,
          d: Q * 3,
          m: toWritten(pc('F2'), pid),
          opts: { dyn: 'mp', fermata: true },
        });
      }
    } else if (bar < 84) {
      events.push(...headOutHarm(bar, pid));
    }
    return events;
  }

  return events;
}

function measureAttrs(n) {
  const w = n === 1 ? ' width="238"' : '';
  return `<measure number="${n}"${w}>`;
}

function firstMeasurePrefix(pid) {
  const transpose =
    pid === PARTS.alto
      ? `      <transpose>\n       <diatonic>-5</diatonic>\n       <chromatic>-9</chromatic>\n       <octave-change>-1</octave-change>\n      </transpose>\n`
      : pid === PARTS.tenor || pid === PARTS.trumpet
        ? `      <transpose>\n       <diatonic>-1</diatonic>\n       <chromatic>-2</chromatic>\n      </transpose>\n`
        : '';
  const clef =
    pid === PARTS.trombone
      ? '      <clef>\n       <sign>F</sign>\n       <line>4</line>\n      </clef>\n'
      : '      <clef>\n       <sign>G</sign>\n       <line>2</line>\n      </clef>\n';
  let dir = '';
  if (pid === PARTS.alto) {
    dir = `   <direction placement="above">\n    <direction-type>\n     <words font-weight="bold">Swing (♩= 90)</words>\n    </direction-type>\n    <sound tempo="90"/>\n   </direction>\n`;
  }
  return `${dir}   <attributes>\n    <divisions>${DIV}</divisions>\n    <key>\n     <fifths>-1</fifths>\n     <mode>major</mode>\n    </key>\n    <time>\n     <beats>4</beats>\n     <beat-type>4</beat-type>\n    </time>\n${transpose}${clef}   </attributes>\n   <direction placement="above">\n    <direction-type>\n     <metronome parentheses="no">\n      <beat-unit>quarter</beat-unit>\n      <per-minute>90</per-minute>\n     </metronome>\n    </direction-type>\n    <sound tempo="90"/>\n   </direction>\n`;
}

function rehearsal(bar) {
  if (bar === 5) return 'A';
  if (bar === 33) return 'B';
  if (bar === 57) return 'C';
  if (bar === 73) return 'D';
  return null;
}

function buildPart(pid, name) {
  let body = '';
  for (let bar = 1; bar <= TOTAL; bar++) {
    const r = rehearsal(bar);
    let prefix = '';
    if (bar === 1) prefix = firstMeasurePrefix(pid);
    else if (r) {
      prefix = `   <direction placement="above"><direction-type><rehearsal>${r}</rehearsal></direction-type></direction>\n`;
    }
    if (pid === PARTS.alto && bar >= 5) {
      prefix += harmonyXml(CHORDS[bar] || SHOUT_CHORDS[bar]);
    }
    if (bar === 83 && pid !== PARTS.drums) {
      prefix +=
        '   <direction placement="above"><direction-type><words font-style="italic">rit.</words></direction-type></direction>\n';
    }
    const evs = pid === PARTS.drums ? [] : partScore(bar, pid);
    const inner = prefix + buildMeasure(evs, pid);
    body += `  <!-- ${name} m${bar} -->\n  ${measureAttrs(bar)}\n${inner}  </measure>\n`;
  }
  return body;
}

const score = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
 <work><work-title>Orbit — New Orleans Big Band</work-title></work>
 <identification>
  <encoding>
   <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>
   <software>Composer OS orbitNewOrleansV7</software>
  </encoding>
 </identification>
 <defaults>
  <scaling><millimeters>7</millimeters><tenths>40</tenths></scaling>
 </defaults>
 <part-list>
  <score-part id="${PARTS.alto}"><part-name>Alto Saxophone</part-name><part-abbreviation>Alto Sax.</part-abbreviation><score-instrument id="${PARTS.alto}-I1"><instrument-name>Alto Saxophone</instrument-name></score-instrument><midi-instrument id="${PARTS.alto}-I1"><midi-channel>1</midi-channel><midi-program>65</midi-program></midi-instrument></score-part>
  <score-part id="${PARTS.tenor}"><part-name>Tenor Saxophone</part-name><part-abbreviation>Tenor Sax.</part-abbreviation><score-instrument id="${PARTS.tenor}-I1"><instrument-name>Tenor Saxophone</instrument-name></score-instrument><midi-instrument id="${PARTS.tenor}-I1"><midi-channel>2</midi-channel><midi-program>67</midi-program></midi-instrument></score-part>
  <score-part id="${PARTS.trumpet}"><part-name>Trumpet in Bb</part-name><part-abbreviation>Tpt.</part-abbreviation><score-instrument id="${PARTS.trumpet}-I1"><instrument-name>Trumpet in Bb</instrument-name></score-instrument><midi-instrument id="${PARTS.trumpet}-I1"><midi-channel>3</midi-channel><midi-program>60</midi-program></midi-instrument></score-part>
  <score-part id="${PARTS.trombone}"><part-name>Trombone</part-name><part-abbreviation>Tbn.</part-abbreviation><score-instrument id="${PARTS.trombone}-I1"><instrument-name>Trombone</instrument-name></score-instrument><midi-instrument id="${PARTS.trombone}-I1"><midi-channel>4</midi-channel><midi-program>58</midi-program></midi-instrument></score-part>
  <score-part id="${PARTS.drums}"><part-name>Drum Kit (Jazz)</part-name><part-abbreviation>Drums</part-abbreviation><score-instrument id="${PARTS.drums}-I1"><instrument-name>Drum Kit (Jazz)</instrument-name></score-instrument><midi-instrument id="${PARTS.drums}-I1"><midi-channel>10</midi-channel><midi-program>1</midi-program></midi-instrument></score-part>
 </part-list>
 <part id="${PARTS.alto}">\n${buildPart(PARTS.alto, 'Alto Saxophone')}</part>
 <part id="${PARTS.tenor}">\n${buildPart(PARTS.tenor, 'Tenor Saxophone')}</part>
 <part id="${PARTS.trumpet}">\n${buildPart(PARTS.trumpet, 'Trumpet in Bb')}</part>
 <part id="${PARTS.trombone}">\n${buildPart(PARTS.trombone, 'Trombone')}</part>
 <part id="${PARTS.drums}">\n${buildPart(PARTS.drums, 'Drum Kit (Jazz)')}</part>
</score-partwise>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, score, 'utf8');
console.log('Wrote', OUT);
