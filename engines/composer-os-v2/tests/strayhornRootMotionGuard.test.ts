/**
 * Smoke — Billy Strayhorn root-motion guard and source progression corpus.
 *
 * Asserts that no functional minor7 -> dominant7 -> major ascending-fourth
 * cycle survives the guard, that the guard respects protected bars, and that
 * every corpus row is clean.
 */

import {
  applyStrayhornRootMotionGuard,
  findRootMotionViolations,
  isForbiddenCycle,
  isDominantFamily,
  isMajorFamily,
  isMinorSeventhFamily,
} from '../core/song-mode/strayhornRootMotionGuard';
import {
  STRAYHORN_PROGRESSION_CORPUS,
  pickStrayhornRow,
  strayhornMotionSet,
  strayhornRowsForFingerprint,
} from '../core/song-mode/strayhornProgressionCorpus';

export function runStrayhornRootMotionGuardTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  /* Family classifiers. */
  out.push({
    ok:
      isMinorSeventhFamily('Dm7') &&
      isMinorSeventhFamily('Dm9') &&
      isMinorSeventhFamily('Dm7(11)') &&
      !isMinorSeventhFamily('Dm6(9)') &&
      !isMinorSeventhFamily('Dmmaj7') &&
      !isMinorSeventhFamily('Dm7(b5)') &&
      !isMinorSeventhFamily('Dmaj7'),
    name: 'Guard: minor-seventh family excludes m6/9, m-maj7, half-diminished',
  });

  out.push({
    ok:
      isDominantFamily('G7') &&
      isDominantFamily('G13(b9)') &&
      isDominantFamily('G9(13)') &&
      !isDominantFamily('Gmaj7') &&
      !isDominantFamily('Gm7') &&
      !isDominantFamily('Gdim7'),
    name: 'Guard: dominant family excludes maj7, minor and diminished',
  });

  out.push({
    ok:
      isMajorFamily('C') &&
      isMajorFamily('Cmaj9(#11)') &&
      isMajorFamily('C6(9)') &&
      !isMajorFamily('Cm6(9)') &&
      !isMajorFamily('C7'),
    name: 'Guard: major family accepts triad, maj9(#11) and 6/9',
  });

  /* Canonical cycle detection, in both the fourth and fifth readings. */
  out.push({
    ok:
      isForbiddenCycle('Dm7', 'G7', 'Cmaj7') &&
      isForbiddenCycle('Dm9', 'G13(b9)', 'Cmaj9(#11)') &&
      isForbiddenCycle('Am7', 'D7', 'Gmaj7') &&
      !isForbiddenCycle('Dm6(9)', 'G13(b9)', 'Cmaj9') &&
      !isForbiddenCycle('Dm7', 'Db7(#11)', 'Cmaj9') &&
      !isForbiddenCycle('Dm7', 'G7', 'Cm7'),
    name: 'Guard: detects enriched ii-V-I, ignores colour-chord and tritone variants',
  });

  /* Guard removes the cycle from a bar array. */
  const bars = ['Dbmaj9', 'Dm9', 'G13(b9)', 'Cmaj9(#11)', 'Bbm6(9)'];
  const res = applyStrayhornRootMotionGuard(bars);
  out.push({
    ok: res.defused === 1 && findRootMotionViolations(bars).length === 0 && bars[2] !== 'G13(b9)',
    name: 'Guard: rewrites the middle dominant and leaves no violation',
  });
  out.push({
    ok: res.receipts.length === 1 && res.receipts[0]!.startsWith('bs:iiVI_defused@bar3'),
    name: 'Guard: emits a bs:iiVI_defused receipt for the rewritten bar',
  });

  /* Protected middle bar falls back to replanting the minor chord. */
  const protectedBars = ['Dm9', 'G13(b9)', 'Cmaj9(#11)'];
  const protectedRes = applyStrayhornRootMotionGuard(protectedBars, {
    isProtectedBar: (b) => b === 2,
  });
  out.push({
    ok:
      protectedRes.defused === 1 &&
      protectedBars[1] === 'G13(b9)' &&
      protectedBars[0] === 'Dm6(9)' &&
      findRootMotionViolations(protectedBars).length === 0,
    name: 'Guard: protected dominant bar forces parallel-colour replant instead',
  });

  /* Fully protected cycle is reported unresolved rather than silently altered. */
  const locked = ['Dm9', 'G13(b9)', 'Cmaj9(#11)'];
  const lockedRes = applyStrayhornRootMotionGuard(locked, { isProtectedBar: () => true });
  out.push({
    ok:
      lockedRes.defused === 0 &&
      lockedRes.unresolved.length === 1 &&
      locked.join('|') === 'Dm9|G13(b9)|Cmaj9(#11)',
    name: 'Guard: fully protected cycle reported unresolved, bars untouched',
  });

  /* Guard is idempotent. */
  const twice = ['Dm9', 'G13(b9)', 'Cmaj9(#11)'];
  applyStrayhornRootMotionGuard(twice);
  const second = applyStrayhornRootMotionGuard(twice);
  out.push({
    ok: second.defused === 0 && second.unresolved.length === 0,
    name: 'Guard: second application is a no-op',
  });

  /* Corpus integrity. */
  let corpusClean = true;
  let intervalsMatch = true;
  for (const row of STRAYHORN_PROGRESSION_CORPUS) {
    if (findRootMotionViolations(row.chords).length > 0) corpusClean = false;
    if (row.intervals.length !== 3 || row.chords.length !== 4) intervalsMatch = false;
  }
  out.push({ ok: corpusClean, name: 'Corpus: no row contains a functional ii-V-I root chain' });
  out.push({ ok: intervalsMatch, name: 'Corpus: every row is 4 chords and 3 intervals' });

  out.push({
    ok:
      STRAYHORN_PROGRESSION_CORPUS.length === 21 &&
      strayhornRowsForFingerprint('BS_HARM_01').length === 5 &&
      strayhornRowsForFingerprint('BS_HARM_03').length === 4 &&
      strayhornRowsForFingerprint('BS_HARM_04').length === 4 &&
      strayhornRowsForFingerprint('BS_HARM_06').length === 4 &&
      strayhornRowsForFingerprint('BS_HARM_OTHER').length === 4,
    name: 'Corpus: 21 rows distributed across the five harmonic fingerprints',
  });

  /* Chromatic-mediant rows must never move by a perfect fourth or fifth. */
  const driftClean = strayhornRowsForFingerprint('BS_HARM_03').every((r) =>
    r.intervals.every((i) => Math.abs(i) !== 5 && Math.abs(i) !== 7)
  );
  out.push({ ok: driftClean, name: 'Corpus: minor-third drift rows avoid +/-5 and +/-7 motion' });

  /* Deterministic picking. */
  const a = pickStrayhornRow(4242, 'BS_HARM_01');
  const b = pickStrayhornRow(4242, 'BS_HARM_01');
  out.push({
    ok: a === b && a.fingerprintId === 'BS_HARM_01',
    name: 'Corpus: pickStrayhornRow is deterministic and respects the fingerprint filter',
  });

  const motion = strayhornMotionSet();
  out.push({
    ok: motion.length > 0 && motion.every((i) => Math.abs(i) <= 6 || Math.abs(i) === 7),
    name: 'Corpus: motion set is reported',
  });

  return out;
}
