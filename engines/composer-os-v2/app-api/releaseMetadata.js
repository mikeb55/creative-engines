"use strict";
/**
 * Keep in sync with releaseMetadata.ts (Node may resolve .js first).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const composerOsConfig_1 = require("./composerOsConfig");
exports.COMPOSER_OS_VERSION = composerOsConfig_1.COMPOSER_OS_VERSION;
exports.COMPOSER_OS_V1_SUPPORTED_MODES = [
  {
    presetId: "guitar_bass_duo",
    displayName: "Guitar–Bass Duo",
    capability: "musicxml_generation",
    honestNote: "Full golden-path MusicXML generation.",
  },
  {
    presetId: "ecm_chamber",
    displayName: "ECM Chamber",
    capability: "musicxml_generation",
    honestNote: "Full chamber MusicXML generation (Metheny / Schneider modes).",
  },
  {
    presetId: "riff_generator",
    displayName: "Riff Generator",
    capability: "musicxml_generation",
    honestNote:
      "Short loopable riffs (1–4 bars) to the library Riffs folder; strict grid; internal riff composite gate only (not duo GCE).",
  },
  {
    presetId: "song_mode",
    displayName: "Song Mode",
    capability: "musicxml_generation",
    honestNote:
      "Song plan (hooks, sections, rules) then golden-path Guitar–Bass Duo realisation as exported MusicXML.",
  },
  {
    presetId: "wyble_etude",
    displayName: "Wyble Etude",
    capability: "musicxml_generation",
    honestNote: "Two-voice contrapuntal guitar etude as exported MusicXML (Jimmy Wyble engine).",
  },
  {
    presetId: "big_band",
    displayName: "Big Band",
    capability: "musicxml_generation",
    honestNote:
      "Full 7-part ensemble MusicXML when realisation and export pass; planning JSON if realisation or export fails.",
  },
  {
    presetId: "string_quartet",
    displayName: "String Quartet",
    capability: "musicxml_generation",
    honestNote:
      "4-part string ensemble with piano chord reduction. Piano staff carries harmony symbols, not played notes. MusicXML when realisation and export pass; planning JSON if realisation or export fails.",
  },
];
