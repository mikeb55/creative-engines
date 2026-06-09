/**
 * V82e - Barry Harris substitution identities (post-selector rename layer).
 *
 * Gate: always emit applicable identityAnnotations; exportSymbol picks spelling
 * closest to the original fake-book symbol among canonical + equivalents.
 */

import { normalizeChordToken } from '../harmony/chordProgressionParser';
import { dim7ChordTones, dim7DegreePc, sixthChordTones, sixthDegreePc } from './chordTones';
import { pitchClassToSharpName } from './scaleOfChords';
import type {
  ChordMelodyNoteChoice,
  IdentityAnnotation,
  ResolvedChordMelodyNote,
  SixthDimPair,
  VoicingHint,
} from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function symbolForSixth(pair: SixthDimPair): string {
  const root = pitchClassToSharpName(pair.sixthRootPc);
  return pair.sixthQuality === 'm6' ? `${root}m6` : `${root}6`;
}

function symbolForDim7(dimRootPc: number): string {
  return `${pitchClassToSharpName(dimRootPc)}dim7`;
}

function dom7altSymbol(rootPc: number): string {
  return `${pitchClassToSharpName(rootPc)}7alt`;
}

function maj9Symbol(rootPc: number): string {
  return `${pitchClassToSharpName(rootPc)}maj9`;
}

function m7b5Symbol(rootPc: number): string {
  return `${pitchClassToSharpName(rootPc)}m7b5`;
}

function identityScore(fakeBook: string, candidate: string): number {
  const fake = normalizeChordToken(fakeBook).toLowerCase();
  const cand = normalizeChordToken(candidate).toLowerCase();
  if (!fake || !cand) return 0;
  if (fake === cand) return 100;
  if (fake.includes(cand) || cand.includes(fake)) return 72;
  const fakeRoot = fake.match(/^[a-g][#b]?/)?.[0] ?? '';
  const candRoot = cand.match(/^[a-g][#b]?/)?.[0] ?? '';
  if (fakeRoot && fakeRoot === candRoot) return 48;
  return 10;
}

function pickExportSymbol(fakeBookSymbol: string, candidates: readonly string[]): string {
  const uniq = [...new Set(candidates.filter(Boolean))];
  if (uniq.length === 0) return fakeBookSymbol;
  let best = uniq[0]!;
  let bestScore = -1;
  for (const c of uniq) {
    const s = identityScore(fakeBookSymbol, c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function annotationsForSixth(pair: SixthDimPair): IdentityAnnotation[] {
  const out: IdentityAnnotation[] = [];
  const sixthSym = symbolForSixth(pair);
  const maj9Root = mod12(pair.sixthRootPc - 7);
  const maj9Sym = maj9Symbol(maj9Root);
  out.push({
    id: 'six_on_five_maj9',
    label: `${maj9Sym} = ${sixthSym}`,
    equivalentSymbol: maj9Sym,
  });
  if (pair.sixthQuality === 'm6') {
    const hdRoot = mod12(pair.sixthRootPc - 3);
    const hdSym = m7b5Symbol(hdRoot);
    out.push({
      id: 'm6_m7b5',
      label: `${hdSym} = ${sixthSym}`,
      equivalentSymbol: hdSym,
    });
    const domRoot = mod12(pair.sixthRootPc - 1);
    out.push({
      id: 'm6_on_flat2_dom7alt',
      label: `${dom7altSymbol(domRoot)} = ${sixthSym}`,
      equivalentSymbol: dom7altSymbol(domRoot),
    });
  }
  return out;
}

function annotationsForDim7(dimRootPc: number): IdentityAnnotation[] {
  const dimSym = symbolForDim7(dimRootPc);
  const out: IdentityAnnotation[] = [];
  for (const offset of [0, 3, 6, 9]) {
    const domRoot = mod12(dimRootPc + offset);
    const domSym = `${pitchClassToSharpName(domRoot)}7`;
    out.push({
      id: 'dim7_dom7_enharmonic',
      label: `${domSym} = ${dimSym}`,
      equivalentSymbol: domSym,
    });
  }
  return out;
}

function voicingHintForChoice(choice: ChordMelodyNoteChoice): VoicingHint {
  if (choice.kind === 'dim7') return 'guitar-dim7-block-close';
  if (choice.kind === 'borrowed') return 'guitar-borrowed-sixth-block';
  return 'guitar-sixth-block-close';
}

function canonicalSymbol(choice: ChordMelodyNoteChoice): string {
  if (choice.kind === 'borrowed') return choice.activeSymbol;
  return choice.chordSymbol;
}

function candidateExportSymbols(
  choice: ChordMelodyNoteChoice,
  annotations: readonly IdentityAnnotation[]
): string[] {
  const base = [canonicalSymbol(choice)];
  for (const a of annotations) base.push(a.equivalentSymbol);
  if (choice.kind === 'borrowed') base.push(choice.partnerSymbol);
  return base;
}

/** Apply locked identity formulas — does not re-run selector. */
export function applyIdentitiesToNoteChoice(choice: ChordMelodyNoteChoice): ResolvedChordMelodyNote {
  let annotations: IdentityAnnotation[] = [];
  if (choice.kind === 'sixth') {
    annotations = annotationsForSixth(choice.anchor);
  } else if (choice.kind === 'dim7') {
    annotations = annotationsForDim7(choice.anchor.dim7RootPc);
  } else if (choice.kind === 'borrowed') {
    annotations = annotationsForSixth(choice.anchor);
    if (choice.borrowedFrom === 'dim7') {
      annotations = [...annotations, ...annotationsForDim7(choice.anchor.dim7RootPc)];
    }
  }
  const exportSymbol = pickExportSymbol(choice.fakeBookSymbol, candidateExportSymbols(choice, annotations));
  return {
    ...choice,
    exportSymbol,
    identityAnnotations: annotations,
    voicingHint: voicingHintForChoice(choice),
  };
}

export function applyIdentitiesToNoteChoices(
  choices: readonly ChordMelodyNoteChoice[]
): ResolvedChordMelodyNote[] {
  return choices.map(applyIdentitiesToNoteChoice);
}

export function chordTonePcsForResolved(resolved: ResolvedChordMelodyNote): number[] {
  if (resolved.kind === 'dim7') return dim7ChordTones(resolved.anchor.dim7RootPc);
  return sixthChordTones(resolved.anchor.sixthRootPc, resolved.anchor.sixthQuality);
}

export function droppedTonePcForResolved(resolved: ResolvedChordMelodyNote): number | undefined {
  if (resolved.kind === 'dim7') return dim7DegreePc(resolved.anchor.dim7RootPc);
  return sixthDegreePc(resolved.anchor.sixthRootPc);
}