/**
 * VoiceRuleBundle blend engine — merge + conflict table + known pair gates.
 */

import { getVoiceRuleBundle, NEUTRAL_VOICE_RULE_BUNDLE } from '../core/composer/voiceRuleBundles';
import type { VoiceRuleBundle } from '../core/composer/voiceRuleBundle';
import {
  blendVoiceRuleBundles,
  BlendConflictError,
  KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS,
  KNOWN_SAFE_SQ_BLEND_PAIRS,
} from '../core/composer/vrbBlend';

function wavg(a: number, b: number, pw: number): number {
  return Math.round(pw * a + (1 - pw) * b);
}

function testBartokRavelWeightedAverage(): boolean {
  const b = getVoiceRuleBundle('sq_vrb_bartok');
  const r = getVoiceRuleBundle('ravel');
  const pw = 0.6;
  const out = blendVoiceRuleBundles(b, r, pw);
  if (out.voiceId !== 'blend:sq_vrb_bartok+ravel') return false;
  if (out.harmonicRhythm.minChordDurationBars !== wavg(b.harmonicRhythm.minChordDurationBars, r.harmonicRhythm.minChordDurationBars, pw))
    return false;
  if (out.harmonicRhythm.maxChordDurationBars !== wavg(b.harmonicRhythm.maxChordDurationBars, r.harmonicRhythm.maxChordDurationBars, pw))
    return false;
  if (out.voicingPolicy.minSpreadSemitones !== wavg(b.voicingPolicy.minSpreadSemitones, r.voicingPolicy.minSpreadSemitones, pw))
    return false;
  if (out.voicingPolicy.maxSpreadSemitones !== wavg(b.voicingPolicy.maxSpreadSemitones, r.voicingPolicy.maxSpreadSemitones, pw))
    return false;
  if (out.voicingPolicy.clusterSizeNotes[0] !== wavg(b.voicingPolicy.clusterSizeNotes[0], r.voicingPolicy.clusterSizeNotes[0], pw))
    return false;
  if (out.voicingPolicy.clusterSizeNotes[1] !== wavg(b.voicingPolicy.clusterSizeNotes[1], r.voicingPolicy.clusterSizeNotes[1], pw))
    return false;
  if (out.melodicPolicy.maxLeapSemitones !== wavg(b.melodicPolicy.maxLeapSemitones, r.melodicPolicy.maxLeapSemitones, pw)) return false;
  const expIntervals = [...new Set([...(b.melodicPolicy.preferredIntervalSets ?? []), ...(r.melodicPolicy.preferredIntervalSets ?? [])])].sort(
    (x, y) => x - y,
  );
  if (JSON.stringify(out.melodicPolicy.preferredIntervalSets) !== JSON.stringify(expIntervals)) return false;
  if (out.bassPolicy.role !== 'chromatic-first') return false;
  return true;
}

function testPartLachenmannThrows(): boolean {
  try {
    blendVoiceRuleBundles(getVoiceRuleBundle('part'), getVoiceRuleBundle('lachenmann'), 0.5);
    return false;
  } catch (e) {
    if (!(e instanceof BlendConflictError)) return false;
    return e.flagA === 'tintinnabuliEnabled' && e.flagB === 'pitchRoleDecoupled';
  }
}

function testPartOrnetteThrows(): boolean {
  try {
    blendVoiceRuleBundles(getVoiceRuleBundle('part'), getVoiceRuleBundle('ornette_coleman'), 0.5);
    return false;
  } catch (e) {
    if (!(e instanceof BlendConflictError)) return false;
    return e.flagA === 'tintinnabuliEnabled' && e.flagB === 'harmolodicsEnabled';
  }
}

function testTurtleGershwinNoConflict(): boolean {
  const out = blendVoiceRuleBundles(getVoiceRuleBundle('turtle_island'), getVoiceRuleBundle('gershwin'), 0.5);
  return out.swingFeel === true && out.blueNoteEnabled === true;
}

function testSacredIronicThrowsAtHalf(): boolean {
  const a: VoiceRuleBundle = {
    ...NEUTRAL_VOICE_RULE_BUNDLE,
    voiceId: 'sac_x',
    sacredProfile: true,
  };
  const b: VoiceRuleBundle = {
    ...NEUTRAL_VOICE_RULE_BUNDLE,
    voiceId: 'iro_y',
    ironicStyleSwitchEnabled: true,
  };
  try {
    blendVoiceRuleBundles(a, b, 0.5);
    return false;
  } catch (e) {
    return e instanceof BlendConflictError;
  }
}

function testSacredIronicSacredWinsAt07(): boolean {
  const a: VoiceRuleBundle = {
    ...NEUTRAL_VOICE_RULE_BUNDLE,
    voiceId: 'sac_x',
    sacredProfile: true,
  };
  const b: VoiceRuleBundle = {
    ...NEUTRAL_VOICE_RULE_BUNDLE,
    voiceId: 'iro_y',
    ironicStyleSwitchEnabled: true,
  };
  const out = blendVoiceRuleBundles(a, b, 0.7);
  return out.sacredProfile === true && out.ironicStyleSwitchEnabled === false;
}

function testReichLigetiMicropolyphonyAntiMetric(): boolean {
  const out = blendVoiceRuleBundles(getVoiceRuleBundle('reich_glass'), getVoiceRuleBundle('ligeti'), 0.6);
  return out.micropolyphonyMode === true && out.rhythmPolicy.antiMetric === true;
}

function testAllKnownSafePairsNoThrow(): boolean {
  for (const [va, vb] of KNOWN_SAFE_SQ_BLEND_PAIRS) {
    try {
      blendVoiceRuleBundles(getVoiceRuleBundle(va), getVoiceRuleBundle(vb), 0.5);
      blendVoiceRuleBundles(getVoiceRuleBundle(vb), getVoiceRuleBundle(va), 0.5);
    } catch {
      return false;
    }
  }
  return true;
}

function testAllKnownIncompatibleThrow(): boolean {
  for (const [va, vb] of KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS) {
    let ok = false;
    try {
      blendVoiceRuleBundles(getVoiceRuleBundle(va), getVoiceRuleBundle(vb), 0.5);
    } catch (e) {
      ok = e instanceof BlendConflictError;
    }
    if (!ok) return false;
    ok = false;
    try {
      blendVoiceRuleBundles(getVoiceRuleBundle(vb), getVoiceRuleBundle(va), 0.5);
    } catch (e) {
      ok = e instanceof BlendConflictError;
    }
    if (!ok) return false;
  }
  return true;
}

export function runVrbBlendTests(): { name: string; ok: boolean }[] {
  return [
    ['VRB blend — bartok + ravel 0.6 weighted continuous + voiceId', testBartokRavelWeightedAverage],
    ['VRB blend — part + lachenmann BlendConflictError flags', testPartLachenmannThrows],
    ['VRB blend — part + ornette BlendConflictError', testPartOrnetteThrows],
    ['VRB blend — turtle_island + gershwin swing + blue note', testTurtleGershwinNoConflict],
    ['VRB blend — sacred + ironic 0.5 throws', testSacredIronicThrowsAtHalf],
    ['VRB blend — sacred + ironic 0.7 sacred wins', testSacredIronicSacredWinsAt07],
    ['VRB blend — reich_glass + ligeti micropolyphony + antiMetric', testReichLigetiMicropolyphonyAntiMetric],
    ['VRB blend — all KNOWN_SAFE_SQ_BLEND_PAIRS', testAllKnownSafePairsNoThrow],
    ['VRB blend — all KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS throw', testAllKnownIncompatibleThrow],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
