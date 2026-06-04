/**
 * GCE evaluation — Orbit New Orleans V1 brass/sax vs SD3 snare grid
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const SCORE =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-NewOrleans-V1.musicxml';
const MIDI_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\New Orleans Orbit Beats';
const OUT =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-GCE-Report.md';

const GROOVE_FILES = {
  intro: 'Intro 01.mid',
  verse: 'Verse1 .mid',
  pre_chorus: 'Pre Chorus 01.mid',
  chorus: 'Chorus1.mid',
  bridge: 'Bridge 01.mid',
  fill_01: 'Fills 01.mid',
  fill_03: 'Fills 03.mid',
  fill_05: 'Fills 05.mid',
};

const DIVISIONS = 256;
const PARTS = { alto: 'P1', tenor: 'P2', trumpet: 'P3', trombone: 'P4' };

const SECTIONS = [
  { label: 'Intro', start: 1, end: 4, groove: 'intro', fillAt: null },
  { label: 'Soli Chorus', start: 5, end: 8, groove: 'pre_chorus', fillAt: 8, fill: 'fill_01' },
  { label: 'Melody Head', start: 9, end: 12, groove: 'verse', fillAt: 12, fill: 'fill_03' },
  { label: 'Solo Section', start: 13, end: 16, groove: 'bridge', fillAt: 16, fill: 'fill_01' },
  { label: 'Shout Chorus', start: 17, end: 24, groove: 'chorus', fillAt: [20, 24], fill: 'fill_05' },
  { label: 'Rideout', start: 25, end: 32, groove: 'bridge', fillAt: 32, fill: 'fill_05' },
  { label: 'Intro (A)', start: 33, end: 36, groove: 'intro', fillAt: 36, fill: 'fill_01' },
  { label: 'Melody Head (A)', start: 37, end: 44, groove: 'verse', fillAt: 44, fill: 'fill_03' },
  { label: 'Shout Chorus (A)', start: 45, end: 48, groove: 'chorus', fillAt: 48, fill: 'fill_05' },
  { label: 'Soli Chorus (A)', start: 49, end: 56, groove: 'pre_chorus', fillAt: 56, fill: 'fill_03' },
  { label: 'Rideout (A)', start: 57, end: 62, groove: 'bridge', fillAt: 62, fill: 'fill_01' },
  { label: 'Soli Chorus (A2)', start: 63, end: 70, groove: 'pre_chorus', fillAt: 70, fill: 'fill_03' },
  { label: 'Solo Section (A2)', start: 71, end: 74, groove: 'bridge', fillAt: 74, fill: 'fill_01' },
  { label: 'Melody Head (A2)', start: 75, end: 78, groove: 'verse', fillAt: 78, fill: 'fill_03' },
  { label: 'Shout Chorus (final)', start: 79, end: 84, groove: 'chorus', fillAt: [80, 84], fill: 'fill_05' },
];

function beatFromOffset(o) {
  return 1 + o / DIVISIONS;
}
function roundBeat(b) {
  return Math.round(b * 4) / 4;
}
function beatStr(b) {
  const w = Math.floor(b);
  const f = b - w;
  if (f < 0.01) return `${w}`;
  if (Math.abs(f - 0.5) < 0.01) return `${w}&`;
  return b.toFixed(2);
}

function pitchToMidi(xml) {
  const step = xml.match(/<step>([^<]+)<\/step>/);
  const oct = xml.match(/<octave>(\d+)<\/octave>/);
  const alter = xml.match(/<alter>(-?\d+)<\/alter>/);
  if (!step || !oct) return null;
  const steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[step[1]] + (parseInt(oct[1], 10) + 1) * 12;
  if (alter) n += parseInt(alter[1], 10);
  return n;
}

function readMidi(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 0;
  const rs = (n) => {
    const s = buf.toString('ascii', pos, pos + n);
    pos += n;
    return s;
  };
  const u32 = () => {
    const v = buf.readUInt32BE(pos);
    pos += 4;
    return v;
  };
  const u16 = () => {
    const v = buf.readUInt16BE(pos);
    pos += 2;
    return v;
  };
  const vlq = () => {
    let v = 0;
    while (true) {
      const b = buf[pos++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  };
  rs(4);
  u32();
  u16();
  const nTracks = u16();
  const division = u16();
  const tpb = division & 0x8000 ? 480 : division;
  const tracks = [];
  for (let t = 0; t < nTracks; t++) {
    rs(4);
    const len = u32();
    const end = pos + len;
    const events = [];
    let tick = 0;
    let st = 0;
    while (pos < end) {
      tick += vlq();
      let b = buf[pos++];
      if (b < 0x80) {
        pos--;
        b = st;
      } else st = b;
      const cmd = b & 0xf0;
      if (cmd === 0x90 || cmd === 0x80) {
        const note = buf[pos++];
        const vel = buf[pos++];
        if (cmd === 0x90 && vel > 0) events.push({ tick, note, vel });
      } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) pos += 2;
      else if (cmd === 0xc0 || cmd === 0xd0) pos += 1;
      else if (b === 0xff) {
        const meta = buf[pos++];
        const ml = vlq();
        pos += ml;
      }
    }
    tracks.push(events);
  }
  const all = tracks.flat();
  const tpbBar = tpb * 4;
  const maxTick = Math.max(0, ...all.map((e) => e.tick));
  const loopBars = Math.max(1, Math.ceil(maxTick / tpbBar) || 1);
  return { tpb, tpbBar, loopBars, events: all, filePath };
}

function snareBeatsForBar(midi, barInLoop) {
  const idx = (barInLoop - 1) % midi.loopBars;
  const start = idx * midi.tpbBar;
  const end = start + midi.tpbBar;
  const SNARE = new Set([38, 40]);
  const hits = midi.events.filter(
    (e) => e.tick >= start && e.tick < end && SNARE.has(e.note) && e.vel >= 50
  );
  if (!hits.length) {
    const weak = midi.events.filter((e) => e.tick >= start && e.tick < end && SNARE.has(e.note));
    hits.push(...weak);
  }
  return [...new Set(hits.map((h) => roundBeat((h.tick - start) / midi.tpb + 1)))].sort((a, b) => a - b);
}

function buildGrooves(grooveFiles = GROOVE_FILES, midiDir = MIDI_DIR) {
  const g = {};
  for (const [k, f] of Object.entries(grooveFiles)) {
    g[k] = readMidi(path.join(midiDir, f));
  }
  return g;
}

function buildBarPlan(grooves, totalBars, sections = SECTIONS) {
  const fillBars = new Set();
  for (const s of sections) {
    const f = s.fillAt == null ? [] : Array.isArray(s.fillAt) ? s.fillAt : [s.fillAt];
    f.forEach((x) => fillBars.add(x));
  }
  const plan = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const sec = sections.find((s) => bar >= s.start && bar <= s.end);
    if (!sec) continue;
    const pos = bar - sec.start;
    const barInLoop = (pos % grooves[sec.groove].loopBars) + 1;
    const isFill = fillBars.has(bar);
    const grooveKey = isFill ? sec.fill || 'fill_01' : sec.groove;
    const midi = grooves[grooveKey];
    const snare = snareBeatsForBar(midi, isFill ? 1 : barInLoop);
    plan.push({ bar, section: sec.label, snare, grooveKey });
  }
  return plan;
}

function parsePart(xml, partId) {
  const m = xml.match(new RegExp(`<part id="${partId}">([\\s\\S]*?)</part>`, 'm'));
  return m ? m[1] : '';
}

function splitMeasures(body) {
  const measures = new Map();
  const re = /<!--============== Part:[^=]+ Measure: (\d+) ==============-->\s*<measure number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
  let m;
  while ((m = re.exec(body))) {
    measures.set(parseInt(m[2], 10), m[3]);
  }
  return measures;
}

function parseNotesInMeasure(inner) {
  let time = 0;
  const notes = [];
  const re = /<(note|backup|forward)([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(inner))) {
    if (m[1] === 'backup') {
      time -= parseInt(m[2].match(/<duration>(\d+)<\/duration>/)[1], 10);
      continue;
    }
    if (m[1] === 'forward') {
      time += parseInt(m[2].match(/<duration>(\d+)<\/duration>/)[1], 10);
      continue;
    }
    const block = m[0];
    const isRest = /<rest\s*\/>/.test(block);
    const isChord = /<chord\s*\/>/.test(block);
    const dur = parseInt(block.match(/<duration>(\d+)<\/duration>/)[1], 10);
    const voice = parseInt(block.match(/<voice>(\d+)<\/voice>/)?.[1] || '1', 10);
    const accent = /<accent\s*\/>/.test(block);
    const safeTime = Math.max(0, Math.min(time, 1024 - 1));
    if (!isRest) {
      const beat = roundBeat(beatFromOffset(safeTime));
      notes.push({
        time: safeTime,
        beat: beat > 4 ? 4 : beat,
        dur,
        midi: pitchToMidi(block),
        accent,
        isChord,
        voice,
        overflow: time >= 1024,
      });
    }
    if (!isChord) time += dur;
  }
  return notes;
}

function classifyBrassHit(beat, snareBeats) {
  if (!snareBeats.length) return { ok: true, kind: 'no-snare-ref' };
  let nearest = snareBeats[0];
  let dist = Math.abs(beat - nearest);
  for (const s of snareBeats) {
    const d = Math.abs(beat - s);
    if (d < dist) {
      dist = d;
      nearest = s;
    }
  }
  if (dist <= 0.06) return { ok: true, kind: 'on-snare', nearest };
  if (Math.abs(beat - (nearest + 0.5)) <= 0.06) return { ok: true, kind: 'answers-snare', nearest };
  const weak = [3, 3.5, 1.5].some((w) => Math.abs(beat - w) < 0.06);
  if (weak) return { ok: false, kind: 'weak-clave', nearest, dist };
  if (dist <= 0.25) return { ok: true, kind: 'near-snare', nearest };
  return { ok: false, kind: 'off-grid', nearest, dist };
}

function intervalBetween(a, b) {
  return Math.abs(a - b) % 12;
}

function evalSection(sec, barPlan, parts) {
  const bars = [];
  for (let b = sec.start; b <= sec.end; b++) bars.push(b);

  const brassIssues = [];
  let brassTotal = 0;
  let brassGood = 0;

  for (const b of bars) {
    const plan = barPlan.find((p) => p.bar === b);
    const snare = plan?.snare || [];
    for (const [name, pid] of [
      ['Trumpet', PARTS.trumpet],
      ['Trombone', PARTS.trombone],
    ]) {
      const notes = parts[pid].get(b) || [];
      const hits = notes.filter((n) => (n.accent || n.dur <= 128) && n.midi != null);
      for (const h of hits) {
        brassTotal++;
        const c = classifyBrassHit(h.beat, snare);
        if (c.ok) brassGood++;
        else brassIssues.push({ bar: b, part: name, beat: h.beat, ...c });
      }
    }
  }

  const saxIssues = [];
  let saxMoves = 0;
  let saxNatural = 0;
  for (const [name, pid] of [
    ['Alto Sax', PARTS.alto],
    ['Tenor Sax', PARTS.tenor],
  ]) {
    const contour = [];
    for (const b of bars) {
      const notes = (parts[pid].get(b) || []).filter((n) => n.midi != null);
      for (const n of notes) contour.push({ bar: b, beat: n.beat, midi: n.midi });
    }
    let prev = null;
    for (const n of contour) {
      if (prev) {
        const dir = Math.sign(n.midi - prev.midi);
        const prevDir = prev._dir ?? 0;
        if (prevDir !== 0 && dir !== 0 && dir !== prevDir && Math.abs(n.beat - prev.beat) < 0.6) {
          saxIssues.push({ bar: n.bar, part: name, note: 'contour zigzag', beats: `${beatStr(prev.beat)}→${beatStr(n.beat)}` });
        }
        n._dir = dir;
      }
      prev = n;
      const frac = n.beat - Math.floor(n.beat);
      if (frac > 0.4 && frac < 0.6) {
        saxMoves++;
        if ([1.5, 2.5, 3.5, 4.5].includes(n.beat)) saxNatural++;
        else saxIssues.push({ bar: n.bar, part: name, beat: n.beat, note: 'awkward anticipation' });
      }
    }
  }

  const parallelIssues = [];
  for (const b of bars) {
    const tpt = (parts[PARTS.trumpet].get(b) || []).filter((n) => n.midi != null);
    const tbn = (parts[PARTS.trombone].get(b) || []).filter((n) => n.midi != null);
    for (const a of tpt) {
      for (const c of tbn) {
        if (Math.abs(a.beat - c.beat) > 0.06) continue;
        const iv = intervalBetween(a.midi, c.midi);
        if (iv === 0) parallelIssues.push({ bar: b, type: 'unison/octave', beat: a.beat });
        else if (iv === 7) parallelIssues.push({ bar: b, type: '5th', beat: a.beat });
      }
    }
    const sortedT = [...tpt].sort((x, y) => x.beat - y.beat);
    const sortedB = [...tbn].sort((x, y) => x.beat - y.beat);
    for (let i = 1; i < sortedT.length && i < sortedB.length; i++) {
      const i1 = intervalBetween(sortedT[i].midi, sortedB[i].midi);
      const i0 = intervalBetween(sortedT[i - 1].midi, sortedB[i - 1].midi);
      if (i0 === i1 && (i0 === 0 || i0 === 7)) {
        parallelIssues.push({ bar: b, type: `parallel ${i0 === 0 ? '8ve' : '5th'}`, beats: `${beatStr(sortedT[i - 1].beat)}→${beatStr(sortedT[i].beat)}` });
      }
    }
  }

  const rhythmDensity = (pid) => {
    let eighths = 0;
    let accents = 0;
    for (const b of bars) {
      for (const n of parts[pid].get(b) || []) {
        if (n.dur <= 128 && !n.isChord) eighths++;
        if (n.accent) accents++;
      }
    }
    return { eighths, accents };
  };

  const altoD = rhythmDensity(PARTS.alto);
  const tptD = rhythmDensity(PARTS.trumpet);
  const tbnD = rhythmDensity(PARTS.trombone);
  const rawRhythm = (altoD.eighths + tptD.accents * 2 + tbnD.accents * 2) / bars.length;
  let balanceScore = Math.min(10, rawRhythm / 3);
  if (sec.label.includes('Shout')) balanceScore = Math.min(10, balanceScore + 1.5);
  if (sec.label.includes('Melody Head')) balanceScore = Math.max(1, balanceScore - 0.5);

  const brassScore =
    brassTotal === 0
      ? 7
      : Math.max(0, Math.round((brassGood / brassTotal) * 10 * 10) / 10);
  const saxScore =
    saxMoves === 0
      ? 8
      : Math.round(((saxNatural / Math.max(1, saxMoves)) * 7 + (saxIssues.length === 0 ? 3 : 0)) * 10) / 10;
  const parallelScore = Math.max(1, 10 - parallelIssues.length * 1.5);

  const overall = Math.round(((brassScore + saxScore + parallelScore + balanceScore) / 4) * 10) / 10;

  return {
    label: sec.label,
    range: `${sec.start}–${sec.end}`,
    brassScore,
    saxScore,
    parallelScore,
    balanceScore,
    overall,
    brassTotal,
    brassGood,
    brassIssues,
    saxIssues,
    saxMoves,
    saxNatural,
    parallelIssues,
    rhythmDensity: { alto: altoD, tpt: tptD, tbn: tbnD },
  };
}

export function runGceEvaluation(scorePath, config = {}) {
  const grooveFiles = config.grooveFiles ?? GROOVE_FILES;
  const sections = config.sections ?? SECTIONS;
  const midiDir = config.midiDir ?? MIDI_DIR;

  const xml = fs.readFileSync(scorePath, 'utf8');
  const grooves = buildGrooves(grooveFiles, midiDir);
  const p1m = splitMeasures(parsePart(xml, PARTS.alto));
  const totalBars = Math.max(...p1m.keys());
  const barPlan = buildBarPlan(grooves, totalBars, sections);

  const parts = {};
  for (const pid of Object.values(PARTS)) {
    parts[pid] = new Map();
    const ms = splitMeasures(parsePart(xml, pid));
    for (const [b, inner] of ms) parts[pid].set(b, parseNotesInMeasure(inner));
  }

  const results = sections.map((s) => evalSection(s, barPlan, parts));
  const shout = results.filter((r) => r.label.includes('Shout'));
  const verse = results.filter((r) => r.label.includes('Melody Head'));
  const shoutAvg =
    shout.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    Math.max(1, shout.length);
  const verseAvg =
    verse.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    Math.max(1, verse.length);
  const overallAvg =
    Math.round((results.reduce((a, r) => a + r.overall, 0) / results.length) * 10) / 10;
  return { results, shoutAvg, verseAvg, overallAvg };
}

function writeGceReport({ results, shoutAvg, verseAvg, overallAvg }, outPath, fileLabel) {
  const lines = [];
  lines.push(`# ${fileLabel}`);
  lines.push('');
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(
    `**Overall form average: ${overallAvg}/10** — shout vs verse accent ratio **${(shoutAvg / Math.max(0.1, verseAvg)).toFixed(1)}×**`
  );
  lines.push('');
  lines.push('## Section scores (1–10)');
  lines.push('');
  lines.push('| Section | Bars | Brass | Sax | Parallel | Balance | **Overall** |');
  lines.push('|---------|------|-------|-----|----------|---------|-------------|');
  for (const r of results) {
    lines.push(
      `| ${r.label} | ${r.range} | ${r.brassScore} | ${r.saxScore} | ${r.parallelScore} | ${r.balanceScore.toFixed(1)} | **${r.overall}** |`
    );
  }
  lines.push('');
  const manual = results.filter((r) => r.overall < 6);
  lines.push('## Manual Sibelius review (overall < 6)');
  lines.push('');
  if (!manual.length) lines.push('None — all sections scored ≥ 6 overall.');
  else {
    for (const r of manual) {
      lines.push(`### ${r.label} (bars ${r.range}) — overall **${r.overall}**`);
      if (r.brassIssues.length) {
        lines.push('- **Brass weak positions:**');
        for (const i of r.brassIssues.slice(0, 8)) {
          lines.push(
            `  - Bar ${i.bar} ${i.part} beat ${beatStr(i.beat)} — ${i.kind}`
          );
        }
      }
      if (r.parallelIssues.length) {
        lines.push('- **Parallel motion:**');
        for (const i of r.parallelIssues.slice(0, 6)) {
          lines.push(`  - Bar ${i.bar} ${i.type}`);
        }
      }
      if (r.saxIssues.length) {
        lines.push('- **Sax issues:**');
        for (const i of r.saxIssues.slice(0, 4)) {
          lines.push(`  - Bar ${i.bar} ${i.part}: ${i.note}`);
        }
      }
      lines.push('');
    }
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

// ─── CLI ───
const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  const scoreArg = process.argv[2] || SCORE;
  const outArg = process.argv[3] || OUT;
  const labelArg = process.argv[4] || 'Orbit New Orleans — GCE Evaluation Report';
  const evalResult = runGceEvaluation(scoreArg);
  writeGceReport(evalResult, outArg, labelArg);
  console.log('Wrote', outArg);
  console.log(
    'Sections:',
    evalResult.results.length,
    'Manual:',
    evalResult.results.filter((r) => r.overall < 6).length
  );
}
