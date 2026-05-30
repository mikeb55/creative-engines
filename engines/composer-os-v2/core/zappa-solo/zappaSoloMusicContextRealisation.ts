/**
 * Zappa Solo MusicContext realisation — pitch language, arc metrics, motif derivation.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import { coreMotifToMusicContextMotif } from '../music-context/musicContextAdapters';
import type { MusicContextMotif } from '../music-context/musicContextTypes';
import type { CompositionContext } from '../compositionContext';
import { generateZappaSolo } from '../solo/zappasoloEngine';
import type { SoloLine, SoloNote } from '../solo/soloTypes';
import type {
  ZappaModalField,
  ZappaSoloArcSegment,
  ZappaSoloArcState,
  ZappaSoloMusicContextPreset,
  ZappaSoloParticipationLevel,
  ZappaSoloRealisationReceipt,
} from './zappaSoloMusicContextTypes';

const MODAL_PC_SET: Record<ZappaModalField, readonly number[]> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const BLUES_PC = [0, 3, 5, 6, 7, 10];

const ARC_DENSITY: Record<ZappaSoloArcState, number> = {
  claim: 0.62,
  agitation: 0.82,
  fracture: 0.88,
  crooked_landing: 0.58,
};

const ARC_DISSONANCE: Record<ZappaSoloArcState, number> = {
  claim: 0.35,
  agitation: 0.62,
  fracture: 0.78,
  crooked_landing: 0.48,
};

function inferModalField(keyRoot: string, harmonyBars: readonly string[]): ZappaModalField {
  const sym = harmonyBars[0] ?? 'C7';
  const hp = parseChordSymbol(sym).harmonyPart;
  if (/m(?!aj)/i.test(hp) && !/m7b5/i.test(hp)) return 'dorian';
  if (/7alt|7#11|maj7#11/i.test(hp)) return 'lydian';
  if (/7(?!maj)/i.test(hp)) return 'mixolydian';
  if (/dim|m7b5/i.test(hp)) return 'phrygian';
  const pc = noteNameToPitchClass(keyRoot) ?? 0;
  return pc % 2 === 0 ? 'mixolydian' : 'dorian';
}

function defaultSoloArc(totalBars: number): ZappaSoloArcSegment[] {
  const q = Math.max(1, Math.floor(totalBars / 4));
  const r = totalBars - q * 3;
  return [
    { startBar: 1, endBar: q, state: 'claim' },
    { startBar: q + 1, endBar: q * 2, state: 'agitation' },
    { startBar: q * 2 + 1, endBar: q * 3, state: 'fracture' },
    { startBar: q * 3 + 1, endBar: totalBars, state: 'crooked_landing' },
  ];
}

export function arcStateForBar(barIndex: number, arc: readonly ZappaSoloArcSegment[]): ZappaSoloArcState {
  const barOne = barIndex + 1;
  for (const seg of arc) {
    if (barOne >= seg.startBar && barOne <= seg.endBar) return seg.state;
  }
  return arc[arc.length - 1]?.state ?? 'claim';
}

function arcToFormSections(arc: readonly ZappaSoloArcSegment[], totalBars: number) {
  return arc.map((seg) => ({
    label: seg.state,
    startBar: seg.startBar,
    length: seg.endBar - seg.startBar + 1,
  })).filter((s) => s.startBar <= totalBars);
}

export function buildZappaSoloCompositionContext(
  preset: ZappaSoloMusicContextPreset,
  harmonyBars: readonly string[],
): CompositionContext {
  const totalBars = harmonyBars.length;
  const arc = preset.soloArc?.length ? preset.soloArc : defaultSoloArc(totalBars);
  return {
    seed: preset.seed ?? 0,
    form: {
      totalBars,
      sections: arcToFormSections(arc, totalBars),
    },
    generationMetadata: {
      frankZappaEffectiveHarmonyBars: [...harmonyBars],
      barMeterMap: preset.barMeterMap,
    },
  } as CompositionContext;
}

function resolveArcOptions(
  preset: ZappaSoloMusicContextPreset,
  arc: readonly ZappaSoloArcSegment[],
): { density: number; dissonanceLevel: number } {
  const states = arc.map((s) => s.state);
  const avgDensity =
    states.reduce((sum, st) => sum + ARC_DENSITY[st], 0) / Math.max(1, states.length);
  const avgDiss =
    states.reduce((sum, st) => sum + ARC_DISSONANCE[st], 0) / Math.max(1, states.length);
  return {
    density: preset.density ?? avgDensity,
    dissonanceLevel: preset.dissonanceLevel ?? avgDiss,
  };
}

function pcRelative(midi: number, tonicPc: PitchClass): number {
  return (((Math.round(midi) - tonicPc) % 12) + 12) % 12;
}

function isNearNeighborForeign(pc: number, field: readonly number[]): boolean {
  if (field.includes(pc)) return false;
  for (const tone of field) {
    const d = Math.min((pc - tone + 12) % 12, (tone - pc + 12) % 12);
    if (d <= 2) return true;
  }
  return false;
}

function isPentatonicBlues(pc: number, field: readonly number[]): boolean {
  const bluesInField = BLUES_PC.filter((b) => field.includes(b));
  return bluesInField.includes(pc) || (field.includes(pc) && BLUES_PC.includes(pc));
}

function computeModalAnchorRatio(
  notes: readonly SoloNote[],
  tonicPc: PitchClass,
  field: ZappaModalField,
): number {
  const pitched = notes.filter((n) => !n.isRest);
  if (pitched.length === 0) return 0;
  const pcs = MODAL_PC_SET[field];
  let primary = 0;
  let pentBlues = 0;
  let foreignNeighbor = 0;
  for (const n of pitched) {
    const rel = pcRelative(n.midi, tonicPc);
    if (pcs.includes(rel)) primary += 1;
    else if (isPentatonicBlues(rel, pcs)) pentBlues += 1;
    else if (isNearNeighborForeign(rel, pcs)) foreignNeighbor += 1;
  }
  const total = pitched.length;
  const weighted = primary + pentBlues * 0.2 + foreignNeighbor * 0.15;
  return Math.min(1, weighted / (total * 0.75));
}

function computeRhythmicElasticity(line: SoloLine): number {
  const notes = line.allNotes.filter((n) => !n.isRest);
  if (notes.length === 0) return 0;
  let score = 0;
  const tuplets = notes.filter((n) => n.tupletRole === 'quintuplet' || n.tupletRole === 'septuplet');
  score += Math.min(0.35, tuplets.length / Math.max(1, notes.length) * 2);
  const offbeats = notes.filter((n) => n.startBeat % 1 >= 0.25 && n.startBeat % 1 <= 0.75);
  score += Math.min(0.25, offbeats.length / notes.length);
  const phraseLens = line.phrases.map((p) => p.notes.filter((n) => !n.isRest).length);
  if (phraseLens.length >= 2) {
    const mean = phraseLens.reduce((a, b) => a + b, 0) / phraseLens.length;
    const variance =
      phraseLens.reduce((s, l) => s + (l - mean) ** 2, 0) / phraseLens.length;
    score += Math.min(0.25, Math.sqrt(variance) / Math.max(1, mean));
  }
  if (line.rhythmicCellLock && line.rhythmicCellLock.phraseCount > 0) {
    const overlong = line.rhythmicCellLock.phrasesCellLocked / line.rhythmicCellLock.phraseCount;
    score += overlong * 0.15;
  }
  return Math.min(1, score);
}

function computeTargetedDissonanceIndex(
  notes: readonly SoloNote[],
  tonicPc: PitchClass,
  field: ZappaModalField,
): number {
  const pitched = notes.filter((n) => !n.isRest);
  const pcs = MODAL_PC_SET[field];
  const foreign = pitched.filter((n) => {
    const rel = pcRelative(n.midi, tonicPc);
    return !pcs.includes(rel) && !isPentatonicBlues(rel, pcs);
  });
  if (foreign.length === 0) return 1;
  const targeted = foreign.filter((n) => isNearNeighborForeign(pcRelative(n.midi, tonicPc), pcs));
  return targeted.length / foreign.length;
}

function computeClosureRefusalScore(
  line: SoloLine,
  harmonyBars: readonly string[],
): number {
  const phrases = line.phrases.length ? line.phrases : [{ barRange: [1, harmonyBars.length] as [number, number], notes: line.allNotes }];
  let refused = 0;
  let checked = 0;
  for (const phrase of phrases) {
    const endBar = phrase.barRange[1];
    const chord = harmonyBars[endBar - 1];
    if (!chord) continue;
    const endNotes = phrase.notes.filter((n) => n.barIndex === endBar && !n.isRest);
    if (endNotes.length === 0) continue;
    checked += 1;
    const last = endNotes[endNotes.length - 1]!;
    const rootMatch = parseChordSymbol(chord).harmonyPart.match(/^([A-G](?:#|b)?)/i);
    const rootPc = rootMatch ? (noteNameToPitchClass(rootMatch[1]!) ?? 0) : 0;
    const rel = pcRelative(last.midi, rootPc as PitchClass);
    const cleanCadence = rel === 0 || rel === 4 || rel === 7 || rel === 11 || rel === 2;
    if (!cleanCadence) refused += 1;
  }
  if (checked === 0) return 0.5;
  return refused / checked;
}

function computeConversationalAsymmetry(line: SoloLine): number {
  const phrases = line.phrases;
  if (phrases.length < 2) return 0.4;
  const spans = phrases.map((p) => p.barRange[1] - p.barRange[0] + 1);
  const mean = spans.reduce((a, b) => a + b, 0) / spans.length;
  const variance = spans.reduce((s, l) => s + (l - mean) ** 2, 0) / spans.length;
  const displacement = line.allNotes.filter((n) => !n.isRest && n.startBeat > 0.5).length;
  const dispRatio = displacement / Math.max(1, line.allNotes.length);
  return Math.min(1, Math.sqrt(variance) / Math.max(1, mean) * 0.5 + dispRatio * 0.5);
}

function computeMotifMutationRecurrence(line: SoloLine): number {
  const motif = line.zappaMotifReceipt;
  if (!motif) return 0.5;
  const vals = Object.values(motif.sectionRecurrence ?? {});
  if (vals.length === 0) {
    const sims = motif.phraseScores?.map((p) => p.similarity) ?? [];
    if (sims.length === 0) return 0.5;
    return sims.reduce((a, b) => a + b, 0) / sims.length;
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function soloLineToMotif(line: SoloLine, level: ZappaSoloParticipationLevel): MusicContextMotif | undefined {
  const notes = line.allNotes
    .filter((n) => !n.isRest)
    .sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);

  if (level === 'tertiary') {
    const pcs = [...new Set(notes.slice(0, 4).map((n) => n.midi))];
    if (pcs.length < 2) return undefined;
    return {
      id: 'zappa-solo-colour-0',
      intervalPattern: pcs.slice(1).map((m, i) => m - pcs[i]!),
      rhythmPattern: [{ startBeat: 0, duration: 1 }],
      contourPattern: [],
      anchorMidi: pcs[0],
      seedPitches: pcs,
      producer: 'zappa_solo',
    };
  }

  const take =
    level === 'secondary'
      ? notes.filter((_, i) => i % 2 === 0 || i < 6)
      : notes;
  if (take.length < 2) return undefined;

  const midis = take.map((n) => n.midi);
  const intervalPattern = midis.slice(1).map((m, i) => m - midis[i]!);
  const contourPattern = intervalPattern.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
  const core = {
    id: 'zappa-solo-0',
    intervalPattern,
    rhythmPattern: take.map((n) => ({
      startBeat: (n.barIndex - 1) * 4 + n.startBeat,
      duration: n.durationBeats,
    })),
    contourPattern,
    roleTags: ['solo'],
    registerTags: ['mid'],
  };
  const motif = coreMotifToMusicContextMotif(core, 'zappa_solo');
  motif.anchorMidi = midis[0];
  motif.seedPitches = [...midis.slice(0, Math.min(8, midis.length))];
  return motif;
}

export type ZappaSoloRealisationResult = {
  soloLine: SoloLine;
  receipt: ZappaSoloRealisationReceipt;
  motif?: MusicContextMotif;
};

export function realiseZappaSoloMusicContext(
  preset: ZappaSoloMusicContextPreset,
  harmonyBars: readonly string[],
  keyRoot: string,
  harmonyChecksum: string,
): ZappaSoloRealisationResult {
  const participationLevel = preset.participationLevel ?? 'primary';
  const modalField = preset.modalField ?? inferModalField(keyRoot, harmonyBars);
  const tonicPc = (noteNameToPitchClass(keyRoot) ?? 0) as PitchClass;
  const arc = preset.soloArc?.length ? preset.soloArc : defaultSoloArc(harmonyBars.length);
  const ctx = buildZappaSoloCompositionContext(preset, harmonyBars);
  const opts = resolveArcOptions(preset, arc);

  const soloLine =
    participationLevel === 'tertiary'
      ? generateZappaSolo(ctx, { density: 0.15, dissonanceLevel: opts.dissonanceLevel * 0.4 })
      : generateZappaSolo(ctx, opts);

  const pitched = soloLine.allNotes.filter((n) => !n.isRest);
  const receipt: ZappaSoloRealisationReceipt = {
    modalAnchorRatio: computeModalAnchorRatio(pitched, tonicPc, modalField),
    motifMutationRecurrence: computeMotifMutationRecurrence(soloLine),
    rhythmicElasticityScore: computeRhythmicElasticity(soloLine),
    targetedDissonanceIndex: computeTargetedDissonanceIndex(pitched, tonicPc, modalField),
    closureRefusalScore: computeClosureRefusalScore(soloLine, harmonyBars),
    conversationalAsymmetry: computeConversationalAsymmetry(soloLine),
    participationLevel,
    modalField,
    barCount: harmonyBars.length,
    harmonyChecksum,
    noteCount: pitched.length,
  };

  const motif = soloLineToMotif(soloLine, participationLevel);
  return { soloLine, receipt, motif };
}
