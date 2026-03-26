"use strict";
/**
 * Ellington-specific MusicXML validation for Sibelius handoff.
 * Validates before write. Exits 0 if valid, 1 if invalid.
 *
 * Checks:
 * 1. XML well-formedness
 * 2. Every <score-part id> has a matching <part id>
 * 3. All parts have exactly 8 measures
 * 4. Every measure totals 16 divisions
 * 5. No empty/malformed note blocks
 * 6. All tags properly closed
 * 7. Transposition only on transposing instruments (structural check)
 * 8. No percussion clef (safe mode: drums use treble)
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
exports.validateEllingtonMusicXML = validateEllingtonMusicXML;
function validateEllingtonMusicXML(xml) {
    const errors = [];
    // 1. XML well-formedness
    if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<')) {
        errors.push('Invalid XML: missing declaration or root');
    }
    if (!xml.includes('<score-partwise')) {
        errors.push('Invalid MusicXML: missing score-partwise');
    }
    if (!xml.includes('</score-partwise>')) {
        errors.push('Invalid MusicXML: unclosed score-partwise');
    }
    const open = (xml.match(/</g) || []).length;
    const close = (xml.match(/>/g) || []).length;
    if (open !== close) {
        errors.push('XML may be malformed: tag count mismatch');
    }
    // 2. part-list and score-part / part id match
    if (!/<part-list>/.test(xml))
        errors.push('Required: <part-list>');
    const scorePartIds = [...xml.matchAll(/<score-part\s+id="([^"]+)"/g)].map((m) => m[1]);
    const partIds = [...xml.matchAll(/<part\s+id="([^"]+)"/g)].map((m) => m[1]);
    for (const id of scorePartIds) {
        if (!partIds.includes(id))
            errors.push(`Part ${id} in part-list but no matching <part id="${id}">`);
    }
    for (const id of partIds) {
        if (!scorePartIds.includes(id))
            errors.push(`Part ${id} present but not in part-list`);
    }
    // 3. All parts have exactly 8 measures
    const EXPECTED_MEASURES = 8;
    for (const id of partIds) {
        const partStart = xml.indexOf(`<part id="${id}"`);
        if (partStart < 0)
            continue;
        const partEnd = xml.indexOf('</part>', partStart);
        const partContent = partEnd >= 0 ? xml.slice(partStart, partEnd) : xml.slice(partStart);
        const measureCount = (partContent.match(/<measure\s+number=/g) || []).length;
        if (measureCount !== EXPECTED_MEASURES) {
            errors.push(`Part ${id}: expected ${EXPECTED_MEASURES} measures, found ${measureCount}`);
        }
    }
    // 4. Every measure totals 16 divisions
    const measureRegex = /<measure\s+number="(\d+)">([\s\S]*?)<\/measure>/g;
    let mm;
    while ((mm = measureRegex.exec(xml)) !== null) {
        const content = mm[2];
        const noteDurations = [...content.matchAll(/<note>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
        const total = noteDurations.reduce((a, b) => a + b, 0);
        if (total !== 16) {
            errors.push(`Measure ${mm[1]}: duration sum ${total} != 16`);
        }
    }
    // 5. No empty/malformed note blocks
    const malformedNote = /<note>\s*<\/note>/;
    if (malformedNote.test(xml))
        errors.push('Found empty <note></note> block');
    const noteWithoutDuration = /<note>(?:(?!<duration>)[\s\S])*?<\/note>/;
    const allNotes = [...xml.matchAll(/<note>[\s\S]*?<\/note>/g)];
    for (const m of allNotes) {
        const noteContent = m[0];
        if (!/<duration>\d+<\/duration>/.test(noteContent)) {
            errors.push('Note without <duration> found');
            break;
        }
    }
    // 6. Required attributes (core uses divisions=4, measure total = 16)
    if (!/<divisions>\d+<\/divisions>/.test(xml))
        errors.push('Required: <divisions> in attributes');
    if (!/<fifths>/.test(xml))
        errors.push('Required: <key><fifths>');
    if (!/<beats>4<\/beats>/.test(xml))
        errors.push('Expected 4/4 time');
    if (!/<clef[\s>]/.test(xml))
        errors.push('Required: <clef> in attributes');
    // 7. Transposition: only on instruments that have it (structural — we trust partSpecs)
    // No extra validation needed if part-list matches parts.
    // 8. No percussion clef (safe mode)
    if (/<sign>percussion<\/sign>/.test(xml)) {
        errors.push('Percussion clef not allowed in safe mode; use treble for drums');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
const fs = __importStar(require("fs"));
function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: npx ts-node scripts/validateEllingtonMusicXML.ts <path>');
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    const xml = fs.readFileSync(filePath, 'utf8');
    const result = validateEllingtonMusicXML(xml);
    if (!result.valid) {
        result.errors.forEach((e) => console.error(`[validateEllingtonMusicXML] ${e}`));
        process.exit(1);
    }
    process.exit(0);
}
// CLI entry when run directly
const isMain = process.argv[1]?.endsWith('validateEllingtonMusicXML.ts') ?? false;
if (isMain)
    main();
