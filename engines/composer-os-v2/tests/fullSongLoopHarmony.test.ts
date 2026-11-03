/**
 * Timed full-song loop-harmony contract + validator.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/fullSongLoopHarmony.test.ts
 */
import assert from 'node:assert/strict';
import { parseLeadSheetChordToCanonical } from '../../core/canonicalChord';
import { generateFullSongMusicXml } from '../core/song-mode/generateFullSongMusicXml';
import {
  expandFullSongLoopHarmonyToSongLength,
  lookupFullSongLoopHarmonyAt,
  lookupFullSongLoopHarmonyInputAt,
  songLengthQuartersFromBars,
  stretchLoopHarmonyToLockedBars,
  validateFullSongLoopHarmony,
  type FullSongLoopHarmonyInput,
} from '../core/song-mode/fullSongLoopHarmony';

function chord(sym: string) {
  return parseLeadSheetChordToCanonical(sym);
}

function validLoop(): FullSongLoopHarmonyInput {
  return {
    cycleLengthQuarters: 8,
    meter: { numerator: 4, denominator: 4 },
    events: [
      { kind: 'chord', onsetQuarters: 0, durationQuarters: 2, chord: chord('Dm7') },
      { kind: 'chord', onsetQuarters: 2, durationQuarters: 2, chord: chord('G7/B') },
      { kind: 'rest', onsetQuarters: 4, durationQuarters: 1 },
      { kind: 'chord', onsetQuarters: 5, durationQuarters: 3, chord: chord('Cmaj7') },
    ],
  };
}

function main(): void {
  const ok = validateFullSongLoopHarmony(validLoop());
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.input.events.length, 4);
    const g7 = ok.input.events[1];
    assert.equal(g7?.kind, 'chord');
    if (g7?.kind === 'chord') {
      assert.equal(g7.chord.text.includes('G7'), true);
      assert.equal(g7.chord.bass, 'B');
    }
  }

  assert.equal(validateFullSongLoopHarmony({ ...validLoop(), cycleLengthQuarters: 0 }).ok, false);
  assert.equal(
    validateFullSongLoopHarmony({
      ...validLoop(),
      events: [{ kind: 'chord', onsetQuarters: 0, durationQuarters: 0, chord: chord('C') }],
    }).ok,
    false
  );
  assert.equal(
    validateFullSongLoopHarmony({
      ...validLoop(),
      events: [
        { kind: 'chord', onsetQuarters: 0, durationQuarters: 3, chord: chord('C') },
        { kind: 'chord', onsetQuarters: 2, durationQuarters: 2, chord: chord('G') },
      ],
    }).ok,
    false,
    'overlap'
  );
  assert.equal(
    validateFullSongLoopHarmony({
      ...validLoop(),
      events: [
        { kind: 'chord', onsetQuarters: 0, durationQuarters: 2, chord: chord('C') },
        { kind: 'chord', onsetQuarters: 3, durationQuarters: 5, chord: chord('G') },
      ],
    }).ok,
    false,
    'gap without rest'
  );
  assert.equal(
    validateFullSongLoopHarmony({
      ...validLoop(),
      events: [{ kind: 'chord', onsetQuarters: 0, durationQuarters: 4, chord: chord('C') }],
    }).ok,
    false,
    'incomplete coverage'
  );
  assert.equal(
    validateFullSongLoopHarmony({
      ...validLoop(),
      events: [
        { kind: 'chord', onsetQuarters: 0, durationQuarters: 4, chord: chord('C') },
        { kind: 'chord', onsetQuarters: 4, durationQuarters: 5, chord: chord('G') },
      ],
    }).ok,
    false,
    'exceeds cycle'
  );

  const songLen = songLengthQuartersFromBars({ numerator: 4, denominator: 4 }, 3);
  assert.equal(songLen, 12);
  const expanded = expandFullSongLoopHarmonyToSongLength(validLoop(), songLen);
  assert.ok(expanded.length >= 5);
  const last = expanded[expanded.length - 1]!;
  assert.ok(last.onsetQuarters + last.durationQuarters <= songLen + 1e-9);
  const clipped = expandFullSongLoopHarmonyToSongLength(
    {
      cycleLengthQuarters: 4,
      meter: { numerator: 4, denominator: 4 },
      events: [{ kind: 'chord', onsetQuarters: 0, durationQuarters: 4, chord: chord('Fmaj7') }],
    },
    6
  );
  assert.equal(clipped.length, 2);
  assert.equal(clipped[0]?.durationQuarters, 4);
  assert.equal(clipped[1]?.onsetQuarters, 4);
  assert.equal(clipped[1]?.durationQuarters, 2);

  assert.throws(
    () =>
      generateFullSongMusicXml(334032, 8, {
        primarySongwriterStyle: 'beatles',
        loopHarmony: { ...validLoop(), cycleLengthQuarters: -1 },
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /invalid loopHarmony/);
      return true;
    }
  );

  // Mixed-duration fixture: mid-bar change, cross-bar hold, rest, cycle wrap, clipped end.
  // 3/4 → 3 quarters/bar; cycle = 6 (2 bars); song = 10 quarters (clip mid third cycle region).
  const mixed: FullSongLoopHarmonyInput = {
    cycleLengthQuarters: 6,
    meter: { numerator: 3, denominator: 4 },
    events: [
      { kind: 'chord', onsetQuarters: 0, durationQuarters: 1.5, chord: chord('Am7') },
      { kind: 'chord', onsetQuarters: 1.5, durationQuarters: 2.5, chord: chord('D7/F#') },
      { kind: 'rest', onsetQuarters: 4, durationQuarters: 1 },
      { kind: 'chord', onsetQuarters: 5, durationQuarters: 1, chord: chord('Gmaj7') },
    ],
  };
  assert.equal(validateFullSongLoopHarmony(mixed).ok, true);
  const mixedSongLen = 10;
  const mixedTimeline = expandFullSongLoopHarmonyToSongLength(mixed, mixedSongLen);
  assert.equal(songLengthQuartersFromBars(mixed.meter, 4), 12);
  // Clipped second-cycle D7/F# ends at song boundary (no rest/Gmaj7 past 10).
  const clippedHold = mixedTimeline.find(
    (e) => e.kind === 'chord' && e.onsetQuarters === 7.5 && e.kind === 'chord'
  );
  assert.ok(clippedHold && clippedHold.kind === 'chord');
  if (clippedHold?.kind === 'chord') {
    assert.equal(clippedHold.chord.bass, 'F#');
    assert.equal(clippedHold.durationQuarters, 2.5);
  }
  assert.equal(
    mixedTimeline.some((e) => e.onsetQuarters >= 10 - 1e-9),
    false
  );

  const midBar = lookupFullSongLoopHarmonyAt(mixedTimeline, 1.5, mixedSongLen);
  assert.equal(midBar.ok, true);
  if (midBar.ok) {
    assert.equal(midBar.hit.event.kind, 'chord');
    if (midBar.hit.event.kind === 'chord') {
      assert.equal(midBar.hit.event.chord.bass, 'F#');
      assert.match(midBar.hit.event.chord.text, /D7/);
    }
    assert.equal(midBar.hit.nextBoundaryQuarters, 4);
  }

  const beforeBoundary = lookupFullSongLoopHarmonyAt(mixedTimeline, 1.499, mixedSongLen);
  assert.equal(beforeBoundary.ok, true);
  if (beforeBoundary.ok) {
    assert.equal(beforeBoundary.hit.event.kind, 'chord');
    if (beforeBoundary.hit.event.kind === 'chord') {
      assert.match(beforeBoundary.hit.event.chord.text, /Am7/);
    }
    assert.equal(beforeBoundary.hit.nextBoundaryQuarters, 1.5);
  }

  const crossBar = lookupFullSongLoopHarmonyAt(mixedTimeline, 3, mixedSongLen);
  assert.equal(crossBar.ok, true);
  if (crossBar.ok) {
    assert.equal(crossBar.hit.event.kind, 'chord');
    if (crossBar.hit.event.kind === 'chord') {
      assert.equal(crossBar.hit.event.chord.bass, 'F#');
    }
  }

  const restHit = lookupFullSongLoopHarmonyAt(mixedTimeline, 4, mixedSongLen);
  assert.equal(restHit.ok, true);
  if (restHit.ok) {
    assert.equal(restHit.hit.event.kind, 'rest');
    assert.equal(restHit.hit.nextBoundaryQuarters, 5);
  }

  const cycleWrap = lookupFullSongLoopHarmonyInputAt(mixed, 6, mixedSongLen);
  assert.equal(cycleWrap.ok, true);
  if (cycleWrap.ok) {
    assert.equal(cycleWrap.hit.event.kind, 'chord');
    if (cycleWrap.hit.event.kind === 'chord') {
      assert.match(cycleWrap.hit.event.chord.text, /Am7/);
    }
    assert.equal(cycleWrap.hit.nextBoundaryQuarters, 7.5);
  }

  const nearClip = lookupFullSongLoopHarmonyAt(mixedTimeline, 9.5, mixedSongLen);
  assert.equal(nearClip.ok, true);
  if (nearClip.ok) {
    assert.equal(nearClip.hit.event.kind, 'chord');
    if (nearClip.hit.event.kind === 'chord') {
      assert.equal(nearClip.hit.event.chord.bass, 'F#');
    }
    assert.equal(nearClip.hit.nextBoundaryQuarters, 10);
  }

  assert.equal(lookupFullSongLoopHarmonyAt(mixedTimeline, 10, mixedSongLen).ok, false);

  // --- stretchLoopHarmonyToLockedBars (pure; no generation/UI) ---
  const halfBarCFs: FullSongLoopHarmonyInput = {
    cycleLengthQuarters: 4,
    meter: { numerator: 4, denominator: 4 },
    events: [
      { kind: 'chord', onsetQuarters: 0, durationQuarters: 2, chord: chord('Cmaj7') },
      { kind: 'chord', onsetQuarters: 2, durationQuarters: 2, chord: chord('F#7') },
    ],
  };
  const stretchHalf = stretchLoopHarmonyToLockedBars(halfBarCFs);
  assert.equal(stretchHalf.ok, true);
  if (stretchHalf.ok) {
    assert.equal(stretchHalf.factor, 2);
    assert.deepEqual(stretchHalf.barSymbols, ['Cmaj7', 'F#7']);
    assert.equal(stretchHalf.stretchedCycleLengthQuarters, 8);
  }
  // Input untouched
  assert.equal(halfBarCFs.cycleLengthQuarters, 4);
  assert.equal(halfBarCFs.events[0]?.durationQuarters, 2);

  const alreadyAligned: FullSongLoopHarmonyInput = {
    cycleLengthQuarters: 8,
    meter: { numerator: 4, denominator: 4 },
    events: [
      { kind: 'chord', onsetQuarters: 0, durationQuarters: 4, chord: chord('Dm7') },
      { kind: 'chord', onsetQuarters: 4, durationQuarters: 4, chord: chord('G7/B') },
    ],
  };
  const stretch1 = stretchLoopHarmonyToLockedBars(alreadyAligned);
  assert.equal(stretch1.ok, true);
  if (stretch1.ok) {
    assert.equal(stretch1.factor, 1);
    assert.deepEqual(stretch1.barSymbols, ['Dm7', 'G7/B']);
    assert.equal(alreadyAligned.events[1]?.kind, 'chord');
    if (alreadyAligned.events[1]?.kind === 'chord') {
      assert.equal(alreadyAligned.events[1].chord.bass, 'B');
    }
  }

  const quarters: FullSongLoopHarmonyInput = {
    cycleLengthQuarters: 4,
    meter: { numerator: 4, denominator: 4 },
    events: [
      { kind: 'chord', onsetQuarters: 0, durationQuarters: 1, chord: chord('C') },
      { kind: 'chord', onsetQuarters: 1, durationQuarters: 1, chord: chord('G') },
      { kind: 'chord', onsetQuarters: 2, durationQuarters: 1, chord: chord('Am') },
      { kind: 'chord', onsetQuarters: 3, durationQuarters: 1, chord: chord('F') },
    ],
  };
  const stretch4 = stretchLoopHarmonyToLockedBars(quarters);
  assert.equal(stretch4.ok, true);
  if (stretch4.ok) {
    assert.equal(stretch4.factor, 4);
    assert.deepEqual(stretch4.barSymbols, ['C', 'G', 'Am', 'F']);
  }

  assert.equal(stretchLoopHarmonyToLockedBars(validLoop()).ok, false, 'rests rejected');
  assert.equal(
    stretchLoopHarmonyToLockedBars({
      ...halfBarCFs,
      meter: { numerator: 3, denominator: 4 },
    }).ok,
    false,
    'non-4/4 rejected'
  );
  assert.equal(
    stretchLoopHarmonyToLockedBars({
      cycleLengthQuarters: 3,
      meter: { numerator: 4, denominator: 4 },
      events: [
        { kind: 'chord', onsetQuarters: 0, durationQuarters: 1.5, chord: chord('C') },
        { kind: 'chord', onsetQuarters: 1.5, durationQuarters: 1.5, chord: chord('G') },
      ],
    }).ok,
    false,
    'no valid factor'
  );

  console.log('fullSongLoopHarmony PASS contract+validator+refuse+lookup+stretch');
}

main();
