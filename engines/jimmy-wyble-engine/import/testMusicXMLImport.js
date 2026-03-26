"use strict";
/**
 * MusicXML Import — Parser tests
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
const parseMusicXMLToProgression_1 = require("./parseMusicXMLToProgression");
const FIXTURES = path.join(__dirname, 'fixtures');
function loadFixture(name) {
    return fs.readFileSync(path.join(FIXTURES, name), 'utf-8');
}
let passed = 0;
let failed = 0;
function ok(cond, msg) {
    if (cond) {
        passed++;
        return;
    }
    failed++;
    console.error('FAIL:', msg);
}
function test(name, fn) {
    try {
        fn();
    }
    catch (e) {
        failed++;
        console.error('FAIL:', name, e);
    }
}
test('ii-V-I: extracts correct progression', () => {
    const xml = loadFixture('ii_v_i_simple.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === true, 'should succeed');
    if (result.success) {
        ok(result.totalBars === 8, `totalBars should be 8, got ${result.totalBars}`);
        ok(result.progression.length >= 2, `progression should have at least 2 segments, got ${result.progression.length}`);
        const chords = result.progression.map(p => p.chord).join(',');
        ok(chords.includes('Dm7') || chords.includes('Dm'), `should contain Dm7, got ${chords}`);
        ok(chords.includes('G7'), `should contain G7, got ${chords}`);
        ok(chords.includes('Cmaj7') || chords.includes('C'), `should contain Cmaj7, got ${chords}`);
    }
});
test('blues: extracts correct bar count', () => {
    const xml = loadFixture('blues_simple.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === true, 'should succeed');
    if (result.success) {
        ok(result.totalBars === 12, `totalBars should be 12, got ${result.totalBars}`);
        ok(result.progression.some(p => p.chord.includes('C') && p.chord.includes('7')), 'should have C7');
        ok(result.progression.some(p => p.chord.includes('F')), 'should have F7');
        ok(result.progression.some(p => p.chord.includes('G')), 'should have G7');
    }
});
test('no chord symbols: fails cleanly', () => {
    const xml = loadFixture('no_chord_symbols.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === false, 'should fail');
    if (!result.success) {
        ok(result.code === 'NO_CHORD_SYMBOLS', `code should be NO_CHORD_SYMBOLS, got ${result.code}`);
    }
});
test('odd meter: fails cleanly', () => {
    const xml = loadFixture('odd_meter.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === false, 'should fail');
    if (!result.success) {
        ok(result.code === 'UNSUPPORTED_METER', `code should be UNSUPPORTED_METER, got ${result.code}`);
    }
});
test('with repeat: fails cleanly', () => {
    const xml = loadFixture('with_repeat.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === false, 'should fail');
    if (!result.success) {
        ok(result.code === 'CODA_DETECTED' || result.code === 'UNSUPPORTED_STRUCTURE', `code should indicate repeat, got ${result.code}`);
    }
});
console.log(`\nMusicXML Import Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
