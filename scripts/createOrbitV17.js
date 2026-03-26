"use strict";
/**
 * Orbit V17 — Upgrade bass to true counter-melodic voice.
 *
 * Reads: Orbit_V16_LOCK.musicxml
 * Output: Orbit_V17_LOCK.musicxml
 * Guitar UNCHANGED. Bass UPGRADED: co-compositional, motif-driven, TrueFire principles.
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const OUTPUT_DIR = path.join(__dirname, '..', 'projects', 'guitar-bass-duos', 'V1-orbit');
const SOURCE_FILE = 'Orbit_V16_LOCK.musicxml';
const OUTPUT_FILE = 'Orbit_V17_LOCK.musicxml';
const CHORD_MAP = {
    1: '', 2: 'Fmaj7', 3: 'Ebmaj7#5', 4: 'Dbmaj7', 5: 'Bmaj7', 6: 'Bbm9',
    7: 'Gbmaj7', 8: 'Abmaj7', 9: 'Emaj7', 10: 'Fmaj7', 11: 'Ebmaj7#5',
    12: 'Dbmaj7', 13: 'Bmaj7', 14: 'Bbm9', 15: 'Abmaj7', 16: 'Gbmaj7',
    17: 'Emaj7', 18: 'G/F', 19: 'G/F', 20: 'Eb/F', 21: 'Eb/F', 22: 'G/F',
    23: 'G/F', 24: 'Eb/F', 25: 'Eb/F', 26: 'Dbmaj7', 27: 'Bb7', 28: 'Fmaj7', 29: 'Fmaj7',
};
const DIVISIONS_MAP = {
    1: 4, 2: 4, 3: 6, 4: 4, 5: 1, 6: 4, 7: 4, 8: 4, 9: 4, 10: 1,
    11: 6, 12: 4, 13: 1, 14: 4, 15: 4, 16: 4, 17: 2, 18: 4, 19: 4,
    20: 4, 21: 1, 22: 4, 23: 4, 24: 2, 25: 4, 26: 4, 27: 4, 28: 4, 29: 2,
};
const PC = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
function parseChord(s) {
    if (!s)
        return null;
    const slash = s.indexOf('/');
    if (slash >= 0) {
        const bassStr = s.slice(slash + 1).trim();
        const b = PC[bassStr];
        if (b !== undefined)
            return { root: b, third: (b + 4) % 12, seventh: (b + 10) % 12, bass: b };
        return null;
    }
    const m = s.match(/^([A-G][#b]?)/);
    if (!m)
        return null;
    const r = PC[m[1]];
    if (r === undefined)
        return null;
    const isMin = /m(?:in|7|9)|b5/.test(s) && !/maj/.test(s);
    const third = isMin ? (r + 3) % 12 : (r + 4) % 12;
    const seventh = /maj/.test(s) ? (r + 11) % 12 : (r + 10) % 12;
    return { root: r, third, seventh };
}
function pcToNote(pc, octave) {
    const map = [
        { step: 'C', alter: 0 }, { step: 'C', alter: 1 }, { step: 'D', alter: 0 },
        { step: 'D', alter: 1 }, { step: 'E', alter: 0 }, { step: 'F', alter: 0 },
        { step: 'F', alter: 1 }, { step: 'G', alter: 0 }, { step: 'G', alter: 1 },
        { step: 'A', alter: 0 }, { step: 'A', alter: 1 }, { step: 'B', alter: 0 },
    ];
    const { step, alter } = map[((pc % 12) + 12) % 12];
    return { step, alter, octave };
}
function d2type(d, divs) {
    const q = divs, h = divs * 2, dh = divs * 3;
    if (d <= divs / 2)
        return { type: '16th' };
    if (d <= q)
        return { type: 'eighth' };
    if (d <= q * 1.5)
        return { type: 'eighth', dot: true };
    if (d <= h)
        return { type: 'quarter' };
    if (d <= h + q / 2)
        return { type: 'quarter', dot: true };
    if (d <= dh && d > h)
        return { type: 'half', dot: true }; // dotted half for full 3/4 bar
    if (d <= dh)
        return { type: 'half' };
    if (d <= dh + q / 2)
        return { type: 'half', dot: true };
    return { type: 'whole' };
}
function noteToOctave(pc) {
    if (pc >= 5 && pc <= 11)
        return 2;
    if (pc >= 0 && pc <= 4)
        return 2;
    return 2;
}
function notesToXml(notes, divs) {
    let out = '';
    for (const n of notes) {
        const { type, dot } = d2type(n.duration, divs);
        const dotEl = dot ? '<dot/>' : '';
        if (n.rest) {
            out += `        <note><rest/><duration>${n.duration}</duration><type>${type}</type>${dotEl}<voice>1</voice></note>\n`;
            continue;
        }
        const { step, alter } = pcToNote(n.pc, n.oct ?? 2);
        const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
        const tieNotation = n.tieStart ? '<notations><tied type="start"/></notations>' : n.tieStop ? '<notations><tied type="stop"/></notations>' : '';
        out += `        <note><pitch><step>${step}</step>${alterEl}<octave>${n.oct ?? 2}</octave></pitch><duration>${n.duration}</duration><type>${type}</type>${dotEl}<voice>1</voice>${tieNotation}</note>\n`;
    }
    return out;
}
/** CORE MOTIF: root → 3rd → root (ascending then back). Transformed across sections. */
function composeV17Bass(meas, chordStr, divs, prevLastPc) {
    const total = divs * 3;
    const chord = parseChord(chordStr);
    if (meas === 1) {
        return [{ rest: true, duration: total, divisions: divs }];
    }
    if (meas >= 18 && meas <= 25) {
        const fPc = 5;
        const fOct = 2;
        if (meas === 18)
            return [{ pc: fPc, oct: fOct, duration: 4, divisions: divs }, { pc: fPc, oct: fOct, duration: 4, divisions: divs }, { pc: fPc, oct: fOct, duration: 4, divisions: divs }];
        if (meas === 19)
            return [{ rest: true, duration: 4, divisions: divs }, { pc: fPc, oct: fOct, duration: 8, divisions: divs }];
        if (meas === 20)
            return [{ pc: fPc, oct: fOct, duration: 6, divisions: divs }, { rest: true, duration: 6, divisions: divs }];
        if (meas === 21)
            return [{ pc: fPc, oct: fOct, duration: total, divisions: divs }];
        if (meas === 22)
            return [{ rest: true, duration: 6, divisions: divs }, { pc: fPc, oct: fOct, duration: 6, divisions: divs }];
        if (meas === 23)
            return [{ pc: fPc, oct: fOct, duration: 4, divisions: divs }, { pc: 9, oct: 2, duration: 4, divisions: divs }, { pc: fPc, oct: fOct, duration: 4, divisions: divs }];
        if (meas === 24)
            return [{ pc: fPc, oct: fOct, duration: total, divisions: divs }];
        if (meas === 25)
            return [{ pc: fPc, oct: fOct, duration: 8, divisions: divs }, { pc: fPc, oct: fOct, duration: 4, divisions: divs }];
        return [{ pc: fPc, oct: fOct, duration: total, divisions: divs }];
    }
    if (meas >= 26) {
        if (!chord)
            return [];
        const r = chord.root, t = chord.third, s = chord.seventh;
        const ro = noteToOctave(r);
        if (meas === 26)
            return [{ pc: r, oct: ro, duration: 6, divisions: divs }, { pc: t, oct: ro, duration: 6, divisions: divs }];
        if (meas === 27) {
            const bbRoot = 10, bbThird = 2;
            return [{ pc: bbRoot, oct: 2, duration: 4, divisions: divs }, { pc: bbThird, oct: 2, duration: 4, divisions: divs }, { pc: bbRoot, oct: 2, duration: 4, divisions: divs }];
        }
        if (meas === 28)
            return [{ pc: 4, oct: 2, duration: 4, divisions: divs }, { pc: 5, oct: 2, duration: 8, divisions: divs }];
        if (meas === 29)
            return [{ pc: 5, oct: 2, duration: total, divisions: divs }];
    }
    if (!chord)
        return [];
    const r = chord.root, t = chord.third, s = chord.seventh;
    const ro = noteToOctave(r);
    const to = t < r ? ro + 1 : ro;
    const so = s < r ? ro + 1 : ro;
    switch (meas) {
        case 2:
            return [{ pc: r, oct: ro, duration: 2, divisions: divs }, { pc: t, oct: to, duration: 2, divisions: divs }, { pc: r, oct: ro, duration: 8, divisions: divs }];
        case 3:
            return [{ rest: true, duration: 6, divisions: divs }, { pc: r, oct: ro, duration: 6, divisions: divs }, { pc: s, oct: so, duration: 6, divisions: divs }];
        case 4:
            return [{ pc: s, oct: so, duration: 4, divisions: divs }, { pc: r, oct: ro, duration: 8, divisions: divs }];
        case 5:
            return [{ pc: r, oct: ro, duration: total, divisions: divs }];
        case 6:
            return [{ rest: true, duration: 4, divisions: divs }, { pc: t, oct: to, duration: 4, divisions: divs }, { pc: r, oct: ro, duration: 4, divisions: divs }];
        case 7:
            return [{ pc: (r - 1 + 12) % 12, oct: ro, duration: 2, divisions: divs }, { pc: r, oct: ro, duration: 4, divisions: divs }, { pc: t, oct: to, duration: 6, divisions: divs }];
        case 8:
            return [{ pc: r, oct: ro, duration: 8, divisions: divs }, { pc: s, oct: so, duration: 4, divisions: divs }];
        case 9:
            return [{ pc: r, oct: ro, duration: 4, divisions: divs }, { pc: t, oct: to, duration: 4, divisions: divs }, { pc: r, oct: ro, duration: 4, divisions: divs }];
        case 10:
            return [{ pc: r, oct: ro, duration: total, divisions: divs }];
        case 11:
            return [{ pc: s, oct: so, duration: 6, divisions: divs }, { pc: r, oct: ro, duration: 6, divisions: divs }, { pc: t, oct: to, duration: 6, divisions: divs }];
        case 12:
            return [{ pc: r, oct: ro, duration: 2, divisions: divs }, { pc: t, oct: to, duration: 4, divisions: divs }, { pc: r, oct: ro, duration: 6, divisions: divs }];
        case 13:
            return [{ pc: r, oct: ro, duration: total, divisions: divs }];
        case 14:
            return [{ rest: true, duration: 6, divisions: divs }, { pc: r, oct: ro, duration: 6, divisions: divs }];
        case 15:
            return [{ pc: (r + 1) % 12, oct: ro, duration: 2, divisions: divs }, { pc: r, oct: ro, duration: 4, divisions: divs }, { pc: t, oct: to, duration: 6, divisions: divs }];
        case 16:
            return [{ pc: t, oct: to, duration: 6, divisions: divs }, { pc: r, oct: ro, duration: 6, divisions: divs }];
        case 17:
            return [{ pc: r, oct: ro, duration: 4, divisions: divs }, { pc: s, oct: so, duration: 2, divisions: divs }];
        default:
            return [{ pc: r, oct: ro, duration: total, divisions: divs }];
    }
}
function main() {
    const srcPath = path.join(OUTPUT_DIR, SOURCE_FILE);
    const outPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    if (!fs.existsSync(srcPath)) {
        console.error(`Source not found: ${srcPath}`);
        process.exit(1);
    }
    const xml = fs.readFileSync(srcPath, 'utf-8');
    const parts = xml.match(/<part\s+id="(P\d)"[^>]*>([\s\S]*?)<\/part>/g);
    if (!parts || parts.length < 2) {
        console.error('Could not parse parts');
        process.exit(1);
    }
    const guitarPart = parts[0];
    const bassPartMatch = parts[1].match(/<part\s+id="(P\d)"[^>]*>([\s\S]*?)<\/part>/);
    if (!bassPartMatch) {
        console.error('Could not parse bass part');
        process.exit(1);
    }
    const measureRegex = /<measure\s+number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g;
    const measures = [];
    let m;
    const guitarContent = guitarPart.replace(/<part[^>]*>|<\/part>/g, '');
    while ((m = measureRegex.exec(guitarContent)) !== null) {
        measures.push({ num: parseInt(m[1], 10), content: m[2] });
    }
    measures.sort((a, b) => a.num - b.num);
    if (measures.length !== 29) {
        console.error(`Expected 29 measures, found ${measures.length}`);
        process.exit(1);
    }
    let prevPc = null;
    const bassMeasures = [];
    for (const meas of measures) {
        const chordStr = CHORD_MAP[meas.num] ?? '';
        const divs = DIVISIONS_MAP[meas.num] ?? 4;
        const notes = composeV17Bass(meas.num, chordStr, divs, prevPc);
        if (notes.length > 0 && !notes[0].rest && notes[notes.length - 1].pc !== undefined) {
            prevPc = notes[notes.length - 1].pc;
        }
        bassMeasures.push(notesToXml(notes, divs));
    }
    const firstMeas = measures[0].content;
    const firstDiv = firstMeas.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '4';
    const beatsMatch = firstMeas.match(/<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/);
    const beats = beatsMatch?.[1] ?? '3';
    const beatType = beatsMatch?.[2] ?? '4';
    let out = xml.replace(/<work-title>Orbit V16<\/work-title>/, '<work-title>Orbit V17</work-title>');
    const bassPartStart = out.indexOf('<part id="P2">');
    const bassPartEnd = out.indexOf('</part>', bassPartStart) + 7;
    const beforeBass = out.slice(0, bassPartStart);
    const afterBass = out.slice(bassPartEnd);
    let newBassPart = `  <part id="P2">
`;
    let currentDiv = firstDiv;
    for (let i = 0; i < measures.length; i++) {
        const meas = measures[i];
        const divs = DIVISIONS_MAP[meas.num] ?? 4;
        newBassPart += `    <measure number="${meas.num}">\n`;
        if (i === 0) {
            newBassPart += `    <attributes>
      <divisions>${divs}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
      <clef><sign>F</sign><line>4</line></clef>
    </attributes>
`;
        }
        else if (String(divs) !== currentDiv) {
            newBassPart += `    <attributes>
      <divisions>${divs}</divisions>
    </attributes>
`;
        }
        currentDiv = String(divs);
        newBassPart += bassMeasures[i];
        newBassPart += `    </measure>\n`;
    }
    newBassPart += `  </part>
`;
    out = beforeBass + newBassPart + afterBass;
    fs.writeFileSync(outPath, out, 'utf-8');
    console.log(`Written: ${outPath}`);
}
main();
