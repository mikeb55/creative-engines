"use strict";
/**
 * Composer OS V2 — Performance pass
 * Post-generation refinement: articulation / phrasing metadata only.
 * Duration-safe: see performanceRules (no bar-structure or timing edits).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPerformancePass = applyPerformancePass;
const performanceTypes_1 = require("./performanceTypes");
/** Apply performance pass: articulation only; timing unchanged (see performanceRules.ts). */
function applyPerformancePass(score, options = {}) {
    const opts = { ...performanceTypes_1.DEFAULT_PERFORMANCE_OPTIONS, ...options };
    const parts = score.parts.map((p) => ({
        ...p,
        measures: p.measures.map((m) => ({
            ...m,
            events: m.events.map((e) => {
                if (e.kind !== 'note')
                    return e;
                const note = {
                    kind: 'note',
                    pitch: e.pitch,
                    startBeat: e.startBeat,
                    duration: e.duration,
                    voice: e.voice,
                };
                if (opts.applyArticulation) {
                    if (note.duration <= 0.5)
                        note.articulation = 'staccato';
                    else if (note.duration >= 3)
                        note.articulation = 'tenuto';
                }
                return note;
            }),
        })),
    }));
    return { ...score, parts };
}
