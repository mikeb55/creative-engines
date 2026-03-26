"use strict";
/**
 * Selective Big-Band Generation Engine — Note-level material generator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSelectiveMaterial = generateSelectiveMaterial;
const selectiveGenerationTemplates_1 = require("./selectiveGenerationTemplates");
const SAX_STAFF_IDS = ['P1', 'P2', 'P3', 'P4', 'P5'];
const BRASS_STAFF_IDS = ['P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13'];
function seededRandom(seed) {
    return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}
function getChordForBar(plan, bar) {
    for (const b of plan.bars) {
        if (b.bar === bar)
            return b.chord;
    }
    let acc = 0;
    for (const s of plan.progression) {
        acc += s.bars;
        if (bar <= acc)
            return s.chord;
    }
    return plan.progression[plan.progression.length - 1]?.chord ?? 'Cmaj7';
}
function generateSelectiveMaterial(architecturePlan, ellingtonPlan, arrangerAssistPlan, targetType, parameters = {}) {
    const seed = parameters.seed ?? Date.now();
    const rnd = seededRandom(seed);
    const units = [];
    const suggestions = arrangerAssistPlan.suggestions.filter((s) => {
        if (targetType === 'background_figures')
            return s.role === 'background_figure';
        if (targetType === 'brass_punctuation')
            return s.role === 'punctuation';
        if (targetType === 'sax_soli_texture')
            return s.role === 'soli_texture';
        if (targetType === 'shout_ramp_material')
            return s.role === 'shout_ramp';
        return false;
    });
    for (const sug of suggestions) {
        const { startBar, endBar } = sug.barRange;
        const length = endBar - startBar + 1;
        const chord = getChordForBar(ellingtonPlan, startBar);
        if (targetType === 'background_figures') {
            units.push((0, selectiveGenerationTemplates_1.createBackgroundFigure)(sug.section, startBar, length, chord, sug.density, SAX_STAFF_IDS.slice(0, 4), rnd));
        }
        else if (targetType === 'brass_punctuation') {
            units.push((0, selectiveGenerationTemplates_1.createBrassPunctuation)(sug.section, startBar, chord, BRASS_STAFF_IDS.slice(0, 4), rnd));
        }
        else if (targetType === 'sax_soli_texture') {
            units.push((0, selectiveGenerationTemplates_1.createSaxSoliTexture)(sug.section, startBar, length, chord, SAX_STAFF_IDS, rnd));
        }
        else if (targetType === 'shout_ramp_material') {
            const phase = sug.subtype ?? 'intensification';
            units.push((0, selectiveGenerationTemplates_1.createShoutRampMaterial)(sug.section, startBar, length, chord, phase, BRASS_STAFF_IDS, rnd));
        }
    }
    if (units.length === 0) {
        for (const section of architecturePlan.sections) {
            const startBar = section.startBar;
            const length = section.length;
            const chord = getChordForBar(ellingtonPlan, startBar);
            if (targetType === 'background_figures' && (section.role === 'intro' || section.role === 'background_chorus' || section.role === 'head')) {
                units.push((0, selectiveGenerationTemplates_1.createBackgroundFigure)(section.name, startBar, Math.min(4, length), chord, section.density, SAX_STAFF_IDS.slice(0, 4), rnd));
            }
            else if (targetType === 'brass_punctuation' && section.role !== 'intro') {
                units.push((0, selectiveGenerationTemplates_1.createBrassPunctuation)(section.name, startBar, chord, BRASS_STAFF_IDS.slice(0, 4), rnd));
            }
            else if (targetType === 'sax_soli_texture' && section.role === 'soli') {
                units.push((0, selectiveGenerationTemplates_1.createSaxSoliTexture)(section.name, startBar, length, chord, SAX_STAFF_IDS, rnd));
            }
            else if (targetType === 'shout_ramp_material' && section.role === 'shout_chorus') {
                units.push((0, selectiveGenerationTemplates_1.createShoutRampMaterial)(section.name, startBar, length, chord, 'intensification', BRASS_STAFF_IDS, rnd));
            }
        }
    }
    if (units.length === 0) {
        const section = architecturePlan.sections[0];
        if (section) {
            const chord = getChordForBar(ellingtonPlan, section.startBar);
            if (targetType === 'background_figures')
                units.push((0, selectiveGenerationTemplates_1.createBackgroundFigure)(section.name, section.startBar, Math.min(4, section.length), chord, 'medium', SAX_STAFF_IDS.slice(0, 4), rnd));
            else if (targetType === 'brass_punctuation')
                units.push((0, selectiveGenerationTemplates_1.createBrassPunctuation)(section.name, section.startBar, chord, BRASS_STAFF_IDS.slice(0, 4), rnd));
            else if (targetType === 'sax_soli_texture')
                units.push((0, selectiveGenerationTemplates_1.createSaxSoliTexture)(section.name, section.startBar, section.length, chord, SAX_STAFF_IDS, rnd));
            else
                units.push((0, selectiveGenerationTemplates_1.createShoutRampMaterial)(section.name, section.startBar, section.length, chord, 'intensification', BRASS_STAFF_IDS, rnd));
        }
    }
    const id = `selective_${targetType}_${architecturePlan.id}_${seed}`;
    return {
        id,
        targetType,
        architectureName: architecturePlan.name,
        totalBars: architecturePlan.totalBars,
        units,
        generatedAt: new Date().toISOString(),
    };
}
