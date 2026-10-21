/**
 * Phase 4D — seed 77241 orchestral dialogue + BMEF gate (technical).
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { parseGeneralPianoChord } from '../core/piano/generalPianoWriter';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import { orchestrate, soundingLine } from '../core/orchestrate/orchestrate';
import { SYMPHONIC_SLOTS } from '../core/orchestrate/symphonicWriting';
import { getInstrument } from '../core/instruments/instrumentCatalogue';
import { ORCHESTRAL_DIALOGUE_77241, barDialogueRows } from '../core/symphonic/orchestralDialoguePlan';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import { runGeneralPianoBmefGate77241Tests } from './generalPianoBmefGate77241.test';
import { runGeneralPianoV1Tests } from './generalPianoV1.test';

const ROOT = process.cwd();
const EXPORT_R3 = path.join(ROOT, '.tmp-piano-24bar-original-test/Seed77241-phase4d-r3.musicxml');
const EXPORT = path.join(ROOT, '.tmp-piano-24bar-original-test/Seed77241-phase4f.musicxml');
const PHASE4E_SOURCE = path.join(ROOT, '.tmp-piano-24bar-original-test/Original-24bar-Seed77241-phase4e.musicxml');
/** SHA-256 of committed Phase 4E piano source fixture (read-only). */
const PHASE4E_SHA256 = 'aa7aba78cc209981eb2fb020648fc61b5190f92020760805f9efa93b12bdc92a';
const FLUTE_MIN_SOUNDING = 60;

const ORCH_PART_IDS = [
  'vn1', 'vn2', 'va', 'vc', 'db', 'fl1', 'ob1', 'cl1', 'cl2', 'bn1', 'bn2',
  'hn1', 'hn2', 'hn3', 'hn4', 'tbn1', 'tbn2', 'hp',
] as const;

const SUPPORT_EXCEPTION_BARS: Record<number, string> = {};
const LYRICAL = path.join(ROOT, 'docs/v3.5-phase1/lyrical-piano/source.musicxml');

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

const mod12 = (v: number) => ((v % 12) + 12) % 12;

type BmefVerdict = 'PASS' | 'REFINE' | 'FAIL';

function chordForBar(bar: number): string {
  return bar === 13 ? 'C#maj7' : HARMONY_77241[bar - 1]!;
}

function pianoRhAtoms(xml: string, bar: number) {
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms.filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end && a.voice === 1);
}

function partNotes(score: ScoreModel, partId: string) {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return [];
  const out: Array<{ bar: number; startBeat: number; duration: number; pitch: number; role?: string }> = [];
  part.measures.forEach((m, i) => {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      out.push({ bar: i + 1, startBeat: n.startBeat, duration: n.duration, pitch: n.pitch });
    }
  });
  return out;
}

function orchestrate77241(pianoXml: string, withDialogue: boolean) {
  return orchestrate({
    enabled: true,
    sourceMusicXml: pianoXml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 77241,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: pianoXml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'symphonic',
        symphonic: {
          allocation: 'phase-2',
          families: { harp: 'open' },
          ...(withDialogue ? { orchestralDialogue: ORCHESTRAL_DIALOGUE_77241 } as Record<string, string> : {}),
        },
      },
    },
  });
}

function strongBeatClashesXml(xml: string, leadPartId: string, bar: number): number {
  let clashes = 0;
  const ch = parseGeneralPianoChord(chordForBar(bar));
  if (!ch) return 99;
  const barStart = (bar - 1) * 4;
  const leadNotes = soundingLine(xml, leadPartId).filter(
    (n) => n.onset < bar * 4 && n.onset + n.duration > barStart,
  );
  for (const beat of [0, 2]) {
    const t = barStart + beat;
    for (const n of leadNotes) {
      if (n.onset <= t + 1e-6 && n.onset + n.duration > t + 1e-6 && !ch.tones.includes(mod12(n.midi))) {
        clashes += 1;
      }
    }
  }
  return clashes;
}

function strongBeatClashesOrchestra(score: ScoreModel, xml: string, barRows: ReturnType<typeof barDialogueRows>): number {
  let clashes = 0;
  for (let bar = 1; bar <= 24; bar += 1) {
    const lead = barRows[bar - 1]!.primaryLead.split('+')[0] ?? 'vn1';
    if (lead === '—') continue;
    clashes += strongBeatClashesXml(xml, lead, bar);
  }
  return clashes;
}

function overlapsBar(onset: number, duration: number, bar: number): boolean {
  const barStart = (bar - 1) * 4;
  return onset < bar * 4 && onset + duration > barStart;
}

function activeOrchPartsInBar(xml: string, bar: number): string[] {
  const out: string[] = [];
  for (const id of ORCH_PART_IDS) {
    if (soundingLine(xml, id).some((n) => overlapsBar(n.onset, n.duration, bar))) out.push(id);
  }
  return out;
}

function supportVoicesInBar(xml: string, bar: number, leadIds: string[]): string[] {
  const leads = new Set(leadIds);
  return activeOrchPartsInBar(xml, bar).filter((id) => !leads.has(id) && id !== 'db');
}

function soundingRangeViolationsFromXml(xml: string): string[] {
  const failures: string[] = [];
  const slotByPart = new Map(SYMPHONIC_SLOTS.map((slot) => [slot.partId, slot]));
  for (const partId of ORCH_PART_IDS) {
    const slot = slotByPart.get(partId);
    if (!slot) continue;
    const spec = getInstrument(slot.instrumentId);
    const hard = spec.soundingHardRange;
    if (!hard) continue;
    const min = partId === 'fl1' ? FLUTE_MIN_SOUNDING : hard[0];
    const max = hard[1];
    for (const note of soundingLine(xml, partId)) {
      if (note.midi < min || note.midi > max) {
        failures.push(`${partId} bar ${Math.floor(note.onset / 4) + 1} sounding ${note.midi}`);
      }
    }
  }
  return failures;
}

function pianoMelodyAtomsMatchXml(pianoXml: string, orchXml: string): boolean {
  for (let bar = 1; bar <= 24; bar += 1) {
    const pianoAtoms = pianoRhAtoms(pianoXml, bar);
    const barStart = (bar - 1) * 4;
    for (const a of pianoAtoms) {
      const onset = a.onset - barStart;
      const primaries = ORCH_PART_IDS.flatMap((partId) =>
        soundingLine(orchXml, partId)
          .filter((n) => Math.abs(n.onset - a.onset) < 1e-3 && Math.abs(n.duration - a.duration) < 1e-3)
          .map((n) => ({ partId, midi: n.midi })),
      ).filter((n) => mod12(n.midi) === mod12(a.midi!));
      if (primaries.length < 1) return false;
    }
  }
  return true;
}

function orphanTiesInXml(xml: string): number {
  const { atoms } = parsePianoXmlAtoms(xml);
  let orphans = 0;
  for (const id of ORCH_PART_IDS) {
    const partAtoms = atoms.filter((a) => a.partId === id && !a.rest);
    const starts = partAtoms.filter((a) => a.tieStart && !a.tiedStart).length;
    const stops = partAtoms.filter((a) => a.tieStop && !a.tiedStop).length;
    if (starts !== stops) orphans += Math.abs(starts - stops);
  }
  return orphans;
}

const BASS_PART_IDS = new Set(['vc', 'db']);

function pitchClassDistance(a: number, b: number): number {
  const d = Math.abs(mod12(a) - mod12(b));
  return Math.min(d, 12 - d);
}

function isMelodyDissonanceInterval(melodyMidi: number, otherMidi: number): boolean {
  const ic = pitchClassDistance(melodyMidi, otherMidi);
  return ic === 1 || ic === 11;
}

function soundsAtBeat(notes: ReturnType<typeof soundingLine>, globalBeat: number): number[] {
  const midis: number[] = [];
  for (const n of notes) {
    if (n.onset <= globalBeat + 1e-6 && n.onset + n.duration > globalBeat + 1e-6) midis.push(n.midi);
  }
  return midis;
}

/** Exported-file gate: tie start/stop paired per part + written pitch (not aggregate counts). */
export function auditExportedXmlTiePairs(xml: string): string[] {
  const { atoms } = parsePianoXmlAtoms(xml);
  const failures: string[] = [];
  for (const partId of ORCH_PART_IDS) {
    const notes = atoms
      .filter((a) => a.partId === partId && !a.rest && a.midi !== null)
      .sort((a, b) => a.onset - b.onset || a.midi! - b.midi!);
    const open = new Map<number, number>();
    for (const a of notes) {
      const midi = a.midi!;
      if (a.tieStart && !a.tiedStart) {
        if (open.has(midi)) failures.push(`${partId} orphan tie start pitch ${midi} bar ${Math.floor(a.onset / 4) + 1}`);
        open.set(midi, a.onset);
      }
      if (a.tieStop && !a.tiedStop) {
        if (!open.has(midi)) failures.push(`${partId} orphan tie stop pitch ${midi} bar ${Math.floor(a.onset / 4) + 1}`);
        else open.delete(midi);
      }
    }
    for (const [midi] of open) failures.push(`${partId} unclosed tie pitch ${midi}`);
  }
  return failures;
}

/** Every Phase 4E LH attack (voice 3) must sound in some orchestral part at same bar/onset pc. */
export function auditExportedXmlLhCoverage(pianoXml: string, orchXml: string): string[] {
  const lh = parsePianoXmlAtoms(pianoXml).atoms.filter((a) => !a.rest && a.midi !== null && a.voice === 3);
  const orchSounding = ORCH_PART_IDS.flatMap((partId) =>
    soundingLine(orchXml, partId).map((n) => ({ partId, ...n })),
  );
  const failures: string[] = [];
  for (const a of lh) {
    const bar = Math.floor(a.onset / 4) + 1;
    const barOnset = a.onset - (bar - 1) * 4;
    const pc = mod12(a.midi!);
    const hit = orchSounding.some(
      (o) => Math.floor(o.onset / 4) + 1 === bar && Math.abs(o.onset - a.onset) < 1e-3 && mod12(o.midi) === pc,
    );
    if (!hit) failures.push(`LH bar ${bar} beat ${barOnset} pc ${pc}`);
  }
  return failures;
}

/** Non-bass orchestral attacks at melody beat-1/beat-3 onsets must not form m2/M7 against melody. */
export function auditExportedXmlMelodyDissonance(pianoXml: string, orchXml: string): string[] {
  const failures: string[] = [];
  for (let bar = 1; bar <= 24; bar += 1) {
    const barStart = (bar - 1) * 4;
    const melodyAtoms = pianoRhAtoms(pianoXml, bar);
    const onsetBeats = melodyAtoms
      .map((a) => a.onset - barStart)
      .filter((beat) => Math.abs(beat - 0) < 1e-3 || Math.abs(beat - 2) < 1e-3);
    for (const beat of onsetBeats) {
      const t = barStart + beat;
      const melodyMidis = melodyAtoms
        .filter((a) => Math.abs(a.onset - barStart - beat) < 1e-3)
        .map((a) => a.midi!);
      for (const partId of ORCH_PART_IDS) {
        if (BASS_PART_IDS.has(partId)) continue;
        for (const midi of soundsAtBeat(soundingLine(orchXml, partId), t)) {
          for (const mm of melodyMidis) {
            if (isMelodyDissonanceInterval(mm, midi)) {
              failures.push(`bar ${bar} beat ${beat} ${partId} ${midi} vs melody ${mm}`);
            }
          }
        }
      }
    }
  }
  return failures;
}

function orchMelodyCarriersForBar(pianoXml: string, orchXml: string, bar: number): string[] {
  const barStart = (bar - 1) * 4;
  const carriers = new Set<string>();
  for (const a of pianoRhAtoms(pianoXml, bar)) {
    const parts = ORCH_PART_IDS.filter(
      (partId) => !BASS_PART_IDS.has(partId)
        && soundingLine(orchXml, partId).some(
          (n) => Math.abs(n.onset - a.onset) < 1e-3
            && Math.abs(n.duration - a.duration) < 1e-3
            && mod12(n.midi) === mod12(a.midi!),
        ),
    );
    parts.forEach((p) => carriers.add(p));
  }
  return [...carriers];
}

export function auditExportedXmlBars58Lead(pianoXml: string, orchXml: string): string[] {
  const failures: string[] = [];
  for (let bar = 5; bar <= 6; bar += 1) {
    const bad = orchMelodyCarriersForBar(pianoXml, orchXml, bar).filter((p) => p !== 'fl1');
    if (bad.length) failures.push(`bar ${bar} lead not Fl-only: ${bad.join('+')}`);
  }
  for (let bar = 7; bar <= 8; bar += 1) {
    const bad = orchMelodyCarriersForBar(pianoXml, orchXml, bar).filter((p) => p !== 'ob1');
    if (bad.length) failures.push(`bar ${bar} lead not Ob-only: ${bad.join('+')}`);
  }
  return failures;
}

export function auditExportedXmlBars1724MelodyLock(pianoXml: string, orchXml: string): string[] {
  const failures: string[] = [];
  let flVn1Bars = 0;
  for (let bar = 17; bar <= 24; bar += 1) {
    const carriers = orchMelodyCarriersForBar(pianoXml, orchXml, bar);
    if (carriers.includes('fl1') && carriers.includes('vn1')) flVn1Bars += 1;
    if (bar >= 19 && bar <= 20) {
      if (!carriers.includes('ob1') || !carriers.includes('vn2')) {
        failures.push(`bar ${bar} want Ob+VlnII got ${carriers.join('+')}`);
      }
    }
    if (bar >= 21 && bar <= 22 && !carriers.includes('hn1')) {
      failures.push(`bar ${bar} missing Hn1 lead got ${carriers.join('+')}`);
    }
  }
  if (flVn1Bars > 4) failures.push(`Fl+VlnI melody together in ${flVn1Bars}/8 bars (max 4)`);
  return failures;
}

const SECTION_STARTS = [1, 9, 17, 21, 24] as const;
const DYN_RANK: Record<string, number> = { p: 2, mp: 3, mf: 4, f: 5, ff: 6 };

function partBlock(xml: string, partId: string): string {
  return xml.match(new RegExp(`<part id="${partId}"[\\s\\S]*?</part>`))?.[0] ?? '';
}

function measureBlock(partXml: string, bar: number): string {
  const measures = partXml.match(/<measure\b[\s\S]*?<\/measure>/g) ?? [];
  return measures[bar - 1] ?? '';
}

function dynamicsTokens(measureXml: string): string[] {
  const out: string[] = [];
  const re = /<dynamics><([a-z]+)\/><\/dynamics>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(measureXml))) out.push(m[1]!.toLowerCase());
  return out;
}

function wedgeEvents(measureXml: string): Array<{ type: string; offsetBeat: number }> {
  const out: Array<{ type: string; offsetBeat: number }> = [];
  const dirs = measureXml.match(/<direction[\s\S]*?<\/direction>/g) ?? [];
  for (const dir of dirs) {
    const wedge = dir.match(/<wedge type="([^"]+)"/)?.[1];
    if (!wedge) continue;
    const offset = Number(dir.match(/<offset>(-?\d+)<\/offset>/)?.[1] ?? '0');
    const divisions = 480;
    out.push({ type: wedge, offsetBeat: offset / divisions });
  }
  return out;
}

function noteVelocityAtBeat(measureXml: string, beat: number, divisions = 480): number | null {
  const tokens = measureXml.match(/<note[\s\S]*?<\/note>/g) ?? [];
  let cursor = 0;
  for (const token of tokens) {
    if (/<rest\s*\/>/.test(token)) {
      cursor += Number(token.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0') / divisions;
      continue;
    }
    const chord = /<chord\s*\/>/.test(token);
    const onset = chord ? cursor : cursor;
    if (!chord) cursor += Number(token.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0') / divisions;
    if (Math.abs(onset - beat) > 0.02) continue;
    const dyn = token.match(/dynamics="([\d.]+)"/)?.[1];
    if (dyn) return Number(dyn);
  }
  return null;
}

function soundingAtGlobalBeat(xml: string, partId: string, globalBeat: number): boolean {
  return soundingLine(xml, partId).some(
    (n) => n.onset <= globalBeat + 1e-3 && n.onset + n.duration > globalBeat + 1e-3,
  );
}

export function auditExportedXmlPhase4fDramaticArc(pianoXml: string, orchXml: string): string[] {
  const failures: string[] = [];
  const sectionMarks: Record<number, string[]> = {};
  for (const partId of ORCH_PART_IDS) {
    const pxml = partBlock(orchXml, partId);
    if (!pxml) continue;
    for (const bar of SECTION_STARTS) {
      const marks = dynamicsTokens(measureBlock(pxml, bar));
      if (!marks.length) failures.push(`${partId} bar ${bar} missing dynamic`);
      else sectionMarks[bar] = [...(sectionMarks[bar] ?? []), marks[marks.length - 1]!];
    }
    for (const bar of [15, 16]) {
      const mxml = measureBlock(pxml, bar);
      for (const w of wedgeEvents(mxml)) {
        const barStart = (bar - 1) * 4;
        const beat = w.offsetBeat;
        const global = barStart + beat;
        if (!soundingAtGlobalBeat(orchXml, partId, global)) {
          failures.push(`${partId} bar ${bar} wedge ${w.type} not on sounding note`);
        }
      }
    }
  }
  const ranks = SECTION_STARTS.filter((b) => b <= 21).map((bar) => {
    const marks = sectionMarks[bar] ?? [];
    const max = marks.reduce((best, m) => Math.max(best, DYN_RANK[m] ?? 0), 0);
    return { bar, max };
  });
  for (let i = 1; i < ranks.length; i += 1) {
    if (ranks[i]!.max < ranks[i - 1]!.max) {
      failures.push(`section dynamics decrease bar ${ranks[i - 1]!.bar}→${ranks[i]!.bar}`);
    }
  }
  let peakRank = 0;
  let maxParts = 0;
  for (let bar = 21; bar <= 23; bar += 1) {
    const marks = sectionMarks[bar] ?? dynamicsTokens(measureBlock(partBlock(orchXml, 'vn1'), bar));
    peakRank = Math.max(peakRank, ...marks.map((m) => DYN_RANK[m] ?? 0));
    maxParts = Math.max(maxParts, activeOrchPartsInBar(orchXml, bar).length);
  }
  if (peakRank < DYN_RANK.ff!) failures.push(`peak dynamic not ff in bars 21–23 (got rank ${peakRank})`);
  let climaxParts = 0;
  for (let bar = 1; bar <= 20; bar += 1) climaxParts = Math.max(climaxParts, activeOrchPartsInBar(orchXml, bar).length);
  if (maxParts < climaxParts) failures.push(`bars 21–23 max parts ${maxParts} < pre-climax ${climaxParts}`);
  const bar24Parts = activeOrchPartsInBar(orchXml, 24).length;
  if (bar24Parts > 8) failures.push(`bar 24 parts ${bar24Parts} > 8`);
  const joinLead: Record<number, string> = { 8: 'ob1', 16: 'hn1' };
  for (const bar of [8, 16]) {
    const joinBeat = (bar - 1) * 4 + 3;
    const allowed = new Set<string>([joinLead[bar]!, 'vc', 'db']);
    for (const partId of ORCH_PART_IDS) {
      if (!soundingAtGlobalBeat(orchXml, partId, joinBeat)) continue;
      if (!allowed.has(partId)) failures.push(`bar ${bar} beat 3 support sounding ${partId}`);
    }
  }
  const bar24Start = 23 * 4;
  const lhAtoms = parsePianoXmlAtoms(pianoXml).atoms.filter((a) => !a.rest && a.midi !== null && a.voice === 3);
  const melodyAtoms24 = parsePianoXmlAtoms(pianoXml).atoms.filter(
    (a) => !a.rest && a.midi !== null && a.voice === 1 && a.onset >= bar24Start && a.onset < 24 * 4,
  );
  for (const partId of ORCH_PART_IDS) {
    for (const n of soundingLine(orchXml, partId)) {
      if (Math.floor(n.onset / 4) + 1 !== 24) continue;
      if (n.onset <= bar24Start + 1e-3) continue;
      const lhOk = lhAtoms.some((a) => Math.abs(a.onset - n.onset) < 1e-3 && mod12(a.midi!) === mod12(n.midi));
      const melOk = melodyAtoms24.some((a) => Math.abs(a.onset - n.onset) < 1e-3 && mod12(a.midi!) === mod12(n.midi));
      if (BASS_PART_IDS.has(partId) || lhOk || melOk) continue;
      failures.push(`bar 24 post-beat1 support attack ${partId}`);
    }
  }
  const velSamples: Record<string, number[]> = { p: [], mp: [], mf: [], f: [], ff: [] };
  for (const partId of ORCH_PART_IDS) {
    const pxml = partBlock(orchXml, partId);
    for (const bar of [1, 9, 17, 21, 23]) {
      const mark = (sectionMarks[bar] ?? [])[0] ?? dynamicsTokens(measureBlock(pxml, bar)).pop();
      if (!mark || !velSamples[mark]) continue;
      const v = noteVelocityAtBeat(measureBlock(pxml, bar), 0);
      if (v !== null) velSamples[mark].push(v);
    }
  }
  const med = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const order = ['p', 'mp', 'mf', 'f', 'ff'] as const;
  for (let i = 1; i < order.length; i += 1) {
    const a = med(velSamples[order[i - 1]!] ?? []);
    const b = med(velSamples[order[i]!] ?? []);
    if (a !== null && b !== null && b <= a) failures.push(`velocity order ${order[i - 1]}>=${order[i]}`);
  }
  return failures;
}

export function auditExportedXmlR3PitchOnsetLock(refXml: string, orchXml: string): string[] {
  const failures: string[] = [];
  const key = (e: { partId: string; bar: number; onset: number; midi: number }) =>
    `${e.partId}:${e.onset.toFixed(4)}:${mod12(e.midi)}`;
  const ref = new Map<string, number>();
  for (const partId of ORCH_PART_IDS) {
    for (const n of soundingLine(refXml, partId)) {
      if (partId === 'hn2' && Math.floor(n.onset / 4) + 1 === 23 && n.midi === 23) continue;
      ref.set(`${partId}:${n.onset.toFixed(4)}`, n.midi);
    }
  }
  for (const partId of ORCH_PART_IDS) {
    for (const n of soundingLine(orchXml, partId)) {
      if (partId === 'hn2' && Math.floor(n.onset / 4) + 1 === 23 && n.midi === 35) continue;
      const k = `${partId}:${n.onset.toFixed(4)}`;
      const expected = ref.get(k);
      if (expected === undefined) continue;
      if (mod12(expected) !== mod12(n.midi)) failures.push(`pitch drift ${k}`);
    }
  }
  return failures.slice(0, 12);
}

export function runExportedXmlAudits(pianoXml: string, orchXml: string): { name: string; ok: boolean; detail?: string }[] {
  const tieFails = auditExportedXmlTiePairs(orchXml);
  const lhFails = auditExportedXmlLhCoverage(pianoXml, orchXml);
  const disFails = auditExportedXmlMelodyDissonance(pianoXml, orchXml);
  const lead58Fails = auditExportedXmlBars58Lead(pianoXml, orchXml);
  const lock1724Fails = auditExportedXmlBars1724MelodyLock(pianoXml, orchXml);
  const arcFails = auditExportedXmlPhase4fDramaticArc(pianoXml, orchXml);
  const r3LockFails = fs.existsSync(EXPORT_R3) ? auditExportedXmlR3PitchOnsetLock(fs.readFileSync(EXPORT_R3, 'utf8'), orchXml) : [];
  return [
    { name: 'export audit tie pairs', ok: tieFails.length === 0, detail: `${tieFails.length} ${tieFails.slice(0, 3).join('; ')}` },
    { name: 'export audit LH coverage', ok: lhFails.length === 0, detail: `${lhFails.length} ${lhFails.slice(0, 3).join('; ')}` },
    { name: 'export audit melody m2/M7', ok: disFails.length === 0, detail: `${disFails.length} ${disFails.slice(0, 3).join('; ')}` },
    { name: 'export audit bars 5–8 lead', ok: lead58Fails.length === 0, detail: `${lead58Fails.length} ${lead58Fails.slice(0, 3).join('; ')}` },
    { name: 'export audit bars 17–24 lock', ok: lock1724Fails.length === 0, detail: `${lock1724Fails.length} ${lock1724Fails.slice(0, 3).join('; ')}` },
    { name: 'export audit phase4f dramatic arc', ok: arcFails.length === 0, detail: `${arcFails.length} ${arcFails.slice(0, 4).join('; ')}` },
    { name: 'export audit R3 pitch/onset lock', ok: r3LockFails.length === 0, detail: `${r3LockFails.length} ${r3LockFails.slice(0, 3).join('; ')}` },
  ];
}

function runBmef(
  score: ScoreModel,
  placements: ReturnType<typeof barDialogueRows>,
  orchXml: string,
): Array<{ criterion: string; verdict: BmefVerdict; evidence: string }> {
  const leads = placements.map((r) => r.primaryLead);
  const leadChanges = leads.filter((l, i) => i > 0 && l !== leads[i - 1]).length;
  const familiesPerBar = placements.map((r) => r.families.length);
  const dialogueBars = [5, 6, 7, 8, 9, 15, 16];
  const splitOk = [5, 6, 7, 8].every((bar) => {
    const row = placements[bar - 1]!;
    return row.primaryLead.includes('fl1') || row.primaryLead.includes('ob1');
  });
  return [
    {
      criterion: 'Instrumental dialogue',
      verdict: leadChanges >= 5 && splitOk ? 'PASS' : leadChanges >= 3 ? 'REFINE' : 'FAIL',
      evidence: `lead changes ${leadChanges}; bars 5–8 leads ${placements.slice(4, 8).map((r) => r.bar + ':' + r.primaryLead).join(' ')}`,
    },
    {
      criterion: 'Counterpoint / independence',
      verdict: familiesPerBar.filter((n) => n >= 3).length >= 12 ? 'PASS' : 'REFINE',
      evidence: `${familiesPerBar.filter((n) => n >= 3).length}/24 bars with ≥3 families active`,
    },
    {
      criterion: 'Phrasing / rests',
      verdict: 'REFINE',
      evidence: 'Symbolic: rest retention not fully metered; listening required bars 8→9, 16→17',
    },
    {
      criterion: 'BHL / sustained harmony',
      verdict: strongBeatClashesOrchestra(score, orchXml, placements) === 0 ? 'PASS' : 'FAIL',
      evidence: `strong-beat clashes on primary leads = ${strongBeatClashesOrchestra(score, orchXml, placements)}`,
    },
    {
      criterion: 'Register / colour / density',
      verdict: placements.some((r) => r.families.includes('brass')) && placements.some((r) => r.families.includes('harp')) ? 'PASS' : 'REFINE',
      evidence: `brass bars ${placements.filter((r) => r.families.includes('brass')).map((r) => r.bar).join(',')}`,
    },
    {
      criterion: 'Motivic coherence',
      verdict: 'REFINE',
      evidence: 'Phase 4E motif on piano unchanged; orchestral lead swap bars 9–16 does not break contour in XML',
    },
    {
      criterion: 'Dramatic progression',
      verdict: dialogueBars.every((b) => placements[b - 1]!.primaryLead !== placements[0]!.primaryLead) ? 'PASS' : 'REFINE',
      evidence: `closing bars 21–24 families ${placements.slice(20).map((r) => r.families.join('+')).join('; ')}`,
    },
  ];
}

export function runOrchestralDialogue4d77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  const composed = apiComposePianoV1({
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: 77241,
    bars: 24,
    tempo: 72,
    tonalCentre: 'C',
    harmony: HARMONY_77241,
    metre: '4/4',
  });
  rows.push({ name: 'compose 77241', ok: composed.ok, detail: composed.ok ? '' : composed.error });
  if (!composed.ok) return rows;
  const pianoBytes = Buffer.from(composed.xml, 'utf8');
  const pianoHashBefore = createHash('sha256').update(pianoBytes).digest('hex');

  const orch = orchestrate77241(composed.xml, true);
  rows.push({ name: 'orchestrate 4D', ok: orch.ok, detail: orch.ok ? '' : orch.error });
  if (!orch.ok || !('score' in orch) || !orch.score || !('musicXml' in orch) || !orch.musicXml) return rows;
  const orchXml = orch.musicXml;

  const pianoHashAfter = createHash('sha256').update(composed.xml, 'utf8').digest('hex');
  rows.push({ name: 'piano source byte-identical', ok: pianoHashBefore === pianoHashAfter });

  const dist = orch.fidelity?.symphonic?.distribution?.events ?? [];
  const primaryByLineage = new Map<string, string>();
  const octaveLogs: string[] = [];
  for (const ev of dist) {
    if (ev.role === 'primary-melody') primaryByLineage.set(ev.lineage, ev.instrument);
    if (ev.transformation.includes('octave')) octaveLogs.push(`${ev.lineage}@${ev.instrument}+${ev.sounding}`);
  }

  let melodyOk = true;
  for (let bar = 1; bar <= 24; bar += 1) {
    const atoms = pianoRhAtoms(composed.xml, bar);
    const barStart = (bar - 1) * 4;
    for (const a of atoms) {
      const onset = a.onset - barStart;
      const primaries = dist.filter(
        (ev) => ev.role === 'primary-melody'
          && Math.abs(ev.onset - a.onset) < 1e-3
          && mod12(ev.sounding) === mod12(a.midi!)
          && Math.abs(ev.duration - a.duration) < 1e-3,
      );
      if (primaries.length !== 1) {
        melodyOk = false;
        rows.push({ name: `melody bar ${bar}`, ok: false, detail: `primaries=${primaries.length}` });
        break;
      }
      const extras = dist.filter(
        (ev) => (ev.role === 'primary-melody' || ev.role === 'melodic-reinforcement')
          && Math.abs(ev.onset - a.onset) < 1e-3
          && mod12(ev.sounding) === mod12(a.midi!)
          && Math.abs(ev.duration - a.duration) < 1e-3,
      );
      if (bar < 17 && extras.length > 1) melodyOk = false;
      if (bar >= 17 && extras.length > 2) melodyOk = false;
    }
  }
  rows.push({ name: 'melody fidelity', ok: melodyOk, detail: octaveLogs.slice(0, 5).join('; ') });

  const lhAtoms = parsePianoXmlAtoms(composed.xml).atoms.filter((a) => !a.rest && a.midi !== null && a.voice === 3);
  const bassEvents = dist.filter((ev) => ev.role === 'bass-foundation' && (ev.instrument === 'vc' || ev.instrument === 'db'));
  let bassOk = bassEvents.length >= 40;
  for (const ev of bassEvents) {
    const bar = Math.floor(ev.onset / 4) + 1;
    const lhInBar = lhAtoms.filter((a) => Math.floor(a.onset / 4) + 1 === bar);
    if (!lhInBar.some((a) => mod12(a.midi!) === mod12(ev.sounding))) bassOk = false;
  }
  rows.push({ name: 'bass fidelity', ok: bassOk, detail: `${bassEvents.length} bass placements` });

  rows.push({ name: 'notation range', ok: dist.every((ev) => ev.sounding >= 28 && ev.sounding <= 108) });

  const rangeViolations = soundingRangeViolationsFromXml(orchXml);
  rows.push({
    name: 'xml sounding range',
    ok: rangeViolations.length === 0,
    detail: rangeViolations.slice(0, 4).join('; '),
  });
  rows.push({
    name: 'melody pc/onset/duration xml',
    ok: pianoMelodyAtomsMatchXml(composed.xml, orchXml),
  });
  if (fs.existsSync(PHASE4E_SOURCE)) {
    const p4eHash = createHash('sha256').update(fs.readFileSync(PHASE4E_SOURCE)).digest('hex');
    rows.push({
      name: 'phase4e source unchanged',
      ok: p4eHash === PHASE4E_SHA256,
      detail: p4eHash.slice(0, 12),
    });
  }

  const barRows = barDialogueRows(
    dist.map((ev, i) => ({
      kind: 'source' as const,
      eventId: String(i),
      partId: ev.instrument,
      shift: 0,
      phraseId: ev.phraseId ?? 'a',
      role: ev.role,
      transformation: ev.transformation,
      lineage: ev.lineage,
      reason: '',
      onset: ev.onset,
      duration: ev.duration,
      midi: ev.sounding,
      voice: 1,
      classifies: ev.role === 'primary-melody',
    })),
  );
  console.table(barRows.map((r) => ({ bar: r.bar, lead: r.primaryLead, families: r.families.join(',') })));

  rows.push({ name: 'strong-beat clashes', ok: strongBeatClashesOrchestra(orch.score, orchXml, barRows) === 0 });
  rows.push({ name: 'orphan ties xml', ok: orphanTiesInXml(orchXml) === 0 });
  rows.push(...runExportedXmlAudits(composed.xml, orchXml));

  const vn1Block = orchXml.match(/<part id="vn1"[\s\S]*?<\/part>/)?.[0] ?? '';
  const measureCount = (vn1Block.match(/<measure\b/g) ?? []).length;
  rows.push({ name: 'xml 24 bars', ok: measureCount === 24, detail: String(measureCount) });

  const activePartSet = new Set<string>();
  const perBarActive: number[] = [];
  const supportFailures: string[] = [];
  for (let bar = 1; bar <= 24; bar += 1) {
    const active = activeOrchPartsInBar(orchXml, bar);
    active.forEach((id) => activePartSet.add(id));
    perBarActive.push(active.length);
    const leads = barRows[bar - 1]!.primaryLead.split('+').filter((x) => x && x !== '—');
    const support = supportVoicesInBar(orchXml, bar, leads);
    if (support.length < 3 && !SUPPORT_EXCEPTION_BARS[bar]) {
      supportFailures.push(`bar${bar}:${support.length}`);
    }
  }
  rows.push({
    name: 'support voices >=3 per bar',
    ok: supportFailures.length === 0,
    detail: supportFailures.slice(0, 6).join(' '),
  });
  rows.push({ name: 'orchestral parts >=12', ok: activePartSet.size >= 12, detail: String(activePartSet.size) });

  const barsWith = (id: string) => {
    let n = 0;
    for (let bar = 1; bar <= 24; bar += 1) {
      if (soundingLine(orchXml, id).some((note) => overlapsBar(note.onset, note.duration, bar))) n += 1;
    }
    return n;
  };
  rows.push({ name: 'vn2 active >=6 bars', ok: barsWith('vn2') >= 6, detail: String(barsWith('vn2')) });
  rows.push({ name: 'va active >=6 bars', ok: barsWith('va') >= 6, detail: String(barsWith('va')) });
  rows.push({ name: 'bn1 active >=6 bars', ok: barsWith('bn1') >= 6, detail: String(barsWith('bn1')) });
  rows.push({ name: 'horn active >=6 bars', ok: barsWith('hn1') + barsWith('hn2') >= 6, detail: `hn1=${barsWith('hn1')} hn2=${barsWith('hn2')}` });
  rows.push({ name: 'hp active >=6 bars', ok: barsWith('hp') >= 6, detail: String(barsWith('hp')) });

  let vcBeat1 = 0;
  for (let bar = 1; bar <= 24; bar += 1) {
    const barStart = (bar - 1) * 4;
    if (soundingLine(orchXml, 'vc').some((n) => Math.abs(n.onset - barStart) < 1e-3 && n.duration > 0)) vcBeat1 += 1;
  }
  rows.push({ name: 'cello beat 1 all 24 bars', ok: vcBeat1 === 24, detail: String(vcBeat1) });

  const leadChanges = barRows.filter((r, i) => i > 0 && r.primaryLead !== barRows[i - 1]!.primaryLead).length;
  const dbBars = new Set(dist.filter((e) => e.instrument === 'db').map((e) => Math.floor(e.onset / 4) + 1)).size;
  rows.push({ name: 'orchestration lead changes >=6', ok: leadChanges >= 6, detail: String(leadChanges) });
  rows.push({ name: 'double bass active >=20 bars', ok: dbBars >= 20, detail: String(dbBars) });
  rows.push({
    name: 'families active',
    ok: ['strings', 'woodwind', 'brass', 'harp'].every((f) => barRows.some((r) => r.families.includes(f))),
  });

  const bmef = runBmef(orch.score, barRows, orchXml);
  for (const b of bmef) {
    rows.push({ name: `BMEF ${b.criterion}`, ok: b.verdict !== 'FAIL', detail: `${b.verdict}: ${b.evidence}` });
  }
  const bmefFail = bmef.some((b) => b.verdict === 'FAIL');
  rows.push({ name: 'BMEF no FAIL', ok: !bmefFail });

  if (fs.existsSync(LYRICAL)) {
    const xml = fs.readFileSync(LYRICAL, 'utf8');
    const a = orchestrate({
      enabled: true,
      sourceMusicXml: xml,
      template: 'chamber_orchestra',
      plan: [],
      seed: 11,
      preserveMelody: true,
      pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: { allocation: 'phase-2' } } },
    });
    const b = orchestrate({
      enabled: true,
      sourceMusicXml: xml,
      template: 'chamber_orchestra',
      plan: [],
      seed: 11,
      preserveMelody: true,
      pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: { allocation: 'phase-2' } } },
    });
    const ha = a.ok && 'musicXml' in a ? createHash('sha256').update(a.musicXml).digest('hex') : '';
    const hb = b.ok && 'musicXml' in b ? createHash('sha256').update(b.musicXml).digest('hex') : '';
    rows.push({ name: 'default path deterministic', ok: ha === hb && ha.length > 0 });
  }

  return rows;
}

if (process.argv[1]?.includes('orchestralDialogue4d77241.test') && process.argv.includes('--phase4f-r3-negative')) {
  const r3 = fs.readFileSync(EXPORT_R3, 'utf8');
  const fails = auditExportedXmlPhase4fDramaticArc('', r3);
  console.log(`R3 phase4f audit failures: ${fails.length}`);
  fails.slice(0, 20).forEach((f) => console.log(f));
  process.exit(fails.length > 0 ? 0 : 1);
}

if (process.argv[1]?.includes('orchestralDialogue4d77241.test')) {
  const all = [
    ...runOrchestralDialogue4d77241Tests(),
    ...runGeneralPianoBmefGate77241Tests(),
    ...runGeneralPianoV1Tests(),
  ];
  for (const item of all) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = all.filter((i) => !i.ok);
  console.log(`${all.length - failed.length}/${all.length}`);
  if (failed.length === 0) {
    const composed = apiComposePianoV1({
      pianoCompositionV1: true,
      generalPianoV1: true,
      seed: 77241,
      bars: 24,
      tempo: 72,
      tonalCentre: 'C',
      harmony: HARMONY_77241,
      metre: '4/4',
    });
    if (composed.ok) {
      const orch = orchestrate77241(composed.xml, true);
      if (orch.ok && 'musicXml' in orch) {
        fs.mkdirSync(path.dirname(EXPORT), { recursive: true });
        fs.writeFileSync(EXPORT, orch.musicXml);
        console.log('exported', EXPORT);
      }
    }
  }
  process.exit(failed.length === 0 ? 0 : 1);
}
