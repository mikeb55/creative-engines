import * as fs from 'fs';
import * as path from 'path';
import { buildRiffGoldenFixture } from '../tests/riffGoldenFixture';
import { riffSoloFromZappaEngine } from '../core/riff-generator/riffSoloZappaAdapter';
import type { RiffSoloGeneratorProfile } from '../core/composer/riffProfileTypes';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';

const dir = path.join(__dirname, '../tests/riffGolden');
fs.mkdirSync(dir, { recursive: true });

const defaultFixture = buildRiffGoldenFixture('frank_zappa');
if ('error' in defaultFixture) throw new Error(defaultFixture.error);
fs.writeFileSync(
  path.join(dir, 'frankzappa-default.golden.json'),
  `${JSON.stringify(defaultFixture, null, 2)}\n`
);

const solo = getVoiceRuleBundle('frank_zappa').riffProfile?.soloGeneratorProfile;
if (!solo?.enabled) throw new Error('solo profile missing');

const ferocityProfile: RiffSoloGeneratorProfile = {
  ...solo,
  styleMode: 'bluesrockFerocious',
};
const seed = 42;
const chord = 'Am7';
const perBar: number[] = [];
let feedbackProxyBars = 0;
let maxBar = 0;
for (let b = 0; b < 8; b++) {
  const line = riffSoloFromZappaEngine(b, chord, ferocityProfile, seed);
  perBar.push(line.length);
  maxBar = Math.max(maxBar, line.length);
  if (line.some((e) => e.feedbackProxy)) feedbackProxyBars++;
}

const ferocity = {
  seed,
  bars: 8,
  chord,
  styleMode: 'bluesrockFerocious',
  chromaticBudget: 0.3,
  perBarNoteCounts: perBar,
  maxBarNoteCount: maxBar,
  feedbackProxyPhraseEnds: feedbackProxyBars,
};
fs.writeFileSync(path.join(dir, 'frankzappa.golden.json'), `${JSON.stringify(ferocity, null, 2)}\n`);
console.log('wrote riffGolden fixtures', ferocity);
