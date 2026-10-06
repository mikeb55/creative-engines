/**
 * Pentatonic Engine Dev 1 — mechanical tests.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicEngine.test.ts
 */
import assert from 'node:assert/strict';
import { computeHarmonyChecksum } from '../core/harmony/harmonyContext';
import { generatePentatonicCandidates } from '../core/pentatonic/candidates';
import { pentatonicHarmonyChecksum } from '../core/pentatonic/checksum';
import { readChordEvidence } from '../core/pentatonic/chordEvidence';
import { HOME_RELATIONSHIPS } from '../core/pentatonic/homeRelationships';
import { canonicalPitchSet, canonicalPitchSetId, mod12, spellFromReference } from '../core/pentatonic/pitch';
import {
  buildPentatonicMusicContext,
  lyricalAnswerExampleRegion,
  recommendPentatonics,
  recommendPentatonicsFromRegion,
} from '../core/pentatonic/recommend';
import { PENTATONIC_ARCHETYPES, PENTATONIC_REGISTRY_VERSION, getPentatonicArchetype } from '../core/pentatonic/registry';
import type { MusicContext, PentatonicRegionInput } from '../core/pentatonic/types';

function region(partial: Partial<PentatonicRegionInput> & Pick<PentatonicRegionInput, 'tonalCentre'>): PentatonicRegionInput {
  return partial;
}

function pcs(reference: number, intervals: readonly number[], offset = 0): number[] {
  return canonicalPitchSet(intervals.map((interval) => mod12(reference + offset + interval)));
}

export function runPentatonicEngineTests(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('registry archetypes have five unique pitch classes and stable ids', () => {
    assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
    assert.deepEqual(PENTATONIC_ARCHETYPES.map((item) => item.id), ['major_pentatonic', 'minor_pentatonic']);
    for (const archetype of PENTATONIC_ARCHETYPES) {
      assert.equal(getPentatonicArchetype(archetype.id)?.id, archetype.id);
      assert.equal(new Set(archetype.intervals).size, 5);
      for (const interval of archetype.intervals) assert.ok(interval >= 0 && interval < 12);
    }
    assert.deepEqual(getPentatonicArchetype('major_pentatonic')?.intervals, [0, 2, 4, 7, 9]);
    assert.deepEqual(getPentatonicArchetype('minor_pentatonic')?.intervals, [0, 3, 5, 7, 10]);
  });

  check('twelve transpositions and negative offsets', () => {
    const minor = getPentatonicArchetype('minor_pentatonic')!;
    const ids = new Set<string>();
    for (let pc = 0; pc < 12; pc++) {
      const set = pcs(pc, minor.intervals);
      assert.equal(set.length, 5);
      ids.add(canonicalPitchSetId(set));
      assert.equal(mod12(pc - 3), mod12(pc + -3));
    }
    assert.equal(ids.size, 12);
    assert.deepEqual(pcs(9, minor.intervals, -3), pcs(6, minor.intervals));
  });

  check('A minor HOME relationships are the supplied pitch-class sets', () => {
    const minor = getPentatonicArchetype('minor_pentatonic')!.intervals;
    const expected: Record<string, number> = { home: 0, major: -3, six_nine_suspended: 2, major_7_colour: 4, suspended: 7 };
    assert.deepEqual(HOME_RELATIONSHIPS.map((item) => item.offset), [0, -3, 2, 4, 7]);
    for (const relationship of HOME_RELATIONSHIPS) {
      assert.deepEqual(pcs(9, minor, relationship.offset), pcs(mod12(9 + expected[relationship.id]!), minor));
    }
    assert.deepEqual(pcs(9, minor, 0), canonicalPitchSet([9, 0, 2, 4, 7]));
    assert.deepEqual(pcs(9, minor, -3), canonicalPitchSet([6, 9, 11, 1, 4]));
    assert.deepEqual(pcs(9, minor, 2), canonicalPitchSet([11, 2, 4, 6, 9]));
    assert.deepEqual(pcs(9, minor, 4), canonicalPitchSet([1, 4, 6, 8, 11]));
    assert.deepEqual(pcs(9, minor, 7), canonicalPitchSet([4, 7, 9, 11, 2]));
  });

  check('spelling follows the reference and canonical identity ignores spelling', () => {
    const minor = getPentatonicArchetype('minor_pentatonic')!;
    assert.deepEqual(spellFromReference('A', minor.intervals, minor.letterSteps), ['A', 'C', 'D', 'E', 'G']);
    assert.deepEqual(spellFromReference('F#', minor.intervals, minor.letterSteps), ['F#', 'A', 'B', 'C#', 'E']);
    assert.deepEqual(spellFromReference('Bb', minor.intervals, minor.letterSteps), ['Bb', 'Db', 'Eb', 'F', 'Ab']);
    assert.equal(canonicalPitchSetId([9, 0, 2, 4, 7]), canonicalPitchSetId([0, 2, 4, 7, 9]));
  });

  check('harmony checksum matches Composer OS computeHarmonyChecksum', () => {
    const bars = ['Am(add9)', 'Am(add9)'];
    assert.equal(pentatonicHarmonyChecksum(bars), computeHarmonyChecksum(bars));
    const chord = readChordEvidence('Am(add9)');
    assert.equal(chord.ok, true);
    if (chord.ok) assert.deepEqual(chord.chord.harmonyPitchClasses, canonicalPitchSet([9, 0, 4, 11]));
  });

  check('equivalent sets collapse and keep both interpretations', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        harmonyBars: ['C'],
        melodyNotes: ['C', 'D', 'E', 'G', 'A'],
        home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
        depth: 'near',
      })
    );
    assert.equal(result.kind, 'analysis');
    const ids = result.recommendations.map((item) => item.canonicalId);
    assert.equal(new Set(ids).size, ids.length);
    const shared = result.recommendations.find((item) => item.canonicalId === canonicalPitchSetId([0, 2, 4, 7, 9]));
    assert.ok(shared);
    const names = [shared!.transposedName, ...shared!.alternativeInterpretations.map((item) => item.transposedName)];
    assert.ok(names.some((name) => name.includes('Major')));
    assert.ok(names.some((name) => name.includes('Minor')));
  });

  check('tonal centre is not treated as HOME', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'A', mode: 'minor' },
        melodyNotes: ['A', 'C', 'D', 'E', 'G'],
        depth: 'near',
      })
    );
    assert.equal(result.diagnostics?.evaluated.home, null);
    assert.equal(result.disposition, 'RECOMMEND');
    assert.equal(result.recommendations[0]?.homeRelationshipId, null);
    assert.match(result.recommendations[0]?.musicalFunction ?? '', /Tonal-centre/);
  });

  check('current collection outside exploration depth is still evaluated', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'C#', 'D', 'D#', 'F'],
        depth: 'near',
        current: { notes: ['C', 'C#', 'D', 'D#', 'F'] },
      })
    );
    assert.equal(result.diagnostics?.currentIncludedOutsideDepth, true);
    assert.equal(result.diagnostics?.currentCollectionKind, 'custom_non_registry');
    assert.equal(result.disposition, 'RETAIN_CURRENT');
    assert.equal(result.retained?.archetypeId, 'unregistered');
    assert.equal(result.retained?.collectionKind, 'custom_non_registry');
    assert.match(result.retained?.transposedName ?? '', /Custom non-registry/);
    assert.ok((result.retention?.currentScore ?? 0) >= 0.62);
  });

  check('protected notes are a hard membership constraint', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'D', 'E'],
        protectedNotes: ['F#'],
        depth: 'near',
      })
    );
    assert.equal(result.disposition, 'NO_FEASIBLE_CANDIDATE');
    assert.equal(result.recommendations.length, 0);
    assert.ok(result.constraintFailures.length > 0);
  });

  check('target notes prefer without excluding', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'D', 'E'],
        targetNotes: ['A'],
        depth: 'home_wheel',
        pinned: [{ notes: ['C', 'D', 'E', 'G', 'Bb'] }, { notes: ['C', 'D', 'E', 'G', 'A'] }],
      })
    );
    assert.equal(result.disposition, 'RECOMMEND');
    assert.equal(result.recommendations[0]?.canonicalId, canonicalPitchSetId([0, 2, 4, 7, 9]));
    const withTarget = result.recommendations[0]!.componentScores.find((item) => item.id === 'target')!.score;
    const other = result.recommendations[1]!.componentScores.find((item) => item.id === 'target')!.score;
    assert.ok(withTarget > other);
  });

  check('caution notes penalise without excluding', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'D', 'E'],
        cautionNotes: ['A'],
        depth: 'home_wheel',
        pinned: [{ notes: ['C', 'D', 'E', 'G', 'A'] }, { notes: ['C', 'D', 'E', 'G', 'Bb'] }],
      })
    );
    assert.equal(result.recommendations[0]?.canonicalId, canonicalPitchSetId([0, 2, 4, 7, 10]));
    const winnerCaution = result.recommendations[0]!.componentScores.find((item) => item.id === 'caution')!.score;
    const loserCaution = result.recommendations[1]!.componentScores.find((item) => item.id === 'caution')!.score;
    assert.ok(winnerCaution > loserCaution);
  });

  check('strict melody rejects chromatic notes and loose mode does not', () => {
    const loose = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'D', 'E', 'F#'],
        depth: 'near',
        strictMelodyMembership: false,
      })
    );
    assert.equal(loose.disposition, 'RECOMMEND');
    assert.equal(loose.recommendations[0]?.canonicalId, canonicalPitchSetId([0, 2, 4, 7, 9]));
    const strict = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'D', 'E', 'F#'],
        depth: 'near',
        strictMelodyMembership: true,
      })
    );
    assert.equal(strict.disposition, 'NO_FEASIBLE_CANDIDATE');
  });

  check('all five dispositions', () => {
    const insufficient = recommendPentatonicsFromRegion(region({ tonalCentre: { root: 'A', mode: 'minor' }, home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' } }));
    assert.equal(insufficient.disposition, 'INSUFFICIENT_CONTEXT');
    assert.equal(insufficient.recommendations.length, 0);

    const infeasible = recommendPentatonicsFromRegion(
      region({ tonalCentre: { root: 'C', mode: 'major' }, melodyNotes: ['C'], protectedNotes: ['C#'], depth: 'near' })
    );
    assert.equal(infeasible.disposition, 'NO_FEASIBLE_CANDIDATE');

    const retain = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'A', mode: 'minor' },
        home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
        current: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
        melodyNotes: ['A', 'C', 'D', 'E', 'G'],
        harmonyBars: ['Am'],
        purpose: 'lyrical_answer',
      })
    );
    assert.equal(retain.disposition, 'RETAIN_CURRENT');
    assert.equal(retain.recommendations.length, 0);
    assert.ok(retain.retained);

    const abstain = recommendPentatonicsFromRegion(
      region({ tonalCentre: { root: 'C', mode: 'major' }, melodyNotes: ['C', 'C#', 'D', 'D#', 'E'], depth: 'near' })
    );
    assert.equal(abstain.disposition, 'NO_PENTATONIC_INTERVENTION');
    assert.equal(abstain.recommendations.length, 0);

    const recommend = recommendPentatonicsFromRegion(lyricalAnswerExampleRegion());
    assert.equal(recommend.disposition, 'RECOMMEND');
    assert.ok(recommend.recommendations.length > 0);
  });

  check('retention margin equality retains and a smaller margin changes', () => {
    const base: PentatonicRegionInput = {
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      current: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      melodyNotes: ['E', 'G', 'A', 'B', 'D'],
      depth: 'home_wheel',
      scoring: { retentionMargin: 0.2, weights: { continuity: 0 } },
    };
    const equal = recommendPentatonicsFromRegion(base);
    assert.equal(equal.disposition, 'RETAIN_CURRENT');
    assert.equal(equal.retained?.collectionKind, 'registry');
    assert.ok((equal.retention?.currentScore ?? 0) >= 0.62);
    assert.equal(equal.retention?.actualImprovement, equal.retention?.requiredImprovementMargin);
    const changes = recommendPentatonicsFromRegion({
      ...base,
      scoring: { retentionMargin: 0.19, weights: { continuity: 0 } },
    });
    assert.equal(changes.disposition, 'RECOMMEND');
    assert.notEqual(changes.recommendations[0]?.canonicalId, equal.retained?.canonicalId);
  });

  check('note-list current that matches the registry stays a registry collection', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'A', mode: 'minor' },
        melodyNotes: ['A', 'C', 'D', 'E', 'G'],
        current: { notes: ['A', 'C', 'D', 'E', 'G'] },
        depth: 'near',
      })
    );
    assert.equal(result.diagnostics?.currentCollectionKind, 'registry');
    assert.equal(result.retained?.collectionKind, 'registry');
    assert.notEqual(result.retained?.archetypeId, 'unregistered');
    assert.ok(result.retained?.archetypeId === 'minor_pentatonic' || result.retained?.archetypeId === 'major_pentatonic');
  });

  check('weak current collection cannot bypass intervention policy', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'C#', 'D', 'D#', 'E'],
        current: { notes: ['F', 'F#', 'G', 'Ab', 'Bb'] },
        depth: 'near',
      })
    );
    assert.equal(result.disposition, 'NO_PENTATONIC_INTERVENTION');
    assert.equal(result.retained, null);
  });

  check('missing, empty, and malformed evidence stay distinct', () => {
    const missing = recommendPentatonicsFromRegion(region({ tonalCentre: { root: 'C', mode: 'major' } }));
    assert.equal(missing.disposition, 'INSUFFICIENT_CONTEXT');
    assert.equal(missing.diagnostics?.evaluated.melody.presence, 'missing');
    assert.equal(missing.diagnostics?.evaluated.harmony.presence, 'empty');
    const empty = recommendPentatonicsFromRegion(
      region({ tonalCentre: { root: 'C', mode: 'major' }, melodyNotes: [], harmonyBars: [], bassNotes: [] })
    );
    assert.equal(empty.disposition, 'INSUFFICIENT_CONTEXT');
    assert.equal(empty.diagnostics?.evaluated.melody.presence, 'empty');
    const malformed = recommendPentatonicsFromRegion(
      region({ tonalCentre: { root: 'C', mode: 'major' }, melodyNotes: ['H'], harmonyBars: ['Am'] })
    );
    assert.equal(malformed.kind, 'validation');
    assert.equal(malformed.disposition, null);
    assert.ok(malformed.validationErrors.length > 0);
  });

  check('ambiguous harmony is not flattened', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'A', mode: 'minor' },
        harmonyBars: ['Am', 'D7'],
        melodyNotes: ['A', 'C', 'E'],
        depth: 'near',
      })
    );
    assert.equal(result.diagnostics?.evaluated.harmony.presence, 'ambiguous');
    assert.deepEqual(result.diagnostics?.evaluated.harmony.pitchClasses, []);
    assert.equal(result.disposition, 'RECOMMEND');
  });

  check('deterministic ranking, explanations, and a three-card cap', () => {
    const input = {
      tonalCentre: { root: 'C', mode: 'major' as const },
      melodyNotes: ['C'],
      depth: 'chromatic' as const,
      scoring: { minimumSuitability: 0 },
    };
    const first = recommendPentatonicsFromRegion(input);
    const second = recommendPentatonicsFromRegion(input);
    assert.deepEqual(first, second);
    assert.equal(first.recommendations.length, 3);
    assert.ok(first.recommendations.every((item) => item.explanation.length > 0));
  });

  check('analysis does not mutate caller inputs', () => {
    const input = lyricalAnswerExampleRegion();
    const context = buildPentatonicMusicContext(input);
    const frozenContext = JSON.stringify(context);
    const frozenRegion = JSON.stringify(input);
    Object.freeze(context);
    Object.freeze(context.harmony);
    Object.freeze(context.key);
    recommendPentatonics(context, { home: input.home, melodyNotes: input.melodyNotes, bassNotes: input.bassNotes, purpose: input.purpose, depth: input.depth });
    assert.equal(JSON.stringify(context), frozenContext);
    assert.equal(JSON.stringify(input), frozenRegion);
  });

  check('headless region and MusicContext calls agree', () => {
    const input = lyricalAnswerExampleRegion();
    const fromRegion = recommendPentatonicsFromRegion(input);
    const fromContext = recommendPentatonics(buildPentatonicMusicContext(input), {
      home: input.home,
      melodyNotes: input.melodyNotes,
      bassNotes: input.bassNotes,
      purpose: input.purpose,
      depth: input.depth,
    });
    assert.deepEqual(fromRegion, fromContext);
    assert.equal(fromRegion.registryVersion, PENTATONIC_REGISTRY_VERSION);
    assert.equal(fromRegion.evaluatorVersion, 'pentatonic-evaluator-1.0');
  });

  check('pinned candidates do not win automatically', () => {
    const result = recommendPentatonicsFromRegion(
      region({
        tonalCentre: { root: 'C', mode: 'major' },
        melodyNotes: ['C', 'D', 'E', 'G', 'A'],
        depth: 'home_wheel',
        pinned: [{ notes: ['C', 'Db', 'D', 'Eb', 'F'] }, { notes: ['C', 'D', 'E', 'G', 'A'] }],
      })
    );
    assert.equal(result.recommendations[0]?.canonicalId, canonicalPitchSetId([0, 2, 4, 7, 9]));
    assert.equal(result.recommendations[0]?.isPinned, true);
  });

  check('candidate generation itself assigns no scores', () => {
    const built = generatePentatonicCandidates({
      depth: 'near',
      tonalCentrePc: 0,
      tonalCentreSpelling: 'C',
      home: null,
      current: null,
      pinned: [],
    });
    assert.equal(built.ok, true);
    if (built.ok) assert.equal(built.candidates.length, 2);
  });

  check('motif seed pitches supply melody only when the melody field is omitted', () => {
    const context: MusicContext = {
      ...buildPentatonicMusicContext(region({ tonalCentre: { root: 'C', mode: 'major' }, harmonyBars: ['C'] })),
      motif: {
        id: 'user',
        intervalPattern: [],
        rhythmPattern: [],
        contourPattern: [],
        seedPitches: [60, 62, 64, 67, 69],
        producer: 'user',
      },
    };
    const used = recommendPentatonics(context, { depth: 'near' });
    assert.equal(used.diagnostics?.evaluated.melody.presence, 'used');
    const blocked = recommendPentatonics(context, { depth: 'near', melodyNotes: [] });
    assert.equal(blocked.diagnostics?.evaluated.melody.presence, 'empty');
    assert.deepEqual(blocked.diagnostics?.evaluated.melody.pitchClasses, []);
    assert.equal(blocked.diagnostics?.evaluated.harmony.presence, 'used');
  });

  return rows;
}

const isDirect = process.argv[1]?.includes('pentatonicEngine.test');
if (isDirect) {
  const rows = runPentatonicEngineTests();
  const failed = rows.filter((row) => !row.ok);
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  if (failed.length > 0) process.exit(1);
}
