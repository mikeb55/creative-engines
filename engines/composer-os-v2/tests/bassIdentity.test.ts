/**
 * Bass melodic identity gates — contour, rhythm, interaction, anti-loop.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { validateBassIdentity } from '../core/score-integrity/bassIdentityValidation';
import { chordTonesForGoldenChord } from '../core/goldenPath/guitarBassDuoHarmony';

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

function testBassIdentityPassesGoldenPath(): boolean {
  for (const seed of [1, 42, 101, 202, 777]) {
    const r = runGoldenPath(seed);
    if (!r.success) return false;
    const v = validateBassIdentity(r.score);
    if (!v.valid) return false;
  }
  return true;
}

function testNonRootPhraseStartsPresent(): boolean {
  const r = runGoldenPath(333);
  const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return false;
  let n = 0;
  for (const m of bass.measures) {
    const first = m.events.find((e) => e.kind === 'note') as { pitch: number } | undefined;
    if (!first) continue;
    const rpc = chordTonesForGoldenChord(chordForBar(m.index)).root % 12;
    if (first.pitch % 12 !== rpc) n++;
  }
  return n >= 3;
}

function testBassRhythmFingerprintsVary(): boolean {
  const r = runGoldenPath(444);
  const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return false;
  const fps = bass.measures.map((m) =>
    m.events
      .filter((e) => e.kind === 'note')
      .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
      .join('|')
  );
  return new Set(fps).size >= 4;
}

export function runBassIdentityTests(): { name: string; ok: boolean }[] {
  return [
    ['Bass identity validation passes multi-seed golden path', testBassIdentityPassesGoldenPath],
    ['Non-root bass phrase starts present', testNonRootPhraseStartsPresent],
    ['Bass rhythmic fingerprints vary across bars', testBassRhythmFingerprintsVary],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
