/**
 * Section-aware harmony spine — per-section VRB bundles + boundary voicing carry.
 */

import type { CompositionContext } from '../compositionContext';
import type { FormSection } from '../form/formPlanner';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { VoicingCandidate } from '../composer/voiceLeadingSolver';
import { dominantVrb, type VrbContextMap } from '../counterpoint/vrbProfiles/vrbContextMap';
import { getRampProfileForBar } from '../counterpoint/boundarySwingRamp';
import {
  getBoundaryRampForJoin,
  hasExplicitPerSectionVrbAssignment,
  perSectionVrbResolutionEnabled,
  readSqToBbVrbWire,
  resolveBoundaryRampProfileForBar,
  resolveVrbForBar,
} from '../counterpoint/vrbProfiles/vrbContextResolver';
import { getSqVrbProfile } from '../counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { noteNameToPitchClass, parseChordSymbol } from './chordSymbolAnalysis';
import { getChordForBar } from './harmonyResolution';
import type { ResolvedHarmonyBar } from './harmonySpineProvider';
import { classifyAuthoritativeLayerForBar } from './harmonySpineProvider';
import {
  computeTransitionBarsFromVoicing,
  resolveSectionBoundary,
  type SectionJoin,
} from './sectionBoundaryResolver';

function perSectionSpineEnabled(): boolean {
  return perSectionVrbResolutionEnabled();
}

function voicingFromSymbol(symbol: string): number[] {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/i);
  const name = m?.[1] ?? 'C';
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  const pc = noteNameToPitchClass(key) ?? 0;
  return [pc + 60, pc + 64, pc + 67, pc + 48];
}

function harmonizeBar(
  bar: number,
  context: CompositionContext,
  resolvedVrbId: string,
  previousVoicing: VoicingCandidate | null,
): { row: ResolvedHarmonyBar; voicing: VoicingCandidate } {
  const symbol = getChordForBar(bar, context);
  const layer = classifyAuthoritativeLayerForBar(bar, context);
  const voicing: VoicingCandidate = previousVoicing
    ? { notes: [...previousVoicing.notes], cost: 0 }
    : { notes: voicingFromSymbol(symbol), cost: 0 };
  return {
    row: {
      bar,
      symbol,
      provenance: layer.provenance,
      sliceId: layer.sliceId,
      resolvedVrbId,
      voicing,
    },
    voicing,
  };
}

function buildLegacySpine(context: CompositionContext): ResolvedHarmonyBar[] {
  const total = context.form.totalBars;
  const out: ResolvedHarmonyBar[] = [];
  for (let bar = 1; bar <= total; bar++) {
    const symbol = getChordForBar(bar, context);
    const layer = classifyAuthoritativeLayerForBar(bar, context);
    out.push({
      bar,
      symbol,
      provenance: layer.provenance,
      sliceId: layer.sliceId,
    });
  }
  return out;
}

function sectionVrbId(contextMap: VrbContextMap, section: FormSection): string {
  const ctx = contextMap.get(section.label);
  return ctx ? dominantVrb(ctx) : '';
}

export function chordUsesVrbVocabulary(symbol: string, vrbId: string): boolean {
  const profile = getSqVrbProfile(vrbId);
  if (!profile) return false;
  const bundle = getVoiceRuleBundle(vrbId);
  const tags = bundle?.sqChordVocabulary ?? [...profile.chordVocabulary];
  if (tags.includes('chromatic_mediants') && /bIII|bVI|bII/i.test(symbol)) return true;
  if (tags.includes('tritone_dyad_anchor') && /tr|aug|\+/i.test(symbol)) return true;
  if (tags.includes('modal_aeolian') && /m|min/i.test(symbol)) return true;
  if (tags.includes('triad_skeleton')) return true;
  return tags.length > 0;
}

export function buildSectionAwareHarmonySpine(context: CompositionContext): ResolvedHarmonyBar[] {
  if (!perSectionSpineEnabled() || !hasExplicitPerSectionVrbAssignment(context)) {
    return buildLegacySpine(context);
  }

  const wire = readSqToBbVrbWire(context);
  const sections = [...wire.sections].sort((a, b) => a.startBar - b.startBar);
  const rows: ResolvedHarmonyBar[] = [];
  let previousVoicing: VoicingCandidate | null = null;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]!;
    const fromVrbId = sectionVrbId(wire.contextMap, section) || wire.globalFallback;
    const endBar = section.startBar + section.length - 1;
    const isLastSection = si === sections.length - 1;

    for (let bar = section.startBar; bar <= endBar; bar++) {
      const rampProfile = resolveBoundaryRampProfileForBar(bar, wire.contextMap, sections);
      const barVrbId = rampProfile?.vrbId ?? fromVrbId;
      const { row, voicing } = harmonizeBar(bar, context, barVrbId, previousVoicing);
      if (bar === endBar && !isLastSection) {
        row.isPhraseBoundary = true;
      }
      row.resolvedVrbId = barVrbId;
      const barCtx = resolveVrbForBar(bar, wire.contextMap, wire.globalFallback, sections);
      if (barCtx.isTransitionBar) {
        row.isBoundaryBar = true;
      }
      rows.push(row);
      previousVoicing = voicing;
    }

    if (!isLastSection) {
      const next = sections[si + 1]!;
      const toVrbId = sectionVrbId(wire.contextMap, next) || wire.globalFallback;
      const joinBar = next.startBar;
      const joinSymbol = getChordForBar(joinBar, context);
      const join: SectionJoin = {
        fromSectionId: section.label,
        toSectionId: next.label,
        joinBar,
        fromVrbId,
        toVrbId,
        lastVoicingOfFromSection: previousVoicing ?? { notes: voicingFromSymbol(joinSymbol), cost: 0 },
        transitionBars: computeTransitionBarsFromVoicing(
          previousVoicing ?? { notes: voicingFromSymbol(joinSymbol), cost: 0 },
          toVrbId,
          fromVrbId,
        ),
      };
      const joinRamp = getBoundaryRampForJoin(section.label, next.label, wire.contextMap, sections);
      const joinRampProfile = getRampProfileForBar(joinBar, joinRamp);
      previousVoicing = resolveSectionBoundary(
        join,
        wire.contextMap,
        sections,
        joinSymbol,
        joinRampProfile,
      );
      const joinRow = rows.find((r) => r.bar === joinBar);
      if (joinRow) {
        joinRow.voicing = previousVoicing;
        joinRow.isBoundaryBar = true;
        joinRow.resolvedVrbId = joinRampProfile?.vrbId ?? toVrbId;
      }
    }
  }

  return rows;
}
