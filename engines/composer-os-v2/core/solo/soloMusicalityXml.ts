/**
 * MusicXML post-process — Orbit solo musicality (monophonic, D4–D6, min eighth).
 */

import {
  clampSoloMelodicMidi,
  SOLO_MAX_CONSECUTIVE_EIGHTHS,
  SOLO_MIN_DURATION_BEATS,
  SOLO_PHRASE_REST_MIN_BEATS,
} from './soloMusicality';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchToMidi(step: string, alter: number | undefined, octave: number): number {
  return (octave + 1) * 12 + (STEP[step.toUpperCase()] ?? 0) + (alter ?? 0);
}

function midiToPitch(midi: number): { step: string; alter?: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const names: [string, number][] = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1],
    ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
  ];
  const [step, alter] = names[pc]!;
  return { step, alter: alter || undefined, octave };
}

type XmlNote = {
  isRest: boolean;
  isChord: boolean;
  step?: string;
  alter?: number;
  octave?: number;
  durationDiv: number;
  type?: string;
  voice?: string;
  raw: string;
};

function parseNoteBlock(block: string): XmlNote {
  return {
    isRest: /<rest/.test(block),
    isChord: /<chord\s*\/>/.test(block),
    step: block.match(/<step>([A-G])<\/step>/)?.[1],
    alter: block.match(/<alter>(-?\d+)<\/alter>/)?.[1]
      ? parseInt(block.match(/<alter>(-?\d+)<\/alter>/)![1]!, 10)
      : undefined,
    octave: block.match(/<octave>(\d+)<\/octave>/)?.[1]
      ? parseInt(block.match(/<octave>(\d+)<\/octave>/)![1]!, 10)
      : undefined,
    durationDiv: parseInt(block.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '1', 10),
    type: block.match(/<type>([^<]+)<\/type>/)?.[1],
    voice: block.match(/<voice>(\d+)<\/voice>/)?.[1],
    raw: block,
  };
}

function minDivForEighth(divisions: number): number {
  return Math.max(1, Math.round(divisions / 2));
}

function quantizeDiv(d: number, divisions: number): number {
  const eighth = minDivForEighth(divisions);
  const quarter = divisions;
  const dotted = Math.round(divisions * 1.5);
  const half = divisions * 2;
  if (d <= eighth) return eighth;
  if (d <= quarter) return quarter;
  if (d <= dotted) return dotted;
  if (d <= half) return half;
  return Math.min(divisions * 4, Math.round(d / eighth) * eighth);
}

function typeForDiv(d: number, divisions: number): string {
  const eighth = minDivForEighth(divisions);
  if (d <= eighth) return 'eighth';
  if (d <= divisions) return 'quarter';
  if (d <= Math.round(divisions * 1.5)) return 'quarter';
  if (d <= divisions * 2) return 'half';
  return 'half';
}

function chordTonePcs(symbol: string): Set<number> {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const rootM = hp.match(/^([A-G](?:#|b)?)/i);
  const root = rootM?.[1] ? (noteNameToPitchClass(rootM[1]) ?? 0) : 0;
  const pcs = new Set<number>([root]);
  if (/maj/i.test(hp) || /Δ/.test(hp)) {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
  } else if (/m(?!aj)/i.test(hp) && !/maj/i.test(hp)) {
    pcs.add((root + 3) % 12);
    pcs.add((root + 7) % 12);
  } else if (/7/.test(hp)) {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
    pcs.add((root + 10) % 12);
  } else {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
  }
  return pcs;
}

function snapMidiToHarmony(midi: number, symbol: string): number {
  if (/^NC$/i.test(symbol)) return clampSoloMelodicMidi(midi);
  const tones = chordTonePcs(symbol);
  const pc = ((midi % 12) + 12) % 12;
  if (tones.has(pc)) return clampSoloMelodicMidi(midi);
  let best = midi;
  let bestDist = 99;
  for (const t of tones) {
    for (const oct of [-12, 0, 12]) {
      const candidate = clampSoloMelodicMidi(midi - pc + t + oct);
      const dist = Math.abs(candidate - midi);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

function formatNoteXml(
  n: XmlNote,
  divisions: number,
  snap?: { barNum: number; harmonyBars: readonly string[]; globalIdx: number },
): string {
  const dur = quantizeDiv(n.durationDiv, divisions);
  const t = typeForDiv(dur, divisions);
  const voice = n.voice ?? '1';
  if (n.isRest) {
    return `<note><rest/><duration>${dur}</duration><voice>${voice}</voice><type>${t}</type></note>`;
  }
  let midi = pitchToMidi(n.step!, n.alter, n.octave!);
  if (snap && snap.globalIdx % 4 === 3) {
    const sym = snap.harmonyBars[snap.barNum - 1] ?? 'C';
    midi = snapMidiToHarmony(midi, sym);
  } else if (snap && snap.globalIdx % 4 === 2) {
    const sym = snap.harmonyBars[snap.barNum - 1] ?? 'C';
    midi = snapMidiToHarmony(midi, sym);
  }
  midi = clampSoloMelodicMidi(midi);
  const p = midiToPitch(midi);
  const alterXml = p.alter != null ? `<alter>${p.alter}</alter>` : '';
  return `<note><pitch><step>${p.step}</step>${alterXml}<octave>${p.octave}</octave></pitch><duration>${dur}</duration><voice>${voice}</voice><type>${t}</type></note>`;
}

function unfoldChordsToArpeggio(notes: XmlNote[], divisions: number): XmlNote[] {
  const out: XmlNote[] = [];
  let pos = 0;
  let chordCluster: XmlNote[] = [];
  for (const n of notes) {
    if (n.isChord) {
      chordCluster.push(n);
      continue;
    }
    if (chordCluster.length > 0) {
      const eighth = minDivForEighth(divisions);
      for (let i = 0; i < chordCluster.length; i++) {
        out.push({ ...chordCluster[i]!, isChord: false, durationDiv: eighth });
        pos += eighth;
      }
      chordCluster = [];
    }
    out.push({ ...n, isChord: false });
    if (!n.isRest) pos += n.durationDiv;
    else pos += n.durationDiv;
  }
  if (chordCluster.length > 0) {
    const eighth = minDivForEighth(divisions);
    for (const c of chordCluster) {
      out.push({ ...c, isChord: false, durationDiv: eighth });
    }
  }
  return out;
}

function insertBreathRests(
  notes: XmlNote[],
  divisions: number,
  maxEighthRun: number,
): XmlNote[] {
  const eighth = minDivForEighth(divisions);
  const quarter = divisions;
  const out: XmlNote[] = [];
  let eighthRun = 0;

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    const q = quantizeDiv(n.durationDiv, divisions);
    const note = { ...n, durationDiv: q };

    if (!note.isRest && q <= eighth + 0.01) {
      eighthRun += 1;
      if (eighthRun > maxEighthRun) {
        out.push({
          isRest: true,
          isChord: false,
          durationDiv: quarter,
          raw: '',
        });
        eighthRun = 0;
        note.durationDiv = quarter;
      }
    } else if (!note.isRest) {
      eighthRun = 0;
    }
    out.push(note);
  }
  return out;
}

function enforceRhythmicVariety(notes: XmlNote[], divisions: number, barNum: number): XmlNote[] {
  const eighth = minDivForEighth(divisions);
  const quarter = divisions;
  const dotted = Math.round(divisions * 1.5);
  const half = divisions * 2;
  const out: XmlNote[] = [];
  let pitchedIdx = 0;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    if (n.isRest) {
      out.push(n);
      continue;
    }
    let dur = quantizeDiv(n.durationDiv, divisions);
    const role = (barNum + pitchedIdx) % 4;
    if (role === 0) dur = half;
    else if (role === 1) dur = dotted;
    else if (role === 2) dur = quarter;
    else if (dur <= eighth) dur = eighth;
    pitchedIdx += 1;
    out.push({ ...n, durationDiv: dur });
  }
  return out;
}

export type SoloMusicalityXmlOptions = {
  maxConsecutiveEighths?: number;
  /** Insert quarter rest at end of every Nth bar when bar has no rest. */
  phraseBreathEveryBars?: number;
  enforceRhythmicVariety?: boolean;
  harmonyBars?: readonly string[];
};

export function applyOrbitSoloMusicalityToMusicXml(
  xml: string,
  options?: SoloMusicalityXmlOptions,
): string {
  const maxEighthRun = options?.maxConsecutiveEighths ?? SOLO_MAX_CONSECUTIVE_EIGHTHS;
  const breathEvery = options?.phraseBreathEveryBars ?? 3;
  let globalPitchIdx = 0;

  return xml.replace(
    /<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g,
    (full, a1, numStr, a2, body) => {
      const barNum = parseInt(numStr, 10);
      const divisions = parseInt(body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
      const beats = parseInt(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
      const beatType = parseInt(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
      const barLen = (divisions * beats * 4) / beatType;

      const head = body.replace(/<note>[\s\S]*?<\/note>/g, '').trimEnd();
      const rawNotes = [...body.matchAll(/<note>([\s\S]*?)<\/note>/g)].map((m) =>
        parseNoteBlock(m[1]!),
      );

      let notes = unfoldChordsToArpeggio(rawNotes, divisions);
      notes = insertBreathRests(notes, divisions, maxEighthRun);
      if (options?.enforceRhythmicVariety) {
        notes = enforceRhythmicVariety(notes, divisions, barNum);
      }

      const rebuilt: string[] = [];
      let pos = 0;
      for (const n of notes) {
        const dur = quantizeDiv(n.durationDiv, divisions);
        if (pos + dur > barLen + 0.5) break;
        const snapCtx =
          options?.harmonyBars && !n.isRest
            ? { barNum, harmonyBars: options.harmonyBars, globalIdx: globalPitchIdx }
            : undefined;
        if (!n.isRest) globalPitchIdx += 1;
        rebuilt.push(formatNoteXml({ ...n, durationDiv: dur }, divisions, snapCtx));
        pos += dur;
      }

      if (barNum % 4 === 0 && barLen - pos >= divisions * SOLO_PHRASE_REST_MIN_BEATS) {
        const restDur = Math.min(divisions * SOLO_PHRASE_REST_MIN_BEATS, barLen - pos);
        if (restDur >= minDivForEighth(divisions)) {
          rebuilt.push(
            `<note><rest/><duration>${restDur}</duration><voice>1</voice><type>quarter</type></note>`,
          );
        }
      } else if (barNum % breathEvery === 0 && barLen - pos >= divisions * SOLO_PHRASE_REST_MIN_BEATS) {
        const restDur = Math.min(divisions * SOLO_PHRASE_REST_MIN_BEATS, barLen - pos);
        if (restDur >= minDivForEighth(divisions)) {
          rebuilt.push(
            `<note><rest/><duration>${restDur}</duration><voice>1</voice><type>quarter</type></note>`,
          );
        }
      }

      if (rebuilt.length === 0) {
        rebuilt.push(
          `<note><rest/><duration>${barLen}</duration><voice>1</voice><type>whole</type></note>`,
        );
      }

      const newBody = (head ? head + '\n      ' : '') + rebuilt.join('\n      ') + '\n      ';
      return `<measure${a1}number="${numStr}"${a2}>${newBody}</measure>`;
    },
  );
}
