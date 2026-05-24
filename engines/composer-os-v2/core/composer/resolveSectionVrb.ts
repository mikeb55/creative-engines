/**
 * Per-bar VoiceRuleBundle resolution from {@link SectionMarker} overrides (all modes).
 */

import type { CompositionContext } from '../compositionContext';
import { mergeRiffProfilePatch } from '../riff-generator/riffReceiptCompiler';
import type { SectionMarker, VrbParams } from './sectionMarkerTypes';
import { sectionMarkerCoversBar } from './sectionMarkerTypes';
import type { VoiceRuleBundle } from './voiceRuleBundle';

const SONIC_YOUTH_SECTION_B_OVERRIDES: Partial<VrbParams> = {
  riffProfile: {
    chromaticBudget: 0.72,
    metricDisplacement: 0.83,
  },
  rhythmPolicy: { antiMetric: true },
  slonimsky: {
    elevateReceiptIds: ['SY_SLON_01'],
    catalogueSection: 'ditone_progression',
    allowedOutsideLevel: 2,
    phraseIntent: 'shock',
  },
};

export function hasSectionMarkerVrbAssignment(context: CompositionContext): boolean {
  const markers = context.sectionMarkers;
  if (!markers?.length) return false;
  return markers.some((m) => m.vrbOverrides && Object.keys(m.vrbOverrides).length > 0);
}

export function resolveSectionMarkerForBar(
  bar: number,
  markers: readonly SectionMarker[] | undefined,
): SectionMarker | undefined {
  if (!markers?.length) return undefined;
  return markers.find((m) => sectionMarkerCoversBar(m, bar));
}

export function mergeVoiceRuleBundleWithOverrides(
  base: VoiceRuleBundle,
  overrides: Partial<VrbParams> | undefined,
): VoiceRuleBundle {
  if (!overrides || Object.keys(overrides).length === 0) return base;

  const out: VoiceRuleBundle = { ...base };
  if (overrides.harmonicRhythm) {
    out.harmonicRhythm = { ...base.harmonicRhythm, ...overrides.harmonicRhythm };
  }
  if (overrides.bassPolicy) {
    out.bassPolicy = { ...base.bassPolicy, ...overrides.bassPolicy };
  }
  if (overrides.voicingPolicy) {
    out.voicingPolicy = { ...base.voicingPolicy, ...overrides.voicingPolicy };
  }
  if (overrides.melodicPolicy) {
    out.melodicPolicy = { ...base.melodicPolicy, ...overrides.melodicPolicy };
  }
  if (overrides.rhythmPolicy) {
    out.rhythmPolicy = { ...base.rhythmPolicy, ...overrides.rhythmPolicy };
  }
  if (overrides.orchestrationPolicy) {
    out.orchestrationPolicy = { ...base.orchestrationPolicy, ...overrides.orchestrationPolicy };
  }
  if (overrides.formPolicy) {
    out.formPolicy = { ...base.formPolicy, ...overrides.formPolicy };
  }
  if (overrides.repairPolicy) {
    out.repairPolicy = { ...base.repairPolicy, ...overrides.repairPolicy };
  }
  if (overrides.riffProfile && base.riffProfile) {
    out.riffProfile = mergeRiffProfilePatch(base.riffProfile, overrides.riffProfile);
  }
  return out;
}

export function resolveSectionVrbOverridesForBar(
  context: CompositionContext,
  bar: number,
): Partial<VrbParams> | undefined {
  const marker = resolveSectionMarkerForBar(bar, context.sectionMarkers);
  return marker?.vrbOverrides;
}

export function resolveVoiceRuleBundleForBar(
  context: CompositionContext,
  bar: number,
): VoiceRuleBundle | undefined {
  const base = context.voiceBundle;
  if (!base) return undefined;
  const overrides = resolveSectionVrbOverridesForBar(context, bar);
  return mergeVoiceRuleBundleWithOverrides(base, overrides);
}

/** Song Mode sonic_youth — default A/B section markers when none supplied. */
export function attachDefaultSonicYouthSectionMarkers(context: CompositionContext): void {
  const meta = context.generationMetadata;
  if (meta.songwriterStyleId !== 'sonic_youth') return;
  if (context.sectionMarkers?.length) return;

  const tb = context.form.totalBars;
  if (tb < 8) return;

  const endA = Math.min(4, tb);
  const startB = endA + 1;
  const endB = Math.min(8, tb);
  if (startB > endB) return;

  context.sectionMarkers = [
    {
      id: 'sy_section_a',
      label: 'A',
      startBar: 1,
      endBar: endA,
      vrbOverrides: {},
    },
    {
      id: 'sy_section_b',
      label: 'B',
      startBar: startB,
      endBar: endB,
      vrbOverrides: SONIC_YOUTH_SECTION_B_OVERRIDES,
    },
  ];

  meta.sectionVrbMarkerReceipt =
    'sonic_youth:per-section A=base SONIC_YOUTH; B=SY_SLON_01+chromaticBudget0.72+metricDisplacement+0.15+antiMetric';
}

/** Resolve base bundle id then merge section overrides (SQ→BB whole-id swap remains separate). */
export function resolveEffectiveVrbIdForBar(context: CompositionContext, bar: number): string | undefined {
  const bundle = resolveVoiceRuleBundleForBar(context, bar);
  return bundle?.voiceId ?? context.voiceBundle?.voiceId;
}

export function resolveSlonimskyParamsForBar(
  context: CompositionContext,
  bar: number,
): Partial<NonNullable<VrbParams['slonimsky']>> | undefined {
  return resolveSectionVrbOverridesForBar(context, bar)?.slonimsky;
}
