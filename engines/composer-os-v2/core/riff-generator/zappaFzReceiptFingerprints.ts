/**
 * Frank Zappa FZ_* receipt fingerprints — detection + score contribution.
 * Promotes 12 of 15 stubs from {@link ../composer/priority3VoiceRuleBundles} `FZ_BASE`
 * (P3 shipped FZ_BURST, FZ_METRIC_SHIFT, FZ_REGISTER_COLLISION).
 */

import type { RiffProfile } from '../composer/riffProfileTypes';
import { chordTonesFromSymbol, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { ScoreModel } from '../score-model/scoreModelTypes';

export const ZAPPA_FZ_STUB_RECEIPT_IDS = [
  'FZ_HARM_01',
  'FZ_HARM_02',
  'FZ_MELO_01',
  'FZ_MELO_02',
  'FZ_RHY_01',
  'FZ_ORCH_01',
  'FZ_DIS_01',
  'FZ_FORM_01',
  'FZ_BASS_01',
  'FZ_GTR_01',
  'FZ_DIFF_01',
  'FZ_DIFF_02',
] as const;

export type ZappaFzStubReceiptId = (typeof ZAPPA_FZ_STUB_RECEIPT_IDS)[number];

export type ZappaFzReceiptDetectInput = {
  score: ScoreModel;
  chords: string[];
  profile?: RiffProfile;
};

export type ZappaFzReceiptFingerprint = {
  id: ZappaFzStubReceiptId;
  detect: (input: ZappaFzReceiptDetectInput) => boolean;
  scoreContribution: (input: ZappaFzReceiptDetectInput) => number;
};

function guitarPart(score: ScoreModel) {
  return (
    score.parts.find((p) => p.id === 'guitar') ??
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')
  );
}

function bassPart(score: ScoreModel) {
  return score.parts.find((p) => p.id === 'bass');
}

function soloPart(score: ScoreModel) {
  return score.parts.find((p) => p.id === 'zappa_solo' || p.id === 'solo');
}

function notePitches(part: ScoreModel['parts'][number] | undefined): number[] {
  if (!part) return [];
  const out: number[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') out.push((e as { pitch: number }).pitch);
    }
  }
  return out;
}

function notesPerBar(part: ScoreModel['parts'][number] | undefined): number[] {
  if (!part) return [];
  return part.measures.map((m) => m.events.filter((e) => e.kind === 'note').length);
}

function slashChordCount(chords: string[]): number {
  return chords.filter((c) => c.includes('/')).length;
}

function outsidePitchRate(score: ScoreModel, chords: string[]): number {
  const solo = soloPart(score) ?? guitarPart(score);
  if (!solo) return 0;
  let total = 0;
  let outside = 0;
  for (const m of solo.measures) {
    const ch = m.chord ?? chords[m.index - 1] ?? chords[0] ?? 'C7';
    const tones = chordTonesFromSymbol(ch);
    const pcs = new Set([tones.root, tones.third, tones.fifth, tones.seventh].map((p) => ((p % 12) + 12) % 12));
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      total++;
      const pc = (((e as { pitch: number }).pitch % 12) + 12) % 12;
      if (!pcs.has(pc)) outside++;
    }
  }
  return total > 0 ? outside / total : 0;
}

function maxRegisterSpread(score: ScoreModel): number {
  const spreads = [guitarPart(score), soloPart(score), bassPart(score)].map((p) => {
    const pitches = notePitches(p);
    if (!pitches.length) return 0;
    return Math.max(...pitches) - Math.min(...pitches);
  });
  return Math.max(0, ...spreads);
}

function phraseStartOffGridRate(part: ScoreModel['parts'][number] | undefined): number {
  if (!part) return 0;
  const starts: number[] = [];
  for (const m of part.measures) {
    let seen = false;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (!seen) {
        starts.push((e as { startBeat: number }).startBeat);
        seen = true;
      }
    }
  }
  if (!starts.length) return 0;
  const off = starts.filter((b) => {
    const frac = ((b % 1) + 1) % 1;
    return frac > 0.08 && frac < 0.92;
  }).length;
  return off / starts.length;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

const FZ_HARM_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_HARM_01',
  detect: ({ chords, profile }) =>
    slashChordCount(chords) >= 1 ||
    (profile?.tritoneStable ?? false) ||
    (profile?.chordQualitySet?.length ?? 0) >= 6,
  scoreContribution: ({ chords, profile }) =>
    clampScore(4 + slashChordCount(chords) * 1.2 + ((profile?.chordQualitySet?.length ?? 0) >= 6 ? 2 : 0)),
};

const FZ_HARM_02: ZappaFzReceiptFingerprint = {
  id: 'FZ_HARM_02',
  detect: ({ profile }) =>
    Object.keys(profile?.scalePool ?? {}).length >= 3 ||
    (profile?.variationOperators?.includes('harmonicColourSwap') ?? false),
  scoreContribution: ({ profile }) =>
    clampScore(4 + Object.keys(profile?.scalePool ?? {}).length * 0.8),
};

const FZ_MELO_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_MELO_01',
  detect: ({ score, profile }) =>
    maxRegisterSpread(score) >= 14 ||
    (profile?.variationOperators?.includes('registerShift') ?? false),
  scoreContribution: ({ score, profile }) =>
    clampScore(4 + maxRegisterSpread(score) / 6 + ((profile?.variationOperators?.length ?? 0) >= 2 ? 1.5 : 0)),
};

const FZ_MELO_02: ZappaFzReceiptFingerprint = {
  id: 'FZ_MELO_02',
  detect: ({ profile }) =>
    (profile?.ornamentPolicy?.graceAttacks ?? false) ||
    (profile?.variationOperators?.includes('ornamentAdd') ?? false),
  scoreContribution: ({ profile }) =>
    clampScore(5 + ((profile?.ornamentPolicy?.graceAttacks ?? false) ? 2 : 0)),
};

const FZ_RHY_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_RHY_01',
  detect: ({ profile }) =>
    (profile?.metricDisplacement ?? 0) >= 0.55 ||
    (profile?.groupingPatterns?.length ?? 0) >= 1,
  scoreContribution: ({ profile }) =>
    clampScore(4 + (profile?.metricDisplacement ?? 0) * 4 + (profile?.groupingPatterns?.length ?? 0)),
};

const FZ_ORCH_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_ORCH_01',
  detect: ({ score, profile }) => {
    const counts = notesPerBar(guitarPart(score));
    const hasDrop =
      counts.length >= 3 &&
      counts.some((c, i) => i > 0 && (counts[i - 1] ?? 0) >= 3 && c <= 1);
    return hasDrop || profile?.ensembleInterlockMode === 'layeredOstinati';
  },
  scoreContribution: ({ score, profile }) => {
    const counts = notesPerBar(guitarPart(score));
    const drops = counts.filter((c, i) => i > 0 && (counts[i - 1] ?? 0) >= 3 && c <= 1).length;
    return clampScore(4 + drops * 1.5 + (profile?.ensembleInterlockMode === 'layeredOstinati' ? 2 : 0));
  },
};

const FZ_DIS_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_DIS_01',
  detect: ({ profile }) =>
    profile?.tritoneStable === true && (profile?.chromaticBudget ?? 0) >= 0.55,
  scoreContribution: ({ score, profile, chords }) =>
    clampScore(
      5 +
        outsidePitchRate(score, chords) * 10 +
        (profile?.chromaticBudget ?? 0) * 3 +
        (profile?.tritoneStable ? 1 : 0)
    ),
};

const FZ_FORM_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_FORM_01',
  detect: ({ profile }) => profile?.repetitionPolicy?.exactLoopAllowed === false,
  scoreContribution: ({ profile }) =>
    clampScore(
      5 +
        (profile?.repetitionPolicy?.exactLoopAllowed === false ? 2 : 0) +
        (1 - (profile?.repetitionPolicy?.barIdentityPersistence ?? 1)) * 4
    ),
};

const FZ_BASS_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_BASS_01',
  detect: ({ profile, score }) =>
    profile?.bassContourPolicy?.melodicCounterpart === true ||
    notePitches(bassPart(score)).length >= 4,
  scoreContribution: ({ profile, score }) => {
    const bass = notePitches(bassPart(score));
    let leaps = 0;
    for (let i = 1; i < bass.length; i++) {
      if (Math.abs(bass[i]! - bass[i - 1]!) >= 5) leaps++;
    }
    return clampScore(
      4 +
        (profile?.bassContourPolicy?.melodicCounterpart ? 2 : 0) +
        (profile?.bassContourPolicy?.octaveJumpProbability ?? 0) * 3 +
        leaps * 0.4
    );
  },
};

const FZ_GTR_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_GTR_01',
  detect: ({ profile }) =>
    (profile?.ornamentPolicy?.slides ?? false) ||
    (profile?.tuningPolicy?.tuningOptions?.zappaCleanToneIslands ?? 0) > 0,
  scoreContribution: ({ profile }) =>
    clampScore(
      4 +
        ((profile?.ornamentPolicy?.slides ?? false) ? 1.5 : 0) +
        ((profile?.tuningPolicy?.tuningOptions?.zappaCleanToneIslands as number | undefined) ?? 0) * 4
    ),
};

const FZ_DIFF_01: ZappaFzReceiptFingerprint = {
  id: 'FZ_DIFF_01',
  detect: ({ profile }) =>
    profile?.spacePolicy?.callResponsePattern === 'zappa_structural_contrast_rest_window',
  scoreContribution: ({ profile, score }) => {
    const ghost = notePitches(guitarPart(score)).filter((p) => p > 0).length;
    return clampScore(
      5 +
        (profile?.spacePolicy?.callResponsePattern === 'zappa_structural_contrast_rest_window' ? 2 : 0) +
        ((profile?.sectionDensityPolicy?.transitions?.length ?? 0) >= 1 ? 1.5 : 0) +
        (ghost > 0 ? 0.5 : 0)
    );
  },
};

const FZ_DIFF_02: ZappaFzReceiptFingerprint = {
  id: 'FZ_DIFF_02',
  detect: ({ profile }) =>
    (profile?.chromaticBudget ?? 0) >= 0.62 &&
    (profile?.variationOperators?.includes('harmonicColourSwap') ?? false),
  scoreContribution: ({ profile, chords, score }) =>
    clampScore(
      4 +
        (profile?.chromaticBudget ?? 0) * 4 +
        outsidePitchRate(score, chords) * 8 +
        ((profile?.metricDisplacement ?? 0) >= 0.8 ? 1.5 : 0)
    ),
};

export const ZAPPA_FZ_RECEIPT_FINGERPRINTS: Record<ZappaFzStubReceiptId, ZappaFzReceiptFingerprint> = {
  FZ_HARM_01,
  FZ_HARM_02,
  FZ_MELO_01,
  FZ_MELO_02,
  FZ_RHY_01,
  FZ_ORCH_01,
  FZ_DIS_01,
  FZ_FORM_01,
  FZ_BASS_01,
  FZ_GTR_01,
  FZ_DIFF_01,
  FZ_DIFF_02,
};

export function detectZappaFzReceipt(id: ZappaFzStubReceiptId, input: ZappaFzReceiptDetectInput): boolean {
  return ZAPPA_FZ_RECEIPT_FINGERPRINTS[id].detect(input);
}

export function scoreZappaFzReceiptContribution(
  id: ZappaFzStubReceiptId,
  input: ZappaFzReceiptDetectInput
): number {
  return ZAPPA_FZ_RECEIPT_FINGERPRINTS[id].scoreContribution(input);
}

export function scoreZappaFzReceiptBundle(
  ids: readonly ZappaFzStubReceiptId[],
  input: ZappaFzReceiptDetectInput
): { mean: number; byId: Record<string, number> } {
  const byId: Record<string, number> = {};
  let sum = 0;
  for (const id of ids) {
    const s = scoreZappaFzReceiptContribution(id, input);
    byId[id] = s;
    sum += s;
  }
  return { mean: ids.length ? Math.round((sum / ids.length) * 10) / 10 : 0, byId };
}

/** Profile patch field expectations for promoted stub receipts (golden tests). */
export function profileFieldCheckForFzReceipt(id: ZappaFzStubReceiptId, profile: RiffProfile | undefined): boolean {
  if (!profile) return false;
  switch (id) {
    case 'FZ_HARM_01':
      return (profile.chordQualitySet?.length ?? 0) >= 6 && profile.tritoneStable === true;
    case 'FZ_HARM_02':
      return Object.keys(profile.scalePool ?? {}).length >= 3;
    case 'FZ_MELO_01':
      return (profile.variationOperators?.length ?? 0) >= 2;
    case 'FZ_MELO_02':
      return profile.ornamentPolicy?.graceAttacks === true;
    case 'FZ_RHY_01':
      return (profile.metricDisplacement ?? 0) >= 0.55;
    case 'FZ_ORCH_01':
      return profile.ensembleInterlockMode === 'layeredOstinati';
    case 'FZ_DIS_01':
      return profile.tritoneStable === true && (profile.chromaticBudget ?? 0) >= 0.55;
    case 'FZ_FORM_01':
      return profile.repetitionPolicy?.exactLoopAllowed === false;
    case 'FZ_BASS_01':
      return profile.bassContourPolicy?.melodicCounterpart === true;
    case 'FZ_GTR_01':
      return profile.ornamentPolicy?.slides === true;
    case 'FZ_DIFF_01':
      return profile.spacePolicy?.callResponsePattern === 'zappa_structural_contrast_rest_window';
    case 'FZ_DIFF_02':
      return (profile.chromaticBudget ?? 0) >= 0.62;
    default:
      return false;
  }
}

export function chordSymbolHasPolytonalHint(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  return hp.includes('/') || /\+/.test(hp) || /maj\+/.test(hp);
}
