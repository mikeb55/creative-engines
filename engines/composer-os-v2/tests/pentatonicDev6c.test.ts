/**
 * Pentatonic Engine Dev 6C — production workflow, compare, export, WWH release gate.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev6c.test.ts
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import {
  COMPARE_CANDIDATE_CAP,
  DEV6C_OPERATOR_REVIEW,
  DEV6C_OUTPUT_DIR,
  DEV6C_PATH_PROMOTIONS,
  DEV6C_REJECTED_BEHAVIOURS,
  assertExportPathIsSeparate,
  comparePentatonicCandidates,
  compareRegion,
  orderCompareCandidates,
  reviewColourRegistry,
  structuralProbes,
  validateProductionMusicXml,
  type CompareCandidate,
} from '../core/pentatonic/productionCompare';
import { listPentatonicArchetypes } from '../core/pentatonic/registry';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const WWH_SOURCES: ReadonlyArray<readonly [string, string, string]> = [
  ['01 Black Aura', '01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02 Palace Gates', '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03 The Mirror', '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ["04 Meet Me at Hobo's", '04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05 Orbit', '05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06 Wrong Turning', '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07 Impossible Metaphysics', '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08 Small Testimony', '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09 After Everything', '09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
];

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function tempoOf(xml: string): number {
  const sound = xml.match(/tempo="([\d.]+)"/)?.[1];
  const words = xml.match(/<per-minute>([\d.]+)<\/per-minute>/)?.[1];
  const bpm = Number(sound ?? words ?? 72);
  return Number.isFinite(bpm) && bpm > 0 ? bpm : 72;
}

function stub(partial: Partial<CompareCandidate> & Pick<CompareCandidate, 'slot' | 'kind' | 'gceOverall'>): CompareCandidate {
  return {
    resource: 'A Major Pentatonic',
    operator: 'RETAIN',
    generatedNotes: 'C4 D4',
    outsideResourceNotes: 'NONE',
    lineage: 'Parent pitches held. Lineage clear.',
    returnQuality: 'field stays',
    formFit: 'continuation',
    duoFit: 'GUITAR_LEADS',
    gceAdvisory: 'Advisory. This number does not choose the candidate.',
    musicXml: '<score-partwise></score-partwise>',
    silence: partial.kind === 'SILENCE',
    accepted: true,
    rejectionReasons: [],
    ...partial,
  };
}

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('compare order ignores a higher GCE score', () => {
    const ordered = orderCompareCandidates([
      stub({ slot: 'silence', kind: 'SILENCE', gceOverall: 9.4 }),
      stub({ slot: 'plan', kind: 'RETAIN', gceOverall: 4.1 }),
      stub({ slot: 'alternative', kind: 'RESEAT', gceOverall: 8.8 }),
    ]);
    assert.deepEqual(
      ordered.map((row) => row.kind),
      ['RETAIN', 'RESEAT', 'SILENCE']
    );
    assert.equal(ordered.length <= COMPARE_CANDIDATE_CAP, true);
    assert.equal(ordered[0]?.gceOverall, 4.1);
  });

  check('operators stay keep or restrict, with no new major operator', () => {
    assert.equal(DEV6C_OPERATOR_REVIEW.length, 11);
    for (const row of DEV6C_OPERATOR_REVIEW) assert.equal(row.status === 'DISABLE', false, row.id);
    assert.equal(DEV6C_OPERATOR_REVIEW.find((row) => row.id === 'SLIP')?.status, 'RESTRICT');
    assert.equal(DEV6C_OPERATOR_REVIEW.find((row) => row.id === 'TRITONE_PAIR')?.status, 'RESTRICT');
    assert.equal(DEV6C_OPERATOR_REVIEW.find((row) => row.id === 'HOLD_FIELD')?.status, 'KEEP');
    assert.equal(DEV6C_OPERATOR_REVIEW.find((row) => row.id === 'STRUCTURAL_SILENCE')?.status, 'KEEP');
    const names = DEV6C_REJECTED_BEHAVIOURS.join(' ');
    assert.match(names, /THROUGH/);
    assert.match(names, /SEQUENCE/);
    assert.match(names, /INTENSIFY/);
    assert.match(names, /Woody Shaw/);
    assert.deepEqual([...DEV6C_PATH_PROMOTIONS], []);
  });

  check('frozen fingerprint, change cost, registries, and the Dev 5 tag stay put', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.deepEqual(
      listPentatonicArchetypes().map((row) => row.id),
      ['major_pentatonic', 'minor_pentatonic']
    );
    assert.equal(listPentatonicColourResources().length, 20);
    const dev5 = execSync('git rev-parse pentatonic-dev5-baseline', { encoding: 'utf8' }).trim();
    assert.equal(dev5, '025dbe61aa500a92a957383b8159112f1158cd1b');
    const dev4 = execSync('git rev-parse pentatonic-dev4-baseline', { encoding: 'utf8' }).trim();
    assert.equal(dev4.length, 40);
  });

  check('nine WWH scores pass analyse, plan, compare, audition, and export', () => {
    fs.mkdirSync(DEV6C_OUTPUT_DIR, { recursive: true });
    const used = new Set<string>();
    const shortlisted = new Set<string>();
    const lines: string[] = [];
    for (const [title, file, expected] of WWH_SOURCES) {
      const source = path.join(ALBUM, file);
      assert.equal(sha(source), expected, title);
      const xml = fs.readFileSync(source, 'utf8');
      const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: expected });
      assert.equal(sha(source), expected, `${title} after analyse`);
      for (const event of analysis.path.events) {
        if (event.archetypeId) used.add(event.archetypeId);
      }
      const probes = structuralProbes(analysis);
      assert.ok(probes.length > 0, `${title} form probes`);
      const forms = new Set(probes.map((probe) => probe.formFunction));
      assert.ok(forms.size >= 1, title);
      for (const probe of probes) {
        assert.ok(probe.intentions.length > 0 && probe.intentions.length <= 3, title);
        for (const plan of probe.plans) {
          if (plan.fieldChanged && plan.targetResourceId) used.add(plan.targetResourceId);
          else if (plan.targetResourceId) shortlisted.add(plan.targetResourceId);
          lines.push([title, probe.formFunction, probe.duoRole, plan.intention, plan.outcome, plan.operator, plan.silence].join(' :: '));
        }
      }
      const region = compareRegion(analysis);
      assert.ok(region, title);
      const compared = comparePentatonicCandidates({ xml, analysis, region: region!, intentions: ['RETAIN_MOTIF', 'MORE_SPACE'] });
      assert.equal(compared.ranking, 'plan-alternative-silence');
      assert.ok(compared.candidates.length >= 1 && compared.candidates.length <= COMPARE_CANDIDATE_CAP, title);
      assert.ok(compared.candidates.some((candidate) => candidate.kind === 'SILENCE'), `${title} silence candidate`);
      assert.ok(compared.candidates.some((candidate) => candidate.accepted), `${title} audition`);
      const chosen = compared.candidates.find((candidate) => candidate.accepted) ?? compared.candidates[0]!;
      const event = analysis.score.events.find((row) => row.sourceLabel === region!.firstSourceLabel) ?? analysis.score.events[0];
      const beats = event?.timeBeats && event.timeBeats > 0 ? event.timeBeats : 4;
      const beatType = event?.timeBeatType && event.timeBeatType > 0 ? event.timeBeatType : 4;
      const issues = validateProductionMusicXml({
        xml: chosen.musicXml,
        beats,
        beatType,
        bpm: tempoOf(xml),
        silence: chosen.silence,
        outsideNotes: chosen.outsideResourceNotes,
      });
      assert.deepEqual(issues, [], `${title} ${issues.join('; ')}`);
      const output = path.join(DEV6C_OUTPUT_DIR, `${file.replace(/\.musicxml$/i, '')}-dev6c.musicxml`);
      assertExportPathIsSeparate(source, output);
      fs.writeFileSync(output, chosen.musicXml);
      assert.equal(sha(source), expected, `${title} after export`);
      assert.equal(fs.existsSync(source), true);
      lines.push(
        [
          title,
          'COMPARE',
          compared.candidates.map((candidate) => `${candidate.kind}:${candidate.accepted ? 'keep' : 'reject'}`).join(','),
          `forms ${[...forms].join('/')}`,
        ].join(' :: ')
      );
    }
    const colour = reviewColourRegistry(used, shortlisted);
    assert.equal(colour.length, 20);
    assert.equal(colour.some((row) => row.status === 'redundant'), false);
    assert.equal(colour.some((row) => row.status === 'weak'), false);
    assert.equal(colour.some((row) => row.id === 'major_pentatonic' && row.status === 'used'), true);
    assert.equal(colour.some((row) => row.id === 'minor_pentatonic' && row.status === 'used'), true);
    assert.equal(colour.find((row) => row.id === 'remote_altered')?.status === 'used', false);
    console.log(lines.join('\n'));
    console.log(colour.map((row) => `${row.id} ${row.status}`).join('\n'));
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
