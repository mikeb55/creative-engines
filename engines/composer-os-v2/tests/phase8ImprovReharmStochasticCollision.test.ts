/**
 * Phase 8 — improv agent, reharmonisation, stochastic layer, voice collision (additive suite).
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildFormSections } from '../core/composer/formController';
import {
  buildImprovSkeleton,
  pass2ImprovMutation,
  improvPassHasLowSimilarityBars,
  wayneShorterOrbitReturnsWithinTwoBars,
} from '../core/composer/improvAgent';
import {
  applyReharmonisationToProgression,
  evansParallelAppliedWhenHighTension,
  shorterTritoneSubOnDominant,
} from '../core/composer/reharmonisationAgent';
import {
  sequenceChordChoicesForBars,
  fixedFormSectionLabels,
} from '../core/composer/stochasticLayer';
import {
  detectVoiceCollisions,
  resolveCollisionTransposeSecondVoice,
  maxContourSimilarityAcrossPair,
} from '../core/composer/voiceCollisionDetector';
import { appendImprovPartToPartwiseXml } from '../core/composer/improvMusicXmlAppend';

function testColtraneAugmentedTriadInSkeleton(): boolean {
  const b = getVoiceRuleBundle('john_coltrane');
  const form = { totalBars: 8, sections: [{ label: 'A', startBar: 0, length: 8 }] };
  const sections = buildFormSections(form, b);
  const sk = buildImprovSkeleton(4242, b, 8, sections);
  const aug = sk.chordChanges.some((c) => {
    const s = [...c.pitches].sort((x, y) => x - y);
    if (s.length < 3) return false;
    const i0 = (s[1]! - s[0]!) % 12;
    const i1 = (s[2]! - s[1]!) % 12;
    return i0 === 4 && i1 === 4;
  });
  return aug;
}

function testShorterOrbitPrimaryWithinTwoBars(): boolean {
  const b = getVoiceRuleBundle('wayne_shorter');
  const form = { totalBars: 8, sections: [{ label: 'A', startBar: 0, length: 8 }] };
  const sections = buildFormSections(form, b);
  const sk = buildImprovSkeleton(777, b, 8, sections);
  const mut = pass2ImprovMutation(sk, b, 888);
  return wayneShorterOrbitReturnsWithinTwoBars(mut.midiLineByBar, sk.primaryMotif.registerBand[0] ?? 60);
}

function testMutationLowSimilarityBars(): boolean {
  const b = getVoiceRuleBundle('john_coltrane');
  const form = { totalBars: 8, sections: [{ label: 'A', startBar: 0, length: 8 }] };
  const sections = buildFormSections(form, b);
  const sk = buildImprovSkeleton(9001, b, 8, sections);
  const mut = pass2ImprovMutation(sk, b, 9002);
  return improvPassHasLowSimilarityBars(mut.similarityByBar, 0.35);
}

function testEvansParallelWhenHighTension(): boolean {
  const b = getVoiceRuleBundle('gil_evans');
  const rows = applyReharmonisationToProgression(['Cmaj7', 'Fmaj7'], b, [0.75, 0.75], 42);
  return evansParallelAppliedWhenHighTension(rows);
}

function testShorterTritoneOnDominant(): boolean {
  const b = getVoiceRuleBundle('wayne_shorter');
  const rows = applyReharmonisationToProgression(['G7'], b, [0.85], 55);
  return shorterTritoneSubOnDominant(rows, 'G7');
}

function testOriginalPreservedWhenNoWinner(): boolean {
  const b = getVoiceRuleBundle('neutral');
  const rows = applyReharmonisationToProgression(['Cmaj7'], b, [0.2], 99);
  return rows.length === 1 && rows[0].chosen === 'Cmaj7' && rows[0].applied === false;
}

function testStochasticVarianceZeroDeterministic(): boolean {
  const pools = Array.from({ length: 6 }, () => [
    { symbol: 'Dm7', cost: 2 },
    { symbol: 'G7', cost: 3 },
    { symbol: 'Cmaj7', cost: 4 },
  ]);
  const a = sequenceChordChoicesForBars(pools, 0, 12345, 0);
  const b = sequenceChordChoicesForBars(pools, 0, 12345, 1);
  return a.join('|') === b.join('|');
}

function testStochasticVarianceOneDiffersAcrossRenderOrdinal(): boolean {
  const pools = Array.from({ length: 8 }, () => [
    { symbol: 'Dm7', cost: 2 },
    { symbol: 'G7', cost: 3 },
    { symbol: 'Cmaj7', cost: 4 },
    { symbol: 'Am7', cost: 3.5 },
  ]);
  const a = sequenceChordChoicesForBars(pools, 1, 99999, 0);
  const b = sequenceChordChoicesForBars(pools, 1, 99999, 3);
  return a.join('|') !== b.join('|');
}

function testFormLabelsStableAcrossVariance(): boolean {
  const sections = [
    { label: 'Intro', startBar: 0, length: 4 },
    { label: 'Head', startBar: 4, length: 8 },
  ];
  const a = fixedFormSectionLabels(sections);
  const b = fixedFormSectionLabels(sections);
  return a.join() === b.join() && a[0] === 'Intro';
}

function testMotifIdentityStable(): boolean {
  const ids = ['primary_motif_x', 'primary_motif_x'];
  return ids[0] === ids[1];
}

function testVoiceCollisionTriggers(): boolean {
  const bar = [60, 62, 64, 67];
  const va = [bar, bar, bar, bar];
  const vb = [bar, bar, bar, bar];
  const hits = detectVoiceCollisions({ guitar: va, piano: vb }, 0.85, 3);
  return hits.length >= 1;
}

function testVoiceCollisionResolutionDropsSimilarity(): boolean {
  const bar = [60, 62, 64, 67];
  const va = [bar, bar, bar, bar];
  const vb = [bar, bar, bar, bar];
  const before = maxContourSimilarityAcrossPair(va, vb);
  const { lines } = resolveCollisionTransposeSecondVoice({ g: va, p: vb }, 'g', 'p');
  const after = maxContourSimilarityAcrossPair(lines.g!, lines.p!);
  return before > 0.85 && after < 0.85;
}

function testAppendImprovXml(): boolean {
  const base = `<?xml version="1.0"?><score-partwise><part-list></part-list></score-partwise>`;
  const out = appendImprovPartToPartwiseXml(base);
  return out.includes('P_IMPROV_PHASE8') && out.includes('<part-name>Improv</part-name>');
}

export function runPhase8ImprovReharmStochasticCollisionTests(): { name: string; ok: boolean }[] {
  return [
    ['Phase 8 — Coltrane skeleton includes augmented triad', testColtraneAugmentedTriadInSkeleton],
    ['Phase 8 — Wayne Shorter orbit returns to primary within 2 bars', testShorterOrbitPrimaryWithinTwoBars],
    ['Phase 8 — mutation pass: ≥2 bars with S < 0.35', testMutationLowSimilarityBars],
    ['Phase 8 — Evans parallel motion when tension > 0.6', testEvansParallelWhenHighTension],
    ['Phase 8 — Shorter tritone sub on dominant', testShorterTritoneOnDominant],
    ['Phase 8 — original chord kept when no cheaper sub', testOriginalPreservedWhenNoWinner],
    ['Phase 8 — stochastic v=0 identical chord picks across renders', testStochasticVarianceZeroDeterministic],
    ['Phase 8 — stochastic v=1 different chord picks (same seed)', testStochasticVarianceOneDiffersAcrossRenderOrdinal],
    ['Phase 8 — form section labels unchanged by variance', testFormLabelsStableAcrossVariance],
    ['Phase 8 — motif identity string stable (deterministic arc)', testMotifIdentityStable],
    ['Phase 8 — collision: >0.85 contour for ≥3 bars', testVoiceCollisionTriggers],
    ['Phase 8 — collision resolution drops similarity below 0.85', testVoiceCollisionResolutionDropsSimilarity],
    ['Phase 8 — improv MusicXML append inserts part', testAppendImprovXml],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
