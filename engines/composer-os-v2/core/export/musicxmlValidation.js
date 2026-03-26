"use strict";
/**
 * Composer OS V2 — MusicXML validation shell
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMusicXmlSchema = validateMusicXmlSchema;
exports.reParseMusicXml = reParseMusicXml;
/** Stub: schema validation. */
function validateMusicXmlSchema(xml) {
    const hasScorePartwise = xml.includes('<score-partwise');
    return {
        valid: hasScorePartwise,
        errors: hasScorePartwise ? [] : ['Missing score-partwise root'],
    };
}
/** Stub: re-parse validation. */
function reParseMusicXml(xml) {
    const hasMeasure = xml.includes('<measure');
    return {
        valid: hasScorePartwise(xml),
        measureCount: hasMeasure ? 1 : 0,
        errors: hasScorePartwise(xml) ? [] : ['Parse failed'],
    };
}
function hasScorePartwise(x) {
    return x.includes('<score-partwise');
}
