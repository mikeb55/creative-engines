/**
 * Pentatonic path Dev 2 — mechanical tests.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicPath.test.ts
 */
import assert from 'node:assert/strict';
import { readChordEvidence } from '../core/pentatonic/chordEvidence';
import { DEFAULT_PENTATONIC_SCORING } from '../core/pentatonic/evaluate';
import { WWH_DUO_EVIDENCE_WEIGHTS } from '../core/pentatonic/evidenceProfiles';
import { optimizePentatonicPath } from '../core/pentatonic/optimizePath';
import { buildPentatonicMusicContext } from '../core/pentatonic/recommend';
import { passageFromMusicContext, recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import { DEFAULT_PENTATONIC_PATH_CONFIG, sharedToneContinuity } from '../core/pentatonic/pathConfig';
import type { PentatonicPassage } from '../core/pentatonic/pathTypes';

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

  check('chord reader keeps Dev 1 forms and reads WWH symbols', () => {
    const add9 = readChordEvidence('Am(add9)');
    assert.equal(add9.ok, true);
    if (add9.ok) assert.deepEqual(add9.chord.harmonyPitchClasses, [0, 4, 9, 11]);
    const slash = readChordEvidence('G/F');
    assert.equal(slash.ok, true);
    if (slash.ok) {
      assert.deepEqual(slash.chord.harmonyPitchClasses, [2, 7, 11]);
      assert.equal(slash.chord.slashBassPitchClass, 5);
    }
    const eb = readChordEvidence('Eb/F');
    assert.equal(eb.ok, true);
    if (eb.ok) assert.equal(eb.chord.slashBassPitchClass, 5);
    for (const symbol of ['Fmaj7#11', 'Ebmaj7#5', 'Dbmaj7', 'Bmaj7', 'Bbm9', 'm7', 'C9', 'C13', 'Cm7b5', 'Cdim7', 'Csus2', 'Csus4', 'Cadd9']) {
      const chord = readChordEvidence(symbol.startsWith('m7') ? 'Cm7' : symbol);
      assert.equal(chord.ok, true, symbol);
    }
    for (const symbol of ['A5/E', 'A/E', 'C#m(b6)', 'D5/Bb', 'E°', 'E°7', 'C°7']) {
      const chord = readChordEvidence(symbol);
      assert.equal(chord.ok, true, symbol);
    }
    const unknown = readChordEvidence('Cxyz');
    assert.equal(unknown.ok, false);
  });

  check('shared-tone continuity uses the larger collection, not a fixed 5', () => {
    assert.equal(sharedToneContinuity([0, 2, 4, 7, 9], [0, 2, 4, 7, 9]), 1);
    assert.equal(sharedToneContinuity([0, 2, 4, 7], [0, 2, 4, 7]), 1);
    assert.equal(sharedToneContinuity([0, 2, 4], [0, 2, 6]), 2 / 3);
  });

  check('validation rejects empty, duplicate, and missing labels', () => {
    const empty = recommendPentatonicPath({ events: [], tonalCentre: { root: 'C', mode: 'major' } });
    assert.equal(empty.kind, 'validation');
    const dup = recommendPentatonicPath({
      tonalCentre: { root: 'C', mode: 'major' },
      events: [
        { id: 'a', sourceLabel: 'A', melodyNotes: ['C'] },
        { id: 'a', sourceLabel: 'B', melodyNotes: ['D'] },
      ],
    });
    assert.equal(dup.kind, 'validation');
    const blank = recommendPentatonicPath({
      tonalCentre: { root: 'C', mode: 'major' },
      events: [{ id: 'a', sourceLabel: '', melodyNotes: ['C'] }],
    });
    assert.equal(blank.kind, 'validation');
  });

  check('source labels stay exact and event order is preserved', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'C', mode: 'major' },
      depth: 'near',
      events: [
        { id: 'e-a', sourceLabel: 'A', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: 'e-a1', sourceLabel: 'A1', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: 'e-17', sourceLabel: '17a', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: 'e-pick', sourceLabel: 'pickup', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: 'e-b', sourceLabel: 'B-3', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
      ],
    });
    assert.deepEqual(
      result.events.map((event) => event.sourceLabel),
      ['A', 'A1', '17a', 'pickup', 'B-3']
    );
    assert.equal(result.segments[0]?.firstSourceLabel, 'A');
    assert.equal(result.segments[0]?.lastSourceLabel, 'B-3');
    assert.equal(result.switchCount, 0);
  });

  check('unknown chord does not abort the path', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'C', mode: 'major' },
      depth: 'near',
      events: [
        { id: '1', sourceLabel: 'A', chordSymbol: 'Cxyz', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: '2', sourceLabel: 'B', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
      ],
    });
    assert.equal(result.disposition, 'PATH');
    assert.match(result.diagnostics.join(' '), /Unknown chord/);
  });

  check('bass rest is not missing context and silence continues the state', () => {
    const rest = recommendPentatonicPath({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      depth: 'near',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['A', 'C', 'D', 'E', 'G'], bassRest: true },
        { id: '2', sourceLabel: '2', melodyRest: true, bassRest: true },
        { id: '3', sourceLabel: '3', melodyNotes: ['A', 'C', 'D', 'E', 'G'] },
      ],
    });
    assert.equal(rest.disposition, 'PATH');
    assert.notEqual(rest.disposition, 'INSUFFICIENT_CONTEXT');
    assert.equal(rest.events[1]?.chosenId, rest.events[0]?.chosenId);
    assert.equal(rest.events[1]?.changeFlag, 'retained');
    assert.match(rest.events[1]?.explanation ?? '', /Silence/);
  });

  check('hard constraint is never chosen', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'C', mode: 'major' },
      depth: 'near',
      strictMelodyMembership: true,
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['C', 'D', 'E', 'F#'], protectedNotes: ['F#'] },
      ],
    });
    assert.equal(result.disposition, 'PATH');
    assert.equal(result.events[1]?.chosenId, 'NONE');
    assert.notEqual(result.events[1]?.canonicalPitchSet?.includes(6), true);
  });

  check('marginal local gain retains and a clear gain can switch', () => {
    const marginal = recommendPentatonicPath({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      current: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      depth: 'home_wheel',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['A', 'C', 'D', 'E'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['A', 'C', 'D', 'E', 'B'] },
      ],
    });
    assert.equal(marginal.events[0]?.chosenId, marginal.events[1]?.chosenId);
    const strong = recommendPentatonicPath({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      depth: 'chromatic',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['C'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['C'] },
        { id: '3', sourceLabel: '3', melodyNotes: ['B', 'F#'] },
        { id: '4', sourceLabel: '4', melodyNotes: ['B', 'F#'] },
        { id: '5', sourceLabel: '5', melodyNotes: ['C'] },
      ],
    });
    assert.ok(strong.switchCount >= 1);
    assert.notEqual(strong.events[2]?.chosenId, strong.events[0]?.chosenId);
  });

  check('one-event colour stays legal when the local evidence is complete', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      depth: 'chromatic',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['C'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['B'] },
        { id: '3', sourceLabel: '3', melodyNotes: ['C'] },
      ],
    });
    assert.equal(result.segments.some((segment) => segment.eventIds.length === 1), true);
    assert.notEqual(result.events[1]?.chosenId, result.events[0]?.chosenId);
    assert.notEqual(result.events[1]?.chosenId, 'NONE');
  });

  check('zero change cost can switch where the default retains', () => {
    const base: PentatonicPassage = {
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      depth: 'chromatic',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['A', 'C', 'D', 'E', 'G'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['E', 'G', 'A', 'B', 'D'] },
      ],
    };
    const held = recommendPentatonicPath(base);
    const loose = recommendPentatonicPath(base, { path: { changeCost: 0, shortSegmentPenalty: 0, distinctResourcePenalty: 0 } });
    assert.ok(loose.switchCount >= held.switchCount);
  });

  check('optimizer accepts a 4-note set and a 3-note set', () => {
    const optimized = optimizePentatonicPath({
      states: [
        { id: '0,2,4,7', pitchSet: [0, 2, 4, 7], archetypeId: 'quad', referenceNote: 'C', homeRelationshipId: null, homeRelationshipLabel: null, name: 'Quad', displaySpelling: ['C', 'D', 'E', 'G'] },
        { id: '0,4,7', pitchSet: [0, 4, 7], archetypeId: 'triad', referenceNote: 'C', homeRelationshipId: null, homeRelationshipLabel: null, name: 'Triad', displaySpelling: ['C', 'E', 'G'] },
      ],
      events: [
        { feasibleStateIds: ['0,2,4,7', '0,4,7'], localScoreById: { '0,2,4,7': 1, '0,4,7': 0.2 }, phraseBoundaryAfter: false },
        { feasibleStateIds: ['0,2,4,7', '0,4,7'], localScoreById: { '0,2,4,7': 1, '0,4,7': 0.2 }, phraseBoundaryAfter: false },
      ],
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
      allowNone: true,
      previousStateId: null,
      previousPitchSet: null,
      homeExplicit: false,
      finalHomeBonusEnabled: false,
      sourceLabels: ['a', 'b'],
      eventIds: ['a', 'b'],
    });
    assert.equal(optimized.best?.path.length, 2);
    assert.deepEqual(optimized.best?.path, [0, 0]);
  });

  check('exact score tie prefers archetype id then pitch-set id', () => {
    const optimized = optimizePentatonicPath({
      states: [
        { id: '9,0,2,4,7', pitchSet: [0, 2, 4, 7, 9], archetypeId: 'minor_pentatonic', referenceNote: 'A', homeRelationshipId: null, homeRelationshipLabel: null, name: 'A minor', displaySpelling: [] },
        { id: '0,2,4,7,9', pitchSet: [0, 2, 4, 7, 9], archetypeId: 'major_pentatonic', referenceNote: 'C', homeRelationshipId: null, homeRelationshipLabel: null, name: 'C major', displaySpelling: [] },
      ],
      events: [{ feasibleStateIds: ['9,0,2,4,7', '0,2,4,7,9'], localScoreById: { '9,0,2,4,7': 0.5, '0,2,4,7,9': 0.5 }, phraseBoundaryAfter: false }],
      config: { ...DEFAULT_PENTATONIC_PATH_CONFIG, noneBaselineCost: 5 },
      allowNone: true,
      previousStateId: null,
      previousPitchSet: null,
      homeExplicit: false,
      finalHomeBonusEnabled: false,
      sourceLabels: ['A'],
      eventIds: ['A'],
    });
    assert.equal(optimized.best?.stateIndex, 1);
  });

  check('ten identical runs match', () => {
    const passage: PentatonicPassage = {
      tonalCentre: { root: 'C', mode: 'major' },
      depth: 'near',
      events: [
        { id: '1', sourceLabel: 'A', melodyNotes: ['C', 'E', 'G'] },
        { id: '2', sourceLabel: 'B', melodyNotes: ['D', 'F', 'A'] },
      ],
    };
    const first = JSON.stringify(recommendPentatonicPath(passage));
    for (let i = 0; i < 9; i++) assert.equal(JSON.stringify(recommendPentatonicPath(passage)), first);
  });

  check('MusicContext adapter requires caller labels', () => {
    const context = buildPentatonicMusicContext({ tonalCentre: { root: 'C', mode: 'major' }, harmonyBars: ['C', 'G'] });
    const missing = passageFromMusicContext(context, ['only-one']);
    assert.equal(missing.ok, false);
    const built = passageFromMusicContext(context, ['intro', 'turn']);
    assert.equal(built.ok, true);
    if (built.ok) {
      assert.equal(built.passage.events[0]?.sourceLabel, 'intro');
      assert.equal(built.passage.events[1]?.sourceLabel, 'turn');
    }
  });

  check('default path weights stay on the Dev 1 defaults', () => {
    assert.equal(DEFAULT_PENTATONIC_SCORING.weights.melody, 1.8);
    assert.equal(DEFAULT_PENTATONIC_SCORING.weights.harmony, 1.8);
    assert.ok(WWH_DUO_EVIDENCE_WEIGHTS.melody > WWH_DUO_EVIDENCE_WEIGHTS.harmony);
    assert.ok(WWH_DUO_EVIDENCE_WEIGHTS.bass > WWH_DUO_EVIDENCE_WEIGHTS.harmony);
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
