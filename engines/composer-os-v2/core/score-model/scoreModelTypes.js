"use strict";
/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEASURE_DIVISIONS = exports.BEATS_PER_MEASURE = exports.DIVISIONS = void 0;
/** Divisions per quarter note (MusicXML standard). */
exports.DIVISIONS = 4;
/** Beats per measure (4/4). */
exports.BEATS_PER_MEASURE = 4;
/** Measure duration in divisions. */
exports.MEASURE_DIVISIONS = exports.DIVISIONS * exports.BEATS_PER_MEASURE;
