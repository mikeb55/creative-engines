/**
 * Phase 3a/3b — HarmonicScene session objects (tension + structural hints).
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';

export interface HarmonicScene {
  sceneId: string;
  tensionLevel: number;
  dominantVoicingColor: string;
  activeMotifIds: string[];
  barRange: [number, number];
  /** Threadgill — rotates interval-set family at scene boundaries. */
  threadgillIntervalFamily?: number;
}

/** One stub scene per form section. */
export function buildHarmonicSceneStubs(form: {
  sections: Array<{ label: string; startBar: number; length: number }>;
  totalBars: number;
}): HarmonicScene[] {
  return form.sections.map((s, idx) => ({
    sceneId: `harmonic_scene_${s.label.replace(/\s+/g, '_')}_${idx}`,
    tensionLevel: Math.min(1, Math.max(0, 0.25 + idx * 0.08)),
    dominantVoicingColor: 'neutral',
    activeMotifIds: [],
    barRange: [s.startBar, s.startBar + s.length - 1],
  }));
}

/** Schneider two-halves arc + Threadgill rotation slots; default stub otherwise. */
export function buildHarmonicScenesForVoiceBundle(
  form: { sections: Array<{ label: string; startBar: number; length: number }>; totalBars: number },
  bundle: VoiceRuleBundle
): HarmonicScene[] {
  const tb = form.totalBars;
  if (bundle.voiceId === 'maria_schneider') {
    const half = Math.max(1, Math.floor(tb / 2));
    return [
      {
        sceneId: 'schneider_development_half',
        tensionLevel: 0.45,
        dominantVoicingColor: 'neutral',
        activeMotifIds: [],
        barRange: [1, half],
      },
      {
        sceneId: 'schneider_recapitulation_half',
        tensionLevel: 0.55,
        dominantVoicingColor: 'neutral',
        activeMotifIds: [],
        barRange: [half + 1, tb],
      },
    ];
  }
  if (bundle.voiceId === 'henry_threadgill') {
    return form.sections.map((s, idx) => ({
      sceneId: `threadgill_scene_${s.label.replace(/\s+/g, '_')}_${idx}`,
      tensionLevel: Math.min(1, 0.3 + idx * 0.07),
      dominantVoicingColor: 'neutral',
      activeMotifIds: [],
      barRange: [s.startBar, s.startBar + s.length - 1],
      threadgillIntervalFamily: idx % 3,
    }));
  }
  return buildHarmonicSceneStubs(form);
}

/** Effective tension at bar (Schneider rising/falling halves). */
export function tensionLevelForBar(bar: number, bundle: VoiceRuleBundle, scenes: HarmonicScene[]): number {
  if (bundle.voiceId === 'maria_schneider' && scenes.length >= 2) {
    const tb = Math.max(...scenes.map((s) => s.barRange[1]), bar);
    const half = Math.floor(tb / 2);
    if (bar <= half) {
      const span = Math.max(half - 1, 1);
      return 0.25 + (0.55 * (bar - 1)) / span;
    }
    const span = Math.max(tb - half - 1, 1);
    return 0.8 - (0.55 * (bar - half - 1)) / span;
  }
  const sc = scenes.find((s) => bar >= s.barRange[0] && bar <= s.barRange[1]);
  return sc?.tensionLevel ?? 0.5;
}

export function activeSceneForBar(bar: number, scenes: HarmonicScene[]): HarmonicScene | undefined {
  return scenes.find((s) => bar >= s.barRange[0] && bar <= s.barRange[1]);
}
