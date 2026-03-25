/**
 * Structured Big Band rule registry (research-aligned ids; descriptions are short labels).
 */

import type {
  BigBandComposerId,
  BigBandEraId,
  BigBandRule,
  BigBandRuleRegistryShape,
} from './bigBandResearchTypes';

function R(
  id: string,
  description: string,
  category: BigBandRule['category'],
  effectType: BigBandRule['effectType'],
  priority: number
): BigBandRule {
  return { id, description, category, effectType, priority };
}

const composerRules: Record<BigBandComposerId, BigBandRule[]> = {
  ellington: [
    R('ellington.counterpoint_density', '≥2 independent lines when not thin', 'composer', 'density', 82),
    R('ellington.intro_color', 'Small ensemble intros; avoid full-band hits', 'composer', 'orchestration', 74),
    R('ellington.melody_counter', 'Melody + countermelody/obbligato', 'composer', 'orchestration', 80),
    R('ellington.motive_tags', 'Motive IDs and transformed reappearance', 'composer', 'form', 78),
    R('ellington.shout_derive', 'Shout lead from earlier motives', 'composer', 'form', 79),
    R('ellington.elastic_time', 'Rhythm section timing variance', 'composer', 'rhythm', 71),
  ],
  basie: [
    R('basie.riff_core', 'Recurring 1–2 bar riff in head/backgrounds', 'composer', 'form', 85),
    R('basie.sparse_baseline', 'Baseline low density: one horn line + rhythm', 'composer', 'density', 83),
    R('basie.riff_stack', 'Density via riff stacking across sections', 'composer', 'density', 81),
    R('basie.functional_harmony', 'Mostly functional harmony', 'composer', 'harmony', 72),
    R('basie.shout_homophony', 'Shout homophony + earlier riff reuse', 'composer', 'orchestration', 84),
  ],
  thad: [
    R('thad.extended_form', 'Extended forms with interludes/tags', 'composer', 'form', 80),
    R('thad.solo_background_arc', 'Solo backgrounds evolve toward near-shout', 'composer', 'density', 82),
    R('thad.voice_leading', 'Strong inner voice-leading', 'composer', 'harmony', 78),
    R('thad.metric_tension', 'Metric tension near climaxes', 'composer', 'rhythm', 76),
    R('thad.shout_sequence', 'Shout with sequences + harmonic shift', 'composer', 'form', 81),
  ],
  schneider: [
    R('schneider.through_composed', 'Through-composed form graph', 'composer', 'form', 79),
    R('schneider.texture_density', 'Density from texture layers not player count', 'composer', 'density', 86),
    R('schneider.ostinato', 'Ostinato under changing top lines', 'composer', 'rhythm', 77),
    R('schneider.groove_switch', 'Groove type may change mid-piece', 'composer', 'rhythm', 73),
    R('schneider.climax_counterpoint', 'Climax: layered counter-lines over riff-shout', 'composer', 'orchestration', 84),
  ],
};

const eraRules: Record<BigBandEraId, BigBandRule[]> = {
  swing: [
    R('swing.form_templates', '12/32-bar templates; chorus structure', 'era', 'form', 70),
    R('swing.steady_groove', 'Steady swing groove', 'era', 'rhythm', 75),
    R('swing.functional_harmony', 'Functional harmony limits', 'era', 'harmony', 68),
    R('swing.parallel_soli', 'Parallel section harmonisation', 'era', 'orchestration', 66),
    R('swing.shout_placement', 'Shout ~2/3 form', 'era', 'form', 72),
    R('swing.not_overdense', 'Chorus density alternation', 'era', 'density', 67),
  ],
  bebop: [
    R('bebop.complex_forms', 'Bebop forms / rhythm changes', 'era', 'form', 74),
    R('bebop.line_language', 'Chromatics, enclosures, substitutions', 'era', 'harmony', 80),
    R('bebop.brass_punctuation', 'Brass punctuate vs long riffs', 'era', 'orchestration', 71),
    R('bebop.high_syncopation', 'Dense syncopation comp', 'era', 'rhythm', 76),
    R('bebop.line_architecture', 'Line-driven vs riff loops', 'era', 'form', 82),
  ],
  post_bop: [
    R('post.extended_climax', 'Architected climaxes', 'era', 'form', 73),
    R('post.side_step', 'Side-steps / poly-chords', 'era', 'harmony', 77),
    R('post.inner_motion', 'Active inner parts', 'era', 'density', 75),
    R('post.cross_section', 'Cross-section voicing maps', 'era', 'orchestration', 76),
  ],
  contemporary: [
    R('contemp.long_form', 'Long-form / multi-section', 'era', 'form', 70),
    R('contemp.texture_density', 'Texture-led density', 'era', 'density', 78),
    R('contemp.modal_fields', 'Modal / non-functional fields', 'era', 'harmony', 72),
    R('contemp.meter_flex', 'Mixed meters / ostinati', 'era', 'rhythm', 74),
  ],
};

const foundationalRules: BigBandRule[] = [
  R('found.swing_grid', '4-beat grid + walking bass in swing modes', 'foundational', 'rhythm', 60),
  R('found.triplet_feel', 'Triplet-based horn subdivisions', 'foundational', 'rhythm', 58),
  R('found.space', 'Space between busy figures', 'foundational', 'density', 62),
  R('found.functional_tag', 'Tag sections functional/modal/non-functional', 'foundational', 'harmony', 59),
  R('found.bebop_alter', 'Altered dominants when bebop/post-bop', 'foundational', 'harmony', 61),
];

const functionalRules = {
  shout: [
    R('func.shout.position', 'Shout ~60–75% form', 'shout', 'form', 77),
    R('func.shout.contrast', 'Higher density than preceding', 'shout', 'density', 79),
    R('func.shout.motive', 'Reuse prior motive in shout', 'shout', 'form', 76),
  ],
  riff: [
    R('func.riff.window', '1–2 bar motif windows', 'riff', 'form', 72),
    R('func.riff.grid', 'Lock to groove grid', 'riff', 'rhythm', 74),
    R('func.riff.layers', 'Limit simultaneous riff layers', 'riff', 'density', 73),
  ],
  soli: [
    R('func.soli.lead', 'Single lead then harmonise', 'soli', 'orchestration', 75),
    R('func.soli.range', 'Respect ranges / octave adjust', 'soli', 'orchestration', 70),
  ],
};

export const BIG_BAND_RULE_REGISTRY: BigBandRuleRegistryShape = {
  composerRules,
  eraRules,
  foundationalRules,
  functionalRules,
};

export function allRuleIdsFromRegistry(): Set<string> {
  const s = new Set<string>();
  for (const r of foundationalRules) s.add(r.id);
  for (const g of Object.values(composerRules)) for (const r of g) s.add(r.id);
  for (const g of Object.values(eraRules)) for (const r of g) s.add(r.id);
  for (const r of functionalRules.shout) s.add(r.id);
  for (const r of functionalRules.riff) s.add(r.id);
  for (const r of functionalRules.soli) s.add(r.id);
  return s;
}
