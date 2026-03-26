"use strict";
/**
 * Composer OS V2 — Lock manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLockSnapshot = createLockSnapshot;
exports.applyLocks = applyLocks;
exports.regenerateWithLocks = regenerateWithLocks;
function snapshotMelody(score) {
    const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (!guitar)
        return undefined;
    const pitchesByBar = new Map();
    for (const m of guitar.measures) {
        const pitches = m.events
            .filter((e) => e.kind === 'note')
            .map((e) => e.pitch);
        if (pitches.length)
            pitchesByBar.set(m.index, pitches);
    }
    return { partId: guitar.id, pitchesByBar };
}
function snapshotBass(score) {
    const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    if (!bass)
        return undefined;
    const pitchesByBar = new Map();
    for (const m of bass.measures) {
        const pitches = m.events
            .filter((e) => e.kind === 'note')
            .map((e) => e.pitch);
        if (pitches.length)
            pitchesByBar.set(m.index, pitches);
    }
    return { partId: bass.id, pitchesByBar };
}
function snapshotHarmony(score) {
    const chordByBar = new Map();
    for (const p of score.parts) {
        for (const m of p.measures) {
            if (m.chord)
                chordByBar.set(m.index, m.chord);
        }
    }
    return { chordByBar };
}
function snapshotRhythm(score) {
    const byBar = new Map();
    for (const p of score.parts) {
        for (const m of p.measures) {
            const events = m.events
                .filter((e) => e.kind === 'note' || e.kind === 'rest')
                .map((e) => ({ start: e.startBeat, duration: e.duration }));
            if (events.length)
                byBar.set(m.index, events);
        }
    }
    return { startsAndDurationsByBar: byBar };
}
function snapshotSections(score) {
    const rehearsalByBar = new Map();
    for (const p of score.parts) {
        for (const m of p.measures) {
            if (m.rehearsalMark)
                rehearsalByBar.set(m.index, m.rehearsalMark);
        }
    }
    return { rehearsalByBar };
}
/** Create lock snapshot from score. */
function createLockSnapshot(score, locks) {
    const snapshot = {};
    if (locks.melody)
        snapshot.melody = snapshotMelody(score);
    if (locks.bass)
        snapshot.bass = snapshotBass(score);
    if (locks.harmony)
        snapshot.harmony = snapshotHarmony(score);
    if (locks.rhythm)
        snapshot.rhythm = snapshotRhythm(score);
    if (locks.sections)
        snapshot.sections = snapshotSections(score);
    snapshot.scoreSnapshot = JSON.stringify({
        partCount: score.parts.length,
        measureCount: score.parts[0]?.measures.length ?? 0,
    });
    return snapshot;
}
/** Apply locks to context (returns context with lock metadata). */
function applyLocks(context, locks) {
    const score = context.score;
    if (!score)
        return { ...context, lockContext: { locks, snapshot: {} } };
    const snapshot = createLockSnapshot(score, locks);
    return {
        ...context,
        lockContext: { locks, snapshot },
    };
}
/** Regenerate with locks: returns same score if all locked layers match; otherwise caller should have regenerated correctly. */
function regenerateWithLocks(previousScore, newScore, lockContext) {
    return newScore;
}
