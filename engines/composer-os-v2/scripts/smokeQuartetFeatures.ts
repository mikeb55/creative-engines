/**
 * Phase 6 Pass 1 — smoke for {@link extractQuartetFeatures} (chorale whole-note synthetic).
 * Run: npx ts-node --project ../../tsconfig.json scripts/smokeQuartetFeatures.ts
 */

import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import { extractQuartetFeatures } from '../core/counterpoint/extractQuartetFeatures';

function syntheticChoraleWholeNotes(): AbstractLineSet {
  const whole = (pitchMidi: number) => ({
    pitchMidi,
    durationBars: 4,
    offsetBars: 0,
  });
  return {
    voices: [
      { role: 'soprano' as const, notes: [whole(72)], tags: ['harmonic_fill' as const] },
      { role: 'alto' as const, notes: [whole(67)], tags: ['harmonic_fill' as const] },
      { role: 'tenor' as const, notes: [whole(64)], tags: ['harmonic_fill' as const] },
      { role: 'bass' as const, notes: [whole(48)], tags: ['bass_anchor' as const] },
    ],
    cadenceTags: [],
    densityEnvelope: { segments: [{ startBar: 0, endBar: 4, density: 'sparse' as const }] },
    dissonanceProfile: {
      allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      forbiddenIntervals: [],
      parallelFifthsAllowed: false,
      parallelOctavesAllowed: false,
      resolveByStep: true,
    },
    sourceMode: 'chords_only',
    lengthBars: 4,
    styleSourceVrbId: 'smoke_quartet_features',
  };
}

function main(): void {
  const lines = syntheticChoraleWholeNotes();
  const feats = extractQuartetFeatures(lines);
  if (feats.length !== 1) {
    console.error(`FAIL: expected 1 phrase, got ${feats.length}`);
    process.exit(1);
  }
  const f = feats[0]!;
  const checks: { label: string; ok: boolean }[] = [
    { label: 'textureClass chorale', ok: f.textureClass === 'chorale' },
    { label: 'homorhythmScore > 0.8', ok: f.homorhythmScore > 0.8 },
    { label: 'contrapuntalIndependence < 0.2', ok: f.contrapuntalIndependence < 0.2 },
    { label: 'rhythmicDensity < 0.3', ok: f.rhythmicDensity < 0.3 },
  ];
  let failed = 0;
  for (const c of checks) {
    if (c.ok) console.log(`PASS: ${c.label}`);
    else {
      console.log(`FAIL: ${c.label}`);
      failed++;
    }
  }
  if (failed > 0) {
    console.error(JSON.stringify(f, null, 2));
    process.exit(1);
  }
  console.log('smokeQuartetFeatures: OK');
}

main();
