/**
 * Pentatonic Options V2 — thin practice front end.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicOptionsV2.test.ts
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { COMPARE_CANDIDATE_CAP } from '../core/pentatonic/productionCompare';
import {
  analyseScoreXml,
  comparePracticeExample,
  defaultPracticeRequest,
  exportPracticeSheet,
  generatePracticeExample,
  inspectCustomCollection,
  legacyColourWheel,
  listPracticeFields,
  museScoreOpenCommand,
  nextPracticeExample,
  PENTATONIC_OPTIONS_V2_SEAMS,
  sha256Text,
  type PracticeCategory,
} from '../core/pentatonic/practiceFacade';
import { emptySession, favouriteRows, rememberExample, stepSession, toggleFavourite } from '../../../apps/pentatonic-options-v2/src/session';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const APP = path.join(ROOT, 'apps/pentatonic-options-v2');
const FACADE = path.join(ROOT, 'engines/composer-os-v2/core/pentatonic/practiceFacade.ts');

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

  check('V2 imports authoritative pentatonic seams', () => {
    const source = fs.readFileSync(FACADE, 'utf8');
    for (const seam of PENTATONIC_OPTIONS_V2_SEAMS) assert.equal(source.includes(seam), true, seam);
    const app = fs.readFileSync(path.join(APP, 'ui/app.js'), 'utf8');
    assert.equal(app.includes('intervals:'), false);
    assert.equal(app.includes('planPentatonicOperator'), false);
    assert.equal(app.includes('exportScoreModelToMusicXml'), false);
  });

  check('no duplicate local engine in the app', () => {
    for (const name of ['phraseOperators.ts', 'colourRegistry.ts', 'autoColor.ts', 'gceEvaluator.ts']) {
      assert.equal(fs.existsSync(path.join(APP, name)), false);
    }
    assert.equal(fs.readFileSync(path.join(APP, 'electron/main.ts'), 'utf8').includes('practiceFacade'), true);
  });

  const categories: PracticeCategory[] = [
    'HOME_CONTINUITY',
    'HOLD_FIELD',
    'RESEAT',
    'CELL_LINEAGE',
    'OUTSIDE_RETURN',
    'TRITONE_PAIR',
    'QUARTAL_COMP',
    'QUARTAL_LINE',
    'ANSWER_BASS',
    'SUPPORT_BASS',
    'STRUCTURAL_SILENCE',
    'NO_PHRASE',
    'NONE',
  ];
  const operators: Record<string, string> = {
    HOME_CONTINUITY: 'CELL_LINEAGE',
    HOLD_FIELD: 'HOLD_FIELD',
    RESEAT: 'RESEAT',
    CELL_LINEAGE: 'CELL_LINEAGE',
    OUTSIDE_RETURN: 'SLIP',
    TRITONE_PAIR: 'TRITONE_PAIR',
    QUARTAL_COMP: 'QUARTAL_COMP',
    QUARTAL_LINE: 'QUARTAL_LINE',
    ANSWER_BASS: 'RESEAT',
    SUPPORT_BASS: 'RETAIN',
    STRUCTURAL_SILENCE: 'STRUCTURAL_SILENCE',
    NO_PHRASE: 'NO_PHRASE',
    NONE: 'NONE',
  };
  for (const category of categories) {
    check(category, () => {
      const example = generatePracticeExample({
        category,
        difficulty: 'SPARSE',
        centre: 'C',
        bassNotes: category === 'ANSWER_BASS' || category === 'SUPPORT_BASS' ? 'C' : '',
      });
      assert.equal(example.operator, operators[category]);
      assert.equal(example.centre, 'C');
      assert.equal(example.difficulty, 'SPARSE');
      if (category === 'STRUCTURAL_SILENCE') assert.equal(example.silenceKind, 'STRUCTURAL_SILENCE');
      if (category === 'NO_PHRASE') assert.equal(example.silenceKind, 'NO_PHRASE');
      if (category === 'NONE') assert.equal(example.silenceKind, 'PATH_NONE');
      if (example.silenceKind === 'SOUNDING') assert.ok(example.pitches.length >= 2);
      else assert.equal(example.notes, 'rest');
      assert.equal(example.musicXml.includes('<staff-type>tab</staff-type>'), false);
      assert.equal(example.musicXml.includes('Electric Guitar'), true);
    });
  }

  check('custom five-note collection', () => {
    const before = listPentatonicColourResources().map((row) => row.id).join(',');
    const matched = inspectCustomCollection('C D E G A', 'C');
    const custom = inspectCustomCollection('C Db E Gb A', 'C');
    assert.equal(matched.label, 'Major Pentatonic');
    assert.equal(custom.label, 'CUSTOM');
    assert.equal(custom.sessionOnly, true);
    assert.equal(inspectCustomCollection('C D E', 'C').ok, false);
    assert.equal(listPentatonicColourResources().map((row) => row.id).join(','), before);
  });

  check('score input remains read-only', () => {
    const example = generatePracticeExample({ category: 'HOME_CONTINUITY' });
    const before = sha256Text(example.musicXml);
    const analysed = analyseScoreXml(example.musicXml);
    assert.equal(analysed.sha256, before);
    assert.equal(sha256Text(example.musicXml), before);
    assert.ok(analysed.regionCount >= 1);
  });

  check('compare capped at 3 and not sorted by GCE', () => {
    const example = generatePracticeExample({ category: 'HOME_CONTINUITY' });
    const compared = comparePracticeExample(example);
    assert.ok(compared.candidates.length <= COMPARE_CANDIDATE_CAP);
    assert.equal(compared.sortedByGce, false);
    assert.equal(compared.ranking, 'plan-alternative-silence');
    assert.equal(compared.candidates[0]?.slot, 'plan');
    const scores = compared.candidates.map((row) => row.gceOverall ?? -1);
    const ranked = [...scores].sort((left, right) => right - left);
    if (scores.length > 1) assert.ok(scores.join(',') !== ranked.join(',') || scores.every((score) => score === scores[0]));
  });

  check('GCE advisory does not auto-sort', () => {
    const example = generatePracticeExample({ category: 'OUTSIDE_RETURN' });
    assert.match(example.gceAdvisory, /does not choose/);
    const compared = comparePracticeExample(example);
    const rank: Record<string, number> = { plan: 0, alternative: 1, silence: 2 };
    const slots = compared.candidates.map((row) => row.slot);
    const bySlot = [...slots].sort((left, right) => (rank[left] ?? 9) - (rank[right] ?? 9));
    assert.deepEqual(slots, bySlot);
    const byScore = [...compared.candidates].sort((left, right) => (right.gceOverall ?? -1) - (left.gceOverall ?? -1)).map((row) => row.slot);
    if (compared.candidates.some((row) => row.gceOverall !== compared.candidates[0]?.gceOverall)) {
      assert.notDeepEqual(slots, byScore);
    }
  });

  check('MusicXML export', () => {
    const example = generatePracticeExample({});
    assert.match(example.musicXml, /<score-partwise/);
    const sheet = exportPracticeSheet([
      generatePracticeExample({ category: 'HOME_CONTINUITY', variation: 0 }),
      generatePracticeExample({ category: 'RESEAT', variation: 0 }),
    ]);
    assert.match(sheet, /<measure number="2"/);
  });

  check('MuseScore open command', () => {
    assert.deepEqual(museScoreOpenCommand('/tmp/example.musicxml'), ['open', '-a', 'MuseScore 4', '/tmp/example.musicxml']);
  });

  check('reset returns the default practice state', () => {
    const defaults = defaultPracticeRequest();
    assert.equal(defaults.category, 'HOME_CONTINUITY');
    assert.equal(defaults.difficulty, 'SPARSE');
    assert.equal(defaults.centre, 'C');
    assert.equal(defaults.motif, '');
    assert.equal(defaults.fieldId, 'minor_pentatonic');
  });

  check('NEXT EXAMPLE preserves context', () => {
    const request = {
      category: 'CELL_LINEAGE' as const,
      difficulty: 'SPARSE' as const,
      centre: 'Eb',
      motif: 'Eb Gb Bb',
      bassNotes: 'Eb',
      variation: 0,
    };
    const first = generatePracticeExample(request);
    const next = nextPracticeExample(request);
    assert.equal(next.centre, 'Eb');
    assert.equal(next.category, 'CELL_LINEAGE');
    assert.equal(next.difficulty, 'SPARSE');
    assert.equal(next.variation, first.variation + 1);
    assert.notEqual(next.notes, first.notes);
  });

  check('source MusicXML unchanged after analyse and compare', () => {
    const xml = generatePracticeExample({}).musicXml;
    const hash = sha256Text(xml);
    analyseScoreXml(xml);
    comparePracticeExample(generatePracticeExample({}));
    assert.equal(sha256Text(xml), hash);
  });

  check('field browser reads the production registry', () => {
    const fields = listPracticeFields('C');
    assert.equal(fields.length, listPentatonicColourResources().length);
    assert.equal(fields.some((row) => row.id === 'minor_pentatonic' && row.notes.includes('C')), true);
  });

  check('legacy wheel maps onto Dev 6 or stays a practice view', () => {
    const wheel = legacyColourWheel('C');
    assert.equal(wheel.length, 5);
    const minor = wheel.find((row) => row.label === 'Minor Pentatonic');
    const major7 = wheel.find((row) => row.label === 'Major 7 Color');
    assert.equal(minor?.exactAtCentre, true);
    assert.equal(minor?.mappedResourceId, 'minor_pentatonic');
    assert.equal(major7?.practiceView, true);
    assert.equal(major7?.exactAtCentre, false);
  });

  check('session history stays local', () => {
    let session = emptySession();
    session = rememberExample(session, {
      category: 'HOME / CONTINUITY',
      field: 'C minor',
      operator: 'CELL_LINEAGE',
      notes: 'C F G',
      exported: false,
      variation: 0,
    });
    session = rememberExample(session, {
      category: 'RESEAT',
      field: 'C minor',
      operator: 'RESEAT',
      notes: 'C F Eb',
      exported: true,
      variation: 1,
    });
    session = toggleFavourite(session, session.rows[0]!.id);
    assert.equal(stepSession(session, -1).cursor, 0);
    assert.equal(favouriteRows(session).length, 1);
  });

  check('Dev 3.7 fingerprint unchanged', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
  });

  check('desktop app launch smoke', () => {
    const appPath = path.join(APP, 'dist/Pentatonic Options V2.app');
    const plist = path.join(appPath, 'Contents/Info.plist');
    if (!fs.existsSync(plist)) throw new Error('Desktop bundle missing. Run npm run package:mac in apps/pentatonic-options-v2.');
    const info = fs.readFileSync(plist, 'utf8');
    assert.match(info, /com\.thirdsun\.pentatonicoptions\.v2/);
    assert.match(info, /Pentatonic Options V2/);
    const binary = path.join(appPath, 'Contents/MacOS/Pentatonic Options V2');
    const launched = spawnSync(binary, ['--self-test'], { encoding: 'utf8', timeout: 30000 });
    const text = `${launched.stdout ?? ''}\n${launched.stderr ?? ''}`;
    assert.match(text, /SELF_TEST_OK/);
    assert.equal(launched.status, 0);
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
