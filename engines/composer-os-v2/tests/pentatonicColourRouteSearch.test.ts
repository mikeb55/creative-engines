/**
 * Phase 2B.2 — variable-route colour search.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicColourRouteSearch.test.ts
 */
import assert from 'node:assert/strict';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import {
  COLOUR_ROUTE_PLATEAU_NOTE,
  colourInstance,
  colourMoveAllowed,
  colourPathCatalog,
  colourRoutePhraseTarget,
  planColourRoute,
} from '../core/pentatonic/colourPath';
import { importPentatonicScoreFromMusicXml } from '../core/pentatonic/musicXmlScore';
import { collectionPitchClasses, mapMotifPitches, type RhythmSlot } from '../core/pentatonic/motifTransform';
import { exportGuitarMusicXml } from '../core/pentatonic/practiceFacade';
import { recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import { spellFromReference } from '../core/pentatonic/pitch';
import { mod12 } from '../core/pentatonic/pitch';
import type { BaseMotif } from '../core/motif/motifTypes';

const centres = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const resources = listPentatonicColourResources();
const catalog = colourPathCatalog();
const catalogIds = new Set(catalog.map((instance) => instance.id));
assert.equal(catalog.length, 240);
assert.match(COLOUR_ROUTE_PLATEAU_NOTE, /0\.225/);
assert.match(COLOUR_ROUTE_PLATEAU_NOTE, /0\.45/);

const missing = planColourRoute({ resourceId: 'not_a_colour', centre: 'C' });
assert.equal(missing.ok, false);

const tooShort = planColourRoute({ resourceId: 'hirajoshi', centre: 'C', minSteps: 2, maxSteps: 2, ending: 'return' });
assert.equal(tooShort.ok, false);
if (!tooShort.ok) assert.match(tooShort.error, /at least 3/);

function assertLegal(result: ReturnType<typeof planColourRoute>, ending: 'return' | 'open'): void {
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const home = result.route.steps[0]!.instance;
  assert.ok(result.route.steps.length >= result.minSteps && result.route.steps.length <= result.maxSteps);
  assert.ok(result.route.steps.some((step) => step.instance.id !== home.id));
  if (ending === 'return') assert.equal(result.route.steps[result.route.steps.length - 1]!.instance.id, home.id);
  for (const route of [result.route, ...result.alternatives]) {
    assert.equal(route.id, route.steps.map((step) => step.instance.id).join('>'));
    for (const step of route.steps) {
      assert.equal(catalogIds.has(step.instance.id), true);
      const resource = resources.find((item) => item.id === step.instance.resourceId);
      assert.ok(resource);
      assert.deepEqual(
        step.instance.spelling,
        spellFromReference(step.instance.centre, resource!.intervals, resource!.letterSteps)
      );
    }
    for (let index = 1; index < route.steps.length; index += 1) {
      const previous = route.steps[index - 1]!.instance;
      const current = route.steps[index]!.instance;
      assert.equal(colourMoveAllowed(previous, current), true);
      if (previous.id !== current.id) assert.notEqual(previous.canonicalId, current.canonicalId);
      const repeated = previous.id === current.id;
      if (repeated && index >= 2) assert.notEqual(route.steps[index - 2]!.instance.id, current.id);
    }
    const scores = route.steps.filter((step) => step.changeFlag === 'changed').map((step) => step.transitionCost);
    const mean = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 1_000_000) / 1_000_000;
    assert.equal(route.totalCost, mean);
  }
  const ids = new Set([result.route.id, ...result.alternatives.map((route) => route.id)]);
  assert.equal(ids.size, 1 + result.alternatives.length);
}

const length3 = planColourRoute({ resourceId: 'hirajoshi', centre: 'F#', seed: 1, minSteps: 3, maxSteps: 3, ending: 'return' });
assertLegal(length3, 'return');
if (length3.ok) assert.equal(length3.route.steps.length, 3);

const length5 = planColourRoute({ resourceId: 'hirajoshi', centre: 'F#', seed: 1, minSteps: 5, maxSteps: 5, ending: 'return' });
assertLegal(length5, 'return');
if (length5.ok) {
  assert.equal(length5.route.steps.length, 5);
  assert.equal(length5.route.steps[4]!.instance.id, length5.route.steps[0]!.instance.id);
  assert.ok(length5.search.completesWithRetention > 0, 'retention was never a searched complete walk');
  assert.ok(length5.search.completesWithoutRetention > 0, 'every complete walk retained a collection');
  assert.ok(length5.search.prunedRetentionPad > 0);
  assert.ok(length5.search.prunedBeam > 0);
  assert.ok(length5.search.expanded > 240);
  assert.ok(length5.search.rejected);
  assert.ok(length5.search.winnerFormula.includes('mean'));
  const again = planColourRoute({ resourceId: 'hirajoshi', centre: 'F#', seed: 1, minSteps: 5, maxSteps: 5, ending: 'return' });
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.route.id, length5.route.id);
  const other = planColourRoute({ resourceId: 'hirajoshi', centre: 'F#', seed: 2, minSteps: 5, maxSteps: 5, ending: 'return' });
  assert.equal(other.ok, true);
  if (other.ok) assert.equal(other.route.totalCost, length5.route.totalCost);
}

const open = planColourRoute({ resourceId: 'kumoi', centre: 'Eb', seed: 4, minSteps: 2, maxSteps: 2, ending: 'open' });
assertLegal(open, 'open');
if (open.ok) {
  assert.equal(open.route.steps.length, 2);
  assert.notEqual(open.route.steps[1]!.instance.id, open.route.steps[0]!.instance.id);
}

const homeOnly = planColourRoute({
  resourceId: 'major_pentatonic',
  centre: 'C',
  minSteps: 3,
  maxSteps: 3,
  ending: 'return',
  requireDeparture: true,
});
assert.equal(homeOnly.ok, true);
if (homeOnly.ok) {
  const ids = homeOnly.route.steps.map((step) => step.instance.id);
  assert.notDeepEqual(ids, [ids[0], ids[0], ids[0]]);
}

const majorPassage = {
  tonalCentre: { root: 'C', mode: 'major' as const },
  home: { archetypeId: 'major_pentatonic', referenceNote: 'C' },
  events: [
    { id: 'a', sourceLabel: '1', melodyNotes: ['C', 'D', 'E'] },
    { id: 'b', sourceLabel: '2', melodyNotes: ['G', 'A', 'C'] },
  ],
};
assert.equal(recommendPentatonicPath(majorPassage).disposition, 'PATH');

if (length3.ok) {
  const target = colourRoutePhraseTarget(length3.route);
  assert.notEqual(target.id, length3.route.steps[0]!.instance.id);
  const source = length3.route.steps[0]!.instance;
  const sourceView = {
    name: `${source.centre} ${source.displayName}`,
    archetypeId: source.resourceId,
    referenceNote: source.centre,
    homeRelationshipLabel: null,
  };
  const targetView = {
    name: `${target.centre} ${target.displayName}`,
    archetypeId: target.resourceId,
    referenceNote: target.centre,
    homeRelationshipLabel: null,
  };
  const classes = collectionPitchClasses(sourceView);
  const motif: BaseMotif = {
    id: 'search-cell',
    barCount: 1,
    notes: [0, 2, 4].map((degree, index) => ({ pitch: 60 + classes[degree]!, startBeat: index, duration: 0.5 })),
  };
  const rhythm: RhythmSlot[] = [
    { kind: 'note', startBeat: 0, duration: 0.5 },
    { kind: 'rest', startBeat: 0.5, duration: 0.5 },
    { kind: 'note', startBeat: 1, duration: 0.5 },
    { kind: 'note', startBeat: 1.5, duration: 0.5 },
  ];
  const mapped = mapMotifPitches({
    motif,
    rhythm,
    source: sourceView,
    target: targetView,
    method: 'M-DEG',
    meter: { beats: 4, beatType: 4 },
  });
  const targetClasses = new Set(collectionPitchClasses(targetView));
  for (const note of mapped.notes) assert.equal(targetClasses.has(mod12(note.pitch)), true);
  const xml = exportGuitarMusicXml({
    title: 'Colour route search',
    chord: 'N.C.',
    bars: [mapped.notes.map((note) => note.pitch)],
    timed: [[
      ...mapped.notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration, pitch: note.pitch })),
      { kind: 'rest' as const, startBeat: 2, duration: 2 },
    ]],
    beats: 4,
    beatType: 4,
  });
  const imported = importPentatonicScoreFromMusicXml(xml);
  const midis = (imported.events[0]?.registerAttacks ?? []).filter((attack) => attack.role === 'melody').map((attack) => attack.midi);
  assert.deepEqual(midis, mapped.notes.map((note) => note.pitch));
}

interface ModeStats {
  failures: string[];
  lengths: Record<string, number>;
  changes: number[];
  retentions: number[];
  endpointsHome: number;
  endpointsAway: number;
  costs: number[];
  tieWalks: number[];
  candidateSequences: number;
  orderOnlyPairs: number;
  constraintViolations: number;
  expanded: number;
  prunedBeam: number;
  prunedPad: number;
  prunedSameSounding: number;
  withRetention: number;
  withoutRetention: number;
  ms: number;
}

function audit(ending: 'return' | 'open', minSteps: number, maxSteps: number): ModeStats {
  const stats: ModeStats = {
    failures: [],
    lengths: {},
    changes: [],
    retentions: [],
    endpointsHome: 0,
    endpointsAway: 0,
    costs: [],
    tieWalks: [],
    candidateSequences: 0,
    orderOnlyPairs: 0,
    constraintViolations: 0,
    expanded: 0,
    prunedBeam: 0,
    prunedPad: 0,
    prunedSameSounding: 0,
    withRetention: 0,
    withoutRetention: 0,
    ms: 0,
  };
  const started = Date.now();
  for (const resource of resources) {
    for (const centre of centres) {
      const planned = planColourRoute({ resourceId: resource.id, centre, seed: 1, minSteps, maxSteps, ending });
      if (!planned.ok) {
        stats.failures.push(`${resource.id} ${centre}: ${planned.error}`);
        continue;
      }
      stats.expanded += planned.search.expanded;
      stats.prunedBeam += planned.search.prunedBeam;
      stats.prunedPad += planned.search.prunedRetentionPad;
      stats.prunedSameSounding += planned.search.prunedSameSoundingSet;
      stats.withRetention += planned.search.completesWithRetention;
      stats.withoutRetention += planned.search.completesWithoutRetention;
      stats.tieWalks.push(planned.search.tiedWithWinner);
      const bundle = [planned.route, ...planned.alternatives];
      stats.candidateSequences += new Set(bundle.map((route) => route.id)).size;
      const home = planned.route.steps[0]!.instance.id;
      const last = planned.route.steps[planned.route.steps.length - 1]!.instance.id;
      if (last === home) stats.endpointsHome += 1;
      else stats.endpointsAway += 1;
      if (ending === 'return' && last !== home) stats.constraintViolations += 1;
      if (!planned.route.steps.some((step) => step.instance.id !== home)) stats.constraintViolations += 1;
      for (const step of planned.route.steps) {
        if (!catalogIds.has(step.instance.id)) stats.constraintViolations += 1;
        const built = colourInstance(step.instance.resourceId, step.instance.centre);
        if ('error' in built || built.spelling.join(' ') !== step.instance.spelling.join(' ')) stats.constraintViolations += 1;
      }
      stats.lengths[String(planned.route.steps.length)] = (stats.lengths[String(planned.route.steps.length)] ?? 0) + 1;
      stats.changes.push(planned.route.switchCount);
      stats.retentions.push(planned.route.steps.filter((step) => step.changeFlag === 'retained').length);
      stats.costs.push(planned.route.totalCost);
      const canonicalKey = (route: (typeof bundle)[number]) => route.steps.map((step) => step.instance.canonicalId).slice().sort().join('|');
      for (let left = 0; left < bundle.length; left += 1) {
        for (let right = left + 1; right < bundle.length; right += 1) {
          if (bundle[left]!.id === bundle[right]!.id) continue;
          if (canonicalKey(bundle[left]!) === canonicalKey(bundle[right]!)) stats.orderOnlyPairs += 1;
        }
      }
    }
  }
  stats.ms = Date.now() - started;
  return stats;
}

const returned = audit('return', 3, 6);
const opened = audit('open', 2, 5);
assert.equal(returned.failures.length, 0, returned.failures.slice(0, 3).join('; '));
assert.equal(opened.failures.length, 0, opened.failures.slice(0, 3).join('; '));
assert.equal(returned.constraintViolations, 0);
assert.equal(opened.constraintViolations, 0);
assert.equal(returned.endpointsAway, 0);
assert.ok(opened.endpointsAway > 0, 'open search never left home');
assert.ok(returned.withRetention > 0);
assert.ok(returned.withoutRetention > 0);
assert.ok(Object.keys(returned.lengths).length >= 1);

function spread(values: number[]): { min: number; max: number; unique: number } {
  const unique = new Set(values.map((value) => value.toFixed(6)));
  return { min: Math.min(...values), max: Math.max(...values), unique: unique.size };
}

const report = {
  return: {
    ...returned,
    changes: spread(returned.changes),
    retentions: spread(returned.retentions),
    costs: spread(returned.costs),
    tieWalks: spread(returned.tieWalks),
  },
  open: {
    ...opened,
    changes: spread(opened.changes),
    retentions: spread(opened.retentions),
    costs: spread(opened.costs),
    tieWalks: spread(opened.tieWalks),
  },
};
console.log(`pentatonicColourRouteSearch: PASS`);
console.log(JSON.stringify(report));
