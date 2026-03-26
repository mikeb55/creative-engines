"use strict";
/**
 * MusicXML Import — Wyble engine integration tests
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
const wybleEngine_1 = require("../wybleEngine");
const wybleAutoTest_1 = require("../wybleAutoTest");
const FIXTURES = path.join(__dirname, 'fixtures');
function loadFixture(name) {
    return fs.readFileSync(path.join(FIXTURES, name), 'utf-8');
}
function progressionToHarmonicContext(progression) {
    const chords = progression.map(({ chord, bars }) => {
        const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7|dim|aug|m7b5)?/i);
        if (!match)
            return { root: 'C', quality: 'maj', bars };
        let q = (match[2] ?? 'maj').toLowerCase();
        if (q === 'm7' || q === 'min7' || q === 'm7b5')
            q = 'min';
        if (q === '7' || q === 'dom7')
            q = 'dom';
        if (q === 'maj7')
            q = 'maj';
        return { root: match[1], quality: q, bars };
    });
    return { chords, key: 'C' };
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
test('parsed ii-V-I feeds Wyble engine', () => {
    const xml = loadFixture('ii_v_i_simple.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === true, 'parse should succeed');
    if (!result.success)
        return;
    const harmonicContext = progressionToHarmonicContext(result.progression);
    const output = (0, wybleEngine_1.generateWybleEtude)({
        harmonicContext,
        phraseLength: result.totalBars,
        independenceBias: 0.8,
        contraryMotionBias: 0.7,
        dyadDensity: 0.6,
    });
    ok(output.upper_line.events.length > 0, 'should have upper line events');
    ok(output.lower_line.events.length > 0, 'should have lower line events');
    ok(output.implied_harmony.length > 0, 'should have implied harmony');
});
test('parsed blues feeds Wyble engine', () => {
    const xml = loadFixture('blues_simple.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === true, 'parse should succeed');
    if (!result.success)
        return;
    const harmonicContext = progressionToHarmonicContext(result.progression);
    const output = (0, wybleEngine_1.generateWybleEtude)({
        harmonicContext,
        phraseLength: result.totalBars,
    });
    ok(output.upper_line.events.length > 0, 'should have upper line events');
    ok(output.lower_line.events.length > 0, 'should have lower line events');
});
test('imported progression preserves playability', () => {
    const xml = loadFixture('ii_v_i_simple.xml');
    const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
    ok(result.success === true, 'parse should succeed');
    if (!result.success)
        return;
    const harmonicContext = progressionToHarmonicContext(result.progression);
    let violations = 0;
    for (let i = 0; i < 5; i++) {
        const output = (0, wybleEngine_1.generateWybleEtude)({
            harmonicContext,
            phraseLength: result.totalBars,
        });
        const score = (0, wybleAutoTest_1.evaluateWybleStudy)(output);
        const upperDyads = output.upper_line.events.filter(e => e.isDyad);
        const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
        for (let j = 0; j < Math.min(upperDyads.length, lowerDyads.length); j++) {
            const iv = upperDyads[j].pitch - lowerDyads[j].pitch;
            if (iv > 18 || iv < 0)
                violations++;
        }
    }
    ok(violations === 0, `playability violations should be 0, got ${violations}`);
});
console.log(`\nMusicXML-Wyble Integration Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
