/**
 * Orbit New Orleans V3 — full revision pipeline (expanded SD3 grooves + V2 fixes)
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { runOrbitRevision, writeMidiDrums } from './orbitNewOrleansRevise.mjs';
import { applyV2Fixes } from './orbitNewOrleansV2Fix.mjs';
import { runGceEvaluation } from './orbitGceEval.mjs';
import { GROOVE_FILES_V3, SECTIONS_V3, MIDI_DIR } from './orbitGrooveConfig.mjs';

const SOURCE =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-BB-Suite-V2 1.musicxml';
const REV_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const V2 = path.join(REV_DIR, 'Orbit-NewOrleans-V2.musicxml');
const V3_SCORE = path.join(REV_DIR, 'Orbit-NewOrleans-V3.musicxml');
const V3_DRUMS = path.join(REV_DIR, 'Orbit-Drums-NewOrleans-V3.mid');
const CHANGES = path.join(REV_DIR, 'Orbit-Changes.md');
const GCE_V2_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V2.md');
const GCE_V3_REPORT = path.join(REV_DIR, 'Orbit-GCE-Report-V3.md');

const GCE_CONFIG = {
  grooveFiles: GROOVE_FILES_V3,
  sections: SECTIONS_V3,
  midiDir: MIDI_DIR,
};

function range(a, b) {
  return [...Array(b - a + 1)].map((_, i) => a + i);
}

function parseScoresFromReport(reportPath) {
  if (!fs.existsSync(reportPath)) return new Map();
  const text = fs.readFileSync(reportPath, 'utf8');
  const map = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(
      /^\| (.+?) \| (\d+–\d+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| \*\*([\d.]+)\*\* \|$/
    );
    if (m) {
      map.set(m[1], {
        range: m[2],
        brass: parseFloat(m[3]),
        sax: parseFloat(m[4]),
        parallel: parseFloat(m[5]),
        balance: parseFloat(m[6]),
        overall: parseFloat(m[7]),
      });
    }
  }
  return map;
}

function appendV3ChangesMd(revisionChanges, v3FixChanges, barPlan) {
  let existing = fs.readFileSync(CHANGES, 'utf8');
  const marker = '## V3 full revision';
  if (existing.includes(marker)) {
    existing = existing.slice(0, existing.indexOf(marker)).replace(/\n---\n\n$/, '\n');
  }

  const grooveSummary = [
    '| Section bars | Groove |',
    '|--------------|--------|',
    '| 1–4, 33–36 | Intro 01.mid |',
    '| 9–12, 37–44, 75–78 | HeadGroove.mid |',
    '| 5–8, 49–56, 63–70 | SoliLight.mid |',
    '| 13–16, 71–74 | Bridge 01.mid |',
    '| 17–24, 45–48, 79–84 | ShoutParade.mid |',
    '| 25–32, 57–62 | RideoutHalfTime.mid |',
    '| Fills | Fills 01/03/05 at transition bars |',
  ];

  const block = [
    existing.trimEnd(),
    '',
    '---',
    '',
    `## V3 full revision (${new Date().toISOString().slice(0, 10)})`,
    '',
    'Output: **Orbit-NewOrleans-V3.musicxml** · **Orbit-Drums-NewOrleans-V3.mid**',
    'Source: Orbit-BB-Suite-V2 1.musicxml (V1/V2 unchanged)',
    'Tempo: **90 BPM**',
    '',
    '### V3 groove palette',
    ...grooveSummary,
    '',
    '### V2 fixes applied on V3 revision',
    '1. Parallel 5ths — trombone octave displacement: bars 49–56, **25–30**, 37–44, 57–70',
    '2. Brass beat 3 → & of 2 — bars 25–32',
    '3. Trombone bars 81–84 → beat 4 / & of 4',
    '4. Bar 12 trumpet → & of 4',
    '5. Sax zigzag bars 25–32 — longer note consolidation',
    '',
    '### SD3 alignment changes (revision pass)',
    '',
    '| Bar | Part | Original beat | New beat | Reason |',
    '|-----|------|---------------|----------|--------|',
    ...revisionChanges.map(
      (c) => `| ${c.bar} | ${c.partName} | ${c.oldBeat} | ${c.newBeat} | ${c.reason} |`
    ),
    '',
    `**V3 SD3 alignment count:** ${revisionChanges.length}`,
    '',
    '### V2-style manual fixes (V3 pass)',
    '',
    '| Bar | Part | Original beat | New beat | Reason |',
    '|-----|------|---------------|----------|--------|',
    ...v3FixChanges.map(
      (c) => `| ${c.bar} | ${c.partName} | ${c.oldBeat} | ${c.newBeat} | ${c.reason} |`
    ),
    '',
    `**V3 manual fix count:** ${v3FixChanges.length}`,
    '',
    '### Groove map (V3 bar assignments)',
    ...barPlan.map(
      (p) =>
        `- Bar ${p.bar} (${p.section}): **${p.grooveKey}** loop bar ${p.barInLoop}${p.fillKey ? ' [FILL]' : ''}`
    ),
  ];

  fs.writeFileSync(CHANGES, block.join('\n') + '\n', 'utf8');
}

function writeV3GceReport(v3Results, v2ScoreMap, v2OverallAvg, v3OverallAvg) {
  const shout = v3Results.filter((r) => r.label.includes('Shout'));
  const verse = v3Results.filter((r) => r.label.includes('Melody Head'));
  const shoutAvg =
    shout.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    Math.max(1, shout.length);
  const verseAvg =
    verse.reduce((a, r) => a + r.rhythmDensity.tpt.accents + r.rhythmDensity.tbn.accents, 0) /
    Math.max(1, verse.length);

  const lines = [];
  lines.push('# Orbit New Orleans V3 — GCE Evaluation Report');
  lines.push('');
  lines.push(`File: Orbit-NewOrleans-V3.musicxml · Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('Groove palette: HeadGroove · SoliLight · ShoutParade · RideoutHalfTime (+ Intro/Bridge/Fills)');
  lines.push('');
  lines.push(
    `**Overall form average: ${v3OverallAvg}/10** (V2 @ V3 grooves: ${v2OverallAvg}/10, Δ ${(v3OverallAvg - v2OverallAvg).toFixed(1)})`
  );
  lines.push(
    `Shout vs verse accent ratio: **${(shoutAvg / Math.max(0.1, verseAvg)).toFixed(1)}×** — ${shoutAvg > verseAvg ? 'YES shout stronger' : 'NO'}`
  );
  lines.push('');

  lines.push('## Section scores (V3)');
  lines.push('');
  lines.push('| Section | Bars | Brass | Sax | Parallel | Balance | **Overall** |');
  lines.push('|---------|------|-------|-----|----------|---------|-------------|');
  for (const r of v3Results) {
    lines.push(
      `| ${r.label} | ${r.range} | ${r.brassScore} | ${r.saxScore} | ${r.parallelScore} | ${r.balanceScore.toFixed(1)} | **${r.overall}** |`
    );
  }
  lines.push('');

  lines.push('## V2 vs V3 comparison (both evaluated against V3 SD3 groove palette)');
  lines.push('');
  lines.push('| Section | V2 Overall | V3 Overall | Δ | V2 Parallel | V3 Parallel |');
  lines.push('|---------|------------|------------|---|-------------|-------------|');
  for (const r of v3Results) {
    const v2 = v2ScoreMap.get(r.label);
    const v2o = v2?.overall ?? '—';
    const v2p = v2?.parallelScore ?? '—';
    const delta = v2 ? r.overall - v2.overall : 0;
    const deltaPrefix = delta > 0 ? '+' : '';
    lines.push(
      `| ${r.label} | ${v2o} | **${r.overall}** | ${v2 ? deltaPrefix + delta.toFixed(1) : '—'} | ${v2p} | ${r.parallelScore} |`
    );
  }
  lines.push('');

  const manual = v3Results.filter((r) => r.overall < 6);
  lines.push('## Manual Sibelius review — V3 (overall < 6)');
  lines.push('');
  if (!manual.length) {
    lines.push('None — all sections scored ≥ 6 overall.');
  } else {
    for (const r of manual) {
      lines.push(`### ${r.label} (bars ${r.range}) — **${r.overall}/10**`);
      if (r.brassIssues.length) {
        lines.push(
          '- Brass weak: ' +
            [...new Set(r.brassIssues.map((i) => `bar ${i.bar} ${i.part}@${i.beat}`))]
              .slice(0, 8)
              .join('; ')
        );
      }
      if (r.parallelIssues.length) {
        lines.push(
          '- Parallel: ' + r.parallelIssues.slice(0, 6).map((i) => `bar ${i.bar} ${i.type}`).join('; ')
        );
      }
      if (r.saxIssues.length) {
        lines.push(
          '- Sax: ' + r.saxIssues.slice(0, 6).map((i) => `bar ${i.bar} ${i.note}`).join('; ')
        );
      }
      lines.push('');
    }
  }

  lines.push('## V3 pipeline summary');
  lines.push('');
  lines.push('- Full SD3 revision from source score with expanded groove palette');
  lines.push('- All V2 arrangement fixes + parallel 5ths bars 25–30');
  lines.push('- Tempo 90 BPM');
  lines.push('- V1 and V2 MusicXML preserved as references');
  lines.push('');

  fs.writeFileSync(GCE_V3_REPORT, lines.join('\n'), 'utf8');
}

function runV3Pipeline() {
  if (!fs.existsSync(REV_DIR)) fs.mkdirSync(REV_DIR, { recursive: true });

  console.log('V3 revision from source + expanded grooves...');
  const { outXml: revisedXml, barPlan, changes: revisionChanges } = runOrbitRevision({
    source: SOURCE,
    grooveFiles: GROOVE_FILES_V3,
    sections: SECTIONS_V3,
    tempoBpm: 90,
  });

  const v3FixChanges = [];
  const v3Xml = applyV2Fixes(revisedXml, {
    changeLog: v3FixChanges,
    extraParallelRanges: range(25, 30),
  });

  fs.writeFileSync(V3_SCORE, v3Xml, 'utf8');
  console.log('Wrote', V3_SCORE);

  const drumMidiBars = barPlan.map((p) => ({ barNumber: p.bar, hits: p.hits }));
  writeMidiDrums(drumMidiBars, V3_DRUMS, 90);
  console.log('Wrote', V3_DRUMS);

  appendV3ChangesMd(revisionChanges, v3FixChanges, barPlan);
  console.log('Appended V3 section to Orbit-Changes.md');

  console.log('GCE evaluation (V3 groove palette)...');
  const v2Eval = runGceEvaluation(V2, GCE_CONFIG);
  const v2ScoreMap = new Map(v2Eval.results.map((r) => [r.label, r]));
  const v3Eval = runGceEvaluation(V3_SCORE, GCE_CONFIG);
  writeV3GceReport(v3Eval.results, v2ScoreMap, v2Eval.overallAvg, v3Eval.overallAvg);
  console.log('Wrote', GCE_V3_REPORT);

  console.log('');
  console.log('V3 overall:', v3Eval.overallAvg, '(V2:', v2Eval.overallAvg, ')');
  console.log('Revision changes:', revisionChanges.length, 'Manual fixes:', v3FixChanges.length);
  for (const r of v3Eval.results) {
    const v2 = v2ScoreMap.get(r.label);
    const flag = r.overall < 6 ? ' ⚠' : '';
    console.log(
      `  ${r.label}: V2 ${v2?.overall ?? '?'} → V3 ${r.overall}${flag}`
    );
  }

  return { v3Eval, v2Eval, revisionChanges, v3FixChanges };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  runV3Pipeline();
}

export { runV3Pipeline };
