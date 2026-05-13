/**
 * Full big band score: V2.2 - Sunfall-SCORE.musicxml
 * Reads harmony from projects/Orbit/Sunfall/V2.2 - Sunfall.musicxml
 * Run: node scripts/writeSunfallV22FullScoreMusicXml.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEAD = path.join(ROOT, 'projects', 'Orbit', 'Sunfall', 'V2.2 - Sunfall.musicxml');
const OUT = path.join(ROOT, 'projects', 'Orbit', 'Sunfall', 'V2.2 - Sunfall-SCORE.musicxml');

const DIVS = 4;
const BAR_DIVS = 16;

function sectionOfBar(b) {
  if (b <= 8) return 'intro';
  if (b <= 40) return 'melody_head';
  if (b <= 64) return 'solo_section';
  if (b <= 72) return 'soli_section';
  if (b <= 88) return 'shout_chorus';
  return 'ending';
}

function extractHarmoniesFromLead(xml) {
  const byBar = {};
  for (let b = 1; b <= 96; b++) {
    const re = new RegExp(`<measure\\s+number="${b}"[\\s\\S]*?<\\/measure>`, 'i');
    const m = xml.match(re);
    const inner = m ? m[0] : '';
    const hm = inner.match(/<harmony[\s\S]*?<\/harmony>/i);
    byBar[b] = hm ? hm[0] : '';
  }
  return byBar;
}

const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function rootPcFromHarmony(hxml) {
  if (!hxml) return 5;
  const sm = hxml.match(/<root-step>([A-G])<\/root-step>/i);
  const am = hxml.match(/<root-alter>(-?\d+)<\/root-alter>/i);
  if (!sm) return 5;
  const alter = am ? parseInt(am[1], 10) : 0;
  return (STEP_PC[sm[1].toUpperCase()] + alter + 120) % 12;
}

function pitchXml(step, alter, octave) {
  const al = alter === 0 ? '' : `<alter>${alter}</alter>`;
  return `<pitch><step>${step}</step>${al}<octave>${octave}</octave></pitch>`;
}

function pcToPitch(pc, octave) {
  const names = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alts = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const s = names[pc % 12];
  const a = alts[pc % 12];
  return pitchXml(s, a, octave);
}

function rehearsal(label) {
  return `<direction placement="above"><direction-type><rehearsal enclosure="square">${label}</rehearsal></direction-type></direction>`;
}

function notePitched(pXml, dur, type, voice = 1) {
  return `<note>${pXml}<duration>${dur}</duration><voice>${voice}</voice><type>${type}</type><stem>up</stem></note>`;
}

function noteChord(pXml, dur, type, voice = 1) {
  return `<note><chord/>${pXml}<duration>${dur}</duration><voice>${voice}</voice><type>${type}</type><stem>up</stem></note>`;
}

function restDur(d, voice = 1) {
  return `<note><rest/><duration>${d}</duration><voice>${voice}</voice></note>`;
}

function restWhole() {
  return `<note><rest/><duration>${BAR_DIVS}</duration><voice>1</voice><type>whole</type></note>`;
}

/** Concert-pitch score (readable grid); Quincy-style backbeat in rhythm parts. */
function drumQuarters(pattern) {
  // pattern: 0=kick 1=snare 2=hihat 3=hihat
  const inst = 'P_Drums-I1';
  const mk = (step, oct, display) => {
    const d = display || step;
    return `<note><unpitched><display-step>${d}</display-step><display-octave>${oct}</display-octave></unpitched><duration>4</duration><instrument id="${inst}"/><voice>1</voice><type>quarter</type><stem>up</stem></note>`;
  };
  const map = {
    0: () => mk('F', 4, 'F'),
    1: () => mk('C', 5, 'C'),
    2: () => mk('G', 5, 'G'),
    3: () => mk('G', 5, 'G'),
  };
  return pattern.map((p) => map[p]()).join('\n        ');
}

function bassLine(sec, bar, rpc) {
  const r = rpc;
  const o = 2;
  if (sec === 'intro') {
    const p1 = pcToPitch(r, o);
    return `${notePitched(p1, 4, 'quarter')}\n        ${restDur(12)}`;
  }
  if (sec === 'melody_head' || sec === 'shout_chorus') {
    const p1 = pcToPitch(r, o);
    const p5 = pcToPitch((r + 7) % 12, o);
    const p3 = pcToPitch((r + 4) % 12, o);
    return `${notePitched(p1, 4, 'quarter')}\n        ${notePitched(p5, 4, 'quarter')}\n        ${notePitched(p3, 4, 'quarter')}\n        ${notePitched(p1, 4, 'quarter')}`;
  }
  if (sec === 'solo_section') {
    const p1 = pcToPitch(r, o);
    const p2 = pcToPitch((r + 5) % 12, o);
    return `${notePitched(p1, 8, 'half')}\n        ${notePitched(p2, 8, 'half')}`;
  }
  if (sec === 'soli_section') {
    const p1 = pcToPitch(r, o);
    return `${notePitched(p1, 16, 'whole')}`;
  }
  if (sec === 'ending') {
    const p1 = pcToPitch(r, o);
    return `${notePitched(p1, 8, 'half')}\n        ${restDur(8)}`;
  }
  return restWhole();
}

function fixBassLine(sec, bar, rpc) {
  let s = bassLine(sec, bar, rpc);
  const p3 = pcToPitch((rpc + 4) % 12, 2);
  const p5 = pcToPitch((rpc + 7) % 12, 2);
  const p1 = pcToPitch(rpc, 2);
  if (sec === 'melody_head' || sec === 'shout_chorus') {
    return `${notePitched(p1, 4, 'quarter')}\n        ${notePitched(p5, 4, 'quarter')}\n        ${notePitched(p3, 4, 'quarter')}\n        ${notePitched(p1, 4, 'quarter')}`;
  }
  return s;
}

function pianoComp(sec, bar, rpc, hxml) {
  const r = rpc;
  const o = 4;
  const third = (r + 4) % 12;
  const sev = (r + 11) % 12;
  const pR = pcToPitch(r, o);
  const p3 = pcToPitch(third, o);
  const p7 = pcToPitch(sev, o);
  if (sec === 'intro') {
    return `${notePitched(pR, 4, 'quarter')}\n        ${noteChord(p3, 4, 'quarter')}\n        ${noteChord(p7, 4, 'quarter')}\n        ${noteChord(p3, 4, 'quarter')}`;
  }
  if (sec === 'melody_head' || sec === 'shout_chorus') {
    return `${notePitched(pR, 4, 'quarter')}\n        ${noteChord(p3, 4, 'quarter')}\n        ${noteChord(p7, 4, 'quarter')}\n        ${noteChord(p3, 4, 'quarter')}`;
  }
  if (sec === 'solo_section') {
    return `${notePitched(pR, 8, 'half')}\n        ${noteChord(p7, 8, 'half')}`;
  }
  if (sec === 'soli_section') {
    return `${restDur(16)}`;
  }
  if (sec === 'ending') {
    return `${notePitched(pR, 4, 'quarter')}\n        ${restDur(12)}`;
  }
  return restWhole();
}

function guitarFunk(sec, bar, rpc) {
  if (sec === 'intro' || sec === 'melody_head' || sec === 'shout_chorus') {
    const p = pcToPitch((rpc + 7) % 12, 3);
    return `${restDur(8)}\n        ${notePitched(p, 4, 'quarter')}\n        ${restDur(4)}`;
  }
  if (sec === 'solo_section') {
    const p = pcToPitch(rpc, 3);
    return `${notePitched(p, 16, 'whole')}`;
  }
  return restWhole();
}

function windUnison(sec, bar, rpc, role) {
  const o = role === 'bari' ? 3 : 5;
  const mel = (rpc + 9) % 12;
  const p = pcToPitch(mel, o);
  if (sec === 'intro') return restWhole();
  if (sec === 'melody_head') {
    return `${notePitched(p, 8, 'half')}\n        ${notePitched(pcToPitch((rpc + 4) % 12, o), 8, 'half')}`;
  }
  if (sec === 'solo_section') {
    if (role === 'as1') {
      return `${notePitched(p, 4, 'quarter')}\n        ${notePitched(pcToPitch((rpc + 2) % 12, o), 4, 'quarter')}\n        ${notePitched(pcToPitch((rpc + 4) % 12, o), 4, 'quarter')}\n        ${notePitched(pcToPitch((rpc + 2) % 12, o), 4, 'quarter')}`;
    }
    return restWhole();
  }
  if (sec === 'soli_section') {
    const o2 = role === 'bari' ? 3 : 4;
    const p0 = pcToPitch(rpc, o2);
    return `${notePitched(p0, 4, 'quarter')}\n        ${notePitched(pcToPitch((rpc + 7) % 12, o2), 4, 'quarter')}\n        ${notePitched(pcToPitch((rpc + 4) % 12, o2), 4, 'quarter')}\n        ${notePitched(p0, 4, 'quarter')}`;
  }
  if (sec === 'shout_chorus') {
    return `${notePitched(p, 4, 'quarter')}\n        ${notePitched(p, 4, 'quarter')}\n        ${notePitched(p, 4, 'quarter')}\n        ${notePitched(p, 4, 'quarter')}`;
  }
  if (sec === 'ending') {
    return `${notePitched(p, 4, 'quarter')}\n        ${restDur(4)}\n        ${notePitched(p, 4, 'quarter')}\n        ${restDur(4)}`;
  }
  return restWhole();
}

function brassHit(sec, bar, rpc) {
  const o = 5;
  const p = pcToPitch((rpc + 4) % 12, o);
  if (sec === 'intro' || sec === 'soli_section') return restWhole();
  if (sec === 'melody_head') {
    return `${restDur(4)}\n        ${notePitched(p, 4, 'quarter')}\n        ${restDur(4)}\n        ${notePitched(p, 4, 'quarter')}`;
  }
  if (sec === 'solo_section') return restWhole();
  if (sec === 'shout_chorus') {
    return `${notePitched(p, 2, 'eighth')}\n        ${restDur(2)}\n        ${notePitched(p, 4, 'quarter')}\n        ${restDur(4)}\n        ${notePitched(p, 4, 'quarter')}`;
  }
  if (sec === 'ending') {
    return `${restDur(8)}\n        ${notePitched(p, 8, 'half')}`;
  }
  return restWhole();
}

function trumpetSolo(sec, bar, rpc) {
  const o = 5;
  const p = pcToPitch((rpc + 7) % 12, o);
  if (sec !== 'solo_section') return brassHit(sec, bar, rpc);
  return `${notePitched(p, 8, 'half')}\n        ${notePitched(pcToPitch((rpc + 9) % 12, o), 4, 'quarter')}\n        ${notePitched(pcToPitch((rpc + 5) % 12, o), 4, 'quarter')}`;
}

function tromboneLine(sec, bar, rpc) {
  const o = 3;
  const p = pcToPitch(rpc, o);
  if (sec === 'intro' || sec === 'soli_section' || sec === 'solo_section') return restWhole();
  if (sec === 'melody_head' || sec === 'shout_chorus') {
    return `${notePitched(p, 16, 'whole')}`;
  }
  if (sec === 'ending') {
    return `${notePitched(p, 8, 'half')}\n        ${restDur(8)}`;
  }
  return restWhole();
}

function buildMeasure(partKind, bar, harmonyXml) {
  const sec = sectionOfBar(bar);
  const rpc = rootPcFromHarmony(harmonyXml);
  let body = '';
  let extraDir = '';

  if (bar === 1 && partKind === 'as1') {
    extraDir = `<direction placement="above"><sound tempo="120"/></direction>`;
  }
  if (bar === 1) extraDir += `${extraDir ? '\n      ' : ''}${rehearsal('Intro')}`;
  if (bar === 9) extraDir += `\n      ${rehearsal('Head')}`;
  if (bar === 41) extraDir += `\n      ${rehearsal('Solo')}`;
  if (bar === 65) extraDir += `\n      ${rehearsal('Soli')}`;
  if (bar === 73) extraDir += `\n      ${rehearsal('Shout')}`;
  if (bar === 89) extraDir += `\n      ${rehearsal('Ending')}`;

  const harm =
    harmonyXml && (partKind === 'pno' || partKind === 'as1') ? `\n      ${harmonyXml}` : '';

  switch (partKind) {
    case 'as1':
      body = windUnison(sec, bar, rpc, 'as1');
      break;
    case 'as2':
    case 'ts1':
    case 'ts2':
    case 'bari':
      if (sec === 'soli_section') body = windUnison(sec, bar, rpc, partKind === 'bari' ? 'bari' : 'as2');
      else if (sec === 'solo_section') body = restWhole();
      else body = windUnison(sec, bar, rpc, 'as2');
      break;
    case 'tpt1':
      body = trumpetSolo(sec, bar, rpc);
      break;
    case 'tpt2':
    case 'tpt3':
    case 'tpt4':
      body = brassHit(sec, bar, rpc);
      break;
    case 'trb1':
    case 'trb2':
    case 'trb3':
    case 'trb4':
      body = tromboneLine(sec, bar, rpc);
      break;
    case 'gtr':
      body = guitarFunk(sec, bar, rpc);
      break;
    case 'pno':
      body = pianoComp(sec, bar, rpc, harmonyXml);
      break;
    case 'bs':
      body = fixBassLine(sec, bar, rpc);
      break;
    case 'drs': {
      let pat;
      if (sec === 'intro') pat = [0, 2, 1, 2];
      else if (sec === 'melody_head' || sec === 'shout_chorus') pat = [0, 2, 1, 2];
      else if (sec === 'solo_section') pat = [0, 2, 2, 2];
      else if (sec === 'soli_section') pat = [2, 2, 1, 2];
      else if (sec === 'ending') pat = [0, 0, 1, 1];
      else pat = [0, 2, 1, 2];
      body = drumQuarters(pat);
      break;
    }
    default:
      body = restWhole();
  }

  // intro: winds/brass tacet (only rhythm) — override
  if (sec === 'intro') {
    if (
      ['as1', 'as2', 'ts1', 'ts2', 'bari', 'tpt1', 'tpt2', 'tpt3', 'tpt4', 'trb1', 'trb2', 'trb3', 'trb4'].includes(
        partKind
      )
    ) {
      body = restWhole();
    }
    if (partKind === 'pno') body = pianoComp('intro', bar, rpc, harmonyXml);
  }

  // soli: brass tacet
  if (sec === 'soli_section' && partKind.startsWith('tpt')) body = restWhole();
  if (sec === 'soli_section' && partKind.startsWith('trb')) body = restWhole();
  if (sec === 'soli_section' && partKind === 'gtr') body = restWhole();

  // solo: reduce ensemble — only as1 + tpt1 + rhythm active
  if (sec === 'solo_section') {
    if (['as2', 'ts1', 'ts2', 'bari', 'tpt2', 'tpt3', 'tpt4', 'trb1', 'trb2', 'trb3', 'trb4'].includes(partKind))
      body = restWhole();
  }

  return `    <measure number="${bar}">
      ${bar === 1 ? partKind === 'as1' ? MEASURE1_ATTRS_AS1 : ATTRS_OTHER(partKind) : ''}${extraDir}${harm}
      ${body.split('\n').join('\n      ')}
    </measure>`;
}

const MEASURE1_ATTRS_AS1 = `<attributes>
        <divisions>${DIVS}</divisions>
        <key><fifths>-1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      `;

function ATTRS_OTHER(pk) {
  let clef = '<clef><sign>G</sign><line>2</line></clef>';
  if (pk.startsWith('trb')) clef = '<clef><sign>F</sign><line>4</line></clef>';
  if (pk === 'bs') clef = '<clef><sign>F</sign><line>4</line></clef>';
  if (pk === 'drs') clef = '<clef><sign>percussion</sign></clef>';
  return `<attributes>
        <divisions>${DIVS}</divisions>
        <key><fifths>-1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        ${clef}
      </attributes>
      `;
}

const PARTS = [
  { id: 'P_AS1', name: 'Alto Saxophone 1', kind: 'as1', inst: 'Alto Saxophone 1' },
  { id: 'P_AS2', name: 'Alto Saxophone 2', kind: 'as2', inst: 'Alto Saxophone 2' },
  { id: 'P_TS1', name: 'Tenor Saxophone 1', kind: 'ts1', inst: 'Tenor Saxophone 1' },
  { id: 'P_TS2', name: 'Tenor Saxophone 2', kind: 'ts2', inst: 'Tenor Saxophone 2' },
  { id: 'P_Bari', name: 'Baritone Saxophone', kind: 'bari', inst: 'Baritone Saxophone' },
  { id: 'P_Tpt1', name: 'Trumpet 1', kind: 'tpt1', inst: 'Trumpet in Bb 1' },
  { id: 'P_Tpt2', name: 'Trumpet 2', kind: 'tpt2', inst: 'Trumpet in Bb 2' },
  { id: 'P_Tpt3', name: 'Trumpet 3', kind: 'tpt3', inst: 'Trumpet in Bb 3' },
  { id: 'P_Tpt4', name: 'Trumpet 4', kind: 'tpt4', inst: 'Trumpet in Bb 4' },
  { id: 'P_Trb1', name: 'Trombone 1', kind: 'trb1', inst: 'Trombone 1' },
  { id: 'P_Trb2', name: 'Trombone 2', kind: 'trb2', inst: 'Trombone 2' },
  { id: 'P_Trb3', name: 'Trombone 3', kind: 'trb3', inst: 'Trombone 3' },
  { id: 'P_Trb4', name: 'Trombone 4', kind: 'trb4', inst: 'Trombone 4' },
  { id: 'P_Gtr', name: 'Guitar', kind: 'gtr', inst: 'Guitar' },
  { id: 'P_Pno', name: 'Piano', kind: 'pno', inst: 'Piano' },
  { id: 'P_Bass', name: 'Double Bass', kind: 'bs', inst: 'Acoustic Bass' },
  { id: 'P_Drums', name: 'Drum Set', kind: 'drs', inst: 'Drum Set' },
];

function partListXml() {
  return PARTS.map(
    (p) => `  <score-part id="${p.id}">
    <part-name>${p.name}</part-name>
    <score-instrument id="${p.id}-I1">
      <instrument-name>${p.inst}</instrument-name>
    </score-instrument>
  </score-part>`
  ).join('\n');
}

function buildPart(p, harmonyByBar) {
  const measures = [];
  for (let b = 1; b <= 96; b++) {
    measures.push(buildMeasure(p.kind, b, harmonyByBar[b] || ''));
  }
  return `  <part id="${p.id}">
${measures.join('\n')}
  </part>`;
}

function main() {
  if (!fs.existsSync(LEAD)) throw new Error('Missing lead sheet: ' + LEAD);
  const leadXml = fs.readFileSync(LEAD, 'utf8');
  const harmonyByBar = extractHarmoniesFromLead(leadXml);

  const score = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>V2.2 - Sunfall-SCORE</work-title></work>
  <identification>
    <creator type="composer">Bryant Mike</creator>
    <rights>Composer OS — full score generator (Quincy grid reference)</rights>
    <encoding>
      <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>
      <software>writeSunfallV22FullScoreMusicXml.mjs</software>
    </encoding>
  </identification>
  <part-list>
${partListXml()}
  </part-list>
${PARTS.map((p) => buildPart(p, harmonyByBar)).join('\n')}
</score-partwise>
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, score, 'utf8');
  const st = fs.statSync(OUT);
  console.log('Wrote', OUT, 'bytes', st.size);
}

main();
