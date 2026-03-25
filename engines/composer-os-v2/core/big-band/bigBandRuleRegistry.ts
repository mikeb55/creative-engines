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
  effectType: BigBandRule['effectType']
): BigBandRule {
  return { id, description, category, effectType };
}

const composerRules: Record<BigBandComposerId, BigBandRule[]> = {
  ellington: [
    R('ellington.counterpoint_density', '≥2 independent lines when not thin', 'composer', 'density'),
    R('ellington.intro_color', 'Small ensemble intros; avoid full-band hits', 'composer', 'orchestration'),
    R('ellington.melody_counter', 'Melody + countermelody/obbligato', 'composer', 'orchestration'),
    R('ellington.motive_tags', 'Motive IDs and transformed reappearance', 'composer', 'form'),
    R('ellington.shout_derive', 'Shout lead from earlier motives', 'composer', 'form'),
    R('ellington.elastic_time', 'Rhythm section timing variance', 'composer', 'rhythm'),
  ],
  basie: [
    R('basie.riff_core', 'Recurring 1–2 bar riff in head/backgrounds', 'composer', 'form'),
    R('basie.sparse_baseline', 'Baseline low density: one horn line + rhythm', 'composer', 'density'),
    R('basie.riff_stack', 'Density via riff stacking across sections', 'composer', 'density'),
    R('basie.functional_harmony', 'Mostly functional harmony', 'composer', 'harmony'),
    R('basie.shout_homophony', 'Shout homophony + earlier riff reuse', 'composer', 'orchestration'),
  ],
  thad: [
    R('thad.extended_form', 'Extended forms with interludes/tags', 'composer', 'form'),
    R('thad.solo_background_arc', 'Solo backgrounds evolve toward near-shout', 'composer', 'density'),
    R('thad.voice_leading', 'Strong inner voice-leading', 'composer', 'harmony'),
    R('thad.metric_tension', 'Metric tension near climaxes', 'composer', 'rhythm'),
    R('thad.shout_sequence', 'Shout with sequences + harmonic shift', 'composer', 'form'),
  ],
  schneider: [
    R('schneider.through_composed', 'Through-composed form graph', 'composer', 'form'),
    R('schneider.texture_density', 'Density from texture layers not player count', 'composer', 'density'),
    R('schneider.ostinato', 'Ostinato under changing top lines', 'composer', 'rhythm'),
    R('schneider.groove_switch', 'Groove type may change mid-piece', 'composer', 'rhythm'),
    R('schneider.climax_counterpoint', 'Climax: layered counter-lines over riff-shout', 'composer', 'orchestration'),
  ],
};

const eraRules: Record<BigBandEraId, BigBandRule[]> = {
  swing: [
    R('swing.form_templates', '12/32-bar templates; chorus structure', 'era', 'form'),
    R('swing.steady_groove', 'Steady swing groove', 'era', 'rhythm'),
    R('swing.functional_harmony', 'Functional harmony limits', 'era', 'harmony'),
    R('swing.parallel_soli', 'Parallel section harmonisation', 'era', 'orchestration'),
    R('swing.shout_placement', 'Shout ~2/3 form', 'era', 'form'),
    R('swing.not_overdense', 'Chorus density alternation', 'era', 'density'),
  ],
  bebop: [
    R('bebop.complex_forms', 'Bebop forms / rhythm changes', 'era', 'form'),
    R('bebop.line_language', 'Chromatics, enclosures, substitutions', 'era', 'harmony'),
    R('bebop.brass_punctuation', 'Brass punctuate vs long riffs', 'era', 'orchestration'),
    R('bebop.high_syncopation', 'Dense syncopation comp', 'era', 'rhythm'),
    R('bebop.line_architecture', 'Line-driven vs riff loops', 'era', 'form'),
  ],
  post_bop: [
    R('post.extended_climax', 'Architected climaxes', 'era', 'form'),
    R('post.side_step', 'Side-steps / poly-chords', 'era', 'harmony'),
    R('post.inner_motion', 'Active inner parts', 'era', 'density'),
    R('post.cross_section', 'Cross-section voicing maps', 'era', 'orchestration'),
  ],
  contemporary: [
    R('contemp.long_form', 'Long-form / multi-section', 'era', 'form'),
    R('contemp.texture_density', 'Texture-led density', 'era', 'density'),
    R('contemp.modal_fields', 'Modal / non-functional fields', 'era', 'harmony'),
    R('contemp.meter_flex', 'Mixed meters / ostinati', 'era', 'rhythm'),
  ],
};

const foundationalRules: BigBandRule[] = [
  R('found.swing_grid', '4-beat grid + walking bass in swing modes', 'foundational', 'rhythm'),
  R('found.triplet_feel', 'Triplet-based horn subdivisions', 'foundational', 'rhythm'),
  R('found.space', 'Space between busy figures', 'foundational', 'density'),
  R('found.functional_tag', 'Tag sections functional/modal/non-functional', 'foundational', 'harmony'),
  R('found.bebop_alter', 'Altered dominants when bebop/post-bop', 'foundational', 'harmony'),
];

const functionalRules = {
  shout: [
    R('func.shout.position', 'Shout ~60–75% form', 'shout', 'form'),
    R('func.shout.contrast', 'Higher density than preceding', 'shout', 'density'),
    R('func.shout.motive', 'Reuse prior motive in shout', 'shout', 'form'),
  ],
  riff: [
    R('func.riff.window', '1–2 bar motif windows', 'riff', 'form'),
    R('func.riff.grid', 'Lock to groove grid', 'riff', 'rhythm'),
    R('func.riff.layers', 'Limit simultaneous riff layers', 'riff', 'density'),
  ],
  soli: [
    R('func.soli.lead', 'Single lead then harmonise', 'soli', 'orchestration'),
    R('func.soli.range', 'Respect ranges / octave adjust', 'soli', 'orchestration'),
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
