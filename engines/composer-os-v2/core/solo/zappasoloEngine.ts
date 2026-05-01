/**
 * Frank Zappa Phase B — solo / melodic generator (Slonimsky backbone + Zappa PDF vocabulary).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { chordTonesForChordSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { getChordForBar } from '../harmony/harmonyResolution';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { resolveMeterForBar } from '../rhythm/oddMeterQuantiser';
import {
  generateSlonimskyPattern,
  inferSlonimskyChordTypeCategory,
  resolveAllowedOutsideLevelForSlonimsky,
  selectSlonimskyPattern,
  SLONIMSKY_STYLE_PROFILE_MAP,
  type SlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyEngine';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { SoloLine, SoloNote, SoloPhrase, ZappasoloOptions } from './soloTypes';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function seededUnit(seed: number, salt = 0): number {
  let s = ((seed ^ salt * 1103515245) >>> 0) as number;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function harmonyRootPcFromSymbol(symbol: string): number | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function liftIntoRange(midi: number, low: number, high: number): number {
  let p = midi;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return Math.max(low, Math.min(high, p));
}

/** Quarter-note span of one measure for the given bar. */
export function measureQuarterSpanForBar(bar1Based: number, map: BarMeterMap | undefined): number {
  const sig = resolveMeterForBar(bar1Based, map);
  return (sig.numerator * 4) / sig.denominator;
}

/** UI / request tiers → engine {@link ZappasoloOptions} (defaults: guitar E2–C6, medium density, moderate dissonance). */
export function zappaSoloOptionsFromTiers(tiers?: {
  midiLow?: number;
  midiHigh?: number;
  density?: 'low' | 'medium' | 'high';
  dissonance?: 'mild' | 'moderate' | 'extreme';
}): ZappasoloOptions {
  let midiLow = tiers?.midiLow ?? 40;
  let midiHigh = tiers?.midiHigh ?? 84;
  if (midiLow > midiHigh) {
    const t = midiLow;
    midiLow = midiHigh;
    midiHigh = t;
  }
  const densityMap: Record<'low' | 'medium' | 'high', number> = {
    low: 0.28,
    medium: 0.72,
    high: 1.0,
  };
  const dissonanceMap: Record<'mild' | 'moderate' | 'extreme', number> = {
    mild: 0.33,
    moderate: 0.66,
    extreme: 1.0,
  };
  const densityTier = tiers?.density ?? 'medium';
  const dissonanceTier = tiers?.dissonance ?? 'moderate';
  return {
    midiLow,
    midiHigh,
    density: densityMap[densityTier],
    dissonanceLevel: dissonanceMap[dissonanceTier],
  };
}

function pickFrankZappaPhraseIntent(bar: number, seed: number): SlonimskyContext['phraseIntent'] {
  const w = SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.intentWeights;
  const u = seededUnit(seed, bar * 17);
  const sum = w.build + w.float + w.release + w.shock;
  let t = u * sum;
  if (t < w.shock) return 'shock';
  t -= w.shock;
  if (t < w.build) return 'build';
  t -= w.build;
  if (t < w.float) return 'float';
  return 'release';
}

function buildZappaSlonimskyContext(params: {
  bar: number;
  seed: number;
  chord: string;
  maxBeats: number;
  options: ZappasoloOptions | undefined;
}): SlonimskyContext {
  const { bar, seed, chord, maxBeats, options } = params;
  const low = options?.midiLow ?? 40;
  const high = options?.midiHigh ?? 84;
  const cat = inferSlonimskyChordTypeCategory(chord);
  const t = chordTonesForChordSymbol(chord);
  const base = liftIntoRange(t.third ?? t.root + 4, low, high);
  const outsideBase = options?.dissonanceLevel !== undefined ? Math.round(options.dissonanceLevel * 2) : 2;
  const allowedOutsideLevel = Math.min(2, Math.max(0, outsideBase)) as 0 | 1 | 2;
  const profileCap = resolveAllowedOutsideLevelForSlonimsky('frank_zappa');
  const allowed = Math.min(allowedOutsideLevel, profileCap) as 0 | 1 | 2;

  return {
    keyPc: t.root % 12,
    chordType: cat,
    functionalStrength: 'medium',
    allowedOutsideLevel: allowed,
    phraseIntent: pickFrankZappaPhraseIntent(bar, seed),
    basePitch: base,
    maxBeats: Math.max(0.25, maxBeats),
    styleProfile: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.defaultProfile,
    chordSymbol: chord,
    effectiveLow: low,
    effectiveHigh: high,
    transpositionInterval: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.transpositionInterval,
    maxInfraSteps: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.maxInfraSteps,
    maxUltraSteps: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.maxUltraSteps,
  };
}

function slonimskyNotesToSoloNotes(
  bar: number,
  sl: SlonimskyNote[],
  meterSpan: number,
  tupletRole: SoloNote['tupletRole'],
  marker: SoloNote['marker']
): SoloNote[] {
  const out: SoloNote[] = [];
  for (const n of sl) {
    const start = Math.min(meterSpan - 0.01, Math.max(0, n.beat));
    let dur = Math.max(0.05, n.durationBeats);
    if (start + dur > meterSpan + 1e-6) {
      dur = Math.max(0.05, meterSpan - start);
    }
    out.push({
      midi: n.midi,
      startBeat: start,
      durationBeats: dur,
      barIndex: bar,
      tupletRole,
      marker,
    });
  }
  return out;
}

/** Emit [0,1,3,7] semitone tetrachord above chord root (alt / Lydian colour — roadmap PDF vocabulary). */
function emit0137Tetrachord(bar: number, chord: string, low: number, high: number, seed: number): SoloNote[] {
  const rpc = harmonyRootPcFromSymbol(chord);
  if (rpc === undefined) return [];
  const cat = inferSlonimskyChordTypeCategory(chord);
  const altish =
    cat === 'dominant_alt' ||
    cat === 'dominant' ||
    chord.toLowerCase().includes('alt') ||
    chord.includes('#11');
  if (!altish) return [];
  const rootMidi = liftIntoRange(60 + rpc, low, high);
  const pcs = [0, 1, 3, 7];
  const span = 1.0;
  const step = span / 4;
  return pcs.map((pc, i) => ({
    midi: liftIntoRange(rootMidi + pc + (seed % 2 === 0 ? 0 : 12), low, high),
    startBeat: i * step,
    durationBeats: step * 0.95,
    barIndex: bar,
    tupletRole: 'plain' as const,
    marker: 'tetrachord_0137' as const,
  }));
}

/** Descending minor 6th (−8 semitones) pair at phrase boundary. */
function emitDescendingMinorSixth(bar: number, chord: string, low: number, high: number): SoloNote[] {
  const rpc = harmonyRootPcFromSymbol(chord);
  if (rpc === undefined) return [];
  const hi = liftIntoRange(72 + rpc, low, high);
  const lo = liftIntoRange(hi - 8, low, high);
  return [
    {
      midi: hi,
      startBeat: 0,
      durationBeats: 0.12,
      barIndex: bar,
      tupletRole: 'plain',
      marker: 'descending_minor_sixth',
    },
    {
      midi: lo,
      startBeat: 0.15,
      durationBeats: 0.25,
      barIndex: bar,
      tupletRole: 'plain',
      marker: 'descending_minor_sixth',
    },
  ];
}

function chordsForZappa(context: CompositionContext): string[] {
  const tb = context.form.totalBars;
  const eff = context.generationMetadata.frankZappaEffectiveHarmonyBars;
  if (eff && eff.length === tb) return [...eff];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(getChordForBar(b, context));
  }
  return out;
}

function barMeterMapFromContext(context: CompositionContext): BarMeterMap | undefined {
  return context.generationMetadata.barMeterMap ?? context.barMeterMap;
}

/**
 * Slonimsky-driven Zappa solo line: odd-meter aware, PDF tuplet vocabulary, structural m6 + [0137] + factory shifts.
 */
export function generateZappaSolo(context: CompositionContext, options?: ZappasoloOptions): SoloLine {
  const seed = context.seed;
  const tb = context.form.totalBars;
  const chords = chordsForZappa(context);
  const map = barMeterMapFromContext(context);
  const low = options?.midiLow ?? 40;
  const high = options?.midiHigh ?? 84;

  const allNotes: SoloNote[] = [];
  const density = options?.density ?? 1;

  for (let b = 1; b <= tb; b++) {
    const chord = chords[b - 1] ?? 'C7alt';
    const meterSpan = measureQuarterSpanForBar(b, map);
    let reservedFront = 0;

    /** Phrase starts (bars 5, 9, …): descending minor 6th gesture (reserve front space). */
    if (b > 1 && (b - 1) % 4 === 0) {
      const m6 = emitDescendingMinorSixth(b, chord, low, high);
      allNotes.push(...m6);
      reservedFront = Math.max(reservedFront, 0.38);
    }

    /** [0137] tetrachord on structural bars (every 4 bars). */
    if (b % 4 === 0) {
      const t37 = emit0137Tetrachord(b, chord, low, high, seed + b);
      if (t37.length) {
        allNotes.push(...t37);
        reservedFront = Math.max(reservedFront, 1.02);
      }
    }

    const bodySpan = Math.max(0.125, meterSpan - reservedFront);
    const ctx = buildZappaSlonimskyContext({ bar: b, seed, chord, maxBeats: bodySpan, options });
    const pattern = selectSlonimskyPattern(ctx, seed + b * 10007);
    let tupletRole: SoloNote['tupletRole'] = 'plain';
    if (b === 3 || b === 7 || b === 11) tupletRole = 'septuplet';
    else if (b === 5 || b === 9) tupletRole = 'quintuplet';

    let barNotes: SoloNote[] = [];
    if (pattern && density > 0.05) {
      const sl = generateSlonimskyPattern(pattern, ctx, seed + b * 3331);
      const filtered =
        density < 0.45 ? sl.filter((_, idx) => idx % 2 === 0 || idx === sl.length - 1) : sl;
      barNotes = slonimskyNotesToSoloNotes(b, filtered.length ? filtered : sl, reservedFront + bodySpan, tupletRole, undefined).map(
        (n) => ({
          ...n,
          startBeat: n.startBeat + reservedFront,
        })
      );
    }
    if (barNotes.length === 0 && density > 0.05) {
      const t = chordTonesForChordSymbol(chord);
      const m = liftIntoRange((t.third ?? t.root + 4), low, high);
      barNotes = [
        {
          midi: m,
          startBeat: reservedFront,
          durationBeats: Math.min(0.45, bodySpan * 0.35),
          barIndex: b,
          tupletRole,
          marker: undefined,
        },
      ];
    }

    /** Factory-cycle 32nd displacement (d2 analogue): shift onsets by 1/8 quarter on structural returns. */
    if (b === 5 || b === 9) {
      barNotes = barNotes.map((n) => ({
        ...n,
        startBeat: Math.min(Math.max(reservedFront, meterSpan - n.durationBeats), n.startBeat + 0.125),
        marker: n.marker ?? 'factory_32nd_shift',
      }));
    }

    allNotes.push(...barNotes);
  }

  const phrases: SoloPhrase[] = [];
  for (let pi = 0; pi < Math.ceil(tb / 4); pi++) {
    const lo = pi * 4 + 1;
    const hi = Math.min(tb, (pi + 1) * 4);
    phrases.push({
      barRange: [lo, hi],
      notes: allNotes.filter((n) => n.barIndex >= lo && n.barIndex <= hi),
    });
  }

  const receipt: SoloLine['receipt'] = {
    hasSeptuplet: allNotes.some((n) => n.tupletRole === 'septuplet'),
    hasQuintuplet: allNotes.some((n) => n.tupletRole === 'quintuplet'),
    hasDescendingMinorSixth: allNotes.some((n) => n.marker === 'descending_minor_sixth'),
    hasTetrachord0137: allNotes.some((n) => n.marker === 'tetrachord_0137'),
  };

  const digest = [
    receipt.hasSeptuplet ? 'septuplet' : '',
    receipt.hasQuintuplet ? 'quintuplet' : '',
    receipt.hasDescendingMinorSixth ? 'desc_m6' : '',
    receipt.hasTetrachord0137 ? 't0137' : '',
  ]
    .filter(Boolean)
    .join(';');

  return {
    phrases: phrases.filter(Boolean),
    allNotes,
    receipt,
    digest,
  };
}

/** Convert {@link SoloLine} to a MusicXML-exportable part (treble lead). */
export function soloLineToPartModel(line: SoloLine, totalBars: number): PartModel {
  const byBar = new Map<number, SoloNote[]>();
  for (const n of line.allNotes) {
    if (!byBar.has(n.barIndex)) byBar.set(n.barIndex, []);
    byBar.get(n.barIndex)!.push(n);
  }

  const measures: MeasureModel[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const notes = (byBar.get(b) ?? []).sort((a, c) => a.startBeat - c.startBeat);
    const events: NoteEvent[] = notes.map((sn) => ({
      kind: 'note',
      pitch: sn.midi,
      startBeat: sn.startBeat,
      duration: sn.durationBeats,
      voice: 1,
      motifRef:
        [sn.tupletRole && sn.tupletRole !== 'plain' ? `zappa_tuplet:${sn.tupletRole}` : '', sn.marker ? `zappa:${sn.marker}` : '']
          .filter(Boolean)
          .join('|') || undefined,
    }));
    measures.push({ index: b, events });
  }

  return {
    id: 'zappa_solo',
    name: 'Zappa Solo (Lead)',
    instrumentIdentity: 'trumpet',
    midiProgram: 56,
    clef: 'treble',
    measures,
  };
}

/** Copy solo output onto generation metadata (call after `generateZappaSolo`). */
export function applyZappaSoloToMetadata(metadata: GenerationMetadata, line: SoloLine): void {
  metadata.soloLine = line;
  if (line.digest) metadata.zappaSoloDigest = line.digest;
}

/** Append Zappa solo part to an existing score for export (separate MusicXML part). */
export function mergeZappaSoloPart(score: ScoreModel, line: SoloLine): ScoreModel {
  const tb = Math.max(
    score.parts.reduce((m, p) => Math.max(m, p.measures.length), 0),
    line.allNotes.reduce((m, n) => Math.max(m, n.barIndex), 0)
  );
  const soloPart = soloLineToPartModel(line, tb);
  return {
    ...score,
    parts: [...score.parts, soloPart],
  };
}
