/**
 * Phase 6+7 — discrete guitar voicing candidates (6 strings), span + parallel fifth guards.
 */

import { scoreVoicingCandidate, type VoicingCandidate } from './voiceLeadingSolver';
import { getVoiceRuleBundle } from './voiceRuleBundles';
import type { VoiceRuleBundle } from './voiceRuleBundle';
import type { CompositionContext } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { chordTonesForChordSymbolWithContext } from '../harmony/harmonyChordTonePolicy';

export interface GuitarVoicing {
  chordId: string;
  frets: number[];
  fingers: number[];
  barreAt?: number;
  spanFrets: number;
  midiNotes: number[];
}

/** Standard tuning MIDI open strings low→high. */
export const GUITAR_STANDARD_OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] as const;

const OPEN_MIDI = GUITAR_STANDARD_OPEN_STRING_MIDI;

function midiFromFret(stringIdx: number, fret: number): number | null {
  if (fret < 0) return null;
  return OPEN_MIDI[stringIdx]! + fret;
}

function spanOf(frets: number[]): number {
  const voiced = frets.filter((f) => f >= 0);
  if (voiced.length < 2) return 0;
  return Math.max(...voiced) - Math.min(...voiced);
}

function parallelFifthPairs(midis: number[]): number {
  let bad = 0;
  for (let i = 0; i < midis.length; i++) {
    for (let j = i + 1; j < midis.length; j++) {
      const ic = Math.abs(midis[i]! - midis[j]!) % 12;
      if (ic === 7) bad++;
    }
  }
  return bad;
}

/** Enumerate simple shell voicings on lowest strings (deterministic pool). */
export function guitarVoicingFromFrets(chordId: string, frets: number[]): GuitarVoicing {
  const midiNotes: number[] = [];
  for (let s = 0; s < 6; s++) {
    const f = frets[s]!;
    if (f >= 0) midiNotes.push(OPEN_MIDI[s]! + f);
  }
  const voiced = frets.filter((f) => f >= 0);
  const span = voiced.length >= 2 ? Math.max(...voiced) - Math.min(...voiced) : 0;
  return {
    chordId,
    frets,
    fingers: frets.map((f) => (f < 0 ? 0 : Math.min(4, 1 + (f % 4)))),
    spanFrets: span,
    midiNotes,
  };
}

export function buildGuitarVoicingCandidates(chordId: string, pcs: number[]): GuitarVoicing[] {
  const pool: GuitarVoicing[] = [];
  const targets = [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))];
  for (let rootFret = 0; rootFret <= 12; rootFret++) {
    const frets = [-1, -1, -1, -1, -1, -1] as unknown as number[];
    frets[5] = rootFret;
    const rootMidi = midiFromFret(5, rootFret);
    if (rootMidi === null) continue;
    const rootPc = rootMidi % 12;
    for (const t of targets) {
      const want = (rootPc + t) % 12;
      for (let s = 0; s < 6; s++) {
        for (let f = 0; f <= 14; f++) {
          const m = midiFromFret(s, f);
          if (m !== null && m % 12 === want && frets[s] === -1) {
            frets[s] = f;
            break;
          }
        }
      }
    }
    const midiNotes: number[] = [];
    const outF: number[] = [];
    const fingers: number[] = [];
    for (let s = 0; s < 6; s++) {
      const fr = frets[s]!;
      if (fr < 0) {
        outF.push(-1);
        fingers.push(0);
        continue;
      }
      const mm = midiFromFret(s, fr)!;
      midiNotes.push(mm);
      outF.push(fr);
      fingers.push(Math.min(4, 1 + (fr % 4)));
    }
    const span = spanOf(outF);
    pool.push({
      chordId,
      frets: outF,
      fingers,
      spanFrets: span,
      midiNotes,
    });
  }
  return pool;
}

export function filterVoicingsByMaxSpan(v: GuitarVoicing[], maxSpan: number): GuitarVoicing[] {
  return v.filter((x) => x.spanFrets <= maxSpan);
}

export function scoreGuitarVoicing(
  v: GuitarVoicing,
  prev: VoicingCandidate | null,
  bundle: VoiceRuleBundle,
  chordSymbol: string
): number {
  const vc: VoicingCandidate = { notes: v.midiNotes.length ? v.midiNotes : [48, 55, 60], cost: 0 };
  const base = scoreVoicingCandidate(vc, prev, bundle).totalCost;
  let extra = parallelFifthPairs(v.midiNotes) * 40;
  const sym = chordSymbol.toLowerCase();
  if (bundle.voiceId === 'pat_metheny' && bundle.voicingPolicy.lydianMaj7Sharp11Default) {
    if (/maj7(?!#11)/i.test(sym) && !/#11/i.test(sym)) extra += 35;
    else if (/maj7#11|lyd/i.test(sym)) extra -= 22;
  }
  return base + extra;
}

export function pickBestGuitarVoicing(
  candidates: GuitarVoicing[],
  prev: VoicingCandidate | null,
  bundle: VoiceRuleBundle,
  chordSymbol: string
): GuitarVoicing | undefined {
  let best: GuitarVoicing | undefined;
  let bestCost = Infinity;
  for (const c of candidates) {
    const cost = scoreGuitarVoicing(c, prev, bundle, chordSymbol);
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}

/** Minimal tab technical fragment for validation / exporter hints. */
export function guitarVoicingToTechnicalXmlFragments(v: GuitarVoicing): string {
  const parts: string[] = [];
  for (let s = 0; s < 6; s++) {
    const f = v.frets[s]!;
    if (f < 0) continue;
    const stringNum = 6 - s;
    parts.push(
      `<technical><string>${stringNum}</string><fret>${f}</fret></technical>`
    );
  }
  return parts.join('');
}

/** Same voicing: Pat Metheny bundle scores plain `maj7` symbol higher cost than `maj7#11`. */
export function methenyPlainMaj7CostsMoreThanSharp11(v: GuitarVoicing): boolean {
  const pm = getVoiceRuleBundle('pat_metheny');
  return scoreGuitarVoicing(v, null, pm, 'Cmaj7') > scoreGuitarVoicing(v, null, pm, 'Cmaj7#11');
}

/**
 * Phase 6+7 — one deterministic voicing per bar from locked/golden harmony + Pat Metheny-style scoring.
 */
export function buildVoicingsForContext(context: CompositionContext, _seed: number): GuitarVoicing[] {
  const tb = context.form.totalBars;
  const bundle = getVoiceRuleBundle('pat_metheny');
  let prev: VoicingCandidate | null = null;
  const out: GuitarVoicing[] = [];
  for (let b = 1; b <= tb; b++) {
    const sym = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(sym, context);
    const pcs = [tones.root, tones.third, tones.fifth, tones.seventh].map((m) => ((m % 12) + 12) % 12);
    let candidates = filterVoicingsByMaxSpan(buildGuitarVoicingCandidates(sym, pcs), 4);
    if (candidates.length === 0) {
      candidates = [guitarVoicingFromFrets(sym, [-1, -1, 0, 2, 1, 0])];
    }
    const chosen: GuitarVoicing =
      pickBestGuitarVoicing(candidates, prev, bundle, sym) ?? candidates[0]!;
    prev = {
      notes: chosen.midiNotes.length ? chosen.midiNotes : [48, 55, 60],
      cost: 0,
    };
    out.push(chosen);
  }
  return out;
}
