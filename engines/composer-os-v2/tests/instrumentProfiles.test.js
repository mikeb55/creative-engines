"use strict";
/**
 * Composer OS V2 — Instrument profile tests
 * Guitar and bass profiles, validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInstrumentProfileTests = runInstrumentProfileTests;
const guitarProfile_1 = require("../core/instrument-profiles/guitarProfile");
const uprightBassProfile_1 = require("../core/instrument-profiles/uprightBassProfile");
const instrumentValidation_1 = require("../core/instrument-profiles/instrumentValidation");
function testGuitarProfileIdentity() {
    return guitarProfile_1.CLEAN_ELECTRIC_GUITAR.instrumentIdentity === 'clean_electric_guitar';
}
function testBassProfileIdentity() {
    return uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS.instrumentIdentity === 'acoustic_upright_bass';
}
function testGuitarTextureRequirements() {
    const tr = guitarProfile_1.CLEAN_ELECTRIC_GUITAR.textureRequirements;
    return tr.melody && tr.dyads && tr.triads && tr.fourNoteChords;
}
function testBassHarmonicAnchorRequirements() {
    const ha = uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS.harmonicAnchorRequirements;
    return ha.rootOnOne && ha.walkingLine && ha.chordTones;
}
function testGuitarValidationPasses() {
    const r = (0, instrumentValidation_1.validateGuitarProfile)(guitarProfile_1.CLEAN_ELECTRIC_GUITAR);
    return r.valid;
}
function testBassValidationPasses() {
    const r = (0, instrumentValidation_1.validateBassProfile)(uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS);
    return r.valid;
}
function testGuitarTessituraInRange() {
    const r = (0, instrumentValidation_1.validateTessitura)(guitarProfile_1.CLEAN_ELECTRIC_GUITAR, 60);
    return r.valid;
}
function testGuitarTessituraOutOfRangeFails() {
    const r = (0, instrumentValidation_1.validateTessitura)(guitarProfile_1.CLEAN_ELECTRIC_GUITAR, 100);
    return !r.valid;
}
function testProfilesValidationPasses() {
    const r = (0, instrumentValidation_1.validateInstrumentProfiles)([guitarProfile_1.CLEAN_ELECTRIC_GUITAR, uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS]);
    return r.valid;
}
function runInstrumentProfileTests() {
    return [
        ['Guitar identity is clean_electric_guitar', testGuitarProfileIdentity],
        ['Bass identity is acoustic_upright_bass', testBassProfileIdentity],
        ['Guitar has texture requirements', testGuitarTextureRequirements],
        ['Bass has harmonic anchor requirements', testBassHarmonicAnchorRequirements],
        ['Guitar validation passes', testGuitarValidationPasses],
        ['Bass validation passes', testBassValidationPasses],
        ['Guitar tessitura in range passes', testGuitarTessituraInRange],
        ['Guitar tessitura out of range fails', testGuitarTessituraOutOfRangeFails],
        ['Both profiles validate', testProfilesValidationPasses],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
