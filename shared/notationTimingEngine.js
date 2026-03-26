"use strict";
/**
 * Canonical notation timing engine.
 * Single source of truth for measure packing, beat accounting, note splitting, rest filling, ties.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTimedEvents = normalizeTimedEvents;
exports.splitEventsAcrossBarlines = splitEventsAcrossBarlines;
exports.fillMeasureRests = fillMeasureRests;
exports.packEventsIntoMeasures = packEventsIntoMeasures;
exports.buildVoiceTimeline = buildVoiceTimeline;
const notationTimingConstants_1 = require("./notationTimingConstants");
/** Normalize raw events: ensure positive durations, clamp to divisions. */
function normalizeTimedEvents(events) {
    return events.map((e) => ({
        pitch: e.pitch,
        startDivision: Math.max(0, Math.floor(e.startDivision)),
        durationDivisions: Math.max(1, Math.floor(e.durationDivisions)),
        voice: e.voice ?? 1,
        staff: e.staff ?? 1,
        part: e.part ?? 'P1',
        tieStart: false,
        tieStop: false,
        rest: false,
    }));
}
/** Split events across barlines; add tieStart/tieStop. */
function splitEventsAcrossBarlines(events) {
    const out = [];
    for (const e of events) {
        let start = e.startDivision;
        let dur = e.durationDivisions;
        const origStart = start;
        while (dur > 0) {
            const measureIndex = Math.floor(start / notationTimingConstants_1.MEASURE_DURATION);
            const measureStart = measureIndex * notationTimingConstants_1.MEASURE_DURATION;
            const measureEnd = measureStart + notationTimingConstants_1.MEASURE_DURATION;
            const spaceInMeasure = measureEnd - start;
            const take = Math.min(dur, spaceInMeasure);
            if (take <= 0)
                break;
            out.push({
                ...e,
                startDivision: start,
                durationDivisions: take,
                tieStart: start > origStart || dur > take,
                tieStop: dur > take,
            });
            start += take;
            dur -= take;
        }
    }
    return out.sort((a, b) => a.startDivision - b.startDivision);
}
/** Fill measure with rests where needed. */
function fillMeasureRests(events, measureIndex, voice, staff, part) {
    const measureStart = measureIndex * notationTimingConstants_1.MEASURE_DURATION;
    const measureEnd = measureStart + notationTimingConstants_1.MEASURE_DURATION;
    const voiceEvents = events
        .filter((e) => e.voice === voice && e.staff === staff && e.part === part)
        .sort((a, b) => a.startDivision - b.startDivision);
    const result = [];
    let cursor = measureStart;
    for (const e of voiceEvents) {
        if (e.startDivision > cursor) {
            const restDur = Math.min(e.startDivision - cursor, measureEnd - cursor);
            if (restDur > 0) {
                result.push({
                    pitch: 0,
                    startDivision: cursor,
                    durationDivisions: restDur,
                    voice,
                    staff,
                    part,
                    tieStart: false,
                    tieStop: false,
                    rest: true,
                });
                cursor += restDur;
            }
        }
        const spaceLeft = measureEnd - cursor;
        const actualDur = Math.min(e.durationDivisions, spaceLeft);
        if (actualDur <= 0)
            continue;
        result.push({
            ...e,
            durationDivisions: actualDur,
            tieStart: e.tieStart,
            tieStop: e.tieStop,
        });
        cursor += actualDur;
    }
    if (cursor < measureEnd) {
        result.push({
            pitch: 0,
            startDivision: cursor,
            durationDivisions: measureEnd - cursor,
            voice,
            staff,
            part,
            tieStart: false,
            tieStop: false,
            rest: true,
        });
    }
    return result.sort((a, b) => a.startDivision - b.startDivision);
}
/** Pack events into measures; ensure each measure sums to MEASURE_DURATION. */
function packEventsIntoMeasures(events, measureCount) {
    const split = splitEventsAcrossBarlines(events);
    const byMeasure = new Map();
    for (const e of split) {
        const m = Math.floor(e.startDivision / notationTimingConstants_1.MEASURE_DURATION);
        const arr = byMeasure.get(m) ?? [];
        arr.push(e);
        byMeasure.set(m, arr);
    }
    const voiceKeys = [...new Set(split.map((e) => `${e.part}:${e.voice}:${e.staff}`))];
    for (let m = 0; m < measureCount; m++) {
        const measureStart = m * notationTimingConstants_1.MEASURE_DURATION;
        const result = [];
        for (const key of voiceKeys) {
            const [part, voiceStr, staffStr] = key.split(':');
            const voice = parseInt(voiceStr, 10);
            const staff = parseInt(staffStr, 10);
            const existing = (byMeasure.get(m) ?? []).filter((e) => e.part === part && e.voice === voice && e.staff === staff);
            const filled = fillMeasureRests(existing, m, voice, staff, part);
            result.push(...filled);
        }
        result.sort((a, b) => a.startDivision - b.startDivision);
        byMeasure.set(m, result);
    }
    return byMeasure;
}
/** Build voice timeline from raw events (onset in beats, duration in beats). */
function buildVoiceTimeline(rawEvents, partId = 'P1') {
    const events = rawEvents.map((e) => ({
        pitch: e.pitch,
        startDivision: (0, notationTimingConstants_1.beatsToDivisions)(e.onsetBeats),
        durationDivisions: Math.max(1, (0, notationTimingConstants_1.beatsToDivisions)(e.durationBeats)),
        voice: e.voice ?? 1,
        staff: e.staff ?? 1,
        part: e.part ?? partId,
    }));
    return normalizeTimedEvents(events);
}
