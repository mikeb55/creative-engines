/**
 * P7 golden — sonic_youth per-section VRB (Slonimsky cell switch A vs B).
 * Off smoke until promoted.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const SEED = 75002;

function guitarPitchesForBar(score: ScoreModel | undefined, bar: number): number[] {
  const guitar = score?.parts.find((p) => p.id === 'guitar');
  const m = guitar?.measures.find((x) => x.index === bar);
  if (!m) return [];
  const pitches: number[] = [];
  for (const e of m.events) {
    if (e.kind === 'note') pitches.push(e.pitch);
    if (e.kind === 'chord') pitches.push(...e.pitches);
  }
  return pitches.sort((a, b) => a - b);
}

function symmetricPitchDiff(a: readonly number[], b: readonly number[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let diff = 0;
  for (const p of setA) if (!setB.has(p)) diff++;
  for (const p of setB) if (!setA.has(p)) diff++;
  return diff;
}

function runFixture(lockedBars: string[]) {
  return runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'sonic_youth',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: lockedBars,
    parsedChordBars: lockedBars,
  });
}

function goldenRunOk(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  return !!r.score && !!r.context;
}

function testSectionMarkersAttached(): boolean {
  const progression = ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'AbMaj7', 'AbMaj7', 'AbMaj7', 'AbMaj7'];
  const r = runFixture(progression);
  const markers = r.context?.sectionMarkers;
  const receipt = r.context?.generationMetadata?.sectionVrbMarkerReceipt ?? '';
  return (
    goldenRunOk(r) &&
    Array.isArray(markers) &&
    markers.length === 2 &&
    markers[0]?.label === 'A' &&
    markers[0]?.startBar === 1 &&
    markers[0]?.endBar === 4 &&
    markers[1]?.label === 'B' &&
    markers[1]?.startBar === 5 &&
    markers[1]?.endBar === 8 &&
    receipt.includes('SY_SLON_01')
  );
}

function testSameChordSectionPitchDelta(): boolean {
  const allDm7 = Array.from({ length: 8 }, () => 'Dm7');
  const r = runFixture(allDm7);
  if (!goldenRunOk(r) || !r.score) return false;

  const barA = guitarPitchesForBar(r.score, 2);
  const barB = guitarPitchesForBar(r.score, 6);
  if (barA.length === 0 || barB.length === 0) return false;

  const diff = symmetricPitchDiff(barA, barB);
  return diff >= 3;
}

function testProgressionDm7ToAbMaj7(): boolean {
  const progression = ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'AbMaj7', 'AbMaj7', 'AbMaj7', 'AbMaj7'];
  const r = runFixture(progression);
  if (!goldenRunOk(r)) return false;
  const locked = r.context?.lockedHarmonyBarsRaw;
  return locked?.[0] === 'Dm7' && locked?.[3] === 'Dm7' && locked?.[4] === 'AbMaj7' && locked?.[7] === 'AbMaj7';
}

export function runSonicYouthPerSectionVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['sonic_youth per-section VRB — section markers A/B wired', testSectionMarkersAttached],
    ['sonic_youth per-section VRB — Dm7×4 AbMaj7×4 progression', testProgressionDm7ToAbMaj7],
    [
      'sonic_youth per-section VRB — ≥3 pitch delta same chord different section',
      testSameChordSectionPitchDelta,
    ],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
