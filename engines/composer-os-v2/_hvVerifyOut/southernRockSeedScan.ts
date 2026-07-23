/**
 * Scan southern_rock -> jimmy_herring for confirm-worthy seeds (>=10 iv, ON cos >=0.5).
 */
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_SOUTHERNROCK_MOTIF_SEED_ENV,
  RIFF_SOUTHERNROCK_MOTIF_SEED_VRB,
  findSeedsWithMinPhraseIntervals,
  pickPhraseForSeed,
  resetRiffPhraseMotifSeedCacheForTests,
} from '../core/riff-generator/riffPhraseMotifSeed';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const CATEGORY = 'southern_rock' as const;
const VRB = RIFF_SOUTHERNROCK_MOTIF_SEED_VRB;
const ENV = RIFF_SOUTHERNROCK_MOTIF_SEED_ENV;

function realizedIv(score: ScoreModel): number[] {
  const mel = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const p = mel.filter((n) => !n.rest && n.midi > 0).map((n) => n.midi);
  const o: number[] = [];
  for (let i = 1; i < p.length; i++) o.push(p[i]! - p[i - 1]!);
  return o;
}
function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}
function exactRate(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let h = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) h++;
  return h / n;
}
function build(seed: number) {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId: VRB,
    style,
    grid: 'sixteenth',
    density: 'dense',
  });
  return buildRiffScoreModel({
    seed,
    bars: 8,
    density: 'dense',
    style,
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId: VRB,
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'scan',
    riffProfile: profile,
  });
}

delete process.env[ENV];
resetRiffPhraseMotifSeedCacheForTests();
const candidates = findSeedsWithMinPhraseIntervals(CATEGORY, 120, 10, 1);
console.log('candidates (>=10 iv, distinct phrases first):', candidates.length);

process.env[ENV] = '1';
resetRiffPhraseMotifSeedCacheForTests();

const hits: { seed: number; phraseId: string; iv: number; onCos: number; onExact: number; realizedLen: number }[] = [];
for (const seed of candidates) {
  const phrase = pickPhraseForSeed(CATEGORY, seed)!;
  const on = build(seed);
  const realized = realizedIv(on.score);
  const onCos = cosine(realized, phrase.intervalSequence);
  const onExact = exactRate(realized, phrase.intervalSequence);
  console.log('seed', seed, 'iv', phrase.intervalSequence.length, 'realized', realized.length, 'cos', onCos.toFixed(3), 'exact', onExact.toFixed(3), onCos >= 0.5 ? 'HIT' : '');
  if (onCos >= 0.5) {
    hits.push({ seed, phraseId: phrase.id, iv: phrase.intervalSequence.length, onCos, onExact, realizedLen: realized.length });
  }
  if (hits.length >= 8) break;
}

console.log('\nHITS (>=0.5 cos):', hits.length);
for (const h of hits) console.log(JSON.stringify(h));

delete process.env[ENV];
resetRiffPhraseMotifSeedCacheForTests();
if (hits.length === 0) process.exit(1);