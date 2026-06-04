import fs from 'fs';
import path from 'path';

const SCORE = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-BB-Suite-V2 1.musicxml';
const MIDI_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\New Orleans Orbit Beats';
const OUT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const PLAN = path.join(OUT_DIR, 'Orbit-NewOrleans-Plan.md');

const MIDI_FILES = [
  'Intro 01.mid',
  'Verse1 .mid',
  'Pre Chorus 01.mid',
  'Chorus1.mid',
  'Bridge 01.mid',
  'Fills 01.mid',
  'Fills 03.mid',
  'Fills 05.mid',
];

function readScore() {
  return fs.readFileSync(SCORE, 'utf8');
}

function getPartIds(xml) {
  const parts = {};
  for (const m of xml.matchAll(/<score-part id="([^"]+)"[\s\S]*?<part-name>([^<]+)<\/part-name>/g)) {
    parts[m[1]] = m[1];
    parts[m[1]] = m[2];
  }
  return parts;
}

function parsePart(xml, partId) {
  const re = new RegExp(`<part id="${partId}">([\\s\\S]*?)</part>`, 'm');
  const m = xml.match(re);
  return m ? m[1] : '';
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
  const kindVal = block.match(/<kind>([^<]+)<\/kind>/);
  const bassStep = block.match(/<bass-step>([^<]+)<\/bass-step>/);
  const bassAlter = block.match(/<bass-alter>(-?\d+)<\/bass-alter>/);
  let sym = root;
  const k = kindText ? kindText[1] : kindVal ? kindVal[1] : '';
  if (k && !k.match(/major$/i)) sym += k.startsWith('minor') ? 'm' : k;
  if (bassStep) {
    let bs = bassStep[1];
    if (bassAlter) {
      const a = parseInt(bassAlter[1], 10);
      if (a === -1) bs += 'b';
      else if (a === 1) bs += '#';
    }
    if (bs !== root[0]) sym += `/${bs}`;
  }
  return sym;
}

function analyzeMeasures(partXml) {
  const chunks = partXml.split(/<!--============== Part:[^=]+Measure: (\d+) ==============-->/);
  const measures = {};
  for (let i = 1; i < chunks.length; i += 2) {
    const num = parseInt(chunks[i], 10);
    measures[num] = chunks[i + 1] || '';
  }
  return measures;
}

function extractSectionsFromP1(p1) {
  const measures = analyzeMeasures(p1);
  const nums = Object.keys(measures).map(Number).sort((a, b) => a - b);
  const markers = [];
  for (const n of nums) {
    const m = measures[n].match(/enclosure="rectangle"[^>]*>([^<]+)<\/words>/);
    if (m) markers.push({ bar: n, label: m[1].trim() });
  }
  const sections = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].bar;
    const end = i + 1 < markers.length ? markers[i + 1].bar - 1 : nums[nums.length - 1];
    sections.push({ label: markers[i].label, startBar: start, endBar: end });
  }
  return { sections, totalBars: nums[nums.length - 1], measures };
}

function chordsByBar(measures, maxBar) {
  const out = {};
  for (let b = 1; b <= maxBar; b++) {
    const chunk = measures[b];
    if (!chunk) continue;
    const blocks = [...chunk.matchAll(/<harmony[\s\S]*?<\/harmony>/g)];
    for (const bl of blocks) {
      const sym = parseHarmonyBlock(bl[0]);
      if (sym) {
        if (!out[b]) out[b] = [];
        if (!out[b].includes(sym)) out[b].push(sym);
      }
    }
  }
  return out;
}

function compressChordSeq(chords, start, end) {
  const items = [];
  for (let b = start; b <= end; b++) {
    if (chords[b]) items.push({ bar: b, sym: chords[b].join(' ') });
  }
  const compressed = [];
  for (const it of items) {
    const prev = compressed[compressed.length - 1];
    if (prev && prev.sym === it.sym) prev.endBar = it.bar;
    else compressed.push({ startBar: it.bar, endBar: it.bar, sym: it.sym });
  }
  return compressed;
}

function parseNotesInBar(chunk, divisionsDefault = 256) {
  let divisions = divisionsDefault;
  const d = chunk.match(/<divisions>(\d+)<\/divisions>/);
  if (d) divisions = parseInt(d[1], 10);
  const barLen = divisions * 4;
  let offset = 0;
  const notes = [];
  for (const np of chunk.split(/<note>/).slice(1)) {
    const rest = np.includes('<rest');
    const chord = np.includes('<chord');
    const durM = np.match(/<duration>(\d+)<\/duration>/);
    const typeM = np.match(/<type>([^<]+)<\/type>/);
    const accent = np.includes('<accent');
    if (!rest && typeM && !chord) {
      const beat = 1 + (offset / divisions);
      notes.push({ offset, beat: Math.round(beat * 4) / 4, type: typeM[1], accent });
    }
    if (durM && !chord) {
      let dur = parseInt(durM[1], 10);
      if (np.includes('<dot')) dur = Math.round(dur * 1.5);
      offset += dur;
    }
  }
  return { notes, divisions, barLen };
}

function analyzePartRange(measures, start, end) {
  const all = [];
  for (let b = start; b <= end; b++) {
    const chunk = measures[b];
    if (!chunk) continue;
    const { notes } = parseNotesInBar(chunk);
    for (const n of notes) all.push({ bar: b, ...n });
  }
  return all;
}

function punchSummary(notes) {
  const punches = notes.filter((n) => n.type === 'quarter' || (n.type === 'eighth' && n.accent));
  const byBar = {};
  for (const p of punches) {
    const k = p.bar;
    if (!byBar[k]) byBar[k] = [];
    byBar[k].push(p.beat);
  }
  return Object.entries(byBar)
    .map(([bar, beats]) => ({ bar: +bar, beats: [...new Set(beats.map((x) => Math.round(x * 4) / 4))].sort((a, b) => a - b) }))
    .slice(0, 16);
}

function saxSwingProfile(notes) {
  const eighths = notes.filter((n) => n.type === 'eighth');
  const quarters = notes.filter((n) => n.type === 'quarter' || n.type === 'half');
  const ratio = eighths.length / Math.max(1, quarters.length + eighths.length);
  let verdict = 'balanced';
  if (ratio > 0.72) verdict = 'heavy swing 8ths — needs NOLA straight/syncopated rewrite';
  else if (ratio > 0.55) verdict = 'moderate 8th activity — selective bar syncopation';
  return { eighthCount: eighths.length, quarterCount: quarters.length, ratio: ratio.toFixed(2), verdict };
}

function drumSectionProfile(measures, start, end) {
  let hits = 0;
  let bars = 0;
  const beatHits = { 1: 0, 2: 0, 3: 0, 4: 0, synco: 0 };
  for (let b = start; b <= end; b++) {
    const chunk = measures[b];
    if (!chunk) continue;
    bars++;
    const { notes } = parseNotesInBar(chunk);
    for (const n of notes) {
      hits++;
      const whole = Math.floor(n.beat);
      if (n.beat % 1 === 0 && whole >= 1 && whole <= 4) beatHits[whole]++;
      else beatHits.synco++;
    }
  }
  const dpb = bars ? hits / bars : 0;
  let character = 'medium swing ride pattern';
  if (dpb < 6) character = 'sparse — long rests, minimal kit';
  else if (dpb > 14) character = 'busy — constant snare/ride chatter';
  return { hits, bars, densityPerBar: dpb.toFixed(1), beatHits, character };
}

// MIDI parser (same as before)
function readMidiBuffer(buf) {
  let pos = 0;
  function readStr(n) {
    const s = buf.toString('ascii', pos, pos + n);
    pos += n;
    return s;
  }
  function readU32() {
    const v = buf.readUInt32BE(pos);
    pos += 4;
    return v;
  }
  function readU16() {
    const v = buf.readUInt16BE(pos);
    pos += 2;
    return v;
  }
  function readVLQ() {
    let v = 0;
    while (true) {
      const b = buf[pos++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  }
  if (readStr(4) !== 'MThd') throw new Error('Not MIDI');
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
        events.push({ tick, type: cmd === 0x90 && vel > 0 ? 'on' : 'off', note, vel, ch: b & 0x0f });
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
  return { ticksPerBeat, tracks };
}

function analyzeMidi(filePath) {
  const buf = fs.readFileSync(filePath);
  const { ticksPerBeat, tracks } = readMidiBuffer(buf);
  const all = tracks.flat().sort((a, b) => a.tick - b.tick);
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
  const maxTick = Math.max(...all.filter((e) => e.tick).map((e) => e.tick), 0);
  const loopBars = Math.max(1, Math.round(maxTick / ticksPerBar));

  const PERC = new Set([35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57]);
  const SNARE = new Set([38, 40]);
  const noteOns = all.filter((e) => e.type === 'on' && e.vel > 0);
  const snareHits = noteOns.filter((e) => SNARE.has(e.note));
  const percHits = noteOns.filter((e) => PERC.has(e.note));

  function beatPositions(hits) {
    const strong = hits.filter((h) => h.vel >= 70);
    const use = strong.length ? strong : hits;
    const beats = use.map((h) => {
      const pos = (h.tick % ticksPerBar) / ticksPerBeat + 1;
      return Math.round(pos * 4) / 4;
    });
    return [...new Set(beats)].sort((a, b) => a - b);
  }

  const snareAccents = beatPositions(snareHits);
  const densityScore = noteOns.length / loopBars;
  let density = 'medium';
  if (densityScore < 14) density = 'sparse';
  else if (densityScore > 28) density = 'dense';

  const name = path.basename(filePath).toLowerCase();
  let character = 'time';
  if (name.includes('intro')) character = 'setup';
  else if (name.includes('chorus')) character = density === 'dense' ? 'climax' : 'lift';
  else if (name.includes('pre')) character = 'lift';
  else if (name.includes('bridge')) character = 'transition';
  else if (name.includes('fill')) character = 'transition';
  else if (name.includes('verse')) character = 'time';

  return { file: path.basename(filePath), tempo, timeSignature: `${tsNum}/${tsDen}`, loopBars, snareAccents, totalNoteOns: noteOns.length, percHits: percHits.length, density, character };
}

// NOLA 2nd line clave reference beats (4/4): strong on 2, 4, and syncopated 4&
const CLAVE_STRONG = [2, 4];

function conflictsWithClave(punchBeats) {
  // brass on beat 3 or 4& when snare backbeat wants space; also beat 2 off-grid
  return punchBeats.filter((b) => {
    const frac = b % 1;
    return b === 3 || b === 2.5 || b === 4.5 || (b === 4 && frac === 0) || b === 1.5;
  });
}

function buildPlan(scoreData, midis) {
  const lines = [];
  lines.push('# Orbit — New Orleans Groove Revision Plan');
  lines.push('');
  lines.push('Source: `Orbit-BB-Suite-V2 1.musicxml` · SD3 grooves in `New Orleans Orbit Beats` · Plan date 2026-05-31');
  lines.push('');

  lines.push('## 1. Score summary (sections + bar ranges + tempo)');
  lines.push('');
  lines.push(`1. **Tempo marking:** quarter = **${scoreData.tempo} BPM** (metronome in score; SD3 MIDI grooves are **~88–90 BPM** — tempo alignment required before SD3 import).`);
  lines.push(`2. **Total length:** **${scoreData.totalBars} bars**, 4/4 throughout.`);
  lines.push(`3. **Form arc:** two key areas — **F major** bars 1–32, **A major** from bar 33.`);
  lines.push('4. **Section map (rehearsal labels on score):**');
  for (const s of scoreData.sections) {
    lines.push(`   - **${s.label}** — bars **${s.startBar}–${s.endBar}** (${s.endBar - s.startBar + 1} bars)`);
  }
  lines.push('5. **Chord summary by section:**');
  for (const s of scoreData.sections) {
    const seq = s.chords.map((c) => `bars ${c.startBar}${c.endBar > c.startBar ? `–${c.endBar}` : ''}: ${c.sym}`).join('; ');
    lines.push(`   - **${s.label} (${s.startBar}–${s.endBar}):** ${seq || '(no harmony symbols in piano staff — check condensed score)'}`);
  }
  lines.push('6. **Brass punch rhythm (Trumpet / Trombone) — accent hits by bar:**');
  for (const s of scoreData.sections) {
    const tp = s.trumpet.length ? s.trumpet.map((p) => `bar ${p.bar} beats [${p.beats.join(', ')}]`).join('; ') : 'none';
    const tb = s.trombone.length ? s.trombone.map((p) => `bar ${p.bar} beats [${p.beats.join(', ')}]`).join('; ') : 'none';
    lines.push(`   - **${s.label} (${s.startBar}–${s.endBar})** — Tpt: ${tp}`);
    lines.push(`     — Tbn: ${tb}`);
  }
  lines.push('7. **Drum notation character (written kit):**');
  for (const s of scoreData.sections) {
    lines.push(`   - **${s.label} (${s.startBar}–${s.endBar}):** ${s.drums.character} (~${s.drums.densityPerBar} hits/bar; beat spread 1:${s.drums.beatHits[1]} 2:${s.drums.beatHits[2]} 3:${s.drums.beatHits[3]} 4:${s.drums.beatHits[4]} synco:${s.drums.beatHits.synco})`);
  }
  lines.push('');

  lines.push('## 2. MIDI groove analysis (per file)');
  lines.push('');
  midis.forEach((m, i) => {
    lines.push(`${i + 1}. **${m.file}**`);
    lines.push(`   - Loop: **${m.loopBars} bars** · **${m.timeSignature}** · **${m.tempo} BPM**`);
    lines.push(`   - Snare accent beats (strong vel ≥70 or all snare): **${m.snareAccents.length ? m.snareAccents.join(', ') : 'none on GM 38/40 — check SD3 map / toms as backbeat'}**`);
    lines.push(`   - Density: **${m.density}** (${m.totalNoteOns} note-ons / ${m.loopBars} bars)`);
    lines.push(`   - Character: **${m.character}**`);
    lines.push('');
  });

  lines.push('## 3. Groove map (bar-by-bar assignments)');
  lines.push('');
  lines.push('**Mapping logic:** SD3 loops are 8 bars @ ~89 BPM. Score form uses functional labels (Intro / Melody Head ≈ verse / Soli ≈ pre-chorus lift / Shout ≈ chorus / Solo / Rideout ≈ bridge+outro). Fills at section seams and every 8-bar phrase turn.');
  lines.push('');

  const map = [
    { bars: '1–4', section: 'Intro', groove: 'Intro 01.mid', fill: 'none (setup)' },
    { bars: '5–8', section: 'Soli Chorus', groove: 'Pre Chorus 01.mid', fill: 'Fills 01.mid @ bar 8' },
    { bars: '9–12', section: 'Melody Head', groove: 'Verse1 .mid', fill: 'Fills 03.mid @ bar 12' },
    { bars: '13–16', section: 'Solo Section', groove: 'Verse1 .mid (sparse ride)', fill: 'Fills 01.mid @ bar 16' },
    { bars: '17–24', section: 'Shout Chorus', groove: 'Chorus1.mid', fill: 'Fills 05.mid @ bars 20 & 24' },
    { bars: '25–32', section: 'Rideout', groove: 'Bridge 01.mid', fill: 'Fills 05.mid @ bar 32 (into key change)' },
    { bars: '33–36', section: 'Intro (A)', groove: 'Intro 01.mid', fill: 'Fills 01.mid @ bar 36' },
    { bars: '37–44', section: 'Melody Head (A)', groove: 'Verse1 .mid', fill: 'Fills 03.mid @ bar 44' },
    { bars: '45–48', section: 'Shout Chorus (A)', groove: 'Chorus1.mid', fill: 'Fills 05.mid @ bar 48' },
    { bars: '49–56', section: 'Soli Chorus (A)', groove: 'Pre Chorus 01.mid', fill: 'Fills 03.mid @ bar 56' },
    { bars: '57–62', section: 'Rideout (A)', groove: 'Bridge 01.mid', fill: 'Fills 01.mid @ bar 62' },
    { bars: '63–70', section: 'Soli Chorus (A2)', groove: 'Pre Chorus 01.mid', fill: 'Fills 03.mid @ bar 70' },
    { bars: '71–74', section: 'Solo Section (A2)', groove: 'Verse1 .mid', fill: 'Fills 01.mid @ bar 74' },
    { bars: '75–78', section: 'Melody Head (A2)', groove: 'Verse1 .mid', fill: 'Fills 03.mid @ bar 78' },
    { bars: '79–84', section: 'Shout Chorus (final)', groove: 'Chorus1.mid', fill: 'Fills 05.mid @ bars 80, 84 (tag)' },
  ];

  map.forEach((row, i) => {
    lines.push(`${i + 1}. **Bars ${row.bars} — ${row.section}**`);
    lines.push(`   - Groove: **${row.groove}** (loop bars 1–8 as needed)`);
    lines.push(`   - Fill: **${row.fill}**`);
  });
  lines.push('');
  lines.push('**Reasoning highlights:**');
  lines.push('- Intro 01 = sparse setup; matches empty/rest Intro bars 1–4 and pickup bar 33.');
  lines.push('- Verse1 = steady second-line time; maps to Melody Head + Solo backgrounds.');
  lines.push('- Pre Chorus 01 = rising snare density; maps to Soli Chorus lifts before/after shout.');
  lines.push('- Chorus1 = peak backbeat; all Shout Chorus sections.');
  lines.push('- Bridge 01 = transition texture; Rideout bars and key-change connector.');
  lines.push('- Fills 01 = short 1-bar turn; Fills 03 = medium; Fills 05 = long climax fill.');
  lines.push('');

  lines.push('## 4. Where notation must change (brass, sax, drums)');
  lines.push('');
  lines.push('**Second-line clave reference:** treat snare backbeat on **beats 2 & 4** plus **& of 4** as sacred. Brass punches on **beat 3**, **& of 2**, or **downbeat 4** fight the groove.');
  lines.push('');

  for (const s of scoreData.sections) {
    lines.push(`### ${s.label} (bars ${s.startBar}–${s.endBar})`);
    const flags = [];
    for (const p of s.trumpet) {
      const bad = conflictsWithClave(p.beats);
      if (bad.length) flags.push(`1. **Trumpet bar ${p.bar}:** hits on [${p.beats.join(', ')}] — move off ${bad.join(', ')} to beat 1 or & of 1 (NOLA push).`);
    }
    for (const p of s.trombone) {
      const bad = conflictsWithClave(p.beats);
      if (bad.length) flags.push(`2. **Trombone bar ${p.bar}:** hits on [${p.beats.join(', ')}] — relocate syncopation to 1+ or 2+ (answer backbeat).`);
    }
    if (s.alto.verdict.includes('heavy') || s.alto.verdict.includes('moderate')) {
      flags.push(`3. **Alto sax:** ${s.alto.verdict} (bars ${s.startBar}–${s.endBar}; ${s.alto.eighthCount} eighths) — rewrite running 8ths to quarter/quarter-rest or triplet-feel pairs on beats 1 and 3+.`);
    }
    if (s.tenor.verdict.includes('heavy') || s.tenor.verdict.includes('moderate')) {
      flags.push(`4. **Tenor sax:** ${s.tenor.verdict} (bars ${s.startBar}–${s.endBar}; ${s.tenor.eighthCount} eighths) — same adjustment; keep shout sections on short hits only.`);
    }
    if (s.label.includes('Shout')) {
      flags.push(`5. **Shout figures:** verify ensemble hits land **bar ${s.startBar} beat 1**, **mid-bar & of 2**, not beat 4 downbeats — reposition any bar-4 stack to bar+1 beat 1 for second-line lift.`);
    }
    const transitions = [];
    if (s.endBar === 4 || s.endBar === 8 || s.endBar === 12 || s.endBar === 16 || s.endBar === 24 || s.endBar === 32) transitions.push(`critical fill at bar ${s.endBar}`);
    if (s.endBar === 36 || s.endBar === 44 || s.endBar === 48 || s.endBar === 56 || s.endBar === 62 || s.endBar === 70 || s.endBar === 74 || s.endBar === 78 || s.endBar === 84) transitions.push(`critical fill at bar ${s.endBar}`);
    if (transitions.length) flags.push(`6. **Transition:** ${transitions[0]} — written drum fill + hold brass 1 bar.`);

    if (s.drums.character.includes('swing')) {
      flags.push(`7. **Drums:** replace swing ride with SD3 groove map; written kit currently **${s.drums.character}** — not NOLA second-line.`);
    }

    if (flags.length === 0) flags.push('1. No auto-detected punch conflicts — manual pass still required.');
    flags.forEach((f) => lines.push(f));
    lines.push('');
  }

  lines.push('## 5. Recommended workflow (practical next steps)');
  lines.push('');
  lines.push('1. **Tempo decision:** either retime score **120 → 90 BPM** (preferred for SD3) or time-stretch SD3 grooves +96133% — pick one before editing.');
  lines.push('2. **Lock section map** above in Sibelius rehearsal marks (already present — verify bar 33 Intro and bar 61 duplicate Rideout label).');
  lines.push('3. **Import SD3 MIDI** to drum track per §3 map; bounce 8-bar loops to score regions.');
  lines.push('4. **Brass pass:** for each flagged bar in §4, nudge punches to 1+ / 2+ / 4& only; keep shout stacks on 1 and &2.');
  lines.push('5. **Sax pass:** Melody Head + Solo sections — replace swing 8th lines with quarter-note syncopation + rests; leave Shout as short accented quarters.');
  lines.push('6. **Fill overdub:** drop Fills 01/03/05 one bar before each section change (bar numbers in §3).');
  lines.push('7. **Playtest loop:** bars 17–24 and 79–84 with Chorus1 + brass muted — groove must feel before re-adding punches.');
  lines.push('8. **Export check:** re-export MusicXML only after manual QA; do not batch-replace until groove sits.');
  lines.push('');

  return lines.join('\n');
}

// Main
const xml = readScore();
const partIds = getPartIds(xml);
const idByName = Object.fromEntries(Object.entries(partIds).map(([k, v]) => [v, k]));

const p1 = parsePart(xml, idByName['Alto Saxophone']);
const p5 = parsePart(xml, idByName['Piano']);
const p3 = parsePart(xml, idByName['Trumpet']);
const p4 = parsePart(xml, idByName['Trombone']);
const p7 = parsePart(xml, idByName['Drum Set (Jazz)']);

const { sections, totalBars, measures: p1m } = extractSectionsFromP1(p1);
const pianoM = analyzeMeasures(p5);
const trumpetM = analyzeMeasures(p3);
const tromboneM = analyzeMeasures(p4);
const drumM = analyzeMeasures(p7);

const tempoMatch = xml.match(/<per-minute>(\d+)<\/per-minute>/);
const tempo = tempoMatch ? parseInt(tempoMatch[1], 10) : 120;

const chords = chordsByBar(pianoM, totalBars);

const scoreData = {
  tempo,
  totalBars,
  sections: sections.map((s) => {
    const tn = analyzePartRange(trumpetM, s.startBar, s.endBar);
    const tb = analyzePartRange(tromboneM, s.startBar, s.endBar);
    const alto = analyzePartRange(p1m, s.startBar, s.endBar);
    const tenorM = analyzeMeasures(parsePart(xml, idByName['Tenor Saxophone']));
    const ten = analyzePartRange(tenorM, s.startBar, s.endBar);
    return {
      ...s,
      chords: compressChordSeq(chords, s.startBar, s.endBar),
      trumpet: punchSummary(tn),
      trombone: punchSummary(tb),
      alto: saxSwingProfile(alto),
      tenor: saxSwingProfile(ten),
      drums: drumSectionProfile(drumM, s.startBar, s.endBar),
    };
  }),
};

const midis = MIDI_FILES.map((f) => analyzeMidi(path.join(MIDI_DIR, f)));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const plan = buildPlan(scoreData, midis);
fs.writeFileSync(PLAN, plan, 'utf8');
fs.writeFileSync(path.join(OUT_DIR, '_analysis_raw.json'), JSON.stringify({ scoreData, midis }, null, 2));
console.log('Wrote', PLAN);
console.log('Sections:', scoreData.sections.length);
