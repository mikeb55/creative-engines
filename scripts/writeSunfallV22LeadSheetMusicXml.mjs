/**
 * Writes projects/Orbit/Sunfall/V2.2 - Sunfall.musicxml
 * — 96 bars, 4/4, Orbit-derived 16-bar harmony cycle × 6 (lead sheet: one staff + harmony).
 * Run: node scripts/writeSunfallV22LeadSheetMusicXml.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'projects', 'Orbit', 'Sunfall', 'V2.2 - Sunfall.musicxml');

/** One bar of MusicXML: divisions=4 → whole note = 16 */
function measureXml(n, innerHarmony, includeAttrs) {
  const attrs = includeAttrs
    ? `<attributes>
        <divisions>4</divisions>
        <key><fifths>-1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above"><sound tempo="120"/></direction>`
    : '';
  return `    <measure number="${n}">
      ${attrs}
      ${innerHarmony}
      <note><rest/><duration>16</duration><voice>1</voice></note>
    </measure>`;
}

function hFmaj711() {
  return `<harmony><root><root-step>F</root-step></root><kind text="maj7#11">major-seventh</kind></harmony>`;
}
function hEbmaj75() {
  return `<harmony><root><root-step>E</root-step><root-alter>-1</root-alter></root><kind text="maj7#5">major-seventh</kind></harmony>`;
}
function hDbmaj7() {
  return `<harmony><root><root-step>D</root-step><root-alter>-1</root-alter></root><kind text="maj7">major-seventh</kind></harmony>`;
}
function hBmaj7() {
  return `<harmony><root><root-step>B</root-step></root><kind text="maj7">major-seventh</kind></harmony>`;
}
function hBbm9() {
  return `<harmony><root><root-step>B</root-step><root-alter>-1</root-alter></root><kind text="m9">minor-ninth</kind></harmony>`;
}
function hAbmaj7() {
  return `<harmony><root><root-step>A</root-step><root-alter>-1</root-alter></root><kind text="maj7">major-seventh</kind></harmony>`;
}
function hGbmaj7() {
  return `<harmony><root><root-step>G</root-step><root-alter>-1</root-alter></root><kind text="maj7">major-seventh</kind></harmony>`;
}
function hEmaj7() {
  return `<harmony><root><root-step>E</root-step></root><kind text="maj7">major-seventh</kind></harmony>`;
}
function hGoverF() {
  return `<harmony><root><root-step>G</root-step></root><kind>major</kind><bass><bass-step>F</bass-step></bass></harmony>`;
}
function hEboverF() {
  return `<harmony><root><root-step>E</root-step><root-alter>-1</root-alter></root><kind>major</kind><bass><bass-step>F</bass-step></bass></harmony>`;
}
function hBb7() {
  return `<harmony><root><root-step>B</root-step><root-alter>-1</root-alter></root><kind text="7">dominant</kind></harmony>`;
}
function hFmaj7() {
  return `<harmony><root><root-step>F</root-step></root><kind text="maj7">major-seventh</kind></harmony>`;
}

const CYCLE = [
  hFmaj711,
  hEbmaj75,
  hDbmaj7,
  hBmaj7,
  hBbm9,
  hAbmaj7,
  hGbmaj7,
  hEmaj7,
  hGoverF,
  hGoverF,
  hEboverF,
  hEboverF,
  hDbmaj7,
  hBb7,
  hFmaj7,
  hFmaj7,
];

function buildPart() {
  const measures = [];
  for (let bar = 1; bar <= 96; bar++) {
    const h = CYCLE[(bar - 1) % 16]();
    measures.push(measureXml(bar, h, bar === 1));
  }
  return measures.join('\n');
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>V2.2 - Sunfall</work-title></work>
  <identification>
    <creator type="composer">Bryant Mike</creator>
    <encoding><software>Composer OS — writeSunfallV22LeadSheetMusicXml.mjs</software></encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Lead Sheet</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${buildPart()}
  </part>
</score-partwise>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, xml, 'utf8');
console.log('Wrote', OUT);
