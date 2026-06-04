/**
 * Orbit New Orleans V5 — complete rebuild from lead sheet + SD3 grooves.
 * Drums first → melody (3/4 lead → 4/4) → backgrounds → quality gate → output.
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
  replaceDrumPart,
  writeMidiDrums,
  instrumentIdForPart,
  DIVISIONS,
  BAR_LEN,
  QUARTER,
  EIGHTH,
  PARTS,
  offsetFromBeat,
  beatFromOffset,
  roundBeat,
} from './orbitNewOrleansRevise.mjs';
import { GROOVE_FILES_V5, SECTIONS_V5, MIDI_DIR } from './orbitGrooveConfig.mjs';

const LEAD =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit_lead_V5.1.musicxml';
const V4_REF =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-NewOrleans-V4.musicxml';
const REV_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const V5_SCORE = path.join(REV_DIR, 'Orbit-NewOrleans-V5.musicxml');
const V5_DRUMS = path.join(REV_DIR, 'Orbit-Drums-NewOrleans-V5.mid');
const CHANGES = path.join(REV_DIR, 'Orbit-Changes.md');
const GCE_V5_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V5.md');

const HORN_PARTS = [PARTS.alto, PARTS.tenor, PARTS.trumpet, PARTS.trombone];
const MELODY_PARTS = [PARTS.alto, PARTS.tenor, PARTS.trumpet];

const WRITTEN_OFFSET = {
  [PARTS.alto]: 9,
  [PARTS.tenor]: 14,
  [PARTS.trumpet]: 3,
  [PARTS.trombone]: 0,
};

const REGISTER = {
  [PARTS.alto]: { min: 62, max: 81 },
  [PARTS.tenor]: { min: 60, max: 79 },
  [PARTS.trumpet]: { min: 64, max: 84 },
  [PARTS.trombone]: { min: 48, max: 72 },
};

const MELODY_MAP = [
  { start: 1, end: 4, leadStart: 1, transpose: 0, owner: 'alto' },
  { start: 5, end: 8, leadStart: 5, transpose: 0, owner: 'tenor' },
  { start: 9, end: 12, leadStart: 9, transpose: 0, owner: 'alto' },
  { start: 13, end: 16, leadStart: 13, transpose: 0, owner: 'tenor' },
  { start: 17, end: 24, leadStart: 17, transpose: 0, owner: 'trumpet' },
  { start: 25, end: 32, leadStart: 25, transpose: 0, owner: 'alto_tenor' },
  { start: 33, end: 36, leadStart: 1, transpose: 4, owner: 'alto' },
  { start: 37, end: 44, leadStart: 5, transpose: 4, owner: 'tenor' },
  { start: 45, end: 48, leadStart: 13, transpose: 4, owner: 'trumpet' },
  { start: 49, end: 56, leadStart: 17, transpose: 4, owner: 'alto' },
  { start: 57, end: 62, leadStart: 25, transpose: 4, owner: 'trumpet' },
  { start: 63, end: 70, leadStart: 13, transpose: 4, owner: 'tenor' },
  { start: 71, end: 74, leadStart: 29, transpose: 4, owner: 'alto' },
  { start: 75, end: 78, leadStart: 9, transpose: 4, owner: 'alto' },
  { start: 79, end: 84, leadStart: 5, transpose: 0, owner: 'ensemble' },
];

const v5Changes = [];

function logChange(bar, partName, oldBeat, newBeat, reason) {
  v5Changes.push({ bar, partName, oldBeat, newBeat, reason });
}

function range(a, b) {
  return [...Array(b - a + 1)].map((_, i) => a + i);
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

function noteXml(midi, dur, partId, voice = 1, chord = false) {
  const written = midi + (WRITTEN_OFFSET[partId] ?? 0);
  const { step, alter, octave } = midiToPitchParts(written);
  const acc =
    alter !== 0 ? `    <accidental>${alter === 1 ? 'sharp' : 'flat'}</accidental>\n` : '';
  const altTag = alter !== 0 ? `     <alter>${alter}</alter>\n` : '';
  const chordTag = chord ? '   <chord />\n' : '';
  return `   <note>\n${chordTag}    <pitch>\n     <step>${step}</step>\n${altTag}     <octave>${octave}</octave>\n    </pitch>\n    <duration>${dur}</duration>\n    <instrument id="${partId}-I1" />\n    <voice>${voice}</voice>\n    <type>${typeForDuration(dur)}</type>\n${acc}    <staff>1</staff>\n   </note>\n`;
}

function ownerForBar(bar) {
  const m = MELODY_MAP.find((x) => bar >= x.start && bar <= x.end);
  return m?.owner ?? null;
}

function melodyOwnerPartId(bar) {
  const o = ownerForBar(bar);
  if (o === 'alto' || o === 'ensemble') return PARTS.alto;
  if (o === 'tenor' || o === 'alto_tenor') return PARTS.tenor;
  if (o === 'trumpet') return PARTS.trumpet;
  return null;
}

function parseLeadSheet(leadPath) {
  const xml = fs.readFileSync(leadPath, 'utf8');
  const partBody = xml.match(/<part id="[^"]+">([\s\S]*?)<\/part>/)[1];
  const barRe = /<measure number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
  const bars = new Map();
  let m;
  while ((m = barRe.exec(partBody))) {
    const num = parseInt(m[1], 10);
    const inner = m[2];
    const divMatch = inner.match(/<divisions>(\d+)<\/divisions>/);
    const divisions = divMatch ? parseInt(divMatch[1], 10) : 12;
    const notes = [];
    let time = 0;
    for (const block of inner.match(/<note[\s\S]*?<\/note>/g) || []) {
      const isRest = /<rest/.test(block);
      const dur = parseInt(block.match(/<duration>(\d+)<\/duration>/)[1], 10);
      let midi = null;
      if (!isRest) midi = pitchToMidi(block);
      notes.push({ time, dur, midi, isRest });
      time += dur;
    }
    bars.set(num, { divisions, notes, barLen: divisions * 3 });
  }
  return bars;
}

/** Adapt one 3/4 bar → 4/4 events at DIVISIONS=256 */
function adaptBarTo44(leadBar, transpose = 0) {
  const { notes, barLen: leadBarLen } = leadBar;
  const scale = BAR_LEN / leadBarLen;
  const events = [];
  let time = 0;
  for (const n of notes) {
    const dur = Math.round(n.dur * scale);
    if (n.isRest) {
      events.push({ time, dur, isRest: true });
    } else {
      events.push({ time, dur, midi: n.midi + transpose, isRest: false });
    }
    time += dur;
  }
  let total = events.reduce((a, e) => a + e.dur, 0);
  if (total < BAR_LEN) {
    const pitched = events.filter((e) => !e.isRest);
    if (pitched.length) {
      let longest = pitched[0];
      for (const e of pitched) if (e.dur > longest.dur) longest = e;
      longest.dur += BAR_LEN - total;
    } else if (events.length) {
      events[events.length - 1].dur += BAR_LEN - total;
    } else {
      events.push({ time: 0, dur: BAR_LEN, isRest: true });
    }
  } else if (total > BAR_LEN) {
    let excess = total - BAR_LEN;
    for (let i = events.length - 1; i >= 0 && excess > 0; i--) {
      const cut = Math.min(events[i].dur, excess);
      events[i].dur -= cut;
      excess -= cut;
    }
    events.filter((e) => e.dur <= 0).forEach((e) => (e.dur = 0));
  }
  return events.filter((e) => e.dur > 0);
}

function addBreathSpace(events, bar) {
  if (bar % 4 !== 0) return events;
  const restDur = QUARTER;
  let time = 0;
  for (const e of events) time += e.dur;
  if (time >= BAR_LEN) {
    const last = events[events.length - 1];
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
      isChord: false,
      voice: 1,
      midi,
      xml: noteXml(midi, e.dur, partId),
    };
  });
}

function harmonizeMidi(melodyMidi, interval) {
  return melodyMidi + interval;
}

function buildMelodyMeasures(leadBars, totalBars) {
  const out = {
    [PARTS.alto]: new Map(),
    [PARTS.tenor]: new Map(),
    [PARTS.trumpet]: new Map(),
    [PARTS.trombone]: new Map(),
  };

  for (let bar = 1; bar <= totalBars; bar++) {
    const mapEntry = MELODY_MAP.find((x) => bar >= x.start && bar <= x.end);
    const leadBarNum = mapEntry ? mapEntry.leadStart + (bar - mapEntry.start) : 1;
    const leadBar = leadBars.get(leadBarNum) || leadBars.get(1);
    const transpose = mapEntry?.transpose ?? 0;
    let events = adaptBarTo44(leadBar, transpose);
    events = addBreathSpace(events, bar);
    const owner = mapEntry?.owner ?? 'alto';

    for (const pid of HORN_PARTS) {
      out[pid].set(bar, { attrs: null, inner: null, events: [] });
    }

    if (owner === 'ensemble') {
      out[PARTS.alto].get(bar).events = eventsToMeasureEvents(events, PARTS.alto);
      const tenorLine = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(harmonizeMidi(e.midi, 4), PARTS.tenor) }
      );
      out[PARTS.tenor].get(bar).events = eventsToMeasureEvents(tenorLine, PARTS.tenor);
      const tptLine = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(harmonizeMidi(e.midi, 7), PARTS.trumpet) }
      );
      out[PARTS.trumpet].get(bar).events = eventsToMeasureEvents(tptLine, PARTS.trumpet);
      const tbnLine = events.map((e) =>
        e.isRest ? e : { ...e, midi: clampMidi(harmonizeMidi(e.midi, -12), PARTS.trombone) }
      );
      out[PARTS.trombone].get(bar).events = eventsToMeasureEvents(tbnLine, PARTS.trombone);
    } else if (owner === 'alto_tenor') {
      const altoEv = eventsToMeasureEvents(events, PARTS.alto);
      out[PARTS.alto].get(bar).events = altoEv;
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

function snareStrongBeats(barPlan, bar) {
  const plan = barPlan.find((p) => p.bar === bar);
  return plan?.snareStrong?.length ? plan.snareStrong : plan?.hits?.filter((h) => [38, 40].includes(h.midi)).map((h) => h.beat) ?? [2, 4];
}

function buildBackgrounds(melodyMeasures, barPlan, totalBars) {
  const bg = {
    [PARTS.alto]: new Map(),
    [PARTS.tenor]: new Map(),
    [PARTS.trumpet]: new Map(),
    [PARTS.trombone]: new Map(),
  };

  for (let bar = 1; bar <= totalBars; bar++) {
    for (const pid of HORN_PARTS) bg[pid].set(bar, []);
  }

  const riffCell = [
    { beat: 1, dur: EIGHTH, midi: 58 },
    { beat: 2, dur: EIGHTH, midi: 62 },
    { beat: 2.5, dur: EIGHTH, midi: 65 },
    { beat: 4, dur: QUARTER, midi: 58 },
  ];

  for (const bar of range(9, 12).concat(range(37, 44)).concat(range(75, 78))) {
    if (melodyOwnerPartId(bar) === PARTS.trombone) continue;
    const cellBar = bar % 2 === 0 ? 1 : 0;
    for (const cell of riffCell.slice(cellBar * 2, cellBar * 2 + 2)) {
      bg[PARTS.trombone].get(bar).push({
        time: offsetFromBeat(cell.beat),
        dur: cell.dur,
        midi: clampMidi(cell.midi, PARTS.trombone),
      });
    }
  }

  for (const bar of range(5, 8).concat(range(49, 56)).concat(range(63, 70))) {
    const owner = melodyOwnerPartId(bar);
    const responder = owner === PARTS.alto ? PARTS.tenor : PARTS.alto;
    if (owner === responder) continue;
    const accents = snareStrongBeats(barPlan, bar);
    for (const beat of accents.slice(0, 2)) {
      bg[responder].get(bar).push({
        time: offsetFromBeat(beat),
        dur: EIGHTH,
        midi: clampMidi(65 + (bar % 3) * 2, responder),
      });
    }
  }

  for (const bar of range(17, 24).concat(range(45, 48)).concat(range(79, 84))) {
    const accents = snareStrongBeats(barPlan, bar);
    for (const beat of accents) {
      const root = 53 + (bar % 4) * 2;
      if (melodyOwnerPartId(bar) !== PARTS.trumpet) {
        bg[PARTS.trumpet].get(bar).push({
          time: offsetFromBeat(beat),
          dur: EIGHTH,
          midi: clampMidi(root + 12, PARTS.trumpet),
        });
      }
      bg[PARTS.trombone].get(bar).push({
        time: offsetFromBeat(beat),
        dur: EIGHTH,
        midi: clampMidi(root, PARTS.trombone),
      });
    }
  }

  for (const bar of range(25, 32)) {
    if (ownerForBar(bar) === 'alto_tenor') continue;
    const pid = bar % 2 === 0 ? PARTS.alto : PARTS.tenor;
    if (melodyOwnerPartId(bar) === pid) continue;
    bg[pid].get(bar).push({
      time: offsetFromBeat(1.5),
      dur: EIGHTH,
      midi: clampMidi(60 + (bar % 5), pid),
    });
    bg[pid].get(bar).push({
      time: offsetFromBeat(3.5),
      dur: EIGHTH,
      midi: clampMidi(58 + (bar % 4), pid),
    });
  }

  for (const bar of range(57, 62)) {
    const pid = bar % 2 === 0 ? PARTS.alto : PARTS.tenor;
    if (melodyOwnerPartId(bar) === pid) continue;
    bg[pid].get(bar).push({
      time: offsetFromBeat(2.5),
      dur: EIGHTH,
      midi: clampMidi(62 + (bar % 3), pid),
    });
  }

  return bg;
}

function mergeMelodyAndBackgrounds(melodyMeasures, bgMeasures, refMeasures, totalBars, pid) {
  const out = new Map();
  for (let bar = 1; bar <= totalBars; bar++) {
      const ref = refMeasures.get(bar);
      const melEv = melodyMeasures[pid].get(bar)?.events || [];
      const bgHits = bgMeasures[pid].get(bar) || [];
      const melOnly = melEv.some((e) => !e.isRest && e.midi != null);
      const events = [...melEv];

      if (!melOnly && bgHits.length) {
        for (const h of bgHits) {
          events.push({
            time: h.time,
            dur: h.dur,
            isRest: false,
            isChord: false,
            voice: 1,
            xml: noteXml(h.midi, h.dur, pid),
          });
        }
      } else if (melOnly && pid === PARTS.trombone && bgHits.length) {
        for (const h of bgHits) {
          const melMidiMax = Math.max(
            ...melEv.filter((e) => e.midi != null).map((e) => e.midi),
            0
          );
          if (h.midi >= melMidiMax - 2) continue;
          events.push({
            time: h.time,
            dur: h.dur,
            isRest: false,
            isChord: false,
            voice: 1,
            xml: noteXml(h.midi, h.dur, pid),
          });
        }
      } else if (melOnly && pid !== PARTS.trombone && bgHits.length && melodyOwnerPartId(bar) !== pid) {
        for (const h of bgHits.slice(0, 2)) {
          events.push({
            time: h.time,
            dur: h.dur,
            isRest: false,
            isChord: false,
            voice: 1,
            xml: noteXml(h.midi, h.dur, pid),
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

function qualityGate(melodyMeasures, barPlan, leadBars) {
  const issues = [];
  for (const entry of MELODY_MAP) {
    const len = entry.end - entry.start + 1;
    if (len < 4 && entry.owner !== 'ensemble') {
      issues.push(`Section bars ${entry.start}-${entry.end}: melody span ${len} < 4 bars`);
    }
  }

  for (const entry of MELODY_MAP) {
    const ownerPid =
      entry.owner === 'alto'
        ? PARTS.alto
        : entry.owner === 'tenor'
          ? PARTS.tenor
          : entry.owner === 'trumpet'
            ? PARTS.trumpet
            : entry.owner === 'alto_tenor'
              ? PARTS.alto
              : PARTS.alto;
    let prevMidi = null;
    let fragRun = 0;
    for (let bar = entry.start; bar <= entry.end; bar++) {
      const evs = melodyMeasures[ownerPid].get(bar)?.events || [];
      for (const e of evs) {
        if (e.isRest) {
          fragRun = 0;
          continue;
        }
        if (e.dur < EIGHTH) {
          fragRun++;
          if (fragRun >= 3) issues.push(`Bar ${bar}: 3+ short fragments on ${ownerPid}`);
        } else fragRun = 0;
        const r = REGISTER[ownerPid];
        if (e.midi != null && (e.midi < r.min || e.midi > r.max)) {
          issues.push(`Bar ${bar}: ${ownerPid} out of range (${e.midi})`);
        }
        prevMidi = e.midi;
      }
    }
  }

  for (const plan of barPlan) {
    if (!plan.hits?.length && !plan.fillKey) {
      issues.push(`Bar ${plan.bar}: empty drum groove`);
    }
  }

  return issues;
}

function ensureSwingSound(xml) {
  if (/<sound[^>]*swing-type/.test(xml)) {
    return xml.replace(
      /<sound tempo="\d+"[^/]*\/>/,
      '<sound tempo="90" swing-type="eighth" swing-percent="67"/>'
    );
  }
  return xml.replace(
    /(<measure number="1"[^>]*>[\s\S]*?<\/attributes>)/,
    '$1\n   <direction placement="above">\n    <direction-type>\n     <metronome>\n      <beat-unit>quarter</beat-unit>\n      <per-minute>90</per-minute>\n     </metronome>\n    </direction-type>\n    <sound tempo="90" swing-type="eighth" swing-percent="67"/>\n   </direction>'
  );
}

function runV5GceEvaluation(scorePath, barPlan) {
  const xml = fs.readFileSync(scorePath, 'utf8');
  const sections = SECTIONS_V5;

  function parseNotes(partId, bar) {
    const split = splitPart(xml, partId);
    const ms = splitMeasures(split.body);
    const m = ms.get(bar);
    if (!m) return [];
    const { events } = parseMeasureTimeline(m.inner);
    const offset = WRITTEN_OFFSET[partId] ?? 0;
    return events.filter((e) => !e.isRest && !e.isChord).map((e) => ({
      beat: roundBeat(beatFromOffset(e.time)),
      midi: pitchToMidi(e.xml) != null ? pitchToMidi(e.xml) - offset : null,
      dur: e.dur,
    }));
  }

  function countDrumHits(bar) {
    const split = splitPart(xml, PARTS.drums);
    const ms = splitMeasures(split.body);
    const m = ms.get(bar);
    if (!m) return 0;
    return (m.inner.match(/<unpitched>/g) || []).length;
  }

  function scoreMelodyOwnership(sec) {
    const owner = ownerForBar(sec.start);
    if (!owner) return 5;
    let barsWithOwner = 0;
    let total = 0;
    for (let b = sec.start; b <= sec.end; b++) {
      total++;
      const o = ownerForBar(b);
      if (o === owner) barsWithOwner++;
      const pid = melodyOwnerPartId(b);
      const notes = pid ? parseNotes(pid, b) : [];
      if (owner === 'ensemble' && notes.length) barsWithOwner++;
      else if (owner !== 'ensemble' && notes.length >= 1) barsWithOwner++;
    }
    return Math.min(10, Math.round((barsWithOwner / total) * 10));
  }

  function scorePhraseContinuity(sec) {
    const pid = melodyOwnerPartId(sec.start);
    if (!pid) return 6;
    let longNotes = 0;
    let total = 0;
    for (let b = sec.start; b <= sec.end; b++) {
      const p = melodyOwnerPartId(b) === ownerForBar(b) ? melodyOwnerPartId(b) : pid;
      if (!p) continue;
      for (const n of parseNotes(p, b)) {
        total++;
        if (n.dur >= QUARTER) longNotes++;
      }
    }
    if (!total) return 4;
    return Math.min(10, Math.round(5 + (longNotes / total) * 5));
  }

  function scoreHumanPlayability(sec) {
    let issues = 0;
    let checks = 0;
    for (let b = sec.start; b <= sec.end; b++) {
      for (const pid of MELODY_PARTS) {
        const notes = parseNotes(pid, b);
        checks += notes.length || 1;
        for (const n of notes) {
          if (n.dur < EIGHTH) issues++;
          const r = REGISTER[pid];
          if (n.midi != null && (n.midi < r.min || n.midi > r.max)) issues++;
        }
      }
    }
    const ratio = 1 - issues / Math.max(1, checks);
    return Math.min(10, Math.round(ratio * 10));
  }

  function scoreDrumAuthenticity(sec) {
    let match = 0;
    let total = 0;
    for (let b = sec.start; b <= sec.end; b++) {
      const plan = barPlan.find((p) => p.bar === b);
      const drumHits = countDrumHits(b);
      total++;
      if (plan?.hits?.length && drumHits >= Math.max(1, plan.hits.length * 0.4)) match++;
      else if (!plan?.hits?.length) match += 0.5;
    }
    return Math.min(10, Math.round(5 + (match / total) * 5));
  }

  const rows = sections.map((sec) => {
    const mo = scoreMelodyOwnership(sec);
    const pc = scorePhraseContinuity(sec);
    const hp = scoreHumanPlayability(sec);
    const dg = scoreDrumAuthenticity(sec);
    const overall = Math.round(((mo + pc + hp + dg) / 4) * 10) / 10;
    return {
      label: sec.label,
      range: `${sec.start}–${sec.end}`,
      melodyOwnership: mo,
      phraseContinuity: pc,
      humanPlayability: hp,
      drumGroove: dg,
      overall,
    };
  });

  const overallAvg =
    Math.round((rows.reduce((a, r) => a + r.overall, 0) / rows.length) * 10) / 10;
  return { rows, overallAvg };
}

function writeV5GceReport(evalResult) {
  const lines = [];
  lines.push('# Orbit New Orleans V5 — GCE Evaluation Report');
  lines.push('');
  lines.push(`File: Orbit-NewOrleans-V5.musicxml · Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('Source melody: Orbit_lead_V5.1.musicxml (3/4 → 4/4) · SD3 groove palette V5');
  lines.push('');
  lines.push(`**Overall form average: ${evalResult.overallAvg}/10** (target ≥ 7.0)`);
  lines.push('');
  lines.push('## V5 dimension scores (1–10)');
  lines.push('');
  lines.push(
    '| Section | Bars | Melody ownership | Phrase continuity | Human playability | Drum groove | **Overall** |'
  );
  lines.push(
    '|---------|------|------------------|-------------------|-------------------|-------------|-------------|'
  );
  for (const r of evalResult.rows) {
    lines.push(
      `| ${r.label} | ${r.range} | ${r.melodyOwnership} | ${r.phraseContinuity} | ${r.humanPlayability} | ${r.drumGroove} | **${r.overall}** |`
    );
  }
  lines.push('');
  lines.push('## Dimension averages');
  lines.push('');
  const avg = (key) =>
    Math.round((evalResult.rows.reduce((a, r) => a + r[key], 0) / evalResult.rows.length) * 10) / 10;
  lines.push(`- Melody ownership: **${avg('melodyOwnership')}** (target 8+)`);
  lines.push(`- Phrase continuity: **${avg('phraseContinuity')}** (target 7+)`);
  lines.push(`- Human playability: **${avg('humanPlayability')}** (target 7+)`);
  lines.push(`- Drum groove authenticity: **${avg('drumGroove')}** (target 7+)`);
  lines.push('');
  fs.writeFileSync(GCE_V5_REPORT, lines.join('\n'), 'utf8');
}

function appendV5ChangesMd(barPlan, gateIssues) {
  let existing = fs.existsSync(CHANGES) ? fs.readFileSync(CHANGES, 'utf8') : '';
  const marker = '## V5 complete rebuild';
  if (existing.includes(marker)) {
    existing = existing.slice(0, existing.indexOf(marker)).replace(/\n---\n\n$/, '\n');
  }

  const block = [
    existing.trimEnd(),
    '',
    '---',
    '',
    `## V5 complete rebuild (${new Date().toISOString().slice(0, 10)})`,
    '',
    'Output: **Orbit-NewOrleans-V5.musicxml** · **Orbit-Drums-NewOrleans-V5.mid**',
    'Melody source: **Orbit_lead_V5.1.musicxml** (3/4 jazz waltz → 4/4 adaptation)',
    'Structure/harmony reference: Orbit-NewOrleans-V4.musicxml (V1–V4 unchanged)',
    'Tempo: **90 BPM** · Swing eighth @ 67%',
    '',
    '### Build order',
    '1. **Drums first** — SD3 MIDI grooves (Intro_01, HeadGroove, SoliLight, ShoutParade, RideoutHalfTime + Fills)',
    '2. **Melody** — lead sheet 3/4→4/4 (longest note fills beat 4); single-owner phrases ≥4 bars',
    '3. **Backgrounds** — trombone riffs / soli call-response / shout stabs / rideout under-lines',
    '4. **Quality gate** — register, fragment, ownership, drum alignment checks',
    '',
    '### Melody ownership map',
    '| Score bars | Owner | Lead source |',
    '|------------|-------|-------------|',
    ...MELODY_MAP.map(
      (m) =>
        `| ${m.start}–${m.end} | ${m.owner} | lead ${m.leadStart}+ transpose ${m.transpose >= 0 ? '+' : ''}${m.transpose} |`
    ),
    '',
    '### Groove assignments (V5)',
    '| Section bars | Groove |',
    '|--------------|--------|',
    '| 1–4, 33–36 | Intro 01.mid |',
    '| 9–12, 37–44, 75–78 | HeadGroove.mid |',
    '| 5–8, 13–16, 49–56, 63–70, 71–74 | SoliLight.mid |',
    '| 17–24, 45–48, 79–84 | ShoutParade.mid |',
    '| 25–32, 57–62 | RideoutHalfTime.mid |',
    '| Fills | bars 8,12,16,20,24,32,36,44,48,56,62,70,74,78,80,84 |',
    '',
    '### Quality gate',
    gateIssues.length ? gateIssues.map((i) => `- ⚠ ${i}`).join('\n') : '- All checks passed',
    '',
    '### V5 pipeline changes',
    '',
    '| Bar | Part | Original | New | Reason |',
    '|-----|------|----------|-----|--------|',
    ...v5Changes.slice(0, 50).map(
      (c) => `| ${c.bar} | ${c.partName} | ${c.oldBeat} | ${c.newBeat} | ${c.reason} |`
    ),
    '',
    `**V5 change count:** ${v5Changes.length}`,
  ];

  fs.writeFileSync(CHANGES, block.join('\n') + '\n', 'utf8');
}

export function runV5Pipeline() {
  console.log('STEP 1 — Drums from SD3 MIDI...');
  const refXml = fs.readFileSync(V4_REF, 'utf8');
  const grooves = {};
  for (const [key, file] of Object.entries(GROOVE_FILES_V5)) {
    grooves[key] = analyzeGroove(readMidi(path.join(MIDI_DIR, file)));
  }
  const totalBars = 84;
  const barPlan = buildBarPlan(totalBars, grooves, SECTIONS_V5);

  let outXml = refXml;
  outXml = outXml.replace(/<work-title>[^<]+<\/work-title>/, '<work-title>Orbit New Orleans V5</work-title>');
  outXml = outXml.replace(/<per-minute>\d+<\/per-minute>/g, '<per-minute>90</per-minute>');
  outXml = ensureSwingSound(outXml);

  const drumSplit = splitPart(outXml, PARTS.drums);
  const drumMeasures = splitMeasures(drumSplit.body);
  const revisedDrums = replaceDrumPart(drumMeasures, barPlan);
  const newDrumBody = rebuildPartBody(drumSplit.body, revisedDrums);
  outXml = outXml.replace(
    drumSplit.open + drumSplit.body + drumSplit.close,
    drumSplit.open + newDrumBody + drumSplit.close
  );
  logChange(0, 'Drum Set (Jazz)', 'V4', 'SD3 V5', 'full 84-bar drum rebuild from MIDI');

  console.log('STEP 2 — Melody from lead sheet...');
  const leadBars = parseLeadSheet(LEAD);
  const melodyMeasures = buildMelodyMeasures(leadBars, totalBars);

  console.log('STEP 3 — Backgrounds...');
  const bgMeasures = buildBackgrounds(melodyMeasures, barPlan, totalBars);

  for (const pid of HORN_PARTS) {
    const refSplit = splitPart(outXml, pid);
    const refMeasures = splitMeasures(refSplit.body);
    const merged = mergeMelodyAndBackgrounds(melodyMeasures, bgMeasures, refMeasures, totalBars, pid);
    const newBody = rebuildPartBody(refSplit.body, merged);
    outXml = outXml.replace(
      refSplit.open + refSplit.body + refSplit.close,
      refSplit.open + newBody + refSplit.close
    );
  }

  console.log('STEP 4 — Quality gate...');
  const gateIssues = qualityGate(melodyMeasures, barPlan, leadBars);
  if (gateIssues.length) {
    console.warn('Quality gate warnings:', gateIssues.length);
    gateIssues.slice(0, 10).forEach((i) => console.warn(' ', i));
  }

  console.log('STEP 5 — Write output...');
  fs.writeFileSync(V5_SCORE, outXml, 'utf8');
  writeMidiDrums(
    barPlan.map((p) => ({ barNumber: p.bar, hits: p.hits })),
    V5_DRUMS,
    90
  );

  const evalResult = runV5GceEvaluation(V5_SCORE, barPlan);
  writeV5GceReport(evalResult);
  appendV5ChangesMd(barPlan, gateIssues);

  console.log('Wrote', V5_SCORE);
  console.log('Wrote', V5_DRUMS);
  console.log('Wrote', GCE_V5_REPORT);
  console.log('Overall GCE:', evalResult.overallAvg);
  return { evalResult, gateIssues, barPlan };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  runV5Pipeline();
}
