"use strict";
/**
 * Composer OS V2 — Instrument profile validation
 * Fails on wrong identity, tessitura drift, missing texture, missing harmonic anchor.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACOUSTIC_UPRIGHT_BASS = exports.CLEAN_ELECTRIC_GUITAR = void 0;
exports.validateInstrumentIdentity = validateInstrumentIdentity;
exports.validateGuitarProfile = validateGuitarProfile;
exports.validateBassProfile = validateBassProfile;
exports.validateTessitura = validateTessitura;
exports.validateInstrumentProfiles = validateInstrumentProfiles;
const guitarProfile_1 = require("./guitarProfile");
Object.defineProperty(exports, "CLEAN_ELECTRIC_GUITAR", { enumerable: true, get: function () { return guitarProfile_1.CLEAN_ELECTRIC_GUITAR; } });
const uprightBassProfile_1 = require("./uprightBassProfile");
Object.defineProperty(exports, "ACOUSTIC_UPRIGHT_BASS", { enumerable: true, get: function () { return uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS; } });
function isGuitar(p) {
    return p.instrumentIdentity === 'clean_electric_guitar';
}
function isBass(p) {
    return p.instrumentIdentity === 'acoustic_upright_bass';
}
/** Validate instrument identity is supported. */
function validateInstrumentIdentity(profile) {
    const errors = [];
    const supported = ['clean_electric_guitar', 'acoustic_upright_bass'];
    if (!supported.includes(profile.instrumentIdentity)) {
        errors.push(`Unsupported instrument identity: ${profile.instrumentIdentity}`);
    }
    return { valid: errors.length === 0, errors };
}
/** Validate guitar profile: texture mix present. */
function validateGuitarProfile(profile) {
    const errors = [];
    const tr = profile.textureRequirements;
    if (!tr.melody && !tr.dyads && !tr.triads && !tr.fourNoteChords) {
        errors.push('Guitar texture mix is absent: at least one texture type required');
    }
    const [low, high] = profile.hardRange;
    if (low > high) {
        errors.push('Guitar hard range invalid: low > high');
    }
    return { valid: errors.length === 0, errors };
}
/** Validate bass profile: harmonic anchor logic present. */
function validateBassProfile(profile) {
    const errors = [];
    const ha = profile.harmonicAnchorRequirements;
    if (!ha.rootOnOne && !ha.walkingLine && !ha.chordTones) {
        errors.push('Bass harmonic anchor logic is missing: at least one requirement required');
    }
    const [low, high] = profile.hardRange;
    if (low > high) {
        errors.push('Bass hard range invalid: low > high');
    }
    return { valid: errors.length === 0, errors };
}
/** Validate tessitura (average pitch) stays within acceptable zones. */
function validateTessitura(profile, avgPitch) {
    const errors = [];
    const [hardLow, hardHigh] = profile.hardRange;
    if (avgPitch < hardLow || avgPitch > hardHigh) {
        errors.push(`Tessitura ${avgPitch} outside hard range [${hardLow}, ${hardHigh}] for ${profile.instrumentIdentity}`);
    }
    if (isGuitar(profile)) {
        const [prefLow, prefHigh] = profile.preferredMelodicZone;
        if (avgPitch > profile.highDangerZone[0]) {
            errors.push(`Guitar tessitura in high danger zone: ${avgPitch}`);
        }
    }
    if (isBass(profile)) {
        const [walkLow, walkHigh] = profile.preferredWalkingZone;
        if (avgPitch < profile.lowerMudZone[1] && avgPitch > profile.lowerMudZone[0]) {
            errors.push('Bass tessitura in lower mud zone');
        }
        if (avgPitch >= profile.upperDangerZone[0]) {
            errors.push('Bass tessitura in upper danger zone');
        }
    }
    return { valid: errors.length === 0, errors };
}
/** Validate all instrument profiles in a composition. */
function validateInstrumentProfiles(profiles) {
    const allErrors = [];
    for (const p of profiles) {
        const idResult = validateInstrumentIdentity(p);
        allErrors.push(...idResult.errors);
        if (isGuitar(p)) {
            const gResult = validateGuitarProfile(p);
            allErrors.push(...gResult.errors);
        }
        if (isBass(p)) {
            const bResult = validateBassProfile(p);
            allErrors.push(...bResult.errors);
        }
    }
    return { valid: allErrors.length === 0, errors: allErrors };
}
