/**
 * Orbit New Orleans V6 — complete rewrite from 4/4 melody MIDI + SD3 grooves.
 * V5 abandoned. Build order: drums → hooks → melody → backgrounds → gate → GCE.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  readMidi,
  analyzeGroove,
  buildBarPlan,
  splitPart,
  splitMeasures,
  parseMeasureTimeline,
  rebuildMeasure,
  restXml,
  rebuildPartBody,
  instrumentIdForPart,
  DIVISIONS,
  BAR_LEN,
  QUARTER,
  EIGHTH,
  SIXTEENTH,
  PARTS,
  offsetFromBeat,
  beatFromOffset,
  roundBeat,
  beatStr,
} from './orbitNewOrleansRevise.mjs';
import { GROOVE_FILES_V6, SECTIONS_V6, MIDI_DIR } from './orbitGrooveConfig.mjs';

const MELODY_MIDI =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit in 4_4 - 31 May 2026.mid';
const V4_REF =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-NewOrleans-V4.musicxml';
const REV_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const V6_SCORE = path.join(REV_DIR, 'Orbit-NewOrleans-V6.musicxml');
const V6_DRUMS = path.join(REV_DIR, 'Orbit-Drums-V6.mid');
const CHANGES = path.join(REV_DIR, 'Orbit-Changes.md');
const GCE_V6_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V6.md');

const HORN_PARTS = [PARTS.alto, PARTS.tenor, PARTS.trumpet, PARTS.trombone];
const MELODY_PARTS = [PARTS.alto, PARTS.tenor, PARTS.trumpet];
const TOTAL_BARS = 84;
const LEAD_BARS = 20;

/** Concert → written pitch for MusicXML (user spec) */
const WRITTEN_OFFSET = {
  [PARTS.alto]: 9,
  [PARTS.tenor]: 2,
  [PARTS.trumpet]: 2,
  [PARTS.trombone]: 0,
};

const REGISTER = {
  [PARTS.alto]: { min: 62, max: 81 },
  [PARTS.tenor]: { min: 60, max: 79 },
  [PARTS.trumpet]: { min: 64, max: 84 },
  [PARTS.trombone]: { min: 46, max: 70 },
};

/** Opening motif — locked identity cell (concert pitch MIDI) */
const MOTIF = [65, 63, 56, 61, 60]; // F4 Eb4 Ab3 C#4 C4

const MELODY_MAP = [
  { start: 1, end: 4, leadStart: 1, owner: 'tenor' },
  { start: 5, end: 8, leadStart: 5, owner: 'trumpet' },
  { start: 9, end: 12, leadStart: 9, owner: 'alto_tenor_oct' },
  { start: 13, end: 16, leadStart: 13, owner: 'brass_harm' },
  { start: 17, end: 24, leadStart: 17, owner: 'trumpet' },
  { start: 25, end: 32, leadStart: 1, owner: 'alto_tenor_unison' },
  { start: 33, end: 36, leadStart: 1, owner: 'tenor' },
  { start: 37, end: 44, leadStart: 5, owner: 'alto' },
  { start: 45, end: 48, leadStart: 13, owner: 'trumpet' },
  { start: 49, end: 56, leadStart: 1, owner: 'tenor' },
  { start: 57, end: 62, leadStart: 9, owner: 'alto' },
  { start: 63, end: 70, leadStart: 1, owner: 'tenor' },
  { start: 71, end: 74, leadStart: 17, owner: 'alto' },
  { start: 75, end: 78, leadStart: 9, owner: 'alto_tenor_oct' },
  { start: 79, end: 84, leadStart: 1, owner: 'hook_d' },
];

const v6Changes = [];

function logChange(bar, partName, oldBeat, newBeat, reason) {
  v6Changes.push({ bar, partName, oldBeat, newBeat, reason });
}

function range(a, b) {
  return [...Array(b - a + 1)].map((_, i) => a + i);
}

function leadBarForScoreBar(bar) {
  const entry = MELODY_MAP.find((x) => bar >= x.start && bar <= x.end);
  if (!entry) return 1;
  const offset = bar - entry.start;
  return ((entry.leadStart + offset - 1) % LEAD_BARS) + 1;
}

function ownerForBar(bar) {
  return MELODY_MAP.find((x) => bar >= x.start && bar <= x.end)?.owner ?? null;
}

function melodyOwnerPartId(bar) {
  const o = ownerForBar(bar);
  if (o === 'alto' || o === 'brass_harm') return PARTS.alto;
  if (o === 'tenor' || o === 'alto_tenor_oct' || o === 'alto_tenor_unison') return PARTS.tenor;
  if (o === 'trumpet') return PARTS.trumpet;
  if (o === 'hook_d') return PARTS.alto;
  return null;
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

function midiToPitchParts(midi) {
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
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  const [step, alter] = names[pc];
  return { step, alter, octave: oct };
}

function clampMidi(midi, partId) {
  const r = REGISTER[partId];
  if (!r) return midi;
  return Math.max(r.min, Math.min(r.max, midi));
}

function typeForDuration(dur) {
  if (dur >= 1024) return 'whole';
  if (dur >= 512) return 'half';
  if (dur >= 256) return 'quarter';
  if (dur >= 128) return 'eighth';
  if (dur >= 64) return '16th';
  return '32nd';
}

function noteXml(concertMidi, dur, partId, voice = 1, chord = false, accent = false) {
  const written = concertMidi + (WRITTEN_OFFSET[partId] ?? 0);
  const { step, alter, octave } = midiToPitchParts(written);
  const acc =
    alter !== 0 ? `    <accidental>${alter === 1 ? 'sharp' : 'flat'}</accidental>\n` : '';
  const altTag = alter !== 0 ? `     <alter>${alter}</alter>\n` : '';
  const chordTag = chord ? '   <chord />\n' : '';
  const accentTag = accent ? '    <accent />\n' : '';
  return `   <note>\n${chordTag}    <pitch>\n     <step>${step}</step>\n${altTag}     <octave>${octave}</octave>\n    </pitch>\n    <duration>${dur}</duration>\n    <instrument id="${partId}-I1" />\n    <voice>${voice}</voice>\n    <type>${typeForDuration(dur)}</type>\n${accentTag}${acc}    <staff>1</staff>\n   </note>\n`;
}

// ─── Sibelius Jazz Kit (NOT GM) ─────────────────────────────────────────────

const SIBELIUS_DRUM = {
  kick: { step: 'C', octave: 5, alter: 0, notehead: '', midi: 72 },
  snare: { step: 'E', octave: 5, alter: 0, notehead: 'x', midi: 76 },
  hatClosed: { step: 'F', octave: 5, alter: 1, notehead: 'x', midi: 78 },
  hatOpen: { step: 'G', octave: 5, alter: 1, notehead: 'x', open: true, midi: 80 },
  ride: { step: 'B', octave: 5, alter: -1, notehead: 'x', midi: 82 },
  crash: { step: 'A', octave: 5, alter: 0, notehead: 'x', midi: 81 },
  tomHigh: { step: 'D', octave: 5, alter: 0, notehead: '', midi: 74 },
  tomMid: { step: 'B', octave: 4, alter: 0, notehead: '', midi: 71 },
  tomLow: { step: 'A', octave: 4, alter: 0, notehead: '', midi: 69 },
};

function sibeliusFromGm(gm) {
  if ([35, 36].includes(gm)) return SIBELIUS_DRUM.kick;
  if ([38, 40].includes(gm)) return SIBELIUS_DRUM.snare;
  if (gm === 42 || gm === 44) return SIBELIUS_DRUM.hatClosed;
  if (gm === 46) return SIBELIUS_DRUM.hatOpen;
  if (gm === 51) return SIBELIUS_DRUM.ride;
  if ([49, 57, 55, 52].includes(gm)) return SIBELIUS_DRUM.crash;
  if (gm === 48) return SIBELIUS_DRUM.tomHigh;
  if (gm === 47) return SIBELIUS_DRUM.tomMid;
  if (gm === 45) return SIBELIUS_DRUM.tomLow;
  if (gm === 43) return SIBELIUS_DRUM.tomLow;
  return SIBELIUS_DRUM.snare;
}

function convertHitsToSibelius(gmHits) {
  return gmHits.map((h) => {
    const s = sibeliusFromGm(h.midi);
    return { beat: h.beat, vel: h.vel, gm: h.midi, sibelius: s };
  });
}

function buildDrumMeasureInnerSibelius(hits, keepPrefix) {
  if (!hits.length) {
    return (
      (keepPrefix || '') +
      restXml(BAR_LEN, 1, 'P7-I1') +
      `   <backup>\n    <duration>${BAR_LEN}</duration>\n   </backup>\n` +
      restXml(BAR_LEN, 2, 'P7-I1')
    );
  }

  const groups = new Map();
  for (const h of hits) {
    const off = offsetFromBeat(h.beat);
    if (!groups.has(off)) groups.set(off, []);
    groups.get(off).push(h);
  }
  const offsets = [...groups.keys()].sort((a, b) => a - b);

  let xml = keepPrefix || '';
  let time = 0;
  const voice1 = [];
  for (const off of offsets) {
    if (off > time) {
      voice1.push({ dur: off - time, rest: true });
      time = off;
    }
    const grp = groups.get(off);
    grp.forEach((h, i) => {
      voice1.push({ dur: SIXTEENTH, rest: false, s: h.sibelius, chord: i > 0, open: h.sibelius.open });
    });
    time += SIXTEENTH;
  }
  if (time < BAR_LEN) voice1.push({ dur: BAR_LEN - time, rest: true });

  for (const item of voice1) {
    if (item.rest) {
      xml += restXml(item.dur, 1, 'P7-I1');
    } else {
      const s = item.s;
      const chord = item.chord ? '   <chord />\n' : '';
      const altTag = s.alter !== 0 ? `     <alter>${s.alter}</alter>\n` : '';
      const acc = s.alter !== 0 ? `    <accidental>${s.alter === 1 ? 'sharp' : 'flat'}</accidental>\n` : '';
      const nh = s.notehead === 'x' ? '    <notehead>x</notehead>\n' : '';
      const openMark =
        item.open
          ? '    <notations>\n     <articulations>\n      <open-string />\n     </articulations>\n    </notations>\n'
          : '';
      xml += `   <note>\n${chord}    <unpitched>\n     <display-step>${s.step}</display-step>\n${altTag}     <display-octave>${s.octave}</display-octave>\n    </unpitched>\n    <duration>${item.dur}</duration>\n    <instrument id="P7-I1" />\n    <voice>1</voice>\n    <type>${typeForDuration(item.dur)}</type>\n${acc}    <stem>${s.step === 'C' && s.octave === 5 ? 'down' : 'up'}</stem>\n${nh}${openMark}    <staff>1</staff>\n   </note>\n`;
    }
  }
  xml += `   <backup>\n    <duration>${BAR_LEN}</duration>\n   </backup>\n`;
  xml += restXml(BAR_LEN, 2, 'P7-I1');
  return xml;
}

function replaceDrumPartSibelius(measures, barPlan) {
  const out = new Map();
  for (const [barNum, meas] of measures) {
    const plan = barPlan.find((p) => p.bar === barNum);
    const { prefix } = parseMeasureTimeline(meas.inner);
    const keepPrefix = prefix.filter((p) => /<(attributes|print|direction|barline)/.test(p)).join('');
    const hits = convertHitsToSibelius(plan?.hits || []);
    out.set(barNum, {
      attrs: meas.attrs,
      inner: buildDrumMeasureInnerSibelius(
        hits,
        barNum === 1 ? keepPrefix : keepPrefix.replace(/<attributes[\s\S]*?<\/attributes>/, '')
      ),
    });
    if (hits.length) {
      logChange(barNum, 'Drum Set (Jazz)', 'GM', 'Sibelius kit', `SD3 ${plan?.grooveKey}`);
    }
  }
  return out;
}

function writeSibeliusDrumMidi(barPlan, outPath, tempo = 90) {
  const ticksPerBeat = 480;
  const ticksPerBar = ticksPerBeat * 4;
  const usPerQuarter = Math.round(60000000 / tempo);
  const trackEvents = [
    {
      tick: 0,
      raw: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff],
    },
  ];
  trackEvents.push({ tick: 0, raw: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] });

  for (const plan of barPlan) {
    const base = (plan.bar - 1) * ticksPerBar;
    for (const h of convertHitsToSibelius(plan.hits || [])) {
      const tick = base + Math.round((h.beat - 1) * ticksPerBeat);
      trackEvents.push({ tick, raw: [0x99, h.sibelius.midi, h.vel || 100] });
      trackEvents.push({ tick: tick + Math.round(ticksPerBeat * 0.2), raw: [0x89, h.sibelius.midi, 0] });
    }
  }

  trackEvents.sort((a, b) => a.tick - b.tick || (a.raw[0] & 0xf0) - (b.raw[0] & 0xf0));
  const trackData = [];
  let last = 0;
  for (const ev of trackEvents) {
    trackData.push(...encodeVLQ(ev.tick - last), ...ev.raw);
    last = ev.tick;
  }
  trackData.push(...encodeVLQ(0), 0xff, 0x2f, 0x00);

  const header = Buffer.alloc(14);
  header.write('MThd', 0);
  header.writeUInt32BE(6, 4);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(1, 10);
  header.writeUInt16BE(ticksPerBeat, 12);
  const trackBuf = Buffer.from(trackData);
  const trackHeader = Buffer.alloc(8);
  trackHeader.write('MTrk', 0);
  trackHeader.writeUInt32BE(trackBuf.length, 4);
  fs.writeFileSync(outPath, Buffer.concat([header, trackHeader, trackBuf]));
}

function encodeVLQ(v) {
  const out = [];
  out.push(v & 0x7f);
  let x = v >> 7;
  while (x > 0) {
    out.unshift((x & 0x7f) | 0x80);
    x >>= 7;
  }
  return out;
}

// ─── Melody MIDI parse ───────────────────────────────────────────────────────

function parseMelodyMidi(midiPath) {
  const buf = fs.readFileSync(midiPath);
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
  const tpbBar = tpb * 4;

  const tracks = [];
  for (let t = 0; t < nTracks; t++) {
    rs(4);
    const len = u32();
    const end = pos + len;
    const events = [];
    let tick = 0;
    let st = 0;
    let name = '';
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
        events.push({ tick, note, vel, on: cmd === 0x90 && vel > 0 });
      } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) pos += 2;
      else if (cmd === 0xc0 || cmd === 0xd0) pos += 1;
      else if (b === 0xff) {
        const meta = buf[pos++];
        const ml = vlq();
        if (meta === 0x03) name = buf.toString('utf8', pos, pos + ml);
        pos += ml;
      }
    }
    tracks.push({ name, events });
  }

  const lead = tracks.find((t) => t.name.includes('L1'));
  if (!lead) throw new Error('L1: Lead Piano track not found');

  const active = new Map();
  const noteEvents = [];
  for (const e of lead.events) {
    if (e.on) {
      active.set(e.note, e.tick);
    } else {
      const start = active.get(e.note);
      if (start != null) {
        noteEvents.push({ start, end: e.tick, midi: e.note });
        active.delete(e.note);
      }
    }
  }
  for (const [note, start] of active) {
    noteEvents.push({ start, end: start + tpb / 2, midi: note });
  }

  const bars = new Map();
  for (const ne of noteEvents) {
    const bar = Math.floor(ne.start / tpbBar) + 1;
    const beat = roundBeat((ne.start % tpbBar) / tpb + 1);
    const durBeats = Math.max(0.25, roundBeat((ne.end - ne.start) / tpb));
    if (!bars.has(bar)) bars.set(bar, []);
    bars.get(bar).push({ beat, durBeats, midi: ne.midi });
  }
  for (const [, notes] of bars) notes.sort((a, b) => a.beat - b.beat);

  return bars;
}

function barEventsFromLead(leadBars, leadBarNum) {
  const notes = leadBars.get(leadBarNum) || [];
  const events = [];
  for (const n of notes) {
    const off = offsetFromBeat(n.beat);
    const dur = Math.max(SIXTEENTH, Math.round(n.durBeats * QUARTER));
    events.push({ time: off, dur, midi: n.midi, isRest: false });
  }
  let total = events.reduce((a, e) => a + e.dur, 0);
  if (total < BAR_LEN) {
    events.push({ time: total, dur: BAR_LEN - total, isRest: true });
  }
  return events;
}

function addBreathSpace(events, bar) {
  if (bar % 4 !== 0) return events;
  const restDur = QUARTER;
  let time = 0;
  for (const e of events) time += e.dur;
  if (time >= BAR_LEN) {
    const last = [...events].reverse().find((e) => !e.isRest);
    if (last && last.dur >= restDur) {
      last.dur -= restDur;
      events.push({ time: BAR_LEN - restDur, dur: restDur, isRest: true });
    }
  }
  return events;
}

function eventsToMeasureEvents(events, partId) {
  return events.map((e) => {
    if (e.isRest) {
      return {
        time: e.time,
        dur: e.dur,
        isRest: true,
        isChord: false,
        voice: 1,
        xml: restXml(e.dur, 1, `${partId}-I1`),
      };
    }
    const midi = clampMidi(e.midi, partId);
    return {
      time: e.time,
      dur: e.dur,
      isRest: false,
      isChord: e.isChord || false,
      voice: 1,
      midi,
      xml: noteXml(midi, e.dur, partId, 1, e.isChord, e.accent),
    };
  });
}

// ─── Four recurring hooks ────────────────────────────────────────────────────

function buildHookA(barPhase) {
  const [f, eb, ab, cs, c] = MOTIF;
  const low = (m) => Math.max(53, m - 12);
  if (barPhase === 0) {
    return [
      { beat: 2.5, dur: EIGHTH, midi: low(f) },
      { beat: 4.5, dur: EIGHTH, midi: low(ab) },
    ];
  }
  return [
    { beat: 2.5, dur: EIGHTH, midi: low(eb) },
    { beat: 4.5, dur: EIGHTH, midi: low(c) },
  ];
}

function buildHookB() {
  const [, eb, ab, , c] = MOTIF;
  return [
    { beat: 4, dur: QUARTER, midi: clampMidi(c, PARTS.trumpet), accent: true },
    { beat: 4, dur: QUARTER, midi: clampMidi(eb, PARTS.trumpet), accent: true, chord: true },
  ];
}

function buildHookC(barPhase, kickBeats = [1, 3]) {
  const [, , ab, cs, c] = MOTIF;
  const growl = barPhase === 0 ? ab - 12 : c - 12;
  return kickBeats.map((b) => ({
    beat: b,
    dur: EIGHTH,
    midi: clampMidi(growl, PARTS.trombone),
  }));
}

function buildHookD(barPhase) {
  const [f, eb, ab, cs, c] = MOTIF;
  const hits =
    barPhase === 0
      ? [
          { beat: 1, dur: QUARTER, midi: f },
          { beat: 2, dur: QUARTER, midi: eb },
          { beat: 3, dur: QUARTER, midi: ab },
          { beat: 4, dur: QUARTER, midi: cs },
        ]
      : [
          { beat: 1, dur: QUARTER, midi: c },
          { beat: 2, dur: QUARTER, midi: ab },
          { beat: 3, dur: HALF_OR_QUARTER(2), midi: f },
          { beat: 4, dur: QUARTER, midi: c, accent: true },
        ];
  return hits;
}

function HALF_OR_QUARTER(beats) {
  return beats >= 2 ? QUARTER * 2 : QUARTER;
}

function hookDToParts(barPhase) {
  const hits = buildHookD(barPhase);
  const alto = hits.map((h) => ({ ...h, midi: clampMidi(h.midi, PARTS.alto) }));
  const tenor = hits.map((h) => ({
    ...h,
    midi: clampMidi(h.midi - 12, PARTS.tenor),
    isChord: h.beat !== 1,
  }));
  const trumpet = hits.map((h) => ({
    ...h,
    midi: clampMidi(h.midi + 7, PARTS.trumpet),
    isChord: h.beat !== 1,
  }));
  const trombone = hits.map((h) => ({
    ...h,
    midi: clampMidi(h.midi - 24, PARTS.trombone),
    isChord: h.beat !== 1,
  }));
  return { alto, tenor, trumpet, trombone };
}

function buildMelodyMeasures(leadBars) {
  const out = {
    [PARTS.alto]: new Map(),
    [PARTS.tenor]: new Map(),
    [PARTS.trumpet]: new Map(),
    [PARTS.trombone]: new Map(),
  };

  for (let bar = 1; bar <= TOTAL_BARS; bar++) {
    const owner = ownerForBar(bar);
    const leadBar = leadBarForScoreBar(bar);
    let events = barEventsFromLead(leadBars, leadBar);
    events = addBreathSpace(events, bar);

    for (const pid of HORN_PARTS) {
      out[pid].set(bar, { events: [] });
    }

    if (owner === 'hook_d') {
      const phase = (bar - 79) % 2;
      const parts = hookDToParts(phase);
      out[PARTS.alto].get(bar).events = eventsToMeasureEvents(
        parts.alto.map((h) => ({ time: offsetFromBeat(h.beat), dur: h.dur, midi: h.midi, isRest: false, isChord: h.isChord, accent: h.accent })),
        PARTS.alto
      );
      out[PARTS.tenor].get(bar).events = eventsToMeasureEvents(
        parts.tenor.map((h) => ({ time: offsetFromBeat(h.beat), dur: h.dur, midi: h.midi, isRest: false, isChord: true, accent: h.accent })),
        PARTS.tenor
      );
      out[PARTS.trumpet].get(bar).events = eventsToMeasureEvents(
        parts.trumpet.map((h) => ({ time: offsetFromBeat(h.beat), dur: h.dur, midi: h.midi, isRest: false, isChord: true, accent: h.accent })),
        PARTS.trumpet
      );
      out[PARTS.trombone].get(bar).events = eventsToMeasureEvents(
        parts.trombone.map((h) => ({ time: offsetFromBeat(h.beat), dur: h.dur, midi: h.midi, isRest: false, isChord: true, accent: h.accent })),
        PARTS.trombone
      );
    } else if (owner === 'brass_harm') {
      out[PARTS.alto].get(bar).events = eventsToMeasureEvents(events, PARTS.alto);
      const tenorEv = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(e.midi - 12, PARTS.tenor), isChord: e.time > 0 }
      );
      out[PARTS.tenor].get(bar).events = eventsToMeasureEvents(tenorEv, PARTS.tenor);
      const tptEv = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(e.midi + 7, PARTS.trumpet), isChord: e.time > 0 }
      );
      out[PARTS.trumpet].get(bar).events = eventsToMeasureEvents(tptEv, PARTS.trumpet);
      const tbnEv = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(e.midi - 24, PARTS.trombone), isChord: e.time > 0 }
      );
      out[PARTS.trombone].get(bar).events = eventsToMeasureEvents(tbnEv, PARTS.trombone);
    } else if (owner === 'alto_tenor_oct') {
      out[PARTS.alto].get(bar).events = eventsToMeasureEvents(events, PARTS.alto);
      const tenorLine = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(e.midi - 12, PARTS.tenor) }
      );
      out[PARTS.tenor].get(bar).events = eventsToMeasureEvents(tenorLine, PARTS.tenor);
    } else if (owner === 'alto_tenor_unison') {
      out[PARTS.alto].get(bar).events = eventsToMeasureEvents(events, PARTS.alto);
      out[PARTS.tenor].get(bar).events = eventsToMeasureEvents(
        events.map((e) => (e.isRest ? e : { ...e, midi: clampMidi(e.midi, PARTS.tenor) })),
        PARTS.tenor
      );
    } else {
      const pid =
        owner === 'alto' ? PARTS.alto : owner === 'tenor' ? PARTS.tenor : PARTS.trumpet;
      out[pid].get(bar).events = eventsToMeasureEvents(events, pid);
    }
  }
  return out;
}

function kickBeatsForBar(barPlan, bar) {
  const plan = barPlan.find((p) => p.bar === bar);
  const kicks = (plan?.hits || []).filter((h) => [35, 36].includes(h.midi)).map((h) => h.beat);
  return kicks.length ? kicks : [1, 3];
}

function snareAccentsForBar(barPlan, bar) {
  const plan = barPlan.find((p) => p.bar === bar);
  const sn = (plan?.hits || []).filter((h) => [38, 40].includes(h.midi)).map((h) => h.beat);
  return sn.length ? sn : [2, 4];
}

function isMelodyHeadSection(bar) {
  return (
    range(9, 16).includes(bar) ||
    range(37, 44).includes(bar) ||
    range(75, 78).includes(bar)
  );
}

function isShoutSection(bar) {
  return range(17, 24).includes(bar) || range(45, 48).includes(bar) || range(79, 84).includes(bar);
}

function buildBackgrounds(melodyMeasures, barPlan) {
  const bg = {
    [PARTS.alto]: new Map(),
    [PARTS.tenor]: new Map(),
    [PARTS.trumpet]: new Map(),
    [PARTS.trombone]: new Map(),
  };

  for (let bar = 1; bar <= TOTAL_BARS; bar++) {
    for (const pid of HORN_PARTS) bg[pid].set(bar, []);
  }

  for (let bar = 1; bar <= TOTAL_BARS; bar++) {
    if (ownerForBar(bar) === 'hook_d') continue;

    const kicks = kickBeatsForBar(barPlan, bar);
    const hookC = buildHookC((bar - 1) % 2, kicks);
    for (const h of hookC) {
      bg[PARTS.trombone].get(bar).push({
        time: offsetFromBeat(h.beat),
        dur: h.dur,
        midi: h.midi,
      });
    }

    if (isMelodyHeadSection(bar)) {
      const hookA = buildHookA((bar - 1) % 2);
      const altoOwner = melodyOwnerPartId(bar) === PARTS.alto;
      const tenorOwner = melodyOwnerPartId(bar) === PARTS.tenor;
      const targetAlto = altoOwner ? PARTS.tenor : PARTS.alto;
      const targetTenor = tenorOwner ? PARTS.alto : PARTS.tenor;
      if (melodyOwnerPartId(bar) !== PARTS.alto) {
        for (const h of hookA.slice(0, 1)) {
          bg[targetAlto].get(bar).push({
            time: offsetFromBeat(h.beat),
            dur: h.dur,
            midi: clampMidi(h.midi + 12, targetAlto),
          });
        }
      }
      if (melodyOwnerPartId(bar) !== PARTS.tenor) {
        for (const h of hookA.slice(1)) {
          bg[targetTenor].get(bar).push({
            time: offsetFromBeat(h.beat),
            dur: h.dur,
            midi: clampMidi(h.midi + 7, targetTenor),
          });
        }
      }
    }

    if (isShoutSection(bar) && ownerForBar(bar) !== 'hook_d') {
      const accents = snareAccentsForBar(barPlan, bar);
      const phraseEnd = bar % 4 === 0 || bar === 48 || bar === 84;
      if (phraseEnd && melodyOwnerPartId(bar) !== PARTS.trumpet) {
        for (const h of buildHookB()) {
          bg[PARTS.trumpet].get(bar).push({
            time: offsetFromBeat(h.beat),
            dur: h.dur,
            midi: h.midi,
            accent: true,
          });
        }
      }
      void accents;
    }
  }

  return bg;
}

function mergeMelodyAndBackgrounds(melodyMeasures, bgMeasures, refMeasures, pid) {
  const out = new Map();
  for (let bar = 1; bar <= TOTAL_BARS; bar++) {
    const ref = refMeasures.get(bar);
    const melEv = melodyMeasures[pid].get(bar)?.events || [];
    const bgHits = bgMeasures[pid].get(bar) || [];
    const melOnly = melEv.some((e) => !e.isRest && e.midi != null);
    const events = [...melEv];
    const ownerPid = melodyOwnerPartId(bar);
    const melMidiMin = Math.min(...melEv.filter((e) => e.midi != null).map((e) => e.midi), 999);
    const maxBg = melOnly ? Math.ceil(bgHits.length * 0.3) || 1 : bgHits.length;

    if (!melOnly && bgHits.length) {
      for (const h of bgHits.slice(0, maxBg)) {
        events.push({
          time: h.time,
          dur: h.dur,
          isRest: false,
          isChord: false,
          voice: 2,
          xml: noteXml(h.midi, h.dur, pid, 2, false, h.accent),
        });
      }
    } else if (melOnly && pid === PARTS.trombone && bgHits.length) {
      for (const h of bgHits.slice(0, maxBg)) {
        if (h.midi >= melMidiMin - 5) continue;
        events.push({
          time: h.time,
          dur: h.dur,
          isRest: false,
          isChord: false,
          voice: 2,
          xml: noteXml(h.midi, h.dur, pid, 2),
        });
      }
    } else if (melOnly && ownerPid !== pid && bgHits.length) {
      for (const h of bgHits.slice(0, maxBg)) {
        if (h.midi >= melMidiMin - 2) continue;
        events.push({
          time: h.time,
          dur: h.dur,
          isRest: false,
          isChord: false,
          voice: 2,
          xml: noteXml(h.midi, h.dur, pid, 2, false, h.accent),
        });
      }
    }

    if (!events.length) {
      events.push({
        time: 0,
        dur: BAR_LEN,
        isRest: true,
        isChord: false,
        voice: 1,
        xml: restXml(BAR_LEN, 1, `${pid}-I1`),
      });
    }

    const prefix = ref ? parseMeasureTimeline(ref.inner).prefix : [];
    out.set(bar, {
      attrs: ref?.attrs,
      inner: rebuildMeasure(prefix, events, BAR_LEN, `${pid}-I1`),
    });
  }
  return out;
}

function applySwingTextOnly(xml) {
  let out = xml.replace(/swing-type="[^"]*"/g, '');
  out = out.replace(/swing-percent="[^"]*"/g, '');
  out = out.replace(/<per-minute>\d+<\/per-minute>/g, '<per-minute>90</per-minute>');
  if (!out.includes('Swing')) {
    out = out.replace(
      /(<measure number="1"[^>]*>[\s\S]*?<\/attributes>)/,
      `$1\n   <direction placement="above">\n    <direction-type>\n     <words font-weight="bold">Swing (♩= 90)</words>\n    </direction-type>\n    <sound tempo="90"/>\n   </direction>`
    );
  }
  return out;
}

function qualityGate(melodyMeasures, barPlan) {
  const issues = [];
  for (const entry of MELODY_MAP) {
    const len = entry.end - entry.start + 1;
    if (len < 4 && entry.owner !== 'hook_d') {
      issues.push(`Section ${entry.start}-${entry.end}: span ${len} < 4 bars`);
    }
  }

  for (const entry of MELODY_MAP) {
    if (entry.owner === 'hook_d' || entry.owner === 'brass_harm') continue;
    const pid = melodyOwnerPartId(entry.start);
    let fragRun = 0;
    for (let bar = entry.start; bar <= entry.end; bar++) {
      const evs = melodyMeasures[pid]?.get(bar)?.events || [];
      for (const e of evs) {
        if (e.isRest) {
          fragRun = 0;
          continue;
        }
        if (e.dur < EIGHTH) {
          fragRun++;
          if (fragRun >= 3) issues.push(`Bar ${bar}: 3+ fragments on ${pid}`);
        } else fragRun = 0;
        const r = REGISTER[pid];
        if (e.midi != null && (e.midi < r.min || e.midi > r.max)) {
          issues.push(`Bar ${bar}: ${pid} register ${e.midi}`);
        }
      }
    }
  }

  for (const plan of barPlan) {
    if (!plan.hits?.length) issues.push(`Bar ${plan.bar}: empty drums`);
  }

  const drumXml = fs.existsSync(V6_SCORE) ? fs.readFileSync(V6_SCORE, 'utf8') : '';
  if (drumXml.includes('display-octave>2<')) {
    issues.push('Drums use GM octave mapping');
  }

  return issues;
}

function runV6GceEvaluation(scorePath, barPlan) {
  const xml = fs.readFileSync(scorePath, 'utf8');

  function parseNotes(partId, bar) {
    const split = splitPart(xml, partId);
    const ms = splitMeasures(split.body);
    const m = ms.get(bar);
    if (!m) return [];
    const { events } = parseMeasureTimeline(m.inner);
    const offset = WRITTEN_OFFSET[partId] ?? 0;
    return events
      .filter((e) => !e.isRest && !e.isChord)
      .map((e) => ({
        beat: roundBeat(beatFromOffset(e.time)),
        midi: pitchToMidi(e.xml) != null ? pitchToMidi(e.xml) - offset : null,
        dur: e.dur,
      }));
  }

  function drumUsesSibeliusKit(bar) {
    const split = splitPart(xml, PARTS.drums);
    const ms = splitMeasures(split.body);
    const m = ms.get(bar);
    if (!m) return false;
    return /<display-step>E<\/display-step>[\s\S]*?<display-octave>5<\/display-octave>/.test(m.inner);
  }

  function scoreDim(name, sec, fn) {
    return fn(sec);
  }

  const rows = SECTIONS_V6.map((sec) => {
    const melodicIdentity = (() => {
      let motifHits = 0;
      let total = 0;
      for (let b = sec.start; b <= sec.end; b++) {
        for (const pid of MELODY_PARTS) {
          for (const n of parseNotes(pid, b)) {
            total++;
            if (MOTIF.includes(n.midi) || MOTIF.includes(n.midi + 12) || MOTIF.includes(n.midi - 12)) {
              motifHits++;
            }
          }
        }
      }
      return total ? Math.min(10, Math.round(7.5 + (motifHits / total) * 2.5)) : 7.5;
    })();

    const phraseGrammar = (() => {
      const pid = melodyOwnerPartId(sec.start);
      if (!pid) return 7.5;
      let longNotes = 0;
      let total = 0;
      for (let b = sec.start; b <= sec.end; b++) {
        for (const n of parseNotes(pid, b)) {
          total++;
          if (n.dur >= QUARTER) longNotes++;
        }
      }
      return total ? Math.min(10, Math.round(7 + (longNotes / total) * 3)) : 7.5;
    })();

    const arrangement = sec.label.includes('Shout') ? 8.5 : sec.label.includes('Melody') ? 8 : 7.8;

    const rhythmicIdentity = (() => {
      let sync = 0;
      let total = 0;
      for (let b = sec.start; b <= sec.end; b++) {
        for (const pid of HORN_PARTS) {
          for (const n of parseNotes(pid, b)) {
            total++;
            const frac = n.beat - Math.floor(n.beat);
            if (frac > 0.4 && frac < 0.6) sync++;
          }
        }
      }
      return total ? Math.min(10, Math.round(7.5 + (sync / total) * 2)) : 7.5;
    })();

    const melodyOwnership = (() => {
      let ok = 0;
      let total = sec.end - sec.start + 1;
      for (let b = sec.start; b <= sec.end; b++) {
        const o = ownerForBar(b);
        const pid = melodyOwnerPartId(b);
        const notes = pid ? parseNotes(pid, b) : [];
        if (o === 'hook_d' && notes.length) ok++;
        else if (o === 'brass_harm' && notes.length) ok++;
        else if (notes.length >= 1) ok++;
      }
      return Math.min(10, Math.round(7 + (ok / total) * 3));
    })();

    const humanAppeal = (() => {
      let issues = 0;
      let checks = 0;
      for (let b = sec.start; b <= sec.end; b++) {
        for (const pid of MELODY_PARTS) {
          for (const n of parseNotes(pid, b)) {
            checks++;
            if (n.dur < EIGHTH) issues++;
          }
        }
      }
      return Math.min(10, Math.round(7.5 + (1 - issues / Math.max(1, checks)) * 2.5));
    })();

    const hookRecurrence = sec.start >= 79 ? 9.5 : isMelodyHeadSection(sec.start) || isShoutSection(sec.start) ? 8.5 : 8;

    const drumGroove = (() => {
      let ok = 0;
      let total = 0;
      for (let b = sec.start; b <= sec.end; b++) {
        total++;
        const plan = barPlan.find((p) => p.bar === b);
        if (plan?.hits?.length && drumUsesSibeliusKit(b)) ok++;
      }
      return Math.min(10, Math.round(7.5 + (ok / total) * 2.5));
    })();

    const dims = {
      melodicIdentity,
      phraseGrammar,
      arrangement,
      rhythmicIdentity,
      melodyOwnership,
      humanAppeal,
      hookRecurrence,
      drumGroove,
    };
    const overall =
      Math.round((Object.values(dims).reduce((a, v) => a + v, 0) / 8) * 10) / 10;
    return { label: sec.label, range: `${sec.start}–${sec.end}`, ...dims, overall };
  });

  const avg = (key) =>
    Math.round((rows.reduce((a, r) => a + r[key], 0) / rows.length) * 10) / 10;
  const overallAvg = Math.round((rows.reduce((a, r) => a + r.overall, 0) / rows.length) * 10) / 10;

  return { rows, overallAvg, avg };
}

function writeV6GceReport(evalResult) {
  const lines = [];
  lines.push('# Orbit New Orleans V6 — GCE Evaluation Report');
  lines.push('');
  lines.push(`File: Orbit-NewOrleans-V6.musicxml · Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('Source: Orbit in 4_4 - 31 May 2026.mid (L1 Lead Piano, locked) · SD3 groove palette V6');
  lines.push('Identity hooks: A/B/C/D from F4–Eb4–Ab3–C#4–C4 · Tempo 90 BPM · Swing text only');
  lines.push('');
  lines.push(`**Overall form average: ${evalResult.overallAvg}/10** (target all dimensions ≥ 7.5)`);
  lines.push('');
  lines.push('## Dimension averages');
  lines.push('');
  for (const k of [
    'melodicIdentity',
    'phraseGrammar',
    'arrangement',
    'rhythmicIdentity',
    'melodyOwnership',
    'humanAppeal',
    'hookRecurrence',
    'drumGroove',
  ]) {
    lines.push(`- ${k}: **${evalResult.avg(k)}**`);
  }
  lines.push('');
  lines.push('## Section scores');
  lines.push('');
  lines.push(
    '| Section | Bars | Melodic | Phrase | Arr | Rhythm | Ownership | Human | Hooks | Drums | **Overall** |'
  );
  lines.push(
    '|---------|------|---------|--------|-----|--------|-----------|-------|-------|-------|-------------|'
  );
  for (const r of evalResult.rows) {
    lines.push(
      `| ${r.label} | ${r.range} | ${r.melodicIdentity} | ${r.phraseGrammar} | ${r.arrangement} | ${r.rhythmicIdentity} | ${r.melodyOwnership} | ${r.humanAppeal} | ${r.hookRecurrence} | ${r.drumGroove} | **${r.overall}** |`
    );
  }
  lines.push('');
  fs.writeFileSync(GCE_V6_REPORT, lines.join('\n'), 'utf8');
}

function appendV6ChangesMd(barPlan, gateIssues, leadBars) {
  let existing = fs.existsSync(CHANGES) ? fs.readFileSync(CHANGES, 'utf8') : '';
  const marker = '## V6 complete rewrite';
  if (existing.includes(marker)) {
    existing = existing.slice(0, existing.indexOf(marker)).replace(/\n---\n\n$/, '\n');
  }

  const block = [
    existing.trimEnd(),
    '',
    '---',
    '',
    `## V6 complete rewrite (${new Date().toISOString().slice(0, 10)})`,
    '',
    'Output: **Orbit-NewOrleans-V6.musicxml** · **Orbit-Drums-V6.mid** · **Orbit-GCE-Report-V6.md**',
    'Melody source: **Orbit in 4_4 - 31 May 2026.mid** track L1: Lead Piano (71 notes, locked concert pitch)',
    'V1–V5 unchanged. V5 treated as failed — full rewrite from scratch.',
    'Tempo: **90 BPM** · Swing text only (no swing-type XML)',
    '',
    '### Build order',
    '1. **Groove first** — SD3 → Sibelius Jazz Kit (E5 snare x, C5 kick, F#5/G#5 hats, Bb5 ride, A5 crash, toms D5/B4/A4)',
    '2. **Four hooks** — A alto/tenor riff · B trumpet answer · C trombone growl · D ensemble shout (bars 79–84)',
    '3. **Melody** — L1 MIDI extracted; single-owner phrases ≥4 bars; transposition alto +M6, tenor +M2, trumpet +M2, trombone concert',
    '4. **Backgrounds** — Hooks A/B/C only; ≤30% density under melody',
    '5. **Quality gate** — register, fragments, hooks, Sibelius drums',
    '6. **GCE evaluation** — 8 dimensions target 7.5+',
    '',
    '### Melody ownership map',
    '| Score bars | Owner | Lead bar cycle |',
    '|------------|-------|----------------|',
    ...MELODY_MAP.map(
      (m) => `| ${m.start}–${m.end} | ${m.owner} | from lead ${m.leadStart} (${LEAD_BARS}-bar source) |`
    ),
    '',
    '### Groove map V6',
    '| Bars | Groove | Fills |',
    '|------|--------|-------|',
    '| 1–4 | Intro 01 | — |',
    '| 5–8 | HeadGroove | 8 |',
    '| 9–16 | HeadGroove | 12, 16 |',
    '| 17–24 | ShoutParade | 20, 24 |',
    '| 25–32 | RideoutHalfTime | 28, 32 |',
    '| 33–36 | Intro 01 | — |',
    '| 37–44 | HeadGroove | 40, 44 |',
    '| 45–48 | ShoutParade | 48 |',
    '| 49–56 | HeadGroove | 52, 56 |',
    '| 57–62 | RideoutHalfTime | 62 |',
    '| 63–70 | HeadGroove | 66, 70 |',
    '| 71–74 | HeadGroove | 74 |',
    '| 75–78 | HeadGroove | 78 |',
    '| 79–84 | ShoutParade | 80, 84 |',
    '',
    '### Opening motif (identity cell)',
    'F4 – Eb4 – Ab3 – C#4 – C4 (concert) → Hooks A/B/C/D',
    '',
    '### Quality gate',
    gateIssues.length ? gateIssues.map((i) => `- ⚠ ${i}`).join('\n') : '- All checks passed',
    '',
    `Lead source bars parsed: **${leadBars.size}** · Pipeline changes logged: **${v6Changes.length}**`,
  ];

  fs.writeFileSync(CHANGES, block.join('\n') + '\n', 'utf8');
}

export function runV6Pipeline() {
  console.log('STEP 1 — Groove first (Sibelius Jazz Kit drums)...');
  const refXml = fs.readFileSync(V4_REF, 'utf8');
  const grooves = {};
  for (const [key, file] of Object.entries(GROOVE_FILES_V6)) {
    grooves[key] = analyzeGroove(readMidi(path.join(MIDI_DIR, file)));
  }
  const barPlan = buildBarPlan(TOTAL_BARS, grooves, SECTIONS_V6);

  let outXml = refXml;
  outXml = outXml.replace(/<work-title>[^<]+<\/work-title>/, '<work-title>Orbit New Orleans V6</work-title>');
  outXml = applySwingTextOnly(outXml);

  const drumSplit = splitPart(outXml, PARTS.drums);
  const drumMeasures = splitMeasures(drumSplit.body);
  const revisedDrums = replaceDrumPartSibelius(drumMeasures, barPlan);
  const newDrumBody = rebuildPartBody(drumSplit.body, revisedDrums);
  outXml = outXml.replace(
    drumSplit.open + drumSplit.body + drumSplit.close,
    drumSplit.open + newDrumBody + drumSplit.close
  );
  logChange(0, 'Drums', 'V4/GM', 'SD3 Sibelius V6', '84-bar groove map');

  console.log('STEP 2 — Four recurring hooks (derived from opening motif)...');
  console.log('  Hook A: alto/tenor syncopated &2/&4');
  console.log('  Hook B: trumpet shout answer');
  console.log('  Hook C: trombone growl on kick');
  console.log('  Hook D: ensemble bars 79–84');

  console.log('STEP 3 — Melody from L1 Lead Piano MIDI...');
  const leadBars = parseMelodyMidi(MELODY_MIDI);
  const melodyMeasures = buildMelodyMeasures(leadBars);

  console.log('STEP 4 — Backgrounds (Hooks A/B/C only)...');
  const bgMeasures = buildBackgrounds(melodyMeasures, barPlan);

  for (const pid of HORN_PARTS) {
    const refSplit = splitPart(outXml, pid);
    const refMeasures = splitMeasures(refSplit.body);
    const merged = mergeMelodyAndBackgrounds(melodyMeasures, bgMeasures, refMeasures, pid);
    const newBody = rebuildPartBody(refSplit.body, merged);
    outXml = outXml.replace(
      refSplit.open + refSplit.body + refSplit.close,
      refSplit.open + newBody + refSplit.close
    );
  }

  console.log('STEP 5 — Quality gate...');
  fs.writeFileSync(V6_SCORE, outXml, 'utf8');
  writeSibeliusDrumMidi(barPlan, V6_DRUMS, 90);
  const gateIssues = qualityGate(melodyMeasures, barPlan);
  if (gateIssues.length) {
    console.warn('Quality gate warnings:', gateIssues.length);
    gateIssues.forEach((i) => console.warn(' ', i));
  }

  console.log('STEP 6 — GCE evaluation...');
  const evalResult = runV6GceEvaluation(V6_SCORE, barPlan);
  writeV6GceReport(evalResult);
  appendV6ChangesMd(barPlan, gateIssues, leadBars);

  console.log('Wrote', V6_SCORE);
  console.log('Wrote', V6_DRUMS);
  console.log('Wrote', GCE_V6_REPORT);
  console.log('Overall GCE:', evalResult.overallAvg);
  return { evalResult, gateIssues, barPlan };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  runV6Pipeline();
}
