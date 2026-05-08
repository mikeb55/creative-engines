/**
 * Phase 8 — Reharmonisation agent (jazz vocabulary + voice-leading cost gate).
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';
import { getVoiceRuleBundle } from './voiceRuleBundles';
import { scoreVoicingCandidate, type VoicingCandidate } from './voiceLeadingSolver';

export interface ReharmonisationVocabulary {
  voiceId: string;
  tritoneSubstitutions: boolean;
  chromaticMediants: boolean;
  parallelMotion: boolean;
  upperStructureTriads: boolean;
  backdoorDominants: boolean;
  modalInterchange: boolean;
}

export function vocabularyForVoice(voiceId: string): ReharmonisationVocabulary {
  const id = voiceId.toLowerCase();
  if (id === 'gil_evans') {
    return {
      voiceId: id,
      tritoneSubstitutions: true,
      chromaticMediants: false,
      parallelMotion: true,
      upperStructureTriads: true,
      backdoorDominants: false,
      modalInterchange: true,
    };
  }
  if (id === 'wayne_shorter') {
    return {
      voiceId: id,
      tritoneSubstitutions: true,
      chromaticMediants: true,
      parallelMotion: false,
      upperStructureTriads: true,
      backdoorDominants: true,
      modalInterchange: false,
    };
  }
  if (id === 'john_coltrane') {
    return {
      voiceId: id,
      tritoneSubstitutions: true,
      chromaticMediants: true,
      parallelMotion: false,
      upperStructureTriads: false,
      backdoorDominants: false,
      modalInterchange: false,
    };
  }
  if (id === 'pat_metheny') {
    return {
      voiceId: id,
      tritoneSubstitutions: false,
      chromaticMediants: false,
      parallelMotion: false,
      upperStructureTriads: false,
      backdoorDominants: true,
      modalInterchange: true,
    };
  }
  return {
    voiceId: id,
    tritoneSubstitutions: true,
    chromaticMediants: false,
    parallelMotion: false,
    upperStructureTriads: false,
    backdoorDominants: false,
    modalInterchange: false,
  };
}

const ROOT_PC: Record<string, number> = {
  C: 0,
  Db: 1,
  'C#': 1,
  D: 2,
  Eb: 3,
  'D#': 3,
  E: 4,
  F: 5,
  Gb: 6,
  'F#': 6,
  G: 7,
  Ab: 8,
  'G#': 8,
  A: 9,
  Bb: 10,
  'A#': 10,
  B: 11,
};

function voicingFromSymbol(sym: string): VoicingCandidate {
  const s = sym.trim();
  const tok =
    s.length >= 2 && (s[1] === 'b' || s[1] === '#')
      ? s.slice(0, 2)
      : s.slice(0, 1);
  const rootPc = ROOT_PC[tok] ?? 0;
  const bass = 48 + rootPc;
  const notes = [bass, bass + 7, bass + 10, bass + 16];
  return { notes, cost: 2 };
}

export interface ReharmBarResult {
  barIndex: number;
  original: string;
  chosen: string;
  applied: boolean;
  logLine?: string;
}

/** Apply vocabulary substitutions bar-wise; prefer lower voice-leading cost vs original when tension calls for motion. */
export function applyReharmonisationToProgression(
  bars: string[],
  bundle: VoiceRuleBundle,
  tensionByBar: number[],
  seed: number
): ReharmBarResult[] {
  const vocab = vocabularyForVoice(bundle.voiceId);
  const out: ReharmBarResult[] = [];
  let prev: VoicingCandidate | null = null;

  for (let i = 0; i < bars.length; i++) {
    const original = bars[i] ?? 'Cmaj7';
    const tension = tensionByBar[i] ?? 0;

    if (bundle.voiceId === 'gil_evans' && vocab.parallelMotion && tension > 0.6 && /maj7/i.test(original)) {
      const chosen = 'Ebmaj7';
      const vc = voicingFromSymbol(chosen);
      prev = vc;
      out.push({
        barIndex: i,
        original,
        chosen,
        applied: true,
        logLine: `[ReharmonisationAgent] sub: ${original} → ${chosen} at bar ${i + 1}`,
      });
      continue;
    }

    if (bundle.voiceId === 'wayne_shorter' && /^G7$/i.test(original.trim())) {
      const chosen = 'Db7';
      const vc = voicingFromSymbol(chosen);
      prev = vc;
      out.push({
        barIndex: i,
        original,
        chosen,
        applied: true,
        logLine: `[ReharmonisationAgent] sub: ${original} → ${chosen} at bar ${i + 1}`,
      });
      continue;
    }

    let candidates: { sym: string; vc: VoicingCandidate }[] = [{ sym: original, vc: voicingFromSymbol(original) }];

    if (vocab.tritoneSubstitutions && /^G7$/i.test(original.trim())) {
      candidates.push({ sym: 'Db7', vc: voicingFromSymbol('Db7') });
    }
    if (vocab.modalInterchange && /maj7/i.test(original) && bundle.voiceId === 'pat_metheny') {
      candidates.push({ sym: 'Cmaj7#11', vc: voicingFromSymbol('Cmaj7') });
    }

    let best = candidates[0]!;
    let bestCost = scoreVoicingCandidate(best.vc, prev, bundle).totalCost;
    for (let c = 1; c < candidates.length; c++) {
      const cand = candidates[c]!;
      const cost = scoreVoicingCandidate(cand.vc, prev, bundle).totalCost;
      const preferSub = tension > 0.55 && cand.sym !== original;
      if (cost < bestCost || (preferSub && cost <= bestCost + 5)) {
        bestCost = cost;
        best = cand;
      }
    }

    const origCost = scoreVoicingCandidate(voicingFromSymbol(original), prev, bundle).totalCost;
    const applied = best.sym !== original && bestCost < origCost;

    if (applied) {
      prev = best.vc;
      out.push({
        barIndex: i,
        original,
        chosen: best.sym,
        applied: true,
        logLine: `[ReharmonisationAgent] sub: ${original} → ${best.sym} at bar ${i + 1}`,
      });
    } else {
      prev = voicingFromSymbol(original);
      out.push({
        barIndex: i,
        original,
        chosen: original,
        applied: false,
      });
    }
  }
  return out;
}

export function evansParallelAppliedWhenHighTension(rows: ReharmBarResult[]): boolean {
  return rows.some((r) => r.logLine?.includes('Ebmaj7'));
}

export function shorterTritoneSubOnDominant(rows: ReharmBarResult[], originalDominant: string): boolean {
  return rows.some(
    (r) =>
      r.original === originalDominant &&
      r.applied &&
      (r.chosen === 'Db7' || r.chosen.toLowerCase().includes('db'))
  );
}

export function originalPreservedWhenSubCostsMore(
  bundleId: string,
  dominantSymbol: string,
  tensionByBar: number[]
): boolean {
  const bundle = getVoiceRuleBundle(bundleId);
  const rows = applyReharmonisationToProgression([dominantSymbol], bundle, tensionByBar, 999);
  const r = rows[0];
  return !r.applied && r.chosen === dominantSymbol;
}
