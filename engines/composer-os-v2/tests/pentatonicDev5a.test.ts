/**
 * Pentatonic Engine Dev 5A — vocabulary and colour intelligence.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev5a.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { generatePentatonicCandidates } from '../core/pentatonic/candidates';
import {
  evaluatePentatonicColour,
  evaluatePentatonicColourFromContext,
  COLOUR_VOCABULARY_ENTERS_PATH,
} from '../core/pentatonic/colourEvaluate';
import { listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from '../core/pentatonic/colourRegistry';
import type { ColourBand, HomeDistanceBand, PentatonicColourFunction } from '../core/pentatonic/colourTypes';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { orbitAPassage } from '../core/pentatonic/orbitPassages';
import { canonicalPitchSet, canonicalPitchSetId, mod12 } from '../core/pentatonic/pitch';
import { buildPentatonicMusicContext } from '../core/pentatonic/recommend';
import { recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import { getPentatonicArchetype, listPentatonicArchetypes, PENTATONIC_REGISTRY_VERSION } from '../core/pentatonic/registry';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const ORBIT = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/05-Orbit-Duo-Leadsheet-V2.1.musicxml';
const ORBIT_SHA = '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db';
const BANDS: ColourBand[] = ['low', 'moderate', 'high'];
const DISTANCES: HomeDistanceBand[] = ['near', 'moderate', 'far'];
const COLOURS: PentatonicColourFunction[] = [
  'HOME',
  'INSIDE',
  'CONTINUITY',
  'BRIGHT_COLOUR',
  'DARK_COLOUR',
  'SUSPENDED',
  'AMBIGUOUS',
  'EDGE',
  'OUTSIDE',
  'REMOTE',
  'RESOLUTION',
];

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function intervalVector(intervals: readonly number[]): string {
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const raw = Math.abs(intervals[i]! - intervals[j]!);
      const ic = Math.min(raw, 12 - raw);
      if (ic >= 1 && ic <= 6) counts[ic - 1] += 1;
    }
  }
  return counts.join('');
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

  check('colour registry is a restrained five-note vocabulary', () => {
    const resources = listPentatonicColourResources();
    assert.equal(PENTATONIC_COLOUR_REGISTRY_VERSION, 'pentatonic-colour-registry-5a');
    assert.ok(resources.length >= 15 && resources.length <= 25, `size ${resources.length}`);
    const ids = new Set<string>();
    const tuples = new Set<string>();
    for (const resource of resources) {
      assert.equal(ids.has(resource.id), false, resource.id);
      ids.add(resource.id);
      assert.equal(new Set(resource.intervals).size, 5, resource.id);
      assert.equal(resource.intervals[0], 0, resource.id);
      assert.deepEqual([...resource.intervals].sort((a, b) => a - b), [...resource.intervals], resource.id);
      for (const interval of resource.intervals) assert.ok(interval >= 0 && interval < 12);
      const tuple = resource.intervals.join(',');
      assert.equal(tuples.has(tuple), false, tuple);
      tuples.add(tuple);
      assert.ok(resource.role.length > 20, resource.id);
      assert.ok(BANDS.includes(resource.metadata.brightness));
      assert.ok(BANDS.includes(resource.metadata.darkness));
      assert.ok(BANDS.includes(resource.metadata.stability));
      assert.ok(BANDS.includes(resource.metadata.ambiguity));
      assert.ok(BANDS.includes(resource.metadata.openness));
      assert.ok(BANDS.includes(resource.metadata.tension));
      assert.ok(BANDS.includes(resource.metadata.chromaticEdge));
      assert.ok(DISTANCES.includes(resource.metadata.distanceFromHome));
      assert.ok(BANDS.includes(resource.metadata.commonTonePotential));
      assert.ok(BANDS.includes(resource.metadata.suitabilityRetention));
      assert.ok(BANDS.includes(resource.metadata.suitabilityDeparture));
      assert.ok(BANDS.includes(resource.metadata.suitabilityResolution));
      assert.ok(COLOURS.includes(resource.metadata.primaryColour));
      for (const colour of resource.metadata.alsoServes) assert.ok(COLOURS.includes(colour));
      for (const interval of resource.metadata.characteristicIntervals) {
        assert.ok(resource.intervals.includes(interval), `${resource.id} characteristic ${interval}`);
      }
      assert.ok(resource.metadata.characteristicIntervals.length >= 2, resource.id);
    }
    const sameRole = new Map<string, string[]>();
    for (const resource of resources) {
      const key = `${intervalVector(resource.intervals)}|${resource.metadata.primaryColour}|${resource.metadata.characteristicIntervals.join(',')}`;
      const list = sameRole.get(key) ?? [];
      list.push(resource.id);
      sameRole.set(key, list);
    }
    const redundant = [...sameRole.values()].filter((list) => list.length > 1);
    assert.deepEqual(redundant, []);
  });

  check('major and minor pentatonic stay compatible with the path registry', () => {
    assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
    assert.deepEqual(listPentatonicArchetypes().map((item) => item.id), ['major_pentatonic', 'minor_pentatonic']);
    assert.equal(COLOUR_VOCABULARY_ENTERS_PATH, false);
    for (const id of ['major_pentatonic', 'minor_pentatonic'] as const) {
      const path = getPentatonicArchetype(id)!;
      const colour = listPentatonicColourResources().find((item) => item.id === id)!;
      assert.deepEqual(colour.intervals, path.intervals);
      assert.deepEqual(colour.letterSteps, path.letterSteps);
      assert.equal(colour.pathArchetypeId, id);
    }
  });

  check('HOME is a collection and centre is not HOME', () => {
    const context = buildPentatonicMusicContext({
      tonalCentre: { root: 'C', mode: 'major' },
      harmonyBars: ['Cmaj7', 'Am7'],
    });
    const withoutHome = evaluatePentatonicColourFromContext(context, {
      melodyNotes: ['C', 'D', 'E', 'G', 'A'],
    });
    assert.equal(withoutHome.centreNote, 'C');
    assert.equal(withoutHome.homeResourceId, null);
    assert.equal(withoutHome.disposition, 'SELECT');
    assert.equal(withoutHome.selected?.resourceId, 'major_pentatonic');
    assert.notEqual(withoutHome.selected?.colour, 'HOME');
    assert.ok(withoutHome.harmonySymbolsIgnored.length > 0);
    assert.match(withoutHome.explanation, /not HOME/);
    assert.equal(withoutHome.explanation.includes('voice-leading'), false);

    const withHome = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'minor_pentatonic', referenceNote: 'A' },
      melodyNotes: ['A', 'C', 'D', 'E', 'G'],
      bassNotes: ['A'],
    });
    assert.equal(withHome.centreNote, 'C');
    assert.equal(withHome.homeResourceId, 'minor_pentatonic');
    assert.equal(withHome.selected?.resourceId, 'minor_pentatonic');
    assert.equal(withHome.selected?.colour, 'HOME');
    assert.equal(parseReferencePc(withHome.selected?.referenceNote), 9);
    assert.notEqual(withHome.selected?.resourceId, 'major_pentatonic');
  });

  check('colour classification distinguishes suspended, edge, and resolution roles', () => {
    const suspended = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'D', 'F', 'G', 'Bb'],
    });
    assert.equal(suspended.selected?.resourceId, 'suspended_pentatonic');
    assert.equal(suspended.selected?.colour, 'SUSPENDED');

    const edge = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'Db', 'F', 'Gb', 'Bb'],
    });
    assert.equal(edge.selected?.resourceId, 'iwato');
    assert.ok(edge.selected?.colour === 'OUTSIDE' || edge.selected?.colour === 'EDGE' || edge.selected?.colour === 'REMOTE');

    const resolution = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'D', 'E', 'G', 'B'],
    });
    assert.equal(resolution.selected?.resourceId, 'leading_major');
    assert.equal(resolution.selected?.colour, 'RESOLUTION');
  });

  check('common-tone continuity prefers a near colour over a remote one', () => {
    const near = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      current: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'D', 'E', 'G', 'Bb'],
      previousPitchClasses: [0, 2, 4, 7, 9],
      nextPitchClasses: [0, 2, 4, 7, 9],
    });
    assert.equal(near.selected?.resourceId, 'mixolydian_pentatonic');
    assert.ok((near.selected?.commonToneContinuity ?? 0) >= 0.8);
    assert.ok((near.selected?.neighbourContinuity ?? 0) >= 0.8);
    assert.notEqual(near.selected?.colour, 'REMOTE');
    const remote = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'Db', 'E', 'Gb', 'Bb'],
    });
    assert.equal(remote.selected?.resourceId, 'remote_altered');
    assert.ok((remote.selected?.commonToneContinuity ?? 1) <= 0.4);
    assert.ok((remote.selected?.changeFriction ?? 0) > 0);
    assert.equal(remote.explanation.includes('voice-leading'), false);
  });

  check('selection stays short and change friction can retain the current colour', () => {
    const clear = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'D', 'E', 'G', 'A'],
    });
    assert.ok(clear.shortlist.length >= 1 && clear.shortlist.length <= 4);
    assert.ok(clear.shortlist.length < listPentatonicColourResources().length);
    const retained = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      current: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'D', 'E', 'G', 'A'],
    });
    assert.equal(retained.disposition, 'RETAIN');
    assert.equal(retained.selected?.resourceId, 'major_pentatonic');
    assert.equal(retained.selected?.changeFriction, 0);
  });

  check('NONE stays first-class when a colour field is not earned', () => {
    const empty = evaluatePentatonicColour({ centreNote: 'F', melodyNotes: [] });
    assert.equal(empty.disposition, 'NONE');
    assert.equal(empty.nonePreferred, true);
    assert.equal(empty.selected, null);
    const single = evaluatePentatonicColour({
      centreNote: 'F',
      home: { resourceId: 'minor_pentatonic', referenceNote: 'F' },
      melodyNotes: ['C'],
    });
    assert.equal(single.disposition, 'NONE');
    assert.equal(single.selected, null);
    const spill = evaluatePentatonicColour({
      centreNote: 'C',
      home: { resourceId: 'major_pentatonic', referenceNote: 'C' },
      melodyNotes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#'],
    });
    assert.equal(spill.disposition, 'NONE');
    assert.equal(spill.nonePreferred, true);
    assert.ok(spill.shortlist.length <= 1);
  });

  check('Orbit bars 1–2 read F minor pentatonic HOME without touching the source', () => {
    const before = sha(ORBIT);
    assert.equal(before, ORBIT_SHA);
    const passage = orbitAPassage();
    const opening = passage.events.slice(0, 2);
    const melody = opening.flatMap((event) => event.melodyNotes ?? []);
    const bass = opening.flatMap((event) => event.bassNotes ?? []);
    const colour = evaluatePentatonicColour({
      centreNote: passage.tonalCentre.root,
      home: passage.home ? { resourceId: passage.home.archetypeId, referenceNote: passage.home.referenceNote } : null,
      melodyNotes: melody,
      bassNotes: bass,
    });
    assert.equal(colour.selected?.resourceId, 'minor_pentatonic');
    assert.equal(colour.selected?.colour, 'HOME');
    assert.equal(colour.centreNote, 'F');
    const path = recommendPentatonicPath(passage);
    assert.equal(path.explanation.split('\n')[0], '1–7  F Minor Pentatonic HOME');
    assert.equal(sha(ORBIT), before);
  });

  check('Dev 4 path pool and Dev 3.7 fingerprint stay frozen', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    const chromatic = generatePentatonicCandidates({
      depth: 'chromatic',
      tonalCentrePc: 0,
      tonalCentreSpelling: 'C',
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      current: null,
      pinned: [],
    });
    assert.equal(chromatic.ok, true);
    if (chromatic.ok) assert.equal(chromatic.candidates.length, 12);
    const near = generatePentatonicCandidates({
      depth: 'near',
      tonalCentrePc: 0,
      tonalCentreSpelling: 'C',
      home: null,
      current: null,
      pinned: [],
    });
    assert.equal(near.ok, true);
    if (near.ok) {
      assert.equal(near.candidates.length, 2);
      assert.deepEqual(
        near.candidates.map((candidate) => canonicalPitchSetId(candidate.canonicalPitchSet)).sort(),
        [canonicalPitchSetId(canonicalPitchSet([0, 2, 4, 7, 9])), canonicalPitchSetId(canonicalPitchSet([0, 3, 5, 7, 10]))].sort()
      );
    }
    assert.equal(mod12(-3), 9);
  });

  return rows;
}

function parseReferencePc(note: string | undefined): number | null {
  if (!note) return null;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const sharp = names.indexOf(note);
  if (sharp >= 0) return sharp;
  const flat = flats.indexOf(note);
  return flat >= 0 ? flat : null;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
