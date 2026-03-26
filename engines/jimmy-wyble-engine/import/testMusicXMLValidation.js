"use strict";
/**
 * MusicXML Import — Validation tests
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
const musicxmlValidation_1 = require("./musicxmlValidation");
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
test('valid ii-V-I: passes validation', () => {
    const xml = loadFixture('ii_v_i_simple.xml');
    const err = (0, musicxmlValidation_1.validateMusicXMLContent)(xml);
    ok(err === null, 'should pass validation');
});
test('valid blues: passes validation', () => {
    const xml = loadFixture('blues_simple.xml');
    const err = (0, musicxmlValidation_1.validateMusicXMLContent)(xml);
    ok(err === null, 'should pass validation');
});
test('odd meter: fails validation', () => {
    const xml = loadFixture('odd_meter.xml');
    const err = (0, musicxmlValidation_1.validateMusicXMLContent)(xml);
    ok(err !== null, 'should fail');
    ok(err?.code === 'UNSUPPORTED_METER', `code should be UNSUPPORTED_METER, got ${err?.code}`);
});
test('with repeat: fails validation', () => {
    const xml = loadFixture('with_repeat.xml');
    const err = (0, musicxmlValidation_1.validateMusicXMLContent)(xml);
    ok(err !== null, 'should fail');
});
test('empty XML: fails validation', () => {
    const err = (0, musicxmlValidation_1.validateMusicXMLContent)('');
    ok(err !== null, 'should fail');
    ok(err?.code === 'INVALID_XML', `code should be INVALID_XML, got ${err?.code}`);
});
console.log(`\nMusicXML Validation Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
