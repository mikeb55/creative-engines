/**
 * Riff bar snapshots for lock / regen / mutate (echoed on GenerateResult, no parallel state store).
 */

import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { createMeasure, createNote, createRest, createScore } from '../score-model/scoreEventBuilder';
import { resolveRiffCoreMotif } from './riffSaxMotifSeedPoc';
import type { BuiltRiffScore } from './buildRiffScoreModel';
import { buildFxMarkerTrack } from './riffFxMarkerBuilder';
import { buildHornStabTrack } from './riffHornStabBuilder';
import { computeGuitarRestWindows } from './riffCallResponseEngine';
import { buildRiffGenerationMetadata } from './riffMultiVoiceMetadata';
import type { RiffGeneratorParams, RiffRhythmSegment, RiffStyleId } from './riffTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { RiffProfile } from '../composer/riffProfileTypes';
import { riffPitchFieldForBar } from './riffPitchField';
import { assignBassToBar } from './riffBass';
import { mulberry32 } from './riffRandom';

export type RiffBarNoteSnapshot = {
  pitch: number;
  startBeat: number;
  duration: number;
  voice?: number;
};

export type RiffBarSnapshot = {
  rhythm: RiffRhythmSegment[];
  guitarNotes: RiffBarNoteSnapshot[];
  bassNotes?: RiffBarNoteSnapshot[];
  chord?: string;
};

export type RiffCarryForward = {
  bars: RiffBarSnapshot[];
};

function midiFromPc(pc: number, low: number, high: number): number {
  let m = low + ((pc % 12) + 12) % 12;
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return Math.max(low, Math.min(high, m));
}

function retargetGuitarNotes(
  notes: RiffBarNoteSnapshot[],
  newChord: string,
  profile: RiffProfile | undefined,
  vrbId: string | undefined,
  barIndex: number,
  style: RiffStyleId
): RiffBarNoteSnapshot[] {
  const field = riffPitchFieldForBar(newChord, style, profile, vrbId, barIndex);
  const tones = chordTonesForChordSymbol(newChord, { lockedHarmony: true });
  const low = profile?.riffRegisterFloor ?? 52;
  const high = profile?.riffRegisterCeiling ?? 75;
  const pool = field?.allowedPcs?.length
    ? field.allowedPcs.map((e) => e.pc)
    : [tones.root, tones.third, tones.fifth, tones.seventh].map((m) => ((m % 12) + 12) % 12);

  return notes.map((n) => {
    const prevPc = ((n.pitch % 12) + 12) % 12;
    let bestPc = pool[0]!;
    let bestD = 99;
    for (const pc of pool) {
      const d = Math.min(Math.abs(pc - prevPc), 12 - Math.abs(pc - prevPc));
      if (d < bestD) {
        bestD = d;
        bestPc = pc;
      }
    }
    const octave = Math.floor(n.pitch / 12);
    let pitch = midiFromPc(bestPc, low, high);
    if (Math.abs(pitch - n.pitch) > 6) {
      pitch = Math.max(low, Math.min(high, octave * 12 + bestPc));
    }
    return { ...n, pitch };
  });
}

/**
 * Locked bar chord edit: keep rhythm skeleton, retarget guitar/bass (and horn chord) to new symbol.
 */
export function retargetLockedBarToChord(
  lockedBar: RiffBarSnapshot,
  newChordSymbol: string,
  vrbProfile: RiffProfile | undefined,
  vrbId?: string,
  barIndex = 0,
  style: RiffStyleId = 'neutral'
): RiffBarSnapshot {
  const rhythm = lockedBar.rhythm.map((r) => ({ ...r }));
  const guitarNotes = retargetGuitarNotes(
    lockedBar.guitarNotes.map((n) => ({ ...n })),
    newChordSymbol,
    vrbProfile,
    vrbId,
    barIndex,
    style
  );
  const rng = mulberry32(barIndex * 31337 + newChordSymbol.length);
  const bassNotes = assignBassToBar(
    rhythm,
    newChordSymbol,
    rng,
    barIndex,
    vrbProfile,
    guitarNotes,
    undefined
  );
  if (vrbProfile?.hornStabTopology?.length) {
    buildHornStabTrack(vrbProfile, barIndex + 1, [newChordSymbol], vrbId);
  }
  return {
    rhythm,
    guitarNotes,
    bassNotes,
    chord: newChordSymbol,
  };
}

export function normalizeRiffBarLocks(locks: boolean[] | undefined, bars: number): boolean[] {
  const out = new Array<boolean>(bars).fill(false);
  if (!locks?.length) return out;
  for (let i = 0; i < bars; i++) out[i] = locks[i] === true;
  return out;
}

function notesFromMeasureEvents(
  events: import('../score-model/scoreModelTypes').ScoreEvent[]
): RiffBarNoteSnapshot[] {
  const out: RiffBarNoteSnapshot[] = [];
  for (const ev of events) {
    if (ev.kind !== 'note') continue;
    out.push({
      pitch: ev.pitch,
      startBeat: ev.startBeat,
      duration: ev.duration,
      voice: ev.voice,
    });
  }
  return out;
}

export function snapshotRiffCarryForward(
  score: ScoreModel,
  perBarRhythm: RiffRhythmSegment[][]
): RiffCarryForward {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const bass = score.parts.find((p) => p.id === 'bass');
  const n = Math.max(guitar?.measures.length ?? 0, perBarRhythm.length);
  const bars: RiffBarSnapshot[] = [];
  for (let b = 0; b < n; b++) {
    const gm = guitar?.measures[b];
    const bm = bass?.measures[b];
    bars.push({
      rhythm: (perBarRhythm[b] ?? []).map((r) => ({ ...r })),
      guitarNotes: notesFromMeasureEvents(gm?.events ?? []),
      bassNotes: bm ? notesFromMeasureEvents(bm.events) : undefined,
      chord: gm?.chord,
    });
  }
  return { bars };
}

function eventsFromNotes(notes: RiffBarNoteSnapshot[], doubleOct: boolean): import('../score-model/scoreModelTypes').ScoreEvent[] {
  const ev: import('../score-model/scoreModelTypes').ScoreEvent[] = [];
  for (const ln of notes) {
    ev.push(createNote(ln.pitch, ln.startBeat, ln.duration, ln.voice ?? 1, 'riff_core'));
    if (doubleOct) {
      ev.push(createNote(ln.pitch + 12, ln.startBeat, ln.duration, 2, 'riff_core'));
    }
  }
  return ev.length ? ev : [createRest(0, 4, 1)];
}

export function writeRiffBarSnapshotToParts(
  parts: PartModel[],
  barIndex: number,
  snap: RiffBarSnapshot,
  doubleOct: boolean
): void {
  const guitar = parts.find((p) => p.id === 'guitar');
  const bass = parts.find((p) => p.id === 'bass');
  if (guitar?.measures[barIndex]) {
    const gm = guitar.measures[barIndex]!;
    if (snap.chord) gm.chord = snap.chord;
    gm.events = eventsFromNotes(snap.guitarNotes, doubleOct);
  }
  if (bass?.measures[barIndex] && snap.bassNotes) {
    bass.measures[barIndex]!.events = snap.bassNotes.map((n) =>
      createNote(n.pitch, n.startBeat, n.duration, n.voice ?? 1)
    );
  }
}

export function applyRiffBarLocksToBuilt(
  built: BuiltRiffScore,
  carryForward: RiffCarryForward | undefined,
  locks: boolean[]
): BuiltRiffScore {
  if (!carryForward?.bars.length || !locks.some(Boolean)) return built;
  const doubleOct = built.score.parts[0]?.id === 'guitar' && built.score.parts.some((p) => p.id === 'guitar');
  const lineDouble = built.score.parts[0]?.measures[0]?.events.some((e) => e.kind === 'note' && e.voice === 2);
  for (let b = 0; b < built.score.parts[0]!.measures.length; b++) {
    if (!locks[b]) continue;
    const snap = carryForward.bars[b];
    if (!snap) continue;
    writeRiffBarSnapshotToParts(built.score.parts, b, snap, Boolean(lineDouble));
    if (snap.rhythm.length) built.perBarRhythm[b] = snap.rhythm.map((r) => ({ ...r }));
  }
  return built;
}

export function buildRiffScoreFromBarSnapshots(
  params: RiffGeneratorParams,
  snapshots: RiffBarSnapshot[],
  chords: string[]
): BuiltRiffScore {
  const wantBass = params.bassEnabled && params.lineMode === 'guitar_bass';
  const doubleOct = params.lineMode === 'octave_double';
  const guitarMeasures = snapshots.map((s, i) => {
    const m = createMeasure(i + 1, s.chord ?? chords[i] ?? chords[0] ?? 'Am7');
    if (i === 0) m.rehearsalMark = 'Riff';
    m.events = eventsFromNotes(s.guitarNotes, doubleOct);
    return m;
  });
  const bassMeasures = wantBass
    ? snapshots.map((s, i) => {
        const m = createMeasure(i + 1, s.chord ?? chords[i] ?? chords[0] ?? 'Am7');
        m.events = (s.bassNotes ?? []).length
          ? s.bassNotes!.map((n) => createNote(n.pitch, n.startBeat, n.duration, n.voice ?? 1))
          : [createRest(0, 4, 1)];
        return m;
      })
    : null;

  const parts: PartModel[] = [
    {
      id: 'guitar',
      name: 'Clean Electric Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: guitarMeasures,
    },
  ];
  if (bassMeasures) {
    parts.push({
      id: 'bass',
      name: 'Acoustic Upright Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: bassMeasures,
    });
  }

  const perBarRhythm = snapshots.map((s) => s.rhythm.map((r) => ({ ...r })));
  const score = createScore(params.title?.trim() || 'Riff', parts, { tempo: params.bpm });
  const hornStabTrack = buildHornStabTrack(params.riffProfile, params.bars, chords, params.vrbId);
  const fxMarkerTrack = buildFxMarkerTrack(params.riffProfile);
  const guitarRestWindows = computeGuitarRestWindows(params.riffProfile, params.bars, params.vrbId);
  const generationMetadata = buildRiffGenerationMetadata({
    hornStabTrack,
    fxMarkerTrack,
    guitarRestWindows,
    profile: params.riffProfile,
    vrbId: params.vrbId,
    bars: params.bars,
    hasBassPart: !!bassMeasures,
  });
  return {
    score,
    perBarRhythm,
    coreMotif: resolveRiffCoreMotif(params.seed, params.vrbId),
    generationMetadata,
  };
}
