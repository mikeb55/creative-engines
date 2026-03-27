"use strict";
/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 * Keep in sync with scoreModelTypes.ts (Node may resolve .js before .ts).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEASURE_TICKS_4_4 =
  exports.MUSIC_XML_DIVISIONS_PER_QUARTER =
  exports.MEASURE_DIVISIONS =
  exports.BEATS_PER_MEASURE =
  exports.DIVISIONS =
    void 0;
/** MusicXML divisions per quarter note (fixed tick grid). */
exports.DIVISIONS = 480;
/** Beats per measure (4/4). */
exports.BEATS_PER_MEASURE = 4;
/** Measure duration in divisions. */
exports.MEASURE_DIVISIONS = exports.DIVISIONS * exports.BEATS_PER_MEASURE;
exports.MUSIC_XML_DIVISIONS_PER_QUARTER = exports.DIVISIONS;
exports.MEASURE_TICKS_4_4 = exports.MEASURE_DIVISIONS;
