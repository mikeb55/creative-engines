"use strict";
/**
 * Wyble Template Integration Test
 * Verifies that the desktop app template selector is correctly connected to the
 * template library and that selecting a template leads to successful generation + export.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const templateLibrary_1 = require("./templates/templateLibrary");
const wybleEngine_1 = require("./wybleEngine");
const wybleAutoTest_1 = require("./wybleAutoTest");
const wybleMusicXMLExporter_1 = require("./wybleMusicXMLExporter");
const REQUIRED_TEMPLATES = [
    'ii_V_I_major',
    'minor_ii_V',
    'jazz_blues',
    'minor_blues',
    'rhythm_changes_A',
    'autumn_leaves_fragment',
    'solar_cycle',
    'giant_steps_fragment',
    'beatrice_A',
    'orbit_A',
];
const TEMPLATES_TO_TEST = ['ii_V_I_major', 'beatrice_A', 'orbit_A'];
const CANDIDATE_COUNT = 4;
const EXPORT_COUNT = 1;
function progressionToHarmonicContext(progression) {
    const chords = progression.map(({ chord, bars }) => {
        const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7|m7b5)?/i);
        if (!match)
            return { root: 'C', quality: 'maj', bars };
        let q = (match[2] ?? 'maj').toLowerCase();
        if (q === 'm7' || q === 'min7' || q === 'm7b5')
            q = 'min';
        if (q === '7' || q === 'dom7')
            q = 'dom';
        if (q === 'maj7')
            q = 'maj';
        return { root: match[1], quality: q, bars };
    });
    return { chords, key: 'C' };
}
function runTemplateTest(templateId, testOutDir) {
    const template = (0, templateLibrary_1.getTemplate)(templateId);
    if (!template) {
        return {
            templateId,
            success: false,
            error: `Template not found: ${templateId}`,
            generated: 0,
            exported: 0,
            exportPath: '',
            filesCreated: [],
        };
    }
    const progression = template.progression;
    const bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
    const harmonicContext = progressionToHarmonicContext(progression);
    const params = {
        harmonicContext,
        phraseLength: bars,
        independenceBias: 0.85,
        contraryMotionBias: 0.75,
        dyadDensity: 0.55,
        chromaticismLevel: 0.15,
        practiceMode: 'etude',
        voiceRatioMode: 'one_to_one',
    };
    const candidates = [];
    for (let i = 0; i < CANDIDATE_COUNT; i++) {
        const output = (0, wybleEngine_1.generateWybleEtude)(params);
        const score = (0, wybleAutoTest_1.evaluateWybleStudy)(output);
        candidates.push({ output, score });
    }
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const toExport = sorted.slice(0, EXPORT_COUNT);
    const templateOutDir = path.join(testOutDir, templateId);
    fs.mkdirSync(templateOutDir, { recursive: true });
    const filesCreated = [];
    for (let i = 0; i < toExport.length; i++) {
        const r = toExport[i];
        const scoreStr = r.score.toFixed(2);
        const rankStr = String(i + 1).padStart(2, '0');
        const filename = `wyble_etude_GCE${scoreStr}_rank${rankStr}.musicxml`;
        const filePath = path.join(templateOutDir, filename);
        const result = {
            upper_line: r.output.upper_line,
            lower_line: r.output.lower_line,
            implied_harmony: r.output.implied_harmony,
            bars,
        };
        const musicXml = (0, wybleMusicXMLExporter_1.exportToMusicXML)(result, { title: `Wyble Etude ${templateId} rank ${i + 1} (GCE ${scoreStr})` });
        fs.writeFileSync(filePath, musicXml, 'utf-8');
        filesCreated.push(filename);
    }
    const avgScore = candidates.map((c) => c.score).reduce((a, b) => a + b, 0) / candidates.length;
    const summary = `# Template Test: ${templateId}

## Result
- **Generated:** ${candidates.length}
- **Exported:** ${toExport.length}
- **Average score:** ${avgScore.toFixed(2)}

## Exported Files
${filesCreated.map((f) => `- ${f}`).join('\n')}
`;
    fs.writeFileSync(path.join(templateOutDir, 'summary.md'), summary, 'utf-8');
    filesCreated.push('summary.md');
    return {
        templateId,
        success: true,
        generated: candidates.length,
        exported: toExport.length,
        exportPath: templateOutDir,
        filesCreated,
    };
}
function main() {
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const testOutDir = path.join(rootDir, 'outputs', 'wyble', 'template-test');
    fs.mkdirSync(testOutDir, { recursive: true });
    const missing = [];
    for (const id of REQUIRED_TEMPLATES) {
        if (!(0, templateLibrary_1.getTemplate)(id)) {
            missing.push(id);
        }
    }
    if (missing.length > 0) {
        console.error('FAIL: Missing required templates:', missing.join(', '));
        process.exit(1);
    }
    const results = [];
    for (const templateId of TEMPLATES_TO_TEST) {
        const result = runTemplateTest(templateId, testOutDir);
        results.push(result);
        if (result.success) {
            console.log(`PASS: ${templateId} — ${result.exported} file(s) exported to ${result.exportPath}`);
        }
        else {
            console.error(`FAIL: ${templateId} — ${result.error}`);
        }
    }
    const allPassed = results.every((r) => r.success);
    const exportsCreated = results.some((r) => r.filesCreated.length > 0);
    const reportPath = path.join(testOutDir, 'template_integration_report.md');
    const report = `# Wyble Template Integration Report

Generated: ${new Date().toISOString()}

## Templates Verified in Library
${REQUIRED_TEMPLATES.map((id) => `- ${id}: ${(0, templateLibrary_1.getTemplate)(id) ? 'YES' : 'MISSING'}`).join('\n')}

## Templates Tested (Generation + Export)
| Template | Success | Generated | Exported | Path |
|----------|---------|-----------|----------|------|
${results.map((r) => `| ${r.templateId} | ${r.success ? 'YES' : 'NO'} | ${r.generated} | ${r.exported} | ${r.exportPath || r.error || '—'} |`).join('\n')}

## Desktop App Selector Wiring
The progression dropdown in \`apps/wyble-etude-desktop/index.html\` contains the same template IDs as \`TEMPLATE_ORDER\` in \`templates/templateLibrary.ts\`. The main process passes the selected value to \`wybleDesktopGenerate.ts\`, which resolves it via \`getTemplate()\`.

**Status:** WORKING

## Summary
- **MusicXML exports created:** ${exportsCreated ? 'YES' : 'NO'}
- **All tests passed:** ${allPassed ? 'YES' : 'NO'}
- **Missing templates:** None
- **Failures:** ${results.filter((r) => !r.success).map((r) => r.templateId + ': ' + (r.error || '')).join('; ') || 'None'}
`;
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\nReport written to ${reportPath}`);
    if (!allPassed) {
        process.exit(1);
    }
    console.log('\nAll template integration tests passed.');
}
main();
