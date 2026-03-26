"use strict";
/**
 * Composer OS V2 — Retro test utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFixture = extractFixture;
function extractFixture(score, plans, readiness) {
    const barCount = score.parts[0]?.measures.length ?? 0;
    const sectionLabels = barCount >= 8 ? ['A', 'B'] : [];
    const eventCountByPart = {};
    const pitchRangeByPart = {};
    for (const p of score.parts) {
        let count = 0;
        let minP = 127;
        let maxP = 0;
        for (const m of p.measures) {
            for (const e of m.events) {
                count++;
                if (e.kind === 'note') {
                    minP = Math.min(minP, e.pitch);
                    maxP = Math.max(maxP, e.pitch);
                }
            }
        }
        eventCountByPart[p.instrumentIdentity] = count;
        pitchRangeByPart[p.instrumentIdentity] = count > 0 ? [minP, maxP] : [0, 0];
    }
    let chordSymbolCount = 0;
    const rehearsalMarkBars = [];
    for (const p of score.parts) {
        for (const m of p.measures) {
            if (m.chord)
                chordSymbolCount++;
            if (m.rehearsalMark)
                rehearsalMarkBars.push(m.index);
        }
    }
    const rehearsalBars = [...new Set(rehearsalMarkBars)];
    const motifPlacementBars = plans?.motifState?.placements?.map((p) => p.startBar) ?? [];
    const styleStackMetadata = plans?.styleStack
        ? { primary: plans.styleStack.primary, secondary: plans.styleStack.secondary, colour: plans.styleStack.colour }
        : { primary: '' };
    return {
        barCount,
        sectionLabels,
        eventCountByPart,
        pitchRangeByPart,
        motifPlacementBars,
        chordSymbolCount,
        rehearsalMarkBars: rehearsalBars,
        styleStackMetadata,
        interactionPresent: !!plans?.interactionPlan?.perSection?.length,
        readinessRelease: readiness?.release ?? 0,
        readinessMx: readiness?.mx ?? 0,
    };
}
