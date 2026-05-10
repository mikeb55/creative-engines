/**
 * Post-pass for Orbit BB V4.0 (64-bar): intro strip, vacuum thinning, shout dynamics, drum fill hint.
 * Applied after {@link buildBigBandScoreModel}; deterministic.
 */

import { chordSymbolRootPc } from '../voicing/ensembleHarmonyUtils';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

function effBeats(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

function wipeVoice1Rest(m: MeasureModel, len: number): void {
  m.events = [];
  addEvent(m, createRest(0, len, 1));
}

function findPart(score: ScoreModel, id: string): PartModel | undefined {
  return score.parts.find((p) => p.id === id);
}

/** Sparse quarter-stack cluster (written concert MIDI). */
function bar3AltoCluster(m: MeasureModel, len: number): void {
  m.events = [];
  addEvent(m, createNote(60, 0, 1, 1, undefined, [60, 63, 67]));
  if (len > 1) addEvent(m, createRest(1, len - 1, 1));
}

/**
 * Structural overlay — does not replace full orchestration pass; shapes priority bars.
 */
export function applyOrbitBbV64Overlay(score: ScoreModel): void {
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  const trp = findPart(score, 'bb_trumpets');
  const tbn = findPart(score, 'bb_trombones');
  const drums = findPart(score, 'bb_drums');

  // --- Intro 1–4: no brass; alto/tenor mostly tacet; bar 3 sparse cluster only ---
  for (let b = 1; b <= 4; b++) {
    const len = effBeats(score, b);
    const mi = b - 1;
    if (trp) wipeVoice1Rest(trp.measures[mi]!, len);
    if (tbn) wipeVoice1Rest(tbn.measures[mi]!, len);
    if (tenor) wipeVoice1Rest(tenor.measures[mi]!, len);
    if (alto) {
      if (b === 3) bar3AltoCluster(alto.measures[mi]!, len);
      else wipeVoice1Rest(alto.measures[mi]!, len);
    }
  }

  // --- Vacuum 33–36: winds + brass tacet (rhythm / piano left from builder) ---
  for (let b = 33; b <= 36; b++) {
    const len = effBeats(score, b);
    const mi = b - 1;
    if (trp) wipeVoice1Rest(trp.measures[mi]!, len);
    if (tbn) wipeVoice1Rest(tbn.measures[mi]!, len);
    if (alto) wipeVoice1Rest(alto.measures[mi]!, len);
    if (tenor) wipeVoice1Rest(tenor.measures[mi]!, len);
  }

  // --- Stop-time hint bar 20: brass stab beat 1 only (short hit + rest) ---
  const bSt = 20;
  const lenSt = effBeats(score, bSt);
  const scale = lenSt / 4;
  const stabDur = 0.5 * scale;
  if (trp && tbn) {
    const ch = trp.measures[bSt - 1]?.chord ?? 'Fmaj7';
    const rpc = chordSymbolRootPc(ch) ?? 5;
    const midTr = 60 + rpc;
    const midTb = 48 + rpc;
    const mt = trp.measures[bSt - 1]!;
    const mb = tbn.measures[bSt - 1]!;
    mt.events = [];
    mb.events = [];
    addEvent(mt, createNote(midTr, 0, stabDur, 1));
    addEvent(mt, createRest(stabDur, lenSt - stabDur, 1));
    addEvent(mb, createNote(midTb, 0, stabDur, 1));
    addEvent(mb, createRest(stabDur, lenSt - stabDur, 1));
  }

  // --- Drum fill marker bar 47 ---
  if (drums?.measures[46]) {
    drums.measures[46]!.rehearsalMark = drums.measures[46]!.rehearsalMark ?? 'Fill';
  }

  // --- Shout / shock dynamics (extends written dynamics map) ---
  const base = score.measureDynamicsMarkings ?? {};
  score.measureDynamicsMarkings = {
    ...base,
    49: 'ff',
    53: 'mf',
    57: 'p',
    58: 'ff',
    61: 'mp',
    64: 'pp',
  };
}
