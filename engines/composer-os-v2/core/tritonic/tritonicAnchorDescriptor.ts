/**
 * V105p3 — AnchorDescriptor: Wyble harmony bar → Tritonic bias steering.
 * Always-on — no feature flag.
 */

import {
  chordTonesForChordSymbol,
  normalizeChordSymbol,
  noteNameToPitchClass,
  parseChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import type { MusicContext } from '../music-context/musicContextTypes';
import type { TritonicBehaviourBiases } from './tritonicBehaviourBiases';
import { NEUTRAL_TRITONIC_BEHAVIOUR_BIAS, resolveTritonicBehaviourBiases } from './tritonicBehaviourBiases';
import type { TritonicCellFamily } from './tritonicCell';

export type VoicingDensity = 'shell' | 'drop2' | 'open' | 'extension_dense';

export type TopNoteTendency = 'guide_tone' | 'extension' | 'root' | 'colour';

export type AnchorDescriptor = {
  normalizedSymbol: string;
  root: string;
  qualityFamily: string;
  extensionSet: readonly string[];
  alterationSet: readonly string[];
  guideTones: readonly number[];
  topNoteTendency: TopNoteTendency;
  voicingDensity: VoicingDensity;
  cadenceWeight: number;
};

const EXTENSION_TOKENS = ['9', '11', '13', '#11', 'b13', '#9', 'b9', '#5', 'add9', 'add11'] as const;
const ALTERATION_TOKENS = ['alt', 'b9', '#9', 'b5', '#5', '#11', 'b13', '#11'] as const;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function mergeBias(base: TritonicBehaviourBiases, delta: Partial<TritonicBehaviourBiases>): TritonicBehaviourBiases {
  const out = { ...base };
  for (const key of Object.keys(delta) as (keyof TritonicBehaviourBiases)[]) {
    const v = delta[key];
    if (v !== undefined) out[key] = clamp01(v);
  }
  return out;
}

function qualityFamilyFromSymbol(normalized: string): string {
  const h = normalized.toLowerCase();
  if (/7alt|alt/.test(h)) return 'dominant_altered';
  if (/maj7#11|maj7#4|Δ#11/.test(h)) return 'lydian_major';
  if (/m7b5|ø|half/.test(h)) return 'half_diminished';
  if (/7sus4|sus4|sus2|sus/.test(h)) return 'suspended';
  if (/maj7|maj9|Δ|maj/.test(h)) return 'major_seventh';
  if (/m7|min7|m9|min/.test(h)) return 'minor_seventh';
  if (/7|9|11|13/.test(h)) return 'dominant';
  return 'triad';
}

function extractTokens(normalized: string, tokens: readonly string[]): string[] {
  const h = normalized.toLowerCase();
  return tokens.filter((t) => h.includes(t.toLowerCase()));
}

function voicingDensityFromSymbol(normalized: string, wybleCtx?: MusicContext): VoicingDensity {
  const extensions = extractTokens(normalized, EXTENSION_TOKENS);
  const alterations = extractTokens(normalized, ALTERATION_TOKENS);
  if (extensions.length >= 2 || alterations.length >= 2 || /13|11|9/.test(normalized)) {
    return 'extension_dense';
  }
  if (/sus|add/.test(normalized.toLowerCase())) return 'open';
  if (/^([A-G][#b]?)(maj7|m7|7|m)$/.test(normalized.replace(/\/.*/, ''))) return 'shell';
  if (wybleCtx?.tuning) return 'drop2';
  return 'open';
}

function topNoteTendencyFromDescriptor(
  qualityFamily: string,
  voicingDensity: VoicingDensity,
): TopNoteTendency {
  if (qualityFamily === 'dominant_altered') return 'colour';
  if (qualityFamily === 'lydian_major' || voicingDensity === 'extension_dense') return 'extension';
  if (voicingDensity === 'shell') return 'guide_tone';
  return 'extension';
}

function cadenceWeightFromQuality(qualityFamily: string): number {
  switch (qualityFamily) {
    case 'dominant':
    case 'dominant_altered':
      return 0.85;
    case 'major_seventh':
      return 0.7;
    case 'half_diminished':
      return 0.55;
    case 'minor_seventh':
      return 0.45;
    case 'suspended':
      return 0.35;
    default:
      return 0.5;
  }
}

function guideTonesFromSymbol(normalized: string): number[] {
  const tones = chordTonesForChordSymbol(normalized, { lockedHarmony: true });
  const pcs = [tones.third, tones.seventh]
    .map((m) => ((m % 12) + 12) % 12)
    .filter((pc, i, arr) => arr.indexOf(pc) === i);
  return pcs;
}

/** Parse one Wyble harmony bar into a full AnchorDescriptor (voicing profile preserved). */
export function anchorDescriptorFromWybleBar(
  symbol: string,
  wybleCtx?: MusicContext,
): AnchorDescriptor {
  const normalizedSymbol = normalizeChordSymbol(symbol);
  const parsed = parseChordSymbol(normalizedSymbol);
  const rootMatch = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const root = rootMatch?.[1]
    ? rootMatch[1][0]!.toUpperCase() + rootMatch[1].slice(1)
    : 'C';
  const qualityFamily = qualityFamilyFromSymbol(normalizedSymbol);
  const extensionSet = extractTokens(normalizedSymbol, EXTENSION_TOKENS);
  const alterationSet = extractTokens(normalizedSymbol, ALTERATION_TOKENS);
  const voicingDensity = voicingDensityFromSymbol(normalizedSymbol, wybleCtx);
  return {
    normalizedSymbol,
    root,
    qualityFamily,
    extensionSet,
    alterationSet,
    guideTones: guideTonesFromSymbol(normalizedSymbol),
    topNoteTendency: topNoteTendencyFromDescriptor(qualityFamily, voicingDensity),
    voicingDensity,
    cadenceWeight: cadenceWeightFromQuality(qualityFamily),
  };
}

export function anchorDescriptorsFromWybleContext(wybleCtx: MusicContext): AnchorDescriptor[] {
  return wybleCtx.harmony.bars.map((bar) => anchorDescriptorFromWybleBar(bar, wybleCtx));
}

/** Map anchor shape → incremental behaviour bias steering (merged, not reset). */
export function behaviourBiasesFromAnchorDescriptor(
  descriptor: AnchorDescriptor,
  base?: Partial<TritonicBehaviourBiases>,
): TritonicBehaviourBiases {
  let biases = resolveTritonicBehaviourBiases(base);
  const sym = descriptor.normalizedSymbol.toLowerCase();

  if (/7alt|alt/.test(sym) || descriptor.qualityFamily === 'dominant_altered') {
    biases = mergeBias(biases, {
      tension: biases.tension + 0.18,
      resolutionDelay: biases.resolutionDelay + 0.15,
      cadenceAvoidance: biases.cadenceAvoidance + 0.12,
      contourBias: biases.contourBias + 0.08,
    });
  }

  if (/maj7#11|#11/.test(sym) || descriptor.qualityFamily === 'lydian_major') {
    biases = mergeBias(biases, {
      registralSpread: biases.registralSpread + 0.14,
      contourBias: biases.contourBias + 0.1,
      anchorAdhesion: biases.anchorAdhesion - 0.06,
    });
  }

  if (/m7b5|ø/.test(sym) || descriptor.qualityFamily === 'half_diminished') {
    biases = mergeBias(biases, {
      tension: biases.tension + 0.12,
      registralSpread: biases.registralSpread - 0.14,
      density: biases.density + 0.08,
      cadenceAvoidance: biases.cadenceAvoidance + 0.06,
    });
  }

  if (descriptor.voicingDensity === 'shell') {
    biases = mergeBias(biases, {
      registralSpread: biases.registralSpread + 0.12,
      anchorAdhesion: biases.anchorAdhesion + 0.1,
      motifSingability: biases.motifSingability + 0.05,
    });
  }

  if (descriptor.voicingDensity === 'extension_dense') {
    biases = mergeBias(biases, {
      density: biases.density + 0.1,
      anchorAdhesion: biases.anchorAdhesion - 0.12,
      motifSingability: biases.motifSingability - 0.08,
    });
  }

  if (descriptor.voicingDensity === 'drop2' || descriptor.voicingDensity === 'open') {
    biases = mergeBias(biases, {
      registralSpread: biases.registralSpread + 0.08,
      anchorAdhesion: biases.anchorAdhesion - 0.04,
    });
  }

  biases = mergeBias(biases, {
    cadenceAvoidance:
      biases.cadenceAvoidance + (descriptor.cadenceWeight - NEUTRAL_TRITONIC_BEHAVIOUR_BIAS) * 0.2,
  });

  return biases;
}

/** Preferred cell families per anchor profile (phrase-level pool nudge). */
export function preferredCellFamiliesForAnchor(descriptor: AnchorDescriptor): TritonicCellFamily[] {
  const sym = descriptor.normalizedSymbol.toLowerCase();
  if (/7alt|alt/.test(sym)) return ['cluster', 'bergonzi'];
  if (/maj7#11|#11/.test(sym)) return ['suspended', 'quartal', 'shorter_floating'];
  if (/m7b5|ø/.test(sym)) return ['cluster', 'bergonzi'];
  if (descriptor.voicingDensity === 'shell') return ['shorter_floating', 'bergonzi', 'quartal'];
  if (descriptor.voicingDensity === 'extension_dense') return ['suspended', 'quartal', 'cluster'];
  return ['suspended', 'shorter_floating', 'quartal'];
}

export function rootPcFromAnchorDescriptor(descriptor: AnchorDescriptor): number {
  return noteNameToPitchClass(descriptor.root) ?? 0;
}
