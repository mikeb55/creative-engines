/**
 * BHL iteration 2 — guitar pitches from a phrase plan.
 * Motif transforms and liquid-harmony layers propose pitch classes.
 * The region's field is the limit. Every proposal outside that field is snapped and recorded.
 */

import { planLiquidHarmony } from '../harmony/liquidHarmonyPlanner';
import { transformMotifThroughLayers, type MotifNote as LayerNote } from '../arrangement/motifTransformer';
import { varyMotif } from '../motif/motifTracker';
import type { BaseMotif } from '../motif/motifTypes';
import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import type { BhlBassBar, BhlOnsetPlan } from './bhlRhythm';
import { collectFieldNotes, guitarFeasibility, realiseBhlIntentions, type BhlFieldNote, type BhlIntentionLimit } from './bhlRealise';
import { planPhraseOnsets } from './bhlRhythm';
import {
  neighborCell,
  type BhlFieldSnap,
  type BhlGuitarEvent,
  type BhlPhrasePlan,
  type BhlPhraseRegion,
} from './bhlPhrase';

export interface BhlLiquidTrace {
  regionId: string;
  chordType: string;
  rootPc: number;
  tensionState: BhlPhraseRegion['tensionState'];
  melodyPitchClass: number;
  layerPitchClasses: number[];
}

export interface BhlFeasibilityNote {
  bar: number;
  onsetQuarters: number;
  midis: number[];
  feasible: boolean;
  fretSpan: number;
}

export interface BhlGeneratedGuitar {
  events: BhlGuitarEvent[];
  snaps: BhlFieldSnap[];
  onsetPlans: BhlOnsetPlan[];
  liquid: BhlLiquidTrace[];
  feasibility: BhlFeasibilityNote[];
  limitations: BhlIntentionLimit[];
  fieldNotes: BhlFieldNote[];
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function nearestPc(pitchClass: number, field: readonly number[]): number {
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

function midiNear(pitchClass: number, low: number, high: number, previous: number | null): number {
  const candidates: number[] = [];
  for (let midi = low; midi <= high; midi++) if (mod12(midi) === mod12(pitchClass)) candidates.push(midi);
  if (!candidates.length) {
    for (let midi = 48; midi <= 84; midi++) if (mod12(midi) === mod12(pitchClass)) candidates.push(midi);
  }
  const anchor = previous ?? 67;
  return candidates.sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor) || a - b)[0]!;
}

function barField(region: BhlPhraseRegion, bar: BhlBassBar): number[] {
  const local = bar.pitchClasses.filter((pitchClass) => region.pitchClasses.includes(pitchClass));
  return local.length ? local : [...region.pitchClasses];
}

function trackerPcs(plan: BhlPhrasePlan, region: BhlPhraseRegion): number[] {
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
  const varied = varyMotif(motif, variant, region.transposeSemitones, 0);
  return varied.map((note) => mod12(note.pitch));
}

function layerPcs(region: BhlPhraseRegion, tracked: readonly number[]): { pcs: number[]; melodyPitchClass: number } {
  const motif: LayerNote[] = tracked.map((pitchClass, index) => ({
    pitchClass,
    beatPosition: index * 0.5,
    duration: 0.5,
  }));
  const layers = transformMotifThroughLayers(motif, region.vaultChordType, region.vaultRootPc);
  const chosen = layers[region.tensionState];
  const liquid = planLiquidHarmony(region.vaultChordType, region.vaultRootPc, region.tensionState);
  const pcs = (chosen.length ? chosen : motif).map((note) => mod12(note.pitchClass));
  return { pcs, melodyPitchClass: liquid.melodyPitchClass };
}

function intendedPcs(region: BhlPhraseRegion, bar: BhlBassBar, plan: BhlPhrasePlan, tracked: readonly number[]): number[] {
  if (region.pitchTransform === 'reproject-neighbor') return neighborCell(barField(region, bar));
  if (region.pitchTransform === 'retain-and-admit-bass') return [bar.rootPc];
  if (region.pitchTransform === 'neighbor-statement' || region.pitchTransform === 'recall-cell') return [...plan.motif.pitchClasses];
  return [...tracked];
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

export function generateBhlGuitar(plan: BhlPhrasePlan, bars: readonly BhlBassBar[]): BhlGeneratedGuitar {
  const onsetPlans = planPhraseOnsets(bars, plan.regions);
  const events: BhlGuitarEvent[] = [];
  const snaps: BhlFieldSnap[] = [];
  const liquid: BhlLiquidTrace[] = [];
  const feasibility: BhlFeasibilityNote[] = [];
  let previous: number | null = null;

  for (const region of plan.regions) {
    const tracked = trackerPcs(plan, region);
    const layered = layerPcs(region, tracked);
    liquid.push({
      regionId: region.id,
      chordType: region.vaultChordType,
      rootPc: region.vaultRootPc,
      tensionState: region.tensionState,
      melodyPitchClass: layered.melodyPitchClass,
      layerPitchClasses: layered.pcs,
    });
    for (const onset of onsetPlans.filter((item) => region.bars.includes(item.bar))) {
      const bar = bars.find((candidate) => candidate.bar === onset.bar);
      if (!bar) throw new Error(`missing bass bar ${onset.bar}`);
      const field = region.pitchClasses;
      const intended = intendedPcs(region, bar, plan, tracked);
      onset.onsets.forEach((start, index) => {
        const figure = intended.length > onset.onsets.length ? intended.slice(intended.length - onset.onsets.length) : intended;
        const proposal = layered.pcs[index % Math.max(layered.pcs.length, 1)] ?? figure[0] ?? bar.rootPc;
        let pitchClass = figure[index] ?? figure[figure.length - 1] ?? bar.rootPc;
        if (region.pitchTransform === 'retain-and-admit-bass' && index > 0) {
          const ordered = [...field].sort((a, b) => a - b);
          pitchClass = ordered.find((candidate) => candidate !== bar.rootPc && candidate !== pitchClass) ?? pitchClass;
        }
        if (!field.includes(pitchClass)) {
          const snapped = nearestPc(pitchClass, field);
          snaps.push({ bar: onset.bar, onsetQuarters: start, fromPc: pitchClass, toPc: snapped, reason: 'invert-or-transpose' });
          pitchClass = snapped;
        }
        if (proposal !== pitchClass) {
          snaps.push({
            bar: onset.bar,
            onsetQuarters: start,
            fromPc: proposal,
            toPc: pitchClass,
            reason: field.includes(proposal) ? 'vault-layer' : 'vault-layer',
          });
        }
        const melody = midiNear(pitchClass, region.registerLow, region.registerHigh, previous);
        const wantDyad = region.density === 'dyad' || (region.density === 'alternate' && index % 2 === 0) || region.pitchTransform === 'retain-and-admit-bass';
        const midis = [melody];
        if (region.pitchTransform === 'retain-and-admit-bass' && region.retainPitchClass !== null && index === 0) {
          const retain = midiNear(region.retainPitchClass, region.registerLow, region.registerHigh, melody);
          const grip = [...new Set([melody, retain])].sort((a, b) => a - b);
          if (grip.length === 2 && assessGuitarFeasibility(grip).feasible) midis.splice(0, 1, ...grip);
          else if (grip.length === 2) {
            snaps.push({ bar: onset.bar, onsetQuarters: start, fromPc: region.retainPitchClass, toPc: pitchClass, reason: 'partner-dropped' });
          }
        } else if (wantDyad) {
          const lower = partnerBelow(melody, field, region.registerLow);
          if (lower !== null) midis.unshift(lower);
          else snaps.push({ bar: onset.bar, onsetQuarters: start, fromPc: pitchClass, toPc: pitchClass, reason: 'partner-dropped' });
        }
        const unique = [...new Set(midis)].sort((a, b) => a - b);
        const check = assessGuitarFeasibility(unique);
        feasibility.push({ bar: onset.bar, onsetQuarters: start, midis: unique, feasible: check.feasible, fretSpan: check.fretSpan });
        const sounding = check.feasible ? unique : [melody];
        if (!check.feasible && unique.length > 1) {
          snaps.push({ bar: onset.bar, onsetQuarters: start, fromPc: mod12(unique[0]!), toPc: mod12(melody), reason: 'partner-dropped' });
        }
        events.push({
          bar: onset.bar,
          regionId: region.id,
          onsetQuarters: start,
          quarters: onset.durations[index] ?? 0.5,
          midis: sounding,
          pitchClasses: [...new Set(sounding.map(mod12))].sort((a, b) => a - b),
        });
        previous = Math.max(...sounding);
      });
    }
  }
  const fieldOf = (region: { pitchClasses: readonly number[] }) => region.pitchClasses;
  const limitations = realiseBhlIntentions(plan, bars, events, fieldOf);
  const fieldNotes = collectFieldNotes(plan, bars, events, fieldOf);
  return { events, snaps, onsetPlans, liquid, feasibility: guitarFeasibility(events), limitations, fieldNotes };
}
