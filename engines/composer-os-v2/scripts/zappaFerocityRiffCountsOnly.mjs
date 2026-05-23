/** ESM — adapter counts only (no MusicXML). */
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles.ts';
import { riffSoloFromZappaEngine } from '../core/riff-generator/riffSoloZappaAdapter.ts';

const solo = getVoiceRuleBundle('frank_zappa').riffProfile?.soloGeneratorProfile;
if (!solo?.enabled) throw new Error('no solo profile');
const profile = { ...solo, styleMode: 'bluesrockFerocious' };
const controls = { zappaStyleMode: 'bluesrockFerocious' };
const counts = [];
for (let b = 0; b < 8; b++) {
  counts.push(riffSoloFromZappaEngine(b, 'Am7', profile, 42, controls).length);
}
console.log(JSON.stringify({ adapterNoteCountsPerBar: counts }));
