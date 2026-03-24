"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGuitarBassDuoBassIdentityInMusicXml = validateGuitarBassDuoBassIdentityInMusicXml;
const guitarBassDuoExportNames_1 = require("../instrument-profiles/guitarBassDuoExportNames");
function validateGuitarBassDuoBassIdentityInMusicXml(xml) {
    const errors = [];
    const bassPart = xml.match(/<score-part id="bass">[\s\S]*?<\/score-part>/);
    if (!bassPart) {
        return { valid: false, errors: ['Missing bass score-part'] };
    }
    const block = bassPart[0];
    if (!block.includes(`<part-name>${guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_PART_NAME}</part-name>`)) {
        errors.push(`Bass part-name must be "${guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_PART_NAME}"`);
    }
    if (!block.includes('<midi-program>33</midi-program>')) {
        errors.push('Bass midi-program must be 33 (GM Acoustic Bass)');
    }
    if (!block.includes(`<instrument-sound>${guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND}</instrument-sound>`)) {
        errors.push(`Bass instrument-sound must be ${guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND}`);
    }
    if (/<instrument-name>[^<]*(choir|vocal|voice\s|singer)[^<]*<\/instrument-name>/i.test(block)) {
        errors.push('Bass instrument-name must not suggest vocal/choir');
    }
    return { valid: errors.length === 0, errors };
}
