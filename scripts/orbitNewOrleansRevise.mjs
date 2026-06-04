/**
 * Orbit Big Band — New Orleans SD3 groove revision pipeline.
 * Reads source MusicXML + SD3 MIDI grooves; writes revised score, drum MIDI, change log.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const SOURCE =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-BB-Suite-V2 1.musicxml';
const MIDI_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\New Orleans Orbit Beats';
const OUT_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';

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
const BAR_LEN = 1024;
const SIXTEENTH = DIVISIONS / 4;
const EIGHTH = DIVISIONS / 2;
const QUARTER = DIVISIONS;

const PARTS = {
  alto: 'P1',
  tenor: 'P2',
  trumpet: 'P3',
  trombone: 'P4',
  piano: 'P5',
  bass: 'P6',
  drums: 'P7',
};

const BRASS_PARTS = new Set([PARTS.trumpet, PARTS.trombone]);
const SAX_PARTS = new Set([PARTS.alto, PARTS.tenor]);
const PITCH_PARTS = new Set([PARTS.alto, PARTS.tenor, PARTS.trumpet, PARTS.trombone]);

const changes = [];

function logChange(bar, partName, oldBeat, newBeat, reason) {
  changes.push({ bar, partName, oldBeat, newBeat, reason });
}

function beatFromOffset(offset) {
  return 1 + offset / DIVISIONS;
}

function offsetFromBeat(beat) {
  return Math.round((beat - 1) * DIVISIONS);
}

function roundBeat(b) {
  return Math.round(b * 4) / 4;
}

function beatStr(b) {
  const whole = Math.floor(b);
  const frac = b - whole;
  if (frac < 0.01) return `${whole}`;
  if (Math.abs(frac - 0.5) < 0.01) return `${whole}&`;
  return b.toFixed(2);
}

// ─── MIDI I/O ───────────────────────────────────────────────────────────────

function readMidi(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 0;
  const readStr = (n) => {
    const s = buf.toString('ascii', pos, pos + n);
    pos += n;
    return s;
  };
  const readU32 = () => {
    const v = buf.readUInt32BE(pos);
    pos += 4;
    return v;
  };
  const readU16 = () => {
    const v = buf.readUInt16BE(pos);
    pos += 2;
    return v;
  };
  const readVLQ = () => {
    let v = 0;
    while (true) {
      const b = buf[pos++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  };

  if (readStr(4) !== 'MThd') throw new Error(`Not MIDI: ${filePath}`);
  readU32();
  readU16();
  const nTracks = readU16();
  const division = readU16();
  const ticksPerBeat = division & 0x8000 ? 480 : division;

  const tracks = [];
  for (let t = 0; t < nTracks; t++) {
    if (readStr(4) !== 'MTrk') throw new Error('Bad track');
    const len = readU32();
    const end = pos + len;
    const events = [];
    let tick = 0;
    let status = 0;
    while (pos < end) {
      tick += readVLQ();
      let b = buf[pos++];
      if (b < 0x80) {
        pos--;
        b = status;
      } else status = b;
      const cmd = b & 0xf0;
      if (cmd === 0x90 || cmd === 0x80) {
        const note = buf[pos++];
        const vel = buf[pos++];
        if (cmd === 0x90 && vel > 0) events.push({ tick, note, vel, ch: b & 0x0f, type: 'on' });
        else events.push({ tick, note, vel: 0, ch: b & 0x0f, type: 'off' });
      } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) pos += 2;
      else if (cmd === 0xc0 || cmd === 0xd0) pos += 1;
      else if (b === 0xff) {
        const meta = buf[pos++];
        const ml = readVLQ();
        const data = buf.subarray(pos, pos + ml);
        pos += ml;
        if (meta === 0x51 && ml === 3) {
          const usq = (data[0] << 16) | (data[1] << 8) | data[2];
          events.push({ tick, type: 'tempo', usPerQuarter: usq });
        } else if (meta === 0x58 && ml >= 4) {
          events.push({ tick, type: 'timesig', num: data[0], den: 2 ** data[1] });
        }
      }
    }
    tracks.push(events);
  }

  const all = tracks.flat();
  let tempo = 120;
  let tsNum = 4;
  let tsDen = 4;
  for (const e of all) {
    if (e.type === 'tempo') tempo = Math.round(60000000 / e.usPerQuarter);
    if (e.type === 'timesig') {
      tsNum = e.num;
      tsDen = e.den;
    }
  }
  const ticksPerBar = ticksPerBeat * tsNum * (4 / tsDen);
  const maxTick = Math.max(0, ...all.filter((e) => e.tick != null).map((e) => e.tick));
  const loopBars = Math.max(1, Math.ceil(maxTick / ticksPerBar) || 1);

  return { filePath, ticksPerBeat, ticksPerBar, loopBars, tempo, tsNum, tsDen, events: all };
}

function writeMidiDrums(barEvents, outPath, tempo = 90) {
  const ticksPerBeat = 480;
  const ticksPerBar = ticksPerBeat * 4;
  const usPerQuarter = Math.round(60000000 / tempo);

  const trackEvents = [{ tick: 0, raw: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff] }];
  trackEvents.push({ tick: 0, raw: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] });

  for (const bar of barEvents) {
    const base = (bar.barNumber - 1) * ticksPerBar;
    for (const hit of bar.hits) {
      const tick = base + Math.round((hit.beat - 1) * ticksPerBeat);
      trackEvents.push({ tick, raw: [0x99, hit.midi, hit.vel] });
      trackEvents.push({ tick: tick + Math.round(ticksPerBeat * 0.25), raw: [0x89, hit.midi, 0] });
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

function analyzeGroove(midi) {
  const SNARE = new Set([38, 40]);
  const KICK = new Set([35, 36]);
  const HAT = new Set([42, 44, 46]);

  const barProfiles = [];
  for (let b = 0; b < midi.loopBars; b++) {
    const start = b * midi.ticksPerBar;
    const end = start + midi.ticksPerBar;
    const hits = midi.events.filter(
      (e) => e.type === 'on' && e.tick >= start && e.tick < end && e.vel > 0
    );
    const toBeat = (tick) => roundBeat((tick - start) / midi.ticksPerBeat + 1);
    const snare = [...new Set(hits.filter((h) => SNARE.has(h.note)).map((h) => toBeat(h.tick)))].sort(
      (a, b) => a - b
    );
    const snareStrong = [
      ...new Set(
        hits
          .filter((h) => SNARE.has(h.note) && h.vel >= 65)
          .map((h) => toBeat(h.tick))
      ),
    ].sort((a, b) => a - b);
    const kick = [...new Set(hits.filter((h) => KICK.has(h.note)).map((h) => toBeat(h.tick)))].sort(
      (a, b) => a - b
    );
    const hat = hits
      .filter((h) => HAT.has(h.note))
      .map((h) => ({ beat: toBeat(h.tick), midi: h.note, vel: h.vel }));
    barProfiles.push({ barInLoop: b + 1, snare, snareStrong, kick, hat, hitCount: hits.length });
  }

  const totalOns = midi.events.filter((e) => e.type === 'on' && e.vel > 0).length;
  const density = totalOns / midi.loopBars;
  let densityLabel = 'medium';
  if (density < 14) densityLabel = 'sparse';
  else if (density > 28) densityLabel = 'dense';

  const name = path.basename(midi.filePath).toLowerCase();
  let role = 'verse';
  if (name.includes('intro')) role = 'intro';
  else if (name.includes('pre')) role = 'pre_chorus';
  else if (name.includes('chorus')) role = 'climax';
  else if (name.includes('bridge')) role = 'bridge';
  else if (name.includes('fill')) role = 'fill';
  else if (name.includes('verse')) role = 'verse';

  return { ...midi, barProfiles, density, densityLabel, role };
}

function getBarHitsFromMidi(midi, barInLoop) {
  const idx = ((barInLoop - 1) % midi.loopBars + midi.loopBars) % midi.loopBars;
  const start = idx * midi.ticksPerBar;
  const end = start + midi.ticksPerBar;
  return midi.events
    .filter((e) => e.type === 'on' && e.tick >= start && e.tick < end && e.vel > 0)
    .map((e) => ({
      midi: e.note,
      vel: e.vel,
      beat: roundBeat((e.tick - start) / midi.ticksPerBeat + 1),
    }))
    .sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}

// ─── Groove map ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { label: 'Intro', start: 1, end: 4, groove: 'intro', fillAt: null },
  { label: 'Soli Chorus', start: 5, end: 8, groove: 'pre_chorus', fillAt: 8, fill: 'fill_01' },
  { label: 'Melody Head', start: 9, end: 12, groove: 'verse', fillAt: 12, fill: 'fill_03' },
  { label: 'Solo Section', start: 13, end: 16, groove: 'bridge', fillAt: 16, fill: 'fill_01' },
  { label: 'Shout Chorus', start: 17, end: 24, groove: 'chorus', fillAt: [20, 24], fill: 'fill_05' },
  { label: 'Rideout', start: 25, end: 32, groove: 'bridge', fillAt: 32, fill: 'fill_05' },
  { label: 'Intro', start: 33, end: 36, groove: 'intro', fillAt: 36, fill: 'fill_01' },
  { label: 'Melody Head', start: 37, end: 44, groove: 'verse', fillAt: 44, fill: 'fill_03' },
  { label: 'Shout Chorus', start: 45, end: 48, groove: 'chorus', fillAt: 48, fill: 'fill_05' },
  { label: 'Soli Chorus', start: 49, end: 56, groove: 'pre_chorus', fillAt: 56, fill: 'fill_03' },
  { label: 'Rideout', start: 57, end: 62, groove: 'bridge', fillAt: 62, fill: 'fill_01' },
  { label: 'Soli Chorus', start: 63, end: 70, groove: 'pre_chorus', fillAt: 70, fill: 'fill_03' },
  { label: 'Solo Section', start: 71, end: 74, groove: 'bridge', fillAt: 74, fill: 'fill_01' },
  { label: 'Melody Head', start: 75, end: 78, groove: 'verse', fillAt: 78, fill: 'fill_03' },
  { label: 'Shout Chorus', start: 79, end: 84, groove: 'chorus', fillAt: [80, 84], fill: 'fill_05' },
];

function buildBarPlan(totalBars, grooves, sections = SECTIONS) {
  const plan = [];
  const fillBars = new Set();
  for (const sec of sections) {
    const fills = sec.fillAt == null ? [] : Array.isArray(sec.fillAt) ? sec.fillAt : [sec.fillAt];
    for (const f of fills) fillBars.add(f);
  }

  for (let bar = 1; bar <= totalBars; bar++) {
    const sec = sections.find((s) => bar >= s.start && bar <= s.end);
    if (!sec) continue;
    const posInSec = bar - sec.start;
    const barInLoop = (posInSec % grooves[sec.groove].loopBars) + 1;
    let grooveKey = sec.groove;
    let fillKey = null;
    if (fillBars.has(bar)) {
      fillKey = sec.fill || 'fill_01';
      grooveKey = fillKey;
    }
    const midi = grooves[grooveKey];
    const hits = getBarHitsFromMidi(midi, fillKey ? 1 : barInLoop);
    const profile = midi.barProfiles[(barInLoop - 1) % midi.barProfiles.length];
    plan.push({
      bar,
      section: sec.label,
      grooveKey,
      fillKey,
      barInLoop,
      hits,
      snareStrong: profile?.snareStrong?.length ? profile.snareStrong : profile?.snare || [],
    });
  }
  return plan;
}

// ─── MusicXML parse / serialize ─────────────────────────────────────────────

function splitPart(xml, partId) {
  const re = new RegExp(`(<part id="${partId}">)([\\s\\S]*?)(</part>)`, 'm');
  const m = xml.match(re);
  if (!m) throw new Error(`Part ${partId} not found`);
  return { open: m[1], body: m[2], close: m[3] };
}

function splitMeasures(partBody) {
  const measures = new Map();
  const re = /<!--============== Part: [^=]+ Measure: (\d+) ==============-->\s*<measure number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
  let m;
  while ((m = re.exec(partBody))) {
    measures.set(parseInt(m[2], 10), { attrs: m[0].match(/<measure number="(\d+)"[^>]*/)[0], inner: m[3] });
  }
  return measures;
}

function parseMeasureTimeline(inner) {
  const prefix = [];
  const tokens = [];
  const tagRe =
    /<(note|backup|forward)([\s\S]*?)<\/\1>|<(attributes|direction|print|harmony|barline)([\s\S]*?)<\/\3>/g;
  let last = 0;
  let match;
  while ((match = tagRe.exec(inner))) {
    if (match.index > last) {
      const gap = inner.slice(last, match.index);
      if (gap.trim()) prefix.push(gap);
    }
    if (match[1]) tokens.push({ kind: match[1], xml: match[0] });
    else tokens.push({ kind: match[3], xml: match[0], isPrefix: true });
    last = match.index + match[0].length;
  }
  if (last < inner.length) {
    const tail = inner.slice(last);
    if (tail.trim()) prefix.push(tail);
  }

  for (const t of tokens) {
    if (t.isPrefix) prefix.push(t.xml);
  }

  let time = 0;
  const events = [];
  for (const t of tokens) {
    if (t.kind === 'backup') {
      const d = parseInt(t.xml.match(/<duration>(\d+)<\/duration>/)[1], 10);
      time -= d;
      continue;
    }
    if (t.kind === 'forward') {
      const d = parseInt(t.xml.match(/<duration>(\d+)<\/duration>/)[1], 10);
      time += d;
      continue;
    }
    if (t.kind === 'note') {
      const isRest = /<rest\s*\/>/.test(t.xml);
      const isChord = /<chord\s*\/>/.test(t.xml);
      const dur = parseInt(t.xml.match(/<duration>(\d+)<\/duration>/)[1], 10);
      const voice = parseInt(t.xml.match(/<voice>(\d+)<\/voice>/)?.[1] || '1', 10);
      events.push({ time, dur, xml: t.xml, isRest, isChord, voice });
      if (!isChord) time += dur;
    }
  }
  return { prefix, events };
}

function typeForDuration(dur) {
  if (dur >= 1024) return 'whole';
  if (dur >= 512) return 'half';
  if (dur >= 256) return 'quarter';
  if (dur >= 128) return 'eighth';
  if (dur >= 64) return '16th';
  return '32nd';
}

function restXml(dur, voice, instrumentId = 'P1-I1') {
  const type = typeForDuration(dur);
  let dots = '';
  let d = dur;
  if (dur === 384) {
    dots = '<dot />';
    d = 384;
  }
  return `   <note default-x="15">\n    <rest />\n    <duration>${d}</duration>\n    <instrument id="${instrumentId}" />\n    <voice>${voice}</voice>\n    <type>${type}</type>${dots ? `\n    ${dots}` : ''}\n    <staff>1</staff>\n   </note>\n`;
}

function rebuildMeasure(prefix, events, barLen, instrumentId) {
  const byVoice = new Map();
  for (const ev of events) {
    if (!byVoice.has(ev.voice)) byVoice.set(ev.voice, []);
    byVoice.get(ev.voice).push(ev);
  }
  const voices = [...byVoice.keys()].sort((a, b) => a - b);
  let out = prefix.join('');
  for (let vi = 0; vi < voices.length; vi++) {
    const v = voices[vi];
    if (vi > 0) {
      out += `   <backup>\n    <duration>${barLen}</duration>\n   </backup>\n`;
    }
    const evs = byVoice.get(v).sort((a, b) => a.time - b.time || (a.isChord ? 1 : 0));
    let t = 0;
    for (const ev of evs) {
      if (ev.time > t) {
        out += restXml(ev.time - t, v, instrumentId);
        t = ev.time;
      }
      out += ev.xml + '\n';
      if (!ev.isChord) t += ev.dur;
    }
    if (t < barLen) out += restXml(barLen - t, v, instrumentId);
  }
  return out;
}

function instrumentIdForPart(partId) {
  return `${partId}-I1`;
}

function partDisplayName(partId) {
  const map = {
    P1: 'Alto Saxophone',
    P2: 'Tenor Saxophone',
    P3: 'Trumpet',
    P4: 'Trombone',
    P5: 'Piano',
    P6: 'Double Bass',
    P7: 'Drum Set (Jazz)',
  };
  return map[partId] || partId;
}

function repositionBrassOnset(onset, snareBeats, bar, partName) {
  if (!snareBeats.length) return onset;
  const beat = beatFromOffset(onset);
  let nearest = snareBeats[0];
  let minDist = Math.abs(beat - nearest);
  for (const s of snareBeats) {
    const d = Math.abs(beat - s);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }
  if (minDist <= 0.25) return onset;
  const onSnare = offsetFromBeat(nearest);
  const afterSnare = offsetFromBeat(nearest + 0.5);
  const target =
    Math.abs(beat - nearest) <= Math.abs(beat - (nearest + 0.5)) ? onSnare : afterSnare;
  if (target !== onset) {
    logChange(bar, partName, beatStr(beat), beatStr(beatFromOffset(target)), 'brass punch repositioned');
  }
  return target;
}

function adjustSaxOnset(onset, bar, partName) {
  const beat = beatFromOffset(onset);
  const whole = Math.round(beat);
  const frac = Math.abs(beat - Math.floor(beat)) < 0.05 ? 0 : beat - Math.floor(beat);
  if (frac > 0.05) return onset;
  if (whole !== 1 && whole !== 3) return onset;

  const candidates =
    whole === 1
      ? [1.5, 2.5]
      : [2.5, 3.5, 4.5].filter((c) => c >= 1 && c <= 4);
  let best = onset;
  let bestDist = QUARTER + 1;
  for (const c of candidates) {
    const o = offsetFromBeat(c);
    const dist = Math.abs(o - onset);
    if (dist <= QUARTER && dist < bestDist) {
      bestDist = dist;
      best = o;
    }
  }
  if (best !== onset) {
    logChange(
      bar,
      partName,
      beatStr(beat),
      beatStr(beatFromOffset(best)),
      'sax anticipation (second-line clave)'
    );
  }
  return best;
}

function transformPartMeasures(measures, partId, barPlan) {
  const inst = instrumentIdForPart(partId);
  const name = partDisplayName(partId);
  const out = new Map();

  for (const [barNum, meas] of measures) {
    const plan = barPlan.find((p) => p.bar === barNum);
    const { prefix, events } = parseMeasureTimeline(meas.inner);
    const transformed = events.map((ev) => {
      if (ev.isRest || ev.isChord) return ev;
      let t = ev.time;
      if (BRASS_PARTS.has(partId)) {
        t = repositionBrassOnset(t, plan?.snareStrong || [], barNum, name);
      } else if (SAX_PARTS.has(partId)) {
        t = adjustSaxOnset(t, barNum, name);
      }
      return { ...ev, time: t };
    });
    out.set(barNum, { attrs: meas.attrs, inner: rebuildMeasure(prefix, transformed, BAR_LEN, inst) });
  }
  return out;
}

function drumGlyph(midi) {
  switch (midi) {
    case 36:
    case 35:
      return { step: 'F', octave: 4, stem: 'down', notehead: '', inst: 'P7-I1' };
    case 38:
    case 40:
      return { step: 'D', octave: 4, stem: 'up', notehead: '', inst: 'P7-I1' };
    case 42:
      return {
        step: 'F',
        octave: 5,
        stem: 'up',
        notehead: '<notehead>x</notehead>',
        acc: '<accidental>sharp</accidental>',
        inst: 'P7-I1',
      };
    case 44:
      return {
        step: 'G',
        octave: 5,
        stem: 'up',
        notehead: '<notehead>x</notehead>',
        acc: '<accidental>sharp</accidental>',
        inst: 'P7-I1',
      };
    case 46:
      return { step: 'A', octave: 5, stem: 'up', notehead: '<notehead>x</notehead>', inst: 'P7-I1' };
    case 49:
      return { step: 'C', octave: 5, stem: 'up', notehead: '<notehead>x</notehead>', inst: 'P7-I1' };
    default:
      return { step: 'B', octave: 4, stem: 'up', notehead: '', inst: 'P7-I1' };
  }
}

function durationToType(dur) {
  const map = [
    [1024, 'whole'],
    [512, 'half'],
    [256, 'quarter'],
    [128, 'eighth'],
    [64, '16th'],
    [32, '32nd'],
  ];
  for (const [d, t] of map) if (dur === d) return t;
  return typeForDuration(dur);
}

function buildDrumMeasureInner(hits, keepPrefix) {
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
      const g = drumGlyph(h.midi);
      const dur = SIXTEENTH;
      voice1.push({ dur, rest: false, grp, g, h, chord: i > 0 });
    });
    time += SIXTEENTH;
  }
  if (time < BAR_LEN) voice1.push({ dur: BAR_LEN - time, rest: true });

  for (const item of voice1) {
    if (item.rest) {
      xml += restXml(item.dur, 1, 'P7-I1');
    } else {
      const g = item.g;
      const chord = item.chord ? '   <chord />\n' : '';
      const acc = g.acc ? `    ${g.acc}\n` : '';
      const nh = g.notehead ? `    ${g.notehead}\n` : '';
      xml += `   <note color="#000000" default-x="118" default-y="-10">\n${chord}    <unpitched>\n     <display-step>${g.step}</display-step>\n     <display-octave>${g.octave}</display-octave>\n    </unpitched>\n    <duration>${item.dur}</duration>\n    <instrument id="${g.inst}" />\n    <voice>1</voice>\n    <type>${durationToType(item.dur)}</type>\n${acc}    <stem>${g.stem}</stem>\n${nh}    <staff>1</staff>\n   </note>\n`;
    }
  }
  xml += `   <backup>\n    <duration>${BAR_LEN}</duration>\n   </backup>\n`;
  xml += restXml(BAR_LEN, 2, 'P7-I1');
  return xml;
}

function replaceDrumPart(measures, barPlan) {
  const out = new Map();
  for (const [barNum, meas] of measures) {
    const plan = barPlan.find((p) => p.bar === barNum);
    const { prefix } = parseMeasureTimeline(meas.inner);
    const keepPrefix = prefix.filter((p) => /<(attributes|print|direction|barline)/.test(p)).join('');
    out.set(barNum, {
      attrs: meas.attrs,
      inner: buildDrumMeasureInner(plan?.hits || [], barNum === 1 ? keepPrefix : keepPrefix.replace(/<attributes[\s\S]*?<\/attributes>/, '')),
    });
    if (plan?.hits?.length) {
      logChange(barNum, 'Drum Set (Jazz)', 'written swing', `SD3 ${plan.grooveKey}`, 'drum replaced');
    }
  }
  return out;
}

function rebuildPartBody(originalBody, newMeasures) {
  return originalBody.replace(
    /<!--============== Part: [^=]+ Measure: (\d+) ==============-->\s*<measure number="(\d+)"[^>]*>[\s\S]*?<\/measure>/g,
    (full, _c, num) => {
      const n = parseInt(num, 10);
      const m = newMeasures.get(n);
      if (!m) return full;
      return `  <!--============== Part: Px, Measure: ${n} ==============-->\n  ${m.attrs}>\n${m.inner}  </measure>`;
    }
  );
}

function extractSectionsFromP1(partBody) {
  const measures = splitMeasures(partBody);
  const markers = [];
  for (const [n, m] of measures) {
    const lab = m.inner.match(/enclosure="rectangle"[^>]*>([^<]+)<\/words>/);
    if (lab) markers.push({ bar: n, label: lab[1].trim() });
  }
  const sections = [];
  for (let i = 0; i < markers.length; i++) {
    sections.push({
      label: markers[i].label,
      startBar: markers[i].bar,
      endBar: i + 1 < markers.length ? markers[i + 1].bar - 1 : Math.max(...measures.keys()),
    });
  }
  return sections;
}

function parseHarmonyBlock(block) {
  const step = block.match(/<root-step>([^<]+)<\/root-step>/);
  if (!step) return null;
  let root = step[1];
  const alter = block.match(/<root-alter>(-?\d+)<\/root-alter>/);
  if (alter) {
    const a = parseInt(alter[1], 10);
    if (a === -1) root += 'b';
    else if (a === 1) root += '#';
  }
  const kindText = block.match(/<kind text="([^"]+)"/);
  return kindText ? `${root}${kindText[1]}` : root;
}

function chordsForSection(pianoMeasures, start, end) {
  const seq = [];
  for (let b = start; b <= end; b++) {
    const m = pianoMeasures.get(b);
    if (!m) continue;
    const blocks = [...m.inner.matchAll(/<harmony[\s\S]*?<\/harmony>/g)];
    for (const bl of blocks) {
      const sym = parseHarmonyBlock(bl[0]);
      if (sym) seq.push({ bar: b, sym });
    }
  }
  const compressed = [];
  for (const it of seq) {
    const prev = compressed[compressed.length - 1];
    if (prev && prev.sym === it.sym) prev.endBar = it.bar;
    else compressed.push({ startBar: it.bar, endBar: it.bar, sym: it.sym });
  }
  return compressed;
}

function writeChangesMd(outPath, scoreMeta, grooveAnalysis, barPlan, sections) {
  const lines = [];
  lines.push('# Orbit — New Orleans Revision Change Log');
  lines.push('');
  lines.push(`Source: Orbit-BB-Suite-V2 1.musicxml · Output: Orbit-NewOrleans-V1.musicxml · ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('## Score summary');
  lines.push(`- Tempo: **${scoreMeta.tempo} BPM** · Total bars: **${scoreMeta.totalBars}**`);
  lines.push('- Sections:');
  for (const s of sections) {
    lines.push(`  - **${s.label}** bars ${s.startBar}–${s.endBar}`);
  }
  lines.push('');
  lines.push('## MIDI groove analysis');
  for (const g of grooveAnalysis) {
    const snareAll = [...new Set(g.barProfiles.flatMap((b) => b.snareStrong))].sort((a, b) => a - b);
    const kickAll = [...new Set(g.barProfiles.flatMap((b) => b.kick))].sort((a, b) => a - b);
    lines.push(`### ${path.basename(g.filePath)}`);
    lines.push(`- Loop: ${g.loopBars} bars · ${g.tsNum}/${g.tsDen} · ${g.tempo} BPM · density: ${g.densityLabel}`);
    lines.push(`- Role: **${g.role}**`);
    lines.push(`- Snare accents (strong): ${snareAll.map(beatStr).join(', ') || 'none'}`);
    lines.push(`- Kick: ${kickAll.map(beatStr).join(', ') || 'none'}`);
    lines.push('');
  }
  lines.push('## Groove map (bar assignments)');
  for (const p of barPlan) {
    lines.push(`- Bar ${p.bar} (${p.section}): **${p.grooveKey}** loop bar ${p.barInLoop}${p.fillKey ? ' [FILL]' : ''}`);
  }
  lines.push('');
  lines.push('## Note changes');
  lines.push('| Bar | Part | Original beat | New beat | Reason |');
  lines.push('|-----|------|---------------|----------|--------|');
  for (const c of changes) {
    lines.push(`| ${c.bar} | ${c.partName} | ${c.oldBeat} | ${c.newBeat} | ${c.reason} |`);
  }
  lines.push('');
  lines.push(`**Total changes logged:** ${changes.length}`);
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

export {
  writeMidiDrums,
  readMidi,
  analyzeGroove,
  buildBarPlan,
  splitPart,
  splitMeasures,
  parseMeasureTimeline,
  rebuildMeasure,
  restXml,
  rebuildPartBody,
  replaceDrumPart,
  instrumentIdForPart,
  partDisplayName,
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
};

export function runOrbitRevision(options = {}) {
  const source = options.source ?? SOURCE;
  const grooveFiles = options.grooveFiles ?? GROOVE_FILES;
  const sectionMap = options.sections ?? SECTIONS;
  const tempoBpm = options.tempoBpm ?? 90;

  changes.length = 0;

  const xml = fs.readFileSync(source, 'utf8');
  const grooves = {};
  for (const [key, file] of Object.entries(grooveFiles)) {
    grooves[key] = analyzeGroove(readMidi(path.join(MIDI_DIR, file)));
  }

  const p1Split = splitPart(xml, PARTS.alto);
  const sectionList = extractSectionsFromP1(p1Split.body);
  const totalBars = Math.max(...splitMeasures(p1Split.body).keys());
  const barPlan = buildBarPlan(totalBars, grooves, sectionMap);

  let outXml = xml;
  for (const partId of [PARTS.alto, PARTS.tenor, PARTS.trumpet, PARTS.trombone]) {
    const split = splitPart(outXml, partId);
    const measures = splitMeasures(split.body);
    const revised = transformPartMeasures(measures, partId, barPlan);
    const newBody = rebuildPartBody(split.body, revised);
    outXml = outXml.replace(split.open + split.body + split.close, split.open + newBody + split.close);
  }

  const drumSplit = splitPart(outXml, PARTS.drums);
  const drumMeasures = splitMeasures(drumSplit.body);
  const revisedDrums = replaceDrumPart(drumMeasures, barPlan);
  const newDrumBody = rebuildPartBody(drumSplit.body, revisedDrums);
  outXml = outXml.replace(
    drumSplit.open + drumSplit.body + drumSplit.close,
    drumSplit.open + newDrumBody + drumSplit.close
  );

  if (tempoBpm) {
    outXml = outXml.replace(/<per-minute>\d+<\/per-minute>/g, `<per-minute>${tempoBpm}</per-minute>`);
  }

  return {
    outXml,
    barPlan,
    grooves,
    changes: [...changes],
    sections: sectionList,
    totalBars,
    tempo: tempoBpm,
  };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const { outXml, barPlan, grooves, changes: revisionChanges, sections, totalBars, tempo } =
  runOrbitRevision({ tempoBpm: 90 });

const outScore = path.join(OUT_DIR, 'Orbit-NewOrleans-V1.musicxml');
fs.writeFileSync(outScore, outXml, 'utf8');

const drumMidiBars = barPlan.map((p) => ({ barNumber: p.bar, hits: p.hits }));
writeMidiDrums(drumMidiBars, path.join(OUT_DIR, 'Orbit-Drums-NewOrleans.mid'), 90);

const grooveAnalysis = Object.values(grooves);
writeChangesMd(path.join(OUT_DIR, 'Orbit-Changes.md'), { tempo, totalBars }, grooveAnalysis, barPlan, sections);

console.log('Wrote:', outScore);
console.log('Wrote:', path.join(OUT_DIR, 'Orbit-Drums-NewOrleans.mid'));
console.log('Wrote:', path.join(OUT_DIR, 'Orbit-Changes.md'));
console.log('Sections:', sections.length, 'Changes:', revisionChanges.length, 'Bars:', totalBars);
}
