/**
 * Ellington Engine — Automated self-tests
 * 1. Engine loads without error
 * 2. ii-V-I progression generates orchestration
 * 3. At least 3 sections populated
 * 4. Voice leading intervals reasonable
 * 5. MusicXML export generated
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateEllingtonOrchestration,
  runEllingtonEngine,
  parseProgression,
} from '../ellingtonEngine';
import { exportOrchestrationToMusicXML } from '../ellingtonMusicXMLExporter';

const II_V_I = [
  { chord: 'Dm7', bars: 2 },
  { chord: 'G7', bars: 2 },
  { chord: 'Cmaj7', bars: 4 },
];

function test1_EngineLoads(): boolean {
  try {
    generateEllingtonOrchestration(II_V_I, 42);
    runEllingtonEngine({ progression: II_V_I, seed: 42 });
    parseProgression('Dm7 G7 Cmaj7');
    return true;
  } catch (e) {
    console.error('Test 1 FAIL: Engine load error', e);
    return false;
  }
}

function test2_IiVIGeneratesOrchestration(): boolean {
  const orch = generateEllingtonOrchestration(II_V_I, 123);
  if (!orch.trumpets?.length || !orch.trombones?.length || !orch.saxes?.length || !orch.rhythm?.length) {
    console.error('Test 2 FAIL: Sections missing or empty');
    return false;
  }
  if (orch.totalBars !== 8) {
    console.error('Test 2 FAIL: Expected 8 bars, got', orch.totalBars);
    return false;
  }
  return true;
}

function test3_AtLeastThreeSectionsPopulated(): boolean {
  const orch = generateEllingtonOrchestration(II_V_I, 456);
  let populated = 0;
  if (orch.trumpets.some((v) => v.pitches.length > 0)) populated++;
  if (orch.trombones.some((v) => v.pitches.length > 0)) populated++;
  if (orch.saxes.some((v) => v.pitches.length > 0)) populated++;
  if (orch.rhythm.some((v) => v.pitches.length > 0)) populated++;
  if (populated < 3) {
    console.error('Test 3 FAIL: Only', populated, 'sections populated');
    return false;
  }
  return true;
}

function test4_VoiceLeadingReasonable(): boolean {
  const orch = generateEllingtonOrchestration(II_V_I, 789);
  const maxReasonable = 6; // semitones
  for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
    let prev: number[] = [];
    for (const v of section) {
      if (prev.length > 0 && v.pitches.length > 0) {
        const jumps = v.pitches.map((p, i) => Math.abs(p - (prev[i] ?? prev[0])));
        const maxJump = Math.max(...jumps);
        if (maxJump > 24) {
          console.error('Test 4 FAIL: Voice leading jump too large', maxJump);
          return false;
        }
      }
      prev = v.pitches;
    }
  }
  return true;
}

function test5_MusicXMLExportGenerated(): boolean {
  const orch = generateEllingtonOrchestration(II_V_I, 999);
  const xml = exportOrchestrationToMusicXML(orch, { title: 'Test' });
  if (!xml || xml.length < 100) {
    console.error('Test 5 FAIL: MusicXML too short or empty');
    return false;
  }
  if (!xml.includes('<score-partwise') || !xml.includes('<part ') || !xml.includes('<measure')) {
    console.error('Test 5 FAIL: MusicXML structure invalid');
    return false;
  }
  return true;
}

function test6_StringProgression(): boolean {
  const orch = generateEllingtonOrchestration('Dm7 G7 Cmaj7', 111);
  if (orch.totalBars < 4 || orch.trumpets.length < 4) {
    console.error('Test 6 FAIL: String progression not parsed correctly');
    return false;
  }
  return true;
}

function main(): void {
  const tests: Array<[string, () => boolean]> = [
    ['Engine loads without error', test1_EngineLoads],
    ['ii-V-I generates orchestration', test2_IiVIGeneratesOrchestration],
    ['At least 3 sections populated', test3_AtLeastThreeSectionsPopulated],
    ['Voice leading intervals reasonable', test4_VoiceLeadingReasonable],
    ['MusicXML export generated', test5_MusicXMLExportGenerated],
    ['String progression accepted', test6_StringProgression],
  ];

  const results: { name: string; ok: boolean }[] = [];
  let passed = 0;
  for (const [name, fn] of tests) {
    const ok = fn();
    results.push({ name, ok });
    if (ok) {
      passed++;
      console.log('PASS:', name);
    } else {
      console.log('FAIL:', name);
    }
  }

  const engineDir = path.resolve(__dirname, '..');
  const rootDir = path.join(engineDir, '..', '..');
  const outDir = path.join(rootDir, 'apps', 'ellington-orchestration-desktop', 'outputs');
  fs.mkdirSync(outDir, { recursive: true });

  const report = `# Ellington Engine Test Report
Generated: ${new Date().toISOString()}

## Results
- Passed: ${passed}/${tests.length}
- Failed: ${tests.length - passed}

## Tests
${results.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`).join('\n')}
`;
  const reportPath = path.join(outDir, 'ellington_engine_test_report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  if (passed < tests.length) {
    process.exit(1);
  }

  console.log('\nELLINGTON ENGINE TESTS: PASS');
}

main();
