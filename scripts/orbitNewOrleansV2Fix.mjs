/**
 * Orbit New Orleans V2 — targeted GCE fixes + re-evaluation
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { runGceEvaluation } from './orbitGceEval.mjs';

const REV_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const V1 = path.join(REV_DIR, 'Orbit-NewOrleans-V1.musicxml');
const V2 = path.join(REV_DIR, 'Orbit-NewOrleans-V2.musicxml');
const CHANGES = path.join(REV_DIR, 'Orbit-Changes.md');
const GCE_V1_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report.md');
const GCE_V2_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V2.md');

const DIVISIONS = 256;
const BAR_LEN = 1024;
const EIGHTH = 128;

const PARTS = {
  alto: 'P1',
  tenor: 'P2',
  trumpet: 'P3',
  trombone: 'P4',
};

const v2Changes = [];
let activeChangeLog = v2Changes;

function logChange(bar, partName, oldBeat, newBeat, reason) {
  activeChangeLog.push({ bar, partName, oldBeat, newBeat, reason });
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

function restXml(dur, voice, instrumentId) {
  return `   <note default-x="15">\n    <rest />\n    <duration>${dur}</duration>\n    <instrument id="${instrumentId}" />\n    <voice>${voice}</voice>\n    <type>${typeForDuration(dur)}</type>\n    <staff>1</staff>\n   </note>\n`;
}

function setNoteDuration(xml, dur) {
  return xml.replace(/<duration>\d+<\/duration>/, `<duration>${dur}</duration>`).replace(
    /<type>[^<]+<\/type>/,
    `<type>${typeForDuration(dur)}</type>`
  );
}

function setNoteTime(events, ev, newTime) {
  ev.time = newTime;
  if (!ev.isRest) ev.beat = roundBeat(beatFromOffset(newTime));
}

function shiftOctaveDown(xml) {
  const m = xml.match(/<octave>(\d+)<\/octave>/);
  if (!m) return xml;
  const o = Math.max(0, parseInt(m[1], 10) - 1);
  return xml.replace(/<octave>\d+<\/octave>/, `<octave>${o}</octave>`);
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

function enrichPitched(events) {
  return events.filter((e) => !e.isRest && e.midi != null);
}

function findParallelTromboneIndices(tpt, tbn) {
  const shift = new Set();
  const tp = enrichPitched(tpt);
  const tb = enrichPitched(tbn);

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

function applyOctaveShiftToTrombone(tbnEvents, toShift, bar) {
  return tbnEvents.map((ev) => {
    if (!toShift.has(ev)) return ev;
    const oldMidi = ev.midi;
    const newXml = shiftOctaveDown(ev.xml);
    const newMidi = pitchToMidi(newXml);
    logChange(
      bar,
      'Trombone',
      beatStr(ev.beat ?? beatFromOffset(ev.time)),
      beatStr(ev.beat ?? beatFromOffset(ev.time)),
      `parallel 5th — trombone octave down (${oldMidi}→${newMidi})`
    );
    return { ...ev, xml: newXml, midi: newMidi };
  });
}

function fixParallelBars(measuresTpt, measuresTbn, bars) {
  for (const bar of bars) {
    const mt = measuresTpt.get(bar);
    const mb = measuresTbn.get(bar);
    if (!mt || !mb) continue;
    const pt = parseMeasureTimeline(mt.inner);
    const pb = parseMeasureTimeline(mb.inner);
    for (const e of pt.events) {
      if (!e.isRest) {
        e.midi = pitchToMidi(e.xml);
        e.beat = roundBeat(beatFromOffset(e.time));
      }
    }
    for (const e of pb.events) {
      if (!e.isRest) {
        e.midi = pitchToMidi(e.xml);
        e.beat = roundBeat(beatFromOffset(e.time));
      }
    }
    let shift = findParallelTromboneIndices(pt.events, pb.events);
    if (shift.size === 0) continue;
    pb.events = applyOctaveShiftToTrombone(pb.events, shift, bar);

    // second pass: break remaining simultaneous 5ths with 8th shift
    for (const e of pb.events) {
      if (e.isRest || e.isChord) continue;
      e.midi = pitchToMidi(e.xml);
      e.beat = roundBeat(beatFromOffset(e.time));
    }
    for (const t of enrichPitched(pt.events)) {
      for (const b of enrichPitched(pb.events)) {
        if (Math.abs(t.beat - b.beat) > 0.06) continue;
        if (intervalBetween(t.midi, b.midi) !== 7) continue;
        const old = beatStr(b.beat);
        setNoteTime(b, b, b.time + EIGHTH);
        logChange(bar, 'Trombone', old, beatStr(b.beat), 'parallel 5th — trombone +8th shift');
      }
    }

    measuresTbn.set(bar, {
      attrs: mb.attrs,
      inner: rebuildMeasure(pb.prefix, pb.events, BAR_LEN, 'P4-I1'),
    });
  }
}

function fixBrassBeat3(measures, bars, partId, partName) {
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
        setNoteTime(ev, ev, offsetFromBeat(2.5));
        logChange(bar, partName, old, '2&', 'rideout brass beat 3 → & of 2');
        changed = true;
      }
    }
    if (changed) {
      measures.set(bar, {
        attrs: m.attrs,
        inner: rebuildMeasure(prefix, events, BAR_LEN, `${partId}-I1`),
      });
    }
  }
}

function fixTromboneStacks(measures, bars) {
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
        setNoteTime(ev, ev, offsetFromBeat(4));
        logChange(bar, 'Trombone', old, '4', 'final bars trombone stack → beat 4');
        changed = true;
      } else if (onBeat(ev.beat, 3.5)) {
        const old = beatStr(ev.beat);
        setNoteTime(ev, ev, offsetFromBeat(4.5));
        logChange(bar, 'Trombone', old, '4&', 'final bars trombone stack → & of 4');
        changed = true;
      }
    }
    if (changed) {
      measures.set(bar, {
        attrs: m.attrs,
        inner: rebuildMeasure(prefix, events, BAR_LEN, 'P4-I1'),
      });
    }
  }
}

function fixBar12TrumpetEnding(measures) {
  const m = measures.get(12);
  if (!m) return;
  const { prefix, events } = parseMeasureTimeline(m.inner);
  const pitched = events.filter((e) => !e.isRest && !e.isChord && pitchToMidi(e.xml) != null);
  if (!pitched.length) return;
  const last = pitched.reduce((a, b) => (a.time >= b.time ? a : b));
  const old = beatStr(last.beat ?? beatFromOffset(last.time));
  setNoteTime(last, last, offsetFromBeat(4.5));
  logChange(12, 'Trumpet', old, '4&', 'bar 12 phrase ending → & of 4');
  measures.set(12, {
    attrs: m.attrs,
    inner: rebuildMeasure(prefix, events, BAR_LEN, 'P3-I1'),
  });
}

function fixSaxConsolidation(measures, bars, partId, partName) {
  for (const bar of bars) {
    const m = measures.get(bar);
    if (!m) continue;
    const { prefix, events } = parseMeasureTimeline(m.inner);
    const pitched = events
      .filter((e) => !e.isRest && !e.isChord)
      .map((e) => {
        e.beat = roundBeat(beatFromOffset(e.time));
        return e;
      })
      .sort((a, b) => a.time - b.time);

    const remove = new Set();
    for (let i = 0; i < pitched.length - 1; i++) {
      const a = pitched[i];
      const b = pitched[i + 1];
      const aOn35 = onBeat(a.beat, 3.5);
      const bOn4 = onBeat(b.beat, 4);
      if (!aOn35 || !bOn4) continue;
      if (b.time < a.time + a.dur - 8) continue;
      a.dur += b.dur;
      a.xml = setNoteDuration(a.xml, a.dur);
      remove.add(b);
      logChange(bar, partName, `${beatStr(a.beat)}+${beatStr(b.beat)}`, beatStr(a.beat), 'sax tie across 3&–4');
    }
    if (!remove.size) continue;
    const kept = events.filter((e) => !remove.has(e));
    measures.set(bar, {
      attrs: m.attrs,
      inner: rebuildMeasure(prefix, kept, BAR_LEN, `${partId}-I1`),
    });
  }
}

export function applyV2Fixes(xml, options = {}) {
  activeChangeLog = options.changeLog ?? v2Changes;
  const extraParallel = options.extraParallelRanges ?? [];

  let out = xml;
  const tptSplit = splitPart(out, PARTS.trumpet);
  const tbnSplit = splitPart(out, PARTS.trombone);
  const altoSplit = splitPart(out, PARTS.alto);
  const tenSplit = splitPart(out, PARTS.tenor);

  const measuresTpt = splitMeasures(tptSplit.body);
  const measuresTbn = splitMeasures(tbnSplit.body);
  const measuresAlto = splitMeasures(altoSplit.body);
  const measuresTen = splitMeasures(tenSplit.body);

  // FIX 1
  fixParallelBars(measuresTpt, measuresTbn, range(49, 56));
  // FIX 5 (+ optional V3 bars 25–30)
  fixParallelBars(measuresTpt, measuresTbn, [
    ...range(37, 44),
    ...range(57, 70),
    ...extraParallel,
  ]);
  // FIX 2
  fixBrassBeat3(measuresTpt, range(25, 32), PARTS.trumpet, 'Trumpet');
  fixBrassBeat3(measuresTbn, range(25, 32), PARTS.trombone, 'Trombone');
  // FIX 3
  fixTromboneStacks(measuresTbn, range(81, 84));
  // FIX 4
  fixBar12TrumpetEnding(measuresTpt);
  // FIX 6
  fixSaxConsolidation(measuresAlto, range(25, 32), PARTS.alto, 'Alto Saxophone');
  fixSaxConsolidation(measuresTen, range(25, 32), PARTS.tenor, 'Tenor Saxophone');

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

function range(a, b) {
  return [...Array(b - a + 1)].map((_, i) => a + i);
}

function parseV1ScoresFromReport(reportPath) {
  if (!fs.existsSync(reportPath)) return new Map();
  const text = fs.readFileSync(reportPath, 'utf8');
  const map = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^\| (.+?) \| (\d+–\d+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| \*\*([\d.]+)\*\* \|$/);
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

function appendChangesLog() {
  let existing = fs.readFileSync(CHANGES, 'utf8');
  const marker = '## V2 manual fixes';
  if (existing.includes(marker)) {
    existing = existing.slice(0, existing.indexOf(marker)).replace(/\n---\n\n$/, '\n');
  }
  const block = [
    existing.trimEnd(),
    '',
    '---',
    '',
    `## V2 manual fixes (${new Date().toISOString().slice(0, 10)})`,
    '',
    'Output: **Orbit-NewOrleans-V2.musicxml** (V1 unchanged)',
    '',
    '| Bar | Part | Original beat | New beat | Reason |',
    '|-----|------|---------------|----------|--------|',
    ...v2Changes.map(
      (c) => `| ${c.bar} | ${c.partName} | ${c.oldBeat} | ${c.newBeat} | ${c.reason} |`
    ),
    '',
    `**V2 fix count:** ${v2Changes.length}`,
  ];
  fs.writeFileSync(CHANGES, block.join('\n') + '\n', 'utf8');
}

function writeV2GceReport(v2Results, v1ScoreMap, v1OverallAvg, v2OverallAvg) {
  const shout = v2Results.filter((r) => r.label.includes('Shout'));
  const verse = v2Results.filter((r) => r.label.includes('Melody Head'));
  const shoutAvg =
    shout.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    shout.length;
  const verseAvg =
    verse.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    verse.length;

  const lines = [];
  lines.push('# Orbit New Orleans V2 — GCE Evaluation Report');
  lines.push('');
  lines.push(`File: Orbit-NewOrleans-V2.musicxml · Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(
    `**Overall form average: ${v2OverallAvg}/10** (V1: ${v1OverallAvg}/10, Δ ${(v2OverallAvg - v1OverallAvg).toFixed(1)})`
  );
  lines.push(
    `Shout vs verse accent ratio: **${(shoutAvg / Math.max(0.1, verseAvg)).toFixed(1)}×** — ${shoutAvg > verseAvg ? 'YES shout stronger' : 'NO'}`
  );
  lines.push('');

  lines.push('## Section scores (V2)');
  lines.push('');
  lines.push('| Section | Bars | Brass | Sax | Parallel | Balance | **Overall** |');
  lines.push('|---------|------|-------|-----|----------|---------|-------------|');
  for (const r of v2Results) {
    lines.push(
      `| ${r.label} | ${r.range} | ${r.brassScore} | ${r.saxScore} | ${r.parallelScore} | ${r.balanceScore.toFixed(1)} | **${r.overall}** |`
    );
  }
  lines.push('');

  lines.push('## V1 vs V2 comparison');
  lines.push('');
  lines.push('| Section | V1 Overall | V2 Overall | Δ | V1 Parallel | V2 Parallel |');
  lines.push('|---------|------------|------------|---|-------------|-------------|');
  for (const r of v2Results) {
    const v1 = v1ScoreMap.get(r.label);
    const v1o = v1?.overall ?? '—';
    const v1p = v1?.parallelScore ?? '—';
    const delta = v1 ? r.overall - v1.overall : 0;
    const deltaPrefix = delta > 0 ? '+' : '';
    lines.push(
      `| ${r.label} | ${v1o} | **${r.overall}** | ${v1 ? deltaPrefix + delta.toFixed(1) : '—'} | ${v1p} | ${r.parallelScore} |`
    );
  }
  lines.push('');

  const manual = v2Results.filter((r) => r.overall < 6);
  lines.push('## Manual Sibelius review — V2 (overall < 6)');
  lines.push('');
  if (!manual.length) {
    lines.push('None — all sections scored ≥ 6 overall.');
  } else {
    for (const r of manual) {
      lines.push(`### ${r.label} (bars ${r.range}) — **${r.overall}/10**`);
      if (r.brassIssues.length) {
        lines.push(
          '- Brass weak: ' +
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

  lines.push('## V2 fixes applied');
  lines.push('');
  lines.push('1. Bars 49–56 — parallel 5ths: trombone octave down');
  lines.push('2. Bars 25–32 — brass beat 3 → & of 2');
  lines.push('3. Bars 81–84 — trombone beat 3/3& → 4/4&');
  lines.push('4. Bar 12 — trumpet ending → & of 4');
  lines.push('5. Bars 37–44, 57–70 — parallel 5ths: trombone octave down');
  lines.push('6. Bars 25–32 — sax 3&+4 tied to quarter notes');
  lines.push('');

  fs.writeFileSync(GCE_V2_REPORT, lines.join('\n'), 'utf8');
}

// ─── main ───
const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
console.log('Reading V1...');
const v1Xml = fs.readFileSync(V1, 'utf8');
const v2Xml = applyV2Fixes(v1Xml);
fs.writeFileSync(V2, v2Xml, 'utf8');
console.log('Wrote', V2);

appendChangesLog();
console.log('Appended', v2Changes.length, 'changes to Orbit-Changes.md');

const v1Eval = runGceEvaluation(V1);
const v1ScoreMap = new Map(v1Eval.results.map((r) => [r.label, r]));
const { results: v2Results, overallAvg: v2Overall } = runGceEvaluation(V2);
writeV2GceReport(v2Results, v1ScoreMap, v1Eval.overallAvg, v2Overall);

console.log('Wrote', GCE_V2_REPORT);
console.log('V2 changes:', v2Changes.length);
console.log('V2 overall:', v2Overall);
for (const r of v2Results) {
  const v1 = v1ScoreMap.get(r.label);
  console.log(r.label, 'V1', v1?.overall ?? '?', '→ V2', r.overall, 'parallel', v1?.parallelScore, '→', r.parallelScore);
}
}
