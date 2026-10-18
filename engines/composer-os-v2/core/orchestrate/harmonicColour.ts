/**
 * E2 harmonic validation and bounded transforms.
 * Triad mathematics stays in the existing WWH and hexatonic modules.
 */

import { midiOfPitch } from '../performance-composer/pcChord';
import { q, type ExactQuarter } from '../piano/pianoExactTiming';
import { applyTriadicTransformation, voiceMotions, type TriadicOperation } from '../hexatonic/triadicTransformation';
import { exchangeTriads, intersectPitchClasses } from '../hexatonic/relations';
import {
  analyzeTriadPair,
  parseSpelledPitch,
  validateParentTriad,
  type ParentTriadInput,
  type TriadQuality,
  type ValidatedTriad,
} from '../wwh/wwhTriadPair';
import { parametersHash, stableJson } from './sourceFoundation';
import { sha256Text } from '../musical-evaluation/canonicalScore';
import {
  E2_HARMONIC_COLOUR_VERSION,
  type DyadParent,
  type HarmonicConflict,
  type HarmonicIntent,
  type MemberRef,
  type RegisteredMember,
  type SoundingAttack,
  type SpelledRegister,
  type TriadParent,
} from './harmonicColourTypes';

const STEPS = 'CDEFGAB';

export interface PairFacts {
  union: readonly number[];
  intersection: readonly number[];
  sixNoteUnion: boolean;
  disjoint: boolean;
  parentIds: readonly [string, string];
}

export interface HarmonicReceipt {
  version: typeof E2_HARMONIC_COLOUR_VERSION;
  seed: number;
  operation: { id: string; version: string; parametersHash: string };
  attacks: readonly SoundingAttack[];
  intentKind: HarmonicIntent['kind'];
}

function inputOf(triad: ValidatedTriad): ParentTriadInput {
  return {
    id: triad.id,
    rootSpelling: triad.rootSpelling,
    quality: triad.quality,
    notes: [triad.notes[0].spelling, triad.notes[1].spelling, triad.notes[2].spelling],
    pitchClasses: triad.pitchClasses,
    provenance: triad.provenance,
  };
}

function pitchOf(token: string): SpelledRegister {
  const match = /^([A-G])([b#]*)(-?\d+)$/.exec(token.trim());
  if (!match) throw new Error(`bad registered pitch ${token}`);
  const parsed = parseSpelledPitch(`${match[1]}${match[2] ?? ''}`);
  const octave = Number(match[3]);
  return { step: parsed.step, alter: parsed.alter, octave, midi: midiOfPitch(parsed.step, parsed.alter, octave) };
}

function member(parentId: string, memberId: string, token: string): RegisteredMember {
  return { ref: { parentId, memberId }, pitch: pitchOf(token) };
}

export function triadParent(id: string, quality: TriadQuality, notes: readonly [string, string, string], voices: readonly [string, string, string], register?: readonly [number, number]): TriadParent {
  const parsed = notes.map((note) => parseSpelledPitch(note));
  const triad = validateParentTriad({
    id,
    rootSpelling: parsed[0]!.spelling,
    quality,
    notes: [parsed[0]!.spelling, parsed[1]!.spelling, parsed[2]!.spelling],
    pitchClasses: [parsed[0]!.pc, parsed[1]!.pc, parsed[2]!.pc] as [number, number, number],
    provenance: 'user',
  });
  const voiced = (['root', 'third', 'fifth'] as const).map((degree, index) => member(id, degree, voices[index]!)) as [RegisteredMember, RegisteredMember, RegisteredMember];
  for (let index = 0; index < 3; index += 1) {
    const voice = voiced[index]!;
    const tone = triad.notes[index]!;
    if (voice.pitch.step !== tone.step || voice.pitch.alter !== tone.alter) {
      throw new Error(`${voices[index]} does not spell ${tone.spelling}`);
    }
  }
  if (register && voiced.some((voice) => voice.pitch.midi < register[0] || voice.pitch.midi > register[1])) {
    throw new Error(`voice leaves register ${register[0]}–${register[1]}`);
  }
  return { id, triad, ...(register ? { soundingRegister: register } : {}), voices: voiced };
}

function intervalClass(semitones: number): number {
  const mod = ((semitones % 12) + 12) % 12;
  return Math.min(mod, 12 - mod);
}

function diatonicSteps(from: SpelledRegister, to: SpelledRegister): number {
  return (to.octave - from.octave) * 7 + (STEPS.indexOf(to.step) - STEPS.indexOf(from.step));
}

export function dyadParent(id: string, low: string, high: string, derivedFrom?: readonly MemberRef[]): DyadParent {
  const members = [member(id, 'low', low), member(id, 'high', high)] as [RegisteredMember, RegisteredMember];
  const directedSemitones = members[1].pitch.midi - members[0].pitch.midi;
  return {
    id,
    members,
    interval: {
      directedSemitones,
      directedDiatonicSteps: diatonicSteps(members[0].pitch, members[1].pitch),
      intervalClass: intervalClass(directedSemitones),
    },
    ...(derivedFrom ? { derivedFrom } : {}),
  };
}

export function describeTriadPair(a: TriadParent, b: TriadParent): PairFacts {
  const analysis = analyzeTriadPair(inputOf(a.triad), inputOf(b.triad));
  const intersection = intersectPitchClasses(a.triad.pitchClasses, b.triad.pitchClasses);
  const union = [...new Set([...a.triad.pitchClasses, ...b.triad.pitchClasses])].sort((left, right) => left - right);
  const shared = [...analysis.sharedPitchClasses].sort((left, right) => left - right);
  if (shared.join(',') !== [...intersection].sort((left, right) => left - right).join(',')) {
    throw new Error('pair intersection left the existing pitch-class helper');
  }
  return {
    union,
    intersection: shared,
    sixNoteUnion: union.length === 6,
    disjoint: shared.length === 0,
    parentIds: [a.id, b.id],
  };
}

export function polychord(id: string, upper: TriadParent, lower: TriadParent): HarmonicIntent {
  if (upper.id === lower.id) throw new Error('polychord parents need distinct ids');
  return { kind: 'polychord', id, upper, lower, use: 'simultaneous' };
}

export function triadPair(id: string, a: TriadParent, b: TriadParent, use: 'alternate' | 'interlock' | 'superpose'): HarmonicIntent {
  if (a.id === b.id) throw new Error('triad-pair parents need distinct ids');
  describeTriadPair(a, b);
  return { kind: 'triad-pair', id, a, b, use };
}

export function dyadPair(id: string, a: DyadParent, b: DyadParent, use: 'alternate' | 'interlock' | 'superpose'): HarmonicIntent {
  if (a.id === b.id) throw new Error('dyad-pair parents need distinct ids');
  return { kind: 'dyad-pair', id, a, b, use };
}

function attack(id: string, onset: ExactQuarter, duration: ExactQuarter, pitch: SpelledRegister, members: readonly MemberRef[], rest = false): SoundingAttack {
  return { eventId: id, onset, duration, pitch, members, rest };
}

function mergeShared(rows: SoundingAttack[]): SoundingAttack[] {
  const out: SoundingAttack[] = [];
  for (const row of rows) {
    if (row.rest) {
      out.push(row);
      continue;
    }
    const index = out.findIndex((item) => !item.rest
      && item.pitch.step === row.pitch.step
      && item.pitch.alter === row.pitch.alter
      && item.pitch.octave === row.pitch.octave
      && item.onset.n === row.onset.n
      && item.onset.d === row.onset.d);
    if (index < 0) out.push({ ...row, members: [...row.members] });
    else {
      const hit = out[index]!;
      out[index] = { ...hit, members: [...hit.members, ...row.members] };
    }
  }
  return out;
}

export function realiseSimultaneous(intent: Extract<HarmonicIntent, { kind: 'polychord' }>, onset = q(0), duration = q(1)): SoundingAttack[] {
  const rows = [intent.lower, intent.upper].flatMap((parent) => parent.voices.map((voice) => attack(
    `${intent.id}:${parent.id}:${voice.ref.memberId}`,
    onset,
    duration,
    voice.pitch,
    [voice.ref],
  )));
  return mergeShared(rows);
}

export function realiseSuperpose(a: TriadParent, b: TriadParent, onset = q(0), duration = q(1)): SoundingAttack[] {
  return mergeShared(realiseSimultaneous(polychord(`${a.id}+${b.id}`, b, a), onset, duration));
}

/** Eighth, eighth, eighth, eighth rest, then the other parent the same way. */
export function realiseAlternateBar(intent: Extract<HarmonicIntent, { kind: 'triad-pair' }>): SoundingAttack[] {
  if (intent.use !== 'alternate') throw new Error('alternate realisation needs use alternate');
  const step = q(1, 2);
  const rows: SoundingAttack[] = [];
  for (const [parent, start] of [[intent.a, 0], [intent.b, 4]] as const) {
    parent.voices.forEach((voice, index) => {
      rows.push(attack(`${intent.id}:${parent.id}:${voice.ref.memberId}`, q(start + index, 2), step, voice.pitch, [voice.ref]));
    });
    rows.push(attack(`${intent.id}:${parent.id}:rest`, q(start + 3, 2), step, parent.voices[0].pitch, [], true));
  }
  return rows;
}

function spellNear(midi: number, alter: number): SpelledRegister | null {
  for (const step of STEPS) {
    for (let octave = 0; octave <= 8; octave += 1) {
      if (midiOfPitch(step, alter, octave) === midi) return { step, alter, octave, midi };
    }
  }
  return null;
}

function within(parent: TriadParent, midi: number): boolean {
  if (!parent.soundingRegister) return true;
  return midi >= parent.soundingRegister[0] && midi <= parent.soundingRegister[1];
}

export function transformTriadParent(parent: TriadParent, operation: TriadicOperation): { ok: true; parent: TriadParent } | HarmonicConflict {
  if (parent.triad.quality !== 'major' && parent.triad.quality !== 'minor') {
    return { ok: false, reason: `${parent.triad.quality} is outside the major/minor transformation domain` };
  }
  const applied = applyTriadicTransformation({
    quality: parent.triad.quality,
    notes: [parent.triad.notes[0].spelling, parent.triad.notes[1].spelling, parent.triad.notes[2].spelling],
  }, operation);
  if (!applied.ok) return { ok: false, reason: applied.reason };
  const motions = voiceMotions(applied.source, applied.target);
  const nextVoices = parent.voices.map((voice, index) => {
    const motion = motions.find((item) => item.fromSpelling === parent.triad.notes[index]?.spelling);
    if (!motion) return voice;
    const parsed = parseSpelledPitch(motion.toSpelling);
    const midi = voice.pitch.midi + motion.semitones;
    const placed = spellNear(midi, parsed.alter);
    if (!placed || placed.step !== parsed.step) return null;
    return member(parent.id, voice.ref.memberId, `${placed.step}${motion.toSpelling.slice(1)}${placed.octave}`);
  });
  if (nextVoices.some((voice) => voice === null)) return { ok: false, reason: 'transformed spelling has no register' };
  const voices = nextVoices as [RegisteredMember, RegisteredMember, RegisteredMember];
  if (voices.some((voice) => !within(parent, voice.pitch.midi))) return { ok: false, reason: 'register constraint' };
  try {
    const rebuilt = triadParent(
      parent.id,
      applied.target.quality,
      applied.target.notes,
      voices.map((voice) => `${voice.pitch.step}${voice.pitch.alter === 0 ? '' : voice.pitch.alter < 0 ? 'b'.repeat(-voice.pitch.alter) : '#'.repeat(voice.pitch.alter)}${voice.pitch.octave}`) as [string, string, string],
      parent.soundingRegister,
    );
    return { ok: true, parent: { ...rebuilt, ...(parent.inversion !== undefined ? { inversion: parent.inversion } : {}) } };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function transformPolychordParent(
  intent: Extract<HarmonicIntent, { kind: 'polychord' }>,
  which: 'upper' | 'lower',
  operation: TriadicOperation,
): { ok: true; intent: Extract<HarmonicIntent, { kind: 'polychord' }>; attacks: SoundingAttack[] } | HarmonicConflict {
  const target = which === 'upper' ? intent.upper : intent.lower;
  const other = which === 'upper' ? intent.lower : intent.upper;
  const transformed = transformTriadParent(target, operation);
  if (!transformed.ok) return transformed;
  const next = which === 'upper'
    ? polychord(intent.id, transformed.parent, other)
    : polychord(intent.id, other, transformed.parent);
  const before = other.voices.map((voice) => voice.pitch.midi).join(',');
  const after = (which === 'upper' ? next.lower : next.upper).voices.map((voice) => voice.pitch.midi).join(',');
  if (before !== after) return { ok: false, reason: 'locked parent changed' };
  return { ok: true, intent: next, attacks: realiseSimultaneous(next) };
}

export function exchangePairSchedule(a: TriadParent, b: TriadParent): { ownership: 'a-then-b' | 'b-then-a'; parentIds: readonly [string, string]; exchange: ReturnType<typeof exchangeTriads> } {
  return {
    ownership: 'a-then-b',
    parentIds: [a.id, b.id],
    exchange: exchangeTriads(inputOf(a.triad), inputOf(b.triad)),
  };
}

function retoken(pitch: SpelledRegister): string {
  const alter = pitch.alter === 0 ? '' : pitch.alter < 0 ? 'b'.repeat(-pitch.alter) : '#'.repeat(pitch.alter);
  return `${pitch.step}${alter}${pitch.octave}`;
}

export function transposeDyad(dyad: DyadParent, semitones: number): DyadParent | HarmonicConflict {
  const moved = dyad.members.map((item) => spellNear(item.pitch.midi + semitones, item.pitch.alter));
  if (moved.some((item) => item === null)) return { ok: false, reason: 'spelling policy cannot keep the accidental' };
  const [low, high] = moved as [SpelledRegister, SpelledRegister];
  return dyadParent(dyad.id, retoken(low), retoken(high), dyad.derivedFrom);
}

export function invertDyad(dyad: DyadParent): DyadParent {
  const upper = spellNear(dyad.members[0].pitch.midi + 12, dyad.members[0].pitch.alter);
  if (!upper) throw new Error('invert leaves the spelling domain');
  return dyadParent(dyad.id, retoken(dyad.members[1].pitch), retoken(upper), dyad.derivedFrom);
}

export function sameInterval(left: DyadParent, right: DyadParent, mode: 'directed-semitone' | 'interval-class' | 'spelling'): boolean {
  if (mode === 'directed-semitone') return left.interval.directedSemitones === right.interval.directedSemitones;
  if (mode === 'interval-class') return left.interval.intervalClass === right.interval.intervalClass;
  return left.members.every((item, index) => item.pitch.step === right.members[index]?.pitch.step && item.pitch.alter === right.members[index]?.pitch.alter);
}

export function contraryDyad(dyad: DyadParent, semitones: number, exactInterval: boolean): DyadParent | HarmonicConflict {
  if (exactInterval && semitones !== 0) return { ok: false, reason: 'exact interval lock refuses contrary motion' };
  const low = spellNear(dyad.members[0].pitch.midi + semitones, dyad.members[0].pitch.alter);
  const high = spellNear(dyad.members[1].pitch.midi - semitones, dyad.members[1].pitch.alter);
  if (!low || !high) return { ok: false, reason: 'contrary motion has no spelled candidate' };
  return dyadParent(dyad.id, retoken(low), retoken(high), dyad.derivedFrom);
}

export function harmonicReceipt(intent: HarmonicIntent, attacks: readonly SoundingAttack[], seed: number, operationId: string): HarmonicReceipt {
  const operation = {
    id: operationId,
    version: E2_HARMONIC_COLOUR_VERSION,
    parametersHash: parametersHash({ intent: intent.kind, id: intent.id, seed, operationId }),
  };
  return { version: E2_HARMONIC_COLOUR_VERSION, seed, operation, attacks, intentKind: intent.kind };
}

export function receiptDigest(receipt: HarmonicReceipt): string {
  return sha256Text(stableJson(receipt));
}
