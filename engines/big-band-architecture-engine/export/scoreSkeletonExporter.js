"use strict";
/**
 * Big Band Score Skeleton — Maps architecture + Ellington plan to score elements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.architectureToSkeleton = architectureToSkeleton;
exports.exportScoreSkeleton = exportScoreSkeleton;
const musicXMLScoreBuilder_1 = require("./musicXMLScoreBuilder");
const CUE_BY_LEAD = {
    saxes: 'Saxes lead',
    trumpets: 'Trumpets lead',
    trombones: 'Trombones lead',
    rhythm: 'Rhythm section',
    tutti: 'Tutti hit',
};
const CUE_BY_SUPPORT = {
    saxes: 'Reeds support',
    trumpets: 'Brass punctuation',
    trombones: 'Brass punctuation',
    rhythm: 'Rhythm comp',
};
function leadToCue(lead, density) {
    const base = CUE_BY_LEAD[lead] ?? `${lead} lead`;
    if (density === 'tutti')
        return 'Tutti hit';
    if (density === 'dense')
        return `${base} (dense)`;
    return base;
}
function architectureToSkeleton(architecture, orchestrationPlan) {
    const rehearsalMarks = [];
    const sectionLabels = [];
    const cueAnnotations = [];
    const phraseSpans = [];
    const chordSymbols = [];
    let rehearsalIndex = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const section of architecture.sections) {
        const startBar = section.startBar;
        const endBar = section.startBar + section.length - 1;
        rehearsalMarks.push({ bar: startBar, label: letters[rehearsalIndex % letters.length] });
        rehearsalIndex++;
        sectionLabels.push({ bar: startBar, text: section.name });
        const cues = [leadToCue(section.leadSection, section.density)];
        if (section.notes)
            cues.push(section.notes);
        cueAnnotations.push({ bar: startBar, staffGroup: section.leadSection, text: cues.join(' — ') });
        phraseSpans.push({ startBar, endBar, label: section.name });
    }
    const chordByBar = new Map();
    for (const b of orchestrationPlan.bars) {
        if (b.bar <= architecture.totalBars && b.chord)
            chordByBar.set(b.bar, b.chord);
    }
    if (chordByBar.size === 0) {
        let barIdx = 0;
        for (const seg of orchestrationPlan.progression) {
            for (let i = 0; i < seg.bars; i++) {
                barIdx++;
                if (barIdx <= architecture.totalBars)
                    chordByBar.set(barIdx, seg.chord);
            }
        }
    }
    for (const [bar, chord] of chordByBar)
        chordSymbols.push({ bar, chord });
    return {
        totalBars: architecture.totalBars,
        timeSignature: { beats: 4, beatType: 4 },
        keySignature: 'C',
        rehearsalMarks,
        sectionLabels,
        cueAnnotations,
        phraseSpans,
        chordSymbols,
    };
}
function exportScoreSkeleton(architecture, orchestrationPlan, outputPath) {
    const skeleton = architectureToSkeleton(architecture, orchestrationPlan);
    const musicXml = (0, musicXMLScoreBuilder_1.buildMusicXML)(skeleton);
    const fs = require('fs');
    const path = require('path');
    fs.mkdirSync(outputPath, { recursive: true });
    const musicXmlPath = path.join(outputPath, 'score_skeleton.musicxml');
    fs.writeFileSync(musicXmlPath, musicXml, 'utf-8');
    const structureMd = `# Score Structure

## ${architecture.name}
Total bars: ${architecture.totalBars}

## Sections
| Bar | Rehearsal | Section | Lead | Density |
|-----|-----------|---------|------|---------|
${architecture.sections.map((s) => `| ${s.startBar} | - | ${s.name} | ${s.leadSection} | ${s.density} |`).join('\n')}

## Cues
${skeleton.cueAnnotations.map((c) => `- Bar ${c.bar}: ${c.text}`).join('\n')}
`;
    const structurePath = path.join(outputPath, 'score_structure.md');
    fs.writeFileSync(structurePath, structureMd, 'utf-8');
    const structureJson = {
        architecture: { id: architecture.id, name: architecture.name, totalBars: architecture.totalBars },
        sections: architecture.sections,
        skeleton: {
            rehearsalMarks: skeleton.rehearsalMarks,
            sectionLabels: skeleton.sectionLabels,
            cueAnnotations: skeleton.cueAnnotations,
            chordSymbols: skeleton.chordSymbols,
        },
    };
    const jsonPath = path.join(outputPath, 'score_structure.json');
    fs.writeFileSync(jsonPath, JSON.stringify(structureJson, null, 2), 'utf-8');
    return { musicXmlPath, structurePath, jsonPath };
}
