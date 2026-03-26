"use strict";
/**
 * Arranger-Assist Engine — Suggestion generator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateArrangerAssist = generateArrangerAssist;
const arrangerAssistTemplates_1 = require("./arrangerAssistTemplates");
function seededRandom(seed) {
    return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}
function pick(arr, rnd) {
    return arr[Math.floor(rnd() * arr.length)];
}
function generateArrangerAssist(architecturePlan, ellingtonPlan, parameters = {}) {
    const seed = parameters.seed ?? Date.now();
    const rnd = seededRandom(seed);
    const mode = parameters.arrangementMode ?? 'classic';
    const suggestions = [];
    for (const section of architecturePlan.sections) {
        const startBar = section.startBar;
        const length = section.length;
        const endBar = startBar + length - 1;
        const sectionBars = ellingtonPlan.bars.filter((b) => b.bar >= startBar && b.bar <= endBar);
        const avgDensity = sectionBars.length > 0
            ? sectionBars.reduce((sum, b) => sum + (b.density === 'tutti' ? 4 : b.density === 'dense' ? 3 : b.density === 'medium' ? 2 : 1), 0) / sectionBars.length
            : 2;
        const densityLevel = avgDensity >= 3.5 ? 'tutti' : avgDensity >= 2.5 ? 'dense' : avgDensity >= 1.5 ? 'medium' : 'sparse';
        if (section.role === 'intro' || section.role === 'background_chorus' || section.role === 'head') {
            const templates = mode === 'ballad'
                ? ['ballad_support_figures', 'classic_swing_backgrounds']
                : ['classic_swing_backgrounds', 'ellington_punctuation'];
            const t = pick(templates, rnd);
            const generated = arrangerAssistTemplates_1.TEMPLATE_DEFINITIONS[t](section.name, startBar, length, densityLevel, section.leadSection);
            suggestions.push(...generated.filter(() => rnd() < 0.85));
        }
        if (section.role === 'soli') {
            const generated = arrangerAssistTemplates_1.TEMPLATE_DEFINITIONS.sax_soli_basic(section.name, startBar, length, densityLevel, section.leadSection);
            suggestions.push(...generated);
        }
        if (section.role === 'shout_chorus') {
            const generated = arrangerAssistTemplates_1.TEMPLATE_DEFINITIONS.brass_shout_ramp(section.name, startBar, length, densityLevel, section.leadSection);
            suggestions.push(...generated);
            if (rnd() < 0.6) {
                suggestions.push({
                    section: section.name,
                    barRange: { startBar: startBar + Math.floor(length / 2), endBar },
                    role: 'punctuation',
                    density: 'tutti',
                    description: 'Tutti hit — full band accent',
                    confidence: 0.9,
                    optionalRhythmText: 'Downbeat hit',
                    optionalVoicingHint: 'Full band',
                    subtype: 'tutti_hit',
                });
            }
        }
        if (section.role === 'interlude' && section.leadSection !== 'rhythm') {
            const generated = arrangerAssistTemplates_1.TEMPLATE_DEFINITIONS.ellington_punctuation(section.name, startBar, length, densityLevel, section.leadSection);
            suggestions.push(...generated.filter(() => rnd() < 0.8));
        }
        if (rnd() < 0.25 && (section.role === 'head' || section.role === 'background_chorus')) {
            suggestions.push({
                section: section.name,
                barRange: { startBar, endBar },
                role: 'section_swap',
                density: densityLevel,
                description: 'Reeds ↔ brass handoff — alternate lead between sections',
                confidence: 0.7,
                optionalRhythmText: '2-bar or 4-bar phrases',
                optionalVoicingHint: 'Call-response between reeds and brass',
                subtype: 'reeds_brass_handoff',
            });
        }
        if (rnd() < 0.2) {
            suggestions.push({
                section: section.name,
                barRange: { startBar, endBar },
                role: 'section_swap',
                density: densityLevel,
                description: 'Sparse ↔ dense alternative — try lighter texture for contrast',
                confidence: 0.65,
                optionalRhythmText: 'Reduce background activity',
                optionalVoicingHint: 'Drop to 2-part or pad only',
                subtype: 'sparse_dense_alternative',
            });
        }
    }
    const id = `assist_${architecturePlan.id}_${seed}`;
    return {
        id,
        architectureName: architecturePlan.name,
        progressionTemplate: architecturePlan.progressionTemplate,
        totalBars: architecturePlan.totalBars,
        suggestions,
        generatedAt: new Date().toISOString(),
    };
}
