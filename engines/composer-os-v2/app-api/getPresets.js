"use strict";
/**
 * Composer OS V2 — App API: get presets
 * Keep in sync with getPresets.ts (Node may resolve .js first).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresets = getPresets;
const guitarBassDuoPreset_1 = require("../presets/guitarBassDuoPreset");
const ecmChamberPreset_1 = require("../presets/ecmChamberPreset");
const bigBandPreset_1 = require("../presets/bigBandPreset");
const stringQuartetPreset_1 = require("../presets/stringQuartetPreset");
const PRESETS = [
    {
        id: guitarBassDuoPreset_1.guitarBassDuoPreset.id,
        name: guitarBassDuoPreset_1.guitarBassDuoPreset.name,
        description: 'Clean Electric Guitar + Acoustic Upright Bass. Chord symbols and rehearsal marks.',
        supported: true,
    },
    {
        id: ecmChamberPreset_1.ecmChamberPreset.id,
        name: ecmChamberPreset_1.ecmChamberPreset.name,
        description: 'ECM chamber jazz: Metheny-style quartet or Schneider/Wheeler-style chamber modes (straight feel, modal harmony).',
        supported: true,
    },
    {
        id: bigBandPreset_1.bigBandPreset.id,
        name: bigBandPreset_1.bigBandPreset.name,
        description: 'Big band planning mode: form/section/density/orchestration via runBigBandMode (no full ensemble MusicXML yet).',
        supported: true,
    },
    {
        id: stringQuartetPreset_1.stringQuartetPreset.id,
        name: stringQuartetPreset_1.stringQuartetPreset.name,
        description: 'String quartet planning: form/texture/density/orchestration via runStringQuartetMode (no quartet MusicXML yet).',
        supported: true,
    },
];
function getPresets() {
    return [...PRESETS];
}
