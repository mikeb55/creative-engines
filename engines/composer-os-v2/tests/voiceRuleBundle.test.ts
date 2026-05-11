/**
 * VoiceRuleBundle compiler + gil_evans golden-path wiring (additive smoke suite).
 */

import { getVoiceRuleBundle, NEUTRAL_VOICE_RULE_BUNDLE } from '../core/composer/voiceRuleBundles';
import type { VoiceRuleBundle } from '../core/composer/voiceRuleBundle';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { ChordEvent, NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

function assertBundleShape(b: VoiceRuleBundle): boolean {
  if (!b.voiceId) return false;
  if (b.harmonicRhythm.minChordDurationBars < 0) return false;
  return b.voicingPolicy.clusterSizeNotes.length === 2;
}

function testSevenVoicesMinChordDurationBars(): boolean {
  return (
    getVoiceRuleBundle('thad_jones').harmonicRhythm.minChordDurationBars === 1 &&
    getVoiceRuleBundle('gil_evans').harmonicRhythm.minChordDurationBars === 1 &&
    getVoiceRuleBundle('maria_schneider').harmonicRhythm.minChordDurationBars === 1 &&
    getVoiceRuleBundle('john_coltrane').harmonicRhythm.minChordDurationBars === 0 &&
    getVoiceRuleBundle('wayne_shorter').harmonicRhythm.minChordDurationBars === 2 &&
    getVoiceRuleBundle('pat_metheny').harmonicRhythm.minChordDurationBars === 1 &&
    getVoiceRuleBundle('henry_threadgill').harmonicRhythm.minChordDurationBars === 0 &&
    getVoiceRuleBundle('charles_mingus').harmonicRhythm.minChordDurationBars === 1
  );
}

function testFallbackMatchesNeutralDefault(): boolean {
  const b = getVoiceRuleBundle('unknown_writer_xyz');
  return b.voiceId === NEUTRAL_VOICE_RULE_BUNDLE.voiceId;
}

function testHvPrefixStrips(): boolean {
  const a = getVoiceRuleBundle('hv:gil_evans');
  const b = getVoiceRuleBundle('gil_evans');
  return a.harmonicRhythm.minChordDurationBars === b.harmonicRhythm.minChordDurationBars;
}

function testResolvableBundlesSatisfyShape(): boolean {
  for (const id of [
    'thad_jones',
    'gil_evans',
    'maria_schneider',
    'john_coltrane',
    'wayne_shorter',
    'pat_metheny',
    'henry_threadgill',
    'charles_mingus',
    'neutral',
  ]) {
    if (!assertBundleShape(getVoiceRuleBundle(id))) return false;
  }
  return true;
}

function maxGuitarVerticalSpreadSemitones(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    if (p.id !== 'guitar') continue;
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'chord') {
          const pitches = (e as ChordEvent).pitches;
          if (!pitches || pitches.length < 2) continue;
          max = Math.max(max, Math.max(...pitches) - Math.min(...pitches));
        }
      }
      const byStart = new Map<number, number[]>();
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        const t = n.startBeat;
        if (!byStart.has(t)) byStart.set(t, []);
        byStart.get(t)!.push(n.pitch);
      }
      for (const pitches of byStart.values()) {
        if (pitches.length < 2) continue;
        max = Math.max(max, Math.max(...pitches) - Math.min(...pitches));
      }
    }
  }
  return max;
}

function testGilEvansGoldenPathVoiceBundleAndSpread(): boolean {
  const r = runGoldenPath(120334, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom',
    totalBars: 8,
    chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt',
    harmonicVoice: 'gil_evans',
  });
  if (!r.success || !r.score) return false;
  if (r.context.voiceBundle?.voiceId !== 'gil_evans') return false;
  if (r.context.voiceBundle?.voicingPolicy.minSpreadSemitones !== 10) return false;
  if (r.context.voiceBundle?.bassPolicy.role !== 'melodic-counterline') return false;
  if (r.context.generationMetadata?.voiceBundlePolicyEcho?.bassRole !== 'melodic-counterline') return false;
  const spread = maxGuitarVerticalSpreadSemitones(r.score);
  const minSp = r.context.voiceBundle.voicingPolicy.minSpreadSemitones;
  return spread >= minSp;
}

export function runVoiceRuleBundleTests(): { name: string; ok: boolean }[] {
  return [
    ['VoiceRuleBundle — deep voices minChordDurationBars', testSevenVoicesMinChordDurationBars],
    ['VoiceRuleBundle — unknown id falls back to neutral default', testFallbackMatchesNeutralDefault],
    ['VoiceRuleBundle — hv: prefix normalizes id', testHvPrefixStrips],
    ['VoiceRuleBundle — resolvable bundles satisfy interface shape', testResolvableBundlesSatisfyShape],
    ['VoiceRuleBundle — gil_evans golden path spread floor + bass echo', testGilEvansGoldenPathVoiceBundleAndSpread],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
