/**
 * VRB composer + gate tooltip data and formatters (chunk 4).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSqVrbGceAdjustments } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { getVrbFamily } from '../core/counterpoint/vrbProfiles/vrbFamilies';
import {
  GATE_EXPLANATIONS,
  type GateKey,
} from '../ui/gateTooltips';
import {
  SQ_TO_BB_SQ_COMPOSER_OPTIONS,
  SQ_TO_BB_SQ_COMPOSER_VRB_IDS,
  type SqComposerOption,
} from '../ui/sqToBbWorkflowUi';
import {
  formatVrbTooltipTitle,
  vrbTooltipBodyLines,
} from '../ui/vrbTooltipFormat';

const GATE_KEYS: GateKey[] = [
  'register',
  'swing',
  'anti_metric',
  'blend',
  'boundary_ramp',
  'silence',
];

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function composerOptions(): SqComposerOption[] {
  return SQ_TO_BB_SQ_COMPOSER_OPTIONS.filter((o): o is SqComposerOption & { id: string } => o.id != null);
}

function testAll19HaveDescription(): boolean {
  const opts = composerOptions();
  return opts.length === 19 && opts.every((o) => o.description.trim().length > 0);
}

function testDescriptionsMax12Words(): boolean {
  return composerOptions().every((o) => wordCount(o.description) <= 12);
}

function testAll19HaveFamily(): boolean {
  return composerOptions().every((o) => o.family != null);
}

function testAll19SigmaPositive(): boolean {
  return composerOptions().every((o) => o.sigma > 0);
}

function testSigmaFromRegistrySpotCheck(): boolean {
  return (
    composerOptions().find((o) => o.id === 'arvo_part')?.sigma ===
      getSqVrbGceAdjustments('arvo_part')?.registerCohesionStdevCeilingSt &&
    composerOptions().find((o) => o.id === 'webern')?.sigma ===
      getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt &&
    composerOptions().find((o) => o.id === 'bartok')?.sigma ===
      getSqVrbGceAdjustments('bartok')?.registerCohesionStdevCeilingSt
  );
}

function testFamilyMatchesGetVrbFamily(): boolean {
  return composerOptions().every((o) => getVrbFamily(o.id!) === o.family);
}

function testGateExplanationsAllKeys(): boolean {
  return GATE_KEYS.every((k) => typeof GATE_EXPLANATIONS[k] === 'string');
}

function testGateExplanationsMax10Words(): boolean {
  return GATE_KEYS.every((k) => wordCount(GATE_EXPLANATIONS[k]) <= 10);
}

function testVrbTooltipRendersLabelAndDescription(): boolean {
  const o = composerOptions().find((x) => x.id === 'debussy');
  if (!o) return false;
  const title = formatVrbTooltipTitle(o);
  const body = vrbTooltipBodyLines(o);
  return title.includes(o.label) && title.includes(o.description) && body.description === o.description;
}

function testVrbTooltipRendersFamilyTag(): boolean {
  const o = composerOptions().find((x) => x.id === 'ravel');
  if (!o) return false;
  const body = vrbTooltipBodyLines(o);
  return body.familyTag === 'impressionist';
}

function testVrbTooltipRendersSigma(): boolean {
  const o = composerOptions().find((x) => x.id === 'bartok');
  if (!o) return false;
  const body = vrbTooltipBodyLines(o);
  return body.sigmaLabel === `σ ${o.sigma}`;
}

function testGateTooltipIconInSource(): boolean {
  const src = readFileSync(join(__dirname, '../ui/components/GateTooltip.tsx'), 'utf8');
  return src.includes('ⓘ');
}

function testGateTooltipExplanationOnHover(): boolean {
  const src = readFileSync(join(__dirname, '../ui/components/GateTooltip.tsx'), 'utf8');
  return src.includes('title={explanation}') && src.includes('{explanation}');
}

function testNoEmptyDescriptions(): boolean {
  return composerOptions().every((o) => o.description.trim().length > 0);
}

function testNoEmptyGateExplanations(): boolean {
  return GATE_KEYS.every((k) => GATE_EXPLANATIONS[k].trim().length > 0);
}

function testVrbIdListCount19(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_VRB_IDS.length === 19;
}

export function runVrbTooltipsTests(): { name: string; ok: boolean }[] {
  return [
    ['all 19 vrbIds have description', testAll19HaveDescription],
    ['all descriptions ≤ 12 words', testDescriptionsMax12Words],
    ['all 19 entries have family', testAll19HaveFamily],
    ['all 19 entries sigma > 0', testAll19SigmaPositive],
    ['sigma from registry spot-check', testSigmaFromRegistrySpotCheck],
    ['getVrbFamily matches family field', testFamilyMatchesGetVrbFamily],
    ['GATE_EXPLANATIONS has 6 keys', testGateExplanationsAllKeys],
    ['gate explanations ≤ 10 words', testGateExplanationsMax10Words],
    ['VrbTooltip title has label + description', testVrbTooltipRendersLabelAndDescription],
    ['VrbTooltip body family tag', testVrbTooltipRendersFamilyTag],
    ['VrbTooltip body sigma', testVrbTooltipRendersSigma],
    ['GateTooltip ⓘ icon in source', testGateTooltipIconInSource],
    ['GateTooltip explanation on hover', testGateTooltipExplanationOnHover],
    ['no empty composer descriptions', testNoEmptyDescriptions],
    ['no empty gate explanations', testNoEmptyGateExplanations],
    ['SQ_TO_BB_SQ_COMPOSER_VRB_IDS count 19', testVrbIdListCount19],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
