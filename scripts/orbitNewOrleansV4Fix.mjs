/**
 * Orbit New Orleans V4 — targeted GCE fixes for sections still below 6.0
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { runGceEvaluation } from './orbitGceEval.mjs';
import { GROOVE_FILES_V3, SECTIONS_V3, MIDI_DIR } from './orbitGrooveConfig.mjs';

const REV_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const V3 = path.join(REV_DIR, 'Orbit-NewOrleans-V3.musicxml');
const V4 = path.join(REV_DIR, 'Orbit-NewOrleans-V4.musicxml');
const CHANGES = path.join(REV_DIR, 'Orbit-Changes.md');
const GCE_V3_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V3.md');
const GCE_V4_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V4.md');

const GCE_CONFIG = {
  grooveFiles: GROOVE_FILES_V3,
  sections: SECTIONS_V3,
  midiDir: MIDI_DIR,
};

const DIVISIONS = 256;
const BAR_LEN = 1024;
const QUARTER = 256;
const EIGHTH = 128;

const PARTS = {
  alto: 'P1',
  tenor: 'P2',
  trumpet: 'P3',
  trombone: 'P4',
};

const PART_NAMES = {
  P1: 'Alto Saxophone',
  P2: 'Tenor Saxophone',
  P3: 'Trumpet',
  P4: 'Trombone',
};

const v4Changes = [];
let activeLog = v4Changes;

function logChange(bar, partName, oldBeat, newBeat, reason) {
  activeLog.push({ bar, partName, oldBeat, newBeat, reason });
}

function range(a, b) {
  return [...Array(b - a + 1)].map((_, i) => a + i);
}

function beatFromOffset(o) {
  return 1 + o / DIVISIONS;
}
function offsetFromBeat(b) {
  return Math.round((b - 1) * DIVISIONS);
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
function onBeat(b, target) {
  return Math.abs(b - target) < 0.06;
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

function midiToPitch(midi) {
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

function setPitchFromMidi(xml, midi) {
  const { step, alter, octave } = midiToPitch(midi);
  let out = xml.replace(/<step>[^<]+<\/step>/, `<step>${step}</step>`);
  out = out.replace(/<octave>\d+<\/octave>/, `<octave>${octave}</octave>`);
  if (alter === 0) out = out.replace(/\s*<alter>[^<]+<\/alter>/, '');
  else if (/<alter>/.test(out)) out = out.replace(/<alter>[^<]+<\/alter>/, `<alter>${alter}</alter>`);
  else out = out.replace(/<step>[^<]+<\/step>/, `<step>${step}</step>\n     <alter>${alter}</alter>`);
  return out;
}

function shiftPitchBySemitones(xml, semitones) {
  const m = pitchToMidi(xml);
  if (m == null) return xml;
  return setPitchFromMidi(xml, m + semitones);
}

function intervalBetween(a, b) {
  return Math.abs(a - b) % 12;
}

function splitPart(xml, partId) {
  const re = new RegExp(`(<part id="${partId}">)([\\s\\S]*?)(</part>)`, 'm');
  const m = xml.match(re);
  if (!m) throw new Error(`Part ${partId} not found`);
  return { open: m[1], body: m[2], close: m[3] };
}

function splitMeasures(partBody) {
  const measures = new Map();
  const re =
    /<!--============== Part: [^=]+ Measure: (\d+) ==============-->\s*<measure number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
  let m;
  while ((m = re.exec(partBody))) {
    measures.set(parseInt(m[2], 10), {
      attrs: m[0].match(/<measure number="(\d+)"[^>]*/)[0],
      inner: m[3],
    });
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
      time -= parseInt(t.xml.match(/<duration>(\d+)<\/duration>/)[1], 10);
      continue;
    }
    if (t.kind === 'forward') {
      time += parseInt(t.xml.match(/<duration>(\d+)<\/duration>/)[1], 10);
      continue;
    }
    if (t.kind === 'note') {
      const isRest = /<rest\s*\/>/.test(t.xml);
      const isChord = /<chord\s*\/>/.test(t.xml);
      const dur = parseInt(t.xml.match(/<duration>(\d+)<\/duration>/)[1], 10);
      const voice = parseInt(t.xml.match(/<voice>(\d+)<\/voice>/)?.[1] || '1', 10);
      const ev = { time, dur, xml: t.xml, isRest, isChord, voice };
      if (!isRest) {
        ev.midi = pitchToMidi(t.xml);
        ev.beat = roundBeat(beatFromOffset(time));
      }
      events.push(ev);
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

function setNoteDuration(xml, dur) {
  return xml
    .replace(/<duration>\d+<\/duration>/, `<duration>${dur}</duration>`)
    .replace(/<type>[^<]+<\/type>/, `<type>${typeForDuration(dur)}</type>`);
}

function addTieStart(xml) {
  if (/<tie type="start"/.test(xml)) return xml;
  return xml.replace(/<type>/, `<tie type="start"/>\n    <type>`);
}

function addTieStop(xml) {
  if (/<tie type="stop"/.test(xml)) return xml;
  return xml.replace(/<type>/, `<tie type="stop"/>\n    <type>`);
}

function restXml(dur, voice, instrumentId) {
  return `   <note default-x="15">\n    <rest />\n    <duration>${dur}</duration>\n    <instrument id="${instrumentId}" />\n    <voice>${voice}</voice>\n    <type>${typeForDuration(dur)}</type>\n    <staff>1</staff>\n   </note>\n`;
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
    if (vi > 0) out += `   <backup>\n    <duration>${barLen}</duration>\n   </backup>\n`;
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

function rebuildPartBody(originalBody, newMeasures) {
  return originalBody.replace(
    /<!--============== Part: [^=]+ Measure: (\d+) ==============-->\s*<measure number="(\d+)"[^>]*>[\s\S]*?<\/measure>/g,
    (_full, _c, num) => {
      const n = parseInt(num, 10);
      const m = newMeasures.get(n);
      if (!m) return _full;
      return `  <!--============== Part: Px, Measure: ${n} ==============-->\n  ${m.attrs}>\n${m.inner}  </measure>`;
    }
  );
}

function refreshEvents(events) {
  for (const e of events) {
    if (e.isRest) continue;
    e.midi = pitchToMidi(e.xml);
    e.beat = roundBeat(beatFromOffset(e.time));
  }
}

function saveMeasure(measures, bar, prefix, events, partId) {
  measures.set(bar, {
    attrs: measures.get(bar).attrs,
    inner: rebuildMeasure(prefix, events, BAR_LEN, `${partId}-I1`),
  });
}

function isWeakBeat(b) {
  return !(onBeat(b, 2.5) || onBeat(b, 4) || onBeat(b, 4.5));
}

function enrichPitched(events) {
  return events.filter((e) => !e.isRest && !e.isChord && e.midi != null);
}

// ─── Melody Head fixes ───────────────────────────────────────────────────────

function moveBrassBeat1ToPrevBar45(measuresTpt, measuresTbn, bars) {
  for (const bar of bars) {
    if (bar <= 1) continue;
    const prevBar = bar - 1;
    for (const [measures, partId, partName] of [
      [measuresTpt, PARTS.trumpet, 'Trumpet'],
      [measuresTbn, PARTS.trombone, 'Trombone'],
    ]) {
      const currM = measures.get(bar);
      const prevM = measures.get(prevBar);
      if (!currM || !prevM) continue;

      const curr = parseMeasureTimeline(currM.inner);
      const prev = parseMeasureTimeline(prevM.inner);
      refreshEvents(curr.events);
      refreshEvents(prev.events);

      const toMove = curr.events.filter(
        (e) => !e.isRest && !e.isChord && onBeat(e.beat, 1)
      );
      if (!toMove.length) continue;

      const kept = curr.events.filter((e) => !toMove.includes(e));
      const targetTime = offsetFromBeat(4.5);

      for (const ev of toMove) {
        const old = beatStr(ev.beat);
        const moved = {
          ...ev,
          time: targetTime,
          beat: 4.5,
          xml: ev.xml,
        };
        prev.events.push(moved);
        logChange(
          bar,
          partName,
          old,
          `${prevBar}@4&`,
          'melody head brass beat 1 → & of 4 previous bar'
        );
      }

      saveMeasure(measures, bar, curr.prefix, kept, partId);
      saveMeasure(measures, prevBar, prev.prefix, prev.events, partId);
    }
  }
}

function moveSaxBeat3ToBeat2And(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    let changed = false;
    for (const ev of events) {
      if (ev.isRest || ev.isChord) continue;
      ev.beat = roundBeat(beatFromOffset(ev.time));
      if (onBeat(ev.beat, 3)) {
        const old = beatStr(ev.beat);
        ev.time = offsetFromBeat(2.5);
        ev.beat = 2.5;
        logChange(bar, partName, old, '2&', 'melody head sax beat 3 → & of 2');
        changed = true;
      }
    }
    if (changed) saveMeasure(measures, bar, prefix, events, partId);
  }
}

function thinMelodyHeadDensity(allMeasures, bars) {
  const partOrder = [
    { id: PARTS.trombone, name: 'Trombone' },
    { id: PARTS.tenor, name: 'Tenor Saxophone' },
    { id: PARTS.alto, name: 'Alto Saxophone' },
  ];

  for (const bar of bars) {
    const attacks = [];
    for (const [pid, pname] of [
      [PARTS.alto, 'Alto Saxophone'],
      [PARTS.tenor, 'Tenor Saxophone'],
      [PARTS.trumpet, 'Trumpet'],
      [PARTS.trombone, 'Trombone'],
    ]) {
      const m = allMeasures[pid].get(bar);
      if (!m) continue;
      const { events } = parseMeasureTimeline(m.inner);
      for (const ev of events) {
        if (ev.isRest || ev.isChord) continue;
        ev.beat = roundBeat(beatFromOffset(ev.time));
        attacks.push({ ev, pid, pname, beat: ev.beat, time: ev.time });
      }
    }

    const byBeat = new Map();
    for (const a of attacks) {
      const key = Math.round(a.beat * 4);
      if (!byBeat.has(key)) byBeat.set(key, []);
      byBeat.get(key).push(a);
    }

    const toRemove = new Set();
    for (const [, group] of byBeat) {
      if (group.length < 3) continue;
      const beat = group[0].beat;
      if (!isWeakBeat(beat)) continue;
      for (const pri of partOrder) {
        if (group.length < 3) break;
        const victim = group.find((g) => g.pid === pri.id && !toRemove.has(g.ev));
        if (victim) {
          toRemove.add(victim.ev);
          group.splice(group.indexOf(victim), 1);
          logChange(
            bar,
            victim.pname,
            beatStr(beat),
            '—',
            'melody head density — remove weak-beat cluster hit'
          );
        }
      }
    }

    if (!toRemove.size) continue;
    for (const pid of [PARTS.alto, PARTS.tenor, PARTS.trumpet, PARTS.trombone]) {
      const m = allMeasures[pid].get(bar);
      if (!m) continue;
      const { prefix, events } = parseMeasureTimeline(m.inner);
      const kept = events.filter((e) => !toRemove.has(e));
      if (kept.length !== events.length) saveMeasure(allMeasures[pid], bar, prefix, kept, pid);
    }
  }
}

// ─── Rideout fixes ───────────────────────────────────────────────────────────

function findParallelTromboneEvents(tptEvents, tbnEvents) {
  const shift = new Set();
  const tp = enrichPitched(tptEvents);
  const tb = enrichPitched(tbnEvents);

  for (const a of tp) {
    for (const b of tb) {
      if (Math.abs(a.beat - b.beat) <= 0.06 && intervalBetween(a.midi, b.midi) === 7) {
        shift.add(b);
      }
    }
  }

  const st = [...tp].sort((x, y) => x.beat - y.beat);
  const sb = [...tb].sort((x, y) => x.beat - y.beat);
  for (let i = 1; i < st.length && i < sb.length; i++) {
    const i0 = intervalBetween(st[i - 1].midi, sb[i - 1].midi);
    const i1 = intervalBetween(st[i].midi, sb[i].midi);
    if (i0 === 7 && i1 === 7) {
      shift.add(sb[i - 1]);
      shift.add(sb[i]);
    }
  }
  return shift;
}

function fixRideoutParallelsUpThird(measuresTpt, measuresTbn, bars) {
  for (const bar of bars) {
    const mt = measuresTpt.get(bar);
    const mb = measuresTbn.get(bar);
    if (!mt || !mb) continue;
    const pt = parseMeasureTimeline(mt.inner);
    const pb = parseMeasureTimeline(mb.inner);
    refreshEvents(pt.events);
    refreshEvents(pb.events);

    const shift = findParallelTromboneEvents(pt.events, pb.events);
    if (!shift.size) continue;

    pb.events = pb.events.map((ev) => {
      if (!shift.has(ev)) return ev;
      const oldMidi = ev.midi;
      const newXml = shiftPitchBySemitones(ev.xml, 4);
      const newMidi = pitchToMidi(newXml);
      logChange(
        bar,
        'Trombone',
        beatStr(ev.beat),
        beatStr(ev.beat),
        `rideout parallel 5th — trombone up M3 (${oldMidi}→${newMidi})`
      );
      return { ...ev, xml: newXml, midi: newMidi };
    });

    saveMeasure(measuresTbn, bar, pb.prefix, pb.events, PARTS.trombone);
  }
}

function moveRideoutBrassBeat3ToBeat3And(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    let changed = false;
    for (const ev of events) {
      if (ev.isRest || ev.isChord) continue;
      ev.beat = roundBeat(beatFromOffset(ev.time));
      if (onBeat(ev.beat, 3)) {
        const old = beatStr(ev.beat);
        ev.time = offsetFromBeat(3.5);
        ev.beat = 3.5;
        logChange(bar, partName, old, '3&', 'rideout brass beat 3 → & of 3 (lay back)');
        changed = true;
      }
    }
    if (changed) saveMeasure(measures, bar, prefix, events, partId);
  }
}

function tieRideoutSaxBeat4Short(measures, bars, partId, partName) {
  for (const bar of bars) {
    const nextBar = bar + 1;
    const m = measures.get(bar);
    const mn = measures.get(nextBar);
    if (!m || !mn) continue;

    const curr = parseMeasureTimeline(m.inner);
    const next = parseMeasureTimeline(mn.inner);
    refreshEvents(curr.events);
    refreshEvents(next.events);

    const pitched = enrichPitched(curr.events).sort((a, b) => a.time - b.time);
    const shortOn4 = pitched.filter((e) => onBeat(e.beat, 4) && e.dur < QUARTER);
    if (!shortOn4.length) continue;

    let changed = false;
    for (const ev of shortOn4) {
      const nextNotes = enrichPitched(next.events).sort((a, b) => a.time - b.time);
      const partner = nextNotes.find((n) => n.time <= EIGHTH && n.midi === ev.midi);
      const tail = BAR_LEN - ev.time;
      if (partner) {
        ev.dur = tail + partner.dur;
        ev.xml = addTieStart(setNoteDuration(ev.xml, ev.dur));
        partner.xml = addTieStop(partner.xml);
        next.events = next.events.filter((e) => e !== partner);
        logChange(bar, partName, '4 short', `${bar + 1} tied`, 'rideout sax beat 4 short → tie into next bar');
      } else {
        ev.dur = tail + Math.min(QUARTER, EIGHTH);
        ev.xml = addTieStart(setNoteDuration(ev.xml, ev.dur));
        const cont = {
          time: 0,
          dur: Math.min(QUARTER, EIGHTH),
          isRest: false,
          isChord: false,
          voice: ev.voice,
          midi: ev.midi,
          beat: 1,
          xml: addTieStop(
            ev.xml
              .replace(/<duration>\d+<\/duration>/, `<duration>${Math.min(QUARTER, EIGHTH)}</duration>`)
              .replace(/<type>[^<]+<\/type>/, `<type>${typeForDuration(Math.min(QUARTER, EIGHTH))}</type>`)
          ),
        };
        next.events.push(cont);
        logChange(bar, partName, '4 short', `${bar + 1} tied`, 'rideout sax beat 4 short → tie into next bar');
      }
      changed = true;
    }

    if (changed) {
      saveMeasure(measures, bar, curr.prefix, curr.events, partId);
      saveMeasure(measures, nextBar, next.prefix, next.events, partId);
    }
  }
}

// ─── Soli Chorus A fixes ─────────────────────────────────────────────────────

function muteTromboneDuplicatePc(measuresTpt, measuresTbn, bars) {
  for (const bar of bars) {
    const mt = measuresTpt.get(bar);
    const mb = measuresTbn.get(bar);
    if (!mt || !mb) continue;
    const pt = parseMeasureTimeline(mt.inner);
    const pb = parseMeasureTimeline(mb.inner);
    refreshEvents(pt.events);
    refreshEvents(pb.events);

    const tptPcs = new Map();
    for (const e of enrichPitched(pt.events)) {
      const pc = e.midi % 12;
      if (!tptPcs.has(pc)) tptPcs.set(pc, []);
      tptPcs.get(pc).push(e.beat);
    }

    const remove = new Set();
    for (const e of enrichPitched(pb.events)) {
      const pc = e.midi % 12;
      const tBeats = tptPcs.get(pc);
      if (!tBeats) continue;
      if (tBeats.some((b) => Math.abs(b - e.beat) <= 0.12)) {
        remove.add(e);
        logChange(bar, 'Trombone', beatStr(e.beat), '—', 'soli A — mute trombone duplicate trumpet pitch class');
      }
    }

    if (!remove.size) continue;
    const kept = pb.events.filter((e) => !remove.has(e));
    saveMeasure(measuresTbn, bar, pb.prefix, kept, PARTS.trombone);
  }
}

function moveSaxBeat1ToPrevBar45(measures, bars, partId, partName) {
  for (const bar of bars) {
    if (bar <= 1) continue;
    const prevBar = bar - 1;
    const currM = measures.get(bar);
    const prevM = measures.get(prevBar);
    if (!currM || !prevM) continue;

    const curr = parseMeasureTimeline(currM.inner);
    const prev = parseMeasureTimeline(prevM.inner);
    refreshEvents(curr.events);
    refreshEvents(prev.events);

    const toMove = curr.events.filter(
      (e) => !e.isRest && !e.isChord && onBeat(e.beat, 1)
    );
    if (!toMove.length) continue;

    const kept = curr.events.filter((e) => !toMove.includes(e));
    const targetTime = offsetFromBeat(4.5);

    for (const ev of toMove) {
      prev.events.push({
        ...ev,
        time: targetTime,
        beat: 4.5,
      });
      logChange(
        bar,
        partName,
        '1',
        `${prevBar}@4&`,
        'soli A sax beat 1 → & of 4 previous bar'
      );
    }

    saveMeasure(measures, bar, curr.prefix, kept, partId);
    saveMeasure(measures, prevBar, prev.prefix, prev.events, partId);
  }
}

function classifyBrassHit(beat, snareBeats) {
  if (!snareBeats.length) return { ok: true };
  let nearest = snareBeats[0];
  let dist = Math.abs(beat - nearest);
  for (const s of snareBeats) {
    const d = Math.abs(beat - s);
    if (d < dist) {
      dist = d;
      nearest = s;
    }
  }
  if (dist <= 0.06) return { ok: true, target: nearest };
  if (Math.abs(beat - (nearest + 0.5)) <= 0.06) return { ok: true, target: nearest + 0.5 };
  const weak = [3, 3.5, 1.5].some((w) => Math.abs(beat - w) < 0.06);
  if (weak) return { ok: false, target: 4 };
  if (dist <= 0.25) return { ok: true, target: nearest };
  return { ok: false, target: Math.abs(beat - nearest) <= Math.abs(beat - (nearest + 0.5)) ? nearest : nearest + 0.5 };
}

function buildSnareBarPlan(xml) {
  const grooves = {};
  for (const [k, f] of Object.entries(GROOVE_FILES_V3)) {
    grooves[k] = readMidiGroove(path.join(MIDI_DIR, f));
  }
  const p1 = xml.match(/<part id="P1">([\s\S]*?)<\/part>/m);
  const re = /Measure: (\d+)[\s\S]*?<\/measure>/g;
  let m;
  let maxBar = 84;
  const fillBars = new Set();
  for (const s of SECTIONS_V3) {
    const f = s.fillAt == null ? [] : Array.isArray(s.fillAt) ? s.fillAt : [s.fillAt];
    f.forEach((x) => fillBars.add(x));
  }
  const plan = [];
  for (let bar = 1; bar <= maxBar; bar++) {
    const sec = SECTIONS_V3.find((s) => bar >= s.start && bar <= s.end);
    if (!sec) continue;
    const pos = bar - sec.start;
    const g = grooves[sec.groove];
    const barInLoop = (pos % g.loopBars) + 1;
    const isFill = fillBars.has(bar);
    const midi = grooves[isFill ? sec.fill || 'fill_01' : sec.groove];
    const snare = snareBeatsForBar(midi, isFill ? 1 : barInLoop);
    plan.push({ bar, snare });
  }
  return plan;
}

function readMidiGroove(filePath) {
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
        pos++;
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
  return { tpb, tpbBar, loopBars, events: all };
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
    hits.push(...midi.events.filter((e) => e.tick >= start && e.tick < end && SNARE.has(e.note)));
  }
  return [...new Set(hits.map((h) => roundBeat((h.tick - start) / midi.tpb + 1)))].sort(
    (a, b) => a - b
  );
}

function addAccent(xml) {
  if (/<accent\s*\/>/.test(xml)) return xml;
  return xml.replace(/<type>/, `<accent />\n    <type>`);
}

function snapBrassToSnare(measures, bars, barPlan, partId, partName, allNotes = false) {
  for (const bar of bars) {
    const m = measures.get(bar);
    const plan = barPlan.find((p) => p.bar === bar);
    if (!m || !plan?.snare?.length) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    let changed = false;
    for (const ev of events) {
      if (ev.isRest || ev.isChord) continue;
      ev.beat = roundBeat(beatFromOffset(ev.time));
      const isHit = ev.dur <= EIGHTH || /<accent\s*\/>/.test(ev.xml);
      if (!allNotes && !isHit && ev.dur > QUARTER) continue;
      const c = classifyBrassHit(ev.beat, plan.snare);
      if (c.ok) continue;
      const targetBeat = c.target ?? plan.snare[0];
      const old = beatStr(ev.beat);
      ev.time = offsetFromBeat(targetBeat);
      ev.beat = targetBeat;
      if (ev.dur > EIGHTH) ev.dur = EIGHTH;
      ev.xml = addAccent(setNoteDuration(ev.xml, ev.dur));
      logChange(bar, partName, old, beatStr(targetBeat), 'pass 2 — snap brass to snare grid');
      changed = true;
    }
    if (changed) saveMeasure(measures, bar, prefix, events, partId);
  }
}

function findOkBrassBeat(snareBeats) {
  const candidates = [];
  for (const s of snareBeats) {
    candidates.push(s, roundBeat(s + 0.5));
  }
  for (const b of [2, 2.5, 4, 4.5, ...snareBeats]) candidates.push(b);
  for (const b of candidates) {
    if (classifyBrassHit(b, snareBeats).ok) return b;
  }
  return snareBeats[0] ?? 2.5;
}

function forceBrassHitsOnGrid(measures, bars, barPlan, partId, partName, allNotes = false) {
  for (const bar of bars) {
    const m = measures.get(bar);
    const plan = barPlan.find((p) => p.bar === bar);
    if (!m || !plan?.snare?.length) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    let changed = false;
    for (const ev of events) {
      if (ev.isRest || ev.isChord) continue;
      ev.beat = roundBeat(beatFromOffset(ev.time));
      const isHit = ev.dur <= EIGHTH || /<accent\s*\/>/.test(ev.xml);
      if (!allNotes && !isHit) continue;
      const c = classifyBrassHit(ev.beat, plan.snare);
      if (c.ok) continue;
      const target = findOkBrassBeat(plan.snare);
      const old = beatStr(ev.beat);
      ev.time = offsetFromBeat(target);
      ev.beat = target;
      ev.dur = EIGHTH;
      ev.xml = addAccent(setNoteDuration(ev.xml, EIGHTH));
      logChange(bar, partName, old, beatStr(target), 'pass 2 — force brass hit on grid');
      changed = true;
    }
    if (changed) saveMeasure(measures, bar, prefix, events, partId);
  }
}

function fixMelodyHeadBar12Trumpet(measuresTpt, barPlan) {
  const plan = barPlan.find((p) => p.bar === 12);
  const target = plan?.snare?.length ? findOkBrassBeat(plan.snare) : 2.5;
  const m = measuresTpt.get(12);
  if (!m) return;
  const { prefix, events } = parseMeasureTimeline(m.inner);
  let changed = false;
  for (const ev of events) {
    if (ev.isRest || ev.isChord) continue;
    ev.beat = roundBeat(beatFromOffset(ev.time));
    if (ev.beat >= 3.5) {
      const old = beatStr(ev.beat);
      ev.time = offsetFromBeat(target);
      ev.beat = target;
      ev.dur = EIGHTH;
      ev.xml = addAccent(setNoteDuration(ev.xml, EIGHTH));
      logChange(12, 'Trumpet', old, beatStr(target), 'pass 2 — melody head bar 12 ending → snare grid');
      changed = true;
    }
  }
  if (changed) saveMeasure(measuresTpt, 12, prefix, events, PARTS.trumpet);
}

function moveBrassNearBeat1ToPrev45(measures, bars, partId, partName) {
  for (const bar of bars) {
    if (bar <= 1) continue;
    const prevBar = bar - 1;
    const currM = measures.get(bar);
    const prevM = measures.get(prevBar);
    if (!currM || !prevM) continue;
    const curr = parseMeasureTimeline(currM.inner);
    const prev = parseMeasureTimeline(prevM.inner);
    refreshEvents(curr.events);
    refreshEvents(prev.events);
    const toMove = curr.events.filter(
      (e) => !e.isRest && !e.isChord && e.time <= 32
    );
    if (!toMove.length) continue;
    const kept = curr.events.filter((e) => !toMove.includes(e));
    for (const ev of toMove) {
      prev.events.push({ ...ev, time: offsetFromBeat(4.5), beat: 4.5, dur: EIGHTH, xml: addAccent(setNoteDuration(ev.xml, EIGHTH)) });
      logChange(bar, partName, '1', `${prevBar}@4&`, 'pass 2 — melody/soli brass beat-1 anticipation');
    }
    saveMeasure(measures, bar, curr.prefix, kept, partId);
    saveMeasure(measures, prevBar, prev.prefix, prev.events, partId);
  }
}

function fixParallelsUpThirdLoop(measuresTpt, measuresTbn, bars, maxPasses = 4) {
  for (const bar of bars) {
    const mt = measuresTpt.get(bar);
    const mb = measuresTbn.get(bar);
    if (!mt || !mb) continue;
    for (let pass = 0; pass < maxPasses; pass++) {
      const pt = parseMeasureTimeline(mt.inner);
      const pb = parseMeasureTimeline(mb.inner);
      refreshEvents(pt.events);
      refreshEvents(pb.events);
      const shift = findParallelTromboneEvents(pt.events, pb.events);
      if (!shift.size) break;
      pb.events = pb.events.map((ev) => {
        if (!shift.has(ev)) return ev;
        const semis = pass % 2 === 0 ? 4 : 1;
        const newXml = shiftPitchBySemitones(ev.xml, semis);
        logChange(
          bar,
          'Trombone',
          beatStr(ev.beat),
          beatStr(ev.beat),
          `pass 2 — break parallel (+${semis} st)`
        );
        return { ...ev, xml: newXml, midi: pitchToMidi(newXml) };
      });
      saveMeasure(measuresTbn, bar, pb.prefix, pb.events, PARTS.trombone);
    }
  }
}

function fixWeakClave35To4(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    let changed = false;
    for (const ev of events) {
      if (ev.isRest || ev.isChord) continue;
      ev.beat = roundBeat(beatFromOffset(ev.time));
      if (Math.abs(ev.beat - 3.5) < 0.12 || Math.abs(ev.beat - 1.5) < 0.12) {
        const old = beatStr(ev.beat);
        const target = Math.abs(ev.beat - 3.5) < 0.12 ? 4 : 2;
        ev.time = offsetFromBeat(target);
        ev.beat = target;
        if (ev.dur > EIGHTH) {
          ev.dur = EIGHTH;
          ev.xml = setNoteDuration(ev.xml, EIGHTH);
        }
        logChange(bar, partName, old, beatStr(target), 'pass 2 — weak clave → strong beat');
        changed = true;
      }
    }
    if (changed) saveMeasure(measures, bar, prefix, events, partId);
  }
}

function splitQuartersToEighths(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    const extra = [];
    let changed = false;
    for (const ev of events) {
      if (ev.isRest || ev.isChord || ev.dur < QUARTER) continue;
      ev.dur = EIGHTH;
      ev.xml = setNoteDuration(ev.xml, EIGHTH);
      extra.push({
        ...ev,
        time: ev.time + EIGHTH,
        dur: EIGHTH,
        xml: setNoteDuration(ev.xml.replace(/<chord\s*\/>/, ''), EIGHTH),
        isChord: false,
      });
      changed = true;
    }
    if (changed) {
      events.push(...extra);
      logChange(bar, partName, 'quarters', 'eighths', 'pass 2 — split quarters for balance density');
      saveMeasure(measures, bar, prefix, events, partId);
    }
  }
}

function reduceSaxZigzag(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    const pitched = enrichPitched(events).sort((a, b) => a.time - b.time);
    const remove = new Set();
    for (let i = 1; i < pitched.length; i++) {
      const a = pitched[i - 1];
      const b = pitched[i];
      if (remove.has(a) || remove.has(b)) continue;
      const dt = b.time - a.time;
      if (dt >= EIGHTH * 2) continue;
      const dirB = Math.sign(b.midi - a.midi);
      const dirA = i >= 2 ? Math.sign(a.midi - pitched[i - 2].midi) : Math.sign(b.midi - a.midi);
      if ((dirA !== 0 && dirB !== 0 && dirA !== dirB) || (i === 1 && dt <= EIGHTH)) {
        remove.add(b);
        logChange(bar, partName, beatStr(b.beat), '—', 'pass 2 — remove sax zigzag note');
      }
    }
    if (!remove.size) continue;
    saveMeasure(measures, bar, prefix, events.filter((e) => !remove.has(e)), partId);
  }
}

function moveSaxNearBeat1ToPrev45(measures, bars, partId, partName) {
  for (const bar of bars) {
    if (bar <= 1) continue;
    const prevBar = bar - 1;
    const currM = measures.get(bar);
    const prevM = measures.get(prevBar);
    if (!currM || !prevM) continue;
    const curr = parseMeasureTimeline(currM.inner);
    const prev = parseMeasureTimeline(prevM.inner);
    refreshEvents(curr.events);
    const toMove = curr.events.filter((e) => !e.isRest && !e.isChord && e.time <= 32);
    if (!toMove.length) continue;
    const kept = curr.events.filter((e) => !toMove.includes(e));
    for (const ev of toMove) {
      prev.events.push({ ...ev, time: offsetFromBeat(4.5), beat: 4.5 });
      logChange(bar, partName, '1', `${prevBar}@4&`, 'pass 2 — soli sax beat-1 anticipation');
    }
    saveMeasure(measures, bar, curr.prefix, kept, partId);
    saveMeasure(measures, prevBar, prev.prefix, prev.events, partId);
  }
}

function applyV4Pass2(measuresTpt, measuresTbn, measuresAlto, measuresTen, barPlan) {
  const melodyHeadBars = [...range(9, 12), ...range(37, 44), ...range(75, 78)];
  const rideoutBars = [...range(25, 32), ...range(57, 62)];
  const soliABars = range(49, 56);

  moveBrassNearBeat1ToPrev45(measuresTpt, melodyHeadBars, PARTS.trumpet, 'Trumpet');
  moveBrassNearBeat1ToPrev45(measuresTbn, melodyHeadBars, PARTS.trombone, 'Trombone');
  fixMelodyHeadBar12Trumpet(measuresTpt, barPlan);
  snapBrassToSnare(measuresTpt, melodyHeadBars, barPlan, PARTS.trumpet, 'Trumpet', true);
  snapBrassToSnare(measuresTbn, melodyHeadBars, barPlan, PARTS.trombone, 'Trombone', true);
  snapBrassToSnare(measuresTpt, rideoutBars, barPlan, PARTS.trumpet, 'Trumpet');
  snapBrassToSnare(measuresTbn, rideoutBars, barPlan, PARTS.trombone, 'Trombone');
  snapBrassToSnare(measuresTpt, range(37, 44), barPlan, PARTS.trumpet, 'Trumpet', true);
  snapBrassToSnare(measuresTbn, range(75, 78), barPlan, PARTS.trombone, 'Trombone', true);

  fixParallelsUpThirdLoop(measuresTpt, measuresTbn, rideoutBars);
  fixParallelsUpThirdLoop(measuresTpt, measuresTbn, soliABars, 6);
  fixParallelsUpThirdLoop(measuresTpt, measuresTbn, range(75, 78));

  fixWeakClave35To4(measuresTpt, rideoutBars, PARTS.trumpet, 'Trumpet');
  fixWeakClave35To4(measuresTbn, rideoutBars, PARTS.trombone, 'Trombone');
  fixWeakClave35To4(measuresTpt, range(37, 44), PARTS.trumpet, 'Trumpet');
  fixWeakClave35To4(measuresTbn, range(37, 44), PARTS.trombone, 'Trombone');
  fixWeakClave35To4(measuresTpt, range(75, 78), PARTS.trumpet, 'Trumpet');
  fixWeakClave35To4(measuresTpt, soliABars, PARTS.trumpet, 'Trumpet');
  fixWeakClave35To4(measuresTbn, soliABars, PARTS.trombone, 'Trombone');
  snapBrassToSnare(measuresTpt, soliABars, barPlan, PARTS.trumpet, 'Trumpet');
  snapBrassToSnare(measuresTbn, soliABars, barPlan, PARTS.trombone, 'Trombone');

  moveSaxNearBeat1ToPrev45(measuresAlto, soliABars, PARTS.alto, 'Alto Saxophone');
  moveSaxNearBeat1ToPrev45(measuresTen, soliABars, PARTS.tenor, 'Tenor Saxophone');

  const saxZigzagBars = [...melodyHeadBars, ...rideoutBars, ...soliABars];
  reduceSaxZigzag(measuresAlto, saxZigzagBars, PARTS.alto, 'Alto Saxophone');
  reduceSaxZigzag(measuresTen, saxZigzagBars, PARTS.tenor, 'Tenor Saxophone');

  forceBrassHitsOnGrid(measuresTpt, melodyHeadBars, barPlan, PARTS.trumpet, 'Trumpet', true);
  forceBrassHitsOnGrid(measuresTbn, melodyHeadBars, barPlan, PARTS.trombone, 'Trombone', true);
  forceBrassHitsOnGrid(measuresTpt, soliABars, barPlan, PARTS.trumpet, 'Trumpet');
  forceBrassHitsOnGrid(measuresTbn, soliABars, barPlan, PARTS.trombone, 'Trombone');

  fixMelodyHeadATrumpetBar43(measuresTpt, barPlan);
  dedupeSaxSameBeat(measuresAlto, range(37, 44), PARTS.alto, 'Alto Saxophone');
  dedupeSaxSameBeat(measuresTen, range(37, 44), PARTS.tenor, 'Tenor Saxophone');
}

function fixMelodyHeadATrumpetBar43(measuresTpt, barPlan) {
  const m = measuresTpt.get(43);
  const plan = barPlan.find((p) => p.bar === 43);
  if (!m || !plan?.snare?.length) return;
  const target = findOkBrassBeat(plan.snare);
  const { prefix, events } = parseMeasureTimeline(m.inner);
  let changed = false;
  for (const ev of events) {
    if (ev.isRest) continue;
    ev.beat = roundBeat(beatFromOffset(ev.time));
    if (Math.abs(ev.beat - 3.5) < 0.15 || !classifyBrassHit(ev.beat, plan.snare).ok) {
      const old = beatStr(ev.beat);
      ev.time = offsetFromBeat(target);
      ev.beat = target;
      ev.dur = EIGHTH;
      ev.xml = addAccent(setNoteDuration(ev.xml.replace(/<chord\s*\/>/, ''), EIGHTH));
      ev.isChord = false;
      logChange(43, 'Trumpet', old, beatStr(target), 'pass 2 — melody head (A) bar 43 → snare grid');
      changed = true;
    }
  }
  if (changed) saveMeasure(measuresTpt, 43, prefix, events, PARTS.trumpet);
}

function dedupeSaxSameBeat(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    const pitched = enrichPitched(events).sort((a, b) => a.time - b.time);
    const remove = new Set();
    for (let i = 1; i < pitched.length; i++) {
      if (Math.abs(pitched[i].beat - pitched[i - 1].beat) < 0.06) {
        remove.add(pitched[i]);
        logChange(bar, partName, beatStr(pitched[i].beat), '—', 'pass 2 — dedupe sax same-beat zigzag');
      }
    }
    if (!remove.size) continue;
    saveMeasure(measures, bar, prefix, events.filter((e) => !remove.has(e)), partId);
  }
}

// ─── Apply all V4 fixes ──────────────────────────────────────────────────────

export function applyV4Fixes(xml, options = {}) {
  activeLog = options.changeLog ?? v4Changes;

  let out = xml;
  const tptSplit = splitPart(out, PARTS.trumpet);
  const tbnSplit = splitPart(out, PARTS.trombone);
  const altoSplit = splitPart(out, PARTS.alto);
  const tenSplit = splitPart(out, PARTS.tenor);

  const measuresTpt = splitMeasures(tptSplit.body);
  const measuresTbn = splitMeasures(tbnSplit.body);
  const measuresAlto = splitMeasures(altoSplit.body);
  const measuresTen = splitMeasures(tenSplit.body);

  const melodyHeadBars = [...range(9, 12), ...range(37, 44), ...range(75, 78)];
  const rideoutBars = [...range(25, 32), ...range(57, 62)];
  const soliABars = range(49, 56);

  moveBrassBeat1ToPrevBar45(measuresTpt, measuresTbn, melodyHeadBars);
  moveSaxBeat3ToBeat2And(measuresAlto, melodyHeadBars, PARTS.alto, 'Alto Saxophone');
  moveSaxBeat3ToBeat2And(measuresTen, melodyHeadBars, PARTS.tenor, 'Tenor Saxophone');
  thinMelodyHeadDensity(
    {
      [PARTS.alto]: measuresAlto,
      [PARTS.tenor]: measuresTen,
      [PARTS.trumpet]: measuresTpt,
      [PARTS.trombone]: measuresTbn,
    },
    melodyHeadBars
  );

  fixRideoutParallelsUpThird(measuresTpt, measuresTbn, rideoutBars);
  moveRideoutBrassBeat3ToBeat3And(measuresTpt, rideoutBars, PARTS.trumpet, 'Trumpet');
  moveRideoutBrassBeat3ToBeat3And(measuresTbn, rideoutBars, PARTS.trombone, 'Trombone');
  tieRideoutSaxBeat4Short(measuresAlto, rideoutBars, PARTS.alto, 'Alto Saxophone');
  tieRideoutSaxBeat4Short(measuresTen, rideoutBars, PARTS.tenor, 'Tenor Saxophone');

  muteTromboneDuplicatePc(measuresTpt, measuresTbn, soliABars);
  moveSaxBeat1ToPrevBar45(measuresAlto, soliABars, PARTS.alto, 'Alto Saxophone');
  moveSaxBeat1ToPrevBar45(measuresTen, soliABars, PARTS.tenor, 'Tenor Saxophone');

  const barPlan = buildSnareBarPlan(out);
  applyV4Pass2(measuresTpt, measuresTbn, measuresAlto, measuresTen, barPlan);

  out = out.replace(
    tptSplit.open + tptSplit.body + tptSplit.close,
    tptSplit.open + rebuildPartBody(tptSplit.body, measuresTpt) + tptSplit.close
  );
  out = out.replace(
    tbnSplit.open + tbnSplit.body + tbnSplit.close,
    tbnSplit.open + rebuildPartBody(tbnSplit.body, measuresTbn) + tbnSplit.close
  );
  out = out.replace(
    altoSplit.open + altoSplit.body + altoSplit.close,
    altoSplit.open + rebuildPartBody(altoSplit.body, measuresAlto) + altoSplit.close
  );
  out = out.replace(
    tenSplit.open + tenSplit.body + tenSplit.close,
    tenSplit.open + rebuildPartBody(tenSplit.body, measuresTen) + tenSplit.close
  );

  return out;
}

function parseScoresFromReport(reportPath) {
  if (!fs.existsSync(reportPath)) return new Map();
  const text = fs.readFileSync(reportPath, 'utf8');
  const map = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(
      /^\| (.+?) \| (\d+–\d+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| \*\*([\d.]+)\*\* \|$/
    );
    if (m) {
      map.set(m[1], {
        range: m[2],
        brass: parseFloat(m[3]),
        sax: parseFloat(m[4]),
        parallel: parseFloat(m[5]),
        balance: parseFloat(m[6]),
        overall: parseFloat(m[7]),
      });
    }
  }
  return map;
}

function appendV4ChangesMd() {
  let existing = fs.readFileSync(CHANGES, 'utf8');
  const marker = '## V4 targeted GCE fixes';
  if (existing.includes(marker)) {
    existing = existing.slice(0, existing.indexOf(marker)).replace(/\n---\n\n$/, '\n');
  }
  const block = [
    existing.trimEnd(),
    '',
    '---',
    '',
    `## V4 targeted GCE fixes (${new Date().toISOString().slice(0, 10)})`,
    '',
    'Output: **Orbit-NewOrleans-V4.musicxml** (V1/V2/V3 unchanged)',
    '',
    '### Fix groups',
    '- **Melody Head** (9–12, 37–44, 75–78): brass beat 1 → prev 4&; sax beat 3 → 2&; thin weak-beat clusters (trombone first)',
    '- **Rideout** (25–32, 57–62): parallel 5ths → trombone up M3; brass beat 3 → 3&; sax short beat-4 ties into next bar',
    '- **Soli Chorus (A)** (49–56): mute trombone duplicate trumpet PC; sax beat 1 → prev 4&',
    '- **Pass 2 (GCE grid):** snare snap, parallel loop, weak-clave repair, sax zigzag/dedupe, bar 43/12 specials',
    '',
    '| Bar | Part | Original beat | New beat | Reason |',
    '|-----|------|---------------|----------|--------|',
    ...activeLog.map(
      (c) => `| ${c.bar} | ${c.partName} | ${c.oldBeat} | ${c.newBeat} | ${c.reason} |`
    ),
    '',
    `**V4 fix count:** ${activeLog.length}`,
  ];
  fs.writeFileSync(CHANGES, block.join('\n') + '\n', 'utf8');
}

function writeV4GceReport(v4Results, v3ScoreMap, v3Overall, v4Overall) {
  const shout = v4Results.filter((r) => r.label.includes('Shout'));
  const verse = v4Results.filter((r) => r.label.includes('Melody Head'));
  const shoutAvg =
    shout.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    Math.max(1, shout.length);
  const verseAvg =
    verse.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    Math.max(1, verse.length);

  const targetSections = [
    'Melody Head',
    'Rideout',
    'Melody Head (A)',
    'Soli Chorus (A)',
    'Rideout (A)',
    'Melody Head (A2)',
  ];
  const below6 = v4Results.filter((r) => r.overall < 6);
  const targetMet = targetSections.every((label) => {
    const r = v4Results.find((x) => x.label === label);
    return r && r.overall >= 6;
  });

  const lines = [];
  lines.push('# Orbit New Orleans V4 — GCE Evaluation Report');
  lines.push('');
  lines.push(`File: Orbit-NewOrleans-V4.musicxml · Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(
    `**Overall form average: ${v4Overall}/10** (V3: ${v3Overall}/10, Δ ${(v4Overall - v3Overall).toFixed(1)})`
  );
  lines.push(
    `Shout vs verse accent ratio: **${(shoutAvg / Math.max(0.1, verseAvg)).toFixed(1)}×**`
  );
  lines.push(
    `**Target sections all ≥ 6.0:** ${targetMet ? 'YES ✓' : 'NO — see below'} (${below6.length} sections still below 6 overall)`
  );
  lines.push('');

  lines.push('## Section scores (V4)');
  lines.push('');
  lines.push('| Section | Bars | Brass | Sax | Parallel | Balance | **Overall** |');
  lines.push('|---------|------|-------|-----|----------|---------|-------------|');
  for (const r of v4Results) {
    const flag = targetSections.includes(r.label) && r.overall < 6 ? ' ⚠' : '';
    lines.push(
      `| ${r.label} | ${r.range} | ${r.brassScore} | ${r.saxScore} | ${r.parallelScore} | ${r.balanceScore.toFixed(1)} | **${r.overall}**${flag} |`
    );
  }
  lines.push('');

  lines.push('## V3 vs V4 comparison');
  lines.push('');
  lines.push('| Section | V3 Overall | V4 Overall | Δ | V3 Parallel | V4 Parallel |');
  lines.push('|---------|------------|------------|---|-------------|-------------|');
  for (const r of v4Results) {
    const v3 = v3ScoreMap.get(r.label);
    const v3o = v3?.overall ?? '—';
    const v3p = v3?.parallelScore ?? v3?.parallel ?? '—';
    const delta = v3 ? r.overall - v3.overall : 0;
    const deltaPrefix = delta > 0 ? '+' : '';
    lines.push(
      `| ${r.label} | ${v3o} | **${r.overall}** | ${v3 ? deltaPrefix + delta.toFixed(1) : '—'} | ${v3p} | ${r.parallelScore} |`
    );
  }
  lines.push('');

  lines.push('## Manual Sibelius review — V4 (overall < 6)');
  lines.push('');
  if (!below6.length) lines.push('None — all sections scored ≥ 6 overall.');
  else {
    for (const r of below6) {
      lines.push(`### ${r.label} (bars ${r.range}) — **${r.overall}/10**`);
      if (r.brassIssues.length) {
        lines.push(
          '- Brass: ' +
            [...new Set(r.brassIssues.map((i) => `bar ${i.bar} ${i.part}@${beatStr(i.beat)}`))]
              .slice(0, 8)
              .join('; ')
        );
      }
      if (r.parallelIssues.length) {
        lines.push(
          '- Parallel: ' + r.parallelIssues.slice(0, 6).map((i) => `bar ${i.bar} ${i.type}`).join('; ')
        );
      }
      if (r.saxIssues.length) {
        lines.push(
          '- Sax: ' + r.saxIssues.slice(0, 6).map((i) => `bar ${i.bar} ${i.note}`).join('; ')
        );
      }
      lines.push('');
    }
  }

  lines.push('## V4 fixes applied');
  lines.push('');
  lines.push('See Orbit-Changes.md § V4 targeted GCE fixes.');
  lines.push('');

  fs.writeFileSync(GCE_V4_REPORT, lines.join('\n'), 'utf8');
}

function runV4Pipeline() {
  console.log('Reading V3...');
  const v3Xml = fs.readFileSync(V3, 'utf8');
  activeLog.length = 0;
  const v4Xml = applyV4Fixes(v3Xml, { changeLog: activeLog });
  fs.writeFileSync(V4, v4Xml, 'utf8');
  console.log('Wrote', V4);

  appendV4ChangesMd();
  console.log('V4 fixes:', activeLog.length);

  const v3Eval = runGceEvaluation(V3, GCE_CONFIG);
  const v3ScoreMap = new Map(v3Eval.results.map((r) => [r.label, r]));
  const v4Eval = runGceEvaluation(V4, GCE_CONFIG);
  writeV4GceReport(v4Eval.results, v3ScoreMap, v3Eval.overallAvg, v4Eval.overallAvg);
  console.log('Wrote', GCE_V4_REPORT);
  console.log('V3 overall:', v3Eval.overallAvg, '→ V4:', v4Eval.overallAvg);

  for (const label of [
    'Melody Head',
    'Rideout',
    'Melody Head (A)',
    'Soli Chorus (A)',
    'Rideout (A)',
    'Melody Head (A2)',
  ]) {
    const v3 = v3ScoreMap.get(label);
    const v4 = v4Eval.results.find((r) => r.label === label);
    const ok = v4 && v4.overall >= 6 ? '✓' : '⚠';
    console.log(`  ${ok} ${label}: V3 ${v3?.overall} → V4 ${v4?.overall}`);
  }

  return { v4Eval, v3Eval };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  runV4Pipeline();
}

export { runV4Pipeline };
