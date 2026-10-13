/**
 * BHL iteration 3 — phrase binder.
 * Relationship logic and the Phase 5B positive/negative fixtures are the Phase 5B binder.
 * Events are flattened from existing `measureViews`. `absTimeline` only cross-checks bass.
 * No composition. No MusicXML write. No new parser.
 */
import { readFileSync } from 'node:fs';
import { absTimeline } from '../performance-composer/pcRespond';
import {
  elementChildren,
  measureViews,
  parseScoreDocument,
  partElements,
  partNames,
  type PcMeasureView,
} from '../performance-composer/pcScore';
import type { BhlFieldSnap, BhlPhrasePlan } from './bhlPhrase';
import { neighborCell } from './bhlPhrase';
import type { BhlBassBar, BhlOnsetPlan } from './bhlRhythm';
import { planPhraseOnsets } from './bhlRhythm';
import { transformMotifThroughLayers, type MotifNote as LayerNote } from '../arrangement/motifTransformer';
import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { varyMotif } from '../motif/motifTracker';
import type { BaseMotif } from '../motif/motifTypes';

const EPS = 1e-3;
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUAL = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'];

export type BhlBinderStatus = 'VERIFIED' | 'INFERRED';
export type BhlRelType = 'true-counterpoint' | 'cell-recurrence' | 'bass-reinterpretation' | 'sustain-release' | 'rhythmic-dialogue';
type Status = BhlBinderStatus;
type RelType = BhlRelType;

export interface BhlBinderEvent {
  bar: number;
  onsetTicks: number;
  absQ: number;
  durQ: number;
  partId: string;
  instrument: string;
  role: 'guitar' | 'bass' | 'other';
  voice: string;
  midi: number | null;
  rest: boolean;
  tieStart: boolean;
  tieStop: boolean;
  chordIndex: number;
  group: string;
  beat: number;
  divisions: number;
  beats: number;
  beatType: number;
}

type Ev = BhlBinderEvent;

export interface BhlPitchFact {
  eventId: string;
  instrument: string;
  voice: string;
  midi: number | null;
  name: string;
  durQ: number;
  tieStart: boolean;
  tieStop: boolean;
  rest: boolean;
}

export interface BhlBinderOccurrence {
  bar: number;
  beat: number;
  absQ: number;
  durQ: number;
  voices: string[];
  pitches: string[];
  midis: number[];
  eventIds: string[];
  bass: string[];
  bassMidis: number[];
  bassEventIds: string[];
  intervals: string[];
}

export interface BhlRelationship {
  type: RelType;
  subtype: string;
  status: Status;
  bar: number;
  beat: number;
  absQ: number;
  durQ: number;
  instruments: string[];
  voices: string[];
  pitches: BhlPitchFact[];
  eventIds: string[];
  evidence: string;
  occurrences?: BhlBinderOccurrence[];
}

type Relationship = BhlRelationship;
type Occurrence = BhlBinderOccurrence;

interface Atom {
  voice: string;
  midi: number;
  absQ: number;
  endQ: number;
  durQ: number;
  bar: number;
  beat: number;
  eventIds: string[];
  tieSustain: boolean;
  reattack: boolean;
}

const pc = (m: number) => ((m % 12) + 12) % 12;
const spell = (m: number) => `${NAMES[pc(m)]}${Math.floor(m / 12) - 1}`;
function qual(semis: number): string {
  const sign = semis < 0 ? '-' : '';
  const a = Math.abs(semis);
  const oct = Math.floor(a / 12);
  return `${sign}${QUAL[a % 12]}${oct ? `+${oct}oct` : ''}`;
}
const eid = (e: Ev) => `${e.group}@${e.chordIndex}@${e.midi ?? 'rest'}`;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

function pitchOf(e: Ev): BhlPitchFact {
  return {
    eventId: eid(e),
    instrument: e.instrument,
    voice: e.voice,
    midi: e.midi,
    name: e.rest || e.midi === null ? 'rest' : spell(e.midi),
    durQ: e.durQ,
    tieStart: e.tieStart,
    tieStop: e.tieStop,
    rest: e.rest,
  };
}

function guitarVoices(events: Ev[]): string[] {
  return [...new Set(events.filter((e) => e.role === 'guitar').map((e) => e.voice))].sort();
}

function sounding(events: Ev[], role: Ev['role'], voice: string | undefined, t: number): Ev[] {
  return events.filter(
    (e) =>
      e.role === role &&
      !e.rest &&
      e.midi !== null &&
      (voice === undefined || e.voice === voice) &&
      e.absQ <= t + EPS &&
      e.absQ + e.durQ > t + EPS,
  );
}

function intervalFacts(guitar: Ev[], bass: Ev[]): string[] {
  if (!bass.length) return ['no-bass'];
  const out: string[] = [];
  for (const g of guitar) {
    for (const b of bass) {
      const semis = g.midi! - b.midi!;
      out.push(`${spell(g.midi!)}-${spell(b.midi!)} ${semis}st ${qual(semis)}`);
    }
  }
  return out.sort();
}

function buildAtoms(events: Ev[], voice: string): Atom[] {
  const notes = events
    .filter((e) => e.role === 'guitar' && e.voice === voice && !e.rest && e.midi !== null)
    .sort((a, b) => a.absQ - b.absQ || a.chordIndex - b.chordIndex);
  const atoms: Atom[] = [];
  const onsets = [...new Set(notes.map((e) => e.absQ))];
  for (const t of onsets) {
    const here = notes.filter((e) => near(e.absQ, t));
    if (here.length !== 1) continue;
    const e = here[0]!;
    const prev = atoms[atoms.length - 1];
    if (prev && e.tieStop && prev.midi === e.midi && near(prev.endQ, e.absQ)) {
      prev.endQ = e.absQ + e.durQ;
      prev.durQ = prev.endQ - prev.absQ;
      prev.tieSustain = true;
      prev.eventIds.push(eid(e));
      continue;
    }
    atoms.push({
      voice,
      midi: e.midi!,
      absQ: e.absQ,
      endQ: e.absQ + e.durQ,
      durQ: e.durQ,
      bar: e.bar,
      beat: e.beat,
      eventIds: [eid(e)],
      tieSustain: e.tieStop,
      reattack: !!prev && prev.midi === e.midi && !e.tieStop && near(prev.endQ, e.absQ) && !restBetween(events, voice, prev.endQ, e.absQ),
    });
  }
  return atoms;
}

function restBetween(events: Ev[], voice: string, from: number, to: number): boolean {
  return events.some((e) => e.role === 'guitar' && e.voice === voice && e.rest && e.absQ >= from - EPS && e.absQ < to - EPS);
}

function motionName(d1: number, d2: number): 'contrary' | 'similar' | 'parallel' | 'oblique-reattack' | 'static' {
  if (d1 === 0 && d2 === 0) return 'static';
  if (d1 === 0 || d2 === 0) return 'oblique-reattack';
  if (Math.sign(d1) !== Math.sign(d2)) return 'contrary';
  if (d1 === d2) return 'parallel';
  return 'similar';
}

export function bindBhlPhrase(events: readonly Ev[]): BhlRelationship[] {
  return bindPhrase(events);
}

function bindPhrase(events: readonly Ev[]): Relationship[] {
  const rels: Relationship[] = [];
  const voices = guitarVoices(events);
  const add = (r: Relationship) => rels.push(r);

  const chordGroups = new Map<string, Ev[]>();
  for (const e of events.filter((x) => x.role === 'guitar' && !x.rest && x.midi !== null)) {
    const list = chordGroups.get(e.group) ?? [];
    list.push(e);
    chordGroups.set(e.group, list);
  }
  for (const group of chordGroups.values()) {
    if (group.length < 2) continue;
    const host = group[0]!;
    const bass = sounding(events, 'bass', undefined, host.absQ);
    add({
      type: 'true-counterpoint',
      subtype: 'chord-tones',
      status: 'VERIFIED',
      bar: host.bar,
      beat: host.beat,
      absQ: host.absQ,
      durQ: host.durQ,
      instruments: [...new Set([host.instrument, ...bass.map((b) => b.instrument)])],
      voices: [host.voice],
      pitches: [...group, ...bass].map(pitchOf),
      eventIds: [...group, ...bass].map(eid),
      evidence: `One notated guitar voice ${host.voice} sounds ${group.map((g) => spell(g.midi!)).join('+')} together (chord tones, not independent voices). ${intervalFacts(group, bass).join('; ')}. No quality judgement.`,
    });
  }

  const atoms = new Map<string, Atom[]>();
  for (const voice of voices) atoms.set(voice, buildAtoms(events, voice));

  if (voices.length >= 2) {
    const [vA, vB] = [voices[0]!, voices[1]!];
    const aAtoms = atoms.get(vA)!;
    const bAtoms = atoms.get(vB)!;
    const times = [...new Set([...aAtoms, ...bAtoms].map((a) => a.absQ))].sort((a, b) => a - b);
    for (const t of times) {
      const a = aAtoms.find((atom) => near(atom.absQ, t));
      const b = bAtoms.find((atom) => near(atom.absQ, t));
      const aHold = aAtoms.find((atom) => atom.absQ < t - EPS && atom.endQ > t + EPS);
      const bHold = bAtoms.find((atom) => atom.absQ < t - EPS && atom.endQ > t + EPS);
      const host = events.find((e) => e.role === 'guitar' && near(e.absQ, t) && !e.rest)!;
      if (a && b) {
        const bass = sounding(events, 'bass', undefined, t);
        const semis = a.midi - b.midi;
        add({
          type: 'true-counterpoint',
          subtype: 'simultaneous-vertical',
          status: 'VERIFIED',
          bar: host.bar,
          beat: host.beat,
          absQ: t,
          durQ: Math.min(a.durQ, b.durQ),
          instruments: [...new Set([host.instrument, ...bass.map((n) => n.instrument)])],
          voices: [vA, vB],
          pitches: [
            ...events.filter((e) => e.role === 'guitar' && near(e.absQ, t) && !e.rest),
            ...bass,
          ].map(pitchOf),
          eventIds: [...a.eventIds, ...b.eventIds, ...bass.map(eid)],
          evidence: `Independent voices ${vA}=${spell(a.midi)} and ${vB}=${spell(b.midi)}; interval ${semis} st ${qual(semis)}. ${intervalFacts(
            events.filter((e) => e.role === 'guitar' && near(e.absQ, t) && !e.rest),
            bass,
          ).join('; ')}.`,
        });
        const aPrev = aAtoms.filter((atom) => atom.absQ < t - EPS).at(-1);
        const bPrev = bAtoms.filter((atom) => atom.absQ < t - EPS).at(-1);
        const aConn = !!aPrev && near(aPrev.endQ, t) && !restBetween(events, vA, aPrev.endQ, t);
        const bConn = !!bPrev && near(bPrev.endQ, t) && !restBetween(events, vB, bPrev.endQ, t);
        if (aPrev && bPrev && aConn && bConn) {
          const d1 = a.midi - aPrev.midi;
          const d2 = b.midi - bPrev.midi;
          const kind = motionName(d1, d2);
          if (kind !== 'static') {
            add({
              type: 'true-counterpoint',
              subtype: kind,
              status: 'VERIFIED',
              bar: host.bar,
              beat: host.beat,
              absQ: t,
              durQ: Math.min(a.durQ, b.durQ),
              instruments: [host.instrument],
              voices: [vA, vB],
              pitches: events.filter((e) => (a.eventIds.includes(eid(e)) || b.eventIds.includes(eid(e)) || aPrev.eventIds.includes(eid(e)) || bPrev.eventIds.includes(eid(e)))).map(pitchOf),
              eventIds: [...aPrev.eventIds, ...bPrev.eventIds, ...a.eventIds, ...b.eventIds],
              evidence: `Both voices connect into this attack with no intervening rest. Voice ${vA} ${spell(aPrev.midi)}→${spell(a.midi)} (${d1 >= 0 ? '+' : ''}${d1}). Voice ${vB} ${spell(bPrev.midi)}→${spell(b.midi)} (${d2 >= 0 ? '+' : ''}${d2}). ${a.reattack || b.reattack ? 'Zero delta is a reattack, not a tie-sustain.' : 'Both pitches change.'}`,
            });
          }
          const before = aPrev.midi - bPrev.midi;
          const after = a.midi - b.midi;
          if (before !== 0 && after !== 0 && Math.sign(before) !== Math.sign(after)) {
            add({
              type: 'true-counterpoint',
              subtype: 'voice-crossing',
              status: 'VERIFIED',
              bar: host.bar,
              beat: host.beat,
              absQ: t,
              durQ: Math.min(a.durQ, b.durQ),
              instruments: [host.instrument],
              voices: [vA, vB],
              pitches: events.filter((e) => [...aPrev.eventIds, ...bPrev.eventIds, ...a.eventIds, ...b.eventIds].includes(eid(e))).map(pitchOf),
              eventIds: [...aPrev.eventIds, ...bPrev.eventIds, ...a.eventIds, ...b.eventIds],
              evidence: `Pitch order reverses. Before: voice ${vA} ${spell(aPrev.midi)} vs voice ${vB} ${spell(bPrev.midi)} (${before} st). After: ${spell(a.midi)} vs ${spell(b.midi)} (${after} st).`,
            });
          }
        } else if (aPrev && bPrev && (aConn !== bConn)) {
          const broken = aConn ? vB : vA;
          add({
            type: 'true-counterpoint',
            subtype: 'rest-break',
            status: 'VERIFIED',
            bar: host.bar,
            beat: host.beat,
            absQ: t,
            durQ: 0,
            instruments: [host.instrument],
            voices: [vA, vB],
            pitches: [a, b].map((atom) => ({
              eventId: atom.eventIds[0]!,
              instrument: host.instrument,
              voice: atom.voice,
              midi: atom.midi,
              name: spell(atom.midi),
              durQ: atom.durQ,
              tieStart: false,
              tieStop: false,
              rest: false,
            })),
            eventIds: [...a.eventIds, ...b.eventIds],
            evidence: `Shared attack at bar ${host.bar} beat ${host.beat}, but voice ${broken} has a rest or gap before it. Counterpoint motion is not classified across that break.`,
          });
        }
      } else if ((a && !b && !bHold) || (b && !a && !aHold)) {
        const moving = (a ?? b)!;
        const silent = a ? vB : vA;
        add({
          type: 'rhythmic-dialogue',
          subtype: 'staggered-entry',
          status: 'VERIFIED',
          bar: host.bar,
          beat: host.beat,
          absQ: t,
          durQ: moving.durQ,
          instruments: [host.instrument],
          voices: [moving.voice, silent],
          pitches: events.filter((e) => moving.eventIds.includes(eid(e))).map(pitchOf),
          eventIds: moving.eventIds,
          evidence: `Guitar voice ${moving.voice} attacks ${spell(moving.midi)} while guitar voice ${silent} is silent. Rests stay breaks. Not a two-voice motion label.`,
        });
      }
      if ((a && bHold) || (b && aHold)) {
        const mover = (a ?? b)!;
        const held = (a ? bHold : aHold)!;
        add({
          type: 'sustain-release',
          subtype: 'sustain-overlap',
          status: 'VERIFIED',
          bar: host.bar,
          beat: host.beat,
          absQ: t,
          durQ: mover.durQ,
          instruments: [host.instrument],
          voices: [mover.voice, held.voice],
          pitches: events.filter((e) => mover.eventIds.includes(eid(e)) || held.eventIds.includes(eid(e))).map(pitchOf),
          eventIds: [...mover.eventIds, ...held.eventIds],
          evidence: `Voice ${held.voice} ${spell(held.midi)} remains sounding from ${held.absQ}q to ${held.endQ}q while voice ${mover.voice} enters ${spell(mover.midi)} at ${t}q. ${held.tieSustain ? 'Held span includes a tie.' : 'Held span is one duration, not a reattack.'}`,
        });
        add({
          type: 'true-counterpoint',
          subtype: 'oblique-sustain',
          status: 'VERIFIED',
          bar: host.bar,
          beat: host.beat,
          absQ: t,
          durQ: mover.durQ,
          instruments: [host.instrument],
          voices: [mover.voice, held.voice],
          pitches: events.filter((e) => mover.eventIds.includes(eid(e)) || held.eventIds.includes(eid(e))).map(pitchOf),
          eventIds: [...mover.eventIds, ...held.eventIds],
          evidence: `Oblique because voice ${held.voice} sustains ${spell(held.midi)} and voice ${mover.voice} moves to ${spell(mover.midi)}.`,
        });
      }
    }
  }

  for (const voice of voices) {
    for (const atom of atoms.get(voice) ?? []) {
      if (!atom.reattack) continue;
      add({
        type: 'sustain-release',
        subtype: 'reattack',
        status: 'VERIFIED',
        bar: atom.bar,
        beat: atom.beat,
        absQ: atom.absQ,
        durQ: atom.durQ,
        instruments: ['Electric Guitar'],
        voices: [voice],
        pitches: events.filter((e) => atom.eventIds.includes(eid(e))).map(pitchOf),
        eventIds: atom.eventIds,
        evidence: `Voice ${voice} reattacks ${spell(atom.midi)} at ${atom.absQ}q. tieStop is false. This is a new attack of the same pitch, not a sustain.`,
      });
    }
    const line = events.filter((e) => e.role === 'guitar' && e.voice === voice && !e.rest && e.midi !== null).sort((a, b) => a.absQ - b.absQ);
    for (let i = 1; i < line.length; i++) {
      const prev = line[i - 1]!;
      const cur = line[i]!;
      if (!cur.tieStop || prev.midi !== cur.midi || !near(prev.absQ + prev.durQ, cur.absQ)) continue;
      add({
        type: 'sustain-release',
        subtype: 'tie-sustain',
        status: 'VERIFIED',
        bar: cur.bar,
        beat: cur.beat,
        absQ: prev.absQ,
        durQ: prev.durQ + cur.durQ,
        instruments: [cur.instrument],
        voices: [voice],
        pitches: [prev, cur].map(pitchOf),
        eventIds: [eid(prev), eid(cur)],
        evidence: `Tie joins ${spell(prev.midi!)} from ${prev.absQ}q (${prev.durQ}q) to ${cur.absQ}q (${cur.durQ}q). One sustained pitch. Not a reattack.`,
      });
    }
  }

  const attackTimes = [...new Set(events.filter((e) => e.role === 'guitar' && !e.rest).map((e) => e.absQ))].sort((a, b) => a - b);
  const occurrencesBySet = new Map<string, Occurrence[]>();
  for (const t of attackTimes) {
    const guitar = events.filter((e) => e.role === 'guitar' && !e.rest && e.midi !== null && near(e.absQ, t)).sort((a, b) => a.midi! - b.midi!);
    if (!guitar.length) continue;
    const bass = sounding(events, 'bass', undefined, t);
    const key = [...new Set(guitar.map((g) => pc(g.midi!)))].sort((a, b) => a - b).join(',');
    const host = guitar[0]!;
    const occ: Occurrence = {
      bar: host.bar,
      beat: host.beat,
      absQ: t,
      durQ: host.durQ,
      voices: [...new Set(guitar.map((g) => g.voice))],
      pitches: guitar.map((g) => spell(g.midi!)),
      midis: guitar.map((g) => g.midi!),
      eventIds: guitar.map(eid),
      bass: bass.map((b) => spell(b.midi!)),
      bassMidis: bass.map((b) => b.midi!),
      bassEventIds: bass.map(eid),
      intervals: intervalFacts(guitar, bass),
    };
    const list = occurrencesBySet.get(key) ?? [];
    list.push(occ);
    occurrencesBySet.set(key, list);
  }
  for (const [key, occs] of [...occurrencesBySet.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (occs.length < 2) continue;
    const first = occs[0]!;
    add({
      type: 'cell-recurrence',
      subtype: 'pitch-class-set',
      status: 'VERIFIED',
      bar: first.bar,
      beat: first.beat,
      absQ: first.absQ,
      durQ: first.durQ,
      instruments: ['Electric Guitar'],
      voices: [...new Set(occs.flatMap((o) => o.voices))],
      pitches: [],
      eventIds: occs.flatMap((o) => o.eventIds),
      evidence: `Pitch-class set [${key}] occurs ${occs.length} times, including non-adjacent returns. Occurrences: ${occs.map((o) => `bar ${o.bar} beat ${o.beat} ${o.pitches.join('+')}`).join(' | ')}.`,
      occurrences: occs,
    });
    const signatures = occs.map((o) => o.intervals.join(' & '));
    const same = signatures.every((s) => s === signatures[0]);
    add({
      type: 'bass-reinterpretation',
      subtype: same ? 'bass-stable' : 'interval-change',
      status: 'VERIFIED',
      bar: first.bar,
      beat: first.beat,
      absQ: first.absQ,
      durQ: first.durQ,
      instruments: ['Electric Guitar', 'Upright Bass'],
      voices: [...new Set(occs.flatMap((o) => o.voices))],
      pitches: [],
      eventIds: occs.flatMap((o) => [...o.eventIds, ...o.bassEventIds]),
      evidence: `${same ? 'Bass intervals stay the same' : 'Bass intervals change'} for guitar pitch-class set [${key}]. ${occs.map((o) => `bar ${o.bar} beat ${o.beat} ${o.pitches.join('+')} over ${o.bass.join('+') || 'silence'} [${o.intervals.join('; ')}]`).join(' || ')}.`,
      occurrences: occs,
    });
  }

  for (const g of events.filter((e) => e.role === 'guitar' && !e.rest && e.midi !== null)) {
    const heldBass = sounding(events, 'bass', undefined, g.absQ).filter((b) => b.absQ < g.absQ - EPS);
    if (!heldBass.length || g.chordIndex !== 0) continue;
    add({
      type: 'rhythmic-dialogue',
      subtype: 'guitar-over-held-bass',
      status: 'VERIFIED',
      bar: g.bar,
      beat: g.beat,
      absQ: g.absQ,
      durQ: g.durQ,
      instruments: [g.instrument, heldBass[0]!.instrument],
      voices: [g.voice, ...heldBass.map((b) => b.voice)],
      pitches: [g, ...heldBass].map(pitchOf),
      eventIds: [eid(g), ...heldBass.map(eid)],
      evidence: `Guitar ${spell(g.midi)} attacks at bar ${g.bar} beat ${g.beat} while bass ${heldBass.map((b) => spell(b.midi!)).join('+')} is already sounding (onset ${heldBass[0]!.absQ}q, dur ${heldBass[0]!.durQ}q).`,
    });
  }

  for (const b of events.filter((e) => e.role === 'bass' && !e.rest && e.midi !== null)) {
    const guitarOn = sounding(events, 'guitar', undefined, b.absQ);
    if (guitarOn.length) continue;
    add({
      type: 'rhythmic-dialogue',
      subtype: 'bass-during-guitar-rest',
      status: 'VERIFIED',
      bar: b.bar,
      beat: b.beat,
      absQ: b.absQ,
      durQ: b.durQ,
      instruments: [b.instrument],
      voices: [b.voice],
      pitches: [pitchOf(b)],
      eventIds: [eid(b)],
      evidence: `Bass ${spell(b.midi)} attacks at bar ${b.bar} beat ${b.beat} while no guitar pitch is sounding.`,
    });
  }

  for (const holder of events.filter((e) => !e.rest && e.midi !== null)) {
    const interior = events.filter(
      (e) =>
        e !== holder &&
        !e.rest &&
        e.midi !== null &&
        e.absQ > holder.absQ + EPS &&
        e.absQ < holder.absQ + holder.durQ - EPS &&
        !(e.role === holder.role && e.voice === holder.voice && e.group === holder.group),
    );
    for (const enter of interior) {
      if (holder.chordIndex !== 0 && holder.role === 'guitar') continue;
      if (enter.chordIndex !== 0) continue;
      add({
        type: 'sustain-release',
        subtype: 'sustain-overlap',
        status: 'VERIFIED',
        bar: enter.bar,
        beat: enter.beat,
        absQ: enter.absQ,
        durQ: enter.durQ,
        instruments: [...new Set([holder.instrument, enter.instrument])],
        voices: [holder.voice, enter.voice],
        pitches: [holder, enter].map(pitchOf),
        eventIds: [eid(holder), eid(enter)],
        evidence: `${holder.instrument} voice ${holder.voice} ${spell(holder.midi!)} sounds from ${holder.absQ}q for ${holder.durQ}q. ${enter.instrument} voice ${enter.voice} ${spell(enter.midi!)} enters at ${enter.absQ}q, inside that span. ${holder.tieStart || holder.tieStop ? 'Tie flags are set on the held note.' : 'No tie on the held note; the duration itself sustains.'}`,
      });
    }
    const releases = events.filter(
      (e) => e.rest && e.role !== holder.role && e.absQ > holder.absQ + EPS && e.absQ < holder.absQ + holder.durQ - EPS,
    );
    for (const rest of releases) {
      if (holder.chordIndex !== 0) continue;
      add({
        type: 'sustain-release',
        subtype: 'release-under-sustain',
        status: 'VERIFIED',
        bar: rest.bar,
        beat: rest.beat,
        absQ: rest.absQ,
        durQ: rest.durQ,
        instruments: [holder.instrument, rest.instrument],
        voices: [holder.voice, rest.voice],
        pitches: [pitchOf(holder), pitchOf(rest)],
        eventIds: [eid(holder), eid(rest)],
        evidence: `${holder.instrument} ${spell(holder.midi!)} continues until ${holder.absQ + holder.durQ}q. ${rest.instrument} voice ${rest.voice} rests from bar ${rest.bar} beat ${rest.beat}.`,
      });
    }
  }

  const bars = [...new Set(events.map((e) => e.bar))].sort((a, b) => a - b);
  for (const bar of bars) {
    const grow = events.filter((e) => e.bar === bar && e.role === 'guitar');
    const brow = events.filter((e) => e.bar === bar && e.role === 'bass' && !e.rest && e.midi !== null);
    if (grow.length && grow.every((e) => e.rest) && brow.length) {
      add({
        type: 'rhythmic-dialogue',
        subtype: 'bass-only-ending',
        status: 'VERIFIED',
        bar,
        beat: brow[0]!.beat,
        absQ: brow[0]!.absQ,
        durQ: brow[brow.length - 1]!.absQ + brow[brow.length - 1]!.durQ - brow[0]!.absQ,
        instruments: [...new Set(brow.map((b) => b.instrument))],
        voices: [...new Set([...grow.map((g) => g.voice), ...brow.map((b) => b.voice)])],
        pitches: [...grow, ...brow].map(pitchOf),
        eventIds: [...grow, ...brow].map(eid),
        evidence: `Bar ${bar}: every guitar voice rests. Bass sounds ${brow.map((b) => `${spell(b.midi!)} beat ${b.beat} dur ${b.durQ}q`).join(', ')}.`,
      });
    }
    for (const rest of grow.filter((e) => e.rest && e.chordIndex === 0)) {
      const voiceNotes = grow.filter((e) => e.voice === rest.voice && e.chordIndex === 0);
      if (voiceNotes.every((e) => e.rest)) continue;
      add({
        type: 'sustain-release',
        subtype: 'rest',
        status: 'VERIFIED',
        bar: rest.bar,
        beat: rest.beat,
        absQ: rest.absQ,
        durQ: rest.durQ,
        instruments: [rest.instrument],
        voices: [rest.voice],
        pitches: [pitchOf(rest)],
        eventIds: [eid(rest)],
        evidence: `Guitar voice ${rest.voice} rests ${rest.durQ}q from bar ${rest.bar} beat ${rest.beat}. The rest breaks that voice.`,
      });
    }
    for (const note of events.filter((e) => e.bar === bar && e.role === 'guitar' && !e.rest && e.chordIndex === 0)) {
      if (Math.abs(note.beat - Math.round(note.beat)) <= 0.05) continue;
      add({
        type: 'rhythmic-dialogue',
        subtype: 'offbeat-attack',
        status: 'VERIFIED',
        bar: note.bar,
        beat: note.beat,
        absQ: note.absQ,
        durQ: note.durQ,
        instruments: [note.instrument],
        voices: [note.voice],
        pitches: events.filter((e) => e.role === 'guitar' && near(e.absQ, note.absQ) && !e.rest).map(pitchOf),
        eventIds: events.filter((e) => e.role === 'guitar' && near(e.absQ, note.absQ) && !e.rest).map(eid),
        evidence: `Guitar attack at bar ${note.bar} beat ${note.beat} in ${note.beats}/${note.beatType} is off the integer beat.`,
      });
    }
  }

  const rank = (t: RelType) => ['true-counterpoint', 'cell-recurrence', 'bass-reinterpretation', 'sustain-release', 'rhythmic-dialogue'].indexOf(t);
  rels.sort((a, b) => rank(a.type) - rank(b.type) || a.absQ - b.absQ || a.subtype.localeCompare(b.subtype));
  return rels;
}

function has(rels: BhlRelationship[], type: RelType, subtype: string, pred: (r: BhlRelationship) => boolean = () => true): BhlRelationship | undefined {
  return rels.find((r) => r.type === type && r.subtype === subtype && pred(r));
}

export interface BhlBinderCheck {
  id: string;
  pass: boolean;
  detail: string;
}
type Check = BhlBinderCheck;

function check(id: string, pass: boolean, detail: string): Check {
  return { id, pass, detail };
}

export function phase5bPalaceGatesChecks(rels: readonly BhlRelationship[]): BhlBinderCheck[] {
  const down = has(rels, 'true-counterpoint', 'simultaneous-vertical', (r) => r.bar === 43 && r.beat === 1);
  const names = down?.pitches.map((p) => p.name).join(',') ?? '';
  const octave = has(rels, 'true-counterpoint', 'simultaneous-vertical', (r) => r.bar === 44 && r.beat === 5 && r.evidence.includes('12 st'));
  const staggers = rels.filter((r) => r.subtype === 'staggered-entry');
  const staggerNeed = [
    [43, 4],
    [44, 3],
    [44, 4],
    [45, 1],
    [45, 3],
  ];
  const staggerHit = staggerNeed.filter(([bar, beat]) => staggers.some((s) => s.bar === bar && s.beat === beat));
  const ending = has(rels, 'rhythmic-dialogue', 'bass-only-ending', (r) => r.bar === 46);
  const bassLine = ending?.pitches.filter((p) => !p.rest).map((p) => p.name).join('-') ?? '';
  const voices = new Set(rels.filter((r) => r.type === 'true-counterpoint').flatMap((r) => r.voices));
  const chordTones = rels.filter((r) => r.subtype === 'chord-tones');
  const parallel = rels.filter((r) => r.subtype === 'parallel');
  const crossing = rels.filter((r) => r.subtype === 'voice-crossing');
  return [
    check('PG43-G3/E3-over-B2', !!down && names.includes('G3') && names.includes('E3') && names.includes('B2'), names),
    check('PG44-C4/C3-octave', !!octave, octave?.evidence ?? 'missing'),
    check('PG-independent-voices', voices.has('1') && voices.has('2') && chordTones.length === 0, `voices ${[...voices].join(',')} chordToneGroups ${chordTones.length}`),
    check('PG-staggered-attacks', staggerHit.length === staggerNeed.length, `${staggerHit.length}/${staggerNeed.length}`),
    check('PG46-guitar-silence-bass-B2-A2-G2-E2', !!ending && bassLine === 'B2-A2-G2-E2', bassLine),
    check('PG-no-false-parallel', parallel.length === 0, `parallel ${parallel.length}`),
    check('PG-no-false-voice-crossing', crossing.length === 0, `crossing ${crossing.length}`),
  ];
}

export function phase5bWrongTurningChecks(rels: readonly BhlRelationship[]): BhlBinderCheck[] {
  const cells = rels.filter((r) => r.type === 'cell-recurrence');
  const dg = cells.find((r) => r.occurrences?.some((o) => o.pitches.join('+') === 'D4+G4'));
  const ea = cells.find((r) => r.occurrences?.some((o) => o.pitches.join('+') === 'E4+A4'));
  const dgN = dg?.occurrences?.filter((o) => o.pitches.join('+') === 'D4+G4').length ?? 0;
  const eaN = ea?.occurrences?.filter((o) => o.pitches.join('+') === 'E4+A4').length ?? 0;
  const eaOcc = ea?.occurrences?.filter((o) => o.pitches.join('+') === 'E4+A4') ?? [];
  const bassNames = eaOcc.map((o) => o.bass.join('+')).join(' | ');
  const intervalText = eaOcc.map((o) => o.intervals.join('; ')).join(' || ');
  const want = ['TT', 'M7', 'M6', 'M2', 'P1', 'P4'];
  const intervalsOk = want.every((q) => intervalText.includes(q));
  const bassOk = bassNames.includes('Bb2') && bassNames.includes('G2') && bassNames.includes('E2');
  const triad = has(rels, 'true-counterpoint', 'chord-tones', (r) => r.bar === 36 && r.beat === 1);
  const triadNames = triad?.pitches.map((p) => p.name).sort().join(',') ?? '';
  const judged = /expressive|successful|\bBHL\b|intentional|liquid/i.test(JSON.stringify(rels));
  const off = rels.filter((r) => r.subtype === 'offbeat-attack');
  const rests = rels.filter((r) => r.subtype === 'rest');
  const motion = rels.filter((r) => ['contrary', 'similar', 'parallel', 'oblique-reattack', 'oblique-sustain'].includes(r.subtype));
  return [
    check('WT-D4+G4-four', dgN === 4, `${dgN}: ${dg?.evidence ?? ''}`),
    check('WT-E4+A4-three', eaN === 3, `${eaN}: ${ea?.evidence ?? ''}`),
    check('WT-E4+A4-bass-Bb2-G2-E2', bassOk, bassNames),
    check('WT-E4+A4-intervals-differ', intervalsOk && eaOcc.length === 3, intervalText),
    check('WT36-B3+D4+E4-over-Bb2-no-judgement', !!triad && triadNames.includes('B3') && triadNames.includes('D4') && triadNames.includes('E4') && triadNames.includes('Bb2') && !judged, triadNames),
    check('WT-offbeats', off.filter((r) => [33, 34, 35, 36].includes(r.bar)).length >= 4, off.map((r) => `${r.bar}:${r.beat}`).join(',')),
    check('WT-rests-kept', rests.some((r) => r.bar === 33 && r.beat === 1 && r.durQ === 1), `rests ${rests.length}`),
    check('WT-no-fake-voice-motion', motion.length === 0, `motion ${motion.length}`),
  ];
}

export function phase5bControlChecks(name: string, rels: readonly BhlRelationship[]): BhlBinderCheck[] {
  if (name === 'reattack-vs-sustain') {
    const overlap = rels.filter((r) => r.subtype === 'sustain-overlap');
    const reattack = rels.filter((r) => r.subtype === 'reattack');
    const ties = rels.filter((r) => r.subtype === 'tie-sustain');
    const overlapIds = new Set(overlap.flatMap((r) => r.eventIds));
    const reattackSeparate = reattack.every((r) => r.eventIds.every((id) => !overlapIds.has(id)));
    return [
      check('CTRL-sustain-overlap', overlap.some((r) => r.evidence.includes('enters') || r.evidence.includes('inside')), overlap.map((r) => r.evidence).join(' ## ')),
      check('CTRL-reattack', reattack.length === 1 && reattack[0]!.bar === 3, `reattacks ${reattack.map((r) => r.bar + ':' + r.beat).join(',')}`),
      check('CTRL-tie-not-reattack', ties.length === 1 && reattackSeparate, `ties ${ties.length} separate ${reattackSeparate}`),
    ];
  }
  if (name === 'voice-crossing') {
    return [check('CTRL-voice-crossing', rels.some((r) => r.subtype === 'voice-crossing'), rels.filter((r) => r.subtype === 'voice-crossing').map((r) => r.evidence).join(' ## '))];
  }
  if (name === 'parallel-motion') {
    const parallel = rels.filter((r) => r.subtype === 'parallel');
    const similar = rels.filter((r) => r.subtype === 'similar');
    return [
      check('CTRL-parallel', parallel.length === 1 && parallel[0]!.evidence.includes('+2') && parallel[0]!.evidence.includes('+2'), parallel.map((r) => r.evidence).join(' ## ')),
      check('CTRL-parallel-not-similar', similar.length === 0, `similar ${similar.length}`),
    ];
  }
  if (name === 'dyad-changing-bass') {
    const change = rels.find((r) => r.type === 'bass-reinterpretation' && r.subtype === 'interval-change' && r.evidence.includes('D4+G4'));
    const stable = rels.find((r) => r.type === 'bass-reinterpretation' && r.subtype === 'bass-stable' && r.evidence.includes('D4+G4'));
    return [check('CTRL-changing-bass', !!change && !stable && change.evidence.includes('A2') && change.evidence.includes('G2'), change?.evidence ?? 'missing')];
  }
  if (name === 'dyad-stable-bass') {
    const change = rels.find((r) => r.type === 'bass-reinterpretation' && r.subtype === 'interval-change' && r.evidence.includes('D4+G4'));
    const stable = rels.find((r) => r.type === 'bass-reinterpretation' && r.subtype === 'bass-stable' && r.evidence.includes('D4+G4'));
    return [check('CTRL-stable-bass', !!stable && !change, stable?.evidence ?? change?.evidence ?? 'missing')];
  }
  return [check(`${name}-unspecified`, false, 'no checker')];
}

let fx = 0;
function makeEv(p: Partial<Ev> & Pick<Ev, 'bar' | 'beat' | 'absQ' | 'durQ' | 'role' | 'voice' | 'midi'>): Ev {
  fx += 1;
  const rest = p.rest ?? p.midi === null;
  return {
    onsetTicks: 0,
    partId: p.role === 'bass' ? 'B' : 'G',
    instrument: p.role === 'bass' ? 'Upright Bass' : 'Electric Guitar',
    tieStart: false,
    tieStop: false,
    chordIndex: 0,
    group: p.group ?? `fx-${fx}`,
    divisions: 1,
    beats: 4,
    beatType: 4,
    rest,
    ...p,
    midi: rest ? null : p.midi,
  };
}

export function phase5bControlFixtures(): Record<string, BhlBinderEvent[]> {
  fx = 0;
  return buildControlFixtures();
}

function buildControlFixtures(): Record<string, Ev[]> {
  const sustainHold = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 2, role: 'guitar', voice: '1', midi: 60 });
  const sustainBass = makeEv({ bar: 1, beat: 3, absQ: 1, durQ: 1, role: 'bass', voice: '1', midi: 43 });
  const tieA = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'guitar', voice: '1', midi: 60, tieStart: true });
  const tieB = makeEv({ bar: 2, beat: 3, absQ: 5, durQ: 1, role: 'guitar', voice: '1', midi: 60, tieStop: true });
  const reA = makeEv({ bar: 3, beat: 1, absQ: 8, durQ: 1, role: 'guitar', voice: '1', midi: 60 });
  const reB = makeEv({ bar: 3, beat: 3, absQ: 9, durQ: 1, role: 'guitar', voice: '1', midi: 60 });

  const crossA1 = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '1', midi: 64 });
  const crossB1 = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '2', midi: 60 });
  const crossA2 = makeEv({ bar: 1, beat: 3, absQ: 1, durQ: 1, role: 'guitar', voice: '1', midi: 60 });
  const crossB2 = makeEv({ bar: 1, beat: 3, absQ: 1, durQ: 1, role: 'guitar', voice: '2', midi: 64 });

  const parA1 = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '1', midi: 60 });
  const parB1 = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '2', midi: 55 });
  const parA2 = makeEv({ bar: 1, beat: 3, absQ: 1, durQ: 1, role: 'guitar', voice: '1', midi: 62 });
  const parB2 = makeEv({ bar: 1, beat: 3, absQ: 1, durQ: 1, role: 'guitar', voice: '2', midi: 57 });

  const g1 = 'chg-1';
  const ch1a = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '1', midi: 62, group: g1, chordIndex: 0 });
  const ch1b = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '1', midi: 67, group: g1, chordIndex: 1 });
  const chBass1 = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'bass', voice: '1', midi: 45 });
  const sep = makeEv({ bar: 1, beat: 3, absQ: 2, durQ: 1, role: 'guitar', voice: '1', midi: 64 });
  const g2 = 'chg-2';
  const ch2a = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'guitar', voice: '1', midi: 62, group: g2, chordIndex: 0 });
  const ch2b = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'guitar', voice: '1', midi: 67, group: g2, chordIndex: 1 });
  const chBass2 = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'bass', voice: '1', midi: 43 });

  const s1 = 'stb-1';
  const st1a = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '1', midi: 62, group: s1, chordIndex: 0 });
  const st1b = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'guitar', voice: '1', midi: 67, group: s1, chordIndex: 1 });
  const stBass1 = makeEv({ bar: 1, beat: 1, absQ: 0, durQ: 1, role: 'bass', voice: '1', midi: 43 });
  const sep2 = makeEv({ bar: 1, beat: 3, absQ: 2, durQ: 1, role: 'guitar', voice: '1', midi: 65 });
  const s2 = 'stb-2';
  const st2a = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'guitar', voice: '1', midi: 62, group: s2, chordIndex: 0 });
  const st2b = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'guitar', voice: '1', midi: 67, group: s2, chordIndex: 1 });
  const stBass2 = makeEv({ bar: 2, beat: 1, absQ: 4, durQ: 1, role: 'bass', voice: '1', midi: 43 });

  return {
    'reattack-vs-sustain': [sustainHold, sustainBass, tieA, tieB, reA, reB],
    'voice-crossing': [crossA1, crossB1, crossA2, crossB2],
    'parallel-motion': [parA1, parB1, parA2, parB2],
    'dyad-changing-bass': [ch1a, ch1b, chBass1, sep, ch2a, ch2b, chBass2],
    'dyad-stable-bass': [st1a, st1b, stBass1, sep2, st2a, st2b, stBass2],
  };
}

export const PHASE5B_CHECK_COUNT = 23;

const PALACE_GATES_REL =
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/02-Palace-Gates/02-Palace-Gates-Integrated-Guitar-Study-V1.0.musicxml';
const WRONG_TURNING_REL =
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function childText(parent: Element | undefined, name: string): string {
  if (!parent) return '';
  return elementChildren(parent, name)[0]?.textContent?.trim() ?? '';
}

function meterOf(view: PcMeasureView, carry: { beats: number; beatType: number }): { beats: number; beatType: number } {
  for (const attributes of elementChildren(view.element, 'attributes')) {
    const time = elementChildren(attributes, 'time')[0];
    if (!time) continue;
    const beats = Number(childText(time, 'beats'));
    const beatType = Number(childText(time, 'beat-type'));
    if (beats > 0 && beatType > 0) {
      carry.beats = beats;
      carry.beatType = beatType;
    }
  }
  return { ...carry };
}

export interface BhlBinderLoad {
  events: BhlBinderEvent[];
  guitarId: string;
  bassId: string;
  /** Bass attacks in the span: absTimeline count, measureViews count, unmatched absTimeline notes. */
  bassCrossCheck: { timeline: number; measureViews: number; unmatched: number };
}

/** Flatten `measureViews` into binder events. Does not parse MusicXML itself. */
export function loadBhlBinderEvents(xml: string, fromBar: number, toBar: number): BhlBinderLoad {
  const doc = parseScoreDocument(xml);
  const names = partNames(doc);
  const events: Ev[] = [];
  const viewsByPart = new Map<string, PcMeasureView[]>();
  let guitarId = '';
  let bassId = '';
  for (const part of partElements(doc)) {
    const id = part.getAttribute('id') ?? '';
    const instrument = names.get(id) ?? id;
    const role: Ev['role'] = /guitar|gtr/i.test(instrument) ? 'guitar' : /bass/i.test(instrument) ? 'bass' : 'other';
    if (role === 'guitar' && !guitarId) guitarId = id;
    if (role === 'bass' && !bassId) bassId = id;
    const views = measureViews(part);
    viewsByPart.set(id, views);
    const carry = { beats: 4, beatType: 4 };
    for (const view of views) {
      const bar = Number(view.printed);
      if (!Number.isFinite(bar) || bar < fromBar || bar > toBar) {
        meterOf(view, carry);
        continue;
      }
      const meter = meterOf(view, carry);
      const ticksPerBeat = view.divisions * (4 / meter.beatType);
      let seq = 0;
      for (const note of view.notes) {
        const group = `${id}:${view.order}:${note.voice}:${note.onset}:${seq}`;
        const beat = note.onset / ticksPerBeat + 1;
        const base = {
          bar,
          onsetTicks: note.onset,
          absQ: 0,
          durQ: note.ticks / view.divisions,
          partId: id,
          instrument,
          role,
          voice: note.voice,
          rest: note.rest,
          tieStart: note.tieStart,
          tieStop: note.tieStop,
          beat: round3(beat),
          divisions: view.divisions,
          beats: meter.beats,
          beatType: meter.beatType,
        };
        if (note.rest || note.midis.length === 0) {
          events.push({ ...base, midi: null, chordIndex: 0, group: `${group}:r` });
        } else {
          note.midis.forEach((midi, chordIndex) => {
            events.push({ ...base, midi, chordIndex, group: `${group}:c` });
          });
        }
        if (!note.rest || note.midis.length === 0) seq += 1;
      }
    }
  }
  const guitarViews = viewsByPart.get(guitarId);
  if (!guitarViews) throw new Error('no guitar part for binder timeline');
  const barStart: number[] = [];
  let cursor = 0;
  for (const view of guitarViews) {
    barStart.push(cursor);
    cursor += view.length / view.divisions;
  }
  for (const event of events) {
    const view = viewsByPart.get(event.partId)!.find((candidate) => Number(candidate.printed) === event.bar)!;
    event.absQ = round3(barStart[view.order - 1]! + event.onsetTicks / view.divisions);
    event.durQ = round3(event.durQ);
  }
  events.sort((a, b) => a.absQ - b.absQ || a.role.localeCompare(b.role) || a.voice.localeCompare(b.voice) || (a.midi ?? -1) - (b.midi ?? -1));
  const timeline = absTimeline(doc, guitarId, '1');
  const start = timeline.barStart[fromBar - 1]!;
  const end = timeline.barStart[toBar - 1]! + timeline.barLen[toBar - 1]!;
  const mine = events.filter((event) => event.role === 'bass' && !event.rest);
  const theirs = timeline.bass.filter((note) => note.start >= start - 1e-6 && note.start < end - 1e-6);
  const unmatched = theirs.filter((note) => !mine.some((event) => Math.abs(event.absQ - note.start) < EPS && event.midi === note.midi)).length;
  return {
    events,
    guitarId,
    bassId,
    bassCrossCheck: { timeline: theirs.length, measureViews: mine.length, unmatched },
  };
}

export function phase5bFixtureChecks(albumRoot: string): BhlBinderCheck[] {
  const palace = loadBhlBinderEvents(readFileSync(`${albumRoot}/${PALACE_GATES_REL}`, 'utf8'), 43, 46);
  const turning = loadBhlBinderEvents(readFileSync(`${albumRoot}/${WRONG_TURNING_REL}`, 'utf8'), 33, 36);
  const checks = [
    ...phase5bPalaceGatesChecks(bindBhlPhrase(palace.events)),
    ...phase5bWrongTurningChecks(bindBhlPhrase(turning.events)),
  ];
  for (const [name, events] of Object.entries(phase5bControlFixtures())) {
    checks.push(...phase5bControlChecks(name, bindBhlPhrase(events)));
  }
  return checks;
}

export interface BhlReading {
  topic: string;
  status: BhlBinderStatus;
  text: string;
}

export interface BhlSnapReading {
  bar: number;
  onsetQuarters: number;
  fromPc: number;
  toPc: number;
  reason: BhlFieldSnap['reason'];
  proposalInField: boolean;
  soundedPc: number;
  operatorContributedSoundingPitch: boolean;
  text: string;
}

const PC_NAME = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const mod12 = (value: number) => ((value % 12) + 12) % 12;
const pcName = (value: number) => PC_NAME[mod12(value)]!;

function nearestFieldPc(pitchClass: number, field: readonly number[]): number {
  const target = mod12(pitchClass);
  let best = field[0] ?? target;
  let bestDistance = 99;
  for (const candidate of field) {
    const raw = Math.abs(target - candidate);
    const distance = Math.min(raw, 12 - raw);
    if (distance < bestDistance || (distance === bestDistance && candidate < best)) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

function explainLayerPcs(plan: BhlPhrasePlan, region: BhlPhrasePlan['regions'][number]): number[] {
  const motif: BaseMotif = {
    id: plan.motif.id,
    barCount: 1,
    notes: plan.motif.pitchClasses.map((pitchClass, index) => ({
      pitch: 60 + pitchClass,
      startBeat: index * 0.5,
      duration: 0.5,
    })),
  };
  const variant = region.pitchTransform === 'invert-into-field' ? 'inversion_lite' : 'original';
  const tracked = varyMotif(motif, variant, region.transposeSemitones, 0).map((note) => mod12(note.pitch));
  const layer: LayerNote[] = tracked.map((pitchClass, index) => ({
    pitchClass,
    beatPosition: index * 0.5,
    duration: 0.5,
  }));
  const layers = transformMotifThroughLayers(layer, region.vaultChordType, region.vaultRootPc);
  const chosen = layers[region.tensionState];
  return (chosen.length ? chosen : layer).map((note) => mod12(note.pitchClass));
}

function explainIntended(region: BhlPhrasePlan['regions'][number], bar: BhlBassBar, plan: BhlPhrasePlan, tracked: readonly number[]): number[] {
  const local = bar.pitchClasses.filter((pitchClass) => region.pitchClasses.includes(pitchClass));
  const field = local.length ? local : [...region.pitchClasses];
  if (region.pitchTransform === 'reproject-neighbor') return neighborCell(field);
  if (region.pitchTransform === 'retain-and-admit-bass') return [bar.rootPc];
  if (region.pitchTransform === 'neighbor-statement' || region.pitchTransform === 'recall-cell') return [...plan.motif.pitchClasses];
  return [...tracked];
}

/**
 * Replay the iteration 2 pitch choice and say whether the harmonic operator
 * survived the field. Does not write notes.
 */
function midiNear(pitchClass: number, low: number, high: number, previous: number | null): number {
  const candidates: number[] = [];
  for (let midi = low; midi <= high; midi++) if (mod12(midi) === mod12(pitchClass)) candidates.push(midi);
  if (!candidates.length) {
    for (let midi = 48; midi <= 84; midi++) if (mod12(midi) === mod12(pitchClass)) candidates.push(midi);
  }
  const anchor = previous ?? 67;
  return candidates.sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor) || a - b)[0]!;
}

function partnerBelow(melodyMidi: number, field: readonly number[], low: number): number | null {
  const melodyPc = mod12(melodyMidi);
  const ranked = field
    .map((pitchClass) => ({ pitchClass, interval: mod12(melodyPc - pitchClass) }))
    .filter((item) => item.interval >= 1 && item.interval <= 4)
    .sort((a, b) => a.interval - b.interval || a.pitchClass - b.pitchClass);
  for (const item of ranked) {
    const midi = melodyMidi - item.interval;
    if (midi < low) continue;
    if (assessGuitarFeasibility([midi, melodyMidi]).feasible) return midi;
  }
  return null;
}

export function explainBhlFieldSnaps(plan: BhlPhrasePlan, bars: readonly BhlBassBar[]): BhlSnapReading[] {
  const onsetPlans = planPhraseOnsets(bars, plan.regions);
  const readings: BhlSnapReading[] = [];
  let previous: number | null = null;
  for (const region of plan.regions) {
    const motif: BaseMotif = {
      id: plan.motif.id,
      barCount: 1,
      notes: plan.motif.pitchClasses.map((pitchClass, index) => ({
        pitch: 60 + pitchClass,
        startBeat: index * 0.5,
        duration: 0.5,
      })),
    };
    const variant = region.pitchTransform === 'invert-into-field' ? 'inversion_lite' : 'original';
    const tracked = varyMotif(motif, variant, region.transposeSemitones, 0).map((note) => mod12(note.pitch));
    const layered = explainLayerPcs(plan, region);
    for (const onset of onsetPlans.filter((item) => region.bars.includes(item.bar))) {
      const bar = bars.find((candidate) => candidate.bar === onset.bar);
      if (!bar) throw new Error(`missing bass bar ${onset.bar}`);
      const field = region.pitchClasses;
      const intended = explainIntended(region, bar, plan, tracked);
      onset.onsets.forEach((start, index) => {
        const figure = intended.length > onset.onsets.length ? intended.slice(intended.length - onset.onsets.length) : intended;
        const proposal = layered[index % Math.max(layered.length, 1)] ?? figure[0] ?? bar.rootPc;
        let pitchClass = figure[index] ?? figure[figure.length - 1] ?? bar.rootPc;
        if (region.pitchTransform === 'retain-and-admit-bass' && index > 0) {
          const ordered = [...field].sort((a, b) => a - b);
          pitchClass = ordered.find((candidate) => candidate !== bar.rootPc && candidate !== pitchClass) ?? pitchClass;
        }
        const figureBeforeSnap = pitchClass;
        if (!field.includes(pitchClass)) {
          const snapped = nearestFieldPc(pitchClass, field);
          readings.push({
            bar: onset.bar,
            onsetQuarters: start,
            fromPc: pitchClass,
            toPc: snapped,
            reason: 'invert-or-transpose',
            proposalInField: field.includes(proposal),
            soundedPc: snapped,
            operatorContributedSoundingPitch: false,
            text: `Bar ${onset.bar} beat ${start}: figure ${pcName(pitchClass)} is outside the field {${field.map(pcName).join(',')}}. Nearest field pitch ${pcName(snapped)} replaces it. The harmonic-operator pitch is not this correction.`,
          });
          pitchClass = snapped;
        }
        if (proposal !== pitchClass) {
          const proposalInField = field.includes(mod12(proposal));
          readings.push({
            bar: onset.bar,
            onsetQuarters: start,
            fromPc: proposal,
            toPc: pitchClass,
            reason: 'vault-layer',
            proposalInField,
            soundedPc: pitchClass,
            operatorContributedSoundingPitch: false,
            text: proposalInField
              ? `Bar ${onset.bar} beat ${start}: operator proposed ${pcName(proposal)}, which is inside the field, and the phrase figure ${pcName(pitchClass)} replaced it.`
              : `Bar ${onset.bar} beat ${start}: operator proposed ${pcName(proposal)}, outside the field {${field.map(pcName).join(',')}}. Sounding pitch class is ${pcName(pitchClass)} from the phrase figure.`,
          });
        }
      });
    }
  }
  return readings;
}

function guitarAttacks(events: readonly Ev[]): Array<{ bar: number; beat: number; absQ: number; midis: number[]; names: string[] }> {
  const times = [...new Set(events.filter((event) => event.role === 'guitar' && !event.rest && event.midi !== null).map((event) => event.absQ))].sort((a, b) => a - b);
  return times.map((absQ) => {
    const group = events.filter((event) => event.role === 'guitar' && !event.rest && event.midi !== null && near(event.absQ, absQ));
    const host = group[0]!;
    const midis = group.map((event) => event.midi!).sort((a, b) => a - b);
    return { bar: host.bar, beat: host.beat, absQ, midis, names: midis.map(spell) };
  });
}

function beatKey(beats: number[]): string {
  return beats.map((beat) => String(Math.round(beat * 1000) / 1000)).join(',');
}

export function readBhlPhrase(
  events: readonly BhlBinderEvent[],
  context?: { plan?: BhlPhrasePlan; snapReadings?: readonly BhlSnapReading[] },
): BhlReading[] {
  const rels = bindBhlPhrase(events);
  const out: BhlReading[] = [];
  const cells = rels.filter((rel) => rel.type === 'cell-recurrence');
  if (!cells.length) {
    out.push({ topic: 'recurring-dyads', status: 'VERIFIED', text: 'No guitar pitch-class set returns twice in this span.' });
  }
  for (const cell of cells) {
    const places = cell.occurrences?.map((item) => `bar ${item.bar} beat ${item.beat} ${item.pitches.join('+')}`).join(' | ') ?? cell.evidence;
    const nonAdjacent = (cell.occurrences ?? []).some((item, index, all) => index > 0 && item.bar > all[index - 1]!.bar + 1);
    out.push({
      topic: 'recurring-dyads',
      status: 'VERIFIED',
      text: `Pitch-class set returns ${cell.occurrences?.length ?? 0} times${nonAdjacent ? ', including a non-adjacent bar gap' : ''}: ${places}.`,
    });
  }
  const attacks = guitarAttacks(events);
  const tops = attacks.map((attack) => ({ ...attack, top: Math.max(...attack.midis) }));
  const steps = tops.slice(1).map((attack, index) => {
    const previous = tops[index]!;
    const delta = attack.top - previous.top;
    return `bar ${previous.bar} beat ${previous.beat} ${spell(previous.top)} → bar ${attack.bar} beat ${attack.beat} ${spell(attack.top)} (${delta >= 0 ? '+' : ''}${delta})`;
  });
  out.push({
    topic: 'pitch-interval-motion',
    status: 'VERIFIED',
    text: steps.length ? steps.join('; ') : 'Fewer than two guitar attacks.',
  });
  out.push({
    topic: 'pitch-interval-motion',
    status: 'INFERRED',
    text: 'Interval steps are measured. They are not labelled a successful transformation. A later copy of the same pitches is recurrence, which can be stagnation.',
  });
  const chordTones = rels.filter((rel) => rel.subtype === 'chord-tones');
  const independent = rels.filter((rel) => rel.subtype === 'simultaneous-vertical');
  out.push({
    topic: 'voices-versus-chord-tones',
    status: 'VERIFIED',
    text: `${independent.length} simultaneous two-voice attacks. ${chordTones.length} single-voice chords (chord tones, not independent voices). ${rels.filter((rel) => rel.subtype === 'parallel').length} parallel motions. ${rels.filter((rel) => rel.subtype === 'voice-crossing').length} voice crossings.`,
  });
  const dialogue = rels.filter((rel) => rel.type === 'rhythmic-dialogue');
  out.push({
    topic: 'guitar-bass-dialogue',
    status: 'VERIFIED',
    text: dialogue.length
      ? dialogue.map((rel) => `${rel.subtype} bar ${rel.bar} beat ${rel.beat}`).join('; ')
      : 'No guitar-over-held-bass, bass-during-guitar-rest, bass-only bar, or offbeat guitar attack in this span.',
  });
  out.push({
    topic: 'guitar-bass-dialogue',
    status: 'INFERRED',
    text: 'A bass pitch under a guitar attack is a vertical fact. It is not evidence that the bass line answers the guitar.',
  });
  const holds = rels.filter((rel) => ['tie-sustain', 'reattack', 'rest', 'sustain-overlap', 'release-under-sustain'].includes(rel.subtype));
  out.push({
    topic: 'sustain-tie-reattack-rest',
    status: 'VERIFIED',
    text: holds.length
      ? holds.map((rel) => `${rel.subtype} bar ${rel.bar} beat ${rel.beat} dur ${rel.durQ}q`).join('; ')
      : 'No tie, reattack, internal rest, or sustain-overlap classified.',
  });
  const bassChange = rels.filter((rel) => rel.type === 'bass-reinterpretation');
  for (const rel of bassChange) {
    out.push({ topic: 'changing-bass', status: 'VERIFIED', text: rel.evidence });
  }
  if (!bassChange.length) {
    out.push({ topic: 'changing-bass', status: 'VERIFIED', text: 'No repeated guitar pitch-class set, so no bass reinterpretation of a return.' });
  }
  const byBar = new Map<number, { guitar: number[]; bass: number[] }>();
  for (const event of events) {
    if (event.rest || event.chordIndex !== 0) continue;
    const row = byBar.get(event.bar) ?? { guitar: [], bass: [] };
    if (event.role === 'guitar') row.guitar.push(event.beat);
    if (event.role === 'bass') row.bass.push(event.beat);
    byBar.set(event.bar, row);
  }
  const grids = [...byBar.entries()].sort((a, b) => a[0] - b[0]).map(([bar, row]) => {
    const guitar = beatKey([...new Set(row.guitar)].sort((a, b) => a - b));
    const bass = beatKey([...new Set(row.bass)].sort((a, b) => a - b));
    return { bar, guitar, bass };
  });
  const guitarGroups = new Map<string, number[]>();
  for (const grid of grids) {
    const list = guitarGroups.get(grid.guitar) ?? [];
    list.push(grid.bar);
    guitarGroups.set(grid.guitar, list);
  }
  const repeated = [...guitarGroups.entries()].filter(([, bars]) => bars.length >= 2 && bars[0] !== undefined);
  out.push({
    topic: 'phrase-rhythm',
    status: 'VERIFIED',
    text: grids.map((grid) => `bar ${grid.bar} guitar beats [${grid.guitar || 'rest'}] bass beats [${grid.bass || 'rest'}]`).join('; '),
  });
  out.push({
    topic: 'phrase-rhythm',
    status: repeated.length ? 'VERIFIED' : 'VERIFIED',
    text: repeated.length
      ? `Guitar attack grid repeats: ${repeated.map(([grid, bars]) => `[${grid}] on bars ${bars.join(',')}`).join('; ')}.`
      : 'No guitar attack-beat grid is shared by two bars.',
  });
  const sameGuitarDifferentBass = grids.filter((grid, index, all) =>
    all.some((other) => other.bar !== grid.bar && other.guitar === grid.guitar && other.guitar !== '' && other.bass !== grid.bass),
  );
  out.push({
    topic: 'phrase-rhythm',
    status: 'INFERRED',
    text: sameGuitarDifferentBass.length
      ? `Bars ${[...new Set(sameGuitarDifferentBass.map((grid) => grid.bar))].join(',')} keep one guitar attack grid while the bass attack beats differ. That is a change of bass placement under a repeated guitar grid. It is not, by itself, a bass answer.`
      : 'Where the guitar attack grid changes, the change is in the guitar onset list. Do not describe that as bass dialogue unless the bass attacks themselves move against a held guitar grid.',
  });
  const eLandings = tops.filter((attack) => mod12(attack.top) === 4);
  out.push({
    topic: 'e-landings',
    status: 'VERIFIED',
    text: eLandings.length
      ? `Top guitar note is E at ${eLandings.map((attack) => `bar ${attack.bar} beat ${attack.beat} ${spell(attack.top)}`).join('; ')}.`
      : 'No guitar attack tops out on E.',
  });
  const eRun = (() => {
    let run = 0;
    let worst = 0;
    for (const attack of tops) {
      if (mod12(attack.top) === 4) {
        run += 1;
        worst = Math.max(worst, run);
      } else run = 0;
    }
    return worst;
  })();
  const uniqueTopPcs = [...new Set(tops.map((attack) => mod12(attack.top)))];
  out.push({
    topic: 'melodic-stagnation',
    status: 'INFERRED',
    text: `Top-line pitch classes: ${tops.map((attack) => `${spell(attack.top)}@${attack.bar}.${attack.beat}`).join(' ')}. Distinct top classes: ${uniqueTopPcs.map(pcName).join(',')}. Longest consecutive E-top run: ${eRun}. Recurrence of E is a landing fact. Call it stagnation when later phrases add no new top-line interval; do not call the landing expressive.`,
  });
  if (context?.plan) {
    for (const region of context.plan.regions) {
      const regionTops = tops.filter((attack) => region.bars.includes(attack.bar));
      out.push({
        topic: 'phrase-plan',
        status: 'VERIFIED',
        text: `${region.role} bars ${region.bars.join(',')} transform ${region.pitchTransform} rhythm ${region.rhythmTransform}. Heard tops: ${regionTops.map((attack) => `${spell(attack.top)} bar ${attack.bar} beat ${attack.beat}`).join(', ') || 'none'}.`,
      });
    }
    const statement = context.plan.regions.find((region) => region.role === 'statement');
    const returning = context.plan.regions.find((region) => region.role === 'return');
    const statementNames = tops.filter((attack) => statement?.bars.includes(attack.bar)).map((attack) => spell(attack.top)).join(',');
    const returnNames = tops.filter((attack) => returning?.bars.includes(attack.bar)).map((attack) => spell(attack.top)).join(',');
    out.push({
      topic: 'phrase-plan',
      status: 'INFERRED',
      text: `Plan labels are not the notes. Statement tops [${statementNames || 'none'}]. Return tops [${returnNames || 'none'}]. ${statementNames && statementNames === returnNames ? 'The return copies the statement top line.' : 'The return top line is not a literal copy of the statement.'} A predicate pass does not make the development musically successful.`,
    });
  }
  if (context?.snapReadings) {
    const outside = context.snapReadings.filter((snap) => !snap.proposalInField && snap.reason === 'vault-layer');
    const insideOverridden = context.snapReadings.filter((snap) => snap.proposalInField && snap.reason === 'vault-layer');
    const figureSnaps = context.snapReadings.filter((snap) => snap.reason === 'invert-or-transpose');
    const contributed = context.snapReadings.filter((snap) => snap.operatorContributedSoundingPitch);
    out.push({
      topic: 'field-snaps',
      status: 'VERIFIED',
      text: `${context.snapReadings.length} recorded corrections. Operator proposal outside the field: ${outside.length}. Operator proposal inside the field but replaced by the phrase figure: ${insideOverridden.length}. Figure itself snapped into the field: ${figureSnaps.length}. Corrections in which the operator pitch is the sounding pitch: ${contributed.length}.`,
    });
    for (const snap of context.snapReadings) out.push({ topic: 'field-snaps', status: 'VERIFIED', text: snap.text });
    out.push({
      topic: 'field-snaps',
      status: 'INFERRED',
      text: 'A snap means the written pitch class is the field or the phrase figure. It does not mean the harmonic operator contributed the sounding note. Dissonance that remains after a snap is a pitch fact, not an expressive decision.',
    });
  }
  return out;
}
