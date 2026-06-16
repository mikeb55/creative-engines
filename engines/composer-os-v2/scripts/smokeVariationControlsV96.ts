/**
 * V96 variation-controls smoke - Metaphysics fixture.
 * Run: npx tsx engines/composer-os-v2/scripts/smokeVariationControlsV96.ts
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { apiRunLeadSheetFileInput } from '../app-api/runLeadSheetFileInputApi';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import { resolveMetaphysicsLeadSheetProofPath } from '../core/import/resolveOrbitLeadSheetProofPath';

const COMPOSERS = ['debussy', 'kenny_wheeler', 'bartok'] as const;
const GUITAR_COMP_LOW = 0.05;
const GUITAR_COMP_HIGH = 0.95;
const PROOF_SEED = 90106;

function extractRunId(filename: string): string | null {
  const m = filename.match(/_v(\d+)_quintet\.musicxml$/);
  return m?.[1] ?? null;
}

const metaphysics = resolveMetaphysicsLeadSheetProofPath(path.join(__dirname, '..'));
if (!metaphysics) {
  console.error('FAIL: Metaphysics fixture not found');
  process.exit(1);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-v96-smoke-'));
const tl = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(metaphysics);
const results: { check: string; pass: boolean; detail?: string }[] = [];

for (const composerId of COMPOSERS) {
  const res = apiRunLeadSheetFileInput(
    { filePath: metaphysics, composerId, seed: PROOF_SEED, rhythmicActivity: 0.35, guitarCompDensity: 0.5 },
    outDir,
  );
  const basename = path.basename(res.savedMusicXmlPath ?? '');
  results.push({
    check: composerId + ': API ok + timestamped export',
    pass: res.ok === true && !!res.savedMusicXmlPath && fs.existsSync(res.savedMusicXmlPath) && extractRunId(basename) != null,
    detail: basename,
  });
}

const anotherA = apiRunLeadSheetFileInput({ filePath: metaphysics, composerId: 'debussy', seed: 111222, rhythmicActivity: 0.35, guitarCompDensity: 0.5 }, outDir);
const anotherB = apiRunLeadSheetFileInput({ filePath: metaphysics, composerId: 'debussy', seed: 333444, rhythmicActivity: 0.35, guitarCompDensity: 0.5 }, outDir);
const runIdA = extractRunId(path.basename(anotherA.savedMusicXmlPath ?? ''));
const runIdB = extractRunId(path.basename(anotherB.savedMusicXmlPath ?? ''));
results.push({ check: 'Another version: distinct runId timestamps', pass: anotherA.ok && anotherB.ok && runIdA != null && runIdB != null && runIdA !== runIdB, detail: runIdA + ' vs ' + runIdB });

const defaultRhythm = assembleDebussyLeadSheetQuintetWithHandoffScore(PROOF_SEED, undefined, tl, 'debussy', { rhythmicActivity: 0.35 });
const maxRhythm = assembleDebussyLeadSheetQuintetWithHandoffScore(PROOF_SEED, undefined, tl, 'debussy', { rhythmicActivity: 1 });
results.push({ check: 'Rhythmic activity max -> rhythmAntiLoop moderate', pass: defaultRhythm.rhythmAntiLoop?.intensity === 'gentle' && maxRhythm.rhythmAntiLoop?.intensity === 'moderate', detail: (defaultRhythm.rhythmAntiLoop?.intensity ?? '?') + ' -> ' + (maxRhythm.rhythmAntiLoop?.intensity ?? '?') });

const bartokLight = assembleDebussyLeadSheetQuintetWithHandoffScore(PROOF_SEED, undefined, tl, 'bartok', { guitarCompDensity: GUITAR_COMP_LOW });
const bartokBusy = assembleDebussyLeadSheetQuintetWithHandoffScore(PROOF_SEED, undefined, tl, 'bartok', { guitarCompDensity: GUITAR_COMP_HIGH });
const lightEvents = bartokLight.guitarChording?.eventsAdded ?? 0;
const busyEvents = bartokBusy.guitarChording?.eventsAdded ?? 0;
const lightBars = bartokLight.guitarChording?.chordBarCountAfter ?? 0;
const busyBars = bartokBusy.guitarChording?.chordBarCountAfter ?? 0;
results.push({ check: 'Guitar comp Bartok: eventsAdded high > low at extremes', pass: busyEvents > lightEvents && busyEvents - lightEvents >= 2, detail: 'eventsAdded ' + lightEvents + ' (' + GUITAR_COMP_LOW + ') vs ' + busyEvents + ' (' + GUITAR_COMP_HIGH + '); bars ' + lightBars + ' vs ' + busyBars + ' secondary' });

const debussyLight = assembleDebussyLeadSheetQuintetWithHandoffScore(PROOF_SEED, undefined, tl, 'debussy', { guitarCompDensity: GUITAR_COMP_LOW });
const debussyBusy = assembleDebussyLeadSheetQuintetWithHandoffScore(PROOF_SEED, undefined, tl, 'debussy', { guitarCompDensity: GUITAR_COMP_HIGH });
results.push({ check: 'Guitar comp Debussy: eventsAdded at extremes informational', pass: true, detail: 'eventsAdded ' + (debussyLight.guitarChording?.eventsAdded ?? 0) + ' (' + GUITAR_COMP_LOW + ') vs ' + (debussyBusy.guitarChording?.eventsAdded ?? 0) + ' (' + GUITAR_COMP_HIGH + ')' });

console.log('=== V96 variation-controls smoke (Metaphysics) ===');
console.log('fixture: ' + metaphysics);
console.log('output dir: ' + outDir);
for (const r of results) console.log(r.pass ? 'PASS' : 'FAIL', r.check, r.detail ? '- ' + r.detail : '');
const hardChecks = results.filter((r) => !r.check.includes('informational'));
const allPass = hardChecks.every((r) => r.pass);
console.log(allPass ? '\nOVERALL: PASS' : '\nOVERALL: FAIL');
process.exit(allPass ? 0 : 1);
