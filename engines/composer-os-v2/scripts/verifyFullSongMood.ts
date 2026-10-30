/**
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/verifyFullSongMood.ts
 */
import { createHash } from 'crypto';
import { generateFullSongMusicXml } from '../core/song-mode/generateFullSongMusicXml';
import { runSongMode } from '../core/song-mode/runSongMode';
import { createDefaultSongwritingResearch } from '../core/song-mode/songwritingResearchParser';
import {
  applyMoodDriftToChordPlan,
  resolveFullSongMood,
} from '../core/song-mode/fullSongMood';

const SEED = 334032;
const BARS = 32;

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function chordsFor(mood?: string): string {
  const sm = runSongMode({
    seed: SEED,
    title: 'T',
    totalBars: BARS,
    songFormTemplate: 'full_song',
    primarySongwriterStyle: 'beatles',
    researchOverride: createDefaultSongwritingResearch(),
  });
  const drift = resolveFullSongMood(mood);
  if (drift) {
    sm.compiledSong.chordPlan = applyMoodDriftToChordPlan(sm.compiledSong.chordPlan, SEED, drift);
  }
  return sm.compiledSong.chordPlan.flatMap((p) => p.chordSymbols).join('|');
}

const base = generateFullSongMusicXml(SEED, BARS, { title: 'T' });
const omit = generateFullSongMusicXml(SEED, BARS, { title: 'T' });
const neutral = generateFullSongMusicXml(SEED, BARS, { title: 'T', mood: 'neutral' });
const darker = generateFullSongMusicXml(SEED, BARS, { title: 'T', mood: 'darker' });
const brighter = generateFullSongMusicXml(SEED, BARS, { title: 'T', mood: 'brighter' });

const baseChords = chordsFor();
const darkerChords = chordsFor('darker');
const brighterChords = chordsFor('brighter');

const report = {
  omitPreserves: base === omit,
  neutralPreserves: base === neutral,
  darkerDiffersXml: darker !== base,
  brighterDiffersXml: brighter !== base,
  darkerVsBrighterXml: darker !== brighter,
  darkerDiffersChords: darkerChords !== baseChords,
  brighterDiffersChords: brighterChords !== baseChords,
  baseChordsHead: baseChords.split('|').slice(0, 8),
  darkerChordsHead: darkerChords.split('|').slice(0, 8),
  brighterChordsHead: brighterChords.split('|').slice(0, 8),
  hashes: { base: hash(base), darker: hash(darker), brighter: hash(brighter) },
};

console.log(JSON.stringify(report, null, 2));

if (!report.omitPreserves || !report.neutralPreserves) {
  throw new Error('omit/neutral must preserve baseline output');
}
if (!report.darkerDiffersChords || !report.brighterDiffersChords) {
  throw new Error('mood must change locked harmony');
}
if (!report.darkerDiffersXml || !report.brighterDiffersXml) {
  throw new Error('mood must change MusicXML');
}
