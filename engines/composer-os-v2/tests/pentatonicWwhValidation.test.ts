/**
 * While We're Here — three-score Dev 2 validation.
 * Orbit tests stay in pentatonicPathMusicalQa.test.ts.
 * These checks judge behaviour. They do not name a required pentatonic.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicWwhValidation.test.ts
 */
import assert from 'node:assert/strict';
import { formatPathComparison, recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import type { PentatonicPassage, PentatonicPathResult } from '../core/pentatonic/pathTypes';
import { WWH_VALIDATION_NOTE, impossibleMetaphysicsObjectPassage, impossibleMetaphysicsThemePassage, mirrorDiminishedPassage, mirrorFramePassage } from '../core/pentatonic/wwhValidationPassages';

function chordSymbolChanges(passage: PentatonicPassage): number {
  let count = 0;
  for (let index = 1; index < passage.events.length; index += 1) {
    if (passage.events[index]!.chordSymbol !== passage.events[index - 1]!.chordSymbol) count += 1;
  }
  return count;
}

function sameCollection(result: PentatonicPathResult, fromLabel: string, toLabel: string): boolean {
  const chosen = result.events.filter((event) => {
    const label = Number(event.sourceLabel);
    return label >= Number(fromLabel) && label <= Number(toLabel);
  });
  return chosen.length > 1 && chosen.every((event) => event.chosenId === chosen[0]!.chosenId);
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

  const imObjectPassage = impossibleMetaphysicsObjectPassage();
  const imThemePassage = impossibleMetaphysicsThemePassage();
  const mirrorFrame = mirrorFramePassage();
  const mirrorDim = mirrorDiminishedPassage();
  const imObject = recommendPentatonicPath(imObjectPassage);
  const imTheme = recommendPentatonicPath(imThemePassage);
  const mirrorA = recommendPentatonicPath(mirrorFrame);
  const mirrorB = recommendPentatonicPath(mirrorDim);

  console.log(WWH_VALIDATION_NOTE);
  console.log('\n### IMPOSSIBLE METAPHYSICS 1–16\n');
  console.log(formatPathComparison(imObject));
  console.log('\n### IMPOSSIBLE METAPHYSICS 46–54\n');
  console.log(formatPathComparison(imTheme));
  console.log('\n### THE MIRROR 1–16\n');
  console.log(formatPathComparison(mirrorA));
  console.log('\n### THE MIRROR 46–54\n');
  console.log(formatPathComparison(mirrorB));

  check('fixtures keep source measure labels and the WWH profile', () => {
    assert.match(WWH_VALIDATION_NOTE, /While We're Here/);
    assert.equal(imObjectPassage.evidenceProfile, 'wwh-duo-1.0');
    assert.equal(mirrorFrame.evidenceProfile, 'wwh-duo-1.0');
    assert.deepEqual(imObjectPassage.events.map((event) => event.sourceLabel), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']);
    assert.deepEqual(imThemePassage.events.map((event) => event.sourceLabel), ['46', '47', '48', '49', '50', '51', '52', '53', '54']);
    assert.equal(imThemePassage.events[1]?.melodyRest, true);
    assert.equal(imThemePassage.events[1]?.bassRest, true);
    assert.equal(mirrorFrame.events[0]?.sourceLabel, '1');
    assert.equal(mirrorFrame.events[15]?.sourceLabel, '16');
    assert.equal(mirrorDim.events[0]?.chordSymbol, 'E°');
    assert.equal(mirrorDim.events[5]?.sourceLabel, '51');
  });

  check('Impossible Metaphysics opening holds one field across chord changes', () => {
    assert.equal(imObject.kind, 'analysis');
    assert.equal(imObject.disposition, 'PATH');
    assert.ok(imObject.switchCount < chordSymbolChanges(imObjectPassage), `switches ${imObject.switchCount}`);
    assert.ok(imObject.switchCount <= 2, `switches ${imObject.switchCount}`);
    assert.ok(imObject.distinctResources <= 3, `resources ${imObject.distinctResources}`);
    assert.ok(imObject.segments.some((segment) => segment.eventIds.length >= 8));
    assert.equal(sameCollection(imObject, '1', '12'), true);
    assert.equal(imObject.events[11]?.chosenId, imObject.events[10]?.chosenId);
  });

  check('Impossible Metaphysics theme keeps silence, absorbs the dim colour, and can still move', () => {
    assert.equal(imTheme.disposition, 'PATH');
    assert.equal(imTheme.events[1]?.chosenId, imTheme.events[0]?.chosenId);
    assert.equal(imTheme.events[3]?.chosenId, imTheme.events[2]?.chosenId);
    assert.ok(imTheme.switchCount <= 3, `switches ${imTheme.switchCount}`);
    assert.ok(imTheme.distinctResources <= 4, `resources ${imTheme.distinctResources}`);
    assert.ok(imTheme.switchCount >= 1);
    const changes = imTheme.events.filter((event) => event.changeFlag === 'changed');
    assert.ok(changes.every((event) => (event.pitchClassTransition?.retainedPitchClasses.length ?? 0) >= 1));
  });

  check('The Mirror repeats its two phrase fields and keeps common tones when it moves', () => {
    assert.equal(mirrorA.disposition, 'PATH');
    assert.equal(sameCollection(mirrorA, '1', '4'), true);
    assert.equal(sameCollection(mirrorA, '5', '8'), true);
    assert.equal(sameCollection(mirrorA, '9', '12'), true);
    assert.equal(sameCollection(mirrorA, '13', '16'), true);
    assert.equal(mirrorA.events[0]?.chosenId, mirrorA.events[8]?.chosenId);
    assert.equal(mirrorA.events[4]?.chosenId, mirrorA.events[12]?.chosenId);
    assert.ok(mirrorA.distinctResources <= 3, `resources ${mirrorA.distinctResources}`);
    assert.ok(mirrorA.switchCount <= 4, `switches ${mirrorA.switchCount}`);
    const changes = mirrorA.events.filter((event) => event.changeFlag === 'changed');
    assert.ok(changes.every((event) => (event.pitchClassTransition?.retainedPitchClasses.length ?? 0) >= 2));
  });

  check('The Mirror diminished colour is one field, then the dissolved return holds', () => {
    assert.equal(mirrorB.disposition, 'PATH');
    assert.equal(sameCollection(mirrorB, '46', '50'), true);
    assert.equal(sameCollection(mirrorB, '51', '54'), true);
    assert.ok(mirrorB.switchCount <= 2, `switches ${mirrorB.switchCount}`);
    assert.ok(mirrorB.distinctResources <= 3, `resources ${mirrorB.distinctResources}`);
    assert.ok(mirrorB.switchCount < chordSymbolChanges(mirrorDim));
  });

  check('the four WWH passages are deterministic', () => {
    const again = [
      recommendPentatonicPath(imObjectPassage),
      recommendPentatonicPath(imThemePassage),
      recommendPentatonicPath(mirrorFrame),
      recommendPentatonicPath(mirrorDim),
    ];
    assert.deepEqual(again.map((result) => result.events.map((event) => event.chosenId)), [imObject, imTheme, mirrorA, mirrorB].map((result) => result.events.map((event) => event.chosenId)));
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
