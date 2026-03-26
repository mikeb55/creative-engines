"use strict";
/**
 * Bar-first MusicXML writer — serializes an already-correct Score.
 * No measure packing. Bar structure must exist before writing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeScoreToMusicXML = writeScoreToMusicXML;
const scoreToTimedEvents_1 = require("./scoreToTimedEvents");
const notationTimingConstants_1 = require("./notationTimingConstants");
const musicxmlMeasurePacker_1 = require("./musicxmlMeasurePacker");
function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/** Write Score to MusicXML string. Single-part (e.g. Wyble 2 voices) or multi-part. */
function writeScoreToMusicXML(score, options) {
    const title = options?.title ?? score.title ?? 'Score';
    const partIds = score.parts ?? [...new Set(score.measures.flatMap((m) => m.voices.map((v) => v.part)))];
    const partNames = options?.partNames ?? Object.fromEntries(partIds.map((id) => [id, id]));
    const measureEvents = (0, scoreToTimedEvents_1.scoreToMeasureEvents)(score);
    const partList = partIds.map((id) => {
        const name = partNames[id] ?? id;
        const trans = options?.transpositions?.[id] ?? 0;
        const transEl = trans !== 0 ? `\n      <transpose><chromatic>${-trans}</chromatic></transpose>` : '';
        return `    <score-part id="${id}"><part-name>${escapeXml(name)}</part-name>${transEl}</score-part>`;
    }).join('\n');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
${partList}
  </part-list>
`;
    const clefs = options?.clefs ?? {};
    const defaultAttrs = (partId) => {
        const clef = clefs[partId] ?? 'treble';
        const sign = clef === 'bass' ? 'F' : clef === 'percussion' ? 'percussion' : 'G';
        const line = clef === 'bass' ? 4 : 2;
        const clefEl = clef === 'percussion'
            ? '<clef><sign>percussion</sign><line>2</line></clef>'
            : `<clef><sign>${sign}</sign><line>${line}</line></clef>`;
        return `        <attributes>
      <divisions>${notationTimingConstants_1.DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      ${clefEl}
    </attributes>\n`;
    };
    const getAttrs = options?.firstMeasureAttrs ?? defaultAttrs;
    for (const partId of partIds) {
        xml += `  <part id="${partId}">\n`;
        for (let m = 0; m < score.measures.length; m++) {
            const events = (measureEvents.get(m) ?? []).filter((e) => e.part === partId);
            const measureStart = m * notationTimingConstants_1.MEASURE_DURATION;
            xml += `    <measure number="${m + 1}">\n`;
            if (m === 0)
                xml += getAttrs(partId);
            xml += (0, musicxmlMeasurePacker_1.eventsToMeasureXml)(events, m, measureStart);
            xml += `    </measure>\n`;
        }
        xml += `  </part>\n`;
    }
    xml += `</score-partwise>\n`;
    return xml;
}
