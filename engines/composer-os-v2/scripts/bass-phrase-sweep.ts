/**
 * Phase 18.2D — Bass phrase regression sweep (fixed seeds).
 * Pass criteria: bass activity in every bar + MIDI range (floor/ceil) only.
 * Contour and rhythm columns are informational (18.2D phrase variety work pending).
 * Run: npm run test:bass (from engines/composer-os-v2)
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { contourFingerprint, rhythmFingerprint } from '../core/goldenPath/bassLineFingerprints';
import type { MeasureModel, PartModel } from '../core/score-model/scoreModelTypes';

const SEEDS = [50021, 12345, 99999, 11111, 77777, 33333, 55555, 88888, 22222, 44444] as const;
const TOTAL_BARS = 32;
const BASS_FLOOR = 28;
const BASS_CEIL = 55;

/** Within-bar pitch contour: interval string when ≥2 notes, else one-note tag (empty bars handled upstream). */
function barContourKey(m: MeasureModel): string {
  const pitches: number[] = [];
  for (const e of m.events) {
    if (e.kind === 'note' && 'pitch' in e) pitches.push((e as { pitch: number }).pitch);
  }
  if (pitches.length >= 2) return contourFingerprint(m);
  if (pitches.length === 1) return `1n:${pitches[0]}`;
  return '';
}

function maxConsecutiveRun<T>(values: T[], same: (a: T, b: T) => boolean): number {
  if (values.length === 0) return 0;
  let max = 1;
  let run = 1;
  for (let i = 1; i < values.length; i++) {
    if (same(values[i]!, values[i - 1]!)) {
      run++;
      max = Math.max(max, run);
    } else {
      run = 1;
    }
  }
  return max;
}

interface BassChecks {
  bassBars: number;
  floorOk: boolean;
  ceilOk: boolean;
  contourOk: boolean;
  rhythmOk: boolean;
  pass: boolean;
}

function checkBassPhrase(bass: PartModel, totalBars: number): BassChecks {
  let floorOk = true;
  let ceilOk = true;
  let barsWithNotes = 0;

  for (let bar = 1; bar <= totalBars; bar++) {
    const m = bass.measures.find((x) => x.index === bar);
    if (!m) {
      floorOk = false;
      ceilOk = false;
      continue;
    }
    const noteEvents = m.events.filter((e) => e.kind === 'note');
    if (noteEvents.length === 0) {
      floorOk = false;
      ceilOk = false;
      continue;
    }
    barsWithNotes++;
    for (const e of noteEvents) {
      const p = (e as { pitch: number }).pitch;
      if (p < BASS_FLOOR) floorOk = false;
      if (p > BASS_CEIL) ceilOk = false;
    }
  }

  const orderedMeasures: MeasureModel[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const m = bass.measures.find((x) => x.index === bar);
    if (m) orderedMeasures.push(m);
  }

  const contourKeys = orderedMeasures.map(barContourKey);
  let contourOk = true;
  for (let i = 0; i < contourKeys.length - 1; i++) {
    if (contourKeys[i] === contourKeys[i + 1]) {
      contourOk = false;
      break;
    }
  }

  const rhythmKeys = orderedMeasures.map((m) => rhythmFingerprint(m));
  const maxRhythmRun = maxConsecutiveRun(rhythmKeys, (a, b) => a === b);
  const rhythmOk = maxRhythmRun <= 2;

  const pass = barsWithNotes === totalBars && floorOk && ceilOk;

  return { bassBars: barsWithNotes, floorOk, ceilOk, contourOk, rhythmOk, pass };
}

function yn(ok: boolean): string {
  return ok ? 'Y' : 'n';
}

function main(): void {
  console.log(
    'Composer OS — Bass phrase sweep (18.2D), 32-bar guitar_bass_duo, builtin harmony\n' +
      'Guarantee: 32/32 bars with bass notes + MIDI range; Contour/Rhythm informational only.\n'
  );
  console.log(
    'Seed'.padEnd(8) +
      '| Bass Bars'.padEnd(12) +
      '| Floor OK'.padEnd(11) +
      '| Ceil OK'.padEnd(10) +
      '| Contour'.padEnd(10) +
      '| Rhythm'.padEnd(10) +
      '| Result'
  );
  console.log('-'.repeat(74));

  let anyFail = false;

  for (const seed of SEEDS) {
    const r = runGoldenPathOnce(seed, {
      presetId: 'guitar_bass_duo',
      totalBars: TOTAL_BARS,
      longFormEnabled: true,
      creativeControlLevel: 'balanced',
    });

    const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    let c: BassChecks;
    if (!bass) {
      c = {
        bassBars: 0,
        floorOk: false,
        ceilOk: false,
        contourOk: false,
        rhythmOk: false,
        pass: false,
      };
    } else {
      const tb = r.context.form.totalBars;
      c = checkBassPhrase(bass, tb);
    }

    if (!c.pass) anyFail = true;
    const result = c.pass ? 'PASS' : 'FAIL';
    const barsLabel = `${c.bassBars}/${TOTAL_BARS}`;

    console.log(
      String(seed).padEnd(8) +
        `| ${barsLabel.padEnd(10)}` +
        `| ${yn(c.floorOk).padEnd(9)}` +
        `| ${yn(c.ceilOk).padEnd(8)}` +
        `| ${yn(c.contourOk).padEnd(8)}` +
        `| ${yn(c.rhythmOk).padEnd(8)}` +
        `| ${result}`
    );
  }

  console.log('-'.repeat(74));
  console.log(
    anyFail
      ? '\nBASS PHRASE SWEEP: FAIL (exit 1) — bass bar coverage and/or MIDI range did not meet guarantee.'
      : '\nBASS PHRASE SWEEP: PASS (exit 0) — 32/32 bars + range OK; contour/rhythm not required.'
  );
  process.exit(anyFail ? 1 : 0);
}

main();
