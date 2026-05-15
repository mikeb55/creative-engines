/**
 * Pass 4+5 — per-VRB post passes on duo abstract guitar/bass measures.
 * Line-first VRBs (`LINE_FIRST_DUO_ENGINE_VRB_IDS`): identity (routing preserves AbstractLineSet PCs).
 * All other VRBs: existing colour / timing passes below.
 */

import type { CompositionContext } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { addEvent, createNote } from '../score-model/scoreEventBuilder';
import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { clampPitch } from './guitarBassDuoHarmony';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from './lineFirstDuoEngineVrbIds';

function rootPcFromBarSymbol(symbol: string): number {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/i);
  const name = m?.[1] ?? 'C';
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  return noteNameToPitchClass(key) ?? 0;
}

function sortedNotes(m: MeasureModel): NoteEvent[] {
  return (m.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, b) => a.startBeat - b.startBeat);
}

function replaceMeasureNotes(m: MeasureModel, notes: NoteEvent[]): void {
  m.events = m.events.filter((e) => e.kind !== 'note');
  for (const n of notes) {
    addEvent(m, { ...n });
  }
}

function snapMidiToTriadTone(midi: number, rpc: number): number {
  const pc = ((midi % 12) + 12) % 12;
  const targets = [rpc, (rpc + 4) % 12, (rpc + 7) % 12];
  let bestPc = pc;
  let bestCost = 99;
  for (const t of targets) {
    const c = Math.min((pc - t + 12) % 12, (t - pc + 12) % 12);
    if (c < bestCost) {
      bestCost = c;
      bestPc = t;
    }
  }
  const oct = Math.floor(midi / 12);
  return oct * 12 + bestPc;
}

/** Upper extensions / chromatic colour on abstract soprano skeleton (wraps base fill). */
export function postProcessDuoAbstractGuitar(
  engineVrbId: string,
  m: MeasureModel,
  context: CompositionContext,
  bar1Based: number,
  effectiveLow: number,
  effectiveHigh: number,
  spanQ: number,
): void {
  if (!engineVrbId || LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has(engineVrbId)) return;
  const sym = resolveBarSymbol(context, bar1Based).symbol;
  const rpc = rootPcFromBarSymbol(sym);
  const majScale = new Set<number>([0, 2, 4, 5, 7, 9, 11].map((i) => (rpc + i) % 12));
  let notes = sortedNotes(m);
  if (notes.length === 0) return;

  const clamp = (p: number) => clampPitch(p, effectiveLow, effectiveHigh);

  switch (engineVrbId) {
    case 'bill_evans': {
      const last = notes[notes.length - 1]!;
      last.duration = Math.min(spanQ - last.startBeat, last.duration + Math.min(0.5, spanQ * 0.08));
      break;
    }
    case 'john_coltrane': {
      const extra: NoteEvent[] = [];
      for (const n of notes) {
        if (n.startBeat >= 0.25) {
          const p0 = clamp(n.pitch - 1);
          extra.push(createNote(p0, n.startBeat - 0.25, 0.25));
        }
      }
      notes = [...extra, ...notes].sort((a, b) => a.startBeat - b.startBeat);
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'pat_metheny': {
      for (const n of notes) {
        const pc = n.pitch % 12;
        const up = (pc + 2) % 12;
        if (majScale.has(pc) && majScale.has(up)) n.pitch = clamp(n.pitch + 2);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'debussy': {
      for (const n of notes) {
        n.duration = Math.min(spanQ - n.startBeat, n.duration * 1.12);
      }
      break;
    }
    case 'wayne_shorter': {
      if (notes.length > 2) notes.pop();
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'herbie_hancock': {
      for (let i = 1; i < notes.length; i++) {
        const n = notes[i]!;
        n.startBeat = Math.min(spanQ - n.duration - 0.25, n.startBeat + 0.5);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'charles_mingus': {
      if (bar1Based % 6 === 0) {
        for (const n of notes) n.pitch = clamp(n.pitch + 3);
      }
      break;
    }
    case 'duke_ellington': {
      notes[0]!.startBeat = Math.min(spanQ - notes[0]!.duration, notes[0]!.startBeat + 0.125);
      break;
    }
    case 'thad_jones': {
      for (const n of notes) n.startBeat = Math.min(spanQ - n.duration - 0.1, n.startBeat + 0.25);
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'count_basie': {
      const src = notes[0]?.pitch ?? clamp(60 + rpc);
      const out: NoteEvent[] = [0, 1, 2, 3]
        .filter((beat) => beat < spanQ)
        .map((sb) =>
          createNote(clamp(src + (sb % 2)), sb, Math.min(1, spanQ - sb)),
        );
      replaceMeasureNotes(m, out);
      break;
    }
    case 'ravel': {
      for (const n of notes) n.pitch = clamp(n.pitch + 2);
      break;
    }
    case 'maria_schneider': {
      for (const n of notes) {
        n.duration = Math.min(spanQ - n.startBeat, n.duration * 1.25);
      }
      break;
    }
    case 'beethoven_late': {
      const last = notes[notes.length - 1]!;
      last.duration = Math.min(spanQ - last.startBeat, last.duration + Math.min(0.35, spanQ * 0.06));
      break;
    }
    case 'turtle_island': {
      for (const n of notes) {
        const pc = n.pitch % 12;
        const up = (pc + 2) % 12;
        if (majScale.has(pc) && majScale.has(up)) n.pitch = clamp(n.pitch + 2);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'reich_glass': {
      if (bar1Based % 4 === 1 && notes[0]) {
        notes[0]!.startBeat = Math.min(spanQ - notes[0]!.duration, notes[0]!.startBeat + 0.125);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'shostakovich': {
      if (bar1Based % 2 === 1) {
        for (const n of notes) n.startBeat = Math.min(spanQ - n.duration, n.startBeat + 0.5);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'lachenmann': {
      for (const n of notes) {
        if (n.duration >= spanQ * 0.45) n.velocity = Math.min(40, n.velocity ?? 64);
      }
      break;
    }
    case 'ligeti': {
      const lead = notes[0];
      if (lead) {
        const side = bar1Based % 2 === 0 ? 1 : -1;
        const inner = createNote(
          clamp(lead.pitch + side),
          Math.min(spanQ - 0.25, lead.startBeat + 0.125),
          0.25,
        );
        replaceMeasureNotes(m, [...notes, inner].sort((a, b) => a.startBeat - b.startBeat));
      }
      break;
    }
    case 'crumb_black_angels': {
      if (bar1Based % 4 === 0 && notes.length > 1) {
        notes.pop();
        replaceMeasureNotes(m, notes);
      }
      break;
    }
    case 'part': {
      for (const n of notes) {
        n.pitch = clamp(snapMidiToTriadTone(n.pitch, rpc));
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'dutilleux': {
      for (let i = 0; i < notes.length; i++) {
        if (i % 2 === 0) notes[i]!.pitch = clamp(notes[i]!.pitch + 1);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'thelonious_monk': {
      if ((bar1Based + 2) % 4 === 0) {
        for (const n of notes) n.pitch = clamp(n.pitch + 1);
      }
      break;
    }
    default:
      break;
  }
}

/** Bass skeleton post pass (walking / colour / sustain hints on top of abstract bass fill). */
export function postProcessDuoAbstractBass(
  engineVrbId: string,
  m: MeasureModel,
  context: CompositionContext,
  bar1Based: number,
  effectiveLow: number,
  effectiveHigh: number,
  spanQ: number,
): void {
  if (!engineVrbId || LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has(engineVrbId)) return;
  const notes = sortedNotes(m);
  if (notes.length === 0) return;
  const clamp = (p: number) => clampPitch(p, effectiveLow, effectiveHigh);

  switch (engineVrbId) {
    case 'bill_evans': {
      const n0 = notes[0]!;
      if (notes.length === 1 && spanQ >= 3) {
        addEvent(m, createNote(clamp(n0.pitch - 1), Math.min(2.75, n0.startBeat + 2), 0.25));
      }
      break;
    }
    case 'john_coltrane': {
      notes[0]!.duration = Math.min(spanQ - notes[0]!.startBeat, notes[0]!.duration + 0.5);
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'pat_metheny': {
      for (let i = 0; i < notes.length - 1; i++) {
        const a = notes[i]!;
        const b = notes[i + 1]!;
        if (b.startBeat - (a.startBeat + a.duration) < 0.2 && Math.abs(a.pitch - b.pitch) <= 2) {
          b.startBeat = a.startBeat + a.duration;
        }
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'wayne_shorter': {
      for (const n of notes) n.duration = Math.max(0.25, n.duration * 0.75);
      break;
    }
    case 'herbie_hancock': {
      if (notes[0]) notes[0]!.startBeat = Math.min(spanQ - notes[0]!.duration, notes[0]!.startBeat + 0.25);
      break;
    }
    case 'charles_mingus': {
      notes[0]!.pitch = clamp(notes[0]!.pitch - 1);
      break;
    }
    case 'duke_ellington': {
      for (const n of notes) n.duration = Math.min(spanQ - n.startBeat, n.duration * 1.08);
      break;
    }
    case 'thad_jones': {
      const extra: NoteEvent[] = [];
      for (const n of notes) {
        if (n.startBeat >= 0.25) {
          extra.push(createNote(clamp(n.pitch - 1), n.startBeat - 0.25, 0.25));
        }
      }
      replaceMeasureNotes(m, [...extra, ...notes].sort((a, b) => a.startBeat - b.startBeat));
      break;
    }
    case 'count_basie': {
      for (const n of notes) {
        n.startBeat = Math.round(n.startBeat);
        n.duration = Math.min(1, Math.max(0.25, n.duration));
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'ravel': {
      for (const n of notes) n.pitch = clamp(n.pitch + 1);
      break;
    }
    case 'maria_schneider': {
      for (const n of notes) n.duration = Math.min(spanQ - n.startBeat, n.duration * 1.35);
      break;
    }
    case 'beethoven_late': {
      const extra: NoteEvent[] = [];
      for (const n of notes) {
        if (n.startBeat >= 0.25) {
          extra.push(createNote(clamp(n.pitch - 1), n.startBeat - 0.25, 0.25));
        }
      }
      replaceMeasureNotes(m, [...extra, ...notes].sort((a, b) => a.startBeat - b.startBeat));
      break;
    }
    case 'turtle_island': {
      for (const n of notes) {
        if (n.startBeat >= 0.5) n.startBeat = Math.max(0, n.startBeat - 0.25);
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'reich_glass': {
      if (notes[0]) notes[0]!.duration = Math.min(spanQ - notes[0]!.startBeat, notes[0]!.duration + 0.75);
      break;
    }
    case 'shostakovich': {
      if (notes[0]) notes[0]!.duration = Math.min(spanQ - notes[0]!.startBeat, notes[0]!.duration + 0.5);
      break;
    }
    case 'lachenmann': {
      if (notes.length > 2) {
        notes.splice(1, 1);
        replaceMeasureNotes(m, notes);
      }
      break;
    }
    case 'ligeti': {
      for (const n of notes) n.duration = Math.min(spanQ - n.startBeat, n.duration * 1.15);
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'crumb_black_angels': {
      for (const n of notes) n.duration = Math.min(spanQ - n.startBeat, n.duration * 1.2);
      break;
    }
    case 'part': {
      const symPart = resolveBarSymbol(context, bar1Based).symbol;
      const rpcPart = rootPcFromBarSymbol(symPart);
      for (const n of notes) {
        n.pitch = clamp(snapMidiToTriadTone(n.pitch, rpcPart));
      }
      replaceMeasureNotes(m, notes);
      break;
    }
    case 'dutilleux': {
      if (notes[0]) notes[0]!.pitch = clamp(notes[0]!.pitch + 1);
      break;
    }
    case 'thelonious_monk': {
      if ((bar1Based + 2) % 4 === 0) {
        for (const n of notes) n.pitch = clamp(n.pitch + 1);
      }
      break;
    }
    case 'debussy':
    default:
      break;
  }
}
