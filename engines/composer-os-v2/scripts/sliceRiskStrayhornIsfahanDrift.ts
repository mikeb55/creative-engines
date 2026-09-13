/**
 * Slice-pass reintroduction check for strayhorn_isfahan_drift.
 *
 * A) Song Mode compile path — actual SONGWRITER_CHORD_POOLS tiles (seed % 4 === 3).
 * B) Golden-path duo — builtin Dmin9 cycle then billyStrayhornSlice (does not consume pools).
 */
import { flattenChordPlanToHarmonyBars } from '../core/song-mode/leadMelodyPlanner';
import { runSongMode } from '../core/song-mode/runSongMode';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { frankZappaIiViRollingTriplePresent, isMajorKeyIiViTriple } from '../core/song-mode/songModeBuilder';

const SEEDS = [3, 7, 11, 15, 19, 23, 27, 31, 35];

function matchingTriples(bars: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i <= bars.length - 3; i++) {
    const a = bars[i]!;
    const b = bars[i + 1]!;
    const c = bars[i + 2]!;
    if (isMajorKeyIiViTriple(a, b, c)) out.push(`bars ${i + 1}-${i + 3}: ${a} | ${b} | ${c}`);
  }
  return out;
}

let compiledFail = 0;
let duoFail = 0;

console.log('=== A  Song Mode compile (isfahan pool tiles) ===');
for (const seed of SEEDS) {
  if (Math.abs(seed) % 4 !== 3) {
    console.log(`SKIP seed ${seed} (not isfahan tier)`);
    continue;
  }
  const sm = runSongMode({
    seed,
    totalBars: 32,
    primarySongwriterStyle: 'billy_strayhorn',
  });
  const bars = flattenChordPlanToHarmonyBars(sm.compiledSong.chordPlan);
  const hits = matchingTriples(bars);
  const rolling = frankZappaIiViRollingTriplePresent(bars);
  const status = hits.length || rolling ? 'FAIL' : 'PASS';
  if (status === 'FAIL') compiledFail++;
  console.log(`${status}  seed=${seed} bars=${bars.length} triples=${hits.length}`);
  for (const h of hits) console.log(`    ${h}`);
}

console.log('=== B  Golden-path duo (builtin cycle + slice) ===');
for (const seed of SEEDS) {
  const r = runGoldenPathOnce(seed, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'billy_strayhorn',
  });
  const bars = r.context?.generationMetadata?.billyStrayhornEffectiveHarmonyBars ?? [];
  const hits = matchingTriples(bars);
  const rolling = frankZappaIiViRollingTriplePresent(bars);
  const status = !r.success || hits.length || rolling ? 'FAIL' : 'PASS';
  if (status === 'FAIL') duoFail++;
  console.log(
    `${status}  seed=${seed} success=${r.success} bars=${bars.length} triples=${hits.length}`
  );
  for (const h of hits) console.log(`    ${h}`);
}

console.log('---');
console.log(`compiledFail=${compiledFail} duoSliceFail=${duoFail}`);
process.exit(compiledFail ? 1 : 0);
