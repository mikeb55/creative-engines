"use strict";
/**
 * Score to MusicXML — simple exporter.
 * Iterate score → measures → voices → notes. No measure packing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreToMusicXML = scoreToMusicXML;
const barComposer_1 = require("./barComposer");
const notationTimingConstants_1 = require("./notationTimingConstants");
function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
function durationToType(beats) {
    const divs = Math.round(beats * notationTimingConstants_1.DIVISIONS);
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
function measureToXml(measure, measureIndex, firstMeasure, partId, partIds) {
    const voices = [...new Set(measure.voices.map((v) => v.voice))].sort((a, b) => a - b);
    const allEvents = measure.voices.flatMap((v) => v.events);
    const sorted = allEvents.sort((a, b) => {
        if (a.startBeat !== b.startBeat)
            return a.startBeat - b.startBeat;
        return a.voice - b.voice;
    });
    let xml = `      <measure number="${measureIndex + 1}">\n`;
    if (firstMeasure) {
        xml += `        <attributes>
          <divisions>${notationTimingConstants_1.DIVISIONS}</divisions>
          <key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>\n`;
    }
    for (const voice of voices) {
        const voiceEvents = sorted.filter((e) => e.voice === voice && e.part === partId);
        for (const e of voiceEvents) {
            const durDivs = Math.round(e.duration * notationTimingConstants_1.DIVISIONS);
            if (e.pitch === 0) {
                xml += `        <note><rest/><duration>${durDivs}</duration><type>${durationToType(e.duration)}</type><voice>${voice}</voice></note>\n`;
            }
            else {
                const { step, alter, octave } = midiToPitch(e.pitch);
                const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
                const staffEl = e.staff > 1 ? `<staff>${e.staff}</staff>` : '';
                xml += `        <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${durDivs}</duration><type>${durationToType(e.duration)}</type><voice>${voice}</voice>${staffEl}</note>\n`;
            }
        }
    }
    xml += `      </measure>\n`;
    return xml;
}
/** Export Score to MusicXML. Throws if validation fails. */
function scoreToMusicXML(score, options) {
    const validation = (0, barComposer_1.validateScore)(score.measures);
    if (!validation.valid) {
        throw new Error(`Score validation failed: ${validation.errors.join('; ')}`);
    }
    const partIds = options?.partIds ?? score.parts ?? [...new Set(score.measures.flatMap((m) => m.voices.map((v) => v.part)))];
    const title = score.title ?? 'Score';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
${partIds.map((id) => `    <score-part id="${id}"><part-name>${id}</part-name></score-part>`).join('\n')}
  </part-list>
`;
    for (const partId of partIds) {
        xml += `  <part id="${partId}">\n`;
        for (let m = 0; m < score.measures.length; m++) {
            const measure = score.measures[m];
            xml += measureToXml(measure, m, m === 0, partId, partIds);
        }
        xml += `  </part>\n`;
    }
    xml += `</score-partwise>\n`;
    return xml;
}
