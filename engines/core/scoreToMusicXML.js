"use strict";
/**
 * Serialize core Score to MusicXML. No measure packing — score must already be valid.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreToMusicXML = scoreToMusicXML;
exports.scoreToMusicXMLMultiPart = scoreToMusicXMLMultiPart;
const timing_1 = require("./timing");
function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function divisionsToType(divs) {
    if (divs <= 1)
        return '16th';
    if (divs <= 2)
        return 'eighth';
    if (divs <= 4)
        return 'quarter';
    if (divs <= 8)
        return 'half';
    return 'whole';
}
function midiToPitch(midi) {
    const semitones = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const stepMap = {
        0: { step: 'C', alter: 0 }, 1: { step: 'C', alter: 1 }, 2: { step: 'D', alter: 0 },
        3: { step: 'D', alter: 1 }, 4: { step: 'E', alter: 0 }, 5: { step: 'F', alter: 0 },
        6: { step: 'F', alter: 1 }, 7: { step: 'G', alter: 0 }, 8: { step: 'G', alter: 1 },
        9: { step: 'A', alter: 0 }, 10: { step: 'A', alter: 1 }, 11: { step: 'B', alter: 0 },
    };
    const { step, alter } = stepMap[semitones];
    return { step, alter, octave };
}
/** Convert NoteEvent[] to XML. Events are sequential; start = sum of prior durations. */
function voiceEventsToXml(events, voice, measureStart, staff) {
    let xml = '';
    for (const e of events) {
        const staffEl = staff ? `\n      <staff>${staff}</staff>` : '';
        if (e.pitch === 0) {
            xml += `        <note><rest/><duration>${e.duration}</duration><type>${divisionsToType(e.duration)}</type><voice>${voice}</voice>${staffEl}</note>\n`;
        }
        else {
            const { step, alter, octave } = midiToPitch(e.pitch);
            const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
            xml += `        <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${e.duration}</duration><type>${divisionsToType(e.duration)}</type><voice>${voice}</voice>${staffEl}</note>\n`;
        }
    }
    return xml;
}
/** Serialize single-part score (Wyble, Counterpoint) to MusicXML. */
function scoreToMusicXML(score, options) {
    const title = options?.title ?? 'Score';
    const partId = options?.partId ?? 'P1';
    const partName = options?.partName ?? 'Part 1';
    const staves = options?.staves ?? 1;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    <score-part id="${partId}">
      <part-name>${escapeXml(partName)}</part-name>
      <score-instrument id="${partId}-I1"><instrument-name>${escapeXml(partName)}</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="${partId}">
`;
    const voices = [...new Set(score.measures.flatMap((m) => Object.keys(m.voices).map(Number)))].sort((a, b) => a - b);
    for (let mi = 0; mi < score.measures.length; mi++) {
        const m = score.measures[mi];
        const measureStart = mi * timing_1.MEASURE_DIVISIONS;
        xml += `  <measure number="${mi + 1}">\n`;
        if (mi === 0) {
            const stavesEl = staves > 1 ? `\n      <staves>${staves}</staves>` : '';
            const clefsEl = staves > 1
                ? `\n      <clef number="1"><sign>G</sign><line>2</line></clef>\n      <clef number="2"><sign>G</sign><line>2</line></clef>`
                : `\n      <clef><sign>G</sign><line>2</line></clef>`;
            xml += `    <attributes>
      <divisions>${timing_1.DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>${stavesEl}${clefsEl}
    </attributes>
`;
        }
        for (const v of voices) {
            const events = m.voices[v] ?? [];
            const staff = staves > 1 ? v : undefined;
            xml += voiceEventsToXml(events, v, measureStart, staff);
        }
        xml += `  </measure>\n`;
    }
    xml += `  </part>
</score-partwise>
`;
    return xml;
}
/** Serialize multi-part score (Ellington). Voice N maps to partSpecs[N-1]. */
function scoreToMusicXMLMultiPart(score, partSpecs, options) {
    const title = options?.title ?? 'Score';
    const defaultsEl = options?.defaultsXml ?? '';
    const partList = partSpecs
        .map((p) => {
        const transEl = p.transposition
            ? `\n      <transpose><chromatic>${-p.transposition}</chromatic></transpose>`
            : '';
        return `    <score-part id="${p.id}">
      <part-name>${escapeXml(p.name)}</part-name>
      <score-instrument id="${p.id}-I1"><instrument-name>${escapeXml(p.name)}</instrument-name></score-instrument>${transEl}
    </score-part>`;
    })
        .join('\n');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
${defaultsEl}
  <part-list>
${partList}
  </part-list>
`;
    for (let pi = 0; pi < partSpecs.length; pi++) {
        const part = partSpecs[pi];
        const voice = pi + 1;
        xml += `  <part id="${part.id}">\n`;
        const clefSign = part.clef === 'bass' ? 'F' : part.clef === 'percussion' ? 'percussion' : 'G';
        const clefLine = part.clef === 'bass' ? 4 : 2;
        const clefEl = part.clef === 'percussion'
            ? '<clef><sign>percussion</sign><line>2</line></clef>'
            : `<clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>`;
        for (let mi = 0; mi < score.measures.length; mi++) {
            const m = score.measures[mi];
            const measureStart = mi * timing_1.MEASURE_DIVISIONS;
            xml += `  <measure number="${mi + 1}">\n`;
            if (mi === 0) {
                xml += `    <attributes>
      <divisions>${timing_1.DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      ${clefEl}
    </attributes>
`;
            }
            const events = m.voices[voice] ?? [];
            xml += voiceEventsToXml(events, 1, measureStart);
            xml += `  </measure>\n`;
        }
        xml += `  </part>\n`;
    }
    xml += `</score-partwise>
`;
    return xml;
}
