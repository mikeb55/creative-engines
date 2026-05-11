/**
 * Sunfall-V1.0.musicxml — V2.2 bars 1–64 + V6 bars 33–64 as 65–96.
 * Run: node scripts/sunfallBuildCombinedMusicXml.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PATH_V22 = path.join(
  ROOT,
  'projects',
  'Orbit',
  'Steely Orbit - 1st 64 bars',
  'V2.2-Steely-Orbit.musicxml'
);
const PATH_V6 = path.join(ROOT, 'projects', 'Orbit', 'V6.0 orbit - BB.musicxml');
const OUT_DIR = path.join(ROOT, 'projects', 'Orbit', 'Sunfall');
const OUT_FILE = path.join(OUT_DIR, 'Sunfall-V1.0.musicxml');

const PART_IDS = [
  'bb_alto_sax',
  'bb_tenor_sax',
  'bb_trumpets',
  'bb_trombones',
  'bb_piano',
  'bb_rhythm_section',
  'bb_drums',
];

function extractPartInner(xml, partId) {
  const re = new RegExp(`<part\\s+id="${partId}"[^>]*>([\\s\\S]*?)<\\/part>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function extractMeasures(inner) {
  return inner.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
}

function measureNumber(mx) {
  const m = mx.match(/number="(\d+)"/);
  return m ? parseInt(m[1], 10) : 0;
}

function setMeasureNumber(mx, n) {
  return mx.replace(/<measure([^>]*)number="\d+"/, `<measure$1number="${n}"`);
}

function stripJoinArtifacts(measureXml) {
  let s = measureXml;
  s = s.replace(/(<measure[^>]*>)\s*<attributes>[\s\S]*?<\/attributes>\s*/i, '$1\n');
  s = s.replace(/<direction[^>]*>[\s\S]*?<metronome[\s\S]*?<\/direction>/gi, '');
  s = s.replace(/<sound[^>]*tempo="(?!129)\d+"[^>]*\/>/gi, '');
  return s;
}

const REHEARSAL = {
  1: 'Intro',
  5: 'Melody Head',
  33: 'Solo Section',
  49: 'Shout Chorus',
  57: 'Sunfall',
  73: 'Dark World',
  81: 'Dream Echo',
  89: 'Dissolution',
  96: 'Open',
};

function rehearsalDirection(label) {
  return `<direction placement="above"><direction-type><rehearsal enclosure="rectangle">${label}</rehearsal></direction-type></direction>`;
}

function applyRehearsalMark(measureXml, label) {
  const inner = rehearsalDirection(label);
  if (/<rehearsal[^>]*>[\s\S]*?<\/rehearsal>/i.test(measureXml)) {
    return measureXml.replace(
      /<direction[^>]*>\s*<direction-type>\s*<rehearsal[^>]*>[\s\S]*?<\/rehearsal>\s*<\/direction-type>\s*<\/direction>/i,
      inner
    );
  }
  return measureXml.replace(
    /(<measure[^>]*>)(\s*(?:<attributes>[\s\S]*?<\/attributes>\s*)?)/i,
    `$1$2\n    ${inner}\n`
  );
}

function altoCrossingMeasures() {
  const hold = `        <note><pitch><step>D</step><alter>1</alter><octave>4</octave></pitch><duration>1440</duration><voice>1</voice><type>half</type><dot/></note>`;
  return [
    `<measure number="65">\n    ${rehearsalDirection('The Crossing')}\n${hold}\n  </measure>`,
    `<measure number="66">\n${hold}\n  </measure>`,
    `<measure number="67">\n${hold}\n  </measure>`,
    `<measure number="68">\n${hold}\n  </measure>`,
  ];
}

function bassCrossingMeasures() {
  const q =
    '        <note><pitch><step>F</step><octave>2</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note>';
  const bar = `${q}\n${q}\n${q}`;
  return ['65', '66', '67', '68'].map((n) => `<measure number="${n}">\n${bar}\n  </measure>`);
}

function drumsCrossingMeasures() {
  const brushDir =
    '    <direction placement="above"><direction-type><words relative-y="20" font-weight="bold">Brushes</words></direction-type></direction>';
  const v1 = `        <note><unpitched><display-step>G</display-step><display-octave>5</display-octave></unpitched><duration>480</duration><instrument id="bb_drums-I1"/><voice>1</voice><type>quarter</type><stem>up</stem><staff>1</staff><notations><technical><brush/></technical></notations></note>`;
  const v2 = `        <note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched><duration>480</duration><instrument id="bb_drums-I1"/><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>`;
  const mk = (n, withDir) =>
    `<measure number="${n}">\n${withDir ? `${brushDir}\n` : ''}${v1}\n${v1}\n${v1}\n        <backup><duration>1440</duration></backup>\n${v2}\n${v2}\n${v2}\n  </measure>`;
  return [mk('65', true), mk('66', false), mk('67', false), mk('68', false)];
}

function pianoBar65Crossing() {
  return `<measure number="65">
    <harmony><root><root-step>F</root-step></root><kind text="maj7">major-seventh</kind></harmony>
        <note><pitch><step>F</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
        <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
        <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
        <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
        <note><rest/><duration>960</duration><voice>1</voice><type>half</type><staff>1</staff></note>
        <backup><duration>1440</duration></backup>
        <note><rest/><duration>1440</duration><voice>2</voice><type>half</type><dot/><staff>1</staff></note>
  </measure>`;
}

/** Beat 1 quarter rest; beats 2–3 same as full-bar rest minus first beat */
function hornBeat1Rest(measureXml) {
  const fullRest =
    /<note><rest\/><duration>1440<\/duration><voice>1<\/voice><type>half<\/type><dot\/><\/note>/;
  if (fullRest.test(measureXml)) {
    return measureXml.replace(
      fullRest,
      `<note><rest/><duration>480</duration><voice>1</voice><type>quarter</type></note>\n        <note><rest/><duration>960</duration><voice>1</voice><type>half</type></note>`
    );
  }
  return measureXml;
}

function mergePart(partId, innerV22, innerV6) {
  const m22 = extractMeasures(innerV22);
  const m6 = extractMeasures(innerV6);
  const map22 = new Map();
  const map6 = new Map();
  for (const mx of m22) map22.set(measureNumber(mx), mx);
  for (const mx of m6) map6.set(measureNumber(mx), mx);

  const out = [];
  for (let i = 1; i <= 64; i++) {
    let mx = map22.get(i);
    if (!mx) throw new Error(`${partId}: missing bar ${i} in V2.2`);
    out.push(setMeasureNumber(mx, i));
  }
  for (let i = 33; i <= 64; i++) {
    let mx = map6.get(i);
    if (!mx) throw new Error(`${partId}: missing bar ${i} in V6`);
    mx = setMeasureNumber(mx, i + 32);
    if (i === 33) mx = stripJoinArtifacts(mx);
    out.push(mx);
  }

  const idx65 = out.findIndex((x) => measureNumber(x) === 65);
  if (idx65 < 0) throw new Error(`${partId}: bar 65 not found`);

  if (partId === 'bb_alto_sax') {
    const cross = altoCrossingMeasures();
    for (let k = 0; k < 4; k++) out[idx65 + k] = cross[k];
  } else if (partId === 'bb_rhythm_section') {
    const cross = bassCrossingMeasures();
    for (let k = 0; k < 4; k++) out[idx65 + k] = cross[k];
  } else if (partId === 'bb_drums') {
    const cross = drumsCrossingMeasures();
    for (let k = 0; k < 4; k++) out[idx65 + k] = cross[k];
  } else if (partId === 'bb_piano') {
    out[idx65] = pianoBar65Crossing();
  } else if (['bb_tenor_sax', 'bb_trumpets', 'bb_trombones'].includes(partId)) {
    out[idx65] = hornBeat1Rest(out[idx65]);
  }

  if (partId === 'bb_alto_sax') {
    for (const [bar, label] of Object.entries(REHEARSAL)) {
      const bi = out.findIndex((x) => measureNumber(x) === Number(bar));
      if (bi >= 0) out[bi] = applyRehearsalMark(out[bi], label);
    }
  }

  return out.join('\n  ');
}

function buildScore(v22, v6) {
  const partList = v22.match(/<part-list>[\s\S]*?<\/part-list>/i)?.[0];
  if (!partList) throw new Error('part-list not found in V2.2');

  const partsXml = PART_IDS.map((id) => {
    const a = extractPartInner(v22, id);
    const b = extractPartInner(v6, id);
    if (!a || !b) throw new Error(`Missing part ${id}`);
    const merged = mergePart(id, a, b);
    return `  <part id="${id}">\n  ${merged}\n  </part>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Sunfall</work-title></work>
  ${partList}
${partsXml}
</score-partwise>
`;
}

function validate(xml) {
  const perPart = PART_IDS.map((id) => extractMeasures(extractPartInner(xml, id) ?? '').length);
  const inner0 = extractPartInner(xml, PART_IDS[0]);
  const nums = extractMeasures(inner0 ?? '').map(measureNumber);
  const maxBar = Math.max(...nums);
  const minBar = Math.min(...nums);
  const soundTempos = xml.match(/<sound[^>]*tempo="(\d+)"/g) ?? [];
  const non129 = soundTempos.filter((s) => !s.includes('129'));
  return { perPart, minBar, maxBar, measureCount: nums.length, tempoOtherThan129: non129 };
}

function main() {
  const v22 = fs.readFileSync(PATH_V22, 'utf8');
  const v6 = fs.readFileSync(PATH_V6, 'utf8');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const finalXml = buildScore(v22, v6);
  fs.writeFileSync(OUT_FILE, finalXml, 'utf8');
  const v = validate(finalXml);
  console.log(JSON.stringify({ out: OUT_FILE, ...v }, null, 2));
}

main();
