/**
 * Sunfall V2.0 — bridge harmonies + continuity fills → V2.0-Sunfall.musicxml
 * Run: node scripts/sunfallV20Build.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const IN_XML = path.join(ROOT, 'projects', 'Orbit', 'Sunfall', 'Sunfall-V1.0.musicxml');
const OUT_XML = path.join(ROOT, 'projects', 'Orbit', 'Sunfall', 'V2.0-Sunfall.musicxml');

function extractPart(xml, partId) {
  const re = new RegExp(`(<part\\s+id="${partId}"[^>]*>)([\\s\\S]*?)(</part>)`, 'i');
  const m = xml.match(re);
  return m ? { open: m[1], inner: m[2], close: m[3], full: m[0] } : null;
}

function replaceMeasureInner(inner, measureNum, replacementMeasureBody) {
  const re = new RegExp(`<measure[^>]*number="${measureNum}"[\\s\\S]*?</measure>`, 'i');
  if (!re.test(inner)) throw new Error(`measure ${measureNum} not found`);
  return inner.replace(re, replacementMeasureBody.trim());
}

/** Replace first <harmony>...</harmony> in measure XML string */
function swapHarmony(measureXml, newHarmony) {
  return measureXml.replace(/<harmony>[\s\S]*?<\/harmony>/i, newHarmony);
}

const BRIDGE_HARMONY = {
  63: `<harmony><root><root-step>F</root-step></root><kind text="maj7">major-seventh</kind><bass><bass-step>E</bass-step></bass></harmony>`,
  64: `<harmony><root><root-step>B</root-step><root-alter>-1</root-alter></root><kind text="m7">minor-seventh</kind></harmony>`,
  65: `<harmony><root><root-step>F</root-step></root><kind text="sus4">suspended-fourth</kind></harmony>`,
  66: `<harmony><root><root-step>A</root-step></root><kind text="maj7#11">other</kind><degree print-object="no"><degree-value>11</degree-value><degree-alter>1</degree-alter><degree-type>alter</degree-type></degree></harmony>`,
  67: `<harmony><root><root-step>D</root-step></root><kind text="maj7">major-seventh</kind></harmony>`,
};

const RHODES_V2 = `        <note><rest/><duration>1440</duration><voice>1</voice><type>half</type><dot/><staff>1</staff></note>
        <backup><duration>1440</duration></backup>
        <note dynamics="62"><pitch><step>F</step><octave>4</octave></pitch><duration>480</duration><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>
        <note dynamics="60"><pitch><step>A</step><octave>4</octave></pitch><duration>480</duration><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>
        <note dynamics="58"><pitch><step>E</step><octave>5</octave></pitch><duration>480</duration><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>`;

const RHODES_V2_VOICE1_QUARTERS = `        <note dynamics="55"><pitch><step>F</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><stem>up</stem><staff>1</staff></note>
        <note dynamics="53"><pitch><step>A</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><stem>up</stem><staff>1</staff></note>
        <note dynamics="52"><pitch><step>E</step><octave>5</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type><stem>up</stem><staff>1</staff></note>
        <backup><duration>1440</duration></backup>
        <note dynamics="62"><pitch><step>F</step><octave>3</octave></pitch><duration>480</duration><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>
        <note dynamics="60"><pitch><step>C</step><octave>4</octave></pitch><duration>480</duration><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>
        <note dynamics="58"><pitch><step>A</step><octave>3</octave></pitch><duration>480</duration><voice>2</voice><type>quarter</type><stem>down</stem><staff>1</staff></note>`;

const ALTO_HOLD_DS = `        <note><pitch><step>D</step><alter>1</alter><octave>5</octave></pitch><duration>1440</duration><voice>1</voice><type>half</type><dot/></note>`;

const ALTO_END_HELD = `        <note><pitch><step>D</step><alter>1</alter><octave>5</octave></pitch><duration>1440</duration><voice>1</voice><type>half</type><dot/></note>`;

const BRASS_HIT = `        <note dynamics="70"><pitch><step>F</step><octave>5</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note>
        <note><rest/><duration>960</duration><voice>1</voice><type>half</type></note>`;

function main() {
  let xml = fs.readFileSync(IN_XML, 'utf8');

  const piano = extractPart(xml, 'bb_piano');
  if (!piano) throw new Error('bb_piano missing');
  let pInner = piano.inner;

  for (const n of [63, 64, 65, 66, 67]) {
    const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
    const mx = pInner.match(re);
    if (!mx) throw new Error(`piano m${n}`);
    pInner = pInner.replace(re, swapHarmony(mx[0], BRIDGE_HARMONY[n]));
  }

  for (const n of [53, 54, 55, 56]) {
    const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
    const mx = pInner.match(re);
    if (!mx) throw new Error(`piano m${n}`);
    let body = mx[0];
    const harm = body.match(/<harmony>[\s\S]*?<\/harmony>/i)?.[0] ?? '';
    const rebuilt = `  <measure number="${n}">
    ${harm}
${RHODES_V2}
  </measure>`;
    pInner = pInner.replace(re, rebuilt);
  }

  for (const n of [69, 70, 71]) {
    const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
    const mx = pInner.match(re);
    if (!mx) throw new Error(`piano m${n}`);
    let body = mx[0];
    const harm = body.match(/<harmony>[\s\S]*?<\/harmony>/i)?.[0] ?? '';
    const rebuilt = `  <measure number="${n}">
    ${harm}
${RHODES_V2_VOICE1_QUARTERS}
  </measure>`;
    pInner = pInner.replace(re, rebuilt);
  }

  for (const n of [89, 91, 93, 94]) {
    const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
    const mx = pInner.match(re);
    if (!mx) throw new Error(`piano m${n}`);
    let body = mx[0];
    const harm = body.match(/<harmony>[\s\S]*?<\/harmony>/i)?.[0] ?? '';
    const rebuilt = `  <measure number="${n}">
    ${harm}
${RHODES_V2_VOICE1_QUARTERS}
  </measure>`;
    pInner = pInner.replace(re, rebuilt);
  }

  xml = xml.replace(piano.full, `${piano.open}${pInner}${piano.close}`);

  const alto = extractPart(xml, 'bb_alto_sax');
  if (!alto) throw new Error('alto');
  let aInner = alto.inner;
  for (const n of [72, 73, 74, 77, 78, 79]) {
    const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
    const mx = aInner.match(re);
    if (!mx) throw new Error(`alto m${n}`);
    const rm = mx[0].match(/<direction[\s\S]*?<\/direction>\s*/gi) ?? [];
    const rehearsal = mx[0].includes('rehearsal')
      ? mx[0].match(/<direction[^>]*>[\s\S]*?<rehearsal[\s\S]*?<\/direction>/i)?.[0] ?? ''
      : '';
    const rebuilt = `  <measure number="${n}">
    ${rehearsal}
${ALTO_HOLD_DS}
  </measure>`;
    aInner = aInner.replace(re, rebuilt);
  }

  for (const n of [89]) {
    const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
    const mx = aInner.match(re);
    if (!mx) throw new Error(`alto m${n}`);
    const rebuilt = `  <measure number="${n}">
${ALTO_HOLD_DS}
  </measure>`;
    aInner = aInner.replace(re, rebuilt);
  }

  const re95 = /<measure[^>]*number="95"[\s\S]*?<\/measure>/i;
  aInner = aInner.replace(
    re95,
    `  <measure number="95">
        <note><rest/><duration>480</duration><voice>1</voice><type>quarter</type></note>
        <note><pitch><step>D</step><alter>1</alter><octave>5</octave></pitch><duration>960</duration><voice>1</voice><type>half</type></note>
  </measure>`
  );

  const re96 = /<measure[^>]*number="96"[\s\S]*?<\/measure>/i;
  aInner = aInner.replace(
    re96,
    `  <measure number="96">
    <direction placement="above"><direction-type><rehearsal enclosure="rectangle">Open</rehearsal></direction-type></direction>
        <note><pitch><step>D</step><alter>1</alter><octave>5</octave></pitch><duration>1440</duration><voice>1</voice><type>half</type><dot/></note>
  </measure>`
  );

  xml = xml.replace(alto.full, `${alto.open}${aInner}${alto.close}`);

  for (const partId of ['bb_trumpets', 'bb_trombones']) {
    const pt = extractPart(xml, partId);
    if (!pt) continue;
    let inner = pt.inner;
    for (const n of [89, 93, 94]) {
      const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
      const mx = inner.match(re);
      if (!mx) continue;
      inner = inner.replace(
        re,
        `  <measure number="${n}">
${BRASS_HIT}
  </measure>`
      );
    }
    xml = xml.replace(pt.full, `${pt.open}${inner}${pt.close}`);
  }

  const tenor = extractPart(xml, 'bb_tenor_sax');
  if (tenor) {
    let tInner = tenor.inner;
    for (const n of [90, 92]) {
      const re = new RegExp(`<measure[^>]*number="${n}"[\\s\\S]*?</measure>`, 'i');
      if (!re.test(tInner)) continue;
      tInner = tInner.replace(
        re,
        `  <measure number="${n}">
${BRASS_HIT}
  </measure>`
      );
    }
    xml = xml.replace(tenor.full, `${tenor.open}${tInner}${tenor.close}`);
  }

  xml = xml.replace(/<work-title>Sunfall<\/work-title>/i, '<work-title>Sunfall V2.0</work-title>');

  fs.writeFileSync(OUT_XML, xml, 'utf8');
  console.log('Wrote', OUT_XML);
}

main();
