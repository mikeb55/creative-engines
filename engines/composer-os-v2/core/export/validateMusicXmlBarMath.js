"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExportedMusicXmlBarMath = validateExportedMusicXmlBarMath;
const scoreModelTypes_1 = require("../score-model/scoreModelTypes");
function sumDurationsPerVoice(measureInner) {
    const voiceSums = new Map();
    const noteBlocks = measureInner.match(/<note>[\s\S]*?<\/note>/g) ?? [];
    for (const block of noteBlocks) {
        if (/<chord\s*\/>/.test(block))
            continue;
        const dm = block.match(/<duration>(\d+)<\/duration>/);
        const vm = block.match(/<voice>(\d+)<\/voice>/);
        const voice = vm ? parseInt(vm[1], 10) : 1;
        const dur = dm ? parseInt(dm[1], 10) : 0;
        voiceSums.set(voice, (voiceSums.get(voice) ?? 0) + dur);
    }
    return voiceSums;
}
function validateExportedMusicXmlBarMath(xml) {
    const errors = [];
    const sums = {};
    if (!xml.includes('<score-partwise')) {
        return { valid: false, errors: ['Not score-partwise MusicXML'], sums };
    }
    const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
    if (partBlocks.length === 0) {
        return { valid: false, errors: ['No <part> elements found'], sums };
    }
    for (const partBlock of partBlocks) {
        const idMatch = partBlock.match(/^<part id="([^"]+)"/);
        const partId = idMatch?.[1] ?? 'unknown';
        sums[partId] = {};
        const measureBlocks = partBlock.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
        let measureIdx = 0;
        for (const mb of measureBlocks) {
            const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
            const num = numMatch ? parseInt(numMatch[1], 10) : -1;
            const inner = mb.replace(/^<measure[^>]*>/, '').replace(/<\/measure>\s*$/, '');
            if (measureIdx === 0) {
                if (!inner.includes(`<divisions>${scoreModelTypes_1.DIVISIONS}</divisions>`)) {
                    errors.push(`Part ${partId} measure ${num}: missing or wrong <divisions> (expected ${scoreModelTypes_1.DIVISIONS})`);
                }
                if (!inner.includes('<time>') || !inner.includes('<beats>4</beats>')) {
                    errors.push(`Part ${partId} measure ${num}: missing 4/4 time attributes`);
                }
            }
            measureIdx++;
            const voiceSums = sumDurationsPerVoice(inner);
            sums[partId][num] = {};
            if (voiceSums.size === 0) {
                errors.push(`Part ${partId} measure ${num}: no note content`);
                continue;
            }
            for (const [voice, total] of voiceSums) {
                sums[partId][num][voice] = total;
                if (total !== scoreModelTypes_1.MEASURE_DIVISIONS) {
                    errors.push(`Part ${partId} measure ${num} voice ${voice}: exported duration sum ${total} ≠ ${scoreModelTypes_1.MEASURE_DIVISIONS} (${scoreModelTypes_1.BEATS_PER_MEASURE} beats × ${scoreModelTypes_1.DIVISIONS} divisions)`);
                }
            }
        }
    }
    return { valid: errors.length === 0, errors, sums };
}
