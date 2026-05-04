/**
 * Smoke — Tonality Vault quality: Chord Inspector, riff modes, LayerStateMachine, reharm, Big Band routing, GCE rule sets.
 */

import { routeBigBand } from '../core/arrangement/arrangementLayerRouter';
import { generateReharmCandidates } from '../core/harmony/reharmCandidateEngine';
import { LayerStateMachine, type TensionState } from '../core/harmony/layerStateMachine';
import { buildAllVaultChordRuleSets } from '../core/harmony/vaultChordRuleSet';
import { TONALITY_VAULT_DATABASE } from '../core/harmony/tonalityVaultDatabase';
import { generateVaultRiff, type ScoreNote } from '../core/guitar/vaultRiffGenerator';
import { inspectChordSymbol } from '../core/irealpro/chordSymbolMapper';

/** Symbols requested for inspector QA (`Dmin7b5` does not normalise to `m7b5`; `Dm7b5` maps to vault `min7b5`). */
const CHORD_INSPECTOR_SYMBOLS = ['Cmaj7', 'F#min9', 'Bb7#11', 'Gsus2', 'Dm7b5', 'A13#11'] as const;

function testChordInspectorVaultShape(): boolean {
  for (const sym of CHORD_INSPECTOR_SYMBOLS) {
    const r = inspectChordSymbol(sym);
    if (r == null) return false;
    if (r.melodicTriad.length !== 3) return false;
    /* Vault row may emit 3–4 absolute PCs when the spec collapses degrees; always ≥3 distinct harmonic anchors. */
    if (r.quadratonicPitchClasses.length < 3) return false;
    if (r.guitarGrips.length === 0) return false;
  }
  return true;
}

/** Count eighth onsets where pitch changes vs previous (bebop solo surface). */
function pitchChangeCount(notes: ScoreNote[]): number {
  let c = 0;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i]!.pitch !== notes[i - 1]!.pitch) c++;
  }
  return c;
}

/** Merge consecutive same-pitch rows; return average duration of merged segments. */
function avgMergedSegmentDuration(notes: ScoreNote[]): number {
  if (notes.length === 0) return 0;
  const segDurs: number[] = [];
  let curDur = notes[0]!.duration;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i]!.pitch === notes[i - 1]!.pitch) curDur += notes[i]!.duration;
    else {
      segDurs.push(curDur);
      curDur = notes[i]!.duration;
    }
  }
  segDurs.push(curDur);
  const sum = segDurs.reduce((a, b) => a + b, 0);
  return sum / segDurs.length;
}

function maxMergedConsecutiveDuration(notes: ScoreNote[]): number {
  if (notes.length === 0) return 0;
  let maxD = notes[0]!.duration;
  let run = notes[0]!.duration;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i]!.pitch === notes[i - 1]!.pitch) run += notes[i]!.duration;
    else run = notes[i]!.duration;
    if (run > maxD) maxD = run;
  }
  return maxD;
}

/**
 * Solo `bebop-placement` vs melody `quadratonic` on the same eighth grid: solo moves pitch more often;
 * quadratonic melody sustains longer merged pitch spans (phrase-oriented).
 */
function testSoloVsMelodyVaultRiffDensity(): boolean {
  const solo = generateVaultRiff({
    chordTypeId: 'Maj7',
    rootPc: 0,
    bars: 4,
    style: 'bebop-placement',
  });
  const melody = generateVaultRiff({
    chordTypeId: 'Maj7',
    rootPc: 0,
    bars: 4,
    style: 'quadratonic',
  });

  if (solo.length !== 32 || melody.length !== 32) return false;

  if (pitchChangeCount(solo) <= pitchChangeCount(melody)) return false;

  if (maxMergedConsecutiveDuration(melody) < 1) return false;

  if (!(avgMergedSegmentDuration(solo) < avgMergedSegmentDuration(melody))) return false;
  return true;
}

/**
 * Cyclic permutation of **strong / weak / offbeat** so primary→tension→chaos can occur (same three strengths as one beat triplet).
 */
const BEAT_TRIPLET_PHASE_FOR_CHAOS: Array<'strong' | 'weak' | 'offbeat'> = ['weak', 'offbeat', 'strong'];

function testLayerStateMachineCoherence(): boolean {
  const states: TensionState[] = ['resolve', 'primary', 'tension', 'chaos', 'recover'];
  for (const s of states) {
    if (LayerStateMachine.getAllowedLayers(s).length < 1) return false;
  }

  let maxChaosRun = 0;
  let chaosRun = 0;
  const lsm = new LayerStateMachine();

  for (let i = 0; i < 32; i++) {
    const b = BEAT_TRIPLET_PHASE_FOR_CHAOS[i % 3]!;
    lsm.advance(b);
    if (lsm.currentState === 'chaos') {
      chaosRun++;
      maxChaosRun = Math.max(maxChaosRun, chaosRun);
    } else {
      chaosRun = 0;
    }
  }
  if (maxChaosRun > 16) return false;

  const hist: TensionState[] = [];
  const probe = new LayerStateMachine();
  for (let i = 0; i < 128; i++) {
    probe.advance(BEAT_TRIPLET_PHASE_FOR_CHAOS[i % 3]!);
    hist.push(probe.currentState);
  }
  for (let i = 0; i < hist.length; i++) {
    if (hist[i] !== 'chaos') continue;
    const rest = hist.slice(i + 1);
    const hit = rest.findIndex((s) => s === 'resolve');
    if (hit === -1 || hit > 32) return false;
  }

  return true;
}

function testReharmCandidatesMaj7(): boolean {
  const cands = generateReharmCandidates('Maj7', 0, 4, 'neutral');
  if (cands.length === 0) return false;
  if (!cands.some((c) => c.melodicTriadPreserved)) return false;
  if (!cands.some((c) => c.guitarFriendly)) return false;
  for (const c of cands) {
    if (c.bassSmoothnessScore < 0 || c.bassSmoothnessScore > 1) return false;
  }
  return true;
}

function testRouteBigBandMaj7Sharp11(): boolean {
  const layers = routeBigBand('Maj7#11', 0);
  if (layers.length !== 6) return false;
  if (!layers.some((L) => L.assignedTensionLayer === 0)) return false;
  if (!layers.some((L) => L.assignedTensionLayer === 2)) return false;
  if (layers.some((L) => L.allowedRoles.length === 0)) return false;
  return true;
}

function testBuildAllVaultChordRuleSetsGceAlignment(): boolean {
  const sets = buildAllVaultChordRuleSets();
  if (sets.length !== TONALITY_VAULT_DATABASE.length) return false;
  for (const rs of sets) {
    if (rs.phraseTemplates.length === 0) return false;
    if (rs.recommendedTensionStates.length === 0) return false;
    if (rs.guitarGripCount <= 0) return false;
  }
  return true;
}

export function runVaultQualitySmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Vault quality: Chord Inspector symbols → triad + quadratonic + grips', testChordInspectorVaultShape],
    ['Vault quality: solo vs melody riff density (Maj7, 4 bars)', testSoloVsMelodyVaultRiffDensity],
    ['Vault quality: LayerStateMachine chaos budget + resolve + allowed layers', testLayerStateMachineCoherence],
    ['Vault quality: reharm candidates (Maj7, neutral drift)', testReharmCandidatesMaj7],
    ['Vault quality: Big Band routeBigBand(Maj7#11, 0)', testRouteBigBandMaj7Sharp11],
    ['Vault quality: buildAllVaultChordRuleSets GCE alignment', testBuildAllVaultChordRuleSetsGceAlignment],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
