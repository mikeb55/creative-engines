"use strict";
/**
 * Ellington Orchestration Engine — MusicXML export
 * Uses shared canonical notation timing engine.
 * Big band score with proper part structure, clefs, transpositions.
 * Range validation and voicing redistribution happen BEFORE export.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportOrchestrationToMusicXML = exportOrchestrationToMusicXML;
const notationTimingConstants_1 = require("../../shared/notationTimingConstants");
const notationTimingEngine_1 = require("../../shared/notationTimingEngine");
const musicxmlMeasurePacker_1 = require("../../shared/musicxmlMeasurePacker");
const musicxmlTimingValidation_1 = require("../../shared/musicxmlTimingValidation");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Concert (sounding) MIDI range: [min, max] for practical playability */
const INSTRUMENT_RANGES = {
    'Alto Sax 1': [55, 79],
    'Alto Sax 2': [55, 79],
    'Tenor Sax 1': [46, 70],
    'Tenor Sax 2': [46, 70],
    'Baritone Sax': [36, 63],
    'Trumpet 1': [55, 84],
    'Trumpet 2': [52, 81],
    'Trumpet 3': [48, 76],
    'Trumpet 4': [48, 72],
    'Trombone 1': [41, 70],
    'Trombone 2': [38, 67],
    'Trombone 3': [36, 65],
    'Bass Trombone': [34, 58],
    'Piano': [36, 84],
    'Bass': [28, 55],
    'Drums': [0, 0],
};
const INSTRUMENTS = [
    { id: 'P1', name: 'Alto Sax 1', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 0 },
    { id: 'P2', name: 'Alto Sax 2', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 1 },
    { id: 'P3', name: 'Tenor Sax 1', clef: 'treble', transposition: 2, section: 'saxes', sectionIndex: 2 },
    { id: 'P4', name: 'Tenor Sax 2', clef: 'treble', transposition: 2, section: 'saxes', sectionIndex: 3 },
    { id: 'P5', name: 'Baritone Sax', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 4 },
    { id: 'P6', name: 'Trumpet 1', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 0 },
    { id: 'P7', name: 'Trumpet 2', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 1 },
    { id: 'P8', name: 'Trumpet 3', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 2 },
    { id: 'P9', name: 'Trumpet 4', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 3 },
    { id: 'P10', name: 'Trombone 1', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 0 },
    { id: 'P11', name: 'Trombone 2', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 1 },
    { id: 'P12', name: 'Trombone 3', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 2 },
    { id: 'P13', name: 'Bass Trombone', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 3 },
    { id: 'P14', name: 'Piano', clef: 'treble', transposition: 0, section: 'rhythm', sectionIndex: 0 },
    { id: 'P15', name: 'Bass', clef: 'bass', transposition: 0, section: 'rhythm', sectionIndex: 1 },
    { id: 'P16', name: 'Drums', clef: 'percussion', transposition: 0, section: 'rhythm', sectionIndex: 2 },
];
const ROOT_MIDI = {
    C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
    'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
function clampToInstrumentRange(concertMidi, instName) {
    const range = INSTRUMENT_RANGES[instName];
    if (!range || range[0] === 0)
        return concertMidi;
    return Math.max(range[0], Math.min(range[1], concertMidi));
}
function getRootMidi(chord, octave = 3) {
    const base = chord.split('/')[0];
    const m = base.match(/^([A-Ga-g])([#b])?/i);
    if (!m)
        return 48;
    const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
    const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const midi = (ROOT_MIDI[root] ?? 60) + alter + (octave - 4) * 12;
    return midi;
}
function getSectionData(orch, section) {
    switch (section) {
        case 'trumpets': return orch.trumpets;
        case 'trombones': return orch.trombones;
        case 'saxes': return orch.saxes;
        case 'rhythm': return orch.rhythm;
        default: return [];
    }
}
function getPitchForInstrument(inst, pitches, chord) {
    if (inst.section === 'rhythm') {
        if (inst.sectionIndex === 0)
            return pitches[0] ?? null;
        if (inst.sectionIndex === 1)
            return getRootMidi(chord, 2);
        return null;
    }
    if (inst.section === 'saxes' && inst.sectionIndex === 4) {
        return pitches.length > 0 ? Math.min(...pitches) : null;
    }
    return pitches[inst.sectionIndex] ?? null;
}
/** Convert orchestration to TimedNoteEvent[] per part using shared timing. */
function orchestrationToTimedEvents(orch) {
    const allEvents = [];
    const rangeReport = [];
    for (const inst of INSTRUMENTS) {
        const sectionData = getSectionData(orch, inst.section);
        for (let m = 1; m <= orch.totalBars; m++) {
            const barData = sectionData.find((v) => v.bar === m);
            const chord = barData?.chord ?? '';
            const pitches = barData?.pitches ?? [];
            const concertPitch = getPitchForInstrument(inst, pitches, chord);
            const startDivision = (m - 1) * notationTimingConstants_1.MEASURE_DURATION;
            if (concertPitch !== null) {
                const clampedConcert = clampToInstrumentRange(concertPitch, inst.name);
                const writtenPitch = inst.transposition !== 0 ? clampedConcert + inst.transposition : clampedConcert;
                if (clampedConcert !== concertPitch) {
                    rangeReport.push({
                        part: inst.id,
                        instrument: inst.name,
                        bar: m,
                        originalConcert: concertPitch,
                        clampedConcert,
                        writtenPitch,
                    });
                }
                allEvents.push({
                    pitch: writtenPitch,
                    startDivision,
                    durationDivisions: notationTimingConstants_1.MEASURE_DURATION,
                    voice: 1,
                    staff: 1,
                    part: inst.id,
                    tieStart: false,
                    tieStop: false,
                    rest: false,
                });
            }
            else {
                allEvents.push({
                    pitch: 0,
                    startDivision,
                    durationDivisions: notationTimingConstants_1.MEASURE_DURATION,
                    voice: 1,
                    staff: 1,
                    part: inst.id,
                    tieStart: false,
                    tieStop: false,
                    rest: true,
                });
            }
        }
    }
    return { events: allEvents, rangeReport };
}
function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function chordToHarmonyXml(chord) {
    const m = chord.match(/^([A-Ga-g])([#b])?(maj7|min7|m7|7|dom7|m7b5|m6|6|m)?/i);
    if (!m)
        return '';
    const step = m[1].toUpperCase();
    const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const kindMap = {
        maj7: 'major-seventh', min7: 'minor-seventh', m7: 'minor-seventh',
        '7': 'dominant', dom7: 'dominant', m7b5: 'half-diminished', m6: 'minor-sixth', '6': 'major-sixth',
    };
    const kind = kindMap[(m[3] || 'maj7').toLowerCase()] || 'major-seventh';
    const alterEl = alter !== 0 ? `\n      <root-alter>${alter}</root-alter>` : '';
    return `    <harmony>
      <root><root-step>${step}</root-step>${alterEl}</root>
      <kind>${kind}</kind>
    </harmony>
`;
}
function exportOrchestrationToMusicXML(orch, options) {
    const title = options?.title ?? 'Ellington Orchestration';
    const totalBars = orch.totalBars;
    const { events: timedEvents, rangeReport } = orchestrationToTimedEvents(orch);
    const measureEvents = (0, notationTimingEngine_1.packEventsIntoMeasures)(timedEvents, totalBars);
    const validation = (0, musicxmlTimingValidation_1.validateMeasureDurations)(measureEvents);
    if (options?.runPath) {
        fs.writeFileSync(path.join(options.runPath, 'timing_report.json'), JSON.stringify({
            measuresChecked: validation.measuresChecked,
            durationTotals: validation.durationTotals,
            tiesInserted: validation.tiesInserted,
            restsInserted: validation.restsInserted,
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
        }, null, 2), 'utf-8');
        fs.writeFileSync(path.join(options.runPath, 'range_report.json'), JSON.stringify({ entries: rangeReport }, null, 2), 'utf-8');
        fs.writeFileSync(path.join(options.runPath, 'validation_report.json'), JSON.stringify({
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            violationsBlocking: validation.violationsBlocking,
        }, null, 2), 'utf-8');
    }
    if (!validation.valid) {
        throw new Error(`Ellington timing validation failed: ${validation.errors.join('; ')}`);
    }
    const partList = INSTRUMENTS.map((inst) => {
        const transEl = inst.transposition !== 0
            ? `\n      <transpose>\n        <chromatic>${-inst.transposition}</chromatic>\n      </transpose>`
            : '';
        return `    <score-part id="${inst.id}">
      <part-name>${escapeXml(inst.name)}</part-name>
      <score-instrument id="${inst.id}-I1">
        <instrument-name>${escapeXml(inst.name)}</instrument-name>
      </score-instrument>${transEl}
    </score-part>`;
    }).join('\n');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
  <part-list>
${partList}
  </part-list>
`;
    const sectionData = getSectionData(orch, 'saxes');
    for (const inst of INSTRUMENTS) {
        xml += `  <part id="${inst.id}">\n`;
        for (let m = 0; m < totalBars; m++) {
            const measureStart = m * notationTimingConstants_1.MEASURE_DURATION;
            const partEvents = (measureEvents.get(m) ?? []).filter((e) => e.part === inst.id);
            xml += `  <measure number="${m + 1}">\n`;
            if (m === 0) {
                const clefSign = inst.clef === 'bass' ? 'F' : inst.clef === 'percussion' ? 'percussion' : 'G';
                const clefLine = inst.clef === 'bass' ? 4 : 2;
                const clefEl = inst.clef === 'percussion'
                    ? `<clef><sign>percussion</sign><line>2</line></clef>`
                    : `<clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>`;
                xml += `    <attributes>
      <divisions>4</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      ${clefEl}
    </attributes>
`;
            }
            if (inst.id === 'P1') {
                const barData = sectionData.find((v) => v.bar === m + 1);
                const chord = barData?.chord ?? sectionData[0]?.chord;
                if (chord) {
                    const harm = chordToHarmonyXml(chord);
                    if (harm)
                        xml += harm;
                }
            }
            xml += (0, musicxmlMeasurePacker_1.eventsToMeasureXml)(partEvents, m, measureStart);
            xml += `  </measure>\n`;
        }
        xml += `  </part>\n`;
    }
    xml += `</score-partwise>\n`;
    return xml;
}
