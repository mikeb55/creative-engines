/**
 * Piano V1.1 structured polychords.
 * Upper and lower triads stay separate parents. A slash chord is not this type.
 * Pitch-class checks reuse the tertian triad universe. Spelling follows the named root.
 */

import { triadAt } from '../hexatonic/tertianTriadUniverse';
import type { VaultTriadQuality } from '../wwh/wps/wpsTonalityVaultRecord';
import type { ExactQuarter, NoteEvent } from '../score-model/scoreModelTypes';
import { q, qAdd, subdivisionAttackCount } from './pianoExactTiming';
import type { PianoTimelineBar } from './pianoMeterPlan';
import type { PianoRhythmicWindow } from './pianoV11Realise';

export const PIANO_TRIAD_QUALITIES = ['major', 'minor', 'augmented', 'diminished'] as const;
export type PianoTriadQuality = (typeof PIANO_TRIAD_QUALITIES)[number];

export interface PianoTriadRequest {
  root: string;
  quality: PianoTriadQuality;
}

export interface PianoPolychordRequest {
  upper: PianoTriadRequest;
  lower: PianoTriadRequest;
  assignment: { upper: 'RH'; lower: 'LH' };
}

export interface PianoPolychordRegion {
  startBar: number;
  endBar: number;
  polychord: PianoPolychordRequest;
}

export interface SpelledTriadMember {
  step: string;
  alter: number;
  pc: number;
}

export interface VoicedTriadMember extends SpelledTriadMember {
  midi: number;
}

export interface VoicedTriad {
  display: string;
  pcs: number[];
  /** Index 0 is the hand's primary note. The other two follow in the stack. */
  ordered: VoicedTriadMember[];
}

export interface VoicedPolychord {
  display: string;
  upper: VoicedTriad;
  lower: VoicedTriad;
  export: PianoPolychordExport;
}

export interface PianoPolychordExport {
  upper: { step: string; alter: number; kind: PianoTriadQuality };
  lower: { step: string; alter: number; kind: PianoTriadQuality };
  display: string;
}

const INTERVALS: Record<PianoTriadQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  augmented: [0, 4, 8],
  diminished: [0, 3, 6],
};

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function parsePianoTriadRoot(root: string): { step: string; alter: number; pc: number; stepIndex: number } | null {
  const match = root.trim().match(/^([A-G])([#b])?$/);
  if (!match?.[1]) return null;
  const step = match[1];
  const alter = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const stepIndex = STEPS.indexOf(step as (typeof STEPS)[number]);
  return { step, alter, pc: mod12((STEP_PC[step] ?? 0) + alter), stepIndex };
}

export function spellTriadMembers(root: string, quality: PianoTriadQuality): SpelledTriadMember[] | string {
  const parsed = parsePianoTriadRoot(root);
  if (!parsed) return `polychord root ${root} is not a spelled note`;
  if (!PIANO_TRIAD_QUALITIES.includes(quality)) return `polychord quality ${String(quality)} is unsupported`;
  const vault = triadAt(quality as VaultTriadQuality, parsed.pc);
  const intervals = INTERVALS[quality];
  const members = [0, 2, 4].map((letterOffset, index) => {
    const step = STEPS[(parsed.stepIndex + letterOffset) % 7]!;
    const target = mod12(parsed.pc + intervals[index]!);
    let alter = target - (STEP_PC[step] ?? 0);
    while (alter > 6) alter -= 12;
    while (alter < -6) alter += 12;
    return { step, alter, pc: target };
  });
  const got = [...members.map((member) => member.pc)].sort((a, b) => a - b);
  const expected = [...vault.pitchClasses].sort((a, b) => a - b);
  if (got.join(',') !== expected.join(',')) {
    return `polychord ${root} ${quality} does not match the tertian triad`;
  }
  return members;
}

export function triadDisplay(triad: PianoTriadRequest): string {
  return `${triad.root} ${triad.quality}`;
}

export function polychordDisplay(chord: PianoPolychordRequest): string {
  return `Upper: ${triadDisplay(chord.upper)} / Lower: ${triadDisplay(chord.lower)}`;
}

export function polychordExport(chord: PianoPolychordRequest): PianoPolychordExport | string {
  const upper = parsePianoTriadRoot(chord.upper.root);
  const lower = parsePianoTriadRoot(chord.lower.root);
  if (!upper || !lower) return 'polychord root spelling is invalid';
  if (chord.assignment.upper !== 'RH' || chord.assignment.lower !== 'LH') {
    return 'polychord assignment is upper RH and lower LH';
  }
  return {
    upper: { step: upper.step, alter: upper.alter, kind: chord.upper.quality },
    lower: { step: lower.step, alter: lower.alter, kind: chord.lower.quality },
    display: polychordDisplay(chord),
  };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function oneHarmony(part: PianoPolychordExport['upper'], staff: 1 | 2): string {
  const alter = part.alter !== 0 ? `<root-alter>${part.alter}</root-alter>` : '';
  return `      <harmony>
        <root><root-step>${part.step}</root-step>${alter}</root>
        <kind>${part.kind}</kind>
        <staff>${staff}</staff>
      </harmony>
`;
}

/** MusicXML 3.1 repeated harmony. No bass reinterpretation. No 4.0 attributes. */
export function pianoPolychordHarmonyXml(chord: PianoPolychordExport): string {
  return `${oneHarmony(chord.upper, 1)}${oneHarmony(chord.lower, 2)}    <direction placement="above"><direction-type><words>${escapeXml(chord.display)}</words></direction-type></direction>
`;
}

export interface VoiceTriadRequest {
  members: SpelledTriadMember[];
  low: number;
  high: number;
  anchor: number;
  previous: readonly number[] | null;
  preferExtreme: 'high' | 'low';
  avoid: ReadonlySet<number>;
  label: string;
}

export function voiceTriad(request: VoiceTriadRequest): { ok: true; voiced: VoicedTriad } | { ok: false; diagnostic: string } {
  const found: { ordered: VoicedTriadMember[]; score: number }[] = [];
  for (let rotation = 0; rotation < 3; rotation += 1) {
    const rotated = [0, 1, 2].map((index) => request.members[(index + rotation) % 3]!);
    for (let lowest = request.low; lowest <= request.high - 4; lowest += 1) {
      const placed: VoicedTriadMember[] = [];
      let cursor = lowest;
      let legal = true;
      for (const member of rotated) {
        let midi = Math.max(cursor, request.low);
        while (midi <= request.high && mod12(midi) !== member.pc) midi += 1;
        if (midi > request.high || request.avoid.has(midi) || placed.some((item) => item.midi === midi)) {
          legal = false;
          break;
        }
        placed.push({ ...member, midi });
        cursor = midi + 1;
      }
      if (!legal || placed.length !== 3) continue;
      const span = placed[2]!.midi - placed[0]!.midi;
      if (span > 12) continue;
      const primary = request.preferExtreme === 'high' ? placed[2]! : placed[0]!;
      const ordered = [primary, ...placed.filter((item) => item.midi !== primary.midi)];
      if (new Set(ordered.map((item) => item.midi)).size !== 3) continue;
      let score = Math.abs(primary.midi - request.anchor);
      if (request.previous && request.previous.length > 0) {
        const leap = ordered.some((item) => request.previous!.every((pitch) => Math.abs(pitch - item.midi) > 12));
        if (leap) continue;
        score += ordered.reduce((sum, item) => {
          const nearest = request.previous!.reduce((best, pitch) => Math.min(best, Math.abs(pitch - item.midi)), 99);
          return sum + nearest;
        }, 0);
      }
      if (request.preferExtreme === 'high') score -= primary.midi / 20;
      found.push({ ordered, score });
    }
  }
  if (found.length === 0) {
    return {
      ok: false,
      diagnostic: `${request.label} cannot be voiced legally inside ${request.low}-${request.high} without a shared MIDI key or an oversized span`,
    };
  }
  found.sort((a, b) => a.score - b.score);
  const ordered = found[0]!.ordered;
  return {
    ok: true,
    voiced: {
      display: request.label,
      pcs: [...new Set(ordered.map((item) => item.pc))].sort((a, b) => a - b),
      ordered,
    },
  };
}

export function voicePolychordPair(input: {
  chord: PianoPolychordRequest;
  rhLow: number;
  rhHigh: number;
  lhLow: number;
  lhHigh: number;
  rhAnchor: number;
  lhAnchor: number;
  previousRh: readonly number[] | null;
  previousLh: readonly number[] | null;
}): { ok: true; voiced: VoicedPolychord } | { ok: false; diagnostic: string } {
  const upperMembers = spellTriadMembers(input.chord.upper.root, input.chord.upper.quality);
  const lowerMembers = spellTriadMembers(input.chord.lower.root, input.chord.lower.quality);
  if (typeof upperMembers === 'string') return { ok: false, diagnostic: upperMembers };
  if (typeof lowerMembers === 'string') return { ok: false, diagnostic: lowerMembers };
  const exported = polychordExport(input.chord);
  if (typeof exported === 'string') return { ok: false, diagnostic: exported };
  const upper = voiceTriad({
    members: upperMembers,
    low: input.rhLow,
    high: input.rhHigh,
    anchor: input.rhAnchor,
    previous: input.previousRh,
    preferExtreme: 'high',
    avoid: new Set<number>(),
    label: `upper ${triadDisplay(input.chord.upper)}`,
  });
  if (!upper.ok) return upper;
  const avoid = new Set(upper.voiced.ordered.map((item) => item.midi));
  const lower = voiceTriad({
    members: lowerMembers,
    low: input.lhLow,
    high: input.lhHigh,
    anchor: input.lhAnchor,
    previous: input.previousLh,
    preferExtreme: 'low',
    avoid,
    label: `lower ${triadDisplay(input.chord.lower)}`,
  });
  if (!lower.ok) return { ok: false, diagnostic: lower.diagnostic };
  const sharedMidi = upper.voiced.ordered.some((item) => avoid.has(item.midi) && lower.voiced.ordered.some((low) => low.midi === item.midi));
  if (sharedMidi) {
    return { ok: false, diagnostic: `${polychordDisplay(input.chord)} assigns one MIDI key to both hands` };
  }
  return {
    ok: true,
    voiced: {
      display: polychordDisplay(input.chord),
      upper: upper.voiced,
      lower: lower.voiced,
      export: exported,
    },
  };
}

export function validatePolychordRegions(regions: readonly PianoPolychordRegion[], bars: number): string | null {
  const covered = new Map<number, number>();
  for (const region of regions) {
    if (!Number.isInteger(region.startBar) || !Number.isInteger(region.endBar)) return 'polychord bars must be integers';
    if (region.startBar < 1 || region.endBar > bars || region.startBar > region.endBar) {
      return `polychord region ${region.startBar}-${region.endBar} is outside 1-${bars}`;
    }
    if (region.polychord.assignment.upper !== 'RH' || region.polychord.assignment.lower !== 'LH') {
      return 'polychord assignment is upper RH and lower LH';
    }
    const spelled = spellTriadMembers(region.polychord.upper.root, region.polychord.upper.quality);
    const lower = spellTriadMembers(region.polychord.lower.root, region.polychord.lower.quality);
    if (typeof spelled === 'string') return spelled;
    if (typeof lower === 'string') return lower;
    for (let bar = region.startBar; bar <= region.endBar; bar += 1) {
      if (covered.has(bar)) return `polychord regions overlap at bar ${bar}`;
      covered.set(bar, 1);
    }
  }
  return null;
}

export function regionAt(regions: readonly PianoPolychordRegion[], bar: number): PianoPolychordRegion | null {
  return regions.find((region) => bar >= region.startBar && bar <= region.endBar) ?? null;
}

export function acceptancePolychordRegions(): PianoPolychordRegion[] {
  const row = (
    startBar: number,
    endBar: number,
    upperRoot: string,
    upperQuality: PianoTriadQuality,
    lowerRoot: string,
    lowerQuality: PianoTriadQuality,
  ): PianoPolychordRegion => ({
    startBar,
    endBar,
    polychord: {
      upper: { root: upperRoot, quality: upperQuality },
      lower: { root: lowerRoot, quality: lowerQuality },
      assignment: { upper: 'RH', lower: 'LH' },
    },
  });
  return [
    row(1, 6, 'C', 'major', 'D', 'minor'),
    row(7, 12, 'D', 'major', 'C', 'minor'),
    row(13, 18, 'F', 'major', 'D', 'minor'),
    row(19, 20, 'Eb', 'major', 'A', 'minor'),
    row(21, 24, 'C', 'major', 'D', 'minor'),
  ];
}

export function stackSpellings(voiced: VoicedTriad): { step: string; alter: number }[] {
  return voiced.ordered.map((member) => ({ step: member.step, alter: member.alter }));
}

export function decoratePolychordWindow(
  window: PianoRhythmicWindow,
  upper: VoicedTriad,
  lower: VoicedTriad,
  mode: 'stack' | 'repeated',
): PianoRhythmicWindow {
  const primary = window.hand === 'RH' ? upper : lower;
  const against = window.hand === 'RH' ? lower : upper;
  const extent = window.extent ?? q(1, 1);
  const cycle = (voiced: VoicedTriad, count: number): number[] => (
    Array.from({ length: count }, (_, index) => voiced.ordered[index % voiced.ordered.length]!.midi)
  );
  const againstCount = window.againstPitches?.length
    ?? (window.against ? subdivisionAttackCount(window.against, extent) ?? undefined : undefined);
  const next: PianoRhythmicWindow = { ...window };
  if (mode === 'repeated') {
    const tone = primary.ordered[0]!.midi;
    const primaryCount = window.pitches?.length ?? subdivisionAttackCount(window.ratio, extent) ?? 1;
    next.pitches = Array.from({ length: primaryCount }, () => tone);
    next.pitchStacks = undefined;
    next.stackSpellings = undefined;
    next.againstPitchStacks = undefined;
    next.againstStackSpellings = undefined;
    if (againstCount) {
      const other = against.ordered[0]!.midi;
      next.againstPitches = Array.from({ length: againstCount }, () => other);
    }
    return next;
  }
  const count = window.pitches?.length ?? subdivisionAttackCount(window.ratio, extent) ?? (window.ratio === '5:4' ? 5 : 3);
  next.pitches = cycle(primary, count);
  next.pitches[0] = primary.ordered[0]!.midi;
  next.pitchStacks = [primary.ordered.map((member) => member.midi)];
  next.stackSpellings = [stackSpellings(primary)];
  if (againstCount) {
    next.againstPitches = cycle(against, againstCount);
    next.againstPitches[0] = against.ordered[0]!.midi;
    next.againstPitchStacks = [against.ordered.map((member) => member.midi)];
    next.againstStackSpellings = [stackSpellings(against)];
  }
  return next;
}

export function bar12TripletWindow(timeline: readonly PianoTimelineBar[], upper: VoicedTriad): PianoRhythmicWindow | string {
  const bar = timeline[11];
  if (!bar || bar.numerator !== 9 || bar.denominator !== 16) return 'bar 12 is not 9/16';
  const start: ExactQuarter = bar.start;
  const end = qAdd(start, { n: 1, d: 1 });
  if (end.n / end.d > (bar.start.n / bar.start.d) + (bar.span.n / bar.span.d) + 1e-9) {
    return '3:2 does not fit inside bar 12';
  }
  const pitches = Array.from({ length: 3 }, (_, index) => upper.ordered[index % 3]!.midi);
  return decoratePolychordWindow({
    id: 'bar12-3-2',
    start,
    hand: 'RH',
    ratio: '3:2',
    pitches,
    material: 'parent-stack',
  }, upper, upper, 'stack');
}

export function parentMemberLetters(root: string, quality: PianoTriadQuality): string | null {
  const members = spellTriadMembers(root, quality);
  if (typeof members === 'string') return null;
  return members.map((member) => `${member.step}${member.alter === 1 ? '#' : member.alter === -1 ? 'b' : ''}`).join(', ');
}

/** Parent-member notes take the triad spelling. Other explicit spellings stay. MIDI is unchanged. */
export function applyParentMemberSpellings(events: readonly NoteEvent[], upper: VoicedTriad, lower: VoicedTriad): void {
  for (const event of events) {
    const members = (event.voice ?? 1) === 3 ? lower.ordered : upper.ordered;
    const listed = event.pitches ?? [];
    const pitches = listed.length > 1 ? [event.pitch, ...listed.slice(1)] : [event.pitch];
    const chosen = pitches.map((midi, index) => {
      const parent = members.find((member) => member.pc === ((midi % 12) + 12) % 12);
      if (parent) return { step: parent.step, alter: parent.alter };
      return event.stackSpellings?.[index] ?? (index === 0 ? event.spelling : undefined);
    });
    const primary = chosen[0];
    if (primary) event.spelling = primary;
    if (pitches.length > 1 && chosen.some((item) => item)) {
      event.stackSpellings = chosen.map((item, index) => item ?? event.stackSpellings?.[index] ?? { step: '', alter: 0 });
    }
  }
}
