"use strict";
/**
 * Ellington Orchestration Engine — Plan generator
 * Phrase-span planning: orchestration decided in phrase units, then distributed bar-by-bar.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrchestrationPlan = generateOrchestrationPlan;
const ellingtonTypes_1 = require("./ellingtonTypes");
const SECTIONS = ['saxes', 'trumpets', 'trombones'];
const DENSITY_LEVELS = ['sparse', 'medium', 'dense', 'tutti'];
const CONTRAST_MODES = ['colour', 'weight', 'response', 'combined'];
const PHRASE_TYPE_ARC_8 = ['setup', 'response', 'intensification', 'release'];
const LEAD_WEIGHTS = {
    classic: [2.5, 0.8, 0.7],
    ballad: [3, 0.4, 0.6],
    shout: [0.5, 2.5, 2],
};
const SUPPORT_WEIGHTS = {
    classic: [0.8, 1.5, 1.7],
    ballad: [0.5, 1, 2.5],
    shout: [1.5, 1.5, 1],
};
const DENSITY_BY_PHRASE = {
    setup: 'sparse',
    response: 'medium',
    intensification: 'dense',
    release: 'medium',
    arrival: 'tutti',
};
const DENSITY_BY_MODE = {
    ballad: { intensification: 'medium', release: 'sparse' },
    shout: { setup: 'medium', intensification: 'tutti', release: 'dense' },
    classic: {},
};
function seededRandom(seed) {
    return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}
function pick(arr, rnd) {
    return arr[Math.floor(rnd() * arr.length)];
}
function weightedPick(items, weights, rnd) {
    const total = weights.reduce((a, b) => a + b, 0);
    let v = rnd() * total;
    for (let i = 0; i < items.length; i++) {
        v -= weights[i];
        if (v <= 0)
            return items[i];
    }
    return items[items.length - 1];
}
function getFormLiteArc(bar, totalBars) {
    const pos8 = (bar - 1) % 8;
    if (pos8 < 2)
        return 'setup';
    if (pos8 < 4)
        return 'response';
    if (pos8 < 6)
        return 'intensification';
    return 'release';
}
function buildPhrasePlans(totalBars, progression, mode, p, rnd) {
    const span = (p.phraseSpan ?? 4);
    const minLead = p.minLeadPersistence ?? 2;
    const minSupport = p.minSupportPersistence ?? 1;
    const plans = [];
    let bar = 1;
    let lastLead = null;
    let lastSupport = null;
    while (bar <= totalBars) {
        const phraseBars = Math.min(span, totalBars - bar + 1);
        const phraseType = getFormLiteArc(bar, totalBars);
        let densityTarget = DENSITY_BY_PHRASE[phraseType];
        const modeOverride = DENSITY_BY_MODE[mode][phraseType];
        if (modeOverride)
            densityTarget = modeOverride;
        let leadSection;
        let supportSection;
        if (lastLead && bar > 1 && rnd() < 0.7) {
            leadSection = lastLead;
            const supportCands = SECTIONS.filter((s) => s !== leadSection);
            supportSection = lastSupport && supportCands.includes(lastSupport)
                ? lastSupport
                : pick(supportCands, rnd);
        }
        else {
            leadSection = weightedPick(SECTIONS, LEAD_WEIGHTS[mode], rnd);
            const supportCandidates = SECTIONS.filter((s) => s !== leadSection);
            const supportWeights = supportCandidates.map((s) => s === 'trumpets' ? SUPPORT_WEIGHTS[mode][1] :
                s === 'trombones' ? SUPPORT_WEIGHTS[mode][2] : SUPPORT_WEIGHTS[mode][0]);
            supportSection = weightedPick(supportCandidates, supportWeights, rnd);
        }
        let background = 'none';
        if (phraseType === 'intensification') {
            background = rnd() < p.backgroundFigureDensity ? 'pad' : rnd() < 0.3 ? 'ostinato' : 'none';
        }
        else if (phraseType === 'release' && mode === 'ballad' && rnd() < 0.3) {
            background = 'pad';
        }
        else if (mode === 'shout' && phraseType !== 'setup' && rnd() < p.backgroundFigureDensity * 1.2) {
            background = 'pad';
        }
        plans.push({
            startBar: bar,
            endBar: bar + phraseBars - 1,
            span: phraseBars,
            leadSection,
            supportSection,
            phraseType,
            densityTarget,
            background,
            leadSectionPersistence: minLead,
            answerSectionPersistence: minSupport,
        });
        lastLead = leadSection;
        lastSupport = supportSection;
        bar += phraseBars;
    }
    return plans;
}
function getPhrasePlanForBar(bar, plans) {
    return plans.find((p) => bar >= p.startBar && bar <= p.endBar);
}
function generateOrchestrationPlan(progression, params = {}, seed = Date.now()) {
    const mode = params.arrangementMode ?? 'classic';
    const modeP = ellingtonTypes_1.MODE_PARAMS[mode];
    const p = { ...ellingtonTypes_1.DEFAULT_PARAMS, ...modeP, ...params };
    const rnd = seededRandom(seed);
    const totalBars = progression.reduce((sum, seg) => sum + seg.bars, 0);
    const phrasePlans = buildPhrasePlans(totalBars, progression, mode, p, rnd);
    const bars = [];
    const getChordForBar = (b) => {
        let a = 0;
        for (const s of progression) {
            if (b <= a + s.bars)
                return s.chord;
            a += s.bars;
        }
        return progression[progression.length - 1]?.chord ?? 'Cmaj7';
    };
    for (let barIndex = 1; barIndex <= totalBars; barIndex++) {
        const plan = getPhrasePlanForBar(barIndex, phrasePlans);
        if (!plan)
            continue;
        const chord = getChordForBar(barIndex);
        const barInPhrase = barIndex - plan.startBar;
        const isPhraseStart = barInPhrase === 0;
        const isPhraseEnd = barIndex === plan.endBar;
        let density = plan.densityTarget;
        if (plan.phraseType === 'release' && mode === 'ballad' && rnd() < 0.5) {
            density = DENSITY_LEVELS[Math.max(0, DENSITY_LEVELS.indexOf(density) - 1)];
        }
        if (plan.phraseType === 'intensification' && barInPhrase > 0) {
            if (mode === 'shout' && rnd() < 0.5)
                density = 'tutti';
            else if (mode !== 'ballad' && rnd() < 0.3)
                density = density === 'dense' ? 'tutti' : 'dense';
        }
        if (density === 'tutti' && plan.phraseType === 'setup' && mode !== 'shout') {
            density = 'sparse';
        }
        const tutti = density === 'tutti';
        const background = plan.background;
        const callResponse = plan.phraseType === 'setup'
            ? 'call'
            : plan.phraseType === 'response'
                ? 'response'
                : rnd() < p.callResponseStrength
                    ? (plan.startBar % 2 === 1 ? 'call' : 'response')
                    : 'none';
        const contrastMode = weightedPick(CONTRAST_MODES, [0.2, 0.2, 0.2, 0.4], rnd);
        const comments = [];
        if (tutti)
            comments.push('tutti');
        if (callResponse !== 'none')
            comments.push(callResponse);
        if (background !== 'none')
            comments.push(`background: ${background}`);
        if (isPhraseStart)
            comments.push(plan.phraseType);
        bars.push({
            bar: barIndex,
            chord,
            leadSection: plan.leadSection,
            supportSection: plan.supportSection,
            density,
            contrastMode,
            callResponse: callResponse,
            tutti,
            background,
            comments,
        });
    }
    return {
        bars,
        totalBars,
        progression,
        phrasePlans,
    };
}
