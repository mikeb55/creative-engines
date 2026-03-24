/**
 * Composer OS V2 — Instrument profile tests
 * Guitar and bass profiles, validation.
 */

import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';
import {
  validateGuitarProfile,
  validateBassProfile,
  validateInstrumentProfiles,
  validateTessitura,
} from '../core/instrument-profiles/instrumentValidation';

function testGuitarProfileIdentity(): boolean {
  return CLEAN_ELECTRIC_GUITAR.instrumentIdentity === 'clean_electric_guitar';
}

function testBassProfileIdentity(): boolean {
  return ACOUSTIC_UPRIGHT_BASS.instrumentIdentity === 'acoustic_upright_bass';
}

function testGuitarTextureRequirements(): boolean {
  const tr = CLEAN_ELECTRIC_GUITAR.textureRequirements;
  return tr.melody && tr.dyads && tr.triads && tr.fourNoteChords;
}

function testBassHarmonicAnchorRequirements(): boolean {
  const ha = ACOUSTIC_UPRIGHT_BASS.harmonicAnchorRequirements;
  return ha.rootOnOne && ha.walkingLine && ha.chordTones;
}

function testGuitarValidationPasses(): boolean {
  const r = validateGuitarProfile(CLEAN_ELECTRIC_GUITAR);
  return r.valid;
}

function testBassValidationPasses(): boolean {
  const r = validateBassProfile(ACOUSTIC_UPRIGHT_BASS);
  return r.valid;
}

function testGuitarTessituraInRange(): boolean {
  const r = validateTessitura(CLEAN_ELECTRIC_GUITAR, 60);
  return r.valid;
}

function testGuitarTessituraOutOfRangeFails(): boolean {
  const r = validateTessitura(CLEAN_ELECTRIC_GUITAR, 100);
  return !r.valid;
}

function testProfilesValidationPasses(): boolean {
  const r = validateInstrumentProfiles([CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS]);
  return r.valid;
}

export function runInstrumentProfileTests(): { name: string; ok: boolean }[] {
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
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
