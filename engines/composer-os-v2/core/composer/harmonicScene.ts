/**
 * Phase 3a — HarmonicScene stub (session-level; populated in Phase 3b).
 */

export interface HarmonicScene {
  sceneId: string;
  tensionLevel: number;
  dominantVoicingColor: string;
  activeMotifIds: string[];
  barRange: [number, number];
}

/** One stub scene per form section — logic wiring deferred to Phase 3b. */
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
